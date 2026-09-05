// ============================================================
// ChaosScore — termômetro do caos da partida. Sem Three.js, sem DOM.
// Escuta o EventBus, soma pontos por evento (pesos em Config.chaos.weights), decai
// por segundo (decayPerSecond) e, ao cruzar um limiar de Config.chaos.thresholds
// para cima, emite `chaosSpike {level, value}` (com cooldown spikeCooldown).
// Só leitura para quem consome (MemeDirector, MatchEffects, overlay de debug):
// game.chaos.value / game.chaos.level. Nunca altera estado de jogo.
// ============================================================
import { Config } from '../config/Config.js';
import { bus } from './EventBus.js';

export class ChaosScore {
  constructor() {
    this.value = 0;
    this.level = 0;
    this.spikeT = 0;        // cooldown restante entre spikes
    this.lastSpikeLevel = 0;
    this.total = 0;         // acumulado bruto (debug)
    bus.on('unitDamaged', ({ strength }) => this.add(strength === 'heavy' || strength === 'special' ? 'heavyHit' : 'hit'));
    bus.on('unitDied', () => this.add('unitDied'));
    bus.on('attackImpact', ({ target }) => { if (target) this.add('impact'); });
    bus.on('powerImpact', ({ hits }) => this.add('powerImpact', Math.max(1, hits || 1)));
    bus.on('specialStart', () => this.add('special'));
    bus.on('baseHit', ({ strength }) => this.add(strength === 'heavy' || strength === 'special' ? 'baseHeavy' : 'baseHit'));
    bus.on('baseCritical', () => this.add('baseCritical'));
    bus.on('baseDestroyed', () => this.add('baseDestroyed'));
    bus.on('tretaFinal', () => this.add('tretaFinal'));
    bus.on('matchStart', () => this.reset());
    bus.on('matchCleared', () => this.reset());
  }

  reset() { this.value = 0; this.level = 0; this.spikeT = 0; this.lastSpikeLevel = 0; this.total = 0; }

  add(kind, mult = 1) {
    const w = Config.chaos.weights[kind] ?? 0;
    if (w <= 0) return;
    const gain = w * mult;
    this.value = Math.min(Config.chaos.max, this.value + gain);
    this.total += gain;
  }

  // gameDt: decai só com o tempo de jogo (hit-stop/slow-mo não "esfriam" o caos mais rápido)
  update(dt) {
    const C = Config.chaos;
    this.value = Math.max(0, this.value - C.decayPerSecond * dt);
    if (this.spikeT > 0) this.spikeT -= dt;
    let level = 0;
    for (let i = 0; i < C.thresholds.length; i++) if (this.value >= C.thresholds[i]) level = i + 1;
    if (level > this.level && this.spikeT <= 0) {
      this.spikeT = C.spikeCooldown;
      this.lastSpikeLevel = level;
      bus.emit('chaosSpike', { level, value: this.value });
    }
    this.level = level;
  }
}
