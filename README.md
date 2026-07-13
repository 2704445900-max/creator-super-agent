# Creator Super Agent

A persistent, generic creator agent for script development, browser-first research, asset planning, Prompt V2, director storyboards, Codex native image generation, visual QA V2, video planning, post-production handoff and publishing analysis.

This public edition does not include any private project content pack, canon, local database, source asset, generated project or API key.

## Quick start

```powershell
npm install
Copy-Item .env.example .env
.\scripts\install_agent_plugins.ps1
npm start
```

Open `http://127.0.0.1:8787/`, select the generic workspace, enter a goal and start a persistent run.

Inside Codex, the default image route is built-in `image_gen` / `gpt-image-2`. Every generated image must be displayed inline in the current conversation, then versioned into the project and checked by visual QA V2. Direct API image calls and final visual approval remain gated.

See `docs/AGENT_USAGE.md` for the complete workflow and `docs/CONTENT_PACK_SPEC.md` for extension rules.