// E9 — MOTOCIATA + RECESSO (headless): motociata emite powerStart e powerImpact por atropelo (dano heavy, 1 por
// moto por inimigo), sem hit-stop; recesso congela todo mundo, emite powerStart/powerEnd, poses de Gestures, e as
// unidades RETOMAM o ataque no mesmo alvo sem perdê-lo; partículas das motos ficam baixas. Uso: node test/e9.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4186', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4186/?autostart=1&speed=1');
await page.waitForTimeout(1200);
await ev(() => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false; Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0; window.__ev = []; for (const n of ['powerStart', 'powerImpact', 'powerEnd']) bus.on(n, (e) => window.__ev.push({ n, power: e.power, hits: e.hits, base: !!e.base, t: game.matchTime, hs: game.time.hitStopTimer })); });

// ---- 1. MOTOCIATA ----
const m = await ev(() => new Promise(res => {
  game.units.clear(); window.__ev.length = 0;
  const mk = (t, z) => { const [u] = game.units.spawn(t, 'bot', 1, { count: 1, z }); u.maxHp = u.hp = 1e9; u.update = () => {}; return u; };
  const us = [mk('militante', 4), mk('capitao', 0), mk('assessor', -4)];
  const proto = Object.getPrototypeOf(us[0]);
  const od = proto.takeDamage; const dmg = [];
  proto.takeDamage = function (a, s, o) { dmg.push({ id: this.id, strength: o && o.strength, hs: game.time.hitStopTimer }); return od.call(this, a, s, o); };
  let maxSmokeY = 0, maxHs = 0;
  game.camera.shake = 0;
  game.powers.motociata('player', 1);
  const id = setInterval(() => {
    maxHs = Math.max(maxHs, game.time.hitStopTimer);
    const pm = game.effects.particles; for (let i = 0; i < pm.n; i++) if (pm.kind[i] === 2) maxSmokeY = Math.max(maxSmokeY, pm.py[i]);
    if (game.powers.motos.length === 0 && game.powers.pending.length === 0 && window.__ev.some(e => e.n === 'powerStart')) { clearInterval(id); res({ ev: window.__ev.slice(), dmg, maxSmokeY: +maxSmokeY.toFixed(2), maxHs, shake: game.camera.shake, unitH: us[1].visual.height }); }
  }, 40);
  setTimeout(() => { clearInterval(id); res({ timeout: true, ev: window.__ev.slice(), dmg }); }, 30000);
}));
const mHits = m.ev.filter(e => e.n === 'powerImpact' && e.power === 'motociata' && !e.base);
check('motociata: powerStart + 3 motos × 3 inimigos = 9 atropelos, dano heavy 1 por moto/inimigo', !m.timeout && m.ev.some(e => e.n === 'powerStart' && e.power === 'motociata') && mHits.length === 9 && m.dmg.length === 9 && m.dmg.every(d => d.strength === 'heavy'), JSON.stringify({ hits: mHits.length, dmg: m.dmg.length }));
check('motociata: chegada na base emite powerImpact base e nenhuma moto sobra', m.ev.filter(e => e.base).length === 3);
// atropelo = dano heavy → HitEffects aplica o hit-stop padrão (orçado por segundo); o que não pode é ACUMULAR
check('motociata: hit-stop nunca acima do padrão (sem acúmulo), fumaça abaixo das barras', m.maxHs <= 0.045 + 1e-6 && m.maxSmokeY < m.unitH + 0.35, JSON.stringify({ maxHs: m.maxHs, smokeY: m.maxSmokeY, barY: +(m.unitH + 0.35).toFixed(2) }));

// ---- 2. RECESSO: congela, poses, retoma o MESMO alvo ----
const r = await ev(() => new Promise(res => {
  game.units.clear(); window.__ev.length = 0; Config.combat.knockbackStrength = 0;
  const [a] = game.units.spawn('assessor', 'player', 1, { count: 1, z: 1.2 }); a.maxHp = a.hp = 1e9;   // procedural (tem currentAnim) e sem especial
  const [d] = game.units.spawn('careca', 'bot', 1, { count: 1, z: -0.2 }); d.maxHp = d.hp = 1e9; d.stunned = 1e9;
  let phase = 0, targetBefore = null, animDuring = null, frozenSeen = false, hpDuring = null, hpAfterStart = null, resumed = null, endEv = null, zDuring = null, zAfterDuring = null;
  const id = setInterval(() => {
    if (phase === 0 && a.state === 'ATTACKING') { phase = 1; targetBefore = a.target; game.powers.recesso('bot'); animDuring = a.visual.currentAnim; hpDuring = d.hp; zDuring = a.pos.z; }
    else if (phase === 1) { if (a.frozen > 0) { frozenSeen = true; zAfterDuring = a.pos.z; } if (a.frozen <= 0 && a.alive) { phase = 2; hpAfterStart = d.hp; endEv = window.__ev.find(e => e.n === 'powerEnd'); } }   // z medido ENQUANTO congelado
    else if (phase === 2 && a.state === 'ATTACKING' && d.hp < hpAfterStart) { clearInterval(id); resumed = { target: a.target === targetBefore, state: a.state }; Config.combat.knockbackStrength = 1; res({ animDuring, frozenSeen, noDamageDuring: hpAfterStart === hpDuring, endEv: !!endEv, resumed, variant: a.visual.animator.recessoVariant, moved: Math.abs(zAfterDuring - zDuring) < 1e-6, start: window.__ev.some(e => e.n === 'powerStart' && e.power === 'recesso') }); }
  }, 30);
  setTimeout(() => { clearInterval(id); Config.combat.knockbackStrength = 1; res({ timeout: true, phase, state: a.state }); }, 40000);
}));
check('recesso: congela (sem dano, sem andar), pose de recesso, powerStart e powerEnd (sinal)', !r.timeout && r.frozenSeen && r.noDamageDuring && r.moved && r.animDuring === 'recesso' && r.start && r.endEv, JSON.stringify(r));
check('recesso: ao voltar retoma o ataque no MESMO alvo', !r.timeout && r.resumed && r.resumed.target && r.resumed.state === 'ATTACKING', JSON.stringify(r.resumed));

// ---- 3. poses de recesso cobrem as 4 variantes (3 clássicas + gesto do perfil) ----
const v = await ev(() => { game.units.clear(); const seen = new Set(); for (let i = 0; i < 40; i++) { const [u] = game.units.spawn('tiozap', 'bot', i % 3, { count: 1 }); u.visual.playRecesso(true); u.visual.update(0.05); seen.add(u.visual.animator.recessoVariant); } game.units.clear(); return [...seen].sort(); });
check('recesso: variantes 0..3 (inclui gesto do perfil)', v.length === 4, JSON.stringify(v));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
