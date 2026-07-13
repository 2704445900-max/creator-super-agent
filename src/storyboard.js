import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";
import { completeWithLlm } from "./llm.js";
import {
  buildDirectorShot,
  directorOptionsFromJson,
  directorOptionsToJson,
  getDirectorStandard,
  normalizeDirectorOptions
} from "./director_mode.js";
import { buildShotPromptSpec, getPromptStandard } from "./prompt_spec.js";
import { searchDatabase } from "./search.js";
import { planStoryboardTiming, storyboardTimingToMarkdown } from "./storyboard_timing.js";
import { ensureDir, fromJson, nowIso, snippet, toJson } from "./utils.js";

const DEFAULT_NEGATIVE_PROMPT = "低清晰度, 人物崩坏, 错误武器, 错误制服, 文字水印, 多余手指, 过度血腥";
const DEFAULT_ANIME_FILM_STYLE = "动画二次元电影级别画质，当前项目近未来东方美学，角色表演清晰，光影精致，镜头连续，适合动画过渡";

function clampShotCount(value) {
  const count = Number(value || 6);
  return Math.min(48, Math.max(3, Math.trunc(count)));
}

function splitScriptIntoBeats(script, shotCount) {
  const source = String(script || "")
    .replace(/\r/g, "")
    .split(/\n+|(?<=[。！？!?；;])/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (source.length === 0) return [];
  if (source.length >= shotCount) return source.slice(0, shotCount);

  const beats = [...source];
  while (beats.length < shotCount) {
    beats.push(source[beats.length % source.length]);
  }
  return beats;
}

function hasExplicitStoryDetails(script) {
  const clean = String(script || "").replace(/\s+/g, "");
  const sentenceCount = (String(script || "").match(/[。！？!?；;]/g) || []).length;
  const actionCount = (clean.match(/走|看|听|停|递|接|转|按|牵|进入|离开|发现|决定|等待|回头|沉默|对视|避让|确认|行动|撤离|潜入/g) || []).length;
  return clean.length >= 90 && sentenceCount >= 3 && actionCount >= 3;
}

function evidenceStoryHints(evidence) {
  const claims = (evidence.chunks || [])
    .map((chunk) => chunk.brief?.claim || "")
    .filter(Boolean)
    .slice(0, 6);
  const entities = (evidence.entities || [])
    .filter((entity) => entity.type === "character")
    .map((entity) => `${entity.name}：${entity.summary || ""}`)
    .slice(0, 6);
  return [...entities, ...claims].filter(Boolean);
}

function inferStorySpine(script, evidence, shotCount) {
  const text = String(script || "");
  const hints = evidenceStoryHints(evidence);
  const isDateStory = /约会|街头|夕阳|恋|爱人|手机|合照|项目关联角色/.test(text);
  const isActionStory = /潜入|任务|行动|撤离|战斗|枪|武器|异常|信号/.test(text);
  const spine = isDateStory ? [
    "感知：夕阳、人流和私人时间让两人暂时离开任务身份。",
    "运动：两人并肩进入街道，先保持克制距离。",
    "新感知：红灯、玻璃反光和对方视线让未说出口的关系浮现。",
    "新运动：递热饮、避让人流、轻按袖口，用动作替代直白台词。",
    "转折：手机旧合照或倒影回扣资料库中的暗线关系。",
    "选择：手指短暂靠近又分开，最后自然牵住。",
    "结果：街灯亮起，长影靠近，私人时间被保存为安静余韵。"
  ] : isActionStory ? [
    "感知：角色发现任务异常、环境压力或风险信号。",
    "运动：角色做出第一步行动，进入目标空间或改变队形。",
    "新感知：阻碍、信息差或道具状态发生变化。",
    "新运动：角色调整策略，用具体动作承担判断。",
    "转折：代价或压力显形，空间关系发生收紧。",
    "选择：角色在不完美条件下做出取舍。",
    "结果：行动后果落地，留下下一步悬念或情绪回响。"
  ] : [
    "感知：角色进入一个明确时间、地点和目标。",
    "运动：角色用具体动作推进关系或任务。",
    "新感知：环境、道具或他人反应带来变化。",
    "新运动：角色调整动作或态度。",
    "转折：故事出现可见的靠近、受阻、确认或代价。",
    "选择：角色做出一个能被画面看见的选择。",
    "结果：用环境、道具或姿态收束余韵。"
  ];
  const result = [];
  while (result.length < shotCount) {
    result.push(spine[result.length % spine.length]);
  }
  return {
    source: hasExplicitStoryDetails(script) ? "user_script_plus_local_evidence" : "local_evidence_arrangement_first",
    rule: "故事板用于创作过渡流畅的动画；每个镜头必须形成感知-运动-新感知-新运动的因果链。",
    evidenceHints: hints,
    beats: result.slice(0, shotCount)
  };
}

function describeStoryboardFrame(shot, previousShot = null, nextShot = null) {
  const current = String(shot.scene_text || "").trim();
  const prev = previousShot?.scene_text ? `承接上一镜：${previousShot.scene_text}` : "开场：建立时间、地点和人物关系。";
  const next = nextShot?.scene_text ? `引向下一镜：${nextShot.scene_text}` : "收束：让动作或情绪落到环境余韵中。";
  return `${prev} 本镜推进：${current} ${next}`;
}

function buildTransitionNote(shot, previousShot = null, nextShot = null) {
  const prevAction = previousShot?.character_action || previousShot?.scene_text || "无";
  const nextAction = nextShot?.character_action || nextShot?.scene_text || "收束";
  return `动作承接：从“${prevAction}”接入本镜；离开本镜后接“${nextAction}”。保持视线、道具状态、行动方向和情绪强度连续。`;
}

function getEvidenceRefs(evidence) {
  const refs = [];
  for (const entity of evidence.entities.slice(0, 6)) {
    refs.push({ kind: "entity", id: entity.id, name: entity.name, type: entity.type });
  }
  for (const chunk of evidence.chunks.slice(0, 6)) {
    refs.push({ kind: "chunk", id: chunk.id, title: chunk.title, path: chunk.rel_path });
  }
  for (const asset of evidence.assets.slice(0, 6)) {
    refs.push({ kind: "asset", id: asset.id, fileId: asset.file_id, title: asset.title, path: asset.rel_path });
  }
  return refs;
}

function uniqueCharacters(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const name = String(value || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    output.push(name);
  }
  return output;
}

function inferCharacters(evidence, beat, previousCharacters = []) {
  const raw = String(beat || "");
  const explicitCharacters = evidence.entities
    .filter((entity) => entity.type === "character" && raw.includes(entity.name))
    .map((entity) => entity.name)
    .slice(0, 4);
  const carriesPreviousSubject = /她|他|自己|她们|他们|队伍|小队|后队|前队|主门|侧门/.test(raw);
  if (carriesPreviousSubject && previousCharacters.length) {
    return uniqueCharacters([...previousCharacters, ...explicitCharacters]).slice(0, 4);
  }
  return explicitCharacters;
}

function buildFallbackShots(script, evidence, options) {
  const shotCount = clampShotCount(options.shotCount);
  const storySpine = inferStorySpine(script, evidence, shotCount);
  const rawBeats = splitScriptIntoBeats(script, shotCount);
  const beats = hasExplicitStoryDetails(script)
    ? rawBeats
    : storySpine.beats.map((beat, index) => rawBeats[index] ? `${beat} ${rawBeats[index]}` : beat);
  const style = String(options.style || DEFAULT_ANIME_FILM_STYLE).trim();
  const refs = getEvidenceRefs(evidence);

  let previousCharacters = [];
  const shots = beats.map((beat, index) => {
    const characters = inferCharacters(evidence, beat, previousCharacters);
    if (characters.length) previousCharacters = characters;
    const entityHints = evidence.entities
      .slice(0, 5)
      .map((entity) => `${entity.name}：${entity.summary || ""}`)
      .join("；");
    const sceneHint = evidence.chunks[0]?.text ? snippet(evidence.chunks[0].text, evidence.query, 180) : "";

    return {
      shot_index: index + 1,
      scene_text: beat,
      camera: index % 3 === 0 ? "中近景推进" : index % 3 === 1 ? "侧向跟拍" : "广角建立镜头",
      composition: index % 2 === 0 ? "主体位于画面三分线，背景保留战术环境信息" : "前景遮挡制造纵深，人物视线引导到行动目标",
      character_action: characters.length ? `${characters.join("、")}执行当前行动节点` : "角色根据剧本节奏完成战术动作或情绪反应",
      visual_prompt: [
        style,
        `镜头${index + 1}：${beat}`,
        characters.length ? `出场角色：${characters.join("、")}` : "",
        `剧作链条：${storySpine.beats[index] || ""}`,
        entityHints ? `设定依据：${entityHints}` : "",
        sceneHint ? `场景参考：${sceneHint}` : "",
        "画面要求：角色比例准确，装备可信，情绪清晰，适合分镜预览，并服务于后续动画过渡"
      ].filter(Boolean).join("；"),
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,
      characters,
      evidence_refs: refs,
      storyboard_description: "",
      transition_note: ""
    };
  });
  return shots.map((shot, index) => ({
    ...shot,
    storyboard_description: describeStoryboardFrame(shot, shots[index - 1], shots[index + 1]),
    transition_note: buildTransitionNote(shot, shots[index - 1], shots[index + 1])
  }));
}

function extractJsonArray(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  try {
    const parsed = JSON.parse(source);
    return Array.isArray(parsed) ? parsed : parsed.shots;
  } catch {
    const match = source.match(/\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeShot(rawShot, index, fallbackShot) {
  const shot = rawShot && typeof rawShot === "object" ? rawShot : {};
  const characters = Array.isArray(shot.characters) ? shot.characters : fallbackShot.characters;
  return {
    shot_index: Number(shot.shot_index || shot.index || index + 1),
    scene_text: String(shot.scene_text || shot.scene || fallbackShot.scene_text),
    camera: String(shot.camera || fallbackShot.camera || ""),
    composition: String(shot.composition || fallbackShot.composition || ""),
    character_action: String(shot.character_action || shot.action || fallbackShot.character_action || ""),
    visual_prompt: String(shot.visual_prompt || shot.prompt || fallbackShot.visual_prompt),
    negative_prompt: String(shot.negative_prompt || fallbackShot.negative_prompt || DEFAULT_NEGATIVE_PROMPT),
    storyboard_description: String(shot.storyboard_description || shot.description || fallbackShot.storyboard_description || ""),
    transition_note: String(shot.transition_note || shot.transition || fallbackShot.transition_note || ""),
    characters,
    evidence_refs: Array.isArray(shot.evidence_refs) ? shot.evidence_refs : fallbackShot.evidence_refs
  };
}

function buildStoryboardPrompt(input, evidence, fallbackShots) {
  const evidencePayload = {
    entities: evidence.entities.slice(0, 10).map((entity) => ({
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
    assets: evidence.assets.slice(0, 8).map((asset, index) => ({
      id: `A${index + 1}`,
      title: asset.title,
      path: asset.rel_path,
      type: `${asset.media_type}/${asset.asset_type}`,
      linkedNames: asset.linkedNames
    }))
  };

  return [
    "你是《当前项目》IP的分镜导演和设定校对助手。",
    "请只依据资料库证据和用户剧本生成分镜，不确定的设定不要编造。",
    "输出必须是 JSON 数组，不能有 Markdown。每个元素包含：shot_index, scene_text, camera, composition, character_action, storyboard_description, transition_note, visual_prompt, negative_prompt, characters, evidence_refs。",
    "故事板的目标是服务动画过渡：每个镜头必须说明承接上一镜、推进本镜、引向下一镜。",
    "叙事按本地剧作原则处理：用感知→运动→新感知→新运动的因果链推进；不要生成互不关联的美图。",
    `默认画风：${DEFAULT_ANIME_FILM_STYLE}。除非用户另有要求，所有提示词都以动画二次元电影级别画质为根本。`,
    `目标镜头数：${fallbackShots.length}`,
    input.timingPlan ? `目标总时长：${input.timingPlan.totalDurationSec}s；片长类型：${input.timingPlan.scale?.label || ""}；节奏：${input.timingPlan.scale?.rhythm || ""}` : "",
    input.timingPlan ? "镜头时长表：" : "",
    input.timingPlan ? JSON.stringify(input.timingPlan.shots, null, 2) : "",
    `视觉风格：${input.style || "近未来东方战术美少女动画分镜，电影感，克制真实"}`,
    "",
    "用户剧本：",
    input.script,
    "",
    "资料库证据：",
    JSON.stringify(evidencePayload, null, 2),
    "",
    "本地草稿，可在保持证据一致的前提下优化：",
    JSON.stringify(fallbackShots, null, 2)
  ].join("\n");
}

function saveStoryboardProject(db, input, evidence, shots, llmUsed) {
  const now = nowIso();
  const directorOptionsJson = directorOptionsToJson(input.director);
  const result = db.prepare(`
    INSERT INTO creative_projects (
      kind, title, source_script, style_prompt, status, llm_used, evidence_json,
      director_options_json, created_at, updated_at
    )
    VALUES ('storyboard', ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
  `).run(
    input.title,
    input.script,
    input.style || "",
    llmUsed ? 1 : 0,
    toJson(getEvidenceRefs(evidence)),
    directorOptionsJson,
    now,
    now
  );

  const projectId = Number(result.lastInsertRowid);
  const insertShot = db.prepare(`
    INSERT INTO storyboard_shots (
      project_id, shot_index, scene_text, camera, composition, character_action,
      visual_prompt, negative_prompt, storyboard_description, transition_note,
      characters_json, evidence_refs_json, status,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prompt_ready', ?, ?)
  `);

  for (const shot of shots) {
    insertShot.run(
      projectId,
      shot.shot_index,
      shot.scene_text,
      shot.camera,
      shot.composition,
      shot.character_action,
      shot.visual_prompt,
      shot.negative_prompt,
      shot.storyboard_description || "",
      shot.transition_note || "",
      toJson(shot.characters || []),
      toJson(shot.evidence_refs || []),
      now,
      now
    );
  }

  return projectId;
}

function hydrateProject(project, shots) {
  if (!project) return null;
  return {
      ...project,
      llm_used: Boolean(project.llm_used),
      evidence: fromJson(project.evidence_json, []),
      director: directorOptionsFromJson(project.director_options_json),
      shots: shots.map((shot) => ({
      ...shot,
      characters: fromJson(shot.characters_json, []),
      evidence_refs: fromJson(shot.evidence_refs_json, [])
    }))
  };
}

function archiveStoryboardToProductionProject(projectSlug, project, timingPlan) {
  const slug = String(projectSlug || "").trim();
  if (!slug) return null;
  const projectsRoot = path.resolve(getOutputRoot(), "projects");
  const projectPath = path.resolve(projectsRoot, slug);
  const relative = path.relative(projectsRoot, projectPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return { status: "invalid_project_slug", projectSlug: slug };
  }
  if (!fs.existsSync(path.join(projectPath, "project.json"))) {
    return { status: "project_not_found", projectSlug: slug, projectPath };
  }

  const blockingDir = path.join(projectPath, "04_storyboard", "blocking");
  const boardsDir = path.join(projectPath, "04_storyboard", "boards");
  ensureDir(blockingDir);
  ensureDir(boardsDir);
  const baseName = `storyboard-${project.id}`;
  const projectJson = path.join(boardsDir, `${baseName}-project.json`);
  const shotsJson = path.join(blockingDir, `${baseName}-shots.json`);
  const summaryMarkdown = path.join(boardsDir, `${baseName}-summary.md`);
  fs.writeFileSync(projectJson, `${JSON.stringify({ project, timingPlan }, null, 2)}\n`, "utf8");
  fs.writeFileSync(shotsJson, `${JSON.stringify(project.shots || [], null, 2)}\n`, "utf8");
  fs.writeFileSync(summaryMarkdown, [
    `# ${project.title}`,
    "",
    `- 工作台故事板 ID：${project.id}`,
    `- 镜头数：${project.shots?.length || 0}`,
    `- 目标时长：${timingPlan?.totalDurationSec || "待确认"} 秒`,
    `- LLM：${project.llm_used ? "已使用" : "本地规则草稿"}`,
    "",
    "## 镜头",
    "",
    ...(project.shots || []).map((shot) => `${shot.shot_index}. ${shot.scene_text}\n   - 镜头：${shot.camera}\n   - 动作：${shot.character_action}`)
  ].join("\n"), "utf8");
  return {
    status: "archived",
    projectSlug: slug,
    projectPath,
    files: { projectJson, shotsJson, summaryMarkdown }
  };
}

export async function generateStoryboard(db, config, input) {
  const script = String(input.script || "").trim();
  if (!script) throw new Error("script is required");

  const title = String(input.title || "").trim() || `分镜项目 ${new Date().toLocaleString("zh-CN")}`;
  const generic = input.disableCanonSearch === true || input.workspaceMode === "generic" || input.contentPackId === "creator-generic";
  const style = String(input.style || (generic
    ? "当前原创项目统一画风，电影感动画制作质量，角色表演清楚，光影和镜头连续"
    : "")).trim();
  const baseDirectorOptions = normalizeDirectorOptions(input.director);
  const requestedShotCount = input.shotCount ? clampShotCount(input.shotCount) : null;
  const timingPlan = planStoryboardTiming({
    title,
    script,
    style,
    requestedShotCount,
    director: baseDirectorOptions
  });
  const directorOptions = normalizeDirectorOptions({
    ...baseDirectorOptions,
    targetDurationSec: timingPlan.totalDurationSec,
    timingPlan
  });
  const shotCount = timingPlan.shotCount;
  const evidence = input.disableCanonSearch === true || input.workspaceMode === "generic" || input.contentPackId === "creator-generic"
    ? { query: script, entities: [], chunks: [], assets: [] }
    : searchDatabase(db, [script], { limit: 10 });
  const fallbackShots = buildFallbackShots(script, evidence, { shotCount, style });

  let shots = fallbackShots;
  let llmUsed = false;
  let llmError = null;

  if (input.useLlm !== false) {
    const prompt = buildStoryboardPrompt({ title, script, style, timingPlan }, evidence, fallbackShots);
    const llm = await completeWithLlm(config, prompt, {
      temperature: 0.25,
      system: generic
        ? "你是专业分镜导演和项目连续性校对助手。只基于当前项目资料，只输出符合要求的 JSON。"
        : "你是专业分镜导演，同时是严格的IP设定校对助手。只输出符合要求的 JSON。"
    });
    if (llm.answer) {
      const parsed = extractJsonArray(llm.answer);
      if (Array.isArray(parsed) && parsed.length > 0) {
        shots = parsed.slice(0, shotCount).map((shot, index) => normalizeShot(shot, index, fallbackShots[index] || fallbackShots[0]));
        while (shots.length < shotCount) shots.push(fallbackShots[shots.length]);
        llmUsed = true;
      } else {
        llmError = "模型返回内容不是可解析的 JSON 数组，已使用本地草稿。";
      }
    } else if (llm.error) {
      llmError = llm.error;
    }
  }

  const projectId = saveStoryboardProject(db, {
    title,
    script,
    style,
    director: directorOptions
  }, evidence, shots, llmUsed);
  const project = getStoryboardProject(db, projectId);
  const projectArchive = archiveStoryboardToProductionProject(input.projectSlug, project, timingPlan);
  return { project, evidence, llmUsed, llmError, timingPlan, projectArchive };
}

export function listStoryboardProjects(db, limit = 30) {
  const rows = db.prepare(`
    SELECT id, kind, title, status, llm_used, created_at, updated_at,
      (SELECT COUNT(*) FROM storyboard_shots WHERE project_id = creative_projects.id) AS shot_count
    FROM creative_projects
    WHERE kind = 'storyboard'
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(Number(limit || 30));
  return rows.map((row) => ({ ...row, llm_used: Boolean(row.llm_used) }));
}

export function getStoryboardProject(db, projectId) {
  const project = db.prepare(`
    SELECT id, kind, title, source_script, style_prompt, status, llm_used, evidence_json,
      director_options_json, created_at, updated_at
    FROM creative_projects
    WHERE id = ? AND kind = 'storyboard'
  `).get(Number(projectId));
  if (!project) return null;

  const shots = db.prepare(`
    SELECT id, project_id, shot_index, scene_text, camera, composition, character_action,
      visual_prompt, negative_prompt, storyboard_description, transition_note,
      characters_json, evidence_refs_json, status,
      image_asset_file_id, created_at, updated_at
    FROM storyboard_shots
    WHERE project_id = ?
    ORDER BY shot_index
  `).all(Number(projectId));

  return hydrateProject(project, shots);
}

export function buildStoryboardPromptPack(project, visualReferences = []) {
  if (!project) return null;
  const promptStandard = getPromptStandard();
  const directorStandard = getDirectorStandard();
  const directorOptions = normalizeDirectorOptions(project.director);
  return {
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      style: project.style_prompt,
      llmUsed: Boolean(project.llm_used),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      shotCount: project.shots.length,
      totalDurationSec: directorOptions.timingPlan?.totalDurationSec || directorOptions.targetDurationSec || null,
      promptStandard: promptStandard.name,
      directorStandard: directorStandard.name,
      director: directorOptions
    },
    sourceScript: project.source_script,
    evidence: project.evidence || [],
    promptStandard,
    directorStandard,
    visualReferences: visualReferences.map((item) => ({
      fileId: item.file_id,
      title: item.title,
      path: item.rel_path,
      absPath: item.absPath,
      visualKind: item.visualKind,
      visualKindLabel: item.visualKindLabel,
      promptRole: item.promptRole,
      promptRoleLabel: item.promptRoleLabel,
      subjectNames: item.subjectNames,
      namingScore: item.namingScore,
      reason: item.reason
    })),
    timingPlan: directorOptions.timingPlan || null,
    shots: project.shots.map((shot, index) => {
      const promptSpec = buildShotPromptSpec(project, shot, visualReferences);
      return {
        index: shot.shot_index,
        scene: shot.scene_text,
        camera: shot.camera,
        composition: shot.composition,
        action: shot.character_action,
        storyboardDescription: shot.storyboard_description || describeStoryboardFrame(shot, project.shots?.[index - 1], project.shots?.[index + 1]),
        transitionNote: shot.transition_note || buildTransitionNote(shot, project.shots?.[index - 1], project.shots?.[index + 1]),
        characters: shot.characters || [],
        positivePrompt: shot.visual_prompt,
        negativePrompt: shot.negative_prompt || DEFAULT_NEGATIVE_PROMPT,
        evidenceRefs: shot.evidence_refs || [],
        promptSpec,
        directorShot: buildDirectorShot(project, shot, promptSpec, directorOptions, index + 1)
      };
    })
  };
}

export function storyboardPromptPackToMarkdown(pack) {
  if (!pack) return "";
  const lines = [
    `# ${pack.project.title}`,
    "",
    `- 项目ID：${pack.project.id}`,
    `- 镜头数：${pack.project.shotCount}`,
    pack.project.totalDurationSec ? `- 目标总时长：${pack.project.totalDurationSec}s` : "",
    `- 提示词规范：${pack.project.promptStandard || "creator-storyboard-v1"}`,
    `- 导演模式：${pack.project.directorStandard || "creator-director-storyboard-v1"}`,
    `- 目标视频模型：${pack.project.director?.targetModel || "Seedance 2.0"}`,
    `- 画幅/FPS：${pack.project.director?.aspectRatio || "16:9"} / ${pack.project.director?.fps || 24}fps`,
    `- 生成模式：${pack.project.llmUsed ? "大模型优化" : "本地草稿"}`,
    `- 画面风格：${pack.project.style || "未指定"}`,
    "",
    "## 原始剧本",
    "",
    pack.sourceScript || "未记录",
    "",
    "## 分镜绘图提示词"
  ];

  if (pack.timingPlan) {
    lines.push("", "## 分镜时长规划", "", storyboardTimingToMarkdown(pack.timingPlan).trim());
  }

  for (const shot of pack.shots) {
    lines.push(
      "",
      `### 镜头 ${shot.index}`,
      "",
      `场景：${shot.scene}`,
      "",
      `机位：${shot.camera || "未指定"}`,
      "",
      `构图：${shot.composition || "未指定"}`,
      "",
      `行动：${shot.action || "未指定"}`,
      "",
      `分镜图描述：${shot.storyboardDescription || "未指定"}`,
      "",
      `转场承接：${shot.transitionNote || "未指定"}`,
      "",
      `角色：${shot.characters.length ? shot.characters.join("、") : "未指定"}`,
      "",
      "正向提示词：",
      "",
      "```text",
      shot.promptSpec?.positivePrompt || shot.positivePrompt || "",
      "```",
      "",
      "负向提示词：",
      "",
      "```text",
      shot.promptSpec?.negativePrompt || shot.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
      "```",
      "",
      "参考图计划：",
      "",
      `- 人物一致性：${shot.promptSpec?.referencePlan?.summary?.identity || "未命中"}`,
      `- 构图参考：${shot.promptSpec?.referencePlan?.summary?.shot || "未命中"}`,
      `- 风格/场景：${shot.promptSpec?.referencePlan?.summary?.style || "未命中"}`,
      "",
      "控制建议：",
      "",
      ...((shot.promptSpec?.controlHints || []).map((hint) => `- ${hint}`)),
      "",
      "导演模式视频提示词：",
      "",
      "```text",
      shot.directorShot?.seedancePrompt || "",
      "```",
      "",
      `- 时长：${shot.directorShot?.durationSec || "未指定"} 秒`,
      `- 画幅：${shot.directorShot?.aspectRatio || "未指定"}`,
      `- 焦段：${shot.directorShot?.camera?.lens || "未指定"}`,
      `- 机动：${shot.directorShot?.camera?.movement || "未指定"}`,
      `- 180度轴线：${shot.directorShot?.axis?.subjectSide || "未指定"}`,
      `- 场景连续性：${shot.directorShot?.continuity?.sceneContinuity || "未指定"}`,
      "",
      "复核清单：",
      "",
      ...((shot.promptSpec?.reviewChecklist || []).map((item) => `- ${item}`))
    );
  }

  if (pack.visualReferences?.length > 0) {
    lines.push("", "## 视觉参考图");
    for (const ref of pack.visualReferences) {
      lines.push("", `- #${ref.fileId} ${ref.title} / ${ref.promptRoleLabel} / ${ref.reason}`);
      lines.push(`  ${ref.path}`);
    }
  }

  if (pack.evidence.length > 0) {
    lines.push("", "## 证据引用");
    for (const ref of pack.evidence) {
      lines.push("", `- ${ref.kind}: ${ref.name || ref.title || ref.path || ref.id}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
