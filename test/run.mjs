// Teste automático headless: abre o jogo, bot vs bot em velocidade alta,
// verifica erros no console e se a partida termina. Uso: node test/run.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: process.cwd(), stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000)); // npx no Windows leva mais tempo para subir o preview

// executablePath: undefined = Chromium padrão do playwright (portátil Windows/Linux). PW_CHROMIUM força outro binário.
const browser = await chromium.launch({
  headless: true, executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}\n${e.stack}`));

const speed = process.env.SPEED || '6';
await page.goto(`http://localhost:4173/?autostart=1&auto=1&speed=${speed}&debug=1`);
await page.waitForTimeout(1500);
fs.mkdirSync('test/shots', { recursive: true });
await page.screenshot({ path: 'test/shots/01_start.png' });

const t0 = Date.now();
let result = null, snap = 0;
while (Date.now() - t0 < 420000) {
  await page.waitForTimeout(3000);
  const s = await page.evaluate(() => ({
    result: game.result, time: game.matchTime, units: game.units.count, php: game.bases.player.hp, bhp: game.bases.bot.hp,
    fps: game.fps, pc: game.player.capital, bc: game.botCtrl.capital, calls: game.renderer.info.render.calls, particles: game.effects.particles.count,
    treta: game.tretaFinal,
  }));
  console.log(JSON.stringify(s));
  if (snap < 3 && s.units > 6) { await page.screenshot({ path: `test/shots/0${2 + snap}_battle.png` }); snap++; }
  if (s.result) { result = s.result; break; }
}
await page.waitForTimeout(3500);
await page.screenshot({ path: 'test/shots/09_end.png' });
console.log('RESULT:', result);
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
server.kill();
process.exit(result ? 0 : 1);
