// Bench do STRESS TEST em Chromium COM GPU (headed): node test/stress.mjs [10,20,30,50]
// Para cada N: STRESS TEST N, espera 3 s, amostra 5 s de PerfStats e imprime uma linha.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const sizes = (process.argv[2] || '10,20,30,50').split(',').map(Number);
const server = spawn('npx', ['vite', 'preview', '--port', '4177', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: false, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--ignore-gpu-blocklist', '--window-size=1620,960'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:4177/?autostart=1&speed=1');
await page.waitForTimeout(2500);
const gpu = await page.evaluate(() => { const g = game.renderer.getContext(); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
console.log('GPU:', gpu);
console.log('N\tfpsAvg\tfpsMin\tframeMs\tcalls\ttris\tunits\tstress\tres');
const rows = [];
for (const n of sizes) {
  await page.evaluate((n) => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; game.stress.run(n); }, n);
  await page.waitForTimeout(3000);
  const acc = { fpsAvg: 0, fpsMin: 1e9, frameMs: 0, calls: 0, tris: 0, units: 0, stress: 0, k: 0, res: '' };
  for (let i = 0; i < 10; i++) {
    const s = await page.evaluate(() => game.perf.snapshot());
    acc.fpsAvg += s.fpsAvg; acc.fpsMin = Math.min(acc.fpsMin, s.fpsMinRecent); acc.frameMs += s.frameMs;
    acc.calls = Math.max(acc.calls, s.drawCalls); acc.tris = Math.max(acc.tris, s.triangles);
    acc.units = Math.max(acc.units, s.units); acc.stress = Math.max(acc.stress, s.stressUnits); acc.res = s.resolution; acc.k++;
    await page.waitForTimeout(500);
  }
  const row = { n, fpsAvg: Math.round(acc.fpsAvg / acc.k), fpsMin: Math.round(acc.fpsMin), frameMs: +(acc.frameMs / acc.k).toFixed(2), calls: acc.calls, tris: acc.tris, units: acc.units, stress: acc.stress, res: acc.res };
  rows.push(row);
  console.log([row.n, row.fpsAvg, row.fpsMin, row.frameMs, row.calls, row.tris, row.units, row.stress, row.res].join('\t'));
  const left = await page.evaluate(() => { game.stress.clear(); return game.stress.count; });
  if (left !== 0) errors.push(`CLEAR deixou ${left} unidades de stress`);
  await page.waitForTimeout(800);
}
const after = await page.evaluate(() => ({ units: game.units.count, stress: game.stress.count, playing: game.playing, scale: game.time.scale }));
console.log('after clear:', JSON.stringify(after));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close(); server.kill(); process.exit(0);
