// ============================================================
// HitEffects — reação VISUAL/SONORA ao dano e à morte (APRESENTAÇÃO).
// Só escuta o EventBus; nunca altera HP, knockback ou estado. A Unit emite
// `unitDamaged {unit, amount, source, strength}` e `unitDied {unit, killer, strength}`.
// Reação por força (Config.combat):
//   light   → recuo curto, flash rápido, 3 faíscas, som leve, sem shake
//   medium  → recuo + flash (hitFlashDuration) + 6 partículas
//   heavy   → recuo forte + flash branco + 14 partículas douradas + shake + hit-stop + som grave
//   special → como heavy, com mais partículas
// Ataque comum NUNCA gera shake nem hit-stop.
// ============================================================
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';

export class HitEffects {
  constructor(game) {
    this.game = game;
    bus.on('unitDamaged', (e) => this.onDamaged(e));
    bus.on('unitDied', (e) => this.onDied(e));
  }

  onDamaged({ unit, amount, strength = 'medium' }) {
    const g = this.game;
    const C = Config.combat;
    const fx = g.effects;
    const hp = unit.hitPoint;
    const heavy = strength === 'heavy' || strength === 'special';
    fx.text.damage(amount, hp, heavy);
    if (strength === 'light') {
      fx.particles.burst(hp, 3, { color: 0xffffff, speed: 2.5, size: 0.12, gravity: 9, life: 0.4 });
      unit.visual.flash(0xff6644, C.hitFlashDuration * 0.5);
      unit.visual.playHit(0.6);
      g.audio.play('hit');
    } else if (!heavy) {
      fx.particles.burst(hp, 6, { color: 0xffffff, speed: 3, size: 0.14, gravity: 9, life: 0.5 });
      unit.visual.flash(0xff6644, C.hitFlashDuration);
      unit.visual.playHit(1.0);
      g.audio.play('hit');
    } else {
      fx.particles.burst(hp, strength === 'special' ? 20 : 14, { color: 0xffd23f, speed: 5, size: 0.22, gravity: 9, life: 0.5 });
      unit.visual.flash(0xffffff, C.hitFlashDuration * 1.5);
      unit.visual.playHit(1.4);
      g.camera.addShake(0.35);
      g.time.hitStop(C.hitStopDuration);
      g.audio.play('bigHit');
    }
  }

  onDied({ unit, strength = 'medium' }) {
    const fx = this.game.effects;
    const hp = unit.hitPoint;
    const heavy = strength === 'heavy' || strength === 'special';
    fx.particles.burst(hp, heavy ? 16 : 10, { color: 0xffffff, speed: heavy ? 5.5 : 4, size: 0.18, gravity: 10 });
    fx.particles.burst(hp, 4, { color: 0xfdfdf5, speed: 2, size: 0.25, gravity: 1.2, paper: true, life: 2 });
  }
}
