import * as THREE from 'three';
import { Config } from '../config/Config.js';

// Aplica os valores do lil-gui na câmera todo frame + camera shake + slow-motion zoom
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.shake = 0;        // intensidade atual
    this.shakeTime = 0;
    this._offset = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this.zoomPunch = 0;    // usado na vitória
  }

  addShake(amount) {
    this.shake = Math.min(2.5, this.shake + amount * Config.camera.cameraShakeStrength);
  }

  update(dt) {
    const c = Config.camera;
    this.shakeTime += dt * 40;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 3.2);
      const s = this.shake * this.shake * 0.5;
      this._offset.set(
        Math.sin(this.shakeTime * 1.3) * s,
        Math.cos(this.shakeTime * 1.7) * s * 0.6,
        Math.sin(this.shakeTime * 0.9) * s * 0.4,
      );
    } else this._offset.set(0, 0, 0);

    this.camera.fov = c.cameraFov - this.zoomPunch;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(c.cameraX + this._offset.x, c.cameraY + this._offset.y, c.cameraZ + this._offset.z);
    this._target.set(c.cameraTargetX + this._offset.x, c.cameraTargetY, c.cameraTargetZ + this._offset.z);
    this.camera.lookAt(this._target);
    this.zoomPunch = THREE.MathUtils.damp(this.zoomPunch, 0, 2, dt);
  }
}
