import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureDir, nowIso } from "./utils.js";

export function openDatabase(databasePath) {
  ensureDir(path.dirname(databasePath));
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY,
      source_root TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      scanned_files INTEGER DEFAULT 0,
      inserted_files INTEGER DEFAULT 0,
      updated_files INTEGER DEFAULT 0,
      unchanged_files INTEGER DEFAULT 0,
      deleted_files INTEGER DEFAULT 0,
      extracted_documents INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      root TEXT NOT NULL,
      abs_path TEXT NOT NULL UNIQUE,
      rel_path TEXT NOT NULL,
      name TEXT NOT NULL,
      ext TEXT NOT NULL,
      media_type TEXT NOT NULL,
      top_dir TEXT,
      sub_dir TEXT,
      asset_type TEXT,
      size_bytes INTEGER NOT NULL,
      mtime_ms INTEGER NOT NULL,
      sha256 TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      last_seen_run_id INTEGER,
      FOREIGN KEY(last_seen_run_id) REFERENCES sync_runs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
    CREATE INDEX IF NOT EXISTS idx_files_rel_path ON files(rel_path);
    CREATE INDEX IF NOT EXISTS idx_files_media_type ON files(media_type);
    CREATE INDEX IF NOT EXISTS idx_files_asset_type ON files(asset_type);

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL UNIQUE,
      doc_kind TEXT NOT NULL,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      text_chars INTEGER NOT NULL,
      extracted_at TEXT NOT NULL,
      summary TEXT,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY,
      document_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      text_chars INTEGER NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
      UNIQUE(document_id, chunk_index)
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON chunks(file_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);

    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      aliases_json TEXT,
      summary TEXT,
      details_json TEXT,
      source TEXT,
      confidence REAL DEFAULT 1.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(type, name)
    );

    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);

    CREATE TABLE IF NOT EXISTS entity_relations (
      id INTEGER PRIMARY KEY,
      source_entity_id INTEGER NOT NULL,
      relation_type TEXT NOT NULL,
      target_entity_id INTEGER NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(source_entity_id, relation_type, target_entity_id),
      FOREIGN KEY(source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY(target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entity_mentions (
      id INTEGER PRIMARY KEY,
      entity_id INTEGER NOT NULL,
      file_id INTEGER NOT NULL,
      document_id INTEGER,
      mention_count INTEGER NOT NULL,
      contexts_json TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(entity_id, file_id),
      FOREIGN KEY(entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_mentions_entity_id ON entity_mentions(entity_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_file_id ON entity_mentions(file_id);

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL UNIQUE,
      asset_type TEXT NOT NULL,
      title TEXT NOT NULL,
      linked_names_json TEXT,
      tags_json TEXT,
      status TEXT NOT NULL DEFAULT 'indexed',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);

    CREATE TABLE IF NOT EXISTS asset_profiles (
      id INTEGER PRIMARY KEY,
      file_id INTEGER NOT NULL UNIQUE,
      asset_id INTEGER,
      visual_kind TEXT NOT NULL,
      prompt_role TEXT NOT NULL,
      subject_names_json TEXT,
      prompt_tags_json TEXT,
      quality_flags_json TEXT,
      naming_score INTEGER NOT NULL DEFAULT 0,
      profile_json TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_asset_profiles_kind ON asset_profiles(visual_kind);
    CREATE INDEX IF NOT EXISTS idx_asset_profiles_role ON asset_profiles(prompt_role);
    CREATE INDEX IF NOT EXISTS idx_asset_profiles_score ON asset_profiles(naming_score);

    CREATE TABLE IF NOT EXISTS canon_claims (
      id INTEGER PRIMARY KEY,
      entity_id INTEGER,
      claim_type TEXT NOT NULL,
      claim_text TEXT NOT NULL,
      source_file_id INTEGER,
      source_document_id INTEGER,
      version_label TEXT NOT NULL DEFAULT 'current',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(entity_id) REFERENCES entities(id) ON DELETE SET NULL,
      FOREIGN KEY(source_file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY(source_document_id) REFERENCES documents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS creative_projects (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'storyboard',
      title TEXT NOT NULL,
      source_script TEXT NOT NULL,
      style_prompt TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      llm_used INTEGER NOT NULL DEFAULT 0,
      evidence_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_creative_projects_kind ON creative_projects(kind);
    CREATE INDEX IF NOT EXISTS idx_creative_projects_updated_at ON creative_projects(updated_at);

    CREATE TABLE IF NOT EXISTS storyboard_shots (
      id INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL,
      shot_index INTEGER NOT NULL,
      scene_text TEXT NOT NULL,
      camera TEXT,
      composition TEXT,
      character_action TEXT,
      visual_prompt TEXT NOT NULL,
      negative_prompt TEXT,
      characters_json TEXT,
      evidence_refs_json TEXT,
      status TEXT NOT NULL DEFAULT 'prompt_ready',
      image_asset_file_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, shot_index),
      FOREIGN KEY(project_id) REFERENCES creative_projects(id) ON DELETE CASCADE,
      FOREIGN KEY(image_asset_file_id) REFERENCES files(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_storyboard_shots_project_id ON storyboard_shots(project_id);

    CREATE TABLE IF NOT EXISTS setting_proposals (
      id INTEGER PRIMARY KEY,
      target_entity_id INTEGER,
      target_type TEXT,
      target_name TEXT NOT NULL,
      intent TEXT NOT NULL,
      proposal_title TEXT NOT NULL,
      rationale TEXT,
      original_summary TEXT,
      proposed_summary TEXT,
      original_details_json TEXT,
      proposed_details_json TEXT,
      evidence_json TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      applied_at TEXT,
      FOREIGN KEY(target_entity_id) REFERENCES entities(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_setting_proposals_status ON setting_proposals(status);
    CREATE INDEX IF NOT EXISTS idx_setting_proposals_target ON setting_proposals(target_name);

    CREATE TABLE IF NOT EXISTS content_packs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'generic',
      manifest_path TEXT NOT NULL,
      source_root TEXT,
      canon_mode TEXT NOT NULL DEFAULT 'project',
      visibility TEXT NOT NULL DEFAULT 'private',
      status TEXT NOT NULL DEFAULT 'active',
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_packs_kind ON content_packs(kind);
    CREATE INDEX IF NOT EXISTS idx_content_packs_status ON content_packs(status);

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'generic',
      content_pack_id TEXT,
      root_path TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      settings_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(content_pack_id) REFERENCES content_packs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_mode ON workspaces(mode);
    CREATE INDEX IF NOT EXISTS idx_workspaces_content_pack ON workspaces(content_pack_id);

    CREATE TABLE IF NOT EXISTS account_profiles (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      profile_json TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_account_profiles_workspace ON account_profiles(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_account_profiles_platform ON account_profiles(platform);

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      content_pack_id TEXT,
      account_profile_id TEXT,
      project_slug TEXT,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      current_step INTEGER NOT NULL DEFAULT 0,
      input_json TEXT NOT NULL,
      plan_json TEXT,
      state_json TEXT,
      policy_json TEXT,
      budget_cny REAL NOT NULL DEFAULT 0,
      spent_cny REAL NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
      FOREIGN KEY(content_pack_id) REFERENCES content_packs(id) ON DELETE SET NULL,
      FOREIGN KEY(account_profile_id) REFERENCES account_profiles(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_updated_at ON agent_runs(updated_at);

    CREATE TABLE IF NOT EXISTS agent_steps (
      id INTEGER PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      step_key TEXT NOT NULL,
      title TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      auto_level TEXT NOT NULL DEFAULT 'local_auto',
      status TEXT NOT NULL DEFAULT 'pending',
      attempt INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 2,
      input_json TEXT,
      output_json TEXT,
      error TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(run_id, step_index),
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_steps_run ON agent_steps(run_id);
    CREATE INDEX IF NOT EXISTS idx_agent_steps_status ON agent_steps(status);

    CREATE TABLE IF NOT EXISTS agent_events (
      id INTEGER PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_id INTEGER,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      data_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(step_id) REFERENCES agent_steps(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_events_run ON agent_events(run_id, id);

    CREATE TABLE IF NOT EXISTS agent_approvals (
      id INTEGER PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_id INTEGER,
      approval_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      request_json TEXT,
      response_json TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(run_id) REFERENCES agent_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(step_id) REFERENCES agent_steps(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_approvals_run ON agent_approvals(run_id);
    CREATE INDEX IF NOT EXISTS idx_agent_approvals_status ON agent_approvals(status);

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      kind,
      title,
      body,
      rel_path,
      tokenize = 'unicode61'
    );
  `);

  const migration = db.prepare("INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)");
  migration.run("001_initial_schema", nowIso());
  migration.run("002_agent_runtime_content_packs", nowIso());

  const projectColumns = db.prepare("PRAGMA table_info(creative_projects)").all().map((column) => column.name);
  if (!projectColumns.includes("director_options_json")) {
    db.exec("ALTER TABLE creative_projects ADD COLUMN director_options_json TEXT");
  }

  const shotColumns = db.prepare("PRAGMA table_info(storyboard_shots)").all().map((column) => column.name);
  if (!shotColumns.includes("storyboard_description")) {
    db.exec("ALTER TABLE storyboard_shots ADD COLUMN storyboard_description TEXT");
  }
  if (!shotColumns.includes("transition_note")) {
    db.exec("ALTER TABLE storyboard_shots ADD COLUMN transition_note TEXT");
  }
}

export function upsertSearchIndex(db, kind, rowid, title, body, relPath) {
  db.prepare("DELETE FROM search_index WHERE rowid = ?").run(rowid);
  db.prepare(`
    INSERT INTO search_index (rowid, kind, title, body, rel_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(rowid, kind, title, body, relPath);
}

export function deleteDocumentIndex(db, documentId) {
  const chunkRows = db.prepare("SELECT id FROM chunks WHERE document_id = ?").all(documentId);
  for (const row of chunkRows) {
    db.prepare("DELETE FROM search_index WHERE rowid = ?").run(row.id);
  }
  db.prepare("DELETE FROM chunks WHERE document_id = ?").run(documentId);
}
