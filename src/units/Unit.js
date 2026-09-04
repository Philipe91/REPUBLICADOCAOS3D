// ============================================================
// Unit — LÓGICA da unidade (movimento, alvo, combate, buffs, estados).
// Não sabe nada sobre como o personagem é desenhado: fala só com
// CharacterVisual (this.visual).
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';
import { Behaviors } from './UnitBehaviors.js';

export const STATE = {
  SPAWNING: 'SPAWNING',
  MOVING: 'MOVING',
  TARGETING: 'TARGETING',
  ATTACKING: 'ATTACKING',
  SPECIAL: 'SPECIAL',
  HIT: 'HIT',
  DEAD: 'DEAD',
};

let nextId = 1;
const _tmp = new THREE.Vector3();

export class Unit {
  constructor(game, type, team, lane, x, z, visual) {
    this.id = nextId++;
    this.game = game;
    this.type = type;
    this.team = team;
    this.lane = lane;
    this.dir = team === 'player' ? -1 : 1;     // sentido de avanço no eixo z
    this.pos = new THREE.Vector3(x, 0, z);
    this.laneOffsetX = x - game.arena.laneX(lane);
    this.visual = visual;
    this.visual.setFacing(this.dir);
    this.visual.setPosition(x, 0, z);

    const st = Config.units[type];
    this.baseStats = st;
    this.maxHp = st.hp * Config.combat.globalHPMultiplier;
    this.hp = this.maxHp;
    this.radius = 0.45 * (st.scale ?? 1);
    this.visualScale = st.scale ?? 1;
    this.isSwarm = type === 'militante';
    this.isSmall = type === 'militante';
    this.isRanged = st.attackRange >= 3;
    this.projectileKind = type === 'tiozap' ? 'zap' : type === 'influencer' ? 'like' : 'generic';
    this.alive = true;
    this.state = STATE.SPAWNING;
    this.stateTime = 0;
    this.target = null;
    this.attackTimer = 0;
    this.attackHitDone = false;
    this.attackWindup = 0.25;
    this.attackInterval = 1;
    this.specialCooldown = st.specialCooldown ? st.specialCooldown * 0.5 : 0; // primeiro especial vem mais rápido
    this.specialTime = 0;
    this.stunned = 0;
    this.frozen = 0;          // RECESSO
    this.kb = new THREE.Vector3();
    this.buffs = [];
    this.passiveDamageMult = 1;
    this.passiveKnockbackMult = 1;
    this.passiveSpeedMult = 1;
    this.deathTimer = 0;
    this.blocked = false;
    this.hideHealthBar = false;
    this.spawnTime = 0.35;
    this.behavior = Behaviors[type] || null;
    this.data = {};           // memória do comportamento
    this.lastAttacker = null;
    if (this.behavior?.onSpawn) this.behavior.onSpawn(this);
  }

  // ---------- stats efetivos (lêem Config em tempo real → lil-gui) ----------
  get stats() { return Config.units[this.type]; }
  buffMult(key) { let m = 1; for (const b of this.buffs) m *= (b[key] ?? 1); return m; }
  get damage() { return this.stats.damage * Config.combat.globalDamageMultiplier * this.buffMult('dmg') * this.passiveDamageMult; }
  get moveSpeed() { return this.stats.moveSpeed * Config.combat.globalMoveSpeedMultiplier * this.buffMult('spd') * this.passiveSpeedMult; }
  get attackSpeed() { return this.stats.attackSpeed * this.buffMult('atk'); }
  get attackRange() { return this.stats.attackRange; }
  get height() { return this.visual.height / Math.max(0.01, this.visualScale); } // a barra de vida usa height*visualScale
  get knockback() { return (this.stats.knockback ?? 0.3) * Config.combat.knockbackStrength * this.passiveKnockbackMult; }
  get hitPoint() { _tmp.set(this.pos.x, this.pos.y + this.height * this.visualScale * 0.55, this.pos.z); return _tmp.clone(); }
  get center() { return this.hitPoint; }
  get isBase() { return false; }

  addBuff(id, { dmg = 1, spd = 1, atk = 1, duration = 1, label = null, color = '#9ff' } = {}) {
    let b = this.buffs.find(x => x.id === id);
    if (b) { b.dmg = dmg; b.spd = spd; b.atk = atk; b.time = duration; return; }
    b = { id, dmg, spd, atk, time: duration };
    this.buffs.push(b);
    if (label) this.game.effects.text.show(label, this.hitPoint.add(new THREE.Vector3(0, 0.6, 0)), { color, size: 0.8, life: 0.8 });
  }

  setState(s) {
    if (this.state === STATE.DEAD) return;
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    if (s === STATE.MOVING) this.visual.playWalk(this.moveSpeed / 2);
    else if (s === STATE.TARGETING) this.visual.playIdle();
  }

  // ---------- dano ----------
  takeDamage(amount, source = null, { knockback = 0, big = false, color = 0xffffff } = {}) {
    if (!this.alive) return;
    this.hp -= amount;
    this.lastAttacker = source;
    const fx = this.game.effects;
    const hp = this.hitPoint;
    const isBig = big || amount >= Config.combat.bigHitThreshold;
    fx.text.damage(amount, hp, isBig);
    fx.particles.burst(hp, isBig ? 14 : 6, { color: isBig ? 0xffd23f : 0xffffff, speed: isBig ? 5 : 3, size: isBig ? 0.22 : 0.14, gravity: 9, life: 0.5 });
    this.visual.flash(0xff6644, 0.08);
    this.visual.playHit(isBig ? 1.3 : 0.7);
    if (source && source.dir !== undefined) {
      const dirZ = Math.sign(this.pos.z - source.pos.z) || -source.dir;
      const k = (knockback || (source.knockback ?? 0.3)) * (this.isSmall ? 1.4 : 1);
      this.kb.z += dirZ * k * 6;
      this.kb.x += (Math.random() - 0.5) * k * 2;
    } else if (knockback) {
      this.kb.z += -this.dir * knockback * 6;
    }
    if (isBig) {
      this.game.camera.addShake(0.35);
      this.game.hitStop(Config.combat.hitStopDuration);
      this.game.audio.play('bigHit');
    } else this.game.audio.play('hit');
    if (this.behavior?.onDamaged) this.behavior.onDamaged(this, amount, source);
    bus.emit('unitDamaged', { unit: this, amount, source });
    if (this.hp <= 0) this.die(source);
  }

  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

  stun(duration) {
    if (!this.alive) return;
    this.stunned = Math.max(this.stunned, duration);
    this.visual.playStun(true);
    this.state = STATE.HIT;
    this.stateTime = 0;
    this.game.effects.text.show('SUSPENSO!', this.hitPoint.add(new THREE.Vector3(0, 0.8, 0)), { color: '#c9b6ff', size: 1.1, life: 1.2, rise: 1 });
    this.game.audio.play('stun');
  }

  die(killer = null) {
    if (!this.alive) return;
    this.alive = false;
    this.state = STATE.DEAD;
    this.stateTime = 0;
    this.deathTimer = 1.6;
    this.target = null;
    this.visual.playDeath();
    if (this.behavior?.onDeath) this.behavior.onDeath(this);
    const fx = this.game.effects;
    fx.particles.burst(this.hitPoint, 10, { color: 0xffffff, speed: 4, size: 0.18, gravity: 10 });
    fx.particles.burst(this.hitPoint, 4, { color: 0xfdfdf5, speed: 2, size: 0.25, gravity: 1.2, paper: true, life: 2 });
    bus.emit('unitDied', { unit: this, killer });
  }

  // ---------- alvo ----------
  findTarget() {
    const enemies = this.game.units.enemiesInLane(this.team, this.lane);
    let best = null, bestD = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const ahead = (e.pos.z - this.pos.z) * this.dir;
      if (ahead < -1.0) continue;             // ignora quem já passou (muito atrás)
      const d = this.distanceTo(e);
      if (d < bestD) { bestD = d; best = e; }
    }
    // base inimiga se não houver unidade à frente (ou se a base estiver mais perto)
    const base = this.game.enemyBase(this.team);
    if (!base.destroyed) {
      const dBase = this.distanceToBase(base);
      if (!best || dBase < bestD) { best = base; bestD = dBase; }
    }
    return best;
  }

  distanceTo(other) {
    if (other.isBase) return this.distanceToBase(other);
    const dx = other.pos.x - this.pos.x, dz = other.pos.z - this.pos.z;
    return Math.max(0, Math.sqrt(dx * dx + dz * dz) - other.radius - this.radius);
  }
  distanceToBase(base) { return Math.max(0, Math.abs(base.front - this.pos.z) - this.radius); }

  targetValid(t) {
    if (!t) return false;
    if (t.isBase) return !t.destroyed;
    if (!t.alive) return false;
    if ((t.pos.z - this.pos.z) * this.dir < -1.5) return false;
    return true;
  }

  // ---------- update ----------
  update(dt) {
    if (!this.alive) {
      this.deathTimer -= dt;
      this._applyKnockback(dt);
      this.visual.setPosition(this.pos.x, this.pos.y, this.pos.z);
      return;
    }
    this.stateTime += dt;
    // buffs expiram
    for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].time -= dt; if (this.buffs[i].time <= 0) this.buffs.splice(i, 1); }
    if (this.specialCooldown > 0) this.specialCooldown -= dt;
    if (this.behavior?.onUpdate) this.behavior.onUpdate(this, dt);

    this._applyKnockback(dt);

    // RECESSO: todo mundo para
    if (this.frozen > 0) {
      this.frozen -= dt;
      if (this.frozen <= 0) { this.visual.playRecesso(false); this.setState(STATE.MOVING); this.state = STATE.MOVING; this.visual.playWalk(); }
      this.visual.setPosition(this.pos.x, this.pos.y, this.pos.z);
      return;
    }
    // SUSPENSO (stun)
    if (this.stunned > 0) {
      this.stunned -= dt;
      if (this.stunned <= 0) { this.visual.playStun(false); this.state = STATE.MOVING; this.visual.playWalk(); }
      this.visual.setPosition(this.pos.x, this.pos.y, this.pos.z);
      return;
    }

    switch (this.state) {
      case STATE.SPAWNING:
        if (this.stateTime >= this.spawnTime) this.setState(STATE.MOVING);
        break;
      case STATE.MOVING:
        this._move(dt);
        this._checkTarget();
        break;
      case STATE.TARGETING:
        // espera um instante antes de atacar (leitura do golpe)
        if (!this.targetValid(this.target) || this.distanceTo(this.target) > this.attackRange) { this.target = null; this.setState(STATE.MOVING); break; }
        if (this.stateTime >= 0.12) this._startAttack();
        break;
      case STATE.ATTACKING:
        this._attackUpdate(dt);
        break;
      case STATE.SPECIAL:
        this.specialTime -= dt;
        if (this.specialTime <= 0) { this.setState(STATE.MOVING); this.state = STATE.MOVING; this.visual.playWalk(); }
        break;
      case STATE.HIT:
        if (this.stateTime > 0.3) this.setState(STATE.MOVING);
        break;
    }
    this.visual.setPosition(this.pos.x, this.pos.y, this.pos.z);
  }

  _applyKnockback(dt) {
    if (this.kb.lengthSq() < 0.0001) return;
    this.pos.addScaledVector(this.kb, dt);
    this.kb.multiplyScalar(Math.max(0, 1 - dt * 9));
    this._clampToLane();
  }

  _clampToLane() {
    const halfW = Config.lanes.laneWidth / 2 - 0.3;
    const cx = this.game.arena.laneX(this.lane);
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, cx - halfW, cx + halfW);
    const lim = this.game.arena.baseFront - 0.2;
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -lim, lim);
  }

  _move(dt) {
    // bloqueio por aliado à frente (evita empilhar)
    this.blocked = false;
    const allies = this.game.units.alliesInLane(this.team, this.lane);
    for (const a of allies) {
      if (a === this || !a.alive) continue;
      const ahead = (a.pos.z - this.pos.z) * this.dir;
      if (ahead > 0 && ahead < (this.radius + a.radius) * 1.1 && Math.abs(a.pos.x - this.pos.x) < (this.radius + a.radius) * 0.9) {
        if (a.state !== STATE.MOVING || a.blocked || a.moveSpeed < this.moveSpeed) { this.blocked = true; break; }
      }
    }
    if (this.blocked) { this.visual.playIdle(); return; }
    this.visual.playWalk(this.moveSpeed / 2);
    this.pos.z += this.dir * this.moveSpeed * dt;
    // volta suavemente ao offset lateral de origem
    const cx = this.game.arena.laneX(this.lane) + this.laneOffsetX;
    this.pos.x += (cx - this.pos.x) * Math.min(1, dt * 2);
    this._clampToLane();
  }

  _checkTarget() {
    const t = this.findTarget();
    this.target = t;
    if (t && this.distanceTo(t) <= this.attackRange) this.setState(STATE.TARGETING);
  }

  _startAttack() {
    this.state = STATE.ATTACKING;
    this.stateTime = 0;
    this.attackTimer = 0;
    this.attackHitDone = false;
    this.attackInterval = 1 / Math.max(0.05, this.attackSpeed);
    this.attackWindup = Math.min(0.32, this.attackInterval * 0.4);
    this.visual.playAttack(this.attackWindup, this.attackInterval);
    this.game.audio.play('attack');
  }

  _attackUpdate(dt) {
    this.attackTimer += dt;
    if (!this.attackHitDone && this.attackTimer >= this.attackWindup) {
      this.attackHitDone = true;
      if (this.targetValid(this.target) && this.distanceTo(this.target) <= this.attackRange + 0.6) this._hit(this.target);
    }
    if (this.attackTimer >= this.attackInterval) {
      // tenta especial antes do próximo golpe
      if (this.behavior?.trySpecial && this.specialCooldown <= 0 && this.behavior.trySpecial(this)) return;
      if (this.targetValid(this.target) && this.distanceTo(this.target) <= this.attackRange) this._startAttack();
      else { this.target = null; this.setState(STATE.MOVING); }
    }
  }

  _hit(target) {
    const dmg = this.damage;
    if (this.isRanged) {
      const from = this.hitPoint;
      from.z += this.dir * 0.3;
      this.game.effects.projectiles.spawn({
        from, target, kind: this.projectileKind, speed: this.stats.projectileSpeed ?? 12,
        onHit: (t) => this._applyDamage(t, dmg),
      });
      if (this.projectileKind === 'zap') this.game.audio.play('zap');
      if (this.behavior?.onShoot) this.behavior.onShoot(this, target);
    } else {
      this._applyDamage(target, dmg);
    }
  }

  _applyDamage(target, dmg) {
    if (!this.targetValid(target)) return;
    if (target.isBase) {
      target.takeDamage(dmg * Config.base_damage.unitToBaseMultiplier * this.game.baseDamageRamp, this);
      this.game.audio.play('baseHit');
    } else {
      target.takeDamage(dmg, this, { knockback: this.knockback });
    }
    if (this.behavior?.onHit) this.behavior.onHit(this, target, dmg);
    bus.emit('unitHit', { unit: this, target, dmg });
  }

  startSpecial(kind, duration) {
    this.state = STATE.SPECIAL;
    this.stateTime = 0;
    this.specialTime = duration;
    this.specialCooldown = this.stats.specialCooldown ?? 10;
    this.visual.playSpecial(kind, duration);
    this.game.audio.play('special');
  }

  dispose() { this.visual.dispose(); }
}
