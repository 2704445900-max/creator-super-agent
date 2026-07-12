import fs from "node:fs";
import path from "node:path";
import { getOutputRoot } from "./config.js";
import { ensureDir, nowIso } from "./utils.js";
import { createResearchPlan } from "./research.js";
import { createCreativeSuitePlan } from "./creative_suite.js";

const PHOTOSHOP_EXE = "<ADOBE_ROOT>\\Adobe Photoshop 2021\\Photoshop.exe";
const PREMIERE_ROOT = "<ADOBE_ROOT>\\Adobe Premiere Pro 2022";
const AFTER_EFFECTS_EXE = "<ADOBE_ROOT>\\Adobe After Effects 2022\\Support Files\\AfterFX.exe";
const DAVINCI_STATUS = "not_installed";

const OUTPUT_ROOT = getOutputRoot();
const PACKAGE_ROOT = path.join(OUTPUT_ROOT, "portable-package");

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function detectTool(pathValue) {
  return fs.existsSync(pathValue) ? "available" : "missing";
}

export function getPostproductionStatus() {
  return {
    standard: "xinrui-postproduction-tool-status-v1",
    checkedAt: nowIso(),
    tools: {
      photoshop: {
        path: PHOTOSHOP_EXE,
        status: detectTool(PHOTOSHOP_EXE),
        useFor: "故事板总图排版、修图、标注、色彩校准、局部补面"
      },
      afterEffects: {
        path: AFTER_EFFECTS_EXE,
        status: detectTool(AFTER_EFFECTS_EXE),
        useFor: "手书/展示/MV型轻动画，角色呼吸、头发飘动、镜头微动、图层合成"
      },
      premiere: {
        path: PREMIERE_ROOT,
        status: detectTool(PREMIERE_ROOT),
        useFor: "粗剪、字幕、节奏、音频占位、发布前样片"
      },
      davinciResolve: {
        path: "",
        status: DAVINCI_STATUS,
        useFor: "达芬奇未安装时输出 XML/EDL/LUT 和调色交接说明"
      }
    }
  };
}

export function createRiggingWorkflowPlan(input = {}) {
  const purpose = compact(input.purpose || input.target || "AE 手书/展示型轻动画");
  const character = compact(input.character || "角色");
  return {
    standard: "xinrui-rigging-ae-workflow-v1",
    character,
    purpose,
    coreDecision: [
      {
        mode: "AE轻动画/手书/MV",
        recommendation: "使用连续完整角色底图 + 局部可动覆盖层。",
        reason: "脸、头发、身体连续区域不要硬切；硬切会在呼吸、头发飘动、身体微动时产生裂缝或重叠。"
      },
      {
        mode: "Spine/Live2D大动作骨骼",
        recommendation: "使用专业分层 PSD，手工补面、留重叠边、建立遮挡层级和枢轴。",
        reason: "单张立绘自动矩形切割只能跑通测试，不能保证商业级绑定。"
      }
    ],
    splitRules: [
      "脸、颈、胸腔、腰腹优先保留在连续底图，不做互斥硬切。",
      "头发、衣摆、袖口、披风、装饰、武器、终端等适合作为覆盖动层。",
      "所有可动层必须保留 4-12 像素重叠边，避免运动时露底。",
      "被遮挡区域不能自动伪造为正史结构，只能标注需补面。",
      "补面层命名用 FILL_ 前缀，参考层命名用 REF_ 前缀并默认隐藏。",
      "AE源文件交付优先，不默认导出 AVI；除非用户明确要求预览视频。"
    ],
    layerTemplate: [
      "BASE_CONTINUOUS_CHARACTER_no_cracks",
      "OVERLAY_hair_front_sway",
      "OVERLAY_hair_side_left/right",
      "OVERLAY_cloak_tail_left/right",
      "OVERLAY_sleeve_left/right",
      "OVERLAY_weapon_or_prop",
      "FILL_under_hair_face",
      "FILL_under_cloak_body",
      "GUIDE_axis_and_pivots",
      "REF_original_hidden"
    ],
    qaChecklist: [
      "放大 200% 检查脸部、刘海、颈部、腰腹、裙摆、手和武器交界处。",
      "测试最大呼吸幅度、头发摆动、身体微动后是否露出透明缝。",
      "检查图层顺序：底图在下，覆盖动层在上，补面在覆盖层下或底图上方。",
      "检查锚点：头发根部、袖口连接点、衣摆腰部、武器握持点。",
      "检查运动幅度：轻动画只做 1-4% 缩放/位移/旋转，不让角色结构变形。"
    ],
    outputRoots: [
      "output/rigging/",
      "output/after-effects/",
      "output/projects/<project>/05_animation/ae/"
    ],
    learnedFromLocalTest: "林荫清测试证明：互斥自动切层虽然能消除重叠，但会打断连续脸部/头发，AE运动后仍会出现裂缝；后续默认走连续底图方案。"
  };
}

export function createVideoProductionPlan(input = {}) {
  const topic = compact(input.topic || input.title || "新锐纪元短片");
  const format = compact(input.format || "手书/展示/MV型短片");
  return {
    standard: "xinrui-video-production-plan-v1",
    topic,
    format,
    toolStatus: getPostproductionStatus(),
    creativeSuite: createCreativeSuitePlan({
      topic,
      format,
      intent: input.intent || input.goal || "video production",
      targetDurationSec: input.targetDurationSec || input.durationSec || 15
    }),
    pipeline: [
      {
        id: "brief",
        title: "项目建档",
        output: "project.json、video-spec.md、asset-inventory.md",
        note: "先锁定受众、平台、时长、核心信息和画风。"
      },
      {
        id: "research",
        title: "外部参考与审美学习",
        output: "research-plan.json、external reference cards",
        note: "浏览器优先检索平台趋势、电影/动画/导演风格和现实装备/城市资料。"
      },
      {
        id: "art",
        title: "美术资产",
        output: "角色、服装、道具、场景、色彩板、风格锁",
        note: "缺失资产先进入待设计任务；统一画风后再调用 image-2。"
      },
      {
        id: "storyboard",
        title: "故事板",
        output: "连续分镜图、统一故事板总图、镜头参数、轴线和动线",
        note: "每格必须写清调度、画面、镜头、分镜图描述。"
      },
      {
        id: "ae",
        title: "AE动画",
        output: ".aep 源文件",
        note: "轻动画默认连续底图 + 局部覆盖层；不默认导出 AVI。"
      },
      {
        id: "remotion_hyperframes",
        title: "Remotion / Hyperframes motion",
        output: "React motion package or HTML-to-video package",
        note: "Use for deterministic title cards, HUD, subtitles, UI motion, social variants, and low-cost reusable animation shots."
      },
      {
        id: "premiere",
        title: "PR剪辑",
        output: ".prproj、字幕、音频占位、节奏说明",
        note: "根据平台做 15 秒、30 秒或中长视频节奏。"
      },
      {
        id: "davinci",
        title: "达芬奇交接",
        output: "XML/EDL/LUT/调色说明",
        note: "当前未安装达芬奇，先保留交接包。"
      },
      {
        id: "publish",
        title: "宣发与复盘",
        output: "B站标题、封面brief、简介、标签、人群画像、发布时间建议",
        note: "成片回来后结合平台数据、评论和知网检索式做复盘。"
      }
    ]
  };
}

export function createVideoReviewPlan(input = {}) {
  const title = compact(input.title || input.topic || "待复盘成片");
  const platform = compact(input.platform || "B站");
  return {
    standard: "xinrui-video-review-plan-v1",
    title,
    platform,
    requiredInputs: [
      "成片视频文件路径",
      "发布时间、标题、封面、简介、标签",
      "播放、完播、点赞、投币、收藏、转发、评论、弹幕数据",
      "账号近期同类内容数据",
      "评论区高频词和负反馈截图"
    ],
    audienceModel: [
      "核心人群：战术美少女/近未来科幻/原创动画/手书受众。",
      "潜在人群：B站二创、军事科普视觉党、动画分镜学习者、国创设定爱好者。",
      "风险人群：对军事细节敏感、对AI生成感敏感、对叙事门槛敏感的观众。"
    ],
    publishTimeHeuristic: [
      "学生向内容优先测试 18:00-22:30。",
      "短视频切片可测试 12:00-13:30 和 20:00-23:00。",
      "长视频/设定向内容优先周五晚、周六下午到晚上。",
      "最终以本账号历史数据复盘为准。"
    ],
    cnkiWorkflow: {
      rule: "需要用户账号或机构权限；工作台只给检索式、摘要模板和引用字段，不绕过权限。",
      suggestedQueries: [
        "B站 原创动画 受众 传播",
        "二次元 视频 平台 用户画像",
        "短视频 标题 封面 完播率",
        "动画手书 粉丝文化 传播机制",
        "军事题材 动画 青年受众"
      ],
      readingCard: ["题名", "作者", "年份", "样本", "核心结论", "可用于本账号的建议", "局限"]
    },
    researchPlan: createResearchPlan({
      query: `${platform} ${title} 受众 画像 发布时间 原创动画 手书`,
      focus: "academic_review bilibili short_video_trend"
    })
  };
}

export function createPortablePackagePlan() {
  ensureDir(PACKAGE_ROOT);
  const plan = {
    standard: "xinrui-portable-package-plan-v1",
    createdAt: nowIso(),
    packageRoot: PACKAGE_ROOT,
    include: [
      "<USER_HOME>\\plugins\\xinrui-ip-studio",
      "<WORKBENCH_ROOT>\\src",
      "<WORKBENCH_ROOT>\\public",
      "<WORKBENCH_ROOT>\\config",
      "<WORKBENCH_ROOT>\\package.json",
      "<WORKBENCH_ROOT>\\package-lock.json",
      "<WORKBENCH_ROOT>\\README.md",
      "<WORKBENCH_ROOT>\\data\\xinrui-ip-agent.sqlite",
      "<XINRUI_SOURCE_ROOT>（建议单独备份，体积可能很大）"
    ],
    excludeByDefault: [
      "output/rigging/*.avi",
      "node_modules",
      "tools/npm-cache",
      "临时渲染缓存",
      "未确认版权的外部参考图片原图"
    ],
    restoreSteps: [
      "在新电脑安装 Node.js 22 或更高版本。",
      "复制项目目录到同一路径，或修改 config/default.json 的 sourceRoot。",
      "运行 npm install。",
      "运行 npm run sync 重建本地资料索引。",
      "把插件目录复制到新电脑的用户 plugins 目录。",
      "通过 Codex 个人插件入口重新安装 xinrui-ip-studio。",
      "启动 npm run server，访问 http://127.0.0.1:8787。",
      "检查 Photoshop、AE、PR 路径；新电脑路径不同则在工作台设置中更新。"
    ],
    futureAutomation: {
      archiveName: "xinrui-ip-studio-portable-YYYYMMDD.zip",
      manifestFile: "portable-manifest.json",
      integrity: "建议为数据库、插件和配置生成 sha256 清单"
    }
  };
  const filePath = path.join(PACKAGE_ROOT, "portable-package-plan.json");
  fs.writeFileSync(filePath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(PACKAGE_ROOT, "README-portable.md"),
    [
      "# 新锐纪元工作台迁移方案",
      "",
      `生成时间：${plan.createdAt}`,
      "",
      "## 需要打包",
      ...plan.include.map((item) => `- ${item}`),
      "",
      "## 默认不打包",
      ...plan.excludeByDefault.map((item) => `- ${item}`),
      "",
      "## 新电脑恢复步骤",
      ...plan.restoreSteps.map((item, index) => `${index + 1}. ${item}`)
    ].join("\n"),
    "utf8"
  );
  return { ...plan, files: [filePath, path.join(PACKAGE_ROOT, "README-portable.md")] };
}
