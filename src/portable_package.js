import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { getOutputRoot, getProjectRoot } from "./config.js";
import { ensureDir, formatBytes, nowIso } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();
const PACKAGE_ROOT = path.join(getOutputRoot(), "portable-package");
const INCLUDE_PATHS = [
  "src", "public", "config", "docs", "scripts", ".github",
  "codex-plugin/creator-super-agent", "content-packs/creator-generic",
  "package.json", "package-lock.json", "README.md", ".env.example",
  "DISTRIBUTION.md", "EDITION.env.example", ".gitignore", ".gitattributes"
];
const EXCLUDED_NAMES = new Set([".git", ".env", "node_modules", "data", "output"]);

function posix(value) {
  return String(value).replaceAll("\\", "/");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function collectFiles(source) {
  if (!fs.existsSync(source)) return [];
  const stat = fs.statSync(source);
  if (stat.isFile()) return [source];
  const files = [];
  const stack = [source];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (EXCLUDED_NAMES.has(entry.name)) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function bundleId() {
  return `creator-super-agent-portable-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
}

export function createPortablePackagePlan() {
  const id = bundleId();
  return {
    standard: "creator-portable-bundle-v1",
    bundleId: id,
    createdAt: nowIso(),
    packageRoot: PACKAGE_ROOT,
    archiveName: `${id}.zip`,
    defaultIncludes: [...INCLUDE_PATHS],
    exclusions: [".env", "data/", "output/", "node_modules/", "private content packs", "generated client assets"],
    optionalIncludes: [],
    summary: { fileCount: 0, payloadSizeBytes: 0, payloadSizeLabel: "0 B" }
  };
}

export async function createPortablePackage(input = {}) {
  const plan = createPortablePackagePlan();
  const zip = new JSZip();
  const files = [];
  for (const relative of INCLUDE_PATHS) {
    const source = path.join(PROJECT_ROOT, relative);
    for (const filePath of collectFiles(source)) {
      const stat = fs.statSync(source);
      const packagePath = stat.isFile()
        ? path.join("workbench", relative)
        : path.join("workbench", relative, path.relative(source, filePath));
      const buffer = fs.readFileSync(filePath);
      zip.file(posix(packagePath), buffer);
      files.push({
        packagePath: posix(packagePath),
        sizeBytes: buffer.length,
        sizeLabel: formatBytes(buffer.length),
        sha256: sha256(buffer)
      });
    }
  }
  const installGuide = [
    "# Creator Super Agent Portable Install",
    "",
    "1. Extract the workbench directory.",
    "2. Copy .env.example to .env and add only your own model credentials.",
    "3. Run npm install.",
    "4. Run scripts/install_agent_plugins.ps1.",
    "5. Run npm start and open http://127.0.0.1:8787/.",
    "",
    "Databases, outputs, private content packs and generated client assets are intentionally excluded."
  ].join("\n");
  zip.file("INSTALL.md", installGuide);
  const payloadSizeBytes = files.reduce((sum, item) => sum + item.sizeBytes, 0);
  const manifest = {
    ...plan,
    options: { writeZip: input.writeZip !== false },
    files,
    summary: { fileCount: files.length, payloadSizeBytes, payloadSizeLabel: formatBytes(payloadSizeBytes) }
  };
  zip.file("portable-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  ensureDir(PACKAGE_ROOT);
  const archivePath = path.join(PACKAGE_ROOT, `${plan.bundleId}.zip`);
  let archiveSizeBytes = 0;
  if (input.writeZip !== false) {
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(archivePath, buffer);
    archiveSizeBytes = buffer.length;
  }
  return {
    ...manifest,
    archivePath: input.writeZip === false ? null : archivePath,
    archiveSizeBytes,
    archiveSizeLabel: formatBytes(archiveSizeBytes)
  };
}
