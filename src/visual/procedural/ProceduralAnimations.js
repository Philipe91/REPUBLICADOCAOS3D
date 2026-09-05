// ============================================================
// ProceduralAnimations — funções PURAS de animação: (rig, tempo, params) → escrevem
// rotação/posição/escala nas partes do rig, sempre a partir da pose de descanso
// (o animator chama rig.resetPose() antes). Sem estado, sem alocação por frame.
//   T = relógio do boneco (fase aleatória por instância; loops: idle/walk/victory/stun/recesso)
//   t = tempo desde o início da animação atual (one-shots: attack/special/death)
// ============================================================

export function idle(rig, T) {
  const P = rig.parts;
  const b = Math.sin(T * 2.2);
  rig.model.position.y = b * 0.03;
  P.body.scale.y = 1 + b * 0.02;
  P.armL.rotation.z = -0.12 + Math.sin(T * 2.2) * 0.05;
  P.armR.rotation.z = 0.12 - Math.sin(T * 2.2) * 0.05;
  P.head.rotation.z = Math.sin(T * 1.1) * 0.06;
  P.head.rotation.y = Math.sin(T * 0.7) * 0.15;
}

export function walk(rig, T, factor = 1) {
  const P = rig.parts;
  const f = 9 * Math.max(0.3, factor);
  const s = Math.sin(T * f);
  const c = Math.cos(T * f);
  const amp = rig.jurassic ? 0.5 : 0.7;
  P.legL.rotation.x = s * amp; P.legR.rotation.x = -s * amp;
  P.armL.rotation.x = -s * amp * 0.9; P.armR.rotation.x = s * amp * 0.9;
  P.armL.rotation.z = -0.15; P.armR.rotation.z = 0.15;
  rig.model.position.y = Math.abs(c) * 0.08;
  P.body.rotation.x = 0.12 + (rig.rest.body.rot.x);
  P.body.rotation.z = s * 0.06;
  P.head.rotation.z = -s * 0.08;
  P.head.rotation.x = -0.08;
}

// antecipação (recua e levanta o braço) → golpe (avança rápido, 0.14 s) → recuperação
export function attack(rig, t, windup = 0.25, duration = 0.6) {
  const P = rig.parts;
  const w = windup, d = duration;
  let lean = 0, armX = 0, lunge = 0, armZ = 0;
  if (t < w) {
    const p = t / w;
    const e = p * p;
    lean = -0.35 * e; armX = -2.4 * e; lunge = -0.12 * e; armZ = 0.5 * e;
  } else if (t < w + 0.14) {
    const p = (t - w) / 0.14;
    const e = 1 - Math.pow(1 - p, 3);
    lean = -0.35 + 1.0 * e; armX = -2.4 + 3.4 * e; lunge = -0.12 + 0.55 * e; armZ = 0.5 - 0.5 * e;
  } else {
    const p = Math.min(1, (t - w - 0.14) / Math.max(0.1, d - w - 0.14));
    const e = 1 - Math.pow(1 - p, 2);
    lean = 0.65 * (1 - e); armX = 1.0 * (1 - e); lunge = 0.43 * (1 - e);
  }
  P.body.rotation.x = lean + rig.rest.body.rot.x;
  P.armR.rotation.x = armX; P.armR.rotation.z = armZ;
  P.armL.rotation.x = -armX * 0.3; P.armL.rotation.z = -0.3;
  rig.model.position.z = lunge;
  P.legL.rotation.x = -lunge * 0.8; P.legR.rotation.x = lunge * 0.8;
  P.head.rotation.x = -lean * 0.4;
  if (P.weapon) P.weapon.rotation.x = -armX * 0.2;
}

export function special(rig, t, kind = 'default', duration = 1) {
  const P = rig.parts;
  const p = Math.min(1, t / duration);
  switch (kind) {
    case 'discurso': {  // levanta microfone, corpo empina, pulinho
      P.armR.rotation.x = -2.8; P.armR.rotation.z = 0.3;
      P.armL.rotation.x = -0.6 + Math.sin(t * 12) * 0.4; P.armL.rotation.z = -1.0;
      P.body.rotation.x = -0.2; P.head.rotation.x = -0.4;
      rig.model.position.y = Math.abs(Math.sin(t * 10)) * 0.15;
      P.mouth && (P.mouth.scale.y = 1.5);
      break;
    }
    case 'motociata': { // aponta para frente, gesto exagerado
      P.armR.rotation.x = -1.6; P.armL.rotation.x = -1.6; P.armL.rotation.z = -0.4; P.armR.rotation.z = 0.4;
      P.body.rotation.x = 0.25; P.head.rotation.x = -0.2;
      rig.model.position.y = Math.abs(Math.sin(t * 14)) * 0.1;
      break;
    }
    case 'suspenso': { // levanta a caneta gigante e bate
      const e = p < 0.5 ? p * 2 : 1 - (p - 0.5) * 2;
      P.armR.rotation.x = -3.0 * e; P.body.rotation.x = -0.3 * e + 0.6 * (1 - e) * (p > 0.5 ? 1 : 0);
      P.head.rotation.x = -0.3 * e;
      break;
    }
    case 'jurassico': { // rugido: cresce e balança
      const g = 1 + Math.sin(p * Math.PI) * 0.25;
      rig.model.scale.set(g, g, g);
      P.head.rotation.x = -0.6 * Math.sin(p * Math.PI);
      P.armL.rotation.x = -1.5; P.armR.rotation.x = -1.5;
      P.body.rotation.z = Math.sin(t * 25) * 0.08;
      break;
    }
    case 'engajamento': { // segura celular pra cima e pula
      P.armR.rotation.x = -3.0; P.armL.rotation.x = -3.0;
      rig.model.position.y = Math.abs(Math.sin(t * 12)) * 0.2;
      P.head.rotation.z = Math.sin(t * 20) * 0.15;
      break;
    }
    default: {
      P.armR.rotation.x = -2.5; P.armL.rotation.x = -2.5;
      rig.model.position.y = Math.abs(Math.sin(t * 10)) * 0.2;
    }
  }
}

export function victory(rig, T) {
  const P = rig.parts;
  const j = Math.abs(Math.sin(T * 6));
  rig.model.position.y = j * 0.35;
  P.armL.rotation.x = -2.6 + Math.sin(T * 12) * 0.3; P.armR.rotation.x = -2.6 - Math.sin(T * 12) * 0.3;
  P.armL.rotation.z = -0.5; P.armR.rotation.z = 0.5;
  P.legL.rotation.x = -j * 0.5; P.legR.rotation.x = -j * 0.5;
  P.head.rotation.z = Math.sin(T * 6) * 0.2;
  P.body.rotation.z = Math.sin(T * 6) * 0.1;
}

export function stun(rig, T) {
  const P = rig.parts;
  P.head.rotation.z = Math.sin(T * 9) * 0.35;
  P.head.rotation.x = 0.25;
  P.body.rotation.z = Math.sin(T * 9) * 0.12;
  P.body.rotation.x = 0.15;
  P.armL.rotation.z = -0.9; P.armR.rotation.z = 0.9;
  P.armL.rotation.x = 0.3; P.armR.rotation.x = 0.3;
}

// variantes: 0 olhar celular · 1 coçar a cabeça · 2 sentar (escolhida por instância)
export function recesso(rig, T, variant = 0) {
  const P = rig.parts;
  if (variant === 0) {
    P.armR.rotation.x = -1.7; P.armR.rotation.z = -0.4; P.head.rotation.x = 0.55;
    P.head.rotation.z = Math.sin(T * 2) * 0.05;
  } else if (variant === 1) {
    P.armR.rotation.x = -2.9; P.armR.rotation.z = 0.35 + Math.sin(T * 14) * 0.15; P.head.rotation.z = -0.25;
    P.head.rotation.x = -0.1;
  } else {
    rig.model.position.y = -rig.legH * 0.75;
    P.legL.rotation.x = -1.5; P.legR.rotation.x = -1.5;
    P.body.rotation.x = 0.1; P.armL.rotation.x = -0.5; P.armR.rotation.x = -0.5;
    P.head.rotation.y = Math.sin(T * 1.5) * 0.3;
  }
}

// variantes: 0 tomba de costas com pulinho · 1 gira e cai; depois de 1 s afunda no chão
export function death(rig, t, variant = 0) {
  const P = rig.parts;
  const p = Math.min(1, t / 0.9);
  const e = 1 - Math.pow(1 - p, 3);
  if (variant === 0) {
    rig.model.rotation.x = -Math.PI / 2 * e;
    rig.model.position.y = Math.sin(p * Math.PI) * 0.6;
    rig.model.position.z = -0.4 * e;
    P.armL.rotation.x = -2.5 * e; P.armR.rotation.x = -2.5 * e;
    P.legL.rotation.x = -0.4 * e; P.legR.rotation.x = 0.6 * e;
  } else {
    rig.model.rotation.y = Math.PI * 4 * e;
    rig.model.position.y = Math.sin(p * Math.PI) * 1.2;
    rig.model.rotation.z = Math.PI / 2 * e;
    P.armL.rotation.z = -2.0 * e; P.armR.rotation.z = 2.0 * e;
  }
  if (t > 1.0) {
    const s = Math.max(0, 1 - (t - 1.0) / 0.5);
    rig.model.scale.setScalar(s);
  }
}

// reação de dano SOBREPOSTA à animação corrente (p = 1 → 0 ao longo de 0.3 s)
export function hitOverlay(rig, p, strength = 1) {
  const P = rig.parts;
  const s = strength;
  P.body.rotation.x += -0.5 * p * s;
  rig.model.position.z += -0.15 * p * s;
  P.head.rotation.x += -0.4 * p * s;
  P.armL.rotation.x += -1.2 * p * s; P.armR.rotation.x += -1.2 * p * s;
  P.armL.rotation.z += -0.6 * p; P.armR.rotation.z += 0.6 * p;
}

// movimento secundário contínuo: cauda, capa, bandeira
export function secondary(rig, T, anim) {
  const P = rig.parts;
  if (P.tail) P.tail.rotation.y = Math.sin(T * 6) * 0.35;
  if (P.cape) P.cape.rotation.x = 0.15 + Math.sin(T * 5) * 0.08 + (anim === 'walk' ? 0.25 : 0);
  if (P.flag) P.flag.rotation.y = Math.sin(T * 8) * 0.25;
}
