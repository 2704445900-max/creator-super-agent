import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outDir = path.resolve("output");
const inputPath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构重写扩展版）.md");
const markdownPath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构深度顺稿版）.md");
const docxPath = path.join(outDir, "铁流东渡：台海战争篇（剧本原则重构深度顺稿版）.docx");

const metaPatterns = [
  /^而真正的潮汐，在旧稿里有更长的准备时间。.*$/,
  /^触滩之后，通道不再是地图上的线，.*$/,
  /^陈志豪的判断并非凭空出现。.*$/,
  /^左翼的机会被旧稿写得更尖锐：.*$/,
  /^装甲逼近时，战场把选择压到最窄。.*$/,
  /^第一幕的收束不只是战术胜利，.*$/,
  /^进入城市后，原稿里的每条街、每扇门，.*$/,
  /^顾问、残敌和台军基层的裂缝，.*$/,
  /^巷战不能只留下结果。.*$/,
  /^被抛下的人如何意识到自己被卖掉，.*$/,
  /^校门之前，旧稿把围困的空气写得更长。.*$/,
  /^唐舒嫣的声音、证词和最后通牒，.*$/,
  /^清楼段落保留旧稿的强度，.*$/,
  /^学校安静下来之后，短暂余波仍要保留，.*$/,
  /^新竹不是一句进入城市就能写完的地方。.*$/,
  /^唐舒嫣的课在原稿里已有重量，.*$/,
  /^重建篇被恢复为更长的日常战场：.*$/,
  /^第四天的材料保留下来，.*$/,
  /^各自的位置重新并入第三幕，.*$/,
  /^街道材料在这里第二次使用，.*$/,
  /^道别篇扩回原来的呼吸。.*$/,
  /^赵文亮需要更厚的阴影，.*$/,
  /^台北攻坚不能只剩一个结论，.*$/,
  /^信义区的棋盘需要空间感。.*$/,
  /^楼顶与五百零八米的旧稿细节，.*$/,
  /^向下的过程保留旧稿推进，.*$/,
  /^核心区和地下段落重新展开，.*$/,
  /^终局与旗帜段落保留更多旧稿余震，.*$/,
  /^升旗后的黎明和表彰被恢复一部分，.*$/,
  /^三种声音需要旧后记的厚度。.*$/,
  /^采访和媒体材料不再整段删除，.*$/,
  /^归队、姐妹和私人情感线重新放回终章，.*$/,
];

const replacements = [
  [/^# 铁流东渡：台海战争篇（剧本原则重构重写扩展版）$/m, "# 铁流东渡：台海战争篇（剧本原则重构深度顺稿版）"],
  [
    /## 版本说明\n\n本版是在《剧本原则重构重写版》的五幕三十二章结构上继续扩写的长篇版。它不改变新版架构，但将旧稿中大量可保留的战斗细节、人物对话、重建段落、后记情绪和小记材料重新并入对应章节，避免只剩骨架式删节。\n\n扩展原则：章节结构仍按“感知 -> 行动 -> 新状态”推进；旧稿材料只作为血肉和细部回填，不恢复重复后记标题，不恢复松散目录，不覆盖原始校订稿。\n\n/,
    "## 修订说明\n\n本稿按五幕三十二章重排，保留台海战争篇的主要战斗、城市重建、人物访谈与小记材料，并清理重复目录、说明性桥段和旧稿痕迹，使全文归入同一条小说主线。\n\n",
  ],
  [/不是标准的“收到”应答，而是各车组长用各自的方式确认：一排刘伊七的声音低而利落、二排韩梦雪简短到只有一个“嗯”、三排洛情轩沉稳地复述了一遍时间节点。/g, "不是标准的“收到”应答，而是各车组长用各自的方式确认：刘伊七的声音低而利落，韩梦雪简短到只有一个“嗯”，洛情轩沉稳地复述了一遍时间节点。"],
  [/今天他不在这里/g, "今天她不在这里"],
  [/一排楚乔翼的声音清脆紧张/g, "刘伊七的声音清脆紧张"],
  [/一排的楚乔翼带着尖兵班/g, "楚乔翼带着尖兵班"],
  [/从方击毙/g, "从侧后方击毙"],
  [/“真的东西——有它自己的力量。不急。”/g, "“真的东西——有它自己的力量。不急。”"],
];

function readInput() {
  if (!fs.existsSync(inputPath)) throw new Error(`Missing input: ${inputPath}`);
  return fs.readFileSync(inputPath, "utf8");
}

function removeMetaParagraphs(markdown) {
  const lines = markdown.split(/\r?\n/);
  return lines
    .filter((line) => !metaPatterns.some((pattern) => pattern.test(line.trim())))
    .join("\n");
}

function collapseDuplicateBlankLines(markdown) {
  return markdown
    .replace(/\r/g, "")
    .replace(/^\s*\*完\*\s*$/gm, "")
    .replace(/^\s*（完）\s*$/gm, "")
    .replace(/^\s*完\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .trim() + "\n";
}

function polishMarkdown(markdown) {
  let result = removeMetaParagraphs(markdown);
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return collapseDuplicateBlankLines(result);
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
  <dc:title>铁流东渡：台海战争篇（剧本原则重构深度顺稿版）</dc:title>
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
  const metaHits = metaPatterns.reduce((sum, pattern) => sum + markdown.split(/\r?\n/).filter((line) => pattern.test(line.trim())).length, 0);
  return {
    characters: markdown.length,
    acts: (markdown.match(/^# 第[一二三四五]幕：/gm) || []).length,
    chapters: (markdown.match(/^## 第\d+章 /gm) || []).length,
    badNames: (markdown.match(/汤舒嫣|何墨缃|何墨原|何默缘|刘梦缘|刘梦鸯/g) || []).length,
    oldTopHeadings: (markdown.match(/^# (后记|小记|台北攻坚战|铁流东渡·)/gm) || []).length,
    endMarkers: (markdown.match(/^\s*(\*完\*|（完）|完)\s*$/gm) || []).length,
    metaHits,
  };
}

async function main() {
  const input = readInput();
  const markdown = polishMarkdown(input);
  fs.writeFileSync(markdownPath, markdown, "utf8");
  await writeDocx(markdown);
  const result = validate(markdown);
  console.log(JSON.stringify({ markdownPath, docxPath, validation: result }, null, 2));
  if (result.acts !== 5 || result.chapters !== 32 || result.badNames !== 0 || result.oldTopHeadings !== 0 || result.endMarkers !== 0 || result.metaHits !== 0) {
    throw new Error(`Deep polish validation failed: ${JSON.stringify(result)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
