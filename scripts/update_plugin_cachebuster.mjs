import fs from "node:fs";
import path from "node:path";

const roots = process.argv.slice(2).map((item) => path.resolve(item));
if (!roots.length) throw new Error("Pass one or more plugin roots.");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "-");
const versions = [];

for (const root of roots) {
  const manifestPath = path.join(root, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const base = String(manifest.version || "0.1.0").split("+")[0];
  manifest.version = `${base}+codex.local-${stamp}`;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  versions.push({ name: manifest.name, version: manifest.version, manifestPath });
}
console.log(JSON.stringify({ updated: versions }, null, 2));
