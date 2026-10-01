// IX · TRAICIÓN — Cocytus: slow but lethal frozen demons, traitors fixed in the ice, glacial wraiths.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { congeladoSheet, traidorSheet, glacialSheet } from '../../art/enemies/traicion.js';
import { efialtesSheet } from '../../art/enemies/minibosses_b.js';
import { GroundHazard } from '../hazards.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const SHARD = [0x16304e, 0x4a84a8, 0xc8ecf8, 0xffffff];
const FREEZE = { freeze: { amount: 0.45, dur: 1.4 } };

export function frostField(world, x, z, o = {}) {
  world.addHazard(new GroundHazard(world, x, z, { r: o.r ?? 1.4, dur: o.dur ?? 4, tick: 0.5, damage: o.damage ?? 3, element: 'ice', status: { freeze: { amount: 0.3, dur: 1.4 } }, decal: 'frost', unlit: true, color: 0xc8ecf8, preset: 'frost', slow: true }));
}

registerEnemy({
  id: 'congelado', name: 'Demonio Congelado', circle: 'traicion', hp: 150, speed: 1.5, radius: 0.75, mass: 9, blood: 'ice', poise: 0.6, knockMul: 0, armor: 0.2,
  sheet: () => congeladoSheet(), aura: 'frost', auraY: 1.2,
  spawnRamp: [0x0a1428, 0x2a5478, 0x84bcd8, 0xffffff], spawnEdge: 0x9ad8ff, deathPreset: 'ice', deathEdge: 0xc8ecf8,
  desc: 'Lento como el invierno y igual de inevitable. Un solo golpe suyo congela la sangre.',
  onDeath(e) { e.ring(8, { speed: 6, kind: 'shard', ramp: SHARD, size: 10, damage: 10, life: 1.2, element: 'ice', status: FREEZE }); },
  think(e, dt) {
    if (B.melee(e, dt, { shape: 'circle', range: 2.4, windup: 1.1, damage: 28, knockback: 12, recover: 1.0, cooldown: 2, trigger: 2.6, element: 'ice', status: FREEZE,
      onHit: (en) => { frostField(en.world, en.x, en.z, { r: 2.2, dur: 3 }); en.world.fx.emit('ice', en.x, 0.5, en.z, 20, { speed: [3, 7] }); en.world.fx.shake(0.4); Events.emit('boss:slam', {}); } })) return;
    e.chase(1);
    e.play('move');
  },
});

registerEnemy({
  id: 'traidor', name: 'Traidor en el Hielo', circle: 'traicion', hp: 60, speed: 0, radius: 0.5, mass: 99, blood: 'ice', knockMul: 0,
  sheet: () => traidorSheet(), spawnRamp: [0x0a1428, 0x2a5478, 0x84bcd8, 0xffffff], spawnEdge: 0x9ad8ff, deathPreset: 'ice',
  desc: 'Hundido en Cocito hasta el cuello. Sus lágrimas se congelan y salen disparadas como cuchillas.',
  init(e) { e.cooldowns.volley = 0.8 + Math.random() * 1.5; e.ai.pat = Math.floor(Math.random() * 2); },
  think(e, dt) {
    e.stop(0);
    if (B.volley(e, dt, { windup: 0.6, shots: e.ai.pat ? 1 : 3, interval: 0.2, range: 14, cooldown: 2.4, flash: 0x9ad8ff,
      fire: (e, i) => {
        if (e.ai.pat) e.ring(10, { angle: Math.random(), speed: 5.5, kind: 'shard', ramp: SHARD, size: 10, damage: 11, life: 2.4, element: 'ice', status: FREEZE });
        else e.shoot({ angle: e.angleToTarget(), speed: 11, kind: 'shard', ramp: SHARD, size: 12, damage: 13, life: 1.6, element: 'ice', status: FREEZE, trail: 'frost' });
      } })) return;
    e.play('idle');
  },
});

registerEnemy({
  id: 'glacial', name: 'Espectro Glacial', circle: 'traicion', hp: 72, speed: 2.2, radius: 0.45, mode: 'fly', blood: 'ice',
  sheet: () => glacialSheet(), aura: 'frost', auraY: 1, light: { color: 0x9ad8ff, intensity: 0.6, radius: 3 },
  spawnRamp: [0x0a1428, 0x2a5478, 0x84bcd8, 0xffffff], spawnEdge: 0x9ad8ff, deathPreset: 'ice', deathEdge: 0xc8ecf8,
  desc: 'El frío que queda cuando se rompe una promesa. Congela el suelo a su paso.',
  init(e) { e.cooldowns.ring = 2; e.ai.trail = 0; },
  think(e, dt) {
    const A = e.ai;
    A.trail -= dt;
    if (A.trail <= 0) { A.trail = 1.6; frostField(e.world, e.x, e.z, { r: 1.1, dur: 3.5 }); }
    if (e.ready('ring') && e.distToTarget() < 5 && e.cd('ring', 5)) {
      e.play('windup', { restart: true });
      e.telegraph({ shape: 'ring', radius: 4, inner: 1, duration: 0.8, follow: e, color: 0x16304e, edge: 0xc8ecf8 });
      e.after(0.8 * e.teleMul, () => {
        e.play('attack', { restart: true });
        e.strike({ shape: 'ring', radius: 4, inner: 1, damage: 14, knockback: 5, element: 'ice', status: FREEZE });
        e.world.fx.ring('ice', e.x, e.z, 2.5, 30, { speed: [1, 3] });
        for (let k = 0; k < 6; k++) { const a = k * 1.047; frostField(e.world, e.x + Math.cos(a) * 2.5, e.z + Math.sin(a) * 2.5, { r: 1, dur: 3 }); }
      });
      return;
    }
    if (B.melee(e, dt, { range: 3, arc: 0.9, windup: 0.6, damage: 12, knockback: 3, cooldown: 2.2, element: 'ice', status: FREEZE })) return;
    e.keepDistance(2, 4.5, 0.8);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · Efialtes el Gigante — "Raphèl maì amècche zabì almi" (Nimrod's madness echoes)
// ------------------------------------------------------------------------------------------
registerBoss({
  id: 'efialtes', name: 'Efialtes', title: 'El gigante que desafió a Júpiter', miniboss: true, showBar: true, circle: 'traicion',
  hp: 900, speed: 0, radius: 1.6, mass: 99, blood: 'ice', pivot: 2, shadow: 2.4, knockMul: 0,
  sheet: () => efialtesSheet(), aura: 'frost', auraY: 2.5, light: { color: 0x9ad8ff, intensity: 1, radius: 6, y: 3 },
  phases: [0.5], phaseFx: 'ice', deathPreset: 'ice', deathEdge: 0xc8ecf8, deathRamp: SHARD, pillarRamp: SHARD,
  idle(b) { b.stop(0); b.play('idle'); b.faceTarget(); },
  patterns: {
    0: [
      { id: 'barrido', weight: 3, cd: 2.4, run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 7, halfAngle: 1.1, angle: S.a, duration: 1 }); Events.emit('boss:windup', { boss: b }); }
        if (S.t >= 1 * b.teleMul && !S.f) {
          S.f = true; b.play('attack', { restart: true });
          b.strike({ shape: 'arc', angle: S.a, range: 7, arc: 2.2, damage: 22, knockback: 14 });
          for (let k = 0; k < 20; k++) b.world.fx.emit('ice', b.x + Math.cos(S.a + (k / 19 - 0.5) * 2.2) * 5, 0.4, b.z + Math.sin(S.a + (k / 19 - 0.5) * 2.2) * 5, 1);
          b.world.fx.shake(0.5);
          Events.emit('boss:slam', { boss: b });
        }
        if (S.t > 1.7) return 'done';
      } },
      { id: 'pisoton', weight: 2, cd: 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); S.k = 0; }
        if (S.k < 4 && S.t >= 0.3 + S.k * 0.5) {
          const p = b.target;
          const x = p.x, z = p.z;
          b.telegraph({ shape: 'circle', x, z, radius: 1.8, duration: 0.85 });
          b.after(0.85 * b.teleMul, () => { b.strike({ shape: 'circle', x, z, radius: 1.8, damage: 18, knockback: 8, element: 'ice', status: FREEZE }); b.world.fx.decal('crack', x, z, 1.6); b.world.fx.emit('ice', x, 0.3, z, 14); b.world.fx.shake(0.3); });
          S.k++;
        }
        if (S.t > 2.8) return 'done';
      } },
      { id: 'cadenas', weight: 2, cd: 5, run: (b, dt, S) => {
        if (S.t === 0) { b.play('windup', { restart: true }); S.a = b.angleToTarget(); for (let k = -1; k <= 1; k++) b.telegraph({ shape: 'rect', angle: S.a + k * 0.5, length: 12, width: 1, duration: 0.9 }); }
        if (S.t >= 0.9 * b.teleMul && !S.f) {
          S.f = true; b.play('attack', { restart: true });
          for (let k = -1; k <= 1; k++) { b.strike({ shape: 'line', angle: S.a + k * 0.5, length: 12, width: 1, damage: 18, knockback: 9 }); b.world.fx.line('spark', b.x, b.z, b.x + Math.cos(S.a + k * 0.5) * 12, b.z + Math.sin(S.a + k * 0.5) * 12, 10, { y: 0.6, c0: 0xd2d8e4, c1: 0x3a3e4a }); }
          b.world.fx.shake(0.4);
        }
        if (S.t > 1.5) return 'done';
      } },
    ],
    1: [
      { id: 'barrido', weight: 3, cd: 2, run: (...a) => P0('barrido')(...a) },
      { id: 'pisoton', weight: 2, cd: 3.4, run: (...a) => P0('pisoton')(...a) },
      { id: 'cadenas', weight: 2, cd: 4, run: (...a) => P0('cadenas')(...a) },
      { id: 'granizo', weight: 2, cd: 5, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); }
        if (S.t > 0.5 && S.t < 2.5 && Math.floor(S.t * 8) > (S.n || 0)) { S.n = Math.floor(S.t * 8); b.shoot({ angle: Math.random() * 6.28, speed: 5 + Math.random() * 3, kind: 'shard', ramp: SHARD, size: 10, damage: 10, life: 2.5, element: 'ice', status: FREEZE }); }
        if (S.t > 2.8) return 'done';
      } },
    ],
  },
});
function P0(id) { return (b, dt, S) => b.def.patterns[0].find((p) => p.id === id).run(b, dt, S); }
