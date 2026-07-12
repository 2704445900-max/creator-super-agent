import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { getOutputRoot, loadConfig, getProjectRoot } from "./config.js";
import { initSchema, openDatabase } from "./db.js";
import { createAgentRuntime } from "./agent_runtime.js";
import {
  createWorkspace,
  listAccountProfiles,
  listContentPacks,
  listWorkspaces,
  resolveWorkspaceContext,
  syncContentPacks,
  upsertAccountProfile
} from "./content_packs.js";
import {
  createGenericAssetInventory,
  createGenericExecutionPlan,
  createGenericPortablePlan,
  createGenericProductionProject,
  createGenericPublishingPlan,
  createGenericReferencePlan,
  createGenericResearchBrief
} from "./generic_pipeline.js";
import { askLlm, completeWithLlm, getLlmDiagnostics, testLlmConnection } from "./llm.js";
import {
  analyzeScriptWithDramaturgy,
  dramaturgyReviewToMarkdown,
  dramaturgyRuleLibraryToMarkdown,
  getDramaturgyRuleLibrary
} from "./dramaturgy_rules.js";
import { createLiteratureExpansion } from "./literature.js";
import {
  createAssetInventory,
  createProductionProject,
  createPromptRefinementPlan
} from "./production.js";
import { createAnswerCard } from "./answer_card.js";
import {
  createAutonomousCreativeExecutionPlan,
  createDetailedCreativePlan,
  createImageGenerationTask,
  createReferenceImageGenerationTask,
  createStoryboardPromptOptimization,
  createStoryboardVisualInspectionPlan,
  estimateVideoGenerationCost,
  getImageGenerationDiagnostics,
  getCostProfiles
} from "./creative_pipeline.js";
import {
  createCreativeSuitePlan,
  getCreativePluginSuite
} from "./creative_suite.js";
import {
  createRiggingWorkflowPlan,
  createVideoProductionPlan,
  createVideoReviewPlan,
  getPostproductionStatus
} from "./postproduction.js";
import { createPortablePackage, createPortablePackagePlan } from "./portable_package.js";
import { getProjectStatus, listProjectStatuses } from "./project_status.js";
import { createRealWorldReferencePack, createReferencePlan, getReferenceCatalog } from "./references.js";
import { createResearchPlan, getResearchCatalog } from "./research.js";
import { searchDatabase } from "./search.js";
import { seedDatabase } from "./seed.js";
import { buildSiteData } from "./site_data.js";
import { buildStoryboardAuditPack, storyboardAuditPackToMarkdown } from "./storyboard_audit.js";
import { buildStoryboardBoard, storyboardBoardToMarkdown } from "./storyboard_board.js";
import {
  buildConcreteStoryboardFrames,
  concreteStoryboardFrameToSvg,
  concreteStoryboardFramesToMarkdown
} from "./storyboard_frames.js";
import {
  buildKeySceneIllustrations,
  keySceneIllustrationsToMarkdown
} from "./storyboard_illustrations.js";
import {
  buildImage2StoryboardPlan,
  image2StoryboardPlanToMarkdown
} from "./storyboard_image2.js";
import {
  applySettingProposal,
  createSettingProposal,
  getSettingProposal,
  listSettingProposals
} from "./settings.js";
import { getStats } from "./stats.js";
import {
  getLatestFullPipelineReport,
  getSystemHealth,
  runFullPipelineCheck
} from "./system_health.js";
import {
  buildStoryboardPromptPack,
  generateStoryboard,
  getStoryboardProject,
  listStoryboardProjects,
  storyboardPromptPackToMarkdown
} from "./storyboard.js";
import { syncSource } from "./sync.js";
import {
  getVisualReferencesForProject,
  refreshAssetProfiles,
  searchVisualAssets
} from "./visual.js";
import {
  createBilibiliPublishingPlan,
  createDailyStoryBrief,
  createWorkflowPlan
} from "./workflow.js";

const config = loadConfig();
const db = openDatabase(config.databasePath);
initSchema(db);
if (config.edition !== "generic") {
  seedDatabase(db);
  refreshAssetProfiles(db);
}
syncContentPacks(db, { edition: config.edition });

const projectRoot = getProjectRoot();
const publicRoot = path.join(projectRoot, "public");
const showcaseRoot = path.join(projectRoot, "Claude本地会话", "新锐纪元企划-展示站");
const host = process.env.HOST || config.server?.host || "0.0.0.0";
const port = Number(process.env.PORT || config.server?.port || 8787);
let syncInProgress = false;
let pipelineCheckInProgress = false;
let agentRuntime = null;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function sendText(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(body);
}

function sendMarkdown(res, status, body, fileName) {
  res.writeHead(status, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendSvg(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4"
  };
  return map[ext] || "application/octet-stream";
}

function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const decoded = decodeURIComponent(requested);
  const absPath = path.resolve(publicRoot, `.${decoded}`);
  if (!absPath.startsWith(publicRoot)) {
    sendText(res, 403, "Forbidden");
    return true;
  }
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return false;
  }
  res.writeHead(200, {
    "Content-Type": getMimeType(absPath),
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(absPath).pipe(res);
  return true;
}

function serveShowcase(req, res, url) {
  if (!fs.existsSync(showcaseRoot)) return false;
  const subPath = url.pathname.slice("/site".length) || "/";
  const requested = subPath === "/" ? "/index.html" : subPath;
  const decoded = decodeURIComponent(requested);
  const absPath = path.resolve(showcaseRoot, `.${decoded}`);
  if (!absPath.startsWith(showcaseRoot)) {
    sendText(res, 403, "Forbidden");
    return true;
  }
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return false;
  }
  res.writeHead(200, {
    "Content-Type": getMimeType(absPath),
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(absPath).pipe(res);
  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text.trim()) return {};
  const parsed = JSON.parse(text);
  if (config.edition !== "generic") return parsed;
  return {
    ...parsed,
    workspaceMode: "generic",
    workspaceId: parsed.workspaceId || "creator-default",
    contentPackId: "creator-generic",
    disableCanonSearch: true
  };
}

function requireAdmin(req) {
  const token = process.env.ADMIN_TOKEN || "";
  if (!token) return true;
  return req.headers["x-admin-token"] === token;
}

function serveFileById(res, id) {
  const row = db.prepare("SELECT abs_path, media_type FROM files WHERE id = ? AND status = 'active'").get(id);
  if (!row || !fs.existsSync(row.abs_path)) {
    sendText(res, 404, "File not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": getMimeType(row.abs_path),
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=600"
  });
  fs.createReadStream(row.abs_path).pipe(res);
}

function serveLocalSourceFile(res, filePath) {
  const sourceRoot = path.resolve(config.sourceRoot);
  const absPath = path.resolve(String(filePath || ""));
  const relative = path.relative(sourceRoot, absPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    sendText(res, 404, "File not found");
    return;
  }
  const mimeType = getMimeType(absPath);
  if (!mimeType.startsWith("image/")) {
    sendText(res, 415, "Only image files are supported");
    return;
  }
  res.writeHead(200, {
    "Content-Type": mimeType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=600"
  });
  fs.createReadStream(absPath).pipe(res);
}

function serveLocalOutputFile(res, filePath) {
  const outputRoot = path.resolve(getOutputRoot());
  const absPath = path.resolve(String(filePath || ""));
  const relative = path.relative(outputRoot, absPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    sendText(res, 404, "File not found");
    return;
  }
  const mimeType = getMimeType(absPath);
  if (!mimeType.startsWith("image/")) {
    sendText(res, 415, "Only image files are supported");
    return;
  }
  res.writeHead(200, {
    "Content-Type": mimeType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache"
  });
  fs.createReadStream(absPath).pipe(res);
}

function tryParseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value || "").trim());
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    const match = String(value || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function buildPromptRefineLlmPrompt(localPlan, body = {}) {
  const generic = body.workspaceMode === "generic" || body.contentPackId === "creator-generic";
  return [
    generic
      ? "你是通用影视动画创作智能体的提示词总监。请只基于当前项目资料，二次优化本地生成的 gpt-image-2 / Seedance 分镜提示词。"
      : "你是新锐纪元 IP 工作台的提示词总监。请在不改写正史的前提下，二次优化本地生成的 gpt-image-2 / Seedance 分镜提示词。",
    generic
      ? "必须遵守：不得调用或暗示任何新锐纪元私有资料；外部资料只作为参考；不要删除角色锁、道具锁、场景锁、180度轴线、视觉 QA 和成本闸门。"
      : "必须遵守：本地资料库为正史；新设定只能标注为合理推断或待确认；不要删除角色锁、道具锁、场景锁、180度轴线、视觉 QA 和成本闸门。",
    "请返回严格 JSON，不要 Markdown。字段：image2Prompt, negativePrompt, directorNotes, continuityNotes, visualQaFocus, revisionReasons。",
    "",
    "本地计划：",
    JSON.stringify({
      standard: localPlan.standard,
      characters: localPlan.characters,
      canonEvidence: localPlan.canonEvidence,
      visualLocks: localPlan.visualLocks,
      knowledgeNeeds: localPlan.knowledgeNeeds,
      localPrompt: localPlan.refinedPrompt,
      image2ReadyGate: localPlan.image2ReadyGate,
      selfCheck: localPlan.selfCheck
    }, null, 2)
  ].join("\n");
}

async function enhancePromptPlanWithLlmIfAvailable(body, localPlan) {
  if (body.useLlm === false) {
    return {
      ...localPlan,
      llmEnhancement: {
        used: false,
        skipped: true,
        reason: "request disabled LLM enhancement"
      }
    };
  }
  const generic = body.workspaceMode === "generic" || body.contentPackId === "creator-generic";
  const llm = await completeWithLlm(config, buildPromptRefineLlmPrompt(localPlan, body), {
    temperature: 0.25,
    system: generic
      ? "你是严谨的影视动画提示词编辑。只基于当前项目资料优化提示词，不得引入其他私有 IP 信息。"
      : "你是严谨的新锐纪元 IP 提示词编辑。只基于给定资料优化提示词，不编造正史。"
  });
  if (!llm.enabled) {
    return {
      ...localPlan,
      llmEnhancement: {
        used: false,
        skipped: true,
        reason: "LLM not configured"
      }
    };
  }
  if (llm.error) {
    return {
      ...localPlan,
      llmEnhancement: {
        used: false,
        skipped: false,
        provider: llm.provider,
        model: llm.model,
        error: llm.error
      }
    };
  }
  const parsed = tryParseJsonObject(llm.answer);
  if (!parsed) {
    return {
      ...localPlan,
      llmEnhancement: {
        used: false,
        skipped: false,
        provider: llm.provider,
        model: llm.model,
        error: "模型返回内容不是可解析 JSON。",
        rawAnswer: llm.answer
      }
    };
  }
  return {
    ...localPlan,
    refinedPrompt: {
      ...localPlan.refinedPrompt,
      image2Prompt: parsed.image2Prompt || localPlan.refinedPrompt?.image2Prompt,
      negativePrompt: parsed.negativePrompt || localPlan.refinedPrompt?.negativePrompt,
      llmDirectorNotes: parsed.directorNotes || [],
      llmContinuityNotes: parsed.continuityNotes || []
    },
    llmEnhancement: {
      used: true,
      provider: llm.provider,
      model: llm.model,
      visualQaFocus: parsed.visualQaFocus || [],
      revisionReasons: parsed.revisionReasons || [],
      rawAnswer: llm.answer
    }
  };
}

function isGenericAgentInput(input = {}) {
  return input.workspaceMode === "generic" || input.contentPackId === "creator-generic" || input.workspaceId === "creator-default";
}

function hasReferenceImageInput(input = {}) {
  return Boolean(
    input.referenceImagePath
    || input.referenceFileId
    || input.fileId
    || (Array.isArray(input.referenceImagePaths) && input.referenceImagePaths.length)
    || (Array.isArray(input.referenceFileIds) && input.referenceFileIds.length)
  );
}

function getAgentRuntime() {
  if (agentRuntime) return agentRuntime;
  agentRuntime = createAgentRuntime(db, {
    resolveWorkspace: (input) => resolveWorkspaceContext(db, input),
    tools: {
      plan: (input) => isGenericAgentInput(input)
        ? createGenericExecutionPlan(input)
        : createAutonomousCreativeExecutionPlan(db, input),
      project: (input) => isGenericAgentInput(input)
        ? createGenericProductionProject(input)
        : createProductionProject(db, input),
      dramaturgy: (input) => {
        const review = analyzeScriptWithDramaturgy(input);
        return isGenericAgentInput(input)
          ? { ...review, standard: "generic-dramaturgy-review-v1", sourcePriority: ["bundled-general-dramaturgy-rules"] }
          : review;
      },
      assets: (input) => isGenericAgentInput(input)
        ? createGenericAssetInventory(input)
        : createAssetInventory(db, input),
      research: (input) => isGenericAgentInput(input)
        ? {
          standard: "generic-agent-research-brief-v1",
          browserRequired: true,
          researchPlan: createGenericResearchBrief(input),
          referencePlan: createGenericReferencePlan(input),
          rule: "项目资料不足时优先使用浏览器核验；外部事实与图片先进入待处理区。"
        }
        : {
          standard: "creator-agent-research-brief-v1",
          browserRequired: true,
          researchPlan: createResearchPlan({ query: input.query || input.topic || input.goal, focus: input.focus }),
          referencePlan: createReferencePlan({ query: input.query || input.topic || input.goal, focus: input.focus }),
          rule: "本地资料不足时优先使用浏览器核验；外部事实与图片先进入待处理区，不自动写入正史。"
        },
      prompt: async (input) => enhancePromptPlanWithLlmIfAvailable(input, createStoryboardPromptOptimization(db, input)),
      storyboard: (input) => generateStoryboard(db, config, {
        ...input,
        disableCanonSearch: isGenericAgentInput(input)
      }),
      image: (input) => hasReferenceImageInput(input)
        ? createReferenceImageGenerationTask(db, { ...input, execute: true, generate: true })
        : createImageGenerationTask(db, { ...input, execute: true, generate: true }),
      visualQa: (input) => createStoryboardVisualInspectionPlan(db, { ...input, persistReport: true }),
      visualReview: (input) => createStoryboardVisualInspectionPlan(db, {
        ...input,
        persistReport: true,
        confirmedPass: input.confirmedPass !== false
      }),
      videoPlan: (input) => {
        const plan = createVideoProductionPlan(input);
        return isGenericAgentInput(input) ? { ...plan, standard: "generic-video-production-plan-v1" } : plan;
      },
      publishing: (input) => isGenericAgentInput(input)
        ? createGenericPublishingPlan(input)
        : createBilibiliPublishingPlan(db, input),
      portable: (input) => isGenericAgentInput(input)
        ? createGenericPortablePlan(input)
        : createPortablePackagePlan(input)
    }
  });
  agentRuntime.recoverInterruptedRuns();
  return agentRuntime;
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token"
    });
    res.end();
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    const llm = getLlmDiagnostics(config);
    sendJson(res, 200, {
      sourceRoot: config.sourceRoot,
      databasePath: config.databasePath,
      outputRoot: config.outputRoot,
      edition: config.edition,
      testMode: config.testMode,
      llm: {
        provider: llm.provider,
        model: llm.model,
        enabled: llm.enabled,
        baseUrl: llm.baseUrl,
        apiMode: llm.apiMode,
        endpointOrder: llm.endpointOrder,
        compatibility: llm.compatibility,
        missing: llm.missing,
        mode: llm.mode,
        capabilities: llm.capabilityMatrix,
        unavailableUntilConfigured: llm.unavailableUntilConfigured,
        setupHint: llm.setupHint,
        envTemplate: llm.envTemplate,
        localFallback: "未接入大模型时，工作台仍会使用资料库、剧作规则、提示词模板、视觉检查和成本闸门先跑通生产流程。"
      },
      adminSyncProtected: Boolean(process.env.ADMIN_TOKEN)
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/content-packs") {
    sendJson(res, 200, { items: listContentPacks(db) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/content-packs/sync") {
    if (!requireAdmin(req)) {
      sendJson(res, 401, { error: "admin token required" });
      return true;
    }
    sendJson(res, 200, { items: syncContentPacks(db, { edition: config.edition }) });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/workspaces") {
    sendJson(res, 200, { items: listWorkspaces(db) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/workspaces") {
    const body = await readJsonBody(req);
    sendJson(res, 201, createWorkspace(db, body));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/account-profiles") {
    sendJson(res, 200, { items: listAccountProfiles(db, url.searchParams.get("workspaceId") || "") });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/account-profiles") {
    const body = await readJsonBody(req);
    sendJson(res, 201, upsertAccountProfile(db, body));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/agent/runtime") {
    const runtime = getAgentRuntime();
    const runs = runtime.listRuns({ limit: 100 });
    sendJson(res, 200, {
      standard: runtime.standard,
      statuses: runtime.statuses,
      workspaces: listWorkspaces(db),
      contentPacks: listContentPacks(db),
      imagePolicy: {
        priority: "cloud-multimodal-first",
        defaultProvider: "openai",
        defaultModel: process.env.OPENAI_IMAGE_MODEL || process.env.IMAGE_MODEL || "gpt-image-2",
        compatible: ["ChatGPT/OpenAI Images", "OpenAI-compatible image-capable multimodal models"],
        optionalFallback: "ComfyUI"
      },
      summary: {
        totalRuns: runs.length,
        activeRuns: runs.filter((item) => runtime.statuses.active.includes(item.status)).length,
        completedRuns: runs.filter((item) => item.status === "completed").length,
        failedRuns: runs.filter((item) => item.status === "failed").length
      }
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/agent/runs") {
    sendJson(res, 200, {
      items: getAgentRuntime().listRuns({
        status: url.searchParams.get("status") || "",
        workspaceId: url.searchParams.get("workspaceId") || "",
        limit: url.searchParams.get("limit") || 30
      })
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/agent/runs") {
    const body = await readJsonBody(req);
    const run = getAgentRuntime().startRun(body);
    sendJson(res, 202, run);
    return true;
  }

  const agentEventsMatch = url.pathname.match(/^\/api\/agent\/runs\/([^/]+)\/events$/);
  if (req.method === "GET" && agentEventsMatch) {
    sendJson(res, 200, {
      items: getAgentRuntime().events(
        decodeURIComponent(agentEventsMatch[1]),
        url.searchParams.get("afterId") || 0,
        url.searchParams.get("limit") || 200
      )
    });
    return true;
  }

  const agentApproveMatch = url.pathname.match(/^\/api\/agent\/runs\/([^/]+)\/approve$/);
  if (req.method === "POST" && agentApproveMatch) {
    const body = await readJsonBody(req);
    sendJson(res, 200, getAgentRuntime().approve(decodeURIComponent(agentApproveMatch[1]), body));
    return true;
  }

  const agentResumeMatch = url.pathname.match(/^\/api\/agent\/runs\/([^/]+)\/resume$/);
  if (req.method === "POST" && agentResumeMatch) {
    sendJson(res, 200, getAgentRuntime().resume(decodeURIComponent(agentResumeMatch[1])));
    return true;
  }

  const agentCancelMatch = url.pathname.match(/^\/api\/agent\/runs\/([^/]+)\/cancel$/);
  if (req.method === "POST" && agentCancelMatch) {
    sendJson(res, 200, getAgentRuntime().cancel(decodeURIComponent(agentCancelMatch[1])));
    return true;
  }

  const agentRunMatch = url.pathname.match(/^\/api\/agent\/runs\/([^/]+)$/);
  if (req.method === "GET" && agentRunMatch) {
    const run = getAgentRuntime().getRun(decodeURIComponent(agentRunMatch[1]), { includeEvents: true });
    if (!run) {
      sendJson(res, 404, { error: "agent run not found" });
      return true;
    }
    sendJson(res, 200, run);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/system/health") {
    sendJson(res, 200, await getSystemHealth(db, config));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/system/pipeline-report") {
    const report = getLatestFullPipelineReport();
    if (!report) {
      sendJson(res, 404, { error: "full pipeline report not found" });
      return true;
    }
    sendJson(res, 200, report);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/system/pipeline-check") {
    if (!requireAdmin(req)) {
      sendJson(res, 401, { error: "admin token required" });
      return true;
    }
    if (pipelineCheckInProgress || syncInProgress) {
      sendJson(res, 409, {
        error: pipelineCheckInProgress ? "pipeline check already in progress" : "database sync is in progress"
      });
      return true;
    }
    pipelineCheckInProgress = true;
    try {
      sendJson(res, 200, await runFullPipelineCheck());
    } finally {
      pipelineCheckInProgress = false;
    }
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/site-data") {
    const base = `${url.protocol}//${url.host}`;
    sendJson(res, 200, buildSiteData(db, { apiBaseUrl: base }));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/llm/diagnostics") {
    sendJson(res, 200, getLlmDiagnostics(config));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/llm/test") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await testLlmConnection(config, body));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/stats") {
    sendJson(res, 200, getStats(db));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/entities") {
    const type = url.searchParams.get("type");
    const q = url.searchParams.get("q");
    const params = [];
    const where = [];
    if (type) {
      where.push("type = ?");
      params.push(type);
    }
    if (q) {
      where.push("(name LIKE ? OR aliases_json LIKE ? OR summary LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const sql = `
      SELECT id, type, name, aliases_json, summary, details_json
      FROM entities
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY type, name
      LIMIT 200
    `;
    sendJson(res, 200, { items: db.prepare(sql).all(...params) });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/search") {
    const q = url.searchParams.get("q") || "";
    const limit = Number(url.searchParams.get("limit") || 10);
    sendJson(res, 200, searchDatabase(db, q.split(/\s+/), {
      limit,
      mode: url.searchParams.get("mode") || "broad",
      entityType: url.searchParams.get("entityType") || undefined
    }));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/answer-card") {
    sendJson(res, 200, createAnswerCard(db, {
      query: url.searchParams.get("q") || "",
      mode: url.searchParams.get("mode") || "precise",
      entityType: url.searchParams.get("entityType") || "",
      limit: Number(url.searchParams.get("limit") || 8)
    }));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/ask") {
    const body = await readJsonBody(req);
    const question = String(body.question || "").trim();
    if (!question) {
      sendJson(res, 400, { error: "question is required" });
      return true;
    }
    const evidence = searchDatabase(db, question.split(/\s+/), { limit: Number(body.limit || 8) });
    const llm = await askLlm(config, question, evidence);
    sendJson(res, 200, { question, evidence, llm });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/literature/expand") {
    const body = await readJsonBody(req);
    const result = await createLiteratureExpansion(db, config, {
      mode: body.mode,
      text: body.text,
      intent: body.intent,
      characters: body.characters,
      tone: body.tone,
      useLlm: body.useLlm,
      limit: body.limit
    });
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/dramaturgy/rules") {
    const library = getDramaturgyRuleLibrary();
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, dramaturgyRuleLibraryToMarkdown(library), "xinrui-dramaturgy-rule-library.md");
      return true;
    }
    sendJson(res, 200, { library });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/dramaturgy/review") {
    const body = await readJsonBody(req);
    const review = analyzeScriptWithDramaturgy({
      text: body.text || body.script || body.scene,
      intent: body.intent || body.goal,
      topic: body.topic,
      characters: body.characters
    });
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, dramaturgyReviewToMarkdown(review), "xinrui-dramaturgy-review.md");
      return true;
    }
    sendJson(res, 200, { review });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/references/catalog") {
    sendJson(res, 200, getReferenceCatalog());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/research/catalog") {
    sendJson(res, 200, getResearchCatalog());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/research/plan") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createResearchPlan({
      query: body.query || body.topic,
      focus: body.focus
    }));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/references/plan") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createReferencePlan({
      query: body.query,
      focus: body.focus
    }));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/references/real-world-pack") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createRealWorldReferencePack({
      query: body.query || body.topic || body.object || body.prompt,
      focus: body.focus || body.category,
      persist: body.persist !== false,
      writeFiles: body.writeFiles,
      slug: body.slug
    }));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/projects/create") {
    const body = await readJsonBody(req);
    sendJson(res, 200, isGenericAgentInput(body) ? createGenericProductionProject(body) : createProductionProject(db, body));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/projects/status") {
    sendJson(res, 200, listProjectStatuses());
    return true;
  }

  const projectStatusMatch = url.pathname.match(/^\/api\/projects\/status\/([^/]+)$/);
  if (req.method === "GET" && projectStatusMatch) {
    const status = getProjectStatus(decodeURIComponent(projectStatusMatch[1]));
    if (!status) {
      sendJson(res, 404, { error: "project not found" });
      return true;
    }
    sendJson(res, 200, status);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/assets/inventory") {
    const body = await readJsonBody(req);
    sendJson(res, 200, isGenericAgentInput(body) ? createGenericAssetInventory(body) : createAssetInventory(db, body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/prompts/refine") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createPromptRefinementPlan(db, body));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/pipeline/cost-profiles") {
    sendJson(res, 200, { items: getCostProfiles() });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/pipeline/image-generation/diagnostics") {
    sendJson(res, 200, await getImageGenerationDiagnostics());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/prompt-refine") {
    const body = await readJsonBody(req);
    const localPlan = createStoryboardPromptOptimization(db, body);
    sendJson(res, 200, await enhancePromptPlanWithLlmIfAvailable(body, localPlan));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/auto-execute") {
    const body = await readJsonBody(req);
    const preview = isGenericAgentInput(body) ? createGenericExecutionPlan(body) : createAutonomousCreativeExecutionPlan(db, body);
    const run = getAgentRuntime().startRun({ ...body, autoStart: body.autoStart !== false });
    sendJson(res, 202, {
      ...preview,
      standard: "creator-super-agent-start-v1",
      agentRun: run,
      pollUrl: `/api/agent/runs/${encodeURIComponent(run.id)}`
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/visual-check") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createStoryboardVisualInspectionPlan(db, body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/reference-image-generate") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await createReferenceImageGenerationTask(db, body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/image-generate") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await createImageGenerationTask(db, body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/creative-plan") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createDetailedCreativePlan(db, body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/cost-estimate") {
    const body = await readJsonBody(req);
    sendJson(res, 200, estimateVideoGenerationCost(body));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/plugins/creative-suite") {
    sendJson(res, 200, getCreativePluginSuite());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/pipeline/creative-suite") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createCreativeSuitePlan(body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/workflow/plan") {
    const body = await readJsonBody(req);
    const workspaceContext = resolveWorkspaceContext(db, {
      ...body,
      workspaceId: body.workspaceId || (config.edition === "generic" ? "creator-default" : "xinrui-main")
    });
    sendJson(res, 200, createWorkflowPlan(db, { ...body, workspaceContext }));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/publishing/bilibili") {
    const body = await readJsonBody(req);
    const workspaceContext = resolveWorkspaceContext(db, {
      ...body,
      workspaceId: body.workspaceId || (config.edition === "generic" ? "creator-default" : "xinrui-main")
    });
    sendJson(res, 200, isGenericAgentInput(body)
      ? createGenericPublishingPlan(body)
      : createBilibiliPublishingPlan(db, { ...body, workspaceContext }));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/daily/story-brief") {
    const body = await readJsonBody(req);
    const workspaceContext = resolveWorkspaceContext(db, {
      ...body,
      workspaceId: body.workspaceId || (config.edition === "generic" ? "creator-default" : "xinrui-main")
    });
    sendJson(res, 200, createDailyStoryBrief(db, { ...body, workspaceContext }));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/postproduction/status") {
    sendJson(res, 200, getPostproductionStatus());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/postproduction/rigging-plan") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createRiggingWorkflowPlan(body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/postproduction/video-plan") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createVideoProductionPlan(body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/postproduction/video-review") {
    const body = await readJsonBody(req);
    sendJson(res, 200, createVideoReviewPlan(body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/package/portable-plan") {
    sendJson(res, 200, createPortablePackagePlan());
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/package/export") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await createPortablePackage(body));
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/sync") {
    if (!requireAdmin(req)) {
      sendJson(res, 401, { error: "admin token required" });
      return true;
    }
    if (syncInProgress) {
      sendJson(res, 409, { error: "sync already in progress" });
      return true;
    }
    syncInProgress = true;
    try {
      const result = await syncSource(db, config);
      const visualProfiles = refreshAssetProfiles(db);
      const contentPacks = syncContentPacks(db, { edition: config.edition });
      sendJson(res, 200, { ...result, visualProfiles, contentPacks });
    } finally {
      syncInProgress = false;
    }
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/visual-assets/refresh") {
    const result = refreshAssetProfiles(db);
    sendJson(res, 200, result);
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/visual-assets") {
    sendJson(res, 200, searchVisualAssets(db, {
      query: url.searchParams.get("q") || "",
      character: url.searchParams.get("character") || "",
      kind: url.searchParams.get("kind") || "",
      role: url.searchParams.get("role") || "",
      limit: Number(url.searchParams.get("limit") || 24)
    }));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/settings/proposals") {
    const limit = Number(url.searchParams.get("limit") || 30);
    sendJson(res, 200, { items: listSettingProposals(db, limit) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/settings/proposals") {
    const body = await readJsonBody(req);
    const result = await createSettingProposal(db, config, {
      targetName: body.targetName,
      targetType: body.targetType,
      intent: body.intent,
      limit: body.limit,
      useLlm: body.useLlm
    });
    sendJson(res, 200, result);
    return true;
  }

  const proposalMatch = url.pathname.match(/^\/api\/settings\/proposals\/(\d+)$/);
  if (req.method === "GET" && proposalMatch) {
    const proposal = getSettingProposal(db, Number(proposalMatch[1]));
    if (!proposal) {
      sendJson(res, 404, { error: "proposal not found" });
      return true;
    }
    sendJson(res, 200, { proposal });
    return true;
  }

  const applyProposalMatch = url.pathname.match(/^\/api\/settings\/proposals\/(\d+)\/apply$/);
  if (req.method === "POST" && applyProposalMatch) {
    const proposal = applySettingProposal(db, Number(applyProposalMatch[1]));
    sendJson(res, 200, { proposal });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/storyboards") {
    const limit = Number(url.searchParams.get("limit") || 30);
    sendJson(res, 200, { items: listStoryboardProjects(db, limit) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/storyboards/generate") {
    const body = await readJsonBody(req);
    const result = await generateStoryboard(db, config, {
      title: body.title,
      script: body.script,
      style: body.style,
      shotCount: body.shotCount,
      useLlm: body.useLlm,
      projectSlug: body.projectSlug,
      director: body.director
    });
    sendJson(res, 200, result);
    return true;
  }

  const storyboardMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)$/);
  if (req.method === "GET" && storyboardMatch) {
    const project = getStoryboardProject(db, Number(storyboardMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    sendJson(res, 200, { project });
    return true;
  }

  const promptPackMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)\/prompt-pack$/);
  if (req.method === "GET" && promptPackMatch) {
    const project = getStoryboardProject(db, Number(promptPackMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, storyboardPromptPackToMarkdown(pack), `storyboard-${project.id}-prompts.md`);
      return true;
    }
    sendJson(res, 200, { promptPack: pack });
    return true;
  }

  const storyboardFramesMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)\/frames$/);
  if (req.method === "GET" && storyboardFramesMatch) {
    const project = getStoryboardProject(db, Number(storyboardFramesMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    const framePack = buildConcreteStoryboardFrames(pack);
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, concreteStoryboardFramesToMarkdown(framePack), `storyboard-${project.id}-frames.md`);
      return true;
    }
    sendJson(res, 200, { framePack });
    return true;
  }

  const storyboardFrameSvgMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)\/frames\/(\d+)\.svg$/);
  if (req.method === "GET" && storyboardFrameSvgMatch) {
    const project = getStoryboardProject(db, Number(storyboardFrameSvgMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const shotIndex = Number(storyboardFrameSvgMatch[2]);
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    const framePack = buildConcreteStoryboardFrames(pack);
    const frame = framePack.frames.find((item) => Number(item.index) === shotIndex);
    if (!frame) {
      sendJson(res, 404, { error: "frame not found" });
      return true;
    }
    sendSvg(res, 200, concreteStoryboardFrameToSvg(frame, project));
    return true;
  }

  const storyboardIllustrationsMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)\/illustrations$/);
  if (req.method === "GET" && storyboardIllustrationsMatch) {
    const project = getStoryboardProject(db, Number(storyboardIllustrationsMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    const illustrationPack = buildKeySceneIllustrations(pack);
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, keySceneIllustrationsToMarkdown(illustrationPack), `storyboard-${project.id}-illustrations.md`);
      return true;
    }
    sendJson(res, 200, { illustrationPack });
    return true;
  }

  const storyboardImage2Match = url.pathname.match(/^\/api\/storyboards\/(\d+)\/image2-plan$/);
  if (req.method === "GET" && storyboardImage2Match) {
    const project = getStoryboardProject(db, Number(storyboardImage2Match[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    const framePack = buildConcreteStoryboardFrames(pack);
    const illustrationPack = buildKeySceneIllustrations(pack);
    const board = buildStoryboardBoard(pack, framePack, illustrationPack);
    const image2Plan = buildImage2StoryboardPlan(pack, framePack, illustrationPack, board);
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, image2StoryboardPlanToMarkdown(image2Plan), `storyboard-${project.id}-image2-plan.md`);
      return true;
    }
    sendJson(res, 200, { image2Plan });
    return true;
  }

  const storyboardAuditMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)\/audit$/);
  if (req.method === "GET" && storyboardAuditMatch) {
    const project = getStoryboardProject(db, Number(storyboardAuditMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    const framePack = buildConcreteStoryboardFrames(pack);
    const illustrationPack = buildKeySceneIllustrations(pack);
    const auditPack = buildStoryboardAuditPack(pack, framePack, illustrationPack);
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, storyboardAuditPackToMarkdown(auditPack), `storyboard-${project.id}-single-frame-audit.md`);
      return true;
    }
    sendJson(res, 200, { auditPack });
    return true;
  }

  const storyboardBoardMatch = url.pathname.match(/^\/api\/storyboards\/(\d+)\/board$/);
  if (req.method === "GET" && storyboardBoardMatch) {
    const project = getStoryboardProject(db, Number(storyboardBoardMatch[1]));
    if (!project) {
      sendJson(res, 404, { error: "storyboard not found" });
      return true;
    }
    const visualReferences = getVisualReferencesForProject(db, project);
    const pack = buildStoryboardPromptPack(project, visualReferences);
    const framePack = buildConcreteStoryboardFrames(pack);
    const illustrationPack = buildKeySceneIllustrations(pack);
    const baseBoard = buildStoryboardBoard(pack, framePack, illustrationPack);
    const image2Plan = buildImage2StoryboardPlan(pack, framePack, illustrationPack, baseBoard);
    const board = buildStoryboardBoard(pack, framePack, illustrationPack, image2Plan);
    if (url.searchParams.get("format") === "markdown") {
      sendMarkdown(res, 200, storyboardBoardToMarkdown(board), `storyboard-${project.id}-board.md`);
      return true;
    }
    sendJson(res, 200, { board });
    return true;
  }

  const fileMatch = url.pathname.match(/^\/api\/files\/(\d+)$/);
  if (req.method === "GET" && fileMatch) {
    serveFileById(res, Number(fileMatch[1]));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/local-files") {
    serveLocalSourceFile(res, url.searchParams.get("path") || "");
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/output-files") {
    serveLocalOutputFile(res, url.searchParams.get("path") || "");
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res, url);
      if (!handled) sendJson(res, 404, { error: "not found" });
      return;
    }
    if (url.pathname === "/site") {
      res.writeHead(302, { Location: "/site/" });
      res.end();
      return;
    }
    if (url.pathname.startsWith("/site/")) {
      if (!serveShowcase(req, res, url)) sendText(res, 404, "Not found");
      return;
    }
    if (!serveStatic(req, res, url)) sendText(res, 404, "Not found");
  } catch (error) {
    sendJson(res, 500, { error: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined });
  }
});

getAgentRuntime();

server.listen(port, host, () => {
  console.log(`${config.edition === "generic" ? "全流程创作超级智能体" : "新锐纪元 IP 数据库"}服务已启动：http://${host}:${port}`);
  console.log(`本机访问：http://127.0.0.1:${port}`);
});
