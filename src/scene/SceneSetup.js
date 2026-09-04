import * as THREE from 'three';
import { Config } from '../config/Config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3f4);
  scene.fog = new THREE.Fog(0x9fd8f0, 60, 140);

  const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x6a8f4a, 0.75);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
  sun.position.set(-18, 40, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 120;
  const s = 34;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0xcfe8ff, 0.35);
  fill.position.set(20, 15, -20);
  scene.add(fill);

  return { scene, sun, hemi };
}

export function createCamera() {
  const c = Config.camera;
  const camera = new THREE.PerspectiveCamera(c.cameraFov, window.innerWidth / window.innerHeight, 0.5, 300);
  camera.position.set(c.cameraX, c.cameraY, c.cameraZ);
  camera.lookAt(c.cameraTargetX, c.cameraTargetY, c.cameraTargetZ);
  return camera;
}
