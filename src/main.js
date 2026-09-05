// ============================================================
// REPÚBLICA DO CAOS — BATALHA PELO PLANALTO
// Entrada do jogo. npm install && npm run dev
// ============================================================
import { Game } from './core/Game.js';
import { DebugPanel } from './debug/DebugPanel.js';
import { assetManager } from './visual/AssetManager.js';
import { Config } from './config/Config.js';
import { bus } from './core/EventBus.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const panel = new DebugPanel(game);

// Tenta carregar GLBs em segundo plano (se existirem em /public/models). Sem eles → procedural.
assetManager.preload().then(n => { if (n) console.info(`[AssetManager] ${n} modelo(s) GLB em uso`); });

// Acesso para debug/testes automáticos no console:
//   window.game.startMatch(); Config.debug.autoPlayer = true; Config.game.gameSpeed = 4
window.game = game;
window.Config = Config;
window.bus = bus;   // testes automáticos escutam eventos por aqui
window.debugPanel = panel;
window.assetManager = assetManager;   // testes: assetManager.enabled = false força o visual procedural
assetManager.enabled = !!Config.visual.useGLB;   // Config.visual.useGLB liga os modelos do Blender

// Suporte a parâmetros de URL para testes: ?auto=1&speed=4&autostart=1
const params = new URLSearchParams(location.search);
if (params.get('auto') === '1') Config.debug.autoPlayer = true;
if (params.get('speed')) Config.game.gameSpeed = parseFloat(params.get('speed'));
if (params.get('dur')) Config.game.matchDuration = parseFloat(params.get('dur'));   // testes: partida curta → TRETA FINAL
if (params.get('glb')) { Config.visual.useGLB = params.get('glb') === '1'; assetManager.enabled = Config.visual.useGLB; }   // ?glb=1 força os modelos do Blender
if (params.get('debug') === '1') { Config.debug.showStats = true; Config.debug.showAIDecisions = true; Config.perf.showPerfOverlay = true; }
if (params.get('autostart') === '1') { game.screens.hideAll(); game.startMatch(); }
