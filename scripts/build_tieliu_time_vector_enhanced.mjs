import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outDir = path.resolve("output");
const inputPath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构深度顺稿版）.md");
const markdownPath = path.join(outDir, "铁流东渡：台海战争篇（时间矢量强化版）.md");
const docxPath = path.join(outDir, "铁流东渡：台海战争篇（时间矢量强化版）.docx");

const inserts = [
  {
    after: "她把地图放大到海岸后方三公里。原定的推进箭头从一片低矮民居旁擦过，那里有一条通往镇区的窄路。情报把它标成“可用通道”，但在林荫清眼里，那不是通道，是有人会从里面跑出来的门。",
    text: "她把手指停在那条窄路上。屏幕的蓝光映在她眼底，像黎明之前一小块冷硬的天色。海在舰体外面起伏，陆地还没有真正出现，可她已经先看见了门、窗、路口和可能惊醒的人。那一刻，登陆不再是从海到岸的几公里距离，而是从黑夜走向别人生活里的第一步。",
  },
  {
    after: "林荫清把终端扣回护臂。远处海天交界仍旧黑着，但黑色边缘已经浮出一点灰。她突然想起王明德问的那碗面。她没有把它当成软弱，只把它当成一条必须带回去的路。",
    text: "灰光没有立刻照亮任何东西，只把每个人的轮廓从黑暗里轻轻托出来。林荫清在那层灰里看见自己的手，稳定、年轻、还没有沾上今天的尘土。她知道几个小时后这只手会签收伤员名单、俘虏名单，也许还会按住某个队友发抖的肩。她把这个念头压下去，像把一枚冷硬的弹匣推入枪膛。",
  },
  {
    after: "通道真正有了意义。",
    text: "雨还没有下，天却像被潮气浸透。沙滩、废车、担架和那条临时通道都停在一种将亮未亮的颜色里。赵婷婷第一次发现，自己以为的“冲上去”并不是战斗唯一的开始；有时候，先把一条路让出来，才是真正困难的进攻。",
  },
  {
    after: "林荫清看了一眼腕表：05:22:30。",
    text: "她忽然想起地图上的红线。那些线在屏幕上很细，细得像可以被一阵风吹走；可到了地面上，每一条线都变成了担架、门槛、老人弯下去的背和孩子睁大的眼。她不能让它们在第一次诱惑面前断掉。",
  },
  {
    after: "她不太习惯这种好，心里像有一枚小钉子，被轻轻敲进去。",
    text: "那枚钉子不疼，却让她在之后很长一段路上都能感觉到。它像一个小小的停顿，钉在她每一次想要先于命令冲出去的瞬间。赵婷婷讨厌迟疑，可她开始明白，有些停顿不是胆怯，是给身后的人留一个追上来的时间。",
  },
  {
    after: "她们向城市走去，像从一场战争进入另一场更安静的战争。",
    text: "身后的海声渐渐低了，前方的城市没有声音。林荫清跨过滩头线时回头看了一眼，海面已经从黑变成灰蓝，浪把履带印一点点抹平。可她知道，真正不会被抹平的，是这一早晨留下的名单。",
  },
  {
    after: "雨逐渐连成线。队伍进入第一条街时，所有声音都被水汽压低了。韩梦雪走在侧后，目光先于脚步抵达每个窗口。楚乔翼背着沉重装备，经过一扇半开的门时停了一下，把门轻轻推回去。",
    text: "那扇门没有完全合上，门缝里是昏暗的客厅和一只倒在地上的拖鞋。楚乔翼推门的动作很轻，轻得不像一个背着重装的人。她忽然意识到，自己平时用来撞开的东西，今天有些必须替别人守住。这个念头像一粒雨水落进盔甲缝里，凉，却清醒。",
  },
  {
    after: "她只是打开扩音器，先念出那个女教师的名字，然后说：“你的学生告诉我，你让他们不要哭。”",
    text: "雨水顺着校门的蓝漆往下流，像把旧颜色洗出一道道浅痕。唐舒嫣看见门内操场上的积水，看见楼道尽头晃动的白色校服，也看见自己手里的稿纸被雨点打出小洞。她忽然不想再使用任何漂亮句子。漂亮句子太轻，托不住门后的孩子。",
  },
  {
    after: "红线不是画在地图上的，它画在每个人的手指和呼吸之间。",
    text: "赵婷婷的呼吸在那条线前变得很重。她第一次清楚地听见自己身体里有两个声音：一个催她冲进去，一个逼她等下去。雨声夹在两者之间，把每一秒都拉得很长。她不怕死，她怕自己等错；可她更怕自己冲错。",
  },
  {
    after: "校铃在停电的校园里没有响，但所有人都知道，一堂课已经结束了。",
    text: "窗外的雨停在这时。操场上的水洼映出教学楼破碎的轮廓，像一张被揉皱又摊开的纸。赵婷婷从那片倒影旁走过，没有踩进去。她忽然想，如果明天这里还能响起校铃，那么今天她学会的这点难受，就不算白挨。",
  },
  {
    after: "那问题很小，小到只有一张药单；也很大，大到足以验收一场胜利。",
    text: "清晨的光落在活动中心门口，照出空气里的灰尘。门半开着，里面是临时搬来的桌椅，外面是还不敢靠近的人群。林荫清站在门槛旁，忽然意识到这道门比滩头线更难跨。滩头线可以用火力打开，门槛只能用一次次兑现来磨低。",
  },
  {
    after: "那块黑板比任何演讲都有效。因为它不是要求别人相信，而是允许别人检查。唐舒嫣站在粉笔灰里，忽然觉得政治工作不是把人说服，而是把承诺放到人能摸到的地方。",
    text: "粉笔灰落在她袖口上，像一层很薄的雪。唐舒嫣没有掸掉它。她以前习惯把话说得锋利、准确、漂亮，可这一天她发现，有些话必须钝一点，慢一点，落在黑板上，等人明天再来核对。能被核对的承诺，才不怕沉默。",
  },
  {
    after: "何墨缘摘下耳机，声音哑得厉害：“信号还不稳。”",
    text: "傍晚时，第一盏路灯亮得很不稳定，闪了三次才稳住。街边有人从窗帘后探出头，又很快缩回去。林荫清没有抬手示意，她只是站在原地，看那盏灯把湿漉漉的路面照出一条细长的亮痕。那不是胜利的光，更像病人恢复意识后第一次睁开的眼。",
  },
  {
    after: "那一刻她明白，有些人用枪守阵地，有些人用字守秩序。",
    text: "洛情轩把最后一个字写完时，天色已经暗下来。黑板边缘挂着一串小水珠，像还没落下的省略号。她突然允许自己承认一件事：她不可能让所有问题当天变好。可只要问题还被写在这里，被看见，被追问，就还没有重新掉回黑暗里。",
  },
  {
    after: "唐舒嫣坐在她旁边，低声说：“这座城还没结束。”",
    text: "车窗外的街道从清晨走到午后，阳光落在半开的卷帘门上。林荫清看见有人站在门里，没有挥手，只把门又推高了一点。那一点高度很小，却像一座城市把肩膀从恐惧里慢慢抬起来。",
  },
  {
    after: "所以他必须在台北把这种相信掐断。",
    text: "地下指挥室里没有自然光，时间只能靠墙上的电子钟跳动。赵文亮看着数字从深夜滑向凌晨，忽然意识到自己守的不是一栋楼，而是旧世界最后一间不愿开窗的房间。他把窗帘拉得越紧，外面的天就越显得不可阻挡。",
  },
  {
    after: "她知道校园那一课还在赵婷婷身上生效。真正的成长不是从此不怕，而是在最怕错过时还能停半秒，让队友跟上。",
    text: "桥下的水是黑的，远处城市灯带碎在水面上，像一条被打断的路。赵婷婷低头看叶敏慧替她缠好的绷带，忽然觉得那不是包扎，而是一种提醒：疼痛会告诉人边界在哪里，纪律也是。",
  },
  {
    after: "她不允许。",
    text: "夜风从高楼之间穿过，带着玻璃和灰尘的冷味。林荫清抬头看见台北101的轮廓，楼身在云层下方沉默地发亮。那不是一座单纯的建筑，而是一扇被全世界盯着的窗。她要做的不是砸碎它，而是在窗后还有人发抖的时候，把窗帘慢慢拉开。",
  },
  {
    after: "玻璃高楼在夜里无声地立着，像一把插进云里的刀。她们开始向上。",
    text: "电梯井里吹来的风像从另一个季节穿过来，冷得没有来源。唐舒嫣跟在林荫清身后，忽然想起新竹黑板上的粉笔灰。一个是楼顶的风，一个是街口的灰，它们看似毫无关系，却都在问同一个问题：承诺到了最危险的地方，还算不算数。",
  },
  {
    after: "林荫清回答：“你给了边界。够了。”",
    text: "韩梦雪在瞄准镜后闭了一下眼。不是疲惫，是把多余的恐惧关掉。她过去总相信孤独能让判断更干净，可这一刻她听见赵婷婷、楚乔翼、林荫清的呼吸在耳机里交错，忽然明白干净不是一个人完成所有事，而是在混乱里仍能分辨谁会接住下一步。",
  },
  {
    after: "她终于明白，纪律不是为了让勇敢变慢，而是为了让每个替她挡住后果的人，能活着听她说谢谢。",
    text: "平台外的天色正在从黑转灰，黎明还没到，楼里仍旧像夜。赵婷婷按住楚乔翼的担架边缘，手背上的绷带被汗浸湿。她没有说谢谢，因为那两个字太轻。她只是第一次在心里承认，自己以后每一次冲出去，都要把楚乔翼流过血的位置一并带上。",
  },
  {
    after: "它会在医院、学校、供电表和明天早晨的街道上，一点点被确认。",
    text: "地下室的门被打开时，外面吹进来一点冷空气。那风里没有胜利的味道，只有水泥灰、药味和远处潮湿的晨光。林荫清站在门口停了一秒，像从一间没有窗的房间走回世界。她知道，天快亮了，但亮起来不是结尾，只是又一轮检查的开始。",
  },
  {
    after: "旗帜在那里，她知道。现在她要确认的是，城市有没有重新呼吸。",
    text: "阳光落在旗面上，也落在临时救护点的白布上。林荫清忽然觉得这一天的光很公平，它照见旗，也照见血迹；照见镜头，也照见角落里没来得及合上的药箱。她不能只选择其中一种去记住。",
  },
  {
    after: "三种声音合在一起，比任何长篇后记都更完整。林荫清讲责任，唐舒嫣讲可检查的秩序，赵婷婷讲被纪律托住的正义。它们不是给历史的口号，而是给下一次行动的标准。",
    text: "会议结束后，三个人没有立刻离开。窗外是午后的白光，照得桌面上的水杯和记录纸都很清楚。林荫清看名单，唐舒嫣改措辞，赵婷婷低头把手套扣好。她们没有互相安慰，却在同一片安静里，各自把自己的那部分重量重新背稳。",
  },
  {
    after: "那条缝很窄，却足够让光进来。",
    text: "光进来以后，灰尘也会被看见。林荫清后来很喜欢这个事实。它说明恢复不是把一切擦得崭新，而是允许那些还没整理好的东西重新暴露在白天里。只要白天还在，人就能继续收拾。",
  },
  {
    after: "然后她归队。",
    text: "集合点在街口，天已经彻底亮了。林荫清走进队列时，赵婷婷抬头看她，唐舒嫣把最后一页交接表合上，韩梦雪安静地调整背带。没有人说欢迎回来，因为她从来没有真正离开。城市在她们身后亮着灯，前方还有新的命令。她把脚跟并拢，听见自己的心跳终于和队列的呼吸合在一起。",
  },
];

function readInput() {
  if (!fs.existsSync(inputPath)) throw new Error(`Missing input: ${inputPath}`);
  return fs.readFileSync(inputPath, "utf8");
}

function applyInserts(markdown) {
  let result = markdown.replace(
    /^# 铁流东渡：台海战争篇（剧本原则重构深度顺稿版）$/m,
    "# 铁流东渡：台海战争篇（时间矢量强化版）",
  );
  result = result.replace(
    /## 修订说明\n\n本稿按五幕三十二章重排，保留台海战争篇的主要战斗、城市重建、人物访谈与小记材料，并清理重复目录、说明性桥段和旧稿痕迹，使全文归入同一条小说主线。\n\n/,
    "## 修订说明\n\n本稿按五幕三十二章重排，并依据剧作创作原则强化“时间矢量”：在日出前、雨中校门、战后清晨、深夜高楼、天亮后的医院与街道等关键节点补入时间、天气、边界空间和人物姿态，使人物弧光与心理变化更加清晰。\n\n",
  );

  for (const insert of inserts) {
    if (!result.includes(insert.text)) {
      if (!result.includes(insert.after)) {
        console.warn(`Anchor not found: ${insert.after.slice(0, 50)}`);
        continue;
      }
      result = result.replace(insert.after, `${insert.after}\n\n${insert.text}`);
    }
  }

  return result.replace(/\n{3,}/g, "\n\n").trim() + "\n";
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
  const pStyle = style === "Normal" ? "" : `<w:pStyle w:val="${style}"/>`;
  const outlineLevel = style === "Heading1"
    ? '<w:outlineLvl w:val="0"/>'
    : style === "Heading2"
      ? '<w:outlineLvl w:val="1"/>'
      : "";
  const spacing = style === "Normal"
    ? '<w:spacing w:line="360" w:lineRule="auto" w:after="120"/>'
    : '<w:spacing w:before="260" w:after="140"/>';
  return [
    "<w:p>",
    `<w:pPr>${pStyle}${outlineLevel}${spacing}</w:pPr>`,
    `<w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`,
    "</w:p>",
  ].join("");
}

function fieldParagraphXml(instruction, displayText) {
  return [
    "<w:p>",
    '<w:pPr><w:spacing w:after="120"/></w:pPr>',
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>',
    `<w:r><w:instrText xml:space="preserve">${xmlEscape(instruction)}</w:instrText></w:r>`,
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>',
    `<w:r><w:t>${xmlEscape(displayText)}</w:t></w:r>`,
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>',
    "</w:p>",
  ].join("");
}

function pageBreakXml() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function markdownToDocumentXml(markdown) {
  const paragraphs = [];
  let seenTitle = false;
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) {
      const text = line.replace(/^#\s+/, "");
      if (!seenTitle) {
        paragraphs.push(paragraphXml(text, "Title"));
        paragraphs.push(paragraphXml("目录", "Heading1"));
        paragraphs.push(fieldParagraphXml('TOC \\o "1-2" \\h \\z \\u', "请在 Word 中右键更新域以生成目录"));
        paragraphs.push(pageBreakXml());
        seenTitle = true;
      } else {
        paragraphs.push(paragraphXml(text, "Heading1"));
      }
    } else if (line.startsWith("## ")) {
      paragraphs.push(paragraphXml(line.replace(/^##\s+/, ""), "Heading2"));
    } else {
      paragraphs.push(paragraphXml(line, "Normal"));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphs.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1320" w:bottom="1440" w:left="1320" w:header="720" w:footer="720" w:gutter="0"/>
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
    <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun"/><w:sz w:val="23"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="420" w:after="360"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="40"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="360" w:after="180"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="260" w:after="140"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="28"/></w:rPr>
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
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>铁流东渡：台海战争篇（时间矢量强化版）</dc:title>
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

function validate(markdown) {
  return {
    characters: markdown.length,
    acts: (markdown.match(/^# 第[一二三四五]幕：/gm) || []).length,
    chapters: (markdown.match(/^## 第\d+章 /gm) || []).length,
    badNames: (markdown.match(/汤舒嫣|何墨缃|何墨原|何默缘|刘梦缘|刘梦鸯/g) || []).length,
    oldTopHeadings: (markdown.match(/^# (后记|小记|台北攻坚战|铁流东渡·)/gm) || []).length,
    inserted: inserts.filter((insert) => markdown.includes(insert.text)).length,
  };
}

async function main() {
  const input = readInput();
  const markdown = applyInserts(input);
  fs.writeFileSync(markdownPath, markdown, "utf8");
  await writeDocx(markdown);
  const result = validate(markdown);
  console.log(JSON.stringify({ markdownPath, docxPath, validation: result }, null, 2));
  if (result.acts !== 5 || result.chapters !== 32 || result.badNames !== 0 || result.oldTopHeadings !== 0 || result.inserted < inserts.length) {
    throw new Error(`Time vector validation failed: ${JSON.stringify(result)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
