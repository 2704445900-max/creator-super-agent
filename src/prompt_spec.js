const STORYBOARD_STANDARD = "xinrui-storyboard-v1";

const DEFAULT_NEGATIVE_PROMPT = [
  "low quality",
  "low resolution",
  "wrong anatomy",
  "extra fingers",
  "bad hands",
  "deformed face",
  "incorrect weapon",
  "incorrect uniform",
  "inconsistent character identity",
  "watermark",
  "logo text",
  "random Chinese text",
  "overexposed",
  "messy background"
].join(", ");

const CINEMATIC_BASE = [
  "near-future Chinese tactical anime storyboard frame",
  "cinematic composition",
  "clean readable action",
  "consistent character identity",
  "practical tactical equipment",
  "controlled emotion",
  "clear foreground midground background separation"
];

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

function referencesForShot(shot, visualReferences = []) {
  const characters = shot.characters || [];
  const identity = visualReferences
    .filter((item) => item.promptRole === "identity_reference")
    .filter((item) => characters.length === 0 || item.subjectNames?.some((name) => characters.includes(name)))
    .slice(0, 4);
  const shotRefs = visualReferences
    .filter((item) => item.promptRole === "shot_reference")
    .slice(0, 3);
  const style = visualReferences
    .filter((item) => ["style_reference", "scene_reference", "prop_reference"].includes(item.promptRole))
    .slice(0, 4);
  return { identity, shot: shotRefs, style };
}

function buildReferenceLine(items) {
  if (!items.length) return "未命中专用参考图，使用资料库文字证据保持设定一致。";
  return items
    .map((item) => `${item.title || item.rel_path} (${item.promptRoleLabel || item.promptRole}, ${item.reason || `甄别分 ${item.namingScore}`})`)
    .join("；");
}

function inferControlHints(shot, references) {
  const hints = [];
  if (references.identity.length) hints.push("identity/reference: 锁定角色脸型、发型、服装、装备，不改变人物身份。");
  if (references.shot.length || /奔跑|冲刺|射击|格斗|翻越|潜入|转身/.test(shot.scene_text || "")) {
    hints.push("pose/openpose: 先定动作姿态，再生成细节。");
  }
  if (/室内|街道|基地|战场|走廊|房间|城市|废墟/.test(`${shot.scene_text} ${shot.composition}`)) {
    hints.push("depth/lineart: 保持空间层次和透视稳定。");
  }
  if (/武器|枪|狙击|装备|无人机|装甲/.test(`${shot.scene_text} ${shot.character_action}`)) {
    hints.push("canny/lineart: 保持武器和装备轮廓可信。");
  }
  if (!hints.length) hints.push("composition-only: 以文字提示词控制构图，生成后人工复核设定。");
  return hints;
}

function buildPositivePrompt(project, shot, references) {
  const characters = shot.characters?.length ? `characters: ${shot.characters.join(", ")}` : "characters: canon characters only if supported by evidence";
  const parts = [
    ...CINEMATIC_BASE,
    project.style_prompt,
    `shot ${shot.shot_index}`,
    `scene intent: ${compact(shot.scene_text)}`,
    `camera: ${compact(shot.camera)}`,
    `composition: ${compact(shot.composition)}`,
    `action: ${compact(shot.character_action)}`,
    characters,
    references.identity.length ? `identity reference: ${references.identity.map((item) => item.title).join(", ")}` : "",
    references.shot.length ? `shot reference: ${references.shot.map((item) => item.title).join(", ")}` : "",
    references.style.length ? `style and setting reference: ${references.style.map((item) => item.title).join(", ")}` : "",
    "no random redesign, no unverified relationship, no unsupported weapon"
  ];
  return unique(parts).join(", ");
}

function buildChecklist(shot, references) {
  const checklist = [
    "角色身份与资料库设定一致，不能因为画面好看而换脸、换发型或换装备。",
    "镜头要能一眼看懂动作目的，主体、视线和关键道具不能被背景吞掉。",
    "若画面涉及武器、制服、组织标识，必须和证据或参考图一致。",
    "不确定设定只做弱化处理，不画成确定事实。"
  ];
  if (!references.identity.length && shot.characters?.length) {
    checklist.push(`缺少 ${shot.characters.join("、")} 的专用身份参考图，生成前建议先补充或人工确认。`);
  }
  return checklist;
}

export function buildShotPromptSpec(project, shot, visualReferences = []) {
  const references = referencesForShot(shot, visualReferences);
  const negativePrompt = compact(shot.negative_prompt) || DEFAULT_NEGATIVE_PROMPT;
  return {
    standard: STORYBOARD_STANDARD,
    sceneIntent: compact(shot.scene_text),
    continuity: {
      characters: shot.characters || [],
      rule: "以资料库证据和视觉参考为准，缺证据时标记为待确认。"
    },
    camera: {
      lensAndMove: compact(shot.camera),
      composition: compact(shot.composition),
      action: compact(shot.character_action)
    },
    referencePlan: {
      identity: references.identity.map((item) => ({
        fileId: item.file_id,
        title: item.title,
        path: item.rel_path,
        score: item.namingScore,
        reason: item.reason
      })),
      shot: references.shot.map((item) => ({
        fileId: item.file_id,
        title: item.title,
        path: item.rel_path,
        score: item.namingScore,
        reason: item.reason
      })),
      style: references.style.map((item) => ({
        fileId: item.file_id,
        title: item.title,
        path: item.rel_path,
        score: item.namingScore,
        reason: item.reason
      })),
      summary: {
        identity: buildReferenceLine(references.identity),
        shot: buildReferenceLine(references.shot),
        style: buildReferenceLine(references.style)
      }
    },
    positivePrompt: buildPositivePrompt(project, shot, references),
    negativePrompt,
    controlHints: inferControlHints(shot, references),
    reviewChecklist: buildChecklist(shot, references)
  };
}

export function getPromptStandard() {
  return {
    name: STORYBOARD_STANDARD,
    sections: [
      "sceneIntent",
      "continuity",
      "camera",
      "referencePlan",
      "positivePrompt",
      "negativePrompt",
      "controlHints",
      "reviewChecklist"
    ],
    referenceOrder: [
      "identity_reference",
      "shot_reference",
      "scene_reference",
      "prop_reference",
      "style_reference"
    ]
  };
}
