import { toJson, fromJson } from "./utils.js";
import { timingForShot } from "./storyboard_timing.js";

const DEFAULT_DIRECTOR_OPTIONS = {
  enabled: true,
  targetModel: "Seedance 2.0",
  aspectRatio: "16:9",
  fps: 24,
  defaultDurationSec: 4,
  targetDurationSec: 0,
  autoShotPlanning: true,
  timingPlan: null,
  sceneContinuity: "统一场景设定，保持时间、天气、空间方向、角色服装和装备连续。",
  axisRule: "遵守 180 度轴线；同一场戏的角色左右关系、视线方向和行动方向保持稳定，越轴必须用中性镜头或明确转场解释。",
  cameraProfile: "动画电影分镜，35mm-50mm 等效焦段为主，少量广角建立环境，运动克制清晰。",
  motionStyle: "镜头运动服务叙事，不做无意义旋转；动作镜头优先保持主体可读性。"
};

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clampDuration(value) {
  const number = Number(value || DEFAULT_DIRECTOR_OPTIONS.defaultDurationSec);
  return Math.min(12, Math.max(1.5, number));
}

function inferShotSize(index) {
  const cycle = ["establishing", "medium", "close", "medium-wide"];
  return cycle[(Number(index || 1) - 1) % cycle.length];
}

function inferLens(shot, index) {
  const text = `${shot.scene_text} ${shot.camera} ${shot.composition}`;
  if (/全景|广角|建立|城市|基地|战场|街道|环境/.test(text)) return "24mm-28mm wide establishing lens";
  if (/特写|眼神|表情|沉默|反应|犹豫/.test(text)) return "65mm-85mm close emotional lens";
  if (/奔跑|冲刺|追逐|格斗|射击|翻越/.test(text)) return "35mm dynamic action lens";
  return index % 3 === 0 ? "50mm neutral lens" : "35mm story lens";
}

function inferCameraMove(shot) {
  const text = `${shot.scene_text} ${shot.camera} ${shot.character_action}`;
  if (/追|奔跑|冲刺|跟随|潜入/.test(text)) return "controlled tracking shot, keep subject centered";
  if (/发现|抬头|转身|凝视|对峙/.test(text)) return "slow push-in, hold eye-line";
  if (/爆炸|枪声|突袭|撞击/.test(text)) return "short handheld-feel shake, recover quickly";
  if (/建立|全景|环境/.test(text)) return "slow locked-off pan, establish geography";
  return "subtle dolly or static camera, no ornamental movement";
}

function inferAxisBeat(shot, index, options) {
  const side = index % 2 === 0 ? "screen-right" : "screen-left";
  const characters = shot.characters?.length ? shot.characters.join("、") : "主要角色";
  return {
    rule: options.axisRule,
    subjectSide: `${characters} maintains ${side} screen orientation unless a neutral cut resets the line.`,
    eyeLine: "视线方向与上一镜头保持一致；反打镜头需要保持同一空间轴线。",
    screenDirection: "行动方向在同一场景内保持连续，不突然反向。"
  };
}

function inferDuration(shot, index, options) {
  const planned = timingForShot(options.timingPlan, index);
  if (planned?.durationSec) return planned.durationSec;
  const text = `${shot.scene_text} ${shot.character_action}`;
  if (/爆炸|开枪|突袭|闪回|一瞬|发现/.test(text)) return 2.5;
  if (/对话|凝视|沉默|犹豫|观察/.test(text)) return 4.5;
  if (index === 1) return 4.0;
  return clampDuration(options.defaultDurationSec);
}

function buildVideoPrompt(project, shot, promptSpec, directorShot) {
  const parts = [
    `video storyboard shot ${shot.shot_index} for ${project.title}`,
    `model target: ${directorShot.targetModel}`,
    `timeline: ${directorShot.startSec ?? 0}s-${directorShot.endSec ?? directorShot.durationSec}s, duration ${directorShot.durationSec}s, rhythm role: ${directorShot.timingRole}`,
    `scene: ${compact(shot.scene_text)}`,
    `characters: ${(shot.characters || []).join(", ") || "canon characters only"}`,
    `visual style: ${compact(project.style_prompt)}`,
    `camera: ${directorShot.camera.lens}, ${directorShot.camera.movement}, ${directorShot.camera.framing}`,
    `axis: ${directorShot.axis.subjectSide}; ${directorShot.axis.screenDirection}`,
    `continuity: ${directorShot.continuity.sceneContinuity}`,
    `transition continuity: ${directorShot.transitionContinuity}`,
    `action: ${compact(shot.character_action)}`,
    `composition: ${compact(shot.composition)}`,
    `reference: ${promptSpec.referencePlan?.summary?.identity || ""}`,
    "stable character identity, stable costume, stable environment, clean animation-ready motion, no random redesign"
  ];
  return parts.filter(Boolean).join(", ");
}

export function normalizeDirectorOptions(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return {
    ...DEFAULT_DIRECTOR_OPTIONS,
    ...source,
    enabled: source.enabled !== false,
    targetModel: compact(source.targetModel) || DEFAULT_DIRECTOR_OPTIONS.targetModel,
    aspectRatio: compact(source.aspectRatio) || DEFAULT_DIRECTOR_OPTIONS.aspectRatio,
    fps: Number(source.fps || DEFAULT_DIRECTOR_OPTIONS.fps),
    defaultDurationSec: clampDuration(source.defaultDurationSec),
    targetDurationSec: Number(source.targetDurationSec || source.totalDurationSec || 0),
    autoShotPlanning: source.autoShotPlanning !== false,
    timingPlan: source.timingPlan || null,
    sceneContinuity: compact(source.sceneContinuity) || DEFAULT_DIRECTOR_OPTIONS.sceneContinuity,
    axisRule: compact(source.axisRule) || DEFAULT_DIRECTOR_OPTIONS.axisRule,
    cameraProfile: compact(source.cameraProfile) || DEFAULT_DIRECTOR_OPTIONS.cameraProfile,
    motionStyle: compact(source.motionStyle) || DEFAULT_DIRECTOR_OPTIONS.motionStyle
  };
}

export function directorOptionsToJson(input) {
  return toJson(normalizeDirectorOptions(input));
}

export function directorOptionsFromJson(value) {
  return normalizeDirectorOptions(fromJson(value, DEFAULT_DIRECTOR_OPTIONS));
}

export function buildDirectorShot(project, shot, promptSpec, options, index) {
  const normalized = normalizeDirectorOptions(options);
  const timing = timingForShot(normalized.timingPlan, index);
  const durationSec = inferDuration(shot, index, normalized);
  const directorShot = {
    targetModel: normalized.targetModel,
    durationSec,
    startSec: timing?.startSec ?? null,
    endSec: timing?.endSec ?? null,
    timingRole: timing?.role || "叙事推进",
    rhythmNote: timing?.rhythmNote || "按当前镜头信息量保持可读时长。",
    transitionContinuity: timing?.transitionContinuity || "承接上一镜头的视线、动作方向、道具状态或情绪强度。",
    aspectRatio: normalized.aspectRatio,
    fps: normalized.fps,
    shotSize: inferShotSize(index),
    camera: {
      lens: inferLens(shot, index),
      movement: inferCameraMove(shot),
      framing: compact(shot.composition) || "clear readable animation storyboard framing",
      profile: normalized.cameraProfile
    },
    axis: inferAxisBeat(shot, index, normalized),
    continuity: {
      sceneContinuity: normalized.sceneContinuity,
      characterContinuity: promptSpec.continuity?.rule || "Keep canon identity and equipment stable.",
      sceneLock: "同一场戏默认共用空间、天气、光线和美术设定；需要切换场景时必须写明。"
    },
    motion: {
      style: normalized.motionStyle,
      action: compact(shot.character_action),
      transitionIn: index === 1 ? "cold open or hard cut from previous scene" : (timing?.transitionContinuity || "hard cut with continuity match"),
      transitionOut: "hard cut unless the next shot requires a deliberate emotional hold"
    },
    seedancePrompt: "",
    negativePrompt: promptSpec.negativePrompt
  };
  directorShot.seedancePrompt = buildVideoPrompt(project, shot, promptSpec, directorShot);
  return directorShot;
}

export function getDirectorStandard() {
  return {
    name: "creator-director-storyboard-v2",
    targetModels: ["Seedance 2.0", "general image-to-video", "text-to-video storyboard"],
    requiredFields: [
      "durationSec",
      "startSec",
      "endSec",
      "timingRole",
      "aspectRatio",
      "camera.lens",
      "camera.movement",
      "axis",
      "continuity",
      "seedancePrompt",
      "negativePrompt"
    ],
    rules: [
      DEFAULT_DIRECTOR_OPTIONS.axisRule,
      DEFAULT_DIRECTOR_OPTIONS.sceneContinuity,
      "根据剧本目标时长自动规划镜头数量和单镜头时长；短剧优先可读动作，中长剧按段落拆分。",
      "角色身份参考优先于画风发挥；缺参考图时必须标记待复核。",
      "同一场景内不随意改变空间方向、光线、服装、武器和镜头语言。"
    ]
  };
}
