// ============================================================
// StressTest — spawna unidades REAIS do jogo em massa para medir FPS, draw calls
// e bugs de targeting (lil-gui → STRESS TEST). Não usa cartas, Capital nem deck.
// Unidades ganham `debugSpawn = true`: a Base ignora dano vindo delas (Base.takeDamage),
// então o teste não termina a partida sozinho. CLEAR remove só essas unidades.
// ============================================================
import { Config } from '../config/Config.js';

// mistura ponderada: horda comum + todos os tipos jogáveis
const POOL = ['militante', 'militante', 'tiozap', 'assessor', 'militante', 'influencer', 'barbudo', 'capitao', 'careca', 'dino'];

export class StressTest {
  constructor(game) {
    this.game = game;
    this.lastCount = 0;
  }

  get count() { let n = 0; for (const u of this.game.units.units) if (u.debugSpawn) n++; return n; }

  // Gera `n` unidades: times alternados, 3 lanes em rodízio, espalhadas ao longo da
  // metade do campo de cada time (fileiras a partir do spawn), 1 boneco por spawn.
  run(n) {
    const g = this.game;
    if (!g.playing || g.ended) { g.screens.hideAll(); g.startMatch(g.screens.playerDeck); }
    this.clear();
    const half = Config.lanes.fieldLength / 2;
    for (let i = 0; i < n; i++) {
      const team = i % 2 === 0 ? 'player' : 'bot';
      const lane = Math.floor(i / 2) % 3;
      const type = POOL[i % POOL.length];
      const dir = team === 'player' ? -1 : 1;
      const row = Math.floor(i / 6);
      const z = g.arena.spawnZ(team) + dir * Math.min(half - 7, row * 1.7 + Math.random() * 0.8);
      const spawned = g.units.spawn(type, team, lane, { count: 1, z });
      for (const u of spawned) u.debugSpawn = true;
    }
    this.lastCount = n;
    g.effects.text.meme(`STRESS TEST ${n}`, { color: '#7ad7ff', force: true, duration: 1.2 });
    return n;
  }

  // Remove todas as unidades de debug (vivas ou morrendo), limpa projéteis e listas por lane.
  clear() {
    const g = this.game;
    const list = g.units.units;
    let removed = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const u = list[i];
      if (!u.debugSpawn) continue;
      u.alive = false;                       // quem mirava nela re-escolhe alvo (targetValid → alive)
      if (u.behavior?.onDeath) u.behavior.onDeath(u);
      u.dispose();
      list.splice(i, 1);
      removed++;
    }
    // quem ainda mirava numa unidade removida perde o alvo agora (Unit re-escolhe no próximo update)
    for (const u of list) if (u.target && u.target.debugSpawn) u.target = null;
    g.units._rebuild();
    g.effects.projectiles.clear();
    if (removed) g.effects.text.meme('STRESS LIMPO', { color: '#7ad7ff', force: true, duration: 0.8 });
    this.lastCount = 0;
    return removed;
  }
}
