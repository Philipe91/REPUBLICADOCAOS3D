// ============================================================
// CardUI — mão de 4 cartas (DOM reutilizado) + seleção de lane por raycast.
// Fluxo: clique na carta (ou teclas 1–4) → lanes destacam → clique na lane → joga.
// Poderes globais (RECESSO) jogam no clique da carta.
// Cancela: ESC, botão direito, clique fora das lanes ou clique na carta selecionada.
// Sem Capital: carta treme em vermelho + aviso "CAPITAL INSUFICIENTE" + Capital pisca;
// a carta bloqueada mostra uma barra de "quanto falta" que enche com o regen.
// Hover na lane: destaque mais forte, cursor pointer e nome da lane no hint.
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { bus } from '../core/EventBus.js';

export class CardUI {
  constructor(game) {
    this.game = game;
    this.handEl = document.getElementById('hand');
    this.nextEl = document.getElementById('next-card-box');
    this.cards = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoverLane = -1;
    this._lastIds = [];
    this._lastCapital = -1;
    this._lastHover = -2;
    this._lastCursor = '';
    this._lastReady = [-1, -1, -1, -1];
    this.canvas = game.renderer.domElement;
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<div class="cost"></div><div class="icon"></div><div class="name"></div><div class="type"></div><div class="pop"></div><div class="ready"></div>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.onCardClick(i); });
      this.handEl.appendChild(el);
      this.cards.push(el);
    }
    const canvas = game.renderer.domElement;
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.deselect(); });
    window.addEventListener('keydown', (e) => {
      if (!game.playing) return;
      if (e.key >= '1' && e.key <= '4') this.onCardClick(parseInt(e.key) - 1);
      if (e.key === 'Escape') this.deselect();
    });
    bus.on('cardPlayed', ({ team }) => { if (team === 'player') this.refresh(true); });
  }

  get ctrl() { return this.game.player; }

  onCardClick(i) {
    const g = this.game;
    if (!g.playing || Config.debug.autoPlayer) return;
    g.audio.init(); g.audio.resume();
    const ctrl = this.ctrl;
    const card = ctrl.deck.card(i);
    if (!ctrl.canPlay(i)) { this.deny(i, card); return; }
    if (card.type === 'power' && card.target === 'global') {
      this._playAnim(i);
      ctrl.play(i, null);
      g.audio.play('cardPlay');
      return;
    }
    if (ctrl.selected === i) { this.deselect(); return; }
    ctrl.selected = i;
    g.audio.play('cardSelect');
    g.hud.setLaneHint('ESCOLHA UMA LANE');
    this.refresh();
  }

  // recusa visível: carta treme em vermelho, aviso acima da mão, Capital pisca, som de erro
  deny(i, card) {
    const g = this.game;
    const falta = this.ctrl.cardCost(card) - this.ctrl.capital;
    g.audio.play('error');
    const el = this.cards[i];
    el.style.setProperty('--deny-dur', `${Config.ui.denyFlashDuration}s`);
    el.classList.remove('denied'); void el.offsetWidth; el.classList.add('denied');
    setTimeout(() => el.classList.remove('denied'), Config.ui.denyFlashDuration * 1000);
    g.hud.showToast(`CAPITAL INSUFICIENTE · FALTA ${falta}`);
    g.hud.flashCapitalDenied();
  }

  deselect() {
    this.ctrl.selected = -1;
    this.hoverLane = -1;
    this.game.hud.setLaneHint('');
    this.refresh();
  }

  // nome da lane como o jogador a vê (depende do lado da câmera: x=+6 é a frontal com cameraSide=+1)
  laneName(lane) {
    const front = Config.camera.cameraSide >= 0 ? 2 : 0;
    return lane === front ? 'LANE FRONTAL' : lane === 1 ? 'LANE CENTRAL' : 'LANE TRASEIRA';
  }

  onMouseMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.hoverLane = this.ctrl.selected >= 0 ? this._laneUnderMouse() : -1;
  }

  _laneUnderMouse() {
    this.raycaster.setFromCamera(this.mouse, this.game.cameraObj);
    const hits = this.raycaster.intersectObjects(this.game.arena.laneHighlights, false);
    return hits.length ? hits[0].object.userData.lane : -1;
  }

  onCanvasClick(e) {
    const g = this.game;
    g.audio.init(); g.audio.resume();
    if (!g.playing) return;
    if (this.ctrl.selected < 0) return;
    this.onMouseMove(e);
    const lane = this._laneUnderMouse();
    if (lane < 0) { this.deselect(); return; }
    const i = this.ctrl.selected;
    this._playAnim(i);
    if (this.ctrl.play(i, lane)) g.audio.play('cardPlay');
    g.hud.setLaneHint('');
    this.refresh(true);
  }

  _playAnim(i) {
    const el = this.cards[i];
    el.classList.remove('played', 'enter');
    void el.offsetWidth;
    el.classList.add('played');
    setTimeout(() => { el.classList.remove('played'); el.classList.add('enter'); }, 120);
  }

  refresh(force = false) {
    const ctrl = this.ctrl;
    const ids = ctrl.deck.hand;
    for (let i = 0; i < 4; i++) {
      const el = this.cards[i];
      const card = ctrl.deck.card(i);
      const cost = ctrl.cardCost(card);
      if (force || this._lastIds[i] !== card.id) {
        el.querySelector('.icon').textContent = card.icon;
        el.querySelector('.name').textContent = card.name;
        el.querySelector('.name').classList.toggle('long', card.name.length > 9);
        el.querySelector('.type').textContent = card.cls;
        el.classList.toggle('power', card.type === 'power');
        this._lastIds[i] = card.id;
      }
      el.querySelector('.cost').textContent = cost;
      el.classList.toggle('selected', ctrl.selected === i);
      el.classList.toggle('disabled', ctrl.capital < cost);
      this._lastReady[i] = -1;
    }
    const next = ctrl.deck.next;
    if (next) this.nextEl.textContent = next.icon;
  }

  update() {
    const ctrl = this.ctrl;
    if (ctrl.capital !== this._lastCapital) { this._lastCapital = ctrl.capital; this.refresh(); }
    const selecting = ctrl.selected >= 0;
    this.game.arena.setLaneHighlight(this.hoverLane, selecting);
    // barra "quanto falta" das cartas bloqueadas (só escreve no DOM quando muda ≥ 2%)
    const prog = ctrl.regenProgress;
    for (let i = 0; i < 4; i++) {
      const card = ctrl.deck.card(i);
      if (!card) continue;
      const cost = ctrl.cardCost(card);
      if (ctrl.capital >= cost) continue;
      const ready = Math.round(Math.min(1, (ctrl.capital + prog) / Math.max(1, cost)) * 50) / 50;
      if (ready !== this._lastReady[i]) { this._lastReady[i] = ready; this.cards[i].style.setProperty('--ready', ready); }
    }
    // hover de lane: hint com o nome + cursor
    const hover = selecting ? this.hoverLane : -1;
    if (hover !== this._lastHover) {
      this._lastHover = hover;
      if (selecting) {
        if (hover >= 0 && Config.ui.showLaneNameOnHover) this.game.hud.setLaneHint(`▶ ${this.laneName(hover)}`, true);
        else this.game.hud.setLaneHint('ESCOLHA UMA LANE');
      }
    }
    const cursor = selecting ? (hover >= 0 ? 'pointer' : 'crosshair') : '';
    if (cursor !== this._lastCursor) { this._lastCursor = cursor; this.canvas.style.cursor = cursor; }
  }
}
