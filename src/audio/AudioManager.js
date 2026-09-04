// ============================================================
// AudioManager — sons placeholder sintetizados com WebAudio.
// Nenhum arquivo externo. Futuramente: carregar samples em load().
// Eventos: hit, spawn, attack, special, baseHit, victory, defeat,
//          cardSelect, capitalFull, stun, moto, canetada
// ============================================================
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.35;
    this.samples = {};       // futuro: { hit: AudioBuffer }
    this.lastPlay = {};
  }

  // precisa de gesto do usuário; chamado no primeiro clique
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  _tone({ freq = 440, freq2 = null, type = 'square', dur = 0.1, gain = 0.3, delay = 0, decay = true }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    if (decay) g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.15, gain = 0.2, delay = 0, lp = 2000 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }

  // limita repetição (muitos hits no mesmo frame)
  _throttle(name, ms) {
    const now = performance.now();
    if (this.lastPlay[name] && now - this.lastPlay[name] < ms) return false;
    this.lastPlay[name] = now;
    return true;
  }

  play(name, opts = {}) {
    if (!this.ctx || !this.enabled) return;
    if (this.samples[name]) { this._playSample(name); return; }
    switch (name) {
      case 'hit':
        if (!this._throttle('hit', 40)) return;
        this._tone({ freq: 220 + Math.random() * 80, freq2: 90, type: 'square', dur: 0.08, gain: 0.18 });
        this._noise({ dur: 0.06, gain: 0.12, lp: 1500 });
        break;
      case 'bigHit':
        this._tone({ freq: 140, freq2: 40, type: 'sawtooth', dur: 0.25, gain: 0.35 });
        this._noise({ dur: 0.25, gain: 0.3, lp: 900 });
        break;
      case 'attack':
        if (!this._throttle('attack', 60)) return;
        this._noise({ dur: 0.08, gain: 0.08, lp: 4000 });
        break;
      case 'spawn':
        this._tone({ freq: 330, freq2: 660, type: 'triangle', dur: 0.12, gain: 0.2 });
        break;
      case 'special':
        this._tone({ freq: 400, freq2: 900, type: 'sawtooth', dur: 0.3, gain: 0.22 });
        this._tone({ freq: 600, freq2: 1300, type: 'square', dur: 0.3, gain: 0.12, delay: 0.08 });
        break;
      case 'baseHit':
        if (!this._throttle('baseHit', 80)) return;
        this._tone({ freq: 110, freq2: 50, type: 'sawtooth', dur: 0.2, gain: 0.25 });
        this._noise({ dur: 0.15, gain: 0.2, lp: 700 });
        break;
      case 'baseDestroyed':
        this._tone({ freq: 90, freq2: 25, type: 'sawtooth', dur: 1.2, gain: 0.5 });
        this._noise({ dur: 1.0, gain: 0.5, lp: 500 });
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => this._tone({ freq: f, type: 'square', dur: 0.25, gain: 0.2, delay: i * 0.16 }));
        break;
      case 'defeat':
        [392, 349, 311, 262].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.4, gain: 0.25, delay: i * 0.25 }));
        break;
      case 'cardSelect':
        this._tone({ freq: 880, freq2: 1100, type: 'triangle', dur: 0.07, gain: 0.15 });
        break;
      case 'cardPlay':
        this._tone({ freq: 660, freq2: 990, type: 'square', dur: 0.1, gain: 0.15 });
        break;
      case 'capitalFull':
        this._tone({ freq: 1200, type: 'sine', dur: 0.08, gain: 0.12 });
        this._tone({ freq: 1600, type: 'sine', dur: 0.1, gain: 0.12, delay: 0.09 });
        break;
      case 'stun':
        this._tone({ freq: 1500, freq2: 300, type: 'square', dur: 0.35, gain: 0.2 });
        break;
      case 'moto':
        for (let i = 0; i < 6; i++) this._tone({ freq: 80 + i * 25, freq2: 60 + i * 40, type: 'sawtooth', dur: 0.15, gain: 0.2, delay: i * 0.1 });
        break;
      case 'canetada':
        this._tone({ freq: 900, freq2: 100, type: 'sawtooth', dur: 0.5, gain: 0.3 });
        this._noise({ dur: 0.3, gain: 0.3, lp: 800, delay: 0.45 });
        break;
      case 'zap':
        if (!this._throttle('zap', 80)) return;
        this._tone({ freq: 1200, freq2: 1500, type: 'sine', dur: 0.06, gain: 0.1 });
        this._tone({ freq: 1500, freq2: 1200, type: 'sine', dur: 0.06, gain: 0.1, delay: 0.07 });
        break;
      case 'error':
        this._tone({ freq: 200, freq2: 120, type: 'square', dur: 0.15, gain: 0.15 });
        break;
      default:
        break;
    }
  }

  _playSample(name) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.samples[name];
    src.connect(this.master);
    src.start();
  }

  // Futuro: carregar samples reais. Se falhar, continua com placeholders.
  async load(name, url) {
    try {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      this.samples[name] = await this.ctx.decodeAudioData(ab);
    } catch (e) { /* placeholder continua */ }
  }
}
