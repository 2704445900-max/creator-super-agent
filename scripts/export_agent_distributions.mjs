import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const exportRoot = path.join(root, "output", "distributions", stamp);
const coreRoot = path.join(exportRoot, "creator-super-agent-core");
const privateRoot = path.join(exportRoot, "xinrui-ip-studio-private-overlay");

function copy(relativeSource, destinationRoot, relativeTarget = relativeSource) {
  const source = path.join(root, relativeSource);
  if (!fs.existsSync(source)) return;
  const target = path.join(destinationRoot, relativeTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  copyTree(source, target);
}

function copyTree(source, target) {
  const stat = fs.statSync(source);
  if (stat.isFile()) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    return;
  }
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function sanitizePublicCore(directory) {
  const textExtensions = new Set([".js", ".mjs", ".json", ".md", ".ps1", ".yaml", ".yml", ".txt", ".example", ""]);
  const replacements = [
    [/F:\\\\小说 文章\\\\新锐纪元企划/g, "<XINRUI_SOURCE_ROOT>"],
    [/<XINRUI_SOURCE_ROOT>/g, "<XINRUI_SOURCE_ROOT>"],
    [/F:\\\\文档\\\\游戏搭建/g, "<WORKBENCH_ROOT>"],
    [/<WORKBENCH_ROOT>/g, "<WORKBENCH_ROOT>"],
    [/C:\\\\Users\\\\Administrator/g, "<USER_HOME>"],
    [/<USER_HOME>/g, "<USER_HOME>"],
    [/D:\\\\Adobe/g, "<ADOBE_ROOT>"],
    [/<ADOBE_ROOT>/g, "<ADOBE_ROOT>"],
    [/当前项目主角是谁？/g, "当前项目主角是谁？"]
  ];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
        let text = fs.readFileSync(absolute, "utf8");
        for (const [pattern, replacement] of replacements) text = text.replace(pattern, replacement);
        fs.writeFileSync(absolute, text, "utf8");
      }
    }
  }
  walk(directory);
  const configPath = path.join(directory, "config", "default.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config.sourceRoot = "content-packs/creator-generic/source";
    config.databasePath = "data/creator-agent.sqlite";
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }
}

for (const item of ["src", "public", "config", "scripts", "package.json", "package-lock.json", ".env.example", ".gitignore", ".github"]) copy(item, coreRoot);
copy("content-packs/creator-generic", coreRoot);
copy("codex-plugin/creator-super-agent", coreRoot);
copy("docs/AGENT_USAGE.md", coreRoot);
copy("docs/CONTENT_PACK_SPEC.md", coreRoot);
fs.writeFileSync(path.join(coreRoot, "EDITION.env.example"), "CREATOR_EDITION=generic\n", "utf8");
fs.writeFileSync(path.join(coreRoot, "DISTRIBUTION.md"), [
  "# Creator Super Agent Core",
  "",
  "Generic functional edition. It does not include the Xinrui private content pack or private source files.",
  "Set `CREATOR_EDITION=generic`, configure cloud model credentials, install dependencies, and start the workbench."
].join("\n"), "utf8");
sanitizePublicCore(coreRoot);

copy("content-packs/xinrui-private", privateRoot);
copy("codex-plugin/xinrui-ip-studio", privateRoot);
copy("docs/CONTENT_PACK_SPEC.md", privateRoot);
copy("docs/AGENT_USAGE.md", privateRoot);
const localManifest = path.join(root, "output", "content-pack-manifests", "xinrui-private-manifest.json");
if (fs.existsSync(localManifest)) copy(path.relative(root, localManifest), privateRoot, "resource-manifest.json");
fs.writeFileSync(path.join(privateRoot, "DISTRIBUTION.md"), [
  "# Xinrui Private Overlay",
  "",
  "Install this overlay only in an approved private environment on top of the core workbench.",
  "The raw IP library is intentionally excluded. Review rights, then transfer approved assets through private storage, Git LFS, or split release archives."
].join("\n"), "utf8");

console.log(JSON.stringify({ exportRoot, coreRoot, privateRoot }, null, 2));
