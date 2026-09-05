// ============================================================
// PerfStats — métricas de desempenho (lil-gui → PERFORMANCE).
// Janela móvel de `Config.perf.perfSampleWindow` segundos: FPS atual (suavizado),
// FPS médio, FPS mínimo recente, frame ms; draw calls/triângulos do renderer;
// contagem de unidades, projéteis, partículas e textos flutuantes.
// Overlay opcional (1 DOM, criado sob demanda) só com showPerfOverlay ou ?debug=1.
// snapshot() devolve o JSON que o botão COPY PERF SNAPSHOT copia.
// ============================================================
import { Config } from '../config/Config.js';

export class PerfStats {
  constructor(game) {
    this.game = game;
    this.samples = [];       // { t, ms } dentro da janela
    this.fps = 0;
    this.fpsAvg = 0;
    this.fpsMinRecent = 0;
    this.frameMs = 0;
    this.drawCalls = 0;
    this.triangles = 0;
    this._smoothMs = 0;
    this._overlay = null;
    this._overlayTimer = 0;
    this._now = 0;
  }

  update(rawDt) {
    const ms = rawDt * 1000;
    this._now += rawDt;
    const win = Math.max(0.25, Config.perf.perfSampleWindow);
    this.samples.push({ t: this._now, ms });
    while (this.samples.length && this._now - this.samples[0].t > win) this.samples.shift();

    this._smoothMs = this._smoothMs ? this._smoothMs * 0.9 + ms * 0.1 : ms;
    this.frameMs = this._smoothMs;
    this.fps = this._smoothMs > 0 ? 1000 / this._smoothMs : 0;
    let sum = 0, worst = 0;
    for (const s of this.samples) { sum += s.ms; if (s.ms > worst) worst = s.ms; }
    this.fpsAvg = sum > 0 ? 1000 * this.samples.length / sum : 0;
    this.fpsMinRecent = worst > 0 ? 1000 / worst : 0;

    const info = this.game.renderer.info.render;   // do frame recém renderizado
    this.drawCalls = info.calls;
    this.triangles = info.triangles;

    const show = Config.perf.showPerfOverlay;
    if (show) {
      this._overlayTimer -= rawDt;
      if (this._overlayTimer <= 0) { this._overlayTimer = 0.25; this._render(); }
    } else if (this._overlay) this._overlay.hidden = true;
  }

  get counts() {
    const g = this.game;
    let units = 0;
    for (const u of g.units.units) if (u.alive) units++;
    return {
      units,
      unitsTotal: g.units.count,
      projectiles: g.effects.projectiles.count,
      particles: g.effects.particles.count,
      floatingTexts: g.effects.text.items.length,
    };
  }

  snapshot() {
    const c = this.counts;
    return {
      fps: Math.round(this.fps),
      fpsAvg: Math.round(this.fpsAvg),
      fpsMinRecent: Math.round(this.fpsMinRecent),
      frameMs: +this.frameMs.toFixed(2),
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      units: c.units,
      unitsTotal: c.unitsTotal,
      projectiles: c.projectiles,
      particles: c.particles,
      floatingTexts: c.floatingTexts,
      stressUnits: this.game.stress ? this.game.stress.count : 0,
      resolution: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
      gameSpeed: Config.game.gameSpeed,
      timeScale: +this.game.time.scale.toFixed(3),
      sampleWindow: Config.perf.perfSampleWindow,
    };
  }

  async copySnapshot() {
    const json = JSON.stringify(this.snapshot(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      this.game.effects.text.meme('PERF COPIADO!', { color: '#7ad7ff', force: true });
    } catch (e) {
      console.log(json);
      window.prompt('Copie o JSON abaixo:', json);
    }
  }

  _render() {
    if (!this._overlay) {
      this._overlay = document.createElement('div');
      this._overlay.id = 'perf-overlay';
      document.body.appendChild(this._overlay);
    }
    this._overlay.hidden = false;
    const c = this.counts;
    const t = this.game.time;
    const s = `FPS ${Math.round(this.fps)}  avg ${Math.round(this.fpsAvg)}  min ${Math.round(this.fpsMinRecent)}\n`
      + `frame ${this.frameMs.toFixed(1)} ms\n`
      + `calls ${this.drawCalls}  tris ${this.triangles}\n`
      + `units ${c.units}  proj ${c.projectiles}  part ${c.particles}  txt ${c.floatingTexts}\n`
      + `time ×${Config.game.gameSpeed} slow ${t.scale.toFixed(2)}${t.inHitStop ? ' HIT-STOP' : ''}\n`
      + `chaos ${this.game.chaos ? this.game.chaos.value.toFixed(0) : '-'} L${this.game.chaos ? this.game.chaos.level : '-'}`;
    if (this._overlay.textContent !== s) this._overlay.textContent = s;
  }
}
