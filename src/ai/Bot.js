// ============================================================
// Bot — adversário simples e divertido. Analisa lanes a cada intervalo:
//   ameaça grande numa lane → defende;  lane vazia → chance de atacar;
//   carta cara + capital → chance de usar. Tudo com aleatoriedade.
// Também pode controlar o jogador (debug.autoPlayer) para testes automáticos.
// ============================================================
import { Config } from '../config/Config.js';

export class Bot {
  constructor(game, controller) {
    this.game = game;
    this.ctrl = controller;
    this.team = controller.team;
    this.enemy = this.team === 'player' ? 'bot' : 'player';
    this.timer = 1.5;
    this.log = [];
  }

  reset() { this.timer = 1.5; this.log.length = 0; }

  _laneInfo() {
    const g = this.game;
    const info = [];
    const myBaseZ = g.base(this.team).front;
    for (let l = 0; l < 3; l++) {
      const enemies = g.units.lanes[this.enemy][l];
      const allies = g.units.lanes[this.team][l];
      let threat = 0, allyPower = 0;
      for (const e of enemies) {
        const prox = 1 - Math.min(1, Math.abs(e.pos.z - myBaseZ) / (Config.lanes.fieldLength));
        threat += (e.hp + e.damage * 4) * (0.5 + prox);
      }
      for (const a of allies) allyPower += a.hp + a.damage * 4;
      info.push({ lane: l, threat, allyPower, enemies: enemies.length, allies: allies.length });
    }
    return info;
  }

  update(dt) {
    const B = Config.bot;
    const diff = Math.max(0.2, Config.game.botDifficulty);
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = B.botDecisionInterval / diff * (0.7 + Math.random() * 0.6);
    this.decide();
  }

  decide() {
    const B = Config.bot;
    const ctrl = this.ctrl;
    const lanes = this._laneInfo();
    const rnd = () => (Math.random() - 0.5) * 2 * B.botRandomness;
    const maxThreat = Math.max(...lanes.map(l => l.threat));
    let best = null;

    for (let i = 0; i < ctrl.deck.hand.length; i++) {
      const card = ctrl.deck.card(i);
      const cost = ctrl.cardCost(card);
      if (ctrl.capital < cost) continue;
      const expensive = cost >= 5;
      if (card.type === 'troop') {
        const st = Config.units[card.unit];
        const power = (st.hp + st.damage * 4) * (st.spawnCount ?? 1);
        for (const L of lanes) {
          // defesa
          const def = L.threat > 0 ? (L.threat / (L.allyPower + 200)) * B.botDefenseBias * 0.8 : 0;
          // ataque em lane vazia/fraca
          const atk = L.enemies === 0 ? B.botAggressiveness * (L.allies === 0 ? 1 : 0.5) : 0.1 * B.botAggressiveness;
          // combina com poder da carta (cartas caras em lanes com mais ação)
          let score = def + atk + rnd();
          if (expensive) score += (L.threat > 0 || L.allies > 0 ? 0.35 : 0.1) * B.botAggressiveness;
          if (power > 600 && L.threat === 0 && L.allies > 0) score += 0.2;
          if (score > (best?.score ?? 0)) best = { score, i, lane: L.lane, card, reason: def > atk ? 'DEFENDER' : 'ATACAR' };
        }
      } else {
        let score = -1, lane = null, reason = card.name;
        if (card.power === 'canetada' || card.power === 'motociata') {
          for (const L of lanes) {
            const s = (L.threat / 800) * (0.6 + B.botDefenseBias) + rnd() * 0.5;
            if (L.enemies >= 2 && s > score) { score = s; lane = L.lane; }
          }
        } else if (card.power === 'recesso') {
          score = maxThreat > 900 ? 0.6 + rnd() : -1;
        } else if (card.power === 'pesquisa') {
          for (const L of lanes) {
            const s = (L.allies >= 2 ? 0.45 : 0) + rnd() * 0.3;
            if (s > score) { score = s; lane = L.lane; }
          }
        }
        if (score > (best?.score ?? 0)) best = { score, i, lane, card, reason };
      }
    }

    // segura o capital de vez em quando (bot imperfeito)
    if (best && best.score < 0.45 && Math.random() < 0.35) { this._log(`espera (score ${best.score.toFixed(2)})`); return; }
    if (!best || best.score <= 0.2) { this._log('sem jogada'); return; }
    const ok = ctrl.play(best.i, best.lane);
    if (ok) this._log(`${best.reason}: ${best.card.name} → lane ${best.lane === null ? '-' : best.lane + 1} (score ${best.score.toFixed(2)})`);
  }

  _log(msg) {
    this.log.push(`[${this.game.matchTime.toFixed(0)}s] ${msg}`);
    if (this.log.length > 8) this.log.shift();
  }
}
