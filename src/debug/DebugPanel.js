// ============================================================
// DebugPanel — lil-gui (tecla G). Edita Config em tempo real.
// Botão COPIAR CONFIG → JSON de todos os valores atuais no clipboard.
// ============================================================
import GUI from 'lil-gui';
import { Config } from '../config/Config.js';

const RANGES = {
  game: { tretaFinalSpeedMultiplier: [0.5, 3, 0.05], capitalRegen: [0.2, 5, 0.1], startingCapital: [0, 10, 1], maxCapital: [5, 20, 1], matchDuration: [30, 600, 5], botDifficulty: [0.2, 3, 0.1] },
  base: { baseHP: [500, 20000, 100], baseDamageFeedback: [0, 3, 0.1], heavyHitShake: [0, 1, 0.05] },
  treta: { lightMult: [0.2, 1, 0.02], audioIntensity: [0.5, 2, 0.05], alarmTickEvery: [0.5, 6, 0.1] },
  chaos: { decayPerSecond: [0, 30, 0.5], max: [50, 300, 5], spikeCooldown: [0, 10, 0.1], cameraShakePerLevel: [0, 0.5, 0.01], audioBoostPerLevel: [0, 0.2, 0.01] },
  clutter: { fogNear: [10, 120, 1], fogFar: [40, 300, 5], nameOnSpawnMinCost: [0, 10, 1], damageNumbersLight: [0, 1, 1], lightHitParticles: [0, 8, 1], spawnParticlesCheap: [0, 1, 0.05] },
  memes: { cooldown: [0.5, 15, 0.5], chance: [0, 1, 0.05], duration: [0.5, 3, 0.1], idleEvery: [3, 60, 1], maxWait: [0, 6, 0.1] },
  // câmera lateral: cameraSide é enum e entra fora do loop (ver build())
  camera: { cameraDistance: [8, 70, 0.5], cameraHeight: [0, 45, 0.5], cameraSideOffset: [-30, 30, 0.5], cameraFov: [15, 100, 1], cameraTargetX: [-20, 20, 0.5], cameraTargetY: [-2, 16, 0.1], cameraTargetZ: [-30, 30, 0.5], cameraShakeStrength: [0, 3, 0.1], specialCameraZoom: [0, 15, 0.5], impulseDecay: [2, 20, 0.5], endCameraZoom: [0, 20, 0.5], endCameraTowards: [0, 1, 0.05] },
  lanes: { laneSpacing: [4, 10, 0.5], laneWidth: [2, 8, 0.5], spawnOffset: [0, 10, 0.5], fieldLength: [30, 70, 1] },
  combat: { globalDamageMultiplier: [0.1, 5, 0.05], globalHPMultiplier: [0.1, 5, 0.05], globalMoveSpeedMultiplier: [0.1, 4, 0.05], knockbackStrength: [0, 4, 0.1], bigHitThreshold: [10, 300, 5], mediumHitThreshold: [1, 200, 1], impactTimeout: [0, 0.6, 0.01], hitFlashDuration: [0, 0.4, 0.01], deathKnockbackMultiplier: [0, 4, 0.1], smallUnitDeathFlyMult: [0.5, 4, 0.1] },
  bot: { botDecisionInterval: [0.3, 5, 0.1], botAggressiveness: [0, 2, 0.05], botDefenseBias: [0, 2, 0.05], botRandomness: [0, 1, 0.05] },
  visual: { characterScale: [0.4, 2.5, 0.05], baseVisualScale: [0.4, 3, 0.05], headScale: [0.8, 2.5, 0.05], particleAmount: [0, 3, 0.1], memeFrequency: [0, 3, 0.1], spawnEffectScale: [0, 3, 0.1], teamRingOpacity: [0, 1, 0.05] },
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

    const labels = { game: 'GAME', base: 'BASE', treta: 'TRETA FINAL', chaos: 'CHAOS SCORE', memes: 'MEMES', clutter: 'LEGIBILIDADE', camera: 'CÂMERA', lanes: 'LANES', combat: 'COMBATE', bot: 'BOT', visual: 'VISUAL' };
    for (const section in RANGES) {
      const f = gui.addFolder(labels[section]);
      f.close();
      if (section === 'camera') {
        f.add(Config.camera, 'cameraSide', { 'lado +X (jogador à esquerda)': 1, 'lado −X (espelhado)': -1 }).name('cameraSide');
      }
      for (const key in RANGES[section]) {
        const [min, max, step] = RANGES[section][key];
        f.add(Config[section], key, min, max, step);
      }
      if (section === 'visual') {
        f.add(Config.visual, 'shadowEnabled');
        f.add(Config.visual, 'floatingDamageEnabled');
        f.add(Config.visual, 'debugLaneMarkers');
        f.add(Config.visual, 'showUnitNameOnSpawn');
      }
    }
    if (this.game.audio) gui.add(this.game.audio, 'volume', 0, 1, 0.05).name('volume').onChange(v => this.game.audio.setVolume(v));

    // TIME / GAME FEEL (core/TimeController.js)
    const g = this.game;
    const t = gui.addFolder('TIME / GAME FEEL'); t.close();
    const speedCtrl = t.add(Config.game, 'gameSpeed', { '0.25x': 0.25, '0.5x': 0.5, '1x': 1, '1.5x': 1.5, '2x': 2, '3x': 3 }).name('gameSpeed');
    t.add(Config.combat, 'hitStopDuration', 0, 0.3, 0.005);
    t.add(Config.time, 'hitStopBudgetPerSecond', 0, 1, 0.05);
    t.add(Config.time, 'hitStopVisualRate', 0, 1, 0.01);
    t.add(Config.time, 'slowMotionScale', 0.05, 1, 0.05);
    t.add(Config.time, 'slowMotionDuration', 0, 3, 0.05);
    t.add(Config.time, 'slowMotionRecovery', 0, 2, 0.05);
    t.add(Config.time, 'specialSlowScale', 0.05, 1, 0.05);
    t.add(Config.time, 'specialSlowDuration', 0, 1, 0.05);
    t.add({ f: () => g.time.hitStop(Config.combat.hitStopDuration, { force: true }) }, 'f').name('TEST HIT STOP');
    t.add({ f: () => g.time.slowMotion(Config.time.slowMotionScale, Config.time.slowMotionDuration, Config.time.slowMotionRecovery) }, 'f').name('TEST SLOW MOTION');
    t.add({ f: () => { g.time.reset(); g.time.setGameSpeed(1); speedCtrl.updateDisplay(); } }, 'f').name('RESET TIME SCALE');

    // UI / UX (ui/CardUI.js, ui/HUD.js)
    const ui = gui.addFolder('UI / UX'); ui.close();
    ui.add(Config.ui, 'toastDuration', 0.2, 3, 0.1);
    ui.add(Config.ui, 'denyFlashDuration', 0.1, 1.5, 0.05);
    ui.add(Config.ui, 'capitalTickPulse');
    ui.add(Config.ui, 'showLaneNameOnHover');
    ui.add(Config.ui, 'laneHoverOpacity', 0, 1, 0.05);
    ui.add(Config.ui, 'laneSelectOpacity', 0, 1, 0.05);

    // PERFORMANCE (debug/PerfStats.js)
    const pf = gui.addFolder('PERFORMANCE'); pf.close();
    pf.add(Config.perf, 'showPerfOverlay');
    pf.add(Config.perf, 'perfSampleWindow', 0.5, 10, 0.5);
    pf.add({ f: () => g.perf.copySnapshot() }, 'f').name('COPY PERF SNAPSHOT');

    // STRESS TEST (debug/StressTest.js)
    const st = gui.addFolder('STRESS TEST'); st.close();
    for (const n of [10, 20, 30, 50]) st.add({ f: () => g.stress.run(n) }, 'f').name(`STRESS TEST ${n}`);
    st.add({ f: () => g.stress.clear() }, 'f').name('CLEAR STRESS TEST');

    // DEBUG
    const d = gui.addFolder('DEBUG'); d.close();
    for (const k in Config.debug) d.add(Config.debug, k);

    // UNIDADES (INDIVIDUAL)
    const u = gui.addFolder('UNIDADES'); u.close();
    const names = { militante: 'MILITANTE', tiozap: 'TIO DO ZAP', assessor: 'ASSESSOR', influencer: 'INFLUENCER', barbudo: 'BARBUDO', capitao: 'CAPITÃO', careca: 'CARECA DA CANETA', dino: 'DINO', moto: 'MOTO (motociata)', agroboy: 'AGRO BOY', coach: 'COACH', pastor: 'PASTOR', fiel: 'FIEL (do Pastor)', pneus: 'MANIFESTANTE DOS PNEUS', maconheiro: 'MACONHEIRO', musico: 'MÚSICO', mascote: 'MASCOTE' };
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
