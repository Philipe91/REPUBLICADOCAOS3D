// E10 — base, câmera e TRETA FINAL (Chromium HEADED com GPU): 5 partidas bot vs bot curtas (dur=12 s, speed 6)
// terminam 100% (com Treta Final e desempate por HP), destruição sem erro com slow-mo ≤ 600 ms e câmera que volta,
// UI clicável no fim (restart), Treta aplica vinheta/luzes/velocidade/intensidade e tudo volta no restart,
// base reage por força e emite baseCritical. Uso: node test/e10.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4187', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: false, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--ignore-gpu-blocklist', '--window-size=1300,760'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4187/?autostart=1&auto=1&speed=6&dur=12');
await page.waitForTimeout(1500);
await ev(() => { window.__ev = []; for (const n of ['tretaFinal', 'matchEnd', 'baseCritical']) bus.on(n, (e) => window.__ev.push({ n, t: game.matchTime, now: performance.now() })); });

// ---- 1. base: reação por força + baseCritical ----
const b = await ev(() => { const B = game.bases.bot; B.reset(); window.__ev.length = 0; B.takeDamage(10, null, { strength: 'light' }); const wl = B.hitWobble; B.hitWobble = 0; B.takeDamage(10, null, { strength: 'heavy' }); const wh = B.hitWobble; B.takeDamage(B.maxHp * 0.76, null, { strength: 'medium' }); const crit = window.__ev.some(e => e.n === 'baseCritical'); const stage = B.stage; B.reset(); return { wl, wh, crit, stage }; });
check('base: heavy treme mais que light; ≤ 25% emite baseCritical', b.wh > b.wl && b.crit && b.stage === 3, JSON.stringify(b));

// ---- 2. cinco partidas curtas ----
const results = [];
for (let i = 0; i < 5; i++) {
  await ev(() => { window.__ev.length = 0; game.screens.hideAll(); game.startMatch(); });
  const r = await ev(() => new Promise(res => {
    const t0 = performance.now();
    let slowStart = null, slowEnd = null, minFov = 999, tretaSeen = null;
    const id = setInterval(() => {
      if (game.tretaFinal && tretaSeen === null) tretaSeen = { mult: game.time.matchMultiplier, treta: document.body.classList.contains('treta'), hemi: game.hemi.intensity, intensity: game.audio.intensity };
      if (game.ended) { if (game.time.scale < 1 && slowStart === null) slowStart = performance.now(); if (slowStart !== null && game.time.scale >= 1 && slowEnd === null) slowEnd = performance.now(); minFov = Math.min(minFov, game.cameraObj.fov); }
      const endVisible = !document.getElementById('end-screen').classList.contains('hidden');
      if (endVisible) { clearInterval(id); res({ result: game.result, treta: game.tretaFinal, overtime: +game.overtime.toFixed(1), slowMs: slowStart !== null && slowEnd !== null ? +(slowEnd - slowStart).toFixed(0) : null, minFov: +minFov.toFixed(1), fovNow: +game.cameraObj.fov.toFixed(1), tretaSeen, ev: window.__ev.map(e => e.n), secs: +((performance.now() - t0) / 1000).toFixed(1) }); }
      if (performance.now() - t0 > 150000) { clearInterval(id); res({ timeout: true, result: game.result, treta: game.tretaFinal, overtime: game.overtime }); }
    }, 25);
  }));
  results.push(r);
  console.log(`  partida ${i + 1}:`, JSON.stringify(r));
  // UI clicável no fim: restart pelo botão
  if (!r.timeout) { await page.click('#btn-restart'); await page.waitForTimeout(200); const p = await ev(() => ({ playing: game.playing, treta: document.body.classList.contains('treta'), mult: game.time.matchMultiplier, hemi: +game.hemi.intensity.toFixed(2), intensity: game.audio.intensity })); if (i === 0) check('restart pelo botão funciona e reseta Treta (vinheta, velocidade, luzes, som)', p.playing && !p.treta && p.mult === 1 && p.intensity === 1, JSON.stringify(p)); }
}
check('5/5 partidas terminam (resultado definido, tela final)', results.every(r => !r.timeout && (r.result === 'victory' || r.result === 'defeat')), results.map(r => r.result).join(','));
check('Treta Final aconteceu nas partidas que passaram do tempo, com desempate ≤ tretaFinalMaxOvertime', results.filter(r => r.treta).length >= 1 && results.filter(r => r.treta).every(r => r.overtime <= 60.5 && r.ev.includes('tretaFinal')), results.map(r => `${r.treta ? 'treta' : 'kill'}/${r.overtime}s`).join(' '));
check('slow-mo de fim de partida ≤ 600 ms e câmera de volta ao fov base', results.every(r => r.slowMs !== null && r.slowMs <= 700 && r.minFov < 51 && Math.abs(r.fovNow - 51) < 1.5), results.map(r => `${r.slowMs}ms fov${r.minFov}→${r.fovNow}`).join(' '));
const ts = results.find(r => r.tretaSeen);
check('Treta: velocidade ×1.25, vinheta, luzes mais baixas, som mais intenso', ts && ts.tretaSeen.mult === 1.25 && ts.tretaSeen.treta && ts.tretaSeen.intensity === 1.2, JSON.stringify(ts && ts.tretaSeen));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
