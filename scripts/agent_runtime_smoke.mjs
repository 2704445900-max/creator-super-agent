const base = process.env.AGENT_BASE_URL || "http://127.0.0.1:8787";
async function request(url, options) {
  const response = await fetch(`${base}${url}`, options);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json();
}

const runtime = await request("/api/agent/runtime");
const run = await request("/api/agent/runs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workspaceId: "creator-default",
    contentPackId: "creator-generic",
    title: "agent-runtime-smoke",
    goal: "Create a 15-second original animation production plan",
    script: "A station technician restores the final emergency light.",
    durationSec: 15,
    generateImages: false,
    useLlm: false,
    autoStart: true
  })
});
let current = run;
for (let index = 0; index < 60 && ["queued", "running"].includes(current.status); index += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  current = await request(`/api/agent/runs/${encodeURIComponent(run.id)}`);
}
if (current.status !== "completed") throw new Error(`Agent smoke failed: ${current.status} ${current.error || ""}`);
if (!current.plan || !current.projectSlug) throw new Error("Agent smoke did not persist plan/project state.");

const nativeRun = await request("/api/agent/runs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workspaceId: "creator-default",
    contentPackId: "creator-generic",
    title: "agent-native-image-smoke",
    goal: "Create one original cinematic storyboard illustration",
    script: "A station technician raises a work light and checks the flooded tunnel.",
    durationSec: 6,
    generateImages: true,
    imageExecutionMode: "codex_native",
    useLlm: false,
    requireVisualApproval: true,
    autoStart: true
  })
});
let nativeCurrent = nativeRun;
for (let index = 0; index < 120 && ["queued", "running"].includes(nativeCurrent.status); index += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  nativeCurrent = await request(`/api/agent/runs/${encodeURIComponent(nativeRun.id)}`);
}
const nativeApproval = (nativeCurrent.approvals || []).find((item) => item.status === "pending");
if (nativeCurrent.status !== "waiting_approval" || nativeApproval?.type !== "codex_native_image_generation") {
  throw new Error(`Native image agent did not reach Codex approval gate: ${nativeCurrent.status}`);
}
if (!nativeCurrent.state?.nativeImageTask?.outputDir || !nativeApproval.request?.task?.files?.promptMarkdown) {
  throw new Error("Native image task was not persisted before approval.");
}
if (nativeCurrent.state.nativeImageTask.conversationPresentation?.required !== true) {
  throw new Error("Native image task does not require inline conversation display.");
}
if (nativeCurrent.state.nativeImageTask.handoff?.automaticDispatch !== false
  || !nativeCurrent.state.nativeImageTask.handoff?.instruction) {
  throw new Error("Native image task does not expose a copyable Codex conversation handoff.");
}
if (nativeApproval.request?.conversationPresentation?.required !== true
  || nativeApproval.request?.expectedResponse?.conversationImageDisplayed !== true) {
  throw new Error("Native image approval does not enforce inline conversation display.");
}
let missingDisplayRejected = false;
try {
  await request(`/api/agent/runs/${encodeURIComponent(nativeRun.id)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      approvalId: nativeApproval.id,
      decision: "approved",
      response: {
        sourceImagePath: "C:\\generated-images\\smoke.png",
        confirmedGeneratedByCodexNative: true
      }
    })
  });
} catch (error) {
  missingDisplayRejected = /displayed inline/i.test(error.message);
}
if (!missingDisplayRejected) throw new Error("Native image approval accepted a result that was not displayed inline.");
await request(`/api/agent/runs/${encodeURIComponent(nativeRun.id)}/cancel`, { method: "POST" });

console.log(JSON.stringify({
  ok: true,
  runtime: runtime.standard,
  runId: current.id,
  steps: current.steps.length,
  projectSlug: current.projectSlug,
  nativeRunId: nativeCurrent.id,
  nativeApproval: nativeApproval.type,
  nativeTaskDirectory: nativeCurrent.state.nativeImageTask.outputDir
}, null, 2));
