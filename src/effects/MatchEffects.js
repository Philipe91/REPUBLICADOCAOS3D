// ============================================================
// MatchEffects — apresentação dos MOMENTOS DA PARTIDA (só escuta o EventBus):
//   baseCritical  → alarme + shake + ticks periódicos enquanto a base está crítica
//   tretaFinal    → vinheta vermelha (body.treta), luzes mais baixas, alerta, som mais intenso
//   matchEnd      → slow-motion curto (≤ 600 ms), shake, zoom + deslocamento cinematográfico
//                   da câmera para a base destruída, meme, som de vitória/derrota
//   matchStart / matchCleared → tudo volta ao normal
// Nunca altera estado de jogo. Regra de desempate (Treta sem fim) está no Game:
// Config.base_damage.tretaFinalMaxOvertime → vence quem tem mais HP na base.
// ============================================================
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';

export class MatchEffects {
  constructor(game) {
    this.game = game;
    this.lights = { hemi: game.hemi ? game.hemi.intensity : 0.75, sun: game.sun ? game.sun.intensity : 2.2 };
    this.treta = false;
    this.critical = { player: false, bot: false };
    this.tickT = 0;
    bus.on('matchStart', () => this.reset());
    bus.on('matchCleared', () => this.reset());
    bus.on('baseCritical', (e) => this.onCritical(e));
    bus.on('tretaFinal', () => this.onTreta());
    bus.on('matchEnd', (e) => this.onEnd(e));
  }

  reset() {
    this.treta = false;
    this.critical.player = false; this.critical.bot = false;
    document.body.classList.remove('treta');
    if (this.game.hemi) this.game.hemi.intensity = this.lights.hemi;
    if (this.game.sun) this.game.sun.intensity = this.lights.sun;
    this.game.audio.setIntensity(1);
  }

  onCritical({ team }) {
    const g = this.game;
    this.critical[team] = true;
    g.audio.play('alarm');
    g.camera.addShake(0.35);
    g.effects.text.meme(team === 'player' ? 'A CASA TÁ CAINDO!' : 'ELES TÃO CAINDO!', { color: '#ff5a5a', force: true });
  }

  onTreta() {
    const g = this.game;
    const T = Config.treta;
    this.treta = true;
    document.body.classList.add('treta');
    g.effects.text.meme('TRETA FINAL!', { color: '#ff5a5a', force: true, duration: 2 });
    g.camera.addShake(0.6);
    g.camera.impulseZoom(Config.camera.specialCameraZoom * 0.6);
    g.audio.play('alarm');
    g.audio.setIntensity(T.audioIntensity);
  }

  onEnd({ victory, base }) {
    const g = this.game;
    const T = Config.time;
    g.time.slowMotion(T.matchEndSlowScale, T.matchEndSlowDuration, T.matchEndSlowRecovery);   // ≤ 600 ms
    g.camera.addShake(1.4);
    g.camera.impulseZoom(Config.camera.endCameraZoom);
    if (base) g.camera.impulseOffset(0, 0.6, base.z * Config.camera.endCameraTowards);        // olha rapidamente para a base que caiu
    g.effects.text.meme(victory ? 'CRISE INSTITUCIONAL!' : 'A CASA CAIU!', { color: victory ? '#ffd23f' : '#ff5a5a', force: true, duration: 2.5 });
    g.audio.play('baseDestroyed');
    setTimeout(() => g.audio.play(victory ? 'victory' : 'defeat'), 700);
    document.body.classList.remove('treta');
  }

  // rawDt: luzes escurecem suavemente na Treta; ticks de alarme enquanto alguma base está crítica
  update(dt) {
    const g = this.game;
    const T = Config.treta;
    if (g.hemi && g.sun) {
      const th = this.treta ? this.lights.hemi * T.lightMult : this.lights.hemi;
      const ts = this.treta ? this.lights.sun * T.lightMult : this.lights.sun;
      g.hemi.intensity += (th - g.hemi.intensity) * Math.min(1, dt * 3);
      g.sun.intensity += (ts - g.sun.intensity) * Math.min(1, dt * 3);
    }
    const anyCritical = g.playing && !g.ended && ((this.critical.player && !g.bases.player.destroyed) || (this.critical.bot && !g.bases.bot.destroyed));
    if (anyCritical) {
      this.tickT -= dt;
      if (this.tickT <= 0) { this.tickT = T.alarmTickEvery; g.audio.play('alarmTick'); }
    } else this.tickT = 0;
  }
}
