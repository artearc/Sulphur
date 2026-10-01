// V · IRA — the Styx: souls that explode with rage, the drowned that drag you under, sullen smoke.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { iracundoSheet, hundidoSheet, humoSheet, argentiSheet } from '../../art/enemies/ira.js';
import { GroundHazard } from '../hazards.js';
import { C } from '../room.js';
import { angleTo } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

registerEnemy({
  id: 'iracundo', name: 'Iracundo', circle: 'ira', hp: 30, speed: 3.9, radius: 0.45, mass: 1, blood: 'ember',
  sheet: () => iracundoSheet(), aura: 'ember', auraY: 1, light: { color: 0xff5020, intensity: 0.7, radius: 2.6 },
  spawnRamp: [0x3a0800, 0xc04008, 0xffb840, 0xfff0a0], spawnEdge: 0xffb840, deathPreset: 'fire', deathEdge: 0xffb840, deathDur: 0.2,
  desc: 'La ira lo consume hasta reventar. Aléjate cuando empiece a hincharse; o haz que estalle junto a los suyos.',
  onDeath(e) {
    if (e.ai.exploded) return;
    e.ai.exploded = true;
    B.explode(e, { radius: 2.1, damage: 14, key: 'iraDeath' });
  },
  think(e, dt) {
    const A = e.ai;
    if (A.fuse) {
      A.fuse.t += dt;
      e.stop(0);
      e.play('windup');
      e.sprite.flash(A.fuse.t % 0.2 < 0.1 ? 0xffffff : 0xff6020, 0.05);
      if (A.fuse.t >= 1.05 * e.teleMul) {
        A.exploded = true;
        B.explode(e, { radius: 2.5, damage: 22, key: 'ira' });
        e.alive = false; e.noLoot = false; e.die({});
        e.world.onEnemyKilled(e, {});
      }
      return;
    }
    if (e.distToTarget() < 2) {
      A.fuse = { t: 0 };
      e.telegraph({ shape: 'circle', radius: 2.5, duration: 1.05, follow: e, color: 0x5a0800, edge: 0xffb840 });
      e.world.game.ui?.bark(e.x, e.z, '¡AAAARGH!', 1);
      Events.emit('enemy:windup', { enemy: e, fuse: true });
      return;
    }
    e.chase(1);
    e.play('move');
  },
});

registerEnemy({
  id: 'hundido', name: 'Hundido del Estigio', circle: 'ira', hp: 52, speed: 2.8, radius: 0.5, mass: 2, blood: 'smoke',
  sheet: () => hundidoSheet(), spawnRamp: [0x050808, 0x162420, 0x30463c, 0x7a9a8a], deathPreset: 'smoke',
  desc: 'Se ahogó en su propio rencor. Emerge del fango para arrastrarte con él.',
  init(e) { e.ai.mode = 'up'; e.ai.t = 0; },
  think(e, dt) {
    const A = e.ai, W = e.world;
    A.t += dt;
    const onLiquid = W.room.typeAt(e.x, e.z) === C.LIQUID;
    if (A.mode === 'under') {
      e.untargetable = true;
      e.play('under');
      e.chase(1.25);
      if (Math.random() < dt * 6) W.fx.emit('smoke', e.x, 0.1, e.z, 1);
      if (e.distToTarget() < 1.4 || A.t > 4) { A.mode = 'grab'; A.t = 0; e.stop(0); e.untargetable = false; e.play('emerge', { restart: true }); e.telegraph({ shape: 'circle', radius: 1.6, duration: 0.55, follow: e }); Events.emit('enemy:windup', { enemy: e }); }
      return;
    }
    if (A.mode === 'grab') {
      e.stop(0);
      if (A.t >= 0.55 * e.teleMul && !A.grabbed) {
        A.grabbed = true;
        e.play('attack', { restart: true });
        const n = e.strike({ shape: 'circle', radius: 1.6, damage: 11, knockback: -6, status: { stun: { amount: 1, dur: 0.7 }, slow: { amount: 1, dur: 1.5 } } });
        W.fx.emit('smoke', e.x, 0.5, e.z, 14, { radius: 0.8 });
        if (n) W.game.ui?.bark(e.x, e.z, 'Abajo... conmigo...', 1.4);
      }
      if (A.t > 1.6) { A.mode = 'up'; A.t = 0; A.grabbed = false; }
      return;
    }
    // surfaced: lumbers toward the player; dives again whenever it stands in the swamp
    if (B.melee(e, dt, { range: 1.6, arc: 1.8, windup: 0.6, damage: 12, knockback: 5, cooldown: 1.6 })) return;
    if (onLiquid && A.t > 1.5) { A.mode = 'under'; A.t = 0; W.fx.emit('smoke', e.x, 0.3, e.z, 10); return; }
    e.chase(0.8);
    e.play('move');
    if (!onLiquid && A.t > 6) { A.mode = 'under'; A.t = 0; }
  },
});

registerEnemy({
  id: 'humo', name: 'Humo Hosco', circle: 'ira', hp: 28, speed: 1.9, radius: 0.5, mode: 'fly', blood: 'smoke', knockMul: 1.6,
  sheet: () => humoSheet(), aura: 'smoke', auraY: 1,
  spawnRamp: [0x0a0809, 0x2a2426, 0x524a4c, 0x8a8284], deathPreset: 'smoke',
  desc: '"Tristi fummo": los perezosos de ánimo suspiran humo que ahoga. Débil, pero te envuelve.',
  init(e) { e.cooldowns.cloud = 2 + Math.random() * 2; },
  onDeath(e) { e.world.addHazard(new GroundHazard(e.world, e.x, e.z, { r: 1.6, dur: 3.5, tick: 0.6, damage: 2, element: 'physical', decal: 'scorch', color: 0x606060, preset: 'smoke', slow: true })); },
  think(e, dt) {
    if (e.ready('cloud') && e.distToTarget() < 6 && e.cd('cloud', 4.5)) {
      e.play('attack', { restart: true });
      const p = e.target;
      e.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 1.5, duration: 0.8, color: 0x1a1618, edge: 0x6a6264 });
      const x = p.x, z = p.z;
      e.after(0.8 * e.teleMul, () => e.world.addHazard(new GroundHazard(e.world, x, z, { r: 1.6, dur: 4, tick: 0.5, damage: 3, element: 'physical', decal: 'scorch', color: 0x505050, preset: 'smoke', slow: true })));
      Events.emit('enemy:shoot', { enemy: e });
      return;
    }
    e.keepDistance(2.5, 5, 0.7);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · Filippo Argenti
// ------------------------------------------------------------------------------------------
registerBoss({
  id: 'argenti', name: 'Filippo Argenti', title: 'El florentino rabioso', miniboss: true, showBar: true, circle: 'ira',
  hp: 650, speed: 2.4, radius: 0.9, mass: 9, blood: 'blood', pivot: 2, shadow: 1.6,
  sheet: () => argentiSheet(), aura: 'ember', auraY: 1.4, light: { color: 0xff5020, intensity: 0.8, radius: 4, y: 2 },
  phases: [0.5], phaseFx: 'fire', deathPreset: 'blood', deathEdge: 0xffb840, deathRamp: R.ember, pillarRamp: R.ember,
  onPhase(b) { b.speed *= 1.3; b.cdMul *= 0.75; b.world.game.ui?.bark(b.x, b.z, '¡Muerde, muerde, que yo también muerdo!', 2.2); },
  idle(b) { b.chase(1); b.play('move'); },
  patterns: {
    0: [
      { id: 'puños', weight: 3, cd: 1.4, range: [0, 3], run: (b, dt, S) => {
        if (S.t === 0) S.n = 0;
        const k = Math.floor(S.t / 0.45);
        if (k > S.n - 1 && S.n < 3 && S.t >= S.n * 0.45) {
          S.n++;
          b.faceTarget(); const a = b.angleToTarget();
          b.play('attack', { restart: true });
          b.telegraph({ shape: 'cone', radius: 2.6, halfAngle: 0.55, angle: a, duration: 0.28 });
          b.after(0.28 * b.teleMul, () => { b.vx = Math.cos(a) * 6; b.vz = Math.sin(a) * 6; b.strike({ shape: 'arc', angle: a, range: 2.6, arc: 1.1, damage: 13, knockback: 6 }); b.world.fx.shake(0.15); });
        }
        b.vx *= Math.exp(-8 * dt); b.vz *= Math.exp(-8 * dt);
        if (S.t > 1.8) return 'done';
      } },
      { id: 'golpe', weight: 2, cd: 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('windup', { restart: true }); b.telegraph({ shape: 'circle', radius: 3.2, duration: 0.85, follow: b }); Events.emit('boss:windup', { boss: b }); }
        if (S.t >= 0.85 * b.teleMul && !S.hit) {
          S.hit = true; b.play('attack', { restart: true });
          b.strike({ shape: 'circle', radius: 3.2, damage: 18, knockback: 12, element: 'fire', status: { burn: { amount: 1, dur: 2 } } });
          b.ring(12, { speed: 6, kind: 'orb', ramp: R.ember.slice(1), size: 9, damage: 9, life: 1.6, trail: 'fire', element: 'fire' });
          b.world.fx.ring('fire', b.x, b.z, 1.5, 24, { speed: [4, 8] });
          b.world.fx.decal('scorch', b.x, b.z, 2.4);
          b.world.fx.shake(0.5);
          Events.emit('boss:slam', { boss: b });
        }
        if (S.t > 1.5) return 'done';
      } },
      { id: 'embestida', weight: 2, cd: 3, range: [3, 12], run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'rect', angle: S.a, length: 9, width: 1.8, duration: 0.7 }); S.hit = new Set(); }
        const go = 0.7 * b.teleMul;
        if (S.t >= go && S.t < go + 0.6) { b.play('move'); b.vx = Math.cos(S.a) * 15 / b.speedMul; b.vz = Math.sin(S.a) * 15 / b.speedMul; b.strike({ shape: 'circle', radius: 1.1, damage: 15, knockback: 10, hitSet: S.hit }); }
        else if (S.t >= go) b.stop(0.3);
        if (S.t > go + 1) return 'done';
      } },
    ],
    1: [
      { id: 'puños', weight: 3, cd: 1.1, range: [0, 3], run: (...a) => P0('puños')(...a) },
      { id: 'golpe', weight: 2, cd: 3, run: (...a) => P0('golpe')(...a) },
      { id: 'embestida', weight: 2, cd: 2.4, range: [3, 12], run: (...a) => P0('embestida')(...a) },
      { id: 'iracundos', weight: 1.4, cd: 9, cond: (b) => b.world.enemies.filter((e) => e.alive).length < 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); }
        if (S.t > 0.5 && !S.sp) { S.sp = true; for (let k = 0; k < 3; k++) { const a = (k / 3) * 6.28; b.world.controller?.spawnEnemy?.('iracundo', b.x + Math.cos(a) * 4, b.z + Math.sin(a) * 3, {}); } }
        if (S.t > 1) return 'done';
      } },
    ],
  },
});
function P0(id) { return (b, dt, S) => b.def.patterns[0].find((p) => p.id === id).run(b, dt, S); }
