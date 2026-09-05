// E4 — identidade de time + spawn (headless): anel de time instanciado para toda unidade viva,
// braçadeira de time nos bonecos (militante não), fundo da barra tingido, SpawnEffects só escuta o bus,
// unidade anda durante a entrada, efeitos escalam com spawnEffectScale. Uso: node test/e4.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4180', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4180/?autostart=1&speed=1');
await page.waitForTimeout(1200);
await ev(() => { assetManager.enabled = false; });   // estes testes cobrem o visual PROCEDURAL e a lógica
await ev(() => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false; Config.game.capitalRegen = 100; game.botCtrl.capital = 0; });

// 1. spawn de cada tipo nos dois times; anel = unidades vivas; braçadeira; fundo da barra por time
const r = await ev(() => {
  const T = ['barbudo', 'capitao', 'careca', 'dino', 'militante', 'tiozap', 'assessor', 'influencer'];
  const p0 = game.effects.particles.count;
  T.forEach((t, i) => { game.units.spawn(t, 'player', i % 3, { count: 1, z: 12 - Math.floor(i / 3) * 3 }); game.units.spawn(t, 'bot', i % 3, { count: 1, z: -12 + Math.floor(i / 3) * 3 }); });
  const alive = game.units.units.filter(u => u.alive).length;
  const bands = game.units.units.filter(u => u.type !== 'militante' && u.visual.rig).every(u => u.visual.rig.parts.teamBand);
  const noBandMil = game.units.units.filter(u => u.type === 'militante').every(u => !u.visual.rig || !u.visual.rig.parts.teamBand);   // militante pode ser GLB
  const bandColor = (t) => { const u = game.units.units.find(x => x.team === t && x.type === 'assessor'); return u.visual.rig.parts.teamBand.material.color.getHex(); };   // assessor: procedural (capitao virou GLB)
  return { alive, bands, noBandMil, pc: bandColor('player'), bc: bandColor('bot'), texts: game.effects.text.items.length, particles: game.effects.particles.count - p0 };
});
await page.waitForTimeout(600);   // ≥ 1 frame no headless (~170 ms) para o HealthBarManager atualizar
const hb = await ev(() => ({ ring: game.effects.healthBars.ring.count, alive: game.units.units.filter(u => u.alive).length, bgColor: !!game.effects.healthBars.bg.instanceColor }));
check('anel de time para toda unidade viva (1 InstancedMesh)', hb.ring === hb.alive && hb.ring === r.alive, JSON.stringify(hb));
check('braçadeira de time em todos menos militante, com a cor do time', r.bands && r.noBandMil && r.pc === 0x2bb3c0 && r.bc === 0xe8772e, JSON.stringify({ pc: r.pc.toString(16), bc: r.bc.toString(16) }));
check('fundo da barra tingido por time (instanceColor)', hb.bgColor);
check('SpawnEffects reagiu ao evento: nome flutuante e partículas', r.texts >= 8 && r.particles > 0, JSON.stringify({ texts: r.texts, particles: r.particles }));

// 2. unidade já anda durante a entrada (< 0.8 s após o spawn)
const mv = await ev(() => new Promise(res => { game.units.clear(); const [u] = game.units.spawn('capitao', 'player', 1, { count: 1 }); const z0 = u.pos.z; setTimeout(() => res({ z0, z1: u.pos.z, state: u.state }), 2000); }));   // 2 s reais ≈ 0,5 s de jogo no headless (dt limitado a 50 ms)
check('unidade se move durante/logo após a entrada', mv.z1 < mv.z0, JSON.stringify(mv));

// 3. spawnEffectScale 0 → sem partículas de entrada; nome pode ser desligado
const off = await ev(() => { game.units.clear(); game.effects.particles.clear(); game.effects.text.clear(); Config.visual.spawnEffectScale = 0; Config.visual.showUnitNameOnSpawn = false; game.units.spawn('dino', 'bot', 0, { count: 1 }); const out = { particles: game.effects.particles.count, texts: game.effects.text.items.length }; Config.visual.spawnEffectScale = 1; Config.visual.showUnitNameOnSpawn = true; return out; });
check('spawnEffectScale 0 e nome desligado → sem partículas nem texto', off.particles === 0 && off.texts === 0, JSON.stringify(off));

// 4. anel some com opacidade 0 e com a morte
const dead = await ev(() => new Promise(res => { game.units.clear(); const [u] = game.units.spawn('militante', 'player', 1, { count: 1 }); u.takeDamage(9999); setTimeout(() => res({ alive: u.alive, ring: game.effects.healthBars.ring.count }), 500); }));   // precisa de ≥ 1 frame (headless ~170 ms)
check('unidade morta perde o anel', !dead.alive && dead.ring === 0, JSON.stringify(dead));

// 5. Config inclui as chaves novas
const cfg = await ev(() => ({ s: Config.visual.spawnEffectScale, o: Config.visual.teamRingOpacity, n: Config.visual.showUnitNameOnSpawn }));
check('Config.visual tem spawnEffectScale/teamRingOpacity/showUnitNameOnSpawn', cfg.s === 1 && cfg.o > 0 && cfg.n === true);

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
