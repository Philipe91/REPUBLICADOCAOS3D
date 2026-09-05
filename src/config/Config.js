// ============================================================
// CONFIG — todos os valores ajustáveis do jogo.
// Tudo aqui é editável em tempo real pelo lil-gui (tecla G).
// O botão COPIAR CONFIG copia este objeto (valores atuais) em JSON.
// ============================================================

export const Config = {
  game: {
    gameSpeed: 1.0,
    capitalRegen: 1.5,      // segundos por 1 ponto de Capital Político
    startingCapital: 5,
    maxCapital: 10,
    matchDuration: 180,     // segundos
    botDifficulty: 1.0,     // multiplica a "esperteza" e a velocidade de regen do bot
  },

  base: {
    baseHP: 5000,
    baseDamageFeedback: 1.0, // intensidade dos efeitos de dano na base
  },

  // ---------- CÂMERA LATERAL ----------
  // A lógica do jogo NÃO muda: o eixo principal continua sendo Z (base do jogador em
  // z = +20, base do bot em z = −20) e as lanes continuam em x = −6 / 0 / +6.
  // A vista lateral vem SÓ da câmera: ela fica no lado +X da arena e olha para −X.
  // Na tela, portanto:
  //   Z lógico  → HORIZONTAL (z = +20 do jogador à ESQUERDA, z = −20 do bot à DIREITA)
  //   X lógico  → PROFUNDIDADE (lane x = +6 frontal/perto, x = 0 central, x = −6 traseira)
  //   Y lógico  → vertical, como sempre.
  // A posição da câmera é DERIVADA do alvo (helper cameraPosition em CameraController.js):
  //   pos = (targetX + cameraSide * cameraDistance, cameraHeight, targetZ + cameraSideOffset)
  camera: {
    cameraSide: 1,          // +1 = câmera no lado +X (jogador à esquerda); −1 espelha a vista
    cameraDistance: 24,     // afastamento lateral da câmera (eixo X) em relação ao alvo
    cameraHeight: 11.5,     // altura (Y) absoluta da câmera
    cameraSideOffset: 0,    // deslocamento da câmera ao longo de Z (enquadramento horizontal)
    cameraFov: 51,
    cameraTargetX: 0,
    cameraTargetY: 1.7,
    cameraTargetZ: 0,
    cameraShakeStrength: 1.0,
  },

  lanes: {
    laneSpacing: 6,
    laneWidth: 4,
    spawnOffset: 3.5,       // distância da base onde a tropa nasce
    fieldLength: 44,        // comprimento total do campo (z)
  },

  combat: {
    globalDamageMultiplier: 1.0,
    globalHPMultiplier: 1.0,
    globalMoveSpeedMultiplier: 1.0,
    knockbackStrength: 1.0,
    hitStopDuration: 0.045, // pausa em golpes grandes (s). Fica em `combat` porque Unit.js/Powers.js leem daqui; o lil-gui mostra na seção TIME
    bigHitThreshold: 60,    // dano a partir do qual há hit-stop + shake
  },

  // ---------- TEMPO / GAME FEEL (core/TimeController.js) ----------
  time: {
    hitStopVisualRate: 0.05,        // fração do dt real que o visual roda durante o hit-stop
    hitStopBudgetPerSecond: 0.3,    // máximo de hit-stop concedido por segundo (horda não vira travada)
    slowMotionScale: 0.35,          // câmera lenta padrão: escala…
    slowMotionDuration: 0.25,       // …segurada por (s)…
    slowMotionRecovery: 0.15,       // …e retorno linear a 1 em (s)
    matchEndSlowScale: 0.25,        // slow-motion da destruição da base
    matchEndSlowDuration: 1.0,
    matchEndSlowRecovery: 0.3,
  },

  // ---------- UI / UX DAS CARTAS (ui/CardUI.js, ui/HUD.js) ----------
  ui: {
    toastDuration: 0.9,             // s que o aviso "CAPITAL INSUFICIENTE" fica na tela
    denyFlashDuration: 0.4,         // s do flash vermelho na carta e no Capital
    capitalTickPulse: true,         // pulso discreto no Capital a cada ponto ganho
    showLaneNameOnHover: true,      // "LANE FRONTAL/CENTRAL/TRASEIRA" ao passar o mouse
    laneHoverOpacity: 0.55,         // destaque dourado da lane sob o mouse (carta selecionada)
    laneSelectOpacity: 0.18,        // destaque das outras lanes enquanto se escolhe
  },

  // ---------- PERFORMANCE (debug/PerfStats.js) ----------
  perf: {
    showPerfOverlay: false,         // overlay leve (também ligado por ?debug=1)
    perfSampleWindow: 3,            // janela (s) para FPS médio / mínimo recente
  },

  bot: {
    botDecisionInterval: 1.4,
    botAggressiveness: 0.6,
    botDefenseBias: 0.7,
    botRandomness: 0.3,
  },

  visual: {
    characterScale: 1.0,
    baseVisualScale: 1.0,   // escala visual das SEDES DO PODER (ainda NÃO aplicada — Entrega B)
    headScale: 1.4,
    shadowEnabled: true,
    particleAmount: 1.0,
    floatingDamageEnabled: true,
    debugLaneMarkers: false,
    memeFrequency: 1.0,
  },

  debug: {
    showLaneCenters: false,
    showAttackRanges: false,
    showTargets: false,
    showSpawnPoints: false,
    showStats: false,
    showAIDecisions: false,
    autoPlayer: false,       // um bot joga pelo jogador (teste automático)
  },

  // ---------- UNIDADES ----------
  // hp, damage, moveSpeed (u/s), attackSpeed (ataques/s), attackRange (u), cost, spawnCount
  units: {
    militante: { hp: 60,   damage: 8,  moveSpeed: 3.2, attackSpeed: 1.6, attackRange: 1.1, cost: 1, spawnCount: 5, knockback: 0.2, scale: 0.75 },
    tiozap:    { hp: 150,  damage: 18, moveSpeed: 1.8, attackSpeed: 0.9, attackRange: 7.0, cost: 2, spawnCount: 1, knockback: 0.3, scale: 1.0, projectileSpeed: 14 },
    assessor:  { hp: 170,  damage: 10, moveSpeed: 2.0, attackSpeed: 1.0, attackRange: 1.3, cost: 2, spawnCount: 1, knockback: 0.3, scale: 1.0, auraRadius: 4.5, auraBonus: 0.15 },
    influencer:{ hp: 150,  damage: 20, moveSpeed: 1.9, attackSpeed: 1.0, attackRange: 6.0, cost: 3, spawnCount: 1, knockback: 0.3, scale: 1.0, projectileSpeed: 16, engajamentoBonus: 0.25, engajamentoMax: 4, engajamentoDuration: 6 },
    barbudo:   { hp: 650,  damage: 32, moveSpeed: 1.5, attackSpeed: 0.8, attackRange: 1.6, cost: 5, spawnCount: 1, knockback: 0.6, scale: 1.15, auraRadius: 5, auraBonus: 0.2, specialCooldown: 10, discursoRadius: 6, discursoBonus: 0.3, discursoDuration: 5 },
    capitao:   { hp: 400,  damage: 22, moveSpeed: 2.2, attackSpeed: 2.2, attackRange: 1.5, cost: 5, spawnCount: 1, knockback: 0.4, scale: 1.05, cercadinhoRadius: 4, cercadinhoBonus: 0.08, cercadinhoMax: 5, specialCooldown: 12 },
    careca:    { hp: 850,  damage: 95, moveSpeed: 1.3, attackSpeed: 0.5, attackRange: 1.9, cost: 6, spawnCount: 1, knockback: 1.6, scale: 1.2, specialCooldown: 9, stunDuration: 2.5 },
    dino:      { hp: 1300, damage: 45, moveSpeed: 1.0, attackSpeed: 0.7, attackRange: 1.7, cost: 7, spawnCount: 1, knockback: 1.0, scale: 1.3, jurassicDamageMult: 1.8, jurassicKnockbackMult: 2.2, jurassicSpeedMult: 0.7, jurassicScale: 1.35 },
    moto:      { hp: 1,    damage: 70, moveSpeed: 16,  attackSpeed: 0,   attackRange: 1.2, cost: 0, spawnCount: 3, knockback: 2.5, scale: 1.0 },
  },

  // ---------- PODERES (cartas instantâneas) ----------
  powers: {
    canetada: { cost: 4, damage: 220, radius: 3.5, knockback: 1.5 },
    motociata: { cost: 4, damage: 70, knockback: 2.5, motoCount: 3 },
    recesso:   { cost: 3, duration: 2.2 },
    pesquisa:  { cost: 2, duration: 8, bonus: 0.3 },
  },

  base_damage: {
    // dano das unidades contra a base é o damage normal × este multiplicador
    unitToBaseMultiplier: 1.0,
    tretaFinalRampPerSecond: 0.02, // +2% de dano na base por segundo de TRETA FINAL
    tretaFinalMaxOvertime: 60,
  },
};

// Decks padrão (8 cartas cada)
export const DefaultDecks = {
  player: ['militantes', 'tiozap', 'assessor', 'influencer', 'barbudo', 'capitao', 'careca', 'canetada'],
  bot:    ['militantes', 'tiozap', 'assessor', 'influencer', 'capitao', 'dino', 'motociata', 'careca'],
};

export const TEAM = { PLAYER: 'player', BOT: 'bot' };

export const TEAM_COLORS = {
  player: 0x2bb3c0,
  bot: 0xe8772e,
};

export function unitStats(type) {
  return Config.units[type];
}
