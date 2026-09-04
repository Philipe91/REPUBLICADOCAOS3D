// ============================================================
// FloatingTextManager — números de dano e textos ("SUSPENSO!") em 3D
// usando Sprites com CanvasTexture (pool fixo, sem DOM).
// Memes de tela cheia usam UM único elemento DOM (#meme-text).
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';

const POOL = 40;

export class FloatingTextManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.free = [];
    for (let i = 0; i < POOL; i++) this.free.push(this._create());
    this.memeEl = document.getElementById('meme-text');
    this.memeTimer = 0;
    this.memeCooldown = 0;
  }

  _create() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 96;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 20;
    sprite.visible = false;
    this.scene.add(sprite);
    return { sprite, canvas, tex, t: 0, life: 1, vy: 2, x: 0, y: 0, z: 0, scale: 1 };
  }

  show(text, pos, { color = '#ffffff', outline = '#222222', size = 1, life = 0.9, rise = 2, font = 'bold 44px Arial' } = {}) {
    if (!Config.visual.floatingDamageEnabled) return;
    let it = this.free.pop();
    if (!it) { it = this.items.shift(); }
    const ctx = it.canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 96);
    ctx.font = font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = outline; ctx.lineJoin = 'round';
    ctx.strokeText(text, 128, 48);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 48);
    it.tex.needsUpdate = true;
    it.t = 0; it.life = life; it.vy = rise; it.scale = size;
    it.x = pos.x + (Math.random() - 0.5) * 0.6; it.y = pos.y; it.z = pos.z;
    it.sprite.visible = true;
    it.sprite.material.opacity = 1;
    this.items.push(it);
  }

  damage(amount, pos, big = false) {
    const txt = Math.round(amount).toString();
    this.show(txt, pos, { color: big ? '#ffd23f' : '#ffffff', size: big ? 1.5 : 1, font: big ? 'bold 56px Arial' : 'bold 44px Arial', rise: big ? 2.6 : 2 });
  }

  meme(text, { color = '#ffe066', duration = 1.3, force = false } = {}) {
    if (!force && this.memeCooldown > 0) return;
    this.memeEl.textContent = text;
    this.memeEl.style.color = color;
    this.memeEl.classList.remove('show');
    void this.memeEl.offsetWidth; // reinicia animação css
    this.memeEl.classList.add('show');
    this.memeTimer = duration;
    this.memeCooldown = force ? 0.5 : 3.5 / Math.max(0.05, Config.visual.memeFrequency);
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const p = it.t / it.life;
      if (p >= 1) {
        it.sprite.visible = false;
        this.items.splice(i, 1);
        this.free.push(it);
        continue;
      }
      const pop = p < 0.15 ? 1 + (1 - p / 0.15) * 0.6 : 1;
      const s = it.scale * pop;
      it.sprite.scale.set(2.4 * s, 0.9 * s, 1);
      it.sprite.position.set(it.x, it.y + it.vy * it.t, it.z);
      it.sprite.material.opacity = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    }
    if (this.memeTimer > 0) {
      this.memeTimer -= dt;
      if (this.memeTimer <= 0) this.memeEl.classList.remove('show');
    }
    if (this.memeCooldown > 0) this.memeCooldown -= dt;
  }

  clear() {
    for (const it of this.items) { it.sprite.visible = false; this.free.push(it); }
    this.items.length = 0;
    this.memeEl.classList.remove('show');
  }
}
