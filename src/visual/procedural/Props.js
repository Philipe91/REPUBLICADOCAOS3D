// ============================================================
// Props — armas e acessórios do boneco procedural (funções puras de CONSTRUÇÃO).
// Saíram do ProceduralRig para o rig ficar só com o corpo. Cada função recebe o rig
// (usa rig.spec, rig.parts, rig._mat) e adiciona meshes nas mãos/cabeça/tronco.
// Novo personagem = novo `case` aqui (ou reusar um existente pelo spec.weapon/accessory).
//   weapon:    phone · mic · pen · sign · flag · papers · megaphone · laco · guitar · tire · book
//   accessory: briefcase · ringlight · cap (na cabeça, ver _buildHair) · hat · headband · whistle
// ============================================================
import * as THREE from 'three';
import { G, basicMat, textTexture } from '../../core/Assets.js';

export function buildWeapon(rig) {
  const s = rig.spec;
  const hand = rig.parts.handR;
  if (!s.weapon || !hand) return;
  const M = (c, o) => rig._mat(c, o);
  const w = new THREE.Group();
  switch (s.weapon) {
    case 'phone': {
      const ph = new THREE.Mesh(G.box(0.22, 0.4, 0.05), M(0x222222));
      ph.position.set(0, 0.1, 0.12); ph.rotation.x = -0.4; w.add(ph);
      const scr = new THREE.Mesh(G.box(0.18, 0.32, 0.02), basicMat(0x5ce27a));
      scr.position.set(0, 0.1, 0.15); scr.rotation.x = -0.4; w.add(scr);
      break;
    }
    case 'mic': {
      const st = new THREE.Mesh(G.cylinder(0.04, 0.05, 0.45, 6), M(0x333333));
      st.position.set(0, 0.2, 0.05); st.rotation.x = -0.4; w.add(st);
      const ball = new THREE.Mesh(G.sphere(0.13, 8), M(0x777777));
      ball.position.set(0, 0.45, 0.15); w.add(ball);
      break;
    }
    case 'pen': {
      const g = new THREE.Group();
      const body = new THREE.Mesh(G.cylinder(0.09, 0.09, 1.9, 8), M(0x1b1b3a)); body.position.y = 0.6; g.add(body);
      const clip = new THREE.Mesh(G.box(0.04, 0.5, 0.04), M(0xffd700)); clip.position.set(0.1, 1.0, 0); g.add(clip);
      const tip = new THREE.Mesh(G.cone(0.09, 0.3, 8), M(0xffd700)); tip.position.y = -0.5; tip.rotation.x = Math.PI; g.add(tip);
      const nib = new THREE.Mesh(G.cone(0.03, 0.12, 6), M(0x222222)); nib.position.y = -0.7; nib.rotation.x = Math.PI; g.add(nib);
      g.rotation.x = 0.9; g.position.set(0.1, 0.1, 0.2);
      w.add(g);
      break;
    }
    case 'sign': {
      const stick = new THREE.Mesh(G.cylinder(0.03, 0.03, 0.9, 5), M(0x9b7653)); stick.position.y = 0.4; w.add(stick);
      const board = new THREE.Mesh(G.box(0.7, 0.45, 0.04), new THREE.MeshLambertMaterial({ map: textTexture(s.signText, { w: 256, h: 160, font: 'bold 34px Arial', bg: '#fff5c2' }) }));
      board.position.y = 0.95; w.add(board);
      break;
    }
    case 'flag': {
      const stick = new THREE.Mesh(G.cylinder(0.03, 0.03, 1.2, 5), M(0x9b7653)); stick.position.y = 0.5; w.add(stick);
      const flag = new THREE.Mesh(G.box(0.7, 0.45, 0.03), M(s.flagColor)); flag.position.set(0.35, 0.9, 0); w.add(flag);
      rig.parts.flag = flag;
      break;
    }
    case 'papers': {
      for (let i = 0; i < 3; i++) {
        const p = new THREE.Mesh(G.box(0.3, 0.4, 0.01), M(0xfdfdf5));
        p.position.set(0, 0.15, 0.1 + i * 0.02); p.rotation.z = (i - 1) * 0.2; w.add(p);
      }
      break;
    }
    case 'megaphone': {
      const c = new THREE.Mesh(G.cone(0.22, 0.45, 8), M(0xd94a4a));
      c.position.set(0, 0.2, 0.3); c.rotation.x = Math.PI / 2 + 0.3; w.add(c);
      break;
    }
    case 'laco': {   // laço de corda enrolado (agro boy)
      const rope = new THREE.Mesh(G.torus(0.22, 0.035, 6, 14), M(0xc9a15a));
      rope.position.set(0.05, -0.05, 0.05); rope.rotation.x = Math.PI / 2 + 0.6; w.add(rope);
      const rope2 = new THREE.Mesh(G.torus(0.19, 0.03, 6, 14), M(0xb88d48));
      rope2.position.set(0.08, -0.12, 0.02); rope2.rotation.x = Math.PI / 2 + 0.4; w.add(rope2);
      rig.parts.laco = rope;
      break;
    }
    case 'guitar': { // violão/guitarra (músico)
      const body = new THREE.Mesh(G.box(0.45, 0.55, 0.12), M(0xa0522d)); body.position.set(0, -0.05, 0.2); w.add(body);
      const hole = new THREE.Mesh(G.cylinder(0.1, 0.1, 0.02, 10), basicMat(0x222222)); hole.position.set(0, -0.02, 0.27); hole.rotation.x = Math.PI / 2; w.add(hole);
      const neck = new THREE.Mesh(G.box(0.08, 0.7, 0.06), M(0x5a3a1e)); neck.position.set(0.2, 0.5, 0.2); neck.rotation.z = -0.4; w.add(neck);
      break;
    }
    case 'tire': {   // pneu (manifestante dos pneus)
      const tire = new THREE.Mesh(G.torus(0.28, 0.11, 8, 16), M(0x1e1e1e));
      tire.position.set(0.1, 0.05, 0.15); tire.rotation.y = 0.5; w.add(tire);
      const hub = new THREE.Mesh(G.cylinder(0.15, 0.15, 0.08, 10), M(0x777777));
      hub.position.copy(tire.position); hub.rotation.copy(tire.rotation); hub.rotation.x += Math.PI / 2; w.add(hub);
      break;
    }
    case 'book': {   // livro grosso (pastor / professor)
      const cover = new THREE.Mesh(G.box(0.34, 0.44, 0.1), M(s.bookColor ?? 0x3b2a6b)); cover.position.set(0, 0.1, 0.12); w.add(cover);
      const pages = new THREE.Mesh(G.box(0.3, 0.4, 0.07), M(0xfdfdf5)); pages.position.set(0.03, 0.1, 0.12); w.add(pages);
      break;
    }
  }
  hand.add(w);
  rig.parts.weapon = w;
}

export function buildAccessory(rig) {
  const s = rig.spec;
  const P = rig.parts;
  const M = (c, o) => rig._mat(c, o);
  const hs = rig.headRadius;
  const top = hs * 0.95;
  if (s.accessory === 'briefcase' && P.handL) {
    const bc = new THREE.Mesh(G.box(0.45, 0.35, 0.14), M(0x6b3e1e));
    bc.position.set(0, -0.25, 0);
    P.handL.add(bc);
    P.accessory = bc;
  }
  if (s.accessory === 'hat' && P.head) {   // chapéu de cowboy (agro boy)
    const crown = new THREE.Mesh(G.cylinder(hs * 0.62, hs * 0.72, hs * 0.75, 12), M(s.hatColor ?? 0x8b5a2b));
    crown.position.set(0, top + hs * 0.7, 0); P.head.add(crown);
    const brim = new THREE.Mesh(G.cylinder(hs * 1.35, hs * 1.35, 0.05, 16), M(s.hatColor ?? 0x8b5a2b));
    brim.position.set(0, top + hs * 0.38, 0); brim.rotation.x = 0.12; P.head.add(brim);
    P.accessory = crown;
  }
  if (s.accessory === 'headband' && P.head) {   // faixa na testa (coach)
    const band = new THREE.Mesh(G.torus(hs * 0.98, hs * 0.13, 6, 18), M(s.bandColor ?? 0xf5b400));
    band.position.set(0, top + hs * 0.35, 0); band.rotation.x = Math.PI / 2 + 0.15; P.head.add(band);
    P.accessory = band;
  }
  if (s.accessory === 'whistle' && P.head) {   // apito no pescoço (coach / mascote)
    const cord = new THREE.Mesh(G.torus(hs * 0.55, 0.02, 4, 12), M(0x222222));
    cord.position.set(0, hs * 0.05, hs * 0.2); cord.rotation.x = Math.PI / 2 + 0.5; P.head.add(cord);
    const wh = new THREE.Mesh(G.box(0.12, 0.08, 0.14), M(0xd0d0d0));
    wh.position.set(0, -hs * 0.2, hs * 0.75); P.head.add(wh);
  }
}
