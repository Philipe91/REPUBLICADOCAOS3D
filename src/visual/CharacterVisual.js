// ============================================================
// CharacterVisual — INTERFACE comum entre a lógica da unidade e o visual.
// Unit.js só fala com esta interface. Implementações:
//   ProceduralCharacterVisual (primitivas Three.js)  ← agora
//   GLBCharacterVisual (modelos do Blender + AnimationMixer) ← futuro
// ============================================================
export class CharacterVisual {
  constructor() { this.object3d = null; this.height = 2; }
  playIdle() {}
  playWalk(speedFactor = 1) {}
  playAttack(windup = 0.25, duration = 0.6) {}
  playHit(strength = 1) {}
  playDeath() {}
  playSpecial(kind = 'default', duration = 1) {}
  playVictory() {}
  playStun(on) {}
  setFacing(dirZ) {}          // -1 → olha para -z, +1 → olha para +z
  setPosition(x, y, z) {}
  setScale(s) {}
  flash(color = 0xffffff, time = 0.1) {}
  transform(spec) {}         // ex.: MODO JURÁSSICO do Dino
  update(dt) {}
  dispose() {}
}
