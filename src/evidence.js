import { snippet } from "./utils.js";

const MAX_CLAIM_LENGTH = 110;
const MAX_CLEAN_TEXT_LENGTH = 260;

const EVIDENCE_TYPES = [
  {
    type: "character_state",
    label: "角色状态",
    pattern: /角色|人物|队内|定位|性格|情绪|成长|弧光|内心|关系|身份|职责|项目主角|项目角色A|项目角色B|项目角色C/
  },
  {
    type: "action_event",
    label: "行动事件",
    pattern: /行动|任务|潜入|撤侨|战斗|突入|追击|撤离|营救|调查|作战|行动线|剧情/
  },
  {
    type: "scene_blocking",
    label: "场景调度",
    pattern: /场景|走廊|街道|基地|房间|港区|城市|镜头|分镜|动线|轴线|视线|机位|平面图/
  },
  {
    type: "costume_prop",
    label: "服装道具",
    pattern: /服装|军装|制服|洋装|武器|枪|装备|道具|战术|装甲|无人机|背包|臂章/
  },
  {
    type: "organization_world",
    label: "组织世界观",
    pattern: /组织|阵营|示例对手组织A|示例对手组织B|东方大国|势力|三纪元|世界观|计划|项目/
  },
  {
    type: "dramaturgy",
    label: "剧作规范",
    pattern: /章节|标题|结构|幕|章|简介|剧本|原则|改写|校订|文学|叙事/
  }
];

const USAGE_RULES = [
  { label: "设定校准", pattern: /定位|身份|职责|关系|组织|世界观|设定|资料库/ },
  { label: "分镜生成", pattern: /场景|行动|任务|镜头|分镜|机位|动线|潜入|战斗|撤离/ },
  { label: "视觉设计", pattern: /服装|军装|武器|装备|道具|场景|视觉|角色|概念/ },
  { label: "文学拓展", pattern: /情绪|成长|弧光|内心|对话|章节|文学|改写|叙事/ }
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function trimText(value, maxLength) {
  const text = compact(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
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

function splitSentences(text) {
  const source = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "。");
  const matches = source.match(/[^。！？!?；;]{8,}[。！？!?；;]?/g) || [];
  return unique(matches.map((item) => item.replace(/^[\s,，、。；;：:]+/, ""))).slice(0, 80);
}

function tokenize(value) {
  return unique(
    String(value || "")
      .replace(/[，。！？；：、（）()[\]{}《》“”"'\n\r\t/\\|_-]+/g, " ")
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length >= 2)
  );
}

function scoreSentence(sentence, terms, title, path) {
  const source = compact(`${sentence} ${title} ${path}`).toLowerCase();
  let score = 0;
  for (const [index, term] of terms.entries()) {
    const token = String(term || "").toLowerCase();
    if (!token) continue;
    if (source.includes(token)) score += index === 0 ? 8 : 3;
  }
  if (/项目主角|项目角色A|项目角色B|项目角色C|项目角色D|示例对手组织A|示例对手组织B/.test(sentence)) score += 3;
  if (/任务|行动|定位|职责|场景|镜头|服装|武器|组织|世界观/.test(sentence)) score += 2;
  if (/目录|后记|第[一二三四五六七八九十\d]+章/.test(sentence)) score -= 1;
  return score;
}

function pickBestSentences(chunk, context) {
  const terms = unique([...(context.terms || []), ...tokenize(context.query)]).slice(0, 16);
  const sentences = splitSentences(chunk.text);
  if (!sentences.length) {
    return [snippet(chunk.text, context.query || terms[0] || "", MAX_CLEAN_TEXT_LENGTH)];
  }
  return sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, terms, chunk.title, chunk.rel_path)
    }))
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)
    .slice(0, 4)
    .map((item) => item.sentence);
}

function inferEvidenceType(text, title, path) {
  const source = `${text}\n${title}\n${path}`;
  const hit = EVIDENCE_TYPES.find((item) => item.pattern.test(source));
  return hit || { type: "uncategorized", label: "待分类" };
}

function inferUsage(text) {
  const source = String(text || "");
  const usages = USAGE_RULES.filter((item) => item.pattern.test(source)).map((item) => item.label);
  return usages.length ? unique(usages).slice(0, 3) : ["人工复核"];
}

function inferConfidence(bestSentences, context, chunk) {
  const terms = unique([...(context.terms || []), ...tokenize(context.query)]).slice(0, 16);
  const source = compact(`${bestSentences.join(" ")} ${chunk.title} ${chunk.rel_path}`).toLowerCase();
  const hits = terms.filter((term) => source.includes(String(term).toLowerCase())).length;
  if (hits >= 3 && bestSentences.length >= 2) return "high";
  if (hits >= 1 || Number(chunk.score || 0) >= 4) return "medium";
  return "low";
}

function detectNoiseFlags(text, title, path) {
  const flags = [];
  const source = compact(text);
  if (source.length > 900) flags.push("too_long");
  if (/第[一二三四五六七八九十\d]+章|目录|后记|卷|幕/.test(source) && !/[。！？]/.test(source.slice(0, 160))) {
    flags.push("catalog_like");
  }
  if (!/项目主角|项目角色A|项目角色B|项目角色C|项目角色D|示例对手组织A|示例对手组织B|当前项目团队|新锐/.test(`${source} ${title} ${path}`)) {
    flags.push("no_named_subject");
  }
  if (/(.{12,})\1/.test(source)) flags.push("possible_repeat");
  return flags;
}

export function buildEvidenceBrief(chunk, context = {}) {
  const bestSentences = pickBestSentences(chunk, context);
  const cleanText = trimText(bestSentences.join(" "), MAX_CLEAN_TEXT_LENGTH);
  const claim = trimText(bestSentences[0] || snippet(chunk.text, context.query || "", MAX_CLAIM_LENGTH), MAX_CLAIM_LENGTH);
  const evidenceType = inferEvidenceType(cleanText, chunk.title, chunk.rel_path);
  const usage = inferUsage(`${cleanText} ${chunk.title} ${chunk.rel_path}`);
  return {
    claim,
    evidenceType: evidenceType.type,
    evidenceTypeLabel: evidenceType.label,
    keyPoints: bestSentences.slice(0, 3).map((item) => trimText(item, 88)),
    usage,
    confidence: inferConfidence(bestSentences, context, chunk),
    cleanText,
    sourceTitle: chunk.title,
    sourcePath: chunk.rel_path,
    noiseFlags: detectNoiseFlags(chunk.text, chunk.title, chunk.rel_path)
  };
}

export function refineEvidenceChunks(chunks = [], context = {}) {
  const seen = new Set();
  const output = [];
  for (const chunk of chunks) {
    const brief = buildEvidenceBrief(chunk, context);
    const key = `${brief.sourceTitle}|${brief.claim}`.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...chunk, brief });
  }
  return output;
}

export function buildEvidenceSummary(result = {}) {
  const chunks = result.chunks || [];
  const top = chunks[0]?.brief;
  const direct = result.directAnswer || null;
  return {
    query: result.query || "",
    mode: result.mode || "broad",
    retrievalOrder: ["canon_evidence", "visual_reference", "external_reference"],
    evidenceCount: chunks.length,
    entityCount: result.entities?.length || 0,
    assetCount: result.assets?.length || 0,
    primary: direct?.primary ? {
      name: direct.primary.name,
      type: direct.primary.type
    } : null,
    intent: direct?.intent || "",
    topClaim: direct?.claims?.[0]?.value || top?.claim || "",
    topEvidenceType: direct?.claims?.[0]?.label || top?.evidenceTypeLabel || "",
    languageStandard: "先给短结论，再给关键点和来源；原文只作为可展开证据，不直接堆叠长段。"
  };
}
