// Geometrias e materiais compartilhados (evita criar milhares de objetos iguais).
import * as THREE from 'three';

const geoCache = new Map();
const matCache = new Map();

export function geo(key, factory) {
  if (!geoCache.has(key)) geoCache.set(key, factory());
  return geoCache.get(key);
}

export const G = {
  sphere: (r = 1, s = 12) => geo(`sph_${r}_${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, Math.floor(s * 0.75)))),
  box: (w = 1, h = 1, d = 1) => geo(`box_${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)),
  capsule: (r = 0.5, l = 1, s = 6) => geo(`cap_${r}_${l}_${s}`, () => new THREE.CapsuleGeometry(r, l, s, Math.max(6, s * 2))),
  cylinder: (rt = 1, rb = 1, h = 1, s = 12) => geo(`cyl_${rt}_${rb}_${h}_${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)),
  cone: (r = 1, h = 1, s = 8) => geo(`cone_${r}_${h}_${s}`, () => new THREE.ConeGeometry(r, h, s)),
  plane: (w = 1, h = 1) => geo(`pl_${w}_${h}`, () => new THREE.PlaneGeometry(w, h)),
  torus: (r = 1, t = 0.2, s = 8, ts = 16) => geo(`tor_${r}_${t}_${s}_${ts}`, () => new THREE.TorusGeometry(r, t, s, ts)),
  ring: (ri = 1, ro = 1.2, s = 24) => geo(`ring_${ri}_${ro}_${s}`, () => new THREE.RingGeometry(ri, ro, s)),
};

export function mat(color, opts = {}) {
  const key = `${color}_${JSON.stringify(opts)}`;
  if (!matCache.has(key)) {
    const m = new THREE.MeshToonMaterial({ color, ...opts });
    matCache.set(key, m);
  }
  return matCache.get(key);
}

export function basicMat(color, opts = {}) {
  const key = `b_${color}_${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return matCache.get(key);
}

export function lambert(color, opts = {}) {
  const key = `l_${color}_${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return matCache.get(key);
}

// Mesh helper: cria mesh com sombras já configuradas
export function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Textura de texto (para placas engraçadas) — cache por texto
const texCache = new Map();
export function textTexture(text, { w = 256, h = 128, bg = '#f4e9c8', fg = '#2a2a2a', font = 'bold 26px Arial', lines = null } = {}) {
  const key = `${text}_${w}_${h}_${bg}_${fg}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ls = lines || text.split('\n');
  const lh = h / (ls.length + 1);
  ls.forEach((l, i) => ctx.fillText(l, w / 2, lh * (i + 1)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
