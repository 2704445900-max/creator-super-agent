import fs from "fs";
import path from "path";
import JSZip from "jszip";

const sourcePath = path.resolve("source_taihai_claude_export.txt");
const outDir = path.resolve("output");
const markdownPath = path.join(outDir, "taihai_war_polished.md");
const docxPath = path.join(outDir, "taihai_war_polished.docx");
const finalDocxPath = path.join(outDir, "铁流东渡：台海战争篇（整理校订版）.docx");
const tocFixedDocxPath = path.join(outDir, "铁流东渡：台海战争篇（整理校订版-目录修正）.docx");

const includedEntries = [
  26, 27, 28,
  30, 31, 32,
  33, 35,
  37, 38,
  41, 42, 43,
  46, 47, 48, 49,
  50, 52, 53, 54,
  55, 56,
  57, 58, 59, 60,
  63, 66, 67, 68, 69,
];

const skipLeadingPatterns = [
  /^\s*$/,
  /^---$/,
  /^明白[，,]/,
  /^好[，的]/,
  /^继续[。！!，,]/,
  /^可以。/,
  /^这一段/,
  /^我来/,
  /^下面/,
];

const truncatePatterns = [
  /^全文约/,
  /^约\d+字/,
  /^调整完成/,
  /^这一章(作为|围绕|通过)/,
  /^这篇(小记|围绕|以)/,
  /^核心维度/,
  /^核心变化/,
];

const replacementPairs = [
  ["汤舒嫣", "唐舒嫣"],
  ["何墨缃", "何墨缘"],
  ["何墨原", "何墨缘"],
  ["何默缘", "何墨缘"],
  ["刘梦缘", "刘梦鸳"],
  ["刘梦鸯", "刘梦鸳"],
  ["已先头部队", "以先头部队"],
  ["轻度低抗", "轻度抵抗"],
  ["今天他不在这里", "今天她不在这里"],
  ["一排楚乔翼的声音清脆紧张", "一排刘伊七的声音低而利落"],
  ["一排的楚乔翼带着尖兵班", "一排二班的楚乔翼带着尖兵班"],
  ["从方击毙", "从侧后方击毙"],
  ["真的东西——有它自己的力量。不急。”", "“真的东西——有它自己的力量。不急。”"],
  ["“嗯。”楚乔翼受伤那天——在新竹——你在旁边吗？”", "“嗯。楚乔翼受伤那天——在新竹——你在旁边吗？”"],
];

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseEntries(lines) {
  const entries = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(\d+)\.\s*(.*)/);
    if (!match) continue;
    const number = Number(match[1]);
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j] === "------------------------------") {
        end = j;
        break;
      }
    }
    const aiIndex = lines.findIndex((line, index) => index > i && index < end && line === "AI 回复");
    const body = aiIndex >= 0 ? lines.slice(aiIndex + 1, end) : [];
    entries.set(number, { number, start: i + 1, end, body });
  }
  return entries;
}

function cleanBody(rawLines) {
  let lines = rawLines.slice();

  while (lines.length > 0 && skipLeadingPatterns.some((pattern) => pattern.test(lines[0]))) {
    lines.shift();
  }

  const cutIndex = lines.findIndex((line) => truncatePatterns.some((pattern) => pattern.test(line.trim())));
  if (cutIndex >= 0) lines = lines.slice(0, cutIndex);

  lines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed === "附件") return false;
    if (trimmed === "用户消息" || trimmed === "AI 回复") return false;
    if (/^时间:\s*/.test(trimmed) || /^状态:\s*/.test(trimmed)) return false;
    if (/^- .+\.docx$/.test(trimmed)) return false;
    if (trimmed === "---") return false;
    return true;
  });

  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
}

function normalizeText(text) {
  let out = text;
  for (const [from, to] of replacementPairs) {
    out = out.split(from).join(to);
  }
  out = out.replace(
    /“利刃。根据联合指挥部第〇四七号令，新竹市即时起进入军事管制状态。现命令你部以先头部队尖刀连身份\s*\n\s*，代表联合指挥部宣布新竹军事管制委员会正式成立。军管会临时组成人员由后续抵达的政工及行政团队充任。在正式人员到位前，你部负责维持新竹市中心区域基本秩序。相关文书及授权书已通过数据链发送至你终端。执行。“/g,
    "“利刃。根据联合指挥部第〇四七号令，新竹市即时起进入军事管制状态。现命令你部以先头部队尖刀连身份，代表联合指挥部宣布新竹军事管制委员会正式成立。军管会临时组成人员由后续抵达的政工及行政团队充任。在正式人员到位前，你部负责维持新竹市中心区域基本秩序。相关文书及授权书已通过数据链发送至你终端。执行。”",
  );
  out = out
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/"([^"]+)"/g, "“$1”");
  out = normalizeChineseQuotes(out);
  return finalPolish(out);
}

function normalizeChineseQuotes(text) {
  return text.split(/\n/).map((line) => {
    let open = true;
    let next = "";
    for (const char of line) {
      if (char === "“" || char === "”") {
        next += open ? "“" : "”";
        open = !open;
      } else {
        next += char;
      }
    }
    return next;
  }).join("\n");
}

function finalPolish(text) {
  return text
    .replace(
      /“利刃。根据联合指挥部第〇四七号令，新竹市即时起进入军事管制状态。现命令你部以先头部队尖刀连身份\s*\n\s*，代表联合指挥部宣布新竹军事管制委员会正式成立。军管会临时组成人员由后续抵达的政工及行政团队充任。在正式人员到位前，你部负责维持新竹市中心区域基本秩序。相关文书及授权书已通过数据链发送至你终端。执行。“/g,
      "“利刃。根据联合指挥部第〇四七号令，新竹市即时起进入军事管制状态。现命令你部以先头部队尖刀连身份，代表联合指挥部宣布新竹军事管制委员会正式成立。军管会临时组成人员由后续抵达的政工及行政团队充任。在正式人员到位前，你部负责维持新竹市中心区域基本秩序。相关文书及授权书已通过数据链发送至你终端。执行。”",
    )
    .replace(
      /真的东西——有它自己的力量。不急。“/g,
      "“真的东西——有它自己的力量。不急。”",
    )
    .replace(
      /“嗯。”楚乔翼受伤那天——在新竹——你在旁边吗？“/g,
      "“嗯。楚乔翼受伤那天——在新竹——你在旁边吗？”",
    )
    .replace(
      /“他们翻了我们的包。拿走了所有手机和钱包。还有……\n\n还有一个女老师——教体育的何老师——她试图拦住他们别碰学生。那个年轻的……用枪指着她的脸。让她跪下来。让所有学生看着。“/g,
      "“他们翻了我们的包。拿走了所有手机和钱包。还有……还有一个女老师——教体育的何老师——她试图拦住他们别碰学生。那个年轻的……用枪指着她的脸。让她跪下来。让所有学生看着。”",
    )
    .replace(
      /2027年4月25日“/g,
      "2027年4月25日",
    );
}

function buildMarkdown(entries) {
  const frontMatter = [
    "# 铁流东渡：台海战争篇（整理校订版）",
    "",
    "## 校订说明",
    "",
    "本稿仅从原始对话文本中抽取“台海战争”相关内容，删去前置藏南篇、私人露骨段落、用户提示词、AI说明、版本摘要和重复旧稿。",
    "",
    "重复章节按“后写版本、修正版本、设定更准确版本优先”的原则整理。例如城市战采用《城中刀》版本，重建篇采用最后一次重写版本，楚乔翼相关小记采用“楚乔翼也是女兵”修正版。",
    "",
    "本次只做书稿级整理、角色校订和轻度文风顺稿，未新增现实作战细节。",
    "",
    "## 角色设定核对",
    "",
    "- 林小队：资料库确认其为全女性单位，成员代词统一按女性处理。",
    "- 林荫清：林小队队长，战术指挥核心，武器偏好为 QBZ-191 / QSZ-92。",
    "- 唐舒嫣：副队长与事实指导员，姓名统一为“唐舒嫣”。",
    "- 赵婷婷：战术副队长、先锋官。",
    "- 刘伊七：渗透、情报获取与心理战担当。",
    "- 韩梦雪：侦察、单兵渗透与精准射击。",
    "- 洛情轩：组织部长、政工干部与远程精确射击位。",
    "- 何墨缘：信息化作战参谋，原稿中的错写变体已统一修正。",
    "- 刘梦鸳：无人化作战军官，原稿中的错写变体已统一修正。",
    "- 叶敏慧：战地医疗、心理急救与健康主管。",
    "- 楚乔翼：女兵，盾位、重武器、工程兵、装备维护定位；旧稿中男性代词已按修正版统一。",
    "- 王明德：林荫清情感线关键人物，不归入林小队女兵序列。",
    "",
    "# 正文",
    "",
  ];

  const blocks = [...frontMatter];
  for (const entryNumber of includedEntries) {
    const entry = entries.get(entryNumber);
    if (!entry) {
      throw new Error(`Missing entry ${entryNumber}`);
    }
    const cleaned = cleanBody(entry.body);
    if (cleaned.length === 0) continue;
    blocks.push(...cleaned, "");
  }
  return normalizeText(blocks.join("\n")).replace(/\n{3,}/g, "\n\n");
}

function paragraphXml(text, style = "Normal") {
  const escaped = xmlEscape(text);
  const jc = style === "Title" ? '<w:jc w:val="center"/>' : "";
  const ind = style === "Normal" && text.trim() && !/^2027年/.test(text.trim())
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
    `<w:pPr>${pStyle}${jc}${ind}${outlineLevel}<w:spacing w:after="${style === "Normal" ? 120 : 180}"/></w:pPr>`,
    `<w:r><w:t xml:space="preserve">${escaped}</w:t></w:r>`,
    "</w:p>",
  ].join("");
}

function fieldParagraphXml(instruction, displayText = "") {
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
  const lines = markdown.split(/\r?\n/);
  let insertedToc = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      continue;
    }
    if (/^# /.test(line)) {
      const text = line.replace(/^#\s+/, "");
      paragraphs.push(paragraphXml(text, text.includes("整理校订版") ? "Title" : "Heading1"));
      if (text.includes("整理校订版") && !insertedToc) {
        paragraphs.push(paragraphXml("目录", "Heading1"));
        paragraphs.push(fieldParagraphXml('TOC \\o "1-3" \\h \\z \\u', "请在 Word 中右键更新域以生成目录"));
        paragraphs.push(pageBreakXml());
        insertedToc = true;
      }
    } else if (/^## /.test(line)) {
      paragraphs.push(paragraphXml(line.replace(/^##\s+/, ""), "Heading2"));
    } else if (/^### /.test(line)) {
      paragraphs.push(paragraphXml(line.replace(/^###\s+/, ""), "Heading3"));
    } else if (/^- /.test(line)) {
      paragraphs.push(paragraphXml(`· ${line.replace(/^- /, "")}`, "Normal"));
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
    <w:pPr><w:jc w:val="center"/><w:spacing w:before="480" w:after="360"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="44"/></w:rPr>
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
  <dc:title>铁流东渡：台海战争篇（整理校订版）</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-18T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-18T00:00:00Z</dcterms:modified>
</cp:coreProperties>`);
  zip.folder("docProps").file("app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>`);

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(docxPath, buffer);
  try {
    fs.writeFileSync(finalDocxPath, buffer);
  } catch (error) {
    if (error?.code !== "EBUSY") throw error;
    console.warn(`Skipped locked file ${finalDocxPath}`);
  }
  fs.writeFileSync(tocFixedDocxPath, buffer);
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
  const entries = parseEntries(lines);
  const markdown = buildMarkdown(entries);
  fs.writeFileSync(markdownPath, markdown, "utf8");
  await writeDocx(markdown);
  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${docxPath}`);
  console.log(`Wrote ${finalDocxPath}`);
  console.log(`Wrote ${tocFixedDocxPath}`);
  console.log(`Characters: ${markdown.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
