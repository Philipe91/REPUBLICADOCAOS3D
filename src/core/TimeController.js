// ============================================================
// TimeController — ÚNICA fonte de manipulação de tempo do jogo.
//
//   rawDt    relógio real (frame)            → UI, câmera, texto de tela, debug, perf
//   gameDt   rawDt × gameSpeed × slowScale   → unidades, combate, projéteis, bot, Capital,
//            (0 durante hit-stop)              cronômetro da partida, poderes
//   visualDt igual a gameDt, mas durante o hit-stop roda a `hitStopVisualRate`
//            → bases, partículas de mundo, animação dos bonecos (quase congelada)
//
// Ninguém fora daqui mexe em escala de tempo. Sistemas de jogo chamam
// hitStop()/slowMotion(); o loop chama update(rawDt) uma vez por frame e lê
// gameDt/visualDt. Sem dependência de Three.js (testável em Node: test/time.mjs).
// ============================================================
import { Config } from '../config/Config.js';

export class TimeController {
  constructor() {
    this.hitStopTimer = 0;   // segundos restantes de hit-stop
    this.slows = [];         // efeitos ativos: { scale, hold, recovery, t }
    this.scale = 1;          // escala efetiva de slow-motion do último frame (sem gameSpeed)
    this.rawDt = 0;
    this.gameDt = 0;
    this.visualDt = 0;
    this.inHitStop = false;
    this.matchMultiplier = 1; // ex.: TRETA FINAL (Config.game.tretaFinalSpeedMultiplier); o Game define
    this._budgetUsed = 0;    // hit-stop concedido na janela de 1 s corrente
    this._budgetClock = 0;
  }

  // gameSpeed vive em Config.game.gameSpeed (lil-gui, ?speed=N, COPIAR CONFIG). Aqui só há a API.
  get gameSpeed() { return Config.game.gameSpeed; }
  setGameSpeed(v) { Config.game.gameSpeed = Math.max(0.05, Number(v) || 1); }

  // Congela o jogo por `duration` s. Novo hit-stop só ESTENDE o que já existe (nunca soma)
  // e respeita um orçamento por segundo (Config.time.hitStopBudgetPerSecond) para o
  // combate em horda não virar uma sequência de travadas. `force` ignora o orçamento (debug).
  hitStop(duration, { force = false } = {}) {
    if (!(duration > 0)) return false;
    let ext = Math.max(0, duration - this.hitStopTimer);
    if (!force) ext = Math.min(ext, Math.max(0, Config.time.hitStopBudgetPerSecond - this._budgetUsed));
    if (ext <= 0) return false;
    this.hitStopTimer += ext;
    if (!force) this._budgetUsed += ext;
    return true;
  }

  // Câmera lenta: segura `scale` por `duration` s e volta a 1 linearmente em `recovery` s.
  // Vários ao mesmo tempo: vale o MENOR scale entre os ativos; cada um expira sozinho.
  slowMotion(scale = Config.time.slowMotionScale, duration = Config.time.slowMotionDuration, recovery = Config.time.slowMotionRecovery) {
    scale = Math.min(1, Math.max(0.01, scale));
    this.slows.push({ scale, hold: Math.max(0, duration), recovery: Math.max(0, recovery), t: 0 });
    if (this.slows.length > 8) this.slows.shift();
  }

  // Volta tudo ao normal imediatamente (restart, fim de partida → menu, botão RESET TIME SCALE).
  reset() {
    this.hitStopTimer = 0;
    this.slows.length = 0;
    this.scale = 1;
    this.inHitStop = false;
    this.matchMultiplier = 1;
    this._budgetUsed = 0;
    this._budgetClock = 0;
  }

  get active() { return this.inHitStop || this.slows.length > 0; }

  // Chamado UMA vez por frame com o dt real. Devolve this (gameDt/visualDt/scale prontos).
  update(rawDt) {
    const c = Config.time;
    this.rawDt = rawDt;

    this._budgetClock += rawDt;
    if (this._budgetClock >= 1) { this._budgetClock = 0; this._budgetUsed = 0; }

    let s = 1;
    for (let i = this.slows.length - 1; i >= 0; i--) {
      const e = this.slows[i];
      e.t += rawDt;
      let cur;
      if (e.t < e.hold) cur = e.scale;
      else if (e.t < e.hold + e.recovery) cur = e.scale + (1 - e.scale) * ((e.t - e.hold) / e.recovery);
      else { this.slows.splice(i, 1); continue; }
      if (cur < s) s = cur;
    }
    this.scale = s;

    let gameDt = rawDt * this.gameSpeed * this.matchMultiplier * s;
    let visualDt = gameDt;
    this.inHitStop = false;
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - rawDt);
      gameDt = 0;
      visualDt = rawDt * c.hitStopVisualRate;
      this.inHitStop = true;
    }
    this.gameDt = gameDt;
    this.visualDt = visualDt;
    return this;
  }
}
