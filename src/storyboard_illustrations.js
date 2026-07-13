const ILLUSTRATION_STANDARD = "creator-key-scene-illustrations-v1";

const REFERENCE_STYLE = {
  title: "宣传视频故事板参考 2.png",
  path: "故事板/宣传视频/2.png",
  role: "key_scene_storyboard_reference",
  analysis: [
    "版面是制作总表：左侧角色设定，中部 6 格关键情景插图，右侧场景设定和平面/战术地图，底部项目、风格、色板和制作信息。",
    "每个分镜格不是线框草图，而是半成品角色插图/场景插图：有明确角色动作、环境光、道具、UI 信息和镜头氛围。",
    "镜头文字采用编号、时间段、景别、中文动作说明和英文补充说明，便于视频模型、画师和剪辑同时使用。",
    "整体风格偏半写实日系赛璐璐、战术科幻、冷色夜雨、界面高光和装备细节，角色表情与任务状态清楚。"
  ],
  layoutRule: "先用调度草图锁定轴线和空间，再生成关键情景插图，最后把插图、角色设定、地图和参数排入故事板总图。"
};

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

const IDENTITY_KIND_RANK = {
  character_card: 0,
  character_turnaround: 1,
  character_portrait: 12,
  military_portrait: 14
};

function identityKindRank(item = {}) {
  return IDENTITY_KIND_RANK[item.visualKind] ?? 50;
}

function isPrimaryIdentityAnchor(item = {}) {
  return item.visualKind === "character_card" || item.visualKind === "character_turnaround";
}

function selectIdentityReferences(items = [], characters = []) {
  const sorted = [...items].sort((a, b) => identityKindRank(a) - identityKindRank(b) || Number(b.namingScore || 0) - Number(a.namingScore || 0));
  const targetCharacters = unique([
    ...(characters || []),
    ...sorted.flatMap((item) => item.subjectNames || [])
  ]);
  const selected = [];
  const seen = new Set();
  const groups = targetCharacters.length
    ? targetCharacters.map((character) => sorted.filter((item) => (item.subjectNames || []).includes(character) || `${item.title} ${item.path} ${item.absPath}`.includes(character)))
    : [sorted];
  for (const group of groups) {
    const anchors = group.filter(isPrimaryIdentityAnchor).slice(0, 2);
    const selectedDesign = group.find((item) => !isPrimaryIdentityAnchor(item)) || anchors[0] || group[0];
    for (const item of [...anchors, selectedDesign].filter(Boolean)) {
      const key = item.fileId || item.path || item.absPath || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push(item);
    }
  }
  return selected;
}

function collectReferences(pack, role, characters = []) {
  const filtered = (pack.visualReferences || [])
    .filter((item) => !role || item.promptRole === role)
    .filter((item) => {
      if (role !== "identity_reference" || !characters.length) return true;
      return item.subjectNames?.some((name) => characters.includes(name));
    });
  const selected = role === "identity_reference" ? selectIdentityReferences(filtered, characters) : filtered;
  return selected
    .slice(0, 6)
    .map((item) => ({
      fileId: item.fileId,
      title: item.title,
      path: item.path,
      absPath: item.absPath,
      role: item.promptRoleLabel || item.promptRole,
      referenceUse: role === "identity_reference"
        ? (isPrimaryIdentityAnchor(item) ? "identity_anchor" : "single_outfit_design_lock")
        : role,
      score: item.namingScore,
      reason: item.reason,
      rule: role === "identity_reference"
        ? "角色卡/三视图为身份锚；另选一个单一着装设计锁，禁止多立绘混穿。"
        : ""
    }));
}

function inferIllustrationIntent(shot, index) {
  const text = `${shot.scene || ""} ${shot.action || ""} ${shot.composition || ""}`;
  if (/倒计时|无人机转向|转向声|突然熄灭/.test(text)) {
    return {
      title: "无声倒计时",
      visualFocus: "门缝光点熄灭后的瞬间，项目主角抬手让队伍进入无声倒计时",
      shotType: "广角中近景 / 悬疑收束",
      characterPerformance: "项目主角抬手制止声音，队员进入预备动作，表情克制紧张",
      environment: "冷色楼道尽头传来无人机转向声，门缝处只剩残余冷光",
      lighting: "手电光压低，远处无人机警示光形成红色小点，暗部保留走廊深度",
      overlay: "可加入极小 COUNTDOWN / DRONE TURNING 标识",
      emotion: "危险逼近前的安静倒计时"
    };
  }
  if (/门禁|维修日志|通讯包|异常通讯/.test(text)) {
    return {
      title: "门禁异常通讯包",
      visualFocus: "门禁终端上伪装成维修日志的异常通讯包，被项目主角发现",
      shotType: "中近景 / 信息发现",
      characterPerformance: "项目主角靠近终端，手指停在屏幕前，另一只手示意队伍停下",
      environment: "门禁面板、暗色墙面、雨夜楼道反光，队员在背景压低动作",
      lighting: "终端冷光照亮项目主角侧脸和手部，背景压暗",
      overlay: "维修日志界面、异常数据包红框、HOLD 手势标注",
      emotion: "异常被识别的紧张停顿"
    };
  }
  if (/终端|线路|无人机|巡逻轨迹|接入/.test(text)) {
    return {
      title: "终端接入",
      visualFocus: "项目角色B在侧门边接入终端，屏幕显示敌方无人机巡逻轨迹",
      shotType: "中景 / 科技操作",
      characterPerformance: "项目角色B半蹲操作终端，项目主角在近处警戒或位于背景形成保护关系",
      environment: "侧门、墙角、终端线缆和屏幕蓝光构成清晰操作区",
      lighting: "终端屏幕蓝光照亮手部和脸部，背景保持雨夜低照度",
      overlay: "可加入无人机轨迹线、SIGNAL TRACE、DRONE PATH 等克制 HUD",
      emotion: "专业、快速、安静协作"
    };
  }
  if (/连廊|雨夜|积水|反光|楼顶/.test(text)) {
    return {
      title: "雨夜连廊潜入",
      visualFocus: "项目主角带队穿过雨夜楼顶连廊，手电光扫过积水中的红色反光",
      shotType: "广角建立 / 雨夜潜入",
      characterPerformance: "项目主角在队伍前方低姿推进，战术手电压低，队员保持距离",
      environment: "楼顶连廊、雨水、金属栏杆、积水反光、远处楼体冷光",
      lighting: "冷色雨夜环境光、手电光束、地面积水红色反光形成视觉钩子",
      overlay: "尽量少，保留电影感，可只保留镜头编号和时间段",
      emotion: "任务开场的压迫、湿冷和不确定"
    };
  }
  if (/门后|人质|诱导信号源|诱导信号/.test(text)) {
    return {
      title: "诱导信号源确认",
      visualFocus: "项目主角借手电反射确认门后不是人质，而是诱导信号源",
      shotType: "中近景 / 战术判断",
      characterPerformance: "项目主角压低枪口，身体贴近门侧，视线集中在反射光和门缝细节",
      environment: "主门、门框、地面反射、微弱信号光组成紧张几何关系",
      lighting: "手电反射光切过门缝，信号源冷光形成小范围高亮",
      overlay: "可加入 DECOY SIGNAL / HOSTAGE NEGATIVE 小型 HUD",
      emotion: "判断正确但危险尚未解除"
    };
  }
  if (/两人|交换.*眼神|绕到?侧门|吸引.*监听|主门/.test(text)) {
    return {
      title: "默契分工",
      visualFocus: "项目主角留在主门前吸引监听，项目角色B绕向侧门，两人用眼神完成分工",
      shotType: "中景 / 双人调度",
      characterPerformance: "项目主角正面或侧身守主门，项目角色B从侧后方移动，两人短暂对视",
      environment: "主门与侧门同时可读，走廊墙角、门框和暗部形成空间方向",
      lighting: "项目主角一侧由手电边缘光勾出，项目角色B由终端或门缝冷光补亮",
      overlay: "可加入极少量 MAIN DOOR / SIDE DOOR / LISTENING TRAP 标识",
      emotion: "无需语言的默契和行动前的安静张力"
    };
  }
  if (/门缝|光点|信号|通讯/.test(text)) {
    return {
      title: "异常光点判断",
      visualFocus: "门缝下的冷色通讯光点、项目主角的手电光束和警觉视线",
      shotType: "中近景 / 低照度悬疑",
      characterPerformance: "项目主角半蹲或侧身停步，手电斜切门缝，表情冷静但警觉",
      environment: "停电楼层走廊，地面反光，门缝冷光，远处队员保持低姿",
      lighting: "战术手电冷白光、门缝蓝绿色通讯光、走廊暗部压低",
      overlay: "可加入极少量 HUD 标记：SIGNAL / UNKNOWN / HOLD",
      emotion: "危险被提前识破的紧张感"
    };
  }
  if (/停止|抬手|压低|轴线/.test(text)) {
    return {
      title: "停止破门",
      visualFocus: "项目主角抬手制止队伍，破门前一秒的静止张力",
      shotType: "广角中景 / 战术调度",
      characterPerformance: "项目主角位于画面主导位置，一手持枪或手电，一手做停止手势",
      environment: "目标门前走廊，队伍分布在轴线外，墙面和门框形成压迫感",
      lighting: "弱环境光配合手电边缘光，角色轮廓清楚",
      overlay: "可加入细小轴线或 HOLD POSITION 标注",
      emotion: "冷静、克制、指挥权明确"
    };
  }
  if (/重新|布置|绕到?侧门|换位|队形/.test(text)) {
    return {
      title: "无声换位",
      visualFocus: "项目主角指挥项目角色B绕侧门，队形在走廊内重新展开",
      shotType: "中景 / 队形移动",
      characterPerformance: "项目主角压低动作发出手势，项目角色B从侧后方向侧门移动",
      environment: "走廊、主门、侧门同时可读，遮蔽物和墙角明确",
      lighting: "手电形成方向线，背景暗部保持空间层次",
      overlay: "可加入简洁箭头或队形节点，不遮挡角色脸",
      emotion: "默契、专业、行动前的低声紧张"
    };
  }
  if (/潜入|走廊|楼层|进入/.test(text)) {
    return {
      title: "楼内潜入建立",
      visualFocus: "项目主角带队进入停电楼层，手电光扫过潮湿地面和门廊",
      shotType: "广角建立 / 潜入氛围",
      characterPerformance: "项目主角在队伍前方，低姿推进，队员保持距离",
      environment: "夜间楼内走廊、应急灯、门牌、地面积水或反光",
      lighting: "低照度、冷色、手电光束、局部高光",
      overlay: "尽量少，保留电影感",
      emotion: "任务刚开始的不确定和压迫感"
    };
  }
  if (/眼神|冷静|停在/.test(text)) {
    return {
      title: "冷静收束",
      visualFocus: "项目主角的眼神与门缝光点形成对照，暗示下一步行动",
      shotType: "近景 / 情绪钉子",
      characterPerformance: "项目主角侧脸或三分之二脸，眼神冷静，队友在背景完成换位",
      environment: "门缝光点在前景或侧边，走廊背景虚化",
      lighting: "眼部边缘光和通讯光点形成小范围高亮",
      overlay: "可保留一个极小 SIGNAL LOST / LOCKED 标识",
      emotion: "克制的胜利感和仍未解除的危险"
    };
  }
  return {
    title: `关键情景 ${index + 1}`,
    visualFocus: compact(shot.scene),
    shotType: shot.camera || "中景 / 叙事镜头",
    characterPerformance: shot.action || "角色执行当前行动",
    environment: "根据剧本和场景设定保持空间连续",
    lighting: "电影感冷暖对比，主体可读",
    overlay: "仅保留服务叙事的信息标注",
    emotion: "动作目的清楚，情绪不过度夸张"
  };
}

function buildPrompt(project, shot, intent, refs) {
  const characters = shot.characters?.length ? shot.characters.join("、") : "资料库确认角色";
  const identityRefs = refs.identity.map((item) => item.title).join("、");
  const sceneRefs = refs.scene.map((item) => item.title).join("、");
  const propRefs = refs.prop.map((item) => item.title).join("、");
  return [
    "关键情景插图式分镜，不是线框草图，不是纯文字说明",
    "semi-realistic anime cel-shaded key scene illustration, tactical sci-fi production storyboard panel",
    `项目：${project.title}`,
    `镜头：S${shot.index} ${intent.title}`,
    `人物：${characters}`,
    `画面焦点：${intent.visualFocus}`,
    `景别/镜头：${intent.shotType}；${shot.camera || ""}`,
    `角色表演：${intent.characterPerformance}`,
    `场景：${intent.environment}`,
    `光影：${intent.lighting}`,
    `信息层：${intent.overlay}`,
    `情绪：${intent.emotion}`,
    `画风：${project.style || "近未来东方战术美少女动画分镜，电影感，克制真实"}`,
    identityRefs ? `身份参考：${identityRefs}` : "身份参考：使用资料库角色设定，缺参考时先补角色设计图",
    sceneRefs ? `场景参考：${sceneRefs}` : "",
    propRefs ? `道具参考：${propRefs}` : "",
    "构图要求：角色脸部和动作清楚，关键道具清楚，前景/中景/背景分层，画面可直接放入故事板总图",
    "禁止：随机换脸、随机换服装、无依据武器、文字水印、大段屏幕文字、过度杂乱 UI"
  ].filter(Boolean).join("；");
}

function buildEnglishBrief(shot, intent) {
  return [
    `Shot ${shot.index}, ${intent.title}.`,
    `${intent.shotType}.`,
    `Focus on ${intent.visualFocus}.`,
    `${intent.characterPerformance}.`,
    `${intent.environment}.`,
    `Lighting: ${intent.lighting}.`,
    "Semi-realistic anime cel-shaded tactical sci-fi key scene illustration, production storyboard panel, readable character acting, clean background depth."
  ].join(" ");
}

export function buildKeySceneIllustrations(pack) {
  const illustrations = (pack.shots || []).map((shot, index) => {
    const intent = inferIllustrationIntent(shot, index);
    const refs = {
      identity: collectReferences(pack, "identity_reference", shot.characters || []),
      scene: collectReferences(pack, "scene_reference"),
      prop: collectReferences(pack, "prop_reference"),
      shot: collectReferences(pack, "shot_reference"),
      style: collectReferences(pack, "style_reference")
    };
    return {
      index: shot.index,
      title: intent.title,
      scene: compact(shot.scene),
      characters: shot.characters || [],
      durationSec: shot.directorShot?.durationSec || pack.project?.director?.defaultDurationSec || 4,
      camera: {
        lens: shot.directorShot?.camera?.lens || shot.camera || "",
        movement: shot.directorShot?.camera?.movement || "",
        framing: shot.directorShot?.camera?.framing || shot.composition || ""
      },
      intent,
      references: refs,
      blockingSketchUrl: `/api/storyboards/${pack.project.id}/frames/${shot.index}.svg`,
      illustrationPrompt: buildPrompt(pack.project, shot, intent, refs),
      englishBrief: buildEnglishBrief(shot, intent),
      negativePrompt: "low quality, rough line-only storyboard, text-only layout, random redesign, inconsistent character identity, wrong uniform, wrong weapon, unreadable action, cluttered UI, watermark, logo, malformed hands, bad face",
      outputPlan: {
        directory: `output/storyboard-illustrations/project-${pack.project.id}/`,
        fileName: `S${String(shot.index).padStart(2, "0")}-key-scene.png`,
        usage: "作为故事板总图中部的正式分镜画面，也可作为 Seedance 2.0 图生视频首帧或参考帧。"
      },
      reviewChecklist: [
        "是否像角色插图/场景插图，而不是线框调度图。",
        "角色脸、服装、装备是否与身份参考一致。",
        "关键情景是否一眼可读：动作、道具、空间、情绪都要明确。",
        "是否沿用调度草图的轴线、站位和动线。",
        "UI 和字幕是否克制，不遮挡角色表情和关键道具。"
      ]
    };
  });

  return {
    standard: ILLUSTRATION_STANDARD,
    project: pack.project,
    referenceStyle: REFERENCE_STYLE,
    workflowPosition: "调度草图之后、故事板总图之前、视频模型提示词之前",
    frameCount: illustrations.length,
    layoutTarget: {
      center: "6 格关键情景插图，按时间顺序排列",
      left: "角色设定、道具设定、服装/装备说明",
      right: "场景设定、地图、战术动线",
      bottom: "项目名、风格、色板、制作信息"
    },
    illustrations,
    handoff: {
      imageModel: "使用 illustrationPrompt 生成每格关键情景插图；blockingSketchUrl 作为构图/轴线控制参考。",
      photoshop: "将生成后的 PNG 按参考样式排入单张故事板总图，统一边框、编号、字幕、色板和生产信息。",
      seedance: "每格插图可作为 15 秒短片的首帧/参考帧，directorShot.seedancePrompt 负责运动和镜头。"
    }
  };
}

export function keySceneIllustrationsToMarkdown(pack) {
  if (!pack) return "";
  const lines = [
    `# ${pack.project?.title || "关键情景插图式分镜"}`,
    "",
    `- 规格：${pack.standard}`,
    `- 工作流位置：${pack.workflowPosition}`,
    `- 参考样式：${pack.referenceStyle.title} / ${pack.referenceStyle.path}`,
    "",
    "## 参考样式分析",
    ...pack.referenceStyle.analysis.map((item) => `- ${item}`),
    "",
    "## 每镜头关键情景插图"
  ];
  for (const item of pack.illustrations || []) {
    lines.push(
      "",
      `### S${item.index} ${item.title}`,
      "",
      `- 场景：${item.scene}`,
      `- 角色：${item.characters.length ? item.characters.join("、") : "资料库确认角色"}`,
      `- 调度草图：${item.blockingSketchUrl}`,
      `- 输出：${item.outputPlan.directory}${item.outputPlan.fileName}`,
      "",
      "中文图像提示词：",
      "",
      "```text",
      item.illustrationPrompt,
      "```",
      "",
      "英文简述：",
      "",
      "```text",
      item.englishBrief,
      "```",
      "",
      "负面提示词：",
      "",
      "```text",
      item.negativePrompt,
      "```",
      "",
      "复核：",
      ...item.reviewChecklist.map((rule) => `- ${rule}`)
    );
  }
  return `${lines.join("\n")}\n`;
}
