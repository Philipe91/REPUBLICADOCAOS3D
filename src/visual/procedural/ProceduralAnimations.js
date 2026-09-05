// ============================================================
// ProceduralAnimations — funções PURAS de animação: (rig, tempo, params) → escrevem
// rotação/posição/escala nas partes do rig, sempre a partir da pose de descanso
// (o animator chama rig.resetPose() antes). Sem estado, sem alocação por frame.
//   T = relógio do boneco (fase aleatória por instância; loops: idle/walk/victory/stun/recesso)
//   t = tempo desde o início da animação atual (one-shots: attack/special/death)
//   P = Profile do personagem (Profiles.js): tempo, bob, armSwing, rigidity, lean
// ============================================================
import { PROFILES } from './Profiles.js';

const DEF = PROFILES.default;

export function idle(rig, T, P = DEF) {
  const R = rig.parts;
  const T2 = T * P.tempo;
  const b = Math.sin(T2 * 2.2);
  const loose = 1 - P.rigidity * 0.7;          // rígido balança menos braços/cabeça
  rig.model.position.y = b * 0.03 * P.bob;
  R.body.scale.y = 1 + b * 0.02 * P.bob;
  R.armL.rotation.z = -0.12 + Math.sin(T2 * 2.2) * 0.05 * loose;
  R.armR.rotation.z = 0.12 - Math.sin(T2 * 2.2) * 0.05 * loose;
  R.head.rotation.z = Math.sin(T2 * 1.1) * 0.06 * loose;
  R.head.rotation.y = Math.sin(T2 * 0.7) * 0.15 * loose;
}

export function walk(rig, T, factor = 1, P = DEF) {
  const R = rig.parts;
  const f = 9 * Math.max(0.3, factor) * P.tempo;
  const s = Math.sin(T * f);
  const c = Math.cos(T * f);
  const amp = (rig.jurassic ? 0.5 : 0.7) * (0.75 + 0.25 * P.bob);   // passo pesado = perna mais alta
  const loose = 1 - P.rigidity * 0.5;
  R.legL.rotation.x = s * amp; R.legR.rotation.x = -s * amp;
  R.armL.rotation.x = -s * amp * 0.9 * P.armSwing; R.armR.rotation.x = s * amp * 0.9 * P.armSwing;
  R.armL.rotation.z = -0.15; R.armR.rotation.z = 0.15;
  rig.model.position.y = Math.abs(c) * 0.08 * P.bob;
  R.body.rotation.x = 0.12 * P.lean + (rig.rest.body.rot.x);
  R.body.rotation.z = s * 0.06 * loose;
  R.head.rotation.z = -s * 0.08 * loose;
  R.head.rotation.x = -0.08 * P.lean;
}

// antecipação (recua e levanta o braço) → golpe (avança rápido, 0.14 s) → recuperação
// `lean` do Profile exagera/contém a inclinação; o TIMING (windup/duration) vem da Unit.
export function attack(rig, t, windup = 0.25, duration = 0.6, P = DEF) {
  const R = rig.parts;
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
  lean *= P.lean;
  R.body.rotation.x = lean + rig.rest.body.rot.x;
  R.armR.rotation.x = armX; R.armR.rotation.z = armZ;
  R.armL.rotation.x = -armX * 0.3; R.armL.rotation.z = -0.3;
  rig.model.position.z = lunge;
  R.legL.rotation.x = -lunge * 0.8; R.legR.rotation.x = lunge * 0.8;
  R.head.rotation.x = -lean * 0.4;
  if (R.weapon) R.weapon.rotation.x = -armX * 0.2;
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

// recesso e gestos de idle: ver Gestures.js · mortes: ver Deaths.js

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
