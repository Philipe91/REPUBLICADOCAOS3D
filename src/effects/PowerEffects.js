// ============================================================
// PowerEffects — apresentação dos PODERES (só escuta o EventBus + lê game.powers.pens
// para desenhar marcador/sombra). Nunca aplica dano nem muda estado de jogo.
// CANETADA (≤ 1,5 s):
//   powerStart  → meme + apito + MARCADOR pulsante no chão (legível ≥ warnTime)
//   queda       → SOMBRA escura crescendo sob a caneta
//   powerImpact → onda + tinta + dourado + papéis + texto + shake + hit-stop (≤ 80 ms) + som
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';
import { G } from '../core/Assets.js';

const _p = new THREE.Vector3();

export class PowerEffects {
  constructor(game) {
    this.game = game;
    this.markers = new Map();   // pen → { marker, shadow }
    this.markerPool = [];
    this.shadowPool = [];
    bus.on('powerStart', (e) => this.onStart(e));
    bus.on('powerImpact', (e) => this.onImpact(e));
  }

  _marker() {
    let m = this.markerPool.pop();
    if (m) return m;
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(G.ring(0.8, 1, 40), new THREE.MeshBasicMaterial({ color: 0x9b7bff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; grp.add(ring);
    const inner = new THREE.Mesh(G.ring(0.28, 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xc9b6ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2; grp.add(inner);
    for (let i = 0; i < 4; i++) {
      const tick = new THREE.Mesh(G.box(0.08, 0.02, 0.5), new THREE.MeshBasicMaterial({ color: 0xc9b6ff, transparent: true, opacity: 0.95, depthWrite: false }));
      tick.position.set(Math.sin(i * Math.PI / 2) * 0.62, 0, Math.cos(i * Math.PI / 2) * 0.62);
      tick.rotation.y = i * Math.PI / 2; grp.add(tick);
    }
    grp.renderOrder = 3;
    this.game.scene.add(grp);
    return grp;
  }

  _shadow() {
    let s = this.shadowPool.pop();
    if (s) return s;
    s = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    s.rotation.x = -Math.PI / 2; s.renderOrder = 4;
    this.game.scene.add(s);
    return s;
  }

  onStart({ power, position, radius, pen }) {
    const g = this.game;
    if (power !== 'canetada') return;
    g.effects.text.meme('CANETADA!', { color: '#c9b6ff', force: true });
    g.audio.play('canetada');
    const marker = this._marker();
    marker.position.set(position.x, 0.12, position.z);
    marker.scale.setScalar(radius);
    marker.visible = true;
    const shadow = this._shadow();
    shadow.position.set(position.x, 0.1, position.z);
    shadow.visible = false;
    this.markers.set(pen, { marker, shadow, radius });
  }

  onImpact({ power, position, radius }) {
    const g = this.game;
    if (power !== 'canetada') return;
    const P = Config.powers.canetada;
    const pos = position.clone().setY(0.5);
    g.camera.addShake(P.shake);
    g.time.hitStop(Math.min(0.08, P.hitStop));
    g.effects.particles.burst(pos, 30, { color: 0x1b1b3a, speed: 7, size: 0.25, gravity: 9 });
    g.effects.particles.burst(pos, 20, { color: 0xffd700, speed: 6, size: 0.18, gravity: 9 });
    g.effects.particles.burst(pos, 16, { color: 0xfdfdf5, speed: 5, size: 0.3, gravity: 1.5, paper: true, life: 2.5 });
    g.effects.particles.ring(pos, { color: 0xc9b6ff, radius: radius * 1.2, duration: 0.5 });
    g.effects.text.show('CANETADA!', pos.clone().add(_p.set(0, 2.2, 0)), { color: '#c9b6ff', size: 1.4, life: 1.0, rise: 1.4, font: 'bold 40px Arial' });
    g.audio.play('bigHit');
    g.audio.play('stamp');
  }

  // por frame (visualDt): marcador pulsa durante o aviso; sombra cresce durante a queda; libera no fim
  update(dt) {
    for (const [pen, m] of this.markers) {
      if (!pen.active) { this._release(pen, m); continue; }
      if (pen.phase === 'warn') {
        const p = pen.t / Math.max(0.01, pen.warnTime);
        const pulse = 1 + Math.sin(pen.t * 22) * 0.06;
        m.marker.visible = true;
        m.marker.scale.setScalar(m.radius * (0.85 + 0.15 * p) * pulse);
        m.marker.rotation.y += dt * 1.5;
      } else if (pen.phase === 'fall') {
        m.marker.visible = true;
        const f = Math.min(1, (pen.t - pen.warnTime) / Math.max(0.01, pen.fallTime));
        m.shadow.visible = true;
        m.shadow.scale.setScalar(m.radius * (0.15 + 0.35 * f));
        m.shadow.material.opacity = 0.15 + 0.3 * f;
      } else {
        this._release(pen, m);
      }
    }
  }

  _release(pen, m) {
    m.marker.visible = false; m.shadow.visible = false;
    this.markerPool.push(m.marker); this.shadowPool.push(m.shadow);
    this.markers.delete(pen);
  }

  clear() { for (const [pen, m] of this.markers) this._release(pen, m); }
}
