import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "./config.js";
import { searchVisualAssets } from "./visual.js";
import { ensureDir, fromJson, nowIso } from "./utils.js";

const CHARACTER_ORDER = [
  "林荫清",
  "唐舒嫣",
  "赵婷婷",
  "刘伊七",
  "韩梦雪",
  "洛情轩",
  "何墨缘",
  "刘梦鸳",
  "叶敏慧",
  "楚乔翼",
  "李熙然"
];

const CHARACTER_UI = {
  林荫清: { id: "linyinqing", en: "Lin Yinqing", image: "assets/img/char-linyinqing.png", mediaType: "dark" },
  唐舒嫣: { id: "tangshuyan", en: "Tang Shuyan", image: "assets/img/char-tangshuyan.png", mediaType: "dark" },
  赵婷婷: { id: "zhaotingting", en: "Zhao Tingting", image: "assets/img/char-zhaotingting.png", mediaType: "dark" },
  刘伊七: { id: "liuyiqi", en: "Liu Yiqi", image: "assets/img/char-liuyiqi.png", mediaType: "dark" },
  韩梦雪: { id: "hanmengxue", en: "Han Mengxue", image: "assets/img/char-hanmengxue.png", mediaType: "dark" },
  洛情轩: { id: "luoqingxuan", en: "Luo Qingxuan", image: "assets/img/char-luoqingxuan.png", mediaType: "dark" },
  何墨缘: { id: "hemoyuan", en: "He Moyuan", image: "assets/img/char-hemoyuan.png", mediaType: "dark" },
  刘梦鸳: { id: "liumengyuan", en: "Liu Mengyuan", image: "assets/img/char-liumengyuan.png", mediaType: "dark" },
  叶敏慧: { id: "yeminhui", en: "Ye Minhui", image: "assets/img/char-yeminhui.jpg", mediaType: "light" },
  楚乔翼: { id: "chuqiaoyi", en: "Chu Qiaoyi", image: "assets/img/logo-rabbit.png", mediaType: "empty" },
  李熙然: { id: "lixiran", en: "Li Xiran", image: "assets/img/char-lixiran.jpg", mediaType: "light" }
};

const MAJOR_FACTIONS = ["法特提", "古蒂斯"];
const DETAIL_LABELS = {
  birthday: "生日",
  origin: "出身",
  position: "定位",
  weapon: "装备",
  status: "状态",
  role: "作用",
  principle: "原则",
  headquarters: "总部",
  scope: "职能范围",
  ideology: "理念",
  seasonRole: "叙事位置",
  parent: "上级组织",
  function: "职能",
  coreTone: "核心调性"
};

function isEnglishAlias(value) {
  return /^[A-Za-z][A-Za-z\s'.-]+$/.test(String(value || "").trim());
}

function makeFallbackId(entity) {
  return `${entity.type || "entity"}-${entity.id}`;
}

function orderByNameList(names) {
  const order = new Map(names.map((name, index) => [name, index]));
  return (a, b) => {
    const aOrder = order.has(a.name) ? order.get(a.name) : Number.MAX_SAFE_INTEGER;
    const bOrder = order.has(b.name) ? order.get(b.name) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || a.name.localeCompare(b.name, "zh-Hans-CN");
  };
}

function formatDetails(details) {
  return Object.entries(details || {})
    .filter(([, value]) => value != null && String(value).trim())
    .map(([key, value]) => ({
      key,
      label: DETAIL_LABELS[key] || key,
      value: String(value)
    }));
}

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

function getTopEvidence(db, entityId, limit = 3) {
  return db.prepare(`
    SELECT em.mention_count, em.contexts_json, f.rel_path, d.title
    FROM entity_mentions em
    JOIN files f ON f.id = em.file_id
    LEFT JOIN documents d ON d.id = em.document_id
    WHERE em.entity_id = ?
      AND f.status = 'active'
    ORDER BY em.mention_count DESC, f.rel_path
    LIMIT ?
  `).all(entityId, limit).flatMap((row) => {
    const contexts = fromJson(row.contexts_json, []).slice(0, 2);
    return contexts.map((context) => ({
      title: row.title || path.basename(row.rel_path),
      relPath: row.rel_path,
      mentionCount: row.mention_count,
      text: context
    }));
  }).slice(0, limit);
}

function getRelations(db) {
  return db.prepare(`
    SELECT
      se.name AS source_name,
      se.type AS source_type,
      er.relation_type,
      te.name AS target_name,
      te.type AS target_type
    FROM entity_relations er
    JOIN entities se ON se.id = er.source_entity_id
    JOIN entities te ON te.id = er.target_entity_id
    ORDER BY se.name, er.relation_type, te.name
  `).all();
}

function withApiBase(item, apiBaseUrl) {
  if (!item?.url || !apiBaseUrl) return item;
  return { ...item, url: new URL(item.url, apiBaseUrl).toString() };
}

function getVisualReferences(db, characterName, apiBaseUrl) {
  try {
    return searchVisualAssets(db, {
      character: characterName,
      role: "identity_reference",
      limit: 4
    }).items.map((item) => withApiBase(item, apiBaseUrl));
  } catch {
    return [];
  }
}

function buildCharacter(entity, db, apiBaseUrl) {
  const ui = CHARACTER_UI[entity.name] || {};
  const englishAlias = entity.aliases.find(isEnglishAlias);
  const detailRows = formatDetails(entity.details);
  const tags = detailRows
    .filter((item) => ["origin", "position", "weapon", "status"].includes(item.key))
    .map((item) => item.value)
    .concat(entity.aliases.filter((alias) => !isEnglishAlias(alias)).slice(0, 3))
    .slice(0, 5);
  const detailBio = detailRows.map((item) => `${item.label}：${item.value}`);

  return {
    id: ui.id || makeFallbackId(entity),
    name: entity.name,
    en: ui.en || englishAlias || "",
    role: entity.details?.position || entity.summary || "",
    image: ui.image || "",
    mediaType: ui.mediaType || "dark",
    tags,
    quote: entity.summary || "",
    bio: [entity.summary, ...detailBio].filter(Boolean),
    aliases: entity.aliases,
    details: detailRows,
    evidence: getTopEvidence(db, entity.id),
    visualReferences: getVisualReferences(db, entity.name, apiBaseUrl),
    updatedAt: entity.updated_at
  };
}

function buildSimpleEntity(entity, db) {
  return {
    id: makeFallbackId(entity),
    type: entity.type,
    name: entity.name,
    aliases: entity.aliases,
    summary: entity.summary || "",
    details: formatDetails(entity.details),
    evidence: getTopEvidence(db, entity.id, 2),
    updatedAt: entity.updated_at
  };
}

function groupByType(entities, type) {
  return entities.filter((entity) => entity.type === type);
}

export function getDefaultSiteSnapshotPath() {
  return path.join(
    getProjectRoot(),
    "Claude本地会话",
    "新锐纪元企划-展示站",
    "assets",
    "data",
    "xinrui-site.json"
  );
}

export function buildSiteData(db, options = {}) {
  const apiBaseUrl = options.apiBaseUrl || "";
  const entities = getEntities(db);
  const characters = groupByType(entities, "character")
    .filter((entity) => Object.hasOwn(CHARACTER_UI, entity.name))
    .sort(orderByNameList(CHARACTER_ORDER))
    .map((entity) => buildCharacter(entity, db, apiBaseUrl));
  const organizations = groupByType(entities, "organization")
    .sort(orderByNameList(["林小队", "国家特别事务行动协调局", ...MAJOR_FACTIONS]))
    .map((entity) => buildSimpleEntity(entity, db));
  const factions = organizations.filter((entity) => MAJOR_FACTIONS.includes(entity.name));
  const events = groupByType(entities, "event").map((entity) => buildSimpleEntity(entity, db));
  const terms = groupByType(entities, "term").map((entity) => buildSimpleEntity(entity, db));
  const projects = groupByType(entities, "project").map((entity) => buildSimpleEntity(entity, db));

  return {
    schemaVersion: 1,
    generatedAt: nowIso(),
    source: "xinrui-ip-agent",
    project: projects.find((project) => project.name === "新锐纪元") || null,
    characters,
    world: {
      organizations,
      factions,
      events,
      terms,
      projects
    },
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
