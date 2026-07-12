import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { fromJson, nowIso, toJson } from "./utils.js";

const IMAGE_KIND_LABELS = {
  character_portrait: "角色身份参考",
  character_turnaround: "角色三视图",
  character_card: "角色卡",
  military_portrait: "军装角色参考",
  storyboard_frame: "分镜画面参考",
  comic_panel: "漫画画面参考",
  scene_design: "场景设计参考",
  weapon_design: "武器道具参考",
  costume_equipment: "服装装备参考",
  logo: "标识世界观参考",
  animation_frame: "序列帧参考",
  style_reference: "风格参考",
  reference: "通用参考图",
  temporary_image: "临时图片",
  general_asset: "通用素材"
};

const ROLE_LABELS = {
  identity_reference: "身份一致性",
  shot_reference: "分镜构图",
  scene_reference: "场景氛围",
  prop_reference: "装备道具",
  style_reference: "风格气质",
  review_only: "仅供人工复核"
};

const TEMPORARY_HINTS = ["临时", "草稿", "废案", "旧版", "未采用", "测试", "截图", "缓存"];
const STORYBOARD_HINTS = ["分镜", "故事板", "镜头", "第", "shot", "storyboard"];
const STYLE_HINTS = ["参考", "风格", "世界观", "logo", "设定"];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const GENERIC_VISUAL_TERMS = new Set(["角色", "立绘", "视觉", "参考", "图片", "素材", "年龄", "身份", "形象", "设定"]);
const PRIMARY_IDENTITY_ANCHOR_KINDS = new Set(["character_card", "character_turnaround"]);
const SUPPLEMENTAL_CHARACTER_DESIGN_KINDS = new Set(["character_portrait", "military_portrait"]);
const IDENTITY_REFERENCE_RANK = {
  character_card: 0,
  character_turnaround: 1,
  character_portrait: 12,
  military_portrait: 14
};

function splitTerms(value) {
  return String(value || "")
    .replace(/[，。！？；：、"'“”（）()[\]{}<>\\/|_-]+/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function unique(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const clean = String(value || "").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    output.push(clean);
  }
  return output;
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function identityReferenceRank(visualKind = "") {
  return IDENTITY_REFERENCE_RANK[visualKind] ?? 50;
}

export function getIdentityReferencePolicy(visualKind = "") {
  if (PRIMARY_IDENTITY_ANCHOR_KINDS.has(visualKind)) {
    return {
      referenceTier: "primary_identity_anchor",
      referenceTierLabel: "一级身份锚",
      identityUse: "锁定角色卡/三视图中的脸型、发型、瞳色、发饰、体态和基础比例。",
      designUse: "可作为默认着装来源；若另选场景服装，仍只作身份锚，不参与混穿。",
      canAnchorIdentity: true,
      canDefineCostume: true,
      requiresDiscriminationReview: true,
      mixingAllowed: false,
      rule: "角色一致性优先使用角色卡和三视图；正式生成前必须甄别确认。"
    };
  }
  if (SUPPLEMENTAL_CHARACTER_DESIGN_KINDS.has(visualKind)) {
    return {
      referenceTier: "supplemental_character_design",
      referenceTierLabel: "补充设计候选",
      identityUse: "只能补充该角色在特定场景、服装或装备状态下的设计，不替代角色卡/三视图。",
      designUse: "每个角色每个镜头只能选一个补充设计作为着装锁，禁止与其他立绘混穿。",
      canAnchorIdentity: false,
      canDefineCostume: true,
      requiresDiscriminationReview: true,
      mixingAllowed: false,
      rule: "其他立绘是该角色的补充设计，可按场景调用；不得把多个立绘的服装、护具、配饰拼接混搭。"
    };
  }
  return {
    referenceTier: "non_identity_reference",
    referenceTierLabel: "非身份参考",
    identityUse: "不用于角色身份锁。",
    designUse: "按场景、道具或风格参考使用。",
    canAnchorIdentity: false,
    canDefineCostume: false,
    requiresDiscriminationReview: false,
    mixingAllowed: false,
    rule: "非角色身份参考不得改写角色脸、发型、服装或装备设定。"
  };
}

function specificSearchTerms(terms) {
  return unique(terms)
    .map((term) => String(term || "").trim())
    .filter((term) => term.length >= 2)
    .filter((term) => !GENERIC_VISUAL_TERMS.has(term))
    .filter((term) => /[\u4e00-\u9fa5]{2,}/.test(term) || term.length >= 4);
}

function getSourceRoot() {
  try {
    return loadConfig().sourceRoot;
  } catch {
    return "";
  }
}

function hasIdentityVisualForTerm(term) {
  const sourceRoot = getSourceRoot();
  const visualRoot = path.join(sourceRoot, "角色立绘");
  if (!term || !sourceRoot || !fs.existsSync(visualRoot)) return false;

  const stack = [visualRoot];
  let checked = 0;
  while (stack.length && checked < 2500) {
    const current = stack.pop();
    checked += 1;
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === term) return true;
        stack.push(path.join(current, entry.name));
        continue;
      }
      if (!entry.isFile() || !IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      const baseName = path.basename(entry.name, path.extname(entry.name));
      if (baseName === term || baseName.startsWith(term)) return true;
    }
  }
  return false;
}

function isCharacterEntityType(type) {
  return /character|person|cast|角色|人物|队员|成员/i.test(String(type || ""));
}

function resolveIdentityTerms(db, terms, character, role) {
  if (role && role !== "identity_reference") return [];
  const specific = specificSearchTerms([...terms, character]);
  const identityTerms = [];
  if (character) identityTerms.push(character);

  try {
    const entities = getEntityNames(db);
    for (const entity of entities) {
      if (!isCharacterEntityType(entity.type)) continue;
      if (specific.includes(entity.name) || specific.includes(entity.canonical)) {
        identityTerms.push(entity.name, entity.canonical);
      }
    }
  } catch {
    // Entity matching is a precision boost; filesystem matching below is enough to keep searching usable.
  }

  for (const term of specific) {
    if (hasIdentityVisualForTerm(term)) identityTerms.push(term);
  }

  return unique(identityTerms);
}

function inferFallbackVisualKind(relPath) {
  const text = String(relPath || "").toLowerCase();
  if (/三视图|全视图|turnaround/.test(text)) return "character_turnaround";
  if (/角色卡|card/.test(text)) return "character_card";
  if (/军装|87|07式|military/.test(text)) return "military_portrait";
  if (/立绘|角色/.test(text)) return "character_portrait";
  return "reference";
}

function searchFilesystemVisualAssets(options = {}, existingItems = []) {
  const terms = specificSearchTerms([...splitTerms(options.query), options.character]);
  if (!terms.length) return [];

  const sourceRoot = getSourceRoot();
  const visualRoot = path.join(sourceRoot, "角色立绘");
  if (!sourceRoot || !fs.existsSync(visualRoot)) return [];

  const seenPaths = new Set(existingItems.map((item) => path.resolve(item.absPath || item.abs_path || "")));
  const stack = [visualRoot];
  const matches = [];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        const relDir = path.relative(sourceRoot, fullPath);
        if (relDir.includes("角色立绘") || terms.some((term) => relDir.includes(term))) stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      const relPath = path.relative(sourceRoot, fullPath);
      const matchedTerm = terms.find((term) => relPath.includes(term) || entry.name.includes(term));
      if (!matchedTerm) continue;
      const resolved = path.resolve(fullPath);
      if (seenPaths.has(resolved)) continue;

      const visualKind = inferFallbackVisualKind(relPath);
      if (options.kind && visualKind !== options.kind) continue;
      const promptRole = ["character_portrait", "character_turnaround", "character_card", "military_portrait"].includes(visualKind)
        ? "identity_reference"
        : "style_reference";
      if (options.role && promptRole !== options.role) continue;

      const stat = fs.statSync(fullPath);
      const identityPolicy = getIdentityReferencePolicy(visualKind);
      matches.push({
        id: null,
        file_id: null,
        fileId: null,
        title: entry.name,
        rel_path: relPath,
        relPath,
        absPath: fullPath,
        asset_type: visualKind,
        media_type: "image",
        visualKind,
        visualKindLabel: IMAGE_KIND_LABELS[visualKind] || visualKind,
        promptRole,
        promptRoleLabel: ROLE_LABELS[promptRole] || promptRole,
        identityPolicy,
        referenceTier: identityPolicy.referenceTier,
        referenceTierLabel: identityPolicy.referenceTierLabel,
        identityPriority: identityReferenceRank(visualKind),
        subjectNames: [matchedTerm],
        promptTags: unique([visualKind, promptRole, matchedTerm, identityPolicy.referenceTier, "single_outfit_lock", "filesystem_fallback"]),
        qualityFlags: {
          filesystemFallback: true,
          requiresSync: true,
          isPrimaryIdentityAnchor: identityPolicy.referenceTier === "primary_identity_anchor",
          isSupplementalCharacterDesign: identityPolicy.referenceTier === "supplemental_character_design",
          requiresDiscriminationReview: identityPolicy.requiresDiscriminationReview,
          singleOutfitLockRequired: promptRole === "identity_reference"
        },
        namingScore: 92,
        searchScore: 220 + Math.min(40, Math.round(stat.size / 1024 / 1024)),
        reason: `文件系统精确命中：${matchedTerm}；${IMAGE_KIND_LABELS[visualKind] || visualKind}；用途：${ROLE_LABELS[promptRole] || promptRole}；数据库漏索引兜底`,
        url: `/api/local-files?path=${encodeURIComponent(fullPath)}`,
        source: "filesystem_fallback",
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString()
      });
    }
  }

  return matches
    .sort((a, b) => {
      return identityReferenceRank(a.visualKind) - identityReferenceRank(b.visualKind)
        || b.searchScore - a.searchScore
        || a.rel_path.localeCompare(b.rel_path, "zh-Hans-CN");
    })
    .slice(0, Math.min(30, Math.max(0, Number(options.limit || 24) - existingItems.length)));
}

function getEntityNames(db) {
  const rows = db.prepare("SELECT type, name, aliases_json FROM entities").all();
  return rows.flatMap((row) => {
    const aliases = fromJson(row.aliases_json, []);
    return [row.name, ...aliases]
      .filter((name) => String(name || "").trim().length >= 2)
      .map((name) => ({ name, type: row.type, canonical: row.name }));
  });
}

function inferVisualKind(row) {
  const assetType = String(row.asset_type || "");
  const haystack = `${row.rel_path}\n${row.title}\n${row.tags_json || ""}`.toLowerCase();

  if (assetType === "character_portrait") return "character_portrait";
  if (assetType === "character_turnaround") return "character_turnaround";
  if (assetType === "character_card") return "character_card";
  if (assetType === "military_portrait") return "military_portrait";
  if (assetType === "storyboard") return "storyboard_frame";
  if (assetType === "comic") return "comic_panel";
  if (assetType === "scene_design") return "scene_design";
  if (assetType === "weapon_design") return "weapon_design";
  if (assetType === "costume_equipment") return "costume_equipment";
  if (assetType === "logo") return "logo";
  if (assetType === "animation_frames") return "animation_frame";
  if (assetType === "temporary_image") return "temporary_image";
  if (assetType === "reference") return "reference";

  if (STORYBOARD_HINTS.some((hint) => haystack.includes(hint.toLowerCase()))) return "storyboard_frame";
  if (haystack.includes("角色") || haystack.includes("立绘")) return "character_portrait";
  if (haystack.includes("武器")) return "weapon_design";
  if (haystack.includes("场景")) return "scene_design";
  if (haystack.includes("服装") || haystack.includes("装备")) return "costume_equipment";
  if (STYLE_HINTS.some((hint) => haystack.includes(hint.toLowerCase()))) return "style_reference";
  return "general_asset";
}

function inferPromptRole(visualKind, row) {
  const haystack = `${row.rel_path}\n${row.title}`.toLowerCase();
  if (["character_portrait", "character_turnaround", "character_card", "military_portrait"].includes(visualKind)) {
    return "identity_reference";
  }
  if (["storyboard_frame", "comic_panel", "animation_frame"].includes(visualKind)) return "shot_reference";
  if (visualKind === "scene_design") return "scene_reference";
  if (["weapon_design", "costume_equipment"].includes(visualKind)) return "prop_reference";
  if (["logo", "style_reference", "reference"].includes(visualKind)) return "style_reference";
  if (TEMPORARY_HINTS.some((hint) => haystack.includes(hint.toLowerCase()))) return "review_only";
  return "style_reference";
}

function inferSubjectNames(row, entityNames) {
  const linked = fromJson(row.linked_names_json, []);
  const haystack = `${row.rel_path}\n${row.title}\n${row.linked_names_json || ""}`;
  const matched = [];
  for (const entity of entityNames) {
    if (haystack.includes(entity.name)) matched.push(entity.canonical);
  }
  return unique([...linked, ...matched]);
}

function buildQualityFlags(row, subjectNames, visualKind) {
  const haystack = `${row.rel_path}\n${row.title}`.toLowerCase();
  const fileName = path.basename(row.rel_path || row.title || "");
  const identityPolicy = getIdentityReferencePolicy(visualKind);
  return {
    hasSubjectName: subjectNames.length > 0,
    hasClearVisualKind: visualKind !== "general_asset",
    isStoryboardSequence: STORYBOARD_HINTS.some((hint) => haystack.includes(hint.toLowerCase())),
    hasFrameNumber: /(^|[^\d])\d{1,4}([^\d]|$)/.test(fileName),
    isTemporary: TEMPORARY_HINTS.some((hint) => haystack.includes(hint.toLowerCase())),
    isSmallOrUnknown: Number(row.size_bytes || 0) > 0 && Number(row.size_bytes || 0) < 16 * 1024,
    isNamedOnlyByNumber: /^\d+\.[a-z0-9]+$/i.test(fileName),
    hasUsefulDirectory: String(row.top_dir || "").trim().length > 0,
    isPrimaryIdentityAnchor: identityPolicy.referenceTier === "primary_identity_anchor",
    isSupplementalCharacterDesign: identityPolicy.referenceTier === "supplemental_character_design",
    requiresDiscriminationReview: identityPolicy.requiresDiscriminationReview,
    singleOutfitLockRequired: ["character_portrait", "character_turnaround", "character_card", "military_portrait"].includes(visualKind)
  };
}

function scoreProfile(row, visualKind, promptRole, subjectNames, flags) {
  let score = 40;
  if (row.media_type === "image") score += 18;
  if (subjectNames.length > 0) score += 24;
  if (flags.hasClearVisualKind) score += 18;
  if (flags.hasUsefulDirectory) score += 8;
  if (promptRole === "identity_reference") score += 12;
  if (visualKind === "character_card") score += 12;
  if (visualKind === "character_turnaround") score += 12;
  if (visualKind === "character_portrait") score += 3;
  if (visualKind === "military_portrait") score += 2;
  if (flags.isStoryboardSequence) score += 7;
  if (flags.hasFrameNumber && promptRole === "shot_reference") score += 6;
  if (flags.isNamedOnlyByNumber) score -= 8;
  if (flags.isSmallOrUnknown) score -= 8;
  if (flags.isTemporary) score -= 24;
  return Math.max(0, Math.min(100, score));
}

function explainProfile(row, visualKind, promptRole, subjectNames, flags, score) {
  const reasons = [];
  if (subjectNames.length) reasons.push(`命中主体：${subjectNames.slice(0, 4).join("、")}`);
  reasons.push(IMAGE_KIND_LABELS[visualKind] || visualKind);
  reasons.push(`用途：${ROLE_LABELS[promptRole] || promptRole}`);
  if (flags.isTemporary) reasons.push("含临时/草稿风险");
  if (flags.isPrimaryIdentityAnchor) reasons.push("一级身份锚");
  if (flags.isSupplementalCharacterDesign) reasons.push("补充设计候选");
  if (flags.singleOutfitLockRequired) reasons.push("需单一着装锁，禁止多立绘混穿");
  if (flags.isNamedOnlyByNumber) reasons.push("文件名信息不足");
  if (flags.isStoryboardSequence) reasons.push("疑似连续镜头素材");
  reasons.push(`甄别分 ${score}`);
  return reasons.join("；");
}

function buildPromptTags(row, visualKind, promptRole, subjectNames, flags) {
  const pathTerms = splitTerms(row.rel_path).filter((term) => term.length > 1).slice(0, 8);
  return unique([
    visualKind,
    promptRole,
    ...subjectNames,
    ...pathTerms,
    flags.isPrimaryIdentityAnchor ? "primary_identity_anchor" : "",
    flags.isSupplementalCharacterDesign ? "supplemental_character_design" : "",
    flags.singleOutfitLockRequired ? "single_outfit_lock" : "",
    flags.isTemporary ? "needs_review" : "",
    flags.isStoryboardSequence ? "storyboard_sequence" : ""
  ]);
}

function buildProfile(row, entityNames) {
  const visualKind = inferVisualKind(row);
  const promptRole = inferPromptRole(visualKind, row);
  const subjectNames = inferSubjectNames(row, entityNames);
  const flags = buildQualityFlags(row, subjectNames, visualKind);
  const namingScore = scoreProfile(row, visualKind, promptRole, subjectNames, flags);
  const promptTags = buildPromptTags(row, visualKind, promptRole, subjectNames, flags);
  const profile = {
    label: IMAGE_KIND_LABELS[visualKind] || visualKind,
    roleLabel: ROLE_LABELS[promptRole] || promptRole,
    reason: explainProfile(row, visualKind, promptRole, subjectNames, flags, namingScore),
    sourcePath: row.rel_path,
    fileName: row.name,
    assetType: row.asset_type,
    mediaType: row.media_type
  };
  return { visualKind, promptRole, subjectNames, promptTags, flags, namingScore, profile };
}

export function refreshAssetProfiles(db) {
  const now = nowIso();
  const entityNames = getEntityNames(db);
  const rows = db.prepare(`
    SELECT
      a.id AS asset_id,
      a.asset_type,
      a.title,
      a.linked_names_json,
      a.tags_json,
      f.id AS file_id,
      f.rel_path,
      f.name,
      f.media_type,
      f.top_dir,
      f.size_bytes
    FROM assets a
    JOIN files f ON f.id = a.file_id
    WHERE f.status = 'active'
      AND f.media_type = 'image'
  `).all();

  const upsert = db.prepare(`
    INSERT INTO asset_profiles (
      file_id, asset_id, visual_kind, prompt_role, subject_names_json,
      prompt_tags_json, quality_flags_json, naming_score, profile_json, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(file_id) DO UPDATE SET
      asset_id = excluded.asset_id,
      visual_kind = excluded.visual_kind,
      prompt_role = excluded.prompt_role,
      subject_names_json = excluded.subject_names_json,
      prompt_tags_json = excluded.prompt_tags_json,
      quality_flags_json = excluded.quality_flags_json,
      naming_score = excluded.naming_score,
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
  `);

  db.exec("BEGIN");
  try {
    db.prepare(`
      DELETE FROM asset_profiles
      WHERE file_id NOT IN (
        SELECT id FROM files WHERE status = 'active' AND media_type = 'image'
      )
    `).run();

    for (const row of rows) {
      const profile = buildProfile(row, entityNames);
      upsert.run(
        row.file_id,
        row.asset_id,
        profile.visualKind,
        profile.promptRole,
        toJson(profile.subjectNames),
        toJson(profile.promptTags),
        toJson(profile.flags),
        profile.namingScore,
        toJson(profile.profile),
        now
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    updated: rows.length,
    activeProfiles: db.prepare("SELECT COUNT(*) AS count FROM asset_profiles").get().count
  };
}

function includesAny(source, terms) {
  const value = String(source || "").toLowerCase();
  return terms.some((term) => term && value.includes(String(term).toLowerCase()));
}

function scoreVisualSearch(row, terms, options) {
  const subjectNames = fromJson(row.subject_names_json, []);
  const promptTags = fromJson(row.prompt_tags_json, []);
  const flags = fromJson(row.quality_flags_json, {});
  const profile = fromJson(row.profile_json, {});
  const haystack = [
    row.title,
    row.rel_path,
    row.visual_kind,
    row.prompt_role,
    subjectNames.join(" "),
    promptTags.join(" "),
    profile.reason
  ].join("\n");

  let score = Number(row.naming_score || 0);
  for (const term of terms) {
    if (!term) continue;
    if (subjectNames.includes(term)) score += 45;
    if (String(row.title || "").includes(term)) score += 24;
    if (String(row.rel_path || "").includes(term)) score += 18;
    if (promptTags.includes(term)) score += 12;
    if (haystack.toLowerCase().includes(String(term).toLowerCase())) score += 8;
  }
  if (options.kind && row.visual_kind === options.kind) score += 30;
  if (options.role && row.prompt_role === options.role) score += 30;
  if (options.character && subjectNames.includes(options.character)) score += 55;
  if (flags.isTemporary) score -= 25;
  if (flags.isNamedOnlyByNumber) score -= 8;
  return score;
}

function hydrateVisualRow(row, score) {
  const subjectNames = fromJson(row.subject_names_json, []);
  const promptTags = fromJson(row.prompt_tags_json, []);
  const qualityFlags = fromJson(row.quality_flags_json, {});
  const profile = fromJson(row.profile_json, {});
  const identityPolicy = getIdentityReferencePolicy(row.visual_kind);
  return {
    id: row.asset_id,
    file_id: row.file_id,
    title: row.title,
    rel_path: row.rel_path,
    absPath: row.abs_path,
    asset_type: row.asset_type,
    media_type: row.media_type,
    visualKind: row.visual_kind,
    visualKindLabel: IMAGE_KIND_LABELS[row.visual_kind] || row.visual_kind,
    promptRole: row.prompt_role,
    promptRoleLabel: ROLE_LABELS[row.prompt_role] || row.prompt_role,
    identityPolicy,
    referenceTier: identityPolicy.referenceTier,
    referenceTierLabel: identityPolicy.referenceTierLabel,
    identityPriority: identityReferenceRank(row.visual_kind),
    subjectNames,
    promptTags,
    qualityFlags,
    namingScore: Number(row.naming_score || 0),
    searchScore: Number(score || 0),
    reason: profile.reason || "",
    url: `/api/files/${row.file_id}`
  };
}

function compareVisualSearchResults(a, b) {
  const aIsIdentity = a.row.prompt_role === "identity_reference";
  const bIsIdentity = b.row.prompt_role === "identity_reference";
  if (aIsIdentity || bIsIdentity) {
    const rank = identityReferenceRank(a.row.visual_kind) - identityReferenceRank(b.row.visual_kind);
    if (rank !== 0) return rank;
  }
  return b.score - a.score
    || b.row.naming_score - a.row.naming_score
    || a.row.rel_path.localeCompare(b.row.rel_path, "zh-Hans-CN");
}

export function searchVisualAssets(db, options = {}) {
  const query = String(options.query || "").trim();
  const character = String(options.character || "").trim();
  const kind = String(options.kind || "").trim();
  const role = String(options.role || "").trim();
  const limit = Math.min(60, Math.max(1, Number(options.limit || 24)));
  const terms = unique([...splitTerms(query), character]);
  const specificTerms = specificSearchTerms(terms);
  const identityTerms = resolveIdentityTerms(db, terms, character, role);

  const rows = db.prepare(`
    SELECT
      ap.*,
      a.asset_type,
      a.title,
      a.linked_names_json,
      a.tags_json,
      f.rel_path,
      f.abs_path,
      f.media_type,
      f.name
    FROM asset_profiles ap
    JOIN assets a ON a.id = ap.asset_id
    JOIN files f ON f.id = ap.file_id
    WHERE f.status = 'active'
      AND f.media_type = 'image'
  `).all();

  const filtered = rows
    .filter((row) => !kind || row.visual_kind === kind)
    .filter((row) => !role || row.prompt_role === role)
    .filter((row) => {
      if (!character) return true;
      return fromJson(row.subject_names_json, []).includes(character) || includesAny(row.rel_path, [character]);
    })
    .map((row) => ({ row, score: scoreVisualSearch(row, terms, { kind, role, character }) }))
    .filter(({ row, score }) => {
      if (!terms.length) return true;
      if (identityTerms.length) {
        const haystack = `${row.title}\n${row.rel_path}\n${row.prompt_tags_json}\n${row.subject_names_json}`;
        return includesAny(haystack, identityTerms);
      }
      if (specificTerms.length) {
        const haystack = `${row.title}\n${row.rel_path}\n${row.prompt_tags_json}\n${row.subject_names_json}`;
        return includesAny(haystack, specificTerms);
      }
      if (score > Number(row.naming_score || 0)) return true;
      return includesAny(`${row.title}\n${row.rel_path}\n${row.prompt_tags_json}\n${row.subject_names_json}`, terms);
    })
    .sort(compareVisualSearchResults)
    .slice(0, limit)
    .map(({ row, score }) => hydrateVisualRow(row, score));
  const fallbackItems = searchFilesystemVisualAssets({ query, character, kind, role, limit }, filtered);
  const items = [...filtered, ...fallbackItems].slice(0, limit);

  return {
    query,
    filters: { character, kind, role },
    terms,
    specificTerms,
    identityTerms,
    sourceFallbackUsed: fallbackItems.length > 0,
    items
  };
}

export function getVisualReferencesForProject(db, project, limit = 18) {
  const shots = project?.shots || [];
  const characters = unique(shots.flatMap((shot) => shot.characters || []));
  const references = [];
  const seen = new Set();
  const identityRank = {
    character_card: 0,
    character_turnaround: 1,
    character_portrait: 12,
    military_portrait: 14
  };

  for (const character of characters) {
    const result = searchVisualAssets(db, {
      character,
      role: "identity_reference",
      limit: 16
    });
    const identityItems = [...result.items]
      .sort((a, b) => (identityRank[a.visualKind] ?? 9) - (identityRank[b.visualKind] ?? 9) || b.searchScore - a.searchScore)
      .slice(0, 6);
    for (const item of identityItems) {
      if (seen.has(item.file_id)) continue;
      seen.add(item.file_id);
      references.push({ ...item, referenceUse: "identity" });
    }
  }

  const styleResult = searchVisualAssets(db, {
    query: `${project?.title || ""} ${project?.source_script || ""}`,
    limit: 8
  });
  for (const item of styleResult.items) {
    if (seen.has(item.file_id)) continue;
    seen.add(item.file_id);
    references.push({ ...item, referenceUse: item.promptRole === "shot_reference" ? "shot" : "style" });
    if (references.length >= limit) break;
  }

  return references.slice(0, limit);
}
