// Verificações da E1 dentro do jogo real (headless): hit-stop congela unidades e não a UI,
// slow-mo volta ao normal, restart durante slow-mo, fim de partida não deixa a próxima lenta,
// stress test não derruba a base e CLEAR restaura. Uso: node test/shots/e1_checks.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4178', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
// HEADED com GPU: no headless/SwiftShader o frame passa de 150 ms e as janelas de tempo não valem.
const browser = await chromium.launch({ headless: false, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--ignore-gpu-blocklist', '--window-size=1300,760'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);

await page.goto('http://localhost:4178/?autostart=1&speed=1');
await page.waitForTimeout(1500);
await ev(() => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; game.units.spawn('capitao', 'player', 1, { count: 1 }); game.units.spawn('capitao', 'bot', 1, { count: 1 }); });
await page.waitForTimeout(800);

// 1. hit-stop: unidades param, câmera/UI seguem, solta sozinho
const a = await ev(() => { game.time.hitStop(0.4, { force: true }); return { z: game.units.units[0].pos.z, mt: game.matchTime, shake: (game.camera.addShake(0.5), game.camera.shake) }; });
await page.waitForTimeout(200);
const b = await ev(() => ({ z: game.units.units[0].pos.z, mt: game.matchTime, gameDt: game.time.gameDt, inHitStop: game.time.inHitStop, shake: game.camera.shake, cardsClickable: getComputedStyle(document.getElementById('hand')).pointerEvents }));
check('hit-stop congela unidade e cronômetro', Math.abs(a.z - b.z) < 1e-6 && Math.abs(a.mt - b.mt) < 1e-6 && b.gameDt === 0 && b.inHitStop, JSON.stringify(b));
check('hit-stop não congela câmera (shake decai) nem cartas', b.shake < a.shake && b.cardsClickable === 'auto');
await page.waitForTimeout(400);
const c = await ev(() => ({ inHitStop: game.time.inHitStop, gameDt: game.time.gameDt, scale: game.time.scale }));
check('hit-stop solta sozinho (gameDt > 0, scale 1)', !c.inHitStop && c.gameDt > 0 && c.scale === 1, JSON.stringify(c));

// 2. slow-motion volta ao normal; vários não travam
await ev(() => { game.time.slowMotion(0.35, 0.25, 0.15); game.time.slowMotion(0.5, 0.1, 0.1); });
await page.waitForTimeout(100);
const s1 = await ev(() => game.time.scale);
await page.waitForTimeout(700);
const s2 = await ev(() => ({ scale: game.time.scale, n: game.time.slows.length }));
check('slow-mo aplica 0.35 e volta a 1', Math.abs(s1 - 0.35) < 1e-6 && s2.scale === 1 && s2.n === 0, JSON.stringify({ s1, s2 }));

// 3. restart durante slow-mo restaura
await ev(() => { game.time.slowMotion(0.2, 5, 1); game.time.hitStop(1, { force: true }); });
await page.waitForTimeout(100);
await ev(() => { game.screens.hideAll(); game.startMatch(game.screens.playerDeck); });
await page.waitForTimeout(100);
const r = await ev(() => ({ scale: game.time.scale, n: game.time.slows.length, hs: game.time.hitStopTimer, playing: game.playing, mt: game.matchTime }));
check('restart durante slow-mo/hit-stop zera tudo', r.scale === 1 && r.n === 0 && r.hs === 0 && r.playing, JSON.stringify(r));

// 4. fim de partida (slow-mo de destruição) não deixa a próxima lenta; cronômetro anda 1:1
await ev(() => game.finish(true));
await page.waitForTimeout(150);
const e1 = await ev(() => game.time.scale);
await page.waitForFunction(() => !document.getElementById('end-screen').classList.contains('hidden'), null, { timeout: 15000 });
await page.click('#btn-restart'); await page.waitForTimeout(300);
const m0 = await ev(() => ({ mt: game.matchTime, scale: game.time.scale, now: performance.now() }));
await page.waitForTimeout(1000);
const m1 = await ev(() => ({ mt: game.matchTime, scale: game.time.scale, now: performance.now(), cap: game.player.capital }));
const ratio = (m1.mt - m0.mt) / ((m1.now - m0.now) / 1000);
check('finish aplica slow-mo (scale < 1)', e1 < 1, `scale=${e1}`);
check('após restart: scale 1 e cronômetro anda ~1:1', m0.scale === 1 && m1.scale === 1 && ratio > 0.85 && ratio < 1.15, `ratio=${ratio.toFixed(3)} capital=${m1.cap}`);

// 5. gameSpeed centralizado
await ev(() => game.time.setGameSpeed(2));
const g0 = await ev(() => game.matchTime); await page.waitForTimeout(1000); const g1 = await ev(() => game.matchTime);
check('gameSpeed 2 → cronômetro ~2x', (g1 - g0) > 1.7 && (g1 - g0) < 2.3, `delta=${(g1 - g0).toFixed(2)}`);
await ev(() => game.time.setGameSpeed(1));

// 6. stress test: 50 unidades reais, base intacta, CLEAR restaura
const st0 = await ev(() => { game.stress.run(50); return { n: game.stress.count, total: game.units.count, php: game.bases.player.hp, bhp: game.bases.bot.hp }; });
await page.waitForTimeout(6000);
const st1 = await ev(() => ({ n: game.stress.count, php: game.bases.player.hp, bhp: game.bases.bot.hp, alive: game.units.units.filter(u => u.alive).length, cap: game.player.capital, played: game.player.cardsPlayed }));
check('stress 50 gera 50 unidades reais', st0.n === 50 && st0.total >= 50, JSON.stringify(st0));
check('stress não derruba bases (HP inalterado) e não conta como carta jogada', st1.php === st0.php && st1.bhp === st0.bhp && st1.played === 0, JSON.stringify(st1));
const cl = await ev(() => { const removed = game.stress.clear(); return { removed, left: game.stress.count, total: game.units.count, broken: game.units.units.filter(u => u.target && !u.target.isBase && !u.target.alive).length }; });
await page.waitForTimeout(500);
const cl2 = await ev(() => ({ total: game.units.count, stress: game.stress.count, broken: game.units.units.filter(u => u.target && !u.target.isBase && !u.target.alive).length, stale: game.units.units.filter(u => u.target && u.target.debugSpawn).length }));
check('CLEAR remove só unidades de stress e não deixa alvo quebrado', cl.left === 0 && cl2.stress === 0 && cl.broken === 0 && cl2.broken === 0 && cl2.stale === 0, JSON.stringify({ cl, cl2 }));

// 7. perf snapshot completo
const snap = await ev(() => game.perf.snapshot());
check('perf snapshot tem todos os campos', ['fps', 'fpsAvg', 'fpsMinRecent', 'frameMs', 'drawCalls', 'triangles', 'units', 'projectiles', 'particles', 'floatingTexts', 'resolution'].every(k => k in snap), JSON.stringify(snap));

// 8. COPIAR CONFIG inclui as chaves novas
const cfg = await ev(() => JSON.parse(JSON.stringify(Config)));
check('Config JSON inclui time/perf/hitStopDuration', cfg.time && cfg.perf && cfg.combat.hitStopDuration === 0.045 && cfg.game.gameSpeed === 1);

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
