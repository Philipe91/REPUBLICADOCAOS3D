// EventBus simples — desacopla sistemas (combate → efeitos/áudio/HUD).
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
