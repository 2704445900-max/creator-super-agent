import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { getOutputRoot, getProjectRoot } from "./config.js";
import { nowIso } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();
const CONFIG_PATH = path.join(PROJECT_ROOT, "config", "cloud-library.json");
const RIGHTS_PATH = path.join(PROJECT_ROOT, "config", "cloud-library-rights.json");
const SYNC_SCRIPT = path.join(PROJECT_ROOT, "scripts", "sync_cloud_library.mjs");

function safeReadJson(filePath, fallback = null) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return JSON.parse(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text);
  } catch {
    return fallback;
  }
}

function cloudConfig() {
  const config = safeReadJson(CONFIG_PATH, {});
  return {
    ...config,
    enabled: process.env.CLOUD_LIBRARY_ENABLED
      ? process.env.CLOUD_LIBRARY_ENABLED !== "0"
      : config.enabled === true,
    owner: process.env.CLOUD_LIBRARY_OWNER || config.owner || "",
    branch: process.env.CLOUD_LIBRARY_BRANCH || config.branch || "main",
    metadataRepository: process.env.CLOUD_LIBRARY_METADATA_REPO || config.metadataRepository || "",
    assetRepository: process.env.CLOUD_LIBRARY_ASSET_REPO || config.assetRepository || "",
    syncIntervalMinutes: Number(process.env.CLOUD_LIBRARY_SYNC_MINUTES || config.syncIntervalMinutes || 15)
  };
}

function scheduledTaskStatus(taskName = "XinruiCloudLibrarySync") {
  const result = spawnSync("schtasks.exe", ["/Query", "/TN", taskName, "/FO", "LIST"], {
    windowsHide: true,
    encoding: "utf8"
  });
  const startupPath = path.join(
    process.env.APPDATA || "",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    "XinruiCloudLibrarySync.lnk"
  );
  const loopState = safeReadJson(path.join(getOutputRoot(), "cloud-sync", "loop-state.json"), null);
  let loopRunning = false;
  if (loopState?.pid) {
    try {
      process.kill(Number(loopState.pid), 0);
      loopRunning = true;
    } catch {
      loopRunning = false;
    }
  }
  const taskInstalled = result.status === 0;
  const startupInstalled = Boolean(process.env.APPDATA && fs.existsSync(startupPath));
  return {
    taskName,
    installed: taskInstalled || startupInstalled,
    mode: taskInstalled ? "task-scheduler" : startupInstalled ? "startup-loop" : "not-installed",
    running: taskInstalled ? null : loopRunning,
    startupPath: startupInstalled ? startupPath : "",
    loopState,
    detail: taskInstalled ? `${result.stdout || ""}`.trim().slice(0, 2000) : ""
  };
}

export function getCloudLibraryStatus() {
  const config = cloudConfig();
  const syncRoot = path.join(getOutputRoot(), "cloud-sync");
  const state = safeReadJson(path.join(syncRoot, "state.json"), null);
  const manifest = safeReadJson(
    path.join(getOutputRoot(), "content-pack-manifests", "xinrui-private-manifest.json"),
    null
  );
  const index = safeReadJson(path.join(syncRoot, "staging", "cloud-library-index.json"), null);
  const rights = safeReadJson(RIGHTS_PATH, {});
  const lockPath = path.join(syncRoot, "cloud-sync.lock");
  const running = fs.existsSync(lockPath);
  return {
    standard: "xinrui-cloud-library-status-v1",
    createdAt: nowIso(),
    enabled: config.enabled,
    mode: config.mode || "local-primary-cloud-mirror",
    provider: config.provider || "github",
    running,
    state,
    repositories: {
      metadata: {
        name: config.metadataRepository,
        private: true,
        url: config.owner && config.metadataRepository
          ? `https://github.com/${config.owner}/${config.metadataRepository}`
          : ""
      },
      assets: {
        name: config.assetRepository,
        private: true,
        gitLfs: true,
        url: config.owner && config.assetRepository
          ? `https://github.com/${config.owner}/${config.assetRepository}`
          : ""
      }
    },
    localManifest: manifest ? {
      generatedAt: manifest.generatedAt,
      files: manifest.summary?.files || 0,
      totalBytes: manifest.summary?.totalBytes || 0,
      approvedAssets: (manifest.files || []).filter((item) => item.cloudUpload === true).length
    } : null,
    cloudIndex: index ? {
      generatedAt: index.generatedAt,
      summary: index.summary
    } : null,
    rightsGate: {
      defaultRightsStatus: rights.defaultRightsStatus || "private-review-required",
      allowedUploadStatuses: rights.allowedUploadStatuses || [],
      explicitRules: Array.isArray(rights.rules) ? rights.rules.length : 0,
      rawAssetsBlockedByDefault: true
    },
    schedule: {
      intervalMinutes: config.syncIntervalMinutes,
      ...scheduledTaskStatus()
    },
    files: {
      configPath: CONFIG_PATH,
      rightsPath: RIGHTS_PATH,
      statePath: path.join(syncRoot, "state.json")
    }
  };
}

export function startCloudLibrarySync(input = {}) {
  const config = cloudConfig();
  if (!config.enabled) throw new Error("cloud library sync is disabled");
  if (!fs.existsSync(SYNC_SCRIPT)) throw new Error(`cloud sync script not found: ${SYNC_SCRIPT}`);
  const syncRoot = path.join(getOutputRoot(), "cloud-sync");
  const lockPath = path.join(syncRoot, "cloud-sync.lock");
  if (fs.existsSync(lockPath)) throw new Error("cloud library sync is already running");
  const logRoot = path.join(syncRoot, "logs");
  fs.mkdirSync(logRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(logRoot, `cloud-sync-api-${stamp}.log`);
  const logHandle = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, [
    "--no-warnings",
    SYNC_SCRIPT,
    "--push",
    ...(input.includeApprovedAssets === false ? [] : ["--assets"]),
    ...(input.skipDatabaseSync === true ? ["--skip-db-sync"] : [])
  ], {
    cwd: PROJECT_ROOT,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", logHandle, logHandle],
    env: { ...process.env }
  });
  child.unref();
  fs.closeSync(logHandle);
  return {
    standard: "xinrui-cloud-library-sync-start-v1",
    accepted: true,
    pid: child.pid,
    startedAt: nowIso(),
    logPath,
    statusEndpoint: "/api/cloud-library/status"
  };
}
