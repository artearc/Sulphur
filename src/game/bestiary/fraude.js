// VIII · FRAUDE — Malebolge: false souls, hooked demons, thieves who become serpents.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { falsarioSheet, malebrancheSheet, ladronSheet } from '../../art/enemies/fraude.js';
import { malacodaSheet } from '../../art/enemies/minibosses_b.js';
import { soulSheet } from '../../art/characters.js';
import { angleTo } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const PITCH = [0x020304, 0x0c1418, 0x1e5c5a, 0x52b4a0];

// a hooked strike that drags the victim toward the demon
function hookPull(e, S, dt, o = {}) {
  if (S.t === 0) { e.faceTarget(); S.a = e.angleToTarget(); e.play('windup', { restart: true }); e.telegraph({ shape: 'rect', angle: S.a, length: o.len ?? 4.6, width: 0.9, duration: o.windup ?? 0.6, color: o.fake ? 0x2e1450 : 0xa01020, edge: o.fake ? 0xa070e0 : 0xff5a3a }); }
  if (S.t >= (o.windup ?? 0.6) * e.teleMul && !S.f) {
    S.f = true;
    e.play('attack', { restart: true });
    if (!o.fake) {
      const n = e.strike({ shape: 'line', angle: S.a, length: o.len ?? 4.6, width: 0.9, damage: o.damage ?? 14, knockback: -9, knockAngle: S.a });
      if (n) e.world.fx.line('spark', e.x, e.z, e.target.x, e.target.z, 6, { y: 0.9, c0: 0xd2d8e4, c1: 0x3a3e4a });
    }
    e.world.fx.line('dust', e.x, e.z, e.x + Math.cos(S.a) * (o.len ?? 4.6), e.z + Math.sin(S.a) * (o.len ?? 4.6), 5, { y: 0.6 });
  }
  return S.t > (o.windup ?? 0.6) * e.teleMul + 0.45;
}

registerEnemy({
  id: 'falsario', name: 'Falsario', circle: 'fraude', hp: 88, speed: 3.4, radius: 0.45, mode: 'fly', blood: 'ichor', noSpawnFx: true,
  sheet: () => soulSheet({ robe: R.soul, glow: 0x406080 }), pivot: 1,
  desc: 'Se disfraza de alma suplicante. Fíjate en sus ojos: de vez en cuando arden en rojo.',
  init(e) { e.ai.disguised = true; e.untargetable = true; e.sprite.setAlpha(1); e.play('idle_down'); e.ai.tell = 2 + Math.random() * 2; },
  onSpawned(e) { e.untargetable = true; e.play('idle_down'); },
  think(e, dt) {
    const A = e.ai, W = e.world;
    if (A.disguised) {
      e.stop(0);
      e.play('idle_down');
      A.tell -= dt;
      if (A.tell <= 0) { A.tell = 2.5 + Math.random() * 2; e.sprite.flash(0xff2030, 0.12); }
      A.wait = (A.wait || 0) + dt;
      const alone = !W.enemies.some((x) => x !== e && x.alive && !x.ai?.disguised);
      if (e.distToTarget() < 2.4 || (alone && A.wait > 3) || A.wait > 12) {
        A.disguised = false;
        e.untargetable = false;
        e.sprite.setSheet(falsarioSheet());
        e.play('windup', { restart: true });
        W.fx.emit('shadow', e.x, 1, e.z, 24, { radius: 0.6 });
        W.fx.emit('soul', e.x, 1, e.z, 10);
        W.fx.screenFlash(0x40e0c0, 0.15, 0.1);
        W.game.ui?.bark(e.x, e.z, '¿Me creíste?', 1.4);
        e.cooldowns.melee = 0.35;
        Events.emit('enemy:reveal', { enemy: e });
      }
      return;
    }
    if (B.melee(e, dt, { range: 2.4, arc: 1.4, windup: 0.5, damage: 16, knockback: -5, lunge: 5, track: 3, cooldown: 1.4, element: 'corrupt' })) return;
    // slips through shadows to flank
    if (e.distToTarget() > 6 && e.cd('slip', 4)) {
      const p = e.target, a = Math.random() * 6.28;
      const nx = p.x + Math.cos(a) * 3, nz = p.z + Math.sin(a) * 2.5;
      if (W.room.free(nx, nz, e.radius, 'fly')) { W.fx.emit('shadow', e.x, 1, e.z, 14); e.x = nx; e.z = nz; W.fx.emit('shadow', e.x, 1, e.z, 14); }
    }
    e.chase(1);
    e.play('move');
  },
});

registerEnemy({
  id: 'malebranche', name: 'Malebranche', circle: 'fraude', hp: 84, speed: 3.6, radius: 0.45, blood: 'ichor',
  sheet: () => malebrancheSheet(), spawnRamp: [0x050608, 0x241a28, 0x60486a, 0xff3020],
  desc: 'Demonio de la quinta fosa: hunde a los corruptos en la pez hirviente con su garfio.',
  init(e) { e.ai.side = Math.random() < 0.5 ? 1 : -1; e.cooldowns.hook = 1.5; },
  think(e, dt) {
    const A = e.ai;
    if (A.hook) { const done = hookPull(e, A.hook, dt); A.hook.t += dt; if (done) { A.hook = null; e.cd('hook', 2.6); } e.stop(0.3); return; }
    if (e.ready('hook') && e.distToTarget() < 4.4 && e.distToTarget() > 1.5 && e.hasLos()) { A.hook = { t: 0 }; Events.emit('enemy:windup', { enemy: e }); return; }
    if (B.melee(e, dt, { range: 1.6, arc: 1.7, windup: 0.42, damage: 14, knockback: 6, lunge: 5, cooldown: 1.2 })) return;
    // flanking: pairs approach from opposite sides
    const p = e.target, a = angleTo(p.x, p.z, e.x, e.z) + A.side * 0.9;
    e.moveToward(p.x + Math.cos(a) * 3, p.z + Math.sin(a) * 2.5, 1);
    e.play('move');
  },
});

registerEnemy({
  id: 'ladron', name: 'Ladrón-Serpiente', circle: 'fraude', hp: 70, speed: 4, radius: 0.42, blood: 'ichor',
  sheet: () => ladronSheet(), spawnRamp: [0x041210, 0x123c34, 0x2e8468, 0xa0fff0],
  desc: 'En la séptima fosa, los ladrones y las serpientes intercambian sus formas sin descanso.',
  init(e) { e.ai.form = 0; e.ai.shiftT = 4 + Math.random() * 2; },
  think(e, dt) {
    const A = e.ai;
    A.shiftT -= dt;
    if (A.shifting) {
      A.shifting -= dt; e.stop(0);
      if (A.shifting <= 0) { A.shifting = 0; A.form = 1 - A.form; e.mode = A.form ? 'fly' : 'walk'; }
      return;
    }
    if (A.shiftT <= 0 && !e.ai.melee && !e.ai.charge) {
      A.shiftT = A.form ? 4.5 : 3.5; A.shifting = 0.5;
      e.play('shift', { restart: true });
      e.world.fx.emit('shadow', e.x, 0.8, e.z, 16, { radius: 0.5 });
      e.world.fx.emit('poison', e.x, 0.6, e.z, 8);
      Events.emit('enemy:shift', { enemy: e });
      return;
    }
    if (A.form === 0) {
      if (B.melee(e, dt, { range: 1.4, arc: 1.4, windup: 0.32, damage: 12, knockback: 4, lunge: 6, track: 5, cooldown: 0.8 })) return;
      e.chase(1); e.play('move');
    } else {
      if (B.charge(e, dt, { windup: 0.55, length: 7, speed: 16, damage: 15, knockback: 6, cooldown: 1.6, minRange: 1.8, maxRange: 9, recover: 0.4 })) {
        const ch = e.ai.charge;
        if (ch) { e.play(ch.phase === 'wind' ? 'sWindup' : 'sAttack'); if (ch.phase === 'run') e.strike({ shape: 'circle', radius: 0.7, damage: 0.1, knockback: 0, status: { poison: { amount: 1, dur: 3 } }, hitSet: ch.hit }); }
        return;
      }
      e.chase(1.2); e.play('serpent');
    }
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · Malacoda — "ed elli avea del cul fatto trombetta"
// ------------------------------------------------------------------------------------------
registerBoss({
  id: 'malacoda', name: 'Malacoda', title: 'Capitán de los Malebranche', miniboss: true, showBar: true, circle: 'fraude',
  hp: 820, speed: 3.4, radius: 0.8, mass: 6, blood: 'ichor', pivot: 2, shadow: 1.5,
  sheet: () => malacodaSheet(), aura: 'shadow', auraY: 1.2,
  phases: [0.5], phaseFx: 'shadow', deathPreset: 'shadow', deathEdge: 0x40e0c0, deathRamp: PITCH, pillarRamp: PITCH,
  onSpawned(b) { b.world.game.ui?.bark(b.x, b.z, 'El puente está roto, peregrino. Ve por allí... confía en mí.', 2.5); },
  idle(b) { const d = b.distToTarget(); if (d > 3.5) b.chase(1); else b.steer(b.angleToTarget() + 1.5, 0.8); b.play('move'); },
  patterns: {
    0: [
      { id: 'garfio', weight: 3, cd: 1.8, range: [1.5, 5.5], run: (b, dt, S) => { if (hookPull(b, S, dt, { len: 5.5, damage: 16, windup: 0.55 })) return 'done'; } },
      { id: 'finta', weight: 2, cd: 4, run: (b, dt, S) => {
        // the liar: a violet (false) hook first, then the red (true) one from another angle
        if (S.t === 0) { S.fake = { t: 0 }; S.real = null; Events.emit('boss:windup', { boss: b }); b.world.game.ui?.bark(b.x, b.z, '¡Por aquí!', 1); }
        if (S.fake) { const done = hookPull(b, S.fake, dt, { fake: true, len: 5.5, windup: 0.5 }); S.fake.t += dt; if (done) { S.fake = null; S.real = { t: 0 }; } return; }
        if (S.real) { const done = hookPull(b, S.real, dt, { len: 6, damage: 18, windup: 0.4 }); S.real.t += dt; if (done) return 'done'; }
      } },
      { id: 'tajos', weight: 3, cd: 1.4, range: [0, 2.6], run: (b, dt, S) => {
        if (S.t === 0) S.n = 0;
        if (S.n < 3 && S.t >= S.n * 0.4) {
          S.n++; b.faceTarget(); const a = b.angleToTarget(); b.play('attack', { restart: true });
          b.telegraph({ shape: 'cone', radius: 2.4, halfAngle: 0.7, angle: a, duration: 0.25 });
          b.after(0.25 * b.teleMul, () => b.strike({ shape: 'arc', angle: a, range: 2.4, arc: 1.4, damage: 13, knockback: 5 }));
        }
        if (S.t > 1.5) return 'done';
      } },
    ],
    1: [
      { id: 'garfio', weight: 3, cd: 1.5, range: [1.5, 5.5], run: (...a) => P0('garfio')(...a) },
      { id: 'finta', weight: 3, cd: 3, run: (...a) => P0('finta')(...a) },
      { id: 'tajos', weight: 2, cd: 1.2, range: [0, 2.6], run: (...a) => P0('tajos')(...a) },
      { id: 'escuadra', weight: 1.5, cd: 10, cond: (b) => b.world.enemies.filter((e) => e.alive).length < 3, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); b.world.game.ui?.bark(b.x, b.z, '¡Barbariccia! ¡Calcabrina! ¡A él!', 2); }
        if (S.t > 0.6 && !S.sp) { S.sp = true; for (let k = 0; k < 2; k++) b.world.controller?.spawnEnemy?.('malebranche', b.x + (k ? 3 : -3), b.z + 1, {}); }
        if (S.t > 1) return 'done';
      } },
    ],
  },
});
function P0(id) { return (b, dt, S) => b.def.patterns[0].find((p) => p.id === id).run(b, dt, S); }
