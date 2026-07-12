import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";
import { ensureDir, nowIso } from "./utils.js";

const PROJECTS_ROOT = path.join(getOutputRoot(), "projects");
const PROJECT_FOLDERS = [
  "00_brief",
  "01_script/drafts",
  "01_script/revisions",
  "02_research/external_pending",
  "02_research/aesthetic",
  "03_art/characters",
  "03_art/costumes",
  "03_art/scenes",
  "03_art/props",
  "03_art/style",
  "04_storyboard/blocking",
  "04_storyboard/key_illustrations",
  "04_storyboard/boards",
  "04_storyboard/qa",
  "05_animation/ae",
  "05_animation/spine_or_live2d",
  "06_editing/premiere",
  "06_editing/davinci_handoff",
  "07_audio",
  "08_publish/bilibili",
  "08_publish/xiaohongshu",
  "08_publish/douyin",
  "09_review/video_analysis",
  "99_exports"
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values = []) {
  return [...new Set(values.map((value) => compact(value)).filter(Boolean))];
}

function listValue(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function slugify(value) {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `creator-project-${Date.now()}`;
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${value.trim()}\n`, "utf8");
}

function normalizeAssetPaths(input = {}) {
  return unique([
    ...(Array.isArray(input.assetPaths) ? input.assetPaths : []),
    ...(Array.isArray(input.referenceImagePaths) ? input.referenceImagePaths : []),
    input.referenceImagePath,
    input.imagePath
  ]).map((filePath) => ({
    path: filePath,
    exists: fs.existsSync(filePath),
    type: path.extname(filePath).toLowerCase()
  }));
}

export function createGenericAssetInventory(input = {}) {
  const characters = unique(listValue(input.characters));
  const costumes = unique([input.costume, input.outfit, ...listValue(input.costumes)]);
  const props = unique([input.prop, input.weapon, ...listValue(input.props)]);
  const scenes = unique([input.scene, input.location, ...listValue(input.scenes)]);
  const styles = unique([input.style, input.visualStyle, ...listValue(input.styles)]);
  const providedAssets = normalizeAssetPaths(input);
  const categories = [
    {
      id: "characters",
      label: "角色",
      existing: providedAssets,
      missingTasks: characters.length && !providedAssets.some((item) => item.exists)
        ? characters.map((name) => `${name} 缺少项目级身份参考图。`)
        : []
    },
    {
      id: "costumes",
      label: "服装",
      existing: [],
      missingTasks: costumes.map((item) => `确认或设计服装：${item}`)
    },
    {
      id: "props",
      label: "道具",
      existing: [],
      missingTasks: props.map((item) => `确认、设计或检索道具：${item}`)
    },
    {
      id: "scenes",
      label: "场景",
      existing: [],
      missingTasks: scenes.map((item) => `确认、设计或检索场景：${item}`)
    },
    {
      id: "style",
      label: "风格",
      existing: [],
      missingTasks: styles.map((item) => `确认项目画风：${item}`)
    }
  ];
  return {
    standard: "generic-creator-asset-inventory-v1",
    updatedAt: nowIso(),
    detectedCharacters: characters,
    providedAssets,
    categories,
    summary: {
      existing: providedAssets.filter((item) => item.exists).length,
      missing: categories.reduce((sum, item) => sum + item.missingTasks.length, 0),
      externalNeeds: props.length + scenes.length
    }
  };
}

export function createGenericProductionProject(input = {}) {
  const title = compact(input.title || input.topic || "未命名创作项目");
  const slug = slugify(input.slug || title);
  const projectPath = path.join(PROJECTS_ROOT, slug);
  for (const folder of PROJECT_FOLDERS) ensureDir(path.join(projectPath, folder));
  const inventory = createGenericAssetInventory(input);
  const project = {
    standard: "generic-creator-project-v1",
    title,
    slug,
    createdAt: nowIso(),
    projectPath,
    workspaceId: compact(input.workspaceId || "creator-default"),
    contentPackId: compact(input.contentPackId || "creator-generic"),
    accountProfileId: compact(input.accountProfileId || ""),
    canonMode: "project-owned",
    intent: compact(input.intent || input.goal || ""),
    script: compact(input.script || input.text || ""),
    durationSec: Number(input.durationSec || input.targetDurationSec || 0) || null,
    targetModel: compact(input.targetModel || ""),
    audience: compact(input.audience || "")
  };
  const files = {
    projectJson: path.join(projectPath, "project.json"),
    inventoryJson: path.join(projectPath, "asset-inventory.json"),
    projectBrief: path.join(projectPath, "00_brief", "project-brief.md"),
    initialScript: project.script ? path.join(projectPath, "01_script", "drafts", "initial-script.md") : ""
  };
  writeJson(files.projectJson, project);
  writeJson(files.inventoryJson, inventory);
  writeText(files.projectBrief, [
    `# ${project.title}`,
    "",
    `- 工作区：${project.workspaceId}`,
    `- 资源包：${project.contentPackId}`,
    `- 正史模式：${project.canonMode}`,
    `- 目标：${project.intent || "待填写"}`,
    `- 时长：${project.durationSec || "待填写"}`,
    `- 目标模型：${project.targetModel || "待填写"}`,
    "",
    "## 规则",
    "",
    "- 本项目资料与其他 IP 完全隔离。",
    "- 外部资料先进入待处理区，不自动成为项目正史。",
    "- 生图以云端多模态大模型为主，生成后必须通过视觉 QA。",
    "- 付费生成、覆盖源素材和平台发布必须审批。"
  ].join("\n"));
  if (files.initialScript) {
    writeText(files.initialScript, `# 初始剧本\n\n${project.script}`);
  }
  return {
    project,
    folders: PROJECT_FOLDERS.map((folder) => path.join(projectPath, folder)),
    inventory,
    files
  };
}

function inferDurationSec(input = {}) {
  return Math.max(3, Number(input.durationSec || input.targetDurationSec || 15));
}

function inferShotCount(input = {}, durationSec = inferDurationSec(input)) {
  const explicit = Number(input.shotCount || input.plannedShotCount || 0);
  if (explicit > 0) return Math.max(1, Math.round(explicit));
  if (durationSec <= 20) return 6;
  if (durationSec <= 60) return Math.max(8, Math.round(durationSec / 4));
  return Math.max(12, Math.round(durationSec / 6));
}

export function createGenericExecutionPlan(input = {}) {
  const durationSec = inferDurationSec(input);
  const shotCount = inferShotCount(input, durationSec);
  const title = compact(input.title || input.topic || input.goal || "未命名创作项目");
  return {
    standard: "generic-creator-agent-plan-v1",
    createdAt: nowIso(),
    title,
    targetDurationSec: durationSec,
    plannedShotCount: shotCount,
    workspaceBoundary: {
      workspaceId: compact(input.workspaceId || "creator-default"),
      contentPackId: "creator-generic",
      canonMode: "project-owned",
      privateIpSearchDisabled: true
    },
    executionPolicy: {
      autoRunLocalSafeSteps: true,
      approvalRequired: ["paid_model_generation", "source_overwrite", "external_publish"],
      imagePriority: "ChatGPT/OpenAI gpt-image-2 or configured cloud multimodal image model",
      optionalFallback: "ComfyUI"
    },
    pipeline: [
      { title: "1. 项目建档", autoLevel: "local_auto", actions: ["创建隔离项目目录", "写入目标、剧本、平台和预算"] },
      { title: "2. 剧本审查", autoLevel: "local_auto", actions: ["检查因果、母题、关键情景和主题", "输出纠错与升华任务"] },
      { title: "3. 资产清单", autoLevel: "local_auto", actions: ["列出角色、服装、道具、场景、风格和已有参考", "创建缺失设计任务"] },
      { title: "4. 浏览器研究", autoLevel: "browser_first", actions: ["核验现实对象、场景、风格和平台信息", "外部参考先进入待处理区"] },
      { title: "5. 提示词与连续性锁", autoLevel: "local_and_llm", actions: ["细化角色、服装、道具、场景、调度、镜头和负面约束"] },
      { title: "6. 导演故事板", autoLevel: "local_auto", actions: [`按 ${durationSec} 秒规划约 ${shotCount} 个镜头`, "检查时长、轴线、动线、空间和镜头连续性"] },
      { title: "7. 云端关键帧生图", autoLevel: "paid_confirm", actions: ["优先 gpt-image-2 或兼容云端图像模型", "现实对象必须使用浏览器图片参考"] },
      { title: "8. 视觉 QA", autoLevel: "visual_confirm", actions: ["检查身份、服装、道具、手部、动作、构图、空间、风格和连续性"] },
      { title: "9. 视频与后期", autoLevel: "local_auto", actions: ["生成 Seedance 成本路线", "规划 AE/PR/Remotion/Hyperframes 等交接"] },
      { title: "10. 宣发与归档", autoLevel: "local_auto", actions: ["生成封面、标题、简介、标签和发布时间建议", "保存便携归档"] }
    ]
  };
}

export function createGenericPublishingPlan(input = {}) {
  const topic = compact(input.topic || input.title || input.goal || "原创短片");
  const platform = compact(input.platform || input.workspaceContext?.accountProfile?.platform || "bilibili");
  const accountName = compact(
    input.accountName
    || input.workspaceContext?.accountProfile?.accountName
    || "当前创作账号"
  );
  const durationSec = inferDurationSec(input);
  return {
    standard: "generic-publishing-plan-v1",
    createdAt: nowIso(),
    platform,
    accountName,
    topic,
    titleCandidates: [
      `${topic}｜${durationSec}秒完整动画`,
      `当${topic}真正发生时，镜头只用了${durationSec}秒`,
      `${topic}：从故事板到成片的关键瞬间`
    ],
    coverBrief: {
      hierarchy: "一个清晰主体、一个明确动作点、一个可读冲突",
      textLimit: "封面主文案控制在 4-10 个汉字",
      checks: ["移动端缩略图可读", "角色身份清楚", "动作和道具不遮挡", "不使用误导性画面"]
    },
    description: `围绕“${topic}”制作的原创短片。简介应补充故事前提、制作方式、角色或项目入口，并保留准确的素材与工具署名。`,
    tags: unique([topic, "原创动画", "故事板", "动画制作", "短片"]),
    publishGate: [
      "发布前用浏览器刷新平台热点、同类内容和账号近期数据。",
      "确认音乐、字体、图片、视频和现实参考的授权状态。",
      "封面、标题与成片内容必须一致。"
    ],
    reviewPlan: ["记录首小时点击率与完播", "记录观众流失镜头", "归纳评论关键词和受众画像", "把复盘结论写回账号档案"]
  };
}

export function createGenericResearchBrief(input = {}) {
  const query = compact(input.query || input.topic || input.goal || "项目外部参考");
  return {
    standard: "generic-browser-first-research-v1",
    query,
    browserRequired: true,
    stagingRoot: "02_research/external_pending/",
    searchTracks: [
      "官方或一手事实来源",
      "可辨认结构与比例的视觉参考",
      "电影、动画和导演视听语言参考",
      "目标平台同类内容与近期趋势",
      "受众和传播研究"
    ],
    extractionCards: [
      "事实卡：对象、来源、日期、版本、可信度和争议。",
      "视觉卡：轮廓、结构、材质、比例、配色、使用方式和不可混淆对象。",
      "镜头卡：景别、机位、运动、轴线、剪辑点和信息变化。",
      "平台卡：封面、标题、前3秒、完播、互动和评论关键词。",
      "权利卡：作者、许可、是否可保存原图、是否只允许链接参考。"
    ],
    useRules: [
      "外部资料只作为当前项目参考，不自动成为项目正史。",
      "现实对象必须使用实际图片参考，不能只靠提示词近似。",
      "本地风格转换前先确认来源、权利和需要保留的结构特征。"
    ]
  };
}

export function createGenericReferencePlan(input = {}) {
  const query = compact(input.query || input.topic || input.goal || "项目视觉参考");
  return {
    standard: "generic-professional-reference-plan-v1",
    query,
    requiredViews: ["整体轮廓", "关键结构", "比例关系", "材质细节", "使用姿态", "场景尺度"],
    sourcePriority: ["官方资料", "制造商/机构资料", "博物馆或专业数据库", "可信新闻摄影", "多角度实拍"],
    localHandoff: [
      "将链接和图片线索保存到项目待处理区。",
      "制作结构标注图、比例图和不可混淆对象清单。",
      "确认后再交给 gpt-image-2 或兼容云端图像模型进行项目画风转换。"
    ]
  };
}

export function createGenericPortablePlan(input = {}) {
  return {
    standard: "generic-creator-portable-plan-v1",
    createdAt: nowIso(),
    workspaceId: compact(input.workspaceId || "creator-default"),
    include: [
      "codex-plugin/creator-super-agent",
      "content-packs/creator-generic",
      "src, public, config, scripts, package.json and package-lock.json",
      "approved project files and account profiles"
    ],
    exclude: [
      ".env and API keys",
      "node_modules, logs, caches and temporary outputs",
      "private IP packs unless exporting to an approved private destination",
      "third-party assets without redistribution rights"
    ],
    restoreOrder: ["install Node.js", "restore repository", "create .env", "install dependencies", "install plugin", "start workbench", "run API smoke test"]
  };
}
