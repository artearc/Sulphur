// VI · HEREJÍA — the city of Dis: fire spectres, necromancers raising the dead, pillars of flame.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { espectroSheet, necromanteSheet, esqueletoSheet, herejeSheet } from '../../art/enemies/herejia.js';
import { heresiarcaSheet } from '../../art/enemies/minibosses_b.js';
import { LineHazard } from '../hazards.js';
import { pillarSheet } from '../../art/fx.js';
import { angleTo, angleDiff } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const EMB = R.ember;
const FIRE_STATUS = { burn: { amount: 1, dur: 2.5 } };

export function firePillar(e, x, z, o = {}) {
  const W = e.world, r = o.radius ?? 1.2;
  e.telegraph({ shape: 'circle', x, z, radius: r, duration: o.windup ?? 0.85, color: 0x5a1000, edge: 0xffb840 });
  e.after((o.windup ?? 0.85) * e.teleMul, () => {
    e.strike({ shape: 'circle', x, z, radius: r, damage: o.damage ?? 17, knockback: 6, element: 'fire', status: FIRE_STATUS });
    W.fx.play(pillarSheet('fire', EMB, 22, 90), { x, y: 0, z: z + 0.05, pivot: 0, scale: r });
    W.fx.emit('fire', x, 0.4, z, 16, { radius: r * 0.6, speed: [1, 3] });
    W.fx.decal('scorch', x, z, r * 0.8, { alpha: 0.85 });
    W.fx.lightFlash(x, z, 0xff8030, 3, 6, 0.3);
    Events.emit('trap:fire', { element: 'fire' });
  });
}

registerEnemy({
  id: 'espectroFuego', name: 'Espectro de Fuego', circle: 'herejia', hp: 62, speed: 3.2, radius: 0.45, mode: 'fly', blood: 'ember',
  sheet: () => espectroSheet(), aura: 'ember', auraY: 1.2, light: { color: 0xff7020, intensity: 0.8, radius: 3 },
  spawnRamp: [0x3a0800, 0xc04008, 0xffb840, 0xfff0a0], spawnEdge: 0xffb840, deathPreset: 'fire', deathEdge: 0xffb840,
  desc: 'Envuelto en su mortaja, arde por dentro. Deja estelas de fuego al deslizarse.',
  init(e) { e.ai.trailT = 0; e.cooldowns.dash = 1.5; },
  think(e, dt) {
    const A = e.ai;
    if (A.dash) {
      A.dash.t += dt;
      if (A.dash.t < 0.55 * e.teleMul) { e.stop(0); return; }
      e.play('attack');
      const sp = 13;
      e.vx = Math.cos(A.dash.a) * sp / e.speedMul; e.vz = Math.sin(A.dash.a) * sp / e.speedMul;
      e.strike({ shape: 'circle', radius: 0.8, damage: 15, knockback: 6, element: 'fire', status: FIRE_STATUS, hitSet: A.dash.hit });
      if (A.dash.t > 0.55 * e.teleMul + 0.5) {
        e.world.addHazard(new LineHazard(e.world, A.dash.sx, A.dash.sz, e.x, e.z, { w: 0.9, dur: 3.2, damage: 6, element: 'fire', status: FIRE_STATUS, preset: 'fire' }));
        A.dash = null; e.stop(0.2); e.cd('dash', 3);
      }
      return;
    }
    if (e.ready('dash') && e.distToTarget() < 8 && e.hasLos()) {
      e.faceTarget();
      A.dash = { t: 0, a: e.angleToTarget(), sx: e.x, sz: e.z, hit: new Set() };
      e.play('windup', { restart: true });
      e.telegraph({ shape: 'rect', angle: A.dash.a, length: 6.5, width: 1.4, duration: 0.55 });
      Events.emit('enemy:windup', { enemy: e });
      return;
    }
    e.keepDistance(2.5, 5.5, 1);
    e.play('move');
  },
});

registerEnemy({
  id: 'necromante', name: 'Necromante', circle: 'herejia', hp: 70, speed: 2.4, radius: 0.42, blood: 'ichor',
  sheet: () => necromanteSheet(), aura: 'ember', auraY: 1.6,
  spawnRamp: [0x1a0606, 0x521810, 0xc04008, 0xffb840], deathPreset: 'ember', deathEdge: 0xffb840,
  desc: 'Lee al revés las oraciones. Los muertos de los sepulcros se levantan a su voz. Mátalo primero.',
  init(e) { e.cooldowns.raise = 1.8; e.cooldowns.blink = 2; },
  think(e, dt) {
    const A = e.ai, W = e.world;
    if (A.cast) {
      A.cast.t += dt;
      e.stop(0); e.play('cast');
      if (A.cast.t >= 1.1 * e.teleMul && !A.cast.done) {
        A.cast.done = true;
        for (const s of A.cast.spots) W.controller?.spawnEnemy?.('esqueleto', s.x, s.z, { spawnDelay: 0.3 });
      }
      if (A.cast.t > 1.5) A.cast = null;
      return;
    }
    const minions = W.enemies.filter((x) => x.alive && x.type === 'esqueleto').length;
    if (e.ready('raise') && minions < 4 && e.cd('raise', 6)) {
      A.cast = { t: 0, spots: [] };
      for (let k = 0; k < 2; k++) {
        const p = W.room.randomFloor(Math.random ? { int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) } : null, (x, z) => Math.hypot(x - e.x, z - e.z) < 5);
        if (p) { A.cast.spots.push(p); W.fx.decal('sigilSin', p.x, p.z, 1, { unlit: true, glow: 1, fade: 1.6, color: 0xff7020 }); }
      }
      Events.emit('enemy:windup', { enemy: e, summon: true });
      return;
    }
    // flees from melee range by blinking away
    if (e.distToTarget() < 2.6 && e.ready('blink') && e.cd('blink', 4)) {
      const p = W.room.randomFloor({ int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) }, (x, z) => Math.hypot(x - e.target.x, z - e.target.z) > 6);
      if (p) {
        W.fx.emit('fire', e.x, 1, e.z, 14, { radius: 0.4 });
        e.x = p.x; e.z = p.z;
        W.fx.emit('fire', e.x, 1, e.z, 14, { radius: 0.4 });
        Events.emit('enemy:blink', { enemy: e });
      }
      return;
    }
    if (B.volley(e, dt, { windup: 0.6, shots: 2, interval: 0.25, range: 10, cooldown: 2.8, flash: 0xff7020,
      fire: (e) => e.shoot({ angle: e.angleToTarget(), speed: 7, kind: 'skull', ramp: [0x3a0800, 0xc04008, 0xffb840, 0xfff0a0], size: 10, damage: 11, homing: 1.2, life: 2.5, trail: 'fire', element: 'fire' }) })) return;
    e.keepDistance(5, 8, 0.8);
    e.play('move');
  },
});

registerEnemy({
  id: 'esqueleto', name: 'Muerto Calcinado', circle: 'herejia', hp: 26, speed: 3, radius: 0.38, blood: 'ember',
  sheet: () => esqueletoSheet(), spawnRamp: [0x1a0606, 0x521810, 0xc04008, 0xffb840], deathPreset: 'ember',
  desc: 'Polvo de hereje que aún sabe empuñar.',
  onSpawned(e) { e.play('rise', { restart: true }); e.ai.rising = 0.6; },
  think(e, dt) {
    if (e.ai.rising > 0) { e.ai.rising -= dt; e.stop(0); return; }
    if (B.melee(e, dt, { range: 1.4, arc: 1.6, windup: 0.45, damage: 12, knockback: 4, lunge: 4, track: 3, cooldown: 1.2 })) return;
    e.chase(1);
    e.play('move');
  },
});

registerEnemy({
  id: 'hereje', name: 'Hereje Ardiente', circle: 'herejia', hp: 80, speed: 2.2, radius: 0.45, blood: 'ember', armor: 0.1,
  sheet: () => herejeSheet(), aura: 'ember', auraY: 1.8, light: { color: 0xff7020, intensity: 0.6, radius: 2.6 },
  spawnRamp: [0x3a0800, 0xc04008, 0xffb840, 0xfff0a0], deathPreset: 'fire', deathEdge: 0xffb840,
  desc: 'Su tomo ardiente le sirve de escudo: atácalo por la espalda. Invoca columnas de fuego bajo tus pies.',
  // frontal block: the burning tome stops blows from the front while casting
  init(e) {
    e.damageTakenMul = (hit) => {
      if (!e.ai.casting || !hit.source) return 1;
      const a = angleTo(e.x, e.z, hit.source.x, hit.source.z);
      if (Math.abs(angleDiff(e.angle, a)) < 1.1) { e.world.fx.emit('ember', e.x + Math.cos(a) * 0.5, 1.2, e.z + Math.sin(a) * 0.5, 6); return 0.25; }
      return 1.2;
    };
    e.cooldowns.pillars = 1.5;
  },
  think(e, dt) {
    const A = e.ai;
    if (A.cast) {
      A.cast.t += dt;
      e.stop(0); e.play('cast'); e.faceTarget();
      A.casting = true;
      const n = 3 + (e.elite ? 2 : 0);
      if (A.cast.k < n && A.cast.t >= A.cast.k * 0.45) {
        const p = e.target;
        firePillar(e, p.x + p.vx * 0.25, p.z + p.vz * 0.25, { damage: 17 });
        A.cast.k++;
      }
      if (A.cast.t > n * 0.45 + 0.8) { A.cast = null; A.casting = false; e.cd('pillars', 3.5); }
      return;
    }
    if (e.ready('pillars') && e.distToTarget() < 11) { A.cast = { t: 0, k: 0 }; Events.emit('enemy:windup', { enemy: e }); return; }
    if (B.melee(e, dt, { range: 1.5, arc: 1.6, windup: 0.5, damage: 13, knockback: 6, cooldown: 1.6, element: 'fire', status: FIRE_STATUS })) return;
    e.keepDistance(3.5, 7, 0.8);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · El Heresiarca
// ------------------------------------------------------------------------------------------
registerBoss({
  id: 'heresiarca', name: 'El Heresiarca', title: 'Sermón de llamas', miniboss: true, showBar: true, circle: 'herejia',
  hp: 720, speed: 0.9, radius: 1.3, mass: 30, blood: 'ember', pivot: 2, shadow: 2, knockMul: 0,
  sheet: () => heresiarcaSheet(), aura: 'ember', auraY: 2, light: { color: 0xff7020, intensity: 1.2, radius: 6, y: 2.5 },
  phases: [0.5], phaseFx: 'fire', deathPreset: 'fire', deathEdge: 0xffb840, deathRamp: EMB, pillarRamp: EMB,
  idle(b) { b.stop(0); b.play('idle'); b.faceTarget(); },
  patterns: {
    0: [
      { id: 'sermon', weight: 3, cd: 3.5, run: (b, dt, S) => {
        // rotating spokes of fire: six beams sweeping around the tomb
        if (S.t === 0) { b.play('windup', { restart: true }); S.a0 = Math.random() * 6.28; S.dir = Math.random() < 0.5 ? 1 : -1; for (let k = 0; k < 6; k++) b.telegraph({ shape: 'rect', angle: S.a0 + k * 1.047, length: 8, width: 0.9, duration: 0.9 }); Events.emit('boss:windup', { boss: b }); S.hit = 0; }
        if (S.t > 0.9 * b.teleMul && S.t < 3.2) {
          b.play('attack');
          const a0 = S.a0 + (S.t - 0.9) * 0.7 * S.dir;
          S.hit -= dt;
          for (let k = 0; k < 6; k++) {
            const a = a0 + k * 1.047;
            if (Math.random() < 0.5) b.world.fx.line('fire', b.x, b.z, b.x + Math.cos(a) * 8, b.z + Math.sin(a) * 8, 3, { y: 0.5 });
            if (S.hit <= 0 && b.strike({ shape: 'line', angle: a, length: 8, width: 0.9, damage: 14, knockback: 5, element: 'fire', status: FIRE_STATUS })) S.hit = 0.6;
          }
        }
        if (S.t > 3.4) return 'done';
      } },
      { id: 'columnas', weight: 3, cd: 3, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); S.k = 0; }
        if (S.k < 5 && S.t >= 0.3 + S.k * 0.35) { const p = b.target; firePillar(b, p.x, p.z, { damage: 16, radius: 1.3 }); S.k++; }
        if (S.t > 2.6) return 'done';
      } },
      { id: 'muertos', weight: 1.5, cd: 9, cond: (b) => b.world.enemies.filter((e) => e.alive && e.type === 'esqueleto').length < 3, run: (b, dt, S) => {
        if (S.t === 0) b.play('roar');
        if (S.t > 0.8 && !S.sp) { S.sp = true; for (let k = 0; k < 3; k++) { const a = (k / 3) * 6.28 + 0.5; b.world.controller?.spawnEnemy?.('esqueleto', b.x + Math.cos(a) * 4, b.z + Math.sin(a) * 3, {}); } }
        if (S.t > 1.4) return 'done';
      } },
    ],
    1: [
      { id: 'sermon', weight: 3, cd: 2.8, run: (...a) => P0('sermon')(...a) },
      { id: 'columnas', weight: 3, cd: 2.4, run: (...a) => P0('columnas')(...a) },
      { id: 'muertos', weight: 1.5, cd: 8, cond: (b) => b.world.enemies.filter((e) => e.alive && e.type === 'esqueleto').length < 3, run: (...a) => P0('muertos')(...a) },
      { id: 'tapa', weight: 2, cd: 5, run: (b, dt, S) => {
        // hurls the sarcophagus lid in a line
        if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'rect', angle: S.a, length: 12, width: 2.2, duration: 0.9 }); }
        if (S.t >= 0.9 * b.teleMul && !S.f) {
          S.f = true; b.play('attack', { restart: true });
          b.strike({ shape: 'line', angle: S.a, length: 12, width: 2.2, damage: 20, knockback: 12 });
          b.world.fx.line('dust', b.x, b.z, b.x + Math.cos(S.a) * 12, b.z + Math.sin(S.a) * 12, 20, { y: 0.4 });
          b.world.fx.shake(0.5);
          Events.emit('boss:slam', { boss: b });
        }
        if (S.t > 1.5) return 'done';
      } },
    ],
  },
});
function P0(id) { return (b, dt, S) => b.def.patterns[0].find((p) => p.id === id).run(b, dt, S); }
