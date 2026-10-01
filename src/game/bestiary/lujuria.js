// II · LUJURIA — spirits dragged by the infernal storm. Swoops, tethers, pulls: never still.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { amanteSheet, sucuboSheet, loverSheet, torbellinoSheet } from '../../art/enemies/lujuria.js';
import { angleTo, segCircle, dist } from '../../core/math.js';
import { pillarSheet } from '../../art/fx.js';
import { Events } from '../../core/events.js';

const HEART = [0x4a0e2a, 0xb02a5a, 0xff86a8, 0xffe0ea];
const BOLT = [0x2a2a5a, 0x8aa0e0, 0xd0e0ff, 0xffffff];

export function lightningStrike(e, x, z, o = {}) {
  const W = e.world;
  const r = o.radius ?? 1.3;
  e.telegraph({ shape: 'circle', x, z, radius: r, duration: o.windup ?? 0.8, color: 0x2a2a5a, edge: 0xd0e0ff });
  e.after((o.windup ?? 0.8) * e.teleMul, () => {
    e.strike({ shape: 'circle', x, z, radius: r, damage: o.damage ?? 14, knockback: 5, element: 'wind', status: { stun: { amount: 1, dur: 0.25 } } });
    W.fx.play(pillarSheet('lightning', BOLT, 12, 110), { x, y: 0, z: z + 0.05, pivot: 0, scale: 1 });
    W.fx.emit('lightning', x, 0.4, z, 16, { speed: [3, 8] });
    W.fx.lightFlash(x, z, 0xd0e0ff, 4, 9, 0.18);
    W.fx.screenFlash(0xd0e0ff, 0.12, 0.08);
    W.fx.decal('scorch', x, z, r * 0.7, { alpha: 0.7 });
    W.fx.shake(0.2);
    Events.emit('lightning', {});
  });
}

registerEnemy({
  id: 'amante', name: 'Amante Arrastrado', circle: 'lujuria', hp: 34, speed: 4.2, radius: 0.42, mode: 'fly', mass: 0.6, blood: 'ecto', touch: 6,
  sheet: () => amanteSheet(), aura: 'petal', auraY: 0.6,
  spawnRamp: [0x4a0e2a, 0x7a1a44, 0xe04a7a, 0xffc0d0], spawnEdge: 0xff86a8, deathPreset: 'petal', deathEdge: 0xff86a8,
  desc: 'Amó demasiado y ahora el viento no le deja detenerse. Se abalanza en largas curvas.',
  init(e) { e.ai.orbit = Math.random() * 6.28; e.ai.dir = Math.random() < 0.5 ? 1 : -1; e.cooldowns.charge = 1 + Math.random() * 1.5; },
  think(e, dt) {
    if (B.charge(e, dt, { windup: 0.55, length: 8.5, speed: 15, damage: 11, knockback: 7, cooldown: 2.2, minRange: 2.5, maxRange: 9, recover: 0.45, wallStun: 0.4 })) {
      if (e.ai.charge?.phase === 'run' && Math.random() < 0.5) e.world.fx.emit('petal', e.x, 0.8, e.z, 1);
      return;
    }
    const A = e.ai, p = e.target;
    A.orbit += dt * 1.6 * A.dir;
    e.moveToward(p.x + Math.cos(A.orbit) * 4.5, p.z + Math.sin(A.orbit) * 3.5, 1);
    e.play('move');
  },
});

registerEnemy({
  id: 'sucubo', name: 'Súcubo de la Tormenta', circle: 'lujuria', hp: 40, speed: 2.4, radius: 0.45, mode: 'fly', blood: 'ecto',
  sheet: () => sucuboSheet(), aura: 'petal', auraY: 1, light: { color: 0xe04a7a, intensity: 0.6, radius: 3 },
  spawnRamp: [0x24102e, 0x5c2a6a, 0xe04a7a, 0xffc0d0], spawnEdge: 0xff86a8, deathPreset: 'petal', deathEdge: 0xff86a8,
  desc: 'Su corazón es un hueco que atrae. Lanza besos que arden y te arrastra hacia ella.',
  init(e) { e.cooldowns.volley = 1.2; e.cooldowns.pull = 4; },
  think(e, dt) {
    const A = e.ai;
    if (A.pull) {
      A.pull.t += dt;
      e.stop(0);
      if (A.pull.t > 0.7 * e.teleMul && A.pull.t < 2.1) {
        const p = e.target, a = angleTo(p.x, p.z, e.x, e.z);
        if (!p.dashing && dist(p.x, p.z, e.x, e.z) < 7.5) { p.kx += Math.cos(a) * 9 * dt; p.kz += Math.sin(a) * 9 * dt; }
        if (Math.random() < 0.6) e.world.fx.line('petal', p.x, p.z, e.x, e.z, 2, { y: 0.8 });
        if (dist(p.x, p.z, e.x, e.z) < 1.2 && e.cd('kiss', 0.8)) e.strike({ shape: 'circle', radius: 1.2, damage: 10, knockback: 6, element: 'corrupt' });
      }
      if (A.pull.t > 2.2) { A.pull = null; e.play('idle'); }
      return;
    }
    if (e.ready('pull') && e.distToTarget() < 7 && e.cd('pull', 7)) {
      A.pull = { t: 0 };
      e.play('windup', { restart: true });
      e.telegraph({ shape: 'ring', radius: 7.5, inner: 1.2, duration: 0.7, follow: e, color: 0x4a0e2a, edge: 0xff86a8 });
      Events.emit('enemy:windup', { enemy: e });
      return;
    }
    if (B.volley(e, dt, {
      windup: 0.55, shots: 3, interval: 0.18, range: 11, cooldown: 2.4, flash: 0xff86a8,
      fire: (e, i) => e.shoot({ angle: e.angleToTarget() + (i - 1) * 0.35, speed: 6.5, curve: (i - 1) * -0.6, homing: 0.6, kind: 'orb', ramp: HEART, size: 9, damage: 9, life: 2.6, trail: 'petal', element: 'corrupt', light: 0xe04a7a, lightIntensity: 0.4, lightRadius: 2 }),
    })) return;
    e.keepDistance(4.5, 8, 0.8);
    e.play('move');
  },
});

// Two lovers bound by a crimson thread you must not cross.
registerEnemy({
  id: 'pareja', name: 'Pareja Entrelazada', circle: 'lujuria', hp: 36, speed: 2.9, radius: 0.42, mode: 'fly', blood: 'ecto',
  sheet: (e) => loverSheet(e.ai?.v ?? 0), aura: 'petal', auraY: 0.6,
  spawnRamp: [0x4a0e2a, 0x7a1a44, 0xe04a7a, 0xffc0d0], spawnEdge: 0xff86a8, deathPreset: 'petal', deathEdge: 0xff86a8,
  desc: 'Ni la muerte los separó. El hilo que los une corta como una espada.',
  init(e, o) {
    e.ai.v = o.v ?? 0;
    if (o.v === 1) e.sprite.setSheet(loverSheet(1));
    e.ai.orbit = o.orbit ?? Math.random() * 6.28;
    if (!o.partner) {
      e.after(0.05, () => {
        const other = e.world.controller?.spawnEnemy?.('pareja', e.x + 2.5, e.z, { v: 1, partner: e, orbit: e.ai.orbit + Math.PI, elite: e.elite, spawnDelay: 0.75 });
        if (other) { e.ai.partner = other; other.ai.partner = e; }
      });
    } else e.ai.partner = o.partner;
    e.ai.beamT = 0;
  },
  onDeath(e) {
    const o = e.ai.partner;
    if (o && o.alive) {
      // the survivor's grief becomes fury
      o.speed *= 1.5; o.dmgMul *= 1.35; o.cdMul *= 0.7;
      o.sprite.setOutline(0xff2050, 1);
      o.world.fx.emit('corruptGlow', o.x, 1, o.z, 20, { radius: 0.5 });
      o.world.game.ui?.bark(o.x, o.z, o.ai.v === 1 ? '¡Paolo!' : '¡No me dejes!', 1.8);
      Events.emit('enemy:enrage', { enemy: o });
    }
  },
  think(e, dt) {
    const A = e.ai, p = e.target, o = A.partner;
    // the tether: only one of the pair evaluates it
    if (o && o.alive && e.ai.v === 0 && o.state !== 'spawn' && e.state !== 'spawn') {
      A.beamT -= dt;
      if (Math.random() < 0.7) e.world.fx.line('corruptGlow', e.x, e.z, o.x, o.z, 3, { y: 0.9 });
      if (A.beamT <= 0 && segCircle(e.x, e.z, o.x, o.z, p.x, p.z, p.radius + 0.15)) {
        A.beamT = 0.7;
        e.strike({ shape: 'circle', x: p.x, z: p.z, radius: 0.2, damage: 10, knockback: 3, element: 'corrupt' });
      }
    }
    if (B.melee(e, dt, { range: 1.6, arc: 1.8, windup: 0.45, damage: 11, knockback: 6, lunge: 6, track: 3, cooldown: 1.6 })) return;
    // orbit the player on opposite sides so the thread sweeps across them
    A.orbit += dt * 0.9;
    const base = o && o.alive ? Math.atan2(o.z - p.z, o.x - p.x) + Math.PI : A.orbit;
    const want = A.v === 0 ? A.orbit : base;
    const r = o && o.alive ? 3.6 : 1.4;
    e.moveToward(p.x + Math.cos(want) * r, p.z + Math.sin(want) * r * 0.85, 1);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · El Torbellino de los Amantes
// ------------------------------------------------------------------------------------------
registerBoss({
  id: 'torbellino', name: 'El Torbellino de los Amantes', title: 'La bufera infernal', miniboss: true, showBar: true, circle: 'lujuria',
  hp: 520, speed: 1.9, radius: 1.1, mass: 8, mode: 'fly', blood: 'ecto', pivot: 2, shadow: 1.6, touch: 12, windImmune: true,
  sheet: () => torbellinoSheet(), aura: 'petal', auraY: 1.5,
  light: { color: 0xe04a7a, intensity: 1.0, radius: 6, y: 2.5 },
  phases: [0.5], phaseFx: 'petal', deathPreset: 'petal', deathEdge: 0xff86a8, deathRamp: HEART, pillarRamp: HEART,
  idle(b, dt) { b.chase(0.7); b.play('move'); if (Math.random() < 0.3) b.world.fx.emit('wind', b.x + (Math.random() - 0.5) * 3, 0.5 + Math.random() * 3, b.z, 1, { dir: Math.random() * 6.28, speed: [2, 4] }); },
  patterns: {
    0: [
      { id: 'succion', weight: 2, cd: 6, run: (b, dt, S) => {
        if (S.t === 0) { b.play('windup', { restart: true }); b.telegraph({ shape: 'ring', radius: 9, inner: 1.5, duration: 0.9, follow: b, color: 0x24102e, edge: 0xff86a8 }); Events.emit('boss:windup', { boss: b }); }
        if (S.t > 0.9 * b.teleMul && S.t < 3.2) {
          b.play('attack');
          const p = b.target, a = angleTo(p.x, p.z, b.x, b.z);
          if (!p.dashing) { p.kx += Math.cos(a) * 11 * dt; p.kz += Math.sin(a) * 11 * dt; }
          if (Math.random() < 0.8) b.world.fx.emit('wind', p.x, 0.8, p.z, 1, { dir: a, speed: [5, 8], c0: 0xd8c8f0, c1: 0x3a2a50 });
          b.stop(0);
        }
        if (S.t > 3.4) return 'done';
      } },
      { id: 'rafaga', weight: 3, cd: 2.5, run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 6, halfAngle: 0.55, angle: S.a, duration: 0.7 }); }
        if (S.t >= 0.7 * b.teleMul && !S.hit) {
          S.hit = true; b.play('attack', { restart: true });
          b.strike({ shape: 'arc', angle: S.a, range: 6, arc: 1.1, damage: 13, knockback: 14, element: 'wind' });
          for (let k = 0; k < 30; k++) b.world.fx.emit('wind', b.x, 1, b.z, 1, { dir: S.a + (Math.random() - 0.5) * 1.1, spread: 0.1, speed: [8, 14], c0: 0xffffff, c1: 0x8a70b0 });
          b.world.fx.shake(0.3);
        }
        if (S.t > 1.2) return 'done';
      } },
      { id: 'rayos', weight: 2, cd: 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar', { restart: true }); S.k = 0; S.next = 0; }
        if (S.k < 4 && S.t >= S.next) { const p = b.target; lightningStrike(b, p.x + (Math.random() - 0.5) * 1.5, p.z + (Math.random() - 0.5) * 1.5, { damage: 14 }); S.k++; S.next = S.t + 0.35; }
        if (S.t > 2.2) return 'done';
      } },
    ],
    1: [
      { id: 'succion', weight: 2, cd: 5, run: (...a) => b0('succion')(...a) },
      { id: 'rafaga', weight: 3, cd: 2, run: (...a) => b0('rafaga')(...a) },
      { id: 'rayos', weight: 2, cd: 3.5, run: (...a) => b0('rayos')(...a) },
      { id: 'amantes', weight: 1.5, cd: 9, cond: (b) => b.world.enemies.filter((e) => e.alive).length < 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar', { restart: true }); }
        if (S.t > 0.5 && !S.sp) { S.sp = true; for (let k = 0; k < 2; k++) b.world.controller?.spawnEnemy?.('amante', b.x + (k ? 2 : -2), b.z + 1, {}); }
        if (S.t > 1) return 'done';
      } },
    ],
  },
});

// phase 2 reuses phase 1 patterns
function b0(id) {
  return (b, dt, S) => b.def.patterns[0].find((p) => p.id === id).run(b, dt, S);
}
