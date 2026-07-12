import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv.slice(2).map((item) => path.resolve(item));
const pluginRoots = requested.length
  ? requested
  : fs.readdirSync(path.join(root, "codex-plugin"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, "codex-plugin", entry.name));
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const errors = [];

for (const pluginRoot of pluginRoots) {
  const manifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push(`${pluginRoot}: missing .codex-plugin/plugin.json`);
    continue;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`${manifestPath}: invalid JSON (${error.message})`);
    continue;
  }
  const folderName = path.basename(pluginRoot);
  if (manifest.name !== folderName) errors.push(`${manifestPath}: name must match folder ${folderName}`);
  if (!semver.test(String(manifest.version || ""))) errors.push(`${manifestPath}: invalid semver ${manifest.version || "<missing>"}`);
  if (!manifest.description || !manifest.author?.name) errors.push(`${manifestPath}: description and author.name are required`);
  if (!manifest.interface?.displayName || !manifest.interface?.shortDescription || !manifest.interface?.longDescription) {
    errors.push(`${manifestPath}: interface displayName, shortDescription and longDescription are required`);
  }
  if ((manifest.interface?.defaultPrompt || []).length > 3) errors.push(`${manifestPath}: defaultPrompt supports at most 3 entries`);
  if (JSON.stringify(manifest).includes("[TODO:")) errors.push(`${manifestPath}: TODO placeholder found`);

  const skillRoot = path.join(pluginRoot, "skills");
  if (!fs.existsSync(skillRoot)) {
    errors.push(`${pluginRoot}: skills directory is missing`);
    continue;
  }
  const skillFiles = [];
  for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillRoot, entry.name, "SKILL.md");
    if (fs.existsSync(skillPath)) skillFiles.push(skillPath);
  }
  if (!skillFiles.length) errors.push(`${pluginRoot}: no SKILL.md found`);
  for (const skillPath of skillFiles) {
    const text = fs.readFileSync(skillPath, "utf8");
    if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(text)) errors.push(`${skillPath}: YAML frontmatter is missing`);
    if (!/^name:\s*[^\r\n]+/m.test(text) || !/^description:\s*[^\r\n]+/m.test(text)) {
      errors.push(`${skillPath}: frontmatter name and description are required`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, plugins: pluginRoots.map((item) => path.basename(item)) }, null, 2));
