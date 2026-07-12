import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outDir = path.resolve("output");
const sourcePath = path.join(outDir, "taihai_war_polished.md");
const spinePath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构重写版）.md");
const markdownPath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构重写扩展版）.md");
const docxPath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构重写扩展版）.docx");
const mappingPath = path.join(outDir, "铁流东渡_旧稿到新稿章节映射表（扩展版）.md");

const chapterSources = new Map([
  [1, ["第一章 潮汐"]],
  [2, ["第二章 触滩"]],
  [3, ["第三章 博弈"]],
  [4, ["第四章 粉碎"]],
  [5, ["第五章 铁幕"]],
  [6, ["第六章 收网", "第七章 潮落"]],
  [7, ["第八章 向纵深", "第九章 入城"]],
  [8, ["第十章 绞杀", "第十三章 声音"]],
  [9, ["第十一章 刃与刃", "第十二章 四十秒"]],
  [10, ["第十四章 台军", "第十五章 城安"]],
  [11, ["第十六章 校门", "第十七章 围"]],
  [12, ["第十八章 唐舒嫣的声音", "第十九章 连长到场", "第二十章 证词", "第二十一章 最后通牒"]],
  [13, ["第二十二章 清楼"]],
  [14, ["第二十三章 安静的学校"]],
  [15, ["第二十四章 溃", "第二十五章 进城", "第二十七章 升旗"]],
  [16, ["第二十六章 唐舒嫣的课"]],
  [17, ["第二十八章 第一个早晨", "第二十九章 街道"]],
  [18, ["第三十章 第四天"]],
  [19, ["第三十一章 各自的位置"]],
  [20, ["第二十九章 街道"]],
  [21, ["第三十二章 命令", "第三十三章 两小时", "第三十四章 集结", "第三十五章 送行", "尾声"]],
  [22, ["第六章 赵文亮"]],
  [23, ["第一章 钢铁洪流", "第二章 火", "第三章 渡河"]],
  [24, ["第四章 九公里", "第五章 信义区"]],
  [25, ["第七章 顶", "第八章 五百零八米"]],
  [26, ["第九章 向下"]],
  [27, ["第十章 核心区", "第十一章 地下"]],
  [28, ["第十二章 终局", "终章 旗"]],
  [29, ["第十三章 黎明", "第十四章 表彰"]],
  [30, ["第十六章 代表大会", "第十七章 林荫清", "第十八章 唐舒嫣", "第十九章 赵婷婷", "第二十章 会后", "第二十一章 深夜", "第二十二章 茶"]],
  [31, ["小记：镜头前", "小记：回答", "一、新华社（10月2日·书面采访）", "二、《解放军报》（10月3日·面对面采访）", "三、央视《面对面》栏目（10月4日·演播室录制）", "四、《环球时报》英文版（10月5日·书面采访）", "五、《中国青年报》（10月6日·视频连线采访）", "六、凤凰卫视（10月7日·连线采访）", "七、地方电视台——福建东南卫视（10月8日·驻地实拍）", "小记：翻译", "一、路透社+美联社+法新社（10月10日·联合记者会）", "二、BBC（10月11日·单独采访）", "三、NHK（10月11日·视频连线）", "四、半岛电视台（10月12日·演播室连线）", "五、台湾媒体——《联合报》+TVBS（10月14日·联合采访）", "小记：屏幕那边", "小记：对面"]],
  [32, ["第十五章 此后", "第二十三章 通知", "第二十四章 训练", "第二十五章 十月一日", "小记：归队", "小记：姐们", "小记：两个人"]],
]);

const transitions = new Map([
  [1, "而真正的潮汐，在旧稿里有更长的准备时间。那是钢铁、海风、倒计时和每个人压住呼吸的声音。"],
  [2, "触滩之后，通道不再是地图上的线，而是被火光、浪声和命令一点点凿出来的现实。"],
  [3, "陈志豪的判断并非凭空出现。滩头双方的博弈，在更细的战场节奏里逐渐露出形状。"],
  [4, "左翼的机会被旧稿写得更尖锐：那不是一次单纯突击，而是赵婷婷第一次被边界拽住。"],
  [5, "装甲逼近时，战场把选择压到最窄。原有细节保留了这份压迫感。"],
  [6, "第一幕的收束不只是战术胜利，还包括潮落之后所有没法写进捷报里的东西。"],
  [7, "进入城市后，原稿里的每条街、每扇门，都被重新纳入这条更严的交战边界。"],
  [8, "顾问、残敌和台军基层的裂缝，在旧稿的城市战细节里更具体地展开。"],
  [9, "巷战不能只留下结果。那些四十秒里的声音、姿态和停顿，是城市战真正的血肉。"],
  [10, "被抛下的人如何意识到自己被卖掉，旧稿里有更完整的心理转向。"],
  [11, "校门之前，旧稿把围困的空气写得更长。那种长，正是中点危机需要的窒息感。"],
  [12, "唐舒嫣的声音、证词和最后通牒，在扩展版里重新接回谈判链条。"],
  [13, "清楼段落保留旧稿的强度，但它现在被放回纪律与正义的中点里。"],
  [14, "学校安静下来之后，短暂余波仍要保留，因为那是赵婷婷成长线第一次真正落地。"],
  [15, "新竹不是一句进入城市就能写完的地方。旧稿中的溃散、进城与升旗，被重新放进秩序验收的过程。"],
  [16, "唐舒嫣的课在原稿里已有重量，扩展版保留它的主体，让政治工作不只停在概括。"],
  [17, "重建篇被恢复为更长的日常战场：第一个早晨、街道和等待答复的人。"],
  [18, "第四天的材料保留下来，用来承接通信、供水和城市功能恢复。"],
  [19, "各自的位置重新并入第三幕，让群像不在压缩中失声。"],
  [20, "街道材料在这里第二次使用，不再作为重复战斗，而作为信任转折的民间侧面。"],
  [21, "道别篇扩回原来的呼吸。送行不是煽情，而是第三幕主题的验收。"],
  [22, "赵文亮需要更厚的阴影，旧稿中他的出场被保留为终局对手的支点。"],
  [23, "台北攻坚不能只剩一个结论，钢铁洪流、火与渡河重新构成第四幕开端。"],
  [24, "信义区的棋盘需要空间感。旧稿里的九公里和核心区推进被重新接入。"],
  [25, "楼顶与五百零八米的旧稿细节，是第四幕纵深感的来源。"],
  [26, "向下的过程保留旧稿推进，让信息不完整的压力更长久。"],
  [27, "核心区和地下段落重新展开，承担终局之前最紧的推进。"],
  [28, "终局与旗帜段落保留更多旧稿余震，但主题仍落在责任而不是奇观。"],
  [29, "升旗后的黎明和表彰被恢复一部分，让胜利的公共层面不被删空。"],
  [30, "三种声音需要旧后记的厚度。这里保留林荫清、唐舒嫣、赵婷婷及思想余波的主体材料。"],
  [31, "采访和媒体材料不再整段删除，而是作为战后回声并入同一章。"],
  [32, "归队、姐妹和私人情感线重新放回终章，让结尾不只是一句主题句。"],
]);

function readRequired(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
  return fs.readFileSync(file, "utf8");
}

function parseSections(markdown) {
  const matches = [...markdown.matchAll(/^(#{1,2})\s+(.+)$/gm)];
  const sections = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const title = match[2].trim();
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    const body = markdown.slice(bodyStart, bodyEnd).trim();
    if (!sections.has(title)) sections.set(title, body);
  }
  return sections;
}

function parseSpine(markdown) {
  const matches = [...markdown.matchAll(/^(#|##)\s+(.+)$/gm)];
  const items = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const level = match[1].length;
    const title = match[2].trim();
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    items.push({ level, title, body: markdown.slice(bodyStart, bodyEnd).trim() });
  }
  return items;
}

function cleanSourceBody(body) {
  return body
    .replace(/\r/g, "")
    .replace(/^\s*\*完\*\s*$/gm, "")
    .replace(/^\s*（完）\s*$/gm, "")
    .replace(/^\s*完\s*$/gm, "")
    .replace(/^\s*[-—]{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mergeChapter(spineBody, sourceBodies, transition) {
  const spineParagraphs = spineBody.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (sourceBodies.length === 0) return spineBody.trim();

  const openingCount = Math.min(2, Math.max(1, Math.floor(spineParagraphs.length / 3)));
  const closingCount = Math.min(2, Math.max(1, Math.floor(spineParagraphs.length / 4)));
  const opening = spineParagraphs.slice(0, openingCount);
  const closing = spineParagraphs.slice(Math.max(openingCount, spineParagraphs.length - closingCount));
  const oldMaterial = sourceBodies.map(cleanSourceBody).filter(Boolean);

  return [
    ...opening,
    transition,
    ...oldMaterial,
    ...closing,
  ].filter(Boolean).join("\n\n").trim();
}

function buildExpandedMarkdown(sourceSections, spineItems) {
  const lines = [
    "# 铁流东渡：台海战争篇（剧本原则重构重写扩展版）",
    "",
    "## 版本说明",
    "",
    "本版是在《剧本原则重构重写版》的五幕三十二章结构上继续扩写的长篇版。它不改变新版架构，但将旧稿中大量可保留的战斗细节、人物对话、重建段落、后记情绪和小记材料重新并入对应章节，避免只剩骨架式删节。",
    "",
    "扩展原则：章节结构仍按“感知 -> 行动 -> 新状态”推进；旧稿材料只作为血肉和细部回填，不恢复重复后记标题，不恢复松散目录，不覆盖原始校订稿。",
    "",
  ];

  let currentAct = "";
  for (const item of spineItems) {
    if (item.level === 1 && /^第[一二三四五]幕：/.test(item.title)) {
      currentAct = item.title;
      lines.push(`# ${item.title}`, "");
      continue;
    }
    if (item.level !== 2) continue;
    const chapterMatch = item.title.match(/^第(\d+)章\s+(.+)$/);
    if (!chapterMatch) continue;
    const chapterNo = Number(chapterMatch[1]);
    const sourceTitles = chapterSources.get(chapterNo) ?? [];
    const sourceBodies = sourceTitles.map((title) => {
      const body = sourceSections.get(title);
      if (!body) {
        console.warn(`Missing source section for chapter ${chapterNo}: ${title}`);
        return "";
      }
      return body;
    }).filter(Boolean);
    const body = mergeChapter(item.body, sourceBodies, transitions.get(chapterNo) ?? "旧稿中的细部在这里重新接回新版结构。");
    lines.push(`## ${item.title}`, "");
    lines.push(body, "");
  }

  if (!currentAct) {
    throw new Error("No acts found in spine markdown");
  }

  return `${lines.join("\n").trim()}\n`;
}

function buildMapping(sourceSections) {
  const lines = [
    "# 铁流东渡：旧稿到新稿章节映射表（扩展版）",
    "",
    "本表说明扩展版如何把旧稿材料重新并入五幕三十二章。扩展版保留新版架构，但显著增加旧稿正文细节。",
    "",
    "| 新章 | 旧稿来源 | 回填字数 | 处理方式 |",
    "| --- | --- | --- | --- |",
  ];
  for (const [chapterNo, titles] of chapterSources.entries()) {
    const chars = titles.reduce((sum, title) => sum + (sourceSections.get(title)?.length ?? 0), 0);
    lines.push(`| 第${chapterNo}章 | ${titles.join("；")} | ${chars} | 作为扩展正文并入新版章节，保留五幕三十二章结构 |`);
  }
  return `${lines.join("\n").trim()}\n`;
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
    } else if (line.startsWith("- ")) {
      paragraphs.push(paragraphXml(`• ${line.replace(/^- /, "")}`, "Normal"));
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
  <dc:title>铁流东渡：台海战争篇（剧本原则重构重写扩展版）</dc:title>
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
  };
}

async function main() {
  const source = readRequired(sourcePath);
  const spine = readRequired(spinePath);
  const sourceSections = parseSections(source);
  const spineItems = parseSpine(spine);
  const markdown = buildExpandedMarkdown(sourceSections, spineItems);
  const mapping = buildMapping(sourceSections);
  fs.writeFileSync(markdownPath, markdown, "utf8");
  fs.writeFileSync(mappingPath, mapping, "utf8");
  await writeDocx(markdown);
  const result = validate(markdown);
  console.log(JSON.stringify({ markdownPath, docxPath, mappingPath, validation: result }, null, 2));
  if (result.acts !== 5 || result.chapters !== 32 || result.badNames !== 0 || result.oldTopHeadings !== 0 || result.characters < 120000) {
    throw new Error(`Expanded validation failed: ${JSON.stringify(result)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
