import fs from "node:fs";
import path from "node:path";
import { getOutputRoot, getSourceRoot } from "./config.js";
import { ensureDir, nowIso } from "./utils.js";
import { searchDatabase } from "./search.js";
import { searchVisualAssets } from "./visual.js";
import { createReferencePlan } from "./references.js";
import { createResearchPlan } from "./research.js";

const SOURCE_ROOT = getSourceRoot();
const OUTPUT_ROOT = getOutputRoot();
const PROJECT_ROOT = path.join(OUTPUT_ROOT, "projects");
const EXTERNAL_PENDING_ROOT = path.join(OUTPUT_ROOT, "external-references", "pending");

const PROJECT_FOLDERS = [
  "00_brief",
  "01_script/drafts",
  "01_script/revisions",
  "02_research/external_pending",
  "02_research/aesthetic",
  "03_art/characters/existing",
  "03_art/characters/to_design",
  "03_art/costumes",
  "03_art/scenes",
  "03_art/props",
  "03_art/style",
  "04_storyboard/blocking",
  "04_storyboard/key_illustrations",
  "04_storyboard/boards",
  "04_storyboard/qa/visual_checks",
  "05_animation/ae",
  "05_animation/spine_or_live2d",
  "06_editing/premiere",
  "06_editing/davinci_handoff",
  "07_audio/music",
  "07_audio/sfx",
  "07_audio/voice",
  "08_publish/bilibili",
  "08_publish/xiaohongshu",
  "08_publish/douyin",
  "09_review/video_analysis",
  "99_exports"
];

const ASSET_CATEGORIES = [
  {
    id: "characters",
    label: "角色",
    role: "identity_reference",
    keywords: ["character", "角色", "立绘", "三视图", "角色卡"]
  },
  {
    id: "costumes",
    label: "服装",
    role: "prop_reference",
    keywords: ["costume", "服装", "军装", "外套", "制服", "装备"]
  },
  {
    id: "props",
    label: "道具/武器",
    role: "prop_reference",
    keywords: ["prop", "weapon", "道具", "武器", "终端", "枪", "剑", "无人机"]
  },
  {
    id: "scenes",
    label: "场景",
    role: "scene_reference",
    keywords: ["scene", "location", "场景", "城市", "室内", "基地", "地图"]
  },
  {
    id: "storyboards",
    label: "分镜/故事板",
    role: "shot_reference",
    keywords: ["storyboard", "分镜", "故事板", "镜头"]
  },
  {
    id: "style",
    label: "美术风格",
    role: "style_reference",
    keywords: ["style", "风格", "参考", "世界观"]
  }
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  const source = compact(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return source || `xinrui-project-${new Date().toISOString().slice(0, 10)}`;
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

function inferNamesFromText(text) {
  const known = ["林荫清", "韩梦雪", "唐舒嫣", "赵婷婷", "刘伊七", "刘梦鸳", "何墨缘", "叶敏慧", "李熙然"];
  const names = known.filter((name) => text.includes(name));
  const matches = [...text.matchAll(/[\u4e00-\u9fa5]{2,4}/g)]
    .map((match) => match[0])
    .filter((name) => known.includes(name));
  return unique([...names, ...matches]);
}

function inferExternalNeeds(text) {
  const rules = [
    { id: "weapon", label: "现实武器/装备", pattern: /QBZ|AK|M4|步枪|手枪|狙击|坦克|装甲|无人机|雷达|导弹|护甲|军服|军装/i, focus: "weapon equipment uniform" },
    { id: "city", label: "现实城市/地图", pattern: /东京|上海|北京|纽约|伦敦|巴黎|城市地图|街区|地铁|机场|港口/i, focus: "city map location" },
    { id: "vehicle", label: "载具/机械", pattern: /车|舰|船|直升机|无人车|装甲车|机甲|载具/i, focus: "vehicle equipment" },
    { id: "style", label: "外部美术风格", pattern: /风格|像.+一样|参考|导演|电影|动漫|手书|MV|赛博|复古|写实/i, focus: "style aesthetic film animation" },
    { id: "scene", label: "特殊场景", pattern: /雨林|沙漠|雪山|东京|城市|医院|学校|基地|机库|舰桥|地下|街道/i, focus: "scene environment architecture" }
  ];
  return rules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      focus: rule.focus,
      stagingPath: path.join(EXTERNAL_PENDING_ROOT, rule.id),
      status: "needs_browser_reference"
    }));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
}

function buildProjectMarkdown(project) {
  return [
    `# ${project.title}`,
    "",
    `创建时间：${project.createdAt}`,
    `项目代号：${project.slug}`,
    `项目目录：${project.projectPath}`,
    "",
    "## 创作目标",
    project.intent || "待补充",
    "",
    "## 正史边界",
    "- 本地资料库确认：可直接用于角色、组织、事件和既有设定。",
    "- 合理推断：可用于草案和提示词，但需保留标注。",
    "- 待确认：必须先进入设计任务或外部参考待处理目录。",
    "",
    "## 本轮输入",
    project.script || "待补充",
    "",
    "## 输出约定",
    "- 原始 IP 文档和素材不直接改写。",
    "- 新建图像、分镜、AE/PR 工程和发布素材优先进入本项目目录。",
    "- 外部参考先暂存，用户确认后再进行本地美术风格转化。"
  ].join("\n");
}

function buildInitialScriptMarkdown(project) {
  return [
    `# ${project.title} 初始剧本`,
    "",
    `创建时间：${project.createdAt}`,
    `目标时长：${project.durationSec || "待确认"} 秒`,
    `目标模型：${project.targetModel || "待确认"}`,
    "",
    "## 初始输入",
    "",
    project.script || "待补充",
    "",
    "## 状态",
    "",
    "- 当前版本：初始草稿",
    "- 下一步：执行四层叙事审查，并把修订稿写入 `01_script/revisions/`。"
  ].join("\n");
}

function buildAssetInventoryMarkdown(inventory) {
  const lines = [
    "# 美术资源清单",
    "",
    `更新时间：${inventory.updatedAt}`,
    "",
    "## 总览",
    `- 已有资源：${inventory.summary.existing}`,
    `- 待设计资源：${inventory.summary.missing}`,
    `- 外部参考缺口：${inventory.summary.externalNeeds}`,
    ""
  ];
  for (const item of inventory.categories) {
    lines.push(`## ${item.label}`);
    lines.push(`状态：${item.status}`);
    if (item.existing.length) {
      lines.push("");
      lines.push("已有：");
      for (const asset of item.existing.slice(0, 8)) {
        lines.push(`- ${asset.title}｜${asset.rel_path}`);
      }
    }
    if (item.missingTasks.length) {
      lines.push("");
      lines.push("待补：");
      for (const task of item.missingTasks) lines.push(`- ${task}`);
    }
    lines.push("");
  }
  if (inventory.externalNeeds.length) {
    lines.push("## 外部参考待处理");
    for (const need of inventory.externalNeeds) {
      lines.push(`- ${need.label}：先浏览器检索，暂存到 ${need.stagingPath}`);
    }
  }
  return lines.join("\n");
}

function visualAssetKey(asset = {}) {
  return String(asset.fileId || asset.file_id || asset.absPath || asset.abs_path || asset.relPath || asset.rel_path || asset.title || "");
}

function mergeVisualAssets(groups = []) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const asset of group || []) {
      const key = visualAssetKey(asset);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(asset);
    }
  }
  return merged;
}

function collectCategoryAssets(db, text, category, names) {
  if (category.id === "characters" && names.length) {
    const exactIdentityResults = names.map((name) => searchVisualAssets(db, {
      character: name,
      role: "identity_reference",
      limit: 8
    }).items || []);
    return mergeVisualAssets(exactIdentityResults).slice(0, 10);
  }

  const queryParts = unique([
    ...category.keywords,
    text.slice(0, 80)
  ]);
  const result = searchVisualAssets(db, {
    query: queryParts.join(" "),
    role: category.role,
    limit: 12
  });
  return (result.items || []).slice(0, 10);
}

export function createAssetInventory(db, input = {}) {
  const text = compact(`${input.title || ""} ${input.intent || ""} ${input.script || ""} ${input.topic || ""}`);
  const names = unique([...(input.characters || []), ...inferNamesFromText(text)]);
  const externalNeeds = inferExternalNeeds(text);
  const categories = ASSET_CATEGORIES.map((category) => {
    const existing = collectCategoryAssets(db, text, category, names);
    const missingTasks = [];
    if (!existing.length) {
      missingTasks.push(`补齐${category.label}参考：先查本地资料库，再按需进入外部参考待处理。`);
    }
    if (category.id === "characters") {
      for (const name of names) {
        if (!existing.some((asset) => (asset.subjectNames || []).includes(name) || asset.rel_path.includes(name))) {
          missingTasks.push(`${name} 缺少可用于 image-2 身份锁定的稳定参考图。`);
        }
      }
    }
    return {
      id: category.id,
      label: category.label,
      role: category.role,
      status: existing.length ? "已有可用参考，仍需人工确认清晰度" : "缺少稳定参考",
      existing,
      missingTasks
    };
  });
  const missing = categories.reduce((sum, item) => sum + item.missingTasks.length, 0);
  const existing = categories.reduce((sum, item) => sum + item.existing.length, 0);
  return {
    standard: "xinrui-asset-inventory-v1",
    updatedAt: nowIso(),
    sourceRoot: SOURCE_ROOT,
    detectedCharacters: names,
    categories,
    externalNeeds,
    summary: {
      existing,
      missing,
      externalNeeds: externalNeeds.length
    }
  };
}

export function createProductionProject(db, input = {}) {
  const title = compact(input.title || input.topic || "新锐纪元未命名项目");
  const slug = slugify(input.slug || title);
  const projectPath = path.join(PROJECT_ROOT, slug);
  for (const folder of PROJECT_FOLDERS) ensureDir(path.join(projectPath, folder));
  for (const need of inferExternalNeeds(`${title} ${input.intent || ""} ${input.script || ""}`)) {
    ensureDir(need.stagingPath);
  }

  const project = {
    standard: "xinrui-production-project-v1",
    title,
    slug,
    createdAt: nowIso(),
    projectPath,
    sourceRoot: SOURCE_ROOT,
    outputRoot: OUTPUT_ROOT,
    intent: compact(input.intent || input.goal || ""),
    script: compact(input.script || input.text || ""),
    durationSec: Number(input.durationSec || input.targetDurationSec || 0) || null,
    targetModel: compact(input.targetModel || ""),
    audience: compact(input.audience || "")
  };
  const inventory = createAssetInventory(db, input);
  const researchPlan = createResearchPlan({
    query: `${title} ${project.intent} ${project.script}`,
    focus: "classic_film animation film_language platform"
  });
  const referencePlan = createReferencePlan({
    query: `${title} ${project.intent} ${project.script}`,
    focus: "storyboard prompt workflow uniform weapon scene pose quality"
  });

  const files = {
    projectJson: path.join(projectPath, "project.json"),
    inventoryJson: path.join(projectPath, "asset-inventory.json"),
    researchPlanJson: path.join(projectPath, "research-plan.json"),
    referencePlanJson: path.join(projectPath, "reference-plan.json"),
    projectBrief: path.join(projectPath, "00_brief", "project-brief.md"),
    inventoryMarkdown: path.join(projectPath, "00_brief", "asset-inventory.md"),
    initialScript: project.script ? path.join(projectPath, "01_script", "drafts", "initial-script.md") : "",
    externalNeeds: path.join(projectPath, "02_research", "external_pending", "external-needs.json")
  };
  writeJson(files.projectJson, project);
  writeJson(files.inventoryJson, inventory);
  writeJson(files.researchPlanJson, researchPlan);
  writeJson(files.referencePlanJson, referencePlan);
  writeJson(files.externalNeeds, inventory.externalNeeds);
  writeText(files.projectBrief, buildProjectMarkdown(project));
  writeText(files.inventoryMarkdown, buildAssetInventoryMarkdown(inventory));
  if (files.initialScript) writeText(files.initialScript, buildInitialScriptMarkdown(project));

  return {
    project,
    folders: PROJECT_FOLDERS.map((folder) => path.join(projectPath, folder)),
    inventory,
    researchPlan,
    referencePlan,
    files
  };
}

export function createPromptRefinementPlan(db, input = {}) {
  const text = compact(`${input.topic || ""} ${input.prompt || ""} ${input.script || ""}`);
  const evidence = searchDatabase(db, [text], { limit: Number(input.limit || 8), mode: "precise" });
  const inventory = createAssetInventory(db, input);
  return {
    standard: "xinrui-prompt-refinement-v1",
    intent: compact(input.intent || "把模糊需求转成可生成图像的专业提示词"),
    promptStructure: [
      "画面目标：这张图必须让观众一眼理解什么。",
      "角色身份锁：脸型、发型、发色、瞳色、发饰、体型、服装剪裁、装备位置。",
      "道具锁：外观、尺寸、材质、握持方式、连接方式、功能状态。",
      "场景锁：空间结构、入口、遮挡物、光源、路线、平面图对应关系。",
      "镜头语言：景别、焦段、机位、运动、轴线、前中后景。",
      "美术风格：新锐纪元本地风格 + 外部参考经过本地化后的视觉词。",
      "负面约束：不改脸、不乱换服装、不混淆武器、不加无关文字、不破坏地图一致性。"
    ],
    image2ReadyGate: {
      canGenerate: inventory.summary.missing === 0,
      blockingReasons: inventory.categories.flatMap((item) => item.missingTasks),
      externalNeeds: inventory.externalNeeds
    },
    evidence: {
      summary: evidence.evidenceSummary || {},
      claims: (evidence.chunks || []).slice(0, 5).map((chunk) => ({
        claim: chunk.brief?.claim || chunk.title,
        source: chunk.rel_path,
        confidence: chunk.brief?.confidence || "unknown"
      }))
    },
    refinedPromptTemplate: [
      "【正史边界】资料库确认：{confirmed}; 合理推断：{inferred}; 待确认：{unresolved}",
      "【角色】{identity_lock}",
      "【服装/道具】{prop_lock}",
      "【场景】{scene_lock}",
      "【调度】{blocking_axis_movement}",
      "【画面】{composition_lighting_color}",
      "【镜头】{shot_size_lens_camera_motion_duration}",
      "【分镜图描述】{one_sentence_storyboard_intent}",
      "【后期】PS标注、AE轻动画、PR粗剪、必要时DaVinci调色交接"
    ].join("\n")
  };
}
