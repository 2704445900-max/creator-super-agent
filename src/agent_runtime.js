import crypto from "node:crypto";
import { nowIso } from "./utils.js";

const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
const ACTIVE_RUN_STATUSES = new Set(["queued", "running", "waiting_approval", "paused"]);

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringify(value) {
  return JSON.stringify(value ?? null);
}

function runId() {
  return `agent-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function defaultPolicy(input = {}) {
  return {
    standard: "creator-super-agent-policy-v1",
    localSafeAutoRun: true,
    requirePaidApproval: input.requirePaidApproval !== false,
    requireVisualApproval: input.requireVisualApproval !== false,
    requirePublishApproval: true,
    allowSourceOverwrite: false,
    maxStepAttempts: Math.max(1, Math.min(5, Number(input.maxStepAttempts || 2))),
    maxImageAttempts: Math.max(1, Math.min(5, Number(input.maxImageAttempts || 2))),
    budgetCny: Math.max(0, Number(input.budgetCny || 0)),
    imagePolicy: {
      priority: "cloud-multimodal-first",
      defaultProvider: input.imageProvider || "openai",
      defaultModel: input.imageModel || "gpt-image-2",
      executionMode: input.imageExecutionMode || "codex_native",
      optionalLocalFallback: "comfyui"
    }
  };
}

function buildSteps(input = {}, policy = {}) {
  const withImages = input.generateImages === true;
  const nativeImageMode = policy.imagePolicy?.executionMode === "codex_native";
  return [
    { key: "plan", title: "理解目标与生成执行计划", tool: "plan", autoLevel: "local_auto", enabled: true },
    { key: "project", title: "建立或更新项目工作区", tool: "project", autoLevel: "local_auto", enabled: true },
    { key: "dramaturgy", title: "剧本四层审查与纠错", tool: "dramaturgy", autoLevel: "local_auto", enabled: true },
    { key: "assets", title: "美术资产清单与缺口分析", tool: "assets", autoLevel: "local_auto", enabled: true },
    { key: "research", title: "外部研究与参考计划", tool: "research", autoLevel: "local_auto", enabled: true },
    { key: "prompt", title: "提示词结构化与大模型增强", tool: "prompt", autoLevel: "local_auto", enabled: true },
    { key: "storyboard", title: "导演分镜与故事板数据", tool: "storyboard", autoLevel: "local_auto", enabled: true },
    {
      key: "native_image_task",
      title: "创建 Codex 原生 image-2 任务包",
      tool: "nativeImageTask",
      autoLevel: "local_auto",
      enabled: withImages && nativeImageMode
    },
    {
      key: "image_generation",
      title: nativeImageMode ? "Codex 原生 image-2 生图并落盘" : "云端多模态大模型生图",
      tool: "image",
      autoLevel: nativeImageMode ? "codex_native_confirm" : policy.requirePaidApproval ? "paid_confirm" : "local_auto",
      enabled: withImages,
      maxAttempts: policy.maxImageAttempts
    },
    { key: "visual_qa", title: "生成图自动视觉门禁", tool: "visualQa", autoLevel: "local_auto", enabled: withImages },
    {
      key: "visual_review",
      title: "生成图人工/Codex 终审",
      tool: "visualReview",
      autoLevel: policy.requireVisualApproval ? "visual_confirm" : "local_auto",
      enabled: withImages
    },
    { key: "video_plan", title: "Seedance 与后期制作计划", tool: "videoPlan", autoLevel: "local_auto", enabled: true },
    { key: "publishing", title: "账号宣发与发布方案", tool: "publishing", autoLevel: "local_auto", enabled: true },
    { key: "portable", title: "迁移与归档计划", tool: "portable", autoLevel: "local_auto", enabled: true }
  ];
}

function hydrateStep(row) {
  return {
    id: row.id,
    runId: row.run_id,
    index: row.step_index,
    key: row.step_key,
    title: row.title,
    toolName: row.tool_name,
    autoLevel: row.auto_level,
    status: row.status,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    input: parseJson(row.input_json, {}),
    output: parseJson(row.output_json, null),
    error: row.error || "",
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function hydrateApproval(row) {
  return {
    id: row.id,
    runId: row.run_id,
    stepId: row.step_id,
    type: row.approval_type,
    status: row.status,
    request: parseJson(row.request_json, {}),
    response: parseJson(row.response_json, {}),
    createdAt: row.created_at,
    resolvedAt: row.resolved_at
  };
}

function hydrateEvent(row) {
  return {
    id: row.id,
    runId: row.run_id,
    stepId: row.step_id,
    type: row.event_type,
    message: row.message,
    data: parseJson(row.data_json, {}),
    createdAt: row.created_at
  };
}

function hydrateRun(row, db, options = {}) {
  if (!row) return null;
  const includeSteps = options.includeSteps !== false;
  const includeEvents = options.includeEvents === true;
  const includeApprovals = options.includeApprovals !== false;
  const result = {
    id: row.id,
    workspaceId: row.workspace_id || "",
    contentPackId: row.content_pack_id || "",
    accountProfileId: row.account_profile_id || "",
    projectSlug: row.project_slug || "",
    title: row.title,
    goal: row.goal,
    status: row.status,
    currentStep: row.current_step,
    input: parseJson(row.input_json, {}),
    plan: parseJson(row.plan_json, null),
    state: parseJson(row.state_json, {}),
    policy: parseJson(row.policy_json, {}),
    budgetCny: Number(row.budget_cny || 0),
    spentCny: Number(row.spent_cny || 0),
    error: row.error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
  if (includeSteps) {
    result.steps = db.prepare("SELECT * FROM agent_steps WHERE run_id = ? ORDER BY step_index").all(row.id).map(hydrateStep);
  }
  if (includeApprovals) {
    result.approvals = db.prepare("SELECT * FROM agent_approvals WHERE run_id = ? ORDER BY id").all(row.id).map(hydrateApproval);
  }
  if (includeEvents) {
    result.events = db.prepare("SELECT * FROM agent_events WHERE run_id = ? ORDER BY id").all(row.id).map(hydrateEvent);
  }
  return result;
}

function approvalTypeForStep(step) {
  if (step.autoLevel === "codex_native_confirm") return "codex_native_image_generation";
  if (step.autoLevel === "paid_confirm") return "paid_image_generation";
  if (step.autoLevel === "visual_confirm") return "visual_review";
  if (step.autoLevel === "publish_confirm") return "external_publish";
  return "manual_confirmation";
}

function approvalRequestForStep(step, run) {
  if (step.autoLevel === "codex_native_confirm") {
    return {
      title: "使用 Codex 原生 image-2 完成生图",
      reason: "工作台已生成提示词和落盘任务包；Codex 必须调用内置 image_gen，保存图片后提交本地路径。",
      model: "gpt-image-2",
      executionMode: "codex_native",
      task: run.state.nativeImageTask || null,
      expectedResponse: {
        sourceImagePath: "$CODEX_HOME/generated_images/.../generated.png",
        confirmedGeneratedByCodexNative: true
      }
    };
  }
  if (step.autoLevel === "paid_confirm") {
    return {
      title: "批准云端大模型生图",
      reason: "该步骤可能产生模型调用费用。",
      provider: run.policy.imagePolicy?.defaultProvider || "openai",
      model: run.policy.imagePolicy?.defaultModel || "gpt-image-2",
      budgetCny: run.budgetCny,
      projectSlug: run.projectSlug || run.state.projectSlug || ""
    };
  }
  if (step.autoLevel === "visual_confirm") {
    return {
      title: "确认生成图视觉质量",
      reason: "正式视频生成前必须确认角色、服装、道具、动作、场景和轴线。",
      imagePath: run.state.imagePath || "",
      automatedQa: run.state.visualQa || null,
      expectedResponse: {
        confirmedPass: true,
        visualIssues: [],
        checkResults: {}
      }
    };
  }
  return { title: step.title, reason: "该步骤需要人工确认。" };
}

export function createAgentRuntime(db, options = {}) {
  const tools = options.tools || {};
  const resolveWorkspace = options.resolveWorkspace || (() => ({ workspace: null, contentPack: null, accountProfile: null }));
  const activeRuns = new Set();
  let executionQueue = Promise.resolve();

  function addEvent(runIdValue, type, message, data = {}, stepId = null) {
    db.prepare(`
      INSERT INTO agent_events (run_id, step_id, event_type, message, data_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(runIdValue, stepId, type, message, stringify(data), nowIso());
  }

  function getRun(id, hydrateOptions = {}) {
    return hydrateRun(db.prepare("SELECT * FROM agent_runs WHERE id = ?").get(id), db, hydrateOptions);
  }

  function listRuns(input = {}) {
    const status = compact(input.status || "");
    const workspaceId = compact(input.workspaceId || "");
    const limit = Math.max(1, Math.min(100, Number(input.limit || 30)));
    let rows;
    if (status && workspaceId) {
      rows = db.prepare("SELECT * FROM agent_runs WHERE status = ? AND workspace_id = ? ORDER BY updated_at DESC LIMIT ?").all(status, workspaceId, limit);
    } else if (status) {
      rows = db.prepare("SELECT * FROM agent_runs WHERE status = ? ORDER BY updated_at DESC LIMIT ?").all(status, limit);
    } else if (workspaceId) {
      rows = db.prepare("SELECT * FROM agent_runs WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT ?").all(workspaceId, limit);
    } else {
      rows = db.prepare("SELECT * FROM agent_runs ORDER BY updated_at DESC LIMIT ?").all(limit);
    }
    return rows.map((row) => hydrateRun(row, db, { includeSteps: false, includeApprovals: false }));
  }

  function createPendingApproval(run, step) {
    const existing = db.prepare(`
      SELECT * FROM agent_approvals
      WHERE run_id = ? AND step_id = ? AND status = 'pending'
      ORDER BY id DESC LIMIT 1
    `).get(run.id, step.id);
    if (existing) return hydrateApproval(existing);
    const now = nowIso();
    const result = db.prepare(`
      INSERT INTO agent_approvals (
        run_id, step_id, approval_type, status, request_json, response_json, created_at
      ) VALUES (?, ?, ?, 'pending', ?, '{}', ?)
    `).run(run.id, step.id, approvalTypeForStep(step), stringify(approvalRequestForStep(step, run)), now);
    db.prepare("UPDATE agent_steps SET status = 'waiting_approval', updated_at = ? WHERE id = ?").run(now, step.id);
    db.prepare("UPDATE agent_runs SET status = 'waiting_approval', current_step = ?, updated_at = ? WHERE id = ?").run(step.index, now, run.id);
    addEvent(run.id, "approval_requested", `等待审批：${step.title}`, approvalRequestForStep(step, run), step.id);
    return hydrateApproval(db.prepare("SELECT * FROM agent_approvals WHERE id = ?").get(Number(result.lastInsertRowid)));
  }

  function approvedResponse(stepId) {
    const row = db.prepare(`
      SELECT * FROM agent_approvals
      WHERE step_id = ? AND status = 'approved'
      ORDER BY id DESC LIMIT 1
    `).get(stepId);
    return row ? hydrateApproval(row).response : null;
  }

  function shouldRequestApproval(step) {
    if (!["codex_native_confirm", "paid_confirm", "visual_confirm", "publish_confirm"].includes(step.autoLevel)) return false;
    return !approvedResponse(step.id);
  }

  function composeToolInput(run, step, approvalResponse = {}) {
    const state = run.state || {};
    const workspaceContext = resolveWorkspace(run.input || {});
    return {
      ...(run.input || {}),
      ...approvalResponse,
      agentRunId: run.id,
      workspaceId: run.workspaceId,
      contentPackId: run.contentPackId,
      accountProfileId: run.accountProfileId,
      workspaceMode: workspaceContext.contentPack?.kind === "generic" ? "generic" : "ip-specific",
      workspaceContext,
      projectSlug: state.projectSlug || run.projectSlug || run.input.projectSlug || "",
      storyboardId: state.storyboardId || null,
      imagePath: state.imagePath || run.input.imagePath || "",
      nativeImageTask: state.nativeImageTask || null,
      automatedQa: state.visualQa || null,
      topic: run.input.topic || run.title,
      title: run.input.title || run.title,
      intent: run.input.intent || run.goal,
      goal: run.goal,
      script: run.input.script || "",
      style: run.input.style || (workspaceContext.contentPack?.kind === "generic"
        ? "当前原创项目统一画风，电影感动画制作质量，角色表演清楚，光影和镜头连续"
        : ""),
      execute: step.key === "image_generation",
      generate: step.key === "image_generation",
      imageExecutionMode: run.policy.imagePolicy?.executionMode || run.input.imageExecutionMode || "codex_native",
      allowDraft: run.input.allowDraft !== false,
      persistReport: step.key === "visual_qa" || step.key === "visual_review"
    };
  }

  function updateStateForOutput(run, step, output) {
    const state = { ...(run.state || {}), outputs: { ...(run.state?.outputs || {}) } };
    state.outputs[step.key] = output;
    if (step.key === "project") {
      state.projectSlug = output?.project?.slug || output?.slug || state.projectSlug || "";
      state.projectPath = output?.project?.projectPath || output?.projectPath || state.projectPath || "";
    }
    if (step.key === "storyboard") {
      state.storyboardId = output?.project?.id || output?.storyboardId || state.storyboardId || null;
      state.storyboardArchive = output?.projectArchive || output?.archive || null;
    }
    if (step.key === "native_image_task") {
      state.nativeImageTask = output;
    }
    if (step.key === "image_generation") {
      const outputPath = output?.output?.outputPath || output?.outputPath || output?.generatedImage || "";
      if (output?.output?.error || output?.error) throw new Error(output?.output?.error || output?.error);
      if (!outputPath) throw new Error("image generation did not return a local output path");
      state.imagePath = outputPath;
      state.imageTask = output;
    }
    if (step.key === "visual_qa" || step.key === "visual_review") {
      state.visualQa = output?.boardDecision || output?.gate || output;
      state.visualQaReport = output?.reportFiles || null;
    }
    if (step.key === "video_plan") state.videoPlan = output;
    if (step.key === "publishing") state.publishingPlan = output;
    return state;
  }

  async function executeStep(run, step) {
    const tool = tools[step.toolName];
    if (typeof tool !== "function") throw new Error(`agent tool is not registered: ${step.toolName}`);
    const response = approvedResponse(step.id) || {};
    const toolInput = composeToolInput(run, step, response);
    return tool(toolInput, { run, step, approvalResponse: response });
  }

  async function executeRun(id) {
    if (activeRuns.has(id)) return;
    activeRuns.add(id);
    try {
      let run = getRun(id);
      if (!run || TERMINAL_RUN_STATUSES.has(run.status)) return;
      const startedAt = run.startedAt || nowIso();
      db.prepare("UPDATE agent_runs SET status = 'running', started_at = COALESCE(started_at, ?), updated_at = ?, error = NULL WHERE id = ?")
        .run(startedAt, nowIso(), id);
      addEvent(id, "run_started", run.startedAt ? "智能体继续执行。" : "智能体开始执行。", {});

      for (;;) {
        run = getRun(id);
        if (!run || TERMINAL_RUN_STATUSES.has(run.status)) return;
        const step = run.steps.find((item) => ["pending", "queued", "retry", "waiting_approval"].includes(item.status));
        if (!step) {
          const now = nowIso();
          db.prepare("UPDATE agent_runs SET status = 'completed', completed_at = ?, updated_at = ?, current_step = ? WHERE id = ?")
            .run(now, now, run.steps.length, id);
          addEvent(id, "run_completed", "智能体任务已完成。", { projectSlug: run.state.projectSlug || "" });
          return;
        }

        if (step.status === "waiting_approval" && shouldRequestApproval(step)) return;
        if (shouldRequestApproval(step)) {
          createPendingApproval(run, step);
          return;
        }

        const now = nowIso();
        db.prepare(`
          UPDATE agent_steps
          SET status = 'running', attempt = attempt + 1, started_at = COALESCE(started_at, ?), updated_at = ?, error = NULL
          WHERE id = ?
        `).run(now, now, step.id);
        db.prepare("UPDATE agent_runs SET status = 'running', current_step = ?, updated_at = ? WHERE id = ?").run(step.index, now, id);
        addEvent(id, "step_started", `开始：${step.title}`, { stepKey: step.key, attempt: step.attempt + 1 }, step.id);

        try {
          const freshRun = getRun(id);
          const freshStep = freshRun.steps.find((item) => item.id === step.id);
          const output = await executeStep(freshRun, freshStep);
          const state = updateStateForOutput(freshRun, freshStep, output);
          const finishedAt = nowIso();
          db.prepare(`
            UPDATE agent_steps
            SET status = 'completed', output_json = ?, finished_at = ?, updated_at = ?, error = NULL
            WHERE id = ?
          `).run(stringify(output), finishedAt, finishedAt, step.id);
          db.prepare(`
            UPDATE agent_runs
            SET state_json = ?, plan_json = CASE WHEN ? = 'plan' THEN ? ELSE plan_json END,
                project_slug = ?, current_step = ?, updated_at = ?
            WHERE id = ?
          `).run(
            stringify(state),
            step.key,
            step.key === "plan" ? stringify(output) : null,
            state.projectSlug || null,
            step.index + 1,
            finishedAt,
            id
          );
          addEvent(id, "step_completed", `完成：${step.title}`, { stepKey: step.key }, step.id);
        } catch (error) {
          const failedStep = db.prepare("SELECT * FROM agent_steps WHERE id = ?").get(step.id);
          const attempt = Number(failedStep?.attempt || 1);
          const maxAttempts = Number(failedStep?.max_attempts || 2);
          const at = nowIso();
          if (attempt < maxAttempts) {
            db.prepare("UPDATE agent_steps SET status = 'retry', error = ?, updated_at = ? WHERE id = ?").run(error.message, at, step.id);
            addEvent(id, "step_retry", `步骤失败，准备重试：${step.title}`, { error: error.message, attempt, maxAttempts }, step.id);
            continue;
          }
          db.prepare("UPDATE agent_steps SET status = 'failed', error = ?, finished_at = ?, updated_at = ? WHERE id = ?")
            .run(error.message, at, at, step.id);
          db.prepare("UPDATE agent_runs SET status = 'failed', error = ?, updated_at = ?, completed_at = ? WHERE id = ?")
            .run(error.message, at, at, id);
          addEvent(id, "run_failed", `智能体任务失败：${error.message}`, { stepKey: step.key }, step.id);
          return;
        }
      }
    } finally {
      activeRuns.delete(id);
    }
  }

  function schedule(id) {
    executionQueue = executionQueue
      .then(() => executeRun(id))
      .catch((error) => addEvent(id, "runtime_error", error.message, {}));
  }

  function startRun(input = {}) {
    const goal = compact(input.goal || input.intent || input.topic || input.title);
    if (!goal) throw new Error("agent goal is required");
    const context = resolveWorkspace(input);
    if (!context.workspace) throw new Error("workspace is required");
    const id = runId();
    const title = compact(input.title || input.topic || goal).slice(0, 120);
    const policy = defaultPolicy(input);
    const steps = buildSteps(input, policy).filter((step) => step.enabled);
    const now = nowIso();
    const normalizedInput = {
      ...input,
      workspaceId: context.workspace.id,
      contentPackId: context.contentPack?.id || "",
      accountProfileId: context.accountProfile?.id || input.accountProfileId || ""
    };
    db.prepare(`
      INSERT INTO agent_runs (
        id, workspace_id, content_pack_id, account_profile_id, project_slug,
        title, goal, status, current_step, input_json, plan_json, state_json,
        policy_json, budget_cny, spent_cny, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, NULL, '{}', ?, ?, 0, ?, ?)
    `).run(
      id,
      context.workspace.id,
      context.contentPack?.id || null,
      context.accountProfile?.id || null,
      compact(input.projectSlug || "") || null,
      title,
      goal,
      stringify(normalizedInput),
      stringify(policy),
      policy.budgetCny,
      now,
      now
    );
    const insertStep = db.prepare(`
      INSERT INTO agent_steps (
        run_id, step_index, step_key, title, tool_name, auto_level, status,
        attempt, max_attempts, input_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, '{}', ?, ?)
    `);
    steps.forEach((step, index) => insertStep.run(
      id,
      index,
      step.key,
      step.title,
      step.tool,
      step.autoLevel,
      Number(step.maxAttempts || policy.maxStepAttempts),
      now,
      now
    ));
    addEvent(id, "run_created", "已创建智能体任务。", {
      workspaceId: context.workspace.id,
      contentPackId: context.contentPack?.id || "",
      stepCount: steps.length
    });
    if (input.autoStart !== false) schedule(id);
    return getRun(id, { includeEvents: true });
  }

  function approve(id, input = {}) {
    const run = getRun(id);
    if (!run) throw new Error("agent run not found");
    const approvalId = Number(input.approvalId || run.approvals.find((item) => item.status === "pending")?.id || 0);
    if (!approvalId) throw new Error("pending approval not found");
    const approval = db.prepare("SELECT * FROM agent_approvals WHERE id = ? AND run_id = ?").get(approvalId, id);
    if (!approval || approval.status !== "pending") throw new Error("approval is not pending");
    const decision = compact(input.decision || "approved").toLowerCase();
    const status = ["reject", "rejected", "deny", "denied"].includes(decision) ? "rejected" : "approved";
    const now = nowIso();
    db.prepare("UPDATE agent_approvals SET status = ?, response_json = ?, resolved_at = ? WHERE id = ?")
      .run(status, stringify(input.response || input.review || {}), now, approvalId);
    if (status === "rejected") {
      db.prepare("UPDATE agent_runs SET status = 'paused', updated_at = ? WHERE id = ?").run(now, id);
      db.prepare("UPDATE agent_steps SET status = 'waiting_approval', updated_at = ? WHERE id = ?").run(now, approval.step_id);
      addEvent(id, "approval_rejected", "审批被拒绝，任务已暂停。", { approvalId }, approval.step_id);
      return getRun(id, { includeEvents: true });
    }
    db.prepare("UPDATE agent_steps SET status = 'pending', updated_at = ? WHERE id = ?").run(now, approval.step_id);
    db.prepare("UPDATE agent_runs SET status = 'queued', updated_at = ? WHERE id = ?").run(now, id);
    addEvent(id, "approval_approved", "审批已通过，智能体继续执行。", { approvalId }, approval.step_id);
    schedule(id);
    return getRun(id, { includeEvents: true });
  }

  function resume(id) {
    const run = getRun(id);
    if (!run) throw new Error("agent run not found");
    if (TERMINAL_RUN_STATUSES.has(run.status)) throw new Error(`cannot resume ${run.status} run`);
    if (run.approvals.some((item) => item.status === "pending")) {
      throw new Error("resolve pending approval before resuming");
    }
    const now = nowIso();
    db.prepare("UPDATE agent_runs SET status = 'queued', updated_at = ?, error = NULL WHERE id = ?").run(now, id);
    addEvent(id, "run_resumed", "任务已恢复。", {});
    schedule(id);
    return getRun(id, { includeEvents: true });
  }

  function cancel(id) {
    const run = getRun(id);
    if (!run) throw new Error("agent run not found");
    if (TERMINAL_RUN_STATUSES.has(run.status)) return run;
    const now = nowIso();
    db.prepare("UPDATE agent_runs SET status = 'cancelled', updated_at = ?, completed_at = ? WHERE id = ?").run(now, now, id);
    db.prepare("UPDATE agent_steps SET status = 'cancelled', updated_at = ? WHERE run_id = ? AND status IN ('pending','queued','retry','waiting_approval')")
      .run(now, id);
    addEvent(id, "run_cancelled", "智能体任务已取消。", {});
    return getRun(id, { includeEvents: true });
  }

  function events(id, afterId = 0, limit = 200) {
    return db.prepare(`
      SELECT * FROM agent_events
      WHERE run_id = ? AND id > ?
      ORDER BY id ASC LIMIT ?
    `).all(id, Number(afterId || 0), Math.max(1, Math.min(500, Number(limit || 200)))).map(hydrateEvent);
  }

  function recoverInterruptedRuns() {
    const now = nowIso();
    const interrupted = db.prepare("SELECT id FROM agent_runs WHERE status = 'running'").all();
    for (const row of interrupted) {
      db.prepare("UPDATE agent_runs SET status = 'queued', updated_at = ? WHERE id = ?").run(now, row.id);
      db.prepare("UPDATE agent_steps SET status = 'retry', updated_at = ? WHERE run_id = ? AND status = 'running'").run(now, row.id);
      addEvent(row.id, "run_recovered", "检测到服务重启，任务已恢复到队列。", {});
      schedule(row.id);
    }
    return interrupted.length;
  }

  return {
    standard: "creator-super-agent-runtime-v1",
    startRun,
    getRun,
    listRuns,
    approve,
    resume,
    cancel,
    events,
    recoverInterruptedRuns,
    statuses: {
      active: [...ACTIVE_RUN_STATUSES],
      terminal: [...TERMINAL_RUN_STATUSES]
    }
  };
}
