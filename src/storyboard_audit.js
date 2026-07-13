function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function shotNo(value) {
  return `S${String(value).padStart(2, "0")}`;
}

function listOrFallback(values, fallback) {
  const items = (values || []).map(compact).filter(Boolean);
  return items.length ? items : [fallback];
}

function previousNextRule(shot, pack) {
  const index = Number(shot.index || shot.shot_index || 1);
  const total = pack?.shots?.length || 1;
  if (index === 1) return "第一镜必须建立空间方向、角色初始状态和主动作方向。";
  if (index === total) return "最后一镜必须承接上一镜动作或情绪，并给出清晰落点。";
  return "必须承接上一镜并把视线、动作、道具或情绪递交给下一镜。";
}

export function buildSingleFrameSelfCheck(pack, shot, frame = null, illustration = null) {
  const characters = listOrFallback(shot.characters, "资料库确认角色");
  const axis = shot.directorShot?.axis || {};
  const camera = shot.directorShot?.camera || {};
  const propHints = [
    shot.action,
    shot.scene,
    frame?.layout?.prop,
    illustration?.intent?.props,
    illustration?.intent?.visualFocus
  ].filter(Boolean).map(compact);

  return {
    standard: "creator-single-frame-self-check-v1",
    shot: shotNo(shot.index || shot.shot_index || 1),
    title: illustration?.title || compact(shot.scene) || "分镜图",
    preGeneration: [
      `角色一致性：${characters.join("、")} 的脸型、发型、发色、眼睛、发饰、体态、服装剪裁、装备位置必须与本地身份参考一致。`,
      `道具一致性：${propHints.length ? propHints.join("；") : "本镜头涉及的手持物、武器、终端、服装附件和场景道具"} 必须保持外形、尺寸、握持方式和功能逻辑一致。`,
      `180度轴线：${axis.subjectSide || axis.screenDirection || "同一场景内角色左右关系、视线方向和行动方向不得突然反转；越轴必须用中性镜头解释。"}`,
      `镜头连续性：${previousNextRule(shot, pack)}`,
      `场景锁：入口、出口、门、遮挡物、光源、地面、角色路线和平面图必须互相对应。`
    ],
    visualDefectCheck: [
      "动作是否清楚可读，身体重心是否合理，不出现断肢、扭曲关节、错误透视或漂浮姿态。",
      "手部动作是否可信，手指数、手掌朝向、握持点、手与道具接触关系不出错。",
      "角色脸、发型、服装、装备是否跨镜头统一，不出现随机换脸、换衣、换发饰或错拿别人道具。",
      "道具和武器是否符合剧情功能，枪口/刀刃/线缆/屏幕/按钮方向不混乱。",
      "场景空间关系是否与平面图一致，门、桌、窗、掩体、车辆、道路、光源的位置不互相打架。",
      "构图是否服务本镜头重点，主体、动作线、视线和关键道具没有被字幕、HUD 或标注遮挡。",
      "画风是否统一，线条、上色、光照、色彩、景深和角色渲染不突然换风格。",
      "画面是否连续，上一镜的动作结果、道具状态、人物朝向和情绪强度能自然接到下一镜。",
      "是否存在模型异常：多余手指、多余肢体、脸部崩坏、衣物穿模、透视断裂、文字乱码、水印或 logo。"
    ],
    acceptance: [
      "角色一致性通过，或已列出需要重生/修图的具体问题。",
      "道具、服装、场景与上一镜和下一镜能连上。",
      "180度轴线、视线方向和行动方向没有无解释跳变。",
      "画面可作为关键情景插图交付给 image-2、PS 排版、AE/PR 后续制作。"
    ],
    promptLine: [
      "single-frame self-check before finalizing:",
      "keep character identity and costume consistent;",
      "keep props and weapon handling consistent;",
      "respect 180-degree axis and screen direction;",
      "avoid broken hands, twisted anatomy, extra limbs, wrong perspective;",
      "keep scene geography, floor plan, lighting and style continuous;",
      "reject frame if action, hands, props, space or style continuity fails."
    ].join(" ")
  };
}

export function buildStoryboardAuditPack(pack, framePack = null, illustrationPack = null) {
  const frameByIndex = new Map((framePack?.frames || []).map((frame) => [Number(frame.index), frame]));
  const illustrationByIndex = new Map((illustrationPack?.illustrations || []).map((item) => [Number(item.index), item]));
  const checks = (pack?.shots || []).map((shot) => buildSingleFrameSelfCheck(
    pack,
    shot,
    frameByIndex.get(Number(shot.index)),
    illustrationByIndex.get(Number(shot.index))
  ));

  return {
    standard: "creator-storyboard-single-frame-audit-pack-v1",
    project: pack?.project || null,
    frameCount: checks.length,
    scope: "逐张分镜图生成前后自检；覆盖角色、道具、180度轴线、手部动作、场景空间、画风和连续性。",
    checks,
    globalRules: [
      "先用本地资料库和视觉参考锁角色、道具、场景、服装和画风。",
      "每张图都必须通过单图自检后，才能进入统一故事板总图。",
      "发现角色或道具不一致时，优先重生该镜头；发现局部小错时交给 Photoshop 修图标注。",
      "外部资料只作为专业参考，不直接写入正史。"
    ]
  };
}

export function storyboardAuditPackToMarkdown(auditPack) {
  if (!auditPack) return "";
  const lines = [
    `# ${auditPack.project?.title || "分镜图单图自检"}`,
    "",
    `- 规格：${auditPack.standard}`,
    `- 范围：${auditPack.scope}`,
    `- 镜头数：${auditPack.frameCount}`,
    "",
    "## 全局规则",
    ...(auditPack.globalRules || []).map((item) => `- ${item}`),
    "",
    "## 逐镜自检"
  ];

  for (const check of auditPack.checks || []) {
    lines.push(
      "",
      `### ${check.shot} ${check.title}`,
      "",
      "生成前：",
      ...(check.preGeneration || []).map((item) => `- ${item}`),
      "",
      "画面缺陷：",
      ...(check.visualDefectCheck || []).map((item) => `- ${item}`),
      "",
      "通过条件：",
      ...(check.acceptance || []).map((item) => `- ${item}`)
    );
  }

  return `${lines.join("\n")}\n`;
}
