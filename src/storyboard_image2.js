import { buildSingleFrameSelfCheck, buildStoryboardAuditPack } from "./storyboard_audit.js";

const IMAGE2_STORYBOARD_STANDARD = "creator-image2-continuity-storyboard-v1";
const PHOTOSHOP_PATH = "<ADOBE_ROOT>\\Adobe Photoshop 2021";
const PREMIERE_PATH = "<ADOBE_ROOT>\\Adobe Premiere Pro 2022";

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

function shotNo(value) {
  return `S${String(value).padStart(2, "0")}`;
}

function getFrameOutput(projectId, index) {
  return `output/storyboard-illustrations/project-${projectId}/${shotNo(index)}-image2-continuity.png`;
}

function projectText(pack) {
  return compact([
    pack.sourceScript,
    pack.project?.title,
    pack.project?.style,
    pack.project?.director?.sceneContinuity,
    ...(pack.shots || []).flatMap((shot) => [shot.scene, shot.action, shot.composition])
  ].filter(Boolean).join(" "));
}

function referencePayload(ref, type, purpose) {
  return {
    type,
    fileId: ref.fileId,
    title: ref.title,
    path: ref.path,
    absPath: ref.absPath,
    visualKind: ref.visualKind,
    score: ref.namingScore || ref.score,
    purpose
  };
}

const IDENTITY_KIND_RANK = {
  character_card: 0,
  character_turnaround: 1,
  character_portrait: 12,
  military_portrait: 14
};

function identityKindRank(ref = {}) {
  return IDENTITY_KIND_RANK[ref.visualKind] ?? 50;
}

function isPrimaryIdentityAnchor(ref = {}) {
  return ref.visualKind === "character_card" || ref.visualKind === "character_turnaround";
}

function referenceKey(ref = {}) {
  return String(ref.fileId || ref.path || ref.absPath || ref.title || "");
}

function collectIdentityLocks(pack) {
  const locks = new Map();
  const characters = unique((pack.shots || []).flatMap((shot) => shot.characters || []));
  for (const character of characters) {
    const refs = (pack.visualReferences || [])
      .filter((ref) => ref.promptRole === "identity_reference")
      .filter((ref) => ref.subjectNames?.includes(character))
      .sort((a, b) => identityKindRank(a) - identityKindRank(b) || Number(b.namingScore || 0) - Number(a.namingScore || 0));
    const anchors = refs.filter(isPrimaryIdentityAnchor).slice(0, 2);
    const selectedDesign = refs.find((ref) => !isPrimaryIdentityAnchor(ref)) || anchors[0] || refs[0];
    const selected = [];
    const seen = new Set();
    for (const ref of [...anchors, selectedDesign].filter(Boolean)) {
      const key = referenceKey(ref);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push(ref);
    }
    locks.set(character, selected.map((ref) => ({
        character,
        fileId: ref.fileId,
        title: ref.title,
        path: ref.path,
        absPath: ref.absPath,
        visualKind: ref.visualKind,
        score: ref.namingScore,
        referenceUse: isPrimaryIdentityAnchor(ref) ? "identity_anchor" : "single_outfit_design_lock",
        rule: isPrimaryIdentityAnchor(ref)
          ? "character_card_or_turnaround_identity_anchor"
          : "single_outfit_design_lock_no_mixing"
      })));
  }
  return {
    characters,
    locks: Object.fromEntries([...locks.entries()]),
    missing: characters.filter((character) => !(locks.get(character) || []).length),
    rule: "每个角色最多使用角色卡/三视图身份锚加一个单一着装设计锁；禁止多个立绘混穿。"
  };
}

const PROP_REQUIREMENTS = [
  {
    id: "tactical_flashlight",
    name: "战术手电",
    pattern: /手电|战术灯|flashlight/i,
    terms: ["手电", "战术灯", "flashlight"],
    spec: "手持或枪下低位照明，冷白光束，不能变成大型探照灯。"
  },
  {
    id: "data_terminal",
    name: "数据终端",
    pattern: /终端|平板|控制板|terminal|tablet/i,
    terms: ["终端", "平板", "terminal", "tablet"],
    spec: "便携式战术终端，屏幕蓝青色 UI，显示线路、日志或无人机轨迹。"
  },
  {
    id: "access_control",
    name: "门禁终端",
    pattern: /门禁|门禁终端|access/i,
    terms: ["门禁", "access", "门禁终端"],
    spec: "安装在主门或侧门旁的墙面设备，位置必须和地图一致。"
  },
  {
    id: "access_cable",
    name: "门禁卡线缆",
    pattern: /线缆|接入|卡线|cable/i,
    terms: ["线缆", "接入", "cable"],
    spec: "短线缆连接终端与门禁，不要画成随意散乱电线。"
  },
  {
    id: "signal_detector",
    name: "信号探测器",
    pattern: /信号|通讯包|诱导信号|detector/i,
    terms: ["信号", "探测", "detector", "通讯包"],
    spec: "小型电子侦测设备或 HUD 标识，用于提示异常通讯源。"
  },
  {
    id: "drone",
    name: "巡逻无人机",
    pattern: /无人机|drone/i,
    terms: ["无人机", "drone"],
    spec: "远处红色警示灯或地图轨迹即可，不要抢占角色表演。"
  },
  {
    id: "sidearm",
    name: "低位武器/随身武装",
    pattern: /枪|武器|weapon|sidearm/i,
    terms: ["枪", "武器", "sidearm", "weapon"],
    spec: "低位持握或收纳状态，安全方向清楚，不凭空更换武器类型。"
  }
];

const SCENE_REQUIREMENTS = [
  {
    id: "rainy_corridor",
    name: "雨夜楼内/楼顶连廊",
    pattern: /雨夜|楼内|楼顶|连廊|走廊|corridor/i,
    terms: ["雨夜", "楼内", "楼顶", "连廊", "走廊", "corridor"],
    spec: "冷色低照度、湿地反光、金属/混凝土走廊，空间方向保持一致。"
  },
  {
    id: "main_door",
    name: "主门",
    pattern: /主门|目标门|main door/i,
    terms: ["主门", "目标门", "main door"],
    spec: "主门位置必须和战术地图一致，门禁终端靠近门侧。"
  },
  {
    id: "side_door",
    name: "侧门",
    pattern: /侧门|side door/i,
    terms: ["侧门", "side door"],
    spec: "侧门是项目角色B接入线路和绕行的位置，不能和主门混淆。"
  },
  {
    id: "floor_plan",
    name: "平面图/战术地图",
    pattern: /平面图|地图|战术图|动线|轴线|map|axis/i,
    terms: ["平面图", "地图", "战术图", "动线", "轴线", "map", "axis"],
    spec: "入口、主门、侧门、终端、诱导信号源、角色路线和 180 度轴线必须互相对应。"
  },
  {
    id: "decoy_signal_source",
    name: "诱导信号源",
    pattern: /诱导信号|信号源|decoy/i,
    terms: ["诱导信号", "信号源", "decoy"],
    spec: "位于门后或门缝附近，以小型红框/HUD/冷光点表现，不要画成人质。"
  }
];

function collectLockSet(pack, role, type, requirements) {
  const text = projectText(pack);
  const refs = (pack.visualReferences || [])
    .filter((ref) => ref.promptRole === role)
    .slice(0, 12)
    .map((ref) => referencePayload(ref, type, `本地${type === "prop_lock" ? "道具" : "场景"}参考`));
  const required = requirements
    .filter((item) => item.pattern.test(text))
    .map((item) => {
      const matchedRefs = refs.filter((ref) => {
        const haystack = `${ref.title || ""} ${ref.path || ""} ${ref.absPath || ""}`.toLowerCase();
        return item.terms.some((term) => haystack.includes(term.toLowerCase()));
      });
      return {
        id: item.id,
        name: item.name,
        spec: item.spec,
        status: matchedRefs.length ? "local_reference" : "needs_design",
        matchedRefs
      };
    });
  return {
    refs,
    required,
    missing: required.filter((item) => item.status !== "local_reference")
  };
}

function collectPropLocks(pack) {
  return collectLockSet(pack, "prop_reference", "prop_lock", PROP_REQUIREMENTS);
}

function collectSceneLocks(pack) {
  return collectLockSet(pack, "scene_reference", "scene_lock", SCENE_REQUIREMENTS);
}

function lockReferenceInputs(lockSet, specType) {
  return (lockSet.required || []).flatMap((item) => {
    if (item.matchedRefs?.length) {
      return item.matchedRefs.map((ref) => ({
        ...ref,
        lockId: item.id,
        lockName: item.name,
        status: item.status,
        purpose: `${item.name} 本地参考：${item.spec}`
      }));
    }
    return [{
      type: specType,
      lockId: item.id,
      lockName: item.name,
      status: item.status,
      spec: item.spec,
      purpose: `${item.name} 缺少本地参考，按此规格先生成设计或作为临时约束。`
    }];
  });
}

function buildDetailAudit(pack, propLocks, sceneLocks) {
  return {
    preGeneration: [
      "确认每个角色身份锁已加载本地参考图。",
      "确认道具锁包含剧情必需道具；缺少参考时先生成道具设计任务。",
      "确认场景锁包含主门、侧门、门禁终端、诱导信号源、动线和 180 度轴线。",
      "确认镜头调度草图、场景平面图和分镜画面使用同一空间方向。"
    ],
    perFrame: [
      "脸、发型、发饰、服装剪裁、装备位置不能漂移。",
      "手部握持、线缆连接、终端屏幕、手电光束和武器安全方向必须可读。",
      "主门、侧门、门禁终端、诱导信号源在所有镜头中的相对位置一致。",
      "雨夜光源、地面反光、HUD 标识、红色警示光不要互相矛盾。",
      "文字标签只保留短标签；小字可后期 PS 重排，不让模型生成大段正文。"
    ],
    postGeneration: [
      "逐格比对身份锁、道具锁、场景锁。",
      "核查地图、平面图、镜头方向箭头和 180 度轴线是否一致。",
      "核查细节错误：多余手指、错误装备、错位线缆、终端 UI 遮脸、反光方向错乱。",
      "需要精确文字、色板、编号时，交给 Photoshop 标注层修正。"
    ],
    acceptance: [
      "角色一致性通过。",
      "道具功能与镜头动作对应。",
      "场景空间和地图一致。",
      "细节错误不影响交付或已列入 PS 修正任务。"
    ]
  };
}

function describeShot(shot, frame, illustration) {
  const camera = illustration?.camera || frame?.camera || {};
  const axis = shot.directorShot?.axis || {};
  const continuity = shot.directorShot?.continuity || {};
  const intent = illustration?.intent || {};
  return {
    "调度": compact(
      frame?.concreteFramePrompt ||
      `${(shot.characters || []).join("、") || "角色"}执行：${shot.action || shot.scene}。保持角色站位、视线、动作方向和关键道具可读。`
    ),
    "画面": compact(
      [
        intent.visualFocus || shot.scene,
        intent.characterPerformance,
        intent.environment,
        intent.lighting
      ].filter(Boolean).join("；")
    ),
    "镜头": compact(
      [
        `时长 ${illustration?.durationSec || frame?.durationSec || shot.directorShot?.durationSec || 4}s`,
        camera.lens || shot.camera,
        camera.movement,
        camera.framing || shot.composition,
        axis.subjectSide || axis.screenDirection ? `180度轴线：${axis.subjectSide || axis.screenDirection}` : "",
        continuity.sceneContinuity ? `连续性：${continuity.sceneContinuity}` : ""
      ].filter(Boolean).join("；")
    ),
    "分镜图描述": compact(
      [
        `${shotNo(shot.index)} ${illustration?.title || shot.scene || "关键情景"}`,
        shot.action,
        `画面必须像正式角色/场景插图，不能只是文字或线框草图。`
      ].filter(Boolean).join("；")
    )
  };
}

function buildReferenceStack(pack, shot, frame, illustration) {
  const references = [];
  if (frame?.svgUrl) {
    references.push({
      type: "blocking_sketch",
      url: frame.svgUrl,
      purpose: "锁定调度、轴线、站位、动线和空间关系"
    });
  }
  if (illustration?.blockingSketchUrl && illustration.blockingSketchUrl !== frame?.svgUrl) {
    references.push({
      type: "blocking_sketch",
      url: illustration.blockingSketchUrl,
      purpose: "二次确认构图控制"
    });
  }
  for (const group of ["identity", "scene", "prop", "shot", "style"]) {
    for (const ref of illustration?.references?.[group] || []) {
      references.push({
        type: `${group}_reference`,
        fileId: ref.fileId,
        title: ref.title,
        path: ref.path,
        absPath: ref.absPath,
        purpose: ref.reason || ref.role || group
      });
    }
  }
  const characterNames = shot.characters || [];
  for (const ref of pack.visualReferences || []) {
    if (ref.promptRole !== "identity_reference") continue;
    if (characterNames.length && !ref.subjectNames?.some((name) => characterNames.includes(name))) continue;
    references.push({
      type: "identity_reference",
      fileId: ref.fileId,
      title: ref.title,
      path: ref.path,
      absPath: ref.absPath,
      purpose: ref.reason || "角色身份一致性"
    });
  }
  const deduped = [];
  const seen = new Set();
  for (const ref of references) {
    const key = `${ref.type}:${ref.fileId || ref.url || ref.path || ref.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }
  return deduped.slice(0, 10);
}

function lockSummary(lockSet, label) {
  const required = lockSet.required || [];
  if (!required.length) return `${label}：本镜头未显式要求。`;
  return `${label}：${required.map((item) => `${item.name}(${item.status === "local_reference" ? "本地参考" : "需设计"}): ${item.spec}`).join("；")}`;
}

function buildShotPrompt(pack, shot, frame, illustration, description, propLocks, sceneLocks, detailAudit, selfCheck) {
  const characters = shot.characters?.length ? shot.characters.join("、") : "资料库确认角色";
  const style = pack.project?.style || "近未来东方战术美少女动画分镜，电影感，克制真实";
  const identityLocks = collectIdentityLocks(pack);
  const lockedRefs = (shot.characters || [])
    .flatMap((character) => identityLocks.locks[character] || [])
    .map((ref) => `${ref.character}: ${ref.title} (${ref.absPath || ref.path})`)
    .join("；");
  return [
    "image-2 continuous finished storyboard frame, production-ready key scene illustration",
    `项目：${pack.project.title}`,
    `镜头：${shotNo(shot.index)} ${illustration?.title || compact(shot.scene)}`,
    `人物：${characters}，必须严格匹配本地身份参考图的脸型、发型、发色、眼睛、发饰、体态、服装剪裁、装备位置和轮廓`,
    lockedRefs ? `身份锁定参考图：${lockedRefs}` : "身份锁定参考图：缺失，必须先补角色设计图，不能生成正式资产",
    lockSummary(propLocks, "道具锁"),
    lockSummary(sceneLocks, "场景锁"),
    `调度：${description["调度"]}`,
    `画面：${description["画面"]}`,
    `镜头：${description["镜头"]}`,
    `分镜图描述：${description["分镜图描述"]}`,
    `画风：${style}`,
    "每张图要像参考故事板中的正式角色插图/场景插图：角色表演、环境光、关键道具、前中后景和电影氛围都清楚",
    selfCheck ? `单图自检：${selfCheck.promptLine}` : "",
    selfCheck ? `生成前核查：${selfCheck.preGeneration.join("；")}` : "",
    selfCheck ? `异常排查：${selfCheck.visualDefectCheck.join("；")}` : "",
    `细节核查：${detailAudit.perFrame.join("；")}`,
    "允许少量专业标注：shot number, duration, camera, movement arrow, HUD callout；标注不能遮挡角色脸、手和关键道具",
    "禁止：随机换脸、随机换服装、把其他角色的发色/发型/服装套给当前角色、错误武器、错误组织标识、纯文字版面、线稿占位、过度杂乱UI、水印、logo、低清晰度"
  ].filter(Boolean).join("；");
}

function buildUnifiedBoardPrompt(pack, frameRequests, boardSpec, identityLocks, propLocks, sceneLocks, detailAudit) {
  const shotList = frameRequests
    .map((request) => `${request.shot}: ${request.title} / ${request.outputPlan.filePath} / ${request.storyboardDescription["镜头"]}`)
    .join(" | ");
  const sections = boardSpec.requiredSections.join("、");
  const lockText = identityLocks.characters
    .map((character) => `${character}: ${(identityLocks.locks[character] || []).map((ref) => ref.absPath || ref.path || ref.title).join(" / ") || "缺失身份参考"}`)
    .join("；");
  return [
    "image-2 create one unified production storyboard board as a single high-resolution image",
    `项目：${pack.project.title}`,
    `画幅：${boardSpec.aspectRatio}，推荐尺寸：${boardSpec.recommendedSize}`,
    `必含栏目：${sections}`,
    "版面：左侧角色设计与服装/道具 callout；中部连续分镜图格，使用每个 image-2 连续分镜成片作为正式画面；右侧场景概念、平面图、战术地图、180度轴线和镜头方向；底部项目名、风格、色板、制作信息",
    `角色身份锁：${lockText}`,
    lockSummary(propLocks, "道具锁"),
    lockSummary(sceneLocks, "场景锁"),
    `镜头序列：${shotList}`,
    "每个分镜格下方必须有短文字：镜头编号、时间、调度、画面、镜头、分镜图描述；文字简洁可读，不能堆满画面",
    `细节核查：${detailAudit.perFrame.join("；")}`,
    "统一角色身份、服装、装备、场景方向、天气、光源、道具位置、动线和轴线；角色脸型、发型、发色、发饰、服装剪裁和装备轮廓必须来自本地身份锁参考图；若某格越轴，必须用中性镜头或转场标注解释",
    "整体参考本地宣传故事板样式：干净白底/深色标题条、制作总表感、画师和视频模型都能执行",
    "禁止：纯文字说明、随机重设角色、地图与分镜空间矛盾、镜头方向混乱、错别字大段文字、水印和logo"
  ].join("；");
}

export function buildImage2StoryboardPlan(pack, framePack = null, illustrationPack = null, board = null) {
  const frameByIndex = new Map((framePack?.frames || []).map((frame) => [Number(frame.index), frame]));
  const illustrationByIndex = new Map((illustrationPack?.illustrations || []).map((item) => [Number(item.index), item]));
  const aspectRatio = pack.project?.director?.aspectRatio || "16:9";
  const recommendedSize = aspectRatio === "9:16" ? "1440x2560" : "2560x1440";
  const boardSpec = {
    aspectRatio,
    recommendedSize,
    requiredSections: ["调度", "画面", "镜头", "分镜图描述", "角色设计", "服装/道具", "动线图", "场景概念", "平面图", "180度轴线", "制作信息"]
  };
  const identityLocks = collectIdentityLocks(pack);
  const propLocks = collectPropLocks(pack);
  const sceneLocks = collectSceneLocks(pack);
  const detailAudit = buildDetailAudit(pack, propLocks, sceneLocks);
  const singleFrameAudit = buildStoryboardAuditPack(pack, framePack, illustrationPack);
  const propReferenceInputs = lockReferenceInputs(propLocks, "prop_design_spec");
  const sceneReferenceInputs = lockReferenceInputs(sceneLocks, "scene_design_spec");

  const continuousFrames = (pack.shots || []).map((shot) => {
    const frame = frameByIndex.get(Number(shot.index));
    const illustration = illustrationByIndex.get(Number(shot.index));
    const storyboardDescription = describeShot(shot, frame, illustration);
    const singleFrameSelfCheck = buildSingleFrameSelfCheck(pack, shot, frame, illustration);
    const references = buildReferenceStack(pack, shot, frame, illustration);
    const outputPath = getFrameOutput(pack.project.id, shot.index);
    return {
      id: `${pack.project.id}-${shotNo(shot.index)}-image2`,
      shot: shotNo(shot.index),
      index: shot.index,
      title: illustration?.title || compact(shot.scene) || `镜头 ${shot.index}`,
      durationSec: illustration?.durationSec || frame?.durationSec || shot.directorShot?.durationSec || 4,
      characters: shot.characters || [],
      storyboardDescription,
      singleFrameSelfCheck,
      image2Prompt: buildShotPrompt(pack, shot, frame, illustration, storyboardDescription, propLocks, sceneLocks, detailAudit, singleFrameSelfCheck),
      negativePrompt: illustration?.negativePrompt || shot.negativePrompt || "low quality, text-only storyboard, line-only sketch, inconsistent identity, wrong costume, wrong prop, watermark, logo, malformed hands, bad face, chaotic layout",
      references,
      continuity: {
        previousFrame: shot.index > 1 ? getFrameOutput(pack.project.id, shot.index - 1) : null,
        nextFrame: shot.index < (pack.shots || []).length ? getFrameOutput(pack.project.id, shot.index + 1) : null,
        rule: "相邻镜头保持角色身份、服装、道具、场景方向、天气、光源、行动方向和轴线一致。"
      },
      image2Request: {
        model: "image-2",
        task: "generate_continuous_storyboard_frame",
        size: aspectRatio === "9:16" ? "1024x1792" : "1792x1024",
        prompt: buildShotPrompt(pack, shot, frame, illustration, storyboardDescription, propLocks, sceneLocks, detailAudit, singleFrameSelfCheck),
        negativePrompt: illustration?.negativePrompt || shot.negativePrompt || "",
        referenceImages: [
          ...(shot.characters || []).flatMap((character) => identityLocks.locks[character] || []).map((ref) => ({
            type: "identity_lock",
            character: ref.character,
            fileId: ref.fileId,
            title: ref.title,
            path: ref.path,
            absPath: ref.absPath,
            purpose: "强制锁定角色身份、服装、装备和轮廓"
          })),
          ...propReferenceInputs,
          ...sceneReferenceInputs,
          ...references
        ],
        outputPath
      },
      outputPlan: {
        filePath: outputPath,
        usage: "成片连续分镜图，可作为统一故事板中部画面、视频模型首帧或镜头参考帧。"
      }
    };
  });

  const unifiedBoard = {
    id: `${pack.project.id}-image2-unified-board`,
    title: `${pack.project.title} image-2 统一故事板`,
    aspectRatio,
    recommendedSize,
    requiredSections: boardSpec.requiredSections,
    sourceFrames: continuousFrames.map((frame) => frame.outputPlan.filePath),
    layoutSpec: buildUnifiedBoardPrompt(pack, continuousFrames, boardSpec, identityLocks, propLocks, sceneLocks, detailAudit),
    image2Prompt: "DEPRECATED: image-2 only generates individual approved frames; final board uses deterministic assembly.",
    negativePrompt: "do not redraw approved frames, do not invent text, do not invent camera data, do not alter character identity",
    image2Request: null,
    assemblyRequest: {
      renderer: "html-canvas-photoshop",
      task: "assemble_approved_storyboard_board",
      size: recommendedSize,
      layoutSpec: buildUnifiedBoardPrompt(pack, continuousFrames, boardSpec, identityLocks, propLocks, sceneLocks, detailAudit),
      referenceImages: [
        ...continuousFrames.map((frame) => ({
          type: "generated_continuity_frame",
          path: frame.outputPlan.filePath,
          purpose: `${frame.shot} 正式连续分镜图`
        })),
        ...(board?.characterSheet?.identityReferences || []).map((ref) => ({
          type: "identity_lock",
          fileId: ref.fileId,
          path: ref.path,
          absPath: ref.absPath,
          purpose: "统一故事板角色设计"
        })),
        ...identityLocks.characters.flatMap((character) => identityLocks.locks[character] || []).map((ref) => ({
          type: "identity_lock",
          character: ref.character,
          fileId: ref.fileId,
          title: ref.title,
          path: ref.path,
          absPath: ref.absPath,
          purpose: "统一故事板身份锁定"
        })),
        ...propReferenceInputs,
        ...sceneReferenceInputs
      ],
      outputPath: `output/storyboard-boards/project-${pack.project.id}-image2-board.png`
    },
    outputPlan: {
      filePath: `output/storyboard-boards/project-${pack.project.id}-image2-board.png`,
      metadataPath: `output/storyboard-boards/project-${pack.project.id}-image2-board.json`,
      usage: "单张统一故事板，包含连续分镜、调度、画面、镜头、分镜图描述、角色/道具、场景、平面图和轴线。"
    }
  };

  return {
    standard: IMAGE2_STORYBOARD_STANDARD,
    model: "image-2",
    project: pack.project,
    workflowPosition: "关键情景插图提示词之后、统一故事板总图之前；用于生成成片连续分镜图和最终统一故事板。",
    executionMode: "codex_native_frames_then_deterministic_board",
    identityLocks,
    propLocks,
    sceneLocks,
    lockReferenceInputs: {
      props: propReferenceInputs,
      scenes: sceneReferenceInputs
    },
    detailAudit,
    singleFrameAudit,
    blockingIssues: [
      ...identityLocks.missing.map((character) => ({
        type: "missing_identity_reference",
        character,
        action: "先补角色身份参考图或从资料库选择参考图，再生成正式 image-2 故事板。"
      })),
      ...propLocks.missing.map((item) => ({
        type: "missing_prop_reference",
        target: item.name,
        action: `补道具设计或选择本地道具参考：${item.spec}`
      })),
      ...sceneLocks.missing.map((item) => ({
        type: "missing_scene_reference",
        target: item.name,
        action: `补场景/平面图参考或生成概念设计：${item.spec}`
      }))
    ],
    passOrder: [
      "第一遍：逐镜头调用 Codex 内置 image-2，生成成片连续分镜图并落盘。",
      "第二遍：逐镜头完成真实图片 QA 与最多两轮修复。",
      "第三遍：使用 HTML/Canvas/Photoshop 把已批准图片、动线图、平面图和准确摄像机参数组装为统一故事板。"
    ],
    codexExecutionRule: "在 Codex 内执行时，优先直接调用内置 image-2 图像生成；只有当前环境没有图像生成能力时，才退回为提示词/请求包。",
    continuityRules: [
      "正式出图前必须加载 identityLocks 中的本地角色参考图；不能只靠文字描述保持角色一致。",
      "正式出图前必须核查 propLocks 和 sceneLocks；缺少道具或场景参考时，先设计再生成正式资产。",
      "每张连续分镜都继承同一角色身份参考、服装状态、道具状态和场景方向。",
      "每张连续分镜都必须先通过单图自检：角色一致、道具一致、180度轴线正确、手部动作可信、场景空间无错位、画风不漂移、画面编排能连续。",
      "调度草图负责站位、动线、视线、关键道具和 180 度轴线；正式画面必须是角色/场景插图。",
      "统一故事板必须同时可读：调度、画面、镜头、分镜图描述。",
      "外部参考只作专业细节参考，不写入正史。"
    ],
    frameCount: continuousFrames.length,
    continuousFrames,
    unifiedBoard,
    outputPlan: {
      frameDirectory: `output/storyboard-illustrations/project-${pack.project.id}/`,
      boardDirectory: "output/storyboard-boards/",
      photoshopPath: PHOTOSHOP_PATH,
      premierePath: PREMIERE_PATH
    },
    qualityGates: [
      "连续分镜是否已经是完整插图，而不是线稿、占位图或纯文字。",
      "每格是否能读出调度、画面、镜头和分镜图描述。",
      "角色脸、发型、服装、装备是否跨镜头一致。",
      "关键道具的外观、位置、握持/连接方式和功能是否跨镜头一致。",
      "单图自检是否通过：角色、道具、180度轴线、手部动作、场景空间、画风和连续性是否无明显问题。",
      "场景概念、平面图、动线图与分镜格空间是否一致。",
      "门、终端、线缆、诱导信号源、无人机路径、手电光束和 HUD 标识是否有细节错误。",
      "镜头方向和 180 度轴线是否连续；越轴是否有解释。",
      "统一故事板是否能直接交给画师、视频模型、PS 排版和 PR 粗剪。"
    ]
  };
}

export function image2StoryboardPlanToMarkdown(plan) {
  if (!plan) return "";
  const lines = [
    `# ${plan.project?.title || "image-2 连续分镜与统一故事板"}`,
    "",
    `- 规格：${plan.standard}`,
    `- 模型：${plan.model}`,
    `- 工作流位置：${plan.workflowPosition}`,
    `- 执行模式：${plan.executionMode}`,
    "",
    "## 执行顺序",
    ...plan.passOrder.map((item) => `- ${item}`),
    `- Codex 执行规则：${plan.codexExecutionRule}`,
    "",
    "## 连续性规则",
    ...plan.continuityRules.map((item) => `- ${item}`),
    "",
    "## 角色身份锁",
    ...(plan.identityLocks?.characters || []).map((character) => {
      const refs = plan.identityLocks?.locks?.[character] || [];
      return refs.length
        ? `- ${character}: ${refs.map((ref) => `${ref.title} / ${ref.absPath || ref.path}`).join("；")}`
        : `- ${character}: 缺失身份参考，必须先补角色设计图。`;
    }),
    ...(plan.blockingIssues?.length ? ["", "## 阻断问题", ...plan.blockingIssues.map((issue) => `- ${issue.character || issue.target || issue.type}: ${issue.action}`)] : []),
    "",
    "## 道具锁",
    ...((plan.propLocks?.required || []).length
      ? plan.propLocks.required.map((item) => `- ${item.name}: ${item.status} / ${item.spec}${item.matchedRefs?.length ? ` / 参考：${item.matchedRefs.map((ref) => ref.absPath || ref.path).join("；")}` : ""}`)
      : ["- 当前脚本未显式要求道具锁。"]),
    "",
    "## 场景锁",
    ...((plan.sceneLocks?.required || []).length
      ? plan.sceneLocks.required.map((item) => `- ${item.name}: ${item.status} / ${item.spec}${item.matchedRefs?.length ? ` / 参考：${item.matchedRefs.map((ref) => ref.absPath || ref.path).join("；")}` : ""}`)
      : ["- 当前脚本未显式要求场景锁。"]),
    "",
    "## 细节核查",
    "生成前：",
    ...(plan.detailAudit?.preGeneration || []).map((item) => `- ${item}`),
    "逐格：",
    ...(plan.detailAudit?.perFrame || []).map((item) => `- ${item}`),
    "生成后：",
    ...(plan.detailAudit?.postGeneration || []).map((item) => `- ${item}`),
    "",
    "## 单图自检总则",
    ...(plan.singleFrameAudit?.globalRules || []).map((item) => `- ${item}`),
    "",
    "## 逐镜头 image-2 请求"
  ];

  for (const frame of plan.continuousFrames || []) {
    lines.push(
      "",
      `### ${frame.shot} ${frame.title}`,
      "",
      `- 输出：${frame.outputPlan.filePath}`,
      `- 角色：${frame.characters.length ? frame.characters.join("、") : "资料库确认角色"}`,
      `- 时长：${frame.durationSec}s`,
      `- 调度：${frame.storyboardDescription["调度"]}`,
      `- 画面：${frame.storyboardDescription["画面"]}`,
      `- 镜头：${frame.storyboardDescription["镜头"]}`,
      `- 分镜图描述：${frame.storyboardDescription["分镜图描述"]}`,
      "",
      "单图自检：",
      ...((frame.singleFrameSelfCheck?.preGeneration || []).map((item) => `- ${item}`)),
      ...((frame.singleFrameSelfCheck?.visualDefectCheck || []).map((item) => `- ${item}`)),
      "",
      "image-2 提示词：",
      "",
      "```text",
      frame.image2Prompt,
      "```",
      "",
      "参考图：",
      ...(frame.references.length ? frame.references.map((ref) => `- ${ref.type}: ${ref.title || ref.path || ref.url} / ${ref.purpose || ""}`) : ["- 暂无命中参考，需先补角色/场景/道具设计。"])
    );
  }

  lines.push(
    "",
    "## 统一故事板 image-2 请求",
    "",
    `- 输出：${plan.unifiedBoard.outputPlan.filePath}`,
    `- 元数据：${plan.unifiedBoard.outputPlan.metadataPath}`,
    `- 推荐尺寸：${plan.unifiedBoard.recommendedSize}`,
    `- 必含栏目：${plan.unifiedBoard.requiredSections.join("、")}`,
    "",
    "统一故事板提示词：",
    "",
    "```text",
    plan.unifiedBoard.image2Prompt,
    "```",
    "",
    "## 质量复核",
    ...plan.qualityGates.map((item) => `- ${item}`),
    "",
    "## 本地工具接管",
    `- Photoshop: ${plan.outputPlan.photoshopPath}；用于故事板排版、标注、修图、色彩校准。`,
    `- Premiere: ${plan.outputPlan.premierePath}；用于 15 秒动画粗剪、字幕、节奏和导出说明。`
  );
  return `${lines.join("\n")}\n`;
}
