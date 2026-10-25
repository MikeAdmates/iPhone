// usage: node render.js <page.html> <seconds> <out.mp4> [fps] [previewTimes,comma]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [page_, secs, out, fpsArg, preview] = process.argv.slice(2);
  const fps = +(fpsArg || 30);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(page_));
  await page.waitForTimeout(500);
  if (preview) {
    for (const t of preview.split(',')) {
      await page.evaluate(t => render(t), +t);
      await page.screenshot({ path: `${out}-${t}.jpg`, type: 'jpeg', quality: 70 });
    }
    await browser.close();
    return;
  }
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.ceil(+secs * fps);
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => render(t), f / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
