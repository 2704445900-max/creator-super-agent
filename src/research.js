const PLATFORM_SOURCES = [
  {
    id: "bilibili-creator",
    category: "platform",
    title: "B站创作中心",
    url: "https://member.bilibili.com/platform/home",
    useFor: ["bilibili", "topic", "cover", "title", "fan_feedback"],
    extraction: ["选题热度", "封面主体", "标题问题感", "弹幕/评论反馈", "完播与互动复盘"]
  },
  {
    id: "douyin-creator",
    category: "platform",
    title: "抖音创作者中心",
    url: "https://creator.douyin.com/",
    useFor: ["douyin", "short_video", "trend"],
    extraction: ["开头三秒钩子", "竖屏节奏", "热门话题", "音乐/挑战趋势"]
  },
  {
    id: "xiaohongshu-creator",
    category: "platform",
    title: "小红书创作服务平台",
    url: "https://creator.xiaohongshu.com/",
    useFor: ["xiaohongshu", "cover", "note"],
    extraction: ["封面可读性", "标题情绪", "收藏理由", "人群标签"]
  },
  {
    id: "youtube-creators",
    category: "platform",
    title: "YouTube Creators",
    url: "https://www.youtube.com/creators/",
    useFor: ["youtube", "shorts", "audience"],
    extraction: ["缩略图信息密度", "频道定位", "短视频节奏", "观众留存"]
  },
  {
    id: "tiktok-creative-center",
    category: "platform",
    title: "TikTok Creative Center",
    url: "https://ads.tiktok.com/creative/creativeCenter",
    useFor: ["tiktok", "trend", "creative_reference"],
    extraction: ["趋势声音", "热门标签", "广告创意结构", "跨平台短视频包装"]
  },
  {
    id: "instagram-creators",
    category: "platform",
    title: "Instagram Creators",
    url: "https://creators.instagram.com/",
    useFor: ["instagram", "reels", "visual_packaging"],
    extraction: ["Reels首帧", "人物主体", "文字覆盖", "生活化视觉包装"]
  },
  {
    id: "x-analytics",
    category: "platform",
    title: "X Analytics",
    url: "https://business.x.com/en/advertising/analytics",
    useFor: ["x", "topic_signal", "copywriting"],
    extraction: ["话题传播点", "短文案", "转发理由", "争议风险"]
  }
];

const FILM_LANGUAGE_SOURCES = [
  {
    id: "wiki-storyboard",
    category: "film_language",
    title: "Storyboard",
    url: "https://en.wikipedia.org/wiki/Storyboard",
    useFor: ["storyboard", "previsualization"],
    extraction: ["镜头意图", "画面构图", "动作连续性", "制作沟通"]
  },
  {
    id: "wiki-180-degree-rule",
    category: "film_language",
    title: "180-degree rule",
    url: "https://en.wikipedia.org/wiki/180-degree_rule",
    useFor: ["axis", "continuity", "screen_direction"],
    extraction: ["轴线", "视线方向", "行动方向", "越轴理由"]
  },
  {
    id: "wiki-30-degree-rule",
    category: "film_language",
    title: "30-degree rule",
    url: "https://en.wikipedia.org/wiki/30-degree_rule",
    useFor: ["shot_angle", "continuity"],
    extraction: ["角度差", "跳切避免", "镜头变化动机"]
  },
  {
    id: "wiki-continuity-editing",
    category: "film_language",
    title: "Continuity editing",
    url: "https://en.wikipedia.org/wiki/Continuity_editing",
    useFor: ["editing", "continuity"],
    extraction: ["空间连续", "时间连续", "动作衔接", "观众方位感"]
  },
  {
    id: "wiki-mise-en-scene",
    category: "film_language",
    title: "Mise-en-scene",
    url: "https://en.wikipedia.org/wiki/Mise-en-sc%C3%A8ne",
    useFor: ["blocking", "production_design"],
    extraction: ["场面调度", "布景", "服装", "光线", "表演位置"]
  }
];

const CLASSIC_FILM_SEEDS = [
  { title: "肖申克的救赎", titleEn: "The Shawshank Redemption", focus: ["希望叙事", "制度压迫", "长期伏笔回收"], useFor: "角色弧光和结尾回响" },
  { title: "霸王别姬", titleEn: "Farewell My Concubine", focus: ["时代与个人命运", "舞台/现实互文", "身份撕裂"], useFor: "人物关系和历史压力" },
  { title: "这个杀手不太冷", titleEn: "Leon", focus: ["冷硬动作与脆弱情感", "孤独人物组合", "道具记忆点"], useFor: "角色互补和危险日常感" },
  { title: "阿甘正传", titleEn: "Forrest Gump", focus: ["个人穿越时代", "朴素旁白", "情感母题"], useFor: "叙事视角和时代切片" },
  { title: "千与千寻", titleEn: "Spirited Away", focus: ["奇幻空间规则", "成长弧线", "环境即角色"], useFor: "场景概念和少女成长" },
  { title: "泰坦尼克号", titleEn: "Titanic", focus: ["灾难倒计时", "阶层空间", "爱情与宏大事件并行"], useFor: "中长剧结构与空间调度" },
  { title: "盗梦空间", titleEn: "Inception", focus: ["多层空间", "规则可视化", "动作剪辑平行推进"], useFor: "复杂设定可视化" },
  { title: "辛德勒的名单", titleEn: "Schindler's List", focus: ["黑白影像", "道德选择", "克制残酷"], useFor: "反战人文和影像克制" },
  { title: "机器人总动员", titleEn: "WALL-E", focus: ["低对白表演", "物件叙事", "孤独感"], useFor: "无对白镜头和道具情感" },
  { title: "攻壳机动队", titleEn: "Ghost in the Shell", focus: ["赛博都市", "身体与身份", "冷静动作"], useFor: "近未来战术美学" }
];

const ANIMATION_STUDY_SEEDS = [
  { title: "新世纪福音战士", region: "Japan", focus: ["心理压迫", "机体尺度", "静默镜头"], useFor: "情绪停顿和角色创伤" },
  { title: "机动警察", region: "Japan", focus: ["近未来公务系统", "机械可信度", "日常职场"], useFor: "战术装备生活化" },
  { title: "星际牛仔", region: "Japan", focus: ["音乐节奏", "类型片混搭", "孤独角色"], useFor: "MV型手书节奏" },
  { title: "Arcane", region: "US", focus: ["绘画质感", "角色微表情", "动作剪辑"], useFor: "高审美角色戏和分镜节奏" },
  { title: "Spider-Man: Into the Spider-Verse", region: "US", focus: ["漫画语言", "动态版式", "多风格统一"], useFor: "分镜图视觉层次" },
  { title: "Love, Death & Robots", region: "Global", focus: ["短篇概念", "风格实验", "强钩子"], useFor: "15秒/短剧创意密度" },
  { title: "86 -不存在的战区-", region: "Japan", focus: ["战争少年群像", "机甲战场", "反战主题"], useFor: "反战群像和战术调度" },
  { title: "Girls' Frontline", region: "China/Japan", focus: ["战术少女", "枪械拟人", "任务行动"], useFor: "战术美少女题材参照" },
  { title: "Blue Archive", region: "Korea/Japan", focus: ["角色辨识度", "校园与战术混合", "社群传播"], useFor: "角色商业化和日常反差" },
  { title: "明日方舟", region: "China", focus: ["工业幻想", "群像阵营", "冷色世界观"], useFor: "组织设定和视觉档案化" }
];

const DIRECTOR_STYLE_SEEDS = [
  { name: "黑泽明", focus: ["天气作为动作", "群体调度", "强烈运动方向"], useFor: "战场/行动戏的空间力" },
  { name: "宫崎骏", focus: ["飞行感", "生态与机械", "儿童视角成长"], useFor: "场景生命力和成长线" },
  { name: "押井守", focus: ["长静镜", "城市孤独", "哲学化科幻"], useFor: "近未来冷峻审美" },
  { name: "今敏", focus: ["现实与幻象剪辑", "心理空间", "匹配转场"], useFor: "梦境/意识流分镜" },
  { name: "新海诚", focus: ["光影天气", "城市青春", "景别情绪"], useFor: "场景氛围和情绪封面" },
  { name: "斯皮尔伯格", focus: ["清晰空间", "奇观与人物反应", "家庭/人文"], useFor: "观众可读性与角色反应镜头" },
  { name: "诺兰", focus: ["规则结构", "交叉剪辑", "时间压力"], useFor: "复杂任务与倒计时" },
  { name: "维伦纽瓦", focus: ["巨大空间", "克制表演", "声画压迫"], useFor: "近未来宏大场景和沉默张力" },
  { name: "王家卫", focus: ["情绪碎片", "色彩记忆", "错位关系"], useFor: "角色内心与MV型短片" },
  { name: "李安", focus: ["克制情感", "礼仪与压抑", "动作里的伦理"], useFor: "人物选择和代价" }
];

const CNKI_SOURCES = [
  {
    id: "cnki-home",
    category: "academic",
    title: "中国知网",
    url: "https://www.cnki.net/",
    useFor: ["paper_search", "audience_research", "media_studies"],
    note: "需要用户账号或机构权限；工作台只生成检索式和阅读摘要模板，不绕过访问限制。"
  },
  {
    id: "cnki-ai-search-guide",
    category: "academic",
    title: "知网 AI 增强检索说明",
    url: "https://lib.bsu.edu.cn/docs//2025-09/1127149488d542fba057fffc5defa45e.pdf",
    useFor: ["query_expansion", "literature_review"],
    note: "用于把成片复盘问题转成学术检索式和摘要卡片。"
  }
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => compact(value)).filter(Boolean))];
}

function detectResearchFocus(text, requestedFocus = "") {
  const raw = `${requestedFocus} ${text}`.toLowerCase();
  const focuses = [];
  if (/b站|哔哩|bilibili|封面|标题|简介|发布|宣发/.test(raw)) focuses.push("bilibili");
  if (/抖音|douyin|tiktok|短视频|热点|趋势/.test(raw)) focuses.push("short_video_trend");
  if (/小红书|xiaohongshu|种草|笔记/.test(raw)) focuses.push("xiaohongshu");
  if (/youtube|油管|shorts/.test(raw)) focuses.push("youtube");
  if (/instagram|ins|reels/.test(raw)) focuses.push("instagram");
  if (/twitter|推特|x平台|传播/.test(raw)) focuses.push("x");
  if (/电影|导演|top250|豆瓣|审美|风格/.test(raw)) focuses.push("classic_film");
  if (/动漫|动画|anime|animation|手书|mv/.test(raw)) focuses.push("animation");
  if (/视听语言|分镜|镜头|调度|轴线|剪辑/.test(raw)) focuses.push("film_language");
  if (/知网|论文|受众|人群|画像|复盘/.test(raw)) focuses.push("academic_review");
  return unique(focuses.length ? focuses : ["classic_film", "animation", "film_language", "bilibili"]);
}

function buildSearchUrls(query, focuses) {
  const q = compact(query) || "当前项目 动画 分镜 审美 参考";
  const urls = [
    { platform: "豆瓣电影 Top250", label: "经典电影样本入口", url: "https://movie.douban.com/top250" },
    { platform: "B站", label: "站内搜索同题材动画/手书/战术美少女", url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(q)}` },
    { platform: "B站热门", label: "观察当日热门包装方式", url: "https://www.bilibili.com/v/popular/all" },
    { platform: "YouTube", label: "查海外短片/MV/动画参考", url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} animation short storyboard`)}` },
    { platform: "Google", label: "查导演风格和分镜解析", url: `https://www.google.com/search?q=${encodeURIComponent(`${q} cinematography storyboard analysis`)}` },
    { platform: "CNKI", label: "知网检索入口", url: `https://www.cnki.net/` }
  ];
  if (focuses.includes("short_video_trend")) {
    urls.push({ platform: "TikTok Creative Center", label: "全球短视频趋势", url: "https://ads.tiktok.com/creative/creativeCenter" });
  }
  if (focuses.includes("xiaohongshu")) {
    urls.push({ platform: "小红书创作服务平台", label: "小红书封面与笔记趋势", url: "https://creator.xiaohongshu.com/" });
  }
  return urls;
}

function sourcesForFocus(focuses) {
  const items = [];
  if (focuses.some((focus) => ["bilibili", "short_video_trend", "xiaohongshu", "youtube", "instagram", "x"].includes(focus))) {
    items.push(...PLATFORM_SOURCES);
  }
  if (focuses.includes("film_language")) items.push(...FILM_LANGUAGE_SOURCES);
  if (focuses.includes("academic_review")) items.push(...CNKI_SOURCES);
  return items;
}

export function getResearchCatalog() {
  return {
    standard: "creator-research-catalog-v1",
    platformSources: PLATFORM_SOURCES,
    filmLanguageSources: FILM_LANGUAGE_SOURCES,
    classicFilmSeeds: CLASSIC_FILM_SEEDS,
    animationStudySeeds: ANIMATION_STUDY_SEEDS,
    directorStyleSeeds: DIRECTOR_STYLE_SEEDS,
    cnkiSources: CNKI_SOURCES
  };
}

export function createResearchPlan(input = {}) {
  const query = compact(input.query || input.topic || "");
  const focuses = detectResearchFocus(query, input.focus);
  return {
    standard: "creator-aesthetic-research-plan-v1",
    query,
    focuses,
    browserFirstRule: "本地资料库没有明确答案时，先浏览器检索；只提取事实、视觉特征、结构方法和参考图片线索，不直接写入正史。",
    localStagingRoot: "output/external-references/pending/",
    sources: sourcesForFocus(focuses),
    searchUrls: buildSearchUrls(query, focuses),
    extractionCards: [
      "事实卡：对象是什么、来源链接、发布日期或版本、可信度、是否与本地正史冲突。",
      "视觉卡：轮廓、材质、配色、比例、使用方式、可改造成当前项目风格的部分。",
      "分镜卡：镜头大小、机位、运动、轴线、剪辑点、观众获得的信息。",
      "平台卡：标题结构、首帧/封面、前3秒钩子、互动设计、评论区关键词。",
      "学术卡：论文题名、作者、核心观点、适用到受众分析/传播策略的结论。"
    ],
    styleConversionGate: [
      "外部参考先进入待处理目录，由用户选择是否本地化。",
      "本地化时必须标注：资料库确认 / 合理推断 / 待确认。",
      "武器、军装、城市地图等现实对象只保留功能和视觉逻辑，不默认绑定到 IP 正史。",
      "生成图像前必须形成角色、道具、场景、风格四类锁定清单。"
    ],
    aestheticSeeds: {
      classicFilms: CLASSIC_FILM_SEEDS,
      animations: ANIMATION_STUDY_SEEDS,
      directors: DIRECTOR_STYLE_SEEDS
    }
  };
}
