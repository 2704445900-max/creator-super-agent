const runtimeStatus = document.querySelector("#runtimeStatus");
const appTitle = document.querySelector("#appTitle");
const refreshButton = document.querySelector("#refreshButton");
const syncButton = document.querySelector("#syncButton");
const cloudSyncButton = document.querySelector("#cloudSyncButton");
const cloudSyncStatus = document.querySelector("#cloudSyncStatus");
const askButton = document.querySelector("#askButton");
const searchButton = document.querySelector("#searchButton");
const preciseSearchButton = document.querySelector("#preciseSearchButton");
const questionInput = document.querySelector("#questionInput");
const statsGrid = document.querySelector("#statsGrid");
const answerBox = document.querySelector("#answerBox");
const llmStatusText = document.querySelector("#llmStatusText");
const llmStatusResult = document.querySelector("#llmStatusResult");
const systemAuditStatus = document.querySelector("#systemAuditStatus");
const systemAuditResult = document.querySelector("#systemAuditResult");
const systemHealthButton = document.querySelector("#systemHealthButton");
const systemPipelineCheckButton = document.querySelector("#systemPipelineCheckButton");
const answerCardStatus = document.querySelector("#answerCardStatus");
const answerCardResult = document.querySelector("#answerCardResult");
const entityList = document.querySelector("#entityList");
const chunkList = document.querySelector("#chunkList");
const assetList = document.querySelector("#assetList");
const entityType = document.querySelector("#entityType");
const storyTitle = document.querySelector("#storyTitle");
const storyScript = document.querySelector("#storyScript");
const storyStyle = document.querySelector("#storyStyle");
const shotCount = document.querySelector("#shotCount");
const useLlm = document.querySelector("#useLlm");
const generateStoryboardButton = document.querySelector("#generateStoryboardButton");
const storyboardStatus = document.querySelector("#storyboardStatus");
const storyboardList = document.querySelector("#storyboardList");
const copyPromptPackButton = document.querySelector("#copyPromptPackButton");
const downloadPromptsButton = document.querySelector("#downloadPromptsButton");
const downloadFramesButton = document.querySelector("#downloadFramesButton");
const downloadIllustrationsButton = document.querySelector("#downloadIllustrationsButton");
const downloadImage2PlanButton = document.querySelector("#downloadImage2PlanButton");
const downloadAuditButton = document.querySelector("#downloadAuditButton");
const downloadBoardButton = document.querySelector("#downloadBoardButton");
const reloadProjectsButton = document.querySelector("#reloadProjectsButton");
const projectList = document.querySelector("#projectList");
const settingTargetName = document.querySelector("#settingTargetName");
const settingTargetType = document.querySelector("#settingTargetType");
const settingIntent = document.querySelector("#settingIntent");
const settingUseLlm = document.querySelector("#settingUseLlm");
const createProposalButton = document.querySelector("#createProposalButton");
const reloadProposalsButton = document.querySelector("#reloadProposalsButton");
const proposalDetail = document.querySelector("#proposalDetail");
const proposalList = document.querySelector("#proposalList");
const visualQuery = document.querySelector("#visualQuery");
const visualRole = document.querySelector("#visualRole");
const visualKind = document.querySelector("#visualKind");
const visualSearchButton = document.querySelector("#visualSearchButton");
const refreshVisualProfilesButton = document.querySelector("#refreshVisualProfilesButton");
const visualStatus = document.querySelector("#visualStatus");
const visualAssetList = document.querySelector("#visualAssetList");
const directorTargetModel = document.querySelector("#directorTargetModel");
const directorAspectRatio = document.querySelector("#directorAspectRatio");
const directorFps = document.querySelector("#directorFps");
const directorTargetDuration = document.querySelector("#directorTargetDuration");
const directorDuration = document.querySelector("#directorDuration");
const directorAutoShotPlanning = document.querySelector("#directorAutoShotPlanning");
const directorSceneContinuity = document.querySelector("#directorSceneContinuity");
const directorAxisRule = document.querySelector("#directorAxisRule");
const literatureCharacters = document.querySelector("#literatureCharacters");
const literatureIntent = document.querySelector("#literatureIntent");
const literatureText = document.querySelector("#literatureText");
const literatureTone = document.querySelector("#literatureTone");
const literatureUseLlm = document.querySelector("#literatureUseLlm");
const expandLiteratureButton = document.querySelector("#expandLiteratureButton");
const literatureStatus = document.querySelector("#literatureStatus");
const literatureResult = document.querySelector("#literatureResult");
const dramaturgyCharacters = document.querySelector("#dramaturgyCharacters");
const dramaturgyIntent = document.querySelector("#dramaturgyIntent");
const dramaturgyText = document.querySelector("#dramaturgyText");
const reviewDramaturgyButton = document.querySelector("#reviewDramaturgyButton");
const downloadDramaturgyRulesButton = document.querySelector("#downloadDramaturgyRulesButton");
const dramaturgyStatus = document.querySelector("#dramaturgyStatus");
const dramaturgyResult = document.querySelector("#dramaturgyResult");
const referenceQuery = document.querySelector("#referenceQuery");
const referenceFocus = document.querySelector("#referenceFocus");
const buildReferencePlanButton = document.querySelector("#buildReferencePlanButton");
const referenceStatus = document.querySelector("#referenceStatus");
const referenceResult = document.querySelector("#referenceResult");
const workflowTopic = document.querySelector("#workflowTopic");
const workflowScript = document.querySelector("#workflowScript");
const buildWorkflowButton = document.querySelector("#buildWorkflowButton");
const publishingTopic = document.querySelector("#publishingTopic");
const publishingScript = document.querySelector("#publishingScript");
const buildPublishingButton = document.querySelector("#buildPublishingButton");
const buildDailyBriefButton = document.querySelector("#buildDailyBriefButton");
const workflowStatus = document.querySelector("#workflowStatus");
const workflowResult = document.querySelector("#workflowResult");
const pipelineTopicInput = document.querySelector("#pipelineTopicInput");
const pipelinePromptInput = document.querySelector("#pipelinePromptInput");
const pipelineScriptInput = document.querySelector("#pipelineScriptInput");
const pipelineImagePathInput = document.querySelector("#pipelineImagePathInput");
const pipelineNativeTaskDirectoryInput = document.querySelector("#pipelineNativeTaskDirectoryInput");
const pipelineImageExecutionInput = document.querySelector("#pipelineImageExecutionInput");
const pipelineReferenceImageInput = document.querySelector("#pipelineReferenceImageInput");
const pipelineReferenceModeInput = document.querySelector("#pipelineReferenceModeInput");
const pipelineReferenceExecuteInput = document.querySelector("#pipelineReferenceExecuteInput");
const pipelineDurationInput = document.querySelector("#pipelineDurationInput");
const pipelineBudgetInput = document.querySelector("#pipelineBudgetInput");
const pipelineShotCountInput = document.querySelector("#pipelineShotCountInput");
const pipelineRouteInput = document.querySelector("#pipelineRouteInput");
const pipelineLightingPresetInput = document.querySelector("#pipelineLightingPresetInput");
const pipelineColorMoodInput = document.querySelector("#pipelineColorMoodInput");
const pipelineStyleProfileInput = document.querySelector("#pipelineStyleProfileInput");
const pipelineDynamicIntensityInput = document.querySelector("#pipelineDynamicIntensityInput");
const pipelinePromptRefineButton = document.querySelector("#pipelinePromptRefineButton");
const pipelineAutoExecuteButton = document.querySelector("#pipelineAutoExecuteButton");
const pipelineCreativePlanButton = document.querySelector("#pipelineCreativePlanButton");
const pipelineVisualCheckButton = document.querySelector("#pipelineVisualCheckButton");
const pipelineCostButton = document.querySelector("#pipelineCostButton");
const pipelineImageGenerateButton = document.querySelector("#pipelineImageGenerateButton");
const pipelineReferenceGenerateButton = document.querySelector("#pipelineReferenceGenerateButton");
const pipelineImageDiagnosticsButton = document.querySelector("#pipelineImageDiagnosticsButton");
const pipelineCreativeSuiteButton = document.querySelector("#pipelineCreativeSuiteButton");
const pipelineVisualBibleButton = document.querySelector("#pipelineVisualBibleButton");
const pipelineNativeImageTaskButton = document.querySelector("#pipelineNativeImageTaskButton");
const pipelineNativeImageCopyButton = document.querySelector("#pipelineNativeImageCopyButton");
const pipelineNativeImageImportButton = document.querySelector("#pipelineNativeImageImportButton");
const pipelineVisualQaDiagnosticsButton = document.querySelector("#pipelineVisualQaDiagnosticsButton");
const pipelineStatus = document.querySelector("#pipelineStatus");
const pipelineResult = document.querySelector("#pipelineResult");
const agentRuntimeStatus = document.querySelector("#agentRuntimeStatus");
const agentWorkspaceInput = document.querySelector("#agentWorkspaceInput");
const agentGoalInput = document.querySelector("#agentGoalInput");
const agentScriptInput = document.querySelector("#agentScriptInput");
const agentDurationInput = document.querySelector("#agentDurationInput");
const agentBudgetInput = document.querySelector("#agentBudgetInput");
const agentImageModelInput = document.querySelector("#agentImageModelInput");
const agentUseLlmInput = document.querySelector("#agentUseLlmInput");
const agentGenerateImagesInput = document.querySelector("#agentGenerateImagesInput");
const agentRequirePaidApprovalInput = document.querySelector("#agentRequirePaidApprovalInput");
const agentRequireVisualApprovalInput = document.querySelector("#agentRequireVisualApprovalInput");
const agentStartButton = document.querySelector("#agentStartButton");
const agentRefreshButton = document.querySelector("#agentRefreshButton");
const agentRunStatus = document.querySelector("#agentRunStatus");
const agentRunList = document.querySelector("#agentRunList");
const agentRunDetail = document.querySelector("#agentRunDetail");
const boardStatus = document.querySelector("#boardStatus");
const boardResult = document.querySelector("#boardResult");
const projectTitleInput = document.querySelector("#projectTitleInput");
const projectIntentInput = document.querySelector("#projectIntentInput");
const projectScriptInput = document.querySelector("#projectScriptInput");
const createProjectButton = document.querySelector("#createProjectButton");
const buildAssetInventoryButton = document.querySelector("#buildAssetInventoryButton");
const refinePromptButton = document.querySelector("#refinePromptButton");
const productionStatus = document.querySelector("#productionStatus");
const productionResult = document.querySelector("#productionResult");
const projectStatusText = document.querySelector("#projectStatusText");
const projectStatusResult = document.querySelector("#projectStatusResult");
const researchQueryInput = document.querySelector("#researchQueryInput");
const researchFocusInput = document.querySelector("#researchFocusInput");
const buildResearchPlanButton = document.querySelector("#buildResearchPlanButton");
const researchStatus = document.querySelector("#researchStatus");
const researchResult = document.querySelector("#researchResult");
const postTopicInput = document.querySelector("#postTopicInput");
const buildRiggingPlanButton = document.querySelector("#buildRiggingPlanButton");
const buildVideoPlanButton = document.querySelector("#buildVideoPlanButton");
const buildVideoReviewButton = document.querySelector("#buildVideoReviewButton");
const buildPortablePlanButton = document.querySelector("#buildPortablePlanButton");
const postStatus = document.querySelector("#postStatus");
const postResult = document.querySelector("#postResult");
let currentStoryboardProjectId = null;
let currentProposalId = null;
let currentProjectStatusItems = [];
let activeProjectSlug = "";
let currentAgentRunId = "";
let agentPollTimer = null;
let agentWorkspaces = [];
let latestCodexNativeHandoff = "";

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes || 0);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}${text ? `：${text.slice(0, 220)}` : ""}`);
  }
  return response.json();
}

async function getText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}${text ? `：${text.slice(0, 220)}` : ""}`);
  }
  return response.text();
}

function agentStatusLabel(status) {
  const labels = {
    queued: "排队中",
    running: "执行中",
    waiting_approval: "等待审批",
    paused: "已暂停",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
    pending: "待执行",
    retry: "准备重试"
  };
  return labels[status] || status || "未知";
}

function renderAgentRuns(items = []) {
  if (!agentRunList) return;
  agentRunList.innerHTML = items.length ? items.map((run) => `
    <article class="agent-run-card${run.id === currentAgentRunId ? " selected" : ""}">
      <button class="agent-run-open" type="button" data-agent-run-id="${escapeHtml(run.id)}">
        <span class="agent-run-main">
          <strong>${escapeHtml(run.title || run.goal)}</strong>
          <span>${escapeHtml(run.workspaceId || "")} / ${escapeHtml(run.projectSlug || "尚未建档")}</span>
        </span>
        <span class="agent-status agent-status-${escapeHtml(run.status)}">${escapeHtml(agentStatusLabel(run.status))}</span>
      </button>
    </article>
  `).join("") : `<div class="item empty">暂无智能体任务。</div>`;
}

function renderAgentRun(run = null) {
  if (!agentRunDetail || !agentRunStatus) return;
  if (!run) {
    agentRunDetail.classList.add("empty");
    agentRunDetail.textContent = "选择任务后查看执行步骤、审批和产物。";
    agentRunStatus.textContent = "暂无运行任务。";
    return;
  }
  currentAgentRunId = run.id;
  agentRunDetail.classList.remove("empty");
  agentRunStatus.textContent = `${agentStatusLabel(run.status)}；步骤 ${Math.min(run.currentStep || 0, run.steps?.length || 0)}/${run.steps?.length || 0}`;
  const pendingApproval = (run.approvals || []).find((item) => item.status === "pending");
  const imagePath = run.state?.imagePath || "";
  const nativeImageTask = run.state?.nativeImageTask || null;
  const approvalButtonLabel = pendingApproval?.type === "paid_image_generation"
    ? "批准生图并继续"
    : pendingApproval?.type === "codex_native_image_generation"
      ? "导入 Codex 图片并继续"
      : "确认通过并继续";
  agentRunDetail.innerHTML = `
    <div class="agent-run-header">
      <div>
        <strong>${escapeHtml(run.title || run.goal)}</strong>
        <div class="item-meta">${escapeHtml(run.id)} / ${escapeHtml(run.workspaceId || "")} / ${escapeHtml(run.contentPackId || "")}</div>
      </div>
      <span class="agent-status agent-status-${escapeHtml(run.status)}">${escapeHtml(agentStatusLabel(run.status))}</span>
    </div>
    <p>${escapeHtml(run.goal || "")}</p>
    <div class="agent-step-list">
      ${(run.steps || []).map((step) => `
        <div class="agent-step-row">
          <span class="agent-step-index">${escapeHtml(Number(step.index || 0) + 1)}</span>
          <span class="agent-step-copy">
            <strong>${escapeHtml(step.title)}</strong>
            <small>${escapeHtml(step.key)}${step.error ? ` / ${escapeHtml(step.error)}` : ""}</small>
          </span>
          <span class="agent-status agent-status-${escapeHtml(step.status)}">${escapeHtml(agentStatusLabel(step.status))}</span>
        </div>
      `).join("")}
    </div>
    ${pendingApproval ? `
      <div class="agent-approval">
        <strong>${escapeHtml(pendingApproval.request?.title || "等待审批")}</strong>
        <p>${escapeHtml(pendingApproval.request?.reason || "")}</p>
        ${pendingApproval.request?.model ? `<p class="item-meta">${escapeHtml(pendingApproval.request.provider || "")} / ${escapeHtml(pendingApproval.request.model)}</p>` : ""}
        ${pendingApproval.type === "codex_native_image_generation" && pendingApproval.request?.task ? `
          <p class="item-meta">任务目录：${escapeHtml(pendingApproval.request.task.outputDir || "")}</p>
          <p class="item-meta">提示词文件：${escapeHtml(pendingApproval.request.task.files?.promptMarkdown || "")}</p>
          <p>网页工作台不能自动向当前 Codex 对话发送消息或调用 image_gen。请复制执行指令，在当前对话中发送后生成图片。</p>
          ${pendingApproval.request.task.handoff?.instruction ? `<button class="copy-native-handoff" type="button" data-handoff="${escapeHtml(pendingApproval.request.task.handoff.instruction)}">复制 Codex 执行指令</button>` : ""}
        ` : ""}
        <div class="button-row">
          <button class="primary agent-action" type="button" data-agent-action="approve" data-agent-run-id="${escapeHtml(run.id)}" data-approval-id="${escapeHtml(pendingApproval.id)}" data-approval-type="${escapeHtml(pendingApproval.type)}">${approvalButtonLabel}</button>
          <button class="agent-action" type="button" data-agent-action="reject" data-agent-run-id="${escapeHtml(run.id)}" data-approval-id="${escapeHtml(pendingApproval.id)}">拒绝并暂停</button>
        </div>
      </div>
    ` : ""}
    ${nativeImageTask ? `
      <div class="agent-output">
        <strong>Codex 原生 image-2 任务</strong>
        <p class="item-meta">${escapeHtml(nativeImageTask.outputDir || "")}</p>
        <p class="item-meta">${escapeHtml(nativeImageTask.files?.promptMarkdown || "")}</p>
        <p>交接方式：${nativeImageTask.handoff?.automaticDispatch === false ? "复制指令到当前 Codex 对话" : "自动发送"}</p>
        ${nativeImageTask.handoff?.instruction ? `<button class="copy-native-handoff" type="button" data-handoff="${escapeHtml(nativeImageTask.handoff.instruction)}">复制 Codex 执行指令</button>` : ""}
      </div>
    ` : ""}
    ${imagePath ? `
      <div class="agent-output">
        <strong>生成图</strong>
        <img class="generated-image-preview" loading="lazy" src="/api/output-files?path=${encodeURIComponent(imagePath)}" alt="智能体生成图">
        <p class="item-meta">${escapeHtml(imagePath)}</p>
      </div>
    ` : ""}
    <div class="agent-actions">
      ${run.status === "paused" ? `<button class="agent-action" type="button" data-agent-action="resume" data-agent-run-id="${escapeHtml(run.id)}">恢复任务</button>` : ""}
      ${["queued", "running", "waiting_approval", "paused"].includes(run.status) ? `<button class="agent-action" type="button" data-agent-action="cancel" data-agent-run-id="${escapeHtml(run.id)}">取消任务</button>` : ""}
    </div>
    ${run.error ? `<p class="agent-error">${escapeHtml(run.error)}</p>` : ""}
    <details>
      <summary>查看任务数据</summary>
      <pre>${escapeHtml(JSON.stringify(run, null, 2))}</pre>
    </details>
  `;
}

function scheduleAgentPoll(run) {
  if (agentPollTimer) clearTimeout(agentPollTimer);
  agentPollTimer = null;
  if (!run || !["queued", "running"].includes(run.status)) return;
  agentPollTimer = setTimeout(() => loadAgentRun(run.id, true), 1200);
}

async function loadAgentRun(id, poll = false) {
  if (!id) return null;
  const run = await getJson(`/api/agent/runs/${encodeURIComponent(id)}`);
  renderAgentRun(run);
  if (poll) scheduleAgentPoll(run);
  if (!["queued", "running"].includes(run.status)) await loadAgentRuns(false);
  return run;
}

async function loadAgentRuns(openCurrent = true) {
  if (!agentRunList) return [];
  const result = await getJson("/api/agent/runs?limit=20");
  renderAgentRuns(result.items || []);
  if (openCurrent && currentAgentRunId) await loadAgentRun(currentAgentRunId, false);
  return result.items || [];
}

async function loadAgentConsole() {
  if (!agentWorkspaceInput) return;
  const [runtime, runs] = await Promise.all([
    getJson("/api/agent/runtime"),
    getJson("/api/agent/runs?limit=20")
  ]);
  agentWorkspaces = runtime.workspaces || [];
  const selected = agentWorkspaceInput.value;
  agentWorkspaceInput.innerHTML = agentWorkspaces.map((workspace) => `
    <option value="${escapeHtml(workspace.id)}" data-pack-id="${escapeHtml(workspace.contentPackId)}">${escapeHtml(workspace.name)} / ${escapeHtml(workspace.mode)}</option>
  `).join("");
  if (selected && agentWorkspaces.some((item) => item.id === selected)) {
    agentWorkspaceInput.value = selected;
  } else {
    agentWorkspaceInput.value = agentWorkspaces.some((item) => item.id === "creator-default")
      ? "creator-default"
      : (agentWorkspaces[0]?.id || "");
  }
  agentRuntimeStatus.textContent = `${runtime.summary?.activeRuns || 0} 个运行中；图像 ${runtime.imagePolicy?.defaultModel || "gpt-image-2"}`;
  if (!currentAgentRunId && runs.items?.length) currentAgentRunId = runs.items[0].id;
  renderAgentRuns(runs.items || []);
  if (currentAgentRunId) await loadAgentRun(currentAgentRunId, false);
}

async function startAgentRun() {
  const goal = agentGoalInput?.value.trim() || pipelineTopicInput?.value.trim() || workflowTopic?.value.trim();
  if (!goal) {
    agentRunStatus.textContent = "请先输入创作目标。";
    return;
  }
  const workspaceId = agentWorkspaceInput?.value || "creator-default";
  const workspace = agentWorkspaces.find((item) => item.id === workspaceId);
  agentStartButton.disabled = true;
  agentRunStatus.textContent = "正在创建智能体任务。";
  try {
    const run = await getJson("/api/agent/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        contentPackId: workspace?.contentPackId || "creator-generic",
        title: goal.slice(0, 80),
        topic: goal,
        goal,
        intent: goal,
        prompt: pipelinePromptInput?.value.trim() || goal,
        script: agentScriptInput?.value.trim() || pipelineScriptInput?.value.trim() || workflowScript?.value.trim() || "",
        referenceImagePath: pipelineReferenceImageInput?.value.trim() || "",
        durationSec: Number(agentDurationInput?.value || 15),
        budgetCny: Number(agentBudgetInput?.value || 0) || undefined,
        generateImages: Boolean(agentGenerateImagesInput?.checked),
        useLlm: Boolean(agentUseLlmInput?.checked),
        imageExecutionMode: pipelineImageExecutionInput?.value || "codex_native",
        imageProvider: "openai",
        imageModel: agentImageModelInput?.value || undefined,
        requirePaidApproval: Boolean(agentRequirePaidApprovalInput?.checked),
        requireVisualApproval: Boolean(agentRequireVisualApprovalInput?.checked),
        allowDraft: true,
        autoStart: true
      })
    });
    currentAgentRunId = run.id;
    renderAgentRun(run);
    await loadAgentRuns(false);
    scheduleAgentPoll(run);
  } catch (error) {
    agentRunStatus.textContent = `任务创建失败：${error.message}`;
  } finally {
    agentStartButton.disabled = false;
  }
}

async function handleAgentAction(button) {
  const action = button.dataset.agentAction;
  const runId = button.dataset.agentRunId;
  if (!action || !runId) return;
  button.disabled = true;
  try {
    let run;
    if (action === "approve" || action === "reject") {
      const isPaid = button.dataset.approvalType === "paid_image_generation";
      const isCodexNative = button.dataset.approvalType === "codex_native_image_generation";
      if (action === "approve" && isPaid && !window.confirm("确认调用云端图像模型？这一步可能消耗账户额度。")) return;
      if (action === "approve" && isCodexNative && !pipelineImagePathInput?.value.trim()) {
        window.alert("请先用 Codex 原生 image-2 生成图片，并把图片的本地路径填入“生成图 / 待检查图片路径”。");
        pipelineImagePathInput?.focus();
        return;
      }
      if (action === "approve" && isCodexNative && !window.confirm("确认这张图已经直接显示在当前 Codex 对话中，并导入工作台进入真实图片视觉复核？")) return;
      if (action === "approve" && !isPaid && !isCodexNative && !window.confirm("确认该生成图通过视觉终审并继续后续流程？")) return;
      const approvalResponse = isPaid
        ? { acknowledgedCost: true, approvedBy: "workbench-user" }
        : isCodexNative
          ? {
              sourceImagePath: pipelineImagePathInput.value.trim(),
              confirmedGeneratedByCodexNative: true,
              conversationImageDisplayed: true,
              approvedBy: "workbench-user"
            }
          : { confirmedPass: true, approvedBy: "workbench-user" };
      run = await getJson(`/api/agent/runs/${encodeURIComponent(runId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: Number(button.dataset.approvalId || 0),
          decision: action === "approve" ? "approved" : "rejected",
          response: action === "approve"
            ? approvalResponse
            : { reason: "workbench-user rejected" }
        })
      });
    } else {
      if (action === "cancel" && !window.confirm("确认取消这个任务？已生成的项目文件会保留。")) return;
      run = await getJson(`/api/agent/runs/${encodeURIComponent(runId)}/${action}`, { method: "POST" });
    }
    currentAgentRunId = run.id;
    renderAgentRun(run);
    await loadAgentRuns(false);
    scheduleAgentPoll(run);
  } catch (error) {
    agentRunStatus.textContent = `任务操作失败：${error.message}`;
  } finally {
    button.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setAnswer(message) {
  answerBox.classList.remove("empty");
  answerBox.textContent = message;
}

function renderInspectAssetButton(asset = {}) {
  const fileId = asset.fileId || asset.file_id;
  const imagePath = asset.absPath || asset.abs_path || "";
  if (!fileId && !imagePath) return "";
  const title = asset.title || asset.relPath || asset.rel_path || "视觉资产";
  return `
    <button class="inspect-asset-button" type="button"
      data-file-id="${escapeHtml(fileId)}"
      data-image-path="${escapeHtml(imagePath)}"
      data-title="${escapeHtml(title)}"
      data-rel-path="${escapeHtml(asset.relPath || asset.rel_path || "")}">
      检查此图
    </button>
  `;
}

function renderStats(stats) {
  const items = [
    ["活跃文件", stats.fileStats?.active_files ?? 0],
    ["活跃容量", formatBytes(stats.fileStats?.active_bytes ?? 0)],
    ["文档", stats.docs?.documents ?? 0],
    ["文本字符", stats.docs?.text_chars ?? 0]
  ];
  statsGrid.innerHTML = items.map(([label, value]) => `
    <div class="stat-item">
      <span class="stat-value">${value}</span>
      <span class="stat-label">${label}</span>
    </div>
  `).join("");
}

function renderLlmStatus(config = null) {
  if (!llmStatusText || !llmStatusResult) return;
  if (!config) {
    llmStatusText.textContent = "等待检测。";
    llmStatusResult.classList.add("empty");
    llmStatusResult.textContent = "暂无系统接入状态。";
    return;
  }
  const llm = config.llm || {};
  llmStatusText.textContent = llm.enabled ? `已启用：${llm.provider}/${llm.model}` : "本地规则模式";
  const matrix = llm.capabilityMatrix || config.capabilityMatrix || [];
  const safety = llm.safetyBoundary || config.safetyBoundary || [];
  llmStatusResult.classList.remove("empty");
  llmStatusResult.innerHTML = `
    <article class="literature-block">
      <h3>运行模式</h3>
      <p>${escapeHtml(llm.enabled ? "大模型已接入，创作和改写能力可用。" : "大模型未启用，当前可稳定使用资料库、规则审查、分镜草稿、提示词模板和成本估算。")}</p>
      <p class="item-meta">${escapeHtml(config.sourceRoot || "")}</p>
    </article>
    <article class="literature-block">
      <h3>可用能力</h3>
      <p>${(llm.capabilities || []).map((item) => `<span class="soft-pill">${escapeHtml(item)}</span>`).join(" ")}</p>
    </article>
    ${matrix.length ? `
      <article class="literature-block">
        <h3>能力矩阵</h3>
        <ul>${matrix.map((item) => `<li>${escapeHtml(`${item.label || item.id}：${item.status || ""}`)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${safety.length ? `
      <article class="literature-block">
        <h3>正史边界</h3>
        <ul>${safety.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${!llm.enabled ? `
      <article class="literature-block">
        <h3>接入缺口</h3>
        <ul>${(llm.missing || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <p>${escapeHtml(llm.setupHint || "")}</p>
        ${(llm.unavailableUntilConfigured || []).length ? `<p>暂不可用：${escapeHtml(llm.unavailableUntilConfigured.join("、"))}</p>` : ""}
        ${llm.envTemplate ? `<pre>${escapeHtml(llm.envTemplate)}</pre>` : ""}
        ${llm.localFallback ? `<p class="item-meta">${escapeHtml(llm.localFallback)}</p>` : ""}
      </article>
    ` : ""}
  `;
}

function renderSystemHealth(health = null) {
  if (!systemAuditStatus || !systemAuditResult) return;
  if (!health) {
    systemAuditStatus.textContent = "等待核验。";
    systemAuditResult.classList.add("empty");
    systemAuditResult.textContent = "暂无全管线核验结果。";
    return;
  }
  const readiness = health.readiness || {};
  const database = health.database || {};
  const counts = database.counts || {};
  const pipeline = health.latestFullPipeline || null;
  const plugins = health.creativePlugins || {};
  const stages = health.pipelineStages || [];
  const warnings = health.warnings || [];
  const statusLabel = health.status === "ready"
    ? "全部就绪"
    : health.status === "core_ready_external_backends_missing"
      ? "核心管线就绪"
      : "需要维护";
  systemAuditStatus.textContent = pipeline?.ok
    ? `${statusLabel}；最近 E2E ${pipeline.summary?.passed || 0}/${pipeline.summary?.checked || 0}`
    : statusLabel;
  systemAuditResult.classList.remove("empty");
  systemAuditResult.innerHTML = `
    <article class="literature-block">
      <h3>就绪状态</h3>
      <p>
        <span class="stage-pill ${readiness.coreReady ? "done" : "missing"}">核心服务 ${readiness.coreReady ? "可用" : "异常"}</span>
        <span class="stage-pill ${readiness.fullPipelineVerified ? "done" : "partial"}">全管线 ${readiness.fullPipelineVerified ? "已验证" : "待验证"}</span>
        <span class="stage-pill ${readiness.llmReady ? "done" : "partial"}">大模型 ${readiness.llmReady ? "已接入" : "本地规则"}</span>
        <span class="stage-pill ${readiness.paidImageReady ? "done" : "partial"}">图像后端 ${readiness.paidImageReady ? "可执行" : "任务包模式"}</span>
      </p>
      <p class="item-meta">数据库：${escapeHtml(database.quickCheck || "unknown")}；文件 ${escapeHtml(counts.files || 0)}；文档 ${escapeHtml(counts.documents || 0)}；证据块 ${escapeHtml(counts.chunks || 0)}；视觉资产 ${escapeHtml(counts.assets || 0)}</p>
    </article>
    <article class="literature-block">
      <h3>创作管线</h3>
      <p>${stages.map((stage) => `<span class="soft-pill">${escapeHtml(stage.label)}</span>`).join(" ")}</p>
      <p class="item-meta">创作辅助插件：${escapeHtml(plugins.installed || 0)}/${escapeHtml(plugins.total || 0)} 已安装。</p>
    </article>
    ${pipeline ? `
      <article class="literature-block">
        <h3>最近一次隔离核验</h3>
        <p>${pipeline.ok ? "通过" : "未通过"}：${escapeHtml(pipeline.summary?.passed || 0)}/${escapeHtml(pipeline.summary?.checked || 0)} 项。</p>
        <p class="item-meta">${escapeHtml(pipeline.createdAt || "")}<br>${escapeHtml(pipeline.reportPath || "")}</p>
      </article>
    ` : ""}
    ${warnings.length ? `
      <article class="literature-block">
        <h3>当前缺口</h3>
        <ul>${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
  `;
}

async function loadSystemHealth() {
  if (!systemAuditStatus) return;
  systemAuditStatus.textContent = "正在读取健康状态...";
  try {
    const health = await getJson("/api/system/health");
    renderSystemHealth(health);
  } catch (error) {
    systemAuditStatus.textContent = `健康检查失败：${error.message}`;
  }
}

async function runSystemPipelineCheck() {
  if (!systemPipelineCheckButton || !systemAuditStatus) return;
  systemPipelineCheckButton.disabled = true;
  if (systemHealthButton) systemHealthButton.disabled = true;
  systemAuditStatus.textContent = "正在隔离数据库和输出目录执行全管线核验...";
  try {
    const result = await getJson("/api/system/pipeline-check", { method: "POST" });
    systemAuditStatus.textContent = result.ok
      ? `全管线核验通过，用时 ${(Number(result.durationMs || 0) / 1000).toFixed(1)} 秒。`
      : `全管线核验未通过，退出码 ${result.exitCode ?? "unknown"}。`;
    await loadSystemHealth();
  } catch (error) {
    systemAuditStatus.textContent = `全管线核验失败：${error.message}`;
  } finally {
    systemPipelineCheckButton.disabled = false;
    if (systemHealthButton) systemHealthButton.disabled = false;
  }
}

function renderAnswerCard(card = null) {
  if (!answerCardStatus || !answerCardResult) return;
  if (!card || !card.query) {
    answerCardStatus.textContent = "等待检索。";
    answerCardResult.classList.add("empty");
    answerCardResult.textContent = "暂无首要结论。";
    return;
  }
  answerCardResult.classList.remove("empty");
  answerCardStatus.textContent = card.primary ? `${card.primary.type} / ${card.primary.name}` : "未找到首要对象";
  const claims = card.claims || [];
  const evidence = card.evidence || [];
  const visualItems = card.visualAssets?.items || [];
  const unresolved = card.unresolved || [];
  answerCardResult.innerHTML = `
    <article class="literature-block answer-primary-card">
      <h3>首要对象</h3>
      ${card.primary ? `
        <div class="item">
          <div class="item-title">${escapeHtml(card.primary.name)} <span class="pill">${escapeHtml(card.primary.type)}</span></div>
          <div class="item-body">${escapeHtml(card.primary.summary || "资料库暂缺一句话摘要。")}</div>
          ${(card.primary.aliases || []).length ? `<div class="item-meta">别名：${escapeHtml(card.primary.aliases.join("、"))}</div>` : ""}
        </div>
      ` : `<div class="item empty">没有找到明确首要实体。</div>`}
    </article>
    ${claims.length ? `
      <article class="literature-block">
        <h3>短结论</h3>
        ${claims.map((claim) => `
          <div class="item">
            <div class="item-title">${escapeHtml(claim.label)} <span class="soft-pill">${escapeHtml(claim.status)}</span></div>
            <div class="item-body">${escapeHtml(claim.value)}</div>
            <div class="item-meta">${escapeHtml(claim.source || "")}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${visualItems.length ? `
      <article class="literature-block">
        <h3>可用视觉参考</h3>
        <div class="asset-grid visual-grid">
          ${visualItems.slice(0, 6).map((asset) => `
            <article class="item visual-item">
              ${asset.url ? `<img class="asset-thumb" loading="lazy" src="${escapeHtml(asset.url)}" alt="">` : ""}
              <div class="item-title">${escapeHtml(asset.title || asset.relPath || "视觉资产")}</div>
              <div class="visual-badges">
                ${asset.referenceTierLabel ? `<span class="pill">${escapeHtml(asset.referenceTierLabel)}</span>` : ""}
                ${asset.kind ? `<span class="pill">${escapeHtml(asset.kind)}</span>` : ""}
              </div>
              <div class="item-meta">${escapeHtml(asset.relPath || "")}</div>
              <div class="button-row">${renderInspectAssetButton(asset)}</div>
            </article>
          `).join("")}
        </div>
      </article>
    ` : ""}
    ${evidence.length ? `
      <article class="literature-block">
        <h3>精炼证据</h3>
        ${evidence.slice(0, 4).map((item) => `
          <div class="item">
            <div class="item-title">${escapeHtml(item.claim)}</div>
            <div class="item-meta">${escapeHtml(item.evidenceTypeLabel)} / ${escapeHtml(item.confidence)} / ${escapeHtml(item.relPath)}</div>
            ${(item.keyPoints || []).length ? `<ul>${item.keyPoints.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${unresolved.length ? `
      <article class="literature-block">
        <h3>待确认</h3>
        <ul>${unresolved.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${(card.nextActions || []).length ? `
      <article class="literature-block">
        <h3>下一步</h3>
        <ol>${card.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
    ` : ""}
  `;
}

function renderEvidence(result = {}) {
  const entities = result.entities || [];
  const chunks = result.chunks || [];
  const assets = result.assets || [];

  entityList.innerHTML = entities.length ? entities.map((entity) => `
    <article class="item">
      <div class="item-title"><span class="pill">${escapeHtml(entity.type)}</span>${escapeHtml(entity.name)}</div>
      <div class="item-body">${escapeHtml(entity.summary || "")}</div>
    </article>
  `).join("") : `<div class="item empty">没有匹配实体。</div>`;

  chunkList.innerHTML = chunks.length ? chunks.map((chunk) => {
    const text = String(chunk.text || "");
    const brief = chunk.brief || {};
    const points = brief.keyPoints || [];
    const confidenceLabel = { high: "高", medium: "中", low: "低" }[brief.confidence] || "待定";
    return `
      <article class="item evidence-card">
        <div class="item-title">${escapeHtml(brief.claim || chunk.title)}</div>
        <div class="evidence-badges">
          <span class="pill">${escapeHtml(brief.evidenceTypeLabel || "证据")}</span>
          <span class="score-pill">可信度：${escapeHtml(confidenceLabel)}</span>
          ${(brief.usage || []).map((item) => `<span class="soft-pill">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="item-meta">${escapeHtml(chunk.title)} / ${escapeHtml(chunk.rel_path)}</div>
        ${points.length ? `<ul class="evidence-points">${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
        <details class="evidence-source">
          <summary>查看原文片段</summary>
          <div class="item-body">${escapeHtml(brief.cleanText || text.slice(0, 520))}${text.length > 520 ? "..." : ""}</div>
        </details>
      </article>
    `;
  }).join("") : `<div class="item empty">没有匹配文档片段。</div>`;

  assetList.innerHTML = assets.length ? `
    <div class="asset-grid">
      ${assets.map((asset) => {
        const isImage = asset.media_type === "image";
        const preview = isImage
          ? `<img class="asset-thumb" loading="lazy" src="/api/files/${asset.file_id}" alt="">`
          : `<div class="asset-thumb"></div>`;
        return `
          <article class="item">
            ${preview}
            <div class="item-title">${escapeHtml(asset.title)}</div>
            <div class="item-meta">${escapeHtml(asset.rel_path)}</div>
            <div class="button-row">${isImage ? renderInspectAssetButton(asset) : ""}</div>
          </article>
        `;
      }).join("")}
    </div>
  ` : `<div class="item empty">没有匹配素材。</div>`;
}

function renderVisualAssets(result = {}) {
  if (!visualAssetList || !visualStatus) return;
  const items = result.items || [];
  visualStatus.textContent = items.length ? `命中 ${items.length} 张参考图。` : "暂无命中。";
  visualAssetList.innerHTML = items.length ? `
    <div class="asset-grid visual-grid">
      ${items.map((asset) => `
        <article class="item visual-item">
          <img class="asset-thumb" loading="lazy" src="${escapeHtml(asset.url || `/api/files/${asset.file_id}`)}" alt="">
          <div class="item-title">${escapeHtml(asset.title)}</div>
          <div class="visual-badges">
            <span class="pill">${escapeHtml(asset.promptRoleLabel || asset.promptRole)}</span>
            ${asset.referenceTierLabel ? `<span class="pill">${escapeHtml(asset.referenceTierLabel)}</span>` : ""}
            <span class="score-pill">${escapeHtml(asset.namingScore)}</span>
          </div>
          <div class="item-meta">${escapeHtml(asset.rel_path)}</div>
          <div class="item-body">${escapeHtml(asset.reason || "")}</div>
          <div class="button-row">${renderInspectAssetButton(asset)}</div>
        </article>
      `).join("")}
    </div>
  ` : `<div class="item empty">没有匹配的视觉资产。可以换角色名、项目名，或先刷新视觉索引。</div>`;
}

function getDirectorOptions() {
  return {
    enabled: true,
    targetModel: directorTargetModel?.value.trim() || "Seedance 2.0",
    aspectRatio: directorAspectRatio?.value || "16:9",
    fps: Number(directorFps?.value || 24),
    targetDurationSec: Number(directorTargetDuration?.value || 0),
    autoShotPlanning: directorAutoShotPlanning ? directorAutoShotPlanning.checked : true,
    defaultDurationSec: Number(directorDuration?.value || 4),
    sceneContinuity: directorSceneContinuity?.value.trim() || "统一场景设定，保持时间、天气、空间方向、角色服装和装备连续。",
    axisRule: directorAxisRule?.value.trim() || "遵守 180 度轴线；同一场戏的角色左右关系、视线方向和行动方向保持稳定。"
  };
}

function renderLiteratureResult(payload = {}) {
  if (!literatureResult || !literatureStatus) return;
  const result = payload.result || null;
  if (!result) {
    literatureResult.classList.add("empty");
    literatureResult.textContent = "暂无文学拓展。";
    literatureStatus.textContent = "等待文本。";
    return;
  }
  literatureResult.classList.remove("empty");
  literatureStatus.textContent = payload.llmUsed ? "已由大模型结合资料库校准。" : "已生成本地编辑草稿。";
  const traces = result.aiTraceFixes || [];
  const arcs = result.characterArcs || [];
  const rules = result.dramaturgyRules || [];
  const dramaturgyReview = result.dramaturgyReview || null;
  const layerReviews = dramaturgyReview?.layerReviews || [];
  const unresolved = result.unresolvedQuestions || [];
  literatureResult.innerHTML = `
    <article class="literature-block">
      <h3>文学化版本</h3>
      <pre>${escapeHtml(result.literaryRewrite || "")}</pre>
    </article>
    <article class="literature-block">
      <h3>校准结论</h3>
      <p>可信度：${escapeHtml(result.calibration?.confidence || "unknown")}</p>
      <p>命中对象：${escapeHtml((result.calibration?.matchedNames || []).join("、") || "无")}</p>
    </article>
    <article class="literature-block">
      <h3>去 AI 味处理</h3>
      ${traces.map((trace) => `
        <div class="item">
          <div class="item-title">${escapeHtml(trace.issue)}</div>
          <div class="item-meta">${escapeHtml((trace.examples || []).join("、"))}</div>
          <div class="item-body">${escapeHtml(trace.fix || "")}</div>
        </div>
      `).join("")}
    </article>
    <article class="literature-block">
      <h3>角色弧光</h3>
      ${arcs.map((arc) => `
        <div class="item">
          <div class="item-title">${escapeHtml(arc.character)}</div>
          <div class="item-body">${escapeHtml(`当前：${arc.currentState}\n内在缺口：${arc.innerNeed}\n压力：${arc.pressure}\n转折：${arc.turn}\n代价：${arc.cost}\n可见变化：${arc.visibleChange}`)}</div>
        </div>
      `).join("")}
    </article>
    <article class="literature-block">
      <h3>剧作规范</h3>
      <ul>${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
    </article>
    ${layerReviews.length ? `
      <article class="literature-block">
        <h3>四层叙事审查</h3>
        <p>${escapeHtml(dramaturgyReview.thesis || "")}</p>
        ${layerReviews.map((layer) => `
          <div class="item">
            <div class="item-title">${escapeHtml(layer.layer)}：${escapeHtml(layer.grade)} / ${escapeHtml(layer.score)}</div>
            <div class="item-body">${escapeHtml(layer.conclusion || "")}</div>
            ${(layer.matchedMotifs || []).length ? `<div class="item-meta">母题：${escapeHtml(layer.matchedMotifs.map((item) => item.name).join("、"))}</div>` : ""}
            ${(layer.timeVectorRecommendations || []).length ? `<div class="item-meta">时间矢量：${escapeHtml(layer.timeVectorRecommendations.map((item) => `${item.element}：${item.use}`).join("；"))}</div>` : ""}
            <div class="item-body">${escapeHtml(`纠错：${layer.correction || ""}\n升华：${layer.elevation || ""}`)}</div>
          </div>
        `).join("")}
        ${(dramaturgyReview.issues || []).length ? `
          <div class="item">
            <div class="item-title">优先修正</div>
            <ul>${dramaturgyReview.issues.map((issue) => `<li>${escapeHtml(`${issue.layer}：${issue.issue} -> ${issue.fix}`)}</li>`).join("")}</ul>
          </div>
        ` : ""}
      </article>
    ` : ""}
    ${unresolved.length ? `
      <article class="literature-block">
        <h3>待确认</h3>
        <ul>${unresolved.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
  `;
}

function renderDramaturgyReview(payload = null) {
  if (!dramaturgyResult || !dramaturgyStatus) return;
  const review = payload?.review || payload || null;
  if (!review) {
    dramaturgyResult.classList.add("empty");
    dramaturgyResult.textContent = "暂无剧本审查。";
    dramaturgyStatus.textContent = "等待剧本。";
    return;
  }
  dramaturgyResult.classList.remove("empty");
  dramaturgyStatus.textContent = "已生成四层叙事审查。";
  const layers = review.layerReviews || [];
  const issues = review.issues || [];
  const rewriteDirectives = review.rewriteDirectives || [];
  const upgradeChecklist = review.upgradeChecklist || [];
  const coherenceReview = review.coherenceReview || [];
  dramaturgyResult.innerHTML = `
    <article class="literature-block">
      <h3>核心命题</h3>
      <p>${escapeHtml(review.thesis || "")}</p>
      <p class="item-meta">来源优先级：${escapeHtml((review.sourcePriority || []).join(" / "))}</p>
    </article>
    <article class="literature-block">
      <h3>四层诊断</h3>
      ${layers.map((layer) => `
        <div class="item">
          <div class="item-title">${escapeHtml(layer.layer)}：${escapeHtml(layer.grade)} / ${escapeHtml(layer.score)}</div>
          <div class="item-body">${escapeHtml(layer.conclusion || "")}</div>
          ${(layer.matchedMotifs || []).length ? `<div class="item-meta">母题：${escapeHtml(layer.matchedMotifs.map((item) => `${item.category}/${item.name}`).join("、"))}</div>` : ""}
          ${(layer.timeVectorRecommendations || []).length ? `<div class="item-meta">时间矢量：${escapeHtml(layer.timeVectorRecommendations.map((item) => `${item.element}：${item.use}`).join("；"))}</div>` : ""}
          ${(layer.suggestedProppFunctions || []).length ? `<div class="item-meta">动作功能：${escapeHtml(layer.suggestedProppFunctions.join("、"))}</div>` : ""}
          <div class="item-body">${escapeHtml(`纠错：${layer.correction || ""}\n升华：${layer.elevation || ""}`)}</div>
        </div>
      `).join("")}
    </article>
    ${issues.length ? `
      <article class="literature-block">
        <h3>优先修正</h3>
        ${issues.map((issue) => `
          <div class="item">
            <div class="item-title">${escapeHtml(issue.layer)} / ${escapeHtml(issue.severity || "medium")}</div>
            <div class="item-body">${escapeHtml(`${issue.issue}\n修正：${issue.fix}`)}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${rewriteDirectives.length ? `
      <article class="literature-block">
        <h3>重写指令</h3>
        <ol>${rewriteDirectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
    ` : ""}
    ${upgradeChecklist.length ? `
      <article class="literature-block">
        <h3>升华清单</h3>
        <ul>${upgradeChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${coherenceReview.length ? `
      <article class="literature-block">
        <h3>世界观自洽复核</h3>
        ${coherenceReview.map((item) => `
          <div class="item">
            <div class="item-title">${escapeHtml(item.name)}</div>
            <div class="item-body">${escapeHtml(`${item.question}\n${(item.checks || []).join("\n")}`)}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
  `;
}

function renderReferencePlan(plan = null) {
  if (!referenceResult || !referenceStatus) return;
  if (!plan) {
    referenceResult.classList.add("empty");
    referenceResult.textContent = "暂无参考计划。";
    referenceStatus.textContent = "等待目标。";
    return;
  }
  referenceResult.classList.remove("empty");
  referenceStatus.textContent = `重点：${(plan.focuses || []).join(" / ")}`;
  referenceResult.innerHTML = `
    <article class="literature-block">
      <h3>外部搜索入口</h3>
      <div class="reference-links">
        ${(plan.searchUrls || []).map((item) => `
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.platform)}：${escapeHtml(item.label)}</a>
        `).join("")}
      </div>
    </article>
    <article class="literature-block">
      <h3>推荐辅助项目</h3>
      ${(plan.sources || []).map((source) => `
        <div class="item">
          <div class="item-title"><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a></div>
          <div class="item-meta">${escapeHtml(source.category)} / ${escapeHtml((source.useFor || []).join("、"))}</div>
          <div class="item-body">${escapeHtml(source.note || "")}</div>
        </div>
      `).join("")}
    </article>
    <article class="literature-block">
      <h3>使用规则</h3>
      <ul>${(plan.usageRules || []).map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
    </article>
    <article class="literature-block">
      <h3>本地工具接管</h3>
      ${(plan.localToolHandoff || []).map((item) => `
        <div class="item">
          <div class="item-title">${escapeHtml(item.tool)}</div>
          <div class="item-body">${escapeHtml(`${item.useFor}\n${item.rule}`)}</div>
        </div>
      `).join("")}
    </article>
  `;
}

function renderWorkflowResult(payload = null, label = "结果") {
  if (!workflowResult || !workflowStatus) return;
  if (!payload) {
    workflowResult.classList.add("empty");
    workflowResult.textContent = "暂无流程或宣发方案。";
    workflowStatus.textContent = "等待生成。";
    return;
  }
  workflowResult.classList.remove("empty");
  workflowStatus.textContent = label;
  const stages = payload.stages || [];
  const titles = payload.titleCandidates || payload.publishing?.titleCandidates || [];
  const tags = payload.tags || payload.publishing?.tags || [];
  const hooks = payload.fifteenSecondHook?.hooks || payload.publishing?.fifteenSecondHook?.hooks || [];
  const videoPromptPack = payload.videoPromptPack;
  const storyArrangement = payload.storyArrangement;
  const dramaturgyReview = payload.dramaturgyReview || null;
  const workflowLayerReviews = dramaturgyReview?.layerReviews || [];
  workflowResult.innerHTML = `
    <article class="literature-block">
      <h3>账号定位</h3>
      <p>${escapeHtml(payload.accountProfile?.accountName || "当前项目")} / ${escapeHtml(payload.accountProfile?.authorName || "项目创作者")}</p>
      <p>${escapeHtml(payload.accountProfile?.positioning || "")}</p>
    </article>
    ${stages.length ? `
      <article class="literature-block">
        <h3>工作流程</h3>
        ${stages.map((stage) => `
          <div class="item">
            <div class="item-title">${escapeHtml(stage.title)}</div>
            <ul>${(stage.actions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${workflowLayerReviews.length ? `
      <article class="literature-block">
        <h3>四层叙事前置审查</h3>
        <p>${escapeHtml(dramaturgyReview.thesis || "")}</p>
        ${workflowLayerReviews.map((layer) => `
          <div class="item">
            <div class="item-title">${escapeHtml(layer.layer)}：${escapeHtml(layer.grade)} / ${escapeHtml(layer.score)}</div>
            <div class="item-body">${escapeHtml(layer.conclusion || "")}</div>
            ${(layer.matchedMotifs || []).length ? `<div class="item-meta">母题：${escapeHtml(layer.matchedMotifs.map((item) => item.name).join("、"))}</div>` : ""}
            ${(layer.timeVectorRecommendations || []).length ? `<div class="item-meta">时间矢量：${escapeHtml(layer.timeVectorRecommendations.map((item) => `${item.element}：${item.use}`).join("；"))}</div>` : ""}
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${storyArrangement ? `
      <article class="literature-block">
        <h3>本地资料库故事编排</h3>
        <p>${escapeHtml(storyArrangement.triggerRule || "")}</p>
        <p>${escapeHtml(storyArrangement.animationPurpose || "")}</p>
        <p>${escapeHtml(storyArrangement.localWritingPrinciple || "")}</p>
        <p>${escapeHtml(storyArrangement.defaultVisualStyle || "")}</p>
        ${(storyArrangement.narrativeSpine || []).length ? `
          <div class="item">
            <div class="item-title">故事拍点</div>
            <ul>${storyArrangement.narrativeSpine.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        ${(storyArrangement.continuityRules || []).length ? `
          <div class="item">
            <div class="item-title">连续性规则</div>
            <ul>${storyArrangement.continuityRules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        ${(storyArrangement.canonAnchors || []).length ? `
          <div class="item">
            <div class="item-title">本地证据锚点</div>
            <ul>${storyArrangement.canonAnchors.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        ` : ""}
      </article>
    ` : ""}
    ${titles.length ? `
      <article class="literature-block">
        <h3>B站标题候选</h3>
        <ul>${titles.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${payload.coverBrief || payload.publishing?.coverBrief ? `
      <article class="literature-block">
        <h3>封面设计</h3>
        <pre>${escapeHtml(JSON.stringify(payload.coverBrief || payload.publishing.coverBrief, null, 2))}</pre>
      </article>
    ` : ""}
    ${payload.description || payload.publishing?.description ? `
      <article class="literature-block">
        <h3>简介</h3>
        <pre>${escapeHtml(payload.description || payload.publishing.description)}</pre>
      </article>
    ` : ""}
    ${hooks.length ? `
      <article class="literature-block">
        <h3>15秒动画钩子</h3>
        <ul>${hooks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${videoPromptPack ? `
      <article class="literature-block">
        <h3>Seedance 2.0 文生视频提示词</h3>
        <p>${escapeHtml(videoPromptPack.workflowPosition || "")}</p>
        <p>保存位置：${escapeHtml(videoPromptPack.outputPath || "")}</p>
        ${(videoPromptPack.generationMode || []).length ? `<ul>${videoPromptPack.generationMode.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        ${(videoPromptPack.globalLocks || []).length ? `
          <div class="item">
            <div class="item-title">全局锁定词</div>
            <pre>${escapeHtml((videoPromptPack.globalLocks || []).join("\n\n"))}</pre>
          </div>
        ` : ""}
        ${(videoPromptPack.negativeConstraints || []).length ? `
          <div class="item">
            <div class="item-title">通用负面词</div>
            <pre>${escapeHtml((videoPromptPack.negativeConstraints || []).join("\n"))}</pre>
          </div>
        ` : ""}
        ${videoPromptPack.masterPrompt ? `
          <div class="item">
            <div class="item-title">一次性 15 秒总提示词</div>
            <pre>${escapeHtml(videoPromptPack.masterPrompt)}</pre>
          </div>
        ` : ""}
        ${(videoPromptPack.shotPrompts || []).length ? `
          <div class="item">
            <div class="item-title">分镜提示词</div>
            ${(videoPromptPack.shotPrompts || []).map((shot) => `
              <div class="item">
                <div class="item-title">${escapeHtml(`${shot.id || ""} / ${shot.duration || ""} / ${shot.title || ""}`)}</div>
                <pre>${escapeHtml(shot.prompt || "")}</pre>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </article>
    ` : ""}
    ${tags.length ? `
      <article class="literature-block">
        <h3>标签</h3>
        <p>${tags.map((item) => `<span class="soft-pill">${escapeHtml(item)}</span>`).join(" ")}</p>
      </article>
    ` : ""}
  `;
}

function renderGenericPlan(container, statusNode, payload = null, label = "已生成") {
  if (!container || !statusNode) return;
  if (!payload) {
    container.classList.add("empty");
    container.textContent = "暂无结果。";
    statusNode.textContent = "等待生成。";
    return;
  }
  container.classList.remove("empty");
  statusNode.textContent = label;
  const json = JSON.stringify(payload, null, 2);
  container.innerHTML = `
    <article class="literature-block">
      <h3>摘要</h3>
      <p>${escapeHtml(payload.standard || payload.project?.standard || "creator-plan")}</p>
      ${payload.project?.projectPath ? `<p>项目目录：${escapeHtml(payload.project.projectPath)}</p>` : ""}
      ${payload.packageRoot ? `<p>打包目录：${escapeHtml(payload.packageRoot)}</p>` : ""}
    </article>
    ${payload.searchUrls?.length ? `
      <article class="literature-block">
        <h3>浏览器入口</h3>
        <div class="reference-links">
          ${payload.searchUrls.map((item) => `
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.platform)}：${escapeHtml(item.label)}</a>
          `).join("")}
        </div>
      </article>
    ` : ""}
    ${payload.sources?.length ? `
      <article class="literature-block">
        <h3>参考来源</h3>
        ${payload.sources.map((source) => `
          <div class="item">
            <div class="item-title">${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title)}</a>` : escapeHtml(source.title)}</div>
            <div class="item-meta">${escapeHtml(source.category || "")} / ${escapeHtml((source.useFor || []).join("、"))}</div>
            <div class="item-body">${escapeHtml(source.note || (source.extraction || []).join("、") || "")}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${payload.inventory ? renderInventoryHtml(payload.inventory) : ""}
    ${payload.categories ? renderInventoryHtml(payload) : ""}
    ${payload.pipeline?.length ? `
      <article class="literature-block">
        <h3>制作流程</h3>
        ${payload.pipeline.map((stage) => `
          <div class="item">
            <div class="item-title">${escapeHtml(stage.title)}</div>
            <div class="item-meta">${escapeHtml(stage.output || "")}</div>
            <div class="item-body">${escapeHtml(stage.note || "")}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${payload.splitRules?.length ? `
      <article class="literature-block">
        <h3>拆图规则</h3>
        <ul>${payload.splitRules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${payload.restoreSteps?.length ? `
      <article class="literature-block">
        <h3>迁移步骤</h3>
        <ol>${payload.restoreSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
    ` : ""}
    ${payload.aestheticSeeds ? `
      <article class="literature-block">
        <h3>审美种子库</h3>
        <p>经典电影：${escapeHtml((payload.aestheticSeeds.classicFilms || []).slice(0, 8).map((item) => item.title).join("、"))}</p>
        <p>动画/动漫：${escapeHtml((payload.aestheticSeeds.animations || []).slice(0, 8).map((item) => item.title).join("、"))}</p>
        <p>导演风格：${escapeHtml((payload.aestheticSeeds.directors || []).slice(0, 8).map((item) => item.name).join("、"))}</p>
      </article>
    ` : ""}
    ${payload.image2ReadyGate ? `
      <article class="literature-block">
        <h3>image-2 生成门槛</h3>
        <p>${payload.image2ReadyGate.canGenerate ? "可以进入生成。" : "还需要补齐素材锁。"}</p>
        <ul>${(payload.image2ReadyGate.blockingReasons || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    <details class="literature-block">
      <summary>查看完整数据</summary>
      <pre>${escapeHtml(json)}</pre>
    </details>
  `;
}

function renderPipelinePlan(payload = null, label = "已生成") {
  if (!pipelineResult || !pipelineStatus) return;
  if (!payload) {
    pipelineResult.classList.add("empty");
    pipelineResult.textContent = "暂无智能管线结果。";
    pipelineStatus.textContent = "等待生成。";
    return;
  }
  if (payload.board && Object.keys(payload).length === 1) {
    renderPipelinePlan(payload.board, label);
    return;
  }
  pipelineResult.classList.remove("empty");
  pipelineStatus.textContent = label;
  const prompt = payload.refinedPrompt?.image2Prompt || payload.promptPlan?.refinedPrompt?.image2Prompt || payload.generationPrompt || "";
  const gate = payload.image2ReadyGate || payload.promptPlan?.image2ReadyGate || null;
  const routeEstimates = payload.routeEstimates || payload.costEstimate?.routeEstimates || [];
  const shotBudget = payload.shotBudget || payload.costEstimate?.shotBudget || null;
  const boardDecision = payload.boardDecision || payload.visualCheck?.boardDecision || null;
  const reportFiles = payload.reportFiles || payload.visualCheck?.reportFiles || null;
  const budgetStopRules = payload.budgetStopRules || payload.costEstimate?.budgetStopRules || [];
  const pipeline = payload.pipeline || [];
  const routingPlan = payload.routingPlan || payload.creativeSuite?.routingPlan || [];
  const suitePlugins = payload.suite?.plugins || payload.creativeSuite?.suite?.plugins || [];
  const checklist = payload.checklist || payload.visualCheck?.checklist || payload.selfCheck || [];
  const knowledgeNeeds = payload.knowledgeNeeds || [];
  const referencePack = payload.realWorldReferencePack || payload.promptPlan?.realWorldReferencePack || payload.referencePlan?.realWorldReferencePack || null;
  const referenceImageTask = payload.standard === "creator-reference-image-generation-v1" ? payload : null;
  const imageGenerationTask = /^creator-image-generation-task-v\d+$/.test(payload.standard || "") ? payload : null;
  const imageDiagnostics = /^creator-image-generation-diagnostics-v\d+$/.test(payload.standard || "") ? payload : null;
  const nativeImageTask = payload.standard === "creator-codex-native-image-task-v1" ? payload : null;
  const nativeImageImport = payload.standard === "creator-codex-native-image-import-v1" ? payload : null;
  const visualBible = payload.standard === "creator-visual-bible-bundle-v1" ? payload : null;
  const visualQaDiagnostics = payload.standard === "creator-visual-qa-diagnostics-v2" ? payload : null;
  const promptV2 = payload.refinedPrompt?.promptV2 || payload.promptV2 || payload.promptPlan?.refinedPrompt?.promptV2 || null;
  const visualQaV2 = payload.visualQaV2 || payload.visualCheck?.visualQaV2 || nativeImageImport?.visualCheck?.visualQaV2 || null;
  const importedImagePath = nativeImageImport?.imported?.outputPath || "";
  if (nativeImageTask?.handoff?.instruction) {
    latestCodexNativeHandoff = nativeImageTask.handoff.instruction;
    if (pipelineNativeImageCopyButton) pipelineNativeImageCopyButton.disabled = false;
  }
  const json = JSON.stringify(payload, null, 2);
  pipelineResult.innerHTML = `
    <article class="literature-block">
      <h3>摘要</h3>
      <p>${escapeHtml(payload.standard || "creator-pipeline")}</p>
      ${payload.targetDurationSec ? `<p>目标时长：${escapeHtml(payload.targetDurationSec)} 秒</p>` : ""}
      ${payload.plannedShotCount || payload.shotCount ? `<p>镜头规划：${escapeHtml(payload.plannedShotCount || payload.shotCount)} 镜头</p>` : ""}
      ${payload.budgetCny ? `<p>预算：${escapeHtml(payload.budgetCny)} RMB</p>` : ""}
    </article>
    ${prompt ? `
      <article class="literature-block">
        <h3>单帧 image-2 提示词</h3>
        <pre>${escapeHtml(prompt)}</pre>
      </article>
    ` : ""}
    ${promptV2 ? `
      <article class="literature-block">
        <h3>Prompt V2 完整性</h3>
        <p><strong>${escapeHtml(promptV2.completeness?.score ?? 0)} / 100</strong>；正式生成：${promptV2.completeness?.canFinal ? "通过" : "未通过"}</p>
        ${(promptV2.completeness?.missing || []).length ? `<ul>${promptV2.completeness.missing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        <p>布光：${escapeHtml(promptV2.lighting?.setup || promptV2.lighting?.preset || "")}</p>
        <p>色彩：${escapeHtml([...(promptV2.colorBible?.base || []), ...(promptV2.colorBible?.accent || [])].join(" / "))}</p>
        <p>风格 DNA：${escapeHtml((promptV2.styleDna?.promptDescriptors || []).join("；"))}</p>
      </article>
    ` : ""}
    ${gate ? `
      <article class="literature-block">
        <h3>生成闸门</h3>
        <p>${gate.canGenerateFinal ? "可进入正式生成。" : "暂不建议进入正式生成，先补齐锁定条件。"}</p>
        ${(gate.blockingReasons || []).length ? `<ul>${gate.blockingReasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      </article>
    ` : ""}
    ${boardDecision ? `
      <article class="literature-block">
        <h3>分镜生产判定</h3>
        <p><strong>${escapeHtml(boardDecision.label || boardDecision.status)}</strong></p>
        <p>${escapeHtml(`image-2 草稿：${boardDecision.canEnterImage2 ? "可进入" : "不可进入"} / Seedance 草稿：${boardDecision.canEnterSeedanceDraft ? "可进入" : "不可进入"} / Seedance 正式：${boardDecision.canEnterSeedanceFinal ? "可进入" : "不可进入"}`)}</p>
        ${(boardDecision.mustFixBeforeFinal || []).length ? `<ul>${boardDecision.mustFixBeforeFinal.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      </article>
    ` : ""}
    ${reportFiles ? `
      <article class="literature-block">
        <h3>视觉检查报告</h3>
        <p>Markdown：${escapeHtml(reportFiles.markdownPath || "")}</p>
        <p>JSON：${escapeHtml(reportFiles.jsonPath || "")}</p>
        ${reportFiles.projectArchive ? `
          <p>项目归档 Markdown：${escapeHtml(reportFiles.projectArchive.markdownPath || "")}</p>
          <p>项目归档 JSON：${escapeHtml(reportFiles.projectArchive.jsonPath || "")}</p>
        ` : ""}
      </article>
    ` : ""}
    ${referenceImageTask ? `
      <article class="literature-block">
        <h3>图生图参考任务</h3>
        <p><strong>${escapeHtml(referenceImageTask.gate?.status || "unknown")}</strong></p>
        <p>参考模式：${escapeHtml(referenceImageTask.referenceMode || "")}</p>
        <p>任务目录：${escapeHtml(referenceImageTask.outputDir || "")}</p>
        <p>参考图：${escapeHtml(referenceImageTask.referenceImage?.imagePath || "")}</p>
        <p>Backend: ${escapeHtml(referenceImageTask.selectedBackend || "")}</p>
        <p>生成器：${escapeHtml(referenceImageTask.provider?.provider || "")} / ${escapeHtml(referenceImageTask.provider?.model || "")} / ${referenceImageTask.provider?.enabled ? "已配置" : "未配置"}</p>
        ${(referenceImageTask.gate?.blockers || []).length ? `<ul>${referenceImageTask.gate.blockers.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        ${referenceImageTask.output?.outputPath ? `<p>输出图：${escapeHtml(referenceImageTask.output.outputPath)}</p>` : ""}
        ${referenceImageTask.output?.promptId ? `<p>ComfyUI prompt_id: ${escapeHtml(referenceImageTask.output.promptId)}</p>` : ""}
        ${referenceImageTask.output?.resolvedWorkflowPath ? `<p>Resolved workflow: ${escapeHtml(referenceImageTask.output.resolvedWorkflowPath)}</p>` : ""}
        ${referenceImageTask.output?.outputs?.length ? `<ul>${referenceImageTask.output.outputs.map((item) => `<li>${escapeHtml(item.outputPath || item.filename || "")}</li>`).join("")}</ul>` : ""}
        ${referenceImageTask.output?.error ? `<p>Provider error: ${escapeHtml(referenceImageTask.output.error)}</p>` : ""}
        ${referenceImageTask.files ? `
          <p>任务 JSON：${escapeHtml(referenceImageTask.files.taskJson || "")}</p>
          <p>提示词：${escapeHtml(referenceImageTask.files.promptMd || "")}</p>
          <p>QA：${escapeHtml(referenceImageTask.files.qaMd || "")}</p>
        ` : ""}
      </article>
    ` : ""}
    ${imageGenerationTask ? `
      <article class="literature-block">
        <h3>gpt-image-2 文生图任务</h3>
        <p><strong>${escapeHtml(imageGenerationTask.gate?.status || "unknown")}</strong></p>
        <p>模型：${escapeHtml(imageGenerationTask.provider?.model || "gpt-image-2")}</p>
        <p>任务目录：${escapeHtml(imageGenerationTask.outputDir || "")}</p>
        <p>正式生成：${imageGenerationTask.qualityGate?.canGenerateFinal ? "已通过" : "未通过"} / 草稿：${imageGenerationTask.qualityGate?.canGenerateDraft ? "可用" : "不可用"}</p>
        ${(imageGenerationTask.gate?.blockers || []).length ? `<ul>${imageGenerationTask.gate.blockers.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        ${imageGenerationTask.output?.outputPath ? `
          <p>输出图：${escapeHtml(imageGenerationTask.output.outputPath)}</p>
          <img class="generated-image-preview" loading="lazy" src="/api/output-files?path=${encodeURIComponent(imageGenerationTask.output.outputPath)}" alt="gpt-image-2 生成结果">
        ` : ""}
        ${imageGenerationTask.output?.outputUrl && !imageGenerationTask.output?.outputPath ? `<p>临时输出链接：${escapeHtml(imageGenerationTask.output.outputUrl)}</p>` : ""}
        ${imageGenerationTask.output?.error ? `<p>Provider error: ${escapeHtml(imageGenerationTask.output.error)}</p>` : ""}
        ${imageGenerationTask.files ? `
          <p>任务 JSON：${escapeHtml(imageGenerationTask.files.taskJson || "")}</p>
          <p>提示词：${escapeHtml(imageGenerationTask.files.promptMd || "")}</p>
          <p>QA：${escapeHtml(imageGenerationTask.files.qaMd || "")}</p>
        ` : ""}
      </article>
    ` : ""}
    ${nativeImageTask ? `
      <article class="literature-block">
        <h3>Codex 原生 image-2 任务</h3>
        <p><strong>${escapeHtml(nativeImageTask.status || "waiting_codex_native_generation")}</strong></p>
        <p>任务目录：${escapeHtml(nativeImageTask.outputDir || "")}</p>
        <p>预期落盘：${escapeHtml(nativeImageTask.expectedOutput || "")}</p>
        <p>提示词文件：${escapeHtml(nativeImageTask.files?.promptMarkdown || "")}</p>
        <p><strong>显示要求：</strong>Codex 必须先把 image-2 结果直接显示在当前对话中；仅返回路径不算完成。</p>
        <p><strong>系统边界：</strong>网页工作台不能自行向当前 Codex 对话发送消息或图片。</p>
        <p>下一步：复制执行指令到 Codex 对话，显示生成图后填写同一图片的本地路径并点击“导入 Codex 图片”。</p>
      </article>
    ` : ""}
    ${nativeImageImport ? `
      <article class="literature-block">
        <h3>Codex 图片已落盘</h3>
        <p>版本：v${escapeHtml(String(nativeImageImport.imported?.version || 1).padStart(3, "0"))}</p>
        <p>SHA-256：${escapeHtml(nativeImageImport.imported?.sha256 || "")}</p>
        <p>对话展示：${nativeImageImport.imported?.conversationPresentation?.displayedByBuiltInTool ? "已确认" : "仍需在 Codex 当前对话中显示"}</p>
        <p>输出图：${escapeHtml(importedImagePath)}</p>
        ${importedImagePath ? `<img class="generated-image-preview" loading="lazy" src="/api/output-files?path=${encodeURIComponent(importedImagePath)}" alt="Codex 原生 image-2 落盘结果">` : ""}
        <p>${escapeHtml(nativeImageImport.nextAction || "")}</p>
      </article>
    ` : ""}
    ${visualBible ? `
      <article class="literature-block">
        <h3>视觉圣经</h3>
        <p>色彩：${escapeHtml([...(visualBible.colorBible?.base || []), ...(visualBible.colorBible?.secondary || []), ...(visualBible.colorBible?.accent || [])].join(" / "))}</p>
        <p>风格 DNA：${escapeHtml((visualBible.styleDna?.promptDescriptors || []).join("；"))}</p>
        <p>世界观可视化：${escapeHtml(visualBible.worldVisualBible?.causalityRule || "")}</p>
        ${visualBible.files ? `<p>保存目录：${escapeHtml(visualBible.files.root || Object.values(visualBible.files)[0] || "")}</p>` : ""}
      </article>
    ` : ""}
    ${visualQaV2 ? `
      <article class="literature-block">
        <h3>视觉 QA V2</h3>
        <p><strong>${escapeHtml(visualQaV2.gate?.status || "")}</strong>；综合评分：${escapeHtml(visualQaV2.overallScore ?? "待真实图片复核")}</p>
        <p>真实图片已检查：${visualQaV2.actualImageReviewed ? "是" : "否"}；Seedance 正式：${visualQaV2.gate?.canEnterSeedanceFinal ? "允许" : "阻止"}</p>
        ${(visualQaV2.findings || []).length ? `<ul>${visualQaV2.findings.map((item) => `<li>${escapeHtml(`${item.severity} / ${item.dimension} / ${item.location}：${item.issue}`)}</li>`).join("")}</ul>` : ""}
      </article>
    ` : ""}
    ${visualQaDiagnostics ? `
      <article class="literature-block">
        <h3>视觉 QA 能力诊断</h3>
        <p>Codex 真实图片复核：${visualQaDiagnostics.codexVisualReviewReady ? "就绪" : "未就绪"}</p>
        <p>可选本地视觉侧车：${visualQaDiagnostics.optionalSidecar?.configured ? "已配置" : "未配置（不影响 Codex 复核）"}</p>
        <p>${escapeHtml(visualQaDiagnostics.optionalSidecar?.rule || "")}</p>
        <ul>${(visualQaDiagnostics.adapters || []).map((item) => `<li>${escapeHtml(`${item.name || item.id}：${item.status}`)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${imageDiagnostics ? `
      <article class="literature-block">
        <h3>图像后端诊断</h3>
        <p>${escapeHtml(imageDiagnostics.recommendation || "")}</p>
        <div class="item">
          <div class="item-title">OpenAI Images</div>
          <div class="item-body">${escapeHtml(`模型：${imageDiagnostics.openai?.model || ""}\n状态：${imageDiagnostics.openai?.enabled ? "已配置" : "未配置"}\n文生图：${imageDiagnostics.openai?.canGenerateText ? "就绪" : "未就绪"}\n参考图编辑：${imageDiagnostics.openai?.canEditReference ? "就绪" : "未就绪"}\n缺失：${(imageDiagnostics.openai?.missing || []).join("、") || "无"}\nBase URL：${imageDiagnostics.openai?.baseUrl || ""}`)}</div>
        </div>
        <div class="item">
          <div class="item-title">ComfyUI / ControlNet</div>
          <div class="item-body">${escapeHtml(`地址：${imageDiagnostics.comfyui?.baseUrl || ""}\n开关：${imageDiagnostics.comfyui?.enabled ? "已启用" : "未启用"}\n在线：${imageDiagnostics.comfyui?.reachable ? "是" : "否"}\nWorkflow：${imageDiagnostics.comfyui?.workflowPath || "未配置"}\n错误：${imageDiagnostics.comfyui?.error || "无"}`)}</div>
        </div>
      </article>
    ` : ""}
    ${routeEstimates.length ? `
      <article class="literature-block">
        <h3>Seedance 成本估算</h3>
        ${routeEstimates.map((route) => `
          <div class="item">
            <div class="item-title">${escapeHtml(route.label)} / ${escapeHtml(route.provider)}</div>
            <div class="item-meta">${escapeHtml(route.estimate?.budgetStatus || "no_budget_set")}</div>
            <div class="item-body">${escapeHtml(`单价：$${route.pricePerSecondUsd}/秒\n草稿：$${route.estimate?.draftUsd}，正式：$${route.estimate?.finalUsd}，合计：$${route.estimate?.totalUsd} / 约 ${route.estimate?.totalCny} RMB\n适用：${route.bestFor || ""}`)}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${shotBudget?.draftRoute?.rows?.length ? `
      <article class="literature-block">
        <h3>镜头级预算表</h3>
        <div class="budget-table">
          <div class="budget-row budget-head">
            <span>镜头</span><span>时长</span><span>草稿</span><span>正式</span><span>合计 RMB</span>
          </div>
          ${shotBudget.draftRoute.rows.map((row, index) => {
            const formal = shotBudget.formalRoute?.rows?.[index] || {};
            return `
              <div class="budget-row">
                <span>${escapeHtml(row.title || row.id)}</span>
                <span>${escapeHtml(row.durationSec)}s</span>
                <span>$${escapeHtml(row.totalUsd)}</span>
                <span>$${escapeHtml(formal.totalUsd ?? "")}</span>
                <span>${escapeHtml(formal.totalCny ?? row.totalCny)}</span>
              </div>
            `;
          }).join("")}
        </div>
        ${budgetStopRules.length ? `<ul>${budgetStopRules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      </article>
    ` : ""}
    ${pipeline.length ? `
      <article class="literature-block">
        <h3>自动执行管线</h3>
        ${pipeline.map((stage) => `
          <div class="item">
            <div class="item-title">${escapeHtml(stage.title)}</div>
            <div class="item-meta">${escapeHtml(stage.endpoint || "")} / ${escapeHtml(stage.autoLevel || "")}</div>
            ${(stage.actions || []).length ? `<ul>${stage.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
            ${stage.output ? `<div class="item-body">${escapeHtml(stage.output)}</div>` : ""}
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${routingPlan.length ? `
      <article class="literature-block">
        <h3>创作插件调度</h3>
        ${routingPlan.map((stage) => `
          <div class="item">
            <div class="item-title">${escapeHtml(stage.stage)} / ${escapeHtml(stage.plugin)}</div>
            <div class="item-body">${escapeHtml(stage.action || "")}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${suitePlugins.length ? `
      <article class="literature-block">
        <h3>插件安装状态</h3>
        ${suitePlugins.map((plugin) => `
          <div class="item">
            <div class="item-title">${escapeHtml(plugin.label || plugin.id)} / ${plugin.installed ? "installed" : "missing"}</div>
            <div class="item-meta">${escapeHtml(`${plugin.id}@${plugin.scope} ${plugin.latestCacheVersion || ""}`)}</div>
            <div class="item-body">${escapeHtml(plugin.role || plugin.workbenchUse || "")}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${checklist.length ? `
      <article class="literature-block">
        <h3>分镜图视觉检查</h3>
        ${checklist.map((item) => `
          <div class="item">
            <div class="item-title">${escapeHtml(item.label || item.id)}</div>
            <div class="item-body">${escapeHtml(`${item.test || ""}\n通过条件：${item.passCondition || "可被肉眼明确验证。"}\n修复路线：${item.repairRoute || ""}`)}</div>
          </div>
        `).join("")}
      </article>
    ` : ""}
    ${knowledgeNeeds.length ? `
      <article class="literature-block">
        <h3>浏览器优先研究</h3>
        <ul>${knowledgeNeeds.map((item) => `<li>${escapeHtml(`${item.label}：${item.focus} -> ${item.stagingPath}`)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${referencePack?.persisted ? `
      <article class="literature-block">
        <h3>外部参考暂存包</h3>
        <p>${escapeHtml(referencePack.pack?.label || referencePack.query || "")}</p>
        <p>目录：${escapeHtml(referencePack.persisted.directory || "")}</p>
        <ul>
          <li>${escapeHtml(referencePack.persisted.referencePackJson || "")}</li>
          <li>${escapeHtml(referencePack.persisted.sourceLinksMd || "")}</li>
          <li>${escapeHtml(referencePack.persisted.visualTraitsMd || "")}</li>
          <li>${escapeHtml(referencePack.persisted.visualQaMd || "")}</li>
        </ul>
      </article>
    ` : ""}
    ${payload.nextActions?.length ? `
      <article class="literature-block">
        <h3>下一步</h3>
        <ol>${payload.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
      </article>
    ` : ""}
    <details class="literature-block">
      <summary>查看完整数据</summary>
      <pre>${escapeHtml(json)}</pre>
    </details>
  `;
}

function renderProjectStatus(payload = null) {
  if (!projectStatusText || !projectStatusResult) return;
  const items = payload?.items || [];
  if (!payload) {
    projectStatusText.textContent = "等待扫描。";
    projectStatusResult.classList.add("empty");
    projectStatusResult.textContent = "暂无项目状态。";
    return;
  }
  projectStatusResult.classList.remove("empty");
  projectStatusText.textContent = items.length ? `已扫描 ${items.length} 个项目` : "暂无项目";
  if (!items.length) {
    projectStatusResult.innerHTML = `<div class="item empty">还没有项目。可以先在左侧“项目制生产”中新建项目。</div>`;
    return;
  }
  currentProjectStatusItems = items;
  projectStatusResult.innerHTML = `
    ${items.slice(0, 8).map((project) => `
      <article class="literature-block project-status-card">
        <h3>${escapeHtml(project.title)}</h3>
        <div class="item-meta">${escapeHtml(project.slug)} / ${escapeHtml(project.projectPath)}</div>
        <div class="progress-line">
          <span class="progress-bar"><span style="width:${Math.max(0, Math.min(100, Number(project.summary?.score || 0)))}%"></span></span>
          <strong>${escapeHtml(project.summary?.score ?? 0)}%</strong>
        </div>
        <div class="stage-grid">
          ${(project.stages || []).map((stage) => `
            <span class="stage-pill ${escapeHtml(stage.status)}">${escapeHtml(stage.label)}：${escapeHtml(stage.status)}</span>
          `).join("")}
        </div>
        ${project.visualQa ? `
          <div class="item">
            <div class="item-title">视觉 QA 档案</div>
            <div class="item-body">${escapeHtml(`总报告：${project.visualQa.total ?? 0} / 阻断：${project.visualQa.blocked ?? 0} / 需修：${project.visualQa.repairRequired ?? 0} / 可进草稿：${project.visualQa.seedanceDraftReady ?? 0} / 可进成片：${project.visualQa.seedanceFinalReady ?? 0}`)}</div>
            <div class="visual-badges">
              ${Object.entries(project.visualQa.byCategory || {}).map(([key, value]) => `
                <span class="soft-pill">${escapeHtml(project.visualQa.categoryLabels?.[key] || key)}：${escapeHtml(value)}</span>
              `).join("")}
            </div>
            ${project.visualQa.latest ? `
              <div class="item-meta">${escapeHtml(`最近：${project.visualQa.latest.categoryLabel || ""} / ${project.visualQa.latest.label || project.visualQa.latest.status || "未判定"} / ${project.visualQa.latest.relPath || ""}`)}</div>
            ` : `<div class="item-meta">还没有视觉检查报告。</div>`}
          </div>
        ` : ""}
        ${project.continuation ? `
          <div class="item">
            <div class="item-title">继续制作</div>
            <div class="item-body">${escapeHtml(`当前阶段：${project.continuation.currentStage?.label || "未判定"} / ${project.continuation.currentStage?.status || ""}\n推荐动作：${project.continuation.recommendedAction?.label || ""}\n调用接口：${project.continuation.recommendedAction?.endpoint || ""}\n提示：${project.continuation.recommendedAction?.payloadHint || ""}`)}</div>
            <div class="button-row">
              <button class="continue-project-button" type="button" data-project-slug="${escapeHtml(project.slug)}">继续当前项目</button>
            </div>
          </div>
        ` : ""}
        ${project.assetSummary ? `
          <div class="item">
            <div class="item-title">资产概况</div>
            <div class="item-body">${escapeHtml(`已有：${project.assetSummary.existing ?? 0} / 缺失：${project.assetSummary.missing ?? 0} / 外部参考：${project.assetSummary.externalNeeds ?? 0}`)}</div>
          </div>
        ` : ""}
        ${(project.nextActions || []).length ? `
          <div class="item">
            <div class="item-title">下一步</div>
            <ol>${project.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
          </div>
        ` : ""}
      </article>
    `).join("")}
  `;
}

function renderInventoryHtml(inventory) {
  const categories = inventory.categories || [];
  return `
    <article class="literature-block">
      <h3>美术资源清单</h3>
      <p>已有 ${escapeHtml(inventory.summary?.existing ?? 0)} 项，待补 ${escapeHtml(inventory.summary?.missing ?? 0)} 项，外部参考缺口 ${escapeHtml(inventory.summary?.externalNeeds ?? 0)} 项。</p>
      ${categories.map((category) => `
        <div class="item">
          <div class="item-title">${escapeHtml(category.label)} / ${escapeHtml(category.status)}</div>
          <div class="item-meta">${escapeHtml(category.role || "")}</div>
          ${(category.existing || []).length ? `
            <div class="item-body">${escapeHtml((category.existing || []).slice(0, 5).map((asset) => `${asset.title} / ${asset.rel_path}`).join("\n"))}</div>
          ` : ""}
          ${(category.missingTasks || []).length ? `
            <ul>${category.missingTasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ul>
          ` : ""}
        </div>
      `).join("")}
      ${(inventory.externalNeeds || []).length ? `
        <h4>外部参考待处理</h4>
        <ul>${inventory.externalNeeds.map((need) => `<li>${escapeHtml(`${need.label}：${need.stagingPath}`)}</li>`).join("")}</ul>
      ` : ""}
    </article>
  `;
}

function renderStoryboardBoard(board = null) {
  if (!boardResult || !boardStatus) return;
  if (!board) {
    boardResult.classList.add("empty");
    boardResult.textContent = "暂无故事板总图方案。";
    boardStatus.textContent = "等待分镜项目。";
    return;
  }
  boardResult.classList.remove("empty");
  boardStatus.textContent = `${board.canvas?.aspectRatio || "16:9"} / ${board.dramaScale?.label || "故事板"}${board.dramaScale?.totalDurationSec ? ` / ${board.dramaScale.totalDurationSec}s` : ""}`;
  boardResult.innerHTML = `
    ${board.dramaScale ? `
      <article class="literature-block">
        <h3>时长与镜头编排</h3>
        <p>${escapeHtml(`${board.dramaScale.label || ""} / ${board.dramaScale.totalDurationSec || ""}s`)}</p>
        <p>${escapeHtml(board.dramaScale.rhythm || "")}</p>
      </article>
    ` : ""}
    ${board.concreteFramePack ? `
      <article class="literature-block">
        <h3>镜头调度草图</h3>
        <p>${escapeHtml(board.concreteFramePack.usage?.purpose || "")}</p>
        <p>${escapeHtml(board.concreteFramePack.usage?.workflowPosition || "")}</p>
      </article>
    ` : ""}
    ${board.illustrationPack ? `
      <article class="literature-block">
        <h3>关键情景插图式分镜</h3>
        <p>${escapeHtml(board.illustrationPack.workflowPosition || "")}</p>
        <p>${escapeHtml(board.illustrationPack.referenceStyle?.layoutRule || "")}</p>
        <ul>${(board.illustrationPack.referenceStyle?.analysis || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </article>
    ` : ""}
    ${board.image2Plan ? `
      <article class="literature-block">
        <h3>image-2 连续分镜</h3>
        <p>${escapeHtml(board.image2Plan.workflowPosition || "")}</p>
        <ul>${(board.image2Plan.passOrder || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        ${(board.image2Plan.identityLocks?.characters || []).length ? `
          <h4>角色身份锁</h4>
          ${(board.image2Plan.identityLocks.characters || []).map((character) => {
            const refs = board.image2Plan.identityLocks.locks?.[character] || [];
            return `
              <div class="item">
                <div class="item-title">${escapeHtml(character)}</div>
                <div class="item-body">${escapeHtml(refs.length ? refs.map((ref) => `${ref.title} / ${ref.absPath || ref.path}`).join("\n") : "缺失身份参考，需先补角色设计图。")}</div>
              </div>
            `;
          }).join("")}
        ` : ""}
        ${(board.image2Plan.propLocks?.required || []).length ? `
          <h4>道具锁</h4>
          ${(board.image2Plan.propLocks.required || []).map((item) => `
            <div class="item">
              <div class="item-title">${escapeHtml(item.name)} / ${escapeHtml(item.status)}</div>
              <div class="item-body">${escapeHtml(`${item.spec}\n${(item.matchedRefs || []).map((ref) => ref.absPath || ref.path).join("\n") || "缺本地参考，需先补道具设计。"}`)}</div>
            </div>
          `).join("")}
        ` : ""}
        ${(board.image2Plan.sceneLocks?.required || []).length ? `
          <h4>场景锁</h4>
          ${(board.image2Plan.sceneLocks.required || []).map((item) => `
            <div class="item">
              <div class="item-title">${escapeHtml(item.name)} / ${escapeHtml(item.status)}</div>
              <div class="item-body">${escapeHtml(`${item.spec}\n${(item.matchedRefs || []).map((ref) => ref.absPath || ref.path).join("\n") || "缺本地参考，需先补场景/平面图设计。"}`)}</div>
            </div>
          `).join("")}
        ` : ""}
        ${(board.image2Plan.detailAudit?.perFrame || []).length ? `
          <h4>细节核查</h4>
          <ul>${(board.image2Plan.detailAudit.perFrame || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        ` : ""}
        ${(board.image2Plan.singleFrameAudit?.globalRules || []).length ? `
          <h4>单图自检</h4>
          <ul>${(board.image2Plan.singleFrameAudit.globalRules || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        ` : ""}
        <p>统一故事板：${escapeHtml(board.image2Plan.unifiedBoard?.outputPlan?.filePath || "")}</p>
        <p>必含栏目：${(board.image2Plan.unifiedBoard?.requiredSections || []).map((item) => `<span class="soft-pill">${escapeHtml(item)}</span>`).join(" ")}</p>
      </article>
    ` : ""}
    <article class="literature-block">
      <h3>单张总图提示词</h3>
      <pre>${escapeHtml(board.boardPrompt || "")}</pre>
    </article>
    <article class="literature-block">
      <h3>镜头与摄像机</h3>
      <ul>${(board.cameraTable || []).map((item) => `<li>S${escapeHtml(item.shot)}：${escapeHtml(item.durationSec)}s / ${escapeHtml(item.lens)} / ${escapeHtml(item.movement)} / ${escapeHtml(item.axis)}</li>`).join("")}</ul>
    </article>
    <article class="literature-block">
      <h3>缺失资产任务</h3>
      ${(board.missingDesignTasks || []).length ? (board.missingDesignTasks || []).map((item) => `
        <div class="item">
          <div class="item-title">${escapeHtml(item.title)}</div>
          <div class="item-body">${escapeHtml(`${item.reason}\n${item.output}`)}</div>
        </div>
      `).join("") : "<p>暂无明显缺失资产任务。</p>"}
    </article>
    <article class="literature-block">
      <h3>逻辑复核</h3>
      <ul>${(board.logicChecklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
  `;
}

function renderStoryboard(project, meta = {}) {
  const shots = project?.shots || [];
  currentStoryboardProjectId = project?.id || null;
  copyPromptPackButton.disabled = !currentStoryboardProjectId;
  downloadPromptsButton.disabled = !currentStoryboardProjectId;
  if (downloadFramesButton) downloadFramesButton.disabled = !currentStoryboardProjectId;
  if (downloadIllustrationsButton) downloadIllustrationsButton.disabled = !currentStoryboardProjectId;
  if (downloadImage2PlanButton) downloadImage2PlanButton.disabled = !currentStoryboardProjectId;
  if (downloadAuditButton) downloadAuditButton.disabled = !currentStoryboardProjectId;
  if (downloadBoardButton) downloadBoardButton.disabled = !currentStoryboardProjectId;
  if (!shots.length) {
    storyboardStatus.textContent = "尚未生成。";
    storyboardList.innerHTML = `<div class="item empty">暂无镜头。</div>`;
    return;
  }

  const mode = meta.llmUsed ? "大模型优化" : "本地草稿";
  const totalDuration = project.director?.timingPlan?.totalDurationSec || project.director?.targetDurationSec;
  const timingByIndex = new Map((project.director?.timingPlan?.shots || []).map((item) => [Number(item.index), item]));
  storyboardStatus.textContent = `项目 #${project.id}，${shots.length} 个镜头${totalDuration ? `，${totalDuration}s` : ""}，${mode}`;
  storyboardList.innerHTML = shots.map((shot) => `
    <article class="shot-card">
      <div class="shot-heading">镜头 ${escapeHtml(shot.shot_index)}：${escapeHtml(shot.scene_text)}</div>
      ${currentStoryboardProjectId ? `
        <a class="frame-preview-link" href="/api/storyboards/${escapeHtml(currentStoryboardProjectId)}/frames/${escapeHtml(shot.shot_index)}.svg" target="_blank" rel="noopener">
          <img class="frame-preview" loading="lazy" src="/api/storyboards/${escapeHtml(currentStoryboardProjectId)}/frames/${escapeHtml(shot.shot_index)}.svg" alt="镜头 ${escapeHtml(shot.shot_index)} 具体分镜图">
        </a>
      ` : ""}
      <div class="shot-meta">
        ${escapeHtml(shot.camera || "未指定机位")} / ${escapeHtml(shot.composition || "未指定构图")}
      </div>
      ${timingByIndex.get(Number(shot.shot_index)) ? `
        <div class="shot-meta">
          时间：${escapeHtml(timingByIndex.get(Number(shot.shot_index)).startSec ?? "?")}-${escapeHtml(timingByIndex.get(Number(shot.shot_index)).endSec ?? "?")}s / ${escapeHtml(timingByIndex.get(Number(shot.shot_index)).durationSec || "?")}s / ${escapeHtml(timingByIndex.get(Number(shot.shot_index)).role || "叙事推进")}
        </div>
      ` : ""}
      <div class="shot-body">${escapeHtml(shot.character_action || "")}</div>
      <div class="prompt-box">${escapeHtml(shot.visual_prompt || "")}</div>
      ${currentStoryboardProjectId ? `
        <div class="shot-hint">
          调度草图用于锁定站位和轴线；正式分镜先用“情景插图包”确定画面，再用“image-2连续分镜”生成成片分镜和统一故事板。
        </div>
      ` : ""}
      <div class="shot-toolbar">
        <button class="copy-prompt" type="button" data-prompt="${escapeHtml(shot.visual_prompt || "")}">复制绘图提示词</button>
      </div>
    </article>
  `).join("");
}

function formatDate(value) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function renderProjects(items = []) {
  projectList.innerHTML = items.length ? items.map((project) => `
    <article class="project-item">
      <div>
        <div class="project-title">${escapeHtml(project.title)}</div>
        <div class="project-meta">
          #${escapeHtml(project.id)} / ${escapeHtml(project.shot_count)} 个镜头 / ${project.llm_used ? "大模型优化" : "本地草稿"} / ${escapeHtml(formatDate(project.updated_at))}
        </div>
      </div>
      <button class="open-project" type="button" data-project-id="${escapeHtml(project.id)}">打开</button>
    </article>
  `).join("") : `<div class="item empty">暂无历史分镜。</div>`;
}

function renderProposalDetail(proposal) {
  currentProposalId = proposal?.id || null;
  if (!proposal) {
    proposalDetail.classList.add("empty");
    proposalDetail.textContent = "暂无提案。";
    return;
  }
  proposalDetail.classList.remove("empty");
  const details = JSON.stringify(proposal.proposed_details || {}, null, 2);
  proposalDetail.innerHTML = `
    <div><strong>#${escapeHtml(proposal.id)} ${escapeHtml(proposal.proposal_title)}</strong></div>
    <div class="project-meta">${escapeHtml(proposal.target_name)} / ${escapeHtml(proposal.status)} / ${escapeHtml(formatDate(proposal.updated_at))}</div>
    <p>${escapeHtml(proposal.rationale || "")}</p>
    <p><strong>建议摘要：</strong>${escapeHtml(proposal.proposed_summary || "")}</p>
    <div><strong>建议 details：</strong></div>
    <pre>${escapeHtml(details)}</pre>
    <div class="proposal-actions">
      <button id="applyCurrentProposalButton" type="button" ${proposal.status === "applied" ? "disabled" : ""}>应用到实体库</button>
    </div>
  `;
}

function renderProposals(items = []) {
  proposalList.innerHTML = items.length ? items.map((proposal) => `
    <article class="proposal-item">
      <div>
        <div class="project-title">${escapeHtml(proposal.proposal_title)}</div>
        <div class="project-meta">
          #${escapeHtml(proposal.id)} / ${escapeHtml(proposal.target_name)} / ${escapeHtml(proposal.status)} / ${escapeHtml(formatDate(proposal.updated_at))}
        </div>
      </div>
      <button class="open-proposal" type="button" data-proposal-id="${escapeHtml(proposal.id)}">查看</button>
    </article>
  `).join("") : `<div class="item empty">暂无设定提案。</div>`;
}

async function loadRuntime() {
  const [config, stats, llmDiagnostics] = await Promise.all([
    getJson("/api/config"),
    getJson("/api/stats"),
    getJson("/api/llm/diagnostics").catch(() => null)
  ]);
  if (llmDiagnostics) {
    config.llm = {
      ...(config.llm || {}),
      ...llmDiagnostics,
      capabilities: (llmDiagnostics.capabilityMatrix || []).map((item) => `${item.label}：${item.status}`)
    };
  }
  if (config.edition === "generic") {
    document.body.classList.add("generic-edition");
    document.title = "全流程创作超级智能体";
    if (appTitle) appTitle.textContent = "全流程创作超级智能体";
    if (storyStyle && /当前项目|战术美少女/.test(storyStyle.value)) {
      storyStyle.value = "当前原创项目统一画风，电影感动画制作质量，角色表演清楚，光影和镜头连续";
    }
    const genericPlaceholders = [
      [questionInput, "例如：当前项目的主角设定是什么？"],
      [visualQuery, "例如：主角身份参考 / 项目分镜"],
      [workflowTopic, "例如：原创角色15秒动画"],
      [pipelineTopicInput, "例如：雨夜相遇，做15秒手书分镜"],
      [postTopicInput, "例如：原创角色 AE 手书动画"],
      [storyTitle, "例如：原创短片分镜"]
    ];
    for (const [element, placeholder] of genericPlaceholders) {
      if (element) element.placeholder = placeholder;
    }
  } else {
    document.body.classList.remove("generic-edition");
    document.title = "当前项目 IP 数据库";
    if (appTitle) appTitle.textContent = "当前项目 IP 数据库";
  }
  runtimeStatus.textContent = `${config.edition === "generic" ? "项目资料区" : "资料源"}：${config.sourceRoot}；大模型：${config.llm.enabled ? `${config.llm.provider}/${config.llm.model}` : "未启用，当前为证据检索与本地分镜草稿模式"}`;
  renderLlmStatus(config);
  renderStats(stats);
}

async function refreshAll() {
  await Promise.all([loadRuntime(), loadAgentConsole(), loadSystemHealth(), loadCloudLibraryStatus(), loadEntities(), loadProjects(), loadProjectStatuses(), loadProposals()]);
}

async function runSearch(mode = "broad") {
  const q = questionInput.value.trim();
  if (!q) return;
  setAnswer(mode === "precise" ? "正在精确检索资料库..." : "正在检索资料库...");
  const result = await getJson(`/api/search?q=${encodeURIComponent(q)}&limit=10&mode=${encodeURIComponent(mode)}`);
  setAnswer(`${mode === "precise" ? "精确检索" : "检索"}完成。命中词：${(result.terms || []).join("、") || "无"}`);
  try {
    const card = await getJson(`/api/answer-card?q=${encodeURIComponent(q)}&limit=8&mode=${encodeURIComponent(mode)}&entityType=${encodeURIComponent(entityType.value || "")}`);
    renderAnswerCard(card);
    const cardChunks = (card.evidence || []).map((item) => ({
      id: item.id,
      title: item.title,
      rel_path: item.relPath,
      text: (item.keyPoints || []).join("\n"),
      brief: {
        claim: item.claim,
        keyPoints: item.keyPoints || [],
        confidence: item.confidence,
        evidenceTypeLabel: item.evidenceTypeLabel,
        cleanText: (item.keyPoints || []).join(" "),
        sourcePath: item.relPath
      }
    }));
    const cardAssets = (card.visualAssets?.items || []).map((asset) => ({
      id: asset.id,
      file_id: asset.fileId,
      title: asset.title,
      rel_path: asset.relPath,
      media_type: asset.mediaType
    }));
    const cardEntities = [
      card.primary,
      ...(card.secondaryEntities || [])
    ].filter(Boolean);
    renderEvidence({
      ...result,
      entities: cardEntities.length ? cardEntities : result.entities,
      chunks: cardChunks.length ? cardChunks : result.chunks,
      assets: cardAssets.length ? cardAssets : result.assets
    });
  } catch (error) {
    answerCardStatus.textContent = `首要结论生成失败：${error.message}`;
    renderEvidence(result);
  }
  if (visualQuery && !visualQuery.value.trim()) visualQuery.value = q;
}

async function runAsk() {
  const question = questionInput.value.trim();
  if (!question) return;
  setAnswer("正在整理证据并调用问答...");
  const result = await getJson("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, limit: 8 })
  });
  const llm = result.llm;
  if (llm?.answer) {
    setAnswer(llm.answer);
  } else if (llm?.error) {
    setAnswer(`大模型调用失败，已返回证据。\n${llm.error}`);
  } else {
    setAnswer("当前未启用大模型，已返回资料库证据。");
  }
  try {
    const card = await getJson(`/api/answer-card?q=${encodeURIComponent(question)}&limit=8&mode=precise`);
    renderAnswerCard(card);
  } catch (error) {
    answerCardStatus.textContent = `首要结论生成失败：${error.message}`;
  }
  renderEvidence(result.evidence);
}

async function generateStoryboard() {
  const script = storyScript.value.trim();
  if (!script) {
    storyboardStatus.textContent = "请先输入剧本片段。";
    return;
  }

  storyboardStatus.textContent = "正在检索设定并生成分镜...";
  generateStoryboardButton.disabled = true;
  try {
    const result = await getJson("/api/storyboards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: storyTitle.value.trim(),
        script,
        style: storyStyle.value.trim(),
        shotCount: Number(shotCount.value || 6),
        useLlm: useLlm.checked,
        director: getDirectorOptions()
      })
    });
    renderStoryboard(result.project, { llmUsed: result.llmUsed });
    renderEvidence(result.evidence);
    await loadStoryboardBoard(result.project?.id);
    await loadProjects();
    await loadProjectStatuses();
    if (result.llmError) {
      setAnswer(`分镜已生成，但大模型优化未成功，当前使用本地草稿。\n${result.llmError}`);
    } else {
      setAnswer(result.llmUsed ? "分镜已由大模型结合资料库证据优化。" : "分镜已生成。当前未启用大模型，使用本地草稿。");
    }
  } catch (error) {
    storyboardStatus.textContent = `生成失败：${error.message}`;
  } finally {
    generateStoryboardButton.disabled = false;
  }
}

async function loadProjects() {
  const result = await getJson("/api/storyboards?limit=20");
  renderProjects(result.items || []);
}

async function loadProjectStatuses() {
  try {
    const result = await getJson("/api/projects/status");
    renderProjectStatus(result);
  } catch (error) {
    projectStatusText.textContent = `项目状态扫描失败：${error.message}`;
  }
}

function fillProjectSeed(project) {
  const seed = project?.continuation?.projectPayloadSeed || {};
  const title = seed.title || project?.title || "";
  const intent = seed.intent || project?.intent || title;
  const script = seed.script || "";
  if (projectTitleInput) projectTitleInput.value = title;
  if (projectIntentInput) projectIntentInput.value = intent;
  if (projectScriptInput) projectScriptInput.value = script;
  if (workflowTopic) workflowTopic.value = title;
  if (workflowScript && script) workflowScript.value = script;
  if (pipelineTopicInput) pipelineTopicInput.value = title;
  if (pipelinePromptInput) pipelinePromptInput.value = intent || script || title;
  if (pipelineScriptInput && script) pipelineScriptInput.value = script;
  if (dramaturgyCharacters && (project.detectedCharacters || []).length) dramaturgyCharacters.value = project.detectedCharacters.join(" ");
  if (dramaturgyText && script) dramaturgyText.value = script;
  if (postTopicInput) postTopicInput.value = title;
}

async function continueProject(slug) {
  const project = currentProjectStatusItems.find((item) => item.slug === slug);
  if (!project) {
    projectStatusText.textContent = "未找到这个项目状态，请刷新后再试。";
    return;
  }
  fillProjectSeed(project);
  activeProjectSlug = project.slug || slug || "";
  const endpoint = project.continuation?.recommendedAction?.endpoint || "";
  const label = project.continuation?.recommendedAction?.label || "继续制作";
  setAnswer(`已载入项目：${project.title}\n下一步：${label}\n视觉检查归档：${activeProjectSlug ? `output/projects/${activeProjectSlug}/04_storyboard/qa/visual_checks` : "未绑定"}`);
  if (endpoint.includes("/api/dramaturgy/review") && dramaturgyText?.value.trim()) {
    await reviewDramaturgy();
  } else if (endpoint.includes("/api/assets/inventory")) {
    await buildAssetInventory();
  } else if (endpoint.includes("/api/storyboards/generate") || endpoint.includes("/api/pipeline/visual-check")) {
    await runStoryboardVisualCheck();
  } else if (endpoint.includes("/api/postproduction/rigging-plan")) {
    await buildRiggingPlan();
  } else if (endpoint.includes("/api/postproduction/video-plan")) {
    await buildVideoProductionPlan();
  } else if (endpoint.includes("/api/publishing/bilibili")) {
    await buildPublishingPlan();
  } else if (endpoint.includes("/api/postproduction/video-review")) {
    await buildVideoReviewPlan();
  } else if (endpoint.includes("/api/package/portable-plan")) {
    await buildPortablePlan();
  } else if (endpoint.includes("/api/research/plan")) {
    await buildResearchPlanForWorkbench();
  } else {
    productionStatus.textContent = "项目已载入，可在左侧模块继续编辑。";
  }
}

async function loadProposals() {
  const result = await getJson("/api/settings/proposals?limit=20");
  renderProposals(result.items || []);
}

async function createSettingProposal() {
  const targetName = settingTargetName.value.trim();
  const intent = settingIntent.value.trim();
  if (!targetName || !intent) {
    renderProposalDetail(null);
    proposalDetail.textContent = "请填写目标实体和完善目标。";
    return;
  }

  createProposalButton.disabled = true;
  createProposalButton.textContent = "生成中...";
  setAnswer("正在检索证据并生成设定提案。");
  try {
    const result = await getJson("/api/settings/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetName,
        targetType: settingTargetType.value,
        intent,
        useLlm: settingUseLlm.checked,
        limit: 10
      })
    });
    renderProposalDetail(result.proposal);
    renderEvidence(result.evidence);
    await loadProposals();
    setAnswer(result.llmUsed ? "设定提案已由大模型结合证据生成。" : "设定提案已生成。当前使用本地保守提案。");
  } catch (error) {
    setAnswer(`设定提案生成失败：${error.message}`);
  } finally {
    createProposalButton.disabled = false;
    createProposalButton.textContent = "生成设定提案";
  }
}

async function openProposal(proposalId) {
  const result = await getJson(`/api/settings/proposals/${proposalId}`);
  renderProposalDetail(result.proposal);
}

async function applyCurrentProposal() {
  if (!currentProposalId) return;
  const result = await getJson(`/api/settings/proposals/${currentProposalId}/apply`, { method: "POST" });
  renderProposalDetail(result.proposal);
  await Promise.all([loadEntities(), loadProposals()]);
  setAnswer(`已应用设定提案 #${result.proposal.id} 到实体库。`);
}

async function openStoryboardProject(projectId) {
  const result = await getJson(`/api/storyboards/${projectId}`);
  renderStoryboard(result.project, { llmUsed: result.project?.llm_used });
  await loadStoryboardBoard(projectId);
  setAnswer(`已打开分镜项目 #${result.project.id}：${result.project.title}`);
}

function downloadStoryboardFrames() {
  if (!currentStoryboardProjectId) return;
  window.open(`/api/storyboards/${currentStoryboardProjectId}/frames?format=markdown`, "_blank", "noopener");
}

function downloadStoryboardIllustrations() {
  if (!currentStoryboardProjectId) return;
  window.open(`/api/storyboards/${currentStoryboardProjectId}/illustrations?format=markdown`, "_blank", "noopener");
}

function downloadImage2StoryboardPlan() {
  if (!currentStoryboardProjectId) return;
  window.open(`/api/storyboards/${currentStoryboardProjectId}/image2-plan?format=markdown`, "_blank", "noopener");
}

function downloadStoryboardAudit() {
  if (!currentStoryboardProjectId) return;
  window.open(`/api/storyboards/${currentStoryboardProjectId}/audit?format=markdown`, "_blank", "noopener");
}

async function syncDatabase() {
  syncButton.disabled = true;
  syncButton.textContent = "同步中...";
  setAnswer("正在同步资料库，请稍等。");
  try {
    const result = await getJson("/api/sync", { method: "POST" });
    const stats = result.stats || {};
    const visualCount = result.visualProfiles?.activeProfiles ?? 0;
    setAnswer(`同步完成：扫描 ${stats.scanned ?? 0}，新增 ${stats.inserted ?? 0}，更新 ${stats.updated ?? 0}，未变 ${stats.unchanged ?? 0}，删除 ${stats.deleted ?? 0}，错误 ${stats.errors ?? 0}。视觉索引 ${visualCount} 张`);
    await refreshAll();
  } catch (error) {
    setAnswer(`同步失败：${error.message}`);
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "同步资料库";
  }
}

function renderCloudLibraryStatus(result = {}) {
  if (!cloudSyncStatus || !cloudSyncButton) return;
  if (!result.enabled) {
    cloudSyncStatus.hidden = true;
    cloudSyncButton.hidden = true;
    cloudSyncButton.disabled = true;
    return;
  }
  cloudSyncStatus.hidden = false;
  cloudSyncButton.hidden = false;
  cloudSyncButton.disabled = Boolean(result.running);
  if (result.running || result.state?.status === "running") {
    const assetProgress = result.assetProgress;
    if (assetProgress?.status === "running" && Number(assetProgress.totalFiles || 0) > 0) {
      const phaseLabels = {
        "hash-and-validate": "核验原件",
        "copy-to-staging": "整理原件",
        "commit-and-upload": "上传原件",
        "commit-local": "保存原件清单"
      };
      cloudSyncStatus.textContent = `${phaseLabels[assetProgress.phase] || "备份原件"} ${assetProgress.completedFiles || 0}/${assetProgress.totalFiles}`;
    } else {
      cloudSyncStatus.textContent = `云端同步中：${result.state?.phase || "准备"}`;
    }
    return;
  }
  if (result.state?.status === "failed") {
    cloudSyncStatus.textContent = "云端同步失败";
    return;
  }
  const files = result.localManifest?.files || result.state?.manifest?.files || 0;
  const approved = result.localManifest?.approvedAssets || result.state?.manifest?.approvedAssets || 0;
  const scheduled = result.schedule?.installed ? `每 ${result.schedule.intervalMinutes} 分钟` : "未定时";
  const restoreVerified = result.remoteVerification?.result === "pass" ? " · 恢复抽检通过" : "";
  const ready = String(result.state?.status || "").startsWith("ready");
  cloudSyncStatus.textContent = ready
    ? `${result.state?.status === "ready_remote_pending" ? "本地已更新，等待网络补推" : "云端已同步"} ${files} 项 · 原件获批 ${approved} · ${scheduled}${restoreVerified}`
    : `云端待首次同步 · ${scheduled}`;
}

async function loadCloudLibraryStatus() {
  if (!cloudSyncStatus) return;
  try {
    renderCloudLibraryStatus(await getJson("/api/cloud-library/status"));
  } catch (error) {
    cloudSyncStatus.textContent = `云端状态异常：${error.message}`;
  }
}

async function syncCloudLibrary() {
  if (!cloudSyncButton) return;
  cloudSyncButton.disabled = true;
  cloudSyncStatus.textContent = "正在启动云端同步...";
  try {
    await getJson("/api/cloud-library/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeApprovedAssets: true })
    });
    cloudSyncStatus.textContent = "云端同步已启动";
    window.setTimeout(loadCloudLibraryStatus, 1500);
  } catch (error) {
    if (/409|already running|正在运行|同步中/i.test(error.message)) {
      cloudSyncStatus.textContent = "云端同步正在进行";
      window.setTimeout(loadCloudLibraryStatus, 1200);
    } else {
      cloudSyncStatus.textContent = `云端同步失败：${error.message}`;
      cloudSyncButton.disabled = false;
    }
  }
}

async function runVisualSearch() {
  const q = visualQuery.value.trim() || questionInput.value.trim() || storyScript.value.trim();
  visualStatus.textContent = "正在筛选视觉资产...";
  const params = new URLSearchParams({
    q,
    role: visualRole.value,
    kind: visualKind.value,
    limit: "24"
  });
  const result = await getJson(`/api/visual-assets?${params.toString()}`);
  renderVisualAssets(result);
}

async function refreshVisualProfiles() {
  refreshVisualProfilesButton.disabled = true;
  visualStatus.textContent = "正在刷新视觉索引...";
  try {
    const result = await getJson("/api/visual-assets/refresh", { method: "POST" });
    visualStatus.textContent = `视觉索引已刷新：${result.activeProfiles ?? 0} 张。`;
    await runVisualSearch();
  } finally {
    refreshVisualProfilesButton.disabled = false;
  }
}

async function expandLiterature() {
  const text = literatureText.value.trim();
  const intent = literatureIntent.value.trim();
  if (!text && !intent) {
    literatureStatus.textContent = "请先输入小说片段或创作目标。";
    return;
  }
  expandLiteratureButton.disabled = true;
  literatureStatus.textContent = "正在检索剧作参考并生成文学拓展...";
  try {
    const result = await getJson("/api/literature/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "literary_expand",
        text,
        intent,
        characters: literatureCharacters.value.trim(),
        tone: literatureTone.value.trim(),
        useLlm: literatureUseLlm.checked,
        limit: 10
      })
    });
    renderLiteratureResult(result);
    renderEvidence(result.evidence);
    if (result.llmError) setAnswer(`文学拓展已生成，但大模型文学化未成功，当前使用本地编辑草稿。\n${result.llmError}`);
  } catch (error) {
    literatureStatus.textContent = `文学拓展失败：${error.message}`;
  } finally {
    expandLiteratureButton.disabled = false;
  }
}

async function reviewDramaturgy() {
  const text = dramaturgyText?.value.trim() || "";
  const intent = dramaturgyIntent?.value.trim() || "";
  if (!text && !intent) {
    dramaturgyStatus.textContent = "请先输入剧本片段或审查目标。";
    return;
  }
  reviewDramaturgyButton.disabled = true;
  dramaturgyStatus.textContent = "正在执行四层叙事审查...";
  try {
    const result = await getJson("/api/dramaturgy/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        intent,
        characters: dramaturgyCharacters?.value.trim() || ""
      })
    });
    renderDramaturgyReview(result);
  } catch (error) {
    dramaturgyStatus.textContent = `剧本审查失败：${error.message}`;
  } finally {
    reviewDramaturgyButton.disabled = false;
  }
}

function downloadDramaturgyRules() {
  window.open("/api/dramaturgy/rules?format=markdown", "_blank", "noopener");
}

async function buildReferencePlan() {
  const query = referenceQuery.value.trim() || visualQuery.value.trim() || storyScript.value.trim() || questionInput.value.trim();
  if (!query) {
    referenceStatus.textContent = "请先输入参考目标。";
    return;
  }
  buildReferencePlanButton.disabled = true;
  referenceStatus.textContent = "正在生成专业参考计划...";
  try {
    const plan = await getJson("/api/references/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        focus: referenceFocus.value
      })
    });
    renderReferencePlan(plan);
  } catch (error) {
    referenceStatus.textContent = `参考计划失败：${error.message}`;
  } finally {
    buildReferencePlanButton.disabled = false;
  }
}

async function copyPromptPack() {
  if (!currentStoryboardProjectId) return;
  copyPromptPackButton.disabled = true;
  try {
    const text = await getText(`/api/storyboards/${currentStoryboardProjectId}/prompt-pack?format=markdown`);
    await navigator.clipboard.writeText(text);
    copyPromptPackButton.textContent = "已复制";
    setTimeout(() => {
      copyPromptPackButton.textContent = "复制提示词包";
    }, 1200);
  } finally {
    copyPromptPackButton.disabled = false;
  }
}

function downloadPromptPack() {
  if (!currentStoryboardProjectId) return;
  window.open(`/api/storyboards/${currentStoryboardProjectId}/prompt-pack?format=markdown`, "_blank", "noopener");
}

async function loadStoryboardBoard(projectId = currentStoryboardProjectId) {
  if (!projectId) {
    renderStoryboardBoard(null);
    return;
  }
  if (boardStatus) boardStatus.textContent = "正在生成故事板总图方案...";
  try {
    const result = await getJson(`/api/storyboards/${projectId}/board`);
    renderStoryboardBoard(result.board);
  } catch (error) {
    if (boardStatus) boardStatus.textContent = `故事板总图失败：${error.message}`;
  }
}

function downloadStoryboardBoard() {
  if (!currentStoryboardProjectId) return;
  window.open(`/api/storyboards/${currentStoryboardProjectId}/board?format=markdown`, "_blank", "noopener");
}

async function buildWorkflowPlan() {
  const topic = workflowTopic?.value.trim() || storyTitle?.value.trim() || questionInput?.value.trim();
  const script = workflowScript?.value.trim() || storyScript?.value.trim();
  if (!topic && !script) {
    workflowStatus.textContent = "请先输入创作目标或情节。";
    return;
  }
  buildWorkflowButton.disabled = true;
  workflowStatus.textContent = "正在生成全流程计划...";
  try {
    const result = await getJson("/api/workflow/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, script, goal: topic, limit: 8 })
    });
    renderWorkflowResult(result, "已生成全流程计划。");
    if (result.evidence?.chunks) renderEvidence(result.evidence);
  } catch (error) {
    workflowStatus.textContent = `全流程计划失败：${error.message}`;
  } finally {
    buildWorkflowButton.disabled = false;
  }
}

async function buildPublishingPlan() {
  const topic = publishingTopic?.value.trim() || workflowTopic?.value.trim() || storyTitle?.value.trim();
  const script = publishingScript?.value.trim() || workflowScript?.value.trim() || storyScript?.value.trim();
  if (!topic && !script) {
    workflowStatus.textContent = "请先输入选题或内容简介。";
    return;
  }
  buildPublishingButton.disabled = true;
  workflowStatus.textContent = "正在生成B站宣发方案...";
  try {
    const result = await getJson("/api/publishing/bilibili", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, script, limit: 8 })
    });
    renderWorkflowResult(result, "已生成B站宣发方案。");
    if (result.evidence?.chunks) renderEvidence(result.evidence);
  } catch (error) {
    workflowStatus.textContent = `B站方案失败：${error.message}`;
  } finally {
    buildPublishingButton.disabled = false;
  }
}

async function buildDailyBrief() {
  const topic = publishingTopic?.value.trim() || workflowTopic?.value.trim() || "当前项目日更故事";
  const hotspot = publishingScript?.value.trim() || workflowScript?.value.trim() || storyScript?.value.trim();
  buildDailyBriefButton.disabled = true;
  workflowStatus.textContent = "正在生成日更简报...";
  try {
    const result = await getJson("/api/daily/story-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, hotspot, limit: 8 })
    });
    renderWorkflowResult(result, "已生成日更故事和15秒动画设计。");
    if (result.evidence?.chunks) renderEvidence(result.evidence);
  } catch (error) {
    workflowStatus.textContent = `日更简报失败：${error.message}`;
  } finally {
    buildDailyBriefButton.disabled = false;
  }
}

function getProductionInput() {
  return {
    title: projectTitleInput?.value.trim() || workflowTopic?.value.trim() || storyTitle?.value.trim(),
    intent: projectIntentInput?.value.trim() || workflowTopic?.value.trim() || "",
    script: projectScriptInput?.value.trim() || workflowScript?.value.trim() || storyScript?.value.trim(),
    topic: projectTitleInput?.value.trim() || workflowTopic?.value.trim() || storyTitle?.value.trim()
  };
}

function getPipelineInput() {
  const topic = pipelineTopicInput?.value.trim()
    || workflowTopic?.value.trim()
    || storyTitle?.value.trim()
    || projectTitleInput?.value.trim()
    || questionInput?.value.trim();
  const prompt = pipelinePromptInput?.value.trim()
    || projectIntentInput?.value.trim()
    || workflowScript?.value.trim()
    || storyScript?.value.trim();
  const script = pipelineScriptInput?.value.trim()
    || workflowScript?.value.trim()
    || storyScript?.value.trim()
    || projectScriptInput?.value.trim();
  const durationSec = Number(pipelineDurationInput?.value || directorTargetDuration?.value || 15);
  const plannedShotCount = Number(pipelineShotCountInput?.value || shotCount?.value || 0) || undefined;
  return {
    topic,
    prompt,
    script,
    intent: topic,
    imagePath: pipelineImagePathInput?.value.trim() || "",
    sourceImagePath: pipelineImagePathInput?.value.trim() || "",
    taskDirectory: pipelineNativeTaskDirectoryInput?.value.trim() || "",
    imageExecutionMode: pipelineImageExecutionInput?.value || "codex_native",
    referenceImagePath: pipelineReferenceImageInput?.value.trim() || pipelineImagePathInput?.value.trim() || "",
    referenceMode: pipelineReferenceModeInput?.value || "identity_lock",
    execute: Boolean(pipelineReferenceExecuteInput?.checked),
    durationSec,
    targetDurationSec: durationSec,
    budgetCny: Number(pipelineBudgetInput?.value || 0) || undefined,
    shotCount: plannedShotCount,
    route: pipelineRouteInput?.value || "seedance-balanced",
    lightingPreset: pipelineLightingPresetInput?.value || "cinematic-balanced",
    colorMood: pipelineColorMoodInput?.value || "creator-cinematic",
    styleProfile: pipelineStyleProfileInput?.value || "tactical-anime-industrial",
    styleProfileIds: [pipelineStyleProfileInput?.value || "tactical-anime-industrial"],
    dynamicIntensity: Number(pipelineDynamicIntensityInput?.value || 70),
    targetModel: directorTargetModel?.value.trim() || "Seedance 2.0",
    style: storyStyle?.value.trim() || "当前项目近未来东方战术美少女动画，电影感，克制真实",
    projectSlug: activeProjectSlug || undefined,
    limit: 8
  };
}

function hasPipelineInput(payload) {
  return Boolean(payload.topic || payload.prompt || payload.script || payload.imagePath);
}

async function runPipelineRequest(endpoint, button, statusText, doneText, overrides = {}) {
  const payload = { ...getPipelineInput(), ...overrides };
  if (!hasPipelineInput(payload)) {
    pipelineStatus.textContent = "请先输入创作指令、提示词、脚本或待检查图片路径。";
    return null;
  }
  if (button) button.disabled = true;
  pipelineStatus.textContent = statusText;
  try {
    const result = await getJson(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderPipelinePlan(result, doneText);
    if (result.canonEvidence?.canonCards?.length) {
      renderEvidence({
        query: result.canonEvidence.query,
        entities: [],
        chunks: result.canonEvidence.canonCards.map((card, index) => ({
          id: index,
          title: card.sourcePath || "资料库证据",
          rel_path: card.sourcePath || "",
          text: (card.keyPoints || []).join("\n"),
          brief: {
            claim: card.claim,
            keyPoints: card.keyPoints || [],
            confidence: card.confidence,
            evidenceTypeLabel: card.evidenceType,
            sourcePath: card.sourcePath
          }
        })),
        assets: []
      });
    }
    return result;
  } catch (error) {
    pipelineStatus.textContent = `${doneText}失败：${error.message}`;
    return null;
  } finally {
    if (button) button.disabled = false;
  }
}

async function refinePipelinePrompt() {
  await runPipelineRequest(
    "/api/pipeline/prompt-refine",
    pipelinePromptRefineButton,
    "正在细化单帧分镜图提示词...",
    "单帧提示词已细化。",
    { useLlm: false }
  );
}

async function buildVisualBible() {
  await runPipelineRequest(
    "/api/pipeline/visual-bible",
    pipelineVisualBibleButton,
    "正在生成色彩、风格与世界观视觉圣经...",
    "视觉圣经已生成并归档。",
    { useLlm: false }
  );
}

async function createCodexNativeImageTaskFromWorkbench() {
  const result = await runPipelineRequest(
    "/api/pipeline/native-image/task",
    pipelineNativeImageTaskButton,
    "正在编译 Prompt V2 并创建 Codex 原生 image-2 任务...",
    "Codex 原生 image-2 任务包已创建；请复制执行指令到当前 Codex 对话。",
    { useLlm: false }
  );
  if (result?.outputDir && pipelineNativeTaskDirectoryInput) {
    pipelineNativeTaskDirectoryInput.value = result.outputDir;
  }
  latestCodexNativeHandoff = result?.handoff?.instruction || "";
  if (pipelineNativeImageCopyButton) pipelineNativeImageCopyButton.disabled = !latestCodexNativeHandoff;
}

async function copyCodexNativeHandoff(button = pipelineNativeImageCopyButton, instruction = latestCodexNativeHandoff) {
  if (!instruction) {
    pipelineStatus.textContent = "请先创建 Codex 生图任务包。";
    return;
  }
  await navigator.clipboard.writeText(instruction);
  if (button) {
    const previous = button.textContent;
    button.textContent = "已复制，去 Codex 对话发送";
    setTimeout(() => { button.textContent = previous; }, 1600);
  }
  pipelineStatus.textContent = "执行指令已复制；请在当前 Codex 对话中发送，图片会先显示在对话里。";
}

async function importCodexNativeImageFromWorkbench() {
  const sourceImagePath = pipelineImagePathInput?.value.trim() || "";
  const taskDirectory = pipelineNativeTaskDirectoryInput?.value.trim() || "";
  if (!sourceImagePath || !taskDirectory) {
    pipelineStatus.textContent = "请先创建 Codex 生图任务，并填写 Codex 生成图的本地路径。";
    return;
  }
  const result = await runPipelineRequest(
    "/api/pipeline/native-image/import",
    pipelineNativeImageImportButton,
    "正在把 Codex 原生生成图版本化落盘并创建视觉 QA...",
    "Codex 图片已落盘，等待真实图片视觉复核。"
  );
  const outputPath = result?.imported?.outputPath;
  if (outputPath && pipelineImagePathInput) pipelineImagePathInput.value = outputPath;
}

async function runVisualQaDiagnostics() {
  if (pipelineVisualQaDiagnosticsButton) pipelineVisualQaDiagnosticsButton.disabled = true;
  pipelineStatus.textContent = "正在检查视觉 QA V2 能力...";
  try {
    const result = await getJson("/api/pipeline/visual-qa/diagnostics");
    renderPipelinePlan(result, "视觉 QA V2 诊断完成。");
  } catch (error) {
    pipelineStatus.textContent = `视觉 QA 诊断失败：${error.message}`;
  } finally {
    if (pipelineVisualQaDiagnosticsButton) pipelineVisualQaDiagnosticsButton.disabled = false;
  }
}

async function runAutonomousPipeline() {
  const result = await runPipelineRequest(
    "/api/pipeline/auto-execute",
    pipelineAutoExecuteButton,
    "正在生成自动执行管线...",
    "自动执行管线已生成。"
  );
  if (result?.agentRun) {
    currentAgentRunId = result.agentRun.id;
    renderAgentRun(result.agentRun);
    await loadAgentRuns(false);
    scheduleAgentPoll(result.agentRun);
  }
}

async function buildDetailedCreativePlan() {
  await runPipelineRequest(
    "/api/pipeline/creative-plan",
    pipelineCreativePlanButton,
    "正在生成详细创作方案...",
    "详细创作方案已生成。"
  );
}

async function buildCreativeSuitePlan() {
  await runPipelineRequest(
    "/api/pipeline/creative-suite",
    pipelineCreativeSuiteButton,
    "正在生成插件套件调度方案...",
    "插件套件调度方案已生成。"
  );
}

async function runStoryboardVisualCheck() {
  await runPipelineRequest(
    "/api/pipeline/visual-check",
    pipelineVisualCheckButton,
    "正在生成分镜图视觉检查方案...",
    "视觉检查方案已生成。"
  );
}

async function inspectVisualAssetFromButton(button) {
  const fileId = Number(button.dataset.fileId || 0);
  const imagePath = button.dataset.imagePath || "";
  if (!fileId && !imagePath) return;
  const title = button.dataset.title || "视觉资产";
  const relPath = button.dataset.relPath || "";
  if (pipelineTopicInput) pipelineTopicInput.value = `${title} 视觉检查`;
  if (pipelinePromptInput) pipelinePromptInput.value = `${title} 角色一致性、道具一致性、构图、动作与风格检查`;
  if (pipelineImagePathInput) pipelineImagePathInput.value = fileId ? `fileId:${fileId}` : imagePath;
  if (pipelineReferenceImageInput) pipelineReferenceImageInput.value = fileId ? `fileId:${fileId}` : imagePath;
  if (pipelineReferenceModeInput && !pipelineReferenceModeInput.value) pipelineReferenceModeInput.value = "identity_lock";
  button.disabled = true;
  button.textContent = "检查中...";
  pipelineStatus.textContent = `正在检查图片：${title}`;
  try {
    const result = await getJson("/api/pipeline/visual-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: `${title} 视觉检查`,
        prompt: `${title} 角色一致性、道具一致性、构图、动作与风格检查`,
        fileId: fileId || undefined,
        imagePath: imagePath || undefined,
        relPath,
        persistReport: true,
        projectSlug: activeProjectSlug || undefined,
        durationSec: Number(pipelineDurationInput?.value || 15),
        shotCount: Number(pipelineShotCountInput?.value || 0) || undefined
      })
    });
    renderPipelinePlan(result, "视觉检查报告已生成。");
    setAnswer(`已检查图片：${title}\n判定：${result.boardDecision?.label || result.gate?.label || "未判定"}\n报告：${result.reportFiles?.markdownPath || "未生成报告"}\n项目归档：${result.reportFiles?.projectArchive?.markdownPath || "未绑定当前项目"}`);
  } catch (error) {
    pipelineStatus.textContent = `视觉检查失败：${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "检查此图";
  }
}

async function estimatePipelineCost() {
  await runPipelineRequest(
    "/api/pipeline/cost-estimate",
    pipelineCostButton,
    "正在估算 Seedance 成本...",
    "成本估算已生成。"
  );
}

async function createReferenceImageTask() {
  await runPipelineRequest(
    "/api/pipeline/reference-image-generate",
    pipelineReferenceGenerateButton,
    "正在创建图生图参考任务...",
    "图生图参考任务已创建。"
  );
}

async function createImageGenerationTask() {
  await runPipelineRequest(
    "/api/pipeline/image-generate",
    pipelineImageGenerateButton,
    pipelineReferenceExecuteInput?.checked
      ? "正在调用 gpt-image-2 生成图像..."
      : "正在创建 gpt-image-2 文生图任务...",
    pipelineReferenceExecuteInput?.checked
      ? "gpt-image-2 执行完成，请检查生成闸门和输出。"
      : "gpt-image-2 文生图任务已创建。"
  );
}

async function runImageGenerationDiagnostics() {
  if (pipelineImageDiagnosticsButton) pipelineImageDiagnosticsButton.disabled = true;
  pipelineStatus.textContent = "正在检测图像后端...";
  try {
    const result = await getJson("/api/pipeline/image-generation/diagnostics");
    renderPipelinePlan(result, "图像后端诊断完成。");
  } catch (error) {
    pipelineStatus.textContent = `图像后端诊断失败：${error.message}`;
  } finally {
    if (pipelineImageDiagnosticsButton) pipelineImageDiagnosticsButton.disabled = false;
  }
}

async function createProductionProject() {
  const payload = getProductionInput();
  if (!payload.title && !payload.script) {
    productionStatus.textContent = "请先输入项目名称或剧情需求。";
    return;
  }
  createProjectButton.disabled = true;
  productionStatus.textContent = "正在新建项目并盘点资产...";
  try {
    const result = await getJson("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderGenericPlan(productionResult, productionStatus, result, "项目已创建。");
    activeProjectSlug = result.project?.slug || activeProjectSlug;
    setAnswer(`项目已创建：${result.project?.projectPath || ""}\n视觉检查归档：${activeProjectSlug ? `output/projects/${activeProjectSlug}/04_storyboard/qa/visual_checks` : "未绑定"}`);
    await loadProjectStatuses();
  } catch (error) {
    productionStatus.textContent = `项目创建失败：${error.message}`;
  } finally {
    createProjectButton.disabled = false;
  }
}

async function buildAssetInventory() {
  const payload = getProductionInput();
  if (!payload.title && !payload.script) {
    productionStatus.textContent = "请先输入项目或剧情需求。";
    return;
  }
  buildAssetInventoryButton.disabled = true;
  productionStatus.textContent = "正在盘点本地美术资源...";
  try {
    const result = await getJson("/api/assets/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderGenericPlan(productionResult, productionStatus, result, "资产清单已生成。");
  } catch (error) {
    productionStatus.textContent = `资产盘点失败：${error.message}`;
  } finally {
    buildAssetInventoryButton.disabled = false;
  }
}

async function refinePromptPlan() {
  const payload = getProductionInput();
  if (!payload.title && !payload.script) {
    productionStatus.textContent = "请先输入需要精修的画面或剧情需求。";
    return;
  }
  refinePromptButton.disabled = true;
  productionStatus.textContent = "正在精修提示词并检查生成门槛...";
  try {
    const result = await getJson("/api/prompts/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, prompt: payload.script, limit: 8 })
    });
    renderGenericPlan(productionResult, productionStatus, result, "提示词精修方案已生成。");
  } catch (error) {
    productionStatus.textContent = `提示词精修失败：${error.message}`;
  } finally {
    refinePromptButton.disabled = false;
  }
}

async function buildResearchPlanForWorkbench() {
  const query = researchQueryInput?.value.trim() || projectScriptInput?.value.trim() || workflowScript?.value.trim() || storyScript?.value.trim() || questionInput?.value.trim();
  if (!query) {
    researchStatus.textContent = "请先输入研究目标。";
    return;
  }
  buildResearchPlanButton.disabled = true;
  researchStatus.textContent = "正在生成浏览器优先研究计划...";
  try {
    const result = await getJson("/api/research/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        focus: researchFocusInput?.value || ""
      })
    });
    renderGenericPlan(researchResult, researchStatus, result, "研究计划已生成。");
  } catch (error) {
    researchStatus.textContent = `研究计划失败：${error.message}`;
  } finally {
    buildResearchPlanButton.disabled = false;
  }
}

async function buildRiggingPlan() {
  const topic = postTopicInput?.value.trim() || projectTitleInput?.value.trim() || "项目主角 AE 手书动画";
  buildRiggingPlanButton.disabled = true;
  postStatus.textContent = "正在生成 AE 拆图规范...";
  try {
    const result = await getJson("/api/postproduction/rigging-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character: topic, purpose: "AE 手书/展示型轻动画" })
    });
    renderGenericPlan(postResult, postStatus, result, "AE拆图规范已生成。");
  } catch (error) {
    postStatus.textContent = `AE拆图规范失败：${error.message}`;
  } finally {
    buildRiggingPlanButton.disabled = false;
  }
}

async function buildVideoProductionPlan() {
  const topic = postTopicInput?.value.trim() || projectTitleInput?.value.trim() || workflowTopic?.value.trim() || "当前项目短片";
  buildVideoPlanButton.disabled = true;
  postStatus.textContent = "正在生成视频制作管线...";
  try {
    const result = await getJson("/api/postproduction/video-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, format: "手书/展示/MV型短片" })
    });
    renderGenericPlan(postResult, postStatus, result, "视频制作管线已生成。");
  } catch (error) {
    postStatus.textContent = `视频制作管线失败：${error.message}`;
  } finally {
    buildVideoPlanButton.disabled = false;
  }
}

async function buildVideoReviewPlan() {
  const topic = postTopicInput?.value.trim() || projectTitleInput?.value.trim() || "待复盘成片";
  buildVideoReviewButton.disabled = true;
  postStatus.textContent = "正在生成成片复盘方案...";
  try {
    const result = await getJson("/api/postproduction/video-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: topic, platform: "B站" })
    });
    renderGenericPlan(postResult, postStatus, result, "成片复盘方案已生成。");
  } catch (error) {
    postStatus.textContent = `成片复盘方案失败：${error.message}`;
  } finally {
    buildVideoReviewButton.disabled = false;
  }
}

async function buildPortablePlan() {
  buildPortablePlanButton.disabled = true;
  postStatus.textContent = "正在生成迁移打包方案...";
  try {
    const result = await getJson("/api/package/portable-plan", { method: "POST" });
    renderGenericPlan(postResult, postStatus, result, "迁移打包方案已生成。");
  } catch (error) {
    postStatus.textContent = `迁移打包方案失败：${error.message}`;
  } finally {
    buildPortablePlanButton.disabled = false;
  }
}

async function loadEntities() {
  const type = entityType.value;
  const result = await getJson(`/api/entities${type ? `?type=${encodeURIComponent(type)}` : ""}`);
  entityList.innerHTML = result.items.map((entity) => `
    <article class="item">
      <div class="item-title"><span class="pill">${escapeHtml(entity.type)}</span>${escapeHtml(entity.name)}</div>
      <div class="item-body">${escapeHtml(entity.summary || "")}</div>
    </article>
  `).join("");
}

refreshButton.addEventListener("click", refreshAll);
syncButton.addEventListener("click", syncDatabase);
if (cloudSyncButton) cloudSyncButton.addEventListener("click", syncCloudLibrary);
searchButton.addEventListener("click", () => runSearch());
preciseSearchButton.addEventListener("click", () => runSearch("precise"));
askButton.addEventListener("click", runAsk);
entityType.addEventListener("change", loadEntities);
generateStoryboardButton.addEventListener("click", generateStoryboard);
createProposalButton.addEventListener("click", createSettingProposal);
copyPromptPackButton.addEventListener("click", copyPromptPack);
downloadPromptsButton.addEventListener("click", downloadPromptPack);
if (downloadFramesButton) downloadFramesButton.addEventListener("click", downloadStoryboardFrames);
if (downloadIllustrationsButton) downloadIllustrationsButton.addEventListener("click", downloadStoryboardIllustrations);
if (downloadImage2PlanButton) downloadImage2PlanButton.addEventListener("click", downloadImage2StoryboardPlan);
if (downloadAuditButton) downloadAuditButton.addEventListener("click", downloadStoryboardAudit);
if (downloadBoardButton) downloadBoardButton.addEventListener("click", downloadStoryboardBoard);
reloadProjectsButton.addEventListener("click", () => Promise.all([loadProjects(), loadProjectStatuses()]));
reloadProposalsButton.addEventListener("click", loadProposals);
visualSearchButton.addEventListener("click", runVisualSearch);
refreshVisualProfilesButton.addEventListener("click", refreshVisualProfiles);
expandLiteratureButton.addEventListener("click", expandLiterature);
if (reviewDramaturgyButton) reviewDramaturgyButton.addEventListener("click", reviewDramaturgy);
if (downloadDramaturgyRulesButton) downloadDramaturgyRulesButton.addEventListener("click", downloadDramaturgyRules);
buildReferencePlanButton.addEventListener("click", buildReferencePlan);
if (buildWorkflowButton) buildWorkflowButton.addEventListener("click", buildWorkflowPlan);
if (buildPublishingButton) buildPublishingButton.addEventListener("click", buildPublishingPlan);
if (buildDailyBriefButton) buildDailyBriefButton.addEventListener("click", buildDailyBrief);
if (pipelinePromptRefineButton) pipelinePromptRefineButton.addEventListener("click", refinePipelinePrompt);
if (pipelineVisualBibleButton) pipelineVisualBibleButton.addEventListener("click", buildVisualBible);
if (pipelineNativeImageTaskButton) pipelineNativeImageTaskButton.addEventListener("click", createCodexNativeImageTaskFromWorkbench);
if (pipelineNativeImageCopyButton) pipelineNativeImageCopyButton.addEventListener("click", () => copyCodexNativeHandoff());
if (pipelineNativeImageImportButton) pipelineNativeImageImportButton.addEventListener("click", importCodexNativeImageFromWorkbench);
if (pipelineVisualQaDiagnosticsButton) pipelineVisualQaDiagnosticsButton.addEventListener("click", runVisualQaDiagnostics);
if (pipelineAutoExecuteButton) pipelineAutoExecuteButton.addEventListener("click", runAutonomousPipeline);
if (pipelineCreativePlanButton) pipelineCreativePlanButton.addEventListener("click", buildDetailedCreativePlan);
if (pipelineCreativeSuiteButton) pipelineCreativeSuiteButton.addEventListener("click", buildCreativeSuitePlan);
if (agentStartButton) agentStartButton.addEventListener("click", startAgentRun);
if (agentRefreshButton) agentRefreshButton.addEventListener("click", loadAgentConsole);
if (pipelineVisualCheckButton) pipelineVisualCheckButton.addEventListener("click", runStoryboardVisualCheck);
if (pipelineCostButton) pipelineCostButton.addEventListener("click", estimatePipelineCost);
if (pipelineImageGenerateButton) pipelineImageGenerateButton.addEventListener("click", createImageGenerationTask);
if (pipelineReferenceGenerateButton) pipelineReferenceGenerateButton.addEventListener("click", createReferenceImageTask);
if (pipelineImageDiagnosticsButton) pipelineImageDiagnosticsButton.addEventListener("click", runImageGenerationDiagnostics);
if (createProjectButton) createProjectButton.addEventListener("click", createProductionProject);
if (buildAssetInventoryButton) buildAssetInventoryButton.addEventListener("click", buildAssetInventory);
if (refinePromptButton) refinePromptButton.addEventListener("click", refinePromptPlan);
if (buildResearchPlanButton) buildResearchPlanButton.addEventListener("click", buildResearchPlanForWorkbench);
if (buildRiggingPlanButton) buildRiggingPlanButton.addEventListener("click", buildRiggingPlan);
if (buildVideoPlanButton) buildVideoPlanButton.addEventListener("click", buildVideoProductionPlan);
if (buildVideoReviewButton) buildVideoReviewButton.addEventListener("click", buildVideoReviewPlan);
if (buildPortablePlanButton) buildPortablePlanButton.addEventListener("click", buildPortablePlan);
if (systemHealthButton) systemHealthButton.addEventListener("click", loadSystemHealth);
if (systemPipelineCheckButton) systemPipelineCheckButton.addEventListener("click", runSystemPipelineCheck);
questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) runAsk();
});
storyboardList.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-prompt");
  if (!button) return;
  await navigator.clipboard.writeText(button.dataset.prompt || "");
  button.textContent = "已复制";
  setTimeout(() => {
    button.textContent = "复制绘图提示词";
  }, 1200);
});
projectList.addEventListener("click", (event) => {
  const button = event.target.closest(".open-project");
  if (!button) return;
  openStoryboardProject(button.dataset.projectId);
});
proposalList.addEventListener("click", (event) => {
  const button = event.target.closest(".open-proposal");
  if (!button) return;
  openProposal(button.dataset.proposalId);
});
proposalDetail.addEventListener("click", (event) => {
  if (!event.target.closest("#applyCurrentProposalButton")) return;
  applyCurrentProposal();
});
for (const container of [answerCardResult, assetList, visualAssetList]) {
  if (!container) continue;
  container.addEventListener("click", (event) => {
    const button = event.target.closest(".inspect-asset-button");
    if (!button) return;
    inspectVisualAssetFromButton(button);
  });
}
if (projectStatusResult) {
  projectStatusResult.addEventListener("click", (event) => {
    const button = event.target.closest(".continue-project-button");
    if (!button) return;
    continueProject(button.dataset.projectSlug);
  });
}
if (agentRunList) {
  agentRunList.addEventListener("click", (event) => {
    const button = event.target.closest(".agent-run-open");
    if (!button) return;
    currentAgentRunId = button.dataset.agentRunId || "";
    loadAgentRun(currentAgentRunId, true).catch((error) => {
      agentRunStatus.textContent = `任务读取失败：${error.message}`;
    });
  });
}
if (agentRunDetail) {
  agentRunDetail.addEventListener("click", async (event) => {
    const copyButton = event.target.closest(".copy-native-handoff");
    if (copyButton) {
      await copyCodexNativeHandoff(copyButton, copyButton.dataset.handoff || "");
      return;
    }
    const button = event.target.closest(".agent-action");
    if (!button) return;
    handleAgentAction(button);
  });
}

renderEvidence();
renderStoryboard(null);
renderProjects();
renderProposalDetail(null);
renderProposals();
renderVisualAssets();
renderLiteratureResult();
renderDramaturgyReview();
renderReferencePlan();
renderWorkflowResult();
renderStoryboardBoard();
renderGenericPlan(productionResult, productionStatus, null);
renderGenericPlan(researchResult, researchStatus, null);
renderGenericPlan(postResult, postStatus, null);
renderPipelinePlan(null);
renderAgentRuns();
renderAgentRun(null);
renderLlmStatus(null);
renderSystemHealth(null);
renderAnswerCard(null);
renderProjectStatus(null);
refreshAll().catch((error) => {
  runtimeStatus.textContent = `连接失败：${error.message}`;
});
