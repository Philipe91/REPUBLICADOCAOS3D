// Screenshot rápido com overrides de Config: node test/shot.mjs '{"camera":{"cameraY":40}}' out.png [autoplay seconds]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const overrides = JSON.parse(process.argv[2] || '{}');
const out = process.argv[3] || 'test/shots/shot.png';
const wait = parseFloat(process.argv[4] || '2');
const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'pipe' });
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message + '\n' + e.stack));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text()); });
await page.goto(`http://localhost:4174/?autostart=1&auto=1&speed=${process.env.SPEED || 3}`);
await page.evaluate((o) => { for (const k in o) Object.assign(Config[k], o[k]); }, overrides);
await page.waitForTimeout(wait * 1000);
if (process.env.EVAL) await page.evaluate(process.env.EVAL);
if (process.env.EVAL) await page.waitForTimeout(parseFloat(process.env.EVALWAIT || '1') * 1000);
await page.screenshot({ path: out });
console.log('saved', out, 'errors:', errors.length ? errors.join('\n') : 'none');
await browser.close(); server.kill(); process.exit(0);
