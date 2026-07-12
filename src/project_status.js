import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";

const PROJECTS_ROOT = path.join(getOutputRoot(), "projects");
const VISUAL_QA_REL = path.join("04_storyboard", "qa", "visual_checks");
const VISUAL_QA_CATEGORY_LABELS = {
  characters: "角色",
  scenes: "场景",
  props: "道具",
  storyboards: "分镜图",
  other: "其他"
};

const STAGES = [
  {
    id: "brief",
    label: "立项",
    files: ["project.json", "00_brief/project-brief.md"],
    folders: ["00_brief"],
    next: "补齐项目目标、受众、片长、输出格式和正史边界。"
  },
  {
    id: "script",
    label: "剧本",
    folders: ["01_script/drafts", "01_script/revisions"],
    extensions: [".md", ".txt", ".docx"],
    next: "把当前剧本放入 drafts，并跑四层叙事审查。"
  },
  {
    id: "research",
    label: "外部研究",
    files: ["research-plan.json", "reference-plan.json"],
    folders: ["02_research/external_pending", "02_research/aesthetic"],
    next: "补齐武器、城市、军装、道具、场景、平台趋势等浏览器研究。"
  },
  {
    id: "art",
    label: "美术资产",
    files: ["asset-inventory.json"],
    folders: ["03_art/characters", "03_art/costumes", "03_art/scenes", "03_art/props", "03_art/style"],
    next: "确认角色身份参考、服装状态、道具型号、场景平面图和统一画风。"
  },
  {
    id: "storyboard",
    label: "故事板",
    folders: ["04_storyboard/blocking", "04_storyboard/key_illustrations", "04_storyboard/boards"],
    extensions: [".md", ".json", ".png", ".jpg", ".jpeg", ".webp"],
    next: "生成分镜时长规划、关键情景图、统一故事板总图和单图自检。"
  },
  {
    id: "animation",
    label: "动画",
    folders: ["05_animation/ae", "05_animation/spine_or_live2d"],
    extensions: [".aep", ".psd", ".json", ".png", ".mp4"],
    next: "建立 AE/Spine 动画源文件，确认角色微动、头发、呼吸和镜头运动。"
  },
  {
    id: "editing",
    label: "剪辑",
    folders: ["06_editing/premiere", "06_editing/davinci_handoff"],
    extensions: [".prproj", ".xml", ".edl", ".mp4", ".srt"],
    next: "进入 PR 粗剪、字幕、音乐节奏和导出说明。"
  },
  {
    id: "publishing",
    label: "宣发",
    folders: ["08_publish/bilibili", "08_publish/xiaohongshu", "08_publish/douyin"],
    extensions: [".md", ".json", ".png", ".jpg", ".jpeg"],
    next: "补封面 brief、标题、简介、标签、发布时间和复盘指标。"
  },
  {
    id: "review",
    label: "复盘",
    folders: ["09_review/video_analysis"],
    extensions: [".md", ".json", ".xlsx", ".csv"],
    next: "导入成片与平台数据，分析受众、留存、发布时间和下一轮选题。"
  },
  {
    id: "exports",
    label: "导出",
    folders: ["99_exports"],
    extensions: [".mp4", ".mov", ".zip", ".png", ".jpg"],
    next: "输出最终视频、故事板图、发布素材和归档包。"
  }
];

function safeReadJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function exists(projectPath, relPath) {
  return fs.existsSync(path.join(projectPath, relPath));
}

function countFiles(folderPath, extensions = []) {
  if (!fs.existsSync(folderPath)) return 0;
  const stack = [folderPath];
  let count = 0;
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        if (!extensions.length || extensions.includes(path.extname(entry.name).toLowerCase())) count += 1;
      }
    }
  }
  return count;
}

function listFiles(folderPath, extensions = []) {
  if (!fs.existsSync(folderPath)) return [];
  const stack = [folderPath];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        if (!extensions.length || extensions.includes(path.extname(entry.name).toLowerCase())) files.push(fullPath);
      }
    }
  }
  return files;
}

function inferVisualQaCategoryFromReport(report = {}, relPath = "") {
  const explicit = String(report.reportFiles?.projectArchive?.category || "").trim();
  if (explicit) return explicit;
  const text = [
    relPath,
    report.imageInfo?.assetType,
    report.imageInfo?.visualKind,
    report.imageInfo?.promptRole,
    report.imageInfo?.relPath,
    report.imageInfo?.imagePath
  ].join("\n").toLowerCase();
  if (/storyboard|shot_reference|frame|分镜|故事板|镜头/.test(text)) return "storyboards";
  if (/scene|location|map|floor|场景|地图|平面图|室内|基地|城市|街道|走廊/.test(text)) return "scenes";
  if (/weapon|prop|equipment|costume|terminal|drone|rifle|gun|sword|道具|武器|装备|服装|终端|无人机|步枪|枪|剑/.test(text)) return "props";
  if (/character|portrait|turnaround|identity|military_portrait|角色|立绘|三视图|人物|身份/.test(text)) return "characters";
  return "other";
}

function readVisualQaSummary(projectPath) {
  const qaRoot = path.join(projectPath, VISUAL_QA_REL);
  const jsonFiles = listFiles(qaRoot, [".json"]);
  const byCategory = Object.fromEntries(Object.keys(VISUAL_QA_CATEGORY_LABELS).map((id) => [id, 0]));
  const reports = [];
  for (const filePath of jsonFiles) {
    const report = safeReadJson(filePath, null);
    if (!report) continue;
    const relPath = path.relative(qaRoot, filePath);
    const category = inferVisualQaCategoryFromReport(report, relPath);
    byCategory[category] = (byCategory[category] || 0) + 1;
    const decision = report.boardDecision || report.gate || {};
    const stat = fs.statSync(filePath);
    reports.push({
      filePath,
      relPath,
      category,
      categoryLabel: VISUAL_QA_CATEGORY_LABELS[category] || VISUAL_QA_CATEGORY_LABELS.other,
      createdAt: report.createdAt || stat.mtime.toISOString(),
      status: decision.status || "",
      label: decision.label || "",
      canEnterImage2: Boolean(decision.canEnterImage2),
      canEnterSeedanceDraft: Boolean(decision.canEnterSeedanceDraft || decision.canGenerateDraft),
      canEnterSeedanceFinal: Boolean(decision.canEnterSeedanceFinal || decision.canGenerateFinal),
      blockerCount: decision.status === "blocked" ? 1 : 0,
      repairCount: decision.status === "repair_required" ? 1 : 0,
      mustFixCount: (decision.mustFixBeforeFinal || decision.blockers || []).length,
      imagePath: report.imageInfo?.imagePath || "",
      fileId: report.imageInfo?.fileId || null
    });
  }
  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const blocked = reports.filter((item) => item.status === "blocked").length;
  const repairRequired = reports.filter((item) => item.status === "repair_required").length;
  const passed = reports.filter((item) => item.status === "pass").length;
  const seedanceDraftReady = reports.filter((item) => item.canEnterSeedanceDraft).length;
  const seedanceFinalReady = reports.filter((item) => item.canEnterSeedanceFinal).length;
  return {
    root: qaRoot,
    total: reports.length,
    markdownCount: listFiles(qaRoot, [".md"]).length,
    blocked,
    repairRequired,
    passed,
    seedanceDraftReady,
    seedanceFinalReady,
    byCategory,
    categoryLabels: VISUAL_QA_CATEGORY_LABELS,
    latest: reports[0] || null,
    recent: reports.slice(0, 5)
  };
}

function getStageStatus(projectPath, stage) {
  const fileHits = (stage.files || []).filter((file) => exists(projectPath, file));
  const folderHits = (stage.folders || []).filter((folder) => exists(projectPath, folder));
  const contentCount = (stage.folders || []).reduce((sum, folder) => {
    return sum + countFiles(path.join(projectPath, folder), stage.extensions || []);
  }, 0);
  const requiredCount = (stage.files || []).length + (stage.folders || []).length;
  const hitCount = fileHits.length + folderHits.length;
  let status = "missing";
  if (requiredCount && hitCount >= requiredCount && (contentCount > 0 || stage.files?.some((file) => fileHits.includes(file)))) {
    status = "done";
  } else if (hitCount > 0 || contentCount > 0) {
    status = "partial";
  }
  return {
    id: stage.id,
    label: stage.label,
    status,
    fileHits,
    folderHits,
    contentCount,
    next: stage.next
  };
}

function scoreStatus(stages) {
  const done = stages.filter((stage) => stage.status === "done").length;
  const partial = stages.filter((stage) => stage.status === "partial").length;
  const missing = stages.filter((stage) => stage.status === "missing").length;
  const score = Math.round(((done + partial * 0.45) / stages.length) * 100);
  return { done, partial, missing, score };
}

function nextActions(stages, visualQa = null) {
  const firstMissing = stages.find((stage) => stage.status === "missing");
  const firstPartial = stages.find((stage) => stage.status === "partial");
  const current = firstPartial || firstMissing;
  const actions = [];
  if (current) actions.push(`${current.label}：${current.next}`);
  if (visualQa?.blocked) actions.push(`视觉 QA 存在 ${visualQa.blocked} 个阻断报告，先回到提示词、视觉参考或 PS 修复。`);
  if (visualQa?.repairRequired) actions.push(`视觉 QA 存在 ${visualQa.repairRequired} 个需修报告，正式 Seedance 前需要复核。`);
  const storyboard = stages.find((stage) => stage.id === "storyboard");
  if (storyboard?.status !== "done") actions.push("正式生成前先补故事板总图和单图视觉自检。");
  const art = stages.find((stage) => stage.id === "art");
  if (art?.status !== "done") actions.push("先锁定角色、服装、道具、场景和风格资产，再进入 image-2。");
  return actions.slice(0, 4);
}

function getCurrentStage(stages) {
  return stages.find((stage) => stage.status === "partial")
    || stages.find((stage) => stage.status === "missing")
    || stages[stages.length - 1];
}

function buildContinuation(projectJson, stages, inventory) {
  const current = getCurrentStage(stages);
  const actionsByStage = {
    brief: {
      label: "补立项 brief",
      endpoint: "/api/projects/create",
      payloadHint: "补齐标题、目标、时长、受众、正史边界"
    },
    script: {
      label: "跑四层剧本审查",
      endpoint: "/api/dramaturgy/review",
      payloadHint: "把 drafts 中的剧本片段送入四层叙事规则库"
    },
    research: {
      label: "生成浏览器优先研究计划",
      endpoint: "/api/research/plan",
      payloadHint: "补现实武器、城市、平台趋势、导演和动画参考"
    },
    art: {
      label: "重新盘点美术资源",
      endpoint: "/api/assets/inventory",
      payloadHint: "补角色、服装、道具、场景、风格锁定"
    },
    storyboard: {
      label: "生成故事板和单图自检",
      endpoint: "/api/storyboards/generate + /api/pipeline/visual-check",
      payloadHint: "先做关键情景图，再做统一故事板和视觉检查"
    },
    animation: {
      label: "生成 AE/Spine 动画计划",
      endpoint: "/api/postproduction/rigging-plan",
      payloadHint: "检查拆图、呼吸、头发、身体微动和源文件交接"
    },
    editing: {
      label: "生成 PR 粗剪计划",
      endpoint: "/api/postproduction/video-plan",
      payloadHint: "字幕、节奏、音画、转场和导出说明"
    },
    publishing: {
      label: "生成 B站宣发方案",
      endpoint: "/api/publishing/bilibili",
      payloadHint: "标题、封面、简介、标签、发布时间"
    },
    review: {
      label: "成片复盘",
      endpoint: "/api/postproduction/video-review",
      payloadHint: "分析受众、留存、发布时间和下一轮选题"
    },
    exports: {
      label: "归档和迁移",
      endpoint: "/api/package/portable-plan",
      payloadHint: "打包源文件、素材、配置和恢复步骤"
    }
  };
  const action = actionsByStage[current?.id] || actionsByStage.brief;
  const missingAssets = inventory?.categories
    ?.flatMap((category) => (category.missingTasks || []).map((task) => ({ category: category.label, task })))
    .slice(0, 8) || [];
  return {
    currentStage: current ? {
      id: current.id,
      label: current.label,
      status: current.status
    } : null,
    recommendedAction: action,
    projectPayloadSeed: {
      title: projectJson.title || "",
      intent: projectJson.intent || "",
      script: projectJson.script || ""
    },
    missingAssets,
    workbenchOrder: [
      "资料库首要结论卡",
      "剧本四层审查",
      "资产清单",
      "单帧提示词细化",
      "故事板视觉检查",
      "Seedance 成本估算",
      "AE/PR 后期",
      "B站宣发/复盘"
    ]
  };
}

function readProjectStatus(projectPath) {
  const projectJson = safeReadJson(path.join(projectPath, "project.json"), {});
  const inventory = safeReadJson(path.join(projectPath, "asset-inventory.json"), null);
  const stages = STAGES.map((stage) => getStageStatus(projectPath, stage));
  const summary = scoreStatus(stages);
  const visualQa = readVisualQaSummary(projectPath);
  const stat = fs.statSync(projectPath);
  return {
    slug: path.basename(projectPath),
    title: projectJson.title || path.basename(projectPath),
    projectPath,
    updatedAt: stat.mtime.toISOString(),
    createdAt: projectJson.createdAt || stat.birthtime.toISOString(),
    intent: projectJson.intent || "",
    summary,
    stages,
    visualQa,
    assetSummary: inventory?.summary || null,
    detectedCharacters: inventory?.detectedCharacters || [],
    nextActions: nextActions(stages, visualQa),
    continuation: buildContinuation(projectJson, stages, inventory)
  };
}

export function listProjectStatuses() {
  if (!fs.existsSync(PROJECTS_ROOT)) {
    return {
      standard: "xinrui-project-status-v1",
      projectsRoot: PROJECTS_ROOT,
      items: []
    };
  }
  const items = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readProjectStatus(path.join(PROJECTS_ROOT, entry.name)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    standard: "xinrui-project-status-v1",
    projectsRoot: PROJECTS_ROOT,
    items
  };
}

export function getProjectStatus(slug) {
  const clean = String(slug || "").replace(/[\\/:*?"<>|]+/g, "");
  const projectPath = path.join(PROJECTS_ROOT, clean);
  if (!clean || !fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) return null;
  return {
    standard: "xinrui-project-status-v1",
    projectsRoot: PROJECTS_ROOT,
    project: readProjectStatus(projectPath)
  };
}
