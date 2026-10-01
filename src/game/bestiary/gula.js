// III · GULA — swollen monsters that grow stronger by devouring. Rot, bile and endless rain.
import { registerEnemy, B } from '../enemy.js';
import { registerBoss } from '../boss.js';
import { glotonSheet, gusanoSheet, cebadoSheet, devoradorSheet } from '../../art/enemies/gula.js';
import { GroundHazard } from '../hazards.js';
import { angleTo, dist } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const BILE = [0x24320e, 0x627a20, 0xb8d040, 0xe8f080];
const BONE = R.bone;

export function biePuddle(world, x, z, o = {}) {
  world.addHazard(new GroundHazard(world, x, z, { r: o.r ?? 1.1, dur: o.dur ?? 3.5, tick: 0.5, damage: o.damage ?? 3, element: 'poison', status: { poison: { amount: 1, dur: 2 } }, decal: 'bile', preset: 'poison', slow: true }));
}

function nearestCorpse(e, maxD) {
  let best = null, bd = maxD;
  for (const c of e.world.corpses) {
    if (c.eaten) continue;
    const d = dist(e.x, e.z, c.x, c.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

registerEnemy({
  id: 'gloton', name: 'Glotón Hinchado', circle: 'gula', hp: 62, speed: 1.6, radius: 0.6, mass: 2.4, blood: 'bile', touch: 5, poise: 0.3,
  sheet: () => glotonSheet(), aura: 'poison', auraY: 0.6,
  spawnRamp: [0x24320e, 0x627a20, 0xb8d040, 0xe8f080], spawnEdge: 0xb8d040, deathPreset: 'bile', deathEdge: 0xb8d040,
  desc: 'Comió hasta reventar y aún tiene hambre. Devora a los caídos y crece con cada bocado.',
  init(e) { e.ai.stacks = 0; },
  onDeath(e) { biePuddle(e.world, e.x, e.z, { r: 1.3 + e.ai.stacks * 0.3 }); },
  think(e, dt) {
    const A = e.ai;
    if (A.eat) {
      A.eat.t += dt;
      e.stop(0);
      e.play('eat');
      if (Math.random() < dt * 8) e.world.fx.emit('blood', e.x + e.facing * 0.5, 0.6, e.z, 2, { speed: [1, 2] });
      if (A.eat.t > 1.3) {
        A.eat.c.eaten = true;
        A.stacks = Math.min(3, A.stacks + 1);
        e.hp = Math.min(e.maxHp * 1.3, e.hp + e.maxHp * 0.4);
        e.maxHp = Math.max(e.maxHp, e.hp);
        e.dmgMul *= 1.2;
        e.sprite.setScale((e.def.scale || 1) * (e.elite ? 1.2 : 1) * (1 + A.stacks * 0.14));
        e.radius = 0.6 * (1 + A.stacks * 0.14);
        e.world.fx.emit('poison', e.x, 1, e.z, 16, { radius: 0.6 });
        e.world.game.ui?.bark(e.x, e.z, '¡Más!', 1.2);
        Events.emit('enemy:devour', { enemy: e });
        A.eat = null;
      }
      return;
    }
    if (B.melee(e, dt, { shape: 'circle', range: 1.7 + A.stacks * 0.25, windup: 0.7, damage: 14, knockback: 9, recover: 0.7, cooldown: 1.6, trigger: 2.1 + A.stacks * 0.2,
      onHit: (en) => { en.world.fx.ring('bile', en.x, en.z, 1, 14, { speed: [2, 4] }); en.world.fx.shake(0.2); } })) return;
    // corpses are irresistible
    const c = A.stacks < 3 ? nearestCorpse(e, 7) : null;
    if (c && e.distToTarget() > 2.2) {
      if (dist(e.x, e.z, c.x, c.z) < 0.7) { A.eat = { t: 0, c }; Events.emit('enemy:windup', { enemy: e }); return; }
      e.moveToward(c.x, c.z, 1.1);
    } else e.chase(1);
    e.play('move');
  },
});

registerEnemy({
  id: 'gusano', name: 'Gusano del Fango', circle: 'gula', hp: 40, speed: 3.6, radius: 0.45, mass: 1.4, blood: 'blood',
  sheet: () => gusanoSheet(),
  spawnRamp: [0x140f08, 0x3a2c18, 0x6a5430, 0xb8a070], deathPreset: 'blood',
  desc: 'Vive bajo el lodo de la lluvia eterna. Sólo verás el montículo que se acerca.',
  init(e) { e.ai.mode = 'under'; e.ai.t = 0; e.untargetable = false; },
  onSpawned(e) { e.ai.mode = 'under'; e.untargetable = true; e.shadow && (e.shadow.visible = false); },
  think(e, dt) {
    const A = e.ai;
    A.t += dt;
    if (A.mode === 'under') {
      e.untargetable = true;
      e.play('burrow');
      e.chase(1);
      if (Math.random() < dt * 10) e.world.fx.emit('dust', e.x, 0.1, e.z, 1, { c0: 0x524024, c1: 0x261c10 });
      if (e.distToTarget() < 1.1 || A.t > 3) {
        A.mode = 'erupt'; A.t = 0;
        e.stop(0);
        e.telegraph({ shape: 'circle', radius: 1.5, duration: 0.6, follow: e });
        Events.emit('enemy:windup', { enemy: e });
      }
    } else if (A.mode === 'erupt') {
      e.stop(0);
      if (A.t >= 0.6 * e.teleMul) {
        e.untargetable = false;
        e.shadow && (e.shadow.visible = true);
        e.play('emerge', { restart: true });
        e.strike({ shape: 'circle', radius: 1.5, damage: 13, knockback: 8 });
        e.world.fx.emit('dust', e.x, 0.3, e.z, 18, { speed: [2, 5], c0: 0x524024, c1: 0x261c10 });
        e.world.fx.decal('crack', e.x, e.z, 1, { alpha: 0.8 });
        e.world.fx.shake(0.15);
        A.mode = 'up'; A.t = 0;
      }
    } else {
      e.stop(0);
      if (A.t > 0.3 && !e.sprite.anim?.startsWith('idle')) e.play('idle');
      if (A.t > 1.9) { A.mode = 'under'; A.t = 0; e.untargetable = true; e.shadow && (e.shadow.visible = false); e.world.fx.emit('dust', e.x, 0.2, e.z, 10); }
    }
  },
});

registerEnemy({
  id: 'cebado', name: 'Cebado', circle: 'gula', hp: 46, speed: 2.2, radius: 0.5, mass: 1.6, blood: 'bile',
  sheet: () => cebadoSheet(), aura: 'poison', auraY: 0.4,
  spawnRamp: [0x24320e, 0x627a20, 0xb8d040, 0xe8f080], spawnEdge: 0xb8d040, deathPreset: 'bile',
  desc: 'Engordado para un banquete que nunca llega. Vomita la bilis de mil comidas.',
  init(e) { e.cooldowns.volley = 1.5 + Math.random(); },
  onDeath(e) { biePuddle(e.world, e.x, e.z); },
  think(e, dt) {
    if (B.volley(e, dt, {
      windup: 0.65, shots: 1, range: 9, cooldown: 2.8, flash: 0xb8d040,
      fire: (e) => {
        const a = e.angleToTarget();
        const d = Math.min(6, e.distToTarget());
        for (let k = -2; k <= 2; k++) {
          const aa = a + k * 0.16;
          const life = (d + k * 0.3 + 1) / 7;
          e.shoot({ angle: aa, speed: 7, kind: 'orb', ramp: BILE, size: 8, damage: 7, life, trail: 'bile', element: 'poison',
            onExpire: (pr) => { if (k % 2 === 0) biePuddle(e.world, pr.x, pr.z, { r: 0.9, dur: 3 }); } });
        }
        e.world.fx.emit('bile', e.x + Math.cos(a) * 0.6, 0.6, e.z + Math.sin(a) * 0.6, 10, { dir: a, spread: 0.6, speed: [3, 6] });
      },
    })) return;
    e.keepDistance(3, 6, 0.9);
    e.play('move');
  },
});

// ------------------------------------------------------------------------------------------
// MINIBOSS · El Devorador
// ------------------------------------------------------------------------------------------
function chomp(b, dt, S) {
  if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 3.6, halfAngle: 0.7, angle: S.a, duration: 0.75 }); Events.emit('boss:windup', { boss: b }); }
  if (S.t >= 0.75 * b.teleMul && !S.hit) {
    S.hit = true; b.play('attack', { restart: true });
    b.vx = Math.cos(S.a) * 8; b.vz = Math.sin(S.a) * 8;
    b.strike({ shape: 'arc', angle: S.a, range: 3.6, arc: 1.4, damage: 20, knockback: 10 });
    b.world.fx.emit('blood', b.x + Math.cos(S.a) * 2, 1, b.z + Math.sin(S.a) * 2, 14);
    b.world.fx.shake(0.3);
    Events.emit('boss:slam', { boss: b });
  }
  b.vx *= Math.exp(-6 * dt); b.vz *= Math.exp(-6 * dt);
  if (S.t > 1.3) return 'done';
}

registerBoss({
  id: 'devorador', name: 'El Devorador', title: 'Hambre sin fondo', miniboss: true, showBar: true, circle: 'gula',
  hp: 560, speed: 1.5, radius: 1.2, mass: 12, blood: 'bile', pivot: 2, shadow: 1.8, touch: 8,
  sheet: () => devoradorSheet(), aura: 'poison', auraY: 1,
  phases: [0.5], phaseFx: 'bile', deathPreset: 'bile', deathEdge: 0xb8d040, deathRamp: BILE, pillarRamp: BILE,
  onDeath(b) { for (let k = 0; k < 5; k++) biePuddle(b.world, b.x + (Math.random() - 0.5) * 4, b.z + (Math.random() - 0.5) * 3, { r: 1.2 }); },
  idle(b) { b.chase(0.8); b.play('move'); },
  patterns: {
    0: [
      { id: 'chomp', weight: 3, cd: 2, range: [0, 4.5], run: chomp },
      { id: 'inhalar', weight: 2, cd: 6, run: (b, dt, S) => {
        if (S.t === 0) { b.play('inhale'); b.telegraph({ shape: 'ring', radius: 8, inner: 1.6, duration: 0.6, follow: b, color: 0x24320e, edge: 0xb8d040 }); Events.emit('boss:roar', { boss: b }); }
        if (S.t > 0.6 && S.t < 2.6) {
          const p = b.target, a = angleTo(p.x, p.z, b.x, b.z);
          if (!p.dashing) { p.kx += Math.cos(a) * 10 * dt; p.kz += Math.sin(a) * 10 * dt; }
          if (Math.random() < 0.7) b.world.fx.emit('dust', p.x, 0.5, p.z, 1, { dir: a, speed: [4, 7] });
          if (b.distToTarget() < 2.3) { b.current = { id: 'chomp', run: chomp, cd: 2, S: { t: 0 } }; return; }
        }
        if (S.t > 2.7) return 'done';
      } },
      { id: 'huesos', weight: 2, cd: 3, run: (b, dt, S) => {
        if (S.t === 0) { b.play('windup', { restart: true }); b.sprite.flash(0xb8d040, 0.4); }
        if (S.t > 0.55 * b.teleMul && !S.f) {
          S.f = true; b.play('attack', { restart: true });
          b.spread(7, 1.3, { angle: b.angleToTarget(), speed: 8, kind: 'skull', ramp: [0x3a0408, 0x6a1010, 0xb8d040, 0xe8f080], size: 10, damage: 9, life: 2, trail: 'bile' });
        }
        if (S.t > 1.1) return 'done';
      } },
    ],
    1: [
      { id: 'chomp', weight: 3, cd: 1.6, range: [0, 4.5], run: chomp },
      { id: 'banquete', weight: 2, cd: 10, run: (b, dt, S) => {
        // calls the gluttons to the feast, then eats them to heal
        if (S.t === 0) { b.play('roar'); for (let k = 0; k < 2; k++) b.world.controller?.spawnEnemy?.('gloton', b.x + (k ? 3 : -3), b.z + 1.5, {}); }
        if (S.t > 4 && !S.ate) {
          S.ate = true;
          for (const e of b.world.enemies) if (e !== b && e.alive && dist(e.x, e.z, b.x, b.z) < 4.5) { e.alive = false; e.noLoot = true; e.die({}); b.hp = Math.min(b.maxHp, b.hp + 60); b.world.fx.line('blood', e.x, e.z, b.x, b.z, 8); }
          b.play('inhale');
        }
        if (S.t > 4.8) return 'done';
      } },
      { id: 'vomito', weight: 2, cd: 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('windup', { restart: true }); S.k = 0; }
        if (S.t > 0.6 && S.k < 6 && S.t > 0.6 + S.k * 0.15) {
          const p = b.target;
          const x = p.x + (Math.random() - 0.5) * 3, z = p.z + (Math.random() - 0.5) * 2;
          b.telegraph({ shape: 'circle', x, z, radius: 1, duration: 0.6, color: 0x24320e, edge: 0xb8d040 });
          b.after(0.6, () => { biePuddle(b.world, x, z, { r: 1, dur: 4 }); b.world.fx.emit('bile', x, 0.4, z, 10); });
          S.k++;
        }
        if (S.t > 2) return 'done';
      } },
    ],
  },
});
