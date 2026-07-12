const BOARD_STANDARD = "xinrui-storyboard-board-v1";
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

function inferDramaScale(shots) {
  const totalDuration = Math.round(shots.reduce((sum, shot) => sum + Number(shot.durationSec || 0), 0) * 10) / 10;
  const count = shots.length;
  if (totalDuration <= 15 || count <= 6) return { type: "micro", label: "15秒以内短钩子", totalDurationSec: totalDuration, rhythm: "开场即进入行动，保留反应和落点。" };
  if (totalDuration <= 60 || count <= 14) return { type: "short", label: "1分钟以内短剧", totalDurationSec: totalDuration, rhythm: "建立目标、推进阻碍、一次转折、一个明确收束。" };
  if (totalDuration <= 180 || count <= 28) return { type: "medium", label: "1-3分钟中短剧", totalDurationSec: totalDuration, rhythm: "按段落推进，转折前后留反应镜头。" };
  return { type: "long", label: "3分钟以上中长剧", totalDurationSec: totalDuration, rhythm: "分幕推进，角色状态、空间关系和伏笔需要跨段落维护；必要时拆成多张序列故事板。" };
}

function inferSceneLock(pack) {
  const director = pack.project?.director || {};
  return {
    aspectRatio: director.aspectRatio || "16:9",
    fps: director.fps || 24,
    sceneContinuity: director.sceneContinuity || "统一时间、天气、空间方向、服装和装备。",
    axisRule: director.axisRule || "遵守 180 度轴线；越轴必须用中性镜头或明确转场解释。",
    artStyle: pack.project?.style || "近未来东方战术美少女动画分镜，克制、真实、电影感"
  };
}

function collectCharacters(pack) {
  return unique((pack.shots || []).flatMap((shot) => shot.characters || []));
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
    ? targetCharacters.map((character) => sorted.filter((item) => (item.subjectNames || []).includes(character) || `${item.title} ${item.path}`.includes(character)))
    : [sorted];
  for (const group of groups) {
    const anchors = group.filter(isPrimaryIdentityAnchor).slice(0, 2);
    const selectedDesign = group.find((item) => !isPrimaryIdentityAnchor(item)) || anchors[0] || group[0];
    for (const item of [...anchors, selectedDesign].filter(Boolean)) {
      const key = item.fileId || item.path || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push(item);
    }
  }
  return selected;
}

function collectReferences(pack, role) {
  const filtered = (pack.visualReferences || [])
    .filter((item) => !role || item.promptRole === role)
  const selected = role === "identity_reference" ? selectIdentityReferences(filtered, collectCharacters(pack)) : filtered;
  return selected
    .slice(0, 6)
    .map((item) => ({
      fileId: item.fileId,
      title: item.title,
      path: item.path,
      role: item.promptRoleLabel || item.promptRole,
      referenceUse: role === "identity_reference"
        ? (isPrimaryIdentityAnchor(item) ? "identity_anchor" : "single_outfit_design_lock")
        : role,
      reason: item.reason,
      rule: role === "identity_reference"
        ? "角色卡/三视图为身份锚；另选一个单一着装设计锁，禁止多立绘混穿。"
        : ""
    }));
}

function detectMissingDesignTasks(pack) {
  const text = `${pack.sourceScript || ""}\n${(pack.shots || []).map((shot) => `${shot.scene} ${shot.action} ${shot.composition}`).join("\n")}`;
  const refs = pack.visualReferences || [];
  const tasks = [];
  const hasIdentity = refs.some((item) => item.promptRole === "identity_reference");
  const hasScene = refs.some((item) => item.promptRole === "scene_reference");
  const hasProp = refs.some((item) => item.promptRole === "prop_reference");
  const characters = collectCharacters(pack);

  if (characters.length && !hasIdentity) {
    tasks.push({
      type: "character_design",
      title: "补充角色设计图",
      reason: `镜头中出现 ${characters.join("、")}，但没有命中稳定身份参考。`,
      output: "角色正面/侧面/背面、发型、脸型、常服/行动服、关键装备，保存到 output/visual-designs/"
    });
  }
  if (/服装|军装|制服|洋装|潜入|伪装|行动服/.test(text) && !hasProp) {
    tasks.push({
      type: "costume_design",
      title: "补充剧情服装设计",
      reason: "剧本涉及服装或行动状态，但缺少可锁定的服装/装备参考。",
      output: "服装层次、材质、颜色、磨损、组织标识、携行装备，保存到 output/visual-designs/"
    });
  }
  if (/武器|枪|装备|道具|无人机|装甲|通讯|终端/.test(text) && !hasProp) {
    tasks.push({
      type: "prop_design",
      title: "补充道具/装备设计",
      reason: "剧本涉及武器或装备，但缺少道具比例和携行方式参考。",
      output: "道具三视图、握持方式、尺寸比例、功能说明，保存到 output/visual-designs/"
    });
  }
  if (/场景|走廊|房间|街道|基地|港区|楼内|室内|室外|城市/.test(text) && !hasScene) {
    tasks.push({
      type: "scene_design",
      title: "补充场景概念和平面图",
      reason: "镜头需要稳定空间关系，但缺少场景设计参考。",
      output: "场景概念图、平面图、入口/出口/遮蔽物/角色动线，保存到 output/scene-designs/"
    });
  }
  return tasks;
}

function buildFrameStrip(pack) {
  return (pack.shots || []).map((shot, index) => ({
    index: shot.index,
    label: `镜头 ${shot.index}`,
    durationSec: shot.directorShot?.durationSec || pack.project?.director?.defaultDurationSec || 4,
    startSec: shot.directorShot?.startSec,
    endSec: shot.directorShot?.endSec,
    timingRole: shot.directorShot?.timingRole || "叙事推进",
    rhythmNote: shot.directorShot?.rhythmNote || "",
    transitionContinuity: shot.directorShot?.transitionContinuity || "",
    framePrompt: shot.promptSpec?.positivePrompt || shot.positivePrompt || "",
    caption: compact(shot.scene),
    action: compact(shot.action),
    camera: {
      lens: shot.directorShot?.camera?.lens || shot.camera || "",
      movement: shot.directorShot?.camera?.movement || "",
      framing: shot.directorShot?.camera?.framing || shot.composition || ""
    },
    axis: shot.directorShot?.axis || {},
    continuity: shot.directorShot?.continuity || {},
    controlHints: shot.promptSpec?.controlHints || [],
    reviewChecklist: shot.promptSpec?.reviewChecklist || []
  })).slice(0, 48);
}

function buildMovementMap(pack) {
  return {
    route: (pack.shots || []).map((shot, index) => ({
      node: `S${shot.index}`,
      order: index + 1,
      action: compact(shot.action || shot.scene),
      screenDirection: shot.directorShot?.axis?.screenDirection || "保持同一场景内行动方向连续。"
    })),
    rule: "动线图必须和分镜格、平面图保持一致；若角色越轴，用中性镜头或明确转场解释。"
  };
}

function buildBoardPrompt(pack, board) {
  const characters = board.characterSheet.characters.length ? board.characterSheet.characters.join("、") : "资料库确认角色";
  const shotList = board.frames.map((frame) => `S${frame.index}: ${frame.caption}; image-2 continuity frame: ${frame.image2Frame?.outputPlan?.filePath || "generate first"}; key scene illustration: ${frame.keySceneIllustration?.outputPlan?.fileName || "generate first"}; blocking sketch: ${frame.concreteFrame?.svgUrl || "generate first"}; ${frame.camera.lens}; ${frame.camera.movement}`).join(" | ");
  return [
    "Create one clean professional storyboard production board as a single image.",
    `Title: ${pack.project.title}.`,
    `Style: ${board.sceneLock.artStyle || "animation anime cinematic film quality"}. If the user does not specify another style, use animation anime cinematic film-quality visuals as the base and extend from that style.`,
    `Characters: ${characters}; keep identity, costume, hair, equipment consistent across all panels.`,
    `Layout: left character sheet; center continuous image-2 storyboard frames like finished character/scene artwork; right location concept, floor plan, tactical map and 180-degree axis; bottom project/style/color/production info.`,
    `Shots: ${shotList}.`,
    `Scene lock: ${board.sceneLock.sceneContinuity}.`,
    `Axis rule: ${board.sceneLock.axisRule}.`,
    "The meaning of the storyboard is to help create smoothly transitioning animation, not isolated pretty pictures.",
    "Each storyboard panel must include a short basic storyboard description, readable scheduling/blocking, visual composition, camera notes, and a clear transition cue from the previous panel to the next panel.",
    "Each panel must carry timeline information: start time, end time, duration and rhythm role. Shot count and duration must fit the target runtime.",
    "Before finalizing every single storyboard image, run a self-check for character consistency, prop consistency, 180-degree axis, hand/action anatomy, scene geography, style continuity and panel-to-panel continuity.",
    "Use causal narrative continuity: perception -> action -> new perception -> new action. Every panel should show what changed and why the next panel follows.",
    "Use the blocking sketches only to preserve camera direction, 180-degree axis, geography, and movement. The visible storyboard panels must be finished key-scene character illustrations with environment, lighting, props, facial expression, and cinematic atmosphere, not line-only diagrams or text placeholders. Include movement arrows, floor plan, prop/costume callouts, shot-level descriptions, no random redesign, no watermark, no messy text."
  ].join(" ");
}

export function buildStoryboardBoard(pack, concreteFramePack = null, illustrationPack = null, image2Plan = null) {
  const frames = buildFrameStrip(pack);
  const concreteFrames = new Map((concreteFramePack?.frames || []).map((frame) => [Number(frame.index), frame]));
  const illustrations = new Map((illustrationPack?.illustrations || []).map((item) => [Number(item.index), item]));
  const image2Frames = new Map((image2Plan?.continuousFrames || []).map((frame) => [Number(frame.index), frame]));
  const dramaScale = inferDramaScale(frames);
  const sceneLock = inferSceneLock(pack);
  const board = {
    standard: BOARD_STANDARD,
    project: pack.project,
    canvas: {
      target: "single_storyboard_board_image",
      aspectRatio: sceneLock.aspectRatio,
      recommendedSize: sceneLock.aspectRatio === "9:16" ? "1440x2560" : "2560x1440",
      layout: [
        "left: character design sheet, costume states, prop callouts",
        "center: image-2 continuous finished storyboard frames with shot number, duration, scheduling/blocking, visual composition, camera notes, storyboard description and transition cue",
        "right: location concept, floor plan, tactical map, 180-degree axis, camera table",
        "bottom: project name, style notes, color palette, production info",
        "center: blocking sketches remain available as hidden/secondary control reference"
      ]
    },
    dramaScale,
    sceneLock,
    frames: frames.map((frame) => ({
      ...frame,
      concreteFrame: concreteFrames.get(Number(frame.index)) || null,
      keySceneIllustration: illustrations.get(Number(frame.index)) || null,
      image2Frame: image2Frames.get(Number(frame.index)) || null
    })),
    concreteFramePack: concreteFramePack ? {
      standard: concreteFramePack.standard,
      frameCount: concreteFramePack.frameCount,
      usage: concreteFramePack.usage
    } : null,
    illustrationPack: illustrationPack ? {
      standard: illustrationPack.standard,
      frameCount: illustrationPack.frameCount,
      workflowPosition: illustrationPack.workflowPosition,
      referenceStyle: illustrationPack.referenceStyle,
      handoff: illustrationPack.handoff
    } : null,
    image2Plan: image2Plan ? {
      standard: image2Plan.standard,
      model: image2Plan.model,
      frameCount: image2Plan.frameCount,
      workflowPosition: image2Plan.workflowPosition,
      passOrder: image2Plan.passOrder,
      identityLocks: image2Plan.identityLocks,
      propLocks: image2Plan.propLocks,
      sceneLocks: image2Plan.sceneLocks,
      detailAudit: image2Plan.detailAudit,
      singleFrameAudit: image2Plan.singleFrameAudit,
      blockingIssues: image2Plan.blockingIssues,
      unifiedBoard: image2Plan.unifiedBoard,
      outputPlan: image2Plan.outputPlan
    } : null,
    characterSheet: {
      characters: collectCharacters(pack),
      identityReferences: collectReferences(pack, "identity_reference"),
      rule: "角色脸型、发型、瞳色和发饰以角色卡/三视图为身份锚；每个角色每个场景只选一个着装设计锁，其他立绘只作候选，禁止混穿；缺参考或未甄别确认时先生成/确认设计图，再生成分镜总图。"
    },
    costumePropSheet: {
      propReferences: collectReferences(pack, "prop_reference"),
      rule: "服装与道具必须说明材质、层次、携行位置和功能逻辑；不把外部参考直接写入正史。"
    },
    sceneDesign: {
      sceneReferences: collectReferences(pack, "scene_reference"),
      conceptRule: "场景概念图和平面图使用同一空间：入口、出口、遮蔽物、光源、行动路径必须能互相对应。",
      movementMap: buildMovementMap(pack)
    },
    cameraTable: frames.map((frame) => ({
      shot: frame.index,
      durationSec: frame.durationSec,
      startSec: frame.startSec,
      endSec: frame.endSec,
      timingRole: frame.timingRole,
      lens: frame.camera.lens,
      movement: frame.camera.movement,
      framing: frame.camera.framing,
      axis: frame.axis.subjectSide || frame.axis.screenDirection || "保持轴线连续"
    })),
    missingDesignTasks: detectMissingDesignTasks(pack),
    logicChecklist: [
      "image-2 先生成逐镜头成片连续分镜图，再生成统一故事板总图。",
      "根据目标片长自动合理化分镜数量和单镜头时长；短剧不拖沓，中长剧按段落拆分。",
      "每张分镜图进入统一总图前都必须通过单图自检：角色一致性、道具一致性、180度轴线、动作与手部、异常情况、场景空间、画风和画面连续性。",
      "正式出图必须加载 image-2 身份锁中的本地角色参考图，不能只靠文字描述保持角色一致。",
      "正式出图必须核查道具锁、场景锁和细节核查清单；缺项先设计，再生成正式图。",
      "统一故事板每格都必须包含调度、画面、镜头、分镜图描述四类信息。",
      "统一故事板每格必须服务于动画过渡，标明承接上一镜和引向下一镜的动作、视线、道具或情绪变化。",
      "叙事按本地剧作原则中的感知-运动链条推进：感知、运动、新感知、新运动。",
      "未特殊要求时，画风以动画二次元电影级别画质为根本进行延伸处理。",
      "每个正式分镜格必须是关键情景插图：有角色表演、环境光影、关键道具和可直接交付的画面基准。",
      "调度草图用于锁定角色站位、视线、动作方向、关键道具和空间关系，不能替代正式关键情景插图。",
      "分镜格按因果顺序阅读，动作方向不突然反转。",
      "角色设计图、服装图和每个镜头中的形象一致。",
      "道具外观、握持方式、连接方式、屏幕内容和功能逻辑跨镜头一致。",
      "动线图与场景平面图使用同一入口、出口和遮蔽物。",
      "场景概念图的光源、天气、时间与分镜一致。",
      "摄像机参数表说明焦段、运动、构图和 180 度轴线。",
      "缺少证据的设定标记为待确认，不写成 canon。"
    ],
    localToolHandoff: {
      photoshopPath: PHOTOSHOP_PATH,
      premierePath: PREMIERE_PATH,
      photoshopUse: "故事板总图排版、图层标注、局部修图、色彩校准，输出到 output/storyboard-boards/",
      premiereUse: "15 秒动画粗剪、字幕、节奏、音乐占位和导出说明，项目文件输出到 output/premiere/"
    }
  };
  return { ...board, boardPrompt: buildBoardPrompt(pack, board) };
}

export function storyboardBoardToMarkdown(board) {
  if (!board) return "";
  const lines = [
    `# ${board.project?.title || "故事板总图"}`,
    "",
    `- 规格：${board.standard}`,
    `- 画幅：${board.canvas.aspectRatio} / ${board.canvas.recommendedSize}`,
    `- 剧集尺度：${board.dramaScale.label}`,
    board.dramaScale.totalDurationSec ? `- 规划总时长：${board.dramaScale.totalDurationSec}s` : "",
    `- 节奏：${board.dramaScale.rhythm}`,
    "",
    "## 单张故事板总图提示词",
    "",
    "```text",
    board.boardPrompt,
    "```",
    "",
    "## 版面结构",
    ...board.canvas.layout.map((item) => `- ${item}`),
    "",
    "## 关键情景插图",
    ...(board.frames || []).map((frame) => `- S${frame.index}: ${frame.keySceneIllustration?.title || "未生成关键情景插图"} / ${frame.keySceneIllustration?.outputPlan?.directory || ""}${frame.keySceneIllustration?.outputPlan?.fileName || ""}`),
    "",
    "## image-2 连续分镜",
    ...(board.frames || []).map((frame) => `- S${frame.index}: ${frame.image2Frame?.title || "待生成连续分镜"} / ${frame.image2Frame?.outputPlan?.filePath || "未生成"} / ${frame.image2Frame?.storyboardDescription?.["镜头"] || frame.camera.lens}`),
    "",
    "## image-2 统一故事板",
    board.image2Plan?.unifiedBoard?.outputPlan?.filePath
      ? `- 输出：${board.image2Plan.unifiedBoard.outputPlan.filePath}`
      : "- 未生成 image-2 统一故事板请求。",
    board.image2Plan?.unifiedBoard?.requiredSections?.length
      ? `- 必含栏目：${board.image2Plan.unifiedBoard.requiredSections.join("、")}`
      : "- 必含栏目：调度、画面、镜头、分镜图描述、角色设计、动线图、场景概念、平面图。",
    "",
    "## 具体分镜图草图",
    ...(board.frames || []).map((frame) => `- S${frame.index}: ${frame.concreteFrame?.svgUrl || "未生成草图"} / ${frame.concreteFrame?.layout?.focus || frame.caption}`),
    "",
    "## 镜头与摄像机",
    ...board.cameraTable.map((item) => `- S${item.shot}: ${item.startSec ?? "?"}-${item.endSec ?? "?"}s / ${item.durationSec}s / ${item.timingRole || "叙事推进"} / ${item.lens} / ${item.movement} / ${item.axis}`),
    "",
    "## 动线图",
    ...board.sceneDesign.movementMap.route.map((item) => `- ${item.node}: ${item.action} / ${item.screenDirection}`),
    "",
    "## 缺失资产任务",
    ...(board.missingDesignTasks.length ? board.missingDesignTasks.map((item) => `- ${item.title}: ${item.reason} 输出：${item.output}`) : ["- 暂无明显缺失资产任务。"]),
    "",
    "## 逻辑复核",
    ...board.logicChecklist.map((item) => `- ${item}`),
    "",
    "## 本地工具接管",
    `- Photoshop: ${board.localToolHandoff.photoshopPath}；${board.localToolHandoff.photoshopUse}`,
    `- Premiere: ${board.localToolHandoff.premierePath}；${board.localToolHandoff.premiereUse}`
  ];
  return `${lines.join("\n")}\n`;
}
