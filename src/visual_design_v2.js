import fs from "node:fs";
import path from "node:path";
import { getOutputRoot, getProjectRoot } from "./config.js";
import { ensureDir, nowIso } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();
const OUTPUT_ROOT = getOutputRoot();
const STYLE_LIBRARY_PATH = path.join(PROJECT_ROOT, "config", "aesthetic-style-library.json");

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set((values || []).map((item) => compact(item)).filter(Boolean))];
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function safeSlug(value, fallback = "project") {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function textOf(input = {}) {
  return [input.topic, input.title, input.intent, input.prompt, input.shotPrompt, input.script, input.scene, input.action]
    .map(compact)
    .filter(Boolean)
    .join("\n");
}

function inferScene(input, text) {
  const location = compact(input.sceneLock || input.scene || input.location)
    || (/海滩|海边/.test(text) ? "海滩与近海空间" : /走廊|楼内|室内/.test(text) ? "建筑内部连续空间" : /城市|街道/.test(text) ? "城市街道空间" : "按项目场景设定锁定");
  const time = compact(input.timeOfDay)
    || (/雨夜|夜晚|黑夜/.test(text) ? "夜间" : /黄昏|日落/.test(text) ? "黄昏" : /清晨|日出/.test(text) ? "清晨" : "按剧情时间设定");
  const weather = compact(input.weather)
    || (/雨/.test(text) ? "降雨，地面和材质产生湿润反光" : /雪/.test(text) ? "降雪与低温环境反馈" : /雾/.test(text) ? "雾气影响远景层次" : "天气与项目连续性一致");
  return {
    location,
    time,
    weather,
    foreground: compact(input.foreground) || "使用前景遮挡或环境物件建立空间入口",
    midground: compact(input.midground) || "角色动作、视线和关键道具位于主要叙事层",
    background: compact(input.background) || "背景交代地点功能、出口和后续行动方向",
    geometry: compact(input.sceneGeometry) || "入口、出口、掩体、光源和角色路线必须能映射到平面图"
  };
}

function inferLighting(input, text) {
  const preset = compact(input.lightingPreset || input.lighting)
    || (/雨夜|夜晚|黑夜/.test(text) ? "low-key-rain-night" : /海滩|阳光/.test(text) ? "sunlit-coastal" : /战斗|紧张|潜入/.test(text) ? "dramatic-directional" : "cinematic-balanced");
  const presets = {
    "low-key-rain-night": {
      key: "单一明确的侧后方冷色主光，勾勒人物轮廓和雨线",
      fill: "弱环境填充，保留面部可读性但不抹平阴影",
      rim: "湿润边缘与金属表面产生受控轮廓高光",
      practicals: "场景实际灯源形成方向明确的局部暖色或警示色",
      contrast: "中高反差，黑位保留材质细节",
      temperature: "冷环境光与少量暖色实景灯形成冷暖对比"
    },
    "sunlit-coastal": {
      key: "高位自然阳光作为明确主光，方向与投影一致",
      fill: "海面和沙地提供柔和反射填充",
      rim: "逆光时用发丝和衣物边缘高光分离主体",
      practicals: "不添加无来源人工灯",
      contrast: "明快但保留肤色和白色衣料层次",
      temperature: "自然暖阳与偏冷天空反射平衡"
    },
    "dramatic-directional": {
      key: "方向性强的主光突出动作起点、受力面和关键道具",
      fill: "只补足脸部与手部识别，不削弱戏剧阴影",
      rim: "用轮廓光分离高速动作中的人物和背景",
      practicals: "场景灯、屏幕、火花或车辆灯必须有真实来源",
      contrast: "高反差但关键动作区保持可读",
      temperature: "主辅光色温有明确层级"
    },
    "cinematic-balanced": {
      key: "主光方向与剧情空间一致，优先照亮脸、手和叙事道具",
      fill: "柔和填充控制暗部层次",
      rim: "必要时使用克制轮廓光分离主体",
      practicals: "所有可见灯源与人物受光方向一致",
      contrast: "中等反差，保留材质和表情",
      temperature: "统一色温，局部强调色只服务叙事"
    }
  };
  return { preset, ...(presets[preset] || presets["cinematic-balanced"]) };
}

function inferColorBible(input, text) {
  const mood = compact(input.colorMood || input.palette || input.colorScript)
    || (/雨夜|夜晚/.test(text) ? "rain-night-tension" : /海滩|度假/.test(text) ? "coastal-leisure" : /战斗|紧张/.test(text) ? "tactical-pressure" : "creator-cinematic");
  const presets = {
    "rain-night-tension": {
      base: ["#10161C", "#24333E"], secondary: ["#526A78"], accent: ["#E4473A", "#68C6D4"],
      ratios: "基底色70%，结构辅助色20%，叙事强调色10%以内", luminance: "低明度环境，中明度人物，高明度强调只落在脸、手、武器轮廓或任务目标"
    },
    "coastal-leisure": {
      base: ["#78C9DE", "#F2D5A4"], secondary: ["#F7F3EA", "#3B7180"], accent: ["#E65D68"],
      ratios: "天空海面和沙地构成75%，角色主色20%，强调色5%", luminance: "高明度环境，肤色和白色材质避免过曝"
    },
    "tactical-pressure": {
      base: ["#1A2523", "#313B3A"], secondary: ["#6A756F"], accent: ["#D64B3F", "#D6B75A"],
      ratios: "低饱和基底75%，功能结构色20%，警示强调5%", luminance: "人物脸和手比背景高半级，关键装备边缘可读"
    },
    "creator-cinematic": {
      base: ["#20272D", "#D9E1E4"], secondary: ["#4D6A73", "#8A9298"], accent: ["#C84843", "#4AA6B5"],
      ratios: "中性基底70%，角色或阵营辅助色25%，叙事强调5%", luminance: "建立清晰明度分组，避免全画面同亮度"
    }
  };
  return {
    standard: "creator-color-bible-v1",
    mood,
    colorSpace: "sRGB delivery / OKLCH and Lab analysis / optional ACES handoff",
    ...(presets[mood] || presets["creator-cinematic"]),
    continuityRule: "同一场景跨镜头保持基底色、光源方向和色温；强调色随剧情目标移动，不随机换色。",
    checks: ["主色占比", "强调色位置", "肤色与服装分离", "暗部可读性", "跨镜头色差", "过饱和与过曝"]
  };
}

export function getAestheticStyleLibrary() {
  return readJson(STYLE_LIBRARY_PATH, { schema: "creator-aesthetic-style-library-v1", policy: {}, profiles: [] });
}

function inferStyleDna(input, text) {
  const library = getAestheticStyleLibrary();
  const requested = unique([
    ...(Array.isArray(input.styleProfileIds) ? input.styleProfileIds : []),
    ...compact(input.styleProfile || "").split(/[;,，、]/)
  ]);
  const inferred = [];
  if (/战术|军装|武器|枪|潜入|作战/.test(text)) inferred.push("tactical-anime-industrial", "military-aaa-realism");
  if (/高速|冲刺|格斗|爆发|能量/.test(text)) inferred.push("anime-action-energy");
  if (/城市|街道|赛博|都市/.test(text)) inferred.push("urban-open-world");
  if (/复古|工业|机械|苏式/.test(text)) inferred.push("retro-future-industrial");
  if (/中国|神话|传统|古代|山水/.test(text)) inferred.push("chinese-mythic-aaa");
  const ids = unique([...requested, ...inferred]).slice(0, 3);
  const profiles = ids.map((id) => library.profiles.find((item) => item.id === id)).filter(Boolean);
  if (!profiles.length) {
    const fallback = library.profiles.find((item) => item.id === "tactical-anime-industrial");
    if (fallback) profiles.push(fallback);
  }
  return {
    standard: "creator-style-dna-v1",
    profileIds: profiles.map((item) => item.id),
    internalStudySources: unique(profiles.flatMap((item) => item.studySources || [])),
    designAxes: unique(profiles.flatMap((item) => item.designAxes || [])),
    promptDescriptors: unique(profiles.flatMap((item) => item.promptDescriptors || [])),
    avoid: unique(profiles.flatMap((item) => item.avoid || [])),
    originalityRule: "只输出描述性设计语言；至少组合造型、材质/功能、色彩/镜头三个独立轴，不复刻任何具体作品资产。"
  };
}

function inferDynamics(input, text) {
  const requestedIntensity = Number(input.dynamicIntensity);
  const normalizedIntensity = Number.isFinite(requestedIntensity) && requestedIntensity > 0
    ? (requestedIntensity > 5 ? Math.ceil(requestedIntensity / 20) : requestedIntensity)
    : (/战斗|冲刺|格斗|爆炸/.test(text) ? 5 : /奔跑|转身|紧张/.test(text) ? 4 : 2);
  const intensity = Math.max(1, Math.min(5, normalizedIntensity));
  return {
    intensity,
    actionLine: compact(input.actionLine) || "从角色视线和肩胯方向建立单一动作弧线，明确起点、过程和落点",
    centerOfGravity: compact(input.centerOfGravity) || "重心落在支撑脚或可信支撑点，躯干扭转与动作目的一致",
    forceVectors: compact(input.forceVectors) || "手部、道具、衣摆和环境反馈共享同一受力方向",
    depth: "使用前景遮挡、中景角色和背景目标形成三层纵深；透视服务动作，不使用无目的夸张广角",
    motionCues: intensity >= 4
      ? "衣发、雨线、尘土、火花或环境碎屑沿动作方向反馈速度；脸、手和关键道具保持清晰"
      : "使用视线、姿态和轻微衣发变化表达状态，不堆叠无意义运动模糊"
  };
}

function inferWorldVisualBible(input, text, dramaturgyReview = {}) {
  return {
    standard: "creator-world-visual-bible-v1",
    thematicMotif: compact(input.thematicMotif || dramaturgyReview?.dominantMotif || input.intent || input.topic) || "由角色选择与代价形成主题",
    worldRule: compact(input.worldRule) || "每条世界规则必须改变制度、日常生活、角色选择和可见画面",
    institutions: compact(input.institutions) || "组织、权力、经济、技术与信息系统需形成可追踪因果",
    everydayConsequences: compact(input.everydayConsequences) || "从服装磨损、公共设施、交通、广告、居住空间和行为礼仪表现世界规则",
    conflictEngine: compact(input.conflictEngine) || "母题决定角色行动，行动产生代价和新感知，再推动下一次行动",
    visualCulture: {
      architecture: "建筑结构、材料和维护状态反映制度与资源分配",
      costume: "服装层级、材质、标识和携行方式反映身份与职业",
      props: "道具必须有生产体系、使用者、功能和磨损历史",
      information: "屏幕、标识、地图和宣传系统使用统一图形语言",
      environment: "天气、生态、能源与交通规则对人物和场景产生物理反馈"
    },
    causalityRule: "世界规则 -> 制度与资源 -> 日常行为 -> 角色选择 -> 冲突代价 -> 可见场景与动作",
    canonBoundary: "新增世界设定只作为合理推断或待确认提案，用户批准后才能进入正史。",
    sourceText: compact(text).slice(0, 600)
  };
}

function promptCompleteness(spec, visualLocks = {}) {
  const checks = [
    ["narrative_intent", spec.narrativeIntent.event],
    ["subject_action", spec.subject.action],
    ["scene_location", spec.scene.location],
    ["scene_geometry", spec.scene.geometry],
    ["blocking", spec.blocking.movement],
    ["camera_lens", spec.camera.lens],
    ["camera_composition", spec.camera.composition],
    ["lighting", spec.lighting.key],
    ["color_script", spec.colorBible.base?.length],
    ["dynamics", spec.dynamics.actionLine],
    ["style_dna", spec.styleDna.promptDescriptors?.length],
    ["qa_assertions", spec.qaAssertions.length]
  ];
  const missing = checks.filter(([, value]) => !value).map(([id]) => id);
  const locks = visualLocks.characterDesignLocks || [];
  const lockIssues = locks.filter((item) => !["ready", "confirmed", "locked"].includes(String(item.status || "").toLowerCase()));
  const score = Math.max(0, Math.round(((checks.length - missing.length) / checks.length) * 100) - Math.min(24, lockIssues.length * 8));
  return {
    score,
    missing,
    lockIssues: lockIssues.map((item) => `${item.character || "角色"}: ${item.status}`),
    canDraft: score >= 70,
    canFinal: score >= 88 && lockIssues.length === 0
  };
}

export function buildImagePromptV2(input = {}, context = {}) {
  const text = textOf(input);
  const visualLocks = context.visualLocks || context.visualLock || {};
  const characters = unique(context.characters || input.characters || []);
  const scene = inferScene(input, text);
  const lighting = inferLighting(input, text);
  const colorBible = inferColorBible(input, text);
  const styleDna = inferStyleDna(input, text);
  const dynamics = inferDynamics(input, text);
  const worldVisualBible = inferWorldVisualBible(input, text, context.dramaturgyReview || {});
  const action = compact(input.characterAction || input.action || input.shot?.action || input.prompt || input.intent) || "角色执行具有明确目的和结果的动作";
  const handInteraction = compact(input.handInteraction)
    || (/枪|武器|刀|剑|终端|手机|道具|装备/.test(text)
      ? "双手或单手与道具接触点清楚；手腕、手指、扳机区/握把区和道具受力关系正确"
      : "手部姿态自然，手腕方向与前臂一致，不隐藏关键动作");
  const spec = {
    standard: "creator-image-prompt-v2",
    createdAt: nowIso(),
    narrativeIntent: {
      event: compact(input.visualEvent || input.prompt || input.intent || input.topic) || "表现当前镜头的关键情景",
      emotion: compact(input.emotion || input.mood) || (/紧张|战斗|潜入/.test(text) ? "克制紧张，角色保持决策压力" : "情绪由角色动作和环境反馈自然表达"),
      visualThesis: compact(input.visualThesis) || "让观众一眼理解角色正在做什么、为什么做以及下一步将发生什么"
    },
    subject: {
      characters,
      action,
      gaze: compact(input.gaze) || "视线指向行动目标或关键道具，和头部、躯干方向一致",
      bodyMechanics: compact(input.bodyMechanics) || "肩胯扭转、关节方向、支撑脚和重心符合动作受力",
      handInteraction
    },
    scene,
    blocking: {
      positions: compact(input.positions || input.blocking) || "角色、目标、道具和主要光源位置可在平面图中复现",
      sightLines: compact(input.sightLines) || "角色视线与镜头引导线共同指向叙事目标",
      movement: compact(input.movementPath || input.blocking) || "标明角色从哪里进入、向哪里移动、在哪里完成动作",
      axis: compact(input.axisRule) || "遵守180度轴线，左右关系和行动方向稳定；越轴必须有中性镜头解释"
    },
    camera: {
      shotSize: compact(input.shotSize) || "中景到中近景，按动作可读性调整",
      lens: compact(input.lens || input.camera || input.shot?.camera) || "35mm电影镜头",
      height: compact(input.cameraHeight) || "接近角色胸口到视线高度",
      angle: compact(input.cameraAngle) || "机位角度服务力量关系，不使用无目的倾斜",
      movement: compact(input.cameraMovement) || "单帧表现明确的镜头运动趋势",
      composition: compact(input.composition || input.shot?.composition) || "主体位于视觉重心，前中后景和负空间服务叙事",
      depthOfField: compact(input.depthOfField) || "关键脸部、手部和道具清晰，背景景深不吞没空间信息"
    },
    lighting,
    colorBible,
    dynamics,
    materials: unique([
      compact(input.materials),
      "布料厚度、缝线、护具、金属、聚合物和皮肤具有明确材质差异",
      /雨/.test(text) ? "雨水在头发、服装、武器和地面产生方向一致的湿润反馈" : "环境状态影响人物与道具表面"
    ]),
    styleDna,
    worldVisualBible,
    negativeConstraints: unique([
      "角色身份漂移或混入其他角色特征",
      "同一角色混穿多套服装和配饰",
      "多余肢体、断裂关节、肩颈错位、反向手腕、错误手指数量",
      "手与道具悬空、穿模、握持点和受力方向错误",
      "场景入口出口、透视、光源、阴影和角色路线互相矛盾",
      "无来源轮廓光、全画面同亮度、过曝高光和无意义霓虹",
      "直接复制外部作品角色、标识、道具或场景",
      "随机文字、水印、logo、乱码屏幕和用运动模糊掩盖错误"
    ]),
    qaAssertions: [
      "角色正在做什么、动作目的和下一步结果一眼可读",
      "肩肘腕、髋膝踝、手指和道具接触关系符合人体与受力逻辑",
      "场景前中后景、入口出口、人物站位和动线可以映射到平面图",
      "主光方向、阴影、轮廓光、实景灯和天气反馈一致",
      "主色、辅助色、强调色比例与项目色彩圣经一致",
      "动作线、重心、透视和环境反馈形成视觉张力但不遮挡脸、手和关键道具",
      "风格使用描述性设计语言并保持原创，不直接复制参考作品"
    ]
  };
  spec.completeness = promptCompleteness(spec, visualLocks);
  spec.compiledPrompt = [
    `【叙事意图】${spec.narrativeIntent.event}；${spec.narrativeIntent.emotion}；${spec.narrativeIntent.visualThesis}。`,
    `【角色与动作】${characters.join("、") || "按项目角色锁定"}；${spec.subject.action}；${spec.subject.gaze}；${spec.subject.bodyMechanics}；${spec.subject.handInteraction}。`,
    `【场景空间】${scene.location}，${scene.time}，${scene.weather}；前景：${scene.foreground}；中景：${scene.midground}；背景：${scene.background}；空间规则：${scene.geometry}。`,
    `【调度与轴线】${spec.blocking.positions}；${spec.blocking.sightLines}；${spec.blocking.movement}；${spec.blocking.axis}。`,
    `【镜头】${spec.camera.shotSize}；${spec.camera.lens}；机位高度：${spec.camera.height}；角度：${spec.camera.angle}；运动趋势：${spec.camera.movement}；构图：${spec.camera.composition}；景深：${spec.camera.depthOfField}。`,
    `【布光】主光：${lighting.key}；辅光：${lighting.fill}；轮廓光：${lighting.rim}；实景光：${lighting.practicals}；反差：${lighting.contrast}；色温：${lighting.temperature}。`,
    `【色彩】基底色 ${colorBible.base.join("/")}；辅助色 ${colorBible.secondary.join("/")}；强调色 ${colorBible.accent.join("/")}；比例：${colorBible.ratios}；明度：${colorBible.luminance}。`,
    `【动态张力】强度 ${dynamics.intensity}/5；${dynamics.actionLine}；${dynamics.centerOfGravity}；${dynamics.forceVectors}；${dynamics.depth}；${dynamics.motionCues}。`,
    `【材质】${spec.materials.join("；")}。`,
    `【风格DNA】${styleDna.promptDescriptors.join("；")}；${styleDna.originalityRule}。`,
    `【世界观视觉规则】${worldVisualBible.causalityRule}；${worldVisualBible.everydayConsequences}。`,
    `【负面约束】${spec.negativeConstraints.join("；")}。`,
    `【生成后断言】${spec.qaAssertions.join("；")}。`
  ].join("\n");
  return spec;
}

export function persistVisualBibles(input = {}, bundle = {}) {
  const projectSlug = safeSlug(input.projectSlug || "");
  if (!input.projectSlug) return null;
  const projectRoot = path.resolve(OUTPUT_ROOT, "projects", projectSlug);
  const allowedRoot = path.resolve(OUTPUT_ROOT, "projects");
  if (!projectRoot.startsWith(allowedRoot)) throw new Error("invalid project visual bible path");
  const root = path.join(projectRoot, "02_research", "aesthetic");
  ensureDir(root);
  const files = {
    promptSpec: path.join(root, "image-prompt-v2.json"),
    colorBible: path.join(root, "color-bible.json"),
    styleDna: path.join(root, "style-dna.json"),
    worldVisualBible: path.join(root, "world-visual-bible.json")
  };
  for (const [key, filePath] of Object.entries(files)) {
    fs.writeFileSync(filePath, `${JSON.stringify(bundle[key] || {}, null, 2)}\n`, "utf8");
  }
  return files;
}
