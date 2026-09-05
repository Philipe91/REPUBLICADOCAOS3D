// ============================================================
// HUD — topo (bases, capital, timer) — DOM leve, atualizado por frame
// só quando muda.
// ============================================================
import { Config } from '../config/Config.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('hud');
    this.playerHpFill = document.getElementById('player-hp-fill');
    this.playerHpText = document.getElementById('player-hp-text');
    this.botHpFill = document.getElementById('bot-hp-fill');
    this.botHpText = document.getElementById('bot-hp-text');
    this.capitalPips = document.getElementById('capital-pips');
    this.botCapitalPips = document.getElementById('bot-capital-pips');
    this.capitalText = document.getElementById('capital-text');
    this.timer = document.getElementById('timer');
    this.phase = document.getElementById('phase-label');
    this.laneHint = document.getElementById('lane-hint');
    this.toast = document.getElementById('card-toast');
    this._pipCount = -1;
    this._lastPlayerCapital = -1;
    this._toastTimer = null;
    this._cache = {};
    this.buildPips();
  }

  buildPips() {
    const max = Config.game.maxCapital;
    if (this._pipCount === max) return;
    this._pipCount = max;
    for (const el of [this.capitalPips, this.botCapitalPips]) {
      el.innerHTML = '';
      for (let i = 0; i < max; i++) { const p = document.createElement('div'); p.className = 'pip'; el.appendChild(p); }
    }
  }

  show(v) { this.el.classList.toggle('hidden', !v); }

  _set(key, el, prop, value) {
    if (this._cache[key] === value) return;
    this._cache[key] = value;
    el[prop] = value;
  }

  setLaneHint(text, isLaneName = false) {
    this.laneHint.textContent = text || '';
    this.laneHint.classList.toggle('show', !!text);
    this.laneHint.classList.toggle('lane', isLaneName);
  }

  // aviso curto acima da mão (ex.: "CAPITAL INSUFICIENTE · FALTA 3")
  showToast(text) {
    const el = this.toast;
    el.textContent = text;
    el.style.setProperty('--toast-dur', `${Config.ui.toastDuration}s`);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), Config.ui.toastDuration * 1000);
  }

  // Capital "nega" a jogada: número e pips tremem em vermelho
  flashCapitalDenied() {
    const ms = Config.ui.denyFlashDuration * 1000;
    for (const el of [this.capitalText, this.capitalPips]) {
      el.style.setProperty('--deny-dur', `${Config.ui.denyFlashDuration}s`);
      el.classList.remove('denied'); void el.offsetWidth; el.classList.add('denied');
      setTimeout(() => el.classList.remove('denied'), ms);
    }
  }

  update() {
    const g = this.game;
    this.buildPips();
    const pb = g.bases.player, bb = g.bases.bot;
    this._set('php', this.playerHpFill.style, 'width', `${Math.max(0, pb.hpPercent * 100).toFixed(1)}%`);
    this._set('phpt', this.playerHpText, 'textContent', `${Math.ceil(pb.hp)}`);
    this._set('bhp', this.botHpFill.style, 'width', `${Math.max(0, bb.hpPercent * 100).toFixed(1)}%`);
    this._set('bhpt', this.botHpText, 'textContent', `${Math.ceil(bb.hp)}`);

    this._pips(this.capitalPips, g.player.capital, g.player.regenProgress);
    this._pips(this.botCapitalPips, g.botCtrl.capital, g.botCtrl.regenProgress);
    this._set('cap', this.capitalText, 'textContent', `${g.player.capital} / ${Config.game.maxCapital}`);
    this.capitalText.classList.toggle('full', g.player.capital >= Config.game.maxCapital);
    // pulso discreto a cada ponto ganho (não no gasto, não no reset)
    const cap = g.player.capital;
    if (Config.ui.capitalTickPulse && this._lastPlayerCapital >= 0 && cap > this._lastPlayerCapital && cap < Config.game.maxCapital) {
      this.capitalText.classList.remove('tick'); void this.capitalText.offsetWidth; this.capitalText.classList.add('tick');
    }
    this._lastPlayerCapital = cap;

    const t = g.timeLeft;
    const m = Math.floor(Math.max(0, t) / 60), s = Math.floor(Math.max(0, t) % 60);
    const txt = g.tretaFinal ? `+${Math.floor(g.overtime)}s` : `${m}:${s.toString().padStart(2, '0')}`;
    this._set('timer', this.timer, 'textContent', txt);
    this.timer.classList.toggle('treta', g.tretaFinal || t < 20);
    this._set('phase', this.phase, 'textContent', g.tretaFinal ? 'TRETA FINAL!' : '');
  }

  _pips(el, capital, progress) {
    const pips = el.children;
    for (let i = 0; i < pips.length; i++) {
      const on = i < capital;
      const partial = i === capital;
      const p = pips[i];
      if (p._on !== on) { p.classList.toggle('on', on); p._on = on; }
      if (p._partial !== partial) { p.classList.toggle('partial', partial); p._partial = partial; }
      if (partial) p.style.setProperty('--p', `${(progress * 100).toFixed(0)}%`);
    }
  }
}
