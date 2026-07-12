import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, "config", "default.json"), "utf8"));
const sourceDatabase = path.resolve(projectRoot, defaultConfig.databasePath);
const sourceRoot = defaultConfig.sourceRoot;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runRoot = path.resolve(process.env.XINRUI_E2E_ROOT || path.join(projectRoot, "output", "maintenance", "pipeline-e2e", stamp));
const isolatedOutputRoot = path.join(runRoot, "workbench-output");
const isolatedDatabase = path.join(runRoot, "data", "xinrui-pipeline-e2e.sqlite");
const workbenchPort = Number(process.env.XINRUI_E2E_PORT || 18987);
const mockPort = Number(process.env.XINRUI_E2E_MOCK_PORT || 18988);
const workbenchBase = `http://127.0.0.1:${workbenchPort}`;
const mockBase = `http://127.0.0.1:${mockPort}/v1`;
const adminToken = "xinrui-e2e-admin";
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nQAAAABJRU5ErkJggg==";
const steps = [];
const artifacts = {};

fs.mkdirSync(path.dirname(isolatedDatabase), { recursive: true });
fs.mkdirSync(isolatedOutputRoot, { recursive: true });

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function createDatabaseSnapshot() {
  if (!fs.existsSync(sourceDatabase)) throw new Error(`source database not found: ${sourceDatabase}`);
  if (fs.existsSync(isolatedDatabase)) fs.rmSync(isolatedDatabase, { force: true });
  const db = new DatabaseSync(sourceDatabase);
  try {
    db.exec(`VACUUM INTO ${sqlString(isolatedDatabase)}`);
  } finally {
    db.close();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sendJson(res, status, value) {
  const buffer = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": buffer.length });
  res.end(buffer);
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function mockStoryboardShots(count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    shot_index: index + 1,
    scene_text: `E2E 镜头 ${index + 1}：林荫清完成连续调度动作。`,
    camera: `${index % 2 === 0 ? "35mm 中景" : "50mm 近景"}，稳定推进`,
    composition: "主体、视线、出入口和行动方向清楚，遵守 180 度轴线。",
    character_action: `林荫清完成第 ${index + 1} 个可见动作，并承接前后镜头。`,
    storyboard_description: `验证镜头 ${index + 1} 的动作、构图和连续性。`,
    transition_note: "保持角色身份、服装、道具位置、视线与屏幕方向连续。",
    visual_prompt: `林荫清 E2E 连续分镜 ${index + 1}，新锐纪元半写实动画。`,
    negative_prompt: "身份漂移，服装混搭，错误手部，越轴，水印，乱码",
    characters: ["林荫清"],
    evidence_refs: []
  }));
}

async function startMockServer() {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const raw = await readRequestBody(req);
    const contentType = String(req.headers["content-type"] || "");
    let body = null;
    if (contentType.includes("application/json") && raw.length) body = JSON.parse(raw.toString("utf8"));
    calls.push({ method: req.method, url: req.url, contentType, bytes: raw.length });

    if (req.url === "/v1/responses") {
      const input = String(body?.input || "");
      const instructions = String(body?.instructions || "");
      if (input.includes("输出必须是 JSON 数组")) {
        sendJson(res, 200, { output_text: JSON.stringify(mockStoryboardShots(5)) });
        return;
      }
      if (instructions.includes("只输出 JSON") || input.includes("proposal_title")) {
        sendJson(res, 200, {
          output_text: JSON.stringify({
            proposal_title: "林荫清 E2E 设定校准提案",
            rationale: "仅用于隔离数据库写入与应用链路核验。",
            proposed_summary: "林小队队长，保持既有正史身份；本次仅增加 E2E 核验标记。",
            proposed_details: { e2eVerified: true, reviewStatus: "needs_human_review" }
          })
        });
        return;
      }
      sendJson(res, 200, { output_text: "E2E 大模型增强结果：保持正史边界、角色一致性和可执行镜头语言。" });
      return;
    }

    if (req.url === "/v1/chat/completions") {
      sendJson(res, 200, { choices: [{ message: { role: "assistant", content: "E2E Chat Completions fallback." } }] });
      return;
    }

    if (req.url === "/v1/images/generations" || req.url === "/v1/images/edits") {
      sendJson(res, 200, { data: [{ b64_json: onePixelPng }] });
      return;
    }

    sendJson(res, 404, { error: { message: `mock route not found: ${req.url}` } });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(mockPort, "127.0.0.1", () => resolve({ server, calls }));
  });
}

async function waitForServer(url, child, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`isolated workbench exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function api(pathname, { method = "GET", body, headers = {}, expected = [200] } = {}) {
  const started = Date.now();
  const response = await fetch(`${workbenchBase}${pathname}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  if (!expected.includes(response.status)) {
    throw new Error(`${method} ${pathname} -> ${response.status}: ${raw.slice(0, 800)}`);
  }
  return {
    status: response.status,
    contentType,
    bytes: Buffer.byteLength(raw),
    latencyMs: Date.now() - started,
    raw,
    json: contentType.includes("json") && raw ? JSON.parse(raw) : null
  };
}

async function step(name, action) {
  const started = Date.now();
  try {
    const value = await action();
    steps.push({ name, ok: true, latencyMs: Date.now() - started, detail: value?.detail || null });
    return value;
  } catch (error) {
    steps.push({ name, ok: false, latencyMs: Date.now() - started, error: error.message });
    throw error;
  }
}

createDatabaseSnapshot();
const { server: mockServer, calls: mockCalls } = await startMockServer();
const serverLogs = [];
const child = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(workbenchPort),
    ADMIN_TOKEN: adminToken,
    XINRUI_TEST_MODE: "1",
    XINRUI_DATABASE_PATH: isolatedDatabase,
    XINRUI_OUTPUT_ROOT: isolatedOutputRoot,
    XINRUI_SOURCE_ROOT: sourceRoot,
    LLM_PROVIDER: "openai",
    LLM_API_MODE: "auto",
    LLM_BASE_URL: mockBase,
    LLM_MODEL: "gpt-e2e-model",
    LLM_API_KEY: "e2e-key",
    IMAGE_PROVIDER: "openai",
    IMAGE_BASE_URL: mockBase,
    IMAGE_MODEL: "gpt-image-2",
    IMAGE_API_KEY: "e2e-key",
    COMFYUI_ENABLED: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
child.stdout.on("data", (chunk) => serverLogs.push(chunk.toString("utf8")));
child.stderr.on("data", (chunk) => serverLogs.push(chunk.toString("utf8")));

let reportError = null;
let projectSlug = "";
try {
  await waitForServer(`${workbenchBase}/api/config`, child);

  const config = await step("runtime-isolation", async () => {
    const result = await api("/api/config");
    assert(result.json?.testMode === true, "testMode was not enabled");
    assert(path.resolve(result.json?.databasePath) === path.resolve(isolatedDatabase), "database isolation failed");
    assert(path.resolve(result.json?.outputRoot) === path.resolve(isolatedOutputRoot), "output isolation failed");
    return { detail: { databasePath: result.json.databasePath, outputRoot: result.json.outputRoot } };
  });
  artifacts.config = config.detail;

  await step("system-health", async () => {
    const result = await api("/api/system/health");
    assert(result.json?.readiness?.coreReady === true, "isolated core health was not ready");
    assert(result.json?.paths?.testMode === true, "system health did not expose test isolation");
    assert(result.json?.readiness?.llmReady === true, "mock LLM was not reported ready");
    assert(result.json?.readiness?.paidImageReady === true, "mock image backend was not reported ready");
    return {
      detail: {
        status: result.json.status,
        database: result.json.database?.quickCheck,
        plugins: result.json.creativePlugins
      }
    };
  });

  await step("system-pipeline-report-empty", async () => {
    const result = await api("/api/system/pipeline-report", { expected: [404] });
    assert(result.json?.error === "full pipeline report not found", "unexpected empty pipeline report response");
    return { detail: { status: result.status } };
  });

  await step("sync-auth-boundary", async () => {
    const result = await api("/api/sync", { method: "POST", body: {}, expected: [401] });
    return { detail: { status: result.status } };
  });

  await step("isolated-database-sync", async () => {
    const result = await api("/api/sync", {
      method: "POST",
      body: {},
      headers: { "X-Admin-Token": adminToken }
    });
    assert(result.json?.stats?.errors === 0, "isolated sync reported errors");
    return { detail: { scannedFiles: result.json?.stats?.scanned, errors: result.json?.stats?.errors } };
  });

  await step("visual-index-refresh", async () => {
    const result = await api("/api/visual-assets/refresh", { method: "POST", body: {} });
    return { detail: result.json };
  });

  const visualAssets = await step("identity-first-visual-search", async () => {
    const result = await api(`/api/visual-assets?q=${encodeURIComponent("林荫清")}&role=identity_reference&limit=12`);
    const items = result.json?.items || [];
    const primary = items.filter((item) => ["character_card", "character_turnaround"].includes(item.visualKind || item.visual_kind));
    assert(primary.length > 0, "no primary Lin Yinqing identity anchor found");
    return { items, primary, detail: { total: items.length, primary: primary.length } };
  });
  const confirmedFileIds = visualAssets.primary.slice(0, 2).map((item) => item.fileId || item.file_id).filter(Boolean);
  assert(confirmedFileIds.length > 0, "identity anchor file IDs missing");
  artifacts.confirmedIdentityFileIds = confirmedFileIds;

  const projectTitle = `E2E 全管线核验 ${stamp}`;
  projectSlug = `e2e-pipeline-${stamp.toLowerCase()}`;
  const script = "雨夜，指挥中心的玻璃映出城市灯火。林荫清先听见备用电源切换的低鸣，随后抬眼确认屏幕上的撤离路线。她没有立刻下令，而是把终端转向队员，等待每个人看清风险。警报声再次逼近，她收回手，选择缩短行动窗口，并用一个明确手势让小队依次离开。门合上前，她最后确认无人掉队。";
  const common = {
    title: projectTitle,
    topic: projectTitle,
    slug: projectSlug,
    projectSlug,
    intent: "验证从剧本、视觉锁、故事板、图像、QA、后期到宣发和打包的完整管线。",
    prompt: "林荫清在指挥中心确认撤离路线，保持本地角色身份和单一服装设计一致。",
    script,
    text: script,
    characters: ["林荫清"],
    durationSec: 15,
    targetDurationSec: 15,
    shotCount: 5,
    targetModel: "Seedance 2.0",
    style: "新锐纪元半写实动画，电影感，克制真实",
    confirmedReferenceFileIds: confirmedFileIds,
    confirmedVisualReferences: true,
    identityReviewStatus: "confirmed",
    useLlm: true,
    limit: 8
  };

  const projectCreate = await step("project-create", async () => {
    const result = await api("/api/projects/create", { method: "POST", body: common });
    const project = result.json?.project;
    assert(project?.slug === projectSlug, "project slug mismatch");
    assert(fs.existsSync(result.json?.files?.projectJson), "project.json missing");
    assert(fs.existsSync(result.json?.files?.initialScript), "initial script was not archived");
    assert(path.resolve(project.projectPath).startsWith(path.resolve(isolatedOutputRoot)), "project escaped isolated output root");
    return { result: result.json, detail: { projectPath: project.projectPath, initialScript: result.json.files.initialScript } };
  });
  artifacts.projectPath = projectCreate.result.project.projectPath;

  await step("dramaturgy-four-layer-review", async () => {
    const result = await api("/api/dramaturgy/review", { method: "POST", body: common });
    assert(result.json?.review, "dramaturgy review missing");
    return { detail: { standard: result.json.review.standard || "review" } };
  });

  await step("literature-expansion", async () => {
    const result = await api("/api/literature/expand", { method: "POST", body: { ...common, mode: "calibrate", tone: "克制、具体、有动作" } });
    assert(result.json, "literature expansion missing");
    return { detail: { standard: result.json.standard, llmUsed: result.json.llmUsed } };
  });

  await step("asset-inventory", async () => {
    const result = await api("/api/assets/inventory", { method: "POST", body: common });
    assert(result.json?.categories?.length >= 6, "asset categories incomplete");
    return { detail: result.json.summary };
  });

  const proposal = await step("setting-proposal-create", async () => {
    const result = await api("/api/settings/proposals", {
      method: "POST",
      body: { targetName: "林荫清", targetType: "character", intent: "E2E 隔离设定校准", useLlm: true, limit: 6 }
    });
    assert(result.json?.proposal?.id, "proposal ID missing");
    return { proposal: result.json.proposal, detail: { id: result.json.proposal.id, llmUsed: result.json.llmUsed } };
  });

  await step("setting-proposal-apply", async () => {
    const result = await api(`/api/settings/proposals/${proposal.proposal.id}/apply`, { method: "POST", body: {} });
    assert(result.json?.proposal?.status === "applied", "proposal was not applied in isolated DB");
    return { detail: { status: result.json.proposal.status } };
  });

  await step("prompt-refinement", async () => {
    const result = await api("/api/pipeline/prompt-refine", { method: "POST", body: common });
    assert(result.json?.visualLocks?.characterDesignLocks?.[0]?.status === "confirmed", "character identity/outfit lock was not confirmed");
    assert(result.json?.refinedPrompt?.image2Prompt, "image prompt missing");
    return { detail: { gate: result.json.image2ReadyGate, llmEnhancement: result.json.llmEnhancement?.used } };
  });

  await step("autonomous-pipeline-plan", async () => {
    const result = await api("/api/pipeline/auto-execute", { method: "POST", body: common });
    assert(result.json?.pipeline?.length > 0, "autonomous pipeline steps missing");
    return { detail: { stages: result.json.pipeline.length, costShotCount: result.json.costShotCount } };
  });

  const storyboard = await step("storyboard-generate-and-archive", async () => {
    const result = await api("/api/storyboards/generate", {
      method: "POST",
      body: {
        ...common,
        director: {
          targetModel: "Seedance 2.0",
          aspectRatio: "16:9",
          fps: 24,
          targetDurationSec: 15,
          autoShotPlanning: true,
          sceneContinuity: "统一指挥中心空间、雨夜光源和行动方向。",
          axisRule: "遵守 180 度轴线。"
        }
      }
    });
    assert(result.json?.project?.id, "storyboard project ID missing");
    assert(result.json?.project?.shots?.length === 5, "storyboard shot count mismatch");
    assert(result.json?.projectArchive?.status === "archived", "storyboard was not archived to production project");
    assert(fs.existsSync(result.json.projectArchive.files.projectJson), "storyboard project archive missing");
    return { result: result.json, detail: { id: result.json.project.id, shots: result.json.project.shots.length, archive: result.json.projectArchive.files } };
  });
  const storyboardId = storyboard.result.project.id;
  artifacts.storyboardId = storyboardId;
  artifacts.storyboardArchive = storyboard.result.projectArchive.files;

  await step("storyboard-derived-deliverables", async () => {
    const endpoints = [
      `/api/storyboards/${storyboardId}`,
      `/api/storyboards/${storyboardId}/prompt-pack`,
      `/api/storyboards/${storyboardId}/frames`,
      `/api/storyboards/${storyboardId}/frames/1.svg`,
      `/api/storyboards/${storyboardId}/illustrations`,
      `/api/storyboards/${storyboardId}/image2-plan`,
      `/api/storyboards/${storyboardId}/audit`,
      `/api/storyboards/${storyboardId}/board`
    ];
    const outputs = [];
    for (const endpoint of endpoints) {
      const result = await api(endpoint);
      assert(result.bytes > 0, `empty storyboard deliverable: ${endpoint}`);
      outputs.push({ endpoint, bytes: result.bytes, contentType: result.contentType });
    }
    return { detail: outputs };
  });

  const imageGeneration = await step("gpt-image-text-generation", async () => {
    const result = await api("/api/pipeline/image-generate", {
      method: "POST",
      body: { ...common, execute: true, allowDraft: true, quality: "low", size: "1024x1024" }
    });
    assert(result.json?.gate?.status === "generated_review_required", "text image generation did not complete");
    assert(fs.existsSync(result.json?.output?.outputPath), "text image output missing");
    assert(path.resolve(result.json.output.outputPath).startsWith(path.resolve(artifacts.projectPath)), "text image was not archived under project");
    return { result: result.json, detail: { outputPath: result.json.output.outputPath, outputDir: result.json.outputDir } };
  });
  artifacts.generatedImage = imageGeneration.result.output.outputPath;

  const referenceEdit = await step("gpt-image-reference-edit", async () => {
    const result = await api("/api/pipeline/reference-image-generate", {
      method: "POST",
      body: {
        ...common,
        fileId: confirmedFileIds[0],
        referenceFileId: confirmedFileIds[0],
        referenceMode: "identity_lock",
        imageProvider: "openai",
        execute: true,
        quality: "low",
        size: "1024x1024"
      }
    });
    assert(result.json?.gate?.status === "generated_review_required", "reference image edit did not complete");
    assert(fs.existsSync(result.json?.output?.outputPath), "reference edit output missing");
    assert(path.resolve(result.json.output.outputPath).startsWith(path.resolve(artifacts.projectPath)), "reference edit was not archived under project");
    return { detail: { outputPath: result.json.output.outputPath, referenceMode: result.json.referenceMode } };
  });
  artifacts.referenceEdit = referenceEdit.detail.outputPath;

  const visualCheck = await step("generated-image-visual-qa", async () => {
    const result = await api("/api/pipeline/visual-check", {
      method: "POST",
      body: {
        ...common,
        imagePath: artifacts.generatedImage,
        persistReport: true,
        reviewFindings: [],
        reviewStatus: "needs_review"
      }
    });
    assert(result.json?.reportFiles?.markdownPath && fs.existsSync(result.json.reportFiles.markdownPath), "visual QA markdown missing");
    assert(result.json?.reportFiles?.projectArchive, "project visual QA archive missing");
    return { detail: { decision: result.json.boardDecision, reportFiles: result.json.reportFiles } };
  });
  artifacts.visualQa = visualCheck.detail.reportFiles;

  await step("real-world-reference-pack", async () => {
    const result = await api("/api/references/real-world-pack", {
      method: "POST",
      body: { query: "QBZ-191 外观参考 E2E", focus: "weapon geometry", persist: true, writeFiles: true, slug: `e2e-qbz191-${stamp}` }
    });
    assert(result.json?.files?.referencePack || result.json?.files?.jsonPath || result.json?.outputDir, "real-world reference pack was not persisted");
    return { detail: { id: result.json.referenceId || result.json.id, files: result.json.files } };
  });

  const planningEndpoints = [
    ["research-plan", "/api/research/plan", common],
    ["reference-plan", "/api/references/plan", common],
    ["creative-plan", "/api/pipeline/creative-plan", common],
    ["workflow-plan", "/api/workflow/plan", common],
    ["creative-suite", "/api/pipeline/creative-suite", common],
    ["cost-estimate", "/api/pipeline/cost-estimate", { ...common, budgetCny: 100 }],
    ["rigging-plan", "/api/postproduction/rigging-plan", common],
    ["video-plan", "/api/postproduction/video-plan", common],
    ["video-review", "/api/postproduction/video-review", common],
    ["bilibili-publishing", "/api/publishing/bilibili", common],
    ["daily-story-brief", "/api/daily/story-brief", common]
  ];
  for (const [name, endpoint, body] of planningEndpoints) {
    await step(name, async () => {
      const result = await api(endpoint, { method: "POST", body });
      assert(result.json, `${name} returned no JSON`);
      return { detail: { standard: result.json.standard || Object.keys(result.json).slice(0, 3) } };
    });
  }

  const packageExport = await step("portable-package-export", async () => {
    const plan = await api("/api/package/portable-plan", { method: "POST", body: {} });
    assert(plan.json?.bundleId, "portable plan bundle ID missing");
    const result = await api("/api/package/export", {
      method: "POST",
      body: { includeSourceMaterial: false, includeOutputReferences: false, writeZip: true }
    });
    assert(result.json?.archivePath && fs.existsSync(result.json.archivePath), "portable ZIP missing");
    assert(path.resolve(result.json.archivePath).startsWith(path.resolve(isolatedOutputRoot)), "portable package escaped isolated output root");
    return { detail: { bundleId: result.json.bundleId, archivePath: result.json.archivePath, files: result.json.summary?.fileCount } };
  });
  artifacts.portablePackage = packageExport.detail.archivePath;

  await step("generated-output-preview-route", async () => {
    const result = await api(`/api/output-files?path=${encodeURIComponent(artifacts.generatedImage)}`);
    assert(result.contentType.startsWith("image/"), "output preview did not return image content");
    return { detail: { bytes: result.bytes, contentType: result.contentType } };
  });

  await step("project-status-final", async () => {
    const result = await api(`/api/projects/status/${encodeURIComponent(projectSlug)}`);
    const projectStatus = result.json?.project;
    assert(projectStatus, "project status payload missing");
    const stages = projectStatus.stages || [];
    const scriptStage = stages.find((item) => item.id === "script");
    const storyboardStage = stages.find((item) => item.id === "storyboard");
    assert(scriptStage && scriptStage.status !== "missing", "project script stage still missing after project creation");
    assert(storyboardStage && storyboardStage.status !== "missing", "project storyboard stage still missing after storyboard generation");
    return { detail: { progress: projectStatus.summary?.score, script: scriptStage.status, storyboard: storyboardStage.status, visualQa: projectStatus.visualQa } };
  });

  await step("database-integrity-live", async () => {
    const db = new DatabaseSync(isolatedDatabase);
    try {
      const quick = db.prepare("PRAGMA quick_check").get();
      const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
      const projects = db.prepare("SELECT COUNT(*) AS count FROM creative_projects").get();
      assert(Object.values(quick)[0] === "ok", "isolated database quick_check failed");
      assert(foreignKeys.length === 0, "isolated database foreign key issues detected");
      return { detail: { quickCheck: Object.values(quick)[0], foreignKeyIssues: foreignKeys.length, creativeProjects: projects.count } };
    } finally {
      db.close();
    }
  });
} catch (error) {
  reportError = error;
} finally {
  child.kill();
  await new Promise((resolve) => mockServer.close(resolve));
}

const failed = steps.filter((item) => !item.ok);
const report = {
  standard: "xinrui-full-pipeline-e2e-v1",
  createdAt: new Date().toISOString(),
  ok: !reportError && failed.length === 0,
  runRoot,
  isolatedDatabase,
  isolatedOutputRoot,
  workbenchBase,
  summary: {
    checked: steps.length,
    passed: steps.length - failed.length,
    failed: failed.length
  },
  projectSlug,
  artifacts,
  steps,
  mockCalls,
  error: reportError ? reportError.stack || reportError.message : null,
  serverLogs: serverLogs.join("").slice(-10000)
};
const reportPath = path.join(runRoot, "full-pipeline-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report.summary, ok: report.ok, reportPath, runRoot, error: reportError?.message || null }, null, 2));
if (!report.ok) process.exitCode = 1;
