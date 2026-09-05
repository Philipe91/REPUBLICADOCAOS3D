// ============================================================
// DebugDraw — visualizações opcionais (lil-gui → DEBUG):
// ranges de ataque, linhas até o alvo, spawn points, stats, decisões do bot.
// ============================================================
import * as THREE from 'three';
import { Config } from '../config/Config.js';
import { G } from '../core/Assets.js';

export class DebugDraw {
  constructor(game) {
    this.game = game;
    this.overlay = document.getElementById('debug-overlay');
    this.rings = [];
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    this.lineGeo = new THREE.BufferGeometry();
    this.linePos = new Float32Array(600 * 6);
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lines = new THREE.LineSegments(this.lineGeo, new THREE.LineBasicMaterial({ color: 0xff0066 }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    game.scene.add(this.lines);
    this.spawnMarkers = new THREE.Group();
    for (const team of ['player', 'bot']) for (let l = 0; l < 3; l++) {
      const m = new THREE.Mesh(G.cone(0.3, 0.8, 6), new THREE.MeshBasicMaterial({ color: team === 'player' ? 0x2bb3c0 : 0xe8772e }));
      m.userData = { team, l };
      this.spawnMarkers.add(m);
    }
    this.spawnMarkers.visible = false;
    game.scene.add(this.spawnMarkers);
  }

  update() {
    const D = Config.debug;
    const g = this.game;
    // ranges
    const units = g.units.units;
    let ri = 0;
    if (D.showAttackRanges) {
      for (const u of units) {
        if (!u.alive) continue;
        let r = this.rings[ri];
        if (!r) { r = new THREE.Mesh(G.ring(0.95, 1, 32), this.ringMat); r.rotation.x = -Math.PI / 2; g.scene.add(r); this.rings.push(r); }
        r.visible = true;
        r.position.set(u.pos.x, 0.1, u.pos.z);
        r.scale.setScalar(u.attackRange + u.radius);
        ri++;
      }
    }
    for (let i = ri; i < this.rings.length; i++) this.rings[i].visible = false;
    // alvos
    this.lines.visible = D.showTargets;
    if (D.showTargets) {
      let n = 0;
      for (const u of units) {
        if (!u.alive || !u.target || n >= 600) continue;
        const t = u.target;
        const tz = t.isBase ? t.front : t.pos.z, tx = t.isBase ? u.pos.x : t.pos.x;
        this.linePos.set([u.pos.x, 1, u.pos.z, tx, 1, tz], n * 6);
        n++;
      }
      this.lineGeo.setDrawRange(0, n * 2);
      this.lineGeo.attributes.position.needsUpdate = true;
    }
    // spawn points
    this.spawnMarkers.visible = D.showSpawnPoints;
    if (D.showSpawnPoints) for (const m of this.spawnMarkers.children) m.position.set(g.arena.laneX(m.userData.l), 0.4, g.arena.spawnZ(m.userData.team));
    // overlay
    const show = D.showStats || D.showAIDecisions;
    this.overlay.classList.toggle('hidden', !show);
    if (show) {
      let s = '';
      if (D.showStats) {
        s += `FPS ${g.fps}\nunits ${g.units.count}  projectiles ${g.effects.projectiles.count}  particles ${g.effects.particles.count}\n`;
        s += `draw calls ${g.renderer.info.render.calls}  tris ${g.renderer.info.render.triangles}\n`;
        s += `match ${g.matchTime.toFixed(1)}s  ramp ${g.baseDamageRamp.toFixed(2)}\n`;
        s += `chaos ${g.chaos.value.toFixed(0)} (nível ${g.chaos.level})  memes ${g.memes.log.length}\n`;
        for (let l = 0; l < 3; l++) s += `lane ${l + 1}: P${g.units.lanes.player[l].length} / B${g.units.lanes.bot[l].length}\n`;
      }
      if (D.showAIDecisions) { s += '--- BOT ---\n' + g.bot.log.join('\n') + '\n'; if (D.autoPlayer) s += '--- AUTO PLAYER ---\n' + g.autoBot.log.join('\n'); }
      if (this.overlay.textContent !== s) this.overlay.textContent = s;
    }
  }
}
