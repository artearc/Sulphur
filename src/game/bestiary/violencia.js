// VII · VIOLENCIA — centaurs guarding the river of blood, brutes that charge, harpies of the wood.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { centauroSheet, bestiaSheet, arpiaSheet } from '../../art/enemies/violencia.js';
import { nesoSheet } from '../../art/enemies/minibosses_b.js';
import { GroundHazard, LineHazard } from '../hazards.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const ARROW = [0x3a0404, 0x7a0a0a, 0xc01a14, 0xff8a60];
const bleed = { slow: { amount: 1, dur: 0.6 } };

export function bloodPool(world, x, z, o = {}) {
  world.addHazard(new GroundHazard(world, x, z, { r: o.r ?? 1.1, dur: o.dur ?? 4, tick: 0.45, damage: o.damage ?? 4, element: 'physical', decal: 'blood' + ((Math.random() * 4) | 0), preset: 'bloodMist', slow: true }));
}

registerEnemy({
  id: 'centauro', name: 'Centauro Arquero', circle: 'violencia', hp: 78, speed: 4.6, radius: 0.6, mass: 3, blood: 'blood',
  sheet: () => centauroSheet(), spawnRamp: [0x3a0404, 0x7a0a0a, 0xc01a14, 0xff8a60],
  desc: 'Vigila el río de sangre y no deja que nadie salga más de lo que su culpa permite.',
  init(e) { e.cooldowns.volley = 1.2; e.ai.orbit = Math.random() * 6.28; },
  think(e, dt) {
    if (B.melee(e, dt, { range: 1.8, arc: 1.5, windup: 0.4, damage: 16, knockback: 11, cooldown: 2, trigger: 1.9 })) return;
    if (B.volley(e, dt, {
      windup: 0.7, shots: 3, interval: 0.16, range: 13, cooldown: 2.6, flash: 0xff6040,
      fire: (e, i) => e.shoot({ angle: e.angleToTarget() + (i - 1) * 0.12, speed: 15, kind: 'arrow', ramp: ARROW, size: 14, damage: 13, life: 1.4, trail: 'bloodMist', status: bleed }),
    })) return;
    // gallops around the arena edges
    const A = e.ai, p = e.target;
    A.orbit += dt * 0.55;
    e.moveToward(p.x + Math.cos(A.orbit) * 7, p.z + Math.sin(A.orbit) * 5, 1);
    e.play('move');
  },
});

registerEnemy({
  id: 'bestia', name: 'Bestia de Creta', circle: 'violencia', hp: 105, speed: 2.4, radius: 0.7, mass: 5, blood: 'blood', poise: 0.35, knockMul: 0.3,
  sheet: () => bestiaSheet(), spawnRamp: [0x3a0404, 0x7a0a0a, 0xc01a14, 0xff8a60],
  desc: 'Hermano bastardo del Minotauro. Embiste ciego; si choca contra un muro queda aturdido.',
  init(e) { e.cooldowns.charge = 1.2; },
  think(e, dt) {
    if (B.charge(e, dt, { windup: 0.8, length: 10, speed: 13, damage: 20, knockback: 14, cooldown: 2.6, minRange: 2.5, maxRange: 12, recover: 0.7, wallStun: 1.6 })) {
      if (e.ai.charge?.phase === 'run') { e.play('attack'); if (Math.random() < 0.5) e.world.fx.emit('dust', e.x, 0.2, e.z, 2, { c0: 0x7a321c, c1: 0x2e0e0a }); }
      return;
    }
    if (B.melee(e, dt, { shape: 'circle', range: 2.2, windup: 0.75, damage: 18, knockback: 10, cooldown: 2.2, windAnim: 'windup', attackAnim: 'slam',
      onHit: (en) => { en.world.fx.ring('dust', en.x, en.z, 1, 18, { speed: [3, 6] }); en.world.fx.shake(0.3); bloodPool(en.world, en.x, en.z, { r: 1.4 }); } })) return;
    e.chase(0.9);
    e.play('move');
  },
});

registerEnemy({
  id: 'arpia', name: 'Arpía', circle: 'violencia', hp: 48, speed: 4.2, radius: 0.42, mode: 'fly', blood: 'blood',
  sheet: () => arpiaSheet(), spawnRamp: [0x0e0a0a, 0x342620, 0x604a3a, 0xa08060],
  desc: 'Anida en el bosque de los suicidas y se alimenta de sus hojas. Cae en picado desde lo alto.',
  init(e) { e.ai.hover = 2.2; e.cooldowns.dive = 1.5 + Math.random(); e.ai.orbit = Math.random() * 6.28; },
  think(e, dt) {
    const A = e.ai;
    if (A.dive) {
      const D = A.dive;
      D.t += dt;
      if (D.t < 0.75 * e.teleMul) { e.stop(0); e.play('windup'); A.hover = 2.2 + Math.sin(D.t * 20) * 0.1; return; }
      const k = Math.min(1, (D.t - 0.75 * e.teleMul) / 0.28);
      e.x = D.sx + (D.tx - D.sx) * k; e.z = D.sz + (D.tz - D.sz) * k;
      A.hover = 2.2 * (1 - k);
      e.play('attack');
      if (k >= 1 && !D.hit) {
        D.hit = true;
        e.strike({ shape: 'circle', radius: 1.3, damage: 15, knockback: 7, status: bleed });
        e.world.fx.emit('dust', e.x, 0.2, e.z, 10);
        e.world.fx.emit('blood', e.x, 0.6, e.z, 6);
      }
      if (D.t > 0.75 * e.teleMul + 0.9) { A.dive = null; e.cd('dive', 2.8); }
      return;
    }
    A.hover += (2.2 - A.hover) * Math.min(1, dt * 3);
    if (e.ready('dive') && e.distToTarget() < 9) {
      const p = e.target;
      A.dive = { t: 0, sx: e.x, sz: e.z, tx: p.x, tz: p.z };
      e.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 1.3, duration: 0.75 });
      e.world.game.ui && Math.random() < 0.3 && e.world.game.ui.bark(e.x, e.z, '¡Hojas! ¡Sangre!', 1);
      Events.emit('enemy:windup', { enemy: e });
      return;
    }
    A.orbit += dt * 1.2;
    const p = e.target;
    e.moveToward(p.x + Math.cos(A.orbit) * 4, p.z + Math.sin(A.orbit) * 3, 1);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · Neso el Centauro
// ------------------------------------------------------------------------------------------
registerBoss({
  id: 'neso', name: 'Neso', title: 'El centauro que vengó su muerte', miniboss: true, showBar: true, circle: 'violencia',
  hp: 760, speed: 4.6, radius: 0.85, mass: 8, blood: 'blood', pivot: 2, shadow: 1.8,
  sheet: () => nesoSheet(),
  phases: [0.5], phaseFx: 'bloodMist', deathPreset: 'blood', deathEdge: 0xff6040, deathRamp: R.blood, pillarRamp: R.blood,
  idle(b, dt) {
    b.ai.orb = (b.ai.orb ?? 0) + dt * 0.7;
    const p = b.target;
    b.moveToward(p.x + Math.cos(b.ai.orb) * 7, p.z + Math.sin(b.ai.orb) * 5, 1);
    b.play('move');
  },
  patterns: {
    0: [
      { id: 'abanico', weight: 3, cd: 2.2, run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 10, halfAngle: 0.5, angle: b.angleToTarget(), duration: 0.75 }); Events.emit('boss:windup', { boss: b }); S.a = b.angleToTarget(); }
        b.stop(0);
        if (S.t >= 0.75 * b.teleMul && !S.f) {
          S.f = true; b.play('attack', { restart: true });
          b.spread(7, 1.0, { angle: S.a, speed: 16, kind: 'arrow', ramp: ARROW, size: 14, damage: 13, life: 1.3, trail: 'bloodMist', status: bleed });
        }
        if (S.t > 1.2) return 'done';
      } },
      { id: 'carga', weight: 2, cd: 3, range: [3, 14], run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('roar'); b.telegraph({ shape: 'rect', angle: S.a, length: 12, width: 2, duration: 0.8 }); S.hit = new Set(); }
        const go = 0.8 * b.teleMul;
        if (S.t >= go && S.t < go + 0.75) { b.play('move'); b.vx = Math.cos(S.a) * 16 / b.speedMul; b.vz = Math.sin(S.a) * 16 / b.speedMul; b.strike({ shape: 'circle', radius: 1.2, damage: 18, knockback: 12, hitSet: S.hit }); }
        else if (S.t >= go) b.stop(0.3);
        if (S.t > go + 1.1) return 'done';
      } },
      { id: 'lluvia', weight: 2, cd: 5, run: (b, dt, S) => {
        // arrows fired high: they fall where Dante stands, leaving pools of boiling blood
        if (S.t === 0) { b.play('windup', { restart: true }); S.k = 0; }
        b.stop(0);
        if (S.k < 6 && S.t >= 0.4 + S.k * 0.22) {
          const p = b.target, x = p.x + (Math.random() - 0.5) * 2.5, z = p.z + (Math.random() - 0.5) * 2;
          b.telegraph({ shape: 'circle', x, z, radius: 1, duration: 0.9 });
          b.after(0.9 * b.teleMul, () => { b.strike({ shape: 'circle', x, z, radius: 1, damage: 12, knockback: 3 }); bloodPool(b.world, x, z, { r: 1 }); b.world.fx.emit('blood', x, 0.5, z, 8); });
          S.k++;
        }
        if (S.t > 2.4) return 'done';
      } },
    ],
  },
});
