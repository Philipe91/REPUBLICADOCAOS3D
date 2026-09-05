// ============================================================
// Powers — cartas instantâneas: CANETADA, MOTOCIATA, RECESSO, PESQUISA.
// Também é usado pelo especial do Capitão (motociata numa lane).
// ============================================================
import * as THREE from 'three';
import { Config, TEAM_COLORS } from '../config/Config.js';
import { G, mat, basicMat } from '../core/Assets.js';
import { bus } from '../core/EventBus.js';

export class Powers {
  constructor(game) {
    this.game = game;
    this.pens = [];
    this.penPool = [];
    this.motos = [];
    this.motoPool = [];
    this.pending = []; // spawns agendados
    this.recessoTimer = 0;
  }

  // ---------------- CANETADA ----------------
  // LÓGICA: aviso (warnTime) → queda (fallTime) → IMPACTO (dano em área + base) → fica 0,25 s → sobe e some (0,5 s).
  // Apresentação (marcador, sombra, onda, papéis, texto, shake, hit-stop, som) fica em
  // effects/PowerEffects.js via eventos powerStart / powerImpact.
  canetada(team, lane) {
    const P = Config.powers.canetada;
    const g = this.game;
    const enemies = g.units.enemiesInLane(team, lane);
    const myBaseZ = g.base(team).front;
    let z = null;
    // alvo: inimigo mais próximo da minha base nessa lane
    let best = Infinity;
    for (const e of enemies) {
      const d = Math.abs(e.pos.z - myBaseZ);
      if (d < best) { best = d; z = e.pos.z; }
    }
    if (z === null) z = (team === 'player' ? -1 : 1) * g.arena.halfLen * 0.35;
    const x = g.arena.laneX(lane);
    const pen = this._acquirePen();
    pen.mesh.position.set(x, 16 + 1.1, z);
    pen.mesh.rotation.set(0, 0, 0.15);
    pen.mesh.visible = false;                       // só aparece quando começa a cair
    Object.assign(pen, { t: 0, team, lane, x, z, phase: 'warn', active: true, impactT: 0, dmg: P.damage, radius: P.radius, warnTime: P.warnTime, fallTime: P.fallTime });
    this.pens.push(pen);
    bus.emit('powerStart', { power: 'canetada', team, lane, position: new THREE.Vector3(x, 0, z), radius: P.radius, warnTime: P.warnTime, fallTime: P.fallTime, pen });
    return pen;
  }

  _acquirePen() {
    let p = this.penPool.pop();
    if (p) return p;
    const grp = new THREE.Group();
    const body = new THREE.Mesh(G.cylinder(0.35, 0.35, 5, 10), mat(0x1b1b3a)); body.position.y = 2.5; body.castShadow = true; grp.add(body);
    const cap = new THREE.Mesh(G.cylinder(0.38, 0.38, 1.2, 10), mat(0xffd700)); cap.position.y = 4.6; grp.add(cap);
    const clip = new THREE.Mesh(G.box(0.12, 1.5, 0.12), mat(0xffd700)); clip.position.set(0.4, 4, 0); grp.add(clip);
    const tip = new THREE.Mesh(G.cone(0.35, 1.0, 10), mat(0xffd700)); tip.position.y = -0.5; tip.rotation.x = Math.PI; grp.add(tip);
    const nib = new THREE.Mesh(G.cone(0.1, 0.4, 6), mat(0x222222)); nib.position.y = -1.1; nib.rotation.x = Math.PI; grp.add(nib);
    grp.visible = false;
    this.game.scene.add(grp);
    return { mesh: grp };
  }

  // ---------------- MOTOCIATA ----------------
  motociata(team, lane, { fromZ = null, count = null, damage = null, knockback = null } = {}) {
    const P = Config.powers.motociata;
    const g = this.game;
    const n = count ?? P.motoCount;
    const startZ = fromZ ?? g.arena.spawnZ(team) + (team === 'player' ? 1.5 : -1.5);
    for (let i = 0; i < n; i++) {
      this.pending.push({ t: i * 0.22, fn: () => this._spawnMoto(team, lane, startZ, damage ?? P.damage, knockback ?? P.knockback, i) });
    }
    g.effects.text.meme('MOTOCIATA!', { color: '#ffffff', force: true });
    g.audio.play('moto');
    g.camera.addShake(0.5);
  }

  _spawnMoto(team, lane, z, damage, knockback, idx) {
    const g = this.game;
    let m = this.motoPool.pop();
    if (!m) m = this._buildMoto();
    const dir = team === 'player' ? -1 : 1;
    const x = g.arena.laneX(lane) + ((idx % 3) - 1) * 0.9;
    m.mesh.position.set(x, 0, z);
    m.mesh.rotation.y = dir < 0 ? Math.PI : 0;
    m.mesh.visible = true;
    m.body.material = mat(TEAM_COLORS[team]);
    Object.assign(m, { team, lane, dir, damage, knockback, hitSet: new Set(), t: 0, smoke: 0, alive: true });
    this.motos.push(m);
  }

  _buildMoto() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(G.box(0.5, 0.35, 1.6), mat(0xcc3333)); body.position.y = 0.55; body.castShadow = true; grp.add(body);
    const wm = mat(0x222222);
    const w1 = new THREE.Mesh(G.cylinder(0.32, 0.32, 0.2, 10), wm); w1.rotation.z = Math.PI / 2; w1.position.set(0, 0.32, 0.7); grp.add(w1);
    const w2 = new THREE.Mesh(G.cylinder(0.32, 0.32, 0.2, 10), wm); w2.rotation.z = Math.PI / 2; w2.position.set(0, 0.32, -0.7); grp.add(w2);
    const bar = new THREE.Mesh(G.box(0.8, 0.06, 0.06), mat(0x999999)); bar.position.set(0, 0.95, 0.5); grp.add(bar);
    // piloto simplificado (cápsula + capacete)
    const rider = new THREE.Mesh(G.capsule(0.2, 0.3, 4), mat(0x333333)); rider.position.set(0, 1.0, -0.15); rider.rotation.x = 0.4; rider.castShadow = true; grp.add(rider);
    const helmet = new THREE.Mesh(G.sphere(0.24, 8), mat(0xffffff)); helmet.position.set(0, 1.45, 0.05); grp.add(helmet);
    const visor = new THREE.Mesh(G.box(0.3, 0.12, 0.1), basicMat(0x111111)); visor.position.set(0, 1.45, 0.27); grp.add(visor);
    const flag = new THREE.Mesh(G.box(0.03, 0.9, 0.03), mat(0xcccccc)); flag.position.set(0.25, 1.4, -0.6); grp.add(flag);
    const flagCloth = new THREE.Mesh(G.box(0.02, 0.3, 0.45), mat(0xffffff)); flagCloth.position.set(0.25, 1.7, -0.8); grp.add(flagCloth);
    grp.visible = false;
    this.game.scene.add(grp);
    return { mesh: grp, body, wheels: [w1, w2] };
  }

  // ---------------- RECESSO ----------------
  recesso(team) {
    const P = Config.powers.recesso;
    const g = this.game;
    for (const u of g.units.units) {
      if (!u.alive) continue;
      u.frozen = P.duration;
      u.visual.playRecesso(true);
    }
    this.recessoTimer = P.duration;
    g.effects.text.meme('RECESSO!', { color: '#ffe9a8', force: true, duration: P.duration });
    g.audio.play('special');
  }

  // ---------------- PESQUISA ----------------
  pesquisa(team, lane) {
    const P = Config.powers.pesquisa;
    const g = this.game;
    const allies = g.units.alliesInLane(team, lane);
    const options = [
      { id: 'spd', label: 'PESQUISA: +VELOCIDADE', buff: { spd: 1 + P.bonus } },
      { id: 'dmg', label: 'PESQUISA: +DANO', buff: { dmg: 1 + P.bonus } },
      { id: 'atk', label: 'PESQUISA: +RITMO', buff: { atk: 1 + P.bonus } },
      { id: 'heal', label: 'PESQUISA: +MORAL (cura)', buff: null },
    ];
    const pick = options[Math.floor(Math.random() * options.length)];
    for (const a of allies) {
      if (pick.buff) a.addBuff('pesquisa', { ...pick.buff, duration: P.duration });
      else a.heal(a.maxHp * 0.25);
      g.effects.particles.burst(a.hitPoint, 6, { color: 0x7ad7ff, speed: 2, size: 0.15, gravity: -1.5, life: 1 });
    }
    const x = g.arena.laneX(lane);
    g.effects.particles.ring(new THREE.Vector3(x, 0, g.arena.spawnZ(team) * 0.5), { color: 0x7ad7ff, radius: 3, duration: 0.7 });
    g.effects.text.meme(pick.label, { color: '#7ad7ff', force: true });
    g.audio.play('special');
    return pick.id;
  }

  // ---------------- UPDATE ----------------
  update(dt) {
    const g = this.game;
    // agendados
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t <= 0) { p.fn(); this.pending.splice(i, 1); }
    }
    if (this.recessoTimer > 0) this.recessoTimer -= dt;

    // canetas: aviso → queda → impacto → fincada → sobe e some (≤ 1,5 s no total)
    for (let i = this.pens.length - 1; i >= 0; i--) {
      const p = this.pens[i];
      p.t += dt;
      if (p.phase === 'warn') {
        if (p.t >= p.warnTime) { p.phase = 'fall'; p.mesh.visible = true; }
      }
      if (p.phase === 'fall') {
        const fall = Math.min(1, (p.t - p.warnTime) / Math.max(0.01, p.fallTime));
        p.mesh.position.y = 16 - 16 * fall * fall + 1.1;
        p.mesh.rotation.z = 0.15 - fall * 0.15;
        if (fall >= 1) { p.phase = 'stuck'; p.impactT = p.t; this._penImpact(p); }
      } else if (p.phase === 'stuck') {
        const t = p.t - p.impactT;
        if (t > 0.25) p.mesh.position.y += dt * 25;
        if (t > 0.5) { p.active = false; p.mesh.visible = false; this.penPool.push(p); this.pens.splice(i, 1); }
      }
    }

    // motos
    for (let i = this.motos.length - 1; i >= 0; i--) {
      const m = this.motos[i];
      m.t += dt;
      const speed = Config.units.moto.moveSpeed;
      m.mesh.position.z += m.dir * speed * dt;
      m.mesh.rotation.z = Math.sin(m.t * 30) * 0.06;
      for (const w of m.wheels) w.rotation.x += dt * 30;
      m.smoke -= dt;
      if (m.smoke <= 0) {
        m.smoke = 0.05;
        g.effects.particles.burst(m.mesh.position.clone().setY(0.3), 1, { color: 0x999999, speed: 0.8, size: 0.5, gravity: -1.2, life: 0.8, smoke: true });
      }
      // atropela inimigos
      const enemies = g.units.enemiesInLane(m.team, m.lane);
      for (const e of enemies) {
        if (!e.alive || m.hitSet.has(e.id)) continue;
        const dz = Math.abs(e.pos.z - m.mesh.position.z), dx = Math.abs(e.pos.x - m.mesh.position.x);
        if (dz < 1.2 && dx < 1.3) {
          m.hitSet.add(e.id);
          e.takeDamage(m.damage * Config.combat.globalDamageMultiplier, { pos: m.mesh.position, dir: m.dir, knockback: m.knockback * Config.combat.knockbackStrength }, { knockback: m.knockback * Config.combat.knockbackStrength, big: true });
          e.kb.y = 0;
        }
      }
      // chega na base inimiga
      const base = g.enemyBase(m.team);
      if ((m.mesh.position.z - base.front) * m.dir > -0.5) {
        if (!base.destroyed) { base.takeDamage(m.damage * 0.6 * g.baseDamageRamp, null); g.audio.play('baseHit'); }
        g.effects.particles.burst(m.mesh.position.clone().setY(0.6), 12, { color: 0x999999, speed: 4, size: 0.3, gravity: 3, smoke: true, life: 1 });
        m.mesh.visible = false; this.motoPool.push(m); this.motos.splice(i, 1);
      }
    }
  }

  // IMPACTO (frame exato): dano em área na lane + base se caiu perto; emite powerImpact para a apresentação
  _penImpact(p) {
    const g = this.game;
    const pos = new THREE.Vector3(p.x, 0.5, p.z);
    const enemies = g.units.enemiesInLane(p.team, p.lane);
    const dmg = p.dmg * Config.combat.globalDamageMultiplier;
    let hits = 0;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.x, dz = e.pos.z - p.z;
      if (dx * dx + dz * dz <= p.radius * p.radius) {
        e.takeDamage(dmg, { pos, dir: p.team === 'player' ? -1 : 1, knockback: Config.powers.canetada.knockback }, { strength: 'special' });
        hits++;
      }
    }
    const base = g.enemyBase(p.team);
    if (!base.destroyed && Math.abs(base.front - p.z) <= p.radius) base.takeDamage(dmg * 0.5, null);
    bus.emit('powerImpact', { power: 'canetada', team: p.team, lane: p.lane, position: new THREE.Vector3(p.x, 0, p.z), radius: p.radius, hits });
  }

  clear() {
    for (const p of this.pens) { p.active = false; p.mesh.visible = false; this.penPool.push(p); }
    this.pens.length = 0;
    for (const m of this.motos) { m.mesh.visible = false; this.motoPool.push(m); }
    this.motos.length = 0;
    this.pending.length = 0;
    this.recessoTimer = 0;
  }
}
