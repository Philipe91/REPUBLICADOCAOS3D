// Screenshot rápido com overrides de Config: node test/shot.mjs '{"camera":{"cameraDistance":30}}' out.png [autoplay seconds]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const overrides = JSON.parse(process.argv[2] || '{}');
const out = process.argv[3] || 'test/shots/shot.png';
const wait = parseFloat(process.argv[4] || '2');
const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort'], { stdio: 'pipe', shell: true });
await new Promise(r => setTimeout(r, 6000)); // npx no Windows leva mais tempo para subir o preview
// executablePath: undefined = Chromium padrão instalado pelo playwright (portátil Windows/Linux).
// Defina PW_CHROMIUM para apontar um binário específico.
const browser = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// VIEWPORT=1280x720 muda a resolução da captura (default 1600x900)
const [vw, vh] = (process.env.VIEWPORT || '1600x900').split('x').map(Number);
const page = await browser.newPage({ viewport: { width: vw, height: vh } });
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
