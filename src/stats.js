import { formatBytes } from "./utils.js";

export function getStats(db) {
  const fileStats = db.prepare(`
    SELECT
      COUNT(*) AS total_files,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_files,
      SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) AS deleted_files,
      SUM(CASE WHEN status = 'active' THEN size_bytes ELSE 0 END) AS active_bytes
    FROM files
  `).get();

  const byTop = db.prepare(`
    SELECT top_dir, COUNT(*) AS files, SUM(size_bytes) AS bytes
    FROM files
    WHERE status = 'active'
    GROUP BY top_dir
    ORDER BY bytes DESC
  `).all();

  const byMedia = db.prepare(`
    SELECT media_type, COUNT(*) AS files, SUM(size_bytes) AS bytes
    FROM files
    WHERE status = 'active'
    GROUP BY media_type
    ORDER BY files DESC
  `).all();

  const entities = db.prepare(`
    SELECT type, COUNT(*) AS count
    FROM entities
    GROUP BY type
    ORDER BY type
  `).all();

  const docs = db.prepare(`
    SELECT COUNT(*) AS documents, SUM(text_chars) AS text_chars
    FROM documents
  `).get();

  const lastRun = db.prepare(`
    SELECT *
    FROM sync_runs
    ORDER BY id DESC
    LIMIT 1
  `).get();

  return { fileStats, byTop, byMedia, entities, docs, lastRun };
}

export function formatStats(stats) {
  const lines = [];
  lines.push("当前项目 IP 数据库统计");
  lines.push("");
  lines.push(`活跃文件：${stats.fileStats.active_files ?? 0} / 总记录：${stats.fileStats.total_files ?? 0}`);
  lines.push(`活跃容量：${formatBytes(stats.fileStats.active_bytes ?? 0)}`);
  lines.push(`文档数量：${stats.docs.documents ?? 0}`);
  lines.push(`抽取文本：${stats.docs.text_chars ?? 0} 字符`);

  if (stats.lastRun) {
    lines.push("");
    lines.push(`最近同步：#${stats.lastRun.id} ${stats.lastRun.started_at} -> ${stats.lastRun.finished_at ?? "未完成"}`);
    lines.push(`扫描 ${stats.lastRun.scanned_files}，新增 ${stats.lastRun.inserted_files}，更新 ${stats.lastRun.updated_files}，未变 ${stats.lastRun.unchanged_files}，删除 ${stats.lastRun.deleted_files}，错误 ${stats.lastRun.errors}`);
  }

  lines.push("", "按顶层目录：");
  for (const row of stats.byTop) {
    lines.push(`- ${row.top_dir || "(根目录)"}：${row.files} 个，${formatBytes(row.bytes)}`);
  }

  lines.push("", "按媒体类型：");
  for (const row of stats.byMedia) {
    lines.push(`- ${row.media_type}：${row.files} 个，${formatBytes(row.bytes)}`);
  }

  lines.push("", "实体：");
  for (const row of stats.entities) {
    lines.push(`- ${row.type}：${row.count}`);
  }

  return lines.join("\n");
}

