// ============================================================
// HealthBarManager — barras de vida de TODAS as unidades em 2 InstancedMeshes
// (fundo + preenchimento) + 1 InstancedMesh de ANEL DE TIME no chão.
// Zero elementos DOM, 3 draw calls no total. Barras em billboard para a câmera;
// fundo da barra tingido com a cor do time (identidade a distância).
// ============================================================
import * as THREE from 'three';
import { Config, TEAM_COLORS } from '../config/Config.js';

const MAX = 400;
const _dummy = new THREE.Object3D();
const _c = new THREE.Color();
const GREEN = new THREE.Color(0x3ddc5a), YELLOW = new THREE.Color(0xf2c531), RED = new THREE.Color(0xe83b3b);
const TEAM = { player: new THREE.Color(TEAM_COLORS.player), bot: new THREE.Color(TEAM_COLORS.bot) };
const TEAM_DARK = { player: TEAM.player.clone().multiplyScalar(0.32), bot: TEAM.bot.clone().multiplyScalar(0.32) };

export class HealthBarManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.bg = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true, opacity: 0.85 }), MAX);
    this.fill = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }), MAX);
    for (const m of [this.bg, this.fill]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = false; m.receiveShadow = false;
      m.count = 0;
      scene.add(m);
    }
    this.bg.renderOrder = 10;
    this.fill.renderOrder = 11;
    // anel de time (plano no chão, já deitado na geometria: instância só posiciona/escala)
    const ringGeo = new THREE.RingGeometry(0.66, 0.92, 28);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: Config.visual.teamRingOpacity, depthWrite: false }), MAX);
    this.ring.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ring.frustumCulled = false;
    this.ring.castShadow = false; this.ring.receiveShadow = false;
    this.ring.count = 0;
    this.ring.renderOrder = 1;
    scene.add(this.ring);
  }

  update(units) {
    let n = 0, r = 0;
    const q = this.camera.quaternion;
    const ringOp = Config.visual.teamRingOpacity;
    if (this.ring.material.opacity !== ringOp) this.ring.material.opacity = ringOp;
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.alive) continue;
      // anel de time: toda unidade viva (inclusive militante cheio)
      if (r < MAX && ringOp > 0) {
        _dummy.position.set(u.pos.x, 0.04, u.pos.z);
        _dummy.quaternion.identity();
        const rs = Math.max(0.5, u.radius * 2.2);
        _dummy.scale.set(rs, 1, rs);
        _dummy.updateMatrix();
        this.ring.setMatrixAt(r, _dummy.matrix);
        this.ring.setColorAt(r, TEAM[u.team] || TEAM.player);
        r++;
      }
      if (n >= MAX || u.hideHealthBar) continue;
      const ratio = Math.max(0, u.hp / u.maxHp);
      if (ratio >= 0.999 && u.isSwarm) continue; // tropinhas cheias não mostram barra (menos poluição)
      const w = 0.9 * Math.max(0.7, u.visualScale);
      const h = 0.12;
      const y = u.pos.y + u.height * u.visualScale + 0.35;
      _dummy.position.set(u.pos.x, y, u.pos.z);
      _dummy.quaternion.copy(q);
      _dummy.scale.set(w + 0.06, h + 0.06, 1);
      _dummy.updateMatrix();
      this.bg.setMatrixAt(n, _dummy.matrix);
      this.bg.setColorAt(n, TEAM_DARK[u.team] || TEAM_DARK.player);

      _dummy.scale.set(w * ratio, h, 1);
      _dummy.translateX(-(w - w * ratio) / 2);
      _dummy.translateZ(0.01);
      _dummy.updateMatrix();
      this.fill.setMatrixAt(n, _dummy.matrix);
      if (ratio > 0.5) _c.copy(GREEN); else if (ratio > 0.25) _c.copy(YELLOW); else _c.copy(RED);
      if (u.stunned > 0) _c.setHex(0x9b7bff);
      this.fill.setColorAt(n, _c);
      n++;
    }
    this.bg.count = n; this.fill.count = n; this.ring.count = r;
    this.bg.instanceMatrix.needsUpdate = true;
    this.fill.instanceMatrix.needsUpdate = true;
    this.ring.instanceMatrix.needsUpdate = true;
    if (this.fill.instanceColor) this.fill.instanceColor.needsUpdate = true;
    if (this.bg.instanceColor) this.bg.instanceColor.needsUpdate = true;
    if (this.ring.instanceColor) this.ring.instanceColor.needsUpdate = true;
  }
}
