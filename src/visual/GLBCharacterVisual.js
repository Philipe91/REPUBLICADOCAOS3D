// ============================================================
// GLBCharacterVisual — implementação futura para modelos do Blender.
// Usa AnimationMixer com clipes nomeados: Idle, Walk, Attack, Hit, Death,
// Special, Victory. Já funciona se um GLB existir; se um clipe faltar,
// cai no Idle. Não é usado enquanto não houver /models/*.glb.
// ============================================================
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CharacterVisual } from './CharacterVisual.js';
import { Config } from '../config/Config.js';

export class GLBCharacterVisual extends CharacterVisual {
  constructor(gltf, scene, spec = {}) {
    super();
    this.scene = scene;
    this.object3d = SkeletonUtils.clone(gltf.scene);
    this.object3d.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.mixer = new THREE.AnimationMixer(this.object3d);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name.toLowerCase()] = c;
    this.current = null;
    this._impact = null;        // { t, cb } — fallback por timeout do onImpact (sem marcador no clip)
    this.baseScale = spec.scale ?? 1;
    this.extraScale = 1;
    const box = new THREE.Box3().setFromObject(this.object3d);
    this.rawHeight = box.max.y - box.min.y || 2;
    this._applyScale();
    scene.add(this.object3d);
    this.playIdle();
  }
  _applyScale() {
    const s = this.baseScale * this.extraScale * Config.visual.characterScale;
    this.object3d.scale.setScalar(s);
    this.height = this.rawHeight * s;
  }
  _play(name, { loop = true, fade = 0.15, timeScale = 1 } = {}) {
    const clip = this.clips[name] || this.clips.idle;
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    if (this.current === action && loop) return;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.timeScale = timeScale;
    if (this.current) this.current.crossFadeTo(action, fade, false);
    action.play();
    this.current = action;
  }
  playIdle() { this._play('idle'); }
  playWalk(f = 1) { this._play('walk', { timeScale: f }); }
  playAttack(windup, duration, { onImpact = null } = {}) {
    const c = this.clips.attack; this._play('attack', { loop: false, timeScale: c ? c.duration / Math.max(0.1, duration) : 1 });
    this._impact = onImpact ? { t: windup, cb: onImpact } : null;   // futuro: marcador de clip → mesmo callback
  }
  playHit() { this._play('hit', { loop: false }); }
  playDeath(strength = 'medium') { this._play(`death_${strength}`) || this._play('death', { loop: false }); }   // GLB futuro: clip por força, senão o genérico
  playSpecial(kind) { this._play(`special_${kind}`) || this._play('special', { loop: false }); }
  playVictory() { this._play('victory'); }
  playStun(on) { on ? this._play('stun') : this.playIdle(); }
  playRecesso(on) { on ? this._play('idle') : this.playIdle(); }
  setFacing(dirZ) { this.object3d.rotation.y = dirZ < 0 ? Math.PI : 0; }
  setPosition(x, y, z) { this.object3d.position.set(x, y, z); }
  setScale(s) { this.extraScale = s; this._applyScale(); }
  flash() {}
  transform() {}
  update(dt) {
    this.mixer.update(dt);
    if (this._impact) { this._impact.t -= dt; if (this._impact.t <= 0) { const cb = this._impact.cb; this._impact = null; cb(); } }
  }
  dispose() { this.scene.remove(this.object3d); }
}
