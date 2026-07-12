import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, "config", "default.json");

function normalizeWindowsPath(value) {
  if (!value) return value;
  return value.replace(/^\/([A-Za-z]:\/)/, "$1").replaceAll("/", "\\");
}

function loadDotEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readDefaultConfig() {
  return JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8"));
}

function resolveProjectPath(value, fallback) {
  const normalized = normalizeWindowsPath(value || fallback);
  return path.isAbsolute(normalized) ? normalized : path.resolve(PROJECT_ROOT, normalized);
}

export function getProjectRoot() {
  return PROJECT_ROOT;
}

export function getOutputRoot() {
  loadDotEnv();
  return resolveProjectPath(process.env.CREATOR_OUTPUT_ROOT || process.env.XINRUI_OUTPUT_ROOT, path.join(PROJECT_ROOT, "output"));
}

export function getSourceRoot() {
  loadDotEnv();
  const config = readDefaultConfig();
  const requestedEdition = process.env.CREATOR_EDITION || config.edition || "combined";
  const genericDefault = path.join(PROJECT_ROOT, "content-packs", "creator-generic", "source");
  const fallback = requestedEdition === "generic" ? genericDefault : config.sourceRoot;
  return resolveProjectPath(process.env.CREATOR_SOURCE_ROOT || process.env.XINRUI_SOURCE_ROOT, fallback);
}

export function loadConfig(overrides = {}) {
  loadDotEnv();
  const config = readDefaultConfig();
  const merged = { ...config, ...overrides };

  const requestedEdition = process.env.CREATOR_EDITION || config.edition || "combined";
  const genericEdition = requestedEdition === "generic";
  const genericSource = path.join(PROJECT_ROOT, "content-packs", "creator-generic", "source");
  const genericDatabase = path.join(PROJECT_ROOT, "data", "creator-agent.sqlite");
  merged.edition = genericEdition ? "generic" : requestedEdition;
  merged.sourceRoot = resolveProjectPath(
    process.env.CREATOR_SOURCE_ROOT || process.env.XINRUI_SOURCE_ROOT,
    genericEdition ? genericSource : merged.sourceRoot
  );
  merged.databasePath = resolveProjectPath(
    process.env.CREATOR_DATABASE_PATH || process.env.XINRUI_DATABASE_PATH,
    genericEdition ? genericDatabase : merged.databasePath
  );
  merged.outputRoot = getOutputRoot();
  merged.testMode = process.env.XINRUI_TEST_MODE === "1";

  merged.chunkSize = Number(merged.chunkSize || 900);
  merged.chunkOverlap = Number(merged.chunkOverlap || 120);
  merged.hashMediaFiles = Boolean(merged.hashMediaFiles);
  return merged;
}
