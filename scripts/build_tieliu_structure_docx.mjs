import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const outDir = path.resolve("output");
const markdownPath = path.join(outDir, "铁流东渡_故事架构重构方案（剧本原则校准版）.md");
const docxPath = path.join(outDir, "铁流东渡_故事架构重构方案（剧本原则校准版）.docx");

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
      : style === "Heading3"
        ? '<w:outlineLvl w:val="2"/>'
        : "";
  const spacing = style === "Normal" ? '<w:spacing w:line="360" w:lineRule="auto" w:after="120"/>' : '<w:spacing w:before="240" w:after="120"/>';
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

function tableXml(lines) {
  const rows = lines
    .filter((line) => !/^\|\s*-+/.test(line))
    .map((line, rowIndex) => {
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
      const cellXml = cells.map((cell) => [
        "<w:tc>",
        '<w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>',
        paragraphXml(cell, rowIndex === 0 ? "TableHeader" : "TableText"),
        "</w:tc>",
      ].join("")).join("");
      return `<w:tr>${cellXml}</w:tr>`;
    })
    .join("");

  return [
    "<w:tbl>",
    "<w:tblPr>",
    '<w:tblStyle w:val="TableGrid"/>',
    '<w:tblW w:w="0" w:type="auto"/>',
    '<w:tblBorders>',
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="999999"/>',
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="999999"/>',
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="999999"/>',
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="999999"/>',
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="999999"/>',
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="999999"/>',
    "</w:tblBorders>",
    "</w:tblPr>",
    rows,
    "</w:tbl>",
  ].join("");
}

function flushList(paragraphs, listItems) {
  if (!listItems.length) return;
  for (const item of listItems.splice(0)) {
    paragraphs.push(paragraphXml(`• ${item}`, "Normal"));
  }
}

function markdownToDocumentXml(markdown) {
  const paragraphs = [];
  const lines = markdown.split(/\r?\n/);
  let insertedToc = false;
  const tableLines = [];
  const listItems = [];

  function flushTable() {
    if (!tableLines.length) return;
    paragraphs.push(tableXml(tableLines.splice(0)));
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^\|.*\|$/.test(line.trim())) {
      flushList(paragraphs, listItems);
      tableLines.push(line);
      continue;
    }
    flushTable();
    if (!line.trim()) {
      flushList(paragraphs, listItems);
      continue;
    }
    if (line.startsWith("- ")) {
      listItems.push(line.replace(/^- /, ""));
      continue;
    }
    flushList(paragraphs, listItems);
    if (line.startsWith("# ")) {
      paragraphs.push(paragraphXml(line.replace(/^#\s+/, ""), "Title"));
      if (!insertedToc) {
        paragraphs.push(paragraphXml("目录", "Heading1"));
        paragraphs.push(fieldParagraphXml('TOC \\o "1-3" \\h \\z \\u', "请在 Word 中右键更新域以生成目录"));
        paragraphs.push(pageBreakXml());
        insertedToc = true;
      }
    } else if (line.startsWith("## ")) {
      paragraphs.push(paragraphXml(line.replace(/^##\s+/, ""), "Heading1"));
    } else if (line.startsWith("### ")) {
      paragraphs.push(paragraphXml(line.replace(/^###\s+/, ""), "Heading2"));
    } else if (line.startsWith("#### ")) {
      paragraphs.push(paragraphXml(line.replace(/^####\s+/, ""), "Heading3"));
    } else if (/^\d+\.\s+/.test(line)) {
      paragraphs.push(paragraphXml(line, "Normal"));
    } else {
      paragraphs.push(paragraphXml(line, "Normal"));
    }
  }
  flushTable();
  flushList(paragraphs, listItems);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphs.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1200" w:bottom="1440" w:left="1200" w:header="720" w:footer="720" w:gutter="0"/>
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
    <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun"/><w:sz w:val="22"/></w:rPr>
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
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="220" w:after="120"/><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="25"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader">
    <w:name w:val="Table Header"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:b/><w:rFonts w:ascii="SimHei" w:eastAsia="黑体" w:hAnsi="SimHei"/><w:sz w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableText">
    <w:name w:val="Table Text"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="宋体" w:hAnsi="SimSun"/><w:sz w:val="20"/></w:rPr>
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
  <dc:title>铁流东渡：故事架构重构方案（剧本原则校准版）</dc:title>
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
  const markdown = fs.readFileSync(markdownPath, "utf8");
  await writeDocx(markdown);
  console.log(`Wrote ${docxPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
