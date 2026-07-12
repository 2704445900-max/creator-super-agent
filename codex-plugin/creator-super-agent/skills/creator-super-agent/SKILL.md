---
name: creator-super-agent
description: "Use for a generic, persistent, full-pipeline creator agent that is not bound to the Xinrui private IP library: browser-first research, project setup, script review, asset inventory, prompt refinement, ChatGPT/OpenAI or compatible cloud image generation, visual QA, director storyboards, Seedance planning, AE/PR/Remotion/Hyperframes handoff, publishing, and finished-work review."
---

# 全流程创作超级智能体

Use this skill for original or third-party projects that must remain isolated from 新锐纪元 private canon. The default workbench is `http://127.0.0.1:8787` and the default workspace is `creator-default` with content pack `creator-generic`.

## Hard Boundary

- Never query or reuse 新锐纪元 characters, canon, visual references, scripts, account profiles, or private files in generic mode.
- Treat only the current project's supplied material and approved external references as project canon.
- Put unapproved web findings in the project's `02_research/external_pending/` area.
- Do not overwrite source material, spend paid model credits, or publish externally without the required approval.

## Default Execution

When the user gives a clear creative command, create and run a persistent agent task instead of stopping at advice.

1. Resolve `creator-default` or create a new generic workspace.
2. Start `POST /api/agent/runs` with the goal, script, duration, budget, account profile, and whether images are required.
3. Poll `GET /api/agent/runs/<id>` until the task completes, fails, or waits for approval.
4. Preserve the project slug and use it on all downstream outputs.
5. For paid image generation, present the approval and continue only after explicit approval.
6. After image generation, inspect identity, outfit, prop, anatomy, hands, composition, space, style, continuity, and 180-degree axis before approving the visual gate.
7. Resume the task to video planning, publishing, and portable archiving.

The runtime persists steps, events, approvals, errors, and outputs in SQLite and recovers interrupted running tasks after service restart.

## Image Policy

- Primary route: ChatGPT/OpenAI `gpt-image-2` or another explicitly configured image-capable cloud multimodal model.
- When Codex has a native image generation tool, use it for direct ChatGPT image creation; persist the prompt, reference choices, output path, and QA result in the project.
- When using the workbench, use `/api/pipeline/image-generate` for text-to-image and `/api/pipeline/reference-image-generate` for real reference conditioning or image editing.
- ComfyUI is optional fallback only. Do not make it the default requirement.
- If the request names a real weapon, vehicle, uniform, city, map, prop, architecture, or professional object, browse first and use actual image references. Prompt-only approximation is not an acceptable final route.
- A generated image cannot enter final video production until visual QA passes.

## Research Policy

Use the browser whenever the local project does not contain enough information about a factual object, location, visual style, platform trend, audience, technique, or production method.

- Prefer primary sources and multiple visual references for real-world objects.
- Record source links, date, visual traits, ambiguity, rights status, and whether local style conversion is approved.
- External material is reference evidence, not canon.
- Respect authentication and access restrictions for CNKI and other paid databases.

## Project Pipeline

The normal order is:

1. project brief and account goal;
2. script four-layer review and correction;
3. asset inventory and missing-design tasks;
4. browser-first research and reference staging;
5. prompt expansion and continuity locks;
6. shot timing, blocking, camera, axis, and director storyboard;
7. cloud image generation and per-frame visual QA;
8. Seedance 2.0/2.5 cost-controlled video plan;
9. AE/PR, Remotion, Hyperframes, CapCut, or DaVinci handoff as appropriate;
10. title, cover, description, tags, publish timing, audience analysis, and post-release review;
11. portable export and project archive.

Use existing installed skills for specialized stages: `seedance-director`, `remotion-best-practices`, `hyperframes`, `after-effects-mcp-local`, `premiere-pro-mcp-local`, `capcut-mate`, `ui-ux-pro-max`, and `godogen-game-design` when relevant.

## API Surface

- `GET /api/content-packs`: inspect available packs.
- `GET /api/workspaces`: inspect isolated workspaces.
- `POST /api/workspaces`: create a workspace for a new project family or account.
- `GET /api/account-profiles`: list platform/account profiles.
- `POST /api/account-profiles`: create or update an account profile.
- `GET /api/agent/runtime`: runtime, image policy, counts, workspaces, and packs.
- `POST /api/agent/runs`: create a persistent full-pipeline run.
- `GET /api/agent/runs/<id>`: read steps, outputs, approvals, and state.
- `GET /api/agent/runs/<id>/events`: read incremental events.
- `POST /api/agent/runs/<id>/approve`: approve or reject the current gate.
- `POST /api/agent/runs/<id>/resume`: resume a paused run.
- `POST /api/agent/runs/<id>/cancel`: cancel while preserving outputs.

See `references/agent-api.md` for request examples.

## Completion Standard

Do not call a project complete because a plan exists. Confirm the required project files, asset inventory, storyboard data, generated keyframes when requested, visual QA, video plan, publishing package, and archive are present. State clearly when an external model, browser login, or desktop application still requires user interaction.
