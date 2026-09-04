// ============================================================
// HealthBarManager — barras de vida de TODAS as unidades em 2 InstancedMeshes
// (fundo + preenchimento). Zero elementos DOM. Billboard para a câmera.
// ============================================================
import * as THREE from 'three';

const MAX = 400;
const _dummy = new THREE.Object3D();
const _c = new THREE.Color();
const GREEN = new THREE.Color(0x3ddc5a), YELLOW = new THREE.Color(0xf2c531), RED = new THREE.Color(0xe83b3b);

export class HealthBarManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.bg = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a1a1a, depthTest: false, depthWrite: false, transparent: true, opacity: 0.85 }), MAX);
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
  }

  update(units) {
    let n = 0;
    const q = this.camera.quaternion;
    for (let i = 0; i < units.length && n < MAX; i++) {
      const u = units[i];
      if (!u.alive || u.hideHealthBar) continue;
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
    this.bg.count = n; this.fill.count = n;
    this.bg.instanceMatrix.needsUpdate = true;
    this.fill.instanceMatrix.needsUpdate = true;
    if (this.fill.instanceColor) this.fill.instanceColor.needsUpdate = true;
  }
}
