import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outDir = path.resolve("output");
const markdownPath = path.join(outDir, "和平与玫瑰撤侨行动-新世界观彻底修订方案与草案.md");
const docxPath = path.join(outDir, "和平与玫瑰撤侨行动-新世界观彻底修订方案与草案.docx");
const catalogJsonPath = path.join(outDir, "和平与玫瑰撤侨行动-17K公开目录.json");
const catalogCsvPath = path.join(outDir, "和平与玫瑰撤侨行动-17K公开目录.csv");

const bookApi =
  "https://api.17k.com/v2/book/3088294/volumes?app_key=4037465544&client_type=2&_versions=99999&_access_version=2";

function zhDate(ms) {
  if (!ms) return "未标注";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function fetchBook() {
  const response = await fetch(bookApi, {
    headers: { "user-agent": "okhttp/3.12.1" },
  });
  if (!response.ok) {
    throw new Error(`17K API request failed: ${response.status}`);
  }
  const json = await response.json();
  if (json?.status?.code !== 0) {
    throw new Error(`17K API returned ${json?.status?.code}: ${json?.status?.msg}`);
  }
  return json.data;
}

function getBodyChapters(book) {
  return book.volumes
    .find((volume) => volume.volume_code === 200 || volume.code === 200)
    .chapters.map((chapter) => ({
      index: chapter.index,
      id: chapter.chapter_id,
      name: chapter.chapter_name,
      words: chapter.word_count,
      publishDate: zhDate(chapter.publish_date),
    }));
}

function sumWords(chapters) {
  return chapters.reduce((sum, chapter) => sum + Number(chapter.words || 0), 0);
}

function oldCatalogGroups(chapters) {
  const ranges = [
    {
      range: "1-21",
      title: "早期战场与队伍成形",
      old: "迷茫、希望、战斗、坦克会战、海军行动等早期热血战斗段落。",
      action:
        "保留“年轻女兵在战火中成长”的情感核心，删除重复番外和松散爽点，把它改为林小队前史闪回与南境破袭行动的心理来源。",
    },
    {
      range: "22-39",
      title: "渗透、撤离与无人区",
      old: "巷战、渗入行动、潜入行动、撤离行动、穿越水线。",
      action:
        "合并为第一卷主线：港区情报渗透。刘伊七和韩梦雪承担侦察与潜入，唐舒嫣负责政治判断和现场纪律。",
    },
    {
      range: "40-60",
      title: "“澡盆”行动与大逃亡",
      old: "澡盆行动、团聚前夜、希望归零、逃亡、伏击、巷战、俘虏。",
      action:
        "改写为撤侨车队在陆路走廊中的三次危机：检查站、难民潮、友军误判。把“路匪”改成被法特提外包网络操纵的地方武装。",
    },
    {
      range: "61-73",
      title: "海空联合作战与新起点",
      old: "华夏空军、联合作战、进城、火场与战场、获救。",
      action:
        "保留海空协同的宏观气势，但从细节炫技改为非战斗人员撤离、空地识别、医疗后送和舆论掩护。",
    },
    {
      range: "74-109",
      title: "第二大章：丛林、坦克与小队扩张",
      old: "我在哪里、西北风、目标丛林、99A、坦克冲锋、小队员加入。",
      action:
        "压缩为中段支线：救援失踪工程队与证人。坦克段落不再作为主角外挂，改成战场遗留装备和友邻单位支援。",
    },
    {
      range: "110-131",
      title: "撤侨行动序列",
      old: "老友相聚、火力全开、死里逃生、至暗时刻、回到国内、大弟内鬼等。",
      action:
        "这是旧书最适合保留的骨架。重命名为“使馆名单线”，用连续倒计时推进撤侨，不再使用“大弟”等临时称呼。",
    },
    {
      range: "132-149",
      title: "接你回家、高铁、起飞、击落、怪物决战",
      old: "归家、检查站与大巴车、目标蓝天、击落、决战怪物。",
      action:
        "改成“回家路被切断”：运输机遇袭后迫降，所谓怪物改为法特提违规人体增强和认知干预的失败产物，不写成脸谱化怪兽。",
    },
    {
      range: "150-179",
      title: "中东线、落幕之声与二次危机",
      old: "目标中东、推进、战事再起、落幕之声、归途、黑暗再临。",
      action:
        "保留为第二撤离点。功能是揭露法特提把撤侨混乱当作人口筛选、数据转运和舆论操纵的掩护。",
    },
    {
      range: "180-199",
      title: "深海谜团、战争开始与回家",
      old: "深海谜团、重获希望、战争开始、胜利结束、回家。",
      action:
        "改为信息战真相揭露：海底数据仓与货船线路只是证据链，不作为硬科幻奇观主线。结尾让林荫清第一次意识到敌人不是一支军队，而是一套系统。",
    },
    {
      range: "200-226",
      title: "南极篇与终章",
      old: "大量重复命名的南极首战、南极、自然的选择、南极决战、终章。",
      action:
        "大幅压缩为尾声和下一季钩子。南极不再是随机换地图，而是法特提极地科研外壳、旧实验档案和第二季古暗锋暗线的入口。",
    },
  ];

  return ranges.map((group) => {
    const [start, end] = group.range.split("-").map(Number);
    const selected = chapters.filter((chapter) => chapter.index >= start && chapter.index <= end);
    return {
      ...group,
      chapters: selected.length,
      words: sumWords(selected),
      sample: selected.slice(0, 5).map((chapter) => chapter.name).join("；"),
    };
  });
}

function buildMarkdown(book, chapters) {
  const groups = oldCatalogGroups(chapters);
  const totalWords = sumWords(chapters);
  const catalogLines = chapters.map(
    (chapter) => `${chapter.index}. ${chapter.name}（${chapter.words}字，${chapter.publishDate}，ID ${chapter.id}）`,
  );

  const groupTable = groups
    .map(
      (group) =>
        `| ${group.range} | ${group.title} | ${group.chapters} | ${group.words} | ${group.action} |`,
    )
    .join("\n");

  return `# 《和平与玫瑰撤侨行动》新世界观彻底修订方案与草案

## 生成说明

本文件依据三类材料整理。

- 外部链接：用户提供的 17K 作品链接及 17K 公开接口。接口可确认书名、作者、简介、分类、字数、完结状态和 227 条目录记录。
- 本地资源库：新锐纪元 IP 数据库已索引的世界观改革重塑文档、角色人物志、前传《铁流东渡：台海战争篇》整理稿、剧作原则文档和军事/文学参考素材。
- 修订原则：一切以“新锐纪元”新世界观为准，不把旧作中已经落后的现实战争幻想、脸谱化敌人和临时爽点当作正史。

重要边界：17K 正文页面触发站点防护，公开接口稳定返回的是元数据和目录，不稳定返回逐章正文。因此本稿不是旧文逐句校改稿，而是可直接用于重写的“完整修订蓝图、删改清单、重构大纲与样章草案”。后续若把原始全文 docx/txt 放入本地资源库，可按本稿继续做逐章润色与成稿替换。

## 原作档案

- 原书名：${book.book_name}
- 作者：${book.author_name}
- 17K 书号：${book.book_id}
- 分类：${book.category_name_1} / ${book.category_name_2}
- 关键词：${book.keyword}
- 公开字数：${book.word_count} 字
- 正文目录：${chapters.length} 章，目录合计 ${totalWords} 字
- 创建日期：${zhDate(book.created_at)}
- 首章 ID：${book.first_chapter_id}
- 最后更新：${zhDate(book.last_update_chapter_date)}，《${book.last_update_chapter_name}》
- 完结日期：${zhDate(book.finish_date)}
- 原简介摘录：${String(book.intro || "").replace(/\n/g, " ")}

## 总体判断

这本书最值得保留的东西不是旧式战争爽点，而是“年轻女兵在国家危难和海外混乱中承担责任”的情感根。它的问题也很清楚：章节命名混乱，战斗段落的因果链不足，敌人常被写成临时靶子，角色有时服务于场面而不是服务于人物弧光，后期南极线像换地图升级，和前面的撤侨主题连接不足。

新版本建议更名为《和平与玫瑰：归航名单》或《和平与玫瑰：撤侨行动》。它应成为新锐纪元的前传长篇：林小队从军方特殊作战分队转向国家特别事务行动协调局的过渡期故事。公开任务是海外撤侨，真实暗线是法特提外围组织借地区冲突进行认知干预、人口筛选、实验数据转运。这样既保留“撤侨”的家国情绪，也能把新世界观中的协调局、法特提、现代信息化战争和队员人物志全部接上。

## 核心修订方向

### 1. 语言与文本层

- 统一章节格式。旧目录中“第一章第一期”“第一章第七篇”“第六章·”“撤侨行动序列20”等命名混杂，新稿统一为“卷、章、标题、场景功能”。
- 修正明显错字和病句标题。例如“初步形式”改为“初步形势”，“生里逃死”改为“死里逃生”，“回家惹”改为“归航”，“解决先敌”改为“先敌处置”或直接换成剧情标题。
- 删除网络口水和临时感叹式命名。章节标题不再出现“大弟退散”“多多益善”这类与军事叙事气质冲突的表达。
- 降低夸饰性口号。战斗场景不靠连续感叹号和热血宣言推动，而靠目标、限制、代价、选择推动。
- 对话分层：林荫清克制温和，唐舒嫣沉稳带思想锋芒，赵婷婷直率热烈，刘伊七圆滑而疲惫，韩梦雪短句冷静，楚乔翼少言多做，何墨缘明亮跳脱，刘梦鸳冷面吐槽，洛情轩有政治和心理判断，叶敏慧以医疗与照护语言进入场景。

### 2. 角色层

保留林小队作为核心，不再把新角色无限扩散。旧书中功能重复、只为牺牲或搞笑而存在的人物，合并为以下几类。

| 旧角色类型 | 新处理 | 作用 |
| --- | --- | --- |
| 临时路匪、武装分子 | 合并为“港区地方武装”和“外包安保公司” | 体现灰区战争，不脸谱化 |
| 突然出现的怪物 | 改为法特提失败实验体或认知干预受害者 | 连接新世界观，不写成低级怪兽 |
| 被救平民群像 | 合并为工程师、留学生、医生、船员、儿童家庭五组 | 让撤侨对象有代表性 |
| 单纯反派军官 | 改为有利益链、误判和恐惧的地方强人 | 降低纸片化 |
| “小队员加入”类段落 | 改为证人保护对象或后续协调局线索人 | 避免随意扩编主角队 |
| 番外恋爱/回忆段 | 改成任务间隙的短场景 | 服务林荫清、韩梦雪、王明德等人物暗线 |

### 3. 世界观层

新版本采用本地资源库中的新世界观优先级：

- 林小队：原军方全女性特殊作战分队，后转隶国家特别事务行动协调局。对外可用“文化传媒公司”等掩护身份。
- 协调局：处理常规体制无法直接处理的非常规威胁，和公安、国安、军方、医疗系统存在边界清晰但复杂的协作。
- 法特提：第一季主要对手，擅长科技、资本、认知战、舆论包装和实验网络。核心人物不直接露面，只通过公司、论坛、基金会、安保承包商和实验档案形成压力。
- 古暗锋：作为第二季暗线，不在本书正面展开。南极尾声可留下古暗锋符号，但不抢走撤侨主线。
- 时间线：建议置于二纪226年末至二纪227年初，发生在首都反颠覆行动之后、何刘电站特别小组事件和 T 岛行动之前。它解释林小队为什么必须从传统军事行动过渡到协调局式复合任务。

### 4. 军事与行动层

新稿不追求“参数堆砌”，而追求可信的行动逻辑。

- 撤侨行动核心不是打赢一场局部战争，而是在有限授权、复杂舆论、脆弱交通线和大量平民中完成撤离。
- 战斗场景必须有规则限制：交火许可、身份识别、误伤风险、外交边界、医疗后送、通信中断、补给压力。
- 现代战争描写重点放在侦察、无人化、电子干扰、车队调度、信息核验、心理稳定和舆论战。
- 避免过度细化现实武器可操作参数。需要写装备时，只写叙事必要的功能，不写教程式细节。
- 战斗胜利不能只靠主角强，必须体现体系支撑：使馆、海军、空军、医疗、当地华人组织、工程企业、友邻单位共同构成“回家通道”。

### 5. 剧作结构层

本地剧作规范可归纳为四个层级：事件因果、人物弧光、主题立场、场面可视化。每场戏至少推进其中两项。

- 事件因果：每一章必须回答“上一章造成了什么问题，这一章解决或恶化了什么问题”。
- 人物弧光：每名主角有独立恐惧、选择和代价，不能只做战斗工具。
- 主题立场：新世界观不是旧世界爽文升级，而是写“年轻一代如何在复杂系统中保护普通人”。
- 场面可视化：每个行动场景都应能分镜，场景目标清晰，空间关系清晰，危险来源清晰。

## 旧目录分组与处理

| 旧章范围 | 旧内容功能 | 章数 | 目录字数 | 新处理 |
| --- | --- | ---: | ---: | --- |
${groupTable}

## 新版一句话故事

二纪226年末，海外港口国家阿梅里亚突发内乱，数千名华夏公民被困。林小队奉命协助使馆撤侨，却发现这场内乱背后有法特提外围机构推动的认知干预、数据转运和人体实验。林荫清必须在有限授权、舆论压力和队员创伤之间完成撤离，同时第一次看清新世界真正的敌人不是一支部队，而是一套能借战争吞噬人的系统。

## 新世界观延展方案

### 阿梅里亚危机

阿梅里亚是虚构海外港口国家，拥有大型深水港、华资工业园、旧殖民城区和内陆矿区。它不是现实国家替身，而是灰区冲突的综合舞台。危机由三层力量叠加：

- 表层：地方派系冲突、港口罢工、供电中断、外侨撤离。
- 中层：外包安保公司、走私网络、舆论账号、假救援组织争夺撤离通道。
- 深层：法特提外围企业借混乱筛选实验对象，转运神经接口数据和认知干预设备。

### 法特提外线

本书中法特提不直接以“最终大反派”登场，而以四个外壳出现：

- 金海科技海外分包商：负责设备和实验数据。
- 新人类论研究会阿梅分会：负责舆论包装和精英圈渗透。
- 影碟机构外包工作室：负责短视频、直播、谣言和视觉/声波干预。
- 港区安保承包商：负责武装执行和“合理化暴力”。

### 南极线重塑

旧书南极篇保留为尾声，不再占据几十章。它的新功能是：

- 说明阿梅里亚危机不是孤立事件，货船线路通向极地科研外壳。
- 让何墨缘、刘梦鸳第一次独立完成远程数据取证，为二纪227年初的电站事件铺垫。
- 留下古暗锋符号，但不解释。读者只知道法特提不是唯一危险。

## 主角弧光

### 林荫清

外部目标：完成撤侨，带回名单上的人。

内部矛盾：她想保护所有人，但任务不断逼她承认“选择”本身也是指挥责任。

关键转折：在运输线被切断后，她没有下令硬冲，而是接受唐舒嫣和洛情轩的建议，把“胜利”从歼灭敌人改为重建撤离秩序。

结尾状态：她仍然温柔，但不再把温柔误解为必须独自承担一切。

### 唐舒嫣

外部目标：维持队伍纪律、政治判断和群众工作。

内部矛盾：她看得太清楚，因此容易对所有人保持距离。

关键转折：她在使馆地下室面对失控人群时不再只讲原则，而是承认恐惧存在，然后把恐惧组织成秩序。

结尾状态：她成为林荫清真正意义上的“另一半指挥系统”。

### 赵婷婷

外部目标：打通最危险的前沿道路。

内部矛盾：她用冲锋掩盖自己对无力感的恐惧。

关键转折：在不能开火的检查站，她第一次用克制完成保护，而不是用猛冲。

结尾状态：她从先锋官变成能带人的先锋官。

### 刘伊七

外部目标：查清港区上层网络和内鬼。

内部矛盾：她擅长伪装，也厌倦伪装。

关键转折：她在旧识与任务之间选择公开自己的身份风险，救下一批被“志愿撤离项目”诱骗的学生。

结尾状态：她没有变轻松，但她愿意让队友看见一点疲惫。

### 韩梦雪

外部目标：侦察、掩护、标定撤离路线。

内部矛盾：已故恋人的创伤让她害怕“又一次来不及”。

关键转折：她在运输机迫降后没有追杀敌人，而是留下保护伤员和儿童。

结尾状态：她完成与“只会失去”的过去的一次短暂和解。

### 何墨缘与刘梦鸳

外部目标：夺回信息链，重建无人侦察和车队调度。

内部矛盾：年轻和天才让她们容易被当成工具。

关键转折：她们独立判断一次异常信号不是敌袭，而是法特提在测试认知干预频段。

结尾状态：她们从“技术支援”成长为能独当一面的特别小组雏形。

### 洛情轩、叶敏慧、楚乔翼

洛情轩负责良心和心理秩序，叶敏慧负责伤员与队员健康，楚乔翼负责重装备、维修和最朴素的可靠。她们的戏份不靠抢主线，而是让撤侨行动有人的重量。

## 新版卷章大纲

### 序卷：名单上的名字

1. 冷风中的名单：林荫清接到阿梅里亚撤侨协助任务，发现名单里有一名失踪工程师与法特提外围公司有关。
2. 文化传媒公司的门牌：林小队在掩护身份下完成集结，队部生活展示新世界观角色质感。
3. 使馆的灯：使馆地下室挤满等待撤离的人，唐舒嫣第一次处理恐慌和谣言。
4. 不是暴乱：刘伊七从港区上层酒会带回线索，暴乱背后有人在精准引导人群流向。

### 第一卷：港区夜行

5. 雨里的货柜：韩梦雪和刘伊七潜入货柜区，发现“志愿撤离项目”实际在筛选年轻技术人员。
6. 失踪的工程师：何墨缘破解工程师留下的半段日志，里面出现法特提外包商名称。
7. 第一条车队线：赵婷婷负责测试撤离车队路线，检查站的敌意来自假消息而非单纯仇恨。
8. 白名单与黑名单：洛情轩发现网上流传两份撤离名单，一份用于救人，一份用于猎人。
9. 不开火的战斗：检查站冲突中，林荫清选择谈判、心理压制和快速通行，而非正面交火。
10. 港口停电：全城停电，何墨缘与刘梦鸳临时搭建通信链。
11. 影碟信号：短视频平台出现诱导性图像和音频，叶敏慧发现多名平民出现相似头痛和恐慌反应。
12. 玫瑰临时医院：体育馆改成临时医疗点，叶敏慧和楚乔翼建立撤离前的伤员分级。

### 第二卷：陆路走廊

13. 黎明前的车队：第一批撤离人员出发，车队中混入身份不明者。
14. 大巴车上的孩子：平民视角进入故事，撤侨不再只是军事行动，而是普通人的回家路。
15. 假救援旗帜：地方武装借人道旗帜拦截车队，唐舒嫣识破其话术。
16. 刘伊七的旧识：刘伊七遇见曾在海外圈层认识的人，对方已为法特提外围组织工作。
17. 雨后泥路：楚乔翼带队修复被炸断的临时道路，沉默可靠成为全队底盘。
18. 韩梦雪的三秒钟：她可以击毙目标，但三秒后的儿童会进入射线。她选择等待，代价是目标逃脱。
19. 第二名单：林荫清得知有一批未登记华人被困内陆矿区，任务边界被迫扩大。
20. 没有人是附带损失：洛情轩和唐舒嫣围绕“救多少人、冒多大风险”发生低声争执。
21. 矿区夜火：赵婷婷突击救出矿区人员，但发现其中有人被做过神经接口测试。
22. 回不去的桥：撤离桥梁被炸，林荫清必须在原地坚守十二小时。

### 第三卷：海空归航

23. 海上的灯列：海军撤离通道建立，海面灯火给出第一次真正的希望。
24. 目标蓝天：运输机起飞前，影碟机构发动舆论攻击，声称撤侨是军事入侵。
25. 击落之后：旧书“击落”保留，但改为迫降和救援，不写成单纯空战升级。
26. 临时跑道：刘梦鸳用无人侦察寻找可用跑道，何墨缘修复导航和身份识别数据。
27. 她们不是工具：林荫清阻止上级把何墨缘、刘梦鸳当作纯技术消耗品使用。
28. 医疗后送：叶敏慧面对药品不足，必须决定谁先转运。
29. 归航名单：第一批人安全回国，名单上仍有一列灰色名字。
30. 留守者：林小队留下处理真正目标，撤侨主线进入暗线。

### 第四卷：深海与白昼

31. 深海谜团：所谓深海线索其实是货船数据仓，记录了实验样本转运路线。
32. 金海科技：法特提外围公司第一次以文件、合同和撤离名单的形式浮出水面。
33. 自然的选择：旧“南极自然的选择”改为法特提核心观念的文件标题。
34. 极地回声：何墨缘与刘梦鸳远程截获极地科研站回传数据，发现古暗锋符号。
35. 不是终点：林荫清明白这次撤侨只是第一扇门，敌人是一整套跨国系统。
36. 终章：回家的人在机场落地，林小队没有庆功，只有短暂安静。林荫清给王明德发去一条消息：我回来了，但事情没有结束。

## 样章草案一：冷风中的名单

凌晨四点十七分，协调局京城中心一处三队的灯还亮着。

门口那块“某文化传媒公司”的牌子在风里轻轻晃，铁皮边缘敲着墙，声音很轻，却把林荫清从半小时的浅睡里敲醒了。她睁开眼，桌上的终端已经自动亮起，屏幕中央是一行红色字：阿梅里亚撤侨协助任务，一级响应。

她没有立刻起身。

三秒钟后，她把手伸向桌角的陶瓷杯。杯里是叶敏慧昨晚放下的助眠药茶，已经凉透了。林荫清喝了一口，苦味从舌根慢慢压下去，她才点开文件。

名单先跳出来。

一千七百二十六人，按地区、单位、健康状况和撤离优先级排列。工程人员，留学生，驻外记者，货轮船员，医疗援助队，侨民家庭。每一个名字后面都有年龄、证件号、最后联络时间和预计集合点。

林荫清看名单的时候很慢。她看得不像是在浏览数据，更像是在确认每一盏还没有熄灭的灯。

唐舒嫣推门进来时，外套还搭在臂弯上，头发只随手束了一下。她看见屏幕，没有问“出事了？”这种废话，只把一份纸质资料放到桌上。

“外交口和海军口都动了。”唐舒嫣说，“我们不是主力撤离单位，是特别事务协助。换句话说，常规流程里出现了不常规的东西。”

林荫清把名单停在第九百三十二行。

姓名：顾明远。身份：华资港口自动化系统工程师。最后联络时间：二纪226年12月18日23:40。备注：疑似失踪。关联单位：金海科技阿梅里亚分包项目组。

“金海科技。”唐舒嫣低声念出这四个字，语气没有变化，眼神却冷了一点。

林荫清点开关联文件。顾明远最后发回国内的不是求救，而是一段损坏的系统日志。日志只有半页，夹着几行不像技术记录的短句。

“他们不是在撤人。”

“他们在挑人。”

“如果我明天没有进集合点，别让学生上那辆白色大巴。”

唐舒嫣沉默了一会儿。

楼下传来一阵脚步声。赵婷婷的声音先到：“队长，我看到一级响应了！谁家门口这么热闹，大清早的让不让人睡觉？”

后面是何墨缘更亮一点的声音：“我电脑已经开了！鸳鸳也起来了，她说她没起来，但她坐在椅子上。”

刘梦鸳在走廊另一头冷冷地补了一句：“我是在判断你会不会把电源插错。”

林荫清终于笑了一下。很浅，像冬天窗玻璃上的一点雾气。

“让所有人十分钟后会议室集合。”她说，“小何、鸳鸳先看这段日志。小七联系外线，查金海科技在阿梅里亚的公开关系。梦雪准备港区图像资料。叶医生带医疗分级模板。乔翼检查海外行动装备箱。洛情轩和舒嫣留下。”

赵婷婷在门外停住：“我呢？”

“你负责睡醒。”林荫清说。

“这要求有点高。”

门外响起短促的笑声。笑声很快散了，脚步变成奔跑，灯一盏盏亮起来。三队像一台被叫醒的机器，但这台机器里每个齿轮都还带着人的体温。

唐舒嫣走到林荫清身边，看着那句“他们在挑人”。

“这不是普通撤侨。”她说。

“嗯。”

“也不只是海外暴乱。”

“嗯。”

“你又想把所有人都带回来。”

林荫清没有回答。她把名单从第一行重新拉到最后一行，像是在心里默默数了一遍。

唐舒嫣轻轻叹气：“林荫清，名单是名单，人是人。我们要做的是把路打出来，不是把世界修好。”

林荫清看向窗外。天还没有亮，京城的冬风把门牌吹得轻轻作响。

“我知道。”她说，“但路打出来之前，总得有人相信他们能回家。”

## 样章草案二：不许开火的检查站

车队停在第二检查站前时，天色已经暗了。

前方铁丝网横在路中央，两个穿灰色战术背心的武装人员站在沙袋后面，枪口没有完全抬起，却也没有垂下去。更远处有一台皮卡，车斗上架着机枪，旁边围着十几个拿手机拍摄的人。

这不是最坏的情况。

最坏的是，人群里有孩子，有老人，有刚从车上下来透气的留学生，还有几个当地记者。任何一声枪响都会在十分钟内变成另一种叙事：华夏车队在阿梅里亚开火。

赵婷婷握着方向盘，指节发白。

“队长，”她压低声音，“他们在拖时间。”

“我知道。”

“左侧土坡能绕。”

“土坡下面是排水沟，第三辆大巴过不去。”

“那我下去。”

林荫清没有立刻回答。她透过防弹玻璃看着检查站。对方负责人戴着一副不合时宜的墨镜，耳朵上有透明耳机。他不是单纯的地方武装，至少不是此刻做决定的人。

唐舒嫣坐在后排，正在看平板上的舆情流。几分钟前，一个新账号发布了车队照片，配文是“外国武装人员正向港区推进”。转发速度异常，像被人从背后推了一把。

“他们等我们犯错。”唐舒嫣说。

林荫清点头：“所以不给他们。”

她打开车门。

赵婷婷猛地转头：“队长！”

“你留在车上。”林荫清说，“发动机别熄。小七，跟我。”

刘伊七从第二辆车上下来时，已经换了一张脸。她把外套扣好，步子不快，像是来参加某个迟到的商务会谈。林荫清走在她身边，手没有摸枪。

检查站负责人喊了几句当地话。刘伊七听完，笑了一下，用同样的语言回过去。她的语调轻松，甚至带一点抱怨，好像双方只是为一张迟到的通行证争执。

林荫清听不懂全部内容，但她看得懂对方肩膀的变化。那个人在等耳机里的指令。

“告诉他，”林荫清低声说，“我们不进入城区，只通过人道走廊。告诉他第一辆车上有两名重伤员，任何延误都会留下医疗记录和现场影像。”

刘伊七照说了。

对方笑了一声，摆手，指向车队后面。

“他说要检查所有车辆。”刘伊七说，“重点检查年轻男性和电子设备。”

唐舒嫣的声音从耳机里传来：“这就是挑人。”

林荫清抬眼，看见人群中一个戴鸭舌帽的男人正在拍摄第二辆大巴。镜头停在几个留学生身上，停得太久了。

“梦雪。”林荫清说。

“看见了。”

“不要开火。”

耳机里沉默半秒。

“明白。”

林荫清向前一步，站到检查站负责人和车队之间。她没有提高音量，只把每个字说得很慢，让刘伊七翻译。

“我们可以接受证件核验。核验由使馆人员、当地警方代表和第三方医疗人员共同完成。所有过程同步录像。任何人不得离开车队视线。任何人不得接触未成年人和伤员。你们可以选择配合，也可以选择承担阻断人道撤离的全部记录。”

负责人脸上的笑消失了。

这不是威胁。威胁会给对方开火的理由。林荫清给的是记录，是程序，是未来某一天会落在桌面上的证据。

几秒钟后，耳机那头的人显然改变了主意。负责人骂了一句，挥手让开半条路。

车队重新启动。

赵婷婷开过检查站时，没有看林荫清，只在车窗里低声说：“我刚才真的差点忍不住。”

林荫清坐回副驾驶，系好安全带。

“忍住也是战斗。”

赵婷婷沉默了一下，咧嘴：“那我刚才打得还行？”

“还行。”

“队长夸人能不能大方一点？”

林荫清看向后视镜。检查站正在身后远去，而更远处，城市的火光映红了低云。

“打得很好。”她说。

赵婷婷这才笑了。笑到一半，她又把嘴角压下去，因为第一辆大巴里传来了孩子的哭声。

那哭声让所有人都安静下来。

她们没有打赢一场战斗。她们只是让一条路暂时还在。

但在撤侨行动里，这已经是胜利的一种。

## 逐章落地改稿规则

1. 每章开头必须明确当前任务目标：救谁、去哪、剩多少时间、有什么限制。
2. 每章结尾必须改变局面：信息增加、路线改变、人物关系变化或代价出现。
3. 每个战斗段落必须先写限制再写动作。没有限制的动作戏只会变成旧式爽点。
4. 每个新角色出场前先问：这个角色能否由已有角色或群像承担？如果可以，删除或合并。
5. 每个敌人出场前先问：他为什么这样做？谁给他钱、信息、命令或恐惧？没有动机的敌人删除。
6. 每次牺牲必须服务主题和人物弧光，不能作为廉价催泪。
7. 撤侨对象要有群像功能：工程师代表技术线，留学生代表未来线，医生代表人道线，船员代表交通线，儿童家庭代表普通生活。
8. 法特提只能逐步显影，不要第一章就讲透。读者应先看到异常，再看到组织，再看到思想。
9. 南极篇只作为证据链尾声，不再写成独立升级副本。
10. 所有现实敏感地名尽量虚构化，保留情绪真实，不做现实行动复刻。

## 可删除与可保留清单

### 直接删除

- 重复的南极章节标题和无功能战斗。
- 不推动主线的番外恋爱段。
- 只为搞笑或喊口号存在的临时角色。
- “怪物决战”中脱离新世界观的奇观化处理。
- 与撤侨、法特提、角色弧光均无关的升级战斗。

### 合并保留

- “迷茫、希望、光芒”：改为林荫清个人前史。
- “渗入行动”：改为港区夜行主线。
- “澡盆行动”：改为陆路撤离代号。
- “击落”：改为迫降救援和舆论危机。
- “深海谜团”：改为货船数据仓证据链。
- “终章”：保留机场归航和下一季暗线。

### 必须重写

- 敌方组织。
- 南极篇。
- 中东线与主线关系。
- 小队员加入。
- 牺牲段落。
- 所有军事行动细节中的授权、通信、医疗、后勤和身份识别逻辑。

## 新版章节标题建议

1. 冷风中的名单
2. 文化传媒公司的门牌
3. 使馆的灯
4. 不是暴乱
5. 雨里的货柜
6. 失踪的工程师
7. 第一条车队线
8. 白名单与黑名单
9. 不开火的战斗
10. 港口停电
11. 影碟信号
12. 玫瑰临时医院
13. 黎明前的车队
14. 大巴车上的孩子
15. 假救援旗帜
16. 刘伊七的旧识
17. 雨后泥路
18. 韩梦雪的三秒钟
19. 第二名单
20. 没有人是附带损失
21. 矿区夜火
22. 回不去的桥
23. 海上的灯列
24. 目标蓝天
25. 击落之后
26. 临时跑道
27. 她们不是工具
28. 医疗后送
29. 归航名单
30. 留守者
31. 深海谜团
32. 金海科技
33. 自然的选择
34. 极地回声
35. 不是终点
36. 终章：事情没有结束

## 附录A：本地资源库采用依据

- 《新锐纪元企划世界观-改革重塑.docx》：新世界观、林小队、协调局、法特提、时间线、角色关系。
- 《前传：铁流东渡：台海战争篇（整理校订版-目录修正）.docx》：林小队军事前史、T 岛行动、队伍战斗风格。
- 角色人物志：林荫清、唐舒嫣、刘伊七、韩梦雪、洛情轩、赵婷婷、李熙然、何墨缘、刘梦鸳等。
- 剧本创作原则文档：叙事层级、时间矢量、逻辑自洽和旧世界态度修正。
- 军事与文学参考素材：现代战术、兵棋推演、防务评论、坦克战修改稿、战争文学参考等。

## 附录B：17K公开目录

${catalogLines.join("\n")}
`;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function paragraphXml(text, style = "Normal") {
  const isNormal = style === "Normal";
  const ind = isNormal && text.trim() && !/^\||^- |^\d+\./.test(text.trim())
    ? '<w:ind w:firstLine="420"/>'
    : "";
  const pStyle = style === "Normal" ? "" : `<w:pStyle w:val="${style}"/>`;
  const outlineLevel = style === "Heading1"
    ? '<w:outlineLvl w:val="0"/>'
    : style === "Heading2"
      ? '<w:outlineLvl w:val="1"/>'
      : style === "Heading3"
        ? '<w:outlineLvl w:val="2"/>'
        : "";
  return [
    "<w:p>",
    `<w:pPr>${pStyle}${ind}${outlineLevel}<w:spacing w:after="${isNormal ? 120 : 180}"/></w:pPr>`,
    `<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`,
    "</w:p>",
  ].join("");
}

function markdownToDocumentXml(markdown) {
  const paragraphs = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) {
      paragraphs.push(paragraphXml(line.replace(/^#\s+/, ""), "Title"));
    } else if (line.startsWith("## ")) {
      paragraphs.push(paragraphXml(line.replace(/^##\s+/, ""), "Heading1"));
    } else if (line.startsWith("### ")) {
      paragraphs.push(paragraphXml(line.replace(/^###\s+/, ""), "Heading2"));
    } else if (line.startsWith("#### ")) {
      paragraphs.push(paragraphXml(line.replace(/^####\s+/, ""), "Heading3"));
    } else if (line.startsWith("- ")) {
      paragraphs.push(paragraphXml(`• ${line.replace(/^- /, "")}`, "Normal"));
    } else {
      paragraphs.push(paragraphXml(line, "Normal"));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:line="360" w:lineRule="auto" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="360"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="36"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="300" w:after="180"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="180" w:after="120"/><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="26"/></w:rPr>
  </w:style>
</w:styles>`;
}

async function writeDocx(markdown) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  zip.folder("word").file("document.xml", markdownToDocumentXml(markdown));
  zip.folder("word").file("styles.xml", stylesXml());
  zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  zip.folder("docProps").file("core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>和平与玫瑰撤侨行动-新世界观彻底修订方案与草案</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-19T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-19T00:00:00Z</dcterms:modified>
</cp:coreProperties>`);
  zip.folder("docProps").file("app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>`);

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(docxPath, buffer);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const book = await fetchBook();
  const chapters = getBodyChapters(book);
  const markdown = buildMarkdown(book, chapters);
  fs.writeFileSync(markdownPath, markdown, "utf8");
  fs.writeFileSync(catalogJsonPath, JSON.stringify({ book, chapters }, null, 2), "utf8");
  fs.writeFileSync(
    catalogCsvPath,
    ["index,id,name,words,publishDate", ...chapters.map((chapter) => [
      chapter.index,
      chapter.id,
      csvEscape(chapter.name),
      chapter.words,
      csvEscape(chapter.publishDate),
    ].join(","))].join("\n"),
    "utf8",
  );
  await writeDocx(markdown);
  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${docxPath}`);
  console.log(`Wrote ${catalogJsonPath}`);
  console.log(`Wrote ${catalogCsvPath}`);
  console.log(`Markdown characters: ${markdown.length}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
