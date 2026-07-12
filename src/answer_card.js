import { searchDatabase } from "./search.js";
import { fromJson } from "./utils.js";
import { searchVisualAssets } from "./visual.js";

const INTENT_HINTS = [
  { id: "identity", pattern: /是谁|介绍|身份|定位|角色|who/i, label: "身份定位" },
  { id: "relationship", pattern: /关系|同伴|爱人|队友|组织|阵营/i, label: "关系与阵营" },
  { id: "visual", pattern: /长什么样|立绘|外观|服装|视觉|参考|画/i, label: "视觉参考" },
  { id: "storyboard", pattern: /分镜|镜头|故事板|动画|视频|手书/i, label: "分镜用途" },
  { id: "prop", pattern: /武器|道具|装备|终端|无人机|枪|剑/i, label: "道具装备" }
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const clean = compact(value);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
  }
  return output;
}

function inferIntent(query) {
  const matched = INTENT_HINTS.filter((item) => item.pattern.test(query));
  return matched.length ? matched.map((item) => item.label) : ["综合检索"];
}

function pickPrimaryEntity(result, query, entityType = "") {
  const raw = compact(query);
  const entities = result.entities || [];
  if (!entities.length) return null;
  const normalizedQuestion = raw.replace(/是谁|介绍|身份|定位|角色|who/ig, "").trim();
  const exact = entities.find((entity) => entity.name === normalizedQuestion || raw.includes(entity.name));
  if (exact && (!entityType || exact.type === entityType)) return exact;
  if (entityType) {
    const typed = entities.find((entity) => entity.type === entityType);
    if (typed) return typed;
  }
  return entities[0];
}

function entityTerms(entity) {
  if (!entity) return [];
  return unique([
    entity.name,
    ...(entity.aliases || []),
    ...fromJson(entity.aliases_json, [])
  ]);
}

function scoreByPrimary(value, primaryTerms, query) {
  const text = compact(value);
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of primaryTerms) {
    if (term && text.includes(term)) score += term === primaryTerms[0] ? 12 : 6;
  }
  for (const token of compact(query).split(/\s+/)) {
    if (token && lower.includes(token.toLowerCase())) score += 1;
  }
  return score;
}

function filterChunks(chunks, primaryTerms, query, limit) {
  return (chunks || [])
    .map((chunk) => ({
      ...chunk,
      answerCardScore: scoreByPrimary(`${chunk.title}\n${chunk.rel_path}\n${chunk.text}\n${chunk.brief?.claim || ""}`, primaryTerms, query)
    }))
    .filter((chunk) => chunk.answerCardScore > 0)
    .sort((a, b) => b.answerCardScore - a.answerCardScore || a.rel_path.length - b.rel_path.length)
    .slice(0, limit);
}

function filterAssets(assets, primaryTerms, query, limit) {
  return (assets || [])
    .map((asset) => ({
      ...asset,
      answerCardScore: scoreByPrimary(`${asset.title}\n${asset.rel_path}\n${asset.linked_names_json}\n${(asset.linkedNames || []).join(" ")}`, primaryTerms, query)
    }))
    .filter((asset) => asset.answerCardScore > 0)
    .sort((a, b) => b.answerCardScore - a.answerCardScore || a.rel_path.localeCompare(b.rel_path, "zh-Hans-CN"))
    .slice(0, limit);
}

function buildClaims(primaryEntity, chunks) {
  const claims = [];
  if (primaryEntity?.summary) {
    claims.push({
      label: "核心定位",
      value: primaryEntity.summary,
      source: "entities.summary",
      status: "资料库确认"
    });
  }
  for (const chunk of chunks.slice(0, 4)) {
    const claim = chunk.brief?.claim || chunk.title;
    if (!claim || claims.some((item) => item.value === claim)) continue;
    claims.push({
      label: chunk.brief?.evidenceTypeLabel || "证据结论",
      value: claim,
      source: chunk.brief?.sourcePath || chunk.rel_path,
      status: chunk.brief?.confidence === "high" ? "资料库确认" : "待复核"
    });
  }
  return claims.slice(0, 6);
}

function buildUnresolved(primaryEntity, chunks, visualAssets, query) {
  const unresolved = [];
  if (!primaryEntity) unresolved.push("未找到明确首要实体，需要换成角色名、组织名或事件名再查。");
  if (!chunks.length) unresolved.push("缺少与首要实体强相关的文本证据。");
  if (!visualAssets.items?.length) unresolved.push("缺少可直接用于图像生成的本地视觉参考。");
  if (/武器|道具|装备|城市|地图|军装|无人机|终端/.test(query)) {
    unresolved.push("涉及现实知识或具体道具时，需要浏览器优先核验，外部资料不得直接写入正史。");
  }
  return unresolved;
}

function buildNextActions(primaryEntity, visualAssets, unresolved) {
  const actions = [];
  if (primaryEntity) actions.push(`以「${primaryEntity.name}」作为首要对象继续检索或生成分镜。`);
  if (visualAssets.items?.length) actions.push("先选定一张身份参考图作为 image-2 角色锁。");
  if (unresolved.length) actions.push("先处理待确认项，再进入正式图像或视频生成。");
  actions.push("需要创作时，进入智能执行管线：提示词细化 -> 视觉检查 -> 成本估算。");
  return actions;
}

export function createAnswerCard(db, input = {}) {
  const query = compact(input.query || input.q || input.question || "");
  if (!query) {
    return {
      standard: "xinrui-answer-card-v1",
      query,
      primary: null,
      claims: [],
      evidence: [],
      visualAssets: { items: [] },
      unresolved: ["请输入检索问题。"],
      nextActions: []
    };
  }

  const mode = input.mode === "broad" ? "broad" : "precise";
  const rawResult = searchDatabase(db, query.split(/\s+/), {
    mode,
    limit: Number(input.limit || 8),
    entityType: input.entityType || undefined
  });
  const primaryEntity = pickPrimaryEntity(rawResult, query, input.entityType || "");
  const primaryTerms = entityTerms(primaryEntity);
  const scopedChunks = filterChunks(rawResult.chunks, primaryTerms.length ? primaryTerms : rawResult.terms, query, Number(input.evidenceLimit || 5));
  const scopedAssets = filterAssets(rawResult.assets, primaryTerms.length ? primaryTerms : rawResult.terms, query, Number(input.assetLimit || 8));
  const visualAssets = searchVisualAssets(db, {
    query: primaryTerms[0] || query,
    limit: Number(input.visualLimit || 8)
  });
  const claims = buildClaims(primaryEntity, scopedChunks);
  const unresolved = buildUnresolved(primaryEntity, scopedChunks, visualAssets, query);
  const secondaryEntities = (rawResult.entities || [])
    .filter((entity) => !primaryEntity || entity.id !== primaryEntity.id)
    .slice(0, 4)
    .map((entity) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      reason: "相关但不是本次首要答案"
    }));

  return {
    standard: "xinrui-answer-card-v1",
    query,
    mode,
    intents: inferIntent(query),
    primary: primaryEntity ? {
      id: primaryEntity.id,
      type: primaryEntity.type,
      name: primaryEntity.name,
      aliases: primaryEntity.aliases || [],
      summary: primaryEntity.summary || "",
      confidence: primaryEntity.confidence || "database"
    } : null,
    claims,
    evidence: scopedChunks.map((chunk) => ({
      id: chunk.id,
      title: chunk.title,
      relPath: chunk.rel_path,
      claim: chunk.brief?.claim || chunk.title,
      keyPoints: chunk.brief?.keyPoints || [],
      confidence: chunk.brief?.confidence || "unknown",
      evidenceTypeLabel: chunk.brief?.evidenceTypeLabel || "资料库证据",
      score: chunk.answerCardScore
    })),
    visualAssets: {
      items: (visualAssets.items || scopedAssets).slice(0, Number(input.visualLimit || 8)).map((asset) => ({
        id: asset.id,
        fileId: asset.file_id,
        title: asset.title,
        relPath: asset.rel_path,
        absPath: asset.abs_path,
        mediaType: asset.media_type,
        role: asset.promptRole || asset.prompt_role || "",
        kind: asset.visualKind || asset.visual_kind || asset.asset_type || "",
        referenceTier: asset.referenceTier || asset.identityPolicy?.referenceTier || "",
        referenceTierLabel: asset.referenceTierLabel || asset.identityPolicy?.referenceTierLabel || "",
        identityPolicy: asset.identityPolicy || null,
        url: asset.url || (asset.file_id ? `/api/files/${asset.file_id}` : "")
      }))
    },
    secondaryEntities,
    unresolved,
    nextActions: buildNextActions(primaryEntity, visualAssets, unresolved),
    rawHitStats: {
      entities: rawResult.entities?.length || 0,
      chunks: rawResult.chunks?.length || 0,
      scopedChunks: scopedChunks.length,
      assets: rawResult.assets?.length || 0,
      scopedAssets: scopedAssets.length
    },
    raw: input.includeRaw ? rawResult : undefined
  };
}
