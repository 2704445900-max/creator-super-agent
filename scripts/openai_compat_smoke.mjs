import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, "config", "default.json"), "utf8"));
const sourceDatabase = path.resolve(projectRoot, defaultConfig.databasePath);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runRoot = path.resolve(
  process.env.XINRUI_COMPAT_ROOT || path.join(projectRoot, "output", "maintenance", "openai-compat", stamp)
);
const isolatedOutputRoot = path.join(runRoot, "workbench-output");
const isolatedDatabase = path.join(runRoot, "data", "xinrui-openai-compat.sqlite");
const workbenchPort = Number(process.env.XINRUI_COMPAT_TEST_PORT || 18787);
const mockPort = Number(process.env.XINRUI_COMPAT_MOCK_PORT || 18788);
const workbenchBase = `http://127.0.0.1:${workbenchPort}`;
const mockBase = `http://127.0.0.1:${mockPort}/v1`;
const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nQAAAABJRU5ErkJggg==";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function createDatabaseSnapshot() {
  if (!fs.existsSync(sourceDatabase)) throw new Error(`source database not found: ${sourceDatabase}`);
  fs.mkdirSync(path.dirname(isolatedDatabase), { recursive: true });
  if (fs.existsSync(isolatedDatabase)) fs.rmSync(isolatedDatabase, { force: true });
  const db = new DatabaseSync(sourceDatabase);
  try {
    db.exec(`VACUUM INTO ${sqlString(isolatedDatabase)}`);
  } finally {
    db.close();
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": body.length
  });
  res.end(body);
}

function startMockServer() {
  const calls = [];
  const server = http.createServer(async (req, res) => {
    const bodyBuffer = await readBody(req);
    const contentType = String(req.headers["content-type"] || "");
    let body = null;
    if (contentType.includes("application/json") && bodyBuffer.length) {
      body = JSON.parse(bodyBuffer.toString("utf8"));
    }
    calls.push({ method: req.method, url: req.url, contentType, body });

    if (req.url === "/v1/responses") {
      if (String(body?.input || "").includes("__force_chat_fallback__")) {
        sendJson(res, 404, { error: { message: "mock Responses route unavailable" } });
        return;
      }
      sendJson(res, 200, {
        id: "resp_mock",
        output: [{ type: "message", content: [{ type: "output_text", text: "Responses API 连接正常。" }] }]
      });
      return;
    }

    if (req.url === "/v1/chat/completions") {
      sendJson(res, 200, {
        id: "chatcmpl_mock",
        choices: [{ message: { role: "assistant", content: "Chat Completions 回退正常。" } }]
      });
      return;
    }

    if (req.url === "/v1/images/generations") {
      sendJson(res, 200, { data: [{ b64_json: onePixelPng }] });
      return;
    }

    if (req.url === "/v1/images/edits") {
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

async function waitForServer(url, child, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`workbench exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  return payload;
}

createDatabaseSnapshot();
fs.mkdirSync(isolatedOutputRoot, { recursive: true });
const fixtureRoot = path.join(runRoot, "fixtures");
fs.mkdirSync(fixtureRoot, { recursive: true });
const fixturePath = path.join(fixtureRoot, "openai-compat-1x1.png");
fs.writeFileSync(fixturePath, Buffer.from(onePixelPng, "base64"));

const { server: mockServer, calls } = await startMockServer();
const serverOutput = [];
const child = spawn(process.execPath, ["--no-warnings", "src/server.js"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(workbenchPort),
    XINRUI_TEST_MODE: "1",
    XINRUI_DATABASE_PATH: isolatedDatabase,
    XINRUI_OUTPUT_ROOT: isolatedOutputRoot,
    XINRUI_SOURCE_ROOT: defaultConfig.sourceRoot,
    LLM_PROVIDER: "openai",
    LLM_API_MODE: "auto",
    LLM_BASE_URL: mockBase,
    LLM_MODEL: "gpt-test-model",
    LLM_API_KEY: "mock-key",
    IMAGE_PROVIDER: "openai",
    IMAGE_BASE_URL: mockBase,
    IMAGE_MODEL: "gpt-image-2",
    IMAGE_API_KEY: "mock-key",
    COMFYUI_ENABLED: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
child.stdout.on("data", (chunk) => serverOutput.push(chunk.toString("utf8")));
child.stderr.on("data", (chunk) => serverOutput.push(chunk.toString("utf8")));

let report;
try {
  await waitForServer(`${workbenchBase}/api/config`, child);

  const diagnostics = await requestJson(`${workbenchBase}/api/llm/diagnostics`);
  const responsesTest = await requestJson(`${workbenchBase}/api/llm/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "正常 Responses API 测试" })
  });
  const fallbackTest = await requestJson(`${workbenchBase}/api/llm/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "__force_chat_fallback__" })
  });
  const imageDiagnostics = await requestJson(`${workbenchBase}/api/pipeline/image-generation/diagnostics`);
  const imageGeneration = await requestJson(`${workbenchBase}/api/pipeline/image-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "OpenAI compatibility smoke image",
      prompt: "A simple red square centered on white, compatibility fixture only.",
      execute: true,
      allowDraft: true,
      size: "1024x1024",
      quality: "low"
    })
  });
  const imageEdit = await requestJson(`${workbenchBase}/api/pipeline/reference-image-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "OpenAI compatibility smoke edit",
      prompt: "Keep the test fixture unchanged.",
      referenceImagePath: fixturePath,
      referenceMode: "style_lock",
      imageProvider: "openai",
      execute: true,
      quality: "low"
    })
  });

  assert(diagnostics.standard === "xinrui-llm-diagnostics-v2", "LLM diagnostics did not upgrade to v2");
  assert(responsesTest.ok && responsesTest.endpointUsed === "/responses", "Responses API path failed");
  assert(fallbackTest.ok && fallbackTest.endpointUsed === "/chat/completions", "Chat Completions fallback failed");
  assert(imageDiagnostics.standard === "xinrui-image-generation-diagnostics-v2", "image diagnostics did not upgrade to v2");
  assert(imageDiagnostics.openai?.canGenerateText === true, "OpenAI text-to-image readiness missing");
  assert(imageGeneration.gate?.status === "generated_review_required", "text-to-image execution did not complete");
  assert(imageGeneration.output?.outputPath && fs.existsSync(imageGeneration.output.outputPath), "text-to-image output file missing");
  assert(imageEdit.gate?.status === "generated_review_required", "reference image edit did not complete");
  assert(imageEdit.output?.outputPath && fs.existsSync(imageEdit.output.outputPath), "image edit output file missing");

  report = {
    standard: "xinrui-openai-compat-smoke-v1",
    createdAt: new Date().toISOString(),
    ok: true,
    runRoot,
    isolatedDatabase,
    isolatedOutputRoot,
    workbenchBase,
    mockBase,
    checks: {
      responses: { ok: responsesTest.ok, endpointUsed: responsesTest.endpointUsed, attempts: responsesTest.attempts },
      chatFallback: { ok: fallbackTest.ok, endpointUsed: fallbackTest.endpointUsed, attempts: fallbackTest.attempts },
      imageGeneration: { status: imageGeneration.gate.status, outputPath: imageGeneration.output.outputPath },
      imageEdit: { status: imageEdit.gate.status, outputPath: imageEdit.output.outputPath },
      diagnostics: {
        llmStandard: diagnostics.standard,
        imageStandard: imageDiagnostics.standard,
        imageCapabilities: imageDiagnostics.capabilities
      }
    },
    mockCalls: calls.map((call) => ({ method: call.method, url: call.url, contentType: call.contentType }))
  };
} catch (error) {
  report = {
    standard: "xinrui-openai-compat-smoke-v1",
    createdAt: new Date().toISOString(),
    ok: false,
    runRoot,
    isolatedDatabase,
    isolatedOutputRoot,
    error: error.stack || error.message,
    serverOutput: serverOutput.join("").slice(-5000),
    mockCalls: calls.map((call) => ({ method: call.method, url: call.url, contentType: call.contentType }))
  };
} finally {
  child.kill();
  await new Promise((resolve) => mockServer.close(resolve));
}

const reportPath = path.join(runRoot, "openai-compat-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
if (!report.ok) process.exitCode = 1;
