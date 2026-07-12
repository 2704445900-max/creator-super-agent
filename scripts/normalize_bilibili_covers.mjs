import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const py = 'F:/文档/游戏搭建/tools/capcut-mate/.venv/Scripts/python.exe';
const outDir = 'F:/文档/游戏搭建/output/bilibili-covers/new-pv-complete';
const jobs = [
  {
    src: `${outDir}/cover-16x9-rain-night-awakening.png`,
    dst: `${outDir}/cover-16x9-rain-night-awakening-1920x1080.png`,
    width: 1920,
    height: 1080,
  },
  {
    src: `${outDir}/cover-4x3-rain-night-breach.png`,
    dst: `${outDir}/cover-4x3-rain-night-breach-1200x900.png`,
    width: 1200,
    height: 900,
  },
];

const code = String.raw`
from PIL import Image
import sys

src, dst, target_w, target_h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
img = Image.open(src).convert("RGB")
src_w, src_h = img.size
target_ratio = target_w / target_h
src_ratio = src_w / src_h

if src_ratio > target_ratio:
    crop_w = int(src_h * target_ratio)
    left = (src_w - crop_w) // 2
    box = (left, 0, left + crop_w, src_h)
else:
    crop_h = int(src_w / target_ratio)
    top = (src_h - crop_h) // 2
    box = (0, top, src_w, top + crop_h)

img = img.crop(box).resize((target_w, target_h), Image.Resampling.LANCZOS)
img.save(dst, "PNG", optimize=True)
print(f"{dst}|{target_w}x{target_h}")
`;

for (const job of jobs) {
  fs.mkdirSync(path.dirname(job.dst), { recursive: true });
  const result = spawnSync(py, ['-c', code, job.src, job.dst, String(job.width), String(job.height)], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
