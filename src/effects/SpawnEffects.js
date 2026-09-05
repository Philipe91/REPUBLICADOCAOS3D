// ============================================================
// SpawnEffects — entrada das unidades (APRESENTAÇÃO). Só escuta `unitSpawned`
// no EventBus; nunca altera estado de jogo. A unidade já anda/combate durante
// a entrada (Unit.spawnTime não muda aqui). Tudo escalado por
// Config.visual.spawnEffectScale e dura < 1 s.
//   base:      anel na cor do time + flash + fumacinha + nome flutuante
//   militante: mínimo (anel do grupo + nome), para a horda não poluir
//   barbudo:   "público" — papéis voando + anel dourado + som de herói
//   capitao:   flash forte + estilhaços brancos + som de herói + tremidinha
//   careca:    "carimbo" — anel escuro batendo no chão + cubos + shake
//   dino:      impacto — terra voando + anel verde + shake maior
// ============================================================
import * as THREE from 'three';
import { Config, TEAM_COLORS } from '../config/Config.js';
import { CARD_LIST } from '../config/Cards.js';
import { bus } from '../core/EventBus.js';

const NAMES = {};
for (const c of CARD_LIST) if (c.unit) NAMES[c.unit] = c.name;
const CSS = { player: '#5fe0ec', bot: '#ffa45c' };
const _c = new THREE.Vector3();

export class SpawnEffects {
  constructor(game) {
    this.game = game;
    bus.on('unitSpawned', (e) => this.onSpawn(e));
  }

  onSpawn({ type, team, units }) {
    if (!units || !units.length) return;
    const g = this.game;
    const fx = g.effects;
    const S = Config.visual.spawnEffectScale;
    const color = TEAM_COLORS[team];
    const swarm = units.length > 1;
    _c.set(0, 0, 0);
    for (const u of units) _c.add(u.pos);
    _c.divideScalar(units.length);
    const center = _c.clone();
    const lead = units[0];

    // ---- base ----
    fx.particles.ring(center, { color, radius: (swarm ? 1.8 : 1.2) * S, duration: 0.45 });
    for (const u of units) u.visual.flash(0xffffff, 0.12);
    if (!swarm) {
      fx.particles.burst(center.clone().setY(0.3), Math.round(8 * S), { color, speed: 3, size: 0.2, gravity: 6 });
      fx.particles.burst(center.clone().setY(0.4), Math.round(5 * S), { color: 0xe6e6e6, speed: 1.2, size: 0.35, gravity: -0.8, life: 0.6, smoke: true, up: 0.6 });
    }
    if (Config.visual.showUnitNameOnSpawn) {
      const top = center.clone().setY(lead.visual.height + 0.9);
      fx.text.show(NAMES[type] || type.toUpperCase(), top, { color: CSS[team], size: 1.05, life: 0.8, rise: 1.1, font: 'bold 40px Arial' });
    }
    g.audio.play('spawn');

    // ---- entradas especiais (por custo/personagem) ----
    switch (type) {
      case 'barbudo':
        fx.particles.burst(center.clone().setY(1.2), Math.round(14 * S), { color: 0xfdfdf5, speed: 4, size: 0.3, gravity: 1.5, life: 1.6, paper: true, spread: 3 });
        fx.particles.ring(center, { color: 0xffd23f, radius: 2.6 * S, duration: 0.6 });
        g.audio.play('spawnHero');
        break;
      case 'capitao':
        lead.visual.flash(0xffffff, 0.25);
        fx.particles.burst(center.clone().setY(1.0), Math.round(12 * S), { color: 0xffffff, speed: 6, size: 0.15, gravity: 8 });
        fx.particles.ring(center, { color: 0xffffff, radius: 2.0 * S, duration: 0.35 });
        g.camera.addShake(0.15 * S);
        g.audio.play('spawnHero');
        break;
      case 'careca':
        fx.particles.ring(center, { color: 0x1b1b3a, radius: 2.2 * S, duration: 0.45, y: 0.12 });
        fx.particles.burst(center.clone().setY(0.2), Math.round(12 * S), { color: 0x1b1b3a, speed: 3.5, size: 0.18, gravity: 12, up: 0.4 });
        g.camera.addShake(0.3 * S);
        g.audio.play('stamp');
        break;
      case 'dino':
        fx.particles.burst(center.clone().setY(0.2), Math.round(22 * S), { color: 0x6b4a2b, speed: 6, size: 0.25, gravity: 10 });
        fx.particles.ring(center, { color: 0x3f8f3a, radius: 3.2 * S, duration: 0.55 });
        g.camera.addShake(0.5 * S);
        g.audio.play('stomp');
        break;
    }
  }
}
