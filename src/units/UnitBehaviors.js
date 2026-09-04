// ============================================================
// UnitBehaviors — passivas e especiais por tipo de unidade.
// Hooks: onSpawn, onUpdate(dt), onHit(target,dmg), onDamaged(amount,source),
//        onShoot(target), trySpecial() → true se iniciou um especial.
// Tudo aqui só usa a API de Unit + game (nunca toca no visual diretamente,
// exceto via unit.visual.transform/playSpecial — parte da interface).
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';
import { STATE } from './Unit.js';

const _v = new THREE.Vector3();

function alliesNear(unit, radius, filter = null) {
  const out = [];
  const list = unit.game.units.byTeam(unit.team);
  for (const a of list) {
    if (a === unit || !a.alive) continue;
    if (filter && !filter(a)) continue;
    const dx = a.pos.x - unit.pos.x, dz = a.pos.z - unit.pos.z;
    if (dx * dx + dz * dz <= radius * radius) out.push(a);
  }
  return out;
}

function enemyAhead(unit, dist) {
  const enemies = unit.game.units.enemiesInLane(unit.team, unit.lane);
  for (const e of enemies) {
    if (!e.alive) continue;
    const ahead = (e.pos.z - unit.pos.z) * unit.dir;
    if (ahead > -0.5 && ahead < dist) return e;
  }
  return null;
}

export const Behaviors = {
  // ---------------- MILITANTE: swarm, sem especial ----------------
  militante: {
    onSpawn(u) { u.hideHealthBar = false; },
  },

  // ---------------- TIO DO ZAP: projétil-mensagem ----------------
  tiozap: {
    onShoot(u, target) {
      if (Math.random() < 0.12) {
        u.game.effects.text.show('ENCAMINHADA MUITAS VEZES', u.hitPoint.add(new THREE.Vector3(0, 0.9, 0)), { color: '#b8ffcc', size: 1.1, life: 1.1, font: 'bold 30px Arial' });
        if (Math.random() < 0.5) u.game.effects.text.meme('ENCAMINHADA MUITAS VEZES', { color: '#b8ffcc' });
      }
    },
  },

  // ---------------- ASSESSOR: aura de buff, papéis ao apanhar ----------------
  assessor: {
    onUpdate(u, dt) {
      const st = u.stats;
      const near = alliesNear(u, st.auraRadius);
      for (const a of near) a.addBuff('assessor', { spd: 1 + st.auraBonus, atk: 1 + st.auraBonus, duration: 0.4 });
    },
    onDamaged(u, amount) {
      u.game.effects.particles.burst(u.hitPoint, 6, { color: 0xfdfdf5, speed: 3, size: 0.28, gravity: 1.3, paper: true, life: 2 });
    },
  },

  // ---------------- INFLUENCER: ENGAJAMENTO com mortes próximas ----------------
  influencer: {
    onSpawn(u) {
      u.data.stacks = 0; u.data.stackTime = 0;
      u.data.unsub = bus.on('unitDied', ({ unit }) => {
        if (!u.alive || unit === u) return;
        const dx = unit.pos.x - u.pos.x, dz = unit.pos.z - u.pos.z;
        if (dx * dx + dz * dz > 25) return;
        const st = u.stats;
        u.data.stacks = Math.min(st.engajamentoMax, u.data.stacks + 1);
        u.data.stackTime = st.engajamentoDuration;
        u.game.effects.text.show('ENGAJAMENTO +' + u.data.stacks, u.hitPoint.add(new THREE.Vector3(0, 0.8, 0)), { color: '#ff7ab8', size: 0.9, life: 1 });
        u.game.effects.particles.burst(u.hitPoint, 8, { color: 0xff4d8d, speed: 3, size: 0.16, gravity: -1, life: 1 });
        if (u.data.stacks >= st.engajamentoMax) u.game.effects.text.meme('VIRALIZOU!', { color: '#ff7ab8' });
        if (u.state === STATE.MOVING) u.visual.playSpecial('engajamento', 0.5);
      });
    },
    onUpdate(u, dt) {
      if (u.data.stackTime > 0) { u.data.stackTime -= dt; if (u.data.stackTime <= 0) u.data.stacks = 0; }
      u.passiveDamageMult = 1 + u.data.stacks * u.stats.engajamentoBonus;
    },
    onDeath(u) { if (u.data.unsub) u.data.unsub(); },
  },

  // ---------------- BARBUDO: COMPANHEIRADA + DISCURSO ----------------
  barbudo: {
    onUpdate(u, dt) {
      const st = u.stats;
      const small = alliesNear(u, st.auraRadius, a => a.isSmall);
      for (const a of small) a.addBuff('companheirada', { dmg: 1 + st.auraBonus, spd: 1 + st.auraBonus, duration: 0.4 });
      u.data.memeT = (u.data.memeT || 0) - dt;
      if (small.length >= 3 && u.data.memeT <= 0) { u.data.memeT = 12; u.game.effects.text.meme('COMPANHEIRADA!', { color: '#ffd23f' }); }
    },
    trySpecial(u) {
      const st = u.stats;
      const allies = alliesNear(u, st.discursoRadius);
      if (allies.length < 1 && !enemyAhead(u, 6)) return false;
      u.startSpecial('discurso', 1.3);
      u.game.effects.particles.ring(u.pos, { color: 0xffd23f, radius: st.discursoRadius, duration: 0.9 });
      u.game.effects.particles.ring(u.pos, { color: 0xffffff, radius: st.discursoRadius * 0.7, duration: 0.7, y: 0.3 });
      for (const a of allies) a.addBuff('discurso', { dmg: 1 + st.discursoBonus, atk: 1 + st.discursoBonus, duration: st.discursoDuration, label: '+DISCURSO', color: '#ffd23f' });
      u.addBuff('discurso', { dmg: 1 + st.discursoBonus, atk: 1 + st.discursoBonus, duration: st.discursoDuration });
      u.game.effects.text.show('DISCURSO!', u.hitPoint.add(new THREE.Vector3(0, 1, 0)), { color: '#ffd23f', size: 1.3, life: 1.2 });
      u.game.effects.text.meme('DISCURSO!', { color: '#ffd23f' });
      u.game.camera.addShake(0.2);
      return true;
    },
  },

  // ---------------- CAPITÃO: CERCADINHO + MOTOCIATA ----------------
  capitao: {
    onUpdate(u, dt) {
      const st = u.stats;
      const n = Math.min(st.cercadinhoMax, alliesNear(u, st.cercadinhoRadius).length);
      u.passiveDamageMult = 1 + n * st.cercadinhoBonus;
      u.data.n = n;
    },
    trySpecial(u) {
      if (!enemyAhead(u, 10)) return false;
      u.startSpecial('motociata', 1.0);
      u.game.powers.motociata(u.team, u.lane, { fromZ: u.pos.z });
      u.game.effects.text.show('MOTOCIATA!', u.hitPoint.add(new THREE.Vector3(0, 1, 0)), { color: '#ffffff', size: 1.3, life: 1.2 });
      return true;
    },
  },

  // ---------------- CARECA DA CANETA: SUSPENSO ----------------
  careca: {
    onHit(u, target, dmg) {
      if (!target.isBase) {
        u.game.effects.particles.burst(target.hitPoint, 10, { color: 0x1b1b3a, speed: 4, size: 0.18, gravity: 8 });
        if (Math.random() < 0.35) u.game.effects.text.meme('CANETADA!', { color: '#c9b6ff' });
      }
    },
    trySpecial(u) {
      const t = u.target;
      if (!t || t.isBase || !t.alive || t.stunned > 0) return false;
      u.startSpecial('suspenso', 0.9);
      t.stun(u.stats.stunDuration);
      u.game.effects.particles.ring(t.pos, { color: 0x9b7bff, radius: 2, duration: 0.5 });
      u.game.effects.text.meme('SUSPENSO!', { color: '#c9b6ff' });
      return true;
    },
  },

  // ---------------- DINO: MODO JURÁSSICO a 50% ----------------
  dino: {
    onDamaged(u) {
      if (u.data.jurassic || u.hp > u.maxHp * 0.5 || u.hp <= 0) return;
      u.data.jurassic = true;
      const st = u.stats;
      u.visual.transform('jurassic');
      u.passiveDamageMult = st.jurassicDamageMult;
      u.passiveKnockbackMult = st.jurassicKnockbackMult;
      u.passiveSpeedMult = st.jurassicSpeedMult;
      u.radius *= 1.2;
      u.visualScale = (st.scale ?? 1) * st.jurassicScale;
      u.startSpecial('jurassico', 1.1);
      u.specialCooldown = 0;
      u.game.effects.particles.burst(u.hitPoint, 30, { color: 0x3f8f3a, speed: 6, size: 0.25, gravity: 8 });
      u.game.effects.particles.ring(u.pos, { color: 0x3f8f3a, radius: 4, duration: 0.7 });
      u.game.effects.text.show('MODO JURÁSSICO!', u.hitPoint.add(new THREE.Vector3(0, 1.4, 0)), { color: '#9fd67a', size: 1.4, life: 1.5, font: 'bold 36px Arial' });
      u.game.effects.text.meme('MODO JURÁSSICO!', { color: '#9fd67a', force: true });
      u.game.camera.addShake(0.6);
      u.game.audio.play('special');
    },
  },
};
