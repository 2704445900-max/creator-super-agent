import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "./config.js";
import { nowIso } from "./utils.js";

const CONFIG_PATH = path.join(getProjectRoot(), "config", "visual-qa-v2.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return { thresholds: { visualDraft: 72, visualFinal: 86, maxAutomaticRepairRounds: 2 }, dimensions: [], optionalAdapters: [] };
  }
}

function clampScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeFindings(review = {}) {
  return (Array.isArray(review.findings) ? review.findings : [])
    .map((item, index) => ({
      id: item.id || `finding-${index + 1}`,
      dimension: compact(item.dimension || item.category || "artifacts"),
      location: compact(item.location || "画面未标注区域"),
      issue: compact(item.issue || item.description),
      severity: ["blocker", "major", "minor"].includes(item.severity) ? item.severity : "major",
      localized: item.localized !== false,
      suggestedFix: compact(item.suggestedFix || item.repair || "根据问题类型局部编辑或重新生成")
    }))
    .filter((item) => item.issue);
}

export function getVisualQaV2Diagnostics() {
  const config = readConfig();
  const sidecarUrl = process.env.CREATOR_VISUAL_QA_URL || "";
  return {
    standard: "creator-visual-qa-diagnostics-v2",
    createdAt: nowIso(),
    configPath: CONFIG_PATH,
    codexVisualReviewReady: true,
    optionalSidecar: {
      configured: Boolean(sidecarUrl),
      url: sidecarUrl,
      rule: "未配置本地视觉侧车时，由 Codex 打开真实图片完成多模态复核；不得把规则清单冒充图像检测结果。"
    },
    adapters: (config.optionalAdapters || []).map((item) => ({
      ...item,
      status: sidecarUrl ? "configured_external_sidecar" : "planned_optional_adapter",
      bundled: false
    })),
    thresholds: config.thresholds
  };
}

export function buildVisualQaV2(input = {}, imageInfo = null, promptSpec = null) {
  const config = readConfig();
  const review = input.visualReview || input.codexReview || {};
  const scoreSource = review.scores || review.checkResults || {};
  const scores = {};
  for (const dimension of config.dimensions || []) scores[dimension] = clampScore(scoreSource[dimension]);
  const providedScores = Object.values(scores).filter((value) => value !== null);
  const findings = normalizeFindings(review);
  const overallScore = providedScores.length
    ? Math.round(providedScores.reduce((sum, value) => sum + value, 0) / providedScores.length)
    : null;
  const hasBlocker = findings.some((item) => item.severity === "blocker");
  const hasMajor = findings.some((item) => item.severity === "major");
  const actualReview = Boolean(imageInfo?.imagePath && (providedScores.length || findings.length || review.confirmedPass !== undefined));
  const confirmedPass = review.confirmedPass === true && !hasBlocker;
  const canDraft = actualReview && !hasBlocker && (overallScore === null || overallScore >= Number(config.thresholds?.visualDraft || 72));
  const canFinal = actualReview && confirmedPass && !hasMajor && (overallScore === null || overallScore >= Number(config.thresholds?.visualFinal || 86));
  const repairPlan = findings.map((item) => {
    const structural = ["identity", "anatomy", "hands", "propGeometry", "sceneSpace", "continuity"].includes(item.dimension);
    return {
      ...item,
      route: item.localized && !structural ? "codex_native_image_edit_or_photoshop" : "regenerate_from_prompt_v2",
      invariant: "只修改标注问题；角色身份、单一服装、场景、镜头、其他正确区域保持不变。"
    };
  });
  return {
    standard: "creator-visual-qa-v2",
    createdAt: nowIso(),
    imagePath: imageInfo?.imagePath || "",
    actualImageReviewed: actualReview,
    reviewer: compact(review.reviewer || (actualReview ? "codex-or-human" : "not-reviewed")),
    promptStandard: promptSpec?.standard || "",
    promptCompleteness: promptSpec?.completeness || null,
    scores,
    overallScore,
    findings,
    repairPlan,
    gate: {
      status: !imageInfo?.imagePath
        ? "image_required"
        : !actualReview
          ? "codex_visual_review_required"
          : canFinal
            ? "approved_final"
            : canDraft
              ? "draft_only_repair_required"
              : "blocked_repair_or_regenerate",
      canEnterImage2Iteration: Boolean(imageInfo?.imagePath),
      canEnterSeedanceDraft: canDraft,
      canEnterSeedanceFinal: canFinal,
      blockers: [
        ...(!actualReview && imageInfo?.imagePath ? ["尚未由 Codex/人工打开真实图片并提交结构化视觉复核。"] : []),
        ...findings.filter((item) => item.severity === "blocker").map((item) => `${item.dimension}: ${item.issue}`),
        ...(overallScore !== null && overallScore < Number(config.thresholds?.visualDraft || 72) ? [`综合视觉评分 ${overallScore} 低于草稿门槛。`] : [])
      ]
    },
    automaticRepair: {
      allowed: repairPlan.length > 0 && Number(input.repairRound || 0) < Number(config.thresholds?.maxAutomaticRepairRounds || 2),
      currentRound: Number(input.repairRound || 0),
      maxRounds: Number(config.thresholds?.maxAutomaticRepairRounds || 2),
      rule: "局部问题最多自动修复两轮；结构性错误重生，超过次数转人工或 Photoshop。"
    },
    diagnostics: getVisualQaV2Diagnostics()
  };
}
