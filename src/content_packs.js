import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getProjectRoot } from "./config.js";
import { ensureDir, nowIso } from "./utils.js";

const CONTENT_PACKS_ROOT = path.join(getProjectRoot(), "content-packs");

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringify(value) {
  return JSON.stringify(value ?? null);
}

function safeId(value, fallbackPrefix = "workspace") {
  const normalized = compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || `${fallbackPrefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function resolvePackSourceRoot(manifest) {
  const envName = compact(manifest.sourceRootEnv);
  const configured = envName ? process.env[envName] : "";
  const sourceRoot = compact(configured || manifest.sourceRoot);
  if (!sourceRoot) return "";
  return path.isAbsolute(sourceRoot) ? sourceRoot : path.resolve(getProjectRoot(), sourceRoot);
}

function normalizeManifest(manifest, manifestPath) {
  const id = safeId(manifest.id || path.basename(path.dirname(manifestPath)), "pack");
  return {
    ...manifest,
    id,
    name: compact(manifest.name || id),
    version: compact(manifest.version || "0.1.0"),
    kind: compact(manifest.kind || "generic"),
    visibility: compact(manifest.visibility || "private"),
    canonMode: compact(manifest.canonMode || "project"),
    manifestPath,
    sourceRoot: resolvePackSourceRoot(manifest),
    sourceRootExists: Boolean(resolvePackSourceRoot(manifest) && fs.existsSync(resolvePackSourceRoot(manifest)))
  };
}

export function discoverContentPacks(options = {}) {
  ensureDir(CONTENT_PACKS_ROOT);
  const packs = [];
  for (const entry of fs.readdirSync(CONTENT_PACKS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(CONTENT_PACKS_ROOT, entry.name, "content-pack.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      packs.push(normalizeManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")), manifestPath));
    } catch (error) {
      packs.push({
        id: entry.name,
        name: entry.name,
        version: "invalid",
        kind: "invalid",
        visibility: "private",
        canonMode: "project",
        manifestPath,
        sourceRoot: "",
        sourceRootExists: false,
        status: "invalid",
        error: error.message
      });
    }
  }
  const filtered = options.edition === "generic"
    ? packs.filter((pack) => pack.kind === "generic")
    : packs;
  return filtered.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function syncContentPacks(db, options = {}) {
  const now = nowIso();
  const packs = discoverContentPacks(options);
  if (options.edition === "generic") {
    db.prepare("DELETE FROM account_profiles WHERE workspace_id IN (SELECT id FROM workspaces WHERE content_pack_id != 'creator-generic')").run();
    db.prepare("DELETE FROM workspaces WHERE content_pack_id != 'creator-generic'").run();
    db.prepare("DELETE FROM content_packs WHERE id != 'creator-generic'").run();
  }
  const upsert = db.prepare(`
    INSERT INTO content_packs (
      id, name, version, kind, manifest_path, source_root, canon_mode,
      visibility, status, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      version = excluded.version,
      kind = excluded.kind,
      manifest_path = excluded.manifest_path,
      source_root = excluded.source_root,
      canon_mode = excluded.canon_mode,
      visibility = excluded.visibility,
      status = excluded.status,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `);
  const upsertWorkspace = db.prepare(`
    INSERT INTO workspaces (
      id, name, mode, content_pack_id, root_path, status, settings_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      mode = excluded.mode,
      content_pack_id = excluded.content_pack_id,
      root_path = excluded.root_path,
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at
  `);
  const upsertProfile = db.prepare(`
    INSERT INTO account_profiles (
      id, workspace_id, platform, account_name, profile_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      platform = excluded.platform,
      account_name = excluded.account_name,
      profile_json = excluded.profile_json,
      status = 'active',
      updated_at = excluded.updated_at
  `);

  for (const pack of packs) {
    const status = pack.status === "invalid" ? "invalid" : "active";
    upsert.run(
      pack.id,
      pack.name,
      pack.version,
      pack.kind,
      pack.manifestPath,
      pack.sourceRoot,
      pack.canonMode,
      pack.visibility,
      status,
      stringify({
        description: pack.description || "",
        capabilities: pack.capabilities || [],
        imagePolicy: pack.imagePolicy || {},
        publishingProfiles: pack.publishingProfiles || [],
        sourceRootEnv: pack.sourceRootEnv || "",
        sourceRootExists: pack.sourceRootExists,
        error: pack.error || ""
      }),
      now,
      now
    );

    const defaultWorkspace = pack.defaultWorkspace;
    if (defaultWorkspace?.id) {
      const workspaceId = safeId(defaultWorkspace.id);
      upsertWorkspace.run(
        workspaceId,
        compact(defaultWorkspace.name || pack.name),
        compact(defaultWorkspace.mode || pack.kind || "generic"),
        pack.id,
        compact(defaultWorkspace.rootPath || ""),
        stringify(defaultWorkspace.settings || {}),
        now,
        now
      );
      for (const profile of pack.publishingProfiles || []) {
        const platform = compact(profile.platform || "generic");
        const accountName = compact(profile.accountName || profile.name || "未命名账号");
        upsertProfile.run(
          safeId(`${workspaceId}-${platform}-${accountName}`, "account"),
          workspaceId,
          platform,
          accountName,
          stringify(profile),
          now,
          now
        );
      }
    }
  }
  return listContentPacks(db);
}

function hydratePack(row) {
  if (!row) return null;
  const metadata = parseJson(row.metadata_json, {});
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    kind: row.kind,
    manifestPath: row.manifest_path,
    sourceRoot: row.source_root || "",
    sourceRootExists: Boolean(row.source_root && fs.existsSync(row.source_root)),
    canonMode: row.canon_mode,
    visibility: row.visibility,
    status: row.status,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function hydrateWorkspace(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    mode: row.mode,
    contentPackId: row.content_pack_id || "",
    rootPath: row.root_path || "",
    status: row.status,
    settings: parseJson(row.settings_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listContentPacks(db) {
  return db.prepare("SELECT * FROM content_packs ORDER BY name COLLATE NOCASE").all().map(hydratePack);
}

export function getContentPack(db, id) {
  return hydratePack(db.prepare("SELECT * FROM content_packs WHERE id = ?").get(id));
}

export function listWorkspaces(db) {
  return db.prepare("SELECT * FROM workspaces WHERE status != 'deleted' ORDER BY updated_at DESC").all().map(hydrateWorkspace);
}

export function getWorkspace(db, id) {
  return hydrateWorkspace(db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id));
}

export function createWorkspace(db, input = {}) {
  const now = nowIso();
  const contentPackId = compact(input.contentPackId || input.packId || "creator-generic");
  const pack = getContentPack(db, contentPackId);
  if (!pack) throw new Error(`content pack not found: ${contentPackId}`);
  const name = compact(input.name || input.title || `${pack.name}工作区`);
  const id = safeId(input.id || input.slug || name);
  db.prepare(`
    INSERT INTO workspaces (
      id, name, mode, content_pack_id, root_path, status, settings_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      mode = excluded.mode,
      content_pack_id = excluded.content_pack_id,
      root_path = excluded.root_path,
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at
  `).run(
    id,
    name,
    compact(input.mode || pack.kind || "generic"),
    pack.id,
    compact(input.rootPath || ""),
    stringify(input.settings || {}),
    now,
    now
  );
  return getWorkspace(db, id);
}

export function upsertAccountProfile(db, input = {}) {
  const now = nowIso();
  const workspaceId = compact(input.workspaceId || "");
  if (workspaceId && !getWorkspace(db, workspaceId)) throw new Error(`workspace not found: ${workspaceId}`);
  const platform = compact(input.platform || "generic");
  const accountName = compact(input.accountName || input.name || "未命名账号");
  const id = safeId(input.id || `${workspaceId || "global"}-${platform}-${accountName}`, "account");
  db.prepare(`
    INSERT INTO account_profiles (
      id, workspace_id, platform, account_name, profile_json, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      platform = excluded.platform,
      account_name = excluded.account_name,
      profile_json = excluded.profile_json,
      status = 'active',
      updated_at = excluded.updated_at
  `).run(id, workspaceId || null, platform, accountName, stringify(input.profile || {}), now, now);
  return getAccountProfile(db, id);
}

export function getAccountProfile(db, id) {
  const row = db.prepare("SELECT * FROM account_profiles WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || "",
    platform: row.platform,
    accountName: row.account_name,
    profile: parseJson(row.profile_json, {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listAccountProfiles(db, workspaceId = "") {
  const rows = workspaceId
    ? db.prepare("SELECT * FROM account_profiles WHERE workspace_id = ? AND status != 'deleted' ORDER BY updated_at DESC").all(workspaceId)
    : db.prepare("SELECT * FROM account_profiles WHERE status != 'deleted' ORDER BY updated_at DESC").all();
  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id || "",
    platform: row.platform,
    accountName: row.account_name,
    profile: parseJson(row.profile_json, {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export function resolveWorkspaceContext(db, input = {}) {
  const workspaceId = compact(input.workspaceId || (input.contentPackId === "xinrui-private" ? "xinrui-main" : "creator-default"));
  const workspace = getWorkspace(db, workspaceId) || listWorkspaces(db)[0] || null;
  const contentPack = workspace?.contentPackId ? getContentPack(db, workspace.contentPackId) : null;
  const accountProfile = input.accountProfileId ? getAccountProfile(db, input.accountProfileId) : null;
  return { workspace, contentPack, accountProfile };
}

export function getContentPackRoot() {
  return CONTENT_PACKS_ROOT;
}
