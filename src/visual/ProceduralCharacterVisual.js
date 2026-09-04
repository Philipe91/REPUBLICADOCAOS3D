// ============================================================
// ProceduralCharacterVisual — implementa CharacterVisual usando
// ProceduralCharacter (primitivas). Trocar por GLBCharacterVisual
// no futuro sem mexer em Unit.js.
// ============================================================
import { CharacterVisual } from './CharacterVisual.js';
import { ProceduralCharacter } from './ProceduralCharacter.js';
import { Config } from '../config/Config.js';

const MODEL_SCALE = 1.05; // proporção base dos bonecos em unidades de mundo

export class ProceduralCharacterVisual extends CharacterVisual {
  constructor(spec, scene) {
    super();
    this.character = new ProceduralCharacter(spec, Config.visual.headScale);
    this.object3d = this.character.root;
    this.baseScale = MODEL_SCALE * (spec.scale ?? 1);
    this.extraScale = 1;
    this.height = this.character.height * MODEL_SCALE * (spec.scale ?? 1);
    this.scene = scene;
    scene.add(this.object3d);
    this._applyScale();
  }

  _applyScale() {
    const s = this.baseScale * this.extraScale * Config.visual.characterScale;
    this.object3d.scale.setScalar(s);
    this.height = this.character.height * s;
  }

  playIdle() { this.character.setAnim('idle'); }
  playWalk(factor = 1) { this.character.setAnim('walk', { factor }); }
  playAttack(windup, duration) { this.character.setAnim('attack', { windup, duration }); }
  playHit(strength = 1) { this.character.hit(strength); }
  playDeath() { this.character.setAnim('death'); }
  playSpecial(kind, duration) { this.character.setAnim('special', { kind, duration }); }
  playVictory() { this.character.setAnim('victory'); }
  playStun(on) { this.character.setAnim(on ? 'stun' : 'idle'); }
  playRecesso(on) { this.character.setAnim(on ? 'recesso' : 'idle'); }
  setFacing(dirZ) { this.object3d.rotation.y = dirZ < 0 ? Math.PI : 0; }
  setPosition(x, y, z) { this.object3d.position.set(x, y, z); }
  setScale(s) { this.extraScale = s; this._applyScale(); }
  flash(color, time) { this.character.flash(color, time); }
  transform(spec) {
    if (spec === 'jurassic') {
      this.character.transformJurassic();
      this.setScale(Config.units.dino.jurassicScale);
    }
  }
  get currentAnim() { return this.character.anim; }
  update(dt) {
    this.character.update(dt);
    // characterScale pode mudar no lil-gui em tempo real
    const s = this.baseScale * this.extraScale * Config.visual.characterScale;
    if (Math.abs(this.object3d.scale.x - s) > 1e-4) this._applyScale();
  }
  dispose() { this.character.dispose(); }
}
