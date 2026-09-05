// ============================================================
// GLBCharacterVisual — modelos do Blender (tools/blender/*.py → public/models/<tipo>.glb).
// AnimationMixer com clipes nomeados: idle, walk, attack, hit, death, victory, stun,
// special (ou special_<kind>). Se um clipe faltar, cai no idle. Materiais são clonados
// por instância: os chamados "TEAM…" recebem a cor do time (spec.teamColor) e o flash de
// dano usa emissive. onImpact: timeout = windup (sem marcador de clip por enquanto).
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
    this.materials = [];
    const teamColor = spec.teamColor ?? null;
    this.object3d.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const cloned = mats.map(m => { const c = m.clone(); if (teamColor !== null && /^TEAM/i.test(c.name || '')) c.color.setHex(teamColor); this.materials.push(c); return c; });
      o.material = Array.isArray(o.material) ? cloned : cloned[0];
    });
    this.flashT = 0; this.flashColor = 0xffffff;
    // peças do MODO JURÁSSICO (nós "JUR_…") ficam ocultas até transform('jurassic')
    this.jurNodes = [];
    this.object3d.traverse(o => { if (/^JUR_/i.test(o.name)) { o.visible = false; this.jurNodes.push(o); } });
    this.jurassic = false;
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
  // devolve false se o clipe não existe (quem chama decide o fallback)
  _play(name, { loop = true, fade = 0.15, timeScale = 1 } = {}) {
    const clip = this.clips[name];
    if (!clip) return false;
    const action = this.mixer.clipAction(clip);
    if (this.current === action && loop) return true;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.timeScale = timeScale;
    if (this.current) this.current.crossFadeTo(action, fade, false);
    action.play();
    this.current = action;
    return true;
  }
  playIdle() { this._play('idle'); }
  playWalk(f = 1) { this._play('walk', { timeScale: Math.max(0.5, f) }) || this.playIdle(); }
  playAttack(windup, duration, { onImpact = null } = {}) {
    const c = this.clips.attack; this._play('attack', { loop: false, timeScale: c ? c.duration / Math.max(0.1, duration) : 1 });
    this._impact = onImpact ? { t: windup, cb: onImpact } : null;   // futuro: marcador de clip → mesmo callback
  }
  playHit() { this._play('hit', { loop: false }); }   // curto: o mixer volta ao idle/walk no próximo playX da Unit
  playDeath(strength = 'medium') { this._play(`death_${strength}`) || this._play('death', { loop: false }); }   // GLB futuro: clip por força, senão o genérico
  playSpecial(kind) { this._play(`special_${kind}`, { loop: false }) || this._play('special', { loop: false }) || this.playIdle(); }
  playVictory() { this._play('victory') || this.playIdle(); }
  playStun(on) { on ? (this._play('stun') || this.playIdle()) : this.playIdle(); }
  playRecesso(on) { on ? (this._play('recesso') || this.playIdle()) : this.playIdle(); }
  setFacing(dirZ) { this.object3d.rotation.y = dirZ < 0 ? Math.PI : 0; }
  setPosition(x, y, z) { this.object3d.position.set(x, y, z); }
  setScale(s) { this.extraScale = s; this._applyScale(); }
  flash(color = 0xffffff, time = 0.1) { this.flashT = time; this.flashColor = color; }
  // MODO JURÁSSICO: mostra os nós JUR_, pinta os materiais SKIN_ de verde e cresce (Config.units.dino.jurassicScale)
  transform(spec) {
    if (spec !== 'jurassic' || this.jurassic) return;
    this.jurassic = true;
    for (const o of this.jurNodes) o.visible = true;
    for (const m of this.materials) if (/^SKIN_/i.test(m.name || '')) m.color.setHex(0x3f8f3a);
    this.setScale(Config.units.dino.jurassicScale);
  }
  update(dt) {
    this.mixer.update(dt);
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = this.flashT > 0;
      for (const m of this.materials) if (m.emissive) m.emissive.setHex(on ? this.flashColor : 0x000000);
    }
    if (this._impact) { this._impact.t -= dt; if (this._impact.t <= 0) { const cb = this._impact.cb; this._impact = null; cb(); } }
  }
  dispose() { this.scene.remove(this.object3d); }
}
