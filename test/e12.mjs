// E12 — balanceamento e validação final (Chromium HEADED com GPU).
//   A) partidas ESPELHADAS (mesmo deck dos dois lados) → distribuição de vitórias e HP final (mede viés estrutural)
//   B) partidas com os decks padrão (player vs bot) → mede viés de deck
//   C) STRESS TEST 50 → FPS médio/mínimo e draw calls
//   D) 1 partida completa Player(auto) vs Bot com duração padrão → termina sem erro, FPS médio
// Uso: node test/e12.mjs [nMirror] [nDefault] ['{"units":{"dino":{"hp":1100}}}'] [quick]   (overrides de Config; quick = só B)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const N_MIRROR = parseInt(process.argv[2] || '6'), N_DEF = parseInt(process.argv[3] || '6');
const OVR = JSON.parse(process.argv[4] || '{}'); const QUICK = process.argv[5] === 'quick';
const server = spawn('npx', ['vite', 'preview', '--port', process.env.PORT || '4189', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: false, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--ignore-gpu-blocklist', '--window-size=1300,760'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:' + (process.env.PORT || '4189') + '/?autostart=1&auto=1&speed=8&dur=25');
await page.waitForTimeout(1500);
await ev((o) => { const deep = (t, s) => { for (const k in s) { if (s[k] && typeof s[k] === 'object' && t[k]) deep(t[k], s[k]); else t[k] = s[k]; } }; deep(Config, o); }, OVR);
if (Object.keys(OVR).length) console.log('overrides:', JSON.stringify(OVR));

// roda uma partida até o fim; devolve resultado + HP das bases + stats
const playMatch = (deckP, deckB) => ev(({ deckP, deckB }) => new Promise(res => {
  game.screens.hideAll();
  // decks: DefaultDecks só é lido no startMatch → troca via player deck param e botCtrl.deck
  game.startMatch(deckP);
  if (deckB) { game.botCtrl.deck.all = deckB.slice(); game.botCtrl.deck.reset(); }
  const t0 = performance.now(); let fpsSum = 0, fpsN = 0, callsMax = 0;
  const id = setInterval(() => {
    fpsSum += game.perf.fpsAvg; fpsN++; callsMax = Math.max(callsMax, game.perf.drawCalls);
    if (!document.getElementById('end-screen').classList.contains('hidden')) { clearInterval(id); res({ result: game.result, php: Math.round(game.bases.player.hp), bhp: Math.round(game.bases.bot.hp), treta: game.tretaFinal, ot: +game.overtime.toFixed(0), fps: Math.round(fpsSum / Math.max(1, fpsN)), calls: callsMax, secs: +((performance.now() - t0) / 1000).toFixed(0) }); }
    if (performance.now() - t0 > 240000) { clearInterval(id); res({ timeout: true }); }
  }, 200);
}), { deckP, deckB });

const P = process.argv[6] ? process.argv[6].split(',') : ['militantes', 'tiozap', 'assessor', 'influencer', 'barbudo', 'capitao', 'careca', 'canetada'];
const B = process.argv[7] ? process.argv[7].split(',') : ['militantes', 'tiozap', 'assessor', 'influencer', 'capitao', 'dino', 'motociata', 'careca'];   // argv[6]/[7]: decks customizados (lista separada por vírgula)
if (process.argv[6] || process.argv[7]) console.log('decks:', P.join(','), 'vs', B.join(','));

// ---- A) espelho ----
const mirror = [];
for (let i = 0; i < (QUICK ? 0 : N_MIRROR); i++) { const r = await playMatch(i % 2 ? B : P, i % 2 ? B : P); mirror.push(r); console.log(`  espelho ${i + 1} (${i % 2 ? 'deck bot' : 'deck player'}):`, JSON.stringify(r)); }
const mw = mirror.filter(r => r.result === 'victory').length;
if (!QUICK) check(`espelho: ${mw}/${N_MIRROR} vitórias do lado do jogador (esperado ~50%)`, mirror.every(r => !r.timeout) && mw >= Math.floor(N_MIRROR * 0.2) && mw <= Math.ceil(N_MIRROR * 0.8), mirror.map(r => `${r.result[0]} ${r.php}x${r.bhp}`).join(' | '));

// ---- B) decks padrão ----
const def = [];
for (let i = 0; i < N_DEF; i++) { const r = await playMatch(P, B); def.push(r); console.log(`  padrão ${i + 1}:`, JSON.stringify(r)); }
const dw = def.filter(r => r.result === 'victory').length;
console.log(`decks padrão: ${dw}/${N_DEF} vitórias do deck do jogador; HP médio final player ${Math.round(def.reduce((a, r) => a + r.php, 0) / N_DEF)} x bot ${Math.round(def.reduce((a, r) => a + r.bhp, 0) / N_DEF)}`);
check('decks padrão: todas terminam', def.every(r => !r.timeout));

if (QUICK) { console.log('errors:', errors.length ? errors.join(', ') : 'none'); await browser.close(); server.kill(); process.exit(0); }

// ---- C) stress 50 ----
await ev(() => { game.screens.hideAll(); game.startMatch(); Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.debug.autoPlayer = false; game.stress.run(50); });
await page.waitForTimeout(3000);
const st = { fps: 0, min: 1e9, calls: 0, tris: 0, units: 0, k: 0 };
for (let i = 0; i < 10; i++) { const s = await ev(() => game.perf.snapshot()); st.fps += s.fpsAvg; st.min = Math.min(st.min, s.fpsMinRecent); st.calls = Math.max(st.calls, s.drawCalls); st.tris = Math.max(st.tris, s.triangles); st.units = Math.max(st.units, s.units); st.k++; await page.waitForTimeout(500); }
const stress = { fpsAvg: Math.round(st.fps / st.k), fpsMin: Math.round(st.min), calls: st.calls, tris: st.tris, units: st.units };
console.log('stress 50:', JSON.stringify(stress));
check('stress 50: FPS médio ≥ 50', stress.fpsAvg >= 50, JSON.stringify(stress));
await ev(() => { game.stress.clear(); Config.bot.botAggressiveness = 0.6; Config.bot.botDefenseBias = 0.7; Config.debug.autoPlayer = true; });

// ---- D) partida completa com duração padrão (180 s de jogo a 4×) ----
await ev(() => { Config.game.matchDuration = 180; Config.game.gameSpeed = 4; });
const full = await playMatch(P, B);
console.log('partida completa:', JSON.stringify(full));
check('partida completa Player(auto) vs Bot termina sem erro', !full.timeout && (full.result === 'victory' || full.result === 'defeat'), JSON.stringify(full));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
