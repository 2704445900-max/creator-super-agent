# Creator Super Agent

A persistent, generic creator agent for script development, browser-first research, asset planning, director storyboards, cloud image generation, visual QA, video planning, post-production handoff and publishing analysis.

This public edition does not include the Xinrui private content pack, private canon, local databases, source assets, generated projects or API keys.

## Quick start

```powershell
npm install
Copy-Item .env.example .env
.\scripts\install_agent_plugins.ps1
npm start
```

Open `http://127.0.0.1:8787/`, select the generic workspace, enter a goal and start a persistent run.

The default image route is ChatGPT/OpenAI `gpt-image-2` or an explicitly configured compatible cloud image model. Paid image calls and final visual approval remain gated.

See `docs/AGENT_USAGE.md` for the complete workflow and `docs/CONTENT_PACK_SPEC.md` for extension rules.