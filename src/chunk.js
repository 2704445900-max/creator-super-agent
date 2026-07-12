import { normalizeText } from "./utils.js";

export function chunkText(text, chunkSize = 900, overlap = 120) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n" + paragraph).trim().length > chunkSize && current.trim()) {
      chunks.push(current.trim());
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = `${tail}\n${paragraph}`;
    } else {
      current = `${current}\n${paragraph}`.trim();
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

