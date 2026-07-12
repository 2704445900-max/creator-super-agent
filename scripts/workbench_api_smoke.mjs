import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.XINRUI_API_BASE || "http://127.0.0.1:8787").replace(/\/+$/, "");
const results = [];

const common = {
  topic: "林荫清工作台接口检测",
  title: "林荫清工作台接口检测",
  query: "林荫清",
  focus: "角色一致性、分镜与视觉 QA",
  prompt: "林荫清在雨夜城市天台观察远方，保持本地角色身份与单一服装设计一致。",
  script: "雨声压过城市噪音。林荫清走到天台边缘，停下观察远方灯火，随后回头示意队员跟进。",
  text: "雨声压过城市噪音。林荫清走到天台边缘，停下观察远方灯火。",
  intent: "检查全流程接口是否能返回结构化方案",
  characters: ["林荫清"],
  durationSec: 15,
  targetDurationSec: 15,
  shotCount: 5,
  targetModel: "Seedance 2.0",
  style: "新锐纪元半写实动画，电影感，克制真实",
  useLlm: false,
  execute: false,
  persistReport: false,
  limit: 4
};

async function check(name, pathname, options = {}, expectedStatuses = [200]) {
  const started = Date.now();
  let status = 0;
  let contentType = "";
  let body = "";
  try {
    const response = await fetch(`${baseUrl}${pathname}`, options);
    status = response.status;
    contentType = response.headers.get("content-type") || "";
    body = await response.text();
    const ok = expectedStatuses.includes(status);
    const item = {
      name,
      method: options.method || "GET",
      pathname,
      status,
      ok,
      latencyMs: Date.now() - started,
      contentType,
      bytes: Buffer.byteLength(body)
    };
    if (!ok) item.error = body.slice(0, 500);
    results.push(item);
    return { response, body, json: contentType.includes("json") && body ? JSON.parse(body) : null };
  } catch (error) {
    results.push({
      name,
      method: options.method || "GET",
      pathname,
      status,
      ok: false,
      latencyMs: Date.now() - started,
      error: error.message
    });
    return { response: null, body: "", json: null };
  }
}

function post(body) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

await check("workbench-ui", "/");
await check("cors-preflight", "/api/config", { method: "OPTIONS" }, [204]);
await check("config", "/api/config");
await check("system-health", "/api/system/health");
await check("system-pipeline-report", "/api/system/pipeline-report", {}, [200, 404]);
await check("site-data", "/api/site-data");
await check("llm-diagnostics", "/api/llm/diagnostics");
await check("llm-test-safe", "/api/llm/test", post({ prompt: "连接检测" }));
await check("stats", "/api/stats");
await check("entities", "/api/entities?type=character&limit=4");
await check("search-precise", "/api/search?q=%E6%9E%97%E8%8D%AB%E6%B8%85&mode=precise&limit=4");
await check("answer-card", "/api/answer-card?q=%E6%9E%97%E8%8D%AB%E6%B8%85&mode=precise&limit=4");
await check("ask-local-fallback", "/api/ask", post({ question: "当前项目主角是谁？", limit: 4 }));
await check("literature-expand", "/api/literature/expand", post({ ...common, mode: "calibrate", tone: "克制、具体" }));
await check("dramaturgy-rules", "/api/dramaturgy/rules");
await check("dramaturgy-rules-markdown", "/api/dramaturgy/rules?format=markdown");
await check("dramaturgy-review", "/api/dramaturgy/review", post(common));
await check("references-catalog", "/api/references/catalog");
await check("research-catalog", "/api/research/catalog");
await check("research-plan", "/api/research/plan", post(common));
await check("references-plan", "/api/references/plan", post(common));
await check("real-world-pack-dry", "/api/references/real-world-pack", post({ ...common, query: "虚构测试道具", persist: false, writeFiles: false }));
const projects = await check("projects-status", "/api/projects/status");
await check("asset-inventory", "/api/assets/inventory", post(common));
await check("prompt-refine-basic", "/api/prompts/refine", post(common));
await check("cost-profiles", "/api/pipeline/cost-profiles");
await check("image-diagnostics", "/api/pipeline/image-generation/diagnostics");
await check("pipeline-prompt-refine", "/api/pipeline/prompt-refine", post(common));
await check("pipeline-auto-execute", "/api/pipeline/auto-execute", post(common));
await check("pipeline-visual-check-plan", "/api/pipeline/visual-check", post(common));
await check("pipeline-reference-task-blocked", "/api/pipeline/reference-image-generate", post({ ...common, referenceImagePath: "" }));
await check("pipeline-creative-plan", "/api/pipeline/creative-plan", post(common));
await check("pipeline-cost-estimate", "/api/pipeline/cost-estimate", post({ ...common, budgetCny: 100 }));
await check("creative-suite-status", "/api/plugins/creative-suite");
await check("pipeline-creative-suite", "/api/pipeline/creative-suite", post(common));
await check("workflow-plan", "/api/workflow/plan", post(common));
await check("publishing-bilibili", "/api/publishing/bilibili", post(common));
await check("daily-story-brief", "/api/daily/story-brief", post(common));
await check("postproduction-status", "/api/postproduction/status");
await check("rigging-plan", "/api/postproduction/rigging-plan", post(common));
await check("video-plan", "/api/postproduction/video-plan", post(common));
await check("video-review", "/api/postproduction/video-review", post(common));
await check("portable-plan", "/api/package/portable-plan", post({}));
const visualAssets = await check("visual-assets", "/api/visual-assets?q=%E6%9E%97%E8%8D%AB%E6%B8%85&role=identity_reference&limit=4");
const proposals = await check("setting-proposals", "/api/settings/proposals?limit=4");
const storyboards = await check("storyboards", "/api/storyboards?limit=4");

const projectItems = projects.json?.items || projects.json?.projects || [];
const firstProjectSlug = projectItems[0]?.slug || projectItems[0]?.projectSlug;
if (firstProjectSlug) {
  await check("project-status-detail", `/api/projects/status/${encodeURIComponent(firstProjectSlug)}`);
}

const proposalId = proposals.json?.items?.[0]?.id;
if (proposalId) await check("setting-proposal-detail", `/api/settings/proposals/${proposalId}`);

const storyboardId = storyboards.json?.items?.[0]?.id;
if (storyboardId) {
  await check("storyboard-detail", `/api/storyboards/${storyboardId}`);
  await check("storyboard-prompt-pack", `/api/storyboards/${storyboardId}/prompt-pack`);
  await check("storyboard-frames", `/api/storyboards/${storyboardId}/frames`);
  await check("storyboard-illustrations", `/api/storyboards/${storyboardId}/illustrations`);
  await check("storyboard-image2-plan", `/api/storyboards/${storyboardId}/image2-plan`);
  await check("storyboard-audit", `/api/storyboards/${storyboardId}/audit`);
  await check("storyboard-board", `/api/storyboards/${storyboardId}/board`);
}

const firstVisualFileId = visualAssets.json?.items?.find((item) => item.file_id || item.fileId)?.file_id
  || visualAssets.json?.items?.find((item) => item.file_id || item.fileId)?.fileId;
if (firstVisualFileId) await check("database-file", `/api/files/${firstVisualFileId}`);

await check("output-file-boundary", `/api/output-files?path=${encodeURIComponent(path.join(projectRoot, "package.json"))}`, {}, [403]);
await check("local-file-boundary", `/api/local-files?path=${encodeURIComponent(path.join(projectRoot, "package.json"))}`, {}, [403]);

const skipped = [
  { endpoint: "POST /api/projects/create", reason: "会创建正式项目目录" },
  { endpoint: "POST /api/package/export", reason: "会生成完整迁移包" },
  { endpoint: "POST /api/sync", reason: "会执行全库同步，本轮已单独完成" },
  { endpoint: "POST /api/visual-assets/refresh", reason: "会改写视觉画像，本轮数据库维护已验证" },
  { endpoint: "POST /api/settings/proposals", reason: "会写入设定提案" },
  { endpoint: "POST /api/settings/proposals/:id/apply", reason: "会改变提案状态" },
  { endpoint: "POST /api/storyboards/generate", reason: "会写入故事板项目" },
  { endpoint: "POST /api/pipeline/image-generate", reason: "会创建图像任务包，由隔离 E2E 和 OpenAI 兼容测试覆盖" },
  { endpoint: "POST /api/system/pipeline-check", reason: "由 npm run test:pipeline 独立覆盖，避免冒烟测试递归执行" }
];

const failed = results.filter((item) => !item.ok);
const report = {
  standard: "xinrui-workbench-api-smoke-v1",
  createdAt: new Date().toISOString(),
  baseUrl,
  ok: failed.length === 0,
  summary: {
    checked: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    skippedMutating: skipped.length
  },
  failed,
  skipped,
  results
};

const reportDir = path.join(projectRoot, "output", "maintenance");
fs.mkdirSync(reportDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = path.join(reportDir, `workbench-api-smoke-${stamp}.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ ...report.summary, ok: report.ok, reportPath, failed }, null, 2));
if (!report.ok) process.exitCode = 1;
