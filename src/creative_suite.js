import fs from "node:fs";
import path from "node:path";
import { getProjectRoot } from "./config.js";
import { nowIso } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();
const USER_HOME = process.env.USERPROFILE || process.env.HOME || "<USER_HOME>";
const PERSONAL_PLUGIN_ROOT = path.join(USER_HOME, "plugins");
const CODEX_PLUGIN_CACHE = path.join(USER_HOME, ".codex", "plugins", "cache");

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function pluginSourcePath(id) {
  return path.join(PERSONAL_PLUGIN_ROOT, id);
}

function listCacheVersions(scope, id) {
  const root = path.join(CODEX_PLUGIN_CACHE, scope, id);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function pluginStatus(plugin) {
  const sourcePath = plugin.scope === "personal" ? pluginSourcePath(plugin.id) : "";
  const cacheVersions = listCacheVersions(plugin.scope, plugin.id);
  return {
    ...plugin,
    installed: Boolean(cacheVersions.length || (sourcePath && fs.existsSync(sourcePath))),
    sourcePath,
    cacheVersions,
    latestCacheVersion: cacheVersions.at(-1) || ""
  };
}

const PLUGINS = [
  {
    id: "seedance-director",
    scope: "personal",
    label: "Seedance 2.0 Director Skill",
    role: "Seedance 2.0/2.5 director planning, 15-second segment prompts, first/end frame anchors, paid-generation gates.",
    githubReference: "",
    workbenchUse: "Use after storyboard QA and cost estimate; never run paid generation before gates pass.",
    endpoints: ["/api/pipeline/cost-estimate", "/api/storyboards/:id/image2-plan", "/api/storyboards/:id/board"]
  },
  {
    id: "remotion",
    scope: "openai-curated",
    label: "Remotion Motion Graphics",
    role: "Code-driven motion graphics, titles, HUD overlays, subtitle cards, social variants, and reusable animation components.",
    githubReference: "https://github.com/remotion-dev/remotion",
    workbenchUse: "Use for deterministic motion packages when the shot can be built from HTML/React/video assets instead of video-model generation.",
    endpoints: ["/api/pipeline/creative-suite", "/api/postproduction/video-plan"]
  },
  {
    id: "ui-ux-pro-max",
    scope: "personal",
    label: "UI/UX Pro Max HTML Skill",
    role: "Professional HTML workbench panels, dashboards, plugin UIs, responsive control surfaces, and exportable HTML prototypes.",
    githubReference: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    workbenchUse: "Use for the workbench UI pages, evidence cards, production dashboards, prompt editors, and HTML export packages.",
    endpoints: ["/api/pipeline/creative-suite"]
  },
  {
    id: "game-studio",
    scope: "openai-curated",
    label: "Game Studio",
    role: "Game prototyping and playable interaction planning.",
    githubReference: "",
    workbenchUse: "Use as a general game-production helper before Godot/Godogen-specific planning.",
    endpoints: ["/api/pipeline/creative-suite"]
  },
  {
    id: "godogen-game-design",
    scope: "personal",
    label: "Godogen / Godot Independent Game Design",
    role: "Independent game concepts, GDD, mechanics, level planning, Godot prototype roadmap, and IP-to-game adaptation.",
    githubReference: "https://github.com/godotengine/godot",
    workbenchUse: "Use when a project story, character, or mission should become a playable Godot prototype or design document.",
    endpoints: ["/api/pipeline/creative-suite"]
  },
  {
    id: "hyperframes",
    scope: "openai-curated",
    label: "Hyperframes Animation Design",
    role: "HTML/CSS/media-to-video animation pipeline for deterministic explainers, title cards, UI animations, and agent-rendered MP4.",
    githubReference: "https://github.com/heygen-com/hyperframes",
    workbenchUse: "Use when a shot is better expressed as designed HTML motion instead of image/video-model generation.",
    endpoints: ["/api/pipeline/creative-suite", "/api/postproduction/video-plan"]
  }
];

const GITHUB_REFERENCES = [
  {
    category: "motion",
    title: "Remotion",
    url: "https://github.com/remotion-dev/remotion",
    extractedUse: "React and TypeScript based video rendering; good for deterministic title/HUD/subtitle/short-form motion."
  },
  {
    category: "motion",
    title: "Remotion Bits",
    url: "https://github.com/av/remotion-bits",
    extractedUse: "Reusable Remotion animation snippets and component patterns."
  },
  {
    category: "html-video",
    title: "Hyperframes",
    url: "https://github.com/heygen-com/hyperframes",
    extractedUse: "HTML/CSS/media rendered into video; good for agent-controlled animation templates."
  },
  {
    category: "ui-ux",
    title: "UI/UX Pro Max Skill",
    url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    extractedUse: "Design-intelligence skill pattern for richer UI/UX production prompts."
  },
  {
    category: "ui-ux",
    title: "Open Design",
    url: "https://github.com/nexu-io/open-design",
    extractedUse: "Open design workflows and generated UI surfaces."
  },
  {
    category: "ui-ux",
    title: "HTML Anything",
    url: "https://github.com/nexu-io/html-anything",
    extractedUse: "HTML generation patterns useful for portable workbench panels."
  },
  {
    category: "game",
    title: "Godot Engine",
    url: "https://github.com/godotengine/godot",
    extractedUse: "Primary open-source game engine target for independent game prototypes."
  },
  {
    category: "game",
    title: "Godot Demo Projects",
    url: "https://github.com/godotengine/godot-demo-projects",
    extractedUse: "Reference prototypes for mechanics, scenes, and playable samples."
  },
  {
    category: "game",
    title: "Awesome Godot",
    url: "https://github.com/godotengine/awesome-godot",
    extractedUse: "Curated Godot plugins and resources for later project-specific selection."
  }
];

function inferMode(input = {}) {
  const explicitMode = compact(input.mode || input.route || input.pipelineMode).toLowerCase();
  if (["video", "motion", "ui", "game", "full"].includes(explicitMode)) return explicitMode;
  const text = compact([
    input.topic,
    input.title,
    input.intent,
    input.script,
    input.prompt,
    input.format
  ].filter(Boolean).join(" "));
  if (/game|godot|godogen|独立游戏|游戏|玩法|关卡|原型/i.test(text)) return "game";
  if (/html|ui|ux|网页|工作台|界面|dashboard|panel/i.test(text)) return "ui";
  if (/remotion|hyperframes|动效|字幕|HUD|标题|片头|motion/i.test(text)) return "motion";
  if (/seedance|视频模型|15秒|分镜|故事板|动画|手书|MV/i.test(text)) return "video";
  if (Number(input.targetDurationSec || input.durationSec || 0) > 0) return "video";
  return "full";
}

function buildRoutingPlan(mode) {
  const base = [
    {
      stage: "canon-and-asset-lock",
      plugin: "creator-super-agent",
      action: "Search local canon, identify character/prop/scene/style locks, and mark missing assets before any generation."
    },
    {
      stage: "external-reference",
      plugin: "creator-super-agent + browser",
      action: "When real-world props, cities, uniforms, weapons, vehicles, platforms, or art styles are not in the local library, research first and stage references as non-canon pending material."
    },
    {
      stage: "storyboard-and-visual-qa",
      plugin: "creator-super-agent",
      action: "Create timed storyboard, image-2 frame prompts, unified board spec, and run single-frame visual QA."
    }
  ];
  const routes = {
    video: [
      ...base,
      {
        stage: "seedance-director",
        plugin: "seedance-director@personal",
        action: "Convert storyboard into Seedance 2.0/2.5 15-second segment packs with first/end-frame anchors, camera notes, negative constraints, and cost stop rules."
      },
      {
        stage: "remotion-or-hyperframes-overlays",
        plugin: "remotion@openai-curated / hyperframes@openai-curated",
        action: "Use deterministic HTML/React motion for titles, HUD, captions, comparison cards, motion posters, and social variants."
      },
      {
        stage: "postproduction",
        plugin: "AE/PR local bridges",
        action: "Hand off generated assets to AE or PR for compositing, rhythm, subtitles, audio placeholders, and export notes."
      }
    ],
    motion: [
      ...base,
      {
        stage: "remotion",
        plugin: "remotion@openai-curated",
        action: "Build React/TypeScript motion sequences when deterministic layout, subtitles, HUD, or reusable templates matter."
      },
      {
        stage: "hyperframes",
        plugin: "hyperframes@openai-curated",
        action: "Build HTML/CSS media animations and renderable video specs for agent-controlled output."
      }
    ],
    ui: [
      {
        stage: "ux-brief",
        plugin: "ui-ux-pro-max@personal",
        action: "Define user workflow, dense workbench controls, responsive constraints, information hierarchy, and usable first-screen behavior."
      },
      {
        stage: "html-prototype",
        plugin: "ui-ux-pro-max@personal",
        action: "Create production-quality HTML/CSS/JS surfaces that fit the workbench conventions."
      },
      {
        stage: "integration",
        plugin: "creator-super-agent",
        action: "Connect the surface to workbench APIs and validate it in the browser."
      }
    ],
    game: [
      {
        stage: "ip-to-game-brief",
        plugin: "godogen-game-design@personal + game-studio@openai-curated",
        action: "Convert canon, character abilities, mission pressure, and art direction into a GDD and playable prototype scope."
      },
      {
        stage: "godot-prototype-plan",
        plugin: "godogen-game-design@personal",
        action: "Plan scenes, nodes, assets, interactions, camera, UI, save loop, and milestone tests for Godot."
      },
      {
        stage: "asset-reuse",
        plugin: "creator-super-agent",
        action: "Reuse local character, prop, scene, and storyboard references; mark missing sprites, UI, VFX, and audio."
      }
    ]
  };
  return routes[mode] || [
    ...routes.video,
    ...routes.ui,
    ...routes.game
  ];
}

export function getCreativePluginSuite() {
  return {
    standard: "creator-creative-plugin-suite-v1",
    checkedAt: nowIso(),
    pluginRoots: {
      personal: PERSONAL_PLUGIN_ROOT,
      cache: CODEX_PLUGIN_CACHE,
      project: PROJECT_ROOT
    },
    plugins: PLUGINS.map(pluginStatus),
    githubReferences: GITHUB_REFERENCES,
    workbenchEndpoints: [
      "GET /api/plugins/creative-suite",
      "POST /api/pipeline/creative-suite",
      "POST /api/workflow/plan",
      "POST /api/pipeline/prompt-refine",
      "POST /api/pipeline/visual-check",
      "POST /api/pipeline/cost-estimate",
      "POST /api/postproduction/video-plan"
    ],
    safeBoundaries: [
      "Plugins may create plans, prompts, local files, and deterministic prototypes automatically.",
      "Paid model generation, public publishing, and writing external research into canon still require explicit confirmation.",
      "External GitHub/browser references are guidance or technical dependencies, not project canon."
    ]
  };
}

export function createCreativeSuitePlan(input = {}) {
  const mode = inferMode(input);
  const topic = compact(input.topic || input.title || input.intent || "Creator creative project");
  const targetDurationSec = Number(input.targetDurationSec || input.durationSec || 15);
  const suite = getCreativePluginSuite();
  const routingPlan = buildRoutingPlan(mode);
  return {
    standard: "creator-creative-suite-routing-plan-v1",
    createdAt: nowIso(),
    topic,
    mode,
    targetDurationSec: Number.isFinite(targetDurationSec) && targetDurationSec > 0 ? targetDurationSec : 15,
    suite,
    routingPlan,
    workbenchIntegration: [
      {
        capability: "Seedance director",
        independentUse: "Call seedance-director skill directly for a 15-second segment pack.",
        workbenchUse: "Workbench routes through /api/pipeline/cost-estimate, /api/storyboards/:id/image2-plan, and /api/storyboards/:id/board before paid video generation."
      },
      {
        capability: "Remotion motion",
        independentUse: "Use remotion plugin for React/TypeScript motion components and rendered sequences.",
        workbenchUse: "Workbench uses it after visual QA for captions, title cards, HUD overlays, social variants, and deterministic motion shots."
      },
      {
        capability: "UI/UX Pro Max",
        independentUse: "Use ui-ux-pro-max skill for standalone HTML interfaces.",
        workbenchUse: "Workbench uses it for new panels, dashboards, prompt editors, evidence cards, and exportable HTML tools."
      },
      {
        capability: "Godogen / Godot design",
        independentUse: "Use godogen-game-design skill for GDDs, mechanics, level plans, and prototype scope.",
        workbenchUse: "Workbench uses it to transform project scripts and assets into playable prototype plans."
      },
      {
        capability: "Hyperframes",
        independentUse: "Use hyperframes plugin for HTML-to-video animation projects.",
        workbenchUse: "Workbench uses it for deterministic HTML motion, credits, explainers, UI animation, and video templates."
      }
    ],
    outputFolders: [
      "output/projects/<project>/01_text/",
      "output/projects/<project>/03_art/",
      "output/projects/<project>/04_storyboard/",
      "output/projects/<project>/05_animation/seedance2.0/",
      "output/projects/<project>/05_animation/remotion/",
      "output/projects/<project>/05_animation/hyperframes/",
      "output/projects/<project>/06_game/godot/",
      "output/projects/<project>/07_publishing/"
    ],
    nextActions: [
      "Run /api/workflow/plan for canon-first production scope.",
      "Run /api/pipeline/creative-suite when choosing between Seedance, Remotion, Hyperframes, UI, or Godot routes.",
      "Run /api/pipeline/visual-check before any final image or video model handoff.",
      "Run /api/pipeline/cost-estimate before any Seedance paid generation."
    ]
  };
}
