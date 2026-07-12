import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { normalizeText, stripXmlTags, xmlDecode } from "../utils.js";

function extractTextNodes(xml, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "g");
  const parts = [];
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    parts.push(xmlDecode(stripXmlTags(match[1])));
  }
  return parts;
}

function extractDocxParagraphs(xml) {
  const paragraphPattern = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  const lines = [];
  let match;
  while ((match = paragraphPattern.exec(xml)) !== null) {
    const texts = extractTextNodes(match[1], "w:t");
    const line = texts.join("").trim();
    if (line) lines.push(line);
  }
  return lines;
}

export async function extractOfficeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".docx") return extractDocxText(filePath);
  if (ext === ".pptx") return extractPptxText(filePath);
  if (ext === ".txt" || ext === ".md") {
    return normalizeText(fs.readFileSync(filePath, "utf8"));
  }
  return "";
}

export async function extractDocxText(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) return "";

  const lines = extractDocxParagraphs(documentXml);
  return normalizeText(lines.join("\n"));
}

export async function extractPptxText(filePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const an = Number(a.match(/slide(\d+)\.xml/)?.[1] || 0);
      const bn = Number(b.match(/slide(\d+)\.xml/)?.[1] || 0);
      return an - bn;
    });

  const slides = [];
  for (const slideName of slideNames) {
    const xml = await zip.file(slideName).async("string");
    const slideNo = Number(slideName.match(/slide(\d+)\.xml/)?.[1] || slides.length + 1);
    const texts = extractTextNodes(xml, "a:t")
      .map((line) => line.trim())
      .filter(Boolean);
    if (texts.length > 0) slides.push(`[Slide ${slideNo}] ${texts.join(" ")}`);
  }
  return normalizeText(slides.join("\n"));
}

