#!/usr/bin/env node
import { createPortablePackage } from "../src/portable_package.js";

function parseArgs(argv) {
  const options = {
    includeSourceMaterial: false,
    includeOutputReferences: true,
    writeZip: true
  };

  for (const arg of argv) {
    if (arg === "--include-source") options.includeSourceMaterial = true;
    if (arg === "--no-output-references") options.includeOutputReferences = false;
    if (arg === "--no-zip") options.writeZip = false;
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const result = await createPortablePackage(options);

console.log(JSON.stringify({
  standard: result.standard,
  bundleId: result.bundleId,
  archivePath: result.archivePath,
  archiveSizeLabel: result.archiveSizeLabel,
  packageRoot: result.packageRoot,
  bundleDir: result.bundleDir,
  sourceMaterialIncluded: result.options.includeSourceMaterial,
  outputReferencesIncluded: result.options.includeOutputReferences,
  fileCount: result.summary.fileCount,
  payloadSizeLabel: result.summary.payloadSizeLabel,
  missing: result.missing,
  files: result.files
}, null, 2));
