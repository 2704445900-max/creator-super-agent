import { fromJson } from "./utils.js";

export function seedDatabase() {
  // Generic projects start empty and are populated only from their selected content pack.
}

export function getEntityTerms(db) {
  const rows = db.prepare("SELECT id, type, name, aliases_json, summary FROM entities").all();
  return rows.map((row) => ({
    ...row,
    aliases: fromJson(row.aliases_json, [])
  }));
}
