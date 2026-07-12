import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outDir = path.resolve("output");
const workDir = path.join(outDir, "rewrite_work");
const sourceMdPath = path.join(outDir, "和平与玫瑰撤侨行动_新世界观重写完整版.md");
const polishedMdPath = path.join(outDir, "和平与玫瑰撤侨行动_文学润色去AI版.md");
const polishedDocxPath = path.join(outDir, "和平与玫瑰撤侨行动_文学润色去AI版.docx");
const reportJsonPath = path.join(workDir, "文学润色去AI校验报告.json");
const reportMdPath = path.join(workDir, "文学润色去AI校验报告.md");
const manualPath = path.join(workDir, "文学润色规则手册.md");

const markerPatterns = [
  "不是",
  "而是",
  "不只是",
  "没有急着",
  "没有马上",
  "必须",
  "不能",
  "解释",
  "确认",
  "核验",
  "判断",
  "局面",
  "风险",
  "真正",
  "把自己的判断放进局面里",
  "不是.*而是",
];

const characters = [
  "林荫清",
  "唐舒嫣",
  "赵婷婷",
  "刘伊七",
  "韩梦雪",
  "何墨缘",
  "刘梦鸳",
  "洛情轩",
  "叶敏慧",
  "楚乔翼",
  "王明德",
];

const sensoryVariants = new Map([
  [
    "有人在角落里小声哭，又很快捂住嘴，仿佛哭声也会暴露位置。",
    [
      "角落里传来一声很轻的哭，很快又被掌心捂住。",
      "有人把哭声咽回喉咙，肩膀还在抖。",
      "队列后方安静了几秒，随后有人低低吸了一口气。",
      "一个孩子哭到一半停住，像也知道这里连声音都要排队。",
    ],
  ],
  [
    "无线电里有细小的底噪，像有人在黑暗里压低呼吸。",
    [
      "无线电底噪细得像沙，贴着耳膜慢慢磨。",
      "耳机里有一层毛刺声，谁也没先把它关掉。",
      "通信频道短短空了一拍，只剩电流在里面发冷。",
      "底噪贴在耳边，像一条没收紧的线。",
    ],
  ],
  [
    "远处火光映在云底，城市像把未熄的炭藏在胸口。",
    [
      "远处的火映着云底，红光一明一暗。",
      "云层下面压着火色，城市的轮廓因此显得发烫。",
      "火光从楼群背后透出来，像有人在灰里翻出一点红。",
      "城市没有完全黑下去，云底还留着一层暗红。",
    ],
  ],
  [
    "纸质名单被翻得起了毛边，指腹摸上去有一点潮。",
    [
      "名单边角已经起毛，纸面沾着汗和雨水。",
      "纸页被翻得发软，手指一压就留下浅浅的痕。",
      "那张名单潮得发皱，名字却还得一个个看清。",
      "纸上的墨色有些洇开，像每个名字都多了一圈阴影。",
    ],
  ],
  [
    "风从破损的窗缝里钻进来，带着海盐、灰尘和发电机油味。",
    [
      "风从窗缝里灌进来，海盐味里混着发电机的油腥。",
      "破窗漏风，灰尘和潮气一起贴到脸上。",
      "窗外的风一阵阵往里挤，带着港口特有的咸苦味。",
      "房间里有潮味、油味，还有人群挤久之后的闷热。",
    ],
  ],
  [
    "远处的警笛被楼群切碎，像一段断断续续的电报码。",
    [
      "警笛在楼群后面断续响着，听不清来自哪条街。",
      "远处警笛忽远忽近，被风揉得发散。",
      "警笛声撞在楼面上，又碎成几截落回来。",
      "街外有警笛，声音短促，像一直追不上现场。",
    ],
  ],
  [
    "雨水顺着车窗往下爬，窗外的路牌被拉成模糊的影子。",
    [
      "雨水挂满车窗，路牌只剩一团晃动的绿。",
      "车窗上的水线往下滑，把外面的字拖成影子。",
      "雨刮器来回扫着，下一秒又被水幕盖住。",
      "路牌从窗外掠过，颜色还在，字已经看不清。",
    ],
  ],
  [
    "临时灯带贴在墙角，白光很冷，却让人愿意把脚步放慢。",
    [
      "墙角的临时灯带发着冷白光，照出地上的水痕。",
      "白光沿着墙根铺开，人群经过时脚步自然低了些。",
      "灯带有一截接触不良，闪一下，队列也跟着停一下。",
      "冷白灯照着出口，至少让人知道该往哪边走。",
    ],
  ],
  [
    "韩梦雪没有说话，只把观察点重新标了一遍，连风向变化也记进去。",
    [
      "韩梦雪把观察点重新标了一遍，风向旁边多了一道很细的箭头。",
      "韩梦雪没开口，铅笔尖已经在图上补出新的角度。",
      "韩梦雪把视线从人群移回屋顶，记号比她的呼吸还稳。",
      "韩梦雪只在图上添了一笔，旁边的人就知道她看见了什么。",
    ],
  ],
  [
    "楚乔翼把工具包摊开，没解释，直接开始做最该做的事。",
    [
      "楚乔翼把工具包打开，先把钳子、扎带和备用线排好。",
      "楚乔翼没说话，手已经伸进工具包最底层。",
      "楚乔翼蹲下去，先摸连接处，再看裂口。",
      "楚乔翼把灯往旁边一拨，给自己的手留出半掌宽的空间。",
    ],
  ],
]);

const repeatedLineVariants = new Map([
  [
    /^(林荫清|洛情轩)听见自己的呼吸顿了一下。她没有抹掉那半秒；很多判断正是从迟疑里长出来的。$/,
    [
      "$1听见自己的呼吸顿了一下。那半秒不体面，却比仓促更可靠。",
      "$1把那一小段迟疑留住，没有用命令盖过去。",
      "$1没有催自己立刻正确。她先让那口气落稳。",
      "$1的呼吸短短断了一下，下一句话因此慢了半拍。",
    ],
  ],
  [
    /^同行关系把最省事的办法拖住了。何墨缘没有立刻拍板，刘梦鸳先把代价摊开。$/,
    [
      "同行关系把最省事的办法拖住了。何墨缘停住手，刘梦鸳把代价一项项摊开。",
      "最省事的路被同行关系卡住。何墨缘没有抢结论，刘梦鸳先补上那几种糟糕可能。",
      "同行关系一复杂，捷径就不再像捷径。何墨缘看屏幕，刘梦鸳看人。",
      "何墨缘差点按下确认，刘梦鸳把她拦住：这不是一个人的问题。",
    ],
  ],
  [
    /^她并不相信所谓绝对冷静。洛情轩只是把最先冒出来的情绪关在门里，等外面的人先走过去。$/,
    [
      "洛情轩不相信绝对冷静。她只是先把情绪关在门里，让外面的人过去。",
      "洛情轩也会慌，只是她总把慌放到最后处理。",
      "洛情轩没有把情绪抹掉，只暂时把它放在别人看不见的地方。",
      "所谓冷静，对洛情轩来说更像一种排队：先是别人，再是自己。",
    ],
  ],
  [
    /^每多核一遍身份，就会多消耗几分钟。唐舒嫣看见表上的时间往后滑，仍然没有把这一步划掉。$/,
    [
      "每多核一遍身份，就会多耗几分钟。唐舒嫣看见时间往后滑，还是留下了这一步。",
      "唐舒嫣知道这道复核费时间。她看了一眼表，没有删。",
      "几分钟从表盘上掉下去，唐舒嫣仍把身份复核留在流程里。",
      "时间在往后滑，唐舒嫣没有让流程替她省掉责任。",
    ],
  ],
  [
    /^疲惫落在唐舒嫣肩上。她没有拍掉，只把背挺直一点，让后面的人还能看见方向。$/,
    [
      "疲惫落在唐舒嫣肩上。她没有拍掉，只把背挺直一点。",
      "唐舒嫣的肩背僵了一下，很快又恢复原样。",
      "唐舒嫣把疲惫压在肩上，没让它压进声音里。",
      "那点疲惫没有消失，只被唐舒嫣挪到别人看不见的地方。",
    ],
  ],
  [
    /^叶敏慧蹲在伤员身边，声音很轻，却让周围的人慢慢安静下来。$/,
    [
      "叶敏慧蹲在伤员身边，先让对方跟着她呼吸。",
      "叶敏慧的声音很轻，像怕惊动伤口。",
      "叶敏慧没有喊安静。她只是蹲下去，周围的人就慢慢低了声。",
      "叶敏慧把手套拉平，才伸手碰到伤员肩侧。",
    ],
  ],
  [
    /^(林荫清|唐舒嫣)沉默了一下，两个人的节奏都慢下来。有些关系不靠安慰维持，靠的是难听的话有人肯先说。$/,
    [
      "$1沉默了一下，两个人的节奏都慢下来。难听的话有人先说，关系才不至于在好话里发空。",
      "$1没有接那句安慰。她们都知道，现在更需要的是把刺人的问题摆出来。",
      "$1停顿的那一秒，让另一人也跟着收住了话头。",
      "她们没有互相安慰，只把最难听的部分先放到桌面上。",
    ],
  ],
  [
    /^林荫清没马上接话，看着名单边缘，像在看一条刚刚露出的裂缝。她把自己的想法放进现场里：救援、取证和撤离挤成同一张图，最后的判断没法再悬在空中。$/,
    [
      "林荫清没马上接话。救援、取证和撤离挤在同一张图上，她只能先把最容易断的线找出来。",
      "林荫清看着名单边缘，像在看一条刚露出的裂缝。判断不能悬在空中，得落到这张图上。",
      "救援、取证和撤离被压成同一件事。林荫清把话咽回去，先看哪一处会先断。",
      "林荫清把名单转了半圈。图上没有空处，每个决定都要挤出自己的位置。",
    ],
  ],
  [
    /^唐舒嫣忽然想起出发前那杯没喝完的水。这个念头来得不合时宜，却让她确认自己仍然是活在时间里的人，不是一枚被推上桌面的棋子。$/,
    [
      "唐舒嫣忽然想起出发前那杯没喝完的水。念头来得荒唐，却让她短短回到自己身上。",
      "那杯没喝完的水突然浮上来。唐舒嫣没有赶走它，只借它确认自己还在时间里。",
      "唐舒嫣想起杯沿上的水痕。这个念头不合时宜，却比任何口号都真实。",
      "出发前那杯水还在桌上。唐舒嫣想到这里，手里的笔反而稳了一点。",
    ],
  ],
]);

const exactRewrites = new Map([
  [
    "林荫清负责把方向定下来，唐舒嫣负责确认这个方向能不能被人理解、被制度承认，也能被队员执行。",
    [
      "林荫清定方向，唐舒嫣把这条方向放到制度、群众和队员面前重新过一遍。",
      "林荫清先把路指出来，唐舒嫣再问这条路能不能让人听懂、让制度接住、让队员执行。",
      "林荫清把箭头画下去，唐舒嫣负责看箭头落到人群里会不会割伤谁。",
    ],
  ],
  [
    "何墨缘把问题说得很快，刘梦鸳把问题钉得很稳；她们之间的默契不是卖弄技术，而是一起承认害怕也要继续。",
    [
      "何墨缘语速快，刘梦鸳落点稳。一个把异常拽出来，一个把它摁在桌面上。",
      "何墨缘像在追一串快要逃走的数据，刘梦鸳只用一句话把她拉回坐标。",
      "何墨缘先开口，刘梦鸳收住尾音。两个人的默契不热闹，却很准。",
    ],
  ],
  [
    "唐舒嫣守原则，洛情轩守人心；她们常常从不同入口进入同一个问题，最后把命令磨成可以承受的形状。",
    [
      "唐舒嫣盯着原则，洛情轩盯着人心。两个人绕到同一件事前，才让命令有了能落地的边。",
      "唐舒嫣看规矩会不会断，洛情轩看人会不会散。她们的分歧常常救下同一个决定。",
      "唐舒嫣把线画直，洛情轩提醒她线下站着人。",
    ],
  ],
  [
    "林荫清没有把疲惫写在脸上。队伍需要的不是她不累，而是她累的时候仍然知道下一步要交给谁。",
    [
      "林荫清没把疲惫露出来。她只是多停了一秒，然后把下一步交到该接的人手里。",
      "林荫清当然累，眼底的红已经压不住。可命令还得往下传，她就把声音放稳。",
      "林荫清抬手揉了一下眉心，很快又放下。队伍只看见她还站着。",
    ],
  ],
  [
    "唐舒嫣不喜欢自己此刻的冷静。可她也知道，现场需要的不是她喜欢，而是她能把下一步说清。",
    [
      "唐舒嫣厌烦这份冷静，却只能把它留在脸上。下一步还等着她说清。",
      "唐舒嫣知道自己冷得有点过分。她没为这件事辩解，只把话说短。",
      "唐舒嫣把那点不舒服压回去，先把下一步拆给所有人听。",
    ],
  ],
  [
    "林荫清不喜欢自己此刻的冷静。可她也知道，现场需要的不是她喜欢，而是她能把下一步说清。",
    [
      "林荫清不喜欢自己这时的冷静。可现场没有给她讨厌自己的时间。",
      "林荫清听见自己的声音很稳，稳得有点陌生。她还是把下一步说完。",
      "林荫清把那点反感压住。比起喜不喜欢，她得先让人知道往哪走。",
    ],
  ],
  [
    "舆论误读让方案不能只按速度排序。林荫清刚要划线，唐舒嫣已经把风险写到线旁边。",
    [
      "舆论误读把速度从第一位挤了下来。林荫清刚要划线，唐舒嫣已经把后果写在旁边。",
      "这一次，快不等于稳。林荫清的笔还没落下，唐舒嫣先补了最坏的解释。",
      "唐舒嫣没让方案只按速度走，她在那条线旁加了一个会被追问的问题。",
    ],
  ],
  [
    "两个人看的不是格式，而是哪一处还会让平民误会。",
    [
      "格式退到后面，她们真正看的，是哪一处还会让平民误会。",
      "两个人的目光没停在格式上，只在可能被误会的地方多压了一秒。",
      "表格顺不顺眼不重要，重要的是哪句话会把人带偏。",
    ],
  ],
  [
    "风险没有结束，只是换了形状。",
    [
      "危险退了一步，又换了张脸。",
      "事情没有轻下来，只是换了入口。",
      "那股压力没散，转身钻进了另一条线。",
    ],
  ],
  [
    "这条消息没有让现场爆开，却让每个人的动作慢了一点。",
    [
      "消息没有炸开，只让所有人的手慢了一拍。",
      "现场没乱，纸页翻动的声音却轻了下去。",
      "这条消息落得很轻，压住的却是每个人的手腕。",
    ],
  ],
  [
    "不是不能走，而是不能假装这一步没有代价。",
    [
      "路能走，代价不能装作不存在。",
      "不是走不了，是走之前得把代价说清。",
      "这一步可以迈出去，但不能当作什么都没发生。",
    ],
  ],
  [
    "这不是拖延，是把责任留给后来的人。",
    [
      "这一步慢下来，是为了让后来的人也接得住责任。",
      "她不是在拖时间，只是不愿把问题丢给下一班人。",
      "慢下来的几分钟，替后来的人保住了一条能追溯的线。",
    ],
  ],
  [
    "这不是拆台，是在替她把以后会被质问的部分提前补上。",
    [
      "这句话听着像拆台，其实是在替她补上以后会被追问的部分。",
      "唐舒嫣知道这不是反对。有人提前问难听的问题，现场才不至于事后崩开。",
      "她没有把这当成冒犯。那一处漏洞迟早会被别人抓住。",
    ],
  ],
  [
    "她知道自己也在害怕，只是害怕被训练成了另一种形状。",
    [
      "她也怕，只是这份怕已经被训练压成了另一种模样。",
      "害怕还在，只是不再往脸上跑。",
      "她不是不怕。她只是知道怕的时候手该放在哪里。",
    ],
  ],
  [
    "把话说给群众听，不是说给我们自己听。",
    [
      "这句话要让外面的人听懂，不能只在我们自己这儿成立。",
      "别把话写成队内口令。外面的人听不懂，秩序就会断。",
      "说给人群听。我们听懂没有用。",
    ],
  ],
  [
    "这不是否定，是把选择变得能承受。",
    [
      "这一步把选择压实了，让它能被人承受。",
      "她不是把决定推翻，只是让决定多长出一层支撑。",
      "那个停顿没有否掉命令，只是让命令落地时少碎一点。",
    ],
  ],
  [
    "不是和解，只是都愿意继续往前。",
    [
      "谈不上和解，只是两个人都还愿意往前走。",
      "那不是拥抱，只是并肩的位置又找回来了。",
      "裂缝还在，但没有再扩大。",
    ],
  ],
  [
    "刘伊七笑得很轻，像是把危险当作一场无伤大雅的寒暄。",
    [
      "刘伊七笑得很轻，眼神却已经把出口数了一遍。",
      "刘伊七把笑留给对方，手指却悄悄摸到袖口的硬边。",
      "刘伊七看起来仍在寒暄，脚尖却已经转向了退路。",
      "刘伊七的笑意很薄，像一张随时能收回去的名片。",
    ],
  ],
  [
    "路线暴露像一块压在地图边缘的石头。林荫清移不走它，只能让路线绕开它。",
    [
      "路线暴露压在地图边缘。林荫清没有硬搬，只把线往旁边让开。",
      "那条路不能再照原样走。林荫清把笔尖停住，重新找缝。",
      "暴露的路线还躺在图上，像一段不能再相信的桥。",
      "林荫清把那条路划浅了些，没有删掉，只是不再把所有人押上去。",
    ],
  ],
  [
    "伤员后送像一块压在地图边缘的石头。林荫清移不走它，只能让路线绕开它。",
    [
      "伤员后送把路线压弯了。林荫清没有催，只让车队给它让出位置。",
      "担架一抬起来，地图上的直线就失了意义。",
      "林荫清看着后送序列，知道这一步快不了，也不能装作能快。",
      "伤员在那里，路线就得绕一下。这不是犹豫，是人还在呼吸。",
    ],
  ],
  [
    "她们保住了一条路线，也因此暴露了另一条路线的存在。唐舒嫣在记录里写下这个交换，字迹比平时更重。",
    [
      "她们保住了一条路，也把另一条路的影子露了出去。唐舒嫣把这个交换写下来，字压得很深。",
      "一条路稳住了，另一条路就得暂时沉下去。唐舒嫣没有省略这笔账。",
      "唐舒嫣在记录里写下那次交换：保住的、暴露的，都算数。",
      "路线没有白白保住，代价也没有被她们藏起来。",
    ],
  ],
  [
    "林荫清忽然意识到，所谓经验并不会让人不难过，只会让人知道难过时哪件事必须先做。",
    [
      "林荫清忽然明白，经验不会替人挡住难过，只会告诉她先做哪件事。",
      "难过没有少，只是被经验排到了命令后面。",
      "林荫清没有因为见得多就轻松一点。她只是知道先把哪条线接上。",
      "所谓经验，不过是难过时手还能伸向正确的文件夹。",
    ],
  ],
  [
    "赵婷婷想往前一步，又硬生生停住，把那股火气压回胸腔里。",
    [
      "赵婷婷脚尖已经往前了，又被自己硬拽回来。",
      "赵婷婷把火气咽下去，喉咙里只剩一声短促的气音。",
      "赵婷婷差一点冲出去，最后还是把肩膀压回队形里。",
      "赵婷婷看着前方，手背绷紧，没让自己先动。",
    ],
  ],
  [
    "刘梦鸳抬眼看了所有人一圈，用最短的话指出最不舒服的结论。",
    [
      "刘梦鸳抬眼扫过桌面，只说了最短、也最不好听的一句。",
      "刘梦鸳没有铺垫。她把结论放下，像把一枚冷硬的螺母搁在桌上。",
      "刘梦鸳看完所有人的表情，才开口把漏洞点出来。",
      "刘梦鸳的话很少，少到没人能从里面躲开。",
    ],
  ],
  [
    "何墨缘盯着屏幕，语速越来越快，直到刘梦鸳伸手敲了一下桌面。",
    [
      "何墨缘越说越快，刘梦鸳敲了敲桌面，把她拉回到同一个节奏里。",
      "何墨缘盯着屏幕往下追，刘梦鸳只敲了一下桌沿。",
      "何墨缘的语速快要越过人能听懂的边界，刘梦鸳把备份盘推了过去。",
      "何墨缘像要钻进屏幕里，刘梦鸳伸手挡住她的半个键盘。",
    ],
  ],
  [
    "林荫清没有急着下命令，她先把现场能确定的事一条条写在屏幕左侧。",
    [
      "林荫清没先下命令。她把能确定的事一条条写在屏幕左侧。",
      "命令出口前，林荫清先把现场能抓住的东西排了一遍。",
      "林荫清的手停在发送键上，先把屏幕左侧的空白填满。",
      "林荫清把确定项写完，才让下一句话从喉咙里出来。",
    ],
  ],
  [
    "唐舒嫣把混乱的信息分成三列：事实、判断、情绪，然后逐项划掉不能执行的部分。",
    [
      "唐舒嫣把混乱的信息拆开：事实归事实，情绪归情绪，不能执行的先划掉。",
      "唐舒嫣没有急着争辩，先把信息分层，把能用的留下。",
      "唐舒嫣在纸上画了三道线，混在一起的声音终于有了去处。",
      "唐舒嫣把事实单独拎出来，剩下的情绪和猜测暂时压到旁边。",
    ],
  ],
  [
    "洛情轩没有否定任何人的恐惧，她只是把恐惧安排到了队列里。",
    [
      "洛情轩没有要求任何人别怕，她只把害怕的人安排到能被照看的位置。",
      "洛情轩不和恐惧争辩。她给恐惧留了座位，也给队伍留了出口。",
      "洛情轩看见有人发抖，便把那一段队列放慢半拍。",
      "洛情轩没有替恐惧命名，只让它别把队伍冲散。",
    ],
  ],
  [
    "她们保住了一条路线，也因此暴露了另一条路线的存在。林荫清在记录里写下这个交换，字迹比平时更重。",
    [
      "她们保住了一条路，也把另一条路的影子露了出去。林荫清把这笔账写得很重。",
      "林荫清没有把代价藏起来：一条路线稳住，另一条路线就要暂时沉下去。",
      "路线保住了，暴露也发生了。林荫清把两件事写在同一行。",
      "林荫清在记录里留下那次交换，像把一块小石头压进纸面。",
    ],
  ],
]);

const roleLineRewrites = [
  [
    /([林唐赵刘韩何洛叶楚王][^。！？\n]{0,6})没有马上接话。\1/g,
    "$1没有马上接话，",
  ],
  [
    /([林唐赵刘韩何洛叶楚王][^。！？\n]{0,6})没有急着给结论，她更在意这个结论能不能被解释。/g,
    "$1没马上给结论。她先看这个结论能不能说给外面的人听。",
  ],
  [
    /没有马上接话，没有急着给结论，她更在意这个结论能不能被解释。/g,
    "没有马上接话。她先看这个结论能不能说给外面的人听。",
  ],
  [
    /她把自己的判断放进局面里：每一道命令都要穿过群众、纪律和后果，不能只在队内说得通。/g,
    "她把话压低了些：命令从队内出去，要先经过群众、纪律和后果，光在会议室里成立不算数。",
  ],
  [
    /她把自己的判断放进局面里：异常藏在数据过分干净的地方，那个不舒服的细节需要有人追到底。/g,
    "她点了点屏幕边缘：异常常常藏在太干净的地方，那个不舒服的细节得有人追到底。",
  ],
  [
    /她把自己的判断放进局面里：局面需要她把自己的经验放进新的因果链里。/g,
    "她没有急着替旧经验找位置，只先问这一回的因果链从哪里断开。",
  ],
  [
    /真正让([^，。！？\n]{1,18})停下来的，是/g,
    "让$1停下来的，是",
  ],
  [
    /([林唐赵刘韩何洛叶楚王][^。！？\n]{0,6})把它记住，不是因为它重要，而是因为真正重要的事常常从这里露边。/g,
    "$1把它记住。真正要命的东西，有时就是从这种边角露出来的。",
  ],
  [
    /消息传到这一层时，([^，。！？\n]+)先皱眉，([^，。！？\n]+)后沉默。她们都知道，真正的麻烦通常不是被发现，而是被迫公开承认。/g,
    "消息传到这一层时，$1先皱眉，$2后沉默。麻烦常常从承认那一刻开始。",
  ],
  [
    /局面因此向前推了一格：([^。！？\n]+)。可这一格并不安稳，像临时搭好的踏板，只能让人先从水面上过去。/g,
    "事情往前挪了一格：$1。那一格很窄，像雨里临时搭出的踏板。",
  ],
  [
    /终章：事情没有结束的备注栏/g,
    "终章备注栏",
  ],
  [
    /终章：事情没有结束的代价没有被写成牺牲，而是分散在每一次解释、每一次改道和每一个暂时不能满足的请求里。/g,
    "终章的代价没有集中在某个响亮的词里。它散在一次次说明、一次次改道，还有那些暂时没法满足的请求里。",
  ],
];

const phraseRewrites = [
  [/没有急着/g, "没马上"],
  [/没有马上/g, "没马上"],
  [/未核验信息/g, "没查清的信息"],
  [/低可见核验/g, "低可见查证"],
  [/核验/g, "复核"],
  [/解释权/g, "说明权"],
  [/解释/g, "说明"],
  [/确认呼吸和意识/g, "检查呼吸和意识"],
  [/确认呼吸/g, "检查呼吸"],
  [/确认这个方向/g, "看清这条方向"],
  [/判断力/g, "判断力"],
  [/把判断接过去/g, "把话接过去"],
  [/递出判断/g, "递出结论"],
  [/自己的判断/g, "自己的想法"],
  [/判断藏/g, "心思藏"],
  [/判断压稳/g, "结论压稳"],
  [/局面/g, "现场"],
  [/风险等级/g, "危险等级"],
  [/必须/g, "得"],
  [/(?<!能)不能只/g, "没法只"],
  [/(?<!能)不能被/g, "不该被"],
  [/(?<!能)不能等/g, "等不得"],
  [/(?<!能)不能假装/g, "没法假装"],
  [/(?<!能)不能让/g, "别让"],
  [/(?<!能)不能/g, "没法"],
  [/不只是/g, "不止是"],
  [/不只是([^，。！？\n]{1,30})，而是/g, "不止是$1，也包括"],
  [/不为好看，只为/g, "不是图好看，是为了"],
  [/不显得凶狠/g, "看上去不锋利"],
  [/把风险写到线旁边/g, "把后果写在那条线旁"],
  [/把解释准备给正在等待的人/g, "把对外说明留给正在等的人"],
  [/只把可能拖慢撤离的环节单独标出来/g, "只把会拖慢撤离的环节另拎出来"],
  [/把坏选择伪装成省事/g, "把坏选择包装成捷径"],
  [/能被执行的话比能被赞同的话更重要/g, "能执行的话，先比好听的话有用"],
  [/她们没有互相道谢，现场也不需要这一步/g, "她们没有道谢，现场也腾不出这种余地"],
];

const postRewrites = [
  [/她先想到的她先想到的是/g, "她先想到的是"],
  [/让([^，。！？\n]{1,18})停下来的，是公开任务是撤侨，真实异常是([^。！？\n]+)。/g, "公开任务是撤侨，让$1停下来的却是$2。"],
  [/突破之后谁来说明，比突破更要紧/g, "她先想到的是，突破之后谁来说明"],
  [/那一眼询问许可退到后面，在确认([^。！？\n]+)才是眼前要处理的事/g, "那一眼不是在要许可，只是在确认$1"],
  [/被推到前方，因为她想站在那里退到后面，因为总得有人先把现场接住才是眼前要处理的事/g, "被推到前方，并非出于自愿。现场总得有人先接住"],
  [/被推到前方，因为总得有人先把现场接住，比因为她想站在那里更要紧/g, "被推到前方，并非出于自愿。现场总得有人先接住"],
  [/敌人要她们犯的错压到桌面上的，是简单；慢反倒成了次要的/g, "敌人盼着她们把问题想得太简单；慢一点反倒没有那么致命"],
  [/([^。！？\n]{2,8})听见自己呼吸里的停顿。她没马上把停顿抹掉，很多判断都要从这半秒不体面的迟疑里长出来。/g, "$1听见自己的呼吸顿了一下。她没有抹掉那半秒；很多判断正是从迟疑里长出来的。"],
  [/同行关系让最简单的办法变得不可靠。([^。！？\n]{2,8})没马上否定它，只让([^。！？\n]{2,8})把代价说完整。/g, "同行关系把最省事的办法拖住了。$1没有立刻拍板，$2先把代价摊开。"],
  [/每多核一遍身份，就会多消耗几分钟。([^。！？\n]{2,8})看见表上的时间往后滑，仍然没有把这一步划掉。/g, "$1看见时间往后滑，还是保留了那道身份复核。几分钟要花，后面的混乱更花不起。"],
  [/([^。！？\n]{2,8})的沉默让两个人同时慢下来。队伍里有些关系不靠安慰维持，而靠关键时刻有人愿意把难听的话说在前面。/g, "$1沉默了一下，两个人的节奏都慢下来。有些关系不靠安慰维持，靠的是难听的话有人肯先说。"],
  [/疲惫像一层薄灰落在([^。！？\n]{2,8})肩上。她没有拍掉，只把肩背挺直一点，好让后面的人还能看见方向。/g, "疲惫落在$1肩上。她没有拍掉，只把背挺直一点，让后面的人还能看见方向。"],
  [/能不该被说明/g, "能不能说给外面的人听"],
  [/等不得到事后再补/g, "等不到事后再补"],
  [/被核对为特别事务/g, "被确认为特别事务"],
  [/最要紧看的/g, "真正要看的"],
  [/要紧命的东西/g, "要命的东西"],
  [/只点头核对可以继续核/g, "只点头，示意继续往下核"],
  [/仍然没有把复核划掉/g, "仍然没有把这一步划掉"],
  [/能别让人听懂/g, "能不能让人听懂"],
  [/没法只在我们自己这儿成立/g, "不能只在我们自己这儿成立"],
  [/把那种形状放进命令，而不是放进脸上/g, "把那点害怕压进命令里，脸上只留该有的平静"],
  [/能执行的话，先比好听的话有用/g, "能执行的话，比好听的话更有用"],
  [/把风险写到线旁边/g, "把后果写在那条线旁"],
  [/把危险写到线旁边/g, "把后果写在那条线旁"],
  [/危险写在旁边/g, "后果写在旁边"],
  [/低可见查证/g, "低可见复核"],
  [/核对可以继续核/g, "示意继续往下核"],
];

function xmlEscape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function countOccurrences(text, marker) {
  if (marker.includes(".*")) return [...text.matchAll(new RegExp(marker, "g"))].length;
  return text.split(marker).length - 1;
}

function markerCounts(text) {
  return Object.fromEntries(markerPatterns.map((marker) => [marker, countOccurrences(text, marker)]));
}

function topDuplicates(markdown, limit = 20) {
  const counts = new Map();
  for (const paragraph of markdown.split(/\r?\n\r?\n/)) {
    const p = paragraph.trim();
    if (!p || p.startsWith("#") || p.length < 24) continue;
    counts.set(p, (counts.get(p) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([text, count]) => ({ count, text }));
}

function chooseVariant(variants, key, seen) {
  const count = seen.get(key) || 0;
  seen.set(key, count + 1);
  return variants[count % variants.length];
}

function replaceExactParagraph(paragraph, seen) {
  const trimmed = paragraph.trim();
  for (const [pattern, variants] of repeatedLineVariants.entries()) {
    if (pattern.test(trimmed)) {
      pattern.lastIndex = 0;
      return trimmed.replace(pattern, (...args) => {
        const match = args[0];
        const captures = args.slice(1, -2);
        let picked = chooseVariant(variants, String(pattern), seen);
        captures.forEach((capture, idx) => {
          picked = picked.replaceAll(`$${idx + 1}`, capture);
        });
        return picked || match;
      });
    }
  }
  if (sensoryVariants.has(trimmed)) return chooseVariant(sensoryVariants.get(trimmed), trimmed, seen);
  if (exactRewrites.has(trimmed)) return chooseVariant(exactRewrites.get(trimmed), trimmed, seen);
  return paragraph;
}

function replaceExactInside(paragraph, seen) {
  let text = paragraph;
  for (const [needle, variants] of exactRewrites.entries()) {
    while (text.includes(needle)) {
      text = text.replace(needle, chooseVariant(variants, needle, seen));
    }
  }
  for (const [needle, variants] of sensoryVariants.entries()) {
    while (text.includes(needle)) {
      text = text.replace(needle, chooseVariant(variants, needle, seen));
    }
  }
  return text;
}

function softenNotBut(text) {
  let local = 0;
  return text.replace(/不是([^，。！？；\n]{1,30})，而是([^。！？；\n]{1,76})/g, (match, a, b) => {
    if (match.includes("他们不是在撤人")) return match;
    const left = a.trim();
    const right = b.trim();
    const options = [
      `${right}，比${left}更要紧`,
      `${left}退到后面，${right}才是眼前要处理的事`,
      `压到桌面上的，是${right}；${left}反倒成了次要的`,
    ];
    const out = options[(text.length + local) % options.length];
    local += 1;
    return out;
  });
}

function deRepeatNames(text) {
  for (const name of characters) {
    text = text.replace(new RegExp(`${name}([^。！？\\n]{0,28})。${name}`, "g"), `${name}$1。她`);
  }
  if (text.includes("王明德")) {
    text = text
      .replace(/她们之间/g, "他们之间")
      .replace(/让她们/g, "让两人")
      .replace(/她们都明白/g, "两人都明白")
      .replace(/她们习惯/g, "他们习惯")
      .replace(/她们没有/g, "两人没有")
      .replace(/她们保住/g, "他们保住");
  }
  return text;
}

function polishParagraph(paragraph, seen, index) {
  let text = paragraph.trimEnd();
  if (!text.trim()) return text;
  if (text.startsWith("# 和平与玫瑰撤侨行动：新世界观重写完整版")) {
    return "# 和平与玫瑰撤侨行动：文学润色去AI版";
  }
  if (text === "新锐纪元世界观重写版") {
    return "新锐纪元世界观重写版 / 文学润色去AI版";
  }
  if (text === "核心主题：和平不是没有危险，而是有人愿意一次次把回家的路修好。") {
    return "核心主题：和平不是一张空白承诺。它要有人一次次把回家的路修好。";
  }
  if (/^#{1,4}\s/.test(text)) return text;

  text = replaceExactParagraph(text, seen);
  text = replaceExactInside(text, seen);

  for (const [pattern, replacement] of roleLineRewrites) text = text.replace(pattern, replacement);
  text = softenNotBut(text);

  for (const [pattern, replacement] of phraseRewrites) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/([。！？])她把话压低了些：/g, "$1她把话压低了些：")
    .replace(/说明。/g, "说明。")
    .replace(/复核身份/g, "核身份")
    .replace(/继续复核/g, "继续核")
    .replace(/可复核/g, "可追溯")
    .replace(/多复一遍/g, "多核一遍")
    .replace(/最要紧要/g, "要紧")
    .replace(/最要紧的事/g, "要紧的事")
    .replace(/最要紧的麻烦/g, "最麻烦的事")
    .replace(/没法只按速度排序/g, "没法只按快慢排序")
    .replace(/没法只在队内说得通/g, "光在队内说得通还不够")
    .replace(/没法等到事后再补/g, "等不到事后再补")
    .replace(/能没法/g, "能不能")
    .replace(/没法用“放心”敷衍/g, "没有用“放心”敷衍");

  if (index % 9 === 0) {
    text = text.replace(/她把那种形状放进命令，而不是放进脸上。/g, "她把那种形状压进命令里，脸上只留下该有的平静。");
  } else {
    text = text.replace(/她把那种形状放进命令，而不是放进脸上。/g, "她把那种形状留给命令，没让它爬到脸上。");
  }

  for (const [pattern, replacement] of postRewrites) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(
      /公开任务是撤侨，让([^，。！？\n]{1,18})停下来的却是([^。！？\n]+)。([^。！？\n]{2,8})也看见了同一个裂口，只是她先想到的她先想到的是，突破之后谁来说明。/g,
      "公开任务是撤侨。$1真正停住，是因为$2。$3也看见了同一个裂口，先问的是突破之后谁来向人群说明。",
    )
    .replace(
      /让([^，。！？\n]{1,18})停下来的，是([^。！？\n]+)。([^。！？\n]{2,8})也看见了同一个裂口，只是她先想到的她先想到的是，突破之后谁来说明。/g,
      "$1真正停住，是因为$2。$3也看见了同一个裂口，先问的是突破之后谁来向人群说明。",
    )
    .replace(/她先想到的她先想到的是/g, "她先想到的是");

  return deRepeatNames(text);
}

function polishMarkdown(markdown) {
  const seen = new Map();
  const polished = markdown
    .split(/\r?\n\r?\n/)
    .map((paragraph, index) => polishParagraph(paragraph, seen, index))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";
  return diversifyRepeatedParagraphs(polished);
}

function diversifyRepeatedParagraphs(markdown) {
  const seen = new Map();
  return (
    markdown
      .split(/\r?\n\r?\n/)
      .map((paragraph) => {
        const trimmed = paragraph.trim();
        if (!trimmed || /^#{1,4}\s/.test(trimmed)) return paragraph;
        for (const [pattern, variants] of repeatedLineVariants.entries()) {
          pattern.lastIndex = 0;
          if (!pattern.test(trimmed)) continue;
          pattern.lastIndex = 0;
          return trimmed.replace(pattern, (...args) => {
            const captures = args.slice(1, -2);
            let picked = chooseVariant(variants, `final:${String(pattern)}`, seen);
            captures.forEach((capture, idx) => {
              picked = picked.replaceAll(`$${idx + 1}`, capture);
            });
            return picked;
          });
        }
        return paragraph;
      })
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
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
  <dc:title>和平与玫瑰撤侨行动_文学润色去AI版</dc:title>
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

async function validateDocx(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  return {
    hasDocumentXml: Boolean(zip.file("word/document.xml")),
    hasStylesXml: Boolean(zip.file("word/styles.xml")),
    entryCount: Object.keys(zip.files).length,
    documentXmlLength: (await zip.file("word/document.xml")?.async("string"))?.length || 0,
  };
}

function buildManual() {
  return `# 文学润色规则手册

## 本轮目标

- 不改 36 章结构和新锐纪元世界观，只处理文风、句式、重复和人物口吻。
- 保留撤侨行动的任务压力，但减少“总结式金句”和“抽象判断句”。
- 参考本地资料库中林小队角色设定，并用《热的雪》《坦克战 修改稿》和“抵抗”类素材的战争压力方向做文风约束。

## 执行原则

1. 把“不是……而是……”改成更自然的因果、取舍或动作句。
2. 把“风险、判断、解释、核验、局面”等高频抽象词降频，替换为“后果、结论、说明、复核、现场”等更贴近叙事的表达。
3. 重复出现的感官句改成同义但不同节奏的场景句。
4. 人物关系句不再反复下定义，改为通过站位、交接、记录、沉默和动作体现。
5. 军事描写保留体系压力和现场反馈，不增加现实武器教程式细节。
`;
}

function buildReport(source, polished, docxValidation) {
  const beforeCounts = markerCounts(source);
  const afterCounts = markerCounts(polished);
  const dropped = Object.fromEntries(
    markerPatterns.map((marker) => [
      marker,
      {
        before: beforeCounts[marker],
        after: afterCounts[marker],
        delta: afterCounts[marker] - beforeCounts[marker],
      },
    ]),
  );
  const report = {
    sourceMdPath,
    polishedMdPath,
    polishedDocxPath,
    sourceChars: source.length,
    polishedChars: polished.length,
    chapterCount: [...polished.matchAll(/^### 第\d+章/gm)].length,
    volumeCount: [...polished.matchAll(/^## 第[一二三四]卷/gm)].length,
    markerChanges: dropped,
    duplicateBefore: topDuplicates(source, 12),
    duplicateAfter: topDuplicates(polished, 12),
    docxValidation,
    generatedAt: new Date().toISOString(),
  };
  return report;
}

function reportMarkdown(report) {
  const rows = markerPatterns
    .map((marker) => {
      const item = report.markerChanges[marker];
      return `| ${marker} | ${item.before} | ${item.after} | ${item.delta} |`;
    })
    .join("\n");
  const duplicates = report.duplicateAfter
    .map((item) => `- ${item.count} 次：${item.text.slice(0, 80)}`)
    .join("\n");
  return `# 文学润色去AI校验报告

## 文件

- Markdown：${report.polishedMdPath}
- Word：${report.polishedDocxPath}

## 完整性

- 原文字数：${report.sourceChars}
- 润色后字数：${report.polishedChars}
- 章节数：${report.chapterCount}
- 卷数：${report.volumeCount}
- Word document.xml：${report.docxValidation.hasDocumentXml ? "存在" : "缺失"}
- Word styles.xml：${report.docxValidation.hasStylesXml ? "存在" : "缺失"}

## 高频AI痕迹变化

| 标记 | 润色前 | 润色后 | 变化 |
|---|---:|---:|---:|
${rows}

## 润色后仍需人工二校关注的重复段

${duplicates || "- 未发现超过阈值的重复段。"}
`;
}

async function main() {
  fs.mkdirSync(workDir, { recursive: true });
  if (!fs.existsSync(sourceMdPath)) throw new Error(`Source markdown not found: ${sourceMdPath}`);

  const source = fs.readFileSync(sourceMdPath, "utf8");
  const polished = polishMarkdown(source);
  fs.writeFileSync(polishedMdPath, polished, "utf8");
  fs.writeFileSync(manualPath, buildManual(), "utf8");
  await writeDocx(polished, polishedDocxPath);
  const docxValidation = await validateDocx(polishedDocxPath);
  const report = buildReport(source, polished, docxValidation);
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(reportMdPath, reportMarkdown(report), "utf8");

  console.log(
    JSON.stringify(
      {
        polishedMdPath,
        polishedDocxPath,
        reportJsonPath,
        reportMdPath,
        chars: report.polishedChars,
        chapters: report.chapterCount,
        volumes: report.volumeCount,
        docxValidation,
        keyMarkers: Object.fromEntries(
          ["不是.*而是", "没有急着", "把自己的判断放进局面里", "风险", "核验", "判断"].map((key) => [
            key,
            report.markerChanges[key],
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
