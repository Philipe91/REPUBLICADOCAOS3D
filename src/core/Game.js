// ============================================================
// Game — orquestra tudo: loop, partida, estados, vitória/derrota.
// ============================================================
import * as THREE from 'three';
import { Config, DefaultDecks } from '../config/Config.js';
import { DECK_SIZE } from '../config/Cards.js';
import { bus } from './EventBus.js';
import { createRenderer, createScene, createCamera } from '../scene/SceneSetup.js';
import { CameraController } from '../scene/CameraController.js';
import { Arena } from '../scene/Arena.js';
import { Base } from '../scene/Base.js';
import { ParticleManager } from '../effects/ParticleManager.js';
import { FloatingTextManager } from '../effects/FloatingTextManager.js';
import { ProjectileManager } from '../effects/ProjectileManager.js';
import { HealthBarManager } from '../effects/HealthBarManager.js';
import { SpawnEffects } from '../effects/SpawnEffects.js';
import { HitEffects } from '../effects/HitEffects.js';
import { SpecialEffects } from '../effects/SpecialEffects.js';
import { PowerEffects } from '../effects/PowerEffects.js';
import { MatchEffects } from '../effects/MatchEffects.js';
import { ChaosScore } from './ChaosScore.js';
import { MemeDirector } from '../effects/MemeDirector.js';
import { AudioManager } from '../audio/AudioManager.js';
import { UnitManager } from '../units/UnitManager.js';
import { Powers } from '../cards/Powers.js';
import { PlayerController } from '../cards/PlayerController.js';
import { Bot } from '../ai/Bot.js';
import { HUD } from '../ui/HUD.js';
import { CardUI } from '../ui/CardUI.js';
import { Screens } from '../ui/Screens.js';
import { DebugDraw } from '../debug/DebugDraw.js';
import { TimeController } from './TimeController.js';
import { PerfStats } from '../debug/PerfStats.js';
import { StressTest } from '../debug/StressTest.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = createRenderer(canvas);
    const { scene, sun, hemi } = createScene();
    this.scene = scene;
    this.sun = sun;
    this.hemi = hemi;
    this.cameraObj = createCamera();
    this.camera = new CameraController(this.cameraObj);

    this.audio = new AudioManager();
    this.arena = new Arena(scene);
    const particles = new ParticleManager(scene);
    this.effects = {
      particles,
      text: new FloatingTextManager(scene),
      projectiles: new ProjectileManager(scene, particles),
      healthBars: new HealthBarManager(scene, this.cameraObj),
    };
    this.bases = {
      player: new Base(scene, this.arena, 'player', this.effects),
      bot: new Base(scene, this.arena, 'bot', this.effects),
    };
    this.units = new UnitManager(this);
    this.powers = new Powers(this);
    this.player = new PlayerController(this, 'player', DefaultDecks.player);
    this.botCtrl = new PlayerController(this, 'bot', DefaultDecks.bot);
    this.bot = new Bot(this, this.botCtrl);
    this.autoBot = new Bot(this, this.player);   // joga pelo jogador em modo de teste
    this.hud = new HUD(this);
    this.cardUI = new CardUI(this);
    this.screens = new Screens(this);
    this.debugDraw = new DebugDraw(this);
    this.spawnFx = new SpawnEffects(this);   // apresentação: só escuta unitSpawned
    this.hitFx = new HitEffects(this);       // apresentação: só escuta unitDamaged/unitDied
    this.specialFx = new SpecialEffects(this); // apresentação: só escuta specialStart/End, engagementGain
    this.powerFx = new PowerEffects(this);     // apresentação: powerStart/powerImpact (marcador, sombra, onda…)
    this.matchFx = new MatchEffects(this);     // apresentação: baseCritical, tretaFinal, matchEnd
    this.chaos = new ChaosScore();             // termômetro do caos (lógica de leitura; emite chaosSpike)
    this.memes = new MemeDirector(this);       // apresentação: memes contextuais por tabela
    this.time = new TimeController();     // única fonte de escala de tempo (hit-stop, slow-mo, gameSpeed)
    this.perf = new PerfStats(this);
    this.stress = new StressTest(this);

    this.playing = false;
    this.ended = false;
    this.matchTime = 0;
    this.tretaFinal = false;
    this.overtime = 0;
    this.baseDamageRamp = 1;
    this.kills = { player: 0, bot: 0 };
    this.fps = 0;                          // espelho de perf.fps (DebugDraw / testes)
    this.endTimer = 0;
    this.result = null;
    this.clock = new THREE.Clock();
    this.lastFrame = performance.now();

    bus.on('baseDestroyed', ({ base }) => this.onBaseDestroyed(base));
    bus.on('unitDied', ({ unit, killer }) => { if (this.playing) this.kills[unit.team === 'player' ? 'bot' : 'player']++; });

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this.screens.showMenu();
    this.hud.show(false);
    this.renderer.setAnimationLoop(() => this.frame());
  }

  base(team) { return this.bases[team]; }
  enemyBase(team) { return this.bases[team === 'player' ? 'bot' : 'player']; }
  get timeLeft() { return Config.game.matchDuration - this.matchTime; }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cameraObj.aspect = w / h;
    this.cameraObj.updateProjectionMatrix();
  }

  hitStop(t) { this.time.hitStop(t); }   // atalho usado por Unit/Powers; a lógica vive no TimeController

  // ---------------- partida ----------------
  startMatch(playerDeck = null) {
    this.clearMatch();
    let deck = (playerDeck || DefaultDecks.player).slice();
    while (deck.length < DECK_SIZE) deck.push(deck[deck.length % Math.max(1, deck.length)]);
    this.player = new PlayerController(this, 'player', deck);
    this.autoBot = new Bot(this, this.player);
    this.botCtrl.reset();
    this.bot.reset();
    this.bases.player.reset();
    this.bases.bot.reset();
    this.playing = true;
    this.ended = false;
    this.result = null;
    this.matchTime = 0;
    this.tretaFinal = false;
    this.overtime = 0;
    this.baseDamageRamp = 1;
    this.kills = { player: 0, bot: 0 };
    this.hud.show(true);
    this.cardUI.refresh(true);
    this.effects.text.meme('BATALHA PELO PLANALTO!', { color: '#ffd23f', force: true, duration: 1.6 });
    bus.emit('matchStart');
  }

  clearMatch() {
    this.units.clear();
    this.powers.clear();
    this.powerFx.clear();
    this.effects.particles.clear();
    this.effects.text.clear();
    this.effects.projectiles.clear();
    this.time.reset();
    this.camera.shake = 0;
    bus.emit('matchCleared');
  }

  endToMenu() {
    this.playing = false;
    this.ended = false;
    this.clearMatch();
    this.bases.player.reset();
    this.bases.bot.reset();
    this.hud.show(false);
  }

  onBaseDestroyed(base) {
    if (!this.playing || this.ended) return;
    const victory = base.team === 'bot';
    this.finish(victory);
  }

  // Fim da partida: só estado + vencedores comemoram; slow-mo/câmera/meme/som ficam em MatchEffects (matchEnd)
  finish(victory) {
    this.ended = true;
    this.result = victory ? 'victory' : 'defeat';
    this.endTimer = 2.6;
    this.time.matchMultiplier = 1;
    this.units.celebrate(victory ? 'player' : 'bot');
    const destroyed = this.bases.player.destroyed ? this.bases.player : this.bases.bot.destroyed ? this.bases.bot : null;
    bus.emit('matchEnd', { victory, base: destroyed });
  }

  showEndScreen() {
    const victory = this.result === 'victory';
    const t = Math.floor(this.matchTime);
    const coins = victory ? 100 + this.kills.player * 5 + Math.round(this.bases.player.hpPercent * 100) : 20 + this.kills.player * 2;
    this.screens.showEnd(victory, {
      coins, cards: this.player.cardsPlayed, kills: this.kills.player,
      time: `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`,
    });
    this.playing = false;
  }

  // ---------------- loop ----------------
  frame() {
    const now = performance.now();
    const raw = Math.min(0.05, (now - this.lastFrame) / 1000);   // tempo REAL do frame
    this.lastFrame = now;

    // luz/sombras (lil-gui em tempo real)
    if (this.renderer.shadowMap.enabled !== Config.visual.shadowEnabled) {
      this.renderer.shadowMap.enabled = Config.visual.shadowEnabled;
      this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    }
    this.arena.setDebugMarkers(Config.visual.debugLaneMarkers || Config.debug.showLaneCenters);
    if (this.scene.fog) { this.scene.fog.near = Config.clutter.fogNear; this.scene.fog.far = Config.clutter.fogFar; }

    // gameDt: partida, unidades, bot, Capital, poderes, projéteis. visualDt: bases, partículas de mundo.
    // raw: UI, texto de tela, câmera, timer da tela final, perf. Ver TimeController.
    const { gameDt: dt, visualDt } = this.time.update(raw);

    if (this.playing) {
      if (!this.ended) {
        this.matchTime += dt;
        this.updateMatchPhase(dt);
        const regen = this.tretaFinal ? 2 : 1;
        this.player.update(dt, regen);
        this.botCtrl.update(dt, regen * Math.max(0.5, Config.game.botDifficulty));
        this.bot.update(dt);
        if (Config.debug.autoPlayer) this.autoBot.update(dt);
        this.chaos.update(dt);
        this.memes.update(dt);
      } else {
        this.endTimer -= raw;
        if (this.endTimer <= 0 && this.playing) this.showEndScreen();
      }
      this.units.update(dt, visualDt);
      this.powers.update(dt);
      this.powerFx.update(visualDt);
      this.effects.projectiles.update(dt);
      this.cardUI.update();
      this.hud.update();
    }
    this.bases.player.update(visualDt);
    this.bases.bot.update(visualDt);
    this.effects.particles.update(visualDt);
    this.effects.text.update(raw);
    this.effects.healthBars.update(this.units.units);
    this.matchFx.update(raw);
    this.camera.update(raw);
    this.debugDraw.update();
    this.renderer.render(this.scene, this.cameraObj);
    this.perf.update(raw);
    this.fps = Math.round(this.perf.fps);
  }

  updateMatchPhase(dt) {
    const BD = Config.base_damage;
    if (!this.tretaFinal && this.matchTime >= Config.game.matchDuration) {
      this.tretaFinal = true;
      this.time.matchMultiplier = Config.game.tretaFinalSpeedMultiplier;   // jogo acelera na Treta
      bus.emit('tretaFinal', { overtimeMax: BD.tretaFinalMaxOvertime });    // MatchEffects: vinheta, luzes, alerta, som
    }
    if (this.tretaFinal) {
      this.overtime += dt;
      this.baseDamageRamp = 1 + this.overtime * BD.tretaFinalRampPerSecond;
      if (this.overtime >= BD.tretaFinalMaxOvertime) {
        // desempate: quem tem mais HP na base vence
        const pv = this.bases.player.hp, bv = this.bases.bot.hp;
        this.finish(pv >= bv);
      }
    }
  }
}
