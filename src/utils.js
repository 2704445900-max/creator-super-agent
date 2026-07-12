import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function nowIso() {
  return new Date().toISOString();
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function toJson(value) {
  return JSON.stringify(value ?? null);
}

export function fromJson(value, fallback = null) {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

export function xmlDecode(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'");
}

export function stripXmlTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, "");
}

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function snippet(text, query, maxLength = 220) {
  const source = String(text ?? "").replace(/\s+/g, " ").trim();
  if (source.length <= maxLength) return source;
  const q = String(query ?? "").trim();
  const idx = q ? source.toLowerCase().indexOf(q.toLowerCase()) : -1;
  const start = idx >= 0 ? Math.max(0, idx - Math.floor(maxLength / 3)) : 0;
  const end = Math.min(source.length, start + maxLength);
  return `${start > 0 ? "..." : ""}${source.slice(start, end)}${end < source.length ? "..." : ""}`;
}

export function classifyFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".docx", ".pptx", ".txt", ".md"].includes(ext)) return "document";
  if ([".png", ".jpg", ".jpeg", ".gif", ".jfif", ".webp"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".avi", ".mkv"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".flac", ".m4a"].includes(ext)) return "audio";
  if ([".rar", ".zip", ".7z"].includes(ext)) return "archive";
  return "other";
}

export function inferAssetType(relPath) {
  const value = relPath.replaceAll("/", "\\");
  if (value.includes("角色单张立绘")) return "character_portrait";
  if (value.includes("角色三视图") || value.includes("新-角色三视图")) return "character_turnaround";
  if (value.includes("角色卡")) return "character_card";
  if (value.includes("角色立绘（军装）")) return "military_portrait";
  if (value.includes("故事板")) return "storyboard";
  if (value.includes("漫画")) return "comic";
  if (value.includes("音乐")) return "music";
  if (value.includes("往期视频")) return "video";
  if (value.includes("世界观相关 logo")) return "logo";
  if (value.includes("武器设计")) return "weapon_design";
  if (value.includes("场景设计")) return "scene_design";
  if (value.includes("服装设计") || value.includes("装备设定")) return "costume_equipment";
  if (value.includes("素材参考")) return "reference";
  if (value.includes("序列帧动画")) return "animation_frames";
  if (value.includes("临时存图")) return "temporary_image";
  return "general_asset";
}

export function walkFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

export function splitRelPath(relPath) {
  return relPath.split(/[\\/]+/).filter(Boolean);
}

export function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes || 0);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

