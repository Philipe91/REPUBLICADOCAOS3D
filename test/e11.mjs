// E11 — ChaosScore + MemeDirector (headless): caos sobe com eventos e decai com o tempo; chaosSpike só ao cruzar
// limiar para cima, com cooldown; memes do diretor respeitam cooldown, não sobrepõem meme forçado, param com
// memeFrequency 0; chaos só aparece no debug; capitalFull emitido. Uso: node test/e11.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4188', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4188/?autostart=1&speed=1');
await page.waitForTimeout(1200);
await ev(() => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.bot.botRandomness = 0; Config.debug.autoPlayer = false; Config.game.capitalRegen = 100; game.botCtrl.capital = 0; game.player.capital = 0; window.__spikes = []; bus.on('chaosSpike', (e) => window.__spikes.push({ level: e.level, value: +e.value.toFixed(1), t: +game.matchTime.toFixed(2) })); });

// ---- 1. caos sobe e decai; spike por limiar com cooldown ----
const c = await ev(() => new Promise(res => {
  game.units.clear(); game.chaos.reset(); window.__spikes.length = 0;
  const v0 = game.chaos.value;
  for (let i = 0; i < 6; i++) { const [u] = game.units.spawn('militante', 'bot', 1, { count: 1 }); u.takeDamage(9999, null); }   // 6 mortes = 36 + hits
  const v1 = game.chaos.value;
  setTimeout(() => { const v2 = game.chaos.value; const l = game.chaos.level; setTimeout(() => res({ v0, v1: +v1.toFixed(1), v2: +v2.toFixed(1), level: l, v3: +game.chaos.value.toFixed(1), spikes: window.__spikes.slice() }), 4000); }, 600);
}));
check('caos sobe com mortes e decai com o tempo', c.v0 === 0 && c.v1 > 30 && c.v2 < c.v1 && c.v3 < c.v2, JSON.stringify(c));
check('chaosSpike emitido ao cruzar o limiar 1 (uma vez, com cooldown)', c.spikes.length >= 1 && c.spikes[0].level >= 1 && c.spikes.filter(s => s.level === c.spikes[0].level).length === 1, JSON.stringify(c.spikes));

// ---- 2. memes: cooldown respeitado, nunca por cima de meme forçado, log em bot vs bot ----
const m = await ev(() => new Promise(res => {
  game.units.clear(); game.memes.log.length = 0; game.memes.cooldown = 0;
  Config.visual.memeFrequency = 3;   // frequência alta para o teste ser rápido
  const shown = [];
  const orig = game.effects.text.meme.bind(game.effects.text);
  game.effects.text.meme = (text, opts) => { shown.push({ text, t: +game.matchTime.toFixed(2), timerBefore: +game.effects.text.memeTimer.toFixed(2) }); return orig(text, opts); };
  // meme forçado (poder) e, logo depois, chuva de eventos → o diretor precisa ESPERAR o forçado sumir
  game.effects.text.meme('CANETADA!', { color: '#c9b6ff', force: true, duration: 1.3 });
  for (let i = 0; i < 8; i++) { const [u] = game.units.spawn('militante', 'bot', i % 3, { count: 1 }); u.takeDamage(9999, null); }
  const [b] = game.units.spawn('barbudo', 'bot', 1, { count: 1 }); b.takeDamage(9999, null);
  const t0 = game.matchTime;
  const id = setInterval(() => { if (game.matchTime - t0 > 9) { clearInterval(id); game.effects.text.meme = orig; Config.visual.memeFrequency = 1; res({ shown, log: game.memes.log.slice(), cd: Config.memes.cooldown / 3 }); } }, 50);
}));
const director = m.log;
const gaps = director.slice(1).map((x, i) => +(x.t - director[i].t).toFixed(2));
check('diretor mostrou memes contextuais (log) e respeitou o cooldown', director.length >= 1 && gaps.every(g => g >= m.cd - 0.06), JSON.stringify({ n: director.length, gaps, cd: m.cd, textos: director.map(x => x.text) }));
check('nenhum meme do diretor por cima do meme forçado em exibição', m.shown.filter(s => s.text !== 'CANETADA!').every(s => s.timerBefore <= 0), JSON.stringify(m.shown.slice(0, 4)));

// ---- 3. memeFrequency 0 desliga o diretor; capitalFull emitido; chaos só no debug ----
const z = await ev(() => new Promise(res => {
  Config.visual.memeFrequency = 0; game.memes.log.length = 0; game.memes.cooldown = 0;
  for (let i = 0; i < 6; i++) { const [u] = game.units.spawn('militante', 'bot', i % 3, { count: 1 }); u.takeDamage(9999, null); }
  let full = false; const off = bus.on('capitalFull', () => { full = true; });
  game.player.capital = Config.game.maxCapital - 1; game.player.regenAcc = 0; Config.game.capitalRegen = 0.05;
  setTimeout(() => { off(); Config.visual.memeFrequency = 1; Config.game.capitalRegen = 100; const overlay = document.getElementById('perf-overlay'); res({ memes: game.memes.log.length, full, overlayHidden: !overlay || overlay.hidden, debugHidden: document.getElementById('debug-overlay').classList.contains('hidden') }); }, 2500);
}));
check('memeFrequency 0 → diretor mudo; capitalFull emitido ao encher; chaos invisível fora do debug', z.memes === 0 && z.full && z.overlayHidden && z.debugHidden, JSON.stringify(z));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
