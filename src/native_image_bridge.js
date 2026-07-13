import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";
import { ensureDir, nowIso } from "./utils.js";

const OUTPUT_ROOT = path.resolve(getOutputRoot());
const NATIVE_ROOT = path.join(OUTPUT_ROOT, "codex-native-image-tasks");
const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeSlug(value, fallback = "image") {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || fallback;
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const handle = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(8 * 1024 * 1024);
  try {
    let read = 0;
    do {
      read = fs.readSync(handle, buffer, 0, buffer.length, null);
      if (read > 0) hash.update(buffer.subarray(0, read));
    } while (read > 0);
  } finally {
    fs.closeSync(handle);
  }
  return hash.digest("hex");
}

function taskDirectory(input, taskId) {
  if (input.projectSlug) {
    return path.join(
      OUTPUT_ROOT,
      "projects",
      safeSlug(input.projectSlug, "project"),
      "04_storyboard",
      "key_illustrations",
      "codex-native",
      taskId
    );
  }
  return path.join(NATIVE_ROOT, taskId);
}

function assertInsideOutput(filePath) {
  const absolute = path.resolve(filePath);
  if (!(absolute === OUTPUT_ROOT || absolute.startsWith(`${OUTPUT_ROOT}${path.sep}`))) {
    throw new Error("native image task path must stay inside the workbench output root");
  }
  return absolute;
}

function loadTask(directory) {
  const taskDir = assertInsideOutput(directory);
  const requestPath = path.join(taskDir, "native-image-request.json");
  if (!fs.existsSync(requestPath)) throw new Error(`native image request not found: ${requestPath}`);
  return { taskDir, requestPath, task: JSON.parse(fs.readFileSync(requestPath, "utf8")) };
}

export function createCodexNativeImageTask(input = {}, promptPlan = {}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const taskId = `${stamp}-${safeSlug(input.topic || input.title || "storyboard-frame")}`;
  const outputDir = taskDirectory(input, taskId);
  ensureDir(outputDir);
  const promptSpec = promptPlan.refinedPrompt?.promptV2 || promptPlan.promptV2 || null;
  const prompt = promptSpec?.compiledPrompt || promptPlan.refinedPrompt?.image2Prompt || input.prompt || input.intent || input.topic || "";
  const task = {
    standard: "creator-codex-native-image-task-v1",
    taskId,
    createdAt: nowIso(),
    status: "waiting_codex_native_generation",
    executionMode: "codex_native_image_gen",
    builtInTool: "image_gen",
    modelFamily: "gpt-image-2",
    projectSlug: input.projectSlug || "",
    topic: input.topic || input.title || "",
    outputDir,
    prompt,
    promptSpec,
    visualLocks: promptPlan.visualLocks || null,
    referenceFiles: [
      ...(promptPlan.visualLocks?.identityAnchors || []),
      ...(promptPlan.visualLocks?.propReferences || []),
      ...(promptPlan.visualLocks?.sceneReferences || [])
    ].map((item) => ({ fileId: item.fileId, title: item.title, path: item.path })),
    expectedOutput: path.join(outputDir, "image-v001.png"),
    savePolicy: {
      source: "$CODEX_HOME/generated_images",
      rule: "Codex 内置 image_gen 先生成，再把选中结果复制到本任务目录；不得只留在聊天或 CODEX_HOME。",
      overwrite: false,
      versioned: true
    },
    nextActions: [
      "Codex 打开并确认身份锚、单一着装锁和参考图。",
      "调用内置 image_gen 生成或编辑图片。",
      "把生成结果复制到工作台项目目录。",
      "调用 /api/pipeline/native-image/import 登记图片并立即进入视觉 QA V2。"
    ]
  };
  const files = {
    requestJson: path.join(outputDir, "native-image-request.json"),
    promptMarkdown: path.join(outputDir, "codex-image-prompt.md"),
    importGuide: path.join(outputDir, "import-instructions.md")
  };
  fs.writeFileSync(files.requestJson, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  fs.writeFileSync(files.promptMarkdown, `# Codex 原生 image-2 提示词\n\n\`\`\`text\n${prompt}\n\`\`\`\n`, "utf8");
  fs.writeFileSync(files.importGuide, [
    "# Codex 原生图片落盘",
    "",
    "1. 使用 Codex 内置 `image_gen`，不要改用自建占位图。",
    "2. 内置工具生成后，从 `$CODEX_HOME/generated_images/...` 选择最终图片。",
    "3. 不覆盖旧图；调用导入接口后自动生成 `image-v001.png`、`image-v002.png`。",
    "4. 导入后必须进行真实图片视觉复核。",
    "",
    `任务目录：${outputDir}`
  ].join("\n"), "utf8");
  return { ...task, files };
}

export function importCodexNativeImage(input = {}) {
  const sourceImagePath = path.resolve(compact(input.sourceImagePath || input.imagePath));
  if (!sourceImagePath || !fs.existsSync(sourceImagePath) || !fs.statSync(sourceImagePath).isFile()) {
    throw new Error("Codex native generated image is missing or unreadable");
  }
  const extension = path.extname(sourceImagePath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) throw new Error(`unsupported native image format: ${extension}`);
  const sizeBytes = fs.statSync(sourceImagePath).size;
  if (sizeBytes > 100 * 1024 * 1024) throw new Error("native generated image exceeds 100 MiB");
  const { taskDir, requestPath, task } = loadTask(input.taskDirectory || input.outputDir);
  const versions = fs.readdirSync(taskDir)
    .map((name) => /^image-v(\d{3})\.(png|jpg|jpeg|webp)$/i.exec(name))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const version = Math.max(0, ...versions) + 1;
  const targetPath = path.join(taskDir, `image-v${String(version).padStart(3, "0")}${extension}`);
  fs.copyFileSync(sourceImagePath, targetPath, fs.constants.COPYFILE_EXCL);
  const manifest = {
    standard: "creator-codex-native-image-result-v1",
    importedAt: nowIso(),
    taskId: task.taskId,
    version,
    source: "codex-built-in-image_gen",
    modelFamily: "gpt-image-2",
    sourceImagePath,
    outputPath: targetPath,
    sizeBytes,
    sha256: sha256File(targetPath),
    promptSha256: crypto.createHash("sha256").update(task.prompt || "", "utf8").digest("hex"),
    status: "imported_visual_review_required",
    previousVersions: versions.sort((a, b) => a - b)
  };
  fs.writeFileSync(path.join(taskDir, `image-v${String(version).padStart(3, "0")}-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(requestPath, `${JSON.stringify({ ...task, status: manifest.status, latestResult: manifest }, null, 2)}\n`, "utf8");
  return { ...manifest, taskDirectory: taskDir, requestPath };
}

export function createCodexNativeRepairTask(input = {}) {
  const { taskDir, task } = loadTask(input.taskDirectory || input.outputDir);
  const findings = Array.isArray(input.findings) ? input.findings : [];
  if (!findings.length) throw new Error("visual findings are required before creating a repair task");
  const round = Math.max(1, Number(input.repairRound || 1));
  if (round > 2) throw new Error("automatic native image repair is limited to two rounds");
  const repairDir = path.join(taskDir, "repairs", `round-${round}`);
  ensureDir(repairDir);
  const structural = findings.some((item) => ["identity", "anatomy", "hands", "propGeometry", "sceneSpace", "continuity"].includes(item.dimension) || item.severity === "blocker");
  const repair = {
    standard: "creator-codex-native-image-repair-v1",
    createdAt: nowIso(),
    taskId: task.taskId,
    repairRound: round,
    route: structural ? "regenerate_with_corrected_prompt" : "localized_image_edit",
    sourceImagePath: input.sourceImagePath || task.latestResult?.outputPath || "",
    findings,
    invariants: [
      "只修复列出的问题。",
      "保持角色身份、单一服装锁、未标注的正确区域、镜头、场景、光源和色彩配置不变。",
      "禁止用裁切、模糊、遮挡或过曝隐藏手部、人体和道具问题。"
    ],
    prompt: [
      structural ? "根据原始提示词重新生成整张图片，并修正以下结构性问题：" : "编辑现有图片，只修复以下局部问题：",
      ...findings.map((item) => `- ${item.location || "未标注位置"}: ${item.issue || item.description}; ${item.suggestedFix || item.repair || "修正结构和接触关系"}`),
      "其他正确内容必须保持不变。"
    ].join("\n")
  };
  const files = {
    repairJson: path.join(repairDir, "repair-task.json"),
    repairPrompt: path.join(repairDir, "repair-prompt.md")
  };
  fs.writeFileSync(files.repairJson, `${JSON.stringify(repair, null, 2)}\n`, "utf8");
  fs.writeFileSync(files.repairPrompt, `# Codex 原生图片修复\n\n\`\`\`text\n${repair.prompt}\n\`\`\`\n`, "utf8");
  return { ...repair, files };
}
