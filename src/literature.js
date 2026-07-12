import { completeWithLlm } from "./llm.js";
import { searchDatabase } from "./search.js";
import { snippet } from "./utils.js";
import {
  analyzeScriptWithDramaturgy,
  summarizeDramaturgyRulesForPrompt
} from "./dramaturgy_rules.js";

const AI_TRACE_PATTERNS = [
  { label: "意义拔高", pattern: /标志着|象征着|见证了|体现了|彰显|重要意义|关键时刻/g },
  { label: "宣传腔", pattern: /深刻|宏大|震撼|充满|极具|令人印象深刻|不可磨灭/g },
  { label: "空泛转折", pattern: /然而|此外|与此同时|值得注意的是|总而言之/g },
  { label: "否定式排比", pattern: /不只是|不仅仅|而是|不仅.*而且/g },
  { label: "模糊归因", pattern: /有人认为|专家认为|资料显示|某种意义上|可以说/g },
  { label: "AI 式托举", pattern: /复杂性|多维度|持续演变|核心作用|关键作用|深层次/g }
];

const DRAMATURGY_TERMS = [
  "剧作", "小说", "人物弧光", "角色弧光", "角色成长", "人物关系", "冲突", "动机", "欲望",
  "障碍", "选择", "代价", "伏笔", "回收", "节奏", "场景", "对白", "叙事", "文风",
  "文学", "创作规范", "故事要求", "写作要求", "感知运动影像", "母题", "骨架", "血肉",
  "灵魂", "主题", "关键情景", "时间矢量", "逻辑自洽", "旧世界态度"
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitTargets(value) {
  return String(value || "")
    .split(/[，、,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function detectAiTraces(text) {
  const source = String(text || "");
  return AI_TRACE_PATTERNS.map((item) => {
    const matches = [...source.matchAll(item.pattern)].map((match) => match[0]);
    return {
      label: item.label,
      count: matches.length,
      examples: [...new Set(matches)].slice(0, 5)
    };
  }).filter((item) => item.count > 0);
}

function getEvidenceDigest(evidence) {
  return {
    entities: evidence.entities.slice(0, 8).map((entity) => ({
      type: entity.type,
      name: entity.name,
      summary: entity.summary,
      details: entity.details
    })),
    chunks: evidence.chunks.slice(0, 8).map((chunk, index) => ({
      id: `D${index + 1}`,
      title: chunk.title,
      path: chunk.rel_path,
      excerpt: snippet(chunk.text, evidence.query, 420)
    })),
    assets: evidence.assets.slice(0, 6).map((asset, index) => ({
      id: `A${index + 1}`,
      title: asset.title,
      path: asset.rel_path,
      linkedNames: asset.linkedNames
    }))
  };
}

function buildSearchQuery(input) {
  const text = compact(input.text);
  const intent = compact(input.intent);
  const characters = splitTargets(input.characters).join(" ");
  const keywords = DRAMATURGY_TERMS.join(" ");
  return [characters, intent, text.slice(0, 160), keywords].filter(Boolean).join(" ");
}

function buildCalibration(evidence, input) {
  const targetNames = splitTargets(input.characters);
  const matchedNames = evidence.entities
    .filter((entity) => entity.type === "character" || entity.type === "organization" || entity.type === "event")
    .map((entity) => entity.name);
  const missingTargets = targetNames.filter((name) => !matchedNames.includes(name));
  const questions = [];
  if (missingTargets.length) questions.push(`未在精确证据中稳定命中：${missingTargets.join("、")}，创作前建议补充设定或改用已有名称。`);
  if (!evidence.chunks.length) questions.push("没有命中本地剧作文档片段，文学拓展只能使用角色/项目基础设定，不能假装有风格范本。");
  if (!compact(input.text)) questions.push("没有提供正文片段，只能生成创作方案，不能做逐句校准。");
  return {
    matchedNames,
    missingTargets,
    questions,
    confidence: evidence.entities.length || evidence.chunks.length ? "medium" : "low"
  };
}

function createArcNotes(evidence, input) {
  const characters = splitTargets(input.characters);
  const entities = evidence.entities.filter((entity) => !characters.length || characters.includes(entity.name));
  if (!entities.length) {
    return [{
      character: characters[0] || "待指定角色",
      currentState: "资料不足",
      innerNeed: "待从本地设定补全",
      pressure: "待从情节冲突中确定",
      turn: "需要用户确认角色在本段中的选择",
      cost: "未确认",
      visibleChange: "先保守处理，不强行写成长"
    }];
  }
  return entities.slice(0, 4).map((entity) => ({
    character: entity.name,
    currentState: entity.summary || "已有基础设定，但需要更多文本证据确认状态。",
    innerNeed: "从既有创伤、职责、欲望或信念中选一个最贴近本段的缺口，不新增未证实背景。",
    pressure: "让外部任务或关系压力迫使角色做选择，而不是只写情绪说明。",
    turn: "角色在场景中至少做一次可见选择，选择应改变信息、关系或行动方向。",
    cost: "选择要付出代价；没有代价的成长会显得像提纲。",
    visibleChange: "用动作、沉默、失误、回避或具体感官反应表现变化。"
  }));
}

function humanizeText(text) {
  let output = String(text || "").trim();
  if (!output) return "";
  output = output
    .replace(/此外，?/g, "")
    .replace(/值得注意的是，?/g, "")
    .replace(/总而言之，?/g, "")
    .replace(/不仅仅是/g, "不只是")
    .replace(/具有重要意义/g, "会影响后面的选择")
    .replace(/这不仅([^，。]+)，也象征着([^。]+)。?/g, "$1。$2不用急着宣布，应该落到她接下来的选择里。")
    .replace(/这不只是([^，。]+)，而是([^。]+)。?/g, "$1。$2要通过具体动作显出来。")
    .replace(/([^。！？!?]+)体现了([^。！？!?]+)。?/g, "$1。")
    .replace(/([^。！？!?]+)象征着([^。！？!?]+)。?/g, "$1。")
    .replace(/展现出复杂而深刻的情绪/g, "露出一瞬间没压住的迟疑")
    .replace(/展现出复杂的情绪/g, "露出一瞬间没压住的迟疑")
    .replace(/彰显了/g, "露出")
    .replace(/关键的/g, "要紧的")
    .replace(/可以说，?/g, "")
    .replace(/某种意义上，?/g, "")
    .replace(/，。/g, "。")
    .replace(/、。/g, "。")
    .replace(/。。+/g, "。");
  const sentences = output.split(/(?<=[。！？!?])/).map((line) => line.trim()).filter(Boolean);
  return sentences.map((sentence, index) => {
    if (index % 4 === 1 && sentence.length > 42) return sentence.replace(/，/u, "。");
    return sentence;
  }).join("");
}

function buildLocalRewrite(input, evidence) {
  const text = compact(input.text);
  if (!text) {
    const names = evidence.entities.slice(0, 3).map((entity) => entity.name).join("、") || "角色";
    return [
      `先把${names}放进一个有明确代价的场景。`,
      "场景里不要急着解释设定，先让人物碰到阻力：任务目标、旧伤、同伴的误解，三者选一个就够。",
      "写法上多用可见动作和具体物件，少用“她很痛苦”“她完成成长”这类总结句。"
    ].join("\n");
  }
  return humanizeText(text);
}

function buildLiteraturePrompt(input, evidence, localResult) {
  const dramaturgyRules = summarizeDramaturgyRulesForPrompt();
  return [
    "你是《新锐纪元》IP 的小说编辑、剧作校准和文学化改写助手。",
    "必须以资料库证据为准；证据不足的设定标记为待确认，不得新增角色关系、武器、组织或事件。",
    "输出简体中文，风格要像编辑部给作者的工作稿，不要宣传腔，不要空泛金句。",
    "任务包含：小说创作与校准、去 AI 味、文学化增强、角色弧光增强、按本地剧作参考形成规范。",
    "",
    `创作目标：${input.intent || "未指定"}`,
    `目标角色：${input.characters || "未指定"}`,
    `文体/语气：${input.tone || "克制、具体、具备画面感"}`,
    "",
    "用户文本：",
    input.text || "未提供正文片段",
    "",
    "资料库证据：",
    JSON.stringify(getEvidenceDigest(evidence), null, 2),
    "",
    "本地保守草稿：",
    JSON.stringify(localResult, null, 2),
    "",
    "本地剧本创作原则规则库：",
    JSON.stringify(dramaturgyRules, null, 2),
    "",
    "请返回 JSON，不要 Markdown。字段：calibration, aiTraceFixes, literaryRewrite, characterArcs, dramaturgyRules, dramaturgyReview, evidenceUse, unresolvedQuestions。"
  ].join("\n");
}

function fallbackLiteratureResult(input, evidence) {
  const aiTraces = detectAiTraces(input.text);
  const calibration = buildCalibration(evidence, input);
  const characterArcs = createArcNotes(evidence, input);
  const literaryRewrite = buildLocalRewrite(input, evidence);
  const dramaturgyReview = analyzeScriptWithDramaturgy({
    text: input.text,
    intent: input.intent,
    characters: input.characters
  });
  return {
    standard: "xinrui-literary-expansion-v1",
    mode: input.mode || "expand",
    calibration,
    aiTraceFixes: aiTraces.length ? aiTraces.map((trace) => ({
      issue: trace.label,
      examples: trace.examples,
      fix: "删除抽象托举，改成具体动作、物件、感官或因果。"
    })) : [{
      issue: "未检测到明显 AI 模式",
      examples: [],
      fix: "继续检查句长重复、空泛总结和缺少人物选择的问题。"
    }],
    literaryRewrite,
    characterArcs,
    dramaturgyRules: [
      "感知运动影像：每段情节必须明确角色感知到了什么、因此做了什么、行动制造了什么新局面。",
      "骨架：先定主母题，再安排动作；不同母题配不同动作会产生不同主题。",
      "血肉：关键情景必须能被画成图，包含台词信息差、动作细节、情绪层次、感官和时间矢量。",
      "灵魂：主题不靠标语，靠角色在代价面前的选择和克制的关键台词显出来。",
      "自洽：世界观规则、角色行为、因果链和主题方向必须互相支持。"
    ],
    dramaturgyReview,
    rewriteDirectives: dramaturgyReview.rewriteDirectives,
    upgradeChecklist: dramaturgyReview.upgradeChecklist,
    evidenceUse: getEvidenceDigest(evidence),
    unresolvedQuestions: calibration.questions
  };
}

function tryParseJson(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    const match = source.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function createLiteratureExpansion(db, config, input) {
  const normalized = {
    mode: String(input.mode || "expand"),
    text: String(input.text || "").trim(),
    intent: String(input.intent || "").trim(),
    characters: String(input.characters || "").trim(),
    tone: String(input.tone || "").trim(),
    useLlm: input.useLlm !== false
  };
  if (!normalized.text && !normalized.intent) {
    throw new Error("text or intent is required");
  }

  const query = buildSearchQuery(normalized);
  const evidence = searchDatabase(db, [query], { limit: Number(input.limit || 10), mode: "precise" });
  const fallback = fallbackLiteratureResult(normalized, evidence);
  let result = fallback;
  let llmUsed = false;
  let llmError = null;

  if (normalized.useLlm) {
    const prompt = buildLiteraturePrompt(normalized, evidence, fallback);
    const llm = await completeWithLlm(config, prompt, {
      temperature: 0.35,
      system: "你是严谨的新锐纪元 IP 小说编辑和剧作校准助手，只能依据证据扩写，必须去除 AI 腔并保留文学细节。"
    });
    if (llm.answer) {
      const parsed = tryParseJson(llm.answer);
      if (parsed && typeof parsed === "object") {
        result = { standard: "xinrui-literary-expansion-v1", ...fallback, ...parsed };
        llmUsed = true;
      } else {
        llmError = "模型返回内容不是可解析 JSON，已使用本地文学校准草稿。";
      }
    } else if (llm.error) {
      llmError = llm.error;
    }
  }

  return {
    input: normalized,
    evidence,
    result,
    llmUsed,
    llmError
  };
}
