import { completeWithLlm } from "./llm.js";
import { searchDatabase } from "./search.js";
import { fromJson, nowIso, snippet, toJson } from "./utils.js";

function pickTargetEntity(searchResult, targetName, targetType) {
  const exact = searchResult.entities.find((entity) => {
    const nameMatch = entity.name === targetName || entity.aliases?.includes(targetName);
    const typeMatch = !targetType || entity.type === targetType;
    return nameMatch && typeMatch;
  });
  if (exact) return exact;
  return searchResult.entities.find((entity) => !targetType || entity.type === targetType) || null;
}

function buildEvidenceRefs(evidence) {
  return [
    ...evidence.entities.slice(0, 6).map((entity) => ({
      kind: "entity",
      id: entity.id,
      name: entity.name,
      type: entity.type,
      summary: entity.summary
    })),
    ...evidence.chunks.slice(0, 8).map((chunk) => ({
      kind: "chunk",
      id: chunk.id,
      title: chunk.title,
      path: chunk.rel_path,
      excerpt: snippet(chunk.text, evidence.query, 280)
    })),
    ...evidence.assets.slice(0, 6).map((asset) => ({
      kind: "asset",
      id: asset.id,
      fileId: asset.file_id,
      title: asset.title,
      path: asset.rel_path
    }))
  ];
}

function buildProposalPrompt({ targetName, targetType, intent, currentEntity, evidence }) {
  const payload = {
    target: {
      name: targetName,
      type: targetType,
      current: currentEntity ? {
        id: currentEntity.id,
        type: currentEntity.type,
        name: currentEntity.name,
        aliases: currentEntity.aliases,
        summary: currentEntity.summary,
        details: currentEntity.details
      } : null
    },
    intent,
    evidence: {
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
        excerpt: snippet(chunk.text, evidence.query, 520)
      })),
      assets: evidence.assets.slice(0, 6).map((asset, index) => ({
        id: `A${index + 1}`,
        title: asset.title,
        path: asset.rel_path,
        linkedNames: asset.linkedNames,
        tags: asset.tags
      }))
    }
  };

  return [
    "你是《当前项目》IP设定整理与合理化助手。",
    "请基于给定资料库证据，为目标设定生成一个保守、可追溯的修订提案。",
    "不要擅自新增证据中没有的硬设定。可以把缺口标为待确认，也可以建议更清晰的表达。",
    "输出必须是 JSON 对象，字段为：proposal_title, rationale, proposed_summary, proposed_details。",
    "proposed_details 必须是对象；只写适合进入资料库的稳定字段。",
    "",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function extractJsonObject(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
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

function fallbackProposal({ targetName, intent, currentEntity, evidence }) {
  const currentSummary = currentEntity?.summary || "";
  const existingDetails = currentEntity?.details || {};
  const evidenceHints = evidence.chunks
    .slice(0, 3)
    .map((chunk) => snippet(chunk.text, evidence.query, 160))
    .filter(Boolean);

  return {
    proposal_title: `${targetName}设定整理提案`,
    rationale: [
      "当前未启用大模型，已根据资料库命中证据生成保守整理提案。",
      evidenceHints.length ? `可参考证据片段：${evidenceHints.join("；")}` : "当前证据不足，建议人工补充后再应用。"
    ].join(" "),
    proposed_summary: currentSummary || `${targetName}的设定尚需补全；建议先保留为待确认状态。`,
    proposed_details: {
      ...existingDetails,
      pendingIntent: intent,
      reviewStatus: evidenceHints.length ? "needs_human_review" : "insufficient_evidence"
    }
  };
}

function normalizeProposal(raw, fallback) {
  const details = raw?.proposed_details && typeof raw.proposed_details === "object" && !Array.isArray(raw.proposed_details)
    ? raw.proposed_details
    : fallback.proposed_details;
  return {
    proposal_title: String(raw?.proposal_title || fallback.proposal_title),
    rationale: String(raw?.rationale || fallback.rationale || ""),
    proposed_summary: String(raw?.proposed_summary || fallback.proposed_summary || ""),
    proposed_details: details
  };
}

function saveProposal(db, input, entity, evidence, proposal) {
  const now = nowIso();
  const result = db.prepare(`
    INSERT INTO setting_proposals (
      target_entity_id, target_type, target_name, intent, proposal_title, rationale,
      original_summary, proposed_summary, original_details_json, proposed_details_json,
      evidence_json, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `).run(
    entity?.id || null,
    input.targetType || entity?.type || "",
    input.targetName,
    input.intent,
    proposal.proposal_title,
    proposal.rationale,
    entity?.summary || "",
    proposal.proposed_summary,
    toJson(entity?.details || {}),
    toJson(proposal.proposed_details || {}),
    toJson(buildEvidenceRefs(evidence)),
    now,
    now
  );
  return Number(result.lastInsertRowid);
}

function hydrateProposal(row) {
  if (!row) return null;
  return {
    ...row,
    original_details: fromJson(row.original_details_json, {}),
    proposed_details: fromJson(row.proposed_details_json, {}),
    evidence: fromJson(row.evidence_json, [])
  };
}

export async function createSettingProposal(db, config, input) {
  const targetName = String(input.targetName || "").trim();
  const intent = String(input.intent || "").trim();
  const targetType = String(input.targetType || "").trim();
  if (!targetName) throw new Error("targetName is required");
  if (!intent) throw new Error("intent is required");

  const query = `${targetName} ${intent}`;
  const evidence = searchDatabase(db, [query], {
    limit: Number(input.limit || 10),
    mode: "precise",
    entityType: targetType || undefined,
    primaryTerm: targetName
  });
  const entity = pickTargetEntity(evidence, targetName, targetType);
  const fallback = fallbackProposal({ targetName, intent, currentEntity: entity, evidence });
  let proposal = fallback;
  let llmUsed = false;
  let llmError = null;

  if (input.useLlm !== false) {
    const llm = await completeWithLlm(config, buildProposalPrompt({ targetName, targetType, intent, currentEntity: entity, evidence }), {
      temperature: 0.2,
      system: "你是严谨的中文IP设定编辑。只输出 JSON，不编造证据。"
    });
    if (llm.answer) {
      const parsed = extractJsonObject(llm.answer);
      if (parsed) {
        proposal = normalizeProposal(parsed, fallback);
        llmUsed = true;
      } else {
        llmError = "模型返回内容不是可解析的 JSON 对象，已使用本地保守提案。";
      }
    } else if (llm.error) {
      llmError = llm.error;
    }
  }

  const proposalId = saveProposal(db, { targetName, targetType, intent }, entity, evidence, proposal);
  return {
    proposal: getSettingProposal(db, proposalId),
    evidence,
    targetEntity: entity,
    llmUsed,
    llmError
  };
}

export function listSettingProposals(db, limit = 30) {
  return db.prepare(`
    SELECT id, target_entity_id, target_type, target_name, intent, proposal_title,
      proposed_summary, status, created_at, updated_at, applied_at
    FROM setting_proposals
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(Number(limit || 30));
}

export function getSettingProposal(db, proposalId) {
  const row = db.prepare(`
    SELECT *
    FROM setting_proposals
    WHERE id = ?
  `).get(Number(proposalId));
  return hydrateProposal(row);
}

export function applySettingProposal(db, proposalId) {
  const proposal = getSettingProposal(db, proposalId);
  if (!proposal) throw new Error("proposal not found");
  if (!proposal.target_entity_id) throw new Error("proposal has no target entity");
  if (proposal.status === "applied") return proposal;

  const now = nowIso();
  db.prepare(`
    UPDATE entities
    SET summary = ?, details_json = ?, source = ?, confidence = ?, updated_at = ?
    WHERE id = ?
  `).run(
    proposal.proposed_summary,
    toJson(proposal.proposed_details || {}),
    "setting_proposal",
    0.85,
    now,
    proposal.target_entity_id
  );

  db.prepare(`
    UPDATE setting_proposals
    SET status = 'applied', updated_at = ?, applied_at = ?
    WHERE id = ?
  `).run(now, now, proposal.id);

  return getSettingProposal(db, proposal.id);
}
