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

const MEMES = ['TRETA!', 'EITA!', 'QUE FASE!', 'NÃO VALE PRINT!', 'TÁ OK?', 'CADÊ O PIX?', 'VAZOU!'];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = createRenderer(canvas);
    const { scene, sun } = createScene();
    this.scene = scene;
    this.sun = sun;
    this.cameraObj = createCamera();
    this.camera = new CameraController(this.cameraObj);

    this.audio = new AudioManager();
    this.arena = new Arena(scene);
    this.effects = {
      particles: new ParticleManager(scene),
      text: new FloatingTextManager(scene),
      projectiles: new ProjectileManager(scene),
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
    this.memeTimer = 8;
    this.endTimer = 0;
    this.result = null;
    this.clock = new THREE.Clock();
    this.lastFrame = performance.now();

    bus.on('baseDestroyed', ({ base }) => this.onBaseDestroyed(base));
    bus.on('unitDied', ({ unit, killer }) => { if (this.playing) this.kills[unit.team === 'player' ? 'bot' : 'player']++; });
    bus.on('unitHit', ({ dmg }) => { if (dmg > 80 && Math.random() < 0.15) this.effects.text.meme('TRETA!'); });
    bus.on('baseStage', ({ base, stage }) => { if (stage === 3) this.effects.text.meme(base.team === 'player' ? 'A CASA TÁ CAINDO!' : 'ELES TÃO CAINDO!', { color: '#ff5a5a', force: true }); });

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
    this.memeTimer = 8;
    this.hud.show(true);
    this.cardUI.refresh(true);
    this.effects.text.meme('BATALHA PELO PLANALTO!', { color: '#ffd23f', force: true, duration: 1.6 });
    bus.emit('matchStart');
  }

  clearMatch() {
    this.units.clear();
    this.powers.clear();
    this.effects.particles.clear();
    this.effects.text.clear();
    this.effects.projectiles.clear();
    this.time.reset();
    this.camera.shake = 0;
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

  finish(victory) {
    this.ended = true;
    this.result = victory ? 'victory' : 'defeat';
    this.endTimer = 2.6;
    this.time.slowMotion(Config.time.matchEndSlowScale, Config.time.matchEndSlowDuration, Config.time.matchEndSlowRecovery);
    this.camera.addShake(1.4);
    this.camera.zoomPunch = 6;
    this.units.celebrate(victory ? 'player' : 'bot');
    this.effects.text.meme(victory ? 'CRISE INSTITUCIONAL!' : 'A CASA CAIU!', { color: victory ? '#ffd23f' : '#ff5a5a', force: true, duration: 2.5 });
    this.audio.play('baseDestroyed');
    setTimeout(() => this.audio.play(victory ? 'victory' : 'defeat'), 700);
    bus.emit('matchEnd', { victory });
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
        this.memeTimer -= dt;
        if (this.memeTimer <= 0 && this.units.count > 4) {
          this.memeTimer = 14 + Math.random() * 10;
          this.effects.text.meme(MEMES[Math.floor(Math.random() * MEMES.length)]);
        }
      } else {
        this.endTimer -= raw;
        if (this.endTimer <= 0 && this.playing) this.showEndScreen();
      }
      this.units.update(dt, visualDt);
      this.powers.update(dt);
      this.effects.projectiles.update(dt);
      this.cardUI.update();
      this.hud.update();
    }
    this.bases.player.update(visualDt);
    this.bases.bot.update(visualDt);
    this.effects.particles.update(visualDt);
    this.effects.text.update(raw);
    this.effects.healthBars.update(this.units.units);
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
      this.effects.text.meme('TRETA FINAL!', { color: '#ff5a5a', force: true, duration: 2 });
      this.camera.addShake(0.6);
      this.audio.play('special');
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
