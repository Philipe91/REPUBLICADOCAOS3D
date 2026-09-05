// ============================================================
// Profiles — personalidade de MOVIMENTO por personagem. SÓ DADOS.
// Cada campo é um multiplicador/parâmetro lido pelas funções de ProceduralAnimations
// e pelo ProceduralAnimator; personalidade = variação de parâmetros, não código novo.
//   tempo      velocidade das animações cíclicas (idle/walk)
//   bob        amplitude do sobe-desce (passos pesados = bob alto e tempo baixo)
//   armSwing   balanço dos braços ao andar
//   rigidity   0 = solto/expressivo … 1 = duro/militar (reduz balanço de cabeça e braços)
//   lean       inclinação do corpo no ataque e na caminhada
//   gesture    gesto de idle (Gestures.js) · gestureEvery (s) · gestureDuration (s)
//   jitter     variação aleatória por instância (horda não sincroniza): ±jitter em tempo/bob/armSwing
//   deathBias  variação de morte preferida quando a força permite (null = tabela)
// Novos personagens: acrescentar uma linha aqui (e um gesto em Gestures.js se precisar).
// ============================================================

export const PROFILES = {
  default:    { tempo: 1.0,  bob: 1.0, armSwing: 1.0, rigidity: 0.4, lean: 1.0, gesture: null,      gestureEvery: 4.0, gestureDuration: 1.2, jitter: 0,   deathBias: null },
  militante:  { tempo: 1.25, bob: 1.3, armSwing: 1.2, rigidity: 0.2, lean: 1.1, gesture: 'shout',   gestureEvery: 2.5, gestureDuration: 0.9, jitter: 0.3, deathBias: null },
  tiozap:     { tempo: 0.9,  bob: 0.8, armSwing: 0.8, rigidity: 0.5, lean: 0.9, gesture: 'phone',   gestureEvery: 3.5, gestureDuration: 1.6, jitter: 0,   deathBias: null },
  assessor:   { tempo: 1.05, bob: 0.9, armSwing: 0.7, rigidity: 0.7, lean: 0.8, gesture: 'papers',  gestureEvery: 3.0, gestureDuration: 1.3, jitter: 0,   deathBias: null },
  influencer: { tempo: 1.1,  bob: 1.2, armSwing: 1.1, rigidity: 0.3, lean: 1.0, gesture: 'pose',    gestureEvery: 3.0, gestureDuration: 1.4, jitter: 0,   deathBias: null },
  barbudo:    { tempo: 0.85, bob: 1.1, armSwing: 1.3, rigidity: 0.3, lean: 1.2, gesture: 'mic',     gestureEvery: 3.2, gestureDuration: 1.5, jitter: 0,   deathBias: null },
  capitao:    { tempo: 1.0,  bob: 0.6, armSwing: 0.5, rigidity: 1.0, lean: 0.7, gesture: 'salute',  gestureEvery: 4.0, gestureDuration: 1.2, jitter: 0,   deathBias: null },
  careca:     { tempo: 0.72, bob: 0.5, armSwing: 0.6, rigidity: 0.8, lean: 1.3, gesture: 'pen',     gestureEvery: 3.6, gestureDuration: 1.6, jitter: 0,   deathBias: null },
  dino:       { tempo: 0.7,  bob: 1.5, armSwing: 0.9, rigidity: 0.6, lean: 1.2, gesture: 'stretch', gestureEvery: 3.8, gestureDuration: 1.4, jitter: 0,   deathBias: null },
  moto:       { tempo: 1.0,  bob: 0,   armSwing: 0,   rigidity: 1.0, lean: 1.0, gesture: null,      gestureEvery: 99,  gestureDuration: 0,   jitter: 0,   deathBias: null },
};

// Perfil de UMA instância: default ← tipo, com jitter aleatório (horda visivelmente dessincronizada).
export function profileFor(type, rnd = Math.random) {
  const p = { ...PROFILES.default, ...(PROFILES[type] || {}) };
  if (p.jitter > 0) {
    const j = () => 1 + (rnd() - 0.5) * 2 * p.jitter;
    p.tempo *= j(); p.bob *= j(); p.armSwing *= j();
  }
  return p;
}
