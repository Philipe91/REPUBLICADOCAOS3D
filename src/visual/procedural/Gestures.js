// ============================================================
// Gestures — gestos curtos SOBREPOSTOS ao idle (funções puras, como ProceduralAnimations)
// e as poses de RECESSO. Assinatura: (rig, t, dur) com t ∈ [0, dur]; `e` é um envelope
// suave 0→1→0 para o gesto entrar e sair sem estalo. Quem escolhe o gesto é o
// Profile do personagem (Profiles.js); quem agenda é o ProceduralAnimator.
// ============================================================

const env = (t, dur) => Math.sin(Math.PI * Math.min(1, Math.max(0, t / Math.max(0.01, dur))));

// militante: levanta a placa/bandeira e grita
export function shout(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -2.6 * e; P.armR.rotation.z = 0.25 * e;
  P.head.rotation.x = -0.3 * e;
  rig.model.position.y += Math.abs(Math.sin(t * 16)) * 0.08 * e;
  if (P.mouth) P.mouth.scale.y *= 1 + 0.5 * e;
}

// tio do zap: olha o celular, cabeça baixa, polegar mexendo
export function phone(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -1.6 * e; P.armR.rotation.z = -0.45 * e;
  P.head.rotation.x = 0.55 * e;
  P.head.rotation.z = Math.sin(t * 2.5) * 0.06 * e;
  if (P.weapon) P.weapon.rotation.x = -0.3 * e + Math.sin(t * 14) * 0.05 * e;
}

// assessor: folheia papéis nervoso, cabeça acenando
export function papers(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -1.25 * e; P.armR.rotation.z = Math.sin(t * 12) * 0.3 * e;
  P.head.rotation.x = 0.25 * e + Math.sin(t * 6) * 0.08 * e;
  P.armL.rotation.x = -0.3 * e;
}

// influencer: selfie com o celular no alto, quadril de lado
export function pose(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -2.9 * e; P.armR.rotation.z = 0.5 * e;
  P.head.rotation.z = -0.25 * e; P.head.rotation.y = 0.3 * e;
  P.body.rotation.z = 0.12 * e;
  rig.model.position.x += 0.06 * e;
}

// barbudo: levanta o microfone e aponta para a plateia
export function mic(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -2.3 * e; P.armR.rotation.z = 0.35 * e;
  P.armL.rotation.x = -1.2 * e + Math.sin(t * 5) * 0.3 * e; P.armL.rotation.z = -0.8 * e;
  P.head.rotation.x = -0.2 * e; P.head.rotation.y = Math.sin(t * 3) * 0.25 * e;
  P.body.rotation.x -= 0.1 * e;
  if (P.mouth) P.mouth.scale.y *= 1 + 0.4 * e;
}

// capitão: continência rígida
export function salute(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -2.2 * e; P.armR.rotation.z = -1.05 * e;
  P.armL.rotation.x = 0; P.armL.rotation.z = -0.05;
  P.head.rotation.x = -0.08 * e; P.head.rotation.z = 0;
  P.body.rotation.x -= 0.05 * e;
}

// careca: ergue a caneta e a examina com desdém
export function pen(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armR.rotation.x = -1.9 * e; P.armR.rotation.z = 0.3 * e;
  P.head.rotation.x = 0.3 * e; P.head.rotation.z = -0.15 * e;
  if (P.weapon) P.weapon.rotation.x = 0.7 * e;
}

// dino: gira os ombros e o pescoço (alongamento pesado)
export function stretch(rig, t, dur) {
  const P = rig.parts, e = env(t, dur);
  P.armL.rotation.x = -1.2 * e; P.armR.rotation.x = -1.2 * e;
  P.armL.rotation.z = -0.8 * e; P.armR.rotation.z = 0.8 * e;
  P.body.rotation.y = Math.sin(t * 4) * 0.25 * e;
  P.head.rotation.y = Math.sin(t * 4) * 0.3 * e;
}

export const GESTURES = { shout, phone, papers, pose, mic, salute, pen, stretch };

// ---------------- RECESSO (pausa geral) ----------------
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
