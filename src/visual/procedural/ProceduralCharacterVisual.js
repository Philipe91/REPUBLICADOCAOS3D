// ============================================================
// ProceduralCharacterVisual — implementa CharacterVisual com o boneco procedural:
//   ProceduralRig (malha + pose de descanso) + ProceduralAnimator (estados) +
//   ProceduralAnimations (funções puras).
// Unit.js só conhece a interface CharacterVisual; trocar por GLBCharacterVisual
// não exige mexer em lógica nenhuma.
// ============================================================
import { CharacterVisual } from '../CharacterVisual.js';
import { ProceduralRig } from './ProceduralRig.js';
import { ProceduralAnimator } from './ProceduralAnimator.js';
import { Config } from '../../config/Config.js';

const MODEL_SCALE = 1.05; // proporção base dos bonecos em unidades de mundo

export class ProceduralCharacterVisual extends CharacterVisual {
  constructor(spec, scene) {
    super();
    this.rig = new ProceduralRig(spec, Config.visual.headScale);
    this.animator = new ProceduralAnimator(this.rig);
    this.object3d = this.rig.root;
    this.baseScale = MODEL_SCALE * (spec.scale ?? 1);
    this.extraScale = 1;
    this.height = this.rig.height * MODEL_SCALE * (spec.scale ?? 1);
    this.scene = scene;
    scene.add(this.object3d);
    this._applyScale();
  }

  _applyScale() {
    const s = this.baseScale * this.extraScale * Config.visual.characterScale;
    this.object3d.scale.setScalar(s);
    this.height = this.rig.height * s;
  }

  playIdle() { this.animator.setAnim('idle'); }
  playWalk(factor = 1) { this.animator.setAnim('walk', { factor }); }
  playAttack(windup, duration, { onImpact = null } = {}) { this.animator.setAnim('attack', { windup, duration, onImpact }); }
  playHit(strength = 1) { this.animator.hit(strength); }
  playDeath(strength = 'medium') { this.animator.setAnim('death', { strength }); }
  playSpecial(kind, duration) { this.animator.setAnim('special', { kind, duration }); }
  playVictory() { this.animator.setAnim('victory'); }
  playStun(on) { this.animator.setAnim(on ? 'stun' : 'idle'); }
  playRecesso(on) { this.animator.setAnim(on ? 'recesso' : 'idle'); }
  setFacing(dirZ) { this.object3d.rotation.y = dirZ < 0 ? Math.PI : 0; }
  setPosition(x, y, z) { this.object3d.position.set(x, y, z); }
  setScale(s) { this.extraScale = s; this._applyScale(); }
  flash(color, time) { this.animator.flash(color, time); }
  transform(spec) {
    if (spec === 'jurassic') {
      this.rig.transformJurassic();
      this.setScale(Config.units.dino.jurassicScale);
    }
  }
  get currentAnim() { return this.animator.anim; }
  update(dt) {
    this.animator.update(dt);
    // characterScale pode mudar no lil-gui em tempo real
    const s = this.baseScale * this.extraScale * Config.visual.characterScale;
    if (Math.abs(this.object3d.scale.x - s) > 1e-4) this._applyScale();
  }
  dispose() { this.rig.dispose(); }
}
