// Teste do TimeController em Node puro (sem Three.js/browser): node test/time.mjs
import assert from 'node:assert/strict';
import { TimeController } from '../src/core/TimeController.js';
import { Config } from '../src/config/Config.js';

const DT = 1 / 60;
const step = (t, n) => { for (let i = 0; i < n; i++) t.update(DT); return t; };
let ok = 0;
const test = (name, fn) => { fn(); ok++; console.log('✔', name); };

test('sem efeitos: gameDt = rawDt × gameSpeed, scale 1', () => {
  const t = new TimeController(); Config.game.gameSpeed = 1;
  t.update(DT);
  assert.equal(t.scale, 1); assert.ok(Math.abs(t.gameDt - DT) < 1e-9); assert.equal(t.visualDt, t.gameDt);
});

test('hit-stop congela gameDt, visual roda devagar, e solta sozinho', () => {
  const t = new TimeController();
  assert.equal(t.hitStop(Config.combat.hitStopDuration), true);
  t.update(DT);
  assert.equal(t.gameDt, 0); assert.ok(t.inHitStop); assert.ok(t.visualDt > 0 && t.visualDt < DT);
  step(t, 5);
  assert.ok(!t.inHitStop); assert.ok(t.gameDt > 0); assert.equal(t.hitStopTimer, 0);
});

test('hit-stop repetido só estende (não soma) e respeita o orçamento por segundo', () => {
  const t = new TimeController();
  t.hitStop(0.045); t.hitStop(0.045); t.hitStop(0.02);
  assert.ok(Math.abs(t.hitStopTimer - 0.045) < 1e-9);
  const t2 = new TimeController();
  let granted = 0;
  for (let i = 0; i < 40; i++) { if (t2.hitStop(0.06)) granted += t2.hitStopTimer; step(t2, 6); }
  assert.ok(t2._budgetUsed <= Config.time.hitStopBudgetPerSecond + 1e-9);
  // orçamento renova após 1 s
  step(t2, 70); assert.equal(t2.hitStop(0.045), true);
  assert.equal(t2.hitStop(0.045, { force: true }) || t2.hitStopTimer > 0, true);
});

test('slow-motion segura o scale e volta linearmente a 1', () => {
  const t = new TimeController();
  t.slowMotion(0.35, 0.25, 0.15);
  step(t, 6);                        // 0.1 s → em hold
  assert.ok(Math.abs(t.scale - 0.35) < 1e-9); assert.ok(Math.abs(t.gameDt - DT * 0.35) < 1e-9);
  step(t, 12);                       // 0.3 s → em recovery, entre 0.35 e 1
  assert.ok(t.scale > 0.35 && t.scale < 1);
  step(t, 12);                       // 0.5 s → terminou
  assert.equal(t.scale, 1); assert.equal(t.slows.length, 0); assert.ok(Math.abs(t.gameDt - DT) < 1e-9);
});

test('vários slow-motions: vale o menor, cada um expira sozinho, nada fica preso', () => {
  const t = new TimeController();
  t.slowMotion(0.5, 0.2, 0.1); t.slowMotion(0.25, 0.1, 0.05); t.slowMotion(0.8, 1.0, 0.2);
  t.update(DT); assert.ok(Math.abs(t.scale - 0.25) < 1e-9);
  step(t, 12); assert.ok(t.scale > 0.5 && t.scale <= 0.8 + 1e-9);   // 0.217 s: o de 0.25 acabou, o de 0.5 está em recovery (~0.58), o de 0.8 segura
  step(t, 80); assert.equal(t.scale, 1); assert.equal(t.slows.length, 0);
  for (let i = 0; i < 20; i++) t.slowMotion(0.3, 0.1, 0.1);
  assert.ok(t.slows.length <= 8);
});

test('hit-stop dentro de slow-motion: gameDt 0 durante o stop, depois volta ao scale do slow', () => {
  const t = new TimeController();
  t.slowMotion(0.35, 0.5, 0.1); t.hitStop(0.045);
  t.update(DT); assert.equal(t.gameDt, 0);
  step(t, 4); assert.ok(Math.abs(t.gameDt - DT * 0.35) < 1e-9);
});

test('reset (restart/fim de partida) devolve escala 1 imediatamente', () => {
  const t = new TimeController();
  t.slowMotion(0.25, 5, 1); t.hitStop(0.3, { force: true }); t.update(DT);
  t.reset(); t.update(DT);
  assert.equal(t.scale, 1); assert.ok(!t.inHitStop); assert.ok(Math.abs(t.gameDt - DT) < 1e-9); assert.equal(t.active, false);
});

test('setGameSpeed centralizado em Config.game.gameSpeed', () => {
  const t = new TimeController();
  t.setGameSpeed(2); t.update(DT);
  assert.equal(Config.game.gameSpeed, 2); assert.ok(Math.abs(t.gameDt - DT * 2) < 1e-9);
  t.setGameSpeed(1);
});

console.log(`\n${ok} testes OK`);
