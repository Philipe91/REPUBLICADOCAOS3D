import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000)); // npx no Windows leva mais tempo para subir o preview
// executablePath: undefined = Chromium padrão do playwright (portátil Windows/Linux). PW_CHROMIUM força outro binário.
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:4175/');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'test/shots/menu.png' });
await page.click('#btn-deck'); await page.waitForTimeout(300);
await page.screenshot({ path: 'test/shots/deck.png' });
await page.click('#btn-deck-back'); await page.click('#btn-play'); await page.waitForTimeout(1000);
// joga uma carta manualmente: seleciona carta 1 e clica na lane do meio
await page.evaluate(() => { game.player.capital = 10; });
await page.click('#hand .card:nth-child(1)'); await page.waitForTimeout(300);
await page.screenshot({ path: 'test/shots/select.png' });
// ponto de clique = centro da lane do meio (lane 1) projetado pela câmera atual (vale para qualquer câmera)
const pt = await page.evaluate(() => { const v = new game.cameraObj.position.constructor(game.arena.laneX(1), 0, 6).project(game.cameraObj); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(1500);
const st = await page.evaluate(() => ({ played: game.player.cardsPlayed, units: game.units.count, playerLanes: game.units.units.filter(u => u.team === 'player').map(u => u.lane), cap: game.player.capital, sel: game.player.selected }));
if (st.played !== 1) { console.log('FAIL: jogada manual não registrou carta jogada'); process.exitCode = 1; }
console.log('after manual play:', JSON.stringify(st));
await page.screenshot({ path: 'test/shots/played.png' });
await page.evaluate(() => game.finish(true)); await page.waitForFunction(() => !document.getElementById('end-screen').classList.contains('hidden'), null, { timeout: 60000 }); await page.waitForTimeout(500);
await page.screenshot({ path: 'test/shots/victory.png' });
const endVisible = await page.evaluate(() => !document.getElementById('end-screen').classList.contains('hidden'));
console.log('end screen visible:', endVisible);
await page.click('#btn-restart'); await page.waitForTimeout(1000);
const st2 = await page.evaluate(() => ({ playing: game.playing, php: game.bases.player.hp, bhp: game.bases.bot.hp, units: game.units.count }));
console.log('after restart:', JSON.stringify(st2));
await page.evaluate(() => game.finish(false)); await page.waitForFunction(() => !document.getElementById('end-screen').classList.contains('hidden'), null, { timeout: 60000 }); await page.waitForTimeout(500);
await page.screenshot({ path: 'test/shots/defeat.png' });
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close(); server.kill(); process.exit(0);
