// UX Player vs Bot (E3): seleciona carta → clica lane → unidade nasce na lane certa e em < 100 ms;
// carta sem Capital → recusa visível; cancela por ESC / botão direito / clique fora; teclas 1–4;
// capturas dos 4 estados da carta (normal, hover, selecionada, bloqueada) em test/shots/player/.
// Uso: node test/player.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
mkdirSync('test/shots/player', { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000));
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; const fails = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const check = (name, cond, info = '') => { console.log((cond ? '✔ ' : '✘ ') + name, info); if (!cond) fails.push(name); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const lanePoint = (lane) => ev((lane) => { const v = new game.cameraObj.position.constructor(game.arena.laneX(lane), 0, 6).project(game.cameraObj); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, lane);
const handBox = async () => { const b = await page.locator('#hand').boundingBox(); return { x: b.x - 30, y: b.y - 60, width: b.width + 60, height: b.height + 70 }; };

await page.goto('http://localhost:4179/?autostart=1&speed=1');
await page.waitForTimeout(1200);
await ev(() => { Config.bot.botAggressiveness = 0; Config.bot.botDefenseBias = 0; Config.debug.autoPlayer = false; game.player.capital = 10; });
await page.waitForTimeout(200);
// índice da primeira carta de TROPA na mão (a mão é aleatória; poderes não spawnam unidade)
const ti = await ev(() => [0, 1, 2, 3].find(i => game.player.deck.card(i).type === 'troop'));
const troopSel = `#hand .card:nth-child(${ti + 1})`;
console.log('carta de tropa usada:', ti, await ev((i) => game.player.deck.card(i).id, ti));

// ---- estados da carta ----
await page.screenshot({ path: 'test/shots/player/card_normal.png', clip: await handBox() });
await page.hover('#hand .card:nth-child(2)'); await page.waitForTimeout(250);
await page.screenshot({ path: 'test/shots/player/card_hover.png', clip: await handBox() });
await page.mouse.move(640, 200);
await page.click(troopSel); await page.waitForTimeout(250);
check('clique na carta seleciona e mostra hint', (await ev(() => ({ sel: game.player.selected, hint: document.getElementById('lane-hint').classList.contains('show'), cursor: game.renderer.domElement.style.cursor }))).sel === ti);
await page.screenshot({ path: 'test/shots/player/card_selected.png', clip: await handBox() });

// ---- hover na lane: destaque + nome + cursor ----
const p1 = await lanePoint(1);
await page.mouse.move(p1.x, p1.y); await page.waitForTimeout(150);
const hv = await ev(() => ({ hover: game.cardUI.hoverLane, hint: document.getElementById('lane-hint').textContent, cursor: game.renderer.domElement.style.cursor, op: game.arena.laneHighlights[1].material.opacity }));
check('hover na lane central: destaque forte, nome e cursor pointer', hv.hover === 1 && hv.hint.includes('CENTRAL') && hv.cursor === 'pointer' && hv.op > 0.3, JSON.stringify(hv));

// ---- clique na lane: unidade certa, lane certa, latência < 100 ms ----
const before = await ev((i) => ({ n: game.units.count, cap: game.player.capital, card: game.player.deck.card(i).id }), ti);
// latência medida DENTRO da página: timestamp do evento de clique → instante do spawn (independe do frame rate do headless)
await ev(() => { window.__clickT = -1; window.__spawnT = -1; game.renderer.domElement.addEventListener('click', e => { window.__clickT = e.timeStamp; }, true); const orig = game.units.spawn.bind(game.units); game.units.spawn = (...a) => { if (window.__spawnT < 0) window.__spawnT = performance.now(); return orig(...a); }; });
await page.mouse.click(p1.x, p1.y);
await page.waitForTimeout(200);
const latency = await ev(() => (window.__clickT >= 0 && window.__spawnT >= 0) ? window.__spawnT - window.__clickT : -1);
const after = await ev(() => ({ n: game.units.count, cap: game.player.capital, sel: game.player.selected, lanes: game.units.units.filter(u => u.team === 'player').map(u => u.lane), types: [...new Set(game.units.units.filter(u => u.team === 'player').map(u => u.type))], hint: document.getElementById('lane-hint').classList.contains('show'), cursor: game.renderer.domElement.style.cursor }));
check('carta jogada nasce na lane 1, cobra Capital e limpa seleção/hint/cursor', after.n > before.n && after.lanes.every(l => l === 1) && after.cap < before.cap && after.sel === -1 && !after.hint && after.cursor === '', JSON.stringify({ before, after }));
check('latência clique → spawn < 100 ms', latency >= 0 && latency < 100, `${latency.toFixed(1)} ms`);

// ---- carta nova entra rápido ----
const entered = await ev((sel) => document.querySelector(sel).classList.contains('enter'), troopSel);
check('carta nova entra com animação', entered);

// ---- sem Capital: recusa visível ----
await ev(() => { game.player.capital = 0; game.player.regenAcc = 0; game.cardUI.refresh(true); });
await page.waitForTimeout(100);
await page.screenshot({ path: 'test/shots/player/card_disabled.png', clip: await handBox() });
const d0 = await ev(() => game.units.count);
await page.click('#hand .card:nth-child(1)'); await page.waitForTimeout(120);
const deny = await ev(() => ({ sel: game.player.selected, toast: document.getElementById('card-toast').classList.contains('show'), text: document.getElementById('card-toast').textContent, denied: document.querySelector('#hand .card:nth-child(1)').classList.contains('denied'), capDenied: document.getElementById('capital-text').classList.contains('denied'), ready: getComputedStyle(document.querySelector('#hand .card:nth-child(1) .ready')).display, n: game.units.count }));
check('sem Capital: não seleciona, aviso "CAPITAL INSUFICIENTE", carta e Capital piscam, barra visível', deny.sel === -1 && deny.toast && deny.text.includes('INSUFICIENTE') && deny.denied && deny.capDenied && deny.ready === 'block' && deny.n === d0, JSON.stringify(deny));
await page.screenshot({ path: 'test/shots/player/card_denied.png', clip: await handBox() });
await page.waitForTimeout(1200);
check('aviso some sozinho', !(await ev(() => document.getElementById('card-toast').classList.contains('show'))));

// ---- cancelamentos ----
await ev(() => { game.player.capital = 10; game.cardUI.refresh(true); });
await page.click(troopSel); await page.keyboard.press('Escape'); await page.waitForTimeout(50);
const c1 = await ev(() => game.player.selected);
await page.click(troopSel); await page.mouse.click(640, 400, { button: 'right' }); await page.waitForTimeout(50);
const c2 = await ev(() => game.player.selected);
await page.click(troopSel); await page.mouse.click(640, 60); await page.waitForTimeout(50);   // céu: fora das lanes
const c3 = await ev(() => ({ sel: game.player.selected, n: game.units.count }));
await page.click(troopSel); await page.click(troopSel); await page.waitForTimeout(50);
const c4 = await ev(() => game.player.selected);
check('cancela por ESC, botão direito, clique fora e clique na mesma carta', c1 === -1 && c2 === -1 && c3.sel === -1 && c4 === -1, JSON.stringify({ c1, c2, c3, c4 }));
await page.keyboard.press('2'); await page.waitForTimeout(50);
check('tecla 2 seleciona a 2ª carta', (await ev(() => game.player.selected)) === 1);
await page.keyboard.press('Escape');

// ---- HUD não cobre nem captura cliques nas lanes ----
const hudPE = await ev(() => getComputedStyle(document.getElementById('hud')).pointerEvents);
const p2 = await lanePoint(2);
const topEl = await ev(({ x, y }) => document.elementFromPoint(x, y)?.id, p2);
check('HUD não captura cliques na lane frontal', hudPE === 'none' && topEl === 'game-canvas', `${hudPE} / ${topEl}`);

// ---- pulso do Capital ao ganhar ponto ----
await ev(() => { game.player.capital = 3; game.player.regenAcc = 0; });
await ev(() => { game.player.regenAcc = Config.game.capitalRegen; });   // próximo frame ganha 1
await page.waitForTimeout(80);
check('Capital pulsa ao ganhar ponto', await ev(() => document.getElementById('capital-text').classList.contains('tick')));

console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log(fails.length ? `FAILS: ${fails.join(' | ')}` : 'ALL CHECKS OK');
await browser.close(); server.kill(); process.exit(fails.length || errors.length ? 1 : 0);
