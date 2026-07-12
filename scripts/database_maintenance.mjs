#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const applyChanges = process.argv.includes("--apply");
const checkOnly = process.argv.includes("--check") || !applyChanges;

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function scalar(db, sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return row ? Object.values(row)[0] : null;
}

function collectStats(db) {
  const countTables = [
    "files",
    "documents",
    "chunks",
    "entities",
    "entity_relations",
    "entity_mentions",
    "assets",
    "asset_profiles",
    "canon_claims",
    "creative_projects",
    "storyboard_shots",
    "setting_proposals",
    "search_index",
    "sync_runs"
  ];
  const counts = Object.fromEntries(
    countTables.map((table) => [table, scalar(db, `SELECT COUNT(*) FROM "${table}"`)])
  );

  return {
    quickCheck: scalar(db, "PRAGMA quick_check"),
    integrityCheck: scalar(db, "PRAGMA integrity_check"),
    foreignKeyIssues: db.prepare("PRAGMA foreign_key_check").all().length,
    counts,
    fileStatuses: db.prepare("SELECT status, COUNT(*) AS count FROM files GROUP BY status ORDER BY status").all(),
    lastSync: db.prepare(`
      SELECT id, source_root, started_at, finished_at, scanned_files,
             inserted_files, updated_files, unchanged_files, deleted_files,
             extracted_documents, errors
      FROM sync_runs
      ORDER BY id DESC
      LIMIT 1
    `).get() || null
  };
}

function assertHealthy(stats, stage) {
  if (stats.quickCheck !== "ok" || stats.integrityCheck !== "ok" || stats.foreignKeyIssues !== 0) {
    throw new Error(`Database ${stage} check failed: ${JSON.stringify(stats)}`);
  }
}

function backupDatabase(db, databasePath) {
  const backupDir = path.join(projectRoot, "backups", "database-maintenance", timestamp());
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, path.basename(databasePath));
  const escaped = backupPath.replaceAll("'", "''");
  db.exec(`VACUUM INTO '${escaped}'`);
  return backupPath;
}

function rebuildActiveSearchIndex(db) {
  db.exec("DELETE FROM search_index");
  db.exec(`
    INSERT INTO search_index (rowid, kind, title, body, rel_path)
    SELECT c.id, 'chunk', d.title, c.text, f.rel_path
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    JOIN files f ON f.id = c.file_id
    WHERE f.status = 'active'
  `);
}

function runMaintenance(db) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("BEGIN IMMEDIATE");
  try {
    const deletedFiles = scalar(db, "SELECT COUNT(*) FROM files WHERE status = 'deleted'");
    db.exec("DELETE FROM files WHERE status = 'deleted'");
    rebuildActiveSearchIndex(db);
    db.exec("COMMIT");
    return { deletedFiles };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const config = loadConfig();
const databasePath = path.resolve(config.databasePath);
const db = new DatabaseSync(databasePath);

try {
  db.exec("PRAGMA foreign_keys = ON");
  const before = collectStats(db);
  assertHealthy(before, "pre-maintenance");

  if (checkOnly) {
    console.log(JSON.stringify({ mode: "check", databasePath, stats: before }, null, 2));
    process.exitCode = 0;
  } else {
    const backupPath = backupDatabase(db, databasePath);
    const changes = runMaintenance(db);
    db.exec("ANALYZE");
    db.exec("PRAGMA optimize");
    db.exec("VACUUM");
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");

    const after = collectStats(db);
    assertHealthy(after, "post-maintenance");
    console.log(JSON.stringify({
      mode: "apply",
      databasePath,
      backupPath,
      changes,
      before,
      after
    }, null, 2));
  }
} finally {
  db.close();
}
