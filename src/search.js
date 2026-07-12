import { buildEvidenceSummary, refineEvidenceChunks } from "./evidence.js";
import { fromJson, snippet } from "./utils.js";

function getQuery(argv) {
  return argv.join(" ").trim();
}

function getBasicTerms(query) {
  return String(query ?? "")
    .replace(/[，。？！?；;：:“”"'（）()【】[\]、]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function getExpandedTerms(db, query) {
  const raw = String(query ?? "").trim();
  const basic = getBasicTerms(raw);
  const terms = [];
  const add = (value) => {
    const term = String(value ?? "").trim();
    if (term && !terms.includes(term)) terms.push(term);
  };

  const entityRows = db.prepare("SELECT name, aliases_json FROM entities").all();
  for (const row of entityRows) {
    const names = [row.name, ...fromJson(row.aliases_json, [])].filter(Boolean);
    for (const name of names) {
      if (name.length >= 2 && raw.includes(name)) add(name);
    }
  }

  const domainKeywords = [
    "队内", "定位", "职务", "角色", "关系", "武器", "生日", "籍贯", "身高",
    "事件", "时间线", "组织", "势力", "素材", "故事板", "分镜", "漫画",
    "视频", "音乐", "设定", "世界观", "法特提", "古蒂斯", "林小队",
    "认知干预", "数字孪生", "脑机接口", "龙醒计划"
  ];
  for (const keyword of domainKeywords) {
    if (raw.includes(keyword)) add(keyword);
  }

  for (const term of basic) add(term);

  if (terms.length === 0) add(raw);
  return terms.slice(0, 10);
}

function inferSearchIntent(query) {
  const text = String(query || "");
  const rules = [
    { id: "identity", label: "身份定位", pattern: /是谁|介绍|身份|定位|角色|人物|who/i, answerTitle: "角色/对象定位" },
    { id: "relationship", label: "关系与阵营", pattern: /关系|同伴|队友|爱人|组织|阵营|隶属|属于/i, answerTitle: "关系与阵营" },
    { id: "prop", label: "道具装备", pattern: /武器|道具|装备|终端|无人机|枪|剑|载具|军装|制服/i, answerTitle: "道具装备" },
    { id: "scene", label: "场景空间", pattern: /场景|地点|地图|城市|房间|走廊|基地|街区|平面图/i, answerTitle: "场景空间" },
    { id: "storyboard", label: "分镜用途", pattern: /分镜|镜头|故事板|动画|视频|手书|MV|画面/i, answerTitle: "分镜用途" },
    { id: "event", label: "事件行动", pattern: /事件|行动|任务|剧情|发生|时间线|作战/i, answerTitle: "事件行动" }
  ];
  const hits = rules.filter((rule) => rule.pattern.test(text));
  return hits.length ? hits : [{ id: "general", label: "综合检索", answerTitle: "资料库结论" }];
}

function pickPrimaryEntity(rows, query, firstTerm, entityType = "") {
  const raw = String(query || "").trim();
  const normalized = raw.replace(/是谁|介绍|身份|定位|角色|人物|who/ig, "").trim();
  const exact = rows.find((row) => {
    const aliases = fromJson(row.aliases_json, []);
    return row.name === normalized || raw.includes(row.name) || aliases.some((alias) => alias && raw.includes(alias));
  });
  if (exact && (!entityType || exact.type === entityType)) return exact;
  if (entityType) return rows.find((row) => row.type === entityType) || rows[0] || null;
  return rows.find((row) => row.name === firstTerm) || rows[0] || null;
}

function primaryTermsFor(entity, fallbackTerms = []) {
  if (!entity) return fallbackTerms;
  return [entity.name, ...fromJson(entity.aliases_json, [])].filter(Boolean);
}

function matchReasons(value, context = {}) {
  const source = String(value ?? "");
  const reasons = [];
  const primaryTerms = context.primaryTerms || [];
  const intents = context.intents || [];
  const terms = context.terms || [];
  for (const term of primaryTerms) {
    if (term && source.includes(term)) reasons.push(`命中首要对象「${term}」`);
  }
  for (const intent of intents) {
    if (intent.id !== "general" && intent.pattern?.test(source)) reasons.push(`符合「${intent.label}」意图`);
  }
  const secondaryHits = terms
    .filter((term) => term && !primaryTerms.includes(term) && source.includes(term))
    .slice(0, 3);
  if (secondaryHits.length) reasons.push(`关联词：${secondaryHits.join("、")}`);
  return [...new Set(reasons)].slice(0, 4);
}

function scoreSearchText(value, context = {}) {
  const source = String(value ?? "");
  const lower = source.toLowerCase();
  let score = 0;
  for (const [index, term] of (context.terms || []).entries()) {
    const token = String(term || "").toLowerCase();
    if (!token || !lower.includes(token)) continue;
    score += index === 0 ? 4 : 1;
  }
  for (const term of context.primaryTerms || []) {
    if (term && source.includes(term)) score += term === context.primaryTerms[0] ? 14 : 7;
  }
  for (const intent of context.intents || []) {
    if (intent.id !== "general" && intent.pattern?.test(source)) score += 4;
  }
  if (context.primaryTerms?.[0] && lower.includes(context.primaryTerms[0].toLowerCase())) score += 6;
  return score;
}

function getQueryTerms(db, query, mode) {
  const terms = getExpandedTerms(db, query);
  if (mode !== "precise") return terms;
  const raw = String(query ?? "").trim();
  const exactEntityTerms = [];
  const entityRows = db.prepare("SELECT name, aliases_json FROM entities").all();
  for (const row of entityRows) {
    const names = [row.name, ...fromJson(row.aliases_json, [])].filter(Boolean);
    for (const name of names) {
      if (name.length >= 2 && raw.includes(name) && !exactEntityTerms.includes(name)) {
        exactEntityTerms.push(name);
      }
    }
  }
  return [...exactEntityTerms, ...terms.filter((term) => !exactEntityTerms.includes(term))].slice(0, 12);
}

function buildLikeWhere(columns, terms) {
  const clauses = [];
  const params = [];
  for (const term of terms) {
    const like = `%${term}%`;
    const inner = columns.map((column) => `${column} LIKE ?`).join(" OR ");
    clauses.push(`(${inner})`);
    for (let index = 0; index < columns.length; index += 1) params.push(like);
  }
  return {
    sql: clauses.length ? clauses.join(" OR ") : "1 = 0",
    params
  };
}

export function searchDatabase(db, argv, options = {}) {
  const query = getQuery(argv);
  if (!query) return { query, entities: [], chunks: [], assets: [] };

  const mode = options.mode === "precise" ? "precise" : "broad";
  const terms = getQueryTerms(db, query, mode);
  const firstTerm = String(options.primaryTerm || terms[0] || query);
  const limit = Number(options.limit || 8);
  const entityType = options.entityType ? String(options.entityType) : "";
  const intents = inferSearchIntent(query);

  const entityWhere = buildLikeWhere(["name", "aliases_json", "summary", "details_json"], terms);
  const entityTypeSql = entityType ? "AND type = ?" : "";
  const entityTypeParams = entityType ? [entityType] : [];
  const entityRows = db.prepare(`
    SELECT id, type, name, aliases_json, summary, details_json
    FROM entities
    WHERE (${entityWhere.sql})
      ${entityTypeSql}
    ORDER BY
      CASE WHEN name = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END,
      type,
      name
    LIMIT ?
  `).all(...entityWhere.params, ...entityTypeParams, firstTerm, `%${firstTerm}%`, limit);
  const primaryEntity = pickPrimaryEntity(entityRows, query, firstTerm, entityType);
  const primaryTerms = primaryTermsFor(primaryEntity, [firstTerm]);
  const scoreContext = { query, terms, intents, primaryTerms };

  const chunkWhere = buildLikeWhere(["c.text", "d.title", "f.rel_path"], terms);
  let chunks = db.prepare(`
    SELECT c.id, c.text, c.chunk_index, d.title, f.rel_path, f.abs_path
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    JOIN files f ON f.id = c.file_id
    WHERE f.status = 'active'
      AND (${chunkWhere.sql})
    ORDER BY LENGTH(c.text) DESC
    LIMIT ?
  `).all(...chunkWhere.params, Math.max(limit * 4, 24));

  const assetWhere = buildLikeWhere(["a.title", "a.linked_names_json", "a.tags_json", "f.rel_path"], terms);
  let assets = db.prepare(`
    SELECT a.id, a.asset_type, a.title, a.linked_names_json, a.tags_json, f.id AS file_id, f.rel_path, f.abs_path, f.media_type
    FROM assets a
    JOIN files f ON f.id = a.file_id
    WHERE f.status = 'active'
      AND (${assetWhere.sql})
    ORDER BY f.rel_path
    LIMIT ?
  `).all(...assetWhere.params, Math.max(limit * 3, 18));

  chunks = chunks
    .map((row) => {
      const haystack = `${row.title}\n${row.rel_path}\n${row.text}`;
      return {
        ...row,
        score: scoreSearchText(haystack, scoreContext),
        matchReasons: matchReasons(haystack, scoreContext)
      };
    })
    .sort((a, b) => b.score - a.score || a.rel_path.length - b.rel_path.length || a.rel_path.localeCompare(b.rel_path, "zh-Hans-CN"))
    .slice(0, limit);

  assets = assets
    .map((row) => {
      const haystack = `${row.title}\n${row.rel_path}\n${row.linked_names_json}\n${row.tags_json}`;
      return {
        ...row,
        score: scoreSearchText(haystack, scoreContext),
        matchReasons: matchReasons(haystack, scoreContext)
      };
    })
    .sort((a, b) => b.score - a.score || a.rel_path.localeCompare(b.rel_path, "zh-Hans-CN"))
    .slice(0, limit);

  const refinedChunks = refineEvidenceChunks(chunks, { query, terms });
  const result = {
    query,
    mode,
    terms,
    intents: intents.map((intent) => ({ id: intent.id, label: intent.label })),
    primary: primaryEntity ? {
      id: primaryEntity.id,
      type: primaryEntity.type,
      name: primaryEntity.name,
      aliases: fromJson(primaryEntity.aliases_json, []),
      summary: primaryEntity.summary || ""
    } : null,
    entities: entityRows.map((row) => ({
      ...row,
      aliases: fromJson(row.aliases_json, []),
      details: fromJson(row.details_json, {}),
      matchReasons: matchReasons(`${row.name}\n${row.aliases_json}\n${row.summary}\n${row.details_json}`, scoreContext)
    })),
    chunks: refinedChunks,
    assets: assets.map((row) => ({ ...row, linkedNames: fromJson(row.linked_names_json, []), tags: fromJson(row.tags_json, []) }))
  };
  const directAnswer = buildDirectAnswer(result);
  return { ...result, directAnswer, evidenceSummary: buildEvidenceSummary({ ...result, directAnswer }) };
}

function buildDirectAnswer(result = {}) {
  const intent = result.intents?.[0] || { id: "general", label: "综合检索" };
  const primary = result.primary || result.entities?.[0] || null;
  const evidence = (result.chunks || []).slice(0, 4).map((chunk) => ({
    claim: chunk.brief?.claim || chunk.title,
    source: chunk.brief?.sourcePath || chunk.rel_path,
    confidence: chunk.brief?.confidence || "unknown",
    reasons: chunk.matchReasons || []
  }));
  const claims = [];
  if (primary?.summary) {
    claims.push({
      label: intent.id === "identity" ? "核心定位" : "首要对象",
      value: primary.summary,
      status: "资料库确认",
      source: "entities.summary"
    });
  }
  for (const item of evidence) {
    if (item.claim && !claims.some((claim) => claim.value === item.claim)) {
      claims.push({
        label: "证据结论",
        value: item.claim,
        status: item.confidence === "high" ? "资料库确认" : "待复核",
        source: item.source
      });
    }
  }
  return {
    standard: "xinrui-direct-answer-v1",
    query: result.query || "",
    intent: intent.label,
    primary,
    answer: primary
      ? `${primary.name}：${primary.summary || "资料库暂缺一句话摘要，需要展开证据确认。"}`
      : (evidence[0]?.claim || "没有找到明确首要对象。"),
    claims: claims.slice(0, 5),
    evidence,
    nextActions: [
      primary ? `后续创作以「${primary.name}」作为首要对象锁定。` : "换用更明确的角色名、组织名、道具名或场景名再查。",
      "进入图像或视频生成前，继续检查视觉参考、道具、场景和正史边界。"
    ]
  };
}

export function formatSearchResults(result) {
  if (!result.query) return "请输入搜索词。";

  const lines = [`查询：${result.query}`];

  if (result.entities.length > 0) {
    lines.push("", "实体：");
    for (const entity of result.entities) {
      const aliases = entity.aliases?.length ? `（别名：${entity.aliases.join("、")}）` : "";
      lines.push(`- [${entity.type}] ${entity.name}${aliases}`);
      if (entity.summary) lines.push(`  ${entity.summary}`);
    }
  }

  if (result.chunks.length > 0) {
    lines.push("", "文档片段：");
    for (const chunk of result.chunks) {
      lines.push(`- ${chunk.title} / ${chunk.rel_path}`);
      lines.push(`  ${chunk.brief?.claim || snippet(chunk.text, result.query)}`);
    }
  }

  if (result.assets.length > 0) {
    lines.push("", "相关素材：");
    for (const asset of result.assets) {
      const linked = asset.linkedNames?.length ? ` -> ${asset.linkedNames.join("、")}` : "";
      lines.push(`- [${asset.media_type}/${asset.asset_type}] ${asset.rel_path}${linked}`);
    }
  }

  if (result.entities.length === 0 && result.chunks.length === 0 && result.assets.length === 0) {
    lines.push("", "没有找到直接匹配。可以换一个角色名、组织名、事件名或素材目录名试试。");
  }

  return lines.join("\n");
}

export function answerFromDatabase(db, argv) {
  const result = searchDatabase(db, argv, { limit: 6 });
  const lines = [];
  lines.push(formatSearchResults(result));

  if (result.query && (result.entities.length > 0 || result.chunks.length > 0)) {
    lines.push("", "智能体提示：当前版本会先给出资料库证据和相关素材；后续接入大模型后，可在这些证据上生成完整回答、检查设定冲突、输出分镜或宣发文案。");
  }

  return lines.join("\n");
}
