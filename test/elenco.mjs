// ELENCO 2 (headless): as 7 cartas novas existem e aparecem no deck builder; cada mecânica funciona:
// AGRO BOY puxa e stuna · COACH buffa aliados e fica vulnerável · PASTOR invoca FIÉIS e prega · PNEUS rola pneu
// no chão · MACONHEIRO deixa lento · MÚSICO empurra · MASCOTE atropela; flags small/swarm por dados; sem NaN;
// o Bot joga as cartas novas; partida bot vs bot com deck novo termina. Uso: node test/elenco.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4191', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const waitGame = (sec) => ev((sec) => new Promise(res => { const t0 = game.matchTime; const id = setInterval(() => { if (game.matchTime - t0 >= sec) { clearInterval(id); res(); } }, 20); }), sec);

await page.goto('http://localhost:4191/');
await page.waitForTimeout(1200);
await ev(() => { assetManager.enabled = false; });   // estes testes cobrem o visual PROCEDURAL e a lógica
const deck = await ev(() => { document.getElementById('btn-deck').click(); const n = document.querySelectorAll('#deck-grid .card').length; const ids = [...document.querySelectorAll('#deck-grid .card')].map(e => e.dataset.id); document.getElementById('btn-deck-back').click(); return { n, ids }; });
check('deck builder mostra as 7 cartas novas (19 no total)', deck.n === 19 && ['agroboy', 'coach', 'pastor', 'pneus', 'maconheiro', 'musico', 'mascote'].every(i => deck.ids.includes(i)), JSON.stringify(deck.ids));

await ev(() => { game.screens.hideAll(); game.startMatch(); Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false; Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0; Config.game.gameSpeed = 1; });
await ev(() => { window.mk = (t, team, lane, z, o = {}) => { const [u] = game.units.spawn(t, team, lane, { count: 1, z }); u.maxHp = u.hp = o.hp ?? 1e9; if (o.freeze) u.update = () => {}; return u; }; });

// ---- flags por dados + sem NaN ----
const flags = await ev(() => { game.units.clear(); const T = ['agroboy', 'coach', 'pastor', 'fiel', 'pneus', 'maconheiro', 'musico', 'mascote']; let bad = 0; const out = {}; for (const t of T) { const u = mk(t, 'bot', 0, -5); out[t] = { small: u.isSmall, swarm: u.isSwarm, ranged: u.isRanged, proj: u.projectileKind, band: !!u.visual.rig.parts.teamBand, weapon: !!u.visual.rig.parts.weapon, gesture: u.visual.animator.profile.gesture }; for (const a of ['idle', 'walk', 'attack', 'victory', 'stun', 'recesso']) { u.visual.animator.setAnim(a, { windup: 0.25, duration: 0.6 }); for (let i = 0; i < 6; i++) u.visual.update(0.05); } for (const k of ['laco', 'motivacao', 'invocar', 'nuvem', 'acorde', 'tombamento']) { u.visual.animator.setAnim('special', { kind: k, duration: 1 }); for (let i = 0; i < 6; i++) u.visual.update(0.05); const m = u.visual.rig.model; if ([m.position.y, m.rotation.x, u.visual.rig.parts.armR.rotation.x].some(v => Number.isNaN(v))) bad++; } } game.units.clear(); return { out, bad }; });
check('flags por dados: fiel small/swarm, pneus ranged com pneu; visuais montados; sem NaN', flags.out.fiel.small && flags.out.fiel.swarm && flags.out.pneus.ranged && flags.out.pneus.proj === 'pneu' && !flags.out.agroboy.small && flags.out.agroboy.weapon && flags.bad === 0, JSON.stringify(flags));

// ---- AGRO BOY: laço puxa e stuna ----
const ag = await ev(() => eval(`
  game.units.clear(); Config.combat.knockbackStrength = 1;
  const a = mk('agroboy', 'player', 1, 2); a.specialCooldown = 0; a.update = () => {};
  const e = mk('capitao', 'bot', 1, -3, { freeze: true }); const z0 = e.pos.z; e.stunned = 0;
  const ok = a.behavior.trySpecial(a);
  ({ ok, kbz: +e.kb.z.toFixed(2), stunned: e.stunned > 0, state: a.state, kind: a.specialKind, z0 })`));
check('AGRO BOY: LAÇO puxa (kb para perto), stuna e entra em SPECIAL laco', ag.ok && ag.kbz > 0 && ag.stunned && ag.state === 'SPECIAL' && ag.kind === 'laco', JSON.stringify(ag));

// ---- COACH: buff + vulnerável ----
const co = await ev(() => eval(`
  game.units.clear();
  const c = mk('coach', 'player', 1, 2, { hp: 1000 }); c.specialCooldown = 0;
  const ally = mk('capitao', 'player', 1, 3.5, { hp: 1000 }); const d0 = ally.damage, s0 = ally.moveSpeed;
  const ok = c.behavior.trySpecial(c);
  const d1 = ally.damage, s1 = ally.moveSpeed;
  const hp0 = c.hp; c.takeDamage(100, null); const lost = hp0 - c.hp;
  ({ ok, dmgUp: +(d1 / d0).toFixed(2), spdUp: +(s1 / s0).toFixed(2), lost, state: c.state })`));
check('COACH: MOTIVAÇÃO +25% dano/veloc. nos aliados e sofre dano extra enquanto grita', co.ok && Math.abs(co.dmgUp - 1.25) < 0.01 && Math.abs(co.spdUp - 1.25) < 0.01 && co.lost === 150, JSON.stringify(co));

// ---- PASTOR: invoca fiéis + pregação ----
const pa = await ev(() => eval(`
  game.units.clear();
  const p = mk('pastor', 'player', 2, 4); p.specialCooldown = 0;
  mk('militante', 'bot', 2, -2, { freeze: true });
  const n0 = game.units.count; const ok = p.behavior.trySpecial(p);
  const fieis = game.units.units.filter(u => u.type === 'fiel' && u.team === 'player');
  p.behavior.onUpdate(p, 0.05); const spd = fieis.length ? fieis[0].moveSpeed / Config.units.fiel.moveSpeed : 0;
  ({ ok, added: game.units.count - n0, fieis: fieis.length, owner: fieis.every(f => f.data.pastorId === p.id), spd: +spd.toFixed(2), small: fieis[0] && fieis[0].isSmall })`));
check('PASTOR: invoca FIÉIS (fieisPorInvocacao) e PREGAÇÃO +20% veloc.', pa.ok && pa.added === 3 && pa.fieis === 3 && pa.owner && Math.abs(pa.spd - 1.2) < 0.01 && pa.small, JSON.stringify(pa));

// ---- PNEUS: projétil rasteiro que acerta ----
const pn = await ev(() => new Promise(res => { game.units.clear(); const s = mk('pneus', 'player', 0, 4); const e = mk('careca', 'bot', 0, -1, { freeze: true }); const hp0 = e.hp; let seen = null; const id = setInterval(() => { const pr = game.effects.projectiles.active[0]; if (pr && seen === null) seen = { kind: pr.kind, y: +pr.group.position.y.toFixed(2), ground: pr.ground }; if (e.hp < hp0) { clearInterval(id); res({ seen, dealt: hp0 - e.hp }); } }, 20); setTimeout(() => { clearInterval(id); res({ timeout: true, seen }); }, 20000); }));
check('PNEUS: pneu rola no chão (y ≈ 0.45, kind pneu) e acerta', !pn.timeout && pn.seen && pn.seen.kind === 'pneu' && pn.seen.ground && Math.abs(pn.seen.y - 0.45) < 0.1 && pn.dealt > 0, JSON.stringify(pn));

// ---- MACONHEIRO: lento ----
const ma = await ev(() => eval(`
  game.units.clear();
  const m = mk('maconheiro', 'player', 1, 1); m.specialCooldown = 0;
  const e = mk('capitao', 'bot', 1, -1, { freeze: true }); const s0 = e.moveSpeed, a0 = e.attackSpeed;
  const ok = m.behavior.trySpecial(m);
  ({ ok, spd: +(e.moveSpeed / s0).toFixed(2), atk: +(e.attackSpeed / a0).toFixed(2), state: m.state })`));
check('MACONHEIRO: NUVEM deixa inimigo perto a 50% de velocidade e 75% de ritmo', ma.ok && Math.abs(ma.spd - 0.5) < 0.01 && Math.abs(ma.atk - 0.75) < 0.01, JSON.stringify(ma));

// ---- MÚSICO: acorde ----
const mu = await ev(() => eval(`
  game.units.clear(); Config.combat.knockbackStrength = 1;
  const m = mk('musico', 'player', 1, 1); m.specialCooldown = 0;
  const e = mk('capitao', 'bot', 1, -1, { hp: 1000, freeze: true }); const hp0 = e.hp;
  const ok = m.behavior.trySpecial(m);
  ({ ok, dealt: hp0 - e.hp, kbz: +e.kb.z.toFixed(2) })`));
check('MÚSICO: ACORDE dá acordeDamage (25) e empurra para longe', mu.ok && mu.dealt === 25 && mu.kbz < 0, JSON.stringify(mu));

// ---- MASCOTE: tombamento ----
const ms = await ev(() => new Promise(res => { game.units.clear(); const m = mk('mascote', 'player', 2, 4); m.specialCooldown = 0; const e = mk('careca', 'bot', 2, 0, { hp: 1000, freeze: true }); const e2 = mk('militante', 'bot', 2, -2, { hp: 1000, freeze: true }); const z0 = m.pos.z; const ok = m.behavior.trySpecial(m); const id = setInterval(() => { if (m.state !== 'SPECIAL') { clearInterval(id); res({ ok, moved: +(z0 - m.pos.z).toFixed(2), hit1: 1000 - e.hp, hit2: 1000 - e2.hp, kind: m.specialKind }); } }, 20); setTimeout(() => { clearInterval(id); res({ timeout: true }); }, 20000); }));
check('MASCOTE: TOMBAMENTO avança ~7 e atropela os dois inimigos (90 cada, 1 vez)', !ms.timeout && ms.ok && ms.moved > 4 && ms.hit1 === 90 && ms.hit2 === 90, JSON.stringify(ms));

// ---- Bot joga as cartas novas; partida bot vs bot termina ----
await ev(() => { game.screens.hideAll(); Config.bot.botAggressiveness = 0.6; Config.bot.botDefenseBias = 0.7; Config.bot.botRandomness = 0.3; Config.debug.autoPlayer = true; Config.game.capitalRegen = 1.5; Config.game.gameSpeed = 6; Config.game.matchDuration = 20; const N = ['agroboy', 'coach', 'pastor', 'pneus', 'maconheiro', 'musico', 'mascote', 'militantes']; game.startMatch(N); game.botCtrl.deck.all = N.slice(); game.botCtrl.deck.reset(); });
const match = await ev(() => new Promise(res => { const t0 = performance.now(); const played = new Set(); const off = bus.on('unitSpawned', (e) => played.add(e.type)); const id = setInterval(() => { if (game.result) { clearInterval(id); off(); res({ result: game.result, types: [...played].sort(), secs: +((performance.now() - t0) / 1000).toFixed(0) }); } if (performance.now() - t0 > 400000) { clearInterval(id); res({ timeout: true, types: [...played] }); } }, 200); }));
check('partida bot vs bot só com o elenco novo termina e todos os tipos entram em campo', !match.timeout && ['agroboy', 'coach', 'pastor', 'fiel', 'pneus', 'maconheiro', 'musico', 'mascote'].every(t => match.types.includes(t)), JSON.stringify(match));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
