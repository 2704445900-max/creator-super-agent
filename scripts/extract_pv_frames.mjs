import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import playwright from '../tools/npm-global/node_modules/openclaw/node_modules/playwright-core/index.js';

const videoPath = process.argv[2];
const outDir = process.argv[3] || 'output/bilibili-covers/pv-frames';

if (!videoPath) {
  console.error('Usage: node scripts/extract_pv_frames.mjs <video> <out-dir>');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const absoluteVideoPath = path.resolve(videoPath);
const videoSize = fs.statSync(absoluteVideoPath).size;

const server = http.createServer((req, res) => {
  if (!req.url?.startsWith('/video')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    const start = Number(match?.[1] || 0);
    const end = match?.[2] ? Number(match[2]) : videoSize - 1;
    res.writeHead(206, {
      'Content-Type': 'video/mp4',
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(absoluteVideoPath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Content-Length': videoSize,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(absoluteVideoPath).pipe(res);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const videoUrl = `http://127.0.0.1:${port}/video`;

const { chromium } = playwright;

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
  ],
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => console.error(`[browser:error] ${err.message}`));

await page.setContent(`<!doctype html>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { width: 100vw; height: 100vh; object-fit: contain; background: #000; display: block; }
</style>
<video id="v" src="${videoUrl}" preload="auto" muted playsinline crossorigin="anonymous"></video>`);

const duration = await page.evaluate(async () => {
  const video = document.getElementById('v');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('metadata timeout')), 20000);
    video.addEventListener('loadedmetadata', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    video.addEventListener('error', () => reject(new Error(video.error?.message || 'video load error')), { once: true });
  });
  return video.duration;
});

const fractions = [0.04, 0.08, 0.12, 0.16, 0.20, 0.26, 0.32, 0.38, 0.44, 0.50, 0.56, 0.62, 0.68, 0.74, 0.80, 0.86, 0.92, 0.96];
const times = fractions.map(f => Math.max(0.1, Math.min(duration - 0.2, duration * f)));

console.log(JSON.stringify({ videoPath, duration, frames: times.length }, null, 2));

for (let i = 0; i < times.length; i += 1) {
  const t = times[i];
  await page.evaluate(async (time) => {
    const video = document.getElementById('v');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`seek timeout ${time}`)), 15000);
      const done = () => {
        clearTimeout(timer);
        video.removeEventListener('seeked', done);
        resolve();
      };
      video.addEventListener('seeked', done);
      video.currentTime = time;
    });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, t);

  const framePath = path.join(outDir, `frame-${String(i + 1).padStart(2, '0')}-${t.toFixed(2)}s.png`);
  await page.locator('video').screenshot({ path: framePath });
  console.log(framePath);
}

await browser.close();
server.close();
