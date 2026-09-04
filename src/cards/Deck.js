// Deck circular: 8 cartas, 4 na mão. Jogou → vai pro fim da fila → entra a próxima.
import { CARDS, HAND_SIZE } from '../config/Cards.js';

export class Deck {
  constructor(cardIds) {
    this.all = cardIds.slice();
    this.reset();
  }
  reset() {
    const q = this.all.slice();
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    this.hand = q.splice(0, HAND_SIZE);
    this.queue = q;
  }
  card(i) { return CARDS[this.hand[i]]; }
  get next() { return CARDS[this.queue[0]]; }
  play(i) {
    const id = this.hand[i];
    this.queue.push(id);
    this.hand[i] = this.queue.shift();
    return CARDS[id];
  }
}
