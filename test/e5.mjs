// E5 — dano no frame de impacto (headless): attackImpact e unitDamaged no MESMO frame (≥ 50 amostras),
// exatamente 1 dano por ataque, fallback por timeout quando o visual não chama onImpact, alvo que morre
// no windup vira golpe no vazio, DPS efetivo ±10% do teórico, golpe comum sem shake, heavy com shake,
// 5 variações de morte cobertas pela tabela. Uso: node test/e5.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4181', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);
// espera N segundos de TEMPO DE JOGO (o headless roda a ~6 fps com dt limitado a 50 ms)
const waitGame = (sec) => ev((sec) => new Promise(res => { const t0 = game.matchTime; const id = setInterval(() => { if (game.matchTime - t0 >= sec) { clearInterval(id); res(); } }, 20); }), sec);

await page.goto('http://localhost:4181/?autostart=1&speed=1');   // speed 1: no headless cada frame vale 50 ms de jogo; com 4 a cadência quantiza
await page.waitForTimeout(1200);
await ev(() => {
  Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false;
  Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0;
  window.__log = { impacts: [], damages: [], deaths: [] };
});
// instrumentação: embrulha Unit.prototype (_impact / _hit / takeDamage / die) para registrar o frame de cada evento
await ev(() => new Promise(res => {
  const proto = Object.getPrototypeOf(game.units.spawn('fiel', 'player', 1, { count: 1 })[0]);
  game.units.clear();
  const frame = () => game.renderer.info.render.frame;
  const oi = proto._impact;
  proto._impact = function () { const before = this.attackHitDone; oi.call(this); if (!before && this.attackHitDone) { const rec = window.__log.impacts.find(r => r.pending && r.id === this.id); if (rec) rec.pending = false; else window.__log.impacts.push({ id: this.id, f: frame(), ranged: this.isRanged, target: null, pending: false }); } };
  const oh = proto._hit;
  proto._hit = function (target, dmg, strength) { const last = window.__log.impacts[window.__log.impacts.length - 1]; if (last && last.id === this.id && last.target === null) last.target = target ? target.id : null; else window.__log.impacts.push({ id: this.id, f: frame(), ranged: this.isRanged, target: target ? target.id : null, pending: false }); return oh.call(this, target, dmg, strength); };
  const od = proto.takeDamage;
  proto.takeDamage = function (amount, source, opts) { window.__log.damages.push({ id: this.id, src: source ? source.id : null, f: frame(), amount, strength: opts && opts.strength }); return od.call(this, amount, source, opts); };
  const odie = proto.die;
  proto.die = function (killer, strength) { window.__log.deaths.push({ id: this.id, strength, variant: null }); return odie.call(this, killer, strength); };
  res();
}));

// ---- 1. arena de teste: fiel (procedural, sem especial → cadência limpa) x careca "saco de pancada" com HP gigante ----
// boneco de treino: HP infinito, stunado (não revida) e sem knockback global (senão o alvo sai do alcance e o golpe vai no vazio)
const setup = `game.units.clear(); Config.combat.knockbackStrength = 0; const [a] = game.units.spawn('fiel', 'player', 1, { count: 1, z: 1.2 }); const [d] = game.units.spawn('careca', 'bot', 1, { count: 1, z: -0.2 }); d.maxHp = d.hp = 1e9; d.stunned = 1e9; a.maxHp = a.hp = 1e9; window.__a = a; window.__d = d;`;
await ev((s) => eval(s), setup);
await ev(() => { window.__t0 = game.matchTime; window.__d.hp0 = window.__d.hp; });
await waitGame(38);
const r1 = await ev(() => {
  const L = window.__log; const a = window.__a, d = window.__d;
  const melee = L.impacts.filter(i => i.id === a.id && !i.ranged && i.target !== null);
  const dmgFromA = L.damages.filter(x => x.src === a.id);
  const sameFrame = melee.filter(i => dmgFromA.some(x => x.f === i.f)).length;
  const dealt = d.hp0 - d.hp;
  const dt = game.matchTime - window.__t0;
  const dps = dealt / dt;
  // teórico = dano EFETIVO / intervalo QUANTIZADO pelo dt do frame (o timer da Unit sempre foi assim; no headless dt = 50 ms)
  // (dano por golpe observado ÷ intervalo quantizado: isola a CADÊNCIA, que é o que a E5 poderia ter mudado; a fórmula de dano não foi tocada)
  const dtF = game.time.gameDt || 0.05;
  const per = Math.ceil((1 / a.attackSpeed) / dtF - 1e-6) * dtF;
  const perHitObs = dealt / Math.max(1, dmgFromA.length);
  const theo = +(perHitObs / per).toFixed(2);
  window.__theo = theo;
  return { impacts: melee.length, dmg: dmgFromA.length, sameFrame, dealt, dt: +dt.toFixed(2), dps: +dps.toFixed(2), theo, perHit: +(dealt / Math.max(1, dmgFromA.length)).toFixed(1), strengths: [...new Set(dmgFromA.map(x => x.strength))] };
});
check('≥ 50 amostras: attackImpact e unitDamaged no MESMO frame', r1.impacts >= 50 && r1.sameFrame === r1.impacts, JSON.stringify(r1));
check('exatamente 1 dano por ataque', r1.dmg === r1.impacts, `${r1.dmg} danos / ${r1.impacts} impactos`);
check('DPS efetivo dentro de ±10% do teórico', Math.abs(r1.dps - r1.theo) / r1.theo <= 0.10, `dps=${r1.dps} teórico=${r1.theo}`);
check('fiel (10 dano) é light (< mediumHitThreshold)', r1.strengths.length === 1 && r1.strengths[0] === 'light', JSON.stringify(r1.strengths));

// ---- 2. fallback: visual que NÃO chama onImpact → dano por timeout, ainda 1 por ataque ----
await ev((s) => eval(s), setup);
await ev(() => { window.__a.visual.playAttack = function (w, d) { this.animator.setAnim('attack', { windup: w, duration: d }); }; window.__log.impacts.length = 0; window.__log.damages.length = 0; window.__d.hp0 = window.__d.hp; window.__t0 = game.matchTime; });
await waitGame(10);
const r2 = await ev(() => { const L = window.__log; const a = window.__a; const imp = L.impacts.filter(i => i.id === a.id && i.target !== null).length; const dmg = L.damages.filter(x => x.src === a.id).length; const dps = (window.__d.hp0 - window.__d.hp) / (game.matchTime - window.__t0); return { imp, dmg, dps: +dps.toFixed(2), theo: window.__theo }; });
check('fallback por timeout: dano continua, 1 por ataque, DPS ±10%', r2.imp >= 12 && r2.dmg === r2.imp && Math.abs(r2.dps - r2.theo) / r2.theo <= 0.10, JSON.stringify(r2));

// ---- 3. alvo morre no windup → golpe no vazio, sem erro; atacante re-escolhe alvo ----
await ev(() => { Config.combat.knockbackStrength = 1; });
const r3 = await ev(() => new Promise(res => {
  game.units.clear(); window.__log.impacts.length = 0;
  const [a] = game.units.spawn('careca', 'player', 1, { count: 1, z: 1.2 });
  const [v] = game.units.spawn('fiel', 'bot', 1, { count: 1, z: -0.2 });
  const [v2] = game.units.spawn('capitao', 'bot', 1, { count: 1, z: -3 }); v2.maxHp = v2.hp = 1e9;
  const id = setInterval(() => {
    if (a.state === 'ATTACKING' && !a.attackHitDone && a.target === v) { v.takeDamage(9999, null); clearInterval(id);
      setTimeout(() => res({ empty: window.__log.impacts.filter(i => i.id === a.id && i.target === null).length, alive: a.alive, target: a.target ? a.target.type : null, state: a.state }), 2500); }
  }, 10);
  setTimeout(() => { clearInterval(id); res({ timeout: true }); }, 15000);
}));
check('alvo morto no windup → impacto no vazio e atacante segue vivo/retargeta', r3.empty >= 1 && r3.alive && !r3.timeout, JSON.stringify(r3));

// ---- 4. golpe comum não gera shake; heavy gera shake + hit-stop ----
const r4 = await ev(() => { game.units.clear(); const [v] = game.units.spawn('capitao', 'bot', 0, { count: 1 }); game.camera.shake = 0; game.time.reset(); v.takeDamage(8, null); const light = game.camera.shake; const hs0 = game.time.hitStopTimer; v.takeDamage(30, null); const med = game.camera.shake; v.takeDamage(95, null); return { light, med, heavy: game.camera.shake, hitStop: game.time.hitStopTimer > 0 || game.time.inHitStop, hs0 }; });
check('light e medium sem shake; heavy com shake + hit-stop', r4.light === 0 && r4.med === 0 && r4.heavy > 0 && r4.hitStop, JSON.stringify(r4));

// ---- 5. mortes: tabela por força cobre 5 variações; pequenos voam mais ----
const r5 = await ev(() => {
  game.units.clear();
  const seen = new Set(); const byStrength = {};
  for (const s of ['light', 'medium', 'heavy', 'special']) {
    byStrength[s] = new Set();
    for (let i = 0; i < 40; i++) { const [u] = game.units.spawn('fiel', 'bot', i % 3, { count: 1 }); u.visual.playDeath(s); const v = u.visual.animator.deathVariant; seen.add(v); byStrength[s].add(v); u.alive = false; }
    game.units.clear();
  }
  // knockback de morte: militante (small) x capitão
  const [k] = game.units.spawn('capitao', 'player', 1, { count: 1, z: 0.5 });
  const [m] = game.units.spawn('fiel', 'bot', 1, { count: 1, z: -0.5 });
  const [c] = game.units.spawn('careca', 'bot', 1, { count: 1, z: -0.5 });
  m.takeDamage(9999, k); c.takeDamage(9999, k);
  return { variants: [...seen].sort(), light: [...byStrength.light].sort(), heavy: [...byStrength.heavy].sort(), kbSmall: Math.abs(m.kb.z), kbBig: Math.abs(c.kb.z) };
});
check('5 variações de morte, tabela por força (light ⊂ {0,4}, heavy ⊂ {1,2,3})', r5.variants.length === 5 && r5.light.every(v => [0, 4].includes(v)) && r5.heavy.every(v => [1, 2, 3].includes(v)), JSON.stringify(r5));
check('pequenos voam mais ao morrer', r5.kbSmall > r5.kbBig, `militante=${r5.kbSmall.toFixed(2)} careca=${r5.kbBig.toFixed(2)}`);

// ---- 6. projétil: dano só na chegada, faíscas no disparo ----
const r6 = await ev(() => new Promise(res => {
  game.units.clear(); window.__log.impacts.length = 0; window.__log.damages.length = 0;
  const [z] = game.units.spawn('tiozap', 'player', 2, { count: 1, z: 4 });
  const [d] = game.units.spawn('careca', 'bot', 2, { count: 1, z: -1 }); d.maxHp = d.hp = 1e9;
  const p0 = game.effects.particles.count;
  const id = setInterval(() => { const imp = window.__log.impacts.filter(i => i.id === z.id); if (imp.length >= 1 && game.effects.projectiles.count >= 1) { clearInterval(id); const dmgNow = window.__log.damages.filter(x => x.src === z.id).length; setTimeout(() => res({ imp: imp.length, dmgAtImpact: dmgNow, dmgLater: window.__log.damages.filter(x => x.src === z.id).length, proj: true, particles: game.effects.particles.count - p0 }), 2500); } }, 5);
  setTimeout(() => { clearInterval(id); res({ timeout: true }); }, 15000);
}));
check('ranged: projétil visível no impacto, dano só quando chega', !r6.timeout && r6.imp >= 1 && r6.dmgAtImpact === 0 && r6.dmgLater >= 1, JSON.stringify(r6));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
