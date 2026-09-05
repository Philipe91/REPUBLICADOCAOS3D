// ============================================================
// SEDE DO PODER — base de cada time, com estágios de dano
// e CRISE INSTITUCIONAL (desmonte exagerado) ao chegar a 0.
// ============================================================
import * as THREE from 'three';
import { Config, TEAM_COLORS } from '../config/Config.js';
import { G, lambert, mesh, textTexture, basicMat } from '../core/Assets.js';
import { bus } from '../core/EventBus.js';

export class Base {
  constructor(scene, arena, team, effects) {
    this.scene = scene;
    this.arena = arena;
    this.team = team;
    this.effects = effects;
    this.dir = team === 'player' ? 1 : -1;      // lado z
    this.z = arena.baseZ * this.dir;
    this.front = arena.baseFront * this.dir;      // z da face voltada ao campo
    this.maxHp = Config.base.baseHP;
    this.hp = this.maxHp;
    this.stage = 0;   // 0 normal, 1 rachaduras, 2 papéis, 3 sirene, 4 destruída
    this.destroyed = false;
    this.pieces = [];
    this.paperTimer = 0;
    this.smokeTimer = 0;
    this.flashTimer = 0;
    this.hitWobble = 0;
    this.time = 0;

    this.root = new THREE.Group();
    this.root.position.set(0, 0, this.z);
    this.root.rotation.y = team === 'player' ? 0 : Math.PI; // frente para o campo
    scene.add(this.root);
    this.build();
  }

  build() {
    const color = TEAM_COLORS[this.team];
    const W = Config.lanes.laneSpacing * 2 + Config.lanes.laneWidth + 1;
    this.wallMat = new THREE.MeshToonMaterial({ color: 0xf5f1e6 });
    this.accentMat = new THREE.MeshToonMaterial({ color });
    const wall = this.wallMat;

    const r = this.root;
    // plataforma
    r.add(mesh(G.box(W + 2, 0.5, 6), lambert(0xe6e0cf), 0, 0.25, 0));
    // bloco principal
    this.body = mesh(G.box(W, 4, 4), wall, 0, 2.5, 0.4);
    r.add(this.body);
    // porta central (frente = -z local, voltada para o campo)
    r.add(mesh(G.box(2.2, 3, 0.2), this.accentMat, 0, 2, -1.7));
    // janelas
    for (let x = -W / 2 + 2; x <= W / 2 - 2; x += 2.5) {
      if (Math.abs(x) < 2) continue;
      r.add(mesh(G.box(1.2, 1.4, 0.15), lambert(0x7fb8d8), x, 2.8, -1.65));
    }
    // colunas (peças destacáveis)
    this.pieces = [];
    for (let x = -W / 2 + 1.2; x <= W / 2 - 1.2; x += (W - 2.4) / 6) {
      const col = mesh(G.cylinder(0.32, 0.36, 4.2, 8), wall, x, 2.6, -2.4);
      r.add(col); this.pieces.push(col);
    }
    // teto
    this.roof = mesh(G.box(W + 1, 0.6, 5.5), this.accentMat, 0, 4.8, 0.2);
    r.add(this.roof); this.pieces.push(this.roof);
    // cúpula
    this.dome = mesh(G.sphere(2.2, 16), wall, 0, 5.1, 0.3); this.dome.scale.y = 0.7;
    r.add(this.dome); this.pieces.push(this.dome);
    // bandeira do time
    const pole = mesh(G.cylinder(0.06, 0.08, 4, 6), lambert(0xdddddd), 0, 7.6, 0.3);
    r.add(pole); this.pieces.push(pole);
    this.flag = mesh(G.box(1.6, 0.9, 0.05), this.accentMat, 0.85, 9.1, 0.3);
    r.add(this.flag); this.pieces.push(this.flag);
    // placa
    const sign = mesh(G.box(5, 1, 0.1), new THREE.MeshLambertMaterial({ map: textTexture('SEDE DO PODER', { w: 512, h: 100, font: 'bold 44px Arial', bg: '#2a2a2a', fg: '#ffe066' }) }), 0, 5.6, -2.9);
    r.add(sign); this.pieces.push(sign);
    // rachaduras (escondidas)
    this.cracks = [];
    for (let i = 0; i < 6; i++) {
      const c = mesh(G.box(0.12, 1.2 + Math.random(), 0.05), basicMat(0x3a3a3a), (Math.random() - 0.5) * (W - 3), 2 + Math.random() * 1.5, -1.62);
      c.rotation.z = (Math.random() - 0.5) * 1.2;
      c.visible = false; c.castShadow = false;
      r.add(c); this.cracks.push(c);
    }
    // sirene
    this.siren = new THREE.Group();
    this.siren.position.set(-W / 2 + 1.5, 5.4, -1);
    this.siren.add(mesh(G.cylinder(0.3, 0.35, 0.3, 8), lambert(0x333333), 0, 0, 0));
    this.sirenLight = mesh(G.sphere(0.35, 8), new THREE.MeshBasicMaterial({ color: 0xff2222 }), 0, 0.35, 0);
    this.siren.add(this.sirenLight);
    this.sirenBeam = mesh(G.box(2.4, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.5 }), 0, 0.35, 0);
    this.siren.add(this.sirenBeam);
    this.siren.visible = false;
    r.add(this.siren);
    for (const p of this.pieces) p.userData.rest = { pos: p.position.clone(), rot: p.rotation.clone() };
    this.bodyRest = { pos: this.body.position.clone(), rot: this.body.rotation.clone() };
  }

  reset() {
    this.maxHp = Config.base.baseHP;
    this.hp = this.maxHp;
    this.stage = 0;
    this.destroyed = false;
    this.cracks.forEach(c => (c.visible = false));
    this.siren.visible = false;
    for (const p of this.pieces) {
      if (p.userData.rest) {
        p.position.copy(p.userData.rest.pos);
        p.rotation.copy(p.userData.rest.rot);
        p.visible = true;
      }
      p.userData.vel = null;
    }
    this.body.visible = true;
    this.body.position.copy(this.bodyRest.pos);
    this.body.rotation.copy(this.bodyRest.rot);
    // escala SÓ visual (não mexe em this.z / front / hitPoint / alcance)
    this.root.scale.setScalar(Config.visual.baseVisualScale);
    this.wallMat.emissive.setHex(0x000000);
  }

  // reação por força do golpe: light = tremidinha; medium = flash + wobble; heavy/special = wobble forte + mais entulho + shake
  takeDamage(amount, sourceUnit, { strength = 'medium' } = {}) {
    if (this.destroyed) return;
    if (sourceUnit && sourceUnit.debugSpawn) return;   // unidades do STRESS TEST não derrubam a base
    this.hp = Math.max(0, this.hp - amount);
    const heavy = strength === 'heavy' || strength === 'special';
    const k = strength === 'light' ? 0.5 : heavy ? 1.6 : 1;
    this.flashTimer = strength === 'light' ? 0.06 : 0.12;
    this.hitWobble = Math.min(1.8, Math.max(this.hitWobble, k));
    bus.emit('baseHit', { base: this, amount, source: sourceUnit, strength });
    const fb = Config.base.baseDamageFeedback;
    if (this.effects) {
      const pos = new THREE.Vector3((sourceUnit ? sourceUnit.pos.x : 0), 1.5, this.front);
      this.effects.particles.burst(pos, Math.round(6 * fb * k), { color: 0xf5f1e6, speed: 3 * (heavy ? 1.5 : 1), size: 0.18, gravity: 8 });
      this.effects.particles.burst(pos, Math.round(3 * fb * k), { color: 0xfdfdf5, speed: 2.5, size: 0.25, gravity: 2, paper: true });
    }
    this.updateStage();
    if (this.hp <= 0) this.destroy();
  }

  updateStage() {
    const p = this.hp / this.maxHp;
    let stage = 0;
    if (p <= 0.75) stage = 1;
    if (p <= 0.5) stage = 2;
    if (p <= 0.25) stage = 3;
    if (stage !== this.stage) {
      const was = this.stage;
      this.stage = stage;
      this.cracks.forEach((c, i) => (c.visible = stage >= 1 && (stage >= 2 || i < 3)));
      this.siren.visible = stage >= 3;
      bus.emit('baseStage', { base: this, stage });
      if (stage >= 3 && was < 3) bus.emit('baseCritical', { team: this.team, base: this });   // crítico = mais caos (MatchEffects)
    }
  }

  destroy() {
    this.destroyed = true;
    this.siren.visible = false;
    // CRISE INSTITUCIONAL: as peças voam
    for (const p of this.pieces) {
      p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 10, 8 + Math.random() * 9, (Math.random() - 0.5) * 10);
      p.userData.ang = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    if (this.effects) {
      const pos = new THREE.Vector3(0, 3, this.z);
      this.effects.particles.burst(pos, 60, { color: 0xf5f1e6, speed: 9, size: 0.35, gravity: 9 });
      this.effects.particles.burst(pos, 50, { color: 0xfdfdf5, speed: 7, size: 0.35, gravity: 1.5, paper: true, life: 4 });
      this.effects.particles.burst(pos, 30, { color: TEAM_COLORS[this.team], speed: 10, size: 0.3, gravity: 6 });
      this.effects.particles.burst(pos, 25, { color: 0x888888, speed: 2, size: 0.9, gravity: -1.5, life: 3, smoke: true });
    }
    bus.emit('baseDestroyed', { base: this });
  }

  update(dt) {
    this.time += dt;
    // flash de dano
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.wallMat.emissive.setHex(this.flashTimer > 0 ? 0xff5533 : 0x000000);
    }
    // wobble no impacto (sempre multiplicado pela escala visual — editável no lil-gui)
    const bs = Config.visual.baseVisualScale;
    if (this.hitWobble > 0) {
      this.hitWobble = Math.max(0, this.hitWobble - dt * 4);
      const s = 1 + Math.sin(this.hitWobble * 20) * 0.03 * Math.min(1.8, this.hitWobble) * Config.base.baseDamageFeedback;
      if (!this.destroyed) this.root.scale.set(bs * s, bs / s, bs * s);
    } else if (!this.destroyed) this.root.scale.setScalar(bs);
    // bandeira balança
    if (this.flag && !this.flag.userData.vel) this.flag.rotation.y = Math.sin(this.time * 3) * 0.15;

    // estágio 2+: papéis voando periodicamente
    if (this.stage >= 2 && !this.destroyed && this.effects) {
      this.paperTimer -= dt;
      if (this.paperTimer <= 0) {
        this.paperTimer = 0.5 / Config.base.baseDamageFeedback;
        const pos = new THREE.Vector3((Math.random() - 0.5) * 10, 5, this.z);
        this.effects.particles.burst(pos, 3, { color: 0xfdfdf5, speed: 2.5, size: 0.3, gravity: 1.2, paper: true, life: 3 });
      }
    }
    // estágio 3: sirene + fumaça
    if (this.stage >= 3 && !this.destroyed) {
      this.siren.rotation.y += dt * 8;
      this.sirenLight.material.color.setHex(Math.sin(this.time * 12) > 0 ? 0xff2222 : 0xffaaaa);
      if (this.effects) {
        this.smokeTimer -= dt;
        if (this.smokeTimer <= 0) {
          this.smokeTimer = 0.25;
          const pos = new THREE.Vector3((Math.random() - 0.5) * 8, 4.5, this.z + (Math.random() - 0.5) * 2);
          this.effects.particles.burst(pos, 2, { color: 0x666666, speed: 1, size: 0.7, gravity: -2.5, life: 2.2, smoke: true });
        }
      }
    }
    // peças voando após destruição
    if (this.destroyed) {
      for (const p of this.pieces) {
        const v = p.userData.vel;
        if (!v) continue;
        v.y -= 22 * dt;
        p.position.addScaledVector(v, dt);
        p.rotation.x += p.userData.ang.x * dt;
        p.rotation.y += p.userData.ang.y * dt;
        p.rotation.z += p.userData.ang.z * dt;
        if (p.position.y < 0.3 && v.y < 0) {
          p.position.y = 0.3; v.y *= -0.35; v.x *= 0.7; v.z *= 0.7;
          p.userData.ang.multiplyScalar(0.6);
          if (Math.abs(v.y) < 0.8) p.userData.vel = null;
        }
      }
      // o bloco principal afunda e tomba lentamente
      this.body.position.y = Math.max(0.6, this.body.position.y - dt * 1.2);
      this.body.rotation.x = Math.min(0.5, this.body.rotation.x + dt * 0.4);
    }
  }

  get hpPercent() { return this.hp / this.maxHp; }
  // interface de "alvo" usada por Unit.js / projéteis
  get isBase() { return true; }
  get alive() { return !this.destroyed; }
  get pos() { return this.root.position; }
  get radius() { return this.baseHalfDepth; }
  get baseHalfDepth() { return this.arena.baseHalfDepth; }
  get hitPoint() { return new THREE.Vector3(0, 2.2, this.front); }
}
