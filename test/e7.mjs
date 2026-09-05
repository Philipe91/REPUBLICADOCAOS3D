// E7 — especiais (headless): MODO JURÁSSICO emite specialStart/End em ≤ 1,2 s de jogo, câmera dá zoom curto e
// volta, Dino invulnerável durante a transformação (Config) e vulnerável depois (e com a flag em 0);
// SUSPENSO com alvo no evento e alvo stunado; ENGAJAMENTO emite engagementGain e aumenta o dano.
// Uso: node test/e7.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4183', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4183/?autostart=1&speed=1');
await page.waitForTimeout(1200);
await ev(() => {
  Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false;
  Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0;
  window.__ev = [];
  for (const n of ['specialStart', 'specialEnd', 'engagementGain']) bus.on(n, (e) => window.__ev.push({ n, type: e.type, unit: e.unit && e.unit.type, level: e.level, target: e.target ? e.target.type : null, t: game.matchTime, fov: game.cameraObj.fov, scale: game.time.scale }));
});

// ---- 1. MODO JURÁSSICO: duração, câmera, invulnerabilidade ----
const j = await ev(() => new Promise(res => {
  game.units.clear(); window.__ev.length = 0;
  const [d] = game.units.spawn('dino', 'player', 1, { count: 1, z: 2 });
  d.hp = d.maxHp * 0.4;
  const baseFov = Config.camera.cameraFov;
  d.behavior.onDamaged(d);                       // gatilho real do Jurássico (hp ≤ 50%)
  const hpAtStart = d.hp;
  d.takeDamage(100, null);                       // durante a transformação → deve ser ignorado
  const hpAfterHit = d.hp;
  let minFov = baseFov, frames = 0;
  const id = setInterval(() => {
    minFov = Math.min(minFov, game.cameraObj.fov); frames++;
    const end = window.__ev.find(e => e.n === 'specialEnd' && e.type === 'jurassico');
    if (end) {
      clearInterval(id);
      d.takeDamage(100, null);                   // depois → vale
      const hpAfterEnd = d.hp;
      setTimeout(() => res({ start: window.__ev.find(e => e.n === 'specialStart' && e.type === 'jurassico'), end, hpAtStart, hpAfterHit, hpAfterEnd, minFov, baseFov, fovBack: game.cameraObj.fov, jur: d.data.jurassic, scale: d.visualScale, tail: !!d.visual.rig.parts.tail, slowSeen: window.__ev.some(e => e.scale < 1) }), 1500);
    }
  }, 30);
  setTimeout(() => { clearInterval(id); res({ timeout: true, ev: window.__ev }); }, 20000);
}));
check('Jurássico emite specialStart/End com duração ≤ 1,2 s de jogo', !j.timeout && j.start && j.end && (j.end.t - j.start.t) <= 1.2 + 1e-6, JSON.stringify({ dur: j.end && +(j.end.t - j.start.t).toFixed(2) }));
check('câmera aproxima (fov cai) e volta ao valor base', !j.timeout && j.minFov < j.baseFov - 1 && Math.abs(j.fovBack - j.baseFov) < 0.5, JSON.stringify({ minFov: j.minFov, base: j.baseFov, back: j.fovBack }));
check('Dino invulnerável durante a transformação e vulnerável depois', !j.timeout && j.hpAfterHit === j.hpAtStart && j.hpAfterEnd < j.hpAfterHit, JSON.stringify({ hpAtStart: j.hpAtStart, hpAfterHit: j.hpAfterHit, hpAfterEnd: j.hpAfterEnd }));
check('transformação visual preservada (cauda, escala 1.35×)', j.tail && j.jur && Math.abs(j.scale - Config_dino_scale()) < 1e-6, JSON.stringify({ scale: j.scale }));
function Config_dino_scale() { return 1.3 * 1.35; }

// flag em 0 → toma dano durante a transformação
const j0 = await ev(() => { game.units.clear(); Config.units.dino.jurassicInvulnerable = 0; const [d] = game.units.spawn('dino', 'bot', 0, { count: 1 }); d.hp = d.maxHp * 0.4; d.behavior.onDamaged(d); const h0 = d.hp; d.takeDamage(50, null); Config.units.dino.jurassicInvulnerable = 1; return { h0, h1: d.hp, state: d.state }; });
check('jurassicInvulnerable = 0 → dano entra durante a transformação', j0.h1 < j0.h0 && j0.state === 'SPECIAL', JSON.stringify(j0));

// ---- 2. SUSPENSO: careca vs militante em alcance ----
const s = await ev(() => new Promise(res => {
  game.units.clear(); window.__ev.length = 0;
  const [c] = game.units.spawn('careca', 'player', 1, { count: 1, z: 1.0 }); c.specialCooldown = 0;
  const [m] = game.units.spawn('militante', 'bot', 1, { count: 1, z: -0.4 }); m.maxHp = m.hp = 1e9; m.update = () => {};
  const id = setInterval(() => { const e = window.__ev.find(x => x.n === 'specialStart' && x.type === 'suspenso'); if (e) { clearInterval(id); res({ target: e.target, stunned: m.stunned > 0, state: c.state }); } }, 30);
  setTimeout(() => { clearInterval(id); res({ timeout: true, ev: window.__ev, state: c.state, cd: c.specialCooldown }); }, 20000);
}));
check('SUSPENSO: specialStart com alvo, alvo stunado, careca em SPECIAL', !s.timeout && s.target === 'militante' && s.stunned && s.state === 'SPECIAL', JSON.stringify(s));

// ---- 3. ENGAJAMENTO: morte perto do influencer ----
const g = await ev(() => { game.units.clear(); window.__ev.length = 0; const [i] = game.units.spawn('influencer', 'player', 2, { count: 1, z: 4 }); const [m] = game.units.spawn('militante', 'bot', 2, { count: 1, z: 2 }); m.takeDamage(9999, null); i.behavior.onUpdate(i, 0); const e = window.__ev.find(x => x.n === 'engagementGain'); return { level: e && e.level, mult: i.passiveDamageMult, stacks: i.data.stacks }; });
check('ENGAJAMENTO: engagementGain nível 1 e dano ×1.25', g.level === 1 && Math.abs(g.mult - 1.25) < 1e-6, JSON.stringify(g));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
