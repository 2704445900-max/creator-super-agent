import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { getOutputRoot, getProjectRoot } from "./config.js";
import { getCloudLibraryStatus } from "./cloud_library.js";
import { getImageGenerationDiagnostics } from "./creative_pipeline.js";
import { getCreativePluginSuite } from "./creative_suite.js";
import { getLlmDiagnostics } from "./llm.js";
import { getPostproductionStatus } from "./postproduction.js";
import { nowIso } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();
const FULL_PIPELINE_SCRIPT = path.join(PROJECT_ROOT, "scripts", "full_pipeline_e2e.mjs");

function pipelineAuditRoot() {
  return path.join(getOutputRoot(), "maintenance", "pipeline-e2e");
}

const PIPELINE_STAGES = [
  { id: "canon", label: "资料库与正史证据", endpoints: ["/api/answer-card", "/api/search", "/api/visual-assets"] },
  { id: "dramaturgy", label: "剧本四层审查与文学拓展", endpoints: ["/api/dramaturgy/review", "/api/literature/expand"] },
  { id: "project", label: "项目建档与状态", endpoints: ["/api/projects/create", "/api/projects/status"] },
  { id: "assets", label: "美术资产与外部参考", endpoints: ["/api/assets/inventory", "/api/references/real-world-pack"] },
  { id: "storyboard", label: "导演故事板与连续分镜", endpoints: ["/api/storyboards/generate", "/api/storyboards/:id/board"] },
  { id: "image", label: "gpt-image 文生图与参考图编辑", endpoints: ["/api/pipeline/image-generate", "/api/pipeline/reference-image-generate"] },
  { id: "visual_qa", label: "视觉自检与项目归档", endpoints: ["/api/pipeline/visual-check"] },
  { id: "video", label: "Seedance、AE、PR 与动效", endpoints: ["/api/pipeline/cost-estimate", "/api/postproduction/video-plan"] },
  { id: "publishing", label: "B站宣发、日更与复盘", endpoints: ["/api/publishing/bilibili", "/api/daily/story-brief"] },
  { id: "portable", label: "迁移打包", endpoints: ["/api/package/portable-plan", "/api/package/export"] }
  ,{ id: "cloud_library", label: "GitHub private cloud library", endpoints: ["/api/cloud-library/status", "/api/cloud-library/sync"] }
];

function safeReadJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function latestFile(root, fileName) {
  if (!fs.existsSync(root)) return null;
  const candidates = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const filePath = path.join(root, entry.name, fileName);
      if (!fs.existsSync(filePath)) return null;
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .filter(Boolean)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.filePath || null;
}

export function getLatestFullPipelineReport() {
  const reportPath = latestFile(pipelineAuditRoot(), "full-pipeline-report.json");
  if (!reportPath) return null;
  const report = safeReadJson(reportPath, null);
  return report ? {
    reportPath,
    standard: report.standard,
    createdAt: report.createdAt,
    ok: Boolean(report.ok),
    summary: report.summary,
    projectSlug: report.projectSlug,
    runRoot: report.runRoot,
    artifacts: report.artifacts,
    failedSteps: (report.steps || []).filter((item) => !item.ok)
  } : null;
}

function databaseHealth(db) {
  const quickRow = db.prepare("PRAGMA quick_check").get();
  const quickCheck = quickRow ? Object.values(quickRow)[0] : "unknown";
  const foreignKeyIssues = db.prepare("PRAGMA foreign_key_check").all().length;
  const count = (table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  return {
    quickCheck,
    foreignKeyIssues,
    counts: {
      files: count("files"),
      documents: count("documents"),
      chunks: count("chunks"),
      entities: count("entities"),
      assets: count("assets"),
      assetProfiles: count("asset_profiles"),
      creativeProjects: count("creative_projects"),
      storyboardShots: count("storyboard_shots"),
      settingProposals: count("setting_proposals")
    },
    lastSync: db.prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1").get() || null
  };
}

function pathReadiness(config) {
  const outputRoot = getOutputRoot();
  let outputWritable = false;
  try {
    fs.mkdirSync(outputRoot, { recursive: true });
    fs.accessSync(outputRoot, fs.constants.W_OK);
    outputWritable = true;
  } catch {
    outputWritable = false;
  }
  return {
    sourceRoot: config.sourceRoot,
    sourceRootExists: fs.existsSync(config.sourceRoot),
    databasePath: config.databasePath,
    databaseExists: fs.existsSync(config.databasePath),
    outputRoot,
    outputWritable,
    testMode: Boolean(config.testMode)
  };
}

function pluginSummary(suite = {}) {
  const plugins = suite.plugins || [];
  return {
    total: plugins.length,
    installed: plugins.filter((item) => item.installed || item.status === "installed").length,
    items: plugins.map((item) => ({
      id: item.id || item.name,
      label: item.label || item.name,
      installed: Boolean(item.installed || item.status === "installed"),
      version: item.version || item.latestCacheVersion || ""
    }))
  };
}

export async function getSystemHealth(db, config) {
  const database = databaseHealth(db);
  const paths = pathReadiness(config);
  const llm = getLlmDiagnostics(config);
  const image = await getImageGenerationDiagnostics();
  const creativeSuite = getCreativePluginSuite();
  const postproduction = getPostproductionStatus();
  const latestPipeline = getLatestFullPipelineReport();
  const cloudLibrary = getCloudLibraryStatus();
  const coreReady = database.quickCheck === "ok"
    && database.foreignKeyIssues === 0
    && paths.sourceRootExists
    && paths.databaseExists
    && paths.outputWritable;
  const paidImageReady = Boolean(image.openai?.canGenerateText || image.comfyui?.canExecute);
  const warnings = [
    ...(!llm.enabled ? ["大模型未配置，深度改写与语义增强使用本地规则 fallback。"] : []),
    ...(!paidImageReady ? ["OpenAI Images 与 ComfyUI 当前均不可直接执行，工作台保持任务包模式。"] : []),
    ...(!latestPipeline?.ok ? ["还没有通过的隔离全管线 E2E 报告。"] : [])
  ];
  return {
    standard: "xinrui-system-health-v1",
    createdAt: nowIso(),
    status: coreReady ? (paidImageReady ? "ready" : "core_ready_external_backends_missing") : "degraded",
    readiness: {
      coreReady,
      localCreativePlanningReady: coreReady,
      llmReady: llm.enabled,
      paidImageReady,
      fullPipelineVerified: Boolean(latestPipeline?.ok)
    },
    paths,
    database,
    llm,
    image,
    creativePlugins: pluginSummary(creativeSuite),
    postproduction,
    cloudLibrary,
    pipelineStages: PIPELINE_STAGES,
    latestFullPipeline: latestPipeline,
    commands: {
      database: "npm run db:check",
      api: "npm run test:api",
      openaiCompatibility: "npm run test:openai-compat",
      fullPipeline: "npm run test:pipeline",
      all: "npm run test:all"
    },
    warnings
  };
}

export async function runFullPipelineCheck({ timeoutMs = 180000 } = {}) {
  if (!fs.existsSync(FULL_PIPELINE_SCRIPT)) throw new Error(`pipeline test script not found: ${FULL_PIPELINE_SCRIPT}`);
  const startedAt = Date.now();
  const runRoot = path.join(
    pipelineAuditRoot(),
    new Date().toISOString().replace(/[:.]/g, "-")
  );
  const stdout = [];
  const stderr = [];
  const child = spawn(process.execPath, ["--no-warnings", FULL_PIPELINE_SCRIPT], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      XINRUI_E2E_ROOT: runRoot
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => stdout.push(chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString("utf8")));
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  clearTimeout(timer);
  const latest = getLatestFullPipelineReport();
  return {
    standard: "xinrui-full-pipeline-check-run-v1",
    createdAt: nowIso(),
    ok: !timedOut && exitCode === 0 && Boolean(latest?.ok),
    exitCode,
    timedOut,
    durationMs: Date.now() - startedAt,
    runRoot,
    latest,
    stdout: stdout.join("").slice(-8000),
    stderr: stderr.join("").slice(-8000)
  };
}
