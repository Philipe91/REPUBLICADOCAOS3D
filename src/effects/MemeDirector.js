// ============================================================
// MemeDirector — decide QUANDO e QUAL meme de tela mostrar (apresentação).
// Escuta o EventBus (inclui chaosSpike) e consulta uma TABELA declarativa de regras:
//   { on, when(e, game), text | texts, color, priority, weight }
// Regras: cooldown global (Config.memes.cooldown ÷ visual.memeFrequency), probabilidade
// (Config.memes.chance × memeFrequency), nunca por cima de um meme forçado (poder/especial)
// em exibição, prioridade maior vence no mesmo frame. FloatingTextManager continua
// sendo só o renderizador (text.meme). Memes de poder/especial (force) NÃO passam por
// aqui — continuam nos módulos de efeito, e este diretor espera eles sumirem.
// ============================================================
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// tabela: eventos → memes contextuais (sem cores políticas, sátira genérica)
export const MEME_RULES = [
  { on: 'chaosSpike', when: (e) => e.level >= 3, texts: ['CAOS TOTAL!', 'A REPÚBLICA PEGOU FOGO!', 'NINGUÉM SE ENTENDE!'], color: '#ff5a5a', priority: 5, weight: 1 },
  { on: 'chaosSpike', when: (e) => e.level === 2, texts: ['TRETA!', 'EITA!', 'VAZOU!'], color: '#ffd23f', priority: 4, weight: 1 },
  { on: 'chaosSpike', when: (e) => e.level === 1, texts: ['ESQUENTOU!', 'TÁ OK?'], color: '#ffe066', priority: 3, weight: 0.7 },
  { on: 'unitDied', when: (e, g) => e.unit.isSmall && g.chaos.level >= 1, texts: ['CAIU UM MILITANTE!', 'NÃO VALE PRINT!'], color: '#ffe066', priority: 1, weight: 0.25 },
  { on: 'unitDied', when: (e) => !e.unit.isSmall && (e.unit.type === 'barbudo' || e.unit.type === 'capitao' || e.unit.type === 'careca' || e.unit.type === 'dino'), texts: ['CAIU O FIGURÃO!', 'QUE FASE!', 'CADÊ O PIX?'], color: '#ffd23f', priority: 3, weight: 0.8 },
  { on: 'unitDamaged', when: (e) => e.strength === 'heavy' && e.amount > 80, texts: ['TRETA!', 'DOEU!'], color: '#ffd23f', priority: 2, weight: 0.15 },
  { on: 'baseHit', when: (e) => e.strength === 'heavy' || e.strength === 'special', texts: ['BATERAM NA SEDE!', 'ALÔ, SEGURANÇA?'], color: '#ff9c5a', priority: 2, weight: 0.5 },
  { on: 'capitalFull', when: () => true, texts: ['CAPITAL CHEIO, GASTA!', 'TÁ RICO E NÃO JOGA?'], color: '#7ad7ff', priority: 1, weight: 0.6 },
  { on: 'idle', when: (e, g) => g.units.count > 4, texts: ['TÁ OK?', 'QUE FASE!', 'NÃO VALE PRINT!', 'VAZOU!', 'EITA!'], color: '#ffe066', priority: 0, weight: 1 },
];

export class MemeDirector {
  constructor(game, rules = MEME_RULES) {
    this.game = game;
    this.rules = rules;
    this.cooldown = 0;
    this.idleT = Config.memes.idleEvery;
    this.log = [];            // últimos memes {t, text, rule} (debug/testes)
    this._pending = null;     // melhor candidato do frame
    const events = new Set(rules.map(r => r.on).filter(n => n !== 'idle'));
    for (const n of events) bus.on(n, (e) => this.consider(n, e));
    bus.on('matchStart', () => { this.cooldown = 0; this.idleT = Config.memes.idleEvery; this._pending = null; });
  }

  get frequency() { return Math.max(0, Config.visual.memeFrequency); }

  consider(on, e) {
    if (!this.game.playing || this.game.ended || this.frequency <= 0) return;
    for (const r of this.rules) {
      if (r.on !== on) continue;
      let ok = false;
      try { ok = r.when(e, this.game); } catch (_) { ok = false; }
      if (!ok) continue;
      if (Math.random() > Math.min(1, r.weight * Config.memes.chance * this.frequency)) continue;
      if (!this._pending || r.priority > this._pending.rule.priority) this._pending = { rule: r, e, age: 0 };
    }
  }

  // gameDt: cooldown e "idle" contam tempo de jogo; dispara no máximo 1 meme por frame.
  // Um candidato ESPERA (até memes.maxWait) enquanto há cooldown ou um meme forçado na tela.
  update(dt) {
    const g = this.game;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.idleT -= dt;
    if (this.idleT <= 0) { this.idleT = Config.memes.idleEvery * (0.8 + Math.random() * 0.6); this.consider('idle', {}); }
    const p = this._pending;
    if (!p) return;
    p.age += dt;
    if (p.age > Config.memes.maxWait) { this._pending = null; return; }
    if (this.cooldown > 0) return;
    if (g.effects.text.memeTimer > 0) return;                 // nunca por cima de um meme (poder/especial) na tela
    this._pending = null;
    const text = p.rule.text || pick(p.rule.texts);
    g.effects.text.meme(text, { color: p.rule.color, force: true, duration: Config.memes.duration });
    this.cooldown = Config.memes.cooldown / Math.max(0.05, this.frequency);
    this.log.push({ t: +g.matchTime.toFixed(2), text, on: p.rule.on });
    if (this.log.length > 40) this.log.shift();
  }
}
