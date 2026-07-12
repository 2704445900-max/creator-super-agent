import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sources = process.argv.slice(2).map((item) => path.resolve(item));
if (!sources.length) throw new Error("Pass one or more plugin source roots.");
const home = os.homedir();
const pluginHome = path.join(home, "plugins");
const marketplacePath = path.join(home, ".agents", "plugins", "marketplace.json");
fs.mkdirSync(pluginHome, { recursive: true });
fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });

const marketplace = fs.existsSync(marketplacePath)
  ? JSON.parse(fs.readFileSync(marketplacePath, "utf8"))
  : { name: "personal", interface: { displayName: "Personal" }, plugins: [] };
marketplace.name ||= "personal";
marketplace.interface ||= { displayName: "Personal" };
marketplace.interface.displayName ||= "Personal";
marketplace.plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
const installed = [];

function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

for (const source of sources) {
  const manifestPath = path.join(source, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (path.basename(source) !== manifest.name) throw new Error(`Plugin folder/name mismatch: ${source}`);
  const target = path.resolve(pluginHome, manifest.name);
  if (!target.startsWith(path.resolve(pluginHome) + path.sep)) throw new Error(`Unsafe plugin target: ${target}`);
  copyTree(source, target);
  const entry = {
    name: manifest.name,
    source: { source: "local", path: `./plugins/${manifest.name}` },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: manifest.interface?.category || "Productivity"
  };
  const index = marketplace.plugins.findIndex((item) => item.name === manifest.name);
  if (index >= 0) marketplace.plugins[index] = entry;
  else marketplace.plugins.push(entry);
  installed.push({ name: manifest.name, version: manifest.version, target });
}

fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ marketplace: marketplace.name, marketplacePath, installed }, null, 2));
