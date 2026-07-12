import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function value(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}
const sourceRoot = path.resolve(value("--source", process.env.XINRUI_SOURCE_ROOT || "<XINRUI_SOURCE_ROOT>"));
const packId = value("--pack-id", "xinrui-private");
const outputPath = path.resolve(value("--out", path.join(projectRoot, "output", "content-pack-manifests", `${packId}-manifest.json`)));
const withHash = args.includes("--hash");
if (!fs.existsSync(sourceRoot)) throw new Error(`Source root not found: ${sourceRoot}`);

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

const files = [];
const errors = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const stat = fs.statSync(absolute);
      const relativePath = path.relative(sourceRoot, absolute).replaceAll("\\", "/");
      files.push({
        relativePath,
        category: relativePath.split("/")[0] || "root",
        extension: path.extname(entry.name).toLowerCase(),
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        rightsStatus: "private-review-required",
        sha256: null,
        absolute
      });
    } catch (error) {
      errors.push({ path: absolute, error: error.message });
    }
  }
}
walk(sourceRoot);
if (withHash) {
  for (const file of files) file.sha256 = await sha256(file.absolute);
}

const categories = {};
const extensions = {};
let totalBytes = 0;
for (const file of files) {
  totalBytes += file.sizeBytes;
  categories[file.category] ||= { files: 0, bytes: 0 };
  categories[file.category].files += 1;
  categories[file.category].bytes += file.sizeBytes;
  const ext = file.extension || "<none>";
  extensions[ext] ||= { files: 0, bytes: 0 };
  extensions[ext].files += 1;
  extensions[ext].bytes += file.sizeBytes;
  delete file.absolute;
}
const manifest = {
  schema: "creator-content-pack-resource-manifest-v1",
  packId,
  generatedAt: new Date().toISOString(),
  sourceRootHint: path.basename(sourceRoot),
  hashMode: withHash ? "sha256" : "none",
  defaultRightsStatus: "private-review-required",
  summary: { files: files.length, totalBytes, categories, extensions, errors: errors.length },
  files,
  errors
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, files: files.length, totalBytes, errors: errors.length, hashMode: manifest.hashMode }, null, 2));
