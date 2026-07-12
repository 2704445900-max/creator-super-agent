import fs from "node:fs";
import path from "node:path";
import { getOutputRoot, getProjectRoot } from "./config.js";
import { analyzeScriptWithDramaturgy } from "./dramaturgy_rules.js";
import { createAssetInventory } from "./production.js";
import { createRealWorldReferencePack, createReferencePlan } from "./references.js";
import { createResearchPlan } from "./research.js";
import { searchDatabase } from "./search.js";
import { ensureDir, nowIso } from "./utils.js";
import { getIdentityReferencePolicy, identityReferenceRank, searchVisualAssets } from "./visual.js";

const PROJECT_ROOT = getProjectRoot();
const OUTPUT_ROOT = getOutputRoot();
const PROJECTS_ROOT = path.join(OUTPUT_ROOT, "projects");
const EXTERNAL_PENDING_ROOT = path.join(OUTPUT_ROOT, "external-references", "pending");
const VISUAL_CHECK_ROOT = path.join(OUTPUT_ROOT, "visual-checks");
const IMAGE_REFERENCE_ROOT = path.join(OUTPUT_ROOT, "image-reference-tasks");
const IMAGE_GENERATION_ROOT = path.join(OUTPUT_ROOT, "image-generation-tasks");
const PROJECT_VISUAL_CHECK_REL = path.join("04_storyboard", "qa", "visual_checks");
const VISUAL_QA_CATEGORY_LABELS = {
  characters: "characters",
  scenes: "scenes",
  props: "props",
  storyboards: "storyboards",
  other: "other"
};

const DEFAULT_USD_TO_CNY = 7.25;

function resolveProjectPath(filePath = "") {
  const normalized = compact(filePath);
  if (!normalized) return "";
  return path.isAbsolute(normalized) ? normalized : path.resolve(PROJECT_ROOT, normalized);
}

function splitPathList(value = "") {
  return String(value || "")
    .split(/[;|]/)
    .map((item) => compact(item))
    .filter(Boolean);
}

function getDefaultComfyModelDirs() {
  return [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Comfy-Desktop", "ComfyUI-Shared", "models") : "",
    path.join(PROJECT_ROOT, "tools", "ComfyUI_windows_portable", "ComfyUI", "models"),
    path.join("F:\\", "ComfyUI", "ComfyUI", "models")
  ].filter(Boolean);
}

function findComfyCheckpoints(modelDirs = []) {
  const extensions = new Set([".safetensors", ".ckpt", ".pt", ".pth"]);
  const checkpoints = [];
  for (const modelDir of modelDirs) {
    const checkpointDir = path.join(modelDir, "checkpoints");
    if (!fs.existsSync(checkpointDir)) continue;
    for (const entry of fs.readdirSync(checkpointDir, { withFileTypes: true })) {
      if (!entry.isFile() || !extensions.has(path.extname(entry.name).toLowerCase())) continue;
      const filePath = path.join(checkpointDir, entry.name);
      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(filePath).size;
      } catch {
        sizeBytes = 0;
      }
      checkpoints.push({ name: entry.name, path: filePath, sizeBytes });
    }
  }
  return checkpoints;
}

const COST_PROFILES = [
  {
    id: "fal-seedance-2-fast-720p",
    label: "Seedance 2.0 Fast 720p draft route",
    provider: "Fal.ai public pricing",
    pricePerSecondUsd: 0.2419,
    sourceUrl: "https://fal.ai/models/bytedance/seedance-2.0/fast/image-to-video",
    bestFor: "接近正式质量的动作预演、镜头节奏验证和中等成本成片测试。"
  },
  {
    id: "fal-seedance-2-standard-720p",
    label: "Seedance 2.0 Standard 720p final route",
    provider: "Fal.ai public pricing",
    pricePerSecondUsd: 0.3024,
    sourceUrl: "https://fal.ai/models/bytedance/seedance-2.0/image-to-video",
    bestFor: "Final shots that need stable semantics and image quality."
  },
  {
    id: "fal-seedance-2-standard-1080p",
    label: "Seedance 2.0 Standard 1080p high-cost polish",
    provider: "Fal.ai public pricing",
    pricePerSecondUsd: 0.682,
    sourceUrl: "https://fal.ai/models/bytedance/seedance-2.0/image-to-video",
    bestFor: "只给最关键镜头或最终补镜使用，不建议用于大批量试错。"
  },
  {
    id: "replicate-seedance-1-lite-720p-draft",
    label: "Seedance 1 Lite 720p low-cost draft alternative",
    provider: "Replicate public pricing",
    pricePerSecondUsd: 0.036,
    sourceUrl: "https://replicate.com/bytedance/seedance-1-lite",
    bestFor: "只用于低成本动作草稿和镜头筛选，不作为 Seedance 2.0 成片路线。"
  },
  {
    id: "seedance-2-5-planning",
    label: "Seedance 2.5 planning placeholder",
    provider: "future planning placeholder",
    pricePerSecondUsd: 0.35,
    sourceUrl: "",
    bestFor: "未来模型升级前的预算占位，实际开跑前必须刷新单价。"
  }
];

const KNOWN_CHARACTERS = [
  "林荫清",
  "林小星",
  "韩梦雪",
  "唐舒嫣",
  "赵婧媛",
  "赵婷婷",
  "刘梦鸳",
  "何墨缘",
  "叶敏慧",
  "李熙然"
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

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeReferenceSlug(value = "") {
  const raw = compact(value).toLowerCase();
  if (/qbz[-\s]?191|qbz191|191式/.test(raw)) return "qbz-191";
  return raw
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function readJsonIfExists(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function findLocalPropQaGate(realWorldReferencePack) {
  const pack = realWorldReferencePack?.pack;
  const candidates = unique([
    normalizeReferenceSlug(pack?.id),
    normalizeReferenceSlug(pack?.label),
    normalizeReferenceSlug(realWorldReferencePack?.query)
  ]).filter(Boolean);
  for (const slug of candidates) {
    const qaPath = path.join(EXTERNAL_PENDING_ROOT, slug, "prop-qa-gate.json");
    const qa = readJsonIfExists(qaPath);
    if (qa) return { ...qa, qaPath, slug };
  }
  return null;
}

function buildShotBudgetRows(input = {}, profile, context = {}) {
  const targetDurationSec = inferDurationSec(input);
  const shotCount = inferShotCount(input, targetDurationSec);
  const attemptsPerShot = Math.max(1, Math.round(asNumber(input.attemptsPerShot, 2)));
  const finalAttempts = Math.max(1, Math.round(asNumber(input.finalAttempts, 1)));
  const usdToCny = asNumber(input.usdToCny, DEFAULT_USD_TO_CNY);
  const avg = Math.max(1, targetDurationSec / shotCount);
  const explicitDurations = Array.isArray(input.shots)
    ? input.shots.map((shot) => asNumber(shot.durationSec || shot.duration || shot.seconds, 0))
    : [];
  const totalExplicit = explicitDurations.reduce((sum, value) => sum + value, 0);
  const rows = [];
  for (let index = 0; index < shotCount; index += 1) {
    const durationSec = explicitDurations[index] || (totalExplicit ? Math.max(1, (targetDurationSec - totalExplicit) / Math.max(1, shotCount - explicitDurations.filter(Boolean).length)) : avg);
    const draftUsd = durationSec * attemptsPerShot * profile.pricePerSecondUsd;
    const finalUsd = durationSec * finalAttempts * profile.pricePerSecondUsd;
    const title = input.shots?.[index]?.title || input.shots?.[index]?.name || `镜头 ${String(index + 1).padStart(2, "0")}`;
    rows.push({
      id: `shot-${String(index + 1).padStart(2, "0")}`,
      title,
      durationSec: Math.round(durationSec * 100) / 100,
      draftAttempts: attemptsPerShot,
      finalAttempts,
      draftUsd: roundMoney(draftUsd),
      finalUsd: roundMoney(finalUsd),
      totalUsd: roundMoney(draftUsd + finalUsd),
      totalCny: roundMoney((draftUsd + finalUsd) * usdToCny),
      gate: {
        beforeDraft: "需要先具备单帧分镜图、角色锁、道具锁、场景锁和负面约束。",
        beforeFinal: "草稿动作方向通过，单图视觉检查无 blocker。",
        stopAfter: `${attemptsPerShot} 次草稿仍不稳定时停止付费生成，回到分镜、提示词或参考图。`
      },
      risk: context.knowledgeNeeds?.length ? "external_reference_pending" : "normal"
    });
  }
  return rows;
}

function getText(input = {}) {
  return compact([
    input.topic,
    input.title,
    input.intent,
    input.prompt,
    input.shotPrompt,
    input.script,
    input.scene,
    input.shot?.description,
    input.shot?.action
  ].filter(Boolean).join(" "));
}

function inferCharacters(text, explicit = []) {
  return unique([
    ...explicit,
    ...KNOWN_CHARACTERS.filter((name) => text.includes(name)),
    ...[...text.matchAll(/[\u4e00-\u9fa5]{2,4}/g)]
      .map((match) => match[0])
      .filter((name) => KNOWN_CHARACTERS.includes(name))
  ]);
}

function inferDurationSec(input = {}) {
  const direct = asNumber(input.durationSec || input.targetDurationSec, 0);
  if (direct) return direct;
  const text = getText(input);
  const secondMatch = text.match(/(\d+(?:\.\d+)?)\s*(秒|s|sec|seconds)/i);
  if (secondMatch) return asNumber(secondMatch[1], 15);
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(分钟|分|min|minutes)/i);
  if (minuteMatch) return asNumber(minuteMatch[1], 1) * 60;
  if (/手书|MV|展示|宣传|短片/i.test(text)) return 15;
  return 15;
}

function inferShotCount(input = {}, durationSec = 15) {
  const direct = asNumber(input.shotCount, 0);
  if (direct) return Math.round(direct);
  if (durationSec <= 15) return 5;
  if (durationSec <= 30) return 8;
  if (durationSec <= 60) return 12;
  if (durationSec <= 180) return 22;
  return Math.min(48, Math.max(24, Math.round(durationSec / 8)));
}

function inferKnowledgeNeeds(text) {
  const rules = [
    {
      id: "weapon-equipment",
      label: "现实武器/装备/军装",
      pattern: /QBZ|AK|M4|步枪|手枪|狙击枪|坦克|装甲车|装甲载具|现实装甲|军用装甲|无人机|雷达|导弹|防弹衣|军服|军装|战术装备|战术背心|战术头盔|战术手套|战术腰带/i,
      focus: "weapon equipment uniform"
    },
    {
      id: "city-map",
      label: "现实城市/地图/建筑",
      pattern: /东京|上海|北京|纽约|伦敦|巴黎|城市地图|街区|地铁|机场|港口|城区/i,
      focus: "city map location"
    },
    {
      id: "scene-reference",
      label: "场景空间/环境细节",
      pattern: /雨林|沙漠|雪山|地下|医院|学校|基地|机库|舰桥|街道|车内|控制室/i,
      focus: "scene environment architecture"
    },
    {
      id: "style-reference",
      label: "外部美术/导演/平台风格",
      pattern: /风格|像.*一样|参考|导演|电影|动画|动漫|手书|MV|赛博|复古|写实|小红书|抖音|B站|YouTube|Ins|X/i,
      focus: "style aesthetic platform film animation"
    }
  ];
  return rules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      focus: rule.focus,
      policy: "browser_first",
      stagingPath: path.join(EXTERNAL_PENDING_ROOT, rule.id)
    }));
}

function summarizeEvidence(evidence = {}) {
  return {
    query: evidence.query || "",
    mode: evidence.mode || "precise",
    terms: evidence.terms || [],
    entities: (evidence.entities || []).slice(0, 6).map((item) => ({
      name: item.name,
      type: item.type,
      summary: item.summary
    })),
    canonCards: (evidence.chunks || []).slice(0, 8).map((chunk) => ({
      claim: chunk.brief?.claim || chunk.title,
      keyPoints: chunk.brief?.keyPoints || [],
      confidence: chunk.brief?.confidence || "unknown",
      evidenceType: chunk.brief?.evidenceTypeLabel || "资料库证据",
      sourcePath: chunk.brief?.sourcePath || chunk.rel_path
    })),
    assetHints: (evidence.assets || []).slice(0, 8).map((asset) => ({
      title: asset.title,
      path: asset.rel_path,
      mediaType: asset.media_type,
      assetType: asset.asset_type
    }))
  };
}

function visualKindOf(item = {}) {
  return item.visualKind || item.visual_kind || item.kind || item.asset_type || "";
}

function visualPathOf(item = {}) {
  return item.path || item.absPath || item.abs_path || item.relPath || item.rel_path || "";
}

function visualTitleOf(item = {}) {
  return item.title || item.name || visualPathOf(item);
}

function visualFileIdOf(item = {}) {
  return item.fileId ?? item.file_id ?? item.fileID ?? "";
}

function identityPolicyOf(item = {}) {
  return item.identityPolicy || getIdentityReferencePolicy(visualKindOf(item));
}

function isIdentityReference(item = {}) {
  return item.promptRole === "identity_reference"
    || item.prompt_role === "identity_reference"
    || /角色|立绘|三视图|角色卡|character/i.test(`${item.title} ${item.rel_path} ${item.relPath}`);
}

function sortIdentityReferences(items = []) {
  return [...items].sort((a, b) => {
    const rank = identityReferenceRank(visualKindOf(a)) - identityReferenceRank(visualKindOf(b));
    if (rank !== 0) return rank;
    return Number(b.searchScore || b.namingScore || 0) - Number(a.searchScore || a.namingScore || 0)
      || visualPathOf(a).localeCompare(visualPathOf(b), "zh-Hans-CN");
  });
}

function normalizeConfirmedReferenceKeys(input = {}) {
  const rawValues = [
    input.confirmedIdentityFileIds,
    input.identityConfirmedFileIds,
    input.confirmedReferenceFileIds,
    input.confirmedIdentityReferences
  ];
  const keys = [];
  for (const value of rawValues) {
    if (Array.isArray(value)) keys.push(...value);
    else if (value) keys.push(...String(value).split(/[,\s;|]+/));
  }
  return new Set(keys.map((item) => compact(item)).filter(Boolean));
}

function hasGlobalIdentityConfirmation(input = {}) {
  return input.identityReviewStatus === "confirmed"
    || input.identityReferenceReviewStatus === "confirmed"
    || input.visualReferenceReviewStatus === "confirmed"
    || input.confirmedIdentityReview === true
    || input.confirmedVisualReferences === true;
}

function isReferenceConfirmed(item = {}, input = {}) {
  if (hasGlobalIdentityConfirmation(input)) return true;
  const keys = normalizeConfirmedReferenceKeys(input);
  if (!keys.size) return false;
  return [
    visualFileIdOf(item),
    visualTitleOf(item),
    item.rel_path,
    item.relPath,
    item.absPath,
    item.abs_path,
    item.path
  ].map((value) => compact(value)).some((value) => value && keys.has(value));
}

function designMatchScore(item = {}, text = "") {
  const source = `${visualTitleOf(item)} ${visualPathOf(item)}`;
  const pairs = [
    ["常服", /常服|日常|便装/],
    ["军装", /军装|07式|87式|制服/],
    ["战术", /战术|作战|行动|潜入|突击/],
    ["泳装", /泳装|海滩|沙滩/],
    ["礼服", /礼服|正式|宴会/]
  ];
  let score = 0;
  for (const [label, pattern] of pairs) {
    if (pattern.test(text) && source.includes(label)) score += 40;
  }
  if (/战术|作战|行动|潜入|突击/.test(text) && visualKindOf(item) === "military_portrait") score += 12;
  if (/常服|日常|便装/.test(text) && source.includes("常服")) score += 20;
  if (identityPolicyOf(item).referenceTier === "primary_identity_anchor") score += 8;
  return score;
}

function chooseSingleDesignReference(refs = [], text = "") {
  return sortIdentityReferences(refs)
    .filter((item) => identityPolicyOf(item).canDefineCostume)
    .sort((a, b) => {
      const match = designMatchScore(b, text) - designMatchScore(a, text);
      if (match !== 0) return match;
      return identityReferenceRank(visualKindOf(a)) - identityReferenceRank(visualKindOf(b));
    })[0] || null;
}

function buildCharacterDesignLocksFromItems(items = [], characters = [], text = "", input = {}) {
  const identityItems = sortIdentityReferences(items.filter(isIdentityReference));
  const inferredCharacters = unique(identityItems.flatMap((item) => item.subjectNames || []));
  const targetCharacters = unique([...(characters || []), ...inferredCharacters]);
  return targetCharacters.map((character) => {
    const refs = identityItems.filter((item) => {
      const subjects = item.subjectNames || [];
      const haystack = `${visualTitleOf(item)} ${visualPathOf(item)}`;
      return subjects.includes(character) || haystack.includes(character);
    });
    const anchors = refs.filter((item) => identityPolicyOf(item).referenceTier === "primary_identity_anchor");
    const supplemental = refs.filter((item) => identityPolicyOf(item).referenceTier === "supplemental_character_design");
    const selectedDesign = chooseSingleDesignReference(refs, text);
    const selectedConfirmed = selectedDesign ? isReferenceConfirmed(selectedDesign, input) : false;
    const anchorsConfirmed = anchors.length ? anchors.slice(0, 2).every((item) => isReferenceConfirmed(item, input)) : false;
    const status = !refs.length
      ? "missing_identity_reference"
      : !anchors.length
        ? "missing_primary_identity_anchor"
        : !selectedDesign
          ? "missing_single_outfit_lock"
          : selectedConfirmed && anchorsConfirmed
            ? "confirmed"
            : "needs_discrimination_confirmation";
    return {
      character,
      status,
      canUseForDraft: Boolean(refs.length && selectedDesign),
      canUseForFinal: status === "confirmed",
      identityAnchors: anchors.slice(0, 2).map((item) => toVisualSummaryItem(item, {
        referenceUse: "identity_anchor",
        confirmed: isReferenceConfirmed(item, input)
      })),
      selectedDesign: selectedDesign ? toVisualSummaryItem(selectedDesign, {
        referenceUse: "single_outfit_design_lock",
        confirmed: selectedConfirmed
      }) : null,
      supplementalDesigns: supplemental.slice(0, 6).map((item) => toVisualSummaryItem(item, {
        referenceUse: item === selectedDesign ? "selected_single_outfit_design_lock" : "alternative_supplemental_design",
        confirmed: isReferenceConfirmed(item, input)
      })),
      rule: "角色卡/三视图先做身份锚；每个角色每个镜头只允许一个着装设计锁；其他立绘只能作为场景候选，不得混穿。"
    };
  });
}

function identityPolicySummary() {
  return {
    priority: "角色一致性优先走角色卡和三视图；其他立绘只作为该角色在不同场景下的补充设计。",
    costumeRule: "一个角色在一个镜头/场景中只能使用一个着装设计锁，禁止把多个立绘混穿。",
    confirmationRule: "正式生成前必须先完成参考图甄别确认；未确认时仅允许草稿。"
  };
}

function summarizeVisualAssets(visual = {}, characters = [], text = "", input = {}) {
  if (
    Array.isArray(visual.identityReferences)
    || Array.isArray(visual.propReferences)
    || Array.isArray(visual.sceneReferences)
    || Array.isArray(visual.styleReferences)
  ) {
    const identityItems = sortIdentityReferences(visual.identityReferences || []);
    const anchors = identityItems.filter((item) => identityPolicyOf(item).referenceTier === "primary_identity_anchor");
    const supplemental = identityItems.filter((item) => identityPolicyOf(item).referenceTier === "supplemental_character_design");
    return {
      count: Number(visual.items?.length || 0),
      identityPolicy: identityPolicySummary(),
      identityReferences: identityItems.slice(0, 6).map(toVisualSummaryItem),
      identityAnchors: anchors.slice(0, 6).map((item) => toVisualSummaryItem(item, { referenceUse: "identity_anchor" })),
      supplementalDesigns: supplemental.slice(0, 8).map((item) => toVisualSummaryItem(item, { referenceUse: "supplemental_scene_design_candidate" })),
      characterDesignLocks: visual.characterDesignLocks || buildCharacterDesignLocksFromItems(identityItems, characters || visual.characters || [], text, input),
      propReferences: (visual.propReferences || []).slice(0, 6).map(toVisualSummaryItem),
      sceneReferences: (visual.sceneReferences || []).slice(0, 6).map(toVisualSummaryItem),
      styleReferences: (visual.styleReferences || []).slice(0, 6).map(toVisualSummaryItem),
      requirements: visual.requirements || {},
      missingDesignTasks: visual.missingDesignTasks || [],
      lockOrder: visual.lockOrder || []
    };
  }

  const items = visual.items || [];
  const identityItems = sortIdentityReferences(items.filter(isIdentityReference));
  const anchors = identityItems.filter((item) => identityPolicyOf(item).referenceTier === "primary_identity_anchor");
  const supplemental = identityItems.filter((item) => identityPolicyOf(item).referenceTier === "supplemental_character_design");
  return {
    count: items.length,
    identityPolicy: identityPolicySummary(),
    identityReferences: identityItems
      .slice(0, 6)
      .map(toVisualSummaryItem),
    identityAnchors: anchors
      .slice(0, 6)
      .map((item) => toVisualSummaryItem(item, { referenceUse: "identity_anchor" })),
    supplementalDesigns: supplemental
      .slice(0, 8)
      .map((item) => toVisualSummaryItem(item, { referenceUse: "supplemental_scene_design_candidate" })),
    characterDesignLocks: buildCharacterDesignLocksFromItems(identityItems, characters, text, input),
    propReferences: items
      .filter((item) => item.promptRole === "prop_reference" || /武器|道具|装备|终端|prop|weapon/i.test(`${item.title} ${item.rel_path}`))
      .slice(0, 6)
      .map(toVisualSummaryItem),
    sceneReferences: items
      .filter((item) => item.promptRole === "scene_reference" || /场景|地图|室内|基地|scene|map/i.test(`${item.title} ${item.rel_path}`))
      .slice(0, 6)
      .map(toVisualSummaryItem),
    styleReferences: items
      .filter((item) => item.promptRole === "style_reference" || /风格|参考|故事板|分镜|style|storyboard/i.test(`${item.title} ${item.rel_path}`))
      .slice(0, 6)
      .map(toVisualSummaryItem)
  };
}

function toVisualSummaryItem(item = {}, extra = {}) {
  const policy = identityPolicyOf(item);
  return {
    title: visualTitleOf(item),
    fileId: visualFileIdOf(item) || null,
    path: visualPathOf(item),
    reason: item.reason || "",
    source: item.source || "database",
    visualKind: visualKindOf(item),
    promptRole: item.promptRole || item.prompt_role || "",
    referenceTier: policy.referenceTier,
    referenceTierLabel: policy.referenceTierLabel,
    identityUse: policy.identityUse,
    designUse: policy.designUse,
    requiresDiscriminationReview: policy.requiresDiscriminationReview,
    mixingAllowed: policy.mixingAllowed,
    ...extra
  };
}

function visualItemKey(item = {}) {
  return String(item.fileId || item.file_id || item.absPath || item.abs_path || item.relPath || item.rel_path || item.path || item.title || "");
}

function mergeVisualItems(groups = []) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const item of group || []) {
      const key = visualItemKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

const VISUAL_REQUIREMENT_TERMS = {
  costumes: ["泳装", "军装", "制服", "外套", "披风", "护甲", "护具", "战术背心", "礼服", "便装", "校服", "作战服", "训练服", "雨衣"],
  props: ["QBZ-191", "QBZ191", "QBZ", "QSZ-92", "步枪", "手枪", "枪", "武器", "道具", "装备", "终端", "战术地图", "地图", "无人机", "雷达", "耳麦", "背包", "头盔", "车辆", "装甲车", "舰船", "飞机"],
  scenes: ["海滩", "雨夜", "走廊", "控制室", "基地", "机库", "舰桥", "街道", "城市", "东京", "上海", "北京", "机场", "港口", "医院", "学校", "地下", "室内", "地图", "平面图", "车内", "水面", "站台"],
  style: ["手书", "MV", "电影感", "半写实", "赛璐璐", "写实", "赛博", "复古", "动画", "漫画", "宣传", "封面"]
};

function termsInText(text = "", terms = []) {
  return terms.filter((term) => text.includes(term));
}

function fieldTerms(input = {}, keys = []) {
  return keys.flatMap((key) => compact(input[key]).split(/[,\s，、;；/|]+/).filter(Boolean));
}

function extractVisualRequirements(input = {}, text = "") {
  return {
    costumes: unique([
      ...fieldTerms(input, ["costume", "costumes", "costumeLock", "outfit", "outfitLock"]),
      ...termsInText(text, VISUAL_REQUIREMENT_TERMS.costumes)
    ]),
    props: unique([
      ...fieldTerms(input, ["prop", "props", "propLock", "weapon", "weaponLock", "equipment", "equipmentLock"]),
      ...termsInText(text, VISUAL_REQUIREMENT_TERMS.props)
    ]),
    scenes: unique([
      ...fieldTerms(input, ["scene", "sceneLock", "location", "locationLock", "environment"]),
      ...termsInText(text, VISUAL_REQUIREMENT_TERMS.scenes)
    ]),
    style: unique([
      ...fieldTerms(input, ["style", "visualStyle", "styleLock"]),
      ...termsInText(text, VISUAL_REQUIREMENT_TERMS.style)
    ])
  };
}

function isGenericWorkspace(input = {}) {
  return input.workspaceMode === "generic"
    || input.contentPackId === "creator-generic"
    || input.disableCanonSearch === true;
}

function providedReferenceItems(input = {}) {
  const values = [
    ...(Array.isArray(input.referenceImagePaths) ? input.referenceImagePaths : []),
    input.referenceImagePath,
    input.imagePath
  ].map((value) => compact(value)).filter(Boolean);
  return unique(values).map((filePath, index) => ({
    fileId: "",
    title: `Provided reference ${index + 1}`,
    path: filePath,
    relPath: filePath,
    visualKind: "provided_reference",
    promptRole: "identity_reference",
    subjectNames: input.characters || [],
    referenceTier: "provided_reference",
    confirmed: input.confirmedVisualReferences === true
  }));
}

function buildGenericContext(input = {}) {
  const text = getText(input);
  const characters = unique(input.characters || []);
  const requirements = extractVisualRequirements(input, text);
  const references = providedReferenceItems(input);
  const confirmed = input.confirmedVisualReferences === true;
  const characterDesignLocks = characters.map((character) => ({
    character,
    status: references.length ? (confirmed ? "confirmed" : "needs_discrimination_confirmation") : "missing_identity_reference",
    canUseForDraft: references.length > 0,
    canUseForFinal: references.length > 0 && confirmed,
    identityAnchors: references,
    selectedDesign: references[0] || null,
    supplementalDesigns: references.slice(1),
    rule: "通用工作区只使用本项目显式提供并确认的参考图，不读取其他 IP 的角色资料。"
  }));
  const missingDesignTasks = characterDesignLocks.flatMap((lock) => {
    if (lock.status === "missing_identity_reference") return [`${lock.character} 缺少项目级身份参考图。`];
    if (lock.status === "needs_discrimination_confirmation") return [`${lock.character} 的项目级参考图尚未确认。`];
    return [];
  });
  const visualLock = {
    standard: "generic-project-visual-lock-v1",
    lockOrder: [
      "1. project-owned identity references",
      "2. one outfit/design per character and shot",
      "3. project props and scenes",
      "4. style references",
      "5. visual QA"
    ],
    identityPolicy: {
      priority: "仅使用当前项目明确提供的身份参考。",
      costumeRule: "每个镜头只允许一个服装设计锁。",
      confirmationRule: "正式生成前必须确认项目参考图。"
    },
    characters,
    identityLocked: characters.length === 0 || characterDesignLocks.every((item) => item.canUseForDraft),
    identityFinalReady: characters.length === 0 || characterDesignLocks.every((item) => item.canUseForFinal),
    requirements,
    identitySearches: [],
    searches: {
      props: { query: requirements.props.join(" "), count: 0, sourceFallbackUsed: false },
      scenes: { query: requirements.scenes.join(" "), count: 0, sourceFallbackUsed: false },
      style: { query: requirements.style.join(" "), count: 0, sourceFallbackUsed: false }
    },
    identityReferences: references,
    identityAnchors: references,
    supplementalDesigns: [],
    characterDesignLocks,
    propReferences: [],
    sceneReferences: [],
    styleReferences: [],
    missingDesignTasks,
    sourceFallbackUsed: false,
    items: references
  };
  const assetInventory = {
    standard: "generic-project-asset-inventory-v1",
    updatedAt: nowIso(),
    sourceRoot: "",
    detectedCharacters: characters,
    categories: [
      { id: "characters", label: "角色", role: "identity_reference", existing: references, missingTasks: missingDesignTasks },
      { id: "costumes", label: "服装", role: "prop_reference", existing: [], missingTasks: requirements.costumes.map((item) => `待设计或导入服装：${item}`) },
      { id: "props", label: "道具", role: "prop_reference", existing: [], missingTasks: requirements.props.map((item) => `待设计或检索道具：${item}`) },
      { id: "scenes", label: "场景", role: "scene_reference", existing: [], missingTasks: requirements.scenes.map((item) => `待设计或检索场景：${item}`) },
      { id: "style", label: "风格", role: "style_reference", existing: [], missingTasks: requirements.style.map((item) => `待确认风格：${item}`) }
    ],
    externalNeeds: []
  };
  assetInventory.summary = {
    existing: references.length,
    missing: assetInventory.categories.reduce((sum, item) => sum + item.missingTasks.length, 0),
    externalNeeds: 0
  };
  const knowledgeNeeds = inferKnowledgeNeeds(text);
  return {
    text,
    characters,
    evidence: { query: text, entities: [], chunks: [], assets: [] },
    visual: { items: references },
    visualLock,
    assetInventory,
    knowledgeNeeds,
    referencePlan: createReferencePlan({
      query: text,
      focus: input.referenceFocus || knowledgeNeeds.map((item) => item.focus).join(" ")
    }),
    realWorldReferencePack: knowledgeNeeds.length
      ? createRealWorldReferencePack({ query: text, focus: input.referenceFocus || knowledgeNeeds.map((item) => item.focus).join(" ") })
      : null,
    localPropQaGate: null,
    researchPlan: createResearchPlan({
      query: text,
      focus: input.researchFocus || "classic_film animation film_language platform_trend"
    }),
    dramaturgyReview: analyzeScriptWithDramaturgy({
      text: input.script || input.scene || input.prompt || text,
      intent: input.intent || input.topic || "通用创作方案校准",
      topic: input.topic || input.title,
      characters
    })
  };
}

function searchVisualRole(db, queryParts, role, limit) {
  const query = unique(queryParts).join(" ");
  if (!query) return { query: "", items: [] };
  return searchVisualAssets(db, { query, role, limit });
}

function buildLayeredVisualLock(db, input = {}, text = "", characters = []) {
  const requirements = extractVisualRequirements(input, text);
  const identitySearches = characters.map((character) => {
    const primary = searchVisualAssets(db, {
      character,
      role: "identity_reference",
      limit: Number(input.identityVisualLimit || 12)
    });
    const supplementalPortrait = searchVisualAssets(db, {
      character,
      role: "identity_reference",
      kind: "character_portrait",
      limit: Number(input.supplementalIdentityVisualLimit || 8)
    });
    const supplementalMilitary = searchVisualAssets(db, {
      character,
      role: "identity_reference",
      kind: "military_portrait",
      limit: Number(input.supplementalIdentityVisualLimit || 8)
    });
    return {
      character,
      result: {
        ...primary,
        items: mergeVisualItems([primary.items, supplementalPortrait.items, supplementalMilitary.items]),
        supplementalCounts: {
          characterPortrait: supplementalPortrait.items?.length || 0,
          militaryPortrait: supplementalMilitary.items?.length || 0
        },
        sourceFallbackUsed: Boolean(primary.sourceFallbackUsed || supplementalPortrait.sourceFallbackUsed || supplementalMilitary.sourceFallbackUsed)
      }
    };
  });
  const allIdentityReferences = sortIdentityReferences(mergeVisualItems(identitySearches.map((item) => item.result.items)));
  const identityReferences = mergeVisualItems([
    allIdentityReferences.filter((item) => identityPolicyOf(item).referenceTier === "primary_identity_anchor").slice(0, 12),
    allIdentityReferences.filter((item) => identityPolicyOf(item).referenceTier === "supplemental_character_design").slice(0, 16)
  ]);
  const propSearch = searchVisualRole(
    db,
    [...requirements.costumes, ...requirements.props],
    "prop_reference",
    Number(input.propVisualLimit || 10)
  );
  const sceneSearch = searchVisualRole(
    db,
    requirements.scenes,
    "scene_reference",
    Number(input.sceneVisualLimit || 10)
  );
  const styleSearch = searchVisualRole(
    db,
    requirements.style,
    "style_reference",
    Number(input.styleVisualLimit || 8)
  );
  const propReferences = propSearch.items || [];
  const sceneReferences = sceneSearch.items || [];
  const styleReferences = styleSearch.items || [];
  const missingDesignTasks = [];

  for (const character of characters) {
    if (!identityReferences.some((item) => (item.subjectNames || []).includes(character) || String(item.path || item.absPath || item.rel_path || "").includes(character))) {
      missingDesignTasks.push(`${character} 缺少已锁定的本地身份参考图。`);
    }
  }
  if (requirements.costumes.length && !propReferences.length) {
    missingDesignTasks.push(`服装需求未找到本地参考：${requirements.costumes.join("、")}。`);
  }
  if (requirements.props.length && !propReferences.length) {
    missingDesignTasks.push(`道具/装备需求未找到本地参考：${requirements.props.join("、")}。`);
  }
  if (requirements.scenes.length && !sceneReferences.length) {
    missingDesignTasks.push(`场景需求未找到本地参考：${requirements.scenes.join("、")}。`);
  }
  if (requirements.style.length && !styleReferences.length) {
    missingDesignTasks.push(`风格需求未找到本地参考：${requirements.style.join("、")}。`);
  }

  const characterDesignLocks = buildCharacterDesignLocksFromItems(identityReferences, characters, text, input);
  for (const lock of characterDesignLocks) {
    if (lock.status === "missing_primary_identity_anchor") {
      missingDesignTasks.push(`${lock.character} 缺少角色卡/三视图作为一级身份锚；其他立绘只能做草稿补充。`);
    } else if (lock.status === "missing_single_outfit_lock") {
      missingDesignTasks.push(`${lock.character} 尚未选择单一着装设计锁，禁止多个立绘混穿。`);
    } else if (lock.status === "needs_discrimination_confirmation") {
      missingDesignTasks.push(`${lock.character} 的角色卡/三视图和着装设计锁需要先甄别确认，未确认前只能生成草稿。`);
    }
  }

  const items = mergeVisualItems([identityReferences, propReferences, sceneReferences, styleReferences]);
  return {
    standard: "xinrui-layered-visual-lock-v1",
    lockOrder: [
      "1. exact character identity search",
      "2. character card / turnaround as primary identity anchors",
      "3. choose one outfit/design lock per character after discrimination review",
      "4. scene, prop and equipment requirements layered after the selected outfit lock",
      "5. style and storyboard references"
    ],
    identityPolicy: identityPolicySummary(),
    characters,
    identityLocked: characters.length > 0 && characterDesignLocks.every((item) => item.canUseForDraft),
    identityFinalReady: characters.length > 0 && characterDesignLocks.every((item) => item.canUseForFinal),
    requirements,
    identitySearches: identitySearches.map((item) => ({
      character: item.character,
      query: item.result.query,
      sourceFallbackUsed: item.result.sourceFallbackUsed,
      count: item.result.items?.length || 0,
      identityTerms: item.result.identityTerms || []
    })),
    searches: {
      props: { query: propSearch.query, count: propReferences.length, sourceFallbackUsed: Boolean(propSearch.sourceFallbackUsed) },
      scenes: { query: sceneSearch.query, count: sceneReferences.length, sourceFallbackUsed: Boolean(sceneSearch.sourceFallbackUsed) },
      style: { query: styleSearch.query, count: styleReferences.length, sourceFallbackUsed: Boolean(styleSearch.sourceFallbackUsed) }
    },
    identityReferences,
    identityAnchors: identityReferences.filter((item) => identityPolicyOf(item).referenceTier === "primary_identity_anchor"),
    supplementalDesigns: identityReferences.filter((item) => identityPolicyOf(item).referenceTier === "supplemental_character_design"),
    characterDesignLocks,
    propReferences,
    sceneReferences,
    styleReferences,
    missingDesignTasks,
    sourceFallbackUsed: identitySearches.some((item) => item.result.sourceFallbackUsed) || Boolean(propSearch.sourceFallbackUsed || sceneSearch.sourceFallbackUsed || styleSearch.sourceFallbackUsed),
    items
  };
}

function buildContext(db, input = {}) {
  if (isGenericWorkspace(input)) return buildGenericContext(input);
  const text = getText(input);
  const characters = inferCharacters(text, input.characters || []);
  const evidence = text
    ? searchDatabase(db, text.split(/\s+/), { limit: Number(input.limit || 8), mode: "precise" })
    : { query: "", entities: [], chunks: [], assets: [] };
  const visualLock = text
    ? buildLayeredVisualLock(db, input, text, characters)
    : buildLayeredVisualLock(db, input, "", characters);
  const visual = text
    ? searchVisualAssets(db, {
      query: unique([...characters, text.slice(0, 120).trim()]).join(" "),
      role: input.visualRole || "",
      limit: Number(input.visualLimit || 16)
    })
    : { items: [] };
  const assetInventory = createAssetInventory(db, {
    title: input.title || input.topic,
    intent: input.intent || input.prompt,
    script: input.script || input.scene || input.prompt,
    characters
  });
  const knowledgeNeeds = inferKnowledgeNeeds(text);
  const referencePlan = createReferencePlan({
    query: text,
    focus: input.referenceFocus || knowledgeNeeds.map((item) => item.focus).join(" ")
  });
  const realWorldReferencePack = knowledgeNeeds.length
    ? createRealWorldReferencePack({
      query: text,
      focus: input.referenceFocus || knowledgeNeeds.map((item) => item.focus).join(" ")
    })
    : null;
  const localPropQaGate = findLocalPropQaGate(realWorldReferencePack);
  const researchPlan = createResearchPlan({
    query: text,
    focus: input.researchFocus || "classic_film animation film_language platform_trend"
  });
  const dramaturgyReview = analyzeScriptWithDramaturgy({
    text: input.script || input.scene || input.prompt || text,
    intent: input.intent || input.topic || "创作方案校准",
    topic: input.topic || input.title,
    characters
  });

  return {
    text,
    characters,
    evidence,
    visual,
    visualLock,
    assetInventory,
    knowledgeNeeds,
    referencePlan,
    realWorldReferencePack,
    localPropQaGate,
    researchPlan,
    dramaturgyReview
  };
}

function buildSelfCheckItems() {
  return [
    { id: "identity", label: "角色一致性", test: "脸型、发型、发饰、瞳色、体型与角色卡/三视图身份锚一致；其他立绘不得替代身份锚。" },
    { id: "costume", label: "单一着装锁", test: "每个角色本镜头只使用一个已甄别确认的着装设计锁，不把多个立绘的衣服、护具、配饰混穿。" },
    { id: "prop", label: "道具一致性", test: "武器、终端、线缆、屏幕、背包和手持物的形状、比例、握持方式正确。" },
    { id: "axis", label: "180度轴线", test: "同场戏左右关系、视线方向和运动方向稳定；越轴必须有中性镜头或明确调度解释。" },
    { id: "body", label: "动作与手部", test: "无断肢、反关节、浮空、手指错数、握持穿模、肩颈错位和重心不合理。" },
    { id: "composition", label: "构图", test: "主体清楚，负空间服务叙事，前后景遮挡合理，画面重心不偏离镜头意图。" },
    { id: "space", label: "场景空间", test: "门、入口、掩体、车辆、灯源、地面路线和平面图一致。" },
    { id: "style", label: "风格连续", test: "线条、上色、光源、景深、材质和角色设计不漂移。" },
    { id: "continuity", label: "分镜连续", test: "上一镜头的结果能自然进入本镜头，本镜头动作能合理引出下一镜头。" },
    { id: "artifact", label: "异常污染", test: "无多余肢体、脸崩、衣料裁切、乱码文字、水印、logo和不可读屏幕 UI。" }
  ];
}

function buildNegativePrompt() {
  return [
    "角色脸部漂移",
    "发型和发饰变化",
    "服装结构变化",
    "多立绘混穿",
    "同一角色服装混搭",
    "未经确认的补充立绘替换角色卡或三视图",
    "武器和道具形状错误",
    "手指数量错误",
    "手部握持穿模",
    "反关节或重心不稳",
    "180度轴线混乱",
    "场景空间错位",
    "分镜连续性断裂",
    "风格漂移",
    "文字乱码",
    "水印",
    "多余肢体",
    "低清晰度"
  ].join(", ");
}

function buildDesignLockPromptLine(visualLocks = {}) {
  const locks = visualLocks.characterDesignLocks || [];
  if (!locks.length) {
    return "未完成角色卡/三视图与单一着装锁甄别；只能作为草稿，不得进入正式生成。";
  }
  return locks.map((lock) => {
    const anchors = (lock.identityAnchors || [])
      .map((item) => item.title || item.path)
      .filter(Boolean)
      .join(" + ") || "缺角色卡/三视图";
    const design = lock.selectedDesign?.title || lock.selectedDesign?.path || "缺单一着装设计锁";
    return `${lock.character}: 身份锚=${anchors}; 本镜头着装=${design}; 状态=${lock.status}; 禁止从其他立绘混穿服装/护具/配饰`;
  }).join("\n");
}

function extractFocusTerms(input = {}, context = {}) {
  const text = getText(input);
  const terms = [
    ...(context.characters || []),
    ...["雨夜", "走廊", "潜入", "终端", "战术地图", "无人机", "巡逻", "队友", "手势", "门侧", "武器", "军装", "道具", "场景", "服装", "地图", "控制室", "基地", "街道", "镜头", "分镜"].filter((term) => text.includes(term))
  ];
  return unique(terms);
}

function buildCanonBoundary(input = {}, context = {}) {
  if (isGenericWorkspace(input)) {
    const characters = context.characters || [];
    const references = context.visualLock?.identityReferences || [];
    const pending = unique([
      ...(!references.length && characters.length ? ["角色身份参考"] : []),
      ...(context.knowledgeNeeds || []).map((item) => item.label)
    ]);
    return {
      status: pending.length ? "待确认" : "项目资料确认",
      promptText: [
        characters.length ? `- 当前项目角色：${characters.join("、")}。` : "- 当前项目尚未明确角色名。",
        references.length ? `- 项目身份参考：${references.map((item) => item.title || item.path).join("；")}。` : "- 尚未提供项目身份参考，只允许概念草稿。",
        "- 只使用当前项目资料和已批准外部参考，不调用其他私有 IP。",
        pending.length ? `- 待确认：${pending.join("、")}。` : "- 当前项目边界已明确。"
      ].join("\n"),
      selectedCards: [],
      pending
    };
  }
  const summary = summarizeEvidence(context.evidence);
  const focusTerms = extractFocusTerms(input, context);
  const characters = context.characters || [];
  const cards = summary.canonCards
    .map((card) => {
      const haystack = `${card.claim || ""} ${(card.keyPoints || []).join(" ")} ${card.sourcePath || ""}`;
      const hits = focusTerms.filter((term) => term && haystack.includes(term));
      const hasCharacter = characters.some((name) => haystack.includes(name));
      const hasShotSpecificHit = hits.some((term) => !characters.includes(term));
      return { ...card, hits, hasCharacter, hasShotSpecificHit };
    })
    .filter((card) => card.hasCharacter && card.hasShotSpecificHit)
    .slice(0, 3);

  if (cards.length) {
    return {
      status: "资料库确认",
      promptText: cards.map((item) => `- ${item.claim}`).join("\n"),
      selectedCards: cards,
      pending: []
    };
  }

  const pending = unique([
    ...["终端", "战术地图", "无人机", "雨夜", "走廊", "门侧", "服装状态", "道具型号", "场景平面图"].filter((term) => getText(input).includes(term.replace("状态", "").replace("型号", "").replace("平面图", ""))),
    ...context.knowledgeNeeds.map((item) => item.label)
  ]);
  const characterLine = characters.length
    ? `- 资料库确认：当前镜头涉及 ${characters.join("、")}，必须沿用本地角色身份和视觉参考。`
    : "- 资料库确认：未检出明确角色名，生成前需要先锁定角色身份参考。";
  return {
    status: "待确认",
    promptText: [
      characterLine,
      "- 合理推断：当前镜头动作、场景和道具未找到强正史证据时，只能作为本次分镜设计草案处理。",
      pending.length ? `- 待确认：${pending.join("、")}。` : "- 待确认：镜头动作、服装状态、道具与场景空间。"
    ].join("\n"),
    selectedCards: [],
    pending
  };
}

function buildScopedCanonEvidence(input = {}, context = {}) {
  const summary = summarizeEvidence(context.evidence);
  const boundary = buildCanonBoundary(input, context);
  return {
    ...summary,
    canonCards: boundary.selectedCards.map((card) => ({
      claim: card.claim,
      keyPoints: card.keyPoints || [],
      confidence: card.confidence,
      evidenceType: card.evidenceType,
      sourcePath: card.sourcePath,
      matchedTerms: card.hits || []
    })),
    scopedBoundaryStatus: boundary.status,
    pending: boundary.pending,
    rawCanonHitCount: summary.canonCards.length,
    droppedUnrelatedCanonHits: Math.max(0, summary.canonCards.length - boundary.selectedCards.length)
  };
}

function buildPromptText(input, context, durationSec, shotCount) {
  const generic = isGenericWorkspace(input);
  const characters = context.characters.length ? context.characters.join("、") : "按剧本出现角色";
  const prompt = compact(input.prompt || input.shotPrompt || input.script || input.topic || "待细化分镜图");
  const style = compact(input.style || input.visualStyle || (generic
    ? "当前项目统一画风，电影感动画制作质量，主体清楚，材质和光色一致"
    : "新锐纪元近未来东方战术美少女动画，半写实赛璐璐，电影感，克制真实"));
  const camera = compact(input.camera || input.shot?.camera || "35mm 或 50mm 电影镜头，中景到近景，动作和表情清楚");
  const scene = compact(input.sceneLock || input.scene || (generic
    ? "场景按当前项目资料和已批准外部参考锁定，缺失时先生成待设计任务"
    : "场景按本地资料库和外部参考锁定，缺失时先生成待设计任务"));
  const blocking = compact(input.blocking || input.shot?.blocking || "角色站位、视线、动线、关键道具与180度轴线明确");
  const canonBoundary = buildCanonBoundary(input, context);
  const visualLocks = summarizeVisualAssets(context.visualLock || context.visual, context.characters, context.text, input);
  const designLockLine = buildDesignLockPromptLine(visualLocks);
  const formatRefs = (refs = []) => refs.length
    ? refs.map((item) => `${item.title || "未命名参考"}${item.path ? ` (${item.path})` : ""}`).join("；")
    : "未找到可直接引用的本地参考，先生成设计任务或人工补图。";
  const requirements = visualLocks.requirements || {};
  const requirementLine = [
    requirements.costumes?.length ? `服装：${requirements.costumes.join("、")}` : "",
    requirements.props?.length ? `道具/装备：${requirements.props.join("、")}` : "",
    requirements.scenes?.length ? `场景：${requirements.scenes.join("、")}` : "",
    requirements.style?.length ? `风格：${requirements.style.join("、")}` : ""
  ].filter(Boolean).join("；") || "无额外服装、道具、场景或风格关键词。";
  const realWorldPack = context.realWorldReferencePack?.pack;
  const localQa = context.localPropQaGate;
  const realWorldReferenceLine = realWorldPack
    ? [
      `【Real-world reference pack】${realWorldPack.label} / ${realWorldPack.referenceRequirement}`,
      `source links: ${(realWorldPack.sourceUrls || []).join("；") || "browser source images required before final"}`,
      `must restore: ${(realWorldPack.requiredVisualTraits || []).slice(0, 10).join("；")}`,
      `must not confuse with: ${(realWorldPack.mustNotConfuseWith || []).join("；") || "similar wrong objects"}`,
      `composition rules: ${(realWorldPack.compositionRules || []).join("；")}`,
      localQa ? `local prop QA: ${localQa.status}; confirmed traits: ${(localQa.confirmedTraits || []).join("；")}` : "local prop QA: not found",
      localQa ? `local boards: ${(localQa.annotationBoards || []).join("；")}` : ""
    ].join("\n")
    : "【Real-world reference pack】none detected.";

  if (generic) {
    return [
      "【任务】生成一张用于当前原创项目正式故事板的单帧关键情景插图。",
      `【原始意图】${prompt}`,
      `【项目角色】${characters}。保持项目身份参考中的脸型、发型轮廓、体型和单一服装设计。`,
      `【身份参考】${formatRefs(visualLocks.identityAnchors?.length ? visualLocks.identityAnchors : visualLocks.identityReferences)}`,
      `【单一着装锁】\n${designLockLine}`,
      `【服装/场景/道具需求】${requirementLine}`,
      `【项目边界】\n${canonBoundary.promptText}`,
      `【画风】${style}`,
      `【场景锁定】${scene}`,
      realWorldReferenceLine,
      `【调度】${blocking}`,
      `【镜头】${camera}；时长约 ${durationSec}s；项目预计 ${shotCount} 个镜头，本画面必须承接前后镜头。`,
      "【构图】主体动作和叙事焦点清楚，道具接触、视线、重心和空间关系可信。",
      "【连续性】保持角色身份、单一服装、道具状态、场景方向、光源、天气和180度轴线一致。",
      `【负面约束】${buildNegativePrompt()}`
    ].join("\n");
  }

  return [
    "【任务】生成一张可用于正式故事板的单帧关键情景插图。",
    `【原始意图】${prompt}`,
    `【角色锁定】${characters}。角色一致性优先读取角色卡和三视图；不得改变脸型、发型、发饰、瞳色和体型。其他立绘只作为该角色的场景补充设计，不得替代身份锚。`,
    `【本地身份锚】${formatRefs(visualLocks.identityAnchors?.length ? visualLocks.identityAnchors : visualLocks.identityReferences)}`,
    `【单一着装锁】\n${designLockLine}`,
    "【甄别闸门】正式生成前必须确认角色卡/三视图身份锚与本镜头单一着装锁；未确认时只允许草稿。禁止把同一角色多个立绘的服装、护具、配饰混穿。",
    `【补充设计候选】${formatRefs(visualLocks.supplementalDesigns || [])}`,
    `【服装/场景/道具需求】${requirementLine}`,
    `【本地服装/道具参考】${formatRefs(visualLocks.propReferences)}`,
    `【本地场景参考】${formatRefs(visualLocks.sceneReferences)}`,
    `【正史边界】\n${canonBoundary.promptText}`,
    `【画风】${style}`,
    `【场景锁定】${scene}`,
    realWorldReferenceLine,
    `【调度】${blocking}`,
    `【镜头】${camera}；时长约 ${durationSec}s；本项目预计 ${shotCount} 镜头，当前画面必须能承接前后镜头。`,
    "【构图】主体动作清楚，角色与道具可读，画面重心服务叙事，不用装饰性空镜抢戏。",
    "【光色】保持统一光源、统一色温、统一天气和材质逻辑；允许局部高光突出关键道具。",
    "【输出用途】image-2 单帧分镜图；后续可进入 Seedance 2.0/2.5 图生视频。",
    `【负面约束】${buildNegativePrompt()}`,
    "【自检】生成后必须检查角色一致性、道具一致性、180度轴线、动作手部、场景空间、风格连续和异常污染。"
  ].join("\n");
}

function buildQualityGate(context, input = {}) {
  const missing = [];
  const inventory = context.assetInventory || {};
  const visualLocks = summarizeVisualAssets(context.visualLock || context.visual, context.characters, context.text, input);
  if (context.characters.length && !visualLocks.identityReferences.length) {
    missing.push("角色身份参考缺失：必须先用精确角色名锁定本地视觉参考。");
  }
  for (const lock of visualLocks.characterDesignLocks || []) {
    if (lock.status === "missing_identity_reference") {
      missing.push(`${lock.character} 缺少身份参考图。`);
    } else if (lock.status === "missing_primary_identity_anchor") {
      missing.push(`${lock.character} 缺少角色卡/三视图一级身份锚；其他立绘不能单独作为正式身份锁。`);
    } else if (lock.status === "missing_single_outfit_lock") {
      missing.push(`${lock.character} 尚未选定单一着装锁，禁止多立绘混穿。`);
    } else if (lock.status === "needs_discrimination_confirmation") {
      missing.push(`${lock.character} 的身份锚与单一着装锁需要先甄别确认。`);
    }
  }
  if (visualLocks.missingDesignTasks?.length) {
    missing.push(...visualLocks.missingDesignTasks);
  }
  for (const category of inventory.categories || []) {
    if ((category.missingTasks || []).length) {
      missing.push(...category.missingTasks.slice(0, 2));
    }
  }
  if (context.knowledgeNeeds.length) {
    if (context.localPropQaGate?.status === "two_source_reference_ready") {
      missing.push(...(context.localPropQaGate.nextGate?.requiredBeforeFinalCharacterUse || [
        "lock character visual reference",
        "run hand pose and prop occlusion QA",
        "user confirms real reference or fictionalized local style conversion"
      ]).map((item) => `local prop QA gate: ${item}`));
    } else {
      missing.push(...context.knowledgeNeeds.map((item) => `${item.label}需要浏览器优先检索，并暂存到 ${item.stagingPath}`));
    }
    if (!context.localPropQaGate && context.realWorldReferencePack?.pack?.generationGate?.requiredBeforeFinal?.length) {
      missing.push(...context.realWorldReferencePack.pack.generationGate.requiredBeforeFinal.map((item) => `real-world reference gate: ${item}`));
    }
  }
  return {
    canGenerateFinal: missing.length === 0,
    canGenerateDraft: true,
    blockingReasons: missing,
    rule: "角色卡/三视图、单一着装锁、甄别确认、道具、场景、服装或现实知识任一缺失时，只能生成草图或设计任务；正式成片分镜必须先补锁。"
  };
}

function buildStoryboardGate(input = {}, context = {}, imageExists = false) {
  const blockers = [];
  const repair = [];
  const warnings = [];
  const manualReview = normalizeManualVisualReview(input);
  const visualLocks = summarizeVisualAssets(context.visualLock || context.visual, context.characters, context.text, input);
  if (!context.characters.length) blockers.push("未锁定明确角色，无法判断角色一致性。");
  if (!visualLocks.identityReferences.length) repair.push("缺少可直接对照的角色身份参考图。");
  for (const lock of visualLocks.characterDesignLocks || []) {
    if (lock.status === "missing_identity_reference") blockers.push(`${lock.character} 缺少身份参考图。`);
    else if (lock.status === "missing_primary_identity_anchor") repair.push(`${lock.character} 缺少角色卡/三视图一级身份锚。`);
    else if (lock.status === "missing_single_outfit_lock") repair.push(`${lock.character} 尚未选择单一着装锁。`);
    else if (lock.status === "needs_discrimination_confirmation") repair.push(`${lock.character} 的身份锚与着装锁需要先甄别确认。`);
  }
  if (visualLocks.missingDesignTasks?.length) repair.push(...visualLocks.missingDesignTasks);
  if (context.knowledgeNeeds.length) {
    repair.push(...context.knowledgeNeeds.map((item) => `${item.label}未完成浏览器/本地参考核验；可做草稿，但不能进入正式成片。`));
  }
  const inventory = context.assetInventory || {};
  const missing = (inventory.categories || []).flatMap((category) => category.missingTasks || []);
  if (missing.some((item) => /角色|身份/.test(item))) blockers.push("角色身份参考缺失。");
  if (missing.some((item) => /道具|武器|场景|服装/.test(item))) repair.push("服装、道具或场景参考仍有缺口。");
  if (!imageExists && input.imagePath) repair.push("提供了图片路径但当前不可读，需确认路径或重新导出。");
  if (!input.imagePath) warnings.push("未提供实际分镜图，只能生成检查规范，不能完成肉眼判定。");
  if (imageExists && !manualReview.confirmed) {
    repair.push("图片文件已确认，但尚未完成 Codex/人工逐项视觉复核；正式成片前必须通过单图自检。");
  }
  if (manualReview.blockers.length) blockers.push(...manualReview.blockers);
  if (manualReview.repairs.length) repair.push(...manualReview.repairs);
  if (manualReview.warnings.length) warnings.push(...manualReview.warnings);
  if (/越轴|反打|对话|追逐|行动方向/.test(getText(input)) && !/180|轴线|方向|视线/.test(getText(input))) {
    repair.push("镜头涉及方向连续性，但未写明 180 度轴线或视线关系。");
  }
  const severity = blockers.length ? "blocked" : repair.length ? "repair_required" : "pass";
  return {
    status: severity,
    label: severity === "pass" ? "可进入视频生成草稿" : severity === "repair_required" ? "需修后再生成" : "禁止进入正式视频生成",
    canGenerateDraft: severity !== "blocked",
    canGenerateFinal: severity === "pass",
    blockers,
    repair,
    warnings,
    reviewMode: manualReview.confirmed ? "confirmed_visual_review" : imageExists ? "image_exists_review_required" : "spec_only",
    qaScore: scoreVisualQa({ blockers, repair, warnings, manualReview }),
    decisionRule: "角色身份、现实知识、道具结构、场景空间、180度轴线任一项不可判定时，不进入正式视频生成。"
  };
}

function normalizeManualVisualReview(input = {}) {
  const review = input.visualReview || input.manualReview || {};
  const rawStatus = compact(input.visualReviewStatus || review.status || "");
  const confirmed = Boolean(input.confirmedPass || input.visualPassed === true || rawStatus === "pass" || rawStatus === "passed");
  const failed = Boolean(input.visualPassed === false || rawStatus === "fail" || rawStatus === "failed" || rawStatus === "blocked");
  const checkResults = input.checkResults || review.checkResults || {};
  const issues = [
    ...(Array.isArray(input.visualIssues) ? input.visualIssues : []),
    ...(Array.isArray(review.issues) ? review.issues : [])
  ];
  const blockers = [];
  const repairs = [];
  const warnings = [];
  for (const [id, value] of Object.entries(checkResults || {})) {
    const status = typeof value === "string" ? value : value?.status;
    const note = typeof value === "string" ? "" : value?.note;
    if (["fail", "blocked", "blocker"].includes(String(status))) {
      blockers.push(`${id} 检查失败${note ? `：${note}` : ""}`);
    } else if (["repair", "warning", "needs_fix"].includes(String(status))) {
      repairs.push(`${id} 需要修复${note ? `：${note}` : ""}`);
    }
  }
  for (const issue of issues) {
    const text = compact(issue.text || issue.issue || issue);
    if (!text) continue;
    const severity = compact(issue.severity || issue.level || "");
    if (/block|严重|阻断|fail/.test(severity)) blockers.push(text);
    else if (/repair|fix|需修|中等/.test(severity)) repairs.push(text);
    else warnings.push(text);
  }
  if (failed && !blockers.length) blockers.push("视觉复核未通过。");
  return { confirmed, failed, blockers, repairs, warnings };
}

function scoreVisualQa({ blockers = [], repair = [], warnings = [], manualReview = {} }) {
  const raw = 100
    - blockers.length * 30
    - repair.length * 12
    - warnings.length * 5
    + (manualReview.confirmed ? 10 : 0);
  const score = Math.max(0, Math.min(100, raw));
  return {
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D",
    rule: "A 可进入正式前终审；B 可做草稿，正式前复核；C 需修；D 阻断或重生。",
    penalty: {
      blockers: blockers.length,
      repair: repair.length,
      warnings: warnings.length,
      confirmedVisualReview: Boolean(manualReview.confirmed)
    }
  };
}

function safeFileToken(value) {
  return compact(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "visual-check";
}

function cleanProjectSlug(value) {
  return compact(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isInsidePath(parentPath, candidatePath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(candidatePath));
  return relative === "" || Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveProjectVisualArchive(input = {}) {
  const explicitProjectPath = compact(input.projectPath || input.project?.projectPath);
  if (explicitProjectPath) {
    const projectPath = path.resolve(explicitProjectPath);
    if (isInsidePath(PROJECTS_ROOT, projectPath) && fs.existsSync(projectPath)) {
      return {
        projectSlug: path.basename(projectPath),
        projectPath,
        archiveDir: path.join(projectPath, PROJECT_VISUAL_CHECK_REL)
      };
    }
  }

  const projectSlug = cleanProjectSlug(input.projectSlug || input.slug || input.project?.slug);
  if (!projectSlug) return null;
  const projectPath = path.join(PROJECTS_ROOT, projectSlug);
  if (!fs.existsSync(projectPath)) return null;
  return {
    projectSlug,
    projectPath,
    archiveDir: path.join(projectPath, PROJECT_VISUAL_CHECK_REL)
  };
}

function inferVisualQaCategory(result = {}, input = {}) {
  const values = [
    input.visualQaCategory,
    input.qaCategory,
    input.assetCategory,
    input.visualKind,
    input.promptRole,
    result.imageInfo?.assetType,
    result.imageInfo?.visualKind,
    result.imageInfo?.promptRole,
    result.imageInfo?.relPath,
    result.imageInfo?.imagePath,
    input.topic,
    input.title,
    input.prompt
  ].map((value) => String(value || "").toLowerCase());
  const text = values.join("\n");
  if (/storyboard|shot_reference|frame|分镜|故事板|镜头/i.test(text)) return "storyboards";
  if (/scene|location|map|floor|场景|地图|平面图|室内|基地|城市|街道|走廊/i.test(text)) return "scenes";
  if (/weapon|prop|equipment|costume|terminal|drone|rifle|gun|sword|道具|武器|装备|服装|终端|无人机|步枪|枪|剑/i.test(text)) return "props";
  if (/character|portrait|turnaround|identity|military_portrait|角色|立绘|三视图|人物|身份/i.test(text)) return "characters";
  return "other";
}

function visualCheckToMarkdown(result) {
  const lines = [
    "# 分镜图视觉检查报告",
    "",
    `生成时间：${result.createdAt}`,
    `判定：${result.boardDecision?.label || result.gate?.label || ""}`,
    `状态：${result.boardDecision?.status || result.gate?.status || ""}`,
    "",
    "## 图片",
    result.imageInfo?.imagePath ? `- 路径：${result.imageInfo.imagePath}` : "- 未提供可读图片。",
    result.imageInfo?.sizeBytes ? `- 大小：${result.imageInfo.sizeBytes} bytes` : "",
    "",
    "## 生产判定",
    `- image-2 草稿：${result.boardDecision?.canEnterImage2 ? "可进入" : "不可进入"}`,
    `- Seedance 草稿：${result.boardDecision?.canEnterSeedanceDraft ? "可进入" : "不可进入"}`,
    `- Seedance 正式：${result.boardDecision?.canEnterSeedanceFinal ? "可进入" : "不可进入"}`,
    `- 复核模式：${result.gate?.reviewMode || ""}`,
    `- QA 分数：${result.gate?.qaScore?.score ?? ""} / ${result.gate?.qaScore?.grade || ""}`,
    "",
    "## 必须修复",
    ...(result.boardDecision?.mustFixBeforeFinal?.length ? result.boardDecision.mustFixBeforeFinal.map((item) => `- ${item}`) : ["- 暂无必须修复项。"]),
    "",
    "## 检查清单",
    ...(result.checklist || []).map((item) => `- [ ] ${item.label || item.id}：${item.test || ""}；当前：${item.result || "unchecked"}；失败级别：${item.severityIfFailed || ""}`),
    "",
    "## Photoshop 修复计划",
    ...(result.photoshopRepairPlan || []).map((item) => `- ${item}`),
    "",
    "## Codex 复核流程",
    ...(result.codexVisualReviewProcedure || []).map((item) => `- ${item}`)
  ].filter((line) => line !== "");
  return lines.join("\n");
}

function persistVisualCheckReport(result, input = {}) {
  ensureDir(VISUAL_CHECK_ROOT);
  const token = safeFileToken(input.topic || input.title || path.basename(result.imageInfo?.imagePath || ""));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const basePath = path.join(VISUAL_CHECK_ROOT, `${stamp}-${token}`);
  const jsonPath = `${basePath}.json`;
  const markdownPath = `${basePath}.md`;
  const jsonBody = `${JSON.stringify(result, null, 2)}\n`;
  const markdownBody = visualCheckToMarkdown(result);
  fs.writeFileSync(jsonPath, jsonBody, "utf8");
  fs.writeFileSync(markdownPath, markdownBody, "utf8");

  const reportFiles = { jsonPath, markdownPath };
  const archive = resolveProjectVisualArchive(input);
  if (archive) {
    const category = inferVisualQaCategory(result, input);
    const categoryLabel = VISUAL_QA_CATEGORY_LABELS[category] || VISUAL_QA_CATEGORY_LABELS.other;
    const categoryDir = path.join(archive.archiveDir, category);
    ensureDir(categoryDir);
    const projectJsonPath = path.join(categoryDir, `${stamp}-${token}.json`);
    const projectMarkdownPath = path.join(categoryDir, `${stamp}-${token}.md`);
    fs.writeFileSync(projectJsonPath, jsonBody, "utf8");
    fs.writeFileSync(projectMarkdownPath, markdownBody, "utf8");
    reportFiles.projectArchive = {
      projectSlug: archive.projectSlug,
      projectPath: archive.projectPath,
      archiveRoot: archive.archiveDir,
      archiveDir: categoryDir,
      category,
      categoryLabel,
      jsonPath: projectJsonPath,
      markdownPath: projectMarkdownPath
    };
  }

  return reportFiles;
}

function resolveInspectionImage(db, input = {}) {
  const fileId = Number(input.fileId || input.imageFileId || 0);
  if (fileId) {
    const row = db.prepare(`
      SELECT f.id, f.abs_path, f.rel_path, f.media_type, f.size_bytes,
        f.asset_type AS file_asset_type,
        a.asset_type AS asset_type,
        a.title AS asset_title,
        ap.visual_kind,
        ap.prompt_role
      FROM files f
      LEFT JOIN assets a ON a.file_id = f.id
      LEFT JOIN asset_profiles ap ON ap.file_id = f.id
      WHERE f.id = ? AND f.status = 'active'
    `).get(fileId);
    if (row) {
      return {
        imagePath: row.abs_path,
        fileId: row.id,
        relPath: row.rel_path,
        mediaType: row.media_type,
        assetType: row.asset_type || row.file_asset_type,
        assetTitle: row.asset_title,
        visualKind: row.visual_kind,
        promptRole: row.prompt_role,
        exists: fs.existsSync(row.abs_path)
      };
    }
  }
  const relPath = compact(input.relPath || input.imageRelPath);
  if (relPath) {
    const row = db.prepare(`
      SELECT f.id, f.abs_path, f.rel_path, f.media_type, f.size_bytes,
        f.asset_type AS file_asset_type,
        a.asset_type AS asset_type,
        a.title AS asset_title,
        ap.visual_kind,
        ap.prompt_role
      FROM files f
      LEFT JOIN assets a ON a.file_id = f.id
      LEFT JOIN asset_profiles ap ON ap.file_id = f.id
      WHERE f.rel_path = ? AND f.status = 'active'
    `).get(relPath);
    if (row) {
      return {
        imagePath: row.abs_path,
        fileId: row.id,
        relPath: row.rel_path,
        mediaType: row.media_type,
        assetType: row.asset_type || row.file_asset_type,
        assetTitle: row.asset_title,
        visualKind: row.visual_kind,
        promptRole: row.prompt_role,
        exists: fs.existsSync(row.abs_path)
      };
    }
  }
  const imagePath = compact(input.imagePath);
  if (imagePath) {
    const fileIdMatch = imagePath.match(/^fileId:(\d+)$/i);
    if (fileIdMatch) {
      return resolveInspectionImage(db, { fileId: Number(fileIdMatch[1]) });
    }
    const direct = imagePath;
    const outputPath = path.resolve(OUTPUT_ROOT, imagePath);
    const projectPath = path.resolve(getProjectRoot(), imagePath);
    const candidates = [direct, outputPath, projectPath];
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    return {
      imagePath: found || direct,
      exists: Boolean(found)
    };
  }
  return { imagePath: "", exists: false };
}

function resolveReferenceImage(db, input = {}) {
  const merged = {
    fileId: input.referenceFileId || input.fileId || input.imageFileId,
    relPath: input.referenceRelPath || input.relPath || input.imageRelPath,
    imagePath: input.referenceImagePath || input.imagePath
  };
  return resolveInspectionImage(db, merged);
}

function normalizeReferenceImageInputs(input = {}) {
  const values = [
    input.referenceImagePath,
    input.referenceImagePaths,
    input.referenceFileId,
    input.referenceFileIds,
    input.fileId,
    input.fileIds
  ].flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[;\n|]+/));
  return unique(values).filter(Boolean);
}

function resolveReferenceImages(db, input = {}) {
  const items = normalizeReferenceImageInputs(input);
  if (!items.length) return [resolveReferenceImage(db, input)].filter((item) => item.imagePath || item.fileId || item.relPath);
  return items.map((value) => {
    const trimmed = compact(value);
    const fileIdMatch = trimmed.match(/^fileId:(\d+)$/i) || trimmed.match(/^\d+$/);
    if (fileIdMatch) return resolveInspectionImage(db, { fileId: Number(fileIdMatch[1] || trimmed) });
    return resolveInspectionImage(db, { imagePath: trimmed, relPath: trimmed });
  });
}

function detectReferenceMode(input = {}, resolved = {}) {
  const mode = compact(input.referenceMode || input.mode).toLowerCase();
  if (["identity", "identity-lock", "identity_lock", "character"].includes(mode)) return "identity_lock";
  if (["composition", "composition-lock", "composition_lock", "layout", "pose", "blocking"].includes(mode)) return "composition_lock";
  if (["style", "style-lock", "style_lock"].includes(mode)) return "style_lock";
  if (["prop", "prop-geometry-lock", "prop_geometry_lock", "weapon", "object"].includes(mode)) return "prop_geometry_lock";
  const text = compact(`${input.prompt || ""} ${input.topic || ""} ${input.intent || ""} ${resolved.relPath || ""} ${resolved.assetType || ""} ${resolved.promptRole || ""}`);
  if (/identity_reference|角色|立绘|三视图|character|portrait/i.test(text)) return "identity_lock";
  if (/weapon|prop|武器|道具|装备|枪|步枪|rifle/i.test(text)) return "prop_geometry_lock";
  if (/style|风格|色彩|画风|reference/i.test(text)) return "style_lock";
  return "composition_lock";
}

function getImageProviderConfig() {
  const selectedProvider = compact(process.env.IMAGE_PROVIDER || process.env.XINRUI_IMAGE_PROVIDER || "openai").toLowerCase();
  const apiKey = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = process.env.IMAGE_MODEL || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const baseUrl = (process.env.IMAGE_BASE_URL || process.env.OPENAI_IMAGE_API_BASE || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const enabled = Boolean(apiKey && model);
  return {
    provider: "openai",
    selectedProvider,
    apiKey,
    model,
    baseUrl,
    enabled,
    missing: [
      ...(!apiKey ? ["IMAGE_API_KEY 或 OPENAI_API_KEY"] : []),
      ...(!model ? ["IMAGE_MODEL"] : [])
    ],
    supportedModes: ["text_to_image", "image_edit", "reference_img2img_task"],
    setupHint: [
      "在 .env 中配置 IMAGE_PROVIDER=openai",
      "IMAGE_MODEL=gpt-image-2",
      "IMAGE_API_KEY=<your-key>",
      "IMAGE_BASE_URL=https://api.openai.com/v1"
    ].join("\n")
  };
}

function getComfyUiConfig() {
  const baseUrl = (process.env.COMFYUI_BASE_URL || process.env.COMFYUI_SERVER_URL || "http://127.0.0.1:8188").replace(/\/+$/, "");
  const workflowPathRaw = process.env.COMFYUI_IMG2IMG_WORKFLOW || "";
  const workflowPath = resolveProjectPath(workflowPathRaw);
  const outputNodeId = process.env.COMFYUI_OUTPUT_NODE_ID || "";
  const pollMs = Number(process.env.COMFYUI_POLL_MS || 1500);
  const timeoutMs = Number(process.env.COMFYUI_TIMEOUT_MS || 180000);
  const checkpoint = process.env.COMFYUI_CHECKPOINT || "sd_xl_base_1.0.safetensors";
  const steps = Number(process.env.COMFYUI_STEPS || 24);
  const cfg = Number(process.env.COMFYUI_CFG || 6.5);
  const denoise = Number(process.env.COMFYUI_DENOISE || 0.58);
  const samplerName = process.env.COMFYUI_SAMPLER || "dpmpp_2m_sde";
  const scheduler = process.env.COMFYUI_SCHEDULER || "karras";
  const configuredModelDirs = splitPathList(process.env.COMFYUI_MODEL_DIRS || process.env.COMFYUI_MODELS_DIR || "");
  const modelDirs = unique([...configuredModelDirs.map(resolveProjectPath), ...getDefaultComfyModelDirs()]);
  const availableCheckpoints = findComfyCheckpoints(modelDirs);
  const checkpointPath = availableCheckpoints.find((item) => item.name === checkpoint)?.path || "";
  return {
    provider: "comfyui",
    baseUrl,
    workflowPath,
    workflowPathRaw,
    outputNodeId,
    pollMs,
    timeoutMs,
    checkpoint,
    steps,
    cfg,
    denoise,
    samplerName,
    scheduler,
    modelDirs,
    checkpointPath,
    checkpointExists: Boolean(checkpointPath),
    availableCheckpoints: availableCheckpoints.slice(0, 20),
    enabled: Boolean(process.env.COMFYUI_ENABLED === "1" || process.env.IMAGE_PROVIDER === "comfyui"),
    setupHint: [
      "启动 ComfyUI 后设置：",
      "COMFYUI_ENABLED=1",
      "COMFYUI_BASE_URL=http://127.0.0.1:8188",
      "COMFYUI_IMG2IMG_WORKFLOW=config\\comfyui\\xinrui-img2img-sdxl-workflow_api.json",
      "可选：COMFYUI_OUTPUT_NODE_ID=<SaveImage 节点 ID>",
      "工作台会使用 /upload/image 上传参考图，并用 /prompt 提交 workflow。"
    ].join("\n")
  };
}

function getSelectedImageBackend(input = {}, providerConfig = {}, comfyConfig = {}) {
  const requested = compact(input.imageProvider || input.provider || process.env.IMAGE_PROVIDER || process.env.XINRUI_IMAGE_PROVIDER || providerConfig.provider || "openai").toLowerCase();
  if (["comfy", "comfyui", "controlnet", "local"].includes(requested)) return "comfyui";
  if (["openai", "gpt-image", "gpt-image-2", "gpt-image-1"].includes(requested)) return "openai";
  if (comfyConfig.enabled && requested !== "openai") return "comfyui";
  return "openai";
}

function getImageBackendReadiness(input = {}, providerConfig = {}, comfyConfig = {}, referenceImages = []) {
  const selected = getSelectedImageBackend(input, providerConfig, comfyConfig);
  const hasReference = referenceImages.some((item) => item?.exists);
  const comfyWorkflowExists = Boolean(comfyConfig.workflowPath && fs.existsSync(comfyConfig.workflowPath));
  const openaiReady = Boolean(providerConfig.provider === "openai" && providerConfig.enabled);
  const comfyReady = Boolean(comfyConfig.enabled && comfyConfig.workflowPath && comfyWorkflowExists && comfyConfig.checkpointExists);
  const selectedReady = selected === "comfyui" ? comfyReady : openaiReady;
  const blockers = [
    ...(!hasReference ? ["没有可读参考图。请提供 fileId、referenceImagePath，或先从视觉资产检索中选择参考图。"] : []),
    ...(selected === "openai" && !openaiReady ? [`OpenAI 图像接口未配置：${providerConfig.missing.join("、")}`] : []),
    ...(selected === "comfyui" && !comfyConfig.enabled ? ["ComfyUI 未启用：设置 COMFYUI_ENABLED=1 或 IMAGE_PROVIDER=comfyui。"] : []),
    ...(selected === "comfyui" && !comfyConfig.workflowPath ? ["ComfyUI workflow 未配置：设置 COMFYUI_IMG2IMG_WORKFLOW。"] : []),
    ...(selected === "comfyui" && comfyConfig.workflowPath && !comfyWorkflowExists ? [`ComfyUI workflow 文件不存在：${comfyConfig.workflowPath}`] : []),
    ...(selected === "comfyui" && comfyWorkflowExists && !comfyConfig.checkpointExists ? [`ComfyUI checkpoint 未找到：${comfyConfig.checkpoint}`] : [])
  ];
  return {
    selected,
    hasReference,
    openaiReady,
    comfyReady,
    comfyWorkflowExists,
    canGenerateNow: Boolean(hasReference && selectedReady),
    blockers
  };
}

export async function getImageGenerationDiagnostics() {
  const openai = getImageProviderConfig();
  const comfyui = getComfyUiConfig();
  const selectedProvider = getSelectedImageBackend({}, openai, comfyui);
  const comfyWorkflowExists = Boolean(comfyui.workflowPath && fs.existsSync(comfyui.workflowPath));
  let comfyuiReachable = false;
  let comfyuiError = "";
  try {
    const response = await fetch(`${comfyui.baseUrl}/system_stats`, { method: "GET" });
    comfyuiReachable = response.ok;
    if (!response.ok) comfyuiError = `${response.status} ${response.statusText}`;
  } catch (error) {
    comfyuiError = error.message;
  }
  return {
    standard: "xinrui-image-generation-diagnostics-v2",
    createdAt: nowIso(),
    selectedProvider,
    openai: {
      ...publicImageProviderConfig(openai),
      canGenerateText: openai.enabled,
      canEditReference: openai.enabled,
      endpoints: ["/images/generations", "/images/edits"],
      executionPolicy: "只有请求显式传入 execute=true 或 generate=true 时才调用付费接口。"
    },
    comfyui: {
      ...comfyui,
      reachable: comfyuiReachable,
      workflowExists: comfyWorkflowExists,
      canExecute: Boolean(comfyui.enabled && comfyuiReachable && comfyWorkflowExists && comfyui.checkpointExists),
      error: comfyuiReachable ? "" : comfyuiError,
      endpoints: ["/system_stats", "/upload/image", "/prompt", "/history/{prompt_id}", "/view"]
    },
    capabilities: [
      {
        id: "text_to_image",
        label: "gpt-image-2 文生图",
        provider: "openai",
        ready: openai.enabled,
        endpoint: "/images/generations"
      },
      {
        id: "reference_image_edit",
        label: "gpt-image-2 参考图编辑",
        provider: "openai",
        ready: openai.enabled,
        endpoint: "/images/edits"
      },
      {
        id: "local_img2img",
        label: "ComfyUI 本地图生图",
        provider: "comfyui",
        ready: Boolean(comfyui.enabled && comfyuiReachable && comfyWorkflowExists && comfyui.checkpointExists),
        endpoint: "/prompt"
      }
    ],
    recommendation: openai.enabled
      ? `OpenAI gpt-image 图像接口已具备配置条件，可执行文生图和参考图编辑；当前默认模型：${openai.model}。`
      : comfyui.enabled && comfyuiReachable && comfyWorkflowExists && comfyui.checkpointExists
        ? "ComfyUI 已可访问，workflow 和 checkpoint 均已就绪，可执行本地图生图。"
        : comfyui.enabled && comfyuiReachable && comfyWorkflowExists && !comfyui.checkpointExists
          ? `ComfyUI 服务已可访问，但缺少 checkpoint：${comfyui.checkpoint}。请放入任一模型目录的 checkpoints 子文件夹。`
          : comfyui.enabled && comfyWorkflowExists
            ? "ComfyUI workflow 已配置，但 8188 暂不可访问；请先启动本地 ComfyUI 后端。"
            : "当前先使用任务包模式：锁定参考图、写出提示词和 QA，再配置 OpenAI 或 ComfyUI 后执行。"
  };
}

function publicImageProviderConfig(providerConfig = {}) {
  const { apiKey, ...publicConfig } = providerConfig;
  return {
    ...publicConfig,
    apiKeyConfigured: Boolean(apiKey)
  };
}

function dataUrlToBuffer(value = "") {
  const text = String(value || "");
  const match = text.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
  return { mimeType: "", buffer: Buffer.from(text, "base64") };
}

function imageMimeType(filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "image/png";
}

function guessImageExtension(mimeType = "") {
  if (/jpeg|jpg/i.test(mimeType)) return ".jpg";
  if (/webp/i.test(mimeType)) return ".webp";
  return ".png";
}

function resolveProjectTaskRoot(input = {}, relativeParts = [], fallbackRoot) {
  const slug = compact(input.projectSlug || "");
  if (!slug) return fallbackRoot;
  const projectsRoot = path.resolve(PROJECTS_ROOT);
  const projectPath = path.resolve(projectsRoot, slug);
  const relative = path.relative(projectsRoot, projectPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return fallbackRoot;
  if (!fs.existsSync(path.join(projectPath, "project.json"))) return fallbackRoot;
  const scopedRoot = path.join(projectPath, ...relativeParts);
  ensureDir(scopedRoot);
  return scopedRoot;
}

function buildReferenceTaskDirectory(input = {}, referenceMode = "reference") {
  const token = safeFileToken(input.topic || input.title || input.prompt || referenceMode || "reference-image");
  const stamp = nowIso().replace(/[:.]/g, "-");
  const relativeParts = {
    identity_lock: ["03_art", "characters", "reference-image-tasks"],
    composition_lock: ["04_storyboard", "blocking", "reference-image-tasks"],
    style_lock: ["03_art", "style", "reference-image-tasks"],
    prop_geometry_lock: ["03_art", "props", "reference-image-tasks"]
  }[referenceMode] || ["04_storyboard", "key_illustrations", "reference-image-tasks"];
  const taskRoot = resolveProjectTaskRoot(input, relativeParts, IMAGE_REFERENCE_ROOT);
  const dir = path.join(taskRoot, `${stamp}-${token}`);
  ensureDir(dir);
  return dir;
}

function buildImageGenerationTaskDirectory(input = {}) {
  const token = safeFileToken(input.topic || input.title || input.prompt || "image-generation");
  const stamp = nowIso().replace(/[:.]/g, "-");
  const taskRoot = resolveProjectTaskRoot(
    input,
    ["04_storyboard", "key_illustrations", "image-generation-tasks"],
    IMAGE_GENERATION_ROOT
  );
  const dir = path.join(taskRoot, `${stamp}-${token}`);
  ensureDir(dir);
  return dir;
}

function buildTextImagePrompt(input = {}, context = {}) {
  if (isGenericWorkspace(input)) {
    const references = context.visualLock?.identityReferences || [];
    return [
      "Create one finished production illustration for an original film, animation, or social-media project. Use cinematic composition, clean readable forms, controlled detail, and a coherent art direction.",
      `Primary intent: ${compact(input.prompt || input.intent || input.topic || input.script)}`,
      context.characters?.length ? `Characters: ${context.characters.join(", ")}` : "",
      references.length
        ? `Project-owned identity references: ${references.map((item) => item.title || item.path).join("; ")}. Preserve face, hair silhouette, body proportions, and the single selected outfit.`
        : "",
      "Use believable anatomy, readable hands, coherent eye lines, stable screen direction, and consistent scene geometry.",
      "Do not borrow identities or canon from unrelated projects. Do not add extra limbs, malformed hands, unreadable text, watermark, logo, spatial contradictions, or style drift."
    ].filter(Boolean).join("\n");
  }
  const visualLock = context.visualLock || {};
  const identityLocks = visualLock.identityReferences || [];
  const characterDesignLocks = visualLock.characterDesignLocks || [];
  const propLocks = visualLock.propReferences || [];
  const sceneLocks = visualLock.sceneReferences || [];
  return [
    "Create one finished Xinrui Era IP production illustration, semi-realistic anime cel shading, cinematic composition, clean readable forms and controlled detail.",
    `Primary intent: ${compact(input.prompt || input.intent || input.topic || input.script)}`,
    context.characters?.length ? `Characters: ${context.characters.join(", ")}` : "",
    identityLocks.length
      ? `Identity anchors: ${identityLocks.slice(0, 6).map((item) => item.title || item.path).join("; ")}. Preserve face shape, hair silhouette, eye color, hair ornament and body proportions.`
      : "",
    characterDesignLocks.length
      ? `Single outfit locks: ${characterDesignLocks.map((item) => `${item.character}: ${item.selectedDesign?.title || item.selectedDesign?.path || "not selected"} (${item.status})`).join("; ")}. Never mix costume pieces from different references.`
      : "",
    propLocks.length ? `Prop references: ${propLocks.slice(0, 6).map((item) => item.title || item.path).join("; ")}. Preserve silhouette, proportions and hand contact.` : "",
    sceneLocks.length ? `Scene references: ${sceneLocks.slice(0, 6).map((item) => item.title || item.path).join("; ")}. Preserve spatial layout, light direction and weather continuity.` : "",
    "State the action through correct balance, believable joints, readable hands, coherent eye lines and a stable 180-degree axis.",
    "Do not change character identity, do not mix outfits, do not invent weapon or prop geometry, do not add extra limbs, malformed hands, unreadable text, watermark, logo, spatial contradictions or style drift."
  ].filter(Boolean).join("\n");
}

function normalizeImageFormat(value = "png") {
  const normalized = String(value || "png").trim().toLowerCase().replace("jpg", "jpeg");
  return ["png", "jpeg", "webp"].includes(normalized) ? normalized : "png";
}

async function saveOpenAiImagePayload(payload = {}, outputDir, prefix, outputFormat = "png") {
  const first = payload.data?.[0] || {};
  if (!first.b64_json && !first.url) {
    throw new Error("image response did not include b64_json or url");
  }
  if (first.b64_json) {
    const decoded = dataUrlToBuffer(first.b64_json);
    const extension = decoded.mimeType ? guessImageExtension(decoded.mimeType) : `.${normalizeImageFormat(outputFormat).replace("jpeg", "jpg")}`;
    const outputPath = path.join(outputDir, `${prefix}${extension}`);
    fs.writeFileSync(outputPath, decoded.buffer);
    return {
      outputPath,
      responseKind: "b64_json",
      revisedPrompt: first.revised_prompt || "",
      bytes: decoded.buffer.length
    };
  }

  const result = {
    outputUrl: first.url,
    responseKind: "url",
    revisedPrompt: first.revised_prompt || ""
  };
  try {
    const response = await fetch(first.url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = guessImageExtension(response.headers.get("content-type") || `image/${outputFormat}`);
    const outputPath = path.join(outputDir, `${prefix}${extension}`);
    fs.writeFileSync(outputPath, buffer);
    result.outputPath = outputPath;
    result.bytes = buffer.length;
  } catch (error) {
    result.downloadWarning = `临时图片 URL 未能自动下载：${error.message}`;
  }
  return result;
}

async function callOpenAiImageGeneration(providerConfig, input = {}, outputDir, generationPrompt) {
  const outputFormat = normalizeImageFormat(input.outputFormat || process.env.OPENAI_IMAGE_FORMAT || "png");
  const body = {
    model: input.imageModel || providerConfig.model,
    prompt: generationPrompt,
    size: input.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024",
    quality: input.quality || process.env.OPENAI_IMAGE_QUALITY || "medium",
    output_format: outputFormat,
    n: 1
  };
  if (input.background) body.background = input.background;
  if (input.moderation) body.moderation = input.moderation;
  if (Number(input.outputCompression) > 0) body.output_compression = Number(input.outputCompression);
  const response = await fetch(`${providerConfig.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 180000))
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`image generation failed: ${response.status} ${text.slice(0, 500)}`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("image generation response was not valid JSON");
  }
  return saveOpenAiImagePayload(payload, outputDir, "generated-image", outputFormat);
}

function buildImageEditPrompt(input = {}, context = {}) {
  const identityLocks = context.visualLock?.identityReferences || [];
  const characterDesignLocks = context.visualLock?.characterDesignLocks || [];
  const propLocks = context.visualLock?.propReferences || [];
  const sceneLocks = context.visualLock?.sceneReferences || [];
  const referenceMode = context.referenceMode || "composition_lock";
  const modeLine = {
    identity_lock: "Use the input image as the character identity lock. Preserve face shape, hair silhouette, hair ornament, body proportions and costume recognition while adapting only the requested scene/action.",
    composition_lock: "Use the input image as composition and pose reference. Preserve blocking, body direction, camera angle and panel readability while applying the requested character and style locks.",
    style_lock: "Use the input image as style reference. Preserve color discipline, line weight, lighting mood and finish quality without copying unrelated character identity.",
    prop_geometry_lock: "Use the input image as geometry reference for the prop/object. Preserve silhouette, proportions, major components, grip relation and visible functional layout."
  }[referenceMode] || "Use the input image as a strict visual reference.";
  const projectLabel = isGenericWorkspace(input)
    ? "Create a finished production illustration for the current original project, cinematic and clean."
    : "Create a finished Xinrui Era IP illustration, semi-realistic anime, cinematic but clean production art.";
  return [
    modeLine,
    projectLabel,
    `User intent: ${compact(input.prompt || input.intent || input.topic || input.script)}`,
    identityLocks.length ? `Local identity references: ${identityLocks.map((item) => item.title || item.path).join("; ")}` : "",
    characterDesignLocks.length ? `Single outfit locks: ${characterDesignLocks.map((item) => `${item.character}: ${item.selectedDesign?.title || item.selectedDesign?.path || "missing"} (${item.status})`).join("; ")}` : "",
    propLocks.length ? `Local prop references: ${propLocks.map((item) => item.title || item.path).join("; ")}` : "",
    sceneLocks.length ? `Local scene references: ${sceneLocks.map((item) => item.title || item.path).join("; ")}` : "",
    "Do not mutate character identity, do not mix clothing from multiple character illustrations, do not invent extra limbs, do not add watermark, unreadable UI text, wrong hands, wrong prop geometry or inconsistent costume details."
  ].filter(Boolean).join("\n");
}

function supportsImageInputFidelity(model = "") {
  return /^gpt-image-(1|1\.5)$/i.test(String(model || ""));
}

async function callOpenAiImageEdit(providerConfig, input = {}, referenceImages = [], outputDir, editPrompt) {
  const form = new FormData();
  for (const referenceImage of referenceImages.filter((item) => item?.exists && item.imagePath)) {
    const blob = new Blob([fs.readFileSync(referenceImage.imagePath)], { type: imageMimeType(referenceImage.imagePath) });
    form.append("image[]", blob, path.basename(referenceImage.imagePath));
  }
  const model = input.imageModel || providerConfig.model;
  form.append("model", model);
  form.append("prompt", editPrompt);
  form.append("size", input.size || "1024x1024");
  form.append("quality", input.quality || process.env.OPENAI_IMAGE_QUALITY || "medium");
  const outputFormat = normalizeImageFormat(input.outputFormat || process.env.OPENAI_IMAGE_FORMAT || "png");
  form.append("output_format", outputFormat);
  if (supportsImageInputFidelity(model)) {
    form.append("input_fidelity", input.inputFidelity || "high");
  }
  const response = await fetch(`${providerConfig.baseUrl}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`
    },
    body: form
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`image edit failed: ${response.status} ${text.slice(0, 400)}`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("image edit response was not valid JSON");
  }
  return saveOpenAiImagePayload(payload, outputDir, "generated-image-edit", outputFormat);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function replaceWorkflowPlaceholders(value, replacements) {
  if (typeof value === "string") {
    const exact = value.match(/^\{\{([a-zA-Z0-9_.-]+)\}\}$/);
    if (exact && Object.prototype.hasOwnProperty.call(replacements, exact[1])) return replacements[exact[1]];
    return value.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(replacements, key)) return String(replacements[key]);
      return match;
    });
  }
  if (Array.isArray(value)) return value.map((item) => replaceWorkflowPlaceholders(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceWorkflowPlaceholders(item, replacements)]));
  }
  return value;
}

function findComfyOutputImages(historyPayload = {}, promptId = "", outputNodeId = "") {
  const root = historyPayload[promptId] || historyPayload;
  const outputs = root?.outputs || {};
  const nodes = outputNodeId && outputs[outputNodeId] ? [[outputNodeId, outputs[outputNodeId]]] : Object.entries(outputs);
  const images = [];
  for (const [nodeId, nodeOutput] of nodes) {
    for (const image of nodeOutput?.images || []) {
      if (image?.filename) images.push({ nodeId, ...image });
    }
  }
  return images;
}

async function uploadComfyReferenceImage(comfyConfig, referenceImage) {
  const form = new FormData();
  const fileName = path.basename(referenceImage.imagePath);
  const blob = new Blob([fs.readFileSync(referenceImage.imagePath)], { type: imageMimeType(referenceImage.imagePath) });
  form.append("image", blob, fileName);
  form.append("overwrite", "true");
  const response = await fetch(`${comfyConfig.baseUrl}/upload/image`, {
    method: "POST",
    body: form
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`ComfyUI upload failed: ${response.status} ${text.slice(0, 400)}`);
  const payload = text ? JSON.parse(text) : {};
  return {
    filename: payload.name || payload.filename || fileName,
    subfolder: payload.subfolder || "",
    type: payload.type || "input",
    raw: payload
  };
}

async function downloadComfyImage(comfyConfig, image, outputDir, index = 0) {
  const query = new URLSearchParams({
    filename: image.filename,
    type: image.type || "output",
    subfolder: image.subfolder || ""
  });
  const response = await fetch(`${comfyConfig.baseUrl}/view?${query.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI view failed: ${response.status} ${text.slice(0, 400)}`);
  }
  const mimeType = response.headers.get("content-type") || imageMimeType(image.filename);
  const ext = path.extname(image.filename) || guessImageExtension(mimeType);
  const outputPath = path.join(outputDir, `comfyui-output-${String(index + 1).padStart(2, "0")}${ext}`);
  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
  return {
    outputPath,
    filename: image.filename,
    subfolder: image.subfolder || "",
    type: image.type || "output",
    nodeId: image.nodeId || ""
  };
}

async function callComfyUiImageWorkflow(comfyConfig, input = {}, referenceImages = [], outputDir, editPrompt) {
  if (!comfyConfig.enabled) throw new Error("ComfyUI is not enabled. Set COMFYUI_ENABLED=1 or IMAGE_PROVIDER=comfyui.");
  if (!comfyConfig.workflowPath) throw new Error("COMFYUI_IMG2IMG_WORKFLOW is not configured.");
  if (!fs.existsSync(comfyConfig.workflowPath)) throw new Error(`ComfyUI workflow file not found: ${comfyConfig.workflowPath}`);
  const readableReferences = referenceImages.filter((item) => item?.exists && item.imagePath);
  if (!readableReferences.length) throw new Error("No readable reference image for ComfyUI workflow.");

  const uploadedReferences = [];
  for (const referenceImage of readableReferences) {
    uploadedReferences.push(await uploadComfyReferenceImage(comfyConfig, referenceImage));
  }
  const firstUpload = uploadedReferences[0];
  const clientId = input.clientId || `xinrui-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const seed = Number(input.seed || Math.floor(Math.random() * 1000000000));
  const replacements = {
    prompt: editPrompt,
    positive_prompt: editPrompt,
    negative_prompt: input.negativePrompt || buildNegativePrompt(),
    reference_image: firstUpload.filename,
    reference_subfolder: firstUpload.subfolder,
    reference_type: firstUpload.type,
    seed,
    width: Number(input.width || 1024),
    height: Number(input.height || 1024),
    size: input.size || "1024x1024",
    checkpoint: input.checkpoint || comfyConfig.checkpoint,
    ckpt_name: input.checkpoint || comfyConfig.checkpoint,
    steps: Number(input.steps || comfyConfig.steps),
    cfg: Number(input.cfg || comfyConfig.cfg),
    denoise: Number(input.denoise || comfyConfig.denoise),
    sampler_name: input.samplerName || comfyConfig.samplerName,
    scheduler: input.scheduler || comfyConfig.scheduler
  };
  const workflowRaw = parseJsonFile(comfyConfig.workflowPath);
  const workflow = replaceWorkflowPlaceholders(workflowRaw, replacements);
  const resolvedWorkflowPath = path.join(outputDir, "comfyui-workflow-resolved.json");
  fs.writeFileSync(resolvedWorkflowPath, JSON.stringify(workflow, null, 2), "utf8");

  const promptResponse = await fetch(`${comfyConfig.baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  });
  const promptText = await promptResponse.text();
  if (!promptResponse.ok) throw new Error(`ComfyUI prompt failed: ${promptResponse.status} ${promptText.slice(0, 600)}`);
  const queued = JSON.parse(promptText);
  const promptId = queued.prompt_id || queued.promptId || "";
  if (!promptId) throw new Error(`ComfyUI prompt response did not include prompt_id: ${promptText.slice(0, 400)}`);

  const started = Date.now();
  let history = null;
  let images = [];
  while (Date.now() - started < comfyConfig.timeoutMs) {
    await sleep(comfyConfig.pollMs);
    const historyResponse = await fetch(`${comfyConfig.baseUrl}/history/${encodeURIComponent(promptId)}`);
    const historyText = await historyResponse.text();
    if (!historyResponse.ok) throw new Error(`ComfyUI history failed: ${historyResponse.status} ${historyText.slice(0, 400)}`);
    history = historyText ? JSON.parse(historyText) : {};
    images = findComfyOutputImages(history, promptId, comfyConfig.outputNodeId);
    if (images.length) break;
  }
  if (!images.length) {
    throw new Error(`ComfyUI workflow timed out after ${comfyConfig.timeoutMs}ms without output images.`);
  }
  const outputs = [];
  for (let index = 0; index < images.length; index += 1) {
    outputs.push(await downloadComfyImage(comfyConfig, images[index], outputDir, index));
  }
  return {
    provider: "comfyui",
    responseKind: "local_files",
    promptId,
    clientId,
    seed,
    uploadedReferences,
    resolvedWorkflowPath,
    outputs,
    outputPath: outputs[0]?.outputPath || "",
    raw: { queued, images, history }
  };
}

function writeImageGenerationTaskFiles(outputDir, result) {
  const taskJson = path.join(outputDir, "image-generation-task.json");
  const promptMd = path.join(outputDir, "generation-prompt.md");
  const qaMd = path.join(outputDir, "image-generation-qa.md");
  fs.writeFileSync(taskJson, JSON.stringify(result, null, 2), "utf8");
  fs.writeFileSync(promptMd, [
    "# gpt-image-2 文生图提示词",
    "",
    `- 目标模型：${result.provider?.model || "gpt-image-2"}`,
    `- 输出尺寸：${result.request?.size || "1024x1024"}`,
    `- 质量：${result.request?.quality || "medium"}`,
    `- 执行状态：${result.gate?.status || "unknown"}`,
    "",
    "```text",
    result.generationPrompt || "",
    "```"
  ].join("\n"), "utf8");
  fs.writeFileSync(qaMd, [
    "# 图像生成 QA",
    "",
    `- 正式成片门槛：${result.qualityGate?.canGenerateFinal ? "通过" : "未通过"}`,
    `- 草稿门槛：${result.qualityGate?.canGenerateDraft ? "通过" : "未通过"}`,
    "",
    "## 阻塞项",
    "",
    ...(result.qualityGate?.blockingReasons?.length
      ? result.qualityGate.blockingReasons.map((item) => `- ${item}`)
      : ["- 无"]),
    "",
    "## 生成后必检",
    "",
    "- 角色脸型、发型、发饰、瞳色和体型与身份锚一致",
    "- 单镜头只使用一个已确认着装锁，不混穿",
    "- 道具轮廓、比例、握持、接触点与参考一致",
    "- 动作重心、关节、手部、视线与 180 度轴线合理",
    "- 场景空间、光源、天气、镜头连续性和画风一致",
    "- 无多余肢体、乱码、水印、标识污染或局部融化"
  ].join("\n"), "utf8");
  return { taskJson, promptMd, qaMd };
}

export async function createImageGenerationTask(db, input = {}) {
  const context = buildContext(db, input);
  const provider = getImageProviderConfig();
  const outputDir = buildImageGenerationTaskDirectory(input);
  const generationPrompt = buildTextImagePrompt(input, context);
  const qualityGate = buildQualityGate(context, input);
  const requestedExecution = input.execute === true || input.generate === true;
  const allowDraft = input.allowDraft === true || input.draft === true;
  const promptReady = Boolean(compact(input.prompt || input.intent || input.topic || input.script));
  const qualityReady = qualityGate.canGenerateFinal || (allowDraft && qualityGate.canGenerateDraft);
  const canGenerateNow = Boolean(promptReady && provider.enabled && qualityReady);
  const executionBlockers = [
    ...(!promptReady ? ["缺少图像创作意图或提示词。"] : []),
    ...(!provider.enabled ? [`OpenAI 图像接口未配置：${provider.missing.join("、")}`] : []),
    ...(!qualityReady ? ["视觉锁尚未达到正式生成门槛；如只需要草稿，显式传入 allowDraft=true。"] : [])
  ];
  const result = {
    standard: "xinrui-image-generation-task-v1",
    createdAt: nowIso(),
    topic: input.topic || input.title || "",
    projectSlug: input.projectSlug || "",
    prompt: input.prompt || input.intent || "",
    outputDir,
    provider: publicImageProviderConfig(provider),
    request: {
      model: input.imageModel || provider.model,
      size: input.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024",
      quality: input.quality || process.env.OPENAI_IMAGE_QUALITY || "medium",
      outputFormat: normalizeImageFormat(input.outputFormat || process.env.OPENAI_IMAGE_FORMAT || "png"),
      requestedExecution,
      allowDraft
    },
    generationPrompt,
    visualLock: context.visualLock,
    canonEvidence: context.canonEvidence,
    knowledgeNeeds: context.knowledgeNeeds,
    qualityGate,
    gate: {
      status: !promptReady
        ? "blocked"
        : requestedExecution && !canGenerateNow
          ? "execution_blocked"
          : canGenerateNow
            ? "ready_to_generate"
            : "task_ready_provider_not_configured",
      canGenerateNow,
      canGenerateDraft: qualityGate.canGenerateDraft,
      canGenerateFinal: qualityGate.canGenerateFinal,
      requestedExecution,
      blockers: canGenerateNow ? [] : executionBlockers,
      note: "付费图像接口只会在 execute=true 或 generate=true 且质量门槛满足时调用。"
    },
    output: null,
    nextActions: [
      qualityGate.canGenerateFinal
        ? "视觉锁已满足正式生成门槛。"
        : "先确认角色身份锚、单一着装锁、道具和场景参考；当前仅可创建草稿任务。",
      provider.enabled
        ? "OpenAI Images 已配置；勾选立即执行后可调用 gpt-image-2。"
        : "在 .env 配置 IMAGE_API_KEY 或 OPENAI_API_KEY 后重启工作台。",
      "生成后必须把 outputPath 传入 /api/pipeline/visual-check，未通过 QA 不进入 Seedance 成片。"
    ]
  };

  if (requestedExecution && canGenerateNow) {
    try {
      result.output = await callOpenAiImageGeneration(provider, input, outputDir, generationPrompt);
      result.gate.status = "generated_review_required";
      result.gate.canGenerateNow = false;
      result.nextActions = [
        "打开输出图并与角色身份锚、单一着装锁、道具和场景参考并排核对。",
        "调用 /api/pipeline/visual-check 并传入生成图 outputPath。",
        "视觉检查通过后再进入故事板连续帧或 Seedance。"
      ];
    } catch (error) {
      result.output = { error: error.message };
      result.gate.status = "provider_error";
      result.gate.blockers = [`图像接口调用失败：${error.message}`];
    }
  }
  result.files = writeImageGenerationTaskFiles(outputDir, result);
  return result;
}

function writeReferenceTaskFiles(outputDir, result) {
  const taskJson = path.join(outputDir, "reference-image-task.json");
  const promptMd = path.join(outputDir, "image-edit-prompt.md");
  const qaMd = path.join(outputDir, "reference-image-qa.md");
  const comfyMd = path.join(outputDir, "comfyui-handoff.md");
  const comfyWorkflow = path.join(outputDir, "comfyui-workflow-placeholder.json");
  fs.writeFileSync(taskJson, JSON.stringify(result, null, 2), "utf8");
  fs.writeFileSync(promptMd, [
    "# 图生图提示词",
    "",
    "```text",
    result.editPrompt || "",
    "```",
    "",
    "## 参考图",
    "",
    ...(result.referenceImages?.length
      ? result.referenceImages.map((item, index) => `${index + 1}. ${item.imagePath || item.relPath || "未解析到参考图"}${item.exists ? "" : "（不可读）"}`)
      : [result.referenceImage?.imagePath || "未解析到参考图"])
  ].join("\n"), "utf8");
  fs.writeFileSync(qaMd, [
    "# 图生图 QA",
    "",
    `- 状态：${result.gate?.status || "unknown"}`,
    `- 模式：${result.referenceMode}`,
    `- 参考图可读：${result.referenceImage?.exists ? "是" : "否"}`,
    `- 生成器：${result.provider?.provider || ""} / ${result.provider?.model || ""}`,
    "",
    "## 必检项",
    "",
    "- 角色身份是否跟本地立绘一致",
    "- 服装、发饰、身材比例是否漂移",
    "- 道具几何是否照着参考图，不像错误型号",
    "- 构图、动作、手部、透视是否异常",
    "- 是否需要 PS 局部修复或重新生成"
  ].join("\n"), "utf8");
  fs.writeFileSync(comfyMd, [
    "# ComfyUI / ControlNet 交接",
    "",
    `- ComfyUI 地址：${result.comfyui?.baseUrl || "http://127.0.0.1:8188"}`,
    "- 参考图上传：POST /upload/image",
    "- 工作流提交：POST /prompt，body 包含 `prompt` 和 `client_id`",
    "- 结果查询：GET /history/{prompt_id}，下载：GET /view?filename=...",
    "",
    "## 建议节点",
    "",
    "- LoadImage: 使用上传后的参考图文件名",
    "- ControlNet/Canny/Depth/OpenPose/IP-Adapter: 根据 referenceMode 选择",
    "- KSampler denoise: 身份锁建议低到中等，构图/风格可中等",
    "- SaveImage: 输出后必须回到 `/api/pipeline/visual-check`",
    "",
    "## 可自动替换的 workflow 占位符",
    "",
    "- `{{prompt}}` / `{{positive_prompt}}`：新锐纪元精修后的正向提示词",
    "- `{{negative_prompt}}`：工作台负向提示词",
    "- `{{reference_image}}`：上传到 ComfyUI input 后的参考图文件名",
    "- `{{reference_subfolder}}` / `{{reference_type}}`：参考图子目录与类型",
    "- `{{seed}}`、`{{width}}`、`{{height}}`、`{{size}}`：生成参数",
    "",
    "## 参考模式映射",
    "",
    "- identity_lock -> IP-Adapter / Reference-only / FaceID 类流程",
    "- composition_lock -> OpenPose / Depth / Canny",
    "- style_lock -> IP-Adapter style / LoRA / 色彩参考",
    "- prop_geometry_lock -> Canny / Lineart / 局部重绘 / PS 标注"
  ].join("\n"), "utf8");
  fs.writeFileSync(comfyWorkflow, JSON.stringify({
    note: "placeholder: export a ComfyUI workflow as API JSON and set COMFYUI_IMG2IMG_WORKFLOW to that path.",
    referenceMode: result.referenceMode,
    prompt: result.editPrompt,
    referenceImages: result.referenceImages
  }, null, 2), "utf8");
  return { taskJson, promptMd, qaMd, comfyMd, comfyWorkflow };
}

export async function createReferenceImageGenerationTask(db, input = {}) {
  const text = getText(input);
  const context = buildContext(db, input);
  const referenceImages = resolveReferenceImages(db, input);
  const referenceImage = referenceImages[0] || { imagePath: "", exists: false };
  const referenceMode = detectReferenceMode(input, referenceImage);
  const provider = getImageProviderConfig();
  const comfyui = getComfyUiConfig();
  const backend = getImageBackendReadiness(input, provider, comfyui, referenceImages);
  const outputDir = buildReferenceTaskDirectory(input, referenceMode);
  const editPrompt = buildImageEditPrompt(input, {
    referenceMode,
    visualLock: context.visualLock
  });
  const result = {
    standard: "xinrui-reference-image-generation-v1",
    createdAt: nowIso(),
    topic: input.topic || input.title || "",
    projectSlug: input.projectSlug || "",
    prompt: input.prompt || input.intent || "",
    referenceMode,
    text,
    outputDir,
    referenceImage,
    referenceImages,
    provider: publicImageProviderConfig(provider),
    comfyui: {
      ...comfyui,
      workflowExists: Boolean(comfyui.workflowPath && fs.existsSync(comfyui.workflowPath))
    },
    selectedBackend: backend.selected,
    backendReadiness: {
      selected: backend.selected,
      openaiReady: backend.openaiReady,
      comfyReady: backend.comfyReady,
      comfyWorkflowExists: backend.comfyWorkflowExists,
      comfyCheckpointExists: Boolean(comfyui.checkpointExists)
    },
    editPrompt,
    visualLock: context.visualLock,
    canonEvidence: context.canonEvidence,
    knowledgeNeeds: context.knowledgeNeeds,
    gate: {
      status: referenceImage.exists ? (backend.canGenerateNow ? "ready_to_generate" : "task_ready_provider_not_configured") : "blocked",
      canGenerateNow: backend.canGenerateNow,
      canCreateTask: Boolean(referenceImages.some((item) => item.exists)),
      blockers: backend.blockers,
      note: "工作台会把参考图作为真实输入任务保存；可按 IMAGE_PROVIDER 选择 OpenAI Images Edit 或 ComfyUI/ControlNet。"
    },
    output: null,
    nextActions: referenceImage.exists
      ? [
        "先打开 reference-image-task.json 核对参考图和参考模式。",
        backend.canGenerateNow ? "已具备直接图生图条件，可检查输出图并运行 /api/pipeline/visual-check。" : "配置 OpenAI Images 或 ComfyUI workflow 后重新点击图生图。",
        "若是现实枪械、军服、城市地图，先完成浏览器参考包和道具 QA gate。"
      ]
      : [
        "用视觉资产甄别面板检索角色立绘或参考图。",
        "点击图片的检查/引用按钮，或把本地图片路径填入参考图路径。",
        "确认参考图可读后再生成。"
      ]
  };
  if (referenceImages.some((item) => item.exists) && backend.canGenerateNow && (input.execute === true || input.generate === true)) {
    try {
      result.output = backend.selected === "comfyui"
        ? await callComfyUiImageWorkflow(comfyui, input, referenceImages, outputDir, editPrompt)
        : await callOpenAiImageEdit(provider, input, referenceImages, outputDir, editPrompt);
      result.gate.status = "generated_review_required";
      result.gate.canGenerateNow = false;
      result.gate.blockers = [];
      result.nextActions = [
        "打开输出图进行人工/Codex 视觉检查。",
        "调用 /api/pipeline/visual-check 并传入生成图路径。",
        "视觉检查通过后再进入故事板或 Seedance。"
      ];
    } catch (error) {
      result.output = { error: error.message };
      result.gate.status = "provider_error";
      result.gate.blockers = [`图像接口调用失败：${error.message}`];
    }
  }
  result.files = writeReferenceTaskFiles(outputDir, result);
  return result;
}

export function createStoryboardPromptOptimization(db, input = {}) {
  const durationSec = inferDurationSec(input);
  const shotCount = inferShotCount(input, durationSec);
  const context = buildContext(db, input);
  const visualLocks = summarizeVisualAssets(context.visualLock || context.visual, context.characters, context.text, input);
  const image2Prompt = buildPromptText(input, context, durationSec, shotCount);
  const qualityGate = buildQualityGate(context, input);
  const canonBoundary = buildCanonBoundary(input, context);

  return {
    standard: isGenericWorkspace(input) ? "generic-single-storyboard-prompt-refine-v1" : "xinrui-single-storyboard-prompt-refine-v2",
    createdAt: nowIso(),
    targetModel: input.targetModel || "image-2 storyboard + Seedance 2.0/2.5 video",
    targetDurationSec: durationSec,
    plannedShotCount: shotCount,
    characters: context.characters,
    canonEvidence: buildScopedCanonEvidence(input, context),
    visualLocks,
    knowledgeNeeds: context.knowledgeNeeds,
    realWorldReferencePack: context.realWorldReferencePack,
    localPropQaGate: context.localPropQaGate,
    refinedPrompt: {
      brief: compact(input.prompt || input.shotPrompt || input.script || input.topic),
      canonBoundary,
      image2Prompt,
      negativePrompt: buildNegativePrompt(),
      continuityLocks: [
        "同一角色跨镜头使用同一身份参考、服装状态和道具位置。",
        "同一场景跨镜头使用同一平面图、光源方向和轴线。",
        "每一镜头都写清调度、画面、镜头和分镜图描述。"
      ],
      repairPolicy: [
        "若只是小面积边缘、衣料穿帮、局部色彩偏差，进入 Photoshop 局部精修。",
        "若出现脸部漂移、手部严重错误、道具结构错误或轴线错误，优先回到提示词和分镜逻辑重新生成。",
        "若缺少服装、道具或场景设定，先输出设计任务，不进入最终成片镜头。"
      ]
    },
    image2ReadyGate: qualityGate,
    selfCheck: buildSelfCheckItems()
  };
}

export function estimateVideoGenerationCost(input = {}) {
  const targetDurationSec = inferDurationSec(input);
  const shotCount = inferShotCount(input, targetDurationSec);
  const unitLabel = input.unitLabel || input.segmentLabel || (targetDurationSec >= 60 && shotCount <= 12 ? "15秒视频段" : "镜头");
  const attemptsPerShot = Math.max(1, Math.round(asNumber(input.attemptsPerShot, 2)));
  const finalAttempts = Math.max(1, Math.round(asNumber(input.finalAttempts, 1)));
  const usdToCny = asNumber(input.usdToCny, DEFAULT_USD_TO_CNY);
  const budgetCny = asNumber(input.budgetCny, 0);
  const avgShotDurationSec = Math.max(1, targetDurationSec / shotCount);
  const billableDraftSeconds = targetDurationSec * attemptsPerShot;
  const billableFinalSeconds = targetDurationSec * finalAttempts;
  const billableShotSeconds = shotCount * avgShotDurationSec * attemptsPerShot;
  const contextText = getText(input);
  const knowledgeNeeds = inferKnowledgeNeeds(contextText);

  const routeEstimates = COST_PROFILES.map((profile) => {
    const draftUsd = billableDraftSeconds * profile.pricePerSecondUsd;
    const finalUsd = billableFinalSeconds * profile.pricePerSecondUsd;
    const shotUsd = billableShotSeconds * profile.pricePerSecondUsd;
    const totalUsd = draftUsd + finalUsd;
    const totalCny = totalUsd * usdToCny;
    return {
      ...profile,
      assumptions: {
        targetDurationSec,
        shotCount,
        attemptsPerShot,
        finalAttempts,
        avgShotDurationSec: Math.round(avgShotDurationSec * 100) / 100,
        billableDraftSeconds: Math.round(billableDraftSeconds * 100) / 100,
        billableFinalSeconds: Math.round(billableFinalSeconds * 100) / 100,
        billableShotSeconds: Math.round(billableShotSeconds * 100) / 100
      },
      estimate: {
        draftUsd: roundMoney(draftUsd),
        finalUsd: roundMoney(finalUsd),
        shotByShotUsd: roundMoney(shotUsd),
        totalUsd: roundMoney(totalUsd),
        totalCny: roundMoney(totalCny),
        budgetStatus: budgetCny
          ? totalCny <= budgetCny * 0.75 ? "under_budget"
            : totalCny <= budgetCny ? "near_budget"
              : "over_budget"
          : "no_budget_set"
      }
    };
  });

  const recommended = routeEstimates.find((item) => item.id === "fal-seedance-2-fast-720p") || routeEstimates[0];
  const pro = routeEstimates.find((item) => item.id === "fal-seedance-2-standard-720p") || routeEstimates[1];
  const cheapDraft = routeEstimates.find((item) => item.id === "replicate-seedance-1-lite-720p-draft");
  const recommendedProfile = COST_PROFILES.find((item) => item.id === "fal-seedance-2-fast-720p") || COST_PROFILES[0];
  const formalProfile = COST_PROFILES.find((item) => item.id === "fal-seedance-2-standard-720p") || COST_PROFILES[1] || recommendedProfile;
  const shotBudget = {
    standard: "xinrui-shot-level-budget-v1",
    basis: {
      targetDurationSec,
      shotCount,
      attemptsPerShot,
      finalAttempts,
      usdToCny,
      unitLabel
    },
    draftRoute: {
      profileId: recommendedProfile.id,
      label: recommendedProfile.label,
      rows: buildShotBudgetRows(input, recommendedProfile, { knowledgeNeeds })
    },
    formalRoute: {
      profileId: formalProfile.id,
      label: formalProfile.label,
      rows: buildShotBudgetRows(input, formalProfile, { knowledgeNeeds })
    }
  };

  return {
    standard: "xinrui-seedance-cost-control-v1",
    createdAt: nowIso(),
    targetDurationSec,
    shotCount,
    unitLabel,
    currency: { usdToCny },
    budgetCny: budgetCny || null,
    routeEstimates,
    shotBudget,
    knowledgeNeeds,
    recommendedStrategy: [
      "先用本地资料库和 image-2 生成单帧关键情景图，全部通过视觉自检后再进入视频模型。",
      `视频生成建议先拆成 ${shotCount} 个${unitLabel}，每个${unitLabel}只保留必要动作点，不把预算浪费在装饰性空镜。`,
      `草稿路线优先使用 ${recommended.label} 做动作预演；预算很紧时可用 ${cheapDraft?.label || "低成本草稿替代路线"} 先筛镜头，但不能把草稿质量当成成片质量。`,
      `正式路线只把通过自检的${unitLabel}送入 ${pro.label}；问题${unitLabel}先回到提示词或 Photoshop 修图，不盲目重抽。`,
      `每个${unitLabel}默认 2 次草稿机会、1 次正式机会；超过后必须先改分镜或补参考。`
    ],
    hardStops: [
      "角色身份参考缺失时，不进入正式视频生成。",
      "武器、城市、军装、现实装备未浏览器或本地参考包核验时，只能做待确认概念图。",
      "单帧出现严重手部、脸部、轴线或场景空间错误时，不送入 Seedance。"
    ],
    budgetStopRules: [
      "任一镜头草稿 2 次仍有角色漂移、动作失败或道具错误，停止继续抽该镜头。",
      "总预算使用超过 70% 时，只保留核心剧情镜头进入正式路线。",
      "若单帧分镜未通过视觉检查，不允许消耗视频模型预算。",
      "现实装备、城市地图、军装等未完成参考核验时，只能低成本草稿，不做正式成片。"
    ],
    pricingRefreshRequired: "生成前刷新平台价格；Seedance 2.5 当前按预留路线估算，不能当作实际报价。"
  };
}

export function createStoryboardVisualInspectionPlan(db, input = {}) {
  const context = buildContext(db, input);
  const resolvedImage = resolveInspectionImage(db, input);
  const imagePath = resolvedImage.imagePath;
  const imageExists = Boolean(imagePath && resolvedImage.exists);
  const gate = buildStoryboardGate(input, context, imageExists);
  const imageInfo = imageExists ? {
    imagePath,
    fileId: resolvedImage.fileId,
    relPath: resolvedImage.relPath,
    assetType: resolvedImage.assetType,
    assetTitle: resolvedImage.assetTitle,
    visualKind: resolvedImage.visualKind,
    promptRole: resolvedImage.promptRole,
    sizeBytes: fs.statSync(imagePath).size,
    extension: path.extname(imagePath).toLowerCase()
  } : imagePath ? {
    imagePath,
    exists: false,
    fileId: resolvedImage.fileId,
    relPath: resolvedImage.relPath,
    assetType: resolvedImage.assetType,
    assetTitle: resolvedImage.assetTitle,
    visualKind: resolvedImage.visualKind,
    promptRole: resolvedImage.promptRole
  } : null;

  const result = {
    standard: "xinrui-storyboard-visual-inspection-v2",
    createdAt: nowIso(),
    imageInfo,
    inspectionMode: imageExists
      ? "本地图片路径已确认；Codex 可进一步打开图片做视觉判断，必要时转 Photoshop 精修。"
      : "未提供可读图片；先输出镜头自检规范和修复路线。",
    characters: context.characters,
    canonEvidence: buildScopedCanonEvidence(input, context),
    visualLocks: summarizeVisualAssets(context.visualLock || context.visual, context.characters, context.text, input),
    gate,
    boardDecision: {
      status: gate.status,
      label: gate.label,
      canEnterImage2: gate.canGenerateDraft,
      canEnterSeedanceDraft: gate.canGenerateDraft,
      canEnterSeedanceFinal: gate.canGenerateFinal,
      mustFixBeforeFinal: [...gate.blockers, ...gate.repair]
    },
    checklist: buildSelfCheckItems().map((item) => ({
      ...item,
      result: "unchecked",
      severityIfFailed: ["identity", "prop", "axis", "body", "space"].includes(item.id) ? "blocker" : "repair",
      passCondition: "画面中可被肉眼清楚验证；不确定时标记待确认，不直接进入成片。",
      repairRoute: item.id === "identity" || item.id === "body" || item.id === "axis"
        ? "优先回到提示词和分镜重新生成；局部小错再用 Photoshop 修。"
        : "先判断是否可用 Photoshop 局部修复；无法修复时重新生成。"
    })),
    photoshopRepairPlan: [
      "复制原图为修复版，不覆盖源文件。",
      "先修局部边缘、穿帮、服装遮挡、屏幕文字和小面积错色。",
      "脸部结构、手部骨骼、武器结构、空间轴线错误不做硬修，回到提示词重抽。",
      "修复后导出对照图：before、after、问题标注层和最终图。"
    ],
    codexVisualReviewProcedure: [
      "打开本地图片做视觉检查。",
      "按角色、道具、轴线、动作、构图、空间、风格、异常八类逐项判定。",
      "每个问题必须给出位置、问题、严重度、修复方式、是否允许进入视频模型。",
      "若通过，写入镜头通过记录；若不通过，回到提示词细化或 Photoshop 修复。"
    ],
    rejectionRules: [
      "角色脸崩或身份漂移：退回重生。",
      "手部握持错误影响剧情：退回重生。",
      "武器或道具型号错误：浏览器和本地参考包核验后重生。",
      "180度轴线破坏连续性：重新编排镜头。",
      "场景和平面图矛盾：先改场景设定。"
    ]
  };
  if (imageExists || input.persistReport) {
    result.reportFiles = persistVisualCheckReport(result, input);
  }
  return result;
}

export function createAutonomousCreativeExecutionPlan(db, input = {}) {
  const context = buildContext(db, input);
  const durationSec = inferDurationSec(input);
  const shotCount = inferShotCount(input, durationSec);
  const costEstimate = estimateVideoGenerationCost({
    durationSec,
    shotCount,
    attemptsPerShot: input.attemptsPerShot,
    finalAttempts: input.finalAttempts,
    budgetCny: input.budgetCny,
    usdToCny: input.usdToCny
  });
  const explicit = /生成|制作|创建|执行|开始|跑通|创作|分镜|故事板|视频|手书|MV|成片/i.test(context.text);
  const pipeline = [
    {
      title: "1. 立项与资料锁定",
      endpoint: "/api/projects/create",
      autoLevel: "local_auto",
      actions: ["创建项目文件夹", "写入 brief、脚本和资源清单", "列出已有/缺失的角色、服装、道具、场景和风格参考"],
      output: "output/projects/<project>/00_brief + 03_art"
    },
    {
      title: "2. 正史与剧作校准",
      endpoint: "/api/dramaturgy/review",
      autoLevel: "local_auto",
      actions: ["资料库证据卡片确认", "四层叙事审查", "标注资料库确认/合理推断/待确认"],
      output: "剧本审查与纠错清单"
    },
    {
      title: "3. 外部研究与待处理参考",
      endpoint: "/api/research/plan + /api/references/plan",
      autoLevel: context.knowledgeNeeds.length ? "browser_first_required" : "as_needed",
      actions: ["现实武器、城市、军装、道具、平台趋势优先浏览器检索", "只暂存事实和视觉特征，不写入正史"],
      output: "output/external-references/pending"
    },
    {
      title: "4. 单帧提示词精修",
      endpoint: "/api/pipeline/prompt-refine",
      autoLevel: "local_auto",
      actions: ["把单个分镜图提示词扩展成角色锁、道具锁、场景锁、调度、画面、镜头、负面约束和自检项"],
      output: "image-2 ready prompt"
    },
    {
      title: "5. 分镜编排与故事板总图",
      endpoint: "/api/storyboards/generate + /api/storyboards/:id/board",
      autoLevel: "local_auto",
      actions: [
        `按 ${durationSec}s / ${shotCount} 个故事板单元规划节奏；若用户指定 Seedance 2.0 15秒标准，则按 15秒视频段而非单镜头理解。`,
        "生成连续分镜、角色/道具/场景/动线/平面图/摄像机参数的单张故事板总图规格。"
      ],
      output: "storyboard board + markdown"
    },
    {
      title: "6. 视觉检查与修复",
      endpoint: "/api/pipeline/visual-check",
      autoLevel: "local_auto_then_ps",
      actions: ["逐帧检查角色、道具、轴线、动作、构图、场景、风格和异常", "小错进 Photoshop 修，结构性错误重抽"],
      output: "QA 记录与修复建议"
    },
    {
      title: "7. 视频模型生成与成本闸门",
      endpoint: "/api/pipeline/cost-estimate",
      autoLevel: "confirm_before_paid_generation",
      actions: ["先 Lite/低成本草稿，再 Pro/正式成片", "每镜头默认 2 次草稿 + 1 次正式", "超过预算前停止并重写分镜或提示词"],
      output: "Seedance 2.0/2.5 成本表"
    },
    {
      title: "8. AE/PR 后期与发布",
      endpoint: "/api/postproduction/video-plan + /api/publishing/bilibili",
      autoLevel: "local_auto",
      actions: ["AE 做角色微动、头发飘动、呼吸与镜头运动", "PR 粗剪字幕节奏", "输出封面 brief、标题、简介、标签和复盘计划"],
      output: "AE/PR 源文件与发布方案"
    }
  ];

  return {
    standard: "xinrui-autonomous-creative-pipeline-v2",
    createdAt: nowIso(),
    explicitCreativeCommand: explicit,
    executionPolicy: {
      autoRunWhenExplicit: true,
      localSafeActions: ["资料库检索", "建项目", "写计划", "提示词细化", "故事板规格", "视觉自检", "成本估算"],
      confirmationRequired: ["付费图像/视频批量生成", "覆盖原始素材", "发布到平台", "把外部参考写入正史"],
      fallbackWhenLlmDisabled: "使用本地资料库、规则库、浏览器研究计划和固定审查模板先跑通。"
    },
    targetDurationSec: durationSec,
    plannedShotCount: shotCount,
    characters: context.characters,
    knowledgeNeeds: context.knowledgeNeeds,
    pipeline,
    canonEvidence: buildScopedCanonEvidence(input, context),
    assetInventory: context.assetInventory,
    dramaturgyReview: context.dramaturgyReview,
    costEstimate
  };
}

export function createDetailedCreativePlan(db, input = {}) {
  const context = buildContext(db, input);
  const promptPlan = createStoryboardPromptOptimization(db, input);
  const executionPlan = createAutonomousCreativeExecutionPlan(db, input);
  const visualCheck = createStoryboardVisualInspectionPlan(db, input);
  const costEstimate = estimateVideoGenerationCost(input);

  return {
    standard: "xinrui-detailed-creative-plan-v2",
    createdAt: nowIso(),
    topic: input.topic || input.title || "未命名创作方案",
    creativePlan: {
      logline: compact(input.intent || input.topic || "以本地资料库为正史边界，生成可进入分镜和视频模型的创作方案。"),
      narrativeGoal: "先用四层叙事规则校准情节，再把情节转成可拍、可画、可生成的视频镜头。",
      visualGoal: "所有角色、服装、道具、场景和风格先锁定，再生成 image-2 分镜图和统一故事板。",
      productionGoal: "以 Seedance 2.0/2.5 为基准做镜头成本控制，用草稿路线试动作，用正式路线出成片。"
    },
    canonEvidence: buildScopedCanonEvidence(input, context),
    visualLocks: summarizeVisualAssets(context.visualLock || context.visual, context.characters, context.text, input),
    knowledgeNeeds: context.knowledgeNeeds,
    researchPlan: context.researchPlan,
    referencePlan: context.referencePlan,
    dramaturgyReview: context.dramaturgyReview,
    assetInventory: context.assetInventory,
    promptPlan,
    visualCheck,
    pipeline: executionPlan.pipeline,
    costEstimate,
    nextActions: [
      "确认剧本是否通过四层叙事审查。",
      "确认角色、服装、道具、场景和风格参考是否齐全。",
      "缺失现实知识时先浏览器研究并暂存外部参考。",
      "生成单帧 image-2 分镜图并逐帧自检。",
      "通过后再进入 Seedance 草稿和正式视频生成。"
    ]
  };
}

export function getCostProfiles() {
  return COST_PROFILES.map((item) => ({ ...item }));
}

