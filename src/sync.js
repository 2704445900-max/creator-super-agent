import fs from "node:fs";
import path from "node:path";
import { chunkText } from "./chunk.js";
import { deleteDocumentIndex, upsertSearchIndex } from "./db.js";
import { extractOfficeText } from "./extractors/office.js";
import { getEntityTerms } from "./seed.js";
import {
  classifyFile,
  inferAssetType,
  nowIso,
  sha256File,
  splitRelPath,
  toJson,
  walkFiles
} from "./utils.js";

const DOCUMENT_EXTENSIONS = new Set([".docx", ".pptx", ".txt", ".md"]);

function shouldHashFile(mediaType, config) {
  if (mediaType === "document") return true;
  return config.hashMediaFiles;
}

function detectEntityMentions(text, entityTerms) {
  const source = String(text ?? "");
  if (!source) return [];
  const matches = [];

  for (const entity of entityTerms) {
    const terms = [entity.name, ...(entity.aliases ?? [])].filter(Boolean);
    let count = 0;
    const contexts = [];
    for (const term of terms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "g");
      let match;
      while ((match = regex.exec(source)) !== null) {
        count += 1;
        if (contexts.length < 3) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(source.length, match.index + term.length + 80);
          contexts.push(source.slice(start, end).replace(/\s+/g, " "));
        }
      }
    }
    if (count > 0) matches.push({ entity, count, contexts });
  }

  return matches;
}

function detectLinkedNames(relPath, fileName, entityTerms) {
  const haystack = `${relPath}\n${fileName}`;
  return detectEntityMentions(haystack, entityTerms).map((item) => item.entity.name);
}

function createSyncRun(db, sourceRoot) {
  const result = db.prepare(`
    INSERT INTO sync_runs (source_root, started_at, notes)
    VALUES (?, ?, ?)
  `).run(sourceRoot, nowIso(), "running");
  return result.lastInsertRowid;
}

function finishSyncRun(db, runId, stats) {
  db.prepare(`
    UPDATE sync_runs
    SET finished_at = ?,
        scanned_files = ?,
        inserted_files = ?,
        updated_files = ?,
        unchanged_files = ?,
        deleted_files = ?,
        extracted_documents = ?,
        errors = ?,
        notes = ?
    WHERE id = ?
  `).run(
    nowIso(),
    stats.scanned,
    stats.inserted,
    stats.updated,
    stats.unchanged,
    stats.deleted,
    stats.extractedDocuments,
    stats.errors,
    stats.notes.join("\n"),
    runId
  );
}

function upsertFileRow(db, row, existing) {
  const now = nowIso();
  if (!existing) {
    const result = db.prepare(`
      INSERT INTO files (
        root, abs_path, rel_path, name, ext, media_type, top_dir, sub_dir, asset_type,
        size_bytes, mtime_ms, sha256, status, metadata_json,
        created_at, updated_at, last_seen_at, last_seen_run_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
    `).run(
      row.root,
      row.absPath,
      row.relPath,
      row.name,
      row.ext,
      row.mediaType,
      row.topDir,
      row.subDir,
      row.assetType,
      row.sizeBytes,
      row.mtimeMs,
      row.sha256,
      toJson(row.metadata),
      now,
      now,
      now,
      row.runId
    );
    return Number(result.lastInsertRowid);
  }

  db.prepare(`
    UPDATE files SET
      rel_path = ?,
      name = ?,
      ext = ?,
      media_type = ?,
      top_dir = ?,
      sub_dir = ?,
      asset_type = ?,
      size_bytes = ?,
      mtime_ms = ?,
      sha256 = ?,
      status = 'active',
      metadata_json = ?,
      updated_at = ?,
      last_seen_at = ?,
      last_seen_run_id = ?
    WHERE id = ?
  `).run(
    row.relPath,
    row.name,
    row.ext,
    row.mediaType,
    row.topDir,
    row.subDir,
    row.assetType,
    row.sizeBytes,
    row.mtimeMs,
    row.sha256,
    toJson(row.metadata),
    now,
    now,
    row.runId,
    existing.id
  );
  return existing.id;
}

function upsertAsset(db, fileId, assetType, title, linkedNames, tags) {
  db.prepare(`
    INSERT INTO assets (file_id, asset_type, title, linked_names_json, tags_json, status, updated_at)
    VALUES (?, ?, ?, ?, ?, 'indexed', ?)
    ON CONFLICT(file_id) DO UPDATE SET
      asset_type = excluded.asset_type,
      title = excluded.title,
      linked_names_json = excluded.linked_names_json,
      tags_json = excluded.tags_json,
      status = 'indexed',
      updated_at = excluded.updated_at
  `).run(fileId, assetType, title, toJson(linkedNames), toJson(tags), nowIso());
}

function clearFileDerivedRows(db, fileId) {
  const doc = db.prepare("SELECT id FROM documents WHERE file_id = ?").get(fileId);
  if (doc) {
    deleteDocumentIndex(db, doc.id);
    db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);
  }
  db.prepare("DELETE FROM entity_mentions WHERE file_id = ?").run(fileId);
}

function deactivateOtherRoots(db, sourceRoot) {
  const rows = db.prepare(`
    SELECT id
    FROM files
    WHERE root != ? AND status = 'active'
  `).all(sourceRoot);

  for (const row of rows) {
    clearFileDerivedRows(db, row.id);
    db.prepare("DELETE FROM assets WHERE file_id = ?").run(row.id);
  }

  if (rows.length > 0) {
    db.prepare(`
      UPDATE files
      SET status = 'deleted', updated_at = ?
      WHERE root != ? AND status = 'active'
    `).run(nowIso(), sourceRoot);
  }

  return rows.length;
}

async function extractAndIndexDocument(db, fileId, fileRow, config, entityTerms) {
  const text = await extractOfficeText(fileRow.absPath);
  if (!text.trim()) return false;

  const result = db.prepare(`
    INSERT INTO documents (file_id, doc_kind, title, text, text_chars, extracted_at, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    fileId,
    fileRow.ext.replace(".", ""),
    fileRow.name,
    text,
    text.length,
    nowIso(),
    text.slice(0, 500)
  );
  const documentId = Number(result.lastInsertRowid);

  const chunks = chunkText(text, config.chunkSize, config.chunkOverlap);
  const insertChunk = db.prepare(`
    INSERT INTO chunks (document_id, file_id, chunk_index, text, text_chars)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const chunkResult = insertChunk.run(documentId, fileId, index, chunk, chunk.length);
    upsertSearchIndex(db, "chunk", Number(chunkResult.lastInsertRowid), fileRow.name, chunk, fileRow.relPath);
  }

  const mentionRows = detectEntityMentions(`${fileRow.relPath}\n${text}`, entityTerms);
  const insertMention = db.prepare(`
    INSERT INTO entity_mentions (entity_id, file_id, document_id, mention_count, contexts_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_id, file_id) DO UPDATE SET
      document_id = excluded.document_id,
      mention_count = excluded.mention_count,
      contexts_json = excluded.contexts_json,
      updated_at = excluded.updated_at
  `);
  for (const mention of mentionRows) {
    insertMention.run(
      mention.entity.id,
      fileId,
      documentId,
      mention.count,
      toJson(mention.contexts),
      nowIso()
    );
  }

  return true;
}

export async function syncSource(db, config, options = {}) {
  const sourceRoot = path.resolve(config.sourceRoot);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`资料源不存在：${sourceRoot}`);
  }

  const runId = createSyncRun(db, sourceRoot);
  const deactivatedOtherRoots = deactivateOtherRoots(db, sourceRoot);
  const entityTerms = getEntityTerms(db);
  const stats = {
    scanned: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    extractedDocuments: 0,
    errors: 0,
    notes: []
  };
  if (deactivatedOtherRoots > 0) {
    stats.notes.push(`已停用旧资料源文件：${deactivatedOtherRoots}`);
  }

  const files = walkFiles(sourceRoot);
  const existingByPath = new Map(
    db.prepare("SELECT * FROM files WHERE root = ?").all(sourceRoot).map((row) => [row.abs_path, row])
  );

  for (const absPath of files) {
    stats.scanned += 1;
    try {
      const stat = fs.statSync(absPath);
      const relPath = path.relative(sourceRoot, absPath);
      const parts = splitRelPath(relPath);
      const ext = path.extname(absPath).toLowerCase();
      const mediaType = classifyFile(absPath);
      const assetType = inferAssetType(relPath);
      const existing = existingByPath.get(absPath);
      const metadataChanged = !existing
        || existing.size_bytes !== stat.size
        || existing.mtime_ms !== Math.trunc(stat.mtimeMs)
        || existing.status !== "active";

      let sha = existing?.sha256 ?? null;
      let contentChanged = metadataChanged;
      if (metadataChanged && shouldHashFile(mediaType, config)) {
        sha = sha256File(absPath);
        contentChanged = !existing || existing.sha256 !== sha || existing.status !== "active";
      }

      const fileRow = {
        root: sourceRoot,
        absPath,
        relPath,
        name: path.basename(absPath),
        ext,
        mediaType,
        topDir: parts[0] ?? "",
        subDir: parts[1] ?? "",
        assetType,
        sizeBytes: stat.size,
        mtimeMs: Math.trunc(stat.mtimeMs),
        sha256: sha,
        metadata: { birthtimeMs: Math.trunc(stat.birthtimeMs) },
        runId
      };

      const fileId = upsertFileRow(db, fileRow, existing);
      const linkedNames = detectLinkedNames(relPath, fileRow.name, entityTerms);
      upsertAsset(db, fileId, assetType, fileRow.name, linkedNames, [mediaType, assetType, fileRow.topDir, fileRow.subDir].filter(Boolean));

      if (!existing) {
        stats.inserted += 1;
      } else if (contentChanged || metadataChanged) {
        stats.updated += 1;
      } else {
        stats.unchanged += 1;
      }

      if ((contentChanged || !existing) && DOCUMENT_EXTENSIONS.has(ext)) {
        clearFileDerivedRows(db, fileId);
        const extracted = await extractAndIndexDocument(db, fileId, fileRow, config, entityTerms);
        if (extracted) stats.extractedDocuments += 1;
      } else if (!contentChanged && existing) {
        db.prepare("UPDATE files SET last_seen_at = ?, last_seen_run_id = ?, status = 'active' WHERE id = ?")
          .run(nowIso(), runId, existing.id);
      }
    } catch (error) {
      stats.errors += 1;
      stats.notes.push(`${absPath}: ${error.message}`);
      if (options.verbose) console.error(error);
    }
  }

  const deleted = db.prepare(`
    UPDATE files
    SET status = 'deleted', updated_at = ?
    WHERE root = ? AND status = 'active' AND last_seen_run_id != ?
  `).run(nowIso(), sourceRoot, runId);
  stats.deleted = Number(deleted.changes || 0);

  finishSyncRun(db, runId, stats);
  return { runId, stats };
}
