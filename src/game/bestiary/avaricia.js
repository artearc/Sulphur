// IV · AVARICIA — greedy spectres, weights pushed forever, chests that bite. Gold is never free.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { codiciosoSheet, rodadorSheet, mimicoSheet, lobaSheet } from '../../art/enemies/avaricia.js';
import { Pickup } from '../objects.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const COIN = R.gold;
const steal = (e, n) => (t) => {
  const run = e.world.game.run;
  if (!run || t !== e.world.player) return;
  const s = Math.min(run.gold, n);
  if (s <= 0) return;
  run.gold -= s;
  e.ai.stolen = (e.ai.stolen || 0) + s;
  e.world.fx.number(s, t.x, t.z, { prefix: '-', color: 0xf2c45a, y: 2.4 });
  e.world.fx.emit('gold', t.x, 1, t.z, 6);
  Events.emit('gold:stolen', { amount: s });
};

registerEnemy({
  id: 'codicioso', name: 'Espectro Codicioso', circle: 'avaricia', hp: 44, speed: 2.6, radius: 0.42, mode: 'fly', blood: 'gold',
  sheet: () => codiciosoSheet(), aura: 'gold', auraY: 0.8,
  spawnRamp: [0x3a2408, 0xa06c18, 0xf2c45a, 0xffe8a0], spawnEdge: 0xf2c45a, deathPreset: 'gold', deathEdge: 0xf2c45a,
  desc: 'Acumuló hasta que el oro le cerró los ojos. Te roba al golpearte y muere sobre oro maldito.',
  init(e) { e.cooldowns.volley = 1 + Math.random(); },
  onDeath(e) {
    const W = e.world;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) W.addPickup(new Pickup(W, 'cursedGold', e.x, e.z, 4));
    if (e.ai.stolen) for (let k = 0; k < 4; k++) W.addPickup(new Pickup(W, 'gold', e.x, e.z, Math.ceil(e.ai.stolen / 4)));
  },
  think(e, dt) {
    if (B.volley(e, dt, {
      windup: 0.55, shots: 1, range: 10, cooldown: 2.3, flash: 0xf2c45a,
      fire: (e) => e.spread(5, 0.9, { angle: e.angleToTarget(), speed: 7.5, kind: 'coin', ramp: COIN, size: 10, damage: 8, life: 1.8, trail: 'gold', element: 'gold', onHit: steal(e, 6) }),
    })) return;
    if (B.melee(e, dt, { range: 1.4, arc: 1.6, windup: 0.4, damage: 9, knockback: 4, lunge: 4, cooldown: 1.5, onHit: () => {} })) return;
    e.keepDistance(3.5, 7, 0.9);
    e.play('move');
  },
});

registerEnemy({
  id: 'rodador', name: 'Rodador de Pesos', circle: 'avaricia', hp: 70, speed: 1.4, radius: 0.75, mass: 4, blood: 'blood', poise: 0.4, knockMul: 0.4,
  sheet: () => rodadorSheet(), aura: 'gold', auraY: 0.6,
  spawnRamp: [0x3a2408, 0xa06c18, 0xf2c45a, 0xffe8a0], deathPreset: 'gold',
  desc: '"Volteando pesos por fuerza de pecho": empuja su carga eternamente. Esquívalo y que choque.',
  init(e) { e.cooldowns.charge = 1.5; },
  think(e, dt) {
    if (B.charge(e, dt, { windup: 0.9, length: 11, speed: 10, damage: 15, knockback: 13, cooldown: 2.2, minRange: 1.5, maxRange: 13, recover: 0.6, wallStun: 1.3 })) {
      if (e.ai.charge?.phase === 'run') { if (Math.random() < 0.5) e.world.fx.emit('gold', e.x, 0.3, e.z, 1); e.play('attack'); }
      return;
    }
    e.chase(0.7);
    e.play('move');
  },
});

registerEnemy({
  id: 'mimico', name: 'Cofre Mímico', circle: 'avaricia', hp: 55, speed: 3.4, radius: 0.55, mass: 1.6, blood: 'gold',
  sheet: () => mimicoSheet(), noSpawnFx: true, spawnRamp: [0x3a2408, 0xa06c18, 0xf2c45a, 0xffe8a0], deathPreset: 'gold',
  desc: 'Un relicario que ofrece tesoro. Lo único que guarda son dientes.',
  init(e, o) {
    e.ai.disguised = true;
    e.untargetable = true;
    e.spawnDur = 0.01;
    e.sprite.setAlpha(1);
    e.light = e.world.lights.add({ follow: e, y: 0.8, color: 0xf2c45a, intensity: 0.6, radius: 2.5 });
  },
  onSpawned(e) { e.untargetable = true; e.play('disguise'); },
  onDeath(e) { const W = e.world; for (let k = 0; k < 6; k++) W.addPickup(new Pickup(W, 'gold', e.x, e.z, 3)); },
  think(e, dt) {
    const A = e.ai;
    if (A.disguised) {
      e.stop(0);
      e.play('disguise');
      A.wait = (A.wait || 0) + dt;
      const alone = !e.world.enemies.some((x) => x !== e && x.alive && !x.ai?.disguised);
      if (e.distToTarget() < 2.2 || e.hp < e.maxHp || (alone && A.wait > 4)) {
        A.disguised = false;
        e.untargetable = false;
        e.play('windup', { restart: true });
        e.world.fx.emit('gold', e.x, 0.8, e.z, 14, { speed: [3, 6] });
        e.world.game.ui?.bark(e.x, e.z, '¡Mío!', 1.2);
        e.cooldowns.melee = 0;
        Events.emit('enemy:reveal', { enemy: e });
      }
      return;
    }
    if (B.melee(e, dt, { range: 1.7, arc: 1.5, windup: 0.45, damage: 15, knockback: 7, lunge: 7, track: 4, cooldown: 1.0, onHit: (en) => steal(en, 10)(en.world.player) })) return;
    e.chase(1);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · La Loba — "ché mai non empie la bramosa voglia"
// ------------------------------------------------------------------------------------------
function greedMul(b) { return 1 + Math.min(0.6, (b.world.game.run?.gold || 0) / 400); }

registerBoss({
  id: 'loba', name: 'La Loba', title: 'Hambre que nunca se sacia', miniboss: true, showBar: true, circle: 'avaricia',
  hp: 600, speed: 3.6, radius: 0.9, mass: 6, blood: 'blood', pivot: 2, shadow: 1.6,
  sheet: () => lobaSheet(), aura: 'gold', auraY: 0.8,
  phases: [0.5], phaseFx: 'gold', deathPreset: 'gold', deathEdge: 0xf2c45a, deathRamp: COIN, pillarRamp: COIN,
  onPhase(b) { b.speed *= 1.25; b.world.game.ui?.bark(b.x, b.z, 'Cuanto más tienes, más te huelo.', 2); },
  idle(b) {
    const d = b.distToTarget();
    if (d > 4) b.chase(1); else b.steer(b.angleToTarget() + Math.PI / 2, 0.9);
    b.play('move');
  },
  patterns: {
    0: [
      { id: 'salto', weight: 3, cd: 2.2, range: [2.5, 12], run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); S.len = Math.min(9, b.distToTarget() + 1.5); b.play('windup', { restart: true }); b.telegraph({ shape: 'rect', angle: S.a, length: S.len, width: 1.6, duration: 0.6 }); Events.emit('boss:windup', { boss: b }); S.hit = new Set(); }
        if (S.t >= 0.6 * b.teleMul && S.t < 0.6 * b.teleMul + S.len / 16) {
          b.play('attack');
          b.vx = Math.cos(S.a) * 16 / b.speedMul; b.vz = Math.sin(S.a) * 16 / b.speedMul;
          b.strike({ shape: 'circle', radius: 1.1, damage: 16 * greedMul(b), knockback: 9, hitSet: S.hit });
          b.world.fx.emit('dust', b.x, 0.1, b.z, 1);
        } else if (S.t >= 0.6 * b.teleMul) b.stop(0.3);
        if (S.t > 0.6 * b.teleMul + S.len / 16 + 0.5) return 'done';
      } },
      { id: 'dentelladas', weight: 3, cd: 1.5, range: [0, 3], run: (b, dt, S) => {
        if (S.t === 0) S.n = 0;
        const step = 0.5;
        const k = Math.floor(S.t / step);
        if (k > S.n && S.n < 3) {
          S.n++;
          b.faceTarget(); const a = b.angleToTarget();
          b.play('attack', { restart: true });
          b.telegraph({ shape: 'cone', radius: 2.4, halfAngle: 0.6, angle: a, duration: 0.25 });
          b.after(0.25 * b.teleMul, () => { b.vx = Math.cos(a) * 7; b.vz = Math.sin(a) * 7; b.strike({ shape: 'arc', angle: a, range: 2.4, arc: 1.2, damage: 12 * greedMul(b), knockback: 5 }); });
        }
        b.vx *= Math.exp(-8 * dt); b.vz *= Math.exp(-8 * dt);
        if (S.t > step * 3 + 0.5) return 'done';
      } },
      { id: 'aullido', weight: 2, cd: 6, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); b.sprite.flash(0xf2c45a, 0.4); Events.emit('boss:roar', { boss: b }); }
        if (S.t > 0.5 && !S.f) {
          S.f = true;
          for (let w = 0; w < 2; w++) b.after(w * 0.4, () => b.ring(14, { angle: w * 0.22, speed: 6, kind: 'coin', ramp: COIN, size: 10, damage: 8, life: 2.5, trail: 'gold', element: 'gold', onHit: steal(b, 8) }));
          b.world.fx.ring('gold', b.x, b.z, 1, 20, { speed: [3, 6] });
        }
        if (S.t > 1.4) return 'done';
      } },
    ],
    1: [
      { id: 'salto', weight: 3, cd: 1.6, range: [2.5, 12], run: (...a) => P0('salto')(...a) },
      { id: 'dentelladas', weight: 3, cd: 1.2, range: [0, 3], run: (...a) => P0('dentelladas')(...a) },
      { id: 'aullido', weight: 2, cd: 5, run: (...a) => P0('aullido')(...a) },
      { id: 'codicia', weight: 1.5, cd: 10, cond: (b) => b.world.enemies.filter((e) => e.alive).length < 3, run: (b, dt, S) => {
        if (S.t === 0) b.play('roar');
        if (S.t > 0.6 && !S.sp) { S.sp = true; for (let k = 0; k < 2; k++) b.world.controller?.spawnEnemy?.('codicioso', b.x + (k ? 3 : -3), b.z - 1, {}); }
        if (S.t > 1) return 'done';
      } },
    ],
  },
});
function P0(id) { return (b, dt, S) => b.def.patterns[0].find((p) => p.id === id).run(b, dt, S); }
