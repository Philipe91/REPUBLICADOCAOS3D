// ============================================================
// ProceduralAnimator — máquina de estados de animação do boneco procedural.
// Guarda o estado (anim atual, tempos, variantes por instância, hit, flash) e, a cada
// update(dt): rig.resetPose() → animação do estado → hit sobreposto → flash → secundário.
// Ordem e fórmulas idênticas ao ProceduralCharacter original (E2 = refactor neutro).
//
// onImpact (preparação para E5): playAttack pode passar um callback; ele dispara UMA vez
// quando a animação de ataque entra no frame de golpe (t ≥ windup). Hoje ninguém o usa —
// o dano continua sendo aplicado pela Unit no próprio timer. Um visual sem marcador
// (GLB futuro) pode simplesmente ignorar e a Unit segue por timeout.
// ============================================================
import * as A from './ProceduralAnimations.js';
import { death as deathAnim, pickDeath } from './Deaths.js';
import { GESTURES, recesso as recessoPose } from './Gestures.js';
import { PROFILES } from './Profiles.js';

const HIT_TIME = 0.3;

export class ProceduralAnimator {
  constructor(rig, profile = null) {
    this.rig = rig;
    this.profile = profile || PROFILES.default;   // personalidade (só dados) — Profiles.js
    this.anim = 'idle';
    this.animTime = 0;
    this.time = Math.random() * 10;   // fase aleatória: bonecos não sincronizam
    this.idleTime = 0;                // tempo contínuo em idle (agenda dos gestos)
    this.gestureT = -1;               // ≥ 0 enquanto um gesto roda
    this.gestureName = null;
    this.gesturesPlayed = 0;
    this.nextGesture = this._scheduleGesture(true);
    this.attackWindup = 0.25;
    this.attackDuration = 0.6;
    this.onImpact = null;
    this._impactFired = false;
    this.walkFactor = 1;
    this.hitT = 0;
    this.hitStrength = 1;
    this.flashT = 0;
    this.flashColor = 0xffffff;
    this.specialKind = 'default';
    this.specialDuration = 1;
    this.recessoVariant = null;
    this.deathVariant = null;
  }

  _scheduleGesture(first = false) {
    const P = this.profile;
    return (first ? 0.4 + Math.random() * 0.8 : 0.8 + Math.random() * 0.4) * P.gestureEvery;
  }

  setAnim(name, params = {}) {
    if (this.anim === 'death') return;
    if (name === this.anim && (name === 'idle' || name === 'walk')) { if (params.factor) this.walkFactor = params.factor; return; }
    this.anim = name;
    this.animTime = 0;
    if (name !== 'idle') { this.idleTime = 0; this.gestureT = -1; this.gestureName = null; this.nextGesture = this._scheduleGesture(true); }
    if (name === 'attack') {
      this.attackWindup = params.windup ?? 0.25;
      this.attackDuration = params.duration ?? 0.6;
      this.onImpact = params.onImpact ?? null;
      this._impactFired = false;
    }
    if (name === 'walk') this.walkFactor = params.factor ?? 1;
    if (name === 'special') { this.specialKind = params.kind ?? 'default'; this.specialDuration = params.duration ?? 1; }
    if (name === 'death') this.deathVariant = params.variant ?? pickDeath(params.strength);
  }

  hit(strength = 1) { this.hitT = HIT_TIME; this.hitStrength = strength; }
  flash(color = 0xffffff, t = 0.1) { this.flashT = t; this.flashColor = color; }

  update(dt) {
    this.time += dt;
    this.animTime += dt;
    const rig = this.rig;
    rig.resetPose();

    const t = this.animTime;
    const T = this.time;
    const P = this.profile;
    switch (this.anim) {
      case 'idle':
        A.idle(rig, T, P);
        this._updateGesture(dt);
        break;
      case 'walk': A.walk(rig, T, this.walkFactor, P); break;
      case 'attack':
        A.attack(rig, t, this.attackWindup, this.attackDuration, P);
        if (!this._impactFired && t >= this.attackWindup) {
          this._impactFired = true;
          const cb = this.onImpact; this.onImpact = null;
          if (cb) cb();
        }
        break;
      case 'special': A.special(rig, t, this.specialKind, this.specialDuration); break;
      case 'victory': A.victory(rig, T); break;
      case 'stun': A.stun(rig, T); break;
      case 'recesso':
        if (this.recessoVariant === null) this.recessoVariant = Math.floor(Math.random() * 3);
        recessoPose(rig, T, this.recessoVariant); break;
      case 'death':
        if (this.deathVariant === null) this.deathVariant = pickDeath('medium');
        deathAnim(rig, t, this.deathVariant); break;
    }
    // reação de dano sobreposta
    if (this.hitT > 0 && this.anim !== 'death') {
      this.hitT -= dt;
      A.hitOverlay(rig, this.hitT / HIT_TIME, this.hitStrength);
    }
    // flash (emissive)
    if (this.flashT > 0) {
      this.flashT -= dt;
      rig.setEmissive(this.flashT > 0 ? this.flashColor : null);
    }
    A.secondary(rig, T, this.anim);
  }

  // gesto do Profile sobreposto ao idle, a cada gestureEvery s (com variação), por gestureDuration s
  _updateGesture(dt) {
    const P = this.profile;
    const fn = P.gesture && GESTURES[P.gesture];
    if (!fn) return;
    this.idleTime += dt;
    if (this.gestureT < 0) {
      if (this.idleTime >= this.nextGesture) { this.gestureT = 0; this.gestureName = P.gesture; this.gesturesPlayed++; }
      else return;
    }
    fn(this.rig, this.gestureT, P.gestureDuration);
    this.gestureT += dt;
    if (this.gestureT >= P.gestureDuration) { this.gestureT = -1; this.gestureName = null; this.nextGesture = this.idleTime + this._scheduleGesture(); }
  }
}
