// ============================================================
// PlayerController — Capital Político + deck + mão de UM lado (jogador ou bot).
// A UI (CardUI) e o Bot (Bot.js) usam esta mesma classe.
// ============================================================
import { Config } from '../config/Config.js';
import { Deck } from './Deck.js';
import { bus } from '../core/EventBus.js';

export class PlayerController {
  constructor(game, team, deckIds) {
    this.game = game;
    this.team = team;
    this.deck = new Deck(deckIds);
    this.capital = Config.game.startingCapital;
    this.regenAcc = 0;
    this.selected = -1;      // índice da carta selecionada na mão (jogador humano)
    this.cardsPlayed = 0;
    this.capitalSpent = 0;
    this.wasFull = false;
  }

  reset() {
    this.deck.reset();
    this.capital = Config.game.startingCapital;
    this.regenAcc = 0;
    this.selected = -1;
    this.cardsPlayed = 0;
    this.capitalSpent = 0;
  }

  cardCost(card) {
    return card.type === 'troop' ? Config.units[card.unit].cost : Config.powers[card.power].cost;
  }

  canPlay(i) {
    const c = this.deck.card(i);
    return c && this.capital >= this.cardCost(c);
  }

  update(dt, regenMult = 1) {
    const max = Config.game.maxCapital;
    if (this.capital < max) {
      this.regenAcc += dt * regenMult;
      const per = Math.max(0.05, Config.game.capitalRegen);
      while (this.regenAcc >= per && this.capital < max) { this.regenAcc -= per; this.capital = Math.min(max, this.capital + 1); }
      if (this.capital >= max) this.regenAcc = 0;
    }
    const full = this.capital >= max;
    if (full && !this.wasFull && this.team === 'player') { this.game.audio.play('capitalFull'); bus.emit('capitalFull', { team: this.team }); }
    this.wasFull = full;
  }

  get regenProgress() { return Math.min(1, this.regenAcc / Math.max(0.05, Config.game.capitalRegen)); }

  // Joga a carta i na lane (ou sem lane para poderes globais). Retorna true se jogou.
  play(i, lane = null) {
    const card = this.deck.card(i);
    if (!card) return false;
    const cost = this.cardCost(card);
    if (this.capital < cost) return false;
    if (card.type === 'troop' && lane === null) return false;
    if (card.type === 'power' && card.target === 'lane' && lane === null) return false;

    this.capital -= cost;
    this.capitalSpent += cost;
    this.cardsPlayed++;
    this.deck.play(i);
    this.selected = -1;

    if (card.type === 'troop') {
      this.game.units.spawn(card.unit, this.team, lane);
    } else {
      const p = this.game.powers;
      if (card.power === 'canetada') p.canetada(this.team, lane);
      else if (card.power === 'motociata') p.motociata(this.team, lane);
      else if (card.power === 'recesso') p.recesso(this.team);
      else if (card.power === 'pesquisa') p.pesquisa(this.team, lane);
    }
    bus.emit('cardPlayed', { team: this.team, card, lane });
    return true;
  }
}
