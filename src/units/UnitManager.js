// ============================================================
// UnitManager — spawn, listas por lane/time, update e limpeza.
// ============================================================
import { Config } from '../config/Config.js';
import { Unit } from './Unit.js';
import { createCharacterVisual } from '../visual/CharacterFactory.js';
import { bus } from '../core/EventBus.js';

export class UnitManager {
  constructor(game) {
    this.game = game;
    this.units = [];
    this.lanes = { player: [[], [], []], bot: [[], [], []] };
    this.teams = { player: [], bot: [] };
  }

  spawn(type, team, lane, opts = {}) {
    const st = Config.units[type];
    const count = opts.count ?? st.spawnCount ?? 1;
    const arena = this.game.arena;
    const cx = arena.laneX(lane);
    const z0 = opts.z ?? arena.spawnZ(team);
    const dir = team === 'player' ? -1 : 1;
    const spawned = [];
    for (let i = 0; i < count; i++) {
      let x = cx, z = z0;
      if (count > 1) {
        // formação em "V" para hordas
        const spread = Config.lanes.laneWidth / 2 - 0.5;
        x = cx + ((i % 3) - 1) * spread * 0.8 + (Math.random() - 0.5) * 0.3;
        z = z0 - dir * Math.floor(i / 3) * 0.8 + (Math.random() - 0.5) * 0.3;
      }
      const visual = createCharacterVisual(type, team, this.game.scene);
      const u = new Unit(this.game, type, team, lane, x, z, visual);
      this.units.push(u);
      spawned.push(u);
      const fx = this.game.effects;
      fx.particles.burst(u.pos.clone().setY(0.3), 8, { color: team === 'player' ? 0x2bb3c0 : 0xe8772e, speed: 3, size: 0.2, gravity: 6 });
      fx.particles.ring(u.pos, { color: team === 'player' ? 0x2bb3c0 : 0xe8772e, radius: 1.2, duration: 0.4 });
    }
    this.game.audio.play('spawn');
    bus.emit('unitSpawned', { type, team, lane, units: spawned });
    this._rebuild();
    return spawned;
  }

  _rebuild() {
    for (const t of ['player', 'bot']) { this.teams[t].length = 0; for (let l = 0; l < 3; l++) this.lanes[t][l].length = 0; }
    for (const u of this.units) {
      if (!u.alive) continue;
      this.teams[u.team].push(u);
      this.lanes[u.team][u.lane].push(u);
    }
  }

  enemiesInLane(team, lane) { return this.lanes[team === 'player' ? 'bot' : 'player'][lane]; }
  alliesInLane(team, lane) { return this.lanes[team][lane]; }
  byTeam(team) { return this.teams[team]; }
  alive(team) { return this.teams[team]; }

  update(dt, visualDt) {
    this._rebuild();
    for (const u of this.units) u.update(dt);
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      u.visual.update(visualDt);
      if (!u.alive && u.deathTimer <= 0) {
        u.dispose();
        this.units.splice(i, 1);
      }
    }
  }

  celebrate(team) { for (const u of this.units) if (u.alive && u.team === team) u.visual.playVictory(); }

  clear() {
    for (const u of this.units) { if (u.behavior?.onDeath) u.behavior.onDeath(u); u.dispose(); }
    this.units.length = 0;
    this._rebuild();
  }

  get count() { return this.units.length; }
}
