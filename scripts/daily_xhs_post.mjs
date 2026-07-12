import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");

function loadDotEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const apiBase = process.env.XINRUI_API_BASE || "http://127.0.0.1:8787";
const generateImage = !process.argv.includes("--no-image") && process.env.XHS_GENERATE_IMAGE !== "0";
const imageModel = resolveImageModel(process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
const imageSize = process.env.OPENAI_IMAGE_SIZE || "1024x1536";
const imageQuality = process.env.OPENAI_IMAGE_QUALITY || "medium";
const imageFormat = process.env.OPENAI_IMAGE_FORMAT || "png";
const outputDir = path.join(projectRoot, "output", "xhs-daily");
const logsDir = path.join(projectRoot, "logs");
const statePath = path.join(outputDir, "state.json");
const force = process.argv.includes("--force");

const themes = [
  {
    id: "daily",
    label: "角色日常",
    query: "角色 日常 队内",
    titleSeeds: ["她把战斗藏进很小的习惯里", "林小队的日常，没有那么轻松", "这个角色越看越有后劲"],
    scene: "任务间隙的休整区",
    mood: "安静、克制、带一点生活气",
    tags: ["角色日常", "战术少女", "小红书追番"]
  },
  {
    id: "combat",
    label: "战斗切片",
    query: "战斗 作战 行动",
    titleSeeds: ["真正紧张的不是开火那一秒", "她出手前，空气先安静了", "这段如果做成动画会很带感"],
    scene: "低光环境下的行动现场",
    mood: "紧张、冷静、电影感",
    tags: ["战斗分镜", "近未来战术", "原创IP"]
  },
  {
    id: "logistics",
    label: "任务后勤",
    query: "后勤 装备 维修 善后",
    titleSeeds: ["战斗结束以后，真正累人的事才开始", "林小队最容易被忽略的一面", "她们的后勤也很好看"],
    scene: "临时装备维护点",
    mood: "疲惫但可靠、细节感强",
    tags: ["任务后勤", "设定细节", "林小队"]
  },
  {
    id: "equipment",
    label: "装备细节",
    query: "装备 武器 维护 系统",
    titleSeeds: ["一件装备能看出一个人的脾气", "她的装备不是摆设", "这种细节我真的会停下来多看两眼"],
    scene: "桌面铺开装备与任务资料",
    mood: "精密、实用、略带压迫感",
    tags: ["装备设定", "战术装备", "角色设计"]
  },
  {
    id: "darkline",
    label: "敌对势力暗线",
    query: "法特提 古蒂斯 认知战 暗线",
    titleSeeds: ["反派最可怕的地方，是它看起来很正常", "这条暗线有点冷", "她们面对的不是普通敌人"],
    scene: "屏幕冷光照亮的情报室",
    mood: "悬疑、冷光、信息压迫",
    tags: ["世界观", "反派设定", "悬疑感"]
  },
  {
    id: "team-bond",
    label: "队内小互动",
    query: "队内 关系 小队",
    titleSeeds: ["她们不是一直在燃，也会互相接住", "林小队这种相处方式很戳我", "越是轻描淡写，越能看出关系"],
    scene: "任务车内或走廊转角",
    mood: "温暖、疲惫、克制的亲密感",
    tags: ["队内互动", "群像", "角色关系"]
  },
  {
    id: "scar",
    label: "心理创伤与恢复",
    query: "创伤 失眠 心理 急救",
    titleSeeds: ["她没有说疼，但你能看出来", "这类角色最动人的地方不在胜利", "有些伤不会写在战报里"],
    scene: "凌晨的医务角或宿舍窗边",
    mood: "低声、留白、真实疲惫",
    tags: ["角色弧光", "心理创伤", "群像故事"]
  },
  {
    id: "bureau-file",
    label: "协调局档案感",
    query: "协调局 档案 非常规威胁",
    titleSeeds: ["如果协调局有一页非公开档案", "这不是都市传说，是任务记录", "档案里的她，比台词更锋利"],
    scene: "协调局档案室",
    mood: "冷静、档案感、带一点危险气味",
    tags: ["协调局档案", "世界观设定", "原创企划"]
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveImageModel(model) {
  const value = String(model || "").trim();
  if (value === "image-2") return "gpt-image-2";
  return value || "gpt-image-2";
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sanitizeFilePart(value) {
  return String(value)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

function todayKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function seededIndex(seed, length) {
  if (length <= 0) return 0;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % length;
}

function pickRotating(items, seed, recentValues, getKey) {
  if (items.length === 0) return null;
  const start = seededIndex(seed, items.length);
  for (let offset = 0; offset < items.length; offset += 1) {
    const item = items[(start + offset) % items.length];
    if (!recentValues.includes(getKey(item))) return item;
  }
  return items[start];
}

function compactEntity(row) {
  return {
    ...row,
    aliases: parseJson(row.aliases_json, []),
    details: parseJson(row.details_json, {})
  };
}

async function request(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (process.env.ADMIN_TOKEN) headers["x-admin-token"] = process.env.ADMIN_TOKEN;

  const response = await fetch(`${apiBase}${pathname}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(options.timeoutMs || 30000)
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
  }
  if (!text.trim()) return null;
  return JSON.parse(text);
}

async function generateOpenAiImage({ prompt, negativePrompt, outputPath }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!generateImage) {
    return { status: "disabled", reason: "image generation disabled" };
  }
  if (!apiKey) {
    return { status: "skipped", reason: "OPENAI_API_KEY is not set" };
  }

  const imageApiBase = process.env.OPENAI_IMAGE_API_BASE || "https://api.openai.com/v1";
  const response = await fetch(`${imageApiBase.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: imageModel,
      prompt: `${prompt}\n\n避免：${negativePrompt}`,
      size: imageSize,
      quality: imageQuality,
      output_format: imageFormat,
      n: 1
    }),
    signal: AbortSignal.timeout(Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 180000))
  });

  const text = await response.text();
  if (!response.ok) {
    return {
      status: "failed",
      reason: `${response.status} ${response.statusText}: ${text.slice(0, 500)}`
    };
  }

  const result = JSON.parse(text);
  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) {
    return { status: "failed", reason: "OpenAI image response did not include data[0].b64_json" };
  }

  fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
  return {
    status: "generated",
    path: outputPath,
    model: imageModel,
    size: imageSize,
    quality: imageQuality,
    format: imageFormat,
    usage: result.usage || null
  };
}

async function isServiceReady() {
  try {
    await request("/api/config", { timeoutMs: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function ensureService() {
  if (await isServiceReady()) return "already-running";

  ensureDir(logsDir);
  const child = spawn(process.execPath, ["--no-warnings", path.join(projectRoot, "src", "server.js")], {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();

  for (let attempt = 0; attempt < 90; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await isServiceReady()) return "started";
  }
  throw new Error(`本地 IP 服务未能启动：${apiBase}`);
}

async function syncSource() {
  try {
    return await request("/api/sync", {
      method: "POST",
      body: "{}",
      timeoutMs: 120000
    });
  } catch (error) {
    if (String(error.message).includes("409")) {
      return { skipped: true, reason: "sync already in progress" };
    }
    throw error;
  }
}

async function getEntitiesByType(type) {
  const result = await request(`/api/entities?type=${encodeURIComponent(type)}`);
  return (result.items || []).map(compactEntity);
}

async function searchEvidence(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    limit: String(options.limit || 6)
  });
  if (options.mode !== null) params.set("mode", options.mode || "precise");
  if (options.entityType) params.set("entityType", options.entityType);
  return request(`/api/search?${params.toString()}`);
}

function getLocalReferenceAssets(searchResult, targetName, limit = 5) {
  const priority = {
    character_turnaround: 0,
    character_card: 1,
    character_portrait: 2,
    general_asset: 3
  };
  const seen = new Set();
  return (searchResult?.assets || [])
    .filter((asset) => {
      const assetType = String(asset.asset_type || "");
      const pathText = `${asset.rel_path || ""} ${asset.abs_path || ""}`;
      const key = asset.abs_path || asset.rel_path;
      const isImage = asset.media_type === "image";
      const belongsToTarget = targetName ? pathText.includes(targetName) : true;
      const isCharacterDesignAsset = assetType.startsWith("character_") || pathText.includes("角色立绘");
      const hasDesignMarker = /角色立绘|角色卡|三视图|单张立绘/.test(pathText);
      if (!isImage || !belongsToTarget || !isCharacterDesignAsset || !hasDesignMarker || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (priority[a.asset_type] ?? 9) - (priority[b.asset_type] ?? 9) || String(a.rel_path).localeCompare(String(b.rel_path), "zh-Hans-CN"))
    .slice(0, limit);
}

async function resolveTargetWithLocalReferences(characters, dateKey, recentTargetNames, initialTarget) {
  const findReferences = async (target) => {
    const visualEvidence = await searchEvidence(target.name, { limit: 30, mode: null });
    return {
      visualEvidence,
      localReferences: getLocalReferenceAssets(visualEvidence, target.name, 5)
    };
  };

  const first = await findReferences(initialTarget);
  if (first.localReferences.length) return { target: initialTarget, ...first };

  const start = seededIndex(`${dateKey}:visual-character`, characters.length);
  const rotated = [...characters.slice(start), ...characters.slice(0, start)];
  const candidates = [
    ...rotated.filter((item) => !recentTargetNames.includes(item.name)),
    ...rotated.filter((item) => recentTargetNames.includes(item.name))
  ];
  const tried = new Set([initialTarget.name]);

  for (const candidate of candidates) {
    if (tried.has(candidate.name)) continue;
    tried.add(candidate.name);
    const found = await findReferences(candidate);
    if (found.localReferences.length) return { target: candidate, ...found };
  }

  return { target: initialTarget, ...first };
}

function localReferencePrompt(referenceAssets) {
  if (!referenceAssets?.length) return "";
  const references = referenceAssets.map((asset) => `${asset.asset_type}: ${asset.abs_path || asset.rel_path}`).join(" | ");
  return [
    "STRICT LOCAL CANON REFERENCES: use these local character resources as the visual source of truth.",
    references,
    "Do not redesign the character. Preserve referenced silhouette, hairstyle, uniform structure, equipment shapes, color palette, and signature accessories."
  ].join(" ");
}

function confirmed(value) {
  const text = String(value || "").trim();
  if (!text || /待确认|待补全|needs_human_review/i.test(text)) return "";
  return text;
}

function detailFacts(entity) {
  const details = entity.details || {};
  const facts = [];
  if (entity.summary) facts.push(entity.summary);
  if (confirmed(details.position)) facts.push(`队内职责：${details.position}`);
  if (confirmed(details.origin)) facts.push(`出身：${details.origin}`);
  if (confirmed(details.weapon)) facts.push(`常用武器：${details.weapon}`);
  if (confirmed(details.birthday)) facts.push(`生日：${details.birthday}`);
  if (confirmed(details.role)) facts.push(`定位：${details.role}`);
  if (confirmed(details.function)) facts.push(`职能：${details.function}`);
  if (confirmed(details.ideology)) facts.push(`理念：${details.ideology}`);
  if (confirmed(details.scope)) facts.push(`范围：${details.scope}`);
  return facts;
}

function capabilityPhrase(entity) {
  const position = confirmed(entity.details?.position);
  if (position) return position.split(/[\/、,，]/).slice(0, 2).join("、");
  const summary = String(entity.summary || "");
  const match = summary.match(/擅长([^，。]+)/);
  if (match) return match[1];
  return "把自己的位置守得很稳";
}

function roleNoun(entity) {
  const position = confirmed(entity.details?.position);
  if (position) return position.split(/[\/、,，]/)[0];
  return entity.type === "organization" ? "势力" : "队员";
}

function pickOrganization(theme, organizations, seed) {
  if (theme.id === "darkline") {
    const dark = organizations.filter((org) => /法特提|古蒂斯|影碟|新人类|金海|纽曼/.test(`${org.name}${org.summary}`));
    return dark[seededIndex(seed, dark.length || 1)] || organizations[0] || null;
  }
  const bureau = organizations.find((org) => org.name.includes("协调局"));
  const team = organizations.find((org) => org.name.includes("林小队"));
  if (theme.id === "bureau-file" && bureau) return bureau;
  return team || bureau || organizations[0] || null;
}

function makeDraft({ dateKey, target, org, theme }) {
  const cap = capabilityPhrase(target);
  const role = roleNoun(target);
  const orgLine = org ? `${org.name}这条线也在旁边压着：${org.summary}` : "";

  const openers = {
    daily: `今天想写${target.name}一个很小的瞬间。不是高光镜头，是任务间隙那种没人会剪进预告片的几分钟。`,
    combat: `${target.name}的战斗感，不是靠喊出来的。她更像那种先把呼吸压低、再把局面一点点收紧的人。`,
    logistics: `战斗结束以后，${target.name}还不能真正下线。${role}这几个字写起来干脆，落到现场就是一堆细碎的收尾。`,
    equipment: `有时候看一个角色，不一定要先看大招。看${target.name}怎么对待装备，反而更准。`,
    darkline: `今天这条不写热血，写一点冷的。${target.name}面对的麻烦，很多时候不是一个站在门口的敌人。`,
    "team-bond": `林小队的关系好看，不是因为她们总在说漂亮话。更多时候，是${target.name}这种人把事情默默接过去。`,
    scar: `${target.name}身上最戳我的地方，是她没有被写成永远满电的人。她能撑住，但撑住本身就很累。`,
    "bureau-file": `如果协调局档案里有一页写到${target.name}，我猜它不会太煽情。可能只有几行任务记录，读完反而更安静。`
  };

  const middles = {
    daily: `她的设定里有很明确的职责：${cap}。但我更愿意把它想成具体画面：灯还亮着，屏幕边缘有一圈冷光，她把手边的东西重新归位，然后才想起自己还没喝水。`,
    combat: `资料里写她是${cap}。这不是标签，是动作逻辑。她知道自己该站在哪里，也知道什么时候不该多说一句。越克制，越有危险感。`,
    logistics: `她要处理的可能是设备、伤员、战场残留信息，也可能只是把队友从过载的状态里拽回来。没有哪个动作特别戏剧化，但少了她，队伍会明显失衡。`,
    equipment: `她不是把装备当装饰的人。${cap}决定了她看东西的方式：哪里会坏，哪里会拖慢节奏，哪里会在最糟糕的时候救命。`,
    darkline: `${orgLine} 这种对手很烦，因为它不一定用枪口出现。它可能藏在舆论、实验、资本或者一段看似正常的技术说明里。${target.name}必须先看懂它，才谈得上赢。`,
    "team-bond": `她的强不是那种把所有人推开的强。更像队伍里某个固定的支点，平时不抢镜，事情乱起来时大家会本能地往她那边看一眼。`,
    scar: `档案能写职责，写不出凌晨三点醒来的那一下。${cap}让她在任务里可靠，可可靠的人也会累。这个缝隙一出现，角色就活了。`,
    "bureau-file": `${orgLine} ${target.name}在这套体系里不是符号，她有具体职责：${cap}。档案越冷，越能衬出她做的事有多贴近危险。`
  };

  const closers = [
    `我喜欢这种写法。它不急着告诉你她多厉害，只让你看见她把一件事做完。`,
    `这类角色如果画出来，最好别太用力。一个眼神、一盏冷灯、袖口上的灰，已经够了。`,
    `如果以后做成连续推文，我想把这些小瞬间攒起来。角色就是这么慢慢站住的。`
  ];

  return [
    openers[theme.id],
    middles[theme.id],
    closers[seededIndex(`${dateKey}${target.name}${theme.id}`, closers.length)]
  ].join("\n\n");
}

function humanizeText(text) {
  return text
    .replace(/作为([^，。]+)[，,]/g, "$1，")
    .replace(/此外，?/g, "")
    .replace(/不仅仅?是([^，。]+)，?而是/g, "不是$1，是")
    .replace(/展现了|体现了|彰显了/g, "写出了")
    .replace(/至关重要的|关键性的|核心的/g, "重要的")
    .replace(/充满活力的|丰富的|深刻的/g, "")
    .replace(/——/g, "，")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function makeTags(target, org, theme) {
  const base = ["新锐纪元", "原创角色", "原创世界观", "林小队"];
  const names = [target.name, org?.name].filter(Boolean);
  return [...new Set([...base, ...theme.tags, ...names])]
    .slice(0, 10)
    .map((tag) => `#${tag.replace(/\s+/g, "")}`);
}

function makeImagePrompt({ target, org, theme, referenceAssets = [] }) {
  const facts = detailFacts(target).slice(0, 4).join("；");
  const orgHint = org ? `背景关联：${org.name}，${org.summary}` : "";
  const positivePrompt = [
    localReferencePrompt(referenceAssets),
    "竖版 3:4，小红书宣传插图，近未来东方战术美少女动画风，电影感构图，克制真实，不夸张卖萌",
    `主体角色：${target.name}，${facts}`,
    `场景：${theme.scene}`,
    `情绪：${theme.mood}`,
    orgHint,
    "画面需要有明确人物、可读的装备细节、自然光影、适合封面裁切，避免文字水印"
  ].filter(Boolean).join("；");

  const negativePrompt = [
    "低清晰度",
    "多余手指",
    "肢体错误",
    "过度暴露",
    "血腥夸张",
    "塑料质感",
    "纯背景无人物",
    "错误武器",
    "文字水印",
    "logo乱入"
  ].join("，");

  return { positivePrompt, negativePrompt };
}

function referenceLines(referenceAssets) {
  return (referenceAssets || []).map((asset) => `本地视觉参考：${asset.asset_type} / ${asset.rel_path} / ${asset.abs_path}`);
}

function evidenceLines({ target, org, characterEvidence, orgEvidence }) {
  const lines = [];
  for (const fact of detailFacts(target)) lines.push(`${target.name}：${fact}`);
  if (org) {
    for (const fact of detailFacts(org).slice(0, 3)) lines.push(`${org.name}：${fact}`);
  }
  for (const chunk of (characterEvidence.chunks || []).slice(0, 3)) {
    lines.push(`文档片段：${chunk.title} / ${chunk.rel_path}`);
  }
  for (const asset of [...(characterEvidence.assets || []), ...(orgEvidence?.assets || [])].slice(0, 3)) {
    lines.push(`相关素材：${asset.rel_path}`);
  }
  return [...new Set(lines)];
}

function buildMarkdown(result) {
  const imageOutputLine = result.imageOutput?.status === "generated"
    ? `![生成插图](${result.imageOutput.path})`
    : `插图生成状态：${result.imageOutput?.status || "unknown"}（${result.imageOutput?.reason || "无详情"}）`;

  return `# ${result.title}

生成日期：${result.dateKey}
主题：${result.theme.label}
角色：${result.target.name}
关联组织：${result.org?.name || "无"}

## 小红书正文

${result.body}

## 话题标签

${result.tags.join(" ")}

## 配图正向 Prompt

${result.image.positivePrompt}

## 配图反向 Prompt

${result.image.negativePrompt}

## 生成插图

${imageOutputLine}

## 设定依据

${result.evidence.map((item) => `- ${item}`).join("\n")}

## 本地视觉参考

${result.localReferences?.length ? result.localReferences.map((item) => `- ${item.rel_path}\n  - ${item.abs_path}`).join("\n") : "- 未找到角色卡/三视图/立绘资源，本次仅按文字设定生成。"}

## 运行记录

- 本地 IP 服务：${result.serviceStatus}
- 同步结果：${result.syncSummary}
- 图像模型：${imageModel}，${imageSize}，${imageQuality}，${imageFormat}
`;
}

function syncSummary(syncResult) {
  if (syncResult?.skipped) return syncResult.reason;
  const stats = syncResult?.stats;
  if (!stats) return "未返回同步统计";
  return `scanned ${stats.scanned}, inserted ${stats.inserted}, updated ${stats.updated}, unchanged ${stats.unchanged}, deleted ${stats.deleted}, errors ${stats.errors}`;
}

async function main() {
  ensureDir(outputDir);
  const dateKey = todayKey();
  const state = readJson(statePath, { runs: [] });
  const previousToday = state.runs.find((run) => run.dateKey === dateKey);
  if (previousToday && !force) {
    console.log(`今日内容已生成：${previousToday.markdownPath}`);
    return;
  }

  const serviceStatus = await ensureService();
  const syncResult = await syncSource();
  const [characters, organizations] = await Promise.all([
    getEntitiesByType("character"),
    getEntitiesByType("organization")
  ]);

  if (characters.length === 0) throw new Error("资料库没有角色实体，无法生成日更内容。");
  const recent = state.runs.slice(-5);
  const initialTarget = pickRotating(characters, `${dateKey}:character`, recent.map((run) => run.targetName), (item) => item.name);
  const { target, localReferences } = await resolveTargetWithLocalReferences(
    characters,
    dateKey,
    recent.map((run) => run.targetName),
    initialTarget
  );
  const theme = pickRotating(themes, `${dateKey}:theme:${target.name}`, recent.map((run) => run.themeId), (item) => item.id);
  const org = pickOrganization(theme, organizations, `${dateKey}:org:${target.name}:${theme.id}`);

  const [characterEvidence, orgEvidence] = await Promise.all([
    searchEvidence(`${target.name} ${theme.query}`, { entityType: "character", limit: 10 }),
    org ? searchEvidence(`${org.name} ${theme.query}`, { entityType: "organization", limit: 5 }) : Promise.resolve(null)
  ]);

  const title = theme.titleSeeds[seededIndex(`${dateKey}${target.name}${theme.id}`, theme.titleSeeds.length)];
  const body = humanizeText(makeDraft({ dateKey, target, org, theme }));
  const tags = makeTags(target, org, theme);
  const image = makeImagePrompt({ target, org, theme, referenceAssets: localReferences });
  const evidence = [...evidenceLines({ target, org, characterEvidence, orgEvidence }), ...referenceLines(localReferences)];
  const fileBase = `${dateKey}-${sanitizeFilePart(target.name)}-${sanitizeFilePart(theme.label)}`;
  const imagePath = path.join(outputDir, `${fileBase}.${imageFormat}`);
  const imageOutput = await generateOpenAiImage({
    prompt: image.positivePrompt,
    negativePrompt: image.negativePrompt,
    outputPath: imagePath
  });

  const result = {
    dateKey,
    title,
    theme: { id: theme.id, label: theme.label },
    target: { name: target.name, type: target.type, summary: target.summary, details: target.details },
    org: org ? { name: org.name, type: org.type, summary: org.summary, details: org.details } : null,
    body,
    tags,
    image,
    imageOutput,
    localReferences,
    evidence,
    serviceStatus,
    syncSummary: syncSummary(syncResult)
  };

  const markdownPath = path.join(outputDir, `${fileBase}.md`);
  const jsonPath = path.join(outputDir, `${fileBase}.json`);
  fs.writeFileSync(markdownPath, buildMarkdown(result), "utf8");
  writeJson(jsonPath, result);

  const runRecord = {
    dateKey,
    targetName: target.name,
    themeId: theme.id,
    orgName: org?.name || null,
    markdownPath,
    jsonPath,
    generatedAt: new Date().toISOString()
  };
  state.runs = state.runs.filter((run) => !(run.dateKey === dateKey && force));
  state.runs.push(runRecord);
  state.runs = state.runs.slice(-120);
  writeJson(statePath, state);

  console.log(`已生成：${markdownPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
