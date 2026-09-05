// ============================================================
// ProjectileManager — projéteis com pooling.
// Tipos: 'zap' (mensagem do Tio do Zap), 'like' (Influencer), 'generic'.
// Projétil persegue o alvo; ao chegar aplica dano via callback.
// ============================================================
import * as THREE from 'three';
import { G, mat, basicMat } from '../core/Assets.js';

const _dir = new THREE.Vector3();

const KIND_COLOR = { zap: 0x5ce27a, like: 0xff4d8d, generic: 0xffee66 };

export class ProjectileManager {
  constructor(scene, particles = null) {
    this.scene = scene;
    this.particles = particles;   // opcional: faíscas no disparo e no impacto
    this.active = [];
    this.free = [];
  }

  _create() {
    const g = new THREE.Group();
    // balão de mensagem (zap)
    const zap = new THREE.Group();
    zap.add(new THREE.Mesh(G.box(0.7, 0.45, 0.18), mat(0x5ce27a)));
    const tail = new THREE.Mesh(G.cone(0.12, 0.25, 4), mat(0x5ce27a));
    tail.position.set(-0.25, -0.3, 0); tail.rotation.z = Math.PI / 6;
    zap.add(tail);
    const lines = new THREE.Mesh(G.box(0.45, 0.06, 0.2), basicMat(0xffffff)); lines.position.y = 0.06; zap.add(lines);
    const lines2 = new THREE.Mesh(G.box(0.3, 0.06, 0.2), basicMat(0xffffff)); lines2.position.set(-0.07, -0.08, 0); zap.add(lines2);
    g.add(zap);
    // "like" (coração cartunesco = dois cubos rotacionados)
    const like = new THREE.Group();
    const h1 = new THREE.Mesh(G.box(0.3, 0.3, 0.15), mat(0xff4d8d)); h1.rotation.z = Math.PI / 4; like.add(h1);
    const h2 = new THREE.Mesh(G.sphere(0.16, 8), mat(0xff4d8d)); h2.position.set(-0.13, 0.13, 0); like.add(h2);
    const h3 = new THREE.Mesh(G.sphere(0.16, 8), mat(0xff4d8d)); h3.position.set(0.13, 0.13, 0); like.add(h3);
    g.add(like);
    // genérico
    const gen = new THREE.Mesh(G.sphere(0.18, 8), basicMat(0xffee66));
    g.add(gen);
    g.visible = false;
    this.scene.add(g);
    return { group: g, parts: { zap, like, generic: gen }, kind: 'zap', target: null, speed: 10, onHit: null, t: 0, spin: 0 };
  }

  spawn({ from, target, kind = 'zap', speed = 12, onHit, arc = 1.2 }) {
    let p = this.free.pop();
    if (!p) p = this._create();
    p.kind = kind; p.target = target; p.speed = speed; p.onHit = onHit; p.t = 0; p.spin = 0;
    p.group.position.copy(from);
    p.start = from.clone();
    p.arc = arc;
    for (const k in p.parts) p.parts[k].visible = k === kind;
    p.group.visible = true;
    this.active.push(p);
    if (this.particles) this.particles.burst(from, 4, { color: KIND_COLOR[kind] || 0xffffff, speed: 2, size: 0.1, gravity: 4, life: 0.35 });
    return p;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      const tgt = p.target;
      if (!tgt || !tgt.alive) { this._release(i); continue; }
      const tp = tgt.hitPoint;
      _dir.subVectors(tp, p.group.position);
      const dist = _dir.length();
      const step = p.speed * dt;
      if (dist <= step + 0.15) {
        if (this.particles) {
          this.particles.burst(tp, 6, { color: KIND_COLOR[p.kind] || 0xffffff, speed: 3, size: 0.13, gravity: 8, life: 0.4 });
          this.particles.ring(tp, { color: KIND_COLOR[p.kind] || 0xffffff, radius: 0.7, duration: 0.22, y: tp.y });
        }
        if (p.onHit) p.onHit(tgt, p);
        this._release(i);
        continue;
      }
      _dir.normalize();
      p.group.position.addScaledVector(_dir, step);
      // pequena curva para cima no meio da trajetória
      p.t += dt;
      p.group.position.y += Math.sin(Math.min(1, p.t * 2) * Math.PI) * p.arc * dt;
      p.spin += dt * 10;
      p.group.rotation.y = Math.atan2(_dir.x, _dir.z);
      p.group.rotation.z = Math.sin(p.spin) * 0.3;
    }
  }

  _release(i) {
    const p = this.active[i];
    p.group.visible = false;
    p.target = null; p.onHit = null;
    this.active.splice(i, 1);
    this.free.push(p);
  }

  clear() { while (this.active.length) this._release(this.active.length - 1); }
  get count() { return this.active.length; }
}
