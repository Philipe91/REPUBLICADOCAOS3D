// E8 — CANETADA (headless): powerStart → aviso visível ≥ 0,4 s → powerImpact em warn+fall (±1 frame) com dano
// no MESMO frame, 1 dano por inimigo no raio, hit-stop ≤ 80 ms, sequência total ≤ 1,5 s, marcador/sombra liberados.
// Uso: node test/e8.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4184', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4184/?autostart=1&speed=1');
await page.waitForTimeout(1200);
const r = await ev(() => new Promise(res => {
  Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false;
  Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0;
  game.units.clear();
  const frame = () => game.renderer.info.render.frame;
  const log = { start: null, impact: null, damages: [], markerFrames: 0, markerT0: null, markerT1: null, shadowSeen: false, hsMax: 0, penGone: null };
  // 3 inimigos no raio, 1 fora; todos parados e com HP alto
  const mk = (t, z) => { const [u] = game.units.spawn(t, 'bot', 1, { count: 1, z }); u.maxHp = u.hp = 1e9; u.update = () => {}; return u; };
  const inside = [mk('militante', -2.5), mk('capitao', -1.5), mk('assessor', -3.5)];
  const outside = mk('careca', -9);   // mais LONGE da base do jogador (a caneta mira o inimigo mais perto da base)
  const proto = Object.getPrototypeOf(inside[0]);
  const od = proto.takeDamage;
  proto.takeDamage = function (a, s, o) { log.damages.push({ id: this.id, f: frame(), t: game.matchTime, amount: a, strength: o && o.strength }); return od.call(this, a, s, o); };
  bus.on('powerStart', (e) => { log.start = { f: frame(), t: game.matchTime, warn: e.warnTime, fall: e.fallTime }; });
  bus.on('powerImpact', (e) => { log.impact = { f: frame(), t: game.matchTime, hits: e.hits, hs: game.time.hitStopTimer }; });
  const pen = game.powers.canetada('player', 1);
  const t0 = game.matchTime;
  const id = setInterval(() => {
    const m = game.powerFx.markers.get(pen);
    if (m && m.marker.visible) { log.markerFrames++; if (log.markerT0 === null) log.markerT0 = game.matchTime; log.markerT1 = game.matchTime; }
    if (m && m.shadow.visible) log.shadowSeen = true;
    log.hsMax = Math.max(log.hsMax, game.time.hitStopTimer);
    if (!pen.active && log.penGone === null) log.penGone = game.matchTime;
    if (log.penGone !== null && game.matchTime - t0 > 2.0) { clearInterval(id); res({ log, t0, penZ: pen.z, inside: inside.map(u => u.id), outside: outside.id, marker: m ? m.marker.visible : 'released', pens: game.powers.pens.length }); }
  }, 20);
  setTimeout(() => { clearInterval(id); res({ timeout: true, log }); }, 20000);
}));
const L = r.log;
const dtF = 0.05;
check('powerStart e powerImpact emitidos', !r.timeout && L.start && L.impact, JSON.stringify({ start: L.start, impact: L.impact }));
if (L.start && L.impact) {
  const impactAt = L.impact.t - L.start.t;
  check('impacto em warn+fall (±1 frame)', Math.abs(impactAt - (L.start.warn + L.start.fall)) <= dtF + 1e-6, `impacto ${impactAt.toFixed(2)} s vs ${(L.start.warn + L.start.fall).toFixed(2)} s`);
  const inRadius = L.damages.filter(d => r.inside.includes(d.id));
  check('dano aplicado no MESMO frame do powerImpact, 1 por inimigo no raio, nenhum fora', inRadius.length === 3 && inRadius.every(d => d.f === L.impact.f) && !L.damages.some(d => d.id === r.outside) && L.impact.hits === 3, JSON.stringify({ n: inRadius.length, frames: inRadius.map(d => d.f), impactF: L.impact.f, strength: inRadius[0] && inRadius[0].strength }));
  check('aviso no chão visível ≥ 0,4 s antes do impacto', L.markerT0 !== null && (L.markerT1 - L.markerT0) >= 0.4 - dtF && L.markerT0 <= L.start.t + 3 * dtF + 1e-6, JSON.stringify({ t0: L.markerT0, t1: L.markerT1, frames: L.markerFrames }));
  check('sombra apareceu durante a queda', L.shadowSeen);
  check('hit-stop do impacto ≤ 80 ms', L.hsMax > 0 && L.hsMax <= 0.08 + 1e-6, `${(L.hsMax * 1000).toFixed(0)} ms`);
  check('sequência completa ≤ 1,5 s (caneta some) e marcador liberado', L.penGone !== null && (L.penGone - L.start.t) <= 1.5 + dtF && r.marker === 'released' && r.pens === 0, JSON.stringify({ total: L.penGone && +(L.penGone - L.start.t).toFixed(2), marker: r.marker, pens: r.pens }));
}
console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
