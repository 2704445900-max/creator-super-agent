const FRAME_STANDARD = "creator-concrete-storyboard-frames-v1";

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(value, maxChars = 18, maxLines = 4) {
  const chars = Array.from(compact(value));
  const lines = [];
  let line = "";
  for (const char of chars) {
    line += char;
    if (line.length >= maxChars || /[。；，、]/.test(char)) {
      lines.push(line.trim());
      line = "";
    }
    if (lines.length >= maxLines) break;
  }
  if (line.trim() && lines.length < maxLines) lines.push(line.trim());
  return lines;
}

function textLines(value, x, y, options = {}) {
  const {
    maxChars = 18,
    maxLines = 4,
    lineHeight = 24,
    className = "body"
  } = options;
  return wrapText(value, maxChars, maxLines)
    .map((line, index) => `<text class="${className}" x="${x}" y="${y + index * lineHeight}">${xmlEscape(line)}</text>`)
    .join("\n");
}

function inferVisualBeat(frame) {
  const text = `${frame.caption} ${frame.action}`;
  if (/门缝|光点|信号|通讯/.test(text)) {
    return {
      focus: "门缝异常光点",
      prop: "通讯光点",
      posture: "观察/确认",
      cameraIntent: "把手电光束、门缝光点和角色视线连成三角关系"
    };
  }
  if (/停止|抬手|压低|轴线/.test(text)) {
    return {
      focus: "停止破门手势",
      prop: "手势/队形",
      posture: "制止/指挥",
      cameraIntent: "用清晰手势和队员位置表现战术判断"
    };
  }
  if (/重新|布置|绕侧门|换位|队形/.test(text)) {
    return {
      focus: "队形重排",
      prop: "侧门动线",
      posture: "调度/换位",
      cameraIntent: "用箭头和角色站位表现换位方向"
    };
  }
  if (/潜入|走廊|楼层|进入/.test(text)) {
    return {
      focus: "楼内潜入",
      prop: "战术手电",
      posture: "低姿进入",
      cameraIntent: "先交代走廊空间、门位和角色进入方向"
    };
  }
  return {
    focus: "角色行动节点",
    prop: "关键道具",
    posture: "行动/反应",
    cameraIntent: "确保动作目的、视线和空间关系一眼可读"
  };
}

function buildFrameLayout(frame, index) {
  const beat = inferVisualBeat(frame);
  const shot = Number(frame.index || index + 1);
  const characterNames = frame.characters?.length ? frame.characters : [];
  const leftToRight = shot % 2 === 1;
  const subjectX = leftToRight ? 190 : 450;
  const subjectY = /停止|抬手|压低/.test(frame.caption) ? 276 : 310;
  const doorX = leftToRight ? 690 : 80;
  const doorY = 190;
  const focusX = leftToRight ? 665 : 135;
  const focusY = 370;
  const arrowStartX = leftToRight ? subjectX + 44 : subjectX - 44;
  const arrowEndX = leftToRight ? focusX - 20 : focusX + 20;
  const axisY = shot % 2 === 1 ? 160 : 430;
  const secondary = characterNames.length > 1
    ? { x: leftToRight ? subjectX - 80 : subjectX + 80, y: subjectY + 32, name: characterNames[1] }
    : null;
  return {
    ...beat,
    subject: {
      x: subjectX,
      y: subjectY,
      label: characterNames[0] || "主要角色",
      side: leftToRight ? "screen-left" : "screen-right"
    },
    secondary,
    door: { x: doorX, y: doorY },
    focusPoint: { x: focusX, y: focusY },
    arrow: { x1: arrowStartX, y1: subjectY - 8, x2: arrowEndX, y2: focusY },
    axis: {
      x1: leftToRight ? 96 : 704,
      y1: axisY,
      x2: leftToRight ? 704 : 96,
      y2: shot % 2 === 1 ? 438 : 150,
      note: leftToRight ? "轴线左向右，角色保持 screen-left" : "轴线右向左，角色保持 screen-right"
    }
  };
}

function buildFramePrompt(frame, layout) {
  return [
    `具体分镜图 S${frame.index}`,
    `画面动作：${frame.caption}`,
    `画面焦点：${layout.focus}`,
    `人物：${frame.characters?.length ? frame.characters.join("、") : "资料库确认角色"}`,
    `姿态：${layout.posture}`,
    `关键道具：${layout.prop}`,
    `镜头：${frame.camera?.lens || ""}；${frame.camera?.movement || ""}`,
    `构图：${frame.camera?.framing || ""}`,
    `180度轴线：${layout.axis.note}`,
    `要求：画出可读的角色站位、视线、行动箭头、门/遮蔽物/关键道具，不只写文字说明`
  ].filter(Boolean).join("；");
}

export function buildConcreteStoryboardFrames(pack) {
  const frames = (pack.shots || []).map((shot, index) => {
    const frame = {
      index: shot.index,
      caption: compact(shot.scene),
      action: compact(shot.action),
      characters: shot.characters || [],
      camera: {
        lens: shot.directorShot?.camera?.lens || shot.camera || "",
        movement: shot.directorShot?.camera?.movement || "",
        framing: shot.directorShot?.camera?.framing || shot.composition || ""
      },
      durationSec: shot.directorShot?.durationSec || pack.project?.director?.defaultDurationSec || 4,
      seedancePrompt: shot.directorShot?.seedancePrompt || "",
      imagePrompt: shot.promptSpec?.positivePrompt || shot.positivePrompt || ""
    };
    const layout = buildFrameLayout(frame, index);
    return {
      ...frame,
      canvas: { width: 960, height: 540, aspectRatio: pack.project?.director?.aspectRatio || "16:9" },
      layout,
      concreteFramePrompt: buildFramePrompt(frame, layout),
      svgUrl: `/api/storyboards/${pack.project.id}/frames/${frame.index}.svg`,
      reviewChecklist: [
        "画面里必须有角色站位，不允许只写提示词。",
        "必须能看出视线方向、动作方向、关键道具和门/遮蔽物。",
        "同一场景的入口、主门、侧门和轴线方向必须和总图一致。",
        "角色造型以身份参考为准，缺失道具和场景标待补资产。"
      ]
    };
  });

  return {
    standard: FRAME_STANDARD,
    project: pack.project,
    frameCount: frames.length,
    usage: {
      workflowPosition: "镜头数据之后、故事板总图之前",
      purpose: "先生成每个镜头的具体画面草图，再把草图拼入单张故事板总图和视频模型提示词。",
      handoff: "可直接交给图像模型生成单帧，也可交给 Photoshop 做分镜格排版和标注。"
    },
    frames
  };
}

export function concreteStoryboardFrameToSvg(frame, project = {}) {
  const layout = frame.layout || buildFrameLayout(frame, Number(frame.index || 1) - 1);
  const subject = layout.subject;
  const secondary = layout.secondary;
  const door = layout.door;
  const focus = layout.focusPoint;
  const arrow = layout.arrow;
  const axis = layout.axis;
  const title = `S${frame.index} ${frame.caption}`;
  const movementLabel = compact(frame.camera?.movement || frame.camera?.lens || "camera");
  const duration = frame.durationSec ? `${frame.durationSec}s` : "";
  const secondaryNode = secondary ? `
      <circle cx="${secondary.x}" cy="${secondary.y - 34}" r="18" fill="#80ED99" stroke="#EAFBFF" stroke-width="2"/>
      <path d="M ${secondary.x} ${secondary.y - 12} L ${secondary.x - 14} ${secondary.y + 52} L ${secondary.x + 18} ${secondary.y + 52} Z" fill="#4B6F62" stroke="#B6F6C8" stroke-width="2"/>
      <text class="tiny" x="${secondary.x - 36}" y="${secondary.y + 78}">${xmlEscape(secondary.name)}</text>
    ` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <marker id="arrowCyan" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#4CC9F0"/>
    </marker>
    <marker id="arrowAmber" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#F9C74F"/>
    </marker>
    <style><![CDATA[
      .bg{fill:#101217}.stage{fill:#151B24;stroke:#354150;stroke-width:2}.title{font:700 24px 'Microsoft YaHei UI','Noto Sans CJK SC',sans-serif;fill:#F5F2EA}.sub{font:15px 'Microsoft YaHei UI',sans-serif;fill:#AAB2C0}.body{font:17px 'Microsoft YaHei UI',sans-serif;fill:#F5F2EA}.small{font:14px 'Microsoft YaHei UI',sans-serif;fill:#AAB2C0}.tiny{font:13px 'Microsoft YaHei UI',sans-serif;fill:#F5F2EA}.note{font:14px 'Microsoft YaHei UI',sans-serif;fill:#F9C74F}.red{fill:#E84A5F}.cyan{fill:#4CC9F0}.green{fill:#80ED99}
    ]]></style>
  </defs>
  <rect class="bg" width="960" height="540"/>
  <rect x="24" y="24" width="912" height="492" rx="12" class="stage"/>
  <text class="title" x="44" y="62">${xmlEscape(title)}</text>
  <text class="sub" x="44" y="88">${xmlEscape(project.title || "")} / ${xmlEscape(movementLabel)} / ${xmlEscape(duration)}</text>
  <rect x="54" y="118" width="852" height="290" fill="#0D131B" stroke="#445064" stroke-width="2"/>
  <path d="M 54 338 L 906 338" stroke="#2D3746" stroke-width="2"/>
  <path d="M ${axis.x1} ${axis.y1} L ${axis.x2} ${axis.y2}" stroke="#E84A5F" stroke-width="4" stroke-dasharray="10 8"/>
  <text class="note" x="66" y="396">${xmlEscape(axis.note)}</text>
  <rect x="${door.x}" y="${door.y}" width="72" height="148" fill="#111820" stroke="#9AA5B4" stroke-width="3"/>
  <line x1="${door.x - 10}" y1="${door.y + 146}" x2="${door.x + 82}" y2="${door.y + 146}" stroke="#E84A5F" stroke-width="5"/>
  <text class="small" x="${door.x - 6}" y="${door.y - 12}">目标门 / 遮蔽物</text>
  <circle cx="${focus.x}" cy="${focus.y}" r="12" fill="#E84A5F" stroke="#FFE0E5" stroke-width="2"/>
  <text class="small" x="${focus.x - 54}" y="${focus.y + 32}">${xmlEscape(layout.focus)}</text>
  <circle cx="${subject.x}" cy="${subject.y - 42}" r="22" fill="#4CC9F0" stroke="#EAFBFF" stroke-width="2"/>
  <path d="M ${subject.x} ${subject.y - 16} L ${subject.x - 22} ${subject.y + 70} L ${subject.x + 24} ${subject.y + 70} Z" fill="#29495A" stroke="#BDEFFF" stroke-width="2"/>
  <line x1="${subject.x - 16}" y1="${subject.y + 12}" x2="${subject.x - 54}" y2="${subject.y + 54}" stroke="#BDEFFF" stroke-width="5"/>
  <line x1="${subject.x + 16}" y1="${subject.y + 12}" x2="${subject.x + 58}" y2="${subject.y + 44}" stroke="#BDEFFF" stroke-width="5"/>
  <text class="tiny" x="${subject.x - 40}" y="${subject.y + 98}">${xmlEscape(subject.label)}</text>
  ${secondaryNode}
  <line x1="${arrow.x1}" y1="${arrow.y1}" x2="${arrow.x2}" y2="${arrow.y2}" stroke="#4CC9F0" stroke-width="5" marker-end="url(#arrowCyan)"/>
  <text class="small" x="${Math.min(arrow.x1, arrow.x2) + 18}" y="${Math.min(arrow.y1, arrow.y2) - 12}">视线 / 动作方向</text>
  <line x1="128" y1="448" x2="824" y2="448" stroke="#F9C74F" stroke-width="3" marker-end="url(#arrowAmber)"/>
  <text class="note" x="130" y="478">动线：${xmlEscape(layout.cameraIntent)}</text>
  ${textLines(frame.caption, 44, 430, { maxChars: 28, maxLines: 2, className: "body", lineHeight: 24 })}
  <text class="small" x="44" y="506">画面焦点：${xmlEscape(layout.focus)}；姿态：${xmlEscape(layout.posture)}；道具：${xmlEscape(layout.prop)}</text>
</svg>`;
}

export function concreteStoryboardFramesToMarkdown(framePack) {
  if (!framePack) return "";
  const lines = [
    `# ${framePack.project?.title || "具体分镜图草图"}`,
    "",
    `- 规格：${framePack.standard}`,
    `- 镜头数：${framePack.frameCount}`,
    `- 工作流位置：${framePack.usage.workflowPosition}`,
    `- 用途：${framePack.usage.purpose}`,
    "",
    "## 每镜头草图"
  ];
  for (const frame of framePack.frames || []) {
    lines.push(
      "",
      `### S${frame.index}`,
      "",
      `- 画面：${frame.caption}`,
      `- 角色：${frame.characters.length ? frame.characters.join("、") : "资料库确认角色"}`,
      `- 镜头：${frame.camera.lens} / ${frame.camera.movement}`,
      `- 草图链接：${frame.svgUrl}`,
      "",
      "具体画面提示：",
      "",
      "```text",
      frame.concreteFramePrompt,
      "```",
      "",
      "复核：",
      ...frame.reviewChecklist.map((item) => `- ${item}`)
    );
  }
  return `${lines.join("\n")}\n`;
}
