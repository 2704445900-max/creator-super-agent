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
console.log(JSON.stringify({ ok: true, runtime: runtime.standard, runId: current.id, steps: current.steps.length, projectSlug: current.projectSlug }, null, 2));
