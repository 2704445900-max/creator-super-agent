const SOURCE_ROOT = process.env.CREATOR_EDITION === "generic"
  ? "bundled-general-dramaturgy-rules"
  : (process.env.DRAMATURGY_RULES_ROOT || "local-dramaturgy-rules");

const FOUR_LAYER_RULES = [
  {
    id: "perception_motion_image",
    order: 1,
    name: "感知运动影像",
    shortName: "感知-行动-新感知",
    source: "叙事教学的四个层次2.docx",
    coreQuestion: "故事为什么能动起来？",
    principle: "角色先接收外部信息，再基于信息和价值观做出行动，行动制造新的信息，形成“因为……所以……；又因为……所以……”的因果链。",
    auditFocus: ["角色知道了什么", "角色因此做了什么", "行动造成了什么新局面", "下一步是否由新局面必然推出"],
    correctionRule: "如果一段剧情只是罗列画面或情绪，必须补出“感知 -> 行动 -> 新感知”的链条。",
    upgradeRule: "让每个镜头都交代一个可见变化：信息变化、关系变化、空间变化、道具状态变化或角色选择变化。"
  },
  {
    id: "skeleton_motif",
    order: 2,
    name: "骨架",
    shortName: "母题-结构",
    source: "叙事教学的四个层次2.docx",
    coreQuestion: "故事发生了什么，冲突朝哪里走？",
    principle: "前一个事是母题，后一个事是动作。不同母题搭配不同动作，会产生不同主题。母题负责结构方向，动作负责主题落点。",
    auditFocus: ["本段主母题是什么", "起承转合是否完整", "冲突是否有方向", "结尾是否回答了开头的母题"],
    correctionRule: "如果情节松散，先确定母题，再删去不服务母题的动作或镜头。",
    upgradeRule: "用两个到三个母题组合制造张力，例如“求助 + 不均等斗争 + 牺牲”，但每场戏只让一个母题占主导。"
  },
  {
    id: "flesh_key_scene",
    order: 3,
    name: "血肉",
    shortName: "关键情景-人物细节",
    source: "叙事教学的四个层次2.docx",
    coreQuestion: "观众为什么相信并被打动？",
    principle: "血肉由台词、动作、表情、场景感官、情感层次组成。关键情景要像动画中割一样，先定首尾，再填中间的动作、情绪和时间矢量。",
    auditFocus: ["台词是否带信息差", "动作是否比旁白更有说服力", "情绪是否有层次", "场景是否有时间和感官", "关键情景是否能被画成分镜图"],
    correctionRule: "如果只有解释和概念，改成可拍、可画、可听见的动作和物件。",
    upgradeRule: "用时间矢量元素强化画面，例如日出前、门半开、窗外雨、岔路、站台、水面、手停在物件前。"
  },
  {
    id: "soul_theme",
    order: 4,
    name: "灵魂",
    shortName: "主题-关键台词",
    source: "叙事教学的四个层次2.docx",
    coreQuestion: "导演最想让观众相信哪句话？",
    principle: "主题不是先喊口号，而是从血肉中提炼。主角经历母题和动作后，用选择、代价或关键台词回答“面对这个母题，人应当如何行动”。",
    auditFocus: ["主题能否用一句话说清", "主题是否由角色选择证明", "结尾是否与世界观规则一致", "关键台词是否来自经历而非空降"],
    correctionRule: "如果主题像标语，删除抽象宣言，改成角色在代价面前的选择。",
    upgradeRule: "让关键台词只说半句，剩下半句交给动作、环境和镜头余韵。"
  }
];

const MOTIFS_36 = [
  ["求助与拯救", "求告", ["求助", "请求", "请你", "拜托", "救命", "支援"]],
  ["求助与拯救", "援救", ["营救", "救援", "救出", "救下", "保护"]],
  ["求助与拯救", "绑架", ["绑架", "劫持", "人质", "失踪", "带走"]],
  ["复仇与抗争", "复仇", ["复仇", "报仇", "清算", "讨回"]],
  ["复仇与抗争", "骨肉间的报复", ["亲人", "家人", "姐妹", "父母", "兄弟", "报复"]],
  ["复仇与抗争", "反抗", ["反抗", "拒绝", "不服从", "起义", "抵抗"]],
  ["复仇与抗争", "不均等的势力斗争", ["弱小", "强权", "压迫", "围剿", "悬殊", "不对等"]],
  ["灾难与不幸", "灾祸", ["灾难", "爆炸", "坍塌", "瘟疫", "洪水", "火灾"]],
  ["灾难与不幸", "不幸", ["事故", "失去", "牺牲", "死亡", "失败"]],
  ["灾难与不幸", "疯狂", ["失控", "疯狂", "崩溃", "幻觉", "偏执"]],
  ["灾难与不幸", "因轻忽而招致损害", ["疏忽", "误判", "忽略", "迟疑", "轻敌"]],
  ["追逐与冒险", "逃亡", ["逃亡", "逃离", "撤离", "躲避", "追捕"]],
  ["追逐与冒险", "壮举", ["壮举", "奇袭", "突破", "不可能", "极限"]],
  ["追逐与冒险", "谜的解释", ["谜团", "真相", "线索", "调查", "解释", "破解", "异常", "确认", "门后", "声音"]],
  ["追逐与冒险", "获取", ["夺取", "获取", "拿到", "抢回", "寻找"]],
  ["家族与骨肉", "骨肉仇恨", ["亲族", "家族", "血缘", "仇恨"]],
  ["家族与骨肉", "骨肉竞争", ["竞争", "继承", "比较", "争夺"]],
  ["家族与骨肉", "亲族的重逢", ["重逢", "相认", "归来", "再见"]],
  ["家族与骨肉", "失去所爱之人", ["失去", "离别", "逝去", "永别"]],
  ["爱情与两性", "奸情杀害", ["背叛", "情杀", "嫉妒"]],
  ["爱情与两性", "不知而犯的恋爱罪恶", ["误爱", "身份不明", "禁忌"]],
  ["爱情与两性", "无意中伤害自己所爱", ["误伤", "伤害所爱", "保护失败"]],
  ["爱情与两性", "为爱情牺牲一切", ["为爱", "牺牲一切", "私奔"]],
  ["爱情与两性", "通奸", ["外遇", "通奸", "婚外"]],
  ["爱情与两性", "恋爱的罪恶", ["罪恶感", "禁恋", "不被允许"]],
  ["爱情与两性", "恋爱发生阻碍", ["阻碍", "误会", "分离", "身份差"]],
  ["爱情与两性", "爱上自己的仇敌", ["仇敌", "敌人", "相爱"]],
  ["牺牲与奉献", "为了主义而牺牲自己", ["信念", "理想", "主义", "牺牲自己"]],
  ["牺牲与奉献", "为了所爱而牺牲自己", ["保护她", "保护他", "牺牲自己", "挡下", "是否还活着", "救人"]],
  ["牺牲与奉献", "有原因地牺牲所爱之人", ["不得不牺牲", "放弃所爱", "大局"]],
  ["认知与判断", "发现所爱之人有不名誉的事", ["秘密", "污点", "真相", "不名誉"]],
  ["认知与判断", "野心", ["野心", "权力", "登顶", "掌控"]],
  ["认知与判断", "人与神的斗争", ["命运", "神", "天命", "规则", "超越"]],
  ["认知与判断", "错误的忌妒", ["嫉妒", "误会", "猜疑"]],
  ["认知与判断", "错误的判断", ["误判", "错判", "被骗", "看错"]],
  ["认知与判断", "悔恨", ["后悔", "悔恨", "补偿", "赎罪"]]
].map(([category, name, keywords], index) => ({ id: index + 1, category, name, keywords }));

const PROPP_FUNCTIONS_31 = [
  "远离", "禁令", "违令", "刺探", "套取", "欺骗", "共谋", "加害", "缺乏", "调停",
  "反击", "出发", "考验", "获得宝物", "反应", "对决", "引导", "标记", "胜利", "化解",
  "追捕", "获救", "归来", "归隐", "难题", "假英雄", "解决", "认出", "惩罚", "揭露", "加冕"
];

const TIME_VECTOR_ELEMENTS = [
  { group: "天空", element: "日出前", function: "黑夜将尽 / 希望将起", use: "适合表现觉醒、任务开始、旧状态将被打破。" },
  { group: "天空", element: "黄昏", function: "白昼将尽 / 夜晚将临", use: "适合表现告别、关系转折、行动前最后的温度。" },
  { group: "天空", element: "深夜月中", function: "沉思 / 煎熬", use: "适合表现孤独、秘密、心理压力。" },
  { group: "天空", element: "初春雪融", function: "压抑之后的新生", use: "适合表现修复、重新开始、创伤后的第一步。" },
  { group: "天空", element: "秋叶将落", function: "圆满之后的离别", use: "适合表现关系松动、阵营分离、命运将转。" },
  { group: "气候", element: "雨刚开始", function: "平静转向宣泄", use: "适合表现冲突爆发前的第一滴水。" },
  { group: "气候", element: "雪刚停", function: "狂暴后的沉寂", use: "适合表现战后、失去、短暂安静。" },
  { group: "气候", element: "雾正浓", function: "真相模糊 / 即将显影", use: "适合悬疑、误判、潜入。" },
  { group: "空间", element: "路", function: "引向前方 / 选择方向", use: "适合人物站在选择之前。" },
  { group: "空间", element: "十字路口", function: "抉择 / 方向交汇", use: "适合多线冲突汇合。" },
  { group: "空间", element: "站台", function: "停留 / 送别迎归", use: "适合离别、等待、归来。" },
  { group: "空间", element: "门半开", function: "内外分隔 / 即将进入", use: "适合未知空间、关系边界、秘密揭开。" },
  { group: "空间", element: "窗", function: "框取视野 / 内外窥望", use: "适合观察、隔绝、欲言又止。" },
  { group: "空间", element: "墙与裂缝", function: "阻隔 / 破口暗示", use: "适合制度压迫、关系裂痕、希望缝隙。" },
  { group: "空间", element: "水面", function: "倒影 / 扭曲", use: "适合身份错位、记忆、真相变形。" },
  { group: "空间", element: "走廊或隧道", function: "连接 / 未知深处", use: "适合潜入、压迫感、推进。" },
  { group: "人物", element: "身体和视线方向不一致", function: "内心冲突", use: "适合嘴上答应、心里抗拒。" },
  { group: "人物", element: "手停在物件前", function: "行动阈值", use: "适合选择前一秒、道具悬念。" },
  { group: "人物", element: "伪装半卸", function: "身份揭示", use: "适合双重身份、阵营转向。" },
  { group: "人物", element: "衣物状态变化", function: "处境变化", use: "适合潜入后、战后、逃亡中。" }
];

const COHERENCE_CHECKS = [
  { id: "rule", name: "规则自洽", question: "世界观的物理定律是否统一？", checks: ["来源、代价、限制是否清楚", "规则是否被一致遵守", "例外是否提前铺垫", "高潮是否靠破坏规则解决"] },
  { id: "character", name: "角色行为自洽", question: "人物是否按已知信息和价值观行动？", checks: ["角色是否知道该知道的信息", "决策是否符合价值观", "能力边界是否稳定", "动机是否与环境一致"] },
  { id: "causality", name: "因果自洽", question: "事件是否遵循必然因果？", checks: ["A->B->C 是否完整", "是否有无因之果", "是否有无果之因", "结局是否避免机械降神"] },
  { id: "theme", name: "主题与规则自洽", question: "世界观是否支撑核心思想？", checks: ["主题能否一句话提炼", "规则是否强化主题困境", "结尾处理是否与主题一致"] }
];

const OLD_WORLD_ATTITUDES = [
  { stance: "摧毁旧世界，不留蓝图", tendency: "激进但空洞", action: "破坏、斩断、反抗" },
  { stance: "摧毁旧世界，开启空白", tendency: "激进且建设性", action: "破坏并留下活下去的空间" },
  { stance: "修正局部缺陷", tendency: "改良主义", action: "揭露腐败、替换统治者、保留基本秩序" },
  { stance: "接受旧世界，被动适应", tendency: "投降主义", action: "将灾难常态化，忍受代价" },
  { stance: "接受旧世界，主动退守", tendency: "去政治化", action: "退回私人幸福，放弃公共责任" },
  { stance: "逃离旧世界，另起炉灶", tendency: "虚无主义", action: "转生、穿越、换世界、开挂" }
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function splitSentences(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .split(/(?<=[。！？!?；;])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 80);
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (text.match(pattern) || []).length, 0);
}

function scoreFromSignals(signals, total) {
  const value = Math.round((signals / Math.max(total, 1)) * 100);
  return Math.max(0, Math.min(100, value));
}

function grade(score) {
  if (score >= 75) return "稳";
  if (score >= 45) return "可用";
  return "弱";
}

function matchMotifs(text) {
  return MOTIFS_36
    .map((motif) => {
      const hits = motif.keywords.filter((keyword) => text.includes(keyword));
      return hits.length ? { name: motif.name, category: motif.category, hits } : null;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function pickTimeVectors(text) {
  const lower = text.toLowerCase();
  const picks = [];
  for (const item of TIME_VECTOR_ELEMENTS) {
    if (lower.includes(item.element.toLowerCase())) picks.push(item);
  }
  if (/潜入|雾|误判|调查|秘密/.test(text)) picks.push(TIME_VECTOR_ELEMENTS.find((item) => item.element === "雾正浓"));
  if (/离别|分开|告别|约会|黄昏|夕阳/.test(text)) picks.push(TIME_VECTOR_ELEMENTS.find((item) => item.element === "黄昏"));
  if (/选择|犹豫|决定|门|进入/.test(text)) picks.push(TIME_VECTOR_ELEMENTS.find((item) => item.element === "门半开"));
  if (/真相|倒影|身份|记忆/.test(text)) picks.push(TIME_VECTOR_ELEMENTS.find((item) => item.element === "水面"));
  if (/等待|归来|送别/.test(text)) picks.push(TIME_VECTOR_ELEMENTS.find((item) => item.element === "站台"));
  return [...new Map(picks.filter(Boolean).map((item) => [item.element, item])).values()].slice(0, 5);
}

function inferProppFunctions(text) {
  const pairs = [
    ["远离", /离开|撤离|远离|出走/],
    ["禁令", /不能|禁止|命令|警告/],
    ["违令", /违抗|违令|擅自|不顾/],
    ["刺探", /侦察|刺探|观察|监听|搜索/],
    ["欺骗", /欺骗|伪装|假装|误导/],
    ["加害", /袭击|伤害|破坏|夺走|牺牲/],
    ["缺乏", /缺少|失去|没有|不足|无法/],
    ["调停", /调停|协调|劝说|谈判/],
    ["反击", /反击|回击|阻止|拦截/],
    ["出发", /出发|进入|潜入|启程/],
    ["考验", /考验|测试|训练|试炼/],
    ["获得宝物", /获得|拿到|夺回|找到/],
    ["对决", /对决|交锋|对峙|冲突/],
    ["追捕", /追捕|追击|搜捕|围捕/],
    ["揭露", /揭露|公开|说出|曝光/],
    ["加冕", /胜利|确认|任命|承认/]
  ];
  const matched = pairs.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  return matched.length ? matched.slice(0, 8) : ["缺乏", "出发", "考验", "反应", "解决"];
}

function makeIssue(condition, layer, issue, fix, severity = "medium") {
  return condition ? [{ layer, issue, fix, severity }] : [];
}

export function getDramaturgyRuleLibrary() {
  return {
    standard: "xinrui-dramaturgy-rule-library-v1",
    sourceRoot: SOURCE_ROOT,
    primarySource: "叙事教学的四个层次2.docx",
    supportingSources: [
      "叙事教学的四个层次.docx",
      "时间矢量元素 示例对照表doc(1).doc",
      "逻辑自洽以及对待旧世界态度 对照表(1).doc"
    ],
    thesis: "事的事中前一个事是什么事，后一个事是什么事？前一个事是母题，后一个事是动作，不同母题使用不同动作会产生不同主题。",
    useFor: ["剧本审查", "剧情校准", "因果纠错", "角色弧光增强", "关键情景升华", "分镜生成前自检"],
    fourLayers: FOUR_LAYER_RULES,
    motifs36: MOTIFS_36,
    proppFunctions31: PROPP_FUNCTIONS_31,
    timeVectorElements: TIME_VECTOR_ELEMENTS,
    coherenceChecks: COHERENCE_CHECKS,
    oldWorldAttitudes: OLD_WORLD_ATTITUDES,
    gates: [
      "审查：先找感知-行动-新感知链条，再看母题、关键情景和主题。",
      "校准：角色动机、能力边界、世界观规则和因果链必须互相支持。",
      "纠错：缺因果补信息差，缺母题定冲突，缺血肉补动作和感官，缺灵魂补选择和代价。",
      "升华：用时间矢量、关键台词、沉默、物件状态和镜头余韵把主题落到画面里。"
    ]
  };
}

export function summarizeDramaturgyRulesForPrompt() {
  const library = getDramaturgyRuleLibrary();
  return {
    standard: library.standard,
    primarySource: library.primarySource,
    thesis: library.thesis,
    fourLayers: library.fourLayers.map((layer) => ({
      name: layer.name,
      question: layer.coreQuestion,
      auditFocus: layer.auditFocus,
      correctionRule: layer.correctionRule,
      upgradeRule: layer.upgradeRule
    })),
    gates: library.gates
  };
}

export function analyzeScriptWithDramaturgy(input = {}) {
  const text = compact(input.text || input.script || input.scene || input.intent || input.topic || "");
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length || (text ? 1 : 0);
  const perceptionSignals = countMatches(text, [/看见|听见|发现|意识到|收到|察觉|注意到|望见|闻到|感到/g]);
  const actionSignals = countMatches(text, [/决定|选择|冲|跑|拿|放下|推开|进入|离开|阻止|联系|沉默|转身|拒绝|救|追|逃|开口|握住/g]);
  const consequenceSignals = countMatches(text, [/于是|因此|所以|导致|结果|却|反而|使得|引发|随后|接着|又|从而/g]);
  const causalScore = scoreFromSignals(perceptionSignals + actionSignals + consequenceSignals, Math.max(sentenceCount * 2, 4));

  const motifs = matchMotifs(text);
  const structureSignals = countMatches(text, [/开始|起初|随后|但是|然而|直到|最后|结尾|起承转合|转折|代价|选择/g]);
  const skeletonScore = Math.min(100, scoreFromSignals(motifs.length * 2 + structureSignals, 8));

  const dialogueSignals = countMatches(text, [/“[^”]+”|"[^"]+"|：/g]);
  const sensorySignals = countMatches(text, [/风|雨|雪|雾|光|声|气味|触|冷|热|潮|暗|亮|脚步|呼吸|沉默|影子|门|窗|水面/g]);
  const emotionSignals = countMatches(text, [/愤怒|委屈|不甘|恐惧|犹豫|坚定|压抑|崩溃|克制|迟疑|孤独|痛苦|轻松/g]);
  const fleshScore = Math.min(100, scoreFromSignals(dialogueSignals + sensorySignals + emotionSignals, Math.max(sentenceCount, 4)));

  const themeSignals = countMatches(text, [/相信|命运|自由|责任|牺牲|旧世界|新世界|选择|代价|活下去|不由天|为了|必须|不再/g]);
  const hasKeyLine = /“[^”]*(相信|命运|选择|代价|活下去|责任|自由|不再|必须)[^”]*”|"[^"]*(believe|choice|cost|live|must)[^"]*"/i.test(text);
  const soulScore = Math.min(100, scoreFromSignals(themeSignals + (hasKeyLine ? 3 : 0), Math.max(sentenceCount, 5)));

  const timeVectors = pickTimeVectors(text);
  const propp = inferProppFunctions(text);
  const issues = [
    ...makeIssue(text && causalScore < 45, "感知运动影像", "剧情缺少明确的“因为……所以……”推进链。", "补出角色先感知到什么，再采取什么行动，行动又制造什么新信息。", "high"),
    ...makeIssue(!text, "感知运动影像", "尚未提供可审查文本。", "输入剧本片段、剧情梗概或分镜描述后再审查。", "high"),
    ...makeIssue(text && motifs.length === 0, "骨架", "母题不清，冲突方向容易松散。", "先选择主母题，例如求助、援救、逃亡、错误判断、牺牲、反抗等。", "medium"),
    ...makeIssue(text && structureSignals < 2, "骨架", "起承转合信号偏弱。", "补一个明确转折和一个带代价的结尾，不要只停在气氛展示。", "medium"),
    ...makeIssue(text && fleshScore < 45, "血肉", "人物动作、感官和情绪层次不足。", "给关键情景补台词信息差、手部动作、物件状态、环境声光和情绪递进。", "medium"),
    ...makeIssue(text && soulScore < 40, "灵魂", "主题还没有从角色选择里显出来。", "让角色在母题压力下做一次有代价的选择，再用一句克制台词或沉默收束。", "medium")
  ];

  const review = {
    standard: "xinrui-dramaturgy-review-v1",
    sourcePriority: ["叙事教学的四个层次2.docx", "叙事教学的四个层次.docx", "时间矢量元素 示例对照表doc(1).doc", "逻辑自洽以及对待旧世界态度 对照表(1).doc"],
    input: {
      textLength: text.length,
      sentenceCount,
      intent: compact(input.intent || input.goal || ""),
      characters: compact(input.characters || "")
    },
    thesis: getDramaturgyRuleLibrary().thesis,
    layerReviews: [
      {
        layer: "感知运动影像",
        grade: grade(causalScore),
        score: causalScore,
        foundSignals: { perceptionSignals, actionSignals, consequenceSignals },
        conclusion: causalScore >= 45 ? "已有基本因果推进，需要继续强化每次行动后的新信息。" : "当前更像并列描写，需要补出感知、行动和新感知的链条。",
        auditQuestions: FOUR_LAYER_RULES[0].auditFocus,
        correction: FOUR_LAYER_RULES[0].correctionRule,
        elevation: FOUR_LAYER_RULES[0].upgradeRule
      },
      {
        layer: "骨架",
        grade: grade(skeletonScore),
        score: skeletonScore,
        matchedMotifs: motifs,
        conclusion: motifs.length ? `可用母题：${motifs.map((item) => item.name).join(" / ")}。` : "母题暂不清楚，需要先定主冲突。",
        auditQuestions: FOUR_LAYER_RULES[1].auditFocus,
        correction: FOUR_LAYER_RULES[1].correctionRule,
        elevation: FOUR_LAYER_RULES[1].upgradeRule
      },
      {
        layer: "血肉",
        grade: grade(fleshScore),
        score: fleshScore,
        foundSignals: { dialogueSignals, sensorySignals, emotionSignals },
        timeVectorRecommendations: timeVectors,
        conclusion: fleshScore >= 45 ? "已有可转化为关键情景的细节。" : "关键情景的画面、感官、动作和情绪层次不足。",
        auditQuestions: FOUR_LAYER_RULES[2].auditFocus,
        correction: FOUR_LAYER_RULES[2].correctionRule,
        elevation: FOUR_LAYER_RULES[2].upgradeRule
      },
      {
        layer: "灵魂",
        grade: grade(soulScore),
        score: soulScore,
        hasKeyLine,
        suggestedProppFunctions: propp,
        oldWorldAttitudeOptions: OLD_WORLD_ATTITUDES.slice(0, 6),
        conclusion: soulScore >= 40 ? "已有主题关键词，需要确认它是否由行动证明。" : "主题尚未成形，需要从母题和动作中提炼。",
        auditQuestions: FOUR_LAYER_RULES[3].auditFocus,
        correction: FOUR_LAYER_RULES[3].correctionRule,
        elevation: FOUR_LAYER_RULES[3].upgradeRule
      }
    ],
    coherenceReview: COHERENCE_CHECKS,
    issues,
    rewriteDirectives: [
      "每场戏先写：角色感知到了什么。",
      "再写：角色基于信息、价值观和处境做了什么。",
      "随后写：这个动作制造了什么新的信息、关系或空间变化。",
      "用一个主母题统摄冲突，不要让多个母题互相抢方向。",
      "关键情景必须能被画成图：人物姿态、道具状态、环境时间、镜头关系要清楚。",
      "主题不要先喊出来，要由角色在代价面前的选择证明。"
    ],
    upgradeChecklist: [
      "补信息差：观众知道的、角色知道的、对手知道的是否不同？",
      "补代价：角色每次选择失去了什么或承担了什么风险？",
      "补时间矢量：画面是否处在“将变未变”的悬停状态？",
      "补物件线索：关键道具是否在前后镜头中改变状态？",
      "补世界观自洽：规则、能力、组织和历史是否被稳定遵守？",
      "补旧世界态度：角色是在摧毁、修正、适应、退守还是逃离旧世界？"
    ]
  };

  return review;
}

export function dramaturgyRuleLibraryToMarkdown(library = getDramaturgyRuleLibrary()) {
  const lines = [
    "# 新锐纪元剧本创作原则规则库",
    "",
    `主源：${library.primarySource}`,
    `核心命题：${library.thesis}`,
    "",
    "## 四层叙事规则"
  ];
  for (const layer of library.fourLayers) {
    lines.push("", `### ${layer.order}. ${layer.name}（${layer.shortName}）`);
    lines.push(`- 核心问题：${layer.coreQuestion}`);
    lines.push(`- 原则：${layer.principle}`);
    lines.push(`- 审查重点：${layer.auditFocus.join("；")}`);
    lines.push(`- 纠错：${layer.correctionRule}`);
    lines.push(`- 升华：${layer.upgradeRule}`);
  }
  lines.push("", "## 审查与升华闸门");
  for (const gate of library.gates) lines.push(`- ${gate}`);
  lines.push("", "## 36 种母题分类");
  for (const motif of library.motifs36) lines.push(`- ${motif.category} / ${motif.name}`);
  lines.push("", "## 31 个动作功能");
  lines.push(library.proppFunctions31.join("、"));
  lines.push("", "## 时间矢量元素");
  for (const item of library.timeVectorElements) lines.push(`- ${item.group} / ${item.element}：${item.function}。${item.use}`);
  lines.push("", "## 世界观与旧世界态度");
  for (const item of library.coherenceChecks) lines.push(`- ${item.name}：${item.question}`);
  for (const item of library.oldWorldAttitudes) lines.push(`- ${item.stance}：${item.tendency}，典型行动：${item.action}`);
  return lines.join("\n");
}

export function dramaturgyReviewToMarkdown(review = analyzeScriptWithDramaturgy({})) {
  const lines = [
    "# 剧本四层叙事审查报告",
    "",
    `核心命题：${review.thesis}`,
    "",
    "## 四层诊断"
  ];
  for (const layer of review.layerReviews || []) {
    lines.push("", `### ${layer.layer}`);
    lines.push(`- 等级：${layer.grade}（${layer.score}/100）`);
    lines.push(`- 结论：${layer.conclusion}`);
    if (layer.matchedMotifs?.length) lines.push(`- 命中母题：${layer.matchedMotifs.map((item) => item.name).join("、")}`);
    if (layer.timeVectorRecommendations?.length) lines.push(`- 时间矢量建议：${layer.timeVectorRecommendations.map((item) => `${item.element}：${item.use}`).join("；")}`);
    lines.push(`- 纠错：${layer.correction}`);
    lines.push(`- 升华：${layer.elevation}`);
  }
  if (review.issues?.length) {
    lines.push("", "## 需要优先修正的问题");
    for (const issue of review.issues) lines.push(`- [${issue.severity}] ${issue.layer}：${issue.issue} -> ${issue.fix}`);
  }
  lines.push("", "## 重写指令");
  for (const item of review.rewriteDirectives || []) lines.push(`- ${item}`);
  lines.push("", "## 升华清单");
  for (const item of review.upgradeChecklist || []) lines.push(`- ${item}`);
  return lines.join("\n");
}
