// I · LIMBO — shades that confuse: they blink, leave false echoes and lament from afar.
import { registerEnemy, B } from '../enemy.js';
import { sombraSheet, lamentoSheet } from '../../art/enemies/limbo.js';
import { angleTo } from '../../core/math.js';
import { R } from '../../art/palette.js';

const WISP = [0x2e4054, 0x7898b0, 0xc8dcec, 0xffffff];

registerEnemy({
  id: 'sombra', name: 'Sombra Errante', circle: 'limbo', hp: 32, speed: 2.7, radius: 0.42, mode: 'fly', blood: 'ecto',
  sheet: () => sombraSheet('sombra'), aura: 'shadow', auraY: 0.4,
  spawnRamp: [0x0a0a10, 0x30303c, 0x7898b0, 0xdcecf4], spawnKey: 'shade', deathPreset: 'soul', deathEdge: 0x9ab8d8, spawnEdge: 0x9ab8d8,
  desc: 'Errantes sin esperanza. Se desvanecen y reaparecen a tu espalda.',
  init(e) { e.cooldowns.blink = 1.5 + Math.random() * 2; },
  think(e, dt) {
    const A = e.ai;
    if (A.blink) {
      const Bk = A.blink;
      Bk.t += dt;
      e.stop(0);
      if (Bk.phase === 'out') {
        e.sprite.setAlpha(Math.max(0, 1 - Bk.t / 0.3));
        if (Bk.t >= 0.3) {
          // leave a false echo where it stood (it lingers to mislead)
          e.world.fx.emit('soul', e.x, 1, e.z, 10, { radius: 0.3 });
          const p = e.target;
          const a = angleTo(p.x, p.z, e.x, e.z) + Math.PI + (Math.random() - 0.5) * 1.6;
          const room = e.world.room;
          for (let k = 0; k < 8; k++) {
            const r = 2.2 + Math.random();
            const nx = p.x + Math.cos(a + k * 0.4) * r, nz = p.z + Math.sin(a + k * 0.4) * r;
            if (room.free(nx, nz, e.radius, 'walk')) { e.x = nx; e.z = nz; break; }
          }
          Bk.phase = 'in'; Bk.t = 0;
          e.world.fx.emit('shadow', e.x, 0.8, e.z, 12, { radius: 0.4 });
        }
      } else {
        e.sprite.setAlpha(Math.min(1, Bk.t / 0.25));
        if (Bk.t >= 0.25) { A.blink = null; e.untargetable = false; e.cooldowns.melee = 0; }
      }
      return;
    }
    if (!A.alerted && e.distToTarget() > 9) { B.wander(e, dt, 0.35); e.play('move'); return; }
    A.alerted = true;
    if (B.melee(e, dt, { range: 1.6, arc: 2.0, windup: 0.5, damage: 11, knockback: 5, lunge: 5, track: 3, recover: 0.5, cooldown: 1.1 })) return;
    const d = e.distToTarget();
    if (d > 3.5 && e.ready('blink') && e.cd('blink', 4 + Math.random() * 2)) {
      A.blink = { t: 0, phase: 'out' };
      e.untargetable = true;
      e.world.game.events?.emit?.('enemy:blink');
      return;
    }
    e.chase(0.9);
    e.play('move');
  },
});

registerEnemy({
  id: 'lamento', name: 'Alma Lamentosa', circle: 'limbo', hp: 24, speed: 2.1, radius: 0.4, mode: 'fly', blood: 'ecto',
  sheet: () => lamentoSheet(), aura: 'soul', auraY: 0.5, light: { color: 0x7898b0, intensity: 0.5, radius: 2.5 },
  spawnRamp: [0x2e4054, 0x7898b0, 0xc8dcec, 0xffffff], spawnKey: 'soul', deathPreset: 'soul', deathEdge: 0xc8dcec, spawnEdge: 0xc8dcec,
  desc: 'Llora lo que nunca conocerá. Su lamento toma forma de luz fría.',
  init(e) { e.cooldowns.volley = 1 + Math.random(); e.cooldowns.wail = 3; },
  think(e, dt) {
    const A = e.ai;
    if (!A.alerted && e.distToTarget() > 11) { B.wander(e, dt, 0.3); e.play('move'); return; }
    A.alerted = true;
    // wail: ring of slow tears when cornered
    if (e.distToTarget() < 3.2 && e.ready('wail') && !A.volley) {
      e.cd('wail', 5);
      e.sprite.flash(0xc8dcec, 0.3);
      e.after(0.45 * e.teleMul, () => {
        e.ring(8, { speed: 4, kind: 'wisp', ramp: WISP, size: 10, damage: 8, life: 2.5, trail: 'soul', element: 'ice' });
        e.world.fx.ring('soul', e.x, e.z, 0.6, 16);
      });
      e.play('windup', { restart: true });
      return;
    }
    if (B.volley(e, dt, {
      windup: 0.6, shots: 1, range: 12, cooldown: 2.2, flash: 0xc8dcec,
      fire: (e) => e.spread(3, 0.55, { speed: 5.5, kind: 'wisp', ramp: WISP, size: 10, damage: 9, homing: 0.5, life: 3, trail: 'soul', element: 'ice', light: 0x9ab8d8, lightIntensity: 0.4, lightRadius: 2 }),
    })) return;
    e.keepDistance(5, 8, 0.8);
    e.play('move');
  },
});

registerEnemy({
  id: 'eco', name: 'Eco Doliente', circle: 'limbo', hp: 30, speed: 3.2, radius: 0.42, mode: 'fly', blood: 'ecto',
  sheet: () => sombraSheet('eco'), aura: 'shadow', auraY: 0.4,
  spawnRamp: [0x0a0a10, 0x2a3a5a, 0x7898b0, 0xdcecf4], spawnKey: 'echo', deathPreset: 'soul', deathEdge: 0x9ab8d8, spawnEdge: 0x9ab8d8,
  desc: 'Se multiplica en reflejos. Sólo uno sangra.',
  init(e, o) {
    e.ai.orbit = Math.random() * Math.PI * 2;
    e.ai.dir = Math.random() < 0.5 ? 1 : -1;
    if (o.illusion) {
      e.illusion = true; e.maxHp = e.hp = 1; e.noLoot = true; e.ignoreForClear = true; e.dmgMul = 0;
      e.sprite.setAlpha(0.8);
    } else if (!o.noEchoes) {
      // spawn two echoes of itself
      e.after(0.05, () => {
        e.echoes = [];
        for (let k = 0; k < 2; k++) {
          const a = Math.random() * Math.PI * 2;
          const sib = e.world.controller?.spawnEnemy?.('eco', e.x + Math.cos(a) * 2, e.z + Math.sin(a) * 2, { illusion: true, spawnDelay: 0.6 });
          if (sib) { sib.master = e; e.echoes.push(sib); }
        }
      });
    }
  },
  onHurt(e) {
    if (e.illusion) return;
    // the real one bleeds: echoes collapse
    if (e.echoes) for (const s of e.echoes) if (s.alive) { s.alive = false; s.die({}); }
    e.echoes = null;
  },
  onDeath(e) {
    if (e.illusion) e.world.fx.emit('soul', e.x, 1, e.z, 16, { radius: 0.4 });
  },
  think(e, dt) {
    const A = e.ai;
    if (e.illusion && e.master && !e.master.alive) { e.alive = false; e.die({}); return; }
    // charge (the illusion's charge is harmless — but you cannot know which is which)
    if (B.charge(e, dt, { windup: 0.6, length: 6, speed: 13, damage: e.illusion ? 0 : 12, knockback: 7, cooldown: 2.6 + Math.random(), minRange: 2, maxRange: 7, recover: 0.5 })) return;
    A.orbit += dt * 1.1 * A.dir;
    const p = e.target;
    const r = 3.6;
    e.moveToward(p.x + Math.cos(A.orbit) * r, p.z + Math.sin(A.orbit) * r, 1);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · La Lonza — "una lonza leggera e presta molto, che di pel macolato era coverta"
// ------------------------------------------------------------------------------------------
import { registerBoss } from '../boss.js';
import { lonzaSheet } from '../../art/enemies/limbo.js';
import { Events } from '../../core/events.js';

registerBoss({
  id: 'lonza', name: 'La Lonza', title: 'La primera bestia de la selva', miniboss: true, showBar: true, circle: 'limbo',
  hp: 400, speed: 4.2, radius: 0.85, mass: 5, blood: 'blood', pivot: 2, shadow: 1.5,
  sheet: () => lonzaSheet(), aura: 'soul', auraY: 0.6,
  phases: [0.5], phaseFx: 'soul', deathPreset: 'blood', deathEdge: 0x9ab8d8,
  onPhase(b) { b.speed *= 1.25; b.cdMul *= 0.8; },
  idle(b, dt) {
    b.ai.orb = (b.ai.orb ?? Math.random() * 6) + dt * 1.3;
    const p = b.target;
    b.moveToward(p.x + Math.cos(b.ai.orb) * 4.5, p.z + Math.sin(b.ai.orb) * 3.5, 1);
    b.play('move');
  },
  patterns: {
    0: [
      { id: 'salto', weight: 3, cd: 2, range: [2.5, 11], run: (b, dt, S) => {
        if (S.t === 0) { b.faceTarget(); const p = b.target; S.tx = p.x; S.tz = p.z; S.sx = b.x; S.sz = b.z; b.play('windup', { restart: true }); b.telegraph({ shape: 'circle', x: p.x, z: p.z, radius: 1.6, duration: 0.7 }); Events.emit('boss:windup', { boss: b }); }
        const go = 0.7 * b.teleMul, air = 0.45;
        if (S.t >= go && S.t < go + air) {
          const k = (S.t - go) / air;
          b.x = S.sx + (S.tx - S.sx) * k; b.z = S.sz + (S.tz - S.sz) * k; b.ai.hover = Math.sin(k * Math.PI) * 2.2;
          b.play('attack'); b.stop(0);
        } else if (S.t >= go + air && !S.land) {
          S.land = true; b.ai.hover = 0;
          b.strike({ shape: 'circle', radius: 1.6, damage: 15, knockback: 9 });
          b.world.fx.emit('dust', b.x, 0.2, b.z, 16, { speed: [2, 5] });
          b.world.fx.shake(0.25);
        }
        if (S.t > go + air + 0.5) return 'done';
      } },
      { id: 'zarpazos', weight: 3, cd: 1.4, range: [0, 3], run: (b, dt, S) => {
        if (S.t === 0) S.n = 0;
        if (S.n < 3 && S.t >= S.n * 0.38) {
          S.n++; b.faceTarget(); const a = b.angleToTarget();
          b.play('attack', { restart: true });
          b.telegraph({ shape: 'cone', radius: 2.2, halfAngle: 0.65, angle: a, duration: 0.24 });
          b.after(0.24 * b.teleMul, () => { b.vx = Math.cos(a) * 6; b.vz = Math.sin(a) * 6; b.strike({ shape: 'arc', angle: a, range: 2.2, arc: 1.3, damage: 10, knockback: 4 }); });
        }
        b.vx *= Math.exp(-8 * dt); b.vz *= Math.exp(-8 * dt);
        if (S.t > 1.5) return 'done';
      } },
      { id: 'rugido', weight: 1.5, cd: 7, run: (b, dt, S) => {
        if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); }
        if (S.t > 0.5 && !S.f) { S.f = true; b.ring(10, { speed: 5, kind: 'wisp', ramp: [0x2e4054, 0x7898b0, 0xc8dcec, 0xffffff], size: 10, damage: 8, life: 2.4, trail: 'soul', element: 'ice' }); }
        if (S.t > 1.2) return 'done';
      } },
    ],
  },
});
