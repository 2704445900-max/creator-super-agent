import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { getOutputRoot, loadConfig, getProjectRoot } from "./config.js";
import { ensureDir, formatBytes, nowIso } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();
const OUTPUT_ROOT = getOutputRoot();
const PACKAGE_ROOT = path.join(OUTPUT_ROOT, "portable-package");
const DEFAULT_SKILL_NAME = "xinrui-visual-production";
const DEFAULT_PLUGIN_NAME = "xinrui-ip-studio";

function pathExists(value) {
  return Boolean(value) && fs.existsSync(value);
}

function posixPath(value) {
  return String(value).replaceAll(path.sep, "/").replaceAll("\\", "/");
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function fileEntry(absPath, packagePath, buffer) {
  return {
    packagePath: posixPath(packagePath),
    sourcePath: absPath,
    sizeBytes: buffer.length,
    sizeLabel: formatBytes(buffer.length),
    sha256: sha256Buffer(buffer)
  };
}

function readJsonIfExists(absPath, fallback = null) {
  if (!pathExists(absPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return fallback;
  }
}

function shouldSkipName(name) {
  return new Set([
    ".git",
    ".env",
    "node_modules",
    "tools",
    "npm-cache",
    "logs"
  ]).has(name);
}

function collectFiles(absRoot) {
  const files = [];
  if (!pathExists(absRoot)) return files;
  const stack = [absRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (shouldSkipName(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function addPath(zip, manifestFiles, absPath, packageRoot) {
  if (!pathExists(absPath)) return { added: 0, missing: true, path: absPath };
  const stat = fs.statSync(absPath);
  if (stat.isFile()) {
    const buffer = fs.readFileSync(absPath);
    zip.file(posixPath(packageRoot), buffer);
    manifestFiles.push(fileEntry(absPath, packageRoot, buffer));
    return { added: 1, missing: false, path: absPath };
  }

  if (!stat.isDirectory()) return { added: 0, missing: true, path: absPath };

  let added = 0;
  for (const filePath of collectFiles(absPath)) {
    const rel = path.relative(absPath, filePath);
    const packagePath = path.join(packageRoot, rel);
    const buffer = fs.readFileSync(filePath);
    zip.file(posixPath(packagePath), buffer);
    manifestFiles.push(fileEntry(filePath, packagePath, buffer));
    added += 1;
  }
  return { added, missing: false, path: absPath };
}

function marketplaceEntry() {
  return {
    name: DEFAULT_PLUGIN_NAME,
    source: {
      source: "local",
      path: `./plugins/${DEFAULT_PLUGIN_NAME}`
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Productivity"
  };
}

function makeInstallScript() {
  return String.raw`param(
  [string]$WorkbenchRoot = "<WORKBENCH_ROOT>",
  [switch]$RunNpmInstall,
  [switch]$RunCodexInstall
)

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$HomeDir = [Environment]::GetFolderPath("UserProfile")
$PluginRoot = Join-Path $HomeDir "plugins\xinrui-ip-studio"
$SkillRoot = Join-Path $HomeDir ".codex\skills\xinrui-visual-production"
$MarketplacePath = Join-Path $HomeDir ".agents\plugins\marketplace.json"

New-Item -ItemType Directory -Force -Path $WorkbenchRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $PackageRoot "workbench\*") -Destination $WorkbenchRoot -Recurse -Force

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PluginRoot) | Out-Null
Copy-Item -LiteralPath (Join-Path $PackageRoot "plugins\xinrui-ip-studio") -Destination (Split-Path -Parent $PluginRoot) -Recurse -Force

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $SkillRoot) | Out-Null
Copy-Item -LiteralPath (Join-Path $PackageRoot "skills\xinrui-visual-production") -Destination (Split-Path -Parent $SkillRoot) -Recurse -Force

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $MarketplacePath) | Out-Null
if (Test-Path -LiteralPath $MarketplacePath) {
  $marketplace = Get-Content -LiteralPath $MarketplacePath -Raw | ConvertFrom-Json
} else {
  $marketplace = [pscustomobject]@{
    name = "personal"
    interface = [pscustomobject]@{ displayName = "Personal" }
    plugins = @()
  }
}

$entry = [pscustomobject]@{
  name = "xinrui-ip-studio"
  source = [pscustomobject]@{ source = "local"; path = "./plugins/xinrui-ip-studio" }
  policy = [pscustomobject]@{ installation = "AVAILABLE"; authentication = "ON_INSTALL" }
  category = "Productivity"
}
$marketplace.plugins = @($marketplace.plugins | Where-Object { $_.name -ne "xinrui-ip-studio" })
$marketplace.plugins += $entry
$marketplace | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $MarketplacePath -Encoding UTF8

if ($RunNpmInstall) {
  Push-Location $WorkbenchRoot
  npm install
  Pop-Location
}

if ($RunCodexInstall) {
  if (Get-Command codex -ErrorAction SilentlyContinue) {
    codex plugin add xinrui-ip-studio@personal
    codex plugin list
  } else {
    Write-Host "Codex CLI not found in PATH. Open Codex and install xinrui-ip-studio from Personal."
  }
}

Write-Host "Xinrui portable package restored."
Write-Host "Workbench: $WorkbenchRoot"
Write-Host "Plugin: $PluginRoot"
Write-Host "Skill: $SkillRoot"
Write-Host "Marketplace: $MarketplacePath"
Write-Host "Next: npm run sync, npm run server, then start a new Codex thread."
`;
}

function makeInstallGuide(manifest) {
  return [
    "# Xinrui Era Workbench Portable Install",
    "",
    "This package restores the local workbench, the Codex plugin source, and the standalone visual-production skill.",
    "",
    "## Restore",
    "",
    "```powershell",
    "Set-ExecutionPolicy -Scope Process Bypass",
    ".\\install-xinrui-portable.ps1 -RunNpmInstall -RunCodexInstall",
    "```",
    "",
    "If the workbench path changed, pass a target path:",
    "",
    "```powershell",
    ".\\install-xinrui-portable.ps1 -WorkbenchRoot \"D:\\Xinrui\\game-workbench\" -RunNpmInstall -RunCodexInstall",
    "```",
    "",
    "## After Restore",
    "",
    "1. Check `config/default.json` and update `sourceRoot` if the IP material library lives on a different drive.",
    "2. Re-enter private API keys in `.env`; this package includes `.env.example` only.",
    "3. Run `npm run sync` to rebuild local indexes if the source material path changed.",
    "4. Run `npm run server` and open `http://127.0.0.1:8787`.",
    "5. Start a new Codex thread so the refreshed plugin and skill are loaded.",
    "",
    "## Contents",
    "",
    `- Bundle id: ${manifest.bundleId}`,
    `- Created at: ${manifest.createdAt}`,
    `- Plugin version: ${manifest.plugin?.version || "unknown"}`,
    `- Source material included: ${manifest.options.includeSourceMaterial ? "yes" : "no"}`,
    `- File count: ${manifest.summary.fileCount}`,
    `- Payload size: ${manifest.summary.payloadSizeLabel}`,
    "",
    "The original IP material library can be very large. By default it is referenced in the manifest rather than embedded in the archive. Rebuild with `--include-source` only when you really want a full source-material backup.",
    ""
  ].join("\n");
}

function buildBaseManifest(options) {
  const config = loadConfig();
  const pluginManifestPath = path.join(PROJECT_ROOT, "codex-plugin", DEFAULT_PLUGIN_NAME, ".codex-plugin", "plugin.json");
  const plugin = readJsonIfExists(pluginManifestPath, {});
  const bundleStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return {
    standard: "xinrui-portable-bundle-v1",
    bundleId: `xinrui-ip-studio-portable-${bundleStamp}`,
    createdAt: nowIso(),
    projectRoot: PROJECT_ROOT,
    sourceRoot: config.sourceRoot,
    databasePath: config.databasePath,
    options,
    plugin: {
      name: plugin.name || DEFAULT_PLUGIN_NAME,
      version: plugin.version || "unknown",
      description: plugin.description || ""
    },
    codex: {
      marketplacePath: path.join(os.homedir(), ".agents", "plugins", "marketplace.json"),
      pluginSourcePath: path.join(os.homedir(), "plugins", DEFAULT_PLUGIN_NAME),
      skillPath: path.join(os.homedir(), ".codex", "skills", DEFAULT_SKILL_NAME)
    },
    restore: {
      node: "Install Node.js 22+.",
      workbench: "Copy workbench/ to the target workbench root.",
      plugin: "Copy plugins/xinrui-ip-studio to %USERPROFILE%/plugins/xinrui-ip-studio.",
      skill: "Copy skills/xinrui-visual-production to %USERPROFILE%/.codex/skills/xinrui-visual-production.",
      marketplace: "Ensure personal marketplace contains ./plugins/xinrui-ip-studio, then run codex plugin add xinrui-ip-studio@personal.",
      service: "Run npm install, npm run sync, npm run server."
    },
    platformSwitching: {
      rule: "Keep the Xinrui workflow and change only the image/video backend.",
      imageBackends: ["Codex native image generation", "OpenAI Images", "ComfyUI img2img workflow"],
      videoBackends: ["Seedance 2.0/2.5 handoff", "After Effects source project", "Premiere rough cut"],
      privateKeys: ".env is intentionally excluded; recreate it from .env.example."
    },
    entries: [],
    missing: [],
    summary: {
      fileCount: 0,
      payloadSizeBytes: 0,
      payloadSizeLabel: "0 B"
    }
  };
}

export function createPortablePackagePlan(input = {}) {
  const includeSourceMaterial = Boolean(input.includeSourceMaterial || input.includeSource);
  const includeOutputReferences = input.includeOutputReferences !== false;
  const manifest = buildBaseManifest({ includeSourceMaterial, includeOutputReferences, dryRun: true });
  manifest.packageRoot = PACKAGE_ROOT;
  manifest.archiveName = `${manifest.bundleId}.zip`;
  manifest.defaultIncludes = [
    "workbench/src",
    "workbench/public",
    "workbench/config",
    "workbench/docs",
    "workbench/codex-plugin/xinrui-ip-studio",
    "workbench/data/xinrui-ip-agent.sqlite*",
    "plugins/xinrui-ip-studio",
    "skills/xinrui-visual-production",
    "install-xinrui-portable.ps1",
    "INSTALL.md"
  ];
  manifest.optionalIncludes = [
    {
      flag: "--include-source",
      path: manifest.sourceRoot,
      note: "Full IP source material library; large and usually better backed up separately."
    }
  ];
  return manifest;
}

export async function createPortablePackage(input = {}) {
  const includeSourceMaterial = Boolean(input.includeSourceMaterial || input.includeSource);
  const includeOutputReferences = input.includeOutputReferences !== false;
  const writeZip = input.writeZip !== false;
  const manifest = buildBaseManifest({ includeSourceMaterial, includeOutputReferences, writeZip });
  const bundleDir = path.join(PACKAGE_ROOT, manifest.bundleId);
  const archivePath = path.join(PACKAGE_ROOT, `${manifest.bundleId}.zip`);
  const zip = new JSZip();
  const files = [];
  ensureDir(PACKAGE_ROOT);

  const add = (absPath, packagePath) => {
    const result = addPath(zip, files, absPath, packagePath);
    manifest.entries.push({ ...result, packagePath: posixPath(packagePath) });
    if (result.missing) manifest.missing.push(absPath);
  };

  const rootFiles = [
    "package.json",
    "package-lock.json",
    "README.md",
    ".env.example",
    "video-spec.md"
  ];
  for (const fileName of rootFiles) add(path.join(PROJECT_ROOT, fileName), path.join("workbench", fileName));

  for (const dirName of ["src", "public", "config", "docs", "codex-plugin"]) {
    add(path.join(PROJECT_ROOT, dirName), path.join("workbench", dirName));
  }

  for (const databaseFile of [
    { source: manifest.databasePath, target: "xinrui-ip-agent.sqlite" },
    { source: `${manifest.databasePath}-wal`, target: "xinrui-ip-agent.sqlite-wal" },
    { source: `${manifest.databasePath}-shm`, target: "xinrui-ip-agent.sqlite-shm" }
  ]) {
    add(databaseFile.source, path.join("workbench", "data", databaseFile.target));
  }

  if (includeOutputReferences) {
    add(path.join(OUTPUT_ROOT, "external-references", "pending"), path.join("workbench", "output", "external-references", "pending"));
    add(path.join(OUTPUT_ROOT, "image-reference-tasks"), path.join("workbench", "output", "image-reference-tasks"));
    add(path.join(OUTPUT_ROOT, "image-generation-tasks"), path.join("workbench", "output", "image-generation-tasks"));
  }

  add(path.join(os.homedir(), "plugins", DEFAULT_PLUGIN_NAME), path.join("plugins", DEFAULT_PLUGIN_NAME));
  add(path.join(os.homedir(), ".codex", "skills", DEFAULT_SKILL_NAME), path.join("skills", DEFAULT_SKILL_NAME));

  if (includeSourceMaterial) {
    add(manifest.sourceRoot, path.join("source-material", "xinrui-ip-library"));
  }

  const marketplace = {
    name: "personal",
    interface: { displayName: "Personal" },
    plugins: [marketplaceEntry()]
  };
  const marketplaceBuffer = Buffer.from(`${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
  zip.file("codex-personal-marketplace-snippet.json", marketplaceBuffer);
  files.push(fileEntry("generated:codex-personal-marketplace-snippet.json", "codex-personal-marketplace-snippet.json", marketplaceBuffer));

  const installScriptBuffer = Buffer.from(makeInstallScript(), "utf8");
  zip.file("install-xinrui-portable.ps1", installScriptBuffer);
  files.push(fileEntry("generated:install-xinrui-portable.ps1", "install-xinrui-portable.ps1", installScriptBuffer));

  const updateSummary = () => {
    manifest.summary.fileCount = files.length;
    manifest.summary.payloadSizeBytes = files.reduce((sum, item) => sum + item.sizeBytes, 0);
    manifest.summary.payloadSizeLabel = formatBytes(manifest.summary.payloadSizeBytes);
  };

  updateSummary();
  let installGuideBuffer = Buffer.from(makeInstallGuide(manifest), "utf8");
  zip.file("INSTALL.md", installGuideBuffer);
  files.push(fileEntry("generated:INSTALL.md", "INSTALL.md", installGuideBuffer));
  updateSummary();
  installGuideBuffer = Buffer.from(makeInstallGuide(manifest), "utf8");
  zip.file("INSTALL.md", installGuideBuffer);
  files[files.length - 1] = fileEntry("generated:INSTALL.md", "INSTALL.md", installGuideBuffer);
  updateSummary();
  manifest.files = files;

  const manifestBuffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  zip.file("portable-manifest.json", manifestBuffer);

  if (fs.existsSync(bundleDir)) fs.rmSync(bundleDir, { recursive: true, force: true });
  ensureDir(bundleDir);
  for (const item of files) {
    if (String(item.sourcePath).startsWith("generated:")) continue;
    const targetPath = path.join(bundleDir, item.packagePath);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(item.sourcePath, targetPath);
  }
  fs.writeFileSync(path.join(bundleDir, "codex-personal-marketplace-snippet.json"), marketplaceBuffer);
  fs.writeFileSync(path.join(bundleDir, "portable-manifest.json"), manifestBuffer);
  fs.writeFileSync(path.join(bundleDir, "INSTALL.md"), installGuideBuffer);
  fs.writeFileSync(path.join(bundleDir, "install-xinrui-portable.ps1"), installScriptBuffer);

  let zipSizeBytes = 0;
  if (writeZip) {
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(archivePath, zipBuffer);
    zipSizeBytes = zipBuffer.length;
  }

  return {
    ...manifest,
    packageRoot: PACKAGE_ROOT,
    bundleDir,
    archivePath: writeZip ? archivePath : null,
    archiveSizeBytes: zipSizeBytes,
    archiveSizeLabel: formatBytes(zipSizeBytes),
    files: [
      path.join(bundleDir, "portable-manifest.json"),
      path.join(bundleDir, "INSTALL.md"),
      path.join(bundleDir, "install-xinrui-portable.ps1"),
      ...(writeZip ? [archivePath] : [])
    ]
  };
}
