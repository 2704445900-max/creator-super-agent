# Creator Super Agent Usage

This public edition is a project-neutral production agent. It contains no private IP canon, character assets, account profile, local database, generated media or credentials.

## Default workflow

1. Create or select a generic workspace and content pack.
2. Enter the project goal, script, duration and budget.
3. Let the agent research missing real-world details in the browser and save pending references for review.
4. Build the asset inventory, visual bible, Prompt V2 and director storyboard.
5. Use Codex built-in `image_gen` / `gpt-image-2` for image generation.
6. Display every generated image inline in the current conversation. A text-only success message or local path is incomplete.
7. The browser workbench cannot dispatch into the active Codex conversation; copy and send the task's `handoff.instruction` in Codex.
8. Import every selected image into the project through the native-image endpoint so it receives a version, prompt hash and image hash.
9. Run visual QA V2. Repair local defects or regenerate structural failures; stop automatic repair after two rounds.
10. Assemble the unified storyboard only from approved frames.
11. Continue to Seedance, Remotion, Hyperframes, AE, PR or another configured post-production route.
12. Review publishing, audience and cost recommendations before export.

## Codex native image route

- `POST /api/pipeline/prompt-refine`
- `POST /api/pipeline/native-image/task`
- call Codex built-in `image_gen`
- display the generated image inline in the current conversation
- note that the browser cannot auto-send; copy `handoff.instruction` into Codex
- `POST /api/pipeline/native-image/import`
- `POST /api/pipeline/visual-check`
- `POST /api/pipeline/native-image/repair` when required

Direct image API calls are optional and may cost extra according to the configured provider. The Codex native route uses the image capability available in the current Codex or ChatGPT environment; plan limits and charges depend on that account and platform.

## Safety boundaries

- Never commit `.env`, API keys, local databases, private content packs or generated client assets.
- External references remain research material until a user explicitly approves local adaptation.
- Real weapons, uniforms, vehicles, maps and identifiable locations require browser reference collection before final generation.
- Final image generation and publishing remain approval-gated.
