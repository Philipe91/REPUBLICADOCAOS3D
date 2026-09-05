// GLB (headless): public/models/militante.glb carrega, militantes viram GLBCharacterVisual, cor do time nos
// materiais TEAM…, flash de dano via emissive, clipes idle/walk/attack/hit/death/victory/stun/special, altura
// compatível com a barra de HP, unidade anda/ataca/morre sem erro; os outros tipos continuam procedurais.
// Uso: node test/glb.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
if (!existsSync('public/models/militante.glb')) { console.log('SKIP: public/models/militante.glb não existe'); process.exit(0); }
const server = spawn('npx', ['vite', 'preview', '--port', '4193', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4193/?autostart=1&speed=1');
await page.waitForTimeout(3500);   // preload dos GLBs
const r = await ev(() => {
  Config.debug.autoPlayer = false; Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.game.capitalRegen = 100; game.botCtrl.capital = 0;
  game.units.clear();
  const [p] = game.units.spawn('militante', 'player', 1, { count: 1, z: 6 });
  const [b] = game.units.spawn('militante', 'bot', 1, { count: 1, z: -6 });
  const [c] = game.units.spawn('capitao', 'player', 0, { count: 1, z: 6 });
  const v = p.visual;
  const team = v.materials.filter(m => /^TEAM/i.test(m.name)).map(m => m.color.getHex());
  const teamB = b.visual.materials.filter(m => /^TEAM/i.test(m.name)).map(m => m.color.getHex());
  const shared = v.materials.some(m => b.visual.materials.includes(m));
  v.flash(0xff0000, 0.5); v.update(0.01);
  const emis = v.materials[0].emissive.getHex();
  return { isGlb: !!v.mixer, capProc: !c.visual.mixer, clips: Object.keys(v.clips).sort(), team: [...new Set(team)], teamB: [...new Set(teamB)], shared, emis: emis.toString(16), height: +v.height.toFixed(2), procHeight: +(c.visual.height).toFixed(2) };
});
check('militante usa GLB; capitão continua procedural', r.isGlb && r.capProc);
check('clipes esperados presentes', ['attack', 'death', 'hit', 'idle', 'special', 'stun', 'victory', 'walk'].every(k => r.clips.includes(k)), JSON.stringify(r.clips));
check('materiais TEAM tingidos com a cor do time e clonados por instância', r.team.length === 1 && r.team[0] === 0x2bb3c0 && r.teamB[0] === 0xe8772e && !r.shared, JSON.stringify({ team: r.team.map(x => x.toString(16)), teamB: r.teamB.map(x => x.toString(16)), shared: r.shared }));
check('flash de dano via emissive', r.emis === 'ff0000', r.emis);
// militante procedural ≈ 2.9 × 0.75/1.05 ≈ 2.1; o GLB deve ficar a ±25% disso (barra de HP no lugar certo)
const ref = r.procHeight * (0.75 / 1.05);
check('altura do militante GLB compatível com o procedural (±25%)', Math.abs(r.height - ref) / ref <= 0.25, JSON.stringify({ glb: r.height, refProc: +ref.toFixed(2) }));

// anda, ataca e morre sem erro (6 s de jogo)
const life = await ev(() => new Promise(res => {
  game.units.clear();
  const [p] = game.units.spawn('militante', 'player', 1, { count: 1, z: 3 });
  const [d] = game.units.spawn('careca', 'bot', 1, { count: 1, z: -0.5 }); d.stunned = 1e9; d.maxHp = d.hp = 1e9;
  const z0 = p.pos.z; const seen = new Set(); const t0 = game.matchTime;
  const id = setInterval(() => { if (p.visual.current) seen.add(p.visual.current.getClip().name); if (game.matchTime - t0 > 4 && p.alive) p.takeDamage(9999, d); if (!p.alive && p.visual.current && p.visual.current.getClip().name === 'death') { clearInterval(id); res({ moved: z0 - p.pos.z > 0.5, seen: [...seen].sort(), hp: d.hp < 1e9 }); } if (game.matchTime - t0 > 12) { clearInterval(id); res({ timeout: true, seen: [...seen], alive: p.alive, hp: p.hp, state: p.state, cur: p.visual.current && p.visual.current.getClip().name, z: +p.pos.z.toFixed(2) }); } }, 30);
}));
check('GLB anda, ataca (careca levou dano) e toca death ao morrer', !life.timeout && life.moved && life.seen.includes('walk') && life.seen.includes('attack') && life.hp, JSON.stringify(life));   // o resolve só acontece com o clipe death ativo

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
