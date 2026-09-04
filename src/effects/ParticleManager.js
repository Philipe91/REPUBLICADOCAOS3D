// ============================================================
// ParticleManager — partículas cartunescas em UM InstancedMesh.
// Suporta: cubos (impacto), papéis (planos que giram), fumaça (cresce e some).
// Além disso: anéis expansivos (ondas de DISCURSO / impacto grande).
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { G } from '../core/Assets.js';

const MAX = 900;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _p = new THREE.Vector3();

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geom, material, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);

    // dados das partículas (arrays planos para performance)
    this.n = 0;
    this.px = new Float32Array(MAX); this.py = new Float32Array(MAX); this.pz = new Float32Array(MAX);
    this.vx = new Float32Array(MAX); this.vy = new Float32Array(MAX); this.vz = new Float32Array(MAX);
    this.life = new Float32Array(MAX); this.maxLife = new Float32Array(MAX);
    this.size = new Float32Array(MAX); this.grav = new Float32Array(MAX);
    this.rot = new Float32Array(MAX); this.rotSpeed = new Float32Array(MAX);
    this.kind = new Uint8Array(MAX); // 0 cubo, 1 papel, 2 fumaça
    this.col = new Float32Array(MAX * 3);

    // anéis
    this.rings = [];
    this.ringPool = [];
  }

  burst(pos, count, { color = 0xffffff, speed = 4, size = 0.2, gravity = 9, life = 0.8, paper = false, smoke = false, spread = 1, up = 1 } = {}) {
    count = Math.round(count * Config.visual.particleAmount);
    _c.setHex(color);
    for (let k = 0; k < count; k++) {
      if (this.n >= MAX) return;
      const i = this.n++;
      this.px[i] = pos.x + (Math.random() - 0.5) * 0.4 * spread;
      this.py[i] = pos.y + (Math.random() - 0.5) * 0.4 * spread;
      this.pz[i] = pos.z + (Math.random() - 0.5) * 0.4 * spread;
      const a = Math.random() * Math.PI * 2;
      const r = (0.4 + Math.random() * 0.6) * speed;
      this.vx[i] = Math.cos(a) * r; this.vz[i] = Math.sin(a) * r;
      this.vy[i] = (0.3 + Math.random() * 0.9) * speed * up;
      this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.6);
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.grav[i] = gravity;
      this.rot[i] = Math.random() * 6.28;
      this.rotSpeed[i] = (Math.random() - 0.5) * 12;
      this.kind[i] = paper ? 1 : smoke ? 2 : 0;
      const j = i * 3;
      const v = 0.85 + Math.random() * 0.3;
      this.col[j] = _c.r * v; this.col[j + 1] = _c.g * v; this.col[j + 2] = _c.b * v;
    }
  }

  ring(pos, { color = 0xffee88, radius = 5, duration = 0.7, y = 0.15 } = {}) {
    let m = this.ringPool.pop();
    if (!m) {
      m = new THREE.Mesh(G.ring(0.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
    }
    m.material.color.setHex(color);
    m.material.opacity = 0.85;
    m.position.set(pos.x, y, pos.z);
    m.scale.setScalar(0.2);
    m.visible = true;
    this.scene.add(m);
    this.rings.push({ m, t: 0, duration, radius });
  }

  update(dt) {
    // partículas
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        // remove trocando com a última
        const last = --this.n;
        if (i !== last) this._swap(i, last);
        continue;
      }
      const k = this.kind[i];
      if (k === 1) { // papel: gravidade fraca + arrasto + oscilação
        this.vy[i] -= this.grav[i] * dt;
        this.vx[i] += Math.sin(this.rot[i] * 3) * dt * 2;
        this.vx[i] *= 0.985; this.vz[i] *= 0.985;
        if (this.vy[i] < -1.6) this.vy[i] = -1.6;
      } else if (k === 2) { // fumaça: sobe devagar
        this.vy[i] -= this.grav[i] * dt;
        this.vx[i] *= 0.97; this.vz[i] *= 0.97;
      } else {
        this.vy[i] -= this.grav[i] * dt;
      }
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
      if (this.py[i] < 0.05 && k !== 2) { this.py[i] = 0.05; this.vy[i] *= -0.3; this.vx[i] *= 0.6; this.vz[i] *= 0.6; }
      this.rot[i] += this.rotSpeed[i] * dt;

      const t = this.life[i] / this.maxLife[i];
      let sx = this.size[i], sy = this.size[i], sz = this.size[i];
      if (k === 1) { sy = this.size[i] * 0.06; sx *= 1.2; }
      else if (k === 2) { const g = (1 - t) * 1.5 + 0.5; sx *= g; sy *= g; sz *= g; sx *= Math.min(1, t * 3); sy *= Math.min(1, t * 3); sz *= Math.min(1, t * 3); }
      else { const f = Math.min(1, t * 2.5); sx *= f; sy *= f; sz *= f; }

      _e.set(this.rot[i], this.rot[i] * 0.7, this.rot[i] * 0.3);
      _q.setFromEuler(_e);
      _s.set(sx, sy, sz);
      _p.set(this.px[i], this.py[i], this.pz[i]);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      _c.setRGB(this.col[i * 3], this.col[i * 3 + 1], this.col[i * 3 + 2]);
      this.mesh.setColorAt(i, _c);
      i++;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    // anéis
    for (let r = this.rings.length - 1; r >= 0; r--) {
      const ring = this.rings[r];
      ring.t += dt;
      const p = ring.t / ring.duration;
      if (p >= 1) {
        this.scene.remove(ring.m); ring.m.visible = false; this.ringPool.push(ring.m);
        this.rings.splice(r, 1);
        continue;
      }
      const e = 1 - Math.pow(1 - p, 3);
      ring.m.scale.setScalar(0.2 + ring.radius * e);
      ring.m.material.opacity = 0.85 * (1 - p);
    }
  }

  _swap(a, b) {
    const A = [this.px, this.py, this.pz, this.vx, this.vy, this.vz, this.life, this.maxLife, this.size, this.grav, this.rot, this.rotSpeed, this.kind];
    for (const arr of A) { const t = arr[a]; arr[a] = arr[b]; arr[b] = t; }
    for (let k = 0; k < 3; k++) { const t = this.col[a * 3 + k]; this.col[a * 3 + k] = this.col[b * 3 + k]; this.col[b * 3 + k] = t; }
  }

  clear() { this.n = 0; this.mesh.count = 0; for (const r of this.rings) { this.scene.remove(r.m); this.ringPool.push(r.m); } this.rings.length = 0; }
  get count() { return this.n; }
}
