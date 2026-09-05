// ============================================================
// SpecialEffects — apresentação dos ESPECIAIS (só escuta o EventBus):
//   specialStart {unit, type, duration, target} · specialEnd {unit, type}
//   engagementGain {unit, level, max}
// MODO JURÁSSICO: burst verde + anel + texto + meme + shake + zoom curto da câmera +
//   slow-motion curtíssimo + rugido. Tudo ≤ 1,2 s e reversível; as outras lanes
//   continuam visíveis (o zoom é limitado por Config.camera.specialCameraZoom).
// SUSPENSO: antecipação (texto pequeno "SUSPENSO?" + som subindo) e, no golpe da
//   Unit.stun, o anel roxo no alvo + meme.
// ENGAJAMENTO: texto "+n", corações, meme VIRALIZOU no máximo.
// Nunca altera estado de jogo.
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';

const _up = new THREE.Vector3();

export class SpecialEffects {
  constructor(game) {
    this.game = game;
    bus.on('specialStart', (e) => this.onStart(e));
    bus.on('specialEnd', (e) => this.onEnd(e));
    bus.on('engagementGain', (e) => this.onEngagement(e));
  }

  onStart({ unit, type, target }) {
    const g = this.game, fx = g.effects;
    const hp = unit.hitPoint;
    switch (type) {
      case 'jurassico': {
        const C = Config.camera;
        fx.particles.burst(hp, 30, { color: 0x3f8f3a, speed: 6, size: 0.25, gravity: 8 });
        fx.particles.ring(unit.pos, { color: 0x3f8f3a, radius: 4, duration: 0.7 });
        fx.text.show('MODO JURÁSSICO!', hp.clone().add(_up.set(0, 1.4, 0)), { color: '#9fd67a', size: 1.4, life: 1.5, font: 'bold 36px Arial' });
        fx.text.meme('MODO JURÁSSICO!', { color: '#9fd67a', force: true });
        g.camera.addShake(0.6);
        g.camera.impulseZoom(C.specialCameraZoom);
        g.time.slowMotion(Config.time.specialSlowScale, Config.time.specialSlowDuration, Config.time.specialSlowRecovery);
        g.audio.play('roar');
        break;
      }
      case 'suspenso': {
        fx.text.show('SUSPENSO?', hp.clone().add(_up.set(0, 1.1, 0)), { color: '#c9b6ff', size: 0.8, life: 0.5, rise: 1.5, font: 'bold 30px Arial' });
        if (target && target.pos) fx.particles.ring(target.pos, { color: 0x9b7bff, radius: 2, duration: 0.5 });
        fx.text.meme('SUSPENSO!', { color: '#c9b6ff' });
        g.camera.addShake(0.15);
        g.audio.play('suspensoWindup');
        break;
      }
    }
  }

  onEnd({ unit, type }) {
    if (type !== 'jurassico') return;
    const fx = this.game.effects;
    fx.particles.burst(unit.hitPoint, 10, { color: 0x9fd67a, speed: 4, size: 0.18, gravity: 8, life: 0.5 });
  }

  onEngagement({ unit, level, max }) {
    const fx = this.game.effects;
    fx.text.show('ENGAJAMENTO +' + level, unit.hitPoint.add(_up.set(0, 0.8, 0)), { color: '#ff7ab8', size: 0.9, life: 1 });
    fx.particles.burst(unit.hitPoint, 8, { color: 0xff4d8d, speed: 3, size: 0.16, gravity: -1, life: 1 });
    if (level >= max) fx.text.meme('VIRALIZOU!', { color: '#ff7ab8' });
  }
}
