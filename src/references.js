import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";
import { ensureDir } from "./utils.js";

const EXTERNAL_PENDING_ROOT = path.join(getOutputRoot(), "external-references", "pending");

const SOURCE_CATALOG = [
  {
    id: "controlnet-webui",
    category: "github_visual_control",
    title: "ControlNet for Stable Diffusion WebUI",
    url: "https://github.com/Mikubill/sd-webui-controlnet",
    useFor: ["pose", "lineart", "depth", "canny", "image_control"],
    note: "参考其把姿态、线稿、深度、边缘等控制条件拆出来管理的工作流。"
  },
  {
    id: "comfyui",
    category: "github_visual_workflow",
    title: "ComfyUI",
    url: "https://github.com/Comfy-Org/ComfyUI",
    useFor: ["node_workflow", "image_video_generation", "parameter_control"],
    note: "参考其节点式工作流，把模型、参数、参考图和输出拆成可复用流程。"
  },
  {
    id: "comfyui-manager",
    category: "github_visual_workflow",
    title: "ComfyUI Manager",
    url: "https://github.com/Comfy-Org/ComfyUI-Manager",
    useFor: ["plugin_management", "custom_nodes"],
    note: "用于后续管理 ComfyUI 自定义节点的思路参考。"
  },
  {
    id: "comfyui-controlnet-aux",
    category: "github_visual_control",
    title: "ComfyUI ControlNet Auxiliary Preprocessors",
    url: "https://github.com/Fannovel16/comfyui_controlnet_aux",
    useFor: ["openpose", "dwpose", "canny", "depth", "hint_image"],
    note: "参考其预处理器思想，为角色动态、线稿和深度参考建立提示字段。"
  },
  {
    id: "dynamic-prompts",
    category: "github_prompt",
    title: "Stable Diffusion Dynamic Prompts",
    url: "https://github.com/adieyal/sd-dynamic-prompts",
    useFor: ["prompt_template", "wildcards", "variants"],
    note: "参考其模板、通配和变量结构，建立可复用提示词规范。"
  },
  {
    id: "clip-interrogator",
    category: "github_visual_tagging",
    title: "CLIP Interrogator",
    url: "https://github.com/pharmapsychotic/clip-interrogator",
    useFor: ["image_to_prompt", "visual_tagging", "asset_discrimination"],
    note: "参考图像转提示词和标签化思路，用于素材甄别与补充标签。"
  },
  {
    id: "adetailer",
    category: "github_quality",
    title: "ADetailer",
    url: "https://github.com/Bing-su/adetailer",
    useFor: ["face_review", "hand_review", "inpainting", "local_quality_check"],
    note: "参考其局部检测、遮罩和重绘思路，加入人物脸、手、装备复核。"
  },
  {
    id: "wiki-180-degree-rule",
    category: "wikipedia_film",
    title: "180-degree rule",
    url: "https://en.wikipedia.org/wiki/180-degree_rule",
    useFor: ["axis", "continuity_editing", "screen_direction"],
    note: "用于导演模式中的轴线、视线和行动方向一致性。"
  },
  {
    id: "wiki-30-degree-rule",
    category: "wikipedia_film",
    title: "30-degree rule",
    url: "https://en.wikipedia.org/wiki/30-degree_rule",
    useFor: ["shot_angle", "jump_cut_avoidance", "continuity_editing"],
    note: "用于连续镜头角度变化和避免无动机跳切。"
  },
  {
    id: "wiki-military-uniform",
    category: "wikipedia_military",
    title: "Military uniform",
    url: "https://en.wikipedia.org/wiki/Military_uniform",
    useFor: ["uniform", "rank_visual_logic", "costume_reference"],
    note: "用于理解军装作为制服系统的基本规则，不直接套用为 IP canon。"
  },
  {
    id: "wiki-military-camouflage",
    category: "wikipedia_military",
    title: "Military camouflage",
    url: "https://en.wikipedia.org/wiki/Military_camouflage",
    useFor: ["camouflage", "battle_dress", "vehicle_finish"],
    note: "用于迷彩、战术隐蔽和装备表面处理参考。"
  },
  {
    id: "wiki-us-army-equipment",
    category: "wikipedia_equipment",
    title: "List of equipment of the United States Army",
    url: "https://en.wikipedia.org/wiki/List_of_equipment_of_the_United_States_Army",
    useFor: ["weapon_reference", "vehicle_reference", "equipment_taxonomy"],
    note: "用于装备分类和命名参考，不直接决定当前项目装备设定。"
  }
];

const CATEGORY_MAP = {
  uniform: ["wikipedia_military", "wikipedia_equipment"],
  weapon: ["wikipedia_equipment", "wikipedia_military"],
  equipment: ["wikipedia_equipment", "wikipedia_military"],
  scene: ["wikipedia_film", "github_visual_workflow"],
  pose: ["github_visual_control", "github_visual_tagging"],
  prop: ["wikipedia_equipment", "github_visual_tagging"],
  storyboard: ["wikipedia_film", "github_visual_control", "github_prompt"],
  prompt: ["github_prompt", "github_visual_tagging"],
  quality: ["github_quality", "github_visual_control"],
  workflow: ["github_visual_workflow", "github_visual_control"]
};

const REAL_WORLD_REFERENCE_PACKS = {
  "type-81": {
    id: "type-81",
    label: "Type 81 rifle",
    category: "real_weapon",
    referenceRequirement: "source_image_required",
    sourceStatus: "external_reference_only",
    sourceUrls: [
      "https://en.wikipedia.org/wiki/Type_81_assault_rifle",
      "https://www.smallarmssurvey.org/sites/default/files/SAS_weapons-assault-rifles-Type81.pdf"
    ],
    imageSearchQueries: [
      "Type 81 assault rifle side view",
      "Chinese Type 81 rifle fixed stock side profile",
      "Type 81 vs Type 56 rifle visual identification",
      "81式自动步枪 侧面 外观"
    ],
    requiredVisualTraits: [
      "Chinese Type 81 assault rifle family, conventional non-bullpup layout",
      "Curved magazine in front of trigger guard and pistol grip",
      "AK-derived long silhouette but not a direct Type 56 / AK copy",
      "Readable front sight, muzzle section, receiver spacing, handguard and stock",
      "Use fixed-stock Type 81 unless Type 81-1 folding stock is explicitly requested",
      "Dark metal receiver with wood or dark handguard/stock depending on selected source reference"
    ],
    mustNotConfuseWith: [
      "AR-15",
      "M4A1",
      "HK416",
      "SCAR",
      "QBZ-95 bullpup",
      "QBZ-191 modern rifle",
      "generic sci-fi rifle",
      "pure Type 56 / AK copy"
    ],
    compositionRules: [
      "For final use, select a browser-reviewed side/profile source image or lineart reference.",
      "When held by a character, keep magazine, trigger guard, front sight, muzzle and stock readable.",
      "Avoid extreme foreshortening until the prop sheet passes visual QA.",
      "If output resembles AR/M4, QBZ-95, QBZ-191 or a generic AK, stop and repair the prop reference first."
    ],
    generationGate: {
      draftAllowed: true,
      finalAllowedWithoutSourceImage: false,
      requiredBeforeFinal: [
        "browser_search_done",
        "side_or_profile_reference_selected",
        "must_not_confuse_list_added_to_negative_prompt",
        "prop_geometry_lock_task_created",
        "visual_QA_passed_for_prop_geometry"
      ]
    }
  },
  "qbz-191": {
    id: "qbz-191",
    label: "QBZ-191 rifle",
    category: "real_weapon",
    referenceRequirement: "source_image_required",
    sourceStatus: "external_reference_only",
    sourceUrls: [
      "https://en.wikipedia.org/wiki/QBZ-191",
      "https://modernfirearms.net/en/assault-rifles/china-assault-rifles/qbz-191-2/",
      "https://commons.wikimedia.org/wiki/File:QBZ191Zhuhai.jpg",
      "https://commons.wikimedia.org/wiki/File:QBZ191zhuhai_(cropped).jpg",
      "https://commons.wikimedia.org/wiki/File:QBZ191_20250921.jpg"
    ],
    imageSearchQueries: [
      "QBZ-191 rifle side view transparent magazine optic",
      "QBZ-191 Zhuhai side profile rifle",
      "QBZ-191 assault rifle Picatinny rail telescopic stock",
      "QBZ-191 QMK-152 optic transparent magazine"
    ],
    requiredVisualTraits: [
      "Chinese PLA QBZ-191 standard rifle, conventional non-bullpup layout",
      "Magazine is in front of the trigger and pistol grip, never behind the grip",
      "Long continuous top Picatinny rail across receiver and handguard",
      "Compact Chinese-style prism optic or low military optic mounted on the rail",
      "Flip-up front and rear iron sights may be visible",
      "Dark polymer handguard with side slots and hard-edged modern receiver",
      "Adjustable telescoping stock with Chinese service-rifle silhouette",
      "Smoky transparent 30-round 5.8x42 magazine, moderately curved, with visible round silhouettes",
      "Standard rifle barrel proportion, front sight/gas block silhouette, compact muzzle device",
      "Functional selector, receiver pins, trigger guard, pistol grip and magazine well"
    ],
    mustNotConfuseWith: [
      "AR-15",
      "M4A1",
      "HK416",
      "SCAR",
      "QBZ-95 bullpup",
      "AK family",
      "generic sci-fi rifle",
      "fantasy sword-gun hybrid"
    ],
    compositionRules: [
      "For first pass, generate a clean side-profile prop sheet before putting the rifle into a character scene.",
      "When held by a character, keep the rifle nearly parallel to the image plane and at least 75% unobstructed.",
      "Use safe low-ready or patrol-ready pose; trigger finger straight outside trigger guard.",
      "Do not use extreme foreshortening until a prop sheet has passed visual QA.",
      "If the rifle is inaccurate after two attempts, stop character-image generation and create a dedicated prop reference sheet."
    ],
    generationGate: {
      draftAllowed: true,
      finalAllowedWithoutSourceImage: false,
      requiredBeforeFinal: [
        "browser_search_done",
        "at_least_two_visual_sources_reviewed",
        "prop_sheet_or_reference_image_selected",
        "must_not_confuse_list_added_to_negative_prompt",
        "visual_QA_passed_for_prop_geometry"
      ]
    }
  }
};

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function safeSlug(value) {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "real-world-object";
}

function normalizeRealWorldKey(value) {
  const raw = compact(value).toLowerCase();
  const withoutExclusions = raw
    .replace(/(?:not|must not|do not|don't|dont|不是|不要|不得|禁止|不允许|不能|勿|非|别).{0,24}(?:qbz[-\s]?191|191式|qbz191)/g, "")
    .replace(/(?:not|must not|do not|don't|dont|不是|不要|不得|禁止|不允许|不能|勿|非|别).{0,24}(?:type[-\s]?81|81式|qbz[-\s]?81|81 assault|81 automatic)/g, "");
  if (/type[-\s]?81|81式|qbz[-\s]?81|81 assault|81 automatic|chinese 81|中国81/.test(raw)) return "type-81";
  if (withoutExclusions !== raw && !/qbz[-\s]?191|191式|qbz191/.test(withoutExclusions)) return "";
  if (/qbz[-\s]?191|191式|qbz191/.test(withoutExclusions)) return "qbz-191";
  if (/qbz[-\s]?191|191式|qbz191/.test(raw)) return "qbz-191";
  return "";
}

function defaultRealWorldPack(query, focus) {
  const q = compact(query);
  return {
    id: safeSlug(q),
    label: q || "real-world object",
    category: focus || "real_world_reference",
    referenceRequirement: "source_image_required",
    sourceStatus: "external_reference_only",
    sourceUrls: [],
    imageSearchQueries: [
      `${q} side view reference`,
      `${q} front side back reference`,
      `${q} details close up`,
      `${q} official photo reference`
    ].filter((item) => item.trim()),
    requiredVisualTraits: [
      "Collect exact silhouette, proportions, materials, surface markings and functional parts from browser references.",
      "Separate source facts from local style conversion.",
      "Create a prop, costume, city, vehicle or scene reference sheet before final character integration."
    ],
    mustNotConfuseWith: [],
    compositionRules: [
      "First generate or select a clean reference sheet with readable orthographic or side-profile view.",
      "Do not hide key functional parts behind hands, body, motion blur, text or UI.",
      "Use image references or local visual QA before final output."
    ],
    generationGate: {
      draftAllowed: true,
      finalAllowedWithoutSourceImage: false,
      requiredBeforeFinal: [
        "browser_search_done",
        "visual_sources_reviewed",
        "reference_image_selected",
        "visual_QA_passed"
      ]
    }
  };
}

function sourceLinksMarkdown(result) {
  const pack = result.pack || {};
  const urls = pack.sourceUrls || [];
  const searchQueries = pack.imageSearchQueries || [];
  return [
    `# ${pack.label || result.query || "External Reference"} Source Links`,
    "",
    "## Direct Sources",
    ...(urls.length ? urls.map((url) => `- ${url}`) : ["- 待浏览器补充。"]),
    "",
    "## Image Search Leads",
    ...(searchQueries.length ? searchQueries.map((query) => `- ${query}`) : ["- 待补充。"]),
    "",
    "## Browser-First Rule",
    "- 先浏览器检索并筛选可靠来源。",
    "- 只提取事实、视觉特征和制作方法，不写入当前项目正史。",
    "- 至少选择一张可读参考图或本地参考板后，再进入正式生成。"
  ].join("\n");
}

function imageLeadsMarkdown(result) {
  const pack = result.pack || {};
  return [
    `# ${pack.label || result.query || "External Reference"} Image Leads`,
    "",
    ...(pack.imageSearchQueries || []).map((query) => `- ${query}`),
    "",
    "## Selection Checklist",
    "- 轮廓清楚，不被手、布料、文字或运动模糊遮挡。",
    "- 能看清正侧面比例、材质、功能部件和关键标识。",
    "- 现实物件优先选择官方、博物馆、百科、新闻、厂商或高可信摄影来源。",
    "- 选中的图必须记录来源链接和用途。"
  ].join("\n");
}

function visualTraitsMarkdown(result) {
  const pack = result.pack || {};
  return [
    `# ${pack.label || result.query || "External Reference"} Visual Traits`,
    "",
    "## Must Restore",
    ...((pack.requiredVisualTraits || []).map((item) => `- ${item}`)),
    "",
    "## Must Not Confuse With",
    ...((pack.mustNotConfuseWith || []).length ? pack.mustNotConfuseWith.map((item) => `- ${item}`) : ["- 待补充。"]),
    "",
    "## Composition Rules",
    ...((pack.compositionRules || []).map((item) => `- ${item}`)),
    "",
    "## Canon Boundary",
    ...(result.canonBoundary || []).map((item) => `- ${item}`)
  ].join("\n");
}

function styleConversionMarkdown(result) {
  const pack = result.pack || {};
  return [
    `# ${pack.label || result.query || "External Reference"} Style Conversion Notes`,
    "",
    "- 外部参考只保留结构、功能、材质和空间逻辑。",
    "- 转换到当前项目风格时，优先统一线条、材质分层、光色和角色身份锁。",
    "- 不把现实组织归属、政治含义、型号设定直接写进 IP 正史。",
    "- 若用户要求精确现实物件，正式图必须保留可核验轮廓；若风格化改造，需标注为合理推断或衍生设计。"
  ].join("\n");
}

function visualQaMarkdown(result) {
  const pack = result.pack || {};
  const gate = pack.generationGate || {};
  return [
    `# ${pack.label || result.query || "External Reference"} Visual QA Gate`,
    "",
    `- Draft allowed: ${gate.draftAllowed ? "yes" : "no"}`,
    `- Final allowed without source image: ${gate.finalAllowedWithoutSourceImage ? "yes" : "no"}`,
    "",
    "## Required Before Final",
    ...((gate.requiredBeforeFinal || []).map((item) => `- [ ] ${item}`)),
    "",
    "## Manual Review",
    "- [ ] 浏览器来源已记录。",
    "- [ ] 参考图已保存或可直接打开。",
    "- [ ] 视觉特征已提取。",
    "- [ ] 已确认是否进行当前项目风格化。",
    "- [ ] 已完成角色、道具、场景和手部/构图复核。"
  ].join("\n");
}

function persistRealWorldReferencePack(result, input = {}) {
  if (!input.persist && !input.writeFiles) return null;
  const pack = result.pack || {};
  const slug = safeSlug(input.slug || pack.id || result.query);
  const dir = path.join(EXTERNAL_PENDING_ROOT, slug);
  ensureDir(dir);
  const files = {
    directory: dir,
    referencePackJson: path.join(dir, "reference-pack.json"),
    sourceLinksMd: path.join(dir, "source-links.md"),
    imageLeadsMd: path.join(dir, "image-leads.md"),
    visualTraitsMd: path.join(dir, "visual-traits.md"),
    styleConversionNotesMd: path.join(dir, "style-conversion-notes.md"),
    visualQaMd: path.join(dir, "visual-qa.md")
  };
  fs.writeFileSync(files.referencePackJson, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  fs.writeFileSync(files.sourceLinksMd, `${sourceLinksMarkdown(result)}\n`, "utf8");
  fs.writeFileSync(files.imageLeadsMd, `${imageLeadsMarkdown(result)}\n`, "utf8");
  fs.writeFileSync(files.visualTraitsMd, `${visualTraitsMarkdown(result)}\n`, "utf8");
  fs.writeFileSync(files.styleConversionNotesMd, `${styleConversionMarkdown(result)}\n`, "utf8");
  fs.writeFileSync(files.visualQaMd, `${visualQaMarkdown(result)}\n`, "utf8");
  return files;
}

export function createRealWorldReferencePack(input = {}) {
  const query = compact(input.query || input.topic || input.object || input.prompt);
  const focus = compact(input.focus || input.category || "");
  const key = normalizeRealWorldKey(query);
  const pack = key ? REAL_WORLD_REFERENCE_PACKS[key] : defaultRealWorldPack(query, focus);
  const result = {
    standard: "creator-real-world-reference-pack-v1",
    createdAt: new Date().toISOString(),
    query,
    focus,
    pack,
    workflow: [
      "browser_search",
      "save_source_links_and_image_leads",
      "extract_visual_traits",
      "create_or_select_reference_sheet",
      "convert_to_xinrui_style",
      "run_visual_QA",
      "allow_final_generation_only_after_QA"
    ],
    storagePlan: {
      pendingRoot: "output/external-references/pending/",
      recommendedSubdir: `output/external-references/pending/${pack.id}/`,
      files: [
        "reference-pack.json",
        "source-links.md",
        "image-leads.md",
        "visual-traits.md",
        "style-conversion-notes.md",
        "visual-qa.md"
      ]
    },
    canonBoundary: [
      "External references are professional visual references only.",
      "They do not become project canon unless the user approves a setting proposal.",
      "For real weapons, uniforms, cities, maps, vehicles and props, final generation requires browser-reviewed visual sources or a selected local reference image."
    ]
  };
  const persisted = persistRealWorldReferencePack(result, input);
  return persisted ? {
    ...result,
    outputDir: persisted.directory,
    files: persisted,
    persisted
  } : result;
}

function detectFocus(query, requestedFocus) {
  const raw = `${requestedFocus || ""} ${query || ""}`.toLowerCase();
  const focuses = [];
  if (/军装|制服|uniform|服装/.test(raw)) focuses.push("uniform");
  if (/武器|枪|装备|weapon|rifle|gear/.test(raw)) focuses.push("weapon", "equipment");
  if (/场景|基地|街道|室内|scene|location|environment/.test(raw)) focuses.push("scene");
  if (/动作|姿态|pose|dynamic|openpose|dwpose/.test(raw)) focuses.push("pose");
  if (/道具|prop|物件/.test(raw)) focuses.push("prop");
  if (/分镜|镜头|storyboard|camera|axis|轴线/.test(raw)) focuses.push("storyboard");
  if (/提示词|prompt/.test(raw)) focuses.push("prompt");
  if (/修脸|手|质量|detail|inpaint/.test(raw)) focuses.push("quality");
  if (/comfy|workflow|插件|github/.test(raw)) focuses.push("workflow");
  return unique(focuses.length ? focuses : ["storyboard", "prompt", "workflow"]);
}

function getSourcesForFocus(focuses) {
  const categories = unique(focuses.flatMap((focus) => CATEGORY_MAP[focus] || []));
  return SOURCE_CATALOG.filter((source) => categories.includes(source.category) || source.useFor.some((item) => focuses.includes(item)));
}

function buildSearchUrls(query, focuses) {
  const q = compact(query) || "near future tactical anime storyboard reference";
  const focusWords = focuses.join(" ");
  const imageQuery = `${q} ${focusWords} reference`;
  return [
    {
      platform: "GitHub",
      label: "查找辅助插件和工作流",
      url: `https://github.com/search?q=${encodeURIComponent(`${q} ${focusWords} ComfyUI ControlNet prompt`)}&type=repositories`
    },
    {
      platform: "Wikipedia",
      label: "查找专业概念和分类",
      url: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(`${q} ${focusWords}`)}`
    },
    {
      platform: "Bing Images",
      label: "查找视觉参考图",
      url: `https://www.bing.com/images/search?q=${encodeURIComponent(imageQuery)}`
    },
    {
      platform: "Google Images",
      label: "查找更多视觉参考图",
      url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(imageQuery)}`
    }
  ];
}

export function getReferenceCatalog() {
  return {
    items: SOURCE_CATALOG,
    categories: CATEGORY_MAP,
    realWorldPacks: REAL_WORLD_REFERENCE_PACKS
  };
}

export function createReferencePlan(input = {}) {
  const query = compact(input.query);
  const focuses = detectFocus(query, input.focus);
  const sources = getSourcesForFocus(focuses);
  const realWorldReferencePack = createRealWorldReferencePack({
    query,
    focus: focuses.join(" ")
  });
  const shouldUseRealWorldPack = /QBZ|AK|M4|rifle|weapon|gun|uniform|city|map|vehicle|equipment|步枪|枪|武器|军装|城市|地图|车辆|装备/i.test(`${query} ${input.focus || ""}`);
  return {
    standard: "creator-professional-reference-v1",
    query,
    focuses,
    sources,
    realWorldReferencePack: shouldUseRealWorldPack ? realWorldReferencePack : null,
    searchUrls: buildSearchUrls(query, focuses),
    usageRules: [
      "外部资料只能作为专业参考、视觉参考或技术流程参考，不能直接成为当前项目 canon。",
      "角色、组织、事件、武器归属和世界观结论必须回到本地资料库校准。",
      "军装、武器、道具和场景参考要拆成可视属性：形状、材质、携行方式、功能逻辑、磨损程度。",
      "角色动态参考要拆成骨架姿态、重心、视线、手部动作、道具交互，不只写情绪形容词。",
      "用于图像或视频生成时，先生成参考计划，再进入视觉资产甄别和导演模式提示词。"
    ],
    localToolHandoff: [
      {
        tool: "Photoshop",
        useFor: "图像修补、分层合成、颜色校准、角色立绘清理、分镜图标注",
        rule: "只编辑副本，导出到 output/，保留原始素材。"
      },
      {
        tool: "Premiere Pro / DaVinci Resolve",
        useFor: "视频剪辑、镜头顺序、节奏、字幕、临时配乐、参考样片输出",
        rule: "保留项目文件和导出文件，素材引用路径写入交付说明。"
      },
      {
        tool: "ComfyUI / Stable Diffusion WebUI",
        useFor: "分镜图、参考图、角色动态和控制图生成",
        rule: "保存 workflow、seed、模型和参考图路径，便于复现。"
      }
    ]
  };
}
