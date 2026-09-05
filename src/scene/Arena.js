// ============================================================
// PRAÇA DO CAOS — arena cartunesca inspirada (de longe) em Brasília.
// Formas simples, legibilidade das 3 lanes acima de tudo.
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { G, mat, lambert, mesh, textTexture, basicMat } from '../core/Assets.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class Arena {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'Arena';
    scene.add(this.root);
    this.laneHighlights = [];
    this.laneMarkers = new THREE.Group();
    this.laneMarkers.visible = false;
    this.root.add(this.laneMarkers);
    this.build();
  }

  // ---- geometria de campo derivada do Config ----
  get halfLen() { return Config.lanes.fieldLength / 2; }
  get baseZ() { return this.halfLen - 2; }             // centro da base
  get baseHalfDepth() { return 2.5; }
  get baseFront() { return this.baseZ - this.baseHalfDepth; } // face da base voltada ao campo
  laneX(i) { return (i - 1) * Config.lanes.laneSpacing; }
  spawnZ(team) {
    const z = this.baseFront - Config.lanes.spawnOffset;
    return team === 'player' ? z : -z;
  }

  build() {
    const r = this.root;
    const L = Config.lanes;
    const half = this.halfLen;
    const totalW = L.laneSpacing * 2 + L.laneWidth + 6;

    // chão gramado gigante
    const ground = mesh(G.plane(200, 200), lambert(0x7fb95a), 0, -0.02, 0);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    r.add(ground);

    // praça pavimentada (base das lanes)
    const plaza = mesh(G.box(totalW, 0.3, half * 2 + 6), lambert(0xd9d2c0), 0, -0.15, 0);
    plaza.castShadow = false;
    r.add(plaza);

    // meio-fio ao redor da praça
    const curbMat = lambert(0xf2eee2);
    const curbL = mesh(G.box(0.5, 0.35, half * 2 + 6), curbMat, -totalW / 2, 0.1, 0);
    const curbR = mesh(G.box(0.5, 0.35, half * 2 + 6), curbMat, totalW / 2, 0.1, 0);
    r.add(curbL, curbR);

    // lanes
    const laneLen = half * 2 - 3;
    const laneColors = [0xcfc6b0, 0xd6cdb8, 0xcfc6b0];
    for (let i = 0; i < 3; i++) {
      const x = this.laneX(i);
      const lane = mesh(G.box(L.laneWidth, 0.06, laneLen), lambert(laneColors[i]), x, 0.02, 0);
      lane.castShadow = false;
      r.add(lane);
      // faixas centrais tracejadas amarelas
      for (let z = -laneLen / 2 + 1; z < laneLen / 2; z += 3) {
        const dash = mesh(G.box(0.25, 0.02, 1.4), basicMat(0xf0c419), x, 0.06, z);
        dash.castShadow = false; dash.receiveShadow = false;
        r.add(dash);
      }
      // highlight plane (seleção de lane)
      const hl = new THREE.Mesh(G.plane(L.laneWidth + 0.6, laneLen), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      hl.rotation.x = -Math.PI / 2;
      hl.position.set(x, 0.09, 0);
      hl.userData.lane = i;
      hl.renderOrder = 2;
      r.add(hl);
      this.laneHighlights.push(hl);
      // marcadores de debug (linha central)
      const marker = mesh(G.box(0.08, 0.02, laneLen), basicMat(0xff00ff), x, 0.12, 0);
      this.laneMarkers.add(marker);
    }

    // canteiros entre lanes (jardins) com cercas-vivas e arvorezinhas
    const gardenW = L.laneSpacing - L.laneWidth;
    if (gardenW > 0.5) {
      for (let i = 0; i < 2; i++) {
        const x = (i === 0 ? -1 : 1) * L.laneSpacing / 2;
        const g = mesh(G.box(gardenW - 0.3, 0.18, laneLen - 2), lambert(0x6fae4c), x, 0.09, 0);
        g.castShadow = false;
        r.add(g);
        // gradinhas baixas
        for (let z = -laneLen / 2 + 2; z < laneLen / 2 - 1; z += 2.4) {
          const fence = mesh(G.box(gardenW - 0.5, 0.35, 0.08), lambert(0x3d3d3d), x, 0.35, z);
          fence.castShadow = false;
          r.add(fence);
        }
        // arvorezinhas
        for (let z = -laneLen / 2 + 3; z < laneLen / 2 - 2; z += 6) {
          this.addTree(x, z, 0.55 + Math.random() * 0.2);
        }
      }
    }

    // ============================================================
    // DECORAÇÃO — regra da CÂMERA LATERAL (ver Config.camera):
    // a câmera fica no lado +X e olha para −X, ou seja, o lado +X é o PRIMEIRO PLANO.
    // Nada alto (poste, placa, palanque, carro, cone, árvore, bandeira) pode ficar em
    // x > +TOTALW/2 dentro do campo: só decoração rasteira (papéis, meio-fio).
    // Todo o cenário vertical vive no lado −X (fundo, atrás da lane traseira) ou além
    // das bases (|z| > half), onde vira horizonte à esquerda e à direita da tela.
    // ============================================================
    const back = -totalW / 2 - 3.5;   // faixa de fundo (lado −X), atrás da lane traseira
    const back2 = back - 6;           // segunda fileira de fundo

    // fundo de cada lado: prédios governamentais fictícios (extremos horizontais da tela)
    this.addGovBuildings(-1);
    this.addGovBuildings(1);

    // postes: só na lateral do FUNDO (o lado +X ficaria na frente da câmera)
    for (let z = -half + 2; z <= half - 2; z += 7) this.addLampPost(back + 2.3, z);
    // postes além das bases, dando profundidade no horizonte
    for (const z of [-half - 6, half + 6]) { this.addLampPost(back + 2.3, z); this.addLampPost(6, z); }

    // carros, cones, palanques e placas — todos no fundo ou além das bases
    this.addCar(back - 2, -6, 0xd94a4a, Math.PI / 2);
    this.addCar(back - 3.5, 5, 0x3f6fd6, Math.PI / 2);
    this.addCar(back - 2.5, 14, 0xf0d53a, Math.PI / 2 + 0.2);
    this.addCar(4, -half - 8, 0x4fae62, 0);
    for (let i = 0; i < 6; i++) this.addCone(back + rand(-1.5, 0.5), rand(-16, 16));
    for (let i = 0; i < 4; i++) this.addCone(rand(-8, 8), (i < 2 ? -1 : 1) * (half + rand(4, 9)));
    this.addPalanque(back2 - 1, -14, true);
    this.addPalanque(back2 - 1, 13, true);
    // placas: em x negativo elas ficam VOLTADAS PARA A CÂMERA (addSign gira +Z → +X) e legíveis
    this.addSign(back - 0.5, -18, 'PROIBIDO\nESTACIONAR\n(exceto os importantes)');
    this.addSign(back - 0.5, -7, 'OBRAS\nDESDE 2009');
    this.addSign(back - 0.5, 4, 'ÁREA DE\nTRETA');
    this.addSign(back - 0.5, 16, 'NÃO VALE\nPRINT');
    // papéis: rasteiros (y = 0.03), podem ficar dos dois lados sem atrapalhar a leitura
    for (let i = 0; i < 40; i++) this.addPaper(rand(-totalW / 2 - 6, totalW / 2 + 5), rand(-half, half));
    // bandeiras genéricas: fundo e além das bases
    this.addFlag(back2, -half + 1, 0xffffff, 0x33aa55);
    this.addFlag(back2, half - 1, 0xffffff, 0x2bb3c0);
    this.addFlag(back2 - 5, -half - 7, 0xffffff, 0xf0c419);
    this.addFlag(back2 - 5, half + 7, 0xffffff, 0xe8772e);
    // gramado externo com árvores espalhadas — nunca entre a câmera e o campo
    for (let i = 0; i < 26; i++) {
      const x = rand(-60, back2 - 3); const z = rand(-60, 60);
      this.addTree(x, z, rand(0.9, 1.6));
    }
    // algumas árvores além das bases (horizonte nos extremos esquerdo/direito da tela)
    for (let i = 0; i < 10; i++) {
      const z = (i % 2 ? 1 : -1) * rand(half + 12, 55);
      this.addTree(rand(back2, 10), z, rand(0.9, 1.6));
    }
  }

  addTree(x, z, s) {
    const trunk = mesh(G.cylinder(0.12, 0.16, 0.8, 6), lambert(0x7a5230), x, 0.4 * s, z);
    trunk.scale.setScalar(s);
    const crown = mesh(G.sphere(0.6, 8), lambert([0x4f9a3a, 0x5fae45, 0x3f8a33][Math.floor(Math.random() * 3)]), x, (0.8 + 0.45) * s, z);
    crown.scale.set(s, s * 1.1, s);
    this.root.add(trunk, crown);
  }

  addLampPost(x, z) {
    const pole = mesh(G.cylinder(0.08, 0.1, 4, 6), lambert(0x555a60), x, 2, z);
    const arm = mesh(G.box(0.9, 0.08, 0.08), lambert(0x555a60), x + (x < 0 ? 0.4 : -0.4), 3.95, z);
    const lamp = mesh(G.box(0.5, 0.2, 0.3), basicMat(0xfff2b0), x + (x < 0 ? 0.8 : -0.8), 3.85, z);
    this.root.add(pole, arm, lamp);
  }

  addCone(x, z) {
    const c = mesh(G.cone(0.28, 0.7, 8), lambert(0xf07a2a), x, 0.35, z);
    const stripe = mesh(G.cylinder(0.17, 0.2, 0.12, 8), lambert(0xffffff), x, 0.45, z);
    this.root.add(c, stripe);
  }

  addCar(x, z, color, rot) {
    const g = new THREE.Group();
    g.add(mesh(G.box(1.6, 0.55, 3.2), lambert(color), 0, 0.5, 0));
    g.add(mesh(G.box(1.4, 0.5, 1.7), lambert(0xdfefff), 0, 1.0, -0.1));
    const wm = lambert(0x222222);
    for (const [wx, wz] of [[-0.8, 1], [0.8, 1], [-0.8, -1], [0.8, -1]]) {
      const w = mesh(G.cylinder(0.3, 0.3, 0.25, 10), wm, wx, 0.3, wz);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
    g.position.set(x, 0, z); g.rotation.y = rot;
    this.root.add(g);
  }

  addPalanque(x, z, mirror = false) {
    const g = new THREE.Group();
    g.add(mesh(G.box(4, 0.8, 3), lambert(0x8b5a2b), 0, 0.4, 0));
    const banner = mesh(G.box(4, 1.4, 0.1), new THREE.MeshLambertMaterial({ map: textTexture('VOTE EM\nALGUÉM', { bg: '#e94b4b', fg: '#ffffff' }) }), 0, 2.2, -1.4);
    g.add(banner);
    g.add(mesh(G.cylinder(0.06, 0.06, 2.2, 6), lambert(0x333333), -1.9, 1.9, -1.4));
    g.add(mesh(G.cylinder(0.06, 0.06, 2.2, 6), lambert(0x333333), 1.9, 1.9, -1.4));
    g.position.set(x, 0, z);
    g.rotation.y = mirror ? Math.PI / 2 : -Math.PI / 2;
    this.root.add(g);
  }

  addSign(x, z, text) {
    const g = new THREE.Group();
    g.add(mesh(G.cylinder(0.05, 0.05, 1.6, 6), lambert(0x666666), 0, 0.8, 0));
    const board = mesh(G.box(1.6, 0.9, 0.06), new THREE.MeshLambertMaterial({ map: textTexture(text, { font: 'bold 22px Arial' }) }), 0, 1.9, 0);
    g.add(board);
    g.position.set(x, 0, z);
    g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    this.root.add(g);
  }

  addPaper(x, z) {
    const p = mesh(G.plane(0.35, 0.45), lambert(0xfdfdf5, { side: THREE.DoubleSide }), x, 0.03, z);
    p.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
    p.castShadow = false;
    this.root.add(p);
  }

  addFlag(x, z, poleColor, flagColor) {
    const pole = mesh(G.cylinder(0.06, 0.08, 5, 6), lambert(0xdddddd), x, 2.5, z);
    const flag = mesh(G.box(1.4, 0.8, 0.05), lambert(flagColor), x + 0.75, 4.5, z);
    flag.userData.flag = true;
    this.root.add(pole, flag);
  }

  addGovBuildings(dir) {
    // dir -1 → atrás da base do bot (z negativo), +1 → atrás da base do jogador
    const zBase = dir * (this.halfLen + 9);
    const wall = lambert(0xf3f0e6);
    const glass = lambert(0x7fb8d8);
    // prédio central "congresso fictício": duas torres + cúpula + tigela
    const t1 = mesh(G.box(3, 12, 2.4), wall, -2.2, 6, zBase); this.root.add(t1);
    const t2 = mesh(G.box(3, 12, 2.4), wall, 2.2, 6, zBase); this.root.add(t2);
    for (let y = 1; y < 12; y += 1.4) {
      this.root.add(mesh(G.box(3.05, 0.5, 2.45), glass, -2.2, y, zBase));
      this.root.add(mesh(G.box(3.05, 0.5, 2.45), glass, 2.2, y, zBase));
    }
    const plat = mesh(G.box(22, 1.2, 8), wall, 0, 0.6, zBase); this.root.add(plat);
    const dome = mesh(G.sphere(3.2, 16), wall, -8, 1.2, zBase); dome.scale.y = 0.75; this.root.add(dome);
    const bowl = mesh(G.sphere(3.2, 16), wall, 8, 3.5, zBase); bowl.scale.y = 0.75; bowl.rotation.x = Math.PI; this.root.add(bowl);
    // palácios com colunas: ambos no lado −X (em +X ficariam colados na câmera lateral)
    for (const px of [-16, -31]) {
      const body = mesh(G.box(9, 4, 5), wall, px, 2, zBase + dir * 2); this.root.add(body);
      const roof = mesh(G.box(10, 0.5, 6), lambert(0xe8e2d0), px, 4.2, zBase + dir * 2); this.root.add(roof);
      for (let i = -4; i <= 4; i += 2) {
        const col = mesh(G.cylinder(0.25, 0.3, 4, 8), wall, px + i, 2, zBase - dir * 1.2);
        col.rotation.z = 0; this.root.add(col);
      }
      // bandeiras genéricas
      this.addFlag(px - 6, zBase - dir * 4, 0xffffff, px < -20 ? 0x33aa55 : 0xf0c419);
    }
    // gramado grande com espelho d'água (plano azul)
    const water = mesh(G.box(16, 0.1, 3), lambert(0x4aa0d8), 0, 0.02, zBase - dir * 6);
    water.castShadow = false;
    this.root.add(water);
  }

  // usado por Base.js e UnitManager
  update(dt, time) {
    // bandeiras balançam levemente
    // (barato: só um sin em poucas meshes)
    this._t = (this._t || 0) + dt;
  }

  setLaneHighlight(hovered, selecting) {
    for (let i = 0; i < 3; i++) {
      const m = this.laneHighlights[i].material;
      let o = 0;
      if (selecting) o = 0.12;
      if (hovered === i) o = 0.35;
      m.opacity = o;
    }
  }

  setDebugMarkers(v) { this.laneMarkers.visible = v; }
}
