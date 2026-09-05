// ============================================================
// ProceduralRig — o BONECO (só construção): primitivas, materiais, partes com
// pivô, pose de descanso e a transformação do MODO JURÁSSICO.
// Não anima nada: quem move as partes é ProceduralAnimator + ProceduralAnimations.
// Estrutura:
//   root (facing / posição)
//   └ model (offsets de animação)
//      ├ legL, legR        (pivô no quadril)
//      ├ body              (pivô na base do tronco)
//      │   ├ head          (pivô no pescoço) → olhos, cabelo, barba, chapéu...
//      │   ├ armL, armR    (pivô no ombro) → mão grande → weapon/accessory
//      │   └ acessórios no tronco (gravata, capa, ring light, cauda...)
// ============================================================
import * as THREE from 'three';
import { G, mat, basicMat, textTexture } from '../../core/Assets.js';

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
  teamBand: true,        // faixa na cor do time no braço esquerdo (identidade sem pintar o corpo)
  eyeStyle: 'normal',    // 'normal' | 'angry' | 'sleepy'
  mouth: 'smile',        // 'smile' | 'shout' | 'flat'
};

export class ProceduralRig {
  constructor(spec = {}, globalHeadScale = 1.4) {
    this.spec = { ...DEFAULT_SPEC, ...spec };
    this.globalHeadScale = globalHeadScale;
    this.root = new THREE.Group();
    this.model = new THREE.Group();
    this.root.add(this.model);
    this.parts = {};
    this.rest = {};          // pose de descanso por parte: { pos, rot, scale }
    this.materials = [];     // clonados por boneco (flash individual via emissive)
    this.jurassic = false;
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
    // faixa de time (braçadeira) no braço esquerdo — 1 mesh, nunca o corpo inteiro
    if (s.teamBand) {
      const band = new THREE.Mesh(G.cylinder(0.115, 0.115, 0.14, 8), this._mat(s.teamColor));
      band.position.y = -armLen * 0.36;
      band.castShadow = false;
      P.armL.add(band);
      P.teamBand = band;
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

  // ---------------- POSE ----------------
  // Volta TODAS as partes e o `model` à pose de descanso. Chamado no início de cada
  // frame pelo animator: nenhuma animação acumula transform sobre a anterior.
  resetPose() {
    const P = this.parts, R = this.rest;
    for (const k in R) {
      const o = P[k]; if (!o) continue;
      o.position.copy(R[k].pos); o.rotation.copy(R[k].rot); o.scale.copy(R[k].scale);
    }
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
  }

  // emissive em todos os materiais do boneco (flash de dano); `null` desliga
  setEmissive(colorHex) {
    for (const m of this.materials) if (m.emissive) m.emissive.setHex(colorHex == null ? 0x000000 : colorHex);
  }

  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    // materiais não são "disposed" de propósito: evita recompilar shaders a cada spawn
    this.materials.length = 0;
  }
}
