// EventBus simples — desacopla sistemas (combate → efeitos/áudio/HUD).
//
// Eventos em uso (payload mínimo):
//   matchStart · matchEnd {victory} · cardPlayed {team, card, lane}
//   unitSpawned {type, team, lane, units} · unitDamaged {unit, amount, source} · unitHit {dmg}
//   unitDamaged carrega `strength` (light|medium|heavy|special) · unitDied {unit, killer, strength}
//   attackImpact {attacker, target|null, strength, ranged} — frame de impacto do golpe (E5)
//   baseHit {base, amount, source} · baseStage {base, stage} · baseDestroyed {base}
//   specialStart {unit, type, duration, target|null} · specialEnd {unit, type} (E7)
//   engagementGain {unit, level, max} (E7)
//   powerStart {power, team, lane, position, …} · powerImpact {power, team, lane, position, radius, hits, target?, base?} · powerEnd {power} (E8/E9)
//   baseHit leva strength · baseCritical {team, base} · tretaFinal {overtimeMax} · matchEnd {victory, base|null} · matchCleared (E10)
//   chaosSpike {level, value} · capitalFull {team} (E11)
// Reservados para a fase Game Feel (nomes fixos, ainda não emitidos):
//   unitKnockback {unit, force} · powerStart/powerImpact {power, lane, team, position}
//   (nenhum)
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
