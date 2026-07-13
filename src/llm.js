import { snippet } from "./utils.js";

const VALID_API_MODES = new Set(["auto", "responses", "chat_completions"]);

function normalizeApiMode(value = "auto") {
  const normalized = String(value || "auto").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "chat" || normalized === "chat_completion" || normalized === "chatcompletions") {
    return "chat_completions";
  }
  return VALID_API_MODES.has(normalized) ? normalized : "auto";
}

function endpointOrder(runtime) {
  if (runtime.apiMode === "responses") return ["responses"];
  if (runtime.apiMode === "chat_completions") return ["chat_completions"];
  return runtime.provider === "openai" || runtime.provider === "none"
    ? ["responses", "chat_completions"]
    : ["chat_completions", "responses"];
}

export function getLlmRuntimeConfig(config) {
  const provider = String(process.env.LLM_PROVIDER || config.llm?.provider || "none").trim().toLowerCase();
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
  const baseUrl = process.env.LLM_BASE_URL || config.llm?.baseUrl || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || config.llm?.model || "";
  const apiMode = normalizeApiMode(process.env.LLM_API_MODE || config.llm?.apiMode || "auto");
  const timeoutMs = Math.max(1000, Number(process.env.LLM_TIMEOUT_MS || config.llm?.timeoutMs || 120000));
  return {
    provider,
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    apiMode,
    timeoutMs,
    endpointOrder: endpointOrder({ provider, apiMode }),
    enabled: provider !== "none" && Boolean(apiKey) && Boolean(model)
  };
}

export function getLlmDiagnostics(config) {
  const runtime = getLlmRuntimeConfig(config);
  const missing = [];
  if (runtime.provider === "none") missing.push("LLM_PROVIDER 未配置");
  if (!runtime.model) missing.push("LLM_MODEL 未配置");
  if (!runtime.apiKey) missing.push("LLM_API_KEY 或 OPENAI_API_KEY 未配置");
  const mode = runtime.enabled ? "llm_enabled" : "local_rules_only";
  return {
    standard: "creator-llm-diagnostics-v2",
    provider: runtime.provider,
    model: runtime.model,
    baseUrl: runtime.baseUrl,
    apiMode: runtime.apiMode,
    endpointOrder: runtime.endpointOrder,
    timeoutMs: runtime.timeoutMs,
    enabled: runtime.enabled,
    mode,
    missing,
    envTemplate: [
      "LLM_PROVIDER=openai",
      "LLM_API_MODE=auto",
      "LLM_MODEL=<your-model-name>",
      "LLM_API_KEY=<your-api-key>",
      "LLM_BASE_URL=https://api.openai.com/v1"
    ].join("\n"),
    compatibility: {
      preferred: runtime.provider === "openai" || runtime.provider === "none" ? "/v1/responses" : "/v1/chat/completions",
      supported: ["/v1/responses", "/v1/chat/completions"],
      fallback: runtime.apiMode === "auto"
        ? "首选接口不可用时自动尝试另一兼容接口。"
        : "已锁定单一接口，不自动回退。"
    },
    capabilityMatrix: runtime.enabled ? [
      { id: "rag", label: "资料库 RAG 问答", status: "enabled" },
      { id: "prompt_refine", label: "gpt-image-2 / Seedance 提示词语义增强", status: "enabled" },
      { id: "dramaturgy", label: "剧本审查二次升华", status: "enabled" },
      { id: "literature", label: "小说文学化、去 AI 味和角色弧光", status: "enabled" },
      { id: "setting", label: "设定合理化提案", status: "enabled" }
    ] : [
      { id: "rag", label: "资料库检索与证据卡", status: "local_rules" },
      { id: "prompt_refine", label: "提示词模板化细化", status: "local_rules" },
      { id: "dramaturgy", label: "四层叙事规则审查", status: "local_rules" },
      { id: "literature", label: "本地保守文学校准草稿", status: "local_rules" },
      { id: "setting", label: "设定提案本地保守草稿", status: "local_rules" }
    ],
    unavailableUntilConfigured: runtime.enabled ? [] : [
      "大模型深度改写",
      "复杂多轮设定合理化",
      "长剧本文学化创作",
      "提示词语义级重组",
      "外部资料风格化综合判断"
    ],
    setupHint: runtime.enabled
      ? `大模型配置已满足；当前模式 ${runtime.apiMode}，可进行试连接。`
      : "在项目 .env 中配置 LLM_PROVIDER、LLM_MODEL、LLM_API_KEY；新版 OpenAI 优先使用 /v1/responses，并兼容 /v1/chat/completions。",
    safetyBoundary: [
      "本地资料库仍然是正史来源。",
      "大模型输出只能作为改写、审查、提示词增强和设定提案。",
      "涉及新设定时必须标注资料库确认、合理推断或待确认。"
    ]
  };
}

function buildEvidencePayload(searchResult) {
  const entities = searchResult.entities.map((entity) => ({
    type: entity.type,
    name: entity.name,
    summary: entity.summary
  }));

  const chunks = searchResult.chunks.map((chunk, index) => ({
    id: `D${index + 1}`,
    title: chunk.title,
    path: chunk.rel_path,
    excerpt: snippet(chunk.text, searchResult.query, 520)
  }));

  const assets = searchResult.assets.map((asset, index) => ({
    id: `A${index + 1}`,
    type: `${asset.media_type}/${asset.asset_type}`,
    path: asset.rel_path,
    linkedNames: asset.linkedNames
  }));

  return { entities, chunks, assets };
}

export function buildRagPrompt(question, searchResult) {
  const evidence = buildEvidencePayload(searchResult);
  return [
    "你是《当前项目》IP资料库智能体。",
    "请只依据给定资料库证据回答；如果证据不足，明确说明哪些部分无法确认。",
    "回答使用简体中文，先给结论，再给依据。涉及设定时要区分“已确认”和“待补全/推断”。",
    "",
    `用户问题：${question}`,
    "",
    "资料库证据：",
    JSON.stringify(evidence, null, 2)
  ].join("\n");
}

function extractResponsesText(payload = {}) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of payload.output || []) {
    if (typeof item?.text === "string") parts.push(item.text);
    for (const content of item?.content || []) {
      if (typeof content === "string") parts.push(content);
      if (typeof content?.text === "string") parts.push(content.text);
      if (typeof content?.output_text === "string") parts.push(content.output_text);
    }
  }
  return parts.filter(Boolean).join("\n").trim();
}

function extractChatText(payload = {}) {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((item) => typeof item === "string" ? item : item?.text || "").filter(Boolean).join("\n").trim();
  }
  return "";
}

async function postJson(runtime, endpoint, body) {
  let response;
  try {
    response = await fetch(`${runtime.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(runtime.timeoutMs)
    });
  } catch (error) {
    const wrapped = new Error(`network error: ${error.message}`);
    wrapped.code = "NETWORK_ERROR";
    throw wrapped;
  }

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { rawText: text.slice(0, 1000) };
    }
  }
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || text || response.statusText;
    const error = new Error(`${response.status} ${response.statusText}: ${String(detail).slice(0, 500)}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function callResponses(runtime, prompt, options = {}) {
  const body = {
    model: runtime.model,
    instructions: options.system || "你是严谨的中文IP设定资料库助手，必须以证据为准，不编造资料库中没有的信息。",
    input: prompt
  };
  const maxOutputTokens = Number(options.maxOutputTokens || process.env.LLM_MAX_OUTPUT_TOKENS || 0);
  if (maxOutputTokens > 0) body.max_output_tokens = maxOutputTokens;
  const payload = await postJson(runtime, "/responses", body);
  const answer = extractResponsesText(payload);
  if (!answer) throw new Error("Responses API returned no text output.");
  return { answer, payload, endpoint: "/responses", apiMode: "responses" };
}

async function callChatCompletions(runtime, prompt, options = {}) {
  const body = {
    model: runtime.model,
    messages: [
      {
        role: "system",
        content: options.system || "你是严谨的中文IP设定资料库助手，必须以证据为准，不编造资料库中没有的信息。"
      },
      { role: "user", content: prompt }
    ]
  };
  if (Number.isFinite(options.temperature)) body.temperature = options.temperature;
  const payload = await postJson(runtime, "/chat/completions", body);
  const answer = extractChatText(payload);
  if (!answer) throw new Error("Chat Completions API returned no text output.");
  return { answer, payload, endpoint: "/chat/completions", apiMode: "chat_completions" };
}

function shouldTryFallback(error) {
  if (!error) return true;
  if (error.code === "NETWORK_ERROR") return true;
  return ![401, 403, 429].includes(Number(error.status || 0));
}

export async function completeWithLlm(config, prompt, options = {}) {
  const runtime = getLlmRuntimeConfig(config);
  if (!runtime.enabled) {
    return {
      enabled: false,
      provider: runtime.provider,
      model: runtime.model,
      apiMode: runtime.apiMode,
      answer: null,
      error: null,
      attempts: []
    };
  }

  const attempts = [];
  for (const mode of runtime.endpointOrder) {
    try {
      const result = mode === "responses"
        ? await callResponses(runtime, prompt, options)
        : await callChatCompletions(runtime, prompt, options);
      attempts.push({ apiMode: mode, endpoint: result.endpoint, ok: true });
      return {
        enabled: true,
        provider: runtime.provider,
        model: runtime.model,
        apiMode: result.apiMode,
        endpoint: result.endpoint,
        answer: result.answer,
        error: null,
        attempts
      };
    } catch (error) {
      attempts.push({
        apiMode: mode,
        endpoint: mode === "responses" ? "/responses" : "/chat/completions",
        ok: false,
        status: error.status || null,
        error: error.message
      });
      if (runtime.apiMode !== "auto" || !shouldTryFallback(error)) break;
    }
  }

  return {
    enabled: true,
    provider: runtime.provider,
    model: runtime.model,
    apiMode: runtime.apiMode,
    endpoint: null,
    answer: null,
    error: attempts.map((item) => `${item.endpoint}: ${item.error || "failed"}`).join(" | "),
    attempts
  };
}

export async function testLlmConnection(config, input = {}) {
  const diagnostics = getLlmDiagnostics(config);
  if (!diagnostics.enabled) {
    return {
      ...diagnostics,
      ok: false,
      testSkipped: true,
      error: "LLM is not configured."
    };
  }
  const prompt = String(input.prompt || "请用一句中文回复：当前项目工作台大模型连接正常。").trim();
  const startedAt = Date.now();
  const result = await completeWithLlm(config, prompt, {
    temperature: 0,
    system: "你是当前项目 IP 工作台的大模型连接测试助手。只做简短确认，不添加设定。"
  });
  return {
    ...diagnostics,
    ok: Boolean(result.answer && !result.error),
    latencyMs: Date.now() - startedAt,
    apiModeUsed: result.apiMode,
    endpointUsed: result.endpoint,
    attempts: result.attempts,
    answer: result.answer,
    error: result.error,
    testSkipped: false
  };
}

export async function askLlm(config, question, searchResult) {
  const prompt = buildRagPrompt(question, searchResult);
  return completeWithLlm(config, prompt, {
    temperature: 0.2,
    system: "你是严谨的中文IP设定资料库助手，必须以证据为准，不编造资料库中没有的信息。"
  });
}
