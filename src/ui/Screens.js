// ============================================================
// Screens — menu, montagem de deck, vitória/derrota.
// ============================================================
import { CARD_LIST, CARDS, DECK_SIZE } from '../config/Cards.js';
import { Config, DefaultDecks } from '../config/Config.js';

export class Screens {
  constructor(game) {
    this.game = game;
    this.menu = document.getElementById('menu-screen');
    this.deckScreen = document.getElementById('deck-screen');
    this.end = document.getElementById('end-screen');
    this.playerDeck = DefaultDecks.player.slice();

    document.getElementById('btn-play').onclick = () => { game.audio.init(); game.audio.resume(); this.hideAll(); game.startMatch(this.playerDeck); };
    document.getElementById('btn-deck').onclick = () => { this.showDeckBuilder(); };
    document.getElementById('btn-deck-back').onclick = () => { this.showMenu(); };
    document.getElementById('btn-restart').onclick = () => { this.hideAll(); game.startMatch(this.playerDeck); };
    document.getElementById('btn-menu').onclick = () => { game.endToMenu(); this.showMenu(); };
    this.buildDeckGrid();
  }

  hideAll() { for (const s of [this.menu, this.deckScreen, this.end]) s.classList.add('hidden'); }
  showMenu() { this.hideAll(); this.menu.classList.remove('hidden'); }

  showDeckBuilder() { this.hideAll(); this.deckScreen.classList.remove('hidden'); this.refreshDeckGrid(); }

  buildDeckGrid() {
    const grid = document.getElementById('deck-grid');
    grid.innerHTML = '';
    for (const card of CARD_LIST) {
      const el = document.createElement('div');
      el.className = 'card' + (card.type === 'power' ? ' power' : '');
      el.dataset.id = card.id;
      el.innerHTML = `<div class="cost"></div><div class="icon">${card.icon}</div><div class="name">${card.name}</div><div class="desc">${card.desc}</div><div class="type">${card.cls}</div>`;
      el.onclick = () => this.toggleCard(card.id);
      grid.appendChild(el);
    }
  }

  toggleCard(id) {
    const i = this.playerDeck.indexOf(id);
    if (i >= 0) { if (this.playerDeck.length > 4) this.playerDeck.splice(i, 1); }
    else if (this.playerDeck.length < DECK_SIZE) this.playerDeck.push(id);
    this.refreshDeckGrid();
  }

  refreshDeckGrid() {
    const grid = document.getElementById('deck-grid');
    for (const el of grid.children) {
      const card = CARDS[el.dataset.id];
      el.classList.toggle('in-deck', this.playerDeck.includes(card.id));
      el.querySelector('.cost').textContent = card.type === 'troop' ? Config.units[card.unit].cost : Config.powers[card.power].cost;
    }
    document.getElementById('deck-count').textContent = `${this.playerDeck.length}/${DECK_SIZE}` + (this.playerDeck.length < DECK_SIZE ? ' — o deck é completado com cartas repetidas' : '');
  }

  showEnd(victory, stats) {
    this.hideAll();
    const title = document.getElementById('end-title');
    const sub = document.getElementById('end-sub');
    title.textContent = victory ? 'VITÓRIA' : 'A CASA CAIU';
    title.classList.toggle('defeat', !victory);
    sub.textContent = victory ? 'CRISE INSTITUCIONAL NO ADVERSÁRIO' : 'DERROTA — SUA SEDE VIROU PÓ';
    document.getElementById('btn-restart').textContent = victory ? 'JOGAR NOVAMENTE' : 'TENTAR NOVAMENTE';
    document.getElementById('end-stats').innerHTML = `
      <div class="stat"><b>${stats.coins}</b><span>MOEDAS FICTÍCIAS</span></div>
      <div class="stat"><b>${stats.cards}</b><span>CARTAS JOGADAS</span></div>
      <div class="stat"><b>${stats.kills}</b><span>ADVERSÁRIOS CAÍDOS</span></div>
      <div class="stat"><b>${stats.time}</b><span>TEMPO</span></div>`;
    this.end.classList.remove('hidden');
  }
}
