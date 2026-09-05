// E6 — personalidade por personagem (headless): Profiles é só dados, todo tipo tem perfil, militantes da
// mesma horda com tempos distintos, gesto de idle dispara e termina, nenhum arquivo procedural novo > 350 LOC.
// Uso: node test/e6.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
const server = spawn('npx', ['vite', 'preview', '--port', '4182', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

// LOC (fonte)
const dir = 'src/visual/procedural';
const loc = Object.fromEntries(readdirSync(dir).map(f => [f, readFileSync(`${dir}/${f}`, 'utf8').split('\n').length]));
const limit = { 'ProceduralRig.js': 450 };
const tooBig = Object.entries(loc).filter(([f, n]) => n > (limit[f] || 350));
check('nenhum arquivo procedural acima do limite (350; Rig 450)', tooBig.length === 0, JSON.stringify(loc));
// Profiles é só dados
const src = readFileSync(`${dir}/Profiles.js`, 'utf8');
check('Profiles.js não importa nada nem tem lógica de animação', !/^import /m.test(src) && !/rotation\./.test(src));

await page.goto('http://localhost:4182/?autostart=1&speed=1');
await page.waitForTimeout(1200);
await ev(() => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false; Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0; });

const r = await ev(() => {
  game.units.clear();
  const T = ['tiozap', 'assessor', 'influencer', 'agroboy', 'coach', 'pastor', 'fiel'];   // procedurais com 7 gestos distintos (barbudo/capitão/careca/dino são GLB)
  const out = {};
  T.forEach((t, i) => { const [u] = game.units.spawn(t, 'player', i % 3, { count: 1, z: 12 - i }); const p = u.visual.animator.profile; out[t] = { gesture: p.gesture, tempo: p.tempo, rigidity: p.rigidity, ok: Object.values(p).every(v => v === null || typeof v === 'number' || typeof v === 'string') }; });
  const horde = game.units.spawn('fiel', 'bot', 1, { count: 5 });   // horda procedural com jitter (militante e GLB)
  const tempos = horde.map(u => +u.visual.animator.profile.tempo.toFixed(3));
  return { out, tempos, distinct: new Set(tempos).size, gestures: new Set(T.map(t => out[t].gesture)).size };
});
check('7 personagens com perfil (só dados) e gestos distintos', Object.values(r.out).every(o => o.ok && o.gesture) && r.gestures === 7, JSON.stringify(r.out));
check('fieis da mesma horda com tempos diferentes (jitter)', r.distinct >= 4, JSON.stringify(r.tempos));

// gesto dispara no idle e termina, sem quebrar a pose (reset por frame)
const g = await ev(() => new Promise(res => {
  game.units.clear();
  const [u] = game.units.spawn('tiozap', 'player', 1, { count: 1, z: 6 });
  u.update = () => {};                 // congela a lógica; o visual continua
  u.visual.playIdle();
  const an = u.visual.animator; an.nextGesture = 0.1;
  let seen = null; let maxArm = 0;
  const id = setInterval(() => { if (an.gestureName) { seen = an.gestureName; maxArm = Math.max(maxArm, Math.abs(u.visual.rig.parts.armR.rotation.x)); } if (an.gesturesPlayed >= 1 && an.gestureT < 0 && seen) { clearInterval(id); const arm = Math.abs(u.visual.rig.parts.armR.rotation.x); setTimeout(() => res({ seen, maxArm: +maxArm.toFixed(2), armAfter: +arm.toFixed(2), played: an.gesturesPlayed, anim: an.anim }), 200); } }, 30);
  setTimeout(() => { clearInterval(id); res({ timeout: true, seen, played: an.gesturesPlayed }); }, 20000);
}));
check('gesto "phone" do Tio do Zap dispara no idle e volta à pose', !g.timeout && g.seen === 'phone' && g.maxArm > 0.8 && g.armAfter < 0.3 && g.anim === 'idle', JSON.stringify(g));

// walk/attack/idle continuam funcionando com perfil (sem NaN)
const nan = await ev(() => { game.units.clear(); const T = ['barbudo', 'capitao', 'careca', 'dino', 'tiozap', 'assessor', 'influencer', 'militante']; let bad = 0; for (const t of T) { const [u] = game.units.spawn(t, 'bot', 0, { count: 1 }); if (!u.visual.animator) continue; for (const a of ['idle', 'walk', 'attack', 'victory', 'stun', 'recesso']) { u.visual.animator.setAnim(a, { windup: 0.25, duration: 0.6, factor: 1 }); for (let i = 0; i < 10; i++) u.visual.update(0.05); const m = u.visual.rig.model; if ([m.position.x, m.position.y, m.rotation.x, u.visual.rig.parts.armR.rotation.x].some(v => Number.isNaN(v))) bad++; } } return bad; });
check('nenhum NaN em idle/walk/attack/victory/stun/recesso com perfis', nan === 0, `bad=${nan}`);

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
