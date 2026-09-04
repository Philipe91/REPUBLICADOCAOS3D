// ============================================================
// DebugPanel — lil-gui (tecla G). Edita Config em tempo real.
// Botão COPIAR CONFIG → JSON de todos os valores atuais no clipboard.
// ============================================================
import GUI from 'lil-gui';
import { Config } from '../config/Config.js';

const RANGES = {
  game: { gameSpeed: [0.1, 6, 0.1], capitalRegen: [0.2, 5, 0.1], startingCapital: [0, 10, 1], maxCapital: [5, 20, 1], matchDuration: [30, 600, 5], botDifficulty: [0.2, 3, 0.1] },
  base: { baseHP: [500, 20000, 100], baseDamageFeedback: [0, 3, 0.1] },
  camera: { cameraX: [-40, 40, 0.5], cameraY: [5, 80, 0.5], cameraZ: [-40, 80, 0.5], cameraFov: [15, 100, 1], cameraTargetX: [-30, 30, 0.5], cameraTargetY: [-10, 20, 0.5], cameraTargetZ: [-30, 30, 0.5], cameraShakeStrength: [0, 3, 0.1] },
  lanes: { laneSpacing: [4, 10, 0.5], laneWidth: [2, 8, 0.5], spawnOffset: [0, 10, 0.5], fieldLength: [30, 70, 1] },
  combat: { globalDamageMultiplier: [0.1, 5, 0.05], globalHPMultiplier: [0.1, 5, 0.05], globalMoveSpeedMultiplier: [0.1, 4, 0.05], knockbackStrength: [0, 4, 0.1], hitStopDuration: [0, 0.3, 0.01], bigHitThreshold: [10, 300, 5] },
  bot: { botDecisionInterval: [0.3, 5, 0.1], botAggressiveness: [0, 2, 0.05], botDefenseBias: [0, 2, 0.05], botRandomness: [0, 1, 0.05] },
  visual: { characterScale: [0.4, 2.5, 0.05], headScale: [0.8, 2.5, 0.05], particleAmount: [0, 3, 0.1], memeFrequency: [0, 3, 0.1] },
};

const UNIT_RANGES = { hp: [1, 5000, 1], damage: [0, 500, 1], moveSpeed: [0.2, 20, 0.1], attackSpeed: [0.1, 5, 0.05], attackRange: [0.5, 15, 0.1], cost: [0, 10, 1], spawnCount: [1, 12, 1], knockback: [0, 5, 0.1], scale: [0.3, 3, 0.05], specialCooldown: [1, 60, 0.5] };

export class DebugPanel {
  constructor(game) {
    this.game = game;
    this.gui = new GUI({ title: 'REPÚBLICA DO CAOS — AJUSTES (G)' });
    this.gui.hide();
    this.visible = false;
    this.build();
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) this.toggle();
    });
  }

  toggle() { this.visible = !this.visible; this.visible ? this.gui.show() : this.gui.hide(); }

  build() {
    const gui = this.gui;
    gui.add({ copiar: () => this.copyConfig() }, 'copiar').name('📋 COPIAR CONFIG (JSON)');
    gui.add({ reiniciar: () => { this.game.screens.hideAll(); this.game.startMatch(this.game.screens.playerDeck); } }, 'reiniciar').name('🔄 REINICIAR PARTIDA');

    const labels = { game: 'GAME', base: 'BASE', camera: 'CÂMERA', lanes: 'LANES', combat: 'COMBATE', bot: 'BOT', visual: 'VISUAL' };
    for (const section in RANGES) {
      const f = gui.addFolder(labels[section]);
      f.close();
      for (const key in RANGES[section]) {
        const [min, max, step] = RANGES[section][key];
        f.add(Config[section], key, min, max, step);
      }
      if (section === 'visual') {
        f.add(Config.visual, 'shadowEnabled');
        f.add(Config.visual, 'floatingDamageEnabled');
        f.add(Config.visual, 'debugLaneMarkers');
      }
    }
    if (this.game.audio) gui.add(this.game.audio, 'volume', 0, 1, 0.05).name('volume').onChange(v => this.game.audio.setVolume(v));

    // DEBUG
    const d = gui.addFolder('DEBUG'); d.close();
    for (const k in Config.debug) d.add(Config.debug, k);

    // UNIDADES (INDIVIDUAL)
    const u = gui.addFolder('UNIDADES'); u.close();
    const names = { militante: 'MILITANTE', tiozap: 'TIO DO ZAP', assessor: 'ASSESSOR', influencer: 'INFLUENCER', barbudo: 'BARBUDO', capitao: 'CAPITÃO', careca: 'CARECA DA CANETA', dino: 'DINO', moto: 'MOTO (motociata)' };
    for (const type in Config.units) {
      const f = u.addFolder(names[type] || type); f.close();
      const st = Config.units[type];
      for (const key in st) {
        if (UNIT_RANGES[key]) { const [a, b, s] = UNIT_RANGES[key]; f.add(st, key, a, b, s); }
        else if (typeof st[key] === 'number') f.add(st, key, 0, Math.max(1, st[key] * 4), st[key] >= 5 ? 0.5 : 0.01);
      }
    }
    // PODERES
    const p = gui.addFolder('PODERES'); p.close();
    for (const pw in Config.powers) {
      const f = p.addFolder(pw.toUpperCase()); f.close();
      const st = Config.powers[pw];
      for (const key in st) f.add(st, key, 0, Math.max(1, st[key] * 4), key === 'cost' ? 1 : 0.05);
    }
    const bd = gui.addFolder('DANO NA BASE'); bd.close();
    bd.add(Config.base_damage, 'unitToBaseMultiplier', 0, 5, 0.05);
    bd.add(Config.base_damage, 'tretaFinalRampPerSecond', 0, 0.2, 0.005);
    bd.add(Config.base_damage, 'tretaFinalMaxOvertime', 10, 180, 5);
  }

  async copyConfig() {
    const json = JSON.stringify(Config, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      this.game.effects.text.meme('CONFIG COPIADA!', { color: '#7ad7ff', force: true });
    } catch (e) {
      console.log(json);
      window.prompt('Copie o JSON abaixo:', json);
    }
  }
}
