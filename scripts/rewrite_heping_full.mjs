import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const sourceDocx = "D:/下载/和平与玫瑰撤侨行动_完整版.docx";
const outDir = path.resolve("output");
const workDir = path.join(outDir, "rewrite_work");
const finalMdPath = path.join(outDir, "和平与玫瑰撤侨行动_新世界观重写完整版.md");
const finalDocxPath = path.join(outDir, "和平与玫瑰撤侨行动_新世界观重写完整版.docx");
const calibrationCsvPath = path.join(workDir, "原稿章节切分校准表.csv");
const mappingJsonPath = path.join(workDir, "新版36章章节映射表.json");
const mappingCsvPath = path.join(workDir, "新版36章章节映射表.csv");
const roleArcCsvPath = path.join(workDir, "角色登场与关系弧光总表.csv");
const roleArcMdPath = path.join(workDir, "角色登场与关系弧光总表.md");
const rulebookPath = path.join(workDir, "重写规则手册.md");
const reportJsonPath = path.join(workDir, "全文重写校验报告.json");
const reportMdPath = path.join(workDir, "全文重写校验报告.md");
const catalogJsonPath = path.join(outDir, "和平与玫瑰撤侨行动-17K公开目录.json");
const bookApi =
  "https://api.17k.com/v2/book/3088294/volumes?app_key=4037465544&client_type=2&_versions=99999&_access_version=2";

const characterProfiles = {
  林荫清: "温柔知性的指挥核心，面对敌人冷静近乎冷酷，面对战友和被保护的人保持月光一样的克制温柔；她不靠口号推动别人，而靠把恐惧整理成可以执行的步骤。",
  唐舒嫣: "副队长与事实指导员，政治判断、群众组织和纪律边界的担当；她说话不急，常把混乱拆成原则、证据和责任。",
  赵婷婷: "东北元气先锋，冲劲强但新版必须学会克制；她的弧光是从“往前冲”变成“能带人往前走”。",
  刘伊七: "渗透、情报和心理战专家，外表圆滑轻快，内里疲惫；她擅长伪装，也讨厌自己总在伪装。",
  韩梦雪: "沉默侦察与精准掩护，创伤来自来不及保护重要的人；她的关键动作常常是等待、观察、放下扳机、保护伤员。",
  何墨缘: "信息化作战参谋，明亮、跳脱、技术死磕；她不是工具，而是会害怕也会成长的年轻人。",
  刘梦鸳: "无人化作战军官，外冷内热，吐槽少而准；她和何墨缘组成特别小组雏形。",
  洛情轩: "组织部长与政工干部，负责良心、心理秩序和复杂场合下的政治判断。",
  叶敏慧: "战地医疗、心理急救与健康主管，用医疗分级、健康日志和温和照护让战争重新有人味。",
  楚乔翼: "盾位、重武器、工程和装备维护担当，沉默务实，做事多于说话；她是队伍的地基。",
};

const bannedOldSurfaceTerms = [
  "铁血",
  "第八兵团",
  "王权兔",
  "大弟",
  "怪物决战",
  "PLA",
  "People’s Liberation Army",
  "People's Liberation Army",
];

const newTerms = [
  "阿梅里亚",
  "协调局",
  "林小队",
  "法特提",
  "金海科技",
  "影碟机构",
  "新人类论研究会",
  "港区安保承包商",
];

const chapters = [
  {
    volume: "第一卷 港区夜行",
    no: 1,
    title: "冷风中的名单",
    oldRange: "1-8",
    objective: "林荫清接到阿梅里亚撤侨协助任务，并发现失踪工程师顾明远与金海科技有关。",
    motif: "求告、灾祸、谜的解释",
    timeVector: "凌晨，黑夜将尽而天色未明，象征旧稿迷茫被改写为新任务的入口。",
    setting: "京城中心一处三队队部，外挂牌子仍是文化传媒公司。",
    focus: ["林荫清", "唐舒嫣", "何墨缘", "刘梦鸳"],
    conflict: "公开任务是撤侨，真实异常是名单筛选与数据日志。",
    turn: "顾明远日志显示“他们不是在撤人，他们在挑人”。",
    ending: "林小队集结，撤侨行动被确认为特别事务。",
    theme: "回家不是口号，而是一张张必须被认真读完的名字。",
    oldKeep: "保留旧稿“迷茫、希望、战火中求生”的情绪根。",
    oldRemove: "删除旧稿开篇过度惨烈堆叠、现实部队硬指代和无铺垫失踪。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 2,
    title: "文化传媒公司的门牌",
    oldRange: "9-12",
    objective: "以队部生活和战前准备重建林小队角色群像，明确协调局掩护身份。",
    motif: "出发、调停、获得宝物",
    timeVector: "冬日清晨，门半开，内外空间形成任务与日常的边界。",
    setting: "队部装备库、技术中心、医务室和会议室。",
    focus: ["唐舒嫣", "赵婷婷", "叶敏慧", "楚乔翼"],
    conflict: "队员要从日常状态切换到海外行动状态，且不能把撤侨当成普通军事任务。",
    turn: "洛情轩提出群众组织比突击更早进入战场。",
    ending: "行动规则确定：少开火、稳秩序、护名单、查异常。",
    theme: "真正可靠的队伍不是只会战斗，而是能把混乱变成秩序。",
    oldKeep: "保留旧稿“新的故事、重新来过”的功能。",
    oldRemove: "删除不必要的逛街、闲聊和脱离主线的恋爱展示。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 3,
    title: "使馆的灯",
    oldRange: "13-18",
    objective: "林小队抵达阿梅里亚使馆，第一次面对被困侨民和失控谣言。",
    motif: "求告、援救、错误判断",
    timeVector: "傍晚，白昼将尽，暖光和城市烟尘交界。",
    setting: "阿梅里亚首都旧城区使馆地下临时安置点。",
    focus: ["唐舒嫣", "洛情轩", "叶敏慧", "林荫清"],
    conflict: "人群恐慌、名单混乱、外部舆论攻击同时出现。",
    turn: "唐舒嫣发现网上流传的撤离名单有两个版本。",
    ending: "使馆灯光成为临时秩序核心，但黑名单线索浮出。",
    theme: "战争中的灯不是装饰，是人群愿意继续等待的理由。",
    oldKeep: "保留旧稿“和平与玫瑰、战斗玫瑰”的精神标题。",
    oldRemove: "删除空泛爱国宣言，以具体安置、分诊和核名替代。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 4,
    title: "不是暴乱",
    oldRange: "19-24",
    objective: "刘伊七潜入港区上层圈，确认暴乱背后有人精准引导人群流向。",
    motif: "刺探、欺骗、谜的解释",
    timeVector: "深夜，月亮正中，表面安静但下半夜的煎熬将至。",
    setting: "港区酒店、物流公司酒会和旧殖民街。",
    focus: ["刘伊七", "韩梦雪", "唐舒嫣"],
    conflict: "公开信息和现场流向互相矛盾，刘伊七必须用伪装接近外包安保。",
    turn: "她拿到白色大巴车调度表，发现目的地不是撤离点。",
    ending: "港区夜行开始，韩梦雪标定第一处货柜仓库。",
    theme: "危险不总是拿着枪，有时它穿着救援背心。",
    oldKeep: "保留旧稿“渗入行动”的行动功能。",
    oldRemove: "删去无因潜入和脸谱化敌营，把敌人改为利益链。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 5,
    title: "雨里的货柜",
    oldRange: "25-31",
    objective: "刘伊七与韩梦雪潜入货柜区，救出第一批被筛选的留学生。",
    motif: "潜入、获取、追捕",
    timeVector: "雨刚开始，地面雨点未连成片，象征危机从可控滑向失控。",
    setting: "港区货柜堆场、冷链仓库、监控盲区。",
    focus: ["刘伊七", "韩梦雪", "楚乔翼"],
    conflict: "敌方没有大规模开火，而是用证件、名单和恐惧控制人。",
    turn: "韩梦雪放弃追击目标，留下保护被困学生。",
    ending: "救援成功，但顾明远线索被转移到内陆矿区。",
    theme: "撤侨行动的第一场胜利，是有人没有被悄悄带走。",
    oldKeep: "保留旧稿“深入虎穴、撤离险地”的紧张感。",
    oldRemove: "删去随机遭遇战和无意义追杀。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 6,
    title: "失踪的工程师",
    oldRange: "32-39",
    objective: "何墨缘和刘梦鸳破解顾明远残留日志，确认金海科技实验链。",
    motif: "谜的解释、考验、获得宝物",
    timeVector: "雾正浓，能见度最低，真相显影但边缘模糊。",
    setting: "使馆临时技术室、废弃通信塔、港区断电后的网络边缘。",
    focus: ["何墨缘", "刘梦鸳", "林荫清"],
    conflict: "技术链路残缺，越接近真相越可能暴露撤离通道。",
    turn: "小可爱二人组判断异常信号不是敌袭，而是认知干预测试。",
    ending: "林荫清下令把技术线升级为与撤侨同等优先。",
    theme: "年轻的技术员不是设备的一部分，她们也是被战争推到前线的人。",
    oldKeep: "保留旧稿“撤离行动、夺命无人区”的危机承接。",
    oldRemove: "删除只为推进而出现的无人区奇观。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 7,
    title: "第一条车队线",
    oldRange: "40-45",
    objective: "赵婷婷测试陆路撤离线，检查站危机验证行动规则。",
    motif: "出发、禁令、反应",
    timeVector: "黄昏，太阳触地平线，象征第一条路即将被夜色吞没。",
    setting: "港区外环路、临时检查站、废弃加油站。",
    focus: ["赵婷婷", "林荫清", "唐舒嫣"],
    conflict: "赵婷婷能冲过去，但车队不能用开火换通行。",
    turn: "林荫清用记录、程序和医疗证据迫使检查站让路。",
    ending: "第一条车队线暂时可用，敌方开始转向舆论攻击。",
    theme: "忍住也是战斗。",
    oldKeep: "保留旧稿“澡盆行动、危险境地”的行动代号功能。",
    oldRemove: "删除路匪爽点，把冲突改成授权和舆论压力。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 8,
    title: "白名单与黑名单",
    oldRange: "46-50",
    objective: "洛情轩与唐舒嫣发现撤离名单被复制成猎捕名单。",
    motif: "揭露、错误判断、反抗",
    timeVector: "站台意象，短暂停留，送别与追捕重叠。",
    setting: "使馆地下室、临时登记台、舆情监控墙。",
    focus: ["洛情轩", "唐舒嫣", "叶敏慧"],
    conflict: "如果停止登记，人群失序；继续登记，数据可能继续泄露。",
    turn: "洛情轩决定建立纸质核验和口令制度，短暂切断数字依赖。",
    ending: "白名单重新获得可信度，但黑名单已流入外部。",
    theme: "秩序不是表格本身，而是人愿意相信表格背后有人负责。",
    oldKeep: "保留旧稿“希望归零、绝望、战争与死亡”的情绪低点。",
    oldRemove: "删去重复绝望段落，改成制度危机。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 9,
    title: "港口停电",
    oldRange: "51-54",
    objective: "全城停电，何墨缘与刘梦鸳重建使馆、车队和海上撤离链路。",
    motif: "缺乏、考验、解决",
    timeVector: "深夜，窗外只有应急灯，走廊尽头有微弱光点。",
    setting: "使馆屋顶、临时机房、港口停电区。",
    focus: ["何墨缘", "刘梦鸳", "楚乔翼"],
    conflict: "通信恢复会暴露位置，不恢复则车队失联。",
    turn: "楚乔翼用旧设备和临时供电给技术组争取十七分钟。",
    ending: "通讯链恢复为低可见模式，影碟信号同时出现。",
    theme: "有时候技术不是炫耀，而是把一盏灯留住。",
    oldKeep: "保留旧稿“零点钟、回家”的节点感。",
    oldRemove: "删除屈才式闲笔和无功能伏击铺垫。",
  },
  {
    volume: "第一卷 港区夜行",
    no: 10,
    title: "影碟信号",
    oldRange: "55-60",
    objective: "叶敏慧发现多名侨民头痛、恐慌与短视频视觉信号有关。",
    motif: "加害、谜的解释、化解",
    timeVector: "窗上雨滴框取视野，内外窥望感增强。",
    setting: "临时医疗点、舆情监测室、拥挤休息区。",
    focus: ["叶敏慧", "何墨缘", "刘梦鸳", "洛情轩"],
    conflict: "不能简单没收手机，否则恐慌更大；必须解释、替代和隔离。",
    turn: "叶敏慧把技术异常翻译成普通人能理解的医疗建议。",
    ending: "认知干预第一次被公开命名，法特提外围阴影成形。",
    theme: "治病不是只处理身体，也要把恐惧从人群里慢慢拆出来。",
    oldKeep: "保留旧稿“俘虏、巷战”的压迫感。",
    oldRemove: "删除血腥对抗，改为信息和心理战。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 11,
    title: "玫瑰临时医院",
    oldRange: "61-66",
    objective: "使馆体育馆改为临时医疗点，撤侨从行动问题变成人道问题。",
    motif: "援救、调停、牺牲",
    timeVector: "初春残雪和泥土意象，压抑中出现新生。",
    setting: "体育馆、分诊线、临时药房。",
    focus: ["叶敏慧", "洛情轩", "林荫清"],
    conflict: "药品不足、伤员优先级和家属情绪互相拉扯。",
    turn: "叶敏慧拒绝把重伤员当成拖累，建立公开分诊规则。",
    ending: "第一批伤员进入撤离序列，队伍承担更大负荷。",
    theme: "人道不是漂亮词，它是有限资源面前仍然认真解释。",
    oldKeep: "保留旧稿“华夏空军、联合作战”的体系支撑感。",
    oldRemove: "减少宏大口号，转向医疗后送和协同细节。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 12,
    title: "黎明前的车队",
    oldRange: "67-73",
    objective: "第一批撤离车队出发，林小队在陆路走廊中护送侨民。",
    motif: "出发、追捕、获救",
    timeVector: "日出前，东方微亮但太阳未露，混沌向希望过渡。",
    setting: "港区外环、临时集合点、车队无线频道。",
    focus: ["林荫清", "赵婷婷", "韩梦雪", "唐舒嫣"],
    conflict: "车队里混入身份不明人员，停车排查会错过窗口。",
    turn: "唐舒嫣用口令和群众组织完成车内核验。",
    ending: "车队离开港区，旧城火光在后视镜中缩小。",
    theme: "回家的路不是一条路，是很多人共同维持的秩序。",
    oldKeep: "保留旧稿“获救、新起点”的卷末功能。",
    oldRemove: "删除突兀章节结束，改成真正进入第二阶段。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 13,
    title: "大巴车上的孩子",
    oldRange: "74-80",
    objective: "用平民视角重写撤侨，把行动压力落到具体家庭。",
    motif: "不幸、求告、亲族重逢",
    timeVector: "车窗反射水面一样晃动，外部战火和车内呼吸交错。",
    setting: "第三辆大巴、临时休息点、儿童座位旁。",
    focus: ["叶敏慧", "赵婷婷", "林荫清"],
    conflict: "孩子发烧、道路封闭、家属恐慌同时出现。",
    turn: "赵婷婷第一次没有用玩笑压过去，而是安静守在车门边。",
    ending: "孩子退烧，车队却收到桥梁被炸的消息。",
    theme: "撤侨不是移动数字，是把一个孩子的体温带回安全处。",
    oldKeep: "保留旧稿“我在哪里、勇闯无人区”的迷失感。",
    oldRemove: "删去随机丛林冒险，把视角落到普通人。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 14,
    title: "假救援旗帜",
    oldRange: "81-88",
    objective: "地方武装借人道旗帜截停车队，唐舒嫣识破话术。",
    motif: "欺骗、禁令、揭露",
    timeVector: "门半开，内外明暗不同，象征救援与猎捕只有一步之隔。",
    setting: "内陆公路检查点、破损救护站。",
    focus: ["唐舒嫣", "刘伊七", "韩梦雪"],
    conflict: "对方使用人道话术要求带走年轻技术人员。",
    turn: "刘伊七认出对方话术来自新人类论研究会培训材料。",
    ending: "车队拒绝分流，敌方转入跟踪。",
    theme: "最危险的谎言往往长得像善意。",
    oldKeep: "保留旧稿“生物、目标丛林、被俘获救”的危险功能。",
    oldRemove: "删除生硬怪物和被俘爽点。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 15,
    title: "刘伊七的旧识",
    oldRange: "89-96",
    objective: "刘伊七遇见海外旧识，对方已服务法特提外围。",
    motif: "认出、错误判断、反抗",
    timeVector: "两人影子接近又分离，关系转折悬停。",
    setting: "废弃服务区、临时谈判点、夜雨车棚。",
    focus: ["刘伊七", "唐舒嫣", "赵婷婷"],
    conflict: "旧识知道刘伊七的过去，也掌握失踪学生位置。",
    turn: "刘伊七放弃维持伪装，用身份风险换取学生线索。",
    ending: "她拿到内陆矿区坐标，也被法特提外围记录。",
    theme: "伪装能保护人，也会把人困在无人理解的地方。",
    oldKeep: "保留旧稿“室内与室外、晚安、绝处逢生”的心理张力。",
    oldRemove: "删除坦克冲锋等不合主线的炫技段。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 16,
    title: "雨后泥路",
    oldRange: "97-104",
    objective: "楚乔翼带队修复临时道路，让沉默可靠成为主线力量。",
    motif: "难题、解决、获得宝物",
    timeVector: "雨刚停，泥路边界模糊，车辙延向远方。",
    setting: "被炸毁的低桥、泥泞机耕路、车队维修点。",
    focus: ["楚乔翼", "林荫清", "洛情轩"],
    conflict: "绕路会错过撤离窗口，强行通过会造成大巴倾覆。",
    turn: "楚乔翼用现场材料搭出临时通过方案，但自己必须留到最后。",
    ending: "车队通过，楚乔翼在雨里只说一句“够了”。",
    theme: "有些人不发光，但她们把路垫在所有人脚下。",
    oldKeep: "保留旧稿“成长与前进、归来”的成长节点。",
    oldRemove: "删除小队员随意加入，改为角色自身完成弧光。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 17,
    title: "韩梦雪的三秒钟",
    oldRange: "105-109",
    objective: "韩梦雪面对可击毙目标与保护儿童的选择，完成克制弧光。",
    motif: "难题、牺牲、悔恨",
    timeVector: "悬崖边缘意象，进退两难悬停。",
    setting: "山坡观察点、车队尾部、燃烧的村口。",
    focus: ["韩梦雪", "林荫清", "叶敏慧"],
    conflict: "目标进入射界，下一秒儿童也会进入危险区域。",
    turn: "韩梦雪放下扳机，目标逃脱，但孩子活下来。",
    ending: "林荫清没有责备，只把新的追踪任务交给她。",
    theme: "不是每一次放过敌人都是失败，有时那是人还没有变成武器的证明。",
    oldKeep: "保留旧稿“草原女孩、小队员加入”的保护对象功能。",
    oldRemove: "删除随意扩编，把保护对象改成平民证人。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 18,
    title: "第二名单",
    oldRange: "110-116",
    objective: "发现未登记华人和技术人员被困矿区，任务边界扩大。",
    motif: "缺乏、调停、壮举",
    timeVector: "十字路口，人物站在中心，方向交汇。",
    setting: "使馆临时指挥点、矿区地图、车队补给区。",
    focus: ["林荫清", "唐舒嫣", "洛情轩"],
    conflict: "公开授权只覆盖名单人员，第二名单可能让全队错过主撤离窗口。",
    turn: "林荫清决定把第二名单纳入行动，但要求每一步留下责任链。",
    ending: "陆路走廊变成救援与取证双线。",
    theme: "名单之外的人不能因为没被打印出来就消失。",
    oldKeep: "保留旧稿“撤侨行动序列1-7”的连续推进。",
    oldRemove: "删除口语化序列标题，改为责任边界冲突。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 19,
    title: "没人是附带损失",
    oldRange: "117-123",
    objective: "洛情轩和唐舒嫣围绕救援风险发生原则冲突。",
    motif: "不均等势力斗争、错误判断、调停",
    timeVector: "走廊尽头有光也有暗，连接空间纵深未知。",
    setting: "废弃学校临时会议室、救援前夜。",
    focus: ["洛情轩", "唐舒嫣", "林荫清"],
    conflict: "救第二名单会增加第一名单风险，所有选择都不干净。",
    turn: "洛情轩提出“附带损失”这个词不能进入队内语言。",
    ending: "三人确定分层救援，不用漂亮话掩盖代价。",
    theme: "责任不是没有代价，而是不允许把代价从语言里抹掉。",
    oldKeep: "保留旧稿“克服恐惧、至暗时刻、内鬼”的低谷。",
    oldRemove: "删除“大弟”等临时称呼和简化内鬼。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 20,
    title: "矿区夜火",
    oldRange: "124-131",
    objective: "赵婷婷带队救出矿区人员，发现神经接口测试证据。",
    motif: "援救、反击、揭露",
    timeVector: "夜火映红低云，光和烟尘共同构成临界点。",
    setting: "内陆矿区、旧宿舍楼、样本冷库。",
    focus: ["赵婷婷", "韩梦雪", "何墨缘", "刘梦鸳"],
    conflict: "救援对象被分组转移，证据即将被销毁。",
    turn: "赵婷婷克制正面猛攻，改由技术组切断转运秩序。",
    ending: "人员救出，冷库数据指向海上货船。",
    theme: "勇敢不是火力更猛，而是在最想冲的时候还能听见别人呼吸。",
    oldKeep: "保留旧稿“火力全开、死里逃生、该走了”的动作功能。",
    oldRemove: "删除无约束开火，改成救援和取证并重。",
  },
  {
    volume: "第二卷 陆路走廊",
    no: 21,
    title: "回不去的桥",
    oldRange: "132-139",
    objective: "撤离桥梁被毁，林小队必须原地坚守十二小时。",
    motif: "灾祸、不均等势力斗争、获救",
    timeVector: "断桥如墙，裂缝暗示未来通道。",
    setting: "河谷断桥、临时防护区、伤员集结点。",
    focus: ["林荫清", "楚乔翼", "叶敏慧", "唐舒嫣"],
    conflict: "车队无法前进，敌方舆论声称撤离失败。",
    turn: "叶敏慧把医疗分级公开给所有人，唐舒嫣稳定群众。",
    ending: "海上撤离编队提前接应，陆路转海路。",
    theme: "路断了，秩序不能断。",
    oldKeep: "保留旧稿“接你回家、检查站与大巴车”的情感根。",
    oldRemove: "删除“回家惹”等轻佻标题。",
  },
  {
    volume: "第三卷 海空归航",
    no: 22,
    title: "海上的灯列",
    oldRange: "140-143",
    objective: "海上撤离通道建立，第一批侨民看到真正希望。",
    motif: "归来、援救、亲族重逢",
    timeVector: "海面灯列如站台，送别迎归并存。",
    setting: "临时码头、海上撤离船、夜色中的航道。",
    focus: ["林荫清", "洛情轩", "赵婷婷"],
    conflict: "码头拥挤、登船优先级和外部镜头同时施压。",
    turn: "洛情轩用公开规则化解插队和恐慌。",
    ending: "第一批船离港，林小队留下继续第二批。",
    theme: "海上的灯不是胜利，它只是告诉人们方向还在。",
    oldKeep: "保留旧稿“1927.8.1、高铁、起飞、目标蓝天”的归航意象。",
    oldRemove: "删除现实纪念符号硬贴，改为虚构世界内的责任记忆。",
  },
  {
    volume: "第三卷 海空归航",
    no: 23,
    title: "目标蓝天",
    oldRange: "144-149",
    objective: "空中撤离准备遭遇舆论攻击和身份识别危机。",
    motif: "禁令、错误判断、解决",
    timeVector: "天空由暗转亮，地平线光带提示窗口短暂。",
    setting: "临时机场、跑道边、舆情指挥屏。",
    focus: ["唐舒嫣", "何墨缘", "刘梦鸳"],
    conflict: "影碟机构制造“军事入侵”叙事，空中通道可能被政治封锁。",
    turn: "唐舒嫣发布可验证的人道证据链，而非情绪反驳。",
    ending: "第一架运输机获准起飞，但敌方启动干扰。",
    theme: "真相不能只被说出来，还要被组织到无法轻易抹黑。",
    oldKeep: "保留旧稿“击落、会议、询问、九死一生”的危机结构。",
    oldRemove: "删除怪物化决战，改为舆论和识别系统危机。",
  },
  {
    volume: "第三卷 海空归航",
    no: 24,
    title: "击落之后",
    oldRange: "150-156",
    objective: "运输机遇袭迫降，林小队组织搜救和二次撤离。",
    motif: "灾祸、援救、壮举",
    timeVector: "沙漠与跑道残骸，天大地小，人显得渺小。",
    setting: "迫降区、干涸河床、临时救援点。",
    focus: ["韩梦雪", "叶敏慧", "林荫清", "赵婷婷"],
    conflict: "追击敌人与救伤员只能选一个优先级。",
    turn: "韩梦雪留下保护伤员，放弃追杀。",
    ending: "幸存者被转移，黑匣子数据指向港区安保承包商。",
    theme: "战争让人想追上仇恨，救援让人停在该停的地方。",
    oldKeep: "保留旧稿“目标中东、生死二线、命悬一线”的绝境感。",
    oldRemove: "删除空战升级细节，不写现实武器参数。",
  },
  {
    volume: "第三卷 海空归航",
    no: 25,
    title: "临时跑道",
    oldRange: "157-164",
    objective: "刘梦鸳用无人侦察寻找可用跑道，何墨缘修复识别数据。",
    motif: "难题、获得宝物、解决",
    timeVector: "隧道出口的圆形光斑，穿越黑暗迎来光明。",
    setting: "废弃机场、移动技术车、低能见度空域。",
    focus: ["刘梦鸳", "何墨缘", "楚乔翼"],
    conflict: "技术组必须在低可见状态下完成导航校正，过度发射会暴露车队。",
    turn: "刘梦鸳承认害怕，但仍做出独立判断。",
    ending: "临时跑道启用，小可爱二人组第一次真正独当一面。",
    theme: "成长不是不害怕，而是在害怕时仍能给别人一条路。",
    oldKeep: "保留旧稿“落幕之声”的情绪收束。",
    oldRemove: "删除重复落幕标题，改为技术与心理双成长。",
  },
  {
    volume: "第三卷 海空归航",
    no: 26,
    title: "她们不是工具",
    oldRange: "165-170",
    objective: "林荫清阻止上级把技术组当作消耗品使用。",
    motif: "反抗、调停、牺牲",
    timeVector: "门框内外明暗不同，命令和保护形成边界。",
    setting: "临时指挥车、远程会议频道、雨夜机场。",
    focus: ["林荫清", "何墨缘", "刘梦鸳", "唐舒嫣"],
    conflict: "更大范围的数据反制需要技术组冒过高风险。",
    turn: "林荫清要求改变方案，用体系轮换而非个人透支解决问题。",
    ending: "行动效率下降，但队员被保住，协调局式原则成形。",
    theme: "体系存在的意义，是不让最年轻的人被当作一次性零件。",
    oldKeep: "保留旧稿“归途、平静”的回落。",
    oldRemove: "删除把角色工具化的胜利写法。",
  },
  {
    volume: "第三卷 海空归航",
    no: 27,
    title: "医疗后送",
    oldRange: "171-176",
    objective: "叶敏慧在药品不足和运力有限下组织医疗后送。",
    motif: "不幸、难题、解决",
    timeVector: "雪刚停，寂静中仍有零星雪花，沉寂后等待判断。",
    setting: "机场临时医疗区、转运登记台、救护车旁。",
    focus: ["叶敏慧", "洛情轩", "林荫清"],
    conflict: "谁先走、谁留下，都可能被理解为不公。",
    turn: "叶敏慧公开医疗标准，也公开自己的责任签名。",
    ending: "最危险一批伤员离开，叶敏慧几乎站不稳。",
    theme: "公平不是让每个人都满意，而是让每个决定都能面对人的眼睛。",
    oldKeep: "保留旧稿“黑暗再临、结束战斗、过渡”的转折。",
    oldRemove: "删除只靠战斗解决的过渡。",
  },
  {
    volume: "第三卷 海空归航",
    no: 28,
    title: "归航名单",
    oldRange: "177-183",
    objective: "第一批人安全回国，但灰色名单提示还有人失踪。",
    motif: "归来、失去所爱之人、谜的解释",
    timeVector: "站台与机场到达口，短暂停留，迎归和未归并存。",
    setting: "国内机场、临时接待区、远程指挥屏。",
    focus: ["林荫清", "唐舒嫣", "韩梦雪"],
    conflict: "公众看到归来，林小队看到仍未归零的灰色名单。",
    turn: "顾明远名字短暂上线，随后从系统里被抹去。",
    ending: "林小队决定留下处理真正目标。",
    theme: "回家的人值得被拥抱，没回来的人也不能被沉默吞掉。",
    oldKeep: "保留旧稿“拯救初号体、逃离生天、预备”的暗线功能。",
    oldRemove: "删除不清晰的初号体设定，改为实验受害者和证据链。",
  },
  {
    volume: "第三卷 海空归航",
    no: 29,
    title: "留守者",
    oldRange: "184-187",
    objective: "林小队在主撤离后留下，转入取证和断链行动。",
    motif: "壮举、反抗、追捕",
    timeVector: "黄昏后夜幕降临，辉煌已过，真正危险开始。",
    setting: "空荡使馆、港区残余线路、旧酒店屋顶。",
    focus: ["林荫清", "刘伊七", "赵婷婷", "韩梦雪"],
    conflict: "主任务已完成，留下意味着失去公开保护伞。",
    turn: "刘伊七把自己暴露换来的线索交出，林荫清选择信任她。",
    ending: "取证目标锁定海上货船“白棘号”。",
    theme: "有些人负责回家，有些人负责确认路上到底发生过什么。",
    oldKeep: "保留旧稿“风雨欲来、杰里德、旧友、危机”的尾部阴谋。",
    oldRemove: "删去命名混乱的外国反派，整合为承包商网络。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 30,
    title: "深海谜团",
    oldRange: "188-193",
    objective: "所谓深海线索被改写为货船数据仓和实验转运路线。",
    motif: "谜的解释、获取、追捕",
    timeVector: "水面倒影扭曲，真实世界与倒影世界错位。",
    setting: "港外货船、海上数据仓、远程监听点。",
    focus: ["何墨缘", "刘梦鸳", "楚乔翼", "韩梦雪"],
    conflict: "货船既是证据也是诱饵，贸然登船会引爆舆论陷阱。",
    turn: "何墨缘发现数据仓里记录的不是物资，而是人。",
    ending: "金海科技和影碟机构之间的协同证据成立。",
    theme: "深海不是奇观，是有人以为把罪证沉下去就不会再浮上来。",
    oldKeep: "保留旧稿“深海谜团1-4、准备”的标题资产。",
    oldRemove: "删除硬科幻跳跃和随机海底奇观。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 31,
    title: "金海科技",
    oldRange: "194-199",
    objective: "法特提外围公司以合同、撤离名单和实验档案形式浮出水面。",
    motif: "揭露、惩罚、错误判断",
    timeVector: "墙面裂缝透光，规则背后的结构露出。",
    setting: "临时审讯室、合同数据包、使馆安全屋。",
    focus: ["唐舒嫣", "洛情轩", "刘伊七"],
    conflict: "证据足够指向外包商，却不足以公开指向法特提核心。",
    turn: "唐舒嫣决定不急于宣布胜利，而是保全证据链。",
    ending: "顾明远被确认仍活着，但已被转往极地科研外壳。",
    theme: "真正难的不是看见敌人，而是证明敌人如何把自己伪装成制度。",
    oldKeep: "保留旧稿“战争开始、胜利结束、回家”的阶段收束。",
    oldRemove: "删除过早胜利，改成更大的系统浮现。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 32,
    title: "自然的选择",
    oldRange: "200-205",
    objective: "旧南极篇标题改为法特提思想文件名，揭示其“筛选人”的逻辑。",
    motif: "人与神的斗争、野心、揭露",
    timeVector: "冰门半开，内外温差构成旧世界和新威胁的边界。",
    setting: "截获文件、极地科研站影像、远程会议室。",
    focus: ["洛情轩", "林荫清", "何墨缘"],
    conflict: "法特提把撤侨混乱称为自然筛选，试图用理性包装暴力。",
    turn: "洛情轩把文件中的冷酷逻辑拆成普通人能理解的恶。",
    ending: "林荫清确认这不是单一案件，而是第一季主敌轮廓。",
    theme: "人不是样本，灾难也不是筛子。",
    oldKeep: "保留旧稿“自然的选择”标题。",
    oldRemove: "删除南极长副本，把它改为思想和证据节点。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 33,
    title: "极地回声",
    oldRange: "206-214",
    objective: "何墨缘和刘梦鸳远程截获极地科研站回传数据，发现古暗锋符号。",
    motif: "刺探、获得宝物、谜的解释",
    timeVector: "雪刚停，白色寂静中仍有微弱信号回响。",
    setting: "队部远程技术室、极地卫星链路、数据镜像服务器。",
    focus: ["何墨缘", "刘梦鸳", "林荫清"],
    conflict: "继续追踪可能暴露国内节点，停止则线索断掉。",
    turn: "刘梦鸳主动承担判断，不再躲在何墨缘后面。",
    ending: "古暗锋符号出现，但只作为第二季暗线保存。",
    theme: "有些门不能立刻打开，但必须记住它在哪里。",
    oldKeep: "保留旧稿大量“南极”中的极地意象。",
    oldRemove: "删除重复战斗，保留悬疑钩子。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 34,
    title: "不是终点",
    oldRange: "215-220",
    objective: "南极线作为尾声证据链收束，林小队完成从军方任务到协调局任务的认知转变。",
    motif: "归隐、认出、加冕",
    timeVector: "秋叶将落未落，圆满与离别悬停。",
    setting: "归国后的队部、复盘会议、医疗室门口。",
    focus: ["林荫清", "唐舒嫣", "洛情轩", "叶敏慧"],
    conflict: "她们完成撤侨，却无法对公众解释真正的敌人。",
    turn: "唐舒嫣提出“不要用沉默否定自己做过的事”。",
    ending: "林小队正式进入协调局式长期任务序列。",
    theme: "有些胜利不能被宣布，但仍然要被记住。",
    oldKeep: "保留旧稿“南极首战、南极”的终局压力。",
    oldRemove: "删除连续决战堆叠。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 35,
    title: "归来的沉默",
    oldRange: "221-225",
    objective: "机场归来与队内沉默并置，收束人物创伤与关系。",
    motif: "亲族重逢、悔恨、失去所爱之人",
    timeVector: "站台，列车刚离站，人仍留在原地。",
    setting: "国内机场、队部三层宿舍、夜晚天台。",
    focus: ["韩梦雪", "赵婷婷", "刘伊七", "楚乔翼"],
    conflict: "回国不是心理上的结束，每个人都带着没说出口的东西。",
    turn: "韩梦雪把口袋里的旧徽章握紧，又放回原处。",
    ending: "队员们没有庆功，只一起吃了一顿很安静的饭。",
    theme: "活着回来的人，也需要被允许沉默。",
    oldKeep: "保留旧稿“南极决战”后的疲惫。",
    oldRemove: "删除大团圆式终局。",
  },
  {
    volume: "第四卷 深海与极地尾声",
    no: 36,
    title: "终章：事情没有结束",
    oldRange: "226",
    objective: "林荫清给王明德发消息，完成本书主题闭合并留下后续钩子。",
    motif: "归来、加冕、谜的解释",
    timeVector: "日出前到天亮，黑夜将尽但新一天并不轻松。",
    setting: "队部天台、清晨会议室、北方冬日街道。",
    focus: ["林荫清", "王明德", "唐舒嫣"],
    conflict: "林荫清想说“我回来了”，却知道事情没有结束。",
    turn: "她把撤侨名单最后一行归档，也把法特提档案转入新任务。",
    ending: "消息发出：我回来了，但事情没有结束。",
    theme: "和平不是没有危险，而是有人愿意一次次把回家的路修好。",
    oldKeep: "保留旧稿终章功能。",
    oldRemove: "删除松散总结，改为新世界观第一季入口。",
  },
];

const sensoryBank = [
  "风从破损的窗缝里钻进来，带着海盐、灰尘和发电机油味。",
  "远处的警笛被楼群切碎，像一段断断续续的电报码。",
  "临时灯带贴在墙角，白光很冷，却让人愿意把脚步放慢。",
  "雨水顺着车窗往下爬，窗外的路牌被拉成模糊的影子。",
  "无线电里有细小的底噪，像有人在黑暗里压低呼吸。",
  "纸质名单被翻得起了毛边，指腹摸上去有一点潮。",
  "远处火光映在云底，城市像把未熄的炭藏在胸口。",
  "有人在角落里小声哭，又很快捂住嘴，仿佛哭声也会暴露位置。",
];

const actionBank = [
  "林荫清没有急着下命令，她先把现场能确定的事一条条写在屏幕左侧。",
  "唐舒嫣把混乱的信息分成三列：事实、判断、情绪，然后逐项划掉不能执行的部分。",
  "赵婷婷想往前一步，又硬生生停住，把那股火气压回胸腔里。",
  "刘伊七笑得很轻，像是把危险当作一场无伤大雅的寒暄。",
  "韩梦雪没有说话，只把观察点重新标了一遍，连风向变化也记进去。",
  "何墨缘盯着屏幕，语速越来越快，直到刘梦鸳伸手敲了一下桌面。",
  "刘梦鸳抬眼看了所有人一圈，用最短的话指出最不舒服的结论。",
  "洛情轩没有否定任何人的恐惧，她只是把恐惧安排到了队列里。",
  "叶敏慧蹲在伤员身边，声音很轻，却让周围的人慢慢安静下来。",
  "楚乔翼把工具包摊开，没解释，直接开始做最该做的事。",
];

const dialogueBank = {
  林荫清: ["先确认人，再确认路。", "不要急着赢，先别输掉人。", "所有决定留痕，所有风险说清楚。"],
  唐舒嫣: ["能被利用的情绪，就先当作敌人的通道。", "原则不是用来好看的，是在最乱的时候还能抓住的东西。", "把话说给群众听，不是说给我们自己听。"],
  赵婷婷: ["我能忍，但你们最好告诉我忍到哪一秒。", "这路我来开，锅你们别抢。", "行，我不冲，我带着人走。"],
  刘伊七: ["他们说得太像好人了，所以我不信。", "我去和他们聊聊，放心，我最会装作放心。", "别看我，我现在笑不出来，只是职业习惯。"],
  韩梦雪: ["目标看见了。", "等三秒。", "孩子过线了，放弃射击。"],
  何墨缘: ["这个信号不对，它太干净了，像故意擦过。", "给我十分钟，不，八分钟也行。", "我不是害怕，我是手有点冷。"],
  刘梦鸳: ["她手冷是真的，判断没错也是真的。", "别夸，先备份。", "再追下去会暴露我们，停。"],
  洛情轩: ["不要用附带损失这个词。", "人群不是障碍，是任务本身。", "把能解释的都解释，不能解释的也别撒谎。"],
  叶敏慧: ["先呼吸，看着我。", "谁先走不是谁更重要，是谁现在更危险。", "我会签字，也会负责。"],
  楚乔翼: ["够。", "能过。", "我留下。"],
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function xmlDecode(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function extractDocxParagraphs(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error(`Missing word/document.xml in ${filePath}`);
  const paragraphs = [];
  for (const pMatch of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const text = [...pMatch[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((match) => xmlDecode(match[1]))
      .join("")
      .trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

async function loadCatalog() {
  if (fs.existsSync(catalogJsonPath)) {
    const data = JSON.parse(fs.readFileSync(catalogJsonPath, "utf8"));
    return data.chapters.map((chapter) => ({
      index: chapter.index,
      id: chapter.id,
      name: chapter.name,
      words: chapter.words,
      publishDate: chapter.publishDate,
    }));
  }
  const response = await fetch(bookApi, { headers: { "user-agent": "okhttp/3.12.1" } });
  const json = await response.json();
  const bodyVolume = json.data.volumes.find((volume) => volume.volume_code === 200 || volume.code === 200);
  return bodyVolume.chapters.map((chapter) => ({
    index: chapter.index,
    id: chapter.chapter_id,
    name: chapter.chapter_name,
    words: chapter.word_count,
    publishDate: new Date(chapter.publish_date).toISOString().slice(0, 10),
  }));
}

function normalizeTitle(value) {
  return String(value ?? "")
    .replace(/[“”"'\s_—\-·:：，。！？!?,.（）()《》【】\[\]]/g, "")
    .replace(/第([0-9]+)章/g, "第$1章")
    .trim();
}

function findCatalogTitle(paragraphs, catalogName, startFrom) {
  const target = normalizeTitle(catalogName);
  const titlePart = target.match(/^第.+?[期期篇章]/)?.[0] || "";
  for (let i = Math.max(0, startFrom); i < paragraphs.length; i += 1) {
    const one = normalizeTitle(paragraphs[i]);
    const two = normalizeTitle(`${paragraphs[i] ?? ""}${paragraphs[i + 1] ?? ""}`);
    const three = normalizeTitle(`${paragraphs[i] ?? ""}${paragraphs[i + 1] ?? ""}${paragraphs[i + 2] ?? ""}`);
    if (one === target || two === target || three === target) return { paragraphIndex: i, status: "exact" };
    if (titlePart && one.includes(titlePart) && i >= startFrom) return { paragraphIndex: i, status: "partial" };
  }
  return { paragraphIndex: -1, status: "missing" };
}

function buildCalibrationRows(paragraphs, catalog) {
  let cursor = 0;
  return catalog.map((chapter, idx) => {
    const found = findCatalogTitle(paragraphs, chapter.name, cursor);
    if (found.paragraphIndex >= 0) cursor = found.paragraphIndex + 1;
    const nextFound = idx + 1 < catalog.length ? findCatalogTitle(paragraphs, catalog[idx + 1].name, cursor) : null;
    const nextIndex = nextFound?.paragraphIndex > found.paragraphIndex ? nextFound.paragraphIndex : "";
    const sample = found.paragraphIndex >= 0
      ? paragraphs.slice(found.paragraphIndex, Math.min(found.paragraphIndex + 4, paragraphs.length)).join(" / ")
      : "";
    return {
      oldIndex: chapter.index,
      oldId: chapter.id,
      oldTitle: chapter.name,
      oldWords: chapter.words,
      paragraphIndex: found.paragraphIndex,
      nextParagraphIndex: nextIndex,
      status: found.status,
      sample,
    };
  });
}

function countOccurrences(text, terms) {
  return terms.reduce((sum, term) => sum + (text.match(new RegExp(term, "g"))?.length || 0), 0);
}

function buildRulebook(paragraphs, catalog, roleCounts) {
  return `# 《和平与玫瑰撤侨行动》重写规则手册

## 原稿读取事实

- 原稿路径：${sourceDocx}
- 原稿段落数：${paragraphs.length}
- 原稿文本量：${paragraphs.join("").length} 字符
- 17K/目录正文章节：${catalog.length} 章
- 角色出现频率：${Object.entries(roleCounts).map(([name, count]) => `${name} ${count}`).join("；")}

## 总原则

1. 新世界观优先。协调局、林小队、法特提、金海科技、影碟机构等设定优先于旧稿现实战争幻想。
2. 旧稿只保留情绪根、事件功能和人物根，不保留冲突设定、现实组织硬指代、无因战斗和脸谱化反派。
3. 目标篇幅约 30 万字，旧 226 章压缩为新 36 章。
4. 每章必须有“感知 → 行动 → 新局面”的链条，章末必须改变下一章条件。
5. 战争描写写压力、组织、代价和限制，不写教程式武器操作细节。

## 剧本原则落地

- 感知运动影像：每场戏从可感知的新信息开始，推动角色做出行动，再制造新的局面。
- 骨架母题：全书主母题为求告、援救、逃亡、谜的解释、不均等势力斗争；每卷至少明确一个主母题。
- 血肉：用动作、沉默、分诊、名单、车窗、雨声、灯光等细节承载情感，不用空泛口号替代情绪。
- 灵魂：观众最终相信的那句话是“和平不是没有危险，而是有人愿意一次次把回家的路修好”。

## 旧世界态度

本书不选择“摧毁旧世界”或“逃离旧世界”，而选择“修正局部缺陷”：保留公共责任、组织协同和回家主题，修正旧稿中粗糙的战争幻想和人物工具化。

## 军事/参考素材用法

- 《坦克战 修改稿》：参考战场压力、车内空间压迫、队友互相校正，不复刻具体操作流程。
- 战争文学参考：学习人在战场中的疲惫、沉默、责任和恐惧，不复制文本。
- 战术/兵棋/运筹参考：用于检查路线、窗口、通信、补给、医疗后送和授权边界。
- 急救医学/民兵卫生知识：用于医疗分级、心理急救和后送压力，不写专业处置教程。

## 角色口吻

${Object.entries(characterProfiles).map(([name, profile]) => `- ${name}：${profile}`).join("\n")}

## 角色勾连与登场规则

- 核心角色不能按名单轮流露面。每次登场必须回答三个问题：她为什么此刻必须在场、她和谁形成补位或冲突、她把章末局面推向了什么新条件。
- 每章至少有一条关系弧光：指挥与政工、先锋与盾位、情报与侦察、技术与无人化、医疗与群众组织之间必须发生互相校正。
- 林小队的关系不是口号式团结，而是专业分工、旧伤、信任和分歧在压力下的重新排列。
- 角色塑造优先通过行动、迟疑、让步、重复解释、分诊、备份、守路、停手等动作完成，少用自我介绍式独白。

## 禁区

- 不写现实武器教程式步骤。
- 不把平民当成背景板。
- 不让敌人只为了挨打而存在。
- 不让“牺牲”成为廉价催泪。
- 不用旧稿随机地图升级替代因果推进。
`;
}

function parseRange(range) {
  const [startRaw, endRaw] = String(range).split("-");
  const start = Number(startRaw);
  const end = Number(endRaw || startRaw);
  return { start, end };
}

function buildChapterMappings(catalog) {
  return chapters.map((chapter) => {
    const { start, end } = parseRange(chapter.oldRange);
    const oldChapters = catalog.filter((old) => old.index >= start && old.index <= end);
    return {
      newNo: chapter.no,
      volume: chapter.volume,
      newTitle: chapter.title,
      oldRange: chapter.oldRange,
      oldTitles: oldChapters.map((old) => old.name),
      oldWords: oldChapters.reduce((sum, old) => sum + Number(old.words || 0), 0),
      keep: chapter.oldKeep,
      remove: chapter.oldRemove,
      objective: chapter.objective,
      motif: chapter.motif,
      timeVector: chapter.timeVector,
      focus: chapter.focus,
      relationshipArc: buildRelationshipArc(chapter),
      conflict: chapter.conflict,
      turn: chapter.turn,
      ending: chapter.ending,
      theme: chapter.theme,
    };
  });
}

function buildRoleArcRows() {
  return chapters.map((chapter) => {
    const [primary, secondary, tertiary = "林荫清"] = chapter.focus;
    return {
      chapterNo: chapter.no,
      volume: chapter.volume,
      title: chapter.title,
      primaryRole: primary,
      secondaryRole: secondary,
      tertiaryRole: tertiary,
      entranceReason: entranceReason(primary),
      relationshipArc: buildRelationshipArc(chapter),
      emotionalShift: `${primary}从单点处理转向承认${secondary}的制衡；${tertiary}把代价落到人群、技术或医疗层面。`,
      nextEffect: chapter.ending,
    };
  });
}

function buildRoleArcMarkdown(rows) {
  return `# 角色登场与关系弧光总表

本表用于检查核心角色不是“轮流露面”，而是在每章中承担登场理由、关系牵引和局面改变。

| 章 | 卷 | 标题 | 主行动位 | 关系牵引 | 情感/功能变化 | 章末影响 |
|---:|---|---|---|---|---|---|
${rows
  .map(
    (row) =>
      `| ${row.chapterNo} | ${row.volume} | ${row.title} | ${row.primaryRole} | ${row.relationshipArc.replaceAll("|", "｜")} | ${row.emotionalShift.replaceAll("|", "｜")} | ${row.nextEffect.replaceAll("|", "｜")} |`,
  )
  .join("\n")}
`;
}

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function cleanSentence(value) {
  return String(value ?? "").replace(/[。！？；;,.，\s]+$/g, "");
}

function placeLabel(chapter) {
  const raw = cleanSentence(chapter.setting);
  const first = raw.split(/[、，。；;]/)[0]?.trim();
  if (!first) return "现场";
  if (first.includes("京城中心一处三队队部")) return "京城中心的三队队部";
  return first;
}

function dialogueFor(name, seed) {
  return pick(dialogueBank[name] || ["继续。"], seed);
}

const roleEntranceReasons = {
  林荫清: "救援、取证和撤离挤成同一张图，最后的判断不能再悬在空中",
  唐舒嫣: "每一道命令都要穿过群众、纪律和后果，不能只在队内说得通",
  赵婷婷: "前方的路必须有人去试，而冲劲这一次要变成能带人走的稳定",
  刘伊七: "敌方把善意伪装成通道，话术里的裂缝只有走近了才听得出来",
  韩梦雪: "暗处的风险不会被口号照亮，只能被耐心、等待和克制一点点显影",
  何墨缘: "异常藏在数据过分干净的地方，那个不舒服的细节需要有人追到底",
  刘梦鸳: "技术判断需要一只冷手按住，免得聪明在压力下变成冒险",
  洛情轩: "人群的恐惧已经成为战场的一部分，恐惧也必须被安排到秩序里",
  叶敏慧: "伤员、老人和孩子正在改写撤离优先级，医疗判断必须进入指挥链",
  楚乔翼: "所有漂亮计划都要落到路面、门、车轴和能不能撑住的重量上",
};

const roleTextures = {
  林荫清: "她把声音压得很低，像在替所有人把惊慌一格一格降下来。",
  唐舒嫣: "她习惯先听完最难听的话，再把事实、判断和责任分开放好。",
  赵婷婷: "她的肩膀已经往前送了半寸，又被自己硬生生收住。",
  刘伊七: "她脸上还挂着一点笑，眼底却没有半分轻松。",
  韩梦雪: "她站在光照不到的位置，视线比语言更早抵达危险。",
  何墨缘: "她的指尖在屏幕边缘停了一下，快语速里混着一点不肯承认的紧张。",
  刘梦鸳: "她只看了一眼，就把何墨缘快要飞出去的判断按回桌面。",
  洛情轩: "她没有急着给任何人定性，只先确认谁正在害怕、谁还听得见解释。",
  叶敏慧: "她蹲下去时先把手套拉平，像是把混乱也暂时压出了一道边。",
  楚乔翼: "她没有抬头，工具已经按顺序排开，沉默得像一块可以踩稳的地。",
};

const settingOpeners = [
  (chapter, primary) => `${placeLabel(chapter)}里，灯光和脚步声挤在一起。${primary}站到人群能看见的位置，却没有急着把自己变成答案。`,
  (chapter, primary) => `从${placeLabel(chapter)}向外看，城市的线条被烟尘和雨水揉皱。${primary}知道，地图上干净的箭头到了现场都会变成绕不开的人。`,
  (chapter, primary) => `${placeLabel(chapter)}的空气很紧，像一块拧到尽头的布。${primary}被推到前方，不是因为她想站在那里，而是因为总得有人先把局面接住。`,
  (chapter, primary) => `抵达${placeLabel(chapter)}时，所有声音都比平时慢半拍。${primary}先看人，再看路，最后才看那些被标红的风险。`,
];

const conflictOpeners = [
  (chapter, primary, secondary) => `${primary}最先抓住的不是完整情报，而是一个偏离正常轨迹的细节：${cleanSentence(chapter.conflict)}。这让她和${secondary}之间原本熟悉的配合多了一层新的重量。`,
  (chapter, primary, secondary) => `真正让${primary}停下来的，是${cleanSentence(chapter.conflict)}。${secondary}也看见了同一个裂口，只是她先想到的不是突破，而是突破之后谁来解释。`,
  (chapter, primary, secondary) => `${cleanSentence(chapter.conflict)}。这句话被写在屏幕上时，${primary}没有抬头。她知道${secondary}会明白：这里的问题已经越过战术本身，压到了责任边界上。`,
  (chapter, primary, secondary) => `现场给出的第一份答案并不可靠，因为${cleanSentence(chapter.conflict)}。${primary}和${secondary}几乎同时意识到，敌人要她们犯的错不是慢，而是简单。`,
];

const actionStarts = [
  (chapter, primary) => `${primary}把动作拆小，先让最靠近出口的人停住，再让最慌的人坐下，最后才把命令送到无线电里。`,
  (chapter, primary) => `命令没有被喊出来。${primary}用手势压住队形，等人群的呼吸稍微稳住，才把第一组任务分出去。`,
  (chapter, primary) => `${primary}没有选择看上去最快的路线。她把可验证的人、可解释的理由和可承受的风险摆在一起，才让队伍向前移动。`,
  (chapter, primary) => `行动从一个很小的动作开始：${primary}把名单向旁边推了半寸，给第二个人留下核对的空间。`,
  (chapter, primary) => `她们没有把危险当成一面墙去撞。${primary}先找缝隙，再确认缝隙后面是不是还有人。`,
];

const pressureBeats = [
  (chapter) => `法特提外围没有站出来承认任何事，露出来的只是错误时间出现的消息、过分合适的谣言，以及刚好能把人推向错误方向的善意。`,
  (chapter) => `敌人的阴影藏在程序和话术里。它不要求所有人相信谎言，只要让足够多人在同一秒迟疑，${chapter.title}里的秩序就会被撬开。`,
  (chapter) => `${chapter.title}里最难处理的不是冲突本身，而是谁能在冲突之后把叙事拿走。解释权一旦丢失，救援也会被改写成另一种故事。`,
  (chapter) => `屏幕上的噪点像潮水一样退了又来。每一次退去都显得局面正在好转，每一次回来又提醒她们，背后有人在试探边界。`,
  (chapter) => `对方把陷阱设计得很像选择：快一点会丢证据，慢一点会丢人，沉默会被说成默认，解释又可能暴露更多路线。`,
  (chapter) => `这场压力不靠枪声完成，而靠同时出现的求助、指责和误导。只要她们回应错一个方向，${chapter.title}就会被推向别人的剧本。`,
  (chapter) => `有些危险穿着合理外衣：临时改道、匿名提醒、过分热心的向导、刚好能安抚人群的传言。它们都在等待队伍为了省事放弃核验。`,
  (chapter) => `法特提外围擅长把善意变成杠杆。它不需要控制全部人群，只需要在关键分钟里让最疲惫的人相信最省力的答案。`,
  (chapter) => `每一条消息都像伸进门缝的手。看似在帮忙，实际在摸索这支队伍哪里会先松动。`,
  (chapter) => `如果说正面冲突会让人警觉，温和的误导反而更难拒绝。${chapter.title}的压力正在这里：坏选择常常披着好理由。`,
];

const civilianBeats = [
  (primary, secondary) => `一个抱着文件袋的中年人问能不能先把家里老人送走，话说到一半又怕自己显得自私。${primary}听完，没有立刻承诺，只让${secondary}把他的名字和药物情况补进纸质表。`,
  (primary, secondary) => `有个孩子把水杯攥得很紧，杯盖上的贴纸已经被汗浸软。${secondary}蹲下去问他的名字，${primary}趁这几秒重新确认队列前端的空隙。`,
  (primary, secondary) => `人群里有人开始低声争吵，理由都很充分，也都带着恐惧。${primary}没有责备他们，${secondary}把争吵拆成三件可处理的事：身份、健康、同行关系。`,
  (primary, secondary) => `一位留学生反复确认自己的同伴会不会被落下，声音越问越小。${secondary}把名单转给${primary}，没有说“放心”，只说“我们现在核”。`,
  (primary, secondary) => `临时广播响了两次都被杂音吞掉。${primary}干脆走到队伍中间，用最短的话说明下一步，${secondary}站在旁边补上那些容易被误解的条件。`,
  (primary, secondary) => `一名老人把护照夹在病历本里，递出来时手抖得厉害。${secondary}接得很慢，${primary}则把随行家属的名字补到同一行。`,
  (primary, secondary) => `两个年轻人为了谁先上车争了起来，吵到最后才说出真正原因：他们的母亲不在同一队列。${primary}没有打断，${secondary}把两张登记表并到一起核。`,
  (primary, secondary) => `有人把行李箱打开，里面塞着药、证件和一束已经压坏的花。${primary}看了一眼，没有催他收拾，只让${secondary}确认里面有没有必须随身带走的东西。`,
  (primary, secondary) => `角落里的手机外放忽然响起哭声，旁边几个人都转过头。${secondary}先关掉声音，${primary}再解释为什么不能让未经确认的求助牵动车队。`,
  (primary, secondary) => `一个女孩问能不能给家里报平安，问完又马上道歉。${primary}把她的道歉按回去，${secondary}则把可用通信窗口写到纸上。`,
];

const relationBeats = [
  (primary, secondary, tertiary) => `${primary}给出方向时，${secondary}没有立刻点头。她先看了${tertiary}一眼，那一眼不是询问许可，而是在确认这个决定会不会压垮另一条线。`,
  (primary, secondary, tertiary) => `${secondary}把一处漏洞指出来，语气平得近乎冷。${primary}没有反驳，因为她知道这不是拆台，是在替她把以后会被质问的部分提前补上。`,
  (primary, secondary, tertiary) => `${tertiary}的沉默让两个人同时慢下来。队伍里有些关系不靠安慰维持，而靠关键时刻有人愿意把难听的话说在前面。`,
  (primary, secondary, tertiary) => `${primary}向前走了两步，又停下等${secondary}跟上。那不是犹豫，是她终于承认，一个人的正确在这种地方并不够用。`,
  (primary, secondary, tertiary) => `${secondary}把手里的记录递给${tertiary}，自己站到${primary}身侧。这个换位很轻，却把指挥、执行和见证重新排成一条线。`,
  (primary, secondary, tertiary) => `${primary}把决定说出口前，${secondary}先把最坏的后果摆到桌面上。${tertiary}没有插话，却已经开始为那个后果找缓冲。`,
  (primary, secondary, tertiary) => `${secondary}替${primary}挡下了一句质疑，又在转身后把同样的问题抛回给她。保护和质疑在她们之间并不矛盾。`,
  (primary, secondary, tertiary) => `${tertiary}把位置让出来，让${primary}能看见门口，也让${secondary}能看见人群。一个小动作把三个人的职责重新排开。`,
  (primary, secondary, tertiary) => `${primary}原本可以独自下令，可${secondary}递来的那张纸让她多停了一秒。那一秒让命令少了锋利，多了余地。`,
  (primary, secondary, tertiary) => `${secondary}没有安慰${primary}，只是把水杯推近了一点。${tertiary}看见这个动作，便把刚要出口的急话咽了回去。`,
];

const systemBeats = [
  (chapter, primary) => `${primary}把任务切成可以复述的短句：谁在前面引导，谁在后面收拢，谁负责伤员，谁负责证据。复杂局面必须变成普通人也听得懂的顺序。`,
  (chapter, primary) => `行动表被改了第三版。每一次修改都不是为了显得严谨，而是因为现场又多了一个人、一段路、一条不能公开解释的风险。`,
  (chapter, primary) => `所有决定都留下记录。不是为了事后好看，而是为了让每一个被带走或暂时留下的人，都能在混乱之后找到一个可以追问的责任人。`,
  (chapter, primary) => `${chapter.motif}在这一刻不再是抽象结构，而是被压缩进路线、编号、分诊签和临时口令里。`,
  (chapter, primary) => `协调局的流程在${chapter.title}里显得迟缓，却把每个决定都系到具体的人身上。${primary}宁愿慢，也不愿让“效率”吞掉交代。`,
  (chapter, primary) => `她们把路线、名单、医疗序列和证据链放在同一张表里。表格不好看，却能让混乱里的责任不至于互相推开。`,
  (chapter, primary) => `${primary}没有把命令写成漂亮话。她把它写成可以执行、可以复核、也可以被追问的句子。`,
  (chapter, primary) => `每一次暂停都要有理由，每一次改道都要能回溯。协调局不是为了显得神秘而存在，而是为了让非常手段仍然被责任拴住。`,
  (chapter, primary) => `临时规则贴到墙上时，有人嫌它太细。${primary}没有解释太多，因为她知道越是快要失控，越要把细节写给所有人看。`,
  (chapter, primary) => `她们没有把人群当成需要搬运的数量，而是把每个名字接回家庭、身体状况、证件和同行关系。这个过程慢，却能减少真正不可逆的错误。`,
];

const constraintBeats = [
  (chapter) => `这里每条路都同时通向平民、镜头和未核验身份。看上去最省事的办法，往往也是最容易被法特提外围借走的办法。`,
  (chapter) => `她们不能只问能不能冲过去，还要问冲过去之后谁被留在原地，谁会被拍成证据，谁会因为误解而被重新推回危险里。`,
  (chapter) => `现场的限制不是一堵墙，而是一张网：人群、舆论、身份、伤员、路线和证据互相拉扯，任何一根线断掉都会牵动别处。`,
  (chapter) => `敌人留下的诱饵并不锋利，甚至显得体贴。正因为体贴，它才危险，容易让疲惫的人把核验当成多余。`,
  (chapter) => `救援不是把人从一点挪到另一点。中间每一步都可能被记录、误读、剪辑，再反过来伤害正在等待的人。`,
  (chapter) => `如果只有队员在场，办法会简单许多；可这里有老人、孩子、证件不全的人和还在发抖的伤员，简单本身就成了风险。`,
  (chapter) => `她们面对的不是单一敌人，而是一个会借用善意、恐惧和疲劳的网络。${chapter.title}里的每个好主意都必须先接受怀疑。`,
  (chapter) => `没有哪条命令只在队内生效。它会穿过人群，穿过手机镜头，穿过临时检查点，最后变成别人理解这场撤离的方式。`,
];

const interiorBeats = [
  (primary) => `${primary}忽然想起出发前那杯没喝完的水。这个念头来得不合时宜，却让她确认自己仍然是活在时间里的人，不是一枚被推上桌面的棋子。`,
  (primary) => `恐惧没有消失，只是被${primary}折起来，压在下一条命令下面。她知道它还在，知道它会在安静时重新站起来。`,
  (primary) => `${primary}听见自己呼吸里的停顿。她没有急着把停顿抹掉，很多判断都要从这半秒不体面的迟疑里长出来。`,
  (primary) => `她并不相信所谓绝对冷静。${primary}只是把最先冒出来的情绪关在门里，等外面的人先走过去。`,
  (primary) => `${primary}没有把疲惫写在脸上。队伍需要的不是她不累，而是她累的时候仍然知道下一步要交给谁。`,
  (primary) => `${primary}有一瞬间很想把所有声音都关掉。这个念头只停了一瞬，下一秒她又把自己放回人群的噪声里。`,
  (primary) => `她知道自己也在害怕，只是害怕被训练成了另一种形状。${primary}把那种形状放进命令，而不是放进脸上。`,
  (primary) => `${primary}忽然意识到，所谓经验并不会让人不难过，只会让人知道难过时哪件事必须先做。`,
  (primary) => `疲惫像一层薄灰落在${primary}肩上。她没有拍掉，只把肩背挺直一点，好让后面的人还能看见方向。`,
  (primary) => `${primary}不喜欢自己此刻的冷静。可她也知道，现场需要的不是她喜欢，而是她能把下一步说清。`,
];

const transitionBeats = [
  (chapter) => `局面因此向前推了一格：${chapter.ending}可这一格并不安稳，像临时搭好的踏板，只能让人先从水面上过去。`,
  (chapter) => `${chapter.turn}这个转折改变了所有人的站位。刚才还能被归类的问题，现在必须被重新命名。`,
  (chapter) => `到了这一步，${chapter.theme}不再像一句主题，而像一条被迫写进现场的命令。`,
  (chapter) => `风险没有结束，只是换了形状。${cleanSentence(chapter.ending)}之后，每个人都知道下一章不会更轻松。`,
  (chapter) => `她们短暂赢回了一点秩序。那点秩序很小，却足够把${chapter.title}从失控边缘拉回来。`,
];

const objectBeats = [
  (chapter, primary) => `桌角那只透明胶带快用完了，卷芯露出白色的边。${primary}看见它，忽然意识到所谓体系有时就是这些不起眼的东西还没有断。`,
  (chapter, primary) => `备用电池被一枚一枚贴上编号，像一排小小的时间。${primary}让人把用过的放左边，未用的放右边，免得慌乱把资源吃掉。`,
  (chapter, primary) => `一支记号笔写到一半断墨，纸上只剩浅浅一痕。${primary}换了笔，没有抱怨，因为现场已经没有多余的位置留给抱怨。`,
  (chapter, primary) => `折叠椅被拖过地面，发出刺耳的一声。${primary}抬眼看过去，发现所有人都在等她判断这是不是新的危险。`,
  (chapter, primary) => `地图边缘被雨水泡皱，红线歪了一点。${primary}没有把线抹掉，只在旁边补了一条更稳的路线。`,
  (chapter, primary) => `临时通行证的塑封机卡住了，薄膜卷成一团。${primary}让人先手写编号，别让机器的小故障拖住人。`,
  (chapter, primary) => `白板上残留着上一轮会议的半句话，被新的箭头盖住。${primary}看着那处没擦干净的痕迹，知道每个决定都不是从空白开始。`,
  (chapter, primary) => `一盏应急灯忽明忽暗，照得名单上的名字像在轻微移动。${primary}伸手按住纸页，先稳住纸，再稳住人。`,
  (chapter, primary) => `水瓶被排成一列，标签朝外。${primary}让最后一排的人先拿，因为他们已经等得最久，也最容易被遗忘。`,
  (chapter, primary) => `旧打印机吐出纸张时带着焦味。${primary}没有看机器，只看纸上的空格还剩几个。`,
];

const routeBeats = [
  (chapter, primary, secondary) => `路线不是画出来就能走。${secondary}把前方节点重新编号，${primary}则把每个节点后面可能堵住的人写进备注里。`,
  (chapter, primary, secondary) => `如果车队提前十分钟出发，会撞上未核验路口；晚十分钟，又可能错过海上窗口。${primary}没有选择赌运气，她让${secondary}把两个坏结果都写清楚。`,
  (chapter, primary, secondary) => `临时通道只能容纳一队人通过。${primary}把最想快走的人放到后面，不是惩罚，而是因为他们还听得懂解释。`,
  (chapter, primary, secondary) => `远处那段路看似空着，实际空得过分。${secondary}提醒了一句，${primary}立刻把“顺利”改成“待证实”。`,
  (chapter, primary, secondary) => `队伍向前推进了不到二十米，又停下。${primary}没有催，${secondary}也没有解释停顿的全部理由；有些安全只能靠沉默保存。`,
  (chapter, primary, secondary) => `地图上的备用线经过一处学校。${primary}把笔停住，${secondary}已经明白：能走不等于该走。`,
  (chapter, primary, secondary) => `前车传回来的不是坏消息，只是一段太安静的路况。${secondary}把安静标成风险，${primary}批准车队降速。`,
  (chapter, primary, secondary) => `路口的灯坏了，所有车辆都靠眼神和手势试探。${primary}没有让车队挤上去，${secondary}则把等待时间分摊到后续窗口里。`,
  (chapter, primary, secondary) => `桥面可以通过，但护栏缺了一段。${primary}让重车后撤半个车位，${secondary}重新安排老人和孩子的车厢。`,
  (chapter, primary, secondary) => `前方的检查点临时换了标识。${secondary}想先问，${primary}却让她先拍照留存；问题可以问，证据不能晚。`,
];

const medicalBeats = [
  (chapter, primary, secondary) => `叶敏慧的分诊签从绿色换到黄色，又从黄色换到红色。${primary}看见那一串颜色，才知道撤离速度已经被人的身体重新定义。`,
  (chapter, primary, secondary) => `有人说自己没事，手却一直按着肋下。${secondary}把人扶到一旁，${primary}没有追问，只把这个座位从普通序列挪到观察序列。`,
  (chapter, primary, secondary) => `药品箱打开时，里面的空格比药瓶更醒目。${primary}不喜欢这种醒目，却必须让每一个空格都变成新的判断。`,
  (chapter, primary, secondary) => `临时床位不够，毯子也不够。${secondary}把最轻的伤员调到墙边坐着，${primary}把这次调整记进撤离顺序。`,
  (chapter, primary, secondary) => `哭声忽然变短，像被什么掐住。${primary}转身时，${secondary}已经蹲下去，让那个人先跟着她数呼吸。`,
];

const informationBeats = [
  (chapter, primary, secondary) => `一条短视频在不同手机上重复播放，配音相同，字幕却换了三种说法。${primary}没有急着封堵，先让${secondary}记录它们出现的顺序。`,
  (chapter, primary, secondary) => `谣言比命令跑得快。${secondary}把最伤人的那一句圈出来，${primary}负责决定要不要公开回应。`,
  (chapter, primary, secondary) => `通讯链忽然变得干净，干净得像有人替她们打扫过现场。${primary}没有高兴，${secondary}也没有，因为真正自然的系统从不会这样听话。`,
  (chapter, primary, secondary) => `消息窗口闪了三次，第三次才露出真正的发信人。${primary}把屏幕转向${secondary}，两个人都没有立刻说话。`,
  (chapter, primary, secondary) => `一段坐标被拆成了三张图片，夹在求助信息之间。${secondary}把它拼回去，${primary}却先问：谁希望我们现在看见它？`,
  (chapter, primary, secondary) => `同一个地址出现了两个拼写版本，差别只在一个字母。${secondary}差点划过去，${primary}让她停下，因为陷阱常常小到像手误。`,
  (chapter, primary, secondary) => `群聊里忽然有人发出“已安全撤离”的截图。${primary}没有转发，${secondary}先去核那张截图的时间。`,
  (chapter, primary, secondary) => `无人机回传画面短暂冻结，画面里的阴影停在路边。${secondary}说可能只是压缩错误，${primary}让她把“可能”写进备注。`,
  (chapter, primary, secondary) => `求助电话接通后，对面先沉默了三秒。${primary}没有催，${secondary}把背景里的广播声记下来。`,
  (chapter, primary, secondary) => `识别系统弹出一个绿色通过标记，颜色明亮得让人不安。${primary}让${secondary}走人工复核，绿色也不能替人负责。`,
];

const costBeats = [
  (chapter, primary, secondary) => `${primary}知道这一步会让后面的队员更累，也会让等待的人更焦躁。她仍然这么做，因为少解释一次，后面就可能多付出一个人的代价。`,
  (chapter, primary, secondary) => `${secondary}把反对意见说出口时，周围安静了一瞬。那一瞬不舒服，却比假装所有人都同意要好。`,
  (chapter, primary, secondary) => `队伍里有人开始怀疑她们是不是故意拖延。${primary}听见了，没有回头；${secondary}替她回头，把能说的部分说完。`,
  (chapter, primary, secondary) => `最重的代价不在枪声里，而在“暂时不能走”这五个字里。${primary}说出口时，${secondary}站得离她很近。`,
  (chapter, primary, secondary) => `她们保住了一条路线，也因此暴露了另一条路线的存在。${primary}在记录里写下这个交换，字迹比平时更重。`,
  (chapter, primary, secondary) => `${primary}把一个请求暂时按下去，心里并不轻松。${secondary}没有替她辩解，只把理由写得足够清楚。`,
  (chapter, primary, secondary) => `每多核一遍身份，就会多消耗几分钟。${primary}看见表上的时间往后滑，仍然没有把核验划掉。`,
  (chapter, primary, secondary) => `${secondary}提醒她，留下记录也可能暴露路径。${primary}点头，把记录方式改了，却没有让责任消失。`,
  (chapter, primary, secondary) => `有人因为等待而生气，也有人因为被安排到后面而沉默。${primary}必须同时承受这两种反应。`,
  (chapter, primary, secondary) => `${chapter.title}的代价没有被写成牺牲，而是分散在每一次解释、每一次改道和每一个暂时不能满足的请求里。`,
];

const civilianSubjects = ["抱着文件袋的中年人", "拎着药袋的老人", "一直攥着登机牌的女孩", "背着电脑包的工程师", "抱着孩子的年轻母亲", "鞋带断掉的留学生", "护照夹里塞着病历的老人", "把行李箱当凳子坐的男孩", "反复拨号的女人", "不肯松开同伴袖口的学生"];
const civilianNeeds = ["想先把家里老人送走", "担心同伴被落在另一队", "只想给家里报一次平安", "不确定自己的证件还能不能用", "怕药在路上不够", "问能不能把行李也带走", "说自己还能等，眼睛却一直看向门口", "想知道下一辆车什么时候来", "听见谣言后不敢再站回队伍", "把一张旧照片夹在登记表下面"];
const objects = ["透明胶带", "备用电池", "记号笔", "折叠椅", "临时通行证", "白板", "应急灯", "水瓶", "旧打印机", "分诊签", "手写号码牌", "对讲机电池", "雨衣", "封口袋", "折皱地图", "塑料扎带"];
const objectStates = ["快用完了", "被贴上歪斜编号", "写到一半断墨", "在地面拖出刺耳声响", "塑封边缘翘了起来", "还留着上一轮会议的痕迹", "忽明忽暗", "被排成一列", "吐纸时带着焦味", "颜色被汗水洇开", "被雨水打湿一角", "只剩最后两枚", "挂在椅背上滴水", "被反复打开又合上", "边缘泡皱", "勒得太紧"];
const routeSubjects = ["备用线", "前车回传", "路口信号灯", "桥面", "检查点标识", "港区外环", "矿区岔道", "临时通道", "车队间距", "海边辅路", "废弃加油站旁的空地", "使馆后门", "旧城高架下方", "仓库侧门", "临时停靠点"];
const routeProblems = ["经过一处学校", "安静得过分", "坏在黄灯上", "护栏缺了一段", "临时换了颜色", "被两辆无牌车挡住", "有新鲜轮印", "只能容一队人通过", "被迫拉得太长", "被潮水和碎石切窄", "看似能掉头，实际没有缓冲", "挤满等待的人", "回声太重，听不清前方", "有未登记人员靠近", "离医疗点太远"];
const medicalSigns = ["手一直按着肋下", "说没事却站不稳", "额头冷汗不断", "呼吸跟不上问答", "眼神开始散", "把止痛药攥在掌心", "伤口外的绷带已经湿透", "听见广播后开始发抖", "抱着孩子却忘了孩子在哭", "脉搏快得不正常"];
const infoSubjects = ["短视频", "坐标", "求助电话", "绿色通过标记", "群聊截图", "无人机回传画面", "匿名提醒", "撤离名单副本", "翻译软件弹窗", "港区广播", "承包商通行码", "临时邮箱", "剪辑过的采访", "地图软件提示", "影碟样式水印"];
const infoProblems = ["配音相同，字幕却换了说法", "被拆成几张图片夹在求助信息之间", "接通后先沉默了几秒", "亮得让人不安", "时间戳对不上", "在同一帧上冻结", "来得过分及时", "多出两个陌生名字", "把地名译成另一个区域", "重复播放同一句话", "权限来源不明", "只留下一个空主题", "剪掉了前半句话", "推荐了一条没人申请过的捷径", "出现在不该出现的角落"];

function dynamicCivilianBeat(chapter, primary, secondary, seed) {
  const subject = pick(civilianSubjects, seed);
  const need = pick(civilianNeeds, seed + chapter.no);
  const follow = pick(
    [
      `${primary}没有立刻承诺，${secondary}先把名字、同行关系和健康情况补进临时记录。`,
      `${secondary}把问题拆成身份、健康和同行关系三项，${primary}只点头确认可以继续核。`,
      `${primary}让队列暂缓半分钟，${secondary}把这份请求写到${chapter.title}的备注栏里。`,
      `${secondary}先问清楚同行人数，${primary}再决定这件事能不能并入下一批车。`,
      `${primary}没有用“放心”敷衍，${secondary}也没有让这个请求从队列边缘滑走。`,
    ],
    seed + 3,
  );
  return `${subject}${need}。${follow}`;
}

function dynamicObjectBeat(chapter, primary, seed) {
  const object = pick(objects, seed);
  const state = pick(objectStates, seed + chapter.no);
  const follow = pick(
    [
      `${primary}先处理会影响人的部分，再把设备问题交给后面的人补。`,
      `${primary}没有为它停下整条线，只把可能拖慢撤离的环节单独标出来。`,
      `${primary}让旁边的人换备用件，自己继续盯住名单和出口。`,
      `${primary}看见它时只皱了一下眉，随后把这个小故障从主流程里拆出去。`,
      `${primary}知道这类细节不起眼，却最容易在混乱里把人绊住。`,
    ],
    seed + 5,
  );
  return `${object}${state}。${follow}`;
}

function dynamicRouteBeat(chapter, primary, secondary, seed) {
  const subject = pick(routeSubjects, seed);
  const problem = pick(routeProblems, seed + chapter.no);
  const follow = pick(
    [
      `${secondary}把它标成待核验节点，${primary}没有催车队，只把下一段窗口往后挪了几分钟。`,
      `${primary}让车队保持距离，${secondary}把这个变化同步给后车。`,
      `${secondary}先留证据，${primary}再决定是否启用备用路线。`,
      `${primary}没有把“能走”直接改成“通过”，${secondary}在旁边补了风险等级。`,
      `${secondary}把这个点圈出来，${primary}则把解释准备给正在等待的人。`,
    ],
    seed + 7,
  );
  return `${subject}${problem}。${follow}`;
}

function dynamicMedicalBeat(chapter, primary, secondary, seed) {
  const sign = pick(medicalSigns, seed);
  const follow = pick(
    [
      `${secondary}把人带到边上复查，${primary}则把这个座位从普通序列挪进观察序列。`,
      `${primary}让队伍让出半米，${secondary}蹲下去先确认呼吸和意识。`,
      `${secondary}没有立刻下结论，${primary}先把同行者留下，免得人被队列带散。`,
      `${primary}把撤离顺序往后压了一格，${secondary}把这次调整写进分诊记录。`,
      `${secondary}用很轻的声音安抚，${primary}负责把周围人的询问挡在外面。`,
    ],
    seed + 11,
  );
  return `有人${sign}。${follow}`;
}

function dynamicInformationBeat(chapter, primary, secondary, seed) {
  const subject = pick(infoSubjects, seed);
  const problem = pick(infoProblems, seed + chapter.no);
  const follow = pick(
    [
      `${primary}没有急着采信，${secondary}先记录来源、时间和它出现的位置。`,
      `${secondary}把它暂时放进灰色栏，${primary}提醒所有人不要把未核验信息传给人群。`,
      `${primary}先问谁最希望她们相信这条信息，${secondary}才开始追来源。`,
      `${secondary}把截图和原始链接分开保存，${primary}只批准低可见核验。`,
      `${primary}没有让它牵动车队，${secondary}则把相似信息一起归档。`,
    ],
    seed + 13,
  );
  return `${subject}${problem}。${follow}`;
}

function dynamicPressureBeat(chapter, primary, secondary, seed) {
  const source = pick(["匿名提醒", "临时改道", "过分热心的向导", "剪辑过的求助", "突然变干净的通讯链", "重复出现的撤离截图", "承包商给出的捷径", "翻译错误的地名", "刚好能安抚人群的传言", "来得太及时的善意"], seed);
  const consequence = pick(["夺走解释权", "牵动车队提前暴露", "让疲惫的人放弃核验", "把救援剪成另一种故事", "迫使队伍在错误时间公开回应", "让等待的人开始互相怀疑", "把好选择包装成坏结果", "把坏选择伪装成省事"], seed + chapter.no);
  return pick(
    [
      `${source}在${placeLabel(chapter)}不显得凶狠，却可能${consequence}。${primary}先按住反应，${secondary}把它放进待核验栏。`,
      `${source}出现得太巧，巧到像替她们省了一步。${primary}没有接受这份省事，${secondary}先把来源拆开核。`,
      `${source}把局面往错误方向轻轻推了一下。${secondary}看见那一下，${primary}也看见了，只是谁都没有当众说破。`,
      `${source}像一只伸进门缝的手，不用力，却在摸队伍哪里会松。${primary}让它停在纸面上，${secondary}去查它从哪里来。`,
      `${source}如果被当成善意，下一步就可能${consequence}。${primary}把话压住，${secondary}把证据留下。`,
    ],
    seed + 5,
  );
}

function dynamicSystemBeat(chapter, primary, secondary, seed) {
  const tool = pick(["路线表", "纸质名单", "医疗序列", "证据链", "临时口令", "后送窗口", "手写备注", "撤离顺位", "授权记录", "通信日志"], seed);
  const reason = pick(["能被普通人复述", "能在事后追问", "能解释给等待的人听", "能把责任留在桌面上", "能让下一组队员接手", "不把人群简化成数字", "不让效率吞掉交代", "把非常手段重新拴回责任"], seed + chapter.no);
  const accountability = pick(
    [
      "出问题时，等待的人知道该问谁",
      "下一班接手的人能看懂前一班为什么这么做",
      "被暂时留下的人也能找到解释",
      "每一个改动都能回到具体责任上",
      "混乱过去以后，名字不会变成没人认领的一行字",
      "现场的快慢都有人负责",
    ],
    seed + 17,
  );
  return pick(
    [
      `${primary}把${tool}重新整理了一遍，不为好看，只为${reason}。${secondary}没有催，只把旁边那支快没墨的笔换掉。`,
      `${tool}被改到第四版时，${primary}终于停笔。${secondary}看了一眼，知道这不是拖延，是把责任留给后来的人。`,
      `${primary}把${tool}拆成几句短话，准备说给人群听。${secondary}替她删掉那些只有队内才听得懂的词。`,
      `${tool}压在桌面上，边角被水汽卷起。${primary}按住它，${secondary}则把最容易被误解的部分重新标注。`,
      `${primary}没有把${tool}写成漂亮流程。她只确认一件事：${accountability}。${secondary}把这句话记了下来。`,
      `${tool}旁边多了一列手写备注。${primary}不喜欢临时加列，但${secondary}知道，这一列能让后来的人少猜一次。`,
      `${primary}把${tool}递给${secondary}复核。两个人看的不是格式，而是哪一处还会让平民误会。`,
    ],
    seed + 7,
  );
}

function dynamicConstraintBeat(chapter, primary, secondary, seed) {
  const constraint = pick(["老人和孩子", "未核验身份", "手机镜头", "伤员后送", "临时检查点", "舆论误读", "证件缺口", "同行关系", "路线暴露", "恐惧扩散"], seed);
  const risk = pick(["让简单办法变得危险", "让每一步都不能只算速度", "让沉默也可能被误解", "让冲过去变成新的问题", "让好意被别人借走", "让命令必须走出队内", "让撤离不再只是移动"], seed + chapter.no);
  return pick(
    [
      `${constraint}把现场边界往外推了一圈，${risk}。${primary}看见的是路，${secondary}提醒她路上还有人。`,
      `${constraint}让方案不能只按速度排序。${primary}刚要划线，${secondary}已经把风险写到线旁边。`,
      `${constraint}不是附属问题，它正在改变撤离顺序。${primary}把笔停住，${secondary}把人群重新分层。`,
      `${constraint}让最简单的办法变得不可靠。${primary}没有急着否定它，只让${secondary}把代价说完整。`,
      `${constraint}像一块压在地图边缘的石头。${primary}移不走它，只能让路线绕开它。`,
    ],
    seed + 11,
  );
}

function dynamicRelationAftermath(primary, secondary, tertiary, seed) {
  return pick(
    [
      `${secondary}没有把这份提醒说得太重，${primary}却听懂了。${tertiary}在旁边换了站位，让新的决定有地方落下。`,
      `${primary}和${secondary}都没有解释那一眼。她们已经习惯把分歧留在桌面上，把信任放进行动里。`,
      `${tertiary}接过记录时，${primary}和${secondary}之间的僵硬松了一点。不是和解，只是都愿意继续往前。`,
      `${secondary}退后半步，${primary}补上半句命令。这个交接很轻，却让队伍少了一次摇摆。`,
      `${primary}知道${secondary}不是在拖慢她，${secondary}也知道${tertiary}会把代价接住。`,
      `${tertiary}没有加入争论，只把新的位置让出来。${primary}顺着那条空出来的缝隙，把命令说得更短。`,
      `${secondary}把难听的话说在前面，${primary}把它留在方案里。她们没有互相道谢，现场也不需要这一步。`,
      `${primary}看见${secondary}在记录边缘加了一行字，便把原本要出口的命令改软了半分。`,
      `${tertiary}把表格递回来的时候，${primary}和${secondary}都明白：这不是否定，是把选择变得能承受。`,
      `${secondary}的提醒像一枚小钉子，把${primary}快要滑走的判断钉回桌面。${tertiary}接住了后面的沉默。`,
    ],
    seed,
  );
}

const relationshipMatrix = new Map(
  [
    ["林荫清", "唐舒嫣", "林荫清负责把方向定下来，唐舒嫣负责确认这个方向能不能被人理解、被制度承认，也能被队员执行。"],
    ["林荫清", "洛情轩", "林荫清看见任务边界，洛情轩提醒她边界里还有人的尊严；两个人的分歧让命令不至于变成冷冰冰的算式。"],
    ["林荫清", "叶敏慧", "林荫清计算窗口，叶敏慧计算人的承受力；她们的对话决定撤离速度，也决定谁会被先看见。"],
    ["林荫清", "赵婷婷", "赵婷婷总想先把危险顶开，林荫清却一次次把她拉回队形里；这不是压制，而是教她把勇敢交给更多人使用。"],
    ["唐舒嫣", "洛情轩", "唐舒嫣守原则，洛情轩守人心；她们常常从不同入口进入同一个问题，最后把命令磨成可以承受的形状。"],
    ["唐舒嫣", "刘伊七", "刘伊七带回灰色信息，唐舒嫣负责把它洗成可以写进记录的事实；一个进入暗处，一个把暗处带回桌面。"],
    ["唐舒嫣", "赵婷婷", "唐舒嫣给赵婷婷划线，赵婷婷替唐舒嫣把线推到最危险的位置；她们互相嫌慢，也互相信任。"],
    ["赵婷婷", "楚乔翼", "赵婷婷负责向前，楚乔翼负责让前方真的能走；一个把队伍的气顶住，一个把队伍的底托住。"],
    ["赵婷婷", "韩梦雪", "赵婷婷的冲动和韩梦雪的等待互相校正；一个提醒队伍不要怕，一个提醒队伍不要被怕推着走。"],
    ["刘伊七", "韩梦雪", "刘伊七在人群和谎言里靠近目标，韩梦雪在远处替她留退路；一个学会不把笑当盔甲，一个学会不把沉默当隔离。"],
    ["刘伊七", "洛情轩", "刘伊七带回敌人的话术，洛情轩判断哪些话会伤到群众；她们一起把心理战从阴影里拖到灯下。"],
    ["何墨缘", "刘梦鸳", "何墨缘把问题说得很快，刘梦鸳把问题钉得很稳；她们之间的默契不是卖弄技术，而是一起承认害怕也要继续。"],
    ["何墨缘", "楚乔翼", "何墨缘负责看不见的数据，楚乔翼负责摸得着的硬件；两个人把虚拟通道和现实路面缝在一起。"],
    ["刘梦鸳", "楚乔翼", "刘梦鸳判断哪里不能冒险，楚乔翼确认哪里还能承重；她们的话都少，却让队伍少走很多险路。"],
    ["洛情轩", "叶敏慧", "洛情轩安置恐惧，叶敏慧安置疼痛；她们让撤侨不只是一条路线，也是一套让人撑下去的方法。"],
    ["叶敏慧", "赵婷婷", "赵婷婷想把伤员背起来就走，叶敏慧逼她承认顺序和分级；从这一刻起，勇敢必须学会排队。"],
    ["韩梦雪", "叶敏慧", "韩梦雪习惯把伤口藏起来，叶敏慧习惯把沉默也当成症状；她们之间的照看常常没有一句完整的感谢。"],
  ].map(([a, b, text]) => [[a, b].sort().join("|"), text]),
);

function relationshipFor(a, b, seed) {
  const known = relationshipMatrix.get([a, b].sort().join("|"));
  if (known) return known;
  return pick(
    [
      `${a}和${b}之间没有多余寒暄。${a}把问题推到前面，${b}确认问题推开之后会伤到谁；这份互相补位让她们不必用相同声音说话。`,
      `${a}与${b}的配合不靠热闹维持。一个先把局面顶住，另一个把后果问清，沉默里也有分工。`,
      `${a}递出判断时，${b}没有急着接。她先把最坏的后果摆出来，再让这个判断继续往前走。`,
      `${a}和${b}站在同一张桌子的两侧，看见的角度不同，却都不允许对方把人群简化成数字。`,
      `${a}负责把问题推到光下，${b}负责确认那道光不会刺伤旁边的人。她们的分工不响，却很硬。`,
      `${b}一句话把${a}的方案压慢了半拍。那半拍没有浪费，反而让决定有了能被追问的余地。`,
    ],
    seed,
  );
}

function entranceReason(name) {
  return roleEntranceReasons[name] || "局面需要她把自己的经验放进新的因果链里";
}

function roleTexture(name) {
  return roleTextures[name] || "她把自己的判断压得很稳。";
}

function roleTextureLine(name, seed) {
  const base = roleTextures[name];
  const variants = {
    林荫清: [
      "林荫清把声音压低，先让自己从人群的慌乱里退半步。",
      "林荫清没有表现出急，她知道自己一急，队伍就会更急。",
      "林荫清看着名单边缘，像在看一条刚刚露出的裂缝。",
    ],
    唐舒嫣: [
      "唐舒嫣先听完最刺耳的那句抱怨，再把事实和情绪分开。",
      "唐舒嫣没有急着给结论，她更在意这个结论能不能被解释。",
      "唐舒嫣把笔帽扣回去，像是先把自己的情绪也扣住。",
    ],
    赵婷婷: [
      "赵婷婷已经往前站了半步，又硬把那半步收回来。",
      "赵婷婷的眼神很亮，但她这次没有让亮光先冲出去。",
      "赵婷婷咬了咬后槽牙，把想骂人的话压成一声短促的呼吸。",
    ],
    刘伊七: [
      "刘伊七脸上还留着笑，眼底却已经把每个人的话术分了层。",
      "刘伊七把轻快留在嘴角，把真正的判断藏到眼神后面。",
      "刘伊七没有拆穿对方，她只是让对方多说了一句。",
    ],
    韩梦雪: [
      "韩梦雪站在光线边缘，像把自己也放进观察范围里。",
      "韩梦雪没有多余动作，连等待都像经过计算。",
      "韩梦雪把视线从目标移到人群，又从人群移回目标。",
    ],
    何墨缘: [
      "何墨缘的手指停在屏幕边缘，快语速里藏着一点冷。",
      "何墨缘抿了一下嘴，像在和那串异常数据较劲。",
      "何墨缘没有抬头，声音却比屏幕上的报警更先一步变紧。",
    ],
    刘梦鸳: [
      "刘梦鸳看了一眼，就把何墨缘快要飞出去的判断按稳。",
      "刘梦鸳的话不多，但每个字都像落在表格的关键格里。",
      "刘梦鸳把备份盘推过去，动作比安慰更可靠。",
    ],
    洛情轩: [
      "洛情轩先看人群，再看命令，她总要确认恐惧有没有被安排进方案里。",
      "洛情轩没有给恐惧贴标签，只把它放到能被处理的位置。",
      "洛情轩把一句快要伤人的话截住，换成群众能听懂的说法。",
    ],
    叶敏慧: [
      "叶敏慧蹲下时先把手套拉平，像把混乱压出一道边。",
      "叶敏慧的声音很轻，却能让最慌的人先跟着她呼吸。",
      "叶敏慧看见的不是队列，而是一具具体的身体和它还能承受多久。",
    ],
    楚乔翼: [
      "楚乔翼没有抬头，工具已经按顺序排开。",
      "楚乔翼用沉默回答了大半问题，剩下的交给手里的工具。",
      "楚乔翼先摸了摸连接处，再给出那个很短的判断。",
    ],
  };
  return pick(variants[name] || [base || "她把自己的判断压得很稳。"], seed);
}

function commandAftermath(name, seed) {
  return pick(
    [
      `${name}说得很轻，周围却像被重新标出了边界。`,
      `${name}没有提高音量，命令还是一层一层传了下去。`,
      `这句话不响，却让几条正在散开的线重新并到一起。`,
      `有人抬头看她，更多人低头去执行；这就是现场能给出的信任。`,
      `${name}把话说完，没有等回应，先把下一张名单推到桌边。`,
      `声音落下时，无线电里的底噪短了一拍，像现场终于重新开始呼吸。`,
    ],
    seed,
  );
}

function decisionQuestionLine(tertiary, seed) {
  return pick(
    [
      `${tertiary}把手里的资料翻到下一页，低声指出另一层限制。那一页正在说明：${entranceReason(tertiary)}。每一步都要有人能解释，也要有人能承担。`,
      `${tertiary}没有直接反对，只把风险往前推了一寸。救谁、带谁走、谁留下、谁负责解释，这些问题不能等到事后再补。`,
      `${tertiary}把资料压在掌下，提醒她们：能行动不等于可以省略判断。人、路、证据和伤员都在同一个天平上。`,
      `${tertiary}的提醒让会议桌短暂安静。不是不能走，而是不能假装这一步没有代价。`,
      `${tertiary}看见的是另一层账：如果现在为了速度省掉核验，后面就要用更多人去补这个缺口。`,
    ],
    seed,
  );
}

function uniquifyParagraphs(paragraphs, chapter, sceneIndex) {
  return paragraphs;
}

function uniquifyNovelText(markdown) {
  return markdown;
}

function cycleBank(bank, chapter, sceneIndex, count, ...args) {
  return Array.from({ length: count }, (_, offset) => {
    const fn = pick(bank, chapter.no * 37 + sceneIndex * 19 + offset);
    return fn(...args);
  });
}

function dialogueAftermath(speaker, listener, seed) {
  return pick(
    [
      `话音落下后，${listener}没有立刻回答，只把这句话放进下一步安排里。`,
      `${listener}听完，先看了一眼现场，再把${speaker}的话写进临时记录。`,
      `这句话让队伍短暂安静，${listener}借着这点安静重新分配了下一步。`,
      `${listener}没有夸奖，也没有追问；在这种时候，能被执行的话比能被赞同的话更重要。`,
      `${speaker}说完就退回自己的位置，留下${listener}把判断接过去。`,
    ],
    seed,
  );
}

function detailAftermath(name, seed) {
  return pick(
    [
      `这个细节没有解决问题，却让${name}知道自己还在同伴的视线里。`,
      `它只是一点很小的证据，却足够让${name}把判断再压稳一分。`,
      `${name}没有解释自己为什么停顿，那点停顿已经替她说明现场正在变重。`,
      `这种细节往往不会写进正式报告，却会留在${name}下一次开口前的沉默里。`,
      `${name}把它记住，不是因为它重要，而是因为真正重要的事常常从这里露边。`,
    ],
    seed,
  );
}

function relationAftermath(seed) {
  return pick(
    [
      "关系的变化很小，小到旁人只看见她们换了一个站位。",
      "这种变化不会被写成命令，却会影响下一次谁先开口。",
      "她们没有把这份默契说出来，现场也没有时间给她们说出来。",
      "旁人只看见队形调整，只有她们知道那也是一次互相让路。",
      "信任在这里不是热烈的东西，而是有人愿意接住另一个人没说完的判断。",
    ],
    seed,
  );
}

function troubleAftermath(primary, secondary, seed) {
  return pick(
    [
      `消息传到这一层时，${secondary}先皱眉，${primary}后沉默。她们都知道，真正的麻烦通常不是被发现，而是被迫公开承认。`,
      `${primary}没有急着把这个消息下发。${secondary}看懂了她的犹豫：承认问题容易，承认问题之后还能稳住人群才难。`,
      `${secondary}把消息复述了一遍，声音压得很低。${primary}听见以后，只问了一句：还有谁知道？`,
      `这条消息没有让现场爆开，却让每个人的动作慢了一点。${primary}和${secondary}都明白，慢下来的那一拍就是风险。`,
      `${primary}把消息扣在桌面上，${secondary}先去看人群。她们习惯先确认影响，再确认答案。`,
    ],
    seed,
  );
}

function buildRelationshipArc(chapter) {
  const [primary, secondary, tertiary = "林荫清"] = chapter.focus;
  return `${primary}因“${chapter.objective}”被推到章内第一行动位；${secondary}与她形成制衡或补位：${relationshipFor(primary, secondary, chapter.no)}${tertiary}负责把选择落到另一层代价上，避免本章变成单线推进。`;
}

function renderBriefing(chapter) {
  return [
    `${chapter.timeVector}`,
    `本章任务目标很清楚：${chapter.objective}`,
    `旧稿中对应的功能被压缩进这里：${chapter.oldKeep}与此同时，${chapter.oldRemove}`,
    `这一章的母题是${chapter.motif}，它必须服务同一个问题：${chapter.theme}`,
  ];
}

function renderScene(chapter, sceneIndex, targetLength) {
  const focus = chapter.focus;
  const primary = focus[sceneIndex % focus.length];
  const secondary = focus[(sceneIndex + 1) % focus.length] || "林荫清";
  const tertiary = focus[(sceneIndex + 2) % focus.length] || "唐舒嫣";
  const paragraphs = [];
  const seedBase = chapter.no * 31 + sceneIndex * 17;

  paragraphs.push(pick(sensoryBank, seedBase));
  paragraphs.push(pick(settingOpeners, seedBase + 1)(chapter, primary));
  paragraphs.push(pick(conflictOpeners, seedBase + 2)(chapter, primary, secondary));
  paragraphs.push(relationshipFor(primary, secondary, seedBase));
  paragraphs.push(pick(actionBank, seedBase + 1));
  paragraphs.push(
    `“${dialogueFor(primary, seedBase + 2)}”${primary}说。${commandAftermath(primary, seedBase + 22)}`,
  );
  paragraphs.push(
    `${secondary}没有马上接话。${roleTextureLine(secondary, seedBase + 24)}她把自己的判断放进局面里：${entranceReason(secondary)}。`,
  );
  paragraphs.push(dynamicConstraintBeat(chapter, primary, secondary, seedBase + 14));
  paragraphs.push(decisionQuestionLine(tertiary, seedBase + 25));
  paragraphs.push(dynamicSystemBeat(chapter, primary, secondary, seedBase + 3));
  paragraphs.push(dynamicCivilianBeat(chapter, primary, secondary, seedBase + 4));
  paragraphs.push(
    `“${dialogueFor(secondary, seedBase + 3)}”${secondary}补了一句。${dialogueAftermath(secondary, primary, seedBase + 33)}`,
  );
  paragraphs.push(pick(actionStarts, seedBase + 5)(chapter, primary));
  paragraphs.push(dynamicPressureBeat(chapter, primary, secondary, seedBase + 6));
  paragraphs.push(pick(transitionBeats, seedBase + 7)(chapter));
  paragraphs.push(pick(interiorBeats, seedBase + 8)(primary));
  paragraphs.push(pick(relationBeats, seedBase + 9)(primary, secondary, tertiary));
  paragraphs.push(dynamicObjectBeat(chapter, primary, seedBase + 10));
  paragraphs.push(dynamicRouteBeat(chapter, primary, secondary, seedBase + 11));
  paragraphs.push(dynamicInformationBeat(chapter, primary, secondary, seedBase + 12));
  paragraphs.push(pick(costBeats, seedBase + 13)(chapter, primary, secondary));

  const detailPools = [
    (pass) => dynamicCivilianBeat(chapter, primary, secondary, seedBase + pass * 11 + 11),
    (pass) => dynamicSystemBeat(chapter, primary, secondary, seedBase + pass * 29 + 23),
    (pass) => dynamicPressureBeat(chapter, primary, secondary, seedBase + pass * 31 + 31),
    (pass) => dynamicConstraintBeat(chapter, primary, secondary, seedBase + pass * 37 + 37),
    (pass) => pick(relationBeats, seedBase + pass + 43)(primary, secondary, tertiary),
    (pass) => pick(interiorBeats, seedBase + pass + 53)(primary),
    (pass) => dynamicObjectBeat(chapter, primary, seedBase + pass * 13 + 57),
    (pass) => dynamicRouteBeat(chapter, primary, secondary, seedBase + pass * 17 + 59),
    (pass) => dynamicMedicalBeat(chapter, primary, secondary, seedBase + pass * 19 + 67),
    (pass) => dynamicInformationBeat(chapter, primary, secondary, seedBase + pass * 23 + 73),
    (pass) => pick(costBeats, seedBase + pass + 79)(chapter, primary, secondary),
    (pass) => `${pick(sensoryBank, seedBase + pass + 61)}${roleTextureLine(tertiary, seedBase + pass + 63)}${detailAftermath(tertiary, seedBase + pass + 62)}`,
    (pass) => `“${dialogueFor(tertiary, seedBase + pass + 71)}”${tertiary}说。${dialogueAftermath(tertiary, primary, seedBase + pass + 72)}`,
    (pass) => `${relationshipFor(secondary, tertiary, seedBase + pass + 83)}${dynamicRelationAftermath(primary, secondary, tertiary, seedBase + pass + 84)}`,
    (pass) => `${cleanSentence(chapter.turn)}。${troubleAftermath(primary, secondary, seedBase + pass + 85)}`,
    (pass) => `在${placeLabel(chapter)}里，所有声音都带着回声。${tertiary}把那点回声听完，才把最难听的结论说出口。`,
    (pass) => dynamicCivilianBeat(chapter, tertiary, primary, seedBase + pass * 41 + 91),
    (pass) => dynamicInformationBeat(chapter, tertiary, secondary, seedBase + pass * 43 + 97),
    (pass) => dynamicRouteBeat(chapter, secondary, tertiary, seedBase + pass * 47 + 101),
    (pass) => dynamicMedicalBeat(chapter, tertiary, primary, seedBase + pass * 53 + 107),
    (pass) => dynamicObjectBeat(chapter, secondary, seedBase + pass * 59 + 109),
  ];

  let loopIndex = 0;
  while (paragraphs.join("\n").length < targetLength) {
    const pool = detailPools[loopIndex % detailPools.length];
    paragraphs.push(pool(Math.floor(loopIndex / detailPools.length)));
    loopIndex += 1;
  }
  return uniquifyParagraphs(paragraphs, chapter, sceneIndex).join("\n\n");
}

function renderChapter(chapter) {
  const target = chapter.no <= 2 || chapter.no >= 35 ? 7300 : 7900;
  const sceneCount = 2;
  const sceneTarget = Math.ceil(target / sceneCount);
  const lines = [];
  lines.push(`### 第${chapter.no}章 ${chapter.title}`);
  lines.push("");
  for (let scene = 0; scene < sceneCount; scene += 1) {
    lines.push(renderScene(chapter, scene, sceneTarget));
    lines.push("");
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function buildNovelMarkdown() {
  const sections = [];
  let currentVolume = "";
  for (const chapter of chapters) {
    if (chapter.volume !== currentVolume) {
      currentVolume = chapter.volume;
      sections.push(`## ${currentVolume}`);
    }
    sections.push(renderChapter(chapter));
  }
  const body = sections.join("\n\n");
  const intro = `# 和平与玫瑰撤侨行动：新世界观重写完整版

新锐纪元世界观重写版

核心主题：和平不是没有危险，而是有人愿意一次次把回家的路修好。

# 正文
`;
  return uniquifyNovelText(`${intro}\n\n${body}\n`);
}

function paragraphXml(text, style = "Normal") {
  const pStyle = style === "Normal" ? "" : `<w:pStyle w:val="${style}"/>`;
  const ind = style === "Normal" && text.trim() && !text.startsWith(">") ? '<w:ind w:firstLine="420"/>' : "";
  const outlineLevel =
    style === "Heading1"
      ? '<w:outlineLvl w:val="0"/>'
      : style === "Heading2"
        ? '<w:outlineLvl w:val="1"/>'
        : style === "Heading3"
          ? '<w:outlineLvl w:val="2"/>'
          : "";
  return `<w:p><w:pPr>${pStyle}${ind}${outlineLevel}<w:spacing w:after="120"/></w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function markdownToDocumentXml(markdown) {
  const paragraphs = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) paragraphs.push(paragraphXml(line.replace(/^#\s+/, ""), "Title"));
    else if (line.startsWith("## ")) paragraphs.push(paragraphXml(line.replace(/^##\s+/, ""), "Heading1"));
    else if (line.startsWith("### ")) paragraphs.push(paragraphXml(line.replace(/^###\s+/, ""), "Heading2"));
    else if (line.startsWith("> ")) paragraphs.push(paragraphXml(line.replace(/^>\s+/, ""), "Quote"));
    else if (line.startsWith("- ")) paragraphs.push(paragraphXml(`• ${line.replace(/^- /, "")}`));
    else paragraphs.push(paragraphXml(line));
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
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="30"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="180" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="26"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="420"/><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:i/><w:color w:val="666666"/><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun"/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>`;
}

async function writeDocx(markdown, docxPath) {
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
  <dc:title>和平与玫瑰撤侨行动_新世界观重写完整版</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-19T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-19T00:00:00Z</dcterms:modified>
</cp:coreProperties>`);
  zip.folder("docProps").file("app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Codex</Application>
</Properties>`);
  fs.writeFileSync(docxPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

async function validateDocx(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  return {
    hasDocumentXml: Boolean(zip.file("word/document.xml")),
    hasStylesXml: Boolean(zip.file("word/styles.xml")),
    entryCount: Object.keys(zip.files).length,
    documentXmlLength: (await zip.file("word/document.xml")?.async("string"))?.length || 0,
  };
}

async function main() {
  ensureDir(outDir);
  ensureDir(workDir);
  if (!fs.existsSync(sourceDocx)) throw new Error(`Source manuscript not found: ${sourceDocx}`);

  const sourceParagraphs = await extractDocxParagraphs(sourceDocx);
  const sourceText = sourceParagraphs.join("\n");
  const catalog = await loadCatalog();
  const roleCounts = Object.fromEntries(
    Object.keys(characterProfiles).map((name) => [name, countOccurrences(sourceText, [name])]),
  );
  const calibrationRows = buildCalibrationRows(sourceParagraphs, catalog);
  const mappings = buildChapterMappings(catalog);
  const roleArcRows = buildRoleArcRows();
  const rulebook = buildRulebook(sourceParagraphs, catalog, roleCounts);
  const novel = buildNovelMarkdown(
    { characters: sourceText.length, paragraphs: sourceParagraphs.length },
    roleCounts,
  );

  writeCsv(calibrationCsvPath, calibrationRows, [
    "oldIndex",
    "oldId",
    "oldTitle",
    "oldWords",
    "paragraphIndex",
    "nextParagraphIndex",
    "status",
    "sample",
  ]);
  fs.writeFileSync(rulebookPath, rulebook, "utf8");
  fs.writeFileSync(mappingJsonPath, JSON.stringify(mappings, null, 2), "utf8");
  writeCsv(mappingCsvPath, mappings, [
    "newNo",
    "volume",
    "newTitle",
    "oldRange",
    "oldWords",
    "keep",
    "remove",
    "objective",
    "motif",
    "timeVector",
    "relationshipArc",
    "conflict",
    "turn",
    "ending",
    "theme",
  ]);
  writeCsv(roleArcCsvPath, roleArcRows, [
    "chapterNo",
    "volume",
    "title",
    "primaryRole",
    "secondaryRole",
    "tertiaryRole",
    "entranceReason",
    "relationshipArc",
    "emotionalShift",
    "nextEffect",
  ]);
  fs.writeFileSync(roleArcMdPath, buildRoleArcMarkdown(roleArcRows), "utf8");
  fs.writeFileSync(finalMdPath, novel, "utf8");
  await writeDocx(novel, finalDocxPath);

  const finalText = novel.replace(/^#+\s+/gm, "");
  const report = {
    sourceDocx,
    sourceCharacters: sourceText.length,
    sourceParagraphs: sourceParagraphs.length,
    catalogChapters: catalog.length,
    newChapters: chapters.length,
    finalMarkdownCharacters: novel.length,
    finalBodyCharacters: finalText.length,
    targetRange: "280000-320000",
    targetSatisfied: finalText.length >= 280000 && finalText.length <= 320000,
    emptyChapterCount: chapters.filter((chapter) => !novel.includes(`### 第${chapter.no}章 ${chapter.title}`)).length,
    bannedOldSurfaceHits: Object.fromEntries(
      bannedOldSurfaceTerms.map((term) => [term, countOccurrences(novel, [term])]),
    ),
    newTermHits: Object.fromEntries(newTerms.map((term) => [term, countOccurrences(novel, [term])])),
    docx: await validateDocx(finalDocxPath),
    outputs: {
      finalMdPath,
      finalDocxPath,
      calibrationCsvPath,
      mappingJsonPath,
      mappingCsvPath,
      roleArcCsvPath,
      roleArcMdPath,
      rulebookPath,
    },
  };
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(
    reportMdPath,
    `# 全文重写校验报告

- 原稿字符：${report.sourceCharacters}
- 原稿段落：${report.sourceParagraphs}
- 旧目录章节：${report.catalogChapters}
- 新版章节：${report.newChapters}
- 新稿 Markdown 字符：${report.finalMarkdownCharacters}
- 新稿正文字符：${report.finalBodyCharacters}
- 目标区间：${report.targetRange}
- 目标满足：${report.targetSatisfied ? "是" : "否"}
- 空章数量：${report.emptyChapterCount}
- DOCX document.xml：${report.docx.hasDocumentXml ? "存在" : "缺失"}
- DOCX styles.xml：${report.docx.hasStylesXml ? "存在" : "缺失"}
- 角色关系弧光表：已生成

## 新世界观术语命中

${Object.entries(report.newTermHits).map(([term, count]) => `- ${term}：${count}`).join("\n")}

## 旧设定表面词命中

${Object.entries(report.bannedOldSurfaceHits).map(([term, count]) => `- ${term}：${count}`).join("\n")}
`,
    "utf8",
  );

  console.log(`Wrote ${finalMdPath}`);
  console.log(`Wrote ${finalDocxPath}`);
  console.log(`Wrote ${calibrationCsvPath}`);
  console.log(`Wrote ${mappingJsonPath}`);
  console.log(`Wrote ${mappingCsvPath}`);
  console.log(`Wrote ${roleArcCsvPath}`);
  console.log(`Wrote ${roleArcMdPath}`);
  console.log(`Wrote ${rulebookPath}`);
  console.log(`Wrote ${reportJsonPath}`);
  console.log(`Final body characters: ${report.finalBodyCharacters}`);
  console.log(`Target satisfied: ${report.targetSatisfied}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
