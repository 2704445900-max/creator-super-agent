import { fromJson, nowIso, toJson } from "./utils.js";

const ENTITY_SEEDS = [
  {
    type: "project",
    name: "新锐纪元",
    aliases: ["新锐纪元企划", "Xinrui Era"],
    summary: "近未来东方战术美少女 IP，以林小队对抗法特提、古蒂斯等暗面势力为主线，强调反对战争、尊重人性和中国式人文。",
    details: { coreTone: "科幻、战术、二次元、中国式人文、近未来现实底色" }
  },
  {
    type: "organization",
    name: "林小队",
    aliases: ["新锐", "三队", "协调局京城中心一处三队", "新锐试验作战分队"],
    summary: "主角团队，原为军方全员 00 后女性特殊作战分队，后转隶国家特别事务行动协调局。",
    details: { role: "主视角特种作战小队", principle: "保护普通人优先，精准处置，重视善后" }
  },
  {
    type: "organization",
    name: "国家特别事务行动协调局",
    aliases: ["协调局"],
    summary: "应对常规体制无法处理的非常规威胁的机构，林小队的母机构。",
    details: { headquarters: "京城", scope: "非常规威胁协调处置" }
  },
  {
    type: "organization",
    name: "法特提",
    aliases: ["FAITITY", "Fateoti", "技术派"],
    summary: "技术派暗面势力，主张新人类论，通过脑机接口、基因编辑、意识上传、认知战和资本渗透重写人类。",
    details: { ideology: "新人类论", seasonRole: "第一季主要对手" }
  },
  {
    type: "organization",
    name: "古蒂斯",
    aliases: ["GUDIS", "Gurtis", "复古派"],
    summary: "复古/神秘派暗线势力，主张回归论，依靠仪式、符号、生物路径和异常地点影响人类。",
    details: { ideology: "回归论", seasonRole: "第一季暗线，第二季浮出水面" }
  },
  {
    type: "organization",
    name: "影碟机构",
    aliases: ["影碟"],
    summary: "法特提认知战与宣传单位，负责舆论操控、情绪干预、信息战和年轻群体转化。",
    details: { parent: "法特提", function: "认知战单位" }
  },
  {
    type: "organization",
    name: "金海科技",
    aliases: [],
    summary: "法特提技术研发单位，涉及脑机接口、生物技术、AI、秘密实验室与非法人体实验。",
    details: { parent: "法特提", function: "技术研发单位" }
  },
  {
    type: "organization",
    name: "纽曼公司",
    aliases: ["纽曼生物科技公司"],
    summary: "法特提资本渗透与生物科技相关单位，涉及投资、并购、产业链控制和古生物/基因改造项目。",
    details: { parent: "法特提", function: "资本渗透单位" }
  },
  {
    type: "organization",
    name: "新人类论研究会",
    aliases: [],
    summary: "法特提理论包装单位，通过论文、论坛、演讲、科普书和纪录片包装新人类论。",
    details: { parent: "法特提", function: "理论包装单位" }
  },
  {
    type: "character",
    name: "林荫清",
    aliases: ["小林", "林姐", "队长", "Lin Yinqing"],
    summary: "林小队队长，温柔知性的指挥核心，技战术顶配，对敌冷酷，对战友与爱人温柔，有 PTSD 与长期失眠暗线。",
    details: { birthday: "2004-08-28", origin: "成都/京城", position: "战术指挥/突出手", weapon: "QBZ-191/QSZ-92" }
  },
  {
    type: "character",
    name: "唐舒嫣",
    aliases: ["小唐", "副队", "嫣姐", "Tang Shuyan"],
    summary: "林小队副队长与事实指导员，广州书香门第出身，文人皮囊下有行动尖刀与盾牌气质。",
    details: { birthday: "2003-08-17", origin: "广州", position: "副队长/行动组二把手" }
  },
  {
    type: "character",
    name: "赵婷婷",
    aliases: ["婷婷", "TT", "婷儿", "Zhao Tingting"],
    summary: "东北元气先锋，朴素正义感强，近距离格斗与突击作战担当，是队伍开心果和士气来源。",
    details: { birthday: "2004-12-30", origin: "齐齐哈尔", position: "战术副队长/先锋官" }
  },
  {
    type: "character",
    name: "刘伊七",
    aliases: ["小七", "七姐", "伊七", "Liu Yiqi"],
    summary: "渗透专家、情报获取与心理战担当，双重挂职，常年境外行动，八面玲珑但内心疲惫。",
    details: { birthday: "2005-09-17", position: "渗透专家/情报获取/心理战" }
  },
  {
    type: "character",
    name: "韩梦雪",
    aliases: ["小雪", "雪儿", "夜莺", "Han Mengxue", "Nightingale"],
    summary: "侦察兵、单兵渗透与精准射击角色，外表沉默冷静，内心有炽热的小世界和已故恋人创伤。",
    details: { birthday: "2006-12-21", origin: "河北", position: "侦察兵/单兵渗透/精准射击" }
  },
  {
    type: "character",
    name: "洛情轩",
    aliases: ["小洛", "洛姐", "部长", "Luo Qingxuan"],
    summary: "组织部长、政工干部、政治大脑和良心，守序但不死板，擅长统筹、思想工作与心理战。",
    details: { birthday: "2001-04-18", origin: "长沙", position: "组织部长/政工干部/远程精确射击位" }
  },
  {
    type: "character",
    name: "何墨缘",
    aliases: ["小何", "缘缘", "缘", "He Moyuan"],
    summary: "小可爱二人组之一，信息化作战参谋与赛博中枢，乐观开朗，擅长网络战、系统破解和设备维护。",
    details: { birthday: "2008-10-12", origin: "南京", position: "信息化作战参谋/信息系统维修工/副狙击手" }
  },
  {
    type: "character",
    name: "刘梦鸳",
    aliases: ["小刘", "鸳鸳", "鸳", "Liu Mengyuan"],
    summary: "小可爱二人组之一，无人化作战军官，外冷内热，擅长无人机操控、空中侦察和电子干扰。",
    details: { birthday: "2008-03-25", origin: "南京", position: "无人化作战军官/无人系统维护/副狙击手" }
  },
  {
    type: "character",
    name: "叶敏慧",
    aliases: ["小叶", "敏慧", "叶医生", "Ye Minhui"],
    summary: "林小队战地医疗、心理急救与健康主管，朝鲜族角色，设定中仍有若干待确认项。",
    details: { origin: "吉林延边待确认", position: "战地医疗/心理急救/全队健康主管", status: "待补全" }
  },
  {
    type: "character",
    name: "李熙然",
    aliases: ["熙然", "小李", "武痴", "Li Xiran"],
    summary: "延安出身的近战突击与武术格斗角色，传统武德和现代战士结合，人物弧光围绕“为什么动武”。",
    details: { birthday: "2005-05-12 待确认", origin: "陕西延安", position: "近战突击/武术格斗/冷兵器作战" }
  },
  {
    type: "character",
    name: "楚乔翼",
    aliases: ["乔翼", "翼姐", "老楚", "Chu Qiaoyi"],
    summary: "林小队盾位、重武器、工程兵、装备维护与食堂地基型角色，沉默务实，做的事比说的话多。",
    details: { birthday: "2005-05-01 待确认", origin: "唐山待确认", position: "重武器+盾位/工程兵/装备维护" }
  },
  {
    type: "character",
    name: "王明德",
    aliases: [],
    summary: "林荫清情感线关键人物，空间内已有角色资产，详细设定需要后续补齐。",
    details: { status: "待补全" }
  },
  {
    type: "event",
    name: "南境破袭行动",
    aliases: ["南境破袭A", "南境破袭B行动"],
    summary: "新锐分队前史关键行动，行动成功但给林荫清留下 PTSD 与长期失眠，也推动分队转隶协调局。"
  },
  {
    type: "event",
    name: "首都反颠覆行动",
    aliases: [],
    summary: "二纪226年，林小队首次以完整建制应对法特提的大规模认知干预与定点恐怖袭击。"
  },
  {
    type: "event",
    name: "T岛行动",
    aliases: ["T岛战斗", "解放T岛"],
    summary: "二纪227年夏的关键战役，林小队作为关键力量参与，韩梦雪完成与过去的告别。"
  },
  {
    type: "event",
    name: "何刘电站特别小组事件",
    aliases: ["何刘电站事件"],
    summary: "二纪227年初，法特提试图入侵华北电力系统，何墨缘与刘梦鸳带领特别小组阻断。"
  },
  {
    type: "project",
    name: "龙醒计划",
    aliases: [],
    summary: "空间中已有往期视频与故事板资产的剧集/视频计划，包含多集分镜、韩梦雪线与封面图等素材。"
  },
  {
    type: "project",
    name: "战火与玫瑰",
    aliases: ["战火与玫瑰-谍影重重", "古暗锋行动"],
    summary: "小说和项目介绍中的重要故事线，涉及法特提、纽曼公司、古生物复活、人口贩卖和林小队调查。"
  },
  {
    type: "term",
    name: "第二纪元",
    aliases: ["二纪"],
    summary: "本作正式纪年口径，约从公历1800年前后开始，二纪227年对应公历2027年。"
  },
  {
    type: "term",
    name: "认知干预",
    aliases: ["高精度认知干预技术"],
    summary: "可在人不察觉的前提下影响群体情绪倾向，是法特提和影碟机构的重要工具箱。"
  },
  {
    type: "term",
    name: "数字孪生人",
    aliases: ["数字替身"],
    summary: "基于某人网络数据生成的高保真 AI 分身，可用于冒充真人、监控或操控社交认知。"
  },
  {
    type: "term",
    name: "清醒环",
    aliases: ["非侵入式神经辅助器"],
    summary: "2027 日常科技水位中的消费级非侵入式脑机接口设备。"
  }
];

const RELATION_SEEDS = [
  ["林小队", "belongs_to", "国家特别事务行动协调局"],
  ["林小队", "opposes", "法特提"],
  ["林小队", "opposes", "古蒂斯"],
  ["影碟机构", "subunit_of", "法特提"],
  ["金海科技", "subunit_of", "法特提"],
  ["纽曼公司", "subunit_of", "法特提"],
  ["新人类论研究会", "subunit_of", "法特提"],
  ["林荫清", "member_of", "林小队"],
  ["唐舒嫣", "member_of", "林小队"],
  ["赵婷婷", "member_of", "林小队"],
  ["刘伊七", "member_of", "林小队"],
  ["韩梦雪", "member_of", "林小队"],
  ["洛情轩", "member_of", "林小队"],
  ["何墨缘", "member_of", "林小队"],
  ["刘梦鸳", "member_of", "林小队"],
  ["叶敏慧", "member_of", "林小队"],
  ["李熙然", "member_of", "林小队"],
  ["楚乔翼", "member_of", "林小队"],
  ["王明德", "connected_to", "林荫清"],
  ["何墨缘", "partner_of", "刘梦鸳"],
  ["刘梦鸳", "partner_of", "何墨缘"],
  ["T岛行动", "involves", "韩梦雪"],
  ["南境破袭行动", "involves", "林荫清"],
  ["何刘电站特别小组事件", "involves", "何墨缘"],
  ["何刘电站特别小组事件", "involves", "刘梦鸳"],
  ["龙醒计划", "uses_character", "韩梦雪"],
  ["战火与玫瑰", "uses_organization", "法特提"],
  ["战火与玫瑰", "uses_organization", "纽曼公司"]
];

export function seedDatabase(db) {
  const now = nowIso();
  const upsert = db.prepare(`
    INSERT INTO entities (type, name, aliases_json, summary, details_json, source, confidence, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(type, name) DO UPDATE SET
      aliases_json = excluded.aliases_json,
      summary = excluded.summary,
      details_json = excluded.details_json,
      source = excluded.source,
      confidence = excluded.confidence,
      updated_at = excluded.updated_at
    WHERE entities.source IS NULL OR entities.source = 'seed'
  `);

  db.exec("BEGIN");
  try {
    for (const entity of ENTITY_SEEDS) {
      upsert.run(
        entity.type,
        entity.name,
        toJson(entity.aliases ?? []),
        entity.summary ?? "",
        toJson(entity.details ?? {}),
        "seed",
        1,
        now,
        now
      );
    }

    const byName = new Map();
    for (const row of db.prepare("SELECT id, name FROM entities").all()) {
      byName.set(row.name, row.id);
    }

    const insertRelation = db.prepare(`
      INSERT OR IGNORE INTO entity_relations
        (source_entity_id, relation_type, target_entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const [sourceName, relationType, targetName] of RELATION_SEEDS) {
      const sourceId = byName.get(sourceName);
      const targetId = byName.get(targetName);
      if (sourceId && targetId) insertRelation.run(sourceId, relationType, targetId, toJson({ source: "seed" }), now);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getEntityTerms(db) {
  const rows = db.prepare("SELECT id, type, name, aliases_json, summary FROM entities").all();
  return rows.map((row) => ({
    ...row,
    aliases: fromJson(row.aliases_json, [])
  }));
}
