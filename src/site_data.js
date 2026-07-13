import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";
import { ensureDir, fromJson, nowIso } from "./utils.js";

function getEntities(db) {
  return db.prepare(`
    SELECT id, type, name, aliases_json, summary, details_json, source, confidence, updated_at
    FROM entities
    ORDER BY type, name
  `).all().map((row) => ({
    ...row,
    aliases: fromJson(row.aliases_json, []),
    details: fromJson(row.details_json, {})
  }));
}

function getRelations(db) {
  return db.prepare(`
    SELECT se.name AS source_name, se.type AS source_type,
      er.relation_type, te.name AS target_name, te.type AS target_type
    FROM entity_relations er
    JOIN entities se ON se.id = er.source_entity_id
    JOIN entities te ON te.id = er.target_entity_id
    ORDER BY se.name, er.relation_type, te.name
  `).all();
}

function publicEntity(entity) {
  return {
    id: `${entity.type || "entity"}-${entity.id}`,
    type: entity.type,
    name: entity.name,
    aliases: entity.aliases,
    summary: entity.summary || "",
    details: entity.details,
    updatedAt: entity.updated_at
  };
}

function publicCharacter(entity) {
  return {
    ...publicEntity(entity),
    en: entity.aliases.find((value) => /^[A-Za-z]/.test(value)) || "",
    role: entity.details?.position || entity.summary || "",
    image: "",
    mediaType: "empty",
    tags: Object.values(entity.details || {}).filter(Boolean).slice(0, 5),
    quote: entity.summary || "",
    bio: [entity.summary].filter(Boolean),
    evidence: [],
    visualReferences: []
  };
}

export function getDefaultSiteSnapshotPath() {
  return path.join(getOutputRoot(), "site-data", "creator-site.json");
}

export function buildSiteData(db) {
  const entities = getEntities(db);
  const byType = (type) => entities.filter((entity) => entity.type === type);
  const characters = byType("character").map(publicCharacter);
  const organizations = byType("organization").map(publicEntity);
  const events = byType("event").map(publicEntity);
  const terms = byType("term").map(publicEntity);
  const projects = byType("project").map(publicEntity);
  return {
    schemaVersion: 1,
    generatedAt: nowIso(),
    source: "creator-super-agent",
    project: projects[0] || null,
    characters,
    world: { organizations, factions: [], events, terms, projects },
    relations: getRelations(db),
    counts: {
      characters: characters.length,
      organizations: organizations.length,
      events: events.length,
      terms: terms.length,
      projects: projects.length
    }
  };
}

export function writeSiteDataSnapshot(db, outPath = getDefaultSiteSnapshotPath(), options = {}) {
  const data = buildSiteData(db, options);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { outPath, data };
}
