// ============================================================
// Deaths — 5 mortes procedurais (funções puras como em ProceduralAnimations).
// A variante é escolhida pela FORÇA do golpe fatal (tabela abaixo); a Unit só
// passa `strength` em playDeath(). Todas terminam em ~0,9 s e afundam no chão a
// partir de 1,0 s (Unit.deathTimer = 1,6 s).
//   0 tomba de costas com pulinho      (fraco/médio)
//   1 gira e cai                        (médio/pesado)
//   2 voa para trás, capota e quica     (pesado/especial) — pequenos voam mais (Unit.kb)
//   3 derrete: achata até virar poça    (pesado/especial)
//   4 cambaleia e cai de lado           (fraco/médio)
// ============================================================

export const DEATH_TABLE = {
  light: [0, 4],
  medium: [0, 1, 4],
  heavy: [2, 1, 3],
  special: [2, 3],
};

export function pickDeath(strength = 'medium') {
  const list = DEATH_TABLE[strength] || DEATH_TABLE.medium;
  return list[Math.floor(Math.random() * list.length)];
}

export function death(rig, t, variant = 0) {
  const P = rig.parts;
  const M = rig.model;
  const p = Math.min(1, t / 0.9);
  const e = 1 - Math.pow(1 - p, 3);
  switch (variant) {
    case 1: { // gira e cai
      M.rotation.y = Math.PI * 4 * e;
      M.position.y = Math.sin(p * Math.PI) * 1.2;
      M.rotation.z = Math.PI / 2 * e;
      P.armL.rotation.z = -2.0 * e; P.armR.rotation.z = 2.0 * e;
      break;
    }
    case 2: { // voa para trás, capota e quica
      M.position.z = -1.6 * e;
      const b = Math.abs(Math.sin(p * Math.PI * 2)) * (1 - p) * 0.9;
      M.position.y = Math.sin(p * Math.PI) * 1.0 + b;
      M.rotation.x = -Math.PI * 1.5 * e;
      P.armL.rotation.x = -2.8 * e; P.armR.rotation.x = -2.8 * e;
      P.armL.rotation.z = -0.6; P.armR.rotation.z = 0.6;
      P.legL.rotation.x = 0.8 * e; P.legR.rotation.x = -0.5 * e;
      break;
    }
    case 3: { // derrete
      M.scale.set(1 + 0.55 * e, Math.max(0.08, 1 - 0.92 * e), 1 + 0.55 * e);
      P.head.rotation.x = 0.5 * e;
      P.armL.rotation.z = -1.3 * e; P.armR.rotation.z = 1.3 * e;
      P.armL.rotation.x = 0.4 * e; P.armR.rotation.x = 0.4 * e;
      break;
    }
    case 4: { // cambaleia e cai de lado
      const wob = Math.max(0, 1 - p * 2);
      M.rotation.z = Math.sin(t * 18) * 0.25 * wob;
      M.position.y = Math.abs(Math.sin(t * 9)) * 0.1 * wob;
      P.legL.rotation.x = Math.sin(t * 14) * 0.5 * wob; P.legR.rotation.x = -Math.sin(t * 14) * 0.5 * wob;
      P.armL.rotation.x = -0.8 * wob; P.armR.rotation.x = -0.8 * wob;
      const f = Math.max(0, (p - 0.5) * 2);
      const ef = 1 - Math.pow(1 - f, 3);
      M.rotation.z += Math.PI / 2 * ef;
      M.position.x = 0.35 * ef;
      P.head.rotation.z = 0.4 * ef;
      break;
    }
    default: { // 0: tomba de costas com pulinho
      M.rotation.x = -Math.PI / 2 * e;
      M.position.y += Math.sin(p * Math.PI) * 0.6;
      M.position.z = -0.4 * e;
      P.armL.rotation.x = -2.5 * e; P.armR.rotation.x = -2.5 * e;
      P.legL.rotation.x = -0.4 * e; P.legR.rotation.x = 0.6 * e;
    }
  }
  if (t > 1.0) { // afunda no chão
    const s = Math.max(0, 1 - (t - 1.0) / 0.5);
    M.scale.multiplyScalar(s);
  }
}
