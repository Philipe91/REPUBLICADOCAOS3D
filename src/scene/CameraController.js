import * as THREE from 'three';
import { Config } from '../config/Config.js';

// ============================================================
// Câmera LATERAL (ver comentário em Config.camera).
// Fonte ÚNICA da fórmula de posição: cameraPosition(). SceneSetup.createCamera e
// CameraController.update usam este helper — não duplicar a conta em outro lugar.
// ============================================================
export function cameraPosition(out = new THREE.Vector3(), c = Config.camera) {
  return out.set(
    c.cameraTargetX + c.cameraSide * c.cameraDistance,
    c.cameraHeight,
    c.cameraTargetZ + c.cameraSideOffset,
  );
}

export function cameraTarget(out = new THREE.Vector3(), c = Config.camera) {
  return out.set(c.cameraTargetX, c.cameraTargetY, c.cameraTargetZ);
}

// Aplica os valores do lil-gui na câmera todo frame + camera shake + slow-motion zoom
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.shake = 0;        // intensidade atual
    this.shakeTime = 0;
    this._offset = new THREE.Vector3();
    this._pos = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this.zoomPunch = 0;    // usado na vitória
  }

  addShake(amount) {
    this.shake = Math.min(2.5, this.shake + amount * Config.camera.cameraShakeStrength);
  }

  // aproximação curta (graus de fov) que decai sozinha (Config.camera.impulseDecay); nunca esconde as outras lanes
  impulseZoom(amount) {
    this.zoomPunch = Math.max(this.zoomPunch, Math.min(20, amount));
  }

  update(dt) {
    const c = Config.camera;
    this.shakeTime += dt * 40;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3.2);
      const s = this.shake * this.shake * 0.5;
      // shake pequeno: X é a profundidade da vista lateral, por isso o menor peso
      this._offset.set(
        Math.sin(this.shakeTime * 0.9) * s * 0.4,
        Math.cos(this.shakeTime * 1.7) * s * 0.6,
        Math.sin(this.shakeTime * 1.3) * s,
      );
    } else this._offset.set(0, 0, 0);

    this.camera.fov = c.cameraFov - this.zoomPunch;
    this.camera.updateProjectionMatrix();
    cameraPosition(this._pos, c).add(this._offset);
    this.camera.position.copy(this._pos);
    cameraTarget(this._target, c);
    this._target.x += this._offset.x;
    this._target.z += this._offset.z;
    this.camera.lookAt(this._target);
    this.zoomPunch = THREE.MathUtils.damp(this.zoomPunch, 0, Config.camera.impulseDecay, dt);
  }
}
