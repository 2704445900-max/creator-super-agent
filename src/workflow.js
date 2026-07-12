import { createReferencePlan } from "./references.js";
import { searchDatabase } from "./search.js";
import { analyzeScriptWithDramaturgy } from "./dramaturgy_rules.js";
import { createCreativeSuitePlan } from "./creative_suite.js";

const ACCOUNT_PROFILE = {
  platform: "bilibili",
  accountName: "新锐纪元企划",
  authorName: "和平莱茵兔",
  homepage: "<ACCOUNT_URL>",
  positioning: "东方战术美少女、近未来、反战人文、林小队群像、战术科幻与中国式人文"
};

const PHOTOSHOP_PATH = "<ADOBE_ROOT>\\Adobe Photoshop 2021";
const PREMIERE_PATH = "<ADOBE_ROOT>\\Adobe Premiere Pro 2022";

function resolveAccountProfile(input = {}) {
  const record = input.workspaceContext?.accountProfile || input.accountProfile || null;
  if (!record) return { ...ACCOUNT_PROFILE };
  const profile = record.profile || record;
  return {
    ...ACCOUNT_PROFILE,
    ...profile,
    platform: record.platform || profile.platform || ACCOUNT_PROFILE.platform,
    accountName: record.accountName || profile.accountName || ACCOUNT_PROFILE.accountName
  };
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const clean = compact(value);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
  }
  return output;
}

function termsFromText(value) {
  return unique(
    String(value || "")
      .replace(/[，。！？；：、（）()[\]{}《》“”"'\n\r\t/\\|_-]+/g, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 2)
  ).slice(0, 12);
}

function inferNamedSubjects(topic, script) {
  const text = `${topic || ""} ${script || ""}`;
  const names = [];
  const directKnown = ["林荫清", "王明德", "韩梦雪", "唐舒嫣", "赵婷婷", "刘伊七", "刘梦鸳", "何墨缘", "叶敏慧", "李熙然"];
  for (const name of directKnown) {
    if (text.includes(name)) names.push(name);
  }
  const blocked = /小队|故事|今日|动画|战术|少女|近未来|夜间|楼内|室内|室外|场景|行动|潜入|任务|测试|异常|通讯|信号/;
  const patterns = [
    /([\u4e00-\u9fa5]{2,4})(?:潜入|行动|任务|分镜|动画|故事|线)/g,
    /([\u4e00-\u9fa5]{2,4})(?:在|向|把|听见|决定)/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      if (name.length <= 3 && !blocked.test(name) && !/[开门报告听见决定暂缓]/.test(name)) names.push(name);
    }
  }
  return unique(names).slice(0, 4);
}

function pickEvidence(evidence) {
  return {
    summary: evidence.evidenceSummary || {},
    entities: (evidence.entities || []).slice(0, 6).map((item) => ({
      type: item.type,
      name: item.name,
      summary: item.summary
    })),
    claims: (evidence.chunks || []).slice(0, 6).map((item) => ({
      claim: item.brief?.claim || "",
      type: item.brief?.evidenceTypeLabel || "证据",
      source: item.rel_path
    }))
  };
}

function inferHooks(topic, script) {
  const text = `${topic} ${script}`;
  const hooks = [];
  if (/潜入|任务|行动|撤离|战斗|枪|武器/.test(text)) hooks.push("任务一开始就出现异常信号，观众先看到危险，再补充原因。");
  if (/林荫清|韩梦雪|唐舒嫣|赵婷婷/.test(text)) hooks.push("用角色选择开场：她不是解释设定，而是在压力下做出一个有代价的动作。");
  if (/法特提|古蒂斯|阴谋|敌人/.test(text)) hooks.push("封面和标题突出反派压力，不提前泄露全部真相。");
  if (!hooks.length) hooks.push("用一个清晰的问题开场：这次行动为什么不能失败？");
  return hooks.slice(0, 3);
}

function buildTitleCandidates(topic, script) {
  const target = compact(topic) || "林小队新任务";
  const hooks = inferHooks(topic, script);
  return unique([
    `${target}：她在开门前听见了不该出现的信号`,
    `15秒看懂新锐纪元：${target}的第一次危险判断`,
    `林小队行动记录：${target}背后的异常线索`,
    `近未来战术少女动画分镜：${target}`,
    `当任务简报失效，她们只能相信自己的判断`,
    hooks[0] ? hooks[0].replace(/[：:。]/g, "").slice(0, 36) : ""
  ]).slice(0, 6);
}

function buildCoverBrief(topic, script, evidence) {
  const inputSubjects = inferNamedSubjects(topic, script);
  const evidenceCharacters = (evidence.entities || [])
    .filter((item) => item.type === "character")
    .map((item) => item.name)
    .filter((name) => !inputSubjects.length || inputSubjects.includes(name))
    .slice(0, 3);
  const characters = unique([...inputSubjects, ...evidenceCharacters]).slice(0, 3);
  const confirmedCount = characters.filter((name) => evidenceCharacters.includes(name)).length;
  return {
    title: "动画封面设计",
    mainSubject: characters.length ? characters.join("、") : "林小队成员",
    canonStatus: confirmedCount === characters.length && characters.length
      ? "资料库确认"
      : confirmedCount > 0
        ? "部分资料库确认，其余待确认"
        : characters.length ? "输入角色名，待资料库确认" : "待确认",
    composition: "一名主角占画面 60%，背景保留任务场景和反派压力信号；标题区留在左上或右下，避免压住脸和武器。",
    visualHook: /潜入|夜|楼|室内/.test(`${topic} ${script}`) ? "低照度楼内行动、门缝光、通讯异常提示" : "近未来战术行动瞬间、角色眼神与目标物形成对角线",
    textRule: "封面字不超过 12 个汉字；优先问题感和行动感，不堆世界观名词。",
    outputPath: "output/publishing/bilibili-covers/"
  };
}

function hasExplicitStoryDetails(script) {
  const clean = compact(script);
  const sentenceCount = (String(script || "").match(/[。！？!?；;]/g) || []).length;
  const actionCount = (clean.match(/走|看|听|停|递|接|转|按|牵|进入|离开|发现|决定|等待|回头|沉默|对视|避让|确认|行动|撤离|潜入/g) || []).length;
  return clean.length >= 90 && sentenceCount >= 3 && actionCount >= 3;
}

function buildLocalStoryArrangement(topic, script, evidence) {
  const text = `${topic || ""} ${script || ""}`;
  const inputHasExplicitStoryDetails = hasExplicitStoryDetails(script);
  const picked = pickEvidence(evidence);
  const canonAnchors = [
    ...(picked.entities || []).map((item) => `${item.name}：${item.summary || "资料库实体"}`),
    ...(picked.claims || []).map((item) => `${item.claim}（${item.type}）`)
  ].filter(Boolean).slice(0, 8);
  const isDateStory = /约会|街头|夕阳|恋|爱人|手机|合照|王明德/.test(text);
  const isActionStory = /潜入|任务|行动|撤离|战斗|枪|武器|异常|信号/.test(text);
  const narrativeSpine = isDateStory ? [
    "建立场景：先交代私人时间、街头夕阳和两人的距离。",
    "关系推进：用并肩、停顿、递物、避让等具体动作代替直白说明。",
    "暗线回扣：用手机、旧物、视线或沉默回扣资料库确认的关系线索。",
    "情绪选择：安排一个微小但可见的靠近动作作为转折。",
    "余韵收束：用环境变化、长影、背影或物件状态收束故事。"
  ] : isActionStory ? [
    "建立任务压力：先让观众看见目标、风险或异常。",
    "锁定角色选择：主角通过一个具体动作承担判断。",
    "推进阻碍：让空间、道具或信息出现可见变化。",
    "代价或压力显形：用停顿、误差、受阻、沉默表达代价。",
    "收束到后果：结尾保留行动结果或下一步悬念。"
  ] : [
    "建立人物所处时间、地点和目标。",
    "用一个具体动作显示人物关系或压力。",
    "安排可见阻碍或信息变化推动故事。",
    "让角色做出选择，产生情绪或空间变化。",
    "用环境、道具或姿态收束到一个清晰余韵。"
  ];
  return {
    standard: "xinrui-local-evidence-story-arrangement-v1",
    inputHasExplicitStoryDetails,
    defaultVisualStyle: "动画二次元电影级别画质，新锐纪元近未来东方美学，角色表演清晰，光影精致，镜头连续；除非用户明确要求其他画风，均以此为根本延伸。",
    animationPurpose: "故事板不是静态美图合集，而是为创作过渡流畅的动画服务；每格都要交代动作、视线、道具状态或情绪如何流向下一格。",
    localWritingPrinciple: "采用本地剧本创作原则中的感知-运动影像链条：感知→运动→新感知→新运动，用因果驱动镜头，而不是并列堆画面。",
    triggerRule: inputHasExplicitStoryDetails
      ? "用户已提供较明确故事细节；资料库用于校准关系、身份和道具。"
      : "用户只提供主题、氛围或角色关系时，先用本地资料库证据编排故事拍点，再整理分镜提示词。",
    canonAnchors,
    narrativeSpine,
    storyboardPromptOrder: [
      "资料库证据与本地视觉资产",
      "一句话故事主轴",
      "起承转合 / 8 个故事拍点",
      "每镜头分镜图描述",
      "调度、画面、镜头、连续性",
      "图像 / 视频模型提示词"
    ],
    continuityRules: [
      "每个镜头必须承接上一镜头的动作、视线、道具或情绪，不生成彼此无关的美图拼盘。",
      "分镜图内必须有短句描述：说明这一格在故事里推进了什么。",
      "每个分镜提示词必须包含：分镜图基本描述、承接上一镜、引向下一镜、画面目的。",
      "角色左右关系、行动方向、关键道具状态和光线方向跨镜头保持一致。",
      "资料库未确认的细节只作为合理推断或待确认，不写成正史。"
    ]
  };
}

function buildVideoPromptPack(topic, script, goal) {
  const text = `${topic || ""} ${script || ""} ${goal || ""}`;
  const characters = inferNamedSubjects(topic, script);
  const mainCharacter = characters[0] || "主角";
  const title = compact(topic || goal || "新锐纪元 15 秒短片");
  const isLinYinqing = text.includes("林荫清");
  const hasQbz81 = /QBZ-?81|81式|Type\s*81/i.test(text);
  const hasRangeTraining = /靶场|打靶|射击|训练|枪/.test(text);
  const characterLock = isLinYinqing
    ? "林荫清，年轻东亚女性，深棕色短波波头，侧分刘海，琥珀红眼睛，小红色发夹，冷静、聪明、克制的神情，白黑近未来训练装甲，少量红色点缀，黑色手套，灰色战术靴，实用、非性感化、全覆盖训练装备。"
    : `${mainCharacter}，保持资料库确认的身份、脸型、发型、服装、表情和角色气质，避免换脸、换服装或变成无关角色。`;
  const propLock = hasQbz81
    ? "QBZ-81 / 81式风格训练步枪，黑色主体，橙色识别点缀，弯曲弹匣，长枪管与准星轮廓，现代化瞄具，所有镜头保持同一造型；作为训练道具，不写入正史常用武器。"
    : "关键道具按资料库、资产盘点和故事板锁定结果保持一致；所有镜头中尺寸、颜色、携行方式和功能逻辑不漂移。";
  const sceneLock = hasRangeTraining
    ? "清晨野外训练靶场，浅淡晨雾，土质防弹堤，木质靶架，远处纸靶，草地，小木桩，红白安全警戒带，远处有模糊安全员剪影，山林背景，非战斗训练语境。"
    : "场景按故事板锁定结果保持同一空间、同一光线方向、同一角色动线和同一 180 度轴线。";
  const negativeConstraints = [
    "不要血腥、流血、伤口、处决、敌人或实战杀伤",
    "不要战术教学图、分步骤教程、准星覆盖层、HUD、箭头或随机文字",
    "不要换脸、换发型、换服装、手部畸形、多余手指或角色年龄漂移",
    "不要把训练道具画成错误武器、无托步枪、西式 AR 平台或科幻激光枪",
    "不要性感姿势、Q 版风格、水印、Logo 或画面内说明文字"
  ];
  const masterPrompt = `生成一支 15 秒、16:9、具有 24fps 电影感的动画视频。主题：${title}。${characterLock}${sceneLock}${propLock}镜头从建立环境开始，逐步推进到角色中景、动作准备、关键训练瞬间、节奏切片、眼部情绪特写、安全收束和宽景结尾。整体风格为新锐纪元近未来东方战术动画，电影分镜质感，线条精致，光线克制，强调角色压力、专业感和自我校准。全片保持角色身份、服装、道具、场景方向和镜头轴线连续。${negativeConstraints.join("；")}。`;
  return {
    standard: "xinrui-seedance2-video-prompt-pack-v1",
    model: "Seedance 2.0",
    workflowPosition: "统一故事板总图确认后、Premiere 粗剪前；用于文生视频或图生视频分段生成。",
    outputPath: "output/projects/<project-slug>/05_animation/seedance2.0/",
    generationMode: [
      "优先按 8 个 15 秒视频段分别生成，再按时间线拼成 120 秒片头，保证角色、道具和空间连续性。",
      "一次性 15 秒总提示词用于先试整体氛围，不作为最终连续性最稳方案。",
      "每段生成时都附带全局锁定词和通用负面词。"
    ],
    globalLocks: [characterLock, propLock, sceneLock, "新锐纪元近未来东方战术动画，电影分镜质感，克制光线，非战斗训练或剧情语境。"],
    negativeConstraints,
    masterPrompt,
    shotPrompts: [
      {
        id: "Shot 01",
        duration: "1.6s",
        title: "建立环境",
        prompt: `16:9 电影感动画，宽景建立镜头。交代${sceneLock} ${mainCharacter}从画面侧方进入或进入主行动区，人物较小但可辨识，关键服装和道具轮廓清楚。镜头轻微推进，气氛克制，不要文字、HUD、敌人或战术教学。`
      },
      {
        id: "Shot 02",
        duration: "1.5s",
        title: "锁定人物与道具",
        prompt: `16:9 电影感动画，侧面跟拍中景。${characterLock} 关键道具低位、安全、被动呈现，轮廓与颜色清楚。背景保持同一场景和同一方向，浅景深，平滑侧向移动，不要换脸、换服装或改变道具造型。`
      },
      {
        id: "Shot 03",
        duration: "1.7s",
        title: "呼吸与准备",
        prompt: "16:9 电影感动画，半身近景细节。表现角色平稳呼吸、手套、肩部装备和关键道具整体轮廓，远处目标或任务空间虚化。镜头随呼吸轻微前移，是电影化准备瞬间，不展示可复现操作流程或教程。"
      },
      {
        id: "Shot 04",
        duration: "1.5s",
        title: "关键训练瞬间",
        prompt: "16:9 电影感动画，中远景或侧逆光镜头。只表现一次短促、受控的关键训练动作或剧情动作，效果克制，不夸张，不给命中特写或教学拆解。保持角色、道具、场景和光线连续。"
      },
      {
        id: "Shot 05",
        duration: "1.7s",
        title: "低机位节奏切片",
        prompt: "16:9 电影感动画，低机位横向跟拍。通过地面、草叶、道具碎片、靴子或装备局部表现节奏变化，背景主场景虚化但可辨识。镜头有动势但清晰，不出现 HUD、箭头、血腥或说明文字。"
      },
      {
        id: "Shot 06",
        duration: "2.0s",
        title: "眼部特写",
        prompt: `16:9 电影感动画，角色眼部极近特写。${mainCharacter}的眼神冷静克制，发丝或饰物轻微被风带动，眼中可以有主场景或关键动作的微弱反射。浅景深，强调情绪回收和稳定掌控，不要胜利姿势或夸张表情。`
      },
      {
        id: "Shot 07",
        duration: "2.4s",
        title: "安全收束",
        prompt: "16:9 电影感动画，中景。关键动作结束后，角色让道具回到安全、被动、非攻击性的状态，背景人物或环境给出非具体确认。镜头缓慢稳定，气氛从紧张回到平静，避免教学性细节。"
      },
      {
        id: "Shot 08",
        duration: "2.6s",
        title: "宽景结尾",
        prompt: "16:9 电影感动画，宽景结尾。角色站在主场景旁，看向远处目标、任务空间或安静背景，关键道具下垂或被动融入剪影。镜头缓慢后拉，以克制、自我校准和余韵收束，不要文字和胜利姿势。"
      }
    ],
    editingOrder: ["Shot 01 1.6s", "Shot 02 1.5s", "Shot 03 1.7s", "Shot 04 1.5s", "Shot 05 1.7s", "Shot 06 2.0s", "Shot 07 2.4s", "Shot 08 2.6s", "Total 15.0s"],
    audioNotes: ["环境底噪先行", "动作声克制短促", "眼部特写加入一口轻呼吸", "结尾环境声回落", "不建议在生成画面内加入字幕"]
  };
}

export function createWorkflowPlan(db, input = {}) {
  const topic = compact(input.topic || input.title || "");
  const script = compact(input.script || input.text || "");
  const goal = compact(input.goal || input.intent || "从剧本到故事板、视觉资产、15秒动画和B站宣发");
  const query = compact(`${input.topic || ""} ${goal} ${script}`).slice(0, 1200);
  const evidence = searchDatabase(db, [query], { limit: Number(input.limit || 8), mode: "precise" });
  const referencePlan = createReferencePlan({
    query: query || goal,
    focus: "storyboard prompt workflow uniform weapon scene pose quality"
  });
  const storyArrangement = buildLocalStoryArrangement(topic, script, evidence);
  const dramaturgyReview = analyzeScriptWithDramaturgy({
    text: script || topic,
    intent: goal,
    topic
  });
  const videoPromptPack = buildVideoPromptPack(topic, script, goal);
  const creativeSuite = createCreativeSuitePlan({
    topic,
    script,
    intent: goal,
    targetDurationSec: input.targetDurationSec || input.durationSec || 15
  });
  return {
    standard: "xinrui-creative-workflow-v1",
    goal,
    accountProfile: resolveAccountProfile(input),
    evidence: pickEvidence(evidence),
    dramaturgyReview,
    storyArrangement,
    creativeSuite,
    stages: [
      {
        id: "canon",
        title: "资料库校准",
        actions: ["精确检索角色、组织、事件、服装、武器、场景", "把结果分为资料库确认、合理推断、待确认", "证据不足处不写成正史"]
      },
      {
        id: "dramaturgy_rules",
        title: "四层叙事审查",
        actions: [
          "感知运动影像：检查每个镜头是否有感知、行动和新感知的因果推进",
          "骨架：确认主母题、冲突方向、起承转合和结尾回答",
          "血肉：补关键情景、台词信息差、动作细节、感官、情绪层次和时间矢量",
          "灵魂：让主题由角色选择、代价和关键台词显出来",
          "若审查结果为弱，先校准剧本，再进入 image-2 分镜生成"
        ]
      },
      {
        id: "local_story_arrangement",
        title: "本地资料库故事编排",
        actions: [
          storyArrangement.triggerRule,
          storyArrangement.animationPurpose,
          storyArrangement.localWritingPrinciple,
          "从本地证据中抽取关系锚点、物件线索、角色压力和场景可用信息",
          "先整理一句话故事主轴，再拆成起承转合或 8 个故事拍点",
          "每个拍点都写明承接关系：上一镜头留下什么，本镜头推进什么，下一镜头接什么"
        ]
      },
      {
        id: "literature",
        title: "剧本与文学拓展",
        actions: ["去掉提纲感和 AI 腔", "用压力、选择、代价、可见变化增强角色弧光", "对话不复述世界观"]
      },
      {
        id: "visual_design",
        title: "视觉资产设计",
        actions: ["锁定已有角色状态与服装", "缺少服装、道具、场景时先生成设计任务", "图片保存到 output/visual-designs/ 或 output/scene-designs/"]
      },
      {
        id: "asset_locks_and_audit",
        title: "资产锁定与细节核查",
        actions: ["建立角色身份锁、道具锁、场景锁", "道具核查外观、尺寸、携行位置、握持方式、连接方式和功能逻辑", "场景核查主门、侧门、终端、诱导信号源、动线、平面图和 180 度轴线", "生成后逐格检查手部、装备、线缆、屏幕 UI、光源、HUD 和地图一致性"]
      },
      {
        id: "concrete_storyboard_frames",
        title: "镜头调度草图",
        actions: ["每个镜头先生成调度草图", "草图必须包含角色站位、视线、动作箭头、关键道具、前中后景和遮蔽物", "每格必须写分镜图基本描述，说明故事推进功能和与前后镜头的承接", "调度草图用于锁定轴线、动线和空间，不作为最终分镜插图"]
      },
      {
        id: "key_scene_illustrations",
        title: "关键情景插图式分镜",
        actions: ["按参考样式生成每镜头角色插图/场景插图", "插图必须体现角色表情、动作、环境光影、道具和可交付画面氛围", "插图以调度草图为构图控制，再进入故事板总图排版"]
      },
      {
        id: "image2_continuity_storyboard",
        title: "image-2 连续分镜与统一故事板",
        actions: ["调用 image-2 生成成片连续分镜图", "默认画风为动画二次元电影级别画质，并在此基础上按题材延伸", "每格必须继承角色身份锁、道具锁和场景锁", "每格必须涵盖调度、画面、镜头、分镜图描述、承接上一镜和引向下一镜", "再调用 image-2 生成一张统一故事板，整合连续分镜、角色设计、道具细节、动线图、场景概念、平面图、摄像机参数和 180 度轴线"]
      },
      {
        id: "storyboard_board",
        title: "导演模式故事板",
        actions: ["把关键情景插图拼入单张故事板总图", "导出角色设计、服装/道具、动线图、场景概念、平面图、摄像机参数", "复核角色一致性、动线、平面图、摄像机和 180 度轴线"]
      },
      {
        id: "video",
        title: "Seedance 2.0 15秒视频段设计",
        actions: ["将全片拆成 8 个 15 秒视频段故事板，每段保留 4-6 个内部动作点", "输出 Seedance 2.0 视频段提示词交付包：全局锁定词、通用负面词、首帧锚点、末帧锚点、段落提示词、剪辑顺序和音画建议", "默认保存到 output/projects/<project-slug>/05_animation/seedance2.0/", `可用 Premiere 路径：${PREMIERE_PATH} 做粗剪和字幕`]
      },
      {
        id: "creative_plugin_suite",
        title: "Seedance / Remotion / Hyperframes / UI / Godot plugin suite",
        actions: [
          "Seedance director skill: convert storyboard into 15-second segment packs with first/end-frame anchors, negative constraints, and paid-generation stop rules.",
          "Remotion: use React/TypeScript motion for title cards, HUD, subtitles, social variants, and deterministic overlays.",
          "Hyperframes: use HTML/CSS/media-to-video when a shot is better expressed as designed motion than video-model generation.",
          "UI/UX Pro Max: use for workbench panels, prompt editors, evidence dashboards, and portable HTML exports.",
          "Godogen/Game Studio: use when a Xinrui script, mission, or character should become a Godot prototype or GDD."
        ]
      },
      {
        id: "publishing",
        title: "B站宣发",
        actions: ["根据账号定位生成标题、封面、简介、标签", "参考 B站热门趋势和同类内容表达方式", "发布后记录播放、完播、互动和收藏反馈"]
      }
    ],
    localTools: {
      photoshop: { path: PHOTOSHOP_PATH, useFor: "故事板总图排版、标注、局部修图、色彩校准" },
      premiere: { path: PREMIERE_PATH, useFor: "8个15秒视频段拼接、字幕、节奏、音乐占位" }
    },
    videoPromptPack,
    externalReferencePlan: referencePlan,
    outputRoots: ["output/storyboard-boards/", "output/visual-designs/", "output/scene-designs/", "output/animation/seedance2.0/", "output/publishing/", "output/premiere/"]
  };
}

export function createBilibiliPublishingPlan(db, input = {}) {
  const topic = compact(input.topic || input.title || "新锐纪元企划短动画");
  const script = compact(input.script || input.text || "");
  const evidence = searchDatabase(db, [`${topic} ${script}`], { limit: Number(input.limit || 8), mode: "precise" });
  const tags = unique(["新锐纪元企划", "原创动画", "战术科幻", "二次元", "分镜", ...termsFromText(topic).slice(0, 4)]);
  return {
    standard: "xinrui-bilibili-publishing-v1",
    accountProfile: resolveAccountProfile(input),
    trendInputs: [
      "B站热门榜观察：题材、封面主体、标题问题感、视频时长、互动点",
      "同类动画/战术/二次元内容观察：高可读角色脸、明确动作、少字封面",
      "本地资料库观察：角色状态、故事线、视觉资产是否充足"
    ],
    positioning: "先让观众看懂角色正在承受什么压力，再逐步展示新锐纪元的世界观。",
    titleCandidates: buildTitleCandidates(topic, script),
    coverBrief: buildCoverBrief(topic, script, evidence),
    description: [
      `《新锐纪元企划》原创动画分镜：${topic}`,
      "一群东方战术美少女，在近未来的复杂局势中寻找真相。",
      "本条为15秒动画/故事板测试，欢迎指出最想继续看的角色和剧情线。"
    ].join("\n"),
    tags,
    fifteenSecondHook: {
      structure: ["0-3秒：异常信号或危险画面", "3-9秒：角色做出选择并暴露代价", "9-15秒：反转/悬念/标题卡"],
      hooks: inferHooks(topic, script)
    },
    metricsToWatch: ["3秒留存", "完播率", "评论关键词", "收藏/投币比例", "封面点击率"],
    evidence: pickEvidence(evidence)
  };
}

export function createDailyStoryBrief(db, input = {}) {
  const topic = compact(input.topic || input.keyword || "今日新锐纪元企划故事");
  const hotspot = compact(input.hotspot || "手动输入热点或从 B站热门榜观察获得");
  const query = `${topic} ${hotspot}`;
  const evidence = searchDatabase(db, [query], { limit: Number(input.limit || 8), mode: "precise" });
  const publishing = createBilibiliPublishingPlan(db, {
    topic,
    script: hotspot,
    limit: input.limit,
    workspaceContext: input.workspaceContext,
    accountProfile: input.accountProfile
  });
  return {
    standard: "xinrui-daily-story-brief-v1",
    date: new Date().toLocaleDateString("zh-CN"),
    accountProfile: resolveAccountProfile(input),
    hotspotMonitor: {
      mode: "manual_v1",
      sources: ["B站热门榜", "本地资料库故事线", "官网定位", "用户当天输入的热点"],
      defaultAutomation: "未创建定时任务；建议 09:30 生成选题，20:00 生成复盘。"
    },
    dailyStory: {
      logline: `围绕“${topic}”，让林小队在一个具体任务压力下做出选择。`,
      conflict: "外部任务目标与角色内在顾虑冲突，结尾留下一条可连载的线索。",
      canonBoundary: "角色、组织、武器和事件必须回到资料库证据；缺证据标待确认。"
    },
    dailyStoryboardImage: {
      requirement: "先生成 3-5 个镜头调度草图，再建立角色身份锁、道具锁、场景锁和细节核查清单；随后生成关键情景插图式分镜，调用 image-2 生成成片连续分镜图，并导出一张统一故事板。总图必须含调度、画面、镜头、分镜图描述、角色设计、道具细节、关键情景插图、动线图、场景概念、平面图、摄像机参数。",
      outputPath: "output/storyboard-boards/daily/"
    },
    fifteenSecondAnimation: publishing.fifteenSecondHook,
    publishing,
    evidence: pickEvidence(evidence)
  };
}
