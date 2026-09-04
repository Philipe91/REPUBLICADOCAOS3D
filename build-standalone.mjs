// Gera um único index.html (JS + CSS embutidos) que abre direto no navegador via file://
import { execSync } from 'node:child_process';
import fs from 'node:fs';
execSync('npx vite build', { stdio: 'inherit' });
let html = fs.readFileSync('dist/index.html', 'utf8');
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+)"><\/script>/, (_, f) => `<script type="module">${fs.readFileSync('dist/' + f, 'utf8')}</script>`);
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+)">/, (_, f) => `<style>${fs.readFileSync('dist/' + f, 'utf8')}</style>`);
fs.mkdirSync('standalone', { recursive: true });
fs.writeFileSync('standalone/index.html', html);
console.log('standalone/index.html gerado:', (html.length / 1024).toFixed(0), 'KB');
