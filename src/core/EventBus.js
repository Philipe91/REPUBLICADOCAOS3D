// EventBus simples — desacopla sistemas (combate → efeitos/áudio/HUD).
//
// Eventos em uso (payload mínimo):
//   matchStart · matchEnd {victory} · cardPlayed {team, card, lane}
//   unitSpawned {type, team, lane, units} · unitDamaged {unit, amount, source} · unitHit {dmg}
//   unitDied {unit, killer} · baseHit {base, amount, source} · baseStage {base, stage} · baseDestroyed {base}
// Reservados para a fase Game Feel (E5+; nomes fixos, ainda não emitidos):
//   attackImpact {attacker, target, strength: light|medium|heavy|special} · unitKnockback {unit, force}
//   specialStart/specialEnd {unit, type} · powerStart/powerImpact {power, lane, team, position}
//   baseCritical {team} · tretaFinal · chaosSpike {level} · capitalFull {team}
//   engagementGain {unit, level} · stressTest {count}
// Regra: sistemas de jogo EMITEM; câmera/partículas/áudio/memes/tempo só ESCUTAM.
export class EventBus {
  constructor() { this.listeners = new Map(); }
  on(evt, fn) {
    if (!this.listeners.has(evt)) this.listeners.set(evt, []);
    this.listeners.get(evt).push(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const l = this.listeners.get(evt);
    if (!l) return;
    const i = l.indexOf(fn);
    if (i >= 0) l.splice(i, 1);
  }
  emit(evt, data) {
    const l = this.listeners.get(evt);
    if (!l) return;
    for (let i = 0; i < l.length; i++) l[i](data);
  }
  clear() { this.listeners.clear(); }
}

export const bus = new EventBus();
