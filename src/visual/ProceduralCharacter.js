// ============================================================
// ProceduralCharacter — boneco cartunesco feito só com primitivas.
// Estrutura:
//   root (facing / posição)
//   └ model (offsets de animação)
//      ├ legL, legR        (pivô no quadril)
//      ├ body              (pivô na base do tronco)
//      │   ├ head          (pivô no pescoço) → olhos, cabelo, barba, chapéu...
//      │   ├ armL, armR    (pivô no ombro) → mão grande → weapon/accessory
//      │   └ acessórios no tronco (gravata, capa, ring light, cauda...)
// Animações: rotação/translação das partes a partir de uma pose de descanso.
// ============================================================
import * as THREE from 'three';
import { G, mat, basicMat, textTexture } from '../core/Assets.js';

const DEFAULT_SPEC = {
  scale: 1,
  headScale: 1,          // multiplicado por Config.visual.headScale
  skin: 0xf1c27d,
  shirt: 0x4a6fa5,
  pants: 0x2f3542,
  shoes: 0x1e1e1e,
  hairColor: 0x2b1d14,
  hair: 'short',         // 'short' | 'side' | 'bald' | 'cap' | null
  beard: false,
  glasses: false,
  sunglasses: false,
  bodyType: 'normal',    // 'normal' | 'belly' | 'big' | 'small'
  cape: null,            // cor da capa ou null
  tie: null,             // cor da gravata ou null
  suit: false,
  weapon: null,          // 'phone' | 'mic' | 'pen' | 'sign' | 'flag' | 'papers'
  accessory: null,       // 'briefcase' | 'ringlight' | 'cap' | 'megaphone'
  flagColor: 0xffffff,
  signText: 'JÁ ERA',
  teamColor: 0xffffff,
  eyeStyle: 'normal',    // 'normal' | 'angry' | 'sleepy'
  mouth: 'smile',        // 'smile' | 'shout' | 'flat'
};

export class ProceduralCharacter {
  constructor(spec = {}, globalHeadScale = 1.4) {
    this.spec = { ...DEFAULT_SPEC, ...spec };
    this.globalHeadScale = globalHeadScale;
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);
    this.parts = {};
    this.rest = {};
    this.anim = 'idle';
    this.animTime = 0;
    this.attackWindup = 0.25;
    this.attackDuration = 0.6;
    this.walkFactor = 1;
    this.hitT = 0;
    this.hitStrength = 1;
    this.flashT = 0;
    this.specialKind = 'default';
    this.specialDuration = 1;
    this.stunned = false;
    this.time = Math.random() * 10;
    this.materials = [];
    this.build();
  }

  // ---------------- CONSTRUÇÃO ----------------
  build() {
    const s = this.spec;
    const P = this.parts;
    const skin = this._mat(s.skin);
    const shirt = this._mat(s.suit ? s.shirt : s.shirt);
    const pants = this._mat(s.pants);
    const shoes = this._mat(s.shoes);

    const bodyW = { small: 0.85, normal: 1, belly: 1.25, big: 1.35 }[s.bodyType] || 1;
    const bodyH = { small: 0.9, normal: 1, belly: 1.0, big: 1.15 }[s.bodyType] || 1;
    this.legH = 0.5 * bodyH;
    const bodyR = 0.32 * bodyW;
    const bodyLen = 0.45 * bodyH;
    this.bodyTop = this.legH + bodyLen + bodyR * 2;

    // pernas
    for (const side of ['L', 'R']) {
      const g = new THREE.Group();
      const sx = side === 'L' ? -1 : 1;
      g.position.set(sx * 0.16 * bodyW, this.legH, 0);
      const leg = new THREE.Mesh(G.capsule(0.11, this.legH - 0.2, 4), pants);
      leg.position.y = -this.legH / 2 + 0.05;
      leg.castShadow = true;
      g.add(leg);
      const foot = new THREE.Mesh(G.box(0.3, 0.16, 0.42), shoes);
      foot.position.set(0, -this.legH + 0.08, 0.08);
      foot.castShadow = true;
      g.add(foot);
      this.model.add(g);
      P['leg' + side] = g;
    }

    // tronco (pivô na base)
    const body = new THREE.Group();
    body.position.set(0, this.legH, 0);
    const torso = new THREE.Mesh(G.capsule(bodyR, bodyLen, 6), shirt);
    torso.position.y = bodyLen / 2 + bodyR;
    torso.castShadow = true;
    body.add(torso);
    if (s.bodyType === 'belly') {
      const belly = new THREE.Mesh(G.sphere(bodyR * 0.95, 10), shirt);
      belly.position.set(0, bodyLen * 0.5 + bodyR * 0.6, bodyR * 0.35);
      belly.castShadow = true;
      body.add(belly);
    }
    if (s.tie) {
      const tie = new THREE.Mesh(G.box(0.1, 0.42, 0.05), this._mat(s.tie));
      tie.position.set(0, bodyLen + bodyR * 0.6, bodyR + 0.02);
      body.add(tie);
      const knot = new THREE.Mesh(G.box(0.14, 0.1, 0.06), this._mat(s.tie));
      knot.position.set(0, bodyLen + bodyR * 0.6 + 0.24, bodyR + 0.02);
      body.add(knot);
    }
    if (s.suit) {
      // lapelas do terno (duas faixas claras)
      const lap = this._mat(0xf4f4f4);
      for (const sx of [-1, 1]) {
        const l = new THREE.Mesh(G.box(0.1, 0.5, 0.04), lap);
        l.position.set(sx * 0.1, bodyLen + bodyR * 0.5, bodyR + 0.01);
        l.rotation.z = sx * 0.25;
        body.add(l);
      }
    }
    if (s.cape) {
      const cape = new THREE.Mesh(G.box(bodyR * 2.6, bodyLen + bodyR * 2.2, 0.06), this._mat(s.cape, { side: THREE.DoubleSide }));
      cape.position.set(0, (bodyLen + bodyR * 2) * 0.45, -bodyR - 0.08);
      cape.castShadow = true;
      body.add(cape);
      P.cape = cape;
    }
    this.model.add(body);
    P.body = body;

    // braços (pivô no ombro)
    const armLen = 0.45 * bodyH;
    for (const side of ['L', 'R']) {
      const g = new THREE.Group();
      const sx = side === 'L' ? -1 : 1;
      g.position.set(sx * (bodyR + 0.06), bodyLen + bodyR * 1.5, 0);
      const arm = new THREE.Mesh(G.capsule(0.09, armLen - 0.15, 4), shirt);
      arm.position.y = -armLen / 2;
      arm.castShadow = true;
      g.add(arm);
      const hand = new THREE.Mesh(G.sphere(0.17, 8), skin);
      hand.position.y = -armLen - 0.05;
      hand.castShadow = true;
      g.add(hand);
      body.add(g);
      P['arm' + side] = g;
      P['hand' + side] = hand;
    }

    // cabeça (pivô no pescoço)
    const head = new THREE.Group();
    head.position.set(0, bodyLen + bodyR * 2 - 0.05, 0);
    const hs = 0.32 * this.spec.headScale * this.globalHeadScale;
    this.headRadius = hs;
    const skull = new THREE.Mesh(G.sphere(1, 14), skin);
    skull.scale.setScalar(hs);
    skull.position.y = hs * 0.95;
    skull.castShadow = true;
    head.add(skull);
    P.skull = skull;
    this._buildFace(head, hs);
    this._buildHair(head, hs);
    body.add(head);
    P.head = head;
    this.height = this.bodyTop + hs * 2;

    // arma / acessório na mão direita
    this._buildWeapon();
    this._buildAccessory();

    // pose de descanso
    for (const k in P) {
      const o = P[k];
      this.rest[k] = { pos: o.position.clone(), rot: o.rotation.clone(), scale: o.scale.clone() };
    }
    this.root.scale.setScalar(this.spec.scale);
  }

  // materiais são clonados por personagem para permitir flash individual (emissive)
  _mat(color, opts) {
    const key = `${color}_${opts ? JSON.stringify(opts) : ''}`;
    this._matMap = this._matMap || new Map();
    if (this._matMap.has(key)) return this._matMap.get(key);
    const m = mat(color, opts).clone();
    this._matMap.set(key, m);
    this.materials.push(m);
    return m;
  }

  _buildFace(head, hs) {
    const s = this.spec;
    const eyeWhite = this._mat(0xffffff);
    const pupil = basicMat(0x111111);
    const ey = hs * 1.05, ez = hs * 0.82;
    for (const sx of [-1, 1]) {
      if (s.sunglasses) continue;
      const e = new THREE.Mesh(G.sphere(0.09, 8), eyeWhite);
      e.position.set(sx * hs * 0.38, ey, ez);
      e.scale.setScalar(hs / 0.45);
      head.add(e);
      const p = new THREE.Mesh(G.sphere(0.045, 6), pupil);
      p.position.set(sx * hs * 0.38, ey, ez + 0.08 * (hs / 0.45));
      p.scale.setScalar(hs / 0.45);
      head.add(p);
      if (s.eyeStyle === 'angry') {
        const brow = new THREE.Mesh(G.box(0.16, 0.04, 0.04), basicMat(s.hairColor));
        brow.position.set(sx * hs * 0.38, ey + 0.13 * (hs / 0.45), ez + 0.02);
        brow.rotation.z = sx * 0.5;
        brow.scale.setScalar(hs / 0.45);
        head.add(brow);
      }
    }
    if (s.sunglasses) {
      const gl = new THREE.Mesh(G.box(hs * 1.3, hs * 0.35, 0.08), basicMat(0x111111));
      gl.position.set(0, ey, ez);
      head.add(gl);
    }
    if (s.glasses) {
      const fr = this._mat(0x222222);
      for (const sx of [-1, 1]) {
        const r = new THREE.Mesh(G.torus(0.12, 0.02, 6, 12), fr);
        r.position.set(sx * hs * 0.38, ey, ez + 0.1);
        r.scale.setScalar(hs / 0.45);
        head.add(r);
      }
    }
    // nariz
    const nose = new THREE.Mesh(G.sphere(0.07, 6), this._mat(s.skin));
    nose.position.set(0, ey - hs * 0.22, hs * 0.98);
    nose.scale.setScalar(hs / 0.45 * (s.bodyType === 'belly' ? 1.4 : 1));
    head.add(nose);
    // boca
    const mouthMat = basicMat(0x5a1e1e);
    let mouth;
    if (s.mouth === 'shout') mouth = new THREE.Mesh(G.sphere(0.09, 8), mouthMat);
    else if (s.mouth === 'flat') mouth = new THREE.Mesh(G.box(0.18, 0.035, 0.04), mouthMat);
    else { mouth = new THREE.Mesh(G.torus(0.1, 0.025, 4, 10, ), mouthMat); mouth.rotation.z = Math.PI; mouth.scale.y = 0.6; }
    mouth.position.set(0, ey - hs * 0.55, hs * 0.86);
    mouth.scale.multiplyScalar(hs / 0.45);
    head.add(mouth);
    this.parts.mouth = mouth;
    // barba
    if (s.beard) {
      const beard = new THREE.Mesh(G.sphere(1, 10), this._mat(s.hairColor));
      beard.scale.set(hs * 0.95, hs * 0.75, hs * 0.85);
      beard.position.set(0, ey - hs * 0.6, hs * 0.35);
      head.add(beard);
    }
  }

  _buildHair(head, hs) {
    const s = this.spec;
    const hairMat = this._mat(s.hairColor);
    const top = hs * 0.95;
    if (s.hair === 'short') {
      const h = new THREE.Mesh(G.sphere(1, 10), hairMat);
      h.scale.set(hs * 1.02, hs * 0.7, hs * 1.02);
      h.position.set(0, top + hs * 0.35, -hs * 0.1);
      head.add(h);
    } else if (s.hair === 'side') {
      const h = new THREE.Mesh(G.sphere(1, 10), hairMat);
      h.scale.set(hs * 1.03, hs * 0.55, hs * 1.0);
      h.position.set(hs * 0.1, top + hs * 0.45, -hs * 0.05);
      head.add(h);
      const tuft = new THREE.Mesh(G.box(hs * 0.5, hs * 0.2, hs * 0.5), hairMat);
      tuft.position.set(-hs * 0.4, top + hs * 0.75, hs * 0.3);
      tuft.rotation.z = 0.4;
      head.add(tuft);
    } else if (s.hair === 'bald') {
      // brilho careca
      const shine = new THREE.Mesh(G.sphere(0.06, 6), basicMat(0xffffff));
      shine.position.set(-hs * 0.35, top + hs * 0.7, hs * 0.45);
      head.add(shine);
    }
    if (s.hair === 'cap' || s.accessory === 'cap') {
      const cap = new THREE.Mesh(G.sphere(1, 10), this._mat(s.teamColor));
      cap.scale.set(hs * 1.05, hs * 0.6, hs * 1.05);
      cap.position.set(0, top + hs * 0.45, 0);
      head.add(cap);
      const bill = new THREE.Mesh(G.box(hs * 1.1, 0.05, hs * 0.6), this._mat(s.teamColor));
      bill.position.set(0, top + hs * 0.45, hs * 0.9);
      head.add(bill);
    }
    if (s.accessory === 'ringlight') {
      const ring = new THREE.Mesh(G.torus(hs * 1.6, 0.06, 8, 24), basicMat(0xfff6d5));
      ring.position.set(0, top + hs * 0.3, -hs * 1.6);
      head.add(ring);
      const stick = new THREE.Mesh(G.cylinder(0.04, 0.04, 2.2, 6), this._mat(0x333333));
      stick.position.set(0, top - hs * 1.6, -hs * 1.6);
      head.add(stick);
      this.parts.ringlight = ring;
    }
  }

  _buildWeapon() {
    const s = this.spec;
    const hand = this.parts.handR;
    if (!s.weapon || !hand) return;
    const w = new THREE.Group();
    switch (s.weapon) {
      case 'phone': {
        const ph = new THREE.Mesh(G.box(0.22, 0.4, 0.05), this._mat(0x222222));
        ph.position.set(0, 0.1, 0.12);
        ph.rotation.x = -0.4;
        w.add(ph);
        const scr = new THREE.Mesh(G.box(0.18, 0.32, 0.02), basicMat(0x5ce27a));
        scr.position.set(0, 0.1, 0.15); scr.rotation.x = -0.4;
        w.add(scr);
        break;
      }
      case 'mic': {
        const st = new THREE.Mesh(G.cylinder(0.04, 0.05, 0.45, 6), this._mat(0x333333));
        st.position.set(0, 0.2, 0.05); st.rotation.x = -0.4; w.add(st);
        const ball = new THREE.Mesh(G.sphere(0.13, 8), this._mat(0x777777));
        ball.position.set(0, 0.45, 0.15); w.add(ball);
        break;
      }
      case 'pen': {
        const g = new THREE.Group();
        const body = new THREE.Mesh(G.cylinder(0.09, 0.09, 1.9, 8), this._mat(0x1b1b3a));
        body.position.y = 0.6; g.add(body);
        const clip = new THREE.Mesh(G.box(0.04, 0.5, 0.04), this._mat(0xffd700));
        clip.position.set(0.1, 1.0, 0); g.add(clip);
        const tip = new THREE.Mesh(G.cone(0.09, 0.3, 8), this._mat(0xffd700));
        tip.position.y = -0.5; tip.rotation.x = Math.PI; g.add(tip);
        const nib = new THREE.Mesh(G.cone(0.03, 0.12, 6), this._mat(0x222222));
        nib.position.y = -0.7; nib.rotation.x = Math.PI; g.add(nib);
        g.rotation.x = 0.9; g.position.set(0.1, 0.1, 0.2);
        w.add(g);
        break;
      }
      case 'sign': {
        const stick = new THREE.Mesh(G.cylinder(0.03, 0.03, 0.9, 5), this._mat(0x9b7653));
        stick.position.y = 0.4; w.add(stick);
        const board = new THREE.Mesh(G.box(0.7, 0.45, 0.04), new THREE.MeshLambertMaterial({ map: textTexture(s.signText, { w: 256, h: 160, font: 'bold 34px Arial', bg: '#fff5c2' }) }));
        board.position.y = 0.95; w.add(board);
        break;
      }
      case 'flag': {
        const stick = new THREE.Mesh(G.cylinder(0.03, 0.03, 1.2, 5), this._mat(0x9b7653));
        stick.position.y = 0.5; w.add(stick);
        const flag = new THREE.Mesh(G.box(0.7, 0.45, 0.03), this._mat(s.flagColor));
        flag.position.set(0.35, 0.9, 0); w.add(flag);
        this.parts.flag = flag;
        break;
      }
      case 'papers': {
        for (let i = 0; i < 3; i++) {
          const p = new THREE.Mesh(G.box(0.3, 0.4, 0.01), this._mat(0xfdfdf5));
          p.position.set(0, 0.15, 0.1 + i * 0.02); p.rotation.z = (i - 1) * 0.2; w.add(p);
        }
        break;
      }
      case 'megaphone': {
        const c = new THREE.Mesh(G.cone(0.22, 0.45, 8), this._mat(0xd94a4a));
        c.position.set(0, 0.2, 0.3); c.rotation.x = Math.PI / 2 + 0.3; w.add(c);
        break;
      }
    }
    hand.add(w);
    this.parts.weapon = w;
  }

  _buildAccessory() {
    const s = this.spec;
    if (s.accessory === 'briefcase' && this.parts.handL) {
      const bc = new THREE.Mesh(G.box(0.45, 0.35, 0.14), this._mat(0x6b3e1e));
      bc.position.set(0, -0.25, 0);
      this.parts.handL.add(bc);
      this.parts.accessory = bc;
    }
  }

  // ---------------- TRANSFORMAÇÃO (ex.: MODO JURÁSSICO) ----------------
  transformJurassic() {
    const P = this.parts;
    const green = this._mat(0x3f8f3a);
    const light = this._mat(0x9fd67a);
    // cauda
    const tail = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(G.sphere(0.28 - i * 0.05, 8), green);
      seg.position.set(0, -i * 0.1, -0.35 - i * 0.32);
      seg.castShadow = true;
      tail.add(seg);
    }
    tail.position.set(0, 0.5, -0.3);
    P.body.add(tail);
    P.tail = tail;
    this.rest.tail = { pos: tail.position.clone(), rot: tail.rotation.clone(), scale: tail.scale.clone() };
    // crista / espinhos na cabeça
    for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(G.cone(0.1, 0.3, 5), light);
      sp.position.set(0, this.headRadius * 1.9, -0.15 + i * 0.16 - 0.1);
      sp.rotation.x = -0.3;
      P.head.add(sp);
    }
    // dentes
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(G.cone(0.04, 0.12, 4), this._mat(0xffffff));
      t.position.set(sx * 0.08, this.headRadius * 0.45, this.headRadius * 0.95);
      t.rotation.x = Math.PI;
      P.head.add(t);
    }
    // bracinhos: encolhe os braços
    P.armL.scale.setScalar(0.55); P.armR.scale.setScalar(0.55);
    this.rest.armL.scale.setScalar(0.55); this.rest.armR.scale.setScalar(0.55);
    // pele esverdeada
    P.skull.material = green;
    for (const k of ['handL', 'handR']) P[k].material = green;
    // postura inclinada
    this.rest.body.rot.x = 0.35;
    this.rest.head.rot.x = -0.25;
    this.jurassic = true;
  }

  // ---------------- API DE ANIMAÇÃO ----------------
  setAnim(name, params = {}) {
    if (this.anim === 'death') return;
    if (name === this.anim && (name === 'idle' || name === 'walk')) { if (params.factor) this.walkFactor = params.factor; return; }
    this.anim = name;
    this.animTime = 0;
    if (name === 'attack') { this.attackWindup = params.windup ?? 0.25; this.attackDuration = params.duration ?? 0.6; }
    if (name === 'walk') this.walkFactor = params.factor ?? 1;
    if (name === 'special') { this.specialKind = params.kind ?? 'default'; this.specialDuration = params.duration ?? 1; }
  }

  hit(strength = 1) { this.hitT = 0.3; this.hitStrength = strength; }
  flash(color = 0xffffff, t = 0.1) { this.flashT = t; this.flashColor = color; }

  // ---------------- UPDATE ----------------
  update(dt) {
    this.time += dt;
    this.animTime += dt;
    const P = this.parts, R = this.rest;
    // volta à pose de descanso
    for (const k in R) {
      const o = P[k]; if (!o) continue;
      o.position.copy(R[k].pos); o.rotation.copy(R[k].rot); o.scale.copy(R[k].scale);
    }
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);

    const t = this.animTime;
    const T = this.time;
    switch (this.anim) {
      case 'idle': this._idle(T); break;
      case 'walk': this._walk(T); break;
      case 'attack': this._attack(t); break;
      case 'special': this._special(t); break;
      case 'victory': this._victory(T); break;
      case 'stun': this._stun(T); break;
      case 'recesso': this._recesso(T); break;
      case 'death': this._death(t); break;
    }
    // overlay de hit
    if (this.hitT > 0 && this.anim !== 'death') {
      this.hitT -= dt;
      const p = this.hitT / 0.3;
      const s = this.hitStrength;
      P.body.rotation.x += -0.5 * p * s;
      this.model.position.z += -0.15 * p * s;
      P.head.rotation.x += -0.4 * p * s;
      P.armL.rotation.x += -1.2 * p * s; P.armR.rotation.x += -1.2 * p * s;
      P.armL.rotation.z += -0.6 * p; P.armR.rotation.z += 0.6 * p;
    }
    // flash
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = this.flashT > 0;
      for (const m of this.materials) if (m.emissive) m.emissive.setHex(on ? this.flashColor : 0x000000);
      if (!on) this._flashOff = true;
    }
    // cauda balança
    if (P.tail) P.tail.rotation.y = Math.sin(T * 6) * 0.35;
    if (P.cape) P.cape.rotation.x = 0.15 + Math.sin(T * 5) * 0.08 + (this.anim === 'walk' ? 0.25 : 0);
    if (P.flag) P.flag.rotation.y = Math.sin(T * 8) * 0.25;
  }

  _idle(T) {
    const P = this.parts;
    const b = Math.sin(T * 2.2);
    this.model.position.y = b * 0.03;
    P.body.scale.y = 1 + b * 0.02;
    P.armL.rotation.z = -0.12 + Math.sin(T * 2.2) * 0.05;
    P.armR.rotation.z = 0.12 - Math.sin(T * 2.2) * 0.05;
    P.head.rotation.z = Math.sin(T * 1.1) * 0.06;
    P.head.rotation.y = Math.sin(T * 0.7) * 0.15;
  }

  _walk(T) {
    const P = this.parts;
    const f = 9 * Math.max(0.3, this.walkFactor);
    const s = Math.sin(T * f);
    const c = Math.cos(T * f);
    const amp = this.jurassic ? 0.5 : 0.7;
    P.legL.rotation.x = s * amp; P.legR.rotation.x = -s * amp;
    P.armL.rotation.x = -s * amp * 0.9; P.armR.rotation.x = s * amp * 0.9;
    P.armL.rotation.z = -0.15; P.armR.rotation.z = 0.15;
    this.model.position.y = Math.abs(c) * 0.08;
    P.body.rotation.x = 0.12 + (this.rest.body.rot.x);
    P.body.rotation.z = s * 0.06;
    P.head.rotation.z = -s * 0.08;
    P.head.rotation.x = -0.08;
  }

  _attack(t) {
    const P = this.parts;
    const w = this.attackWindup, d = this.attackDuration;
    let lean = 0, armX = 0, lunge = 0, armZ = 0;
    if (t < w) {                       // antecipação: recua e levanta o braço
      const p = t / w;
      const e = p * p;
      lean = -0.35 * e; armX = -2.4 * e; lunge = -0.12 * e; armZ = 0.5 * e;
    } else if (t < w + 0.14) {         // golpe: avança rápido
      const p = (t - w) / 0.14;
      const e = 1 - Math.pow(1 - p, 3);
      lean = -0.35 + 1.0 * e; armX = -2.4 + 3.4 * e; lunge = -0.12 + 0.55 * e; armZ = 0.5 - 0.5 * e;
    } else {                           // recuperação
      const p = Math.min(1, (t - w - 0.14) / Math.max(0.1, d - w - 0.14));
      const e = 1 - Math.pow(1 - p, 2);
      lean = 0.65 * (1 - e); armX = 1.0 * (1 - e); lunge = 0.43 * (1 - e);
    }
    P.body.rotation.x = lean + this.rest.body.rot.x;
    P.armR.rotation.x = armX; P.armR.rotation.z = armZ;
    P.armL.rotation.x = -armX * 0.3; P.armL.rotation.z = -0.3;
    this.model.position.z = lunge;
    P.legL.rotation.x = -lunge * 0.8; P.legR.rotation.x = lunge * 0.8;
    P.head.rotation.x = -lean * 0.4;
    if (P.weapon) P.weapon.rotation.x = -armX * 0.2;
  }

  _special(t) {
    const P = this.parts;
    const d = this.specialDuration;
    const p = Math.min(1, t / d);
    switch (this.specialKind) {
      case 'discurso': {  // levanta microfone, corpo empina, pulinho
        P.armR.rotation.x = -2.8; P.armR.rotation.z = 0.3;
        P.armL.rotation.x = -0.6 + Math.sin(t * 12) * 0.4; P.armL.rotation.z = -1.0;
        P.body.rotation.x = -0.2; P.head.rotation.x = -0.4;
        this.model.position.y = Math.abs(Math.sin(t * 10)) * 0.15;
        P.mouth && (P.mouth.scale.y = 1.5);
        break;
      }
      case 'motociata': { // aponta para frente, gesto exagerado
        P.armR.rotation.x = -1.6; P.armL.rotation.x = -1.6; P.armL.rotation.z = -0.4; P.armR.rotation.z = 0.4;
        P.body.rotation.x = 0.25; P.head.rotation.x = -0.2;
        this.model.position.y = Math.abs(Math.sin(t * 14)) * 0.1;
        break;
      }
      case 'suspenso': { // levanta a caneta gigante e bate
        const e = p < 0.5 ? p * 2 : 1 - (p - 0.5) * 2;
        P.armR.rotation.x = -3.0 * e; P.body.rotation.x = -0.3 * e + 0.6 * (1 - e) * (p > 0.5 ? 1 : 0);
        P.head.rotation.x = -0.3 * e;
        break;
      }
      case 'jurassico': { // rugido: cresce e balança
        const g = 1 + Math.sin(p * Math.PI) * 0.25;
        this.model.scale.set(g, g, g);
        P.head.rotation.x = -0.6 * Math.sin(p * Math.PI);
        P.armL.rotation.x = -1.5; P.armR.rotation.x = -1.5;
        P.body.rotation.z = Math.sin(t * 25) * 0.08;
        break;
      }
      case 'engajamento': { // segura celular pra cima e pula
        P.armR.rotation.x = -3.0; P.armL.rotation.x = -3.0;
        this.model.position.y = Math.abs(Math.sin(t * 12)) * 0.2;
        P.head.rotation.z = Math.sin(t * 20) * 0.15;
        break;
      }
      default: {
        P.armR.rotation.x = -2.5; P.armL.rotation.x = -2.5;
        this.model.position.y = Math.abs(Math.sin(t * 10)) * 0.2;
      }
    }
  }

  _victory(T) {
    const P = this.parts;
    const j = Math.abs(Math.sin(T * 6));
    this.model.position.y = j * 0.35;
    P.armL.rotation.x = -2.6 + Math.sin(T * 12) * 0.3; P.armR.rotation.x = -2.6 - Math.sin(T * 12) * 0.3;
    P.armL.rotation.z = -0.5; P.armR.rotation.z = 0.5;
    P.legL.rotation.x = -j * 0.5; P.legR.rotation.x = -j * 0.5;
    P.head.rotation.z = Math.sin(T * 6) * 0.2;
    P.body.rotation.z = Math.sin(T * 6) * 0.1;
  }

  _stun(T) {
    const P = this.parts;
    P.head.rotation.z = Math.sin(T * 9) * 0.35;
    P.head.rotation.x = 0.25;
    P.body.rotation.z = Math.sin(T * 9) * 0.12;
    P.body.rotation.x = 0.15;
    P.armL.rotation.z = -0.9; P.armR.rotation.z = 0.9;
    P.armL.rotation.x = 0.3; P.armR.rotation.x = 0.3;
  }

  _recesso(T) {
    // olha o celular / coça a cabeça / senta (variação por instância)
    const P = this.parts;
    const v = this.recessoVariant ?? (this.recessoVariant = Math.floor(Math.random() * 3));
    if (v === 0) { // olhar celular
      P.armR.rotation.x = -1.7; P.armR.rotation.z = -0.4; P.head.rotation.x = 0.55;
      P.head.rotation.z = Math.sin(T * 2) * 0.05;
    } else if (v === 1) { // coçar a cabeça
      P.armR.rotation.x = -2.9; P.armR.rotation.z = 0.35 + Math.sin(T * 14) * 0.15; P.head.rotation.z = -0.25;
      P.head.rotation.x = -0.1;
    } else { // sentar
      this.model.position.y = -this.legH * 0.75;
      P.legL.rotation.x = -1.5; P.legR.rotation.x = -1.5;
      P.body.rotation.x = 0.1; P.armL.rotation.x = -0.5; P.armR.rotation.x = -0.5;
      P.head.rotation.y = Math.sin(T * 1.5) * 0.3;
    }
  }

  _death(t) {
    const P = this.parts;
    const v = this.deathVariant ?? (this.deathVariant = Math.random() < 0.5 ? 0 : 1);
    const p = Math.min(1, t / 0.9);
    const e = 1 - Math.pow(1 - p, 3);
    if (v === 0) { // tomba de costas com pulinho
      this.model.rotation.x = -Math.PI / 2 * e;
      this.model.position.y = Math.sin(p * Math.PI) * 0.6;
      this.model.position.z = -0.4 * e;
      P.armL.rotation.x = -2.5 * e; P.armR.rotation.x = -2.5 * e;
      P.legL.rotation.x = -0.4 * e; P.legR.rotation.x = 0.6 * e;
    } else { // gira e cai
      this.model.rotation.y = Math.PI * 4 * e;
      this.model.position.y = Math.sin(p * Math.PI) * 1.2;
      this.model.rotation.z = Math.PI / 2 * e;
      P.armL.rotation.z = -2.0 * e; P.armR.rotation.z = 2.0 * e;
    }
    if (t > 1.0) { // afunda no chão
      const s = Math.max(0, 1 - (t - 1.0) / 0.5);
      this.model.scale.setScalar(s);
    }
  }

  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    // materiais não são "disposed" de propósito: evita recompilar shaders a cada spawn
    this.materials.length = 0;
  }
}
