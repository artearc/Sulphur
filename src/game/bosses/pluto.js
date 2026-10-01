// BOSS IV · PLUTO, il gran nemico. Wealth as a weapon: curtains of coins, rolling weights of the
// avaricious and the prodigal, scattered gold that returns to its master. Rebuked, he collapses —
// and crawls on, more dangerous for having nothing left to lose.
import { registerBoss } from '../boss.js';
import { plutoSheet } from '../../art/bosses/pluto.js';
import { Projectile } from '../projectile.js';
import { resolveHit } from '../combat.js';
import { angleTo, dist } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';
import { Sprite } from '../../render/sprite.js';
import { projectileSheet } from '../../art/fx.js';

const COIN = R.gold;
const greed = (b) => 1 + Math.min(0.5, (b.world.game.run?.gold || 0) / 500);

class RollingWeight {
  constructor(world, x, z, angle, boss) {
    Object.assign(this, { world, x, z, angle, boss, t: 0, done: false, hit: new Set(), speed: 9 });
    this.sprite = new Sprite(projectileSheet('orb', [0x3a2408, 0x6a4410, 0xa06c18, 0xd49a2a, 0xf2c45a], 30), { anim: 'fly', pivot: 15, scale: 1 });
    world.root.add(this.sprite.mesh);
  }
  update(dt) {
    this.t += dt;
    const W = this.world;
    const nx = this.x + Math.cos(this.angle) * this.speed * dt, nz = this.z + Math.sin(this.angle) * this.speed * dt;
    if (!W.room.free(nx, nz, 0.9, 'fly') || this.t > 6) { W.fx.emit('gold', this.x, 1, this.z, 20); W.fx.shake(0.2); this.destroy(); return; }
    this.x = nx; this.z = nz;
    resolveHit(W, { team: 'enemy', source: this.boss, shape: 'circle', x: this.x, z: this.z, radius: 1, damage: 18 * greed(this.boss), knockback: 12, hitSet: this.hit });
    if (Math.random() < 0.5) W.fx.emit('gold', this.x, 0.3, this.z, 1);
    this.sprite.update(dt * 2);
    this.sprite.place(this.x, 0.9, this.z);
  }
  destroy() { this.done = true; this.sprite.dispose(); }
}

const P = {
  cortina: (b, dt, S) => {
    // curtains of coins sweeping across the room, with a gap you must find
    if (S.t === 0) { b.play('cast'); S.w = 0; Events.emit('boss:windup', { boss: b }); }
    const waves = 3 + b.phase;
    if (S.w < waves && S.t >= 0.6 + S.w * 1.0) {
      const room = b.world.room;
      const horizontal = S.w % 2 === 0;
      const gap = 2 + Math.random() * (horizontal ? room.w - 4 : room.h * 1.3 - 6);
      const n = horizontal ? Math.floor(room.w) : Math.floor(room.h * 1.3);
      for (let k = 1; k < n; k++) {
        const pos = k;
        if (Math.abs(pos - gap) < 1.6) continue;
        const x = horizontal ? pos : 1.2, z = horizontal ? 4.5 : 4 + pos * 0.95;
        b.world.addProjectile(new Projectile(b.world, { x, z, angle: horizontal ? Math.PI / 2 : 0, speed: 5.5, team: 'enemy', damage: 10 * greed(b), kind: 'coin', ramp: COIN, size: 10, life: 6, element: 'gold', source: b, ignoreWalls: false, delay: 0.25 }));
      }
      S.w++;
    }
    if (S.t > 0.6 + waves * 1.0 + 0.5) return 'done';
  },
  pesos: (b, dt, S) => {
    if (S.t === 0) {
      b.play('roar');
      S.lanes = [];
      const p = b.target;
      for (let k = 0; k < 1 + b.phase; k++) {
        const horiz = Math.random() < 0.5;
        const room = b.world.room;
        const z = horiz ? p.z + (k - 0.5) * 2.4 : 4.5, x = horiz ? 1.5 : p.x + (k - 0.5) * 3;
        const a = horiz ? 0 : Math.PI / 2;
        b.telegraph({ shape: 'rect', x, z, angle: a, length: horiz ? room.w - 3 : room.h * 1.3 - 6, width: 2, duration: 1, color: 0x6a4410, edge: 0xf2c45a });
        S.lanes.push({ x, z, a });
      }
      Events.emit('boss:roar', { boss: b });
    }
    if (S.t >= 1 * b.teleMul && !S.f) { S.f = true; for (const l of S.lanes) b.world.addHazard(new RollingWeight(b.world, l.x, l.z, l.a, b)); }
    if (S.t > 1.6) return 'done';
  },
  retorno: (b, dt, S) => {
    // coins scattered on the floor, then recalled: they fly back through Dante to their master
    if (S.t === 0) {
      b.play('windup', { restart: true });
      S.coins = [];
      for (let k = 0; k < 12 + b.phase * 4; k++) {
        const pt = b.world.room.randomFloor({ int: (a, c) => a + Math.floor(Math.random() * (c - a + 1)) });
        if (!pt) continue;
        const pr = new Projectile(b.world, { x: pt.x, z: pt.z, y: 0.3, angle: 0, speed: 0, team: 'enemy', damage: 0, kind: 'coin', ramp: COIN, size: 10, life: 8, element: 'gold', source: b, harmless: true, ignoreWalls: true });
        b.world.addProjectile(pr);
        S.coins.push(pr);
      }
      b.world.game.ui?.bark(b.x, b.z, '"Pape Satàn, pape Satàn aleppe!"', 2);
    }
    if (S.t >= 1.8 * b.teleMul && !S.f) {
      S.f = true;
      b.play('attack', { restart: true });
      for (const c of S.coins) {
        if (c.dead) continue;
        c.harmless = false; c.damage = 9 * greed(b); c.ignoreWalls = true;
        c.angle = angleTo(c.x, c.z, b.x, b.z); c.speed = 2; c.accel = 18; c.life = Math.max(0.3, dist(c.x, c.z, b.x, b.z) / 12);
        c.trail = 'gold';
        b.world.fx.line('holyMote', c.x, c.z, b.x, b.z, 3, { y: 0.5, c0: 0xffe8a0, c1: 0x6a4410 });
      }
    }
    if (S.t > 3) return 'done';
  },
  zarpazo: (b, dt, S) => {
    if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 4.5, halfAngle: 0.8, angle: S.a, duration: 0.7 }); }
    if (S.t >= 0.7 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      b.strike({ shape: 'arc', angle: S.a, range: 4.5, arc: 1.6, damage: 22 * greed(b), knockback: 11 });
      b.world.fx.emit('gold', b.x + Math.cos(S.a) * 3, 1, b.z + Math.sin(S.a) * 3, 16);
      b.world.fx.shake(0.35);
      Events.emit('boss:slam', { boss: b });
    }
    if (S.t > 1.3) return 'done';
  },
  // phase 3: deflated, crawling, lunging bites
  reptar: (b, dt, S) => {
    if (S.t === 0) { S.n = 0; }
    if (S.n < 3 && S.t >= S.n * 0.8) {
      b.faceTarget(); const a = b.angleToTarget(); const len = Math.min(8, b.distToTarget() + 1);
      b.play('crawlAttack', { restart: true });
      b.telegraph({ shape: 'rect', angle: a, length: len, width: 2, duration: 0.45 });
      S.hit = new Set();
      b.after(0.45 * b.teleMul, () => { b.vx = Math.cos(a) * 18; b.vz = Math.sin(a) * 18; S.dash = 0.4; S.a = a; });
      S.n++;
    }
    if (S.dash > 0) { S.dash -= dt; b.strike({ shape: 'circle', radius: 1.5, damage: 18 * greed(b), knockback: 9, hitSet: S.hit }); } else { b.vx *= Math.exp(-6 * dt); b.vz *= Math.exp(-6 * dt); }
    if (S.t > 2.8) return 'done';
  },
};

registerBoss({
  id: 'pluto', name: 'Pluto', title: 'El gran enemigo', boss: true, circle: 'avaricia',
  hp: 2100, speed: 1.6, radius: 2, mass: 50, blood: 'gold', pivot: 2, shadow: 3,
  sheet: () => plutoSheet(), aura: 'gold', auraY: 2,
  light: { color: 0xffc050, intensity: 1.3, radius: 7, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'gold', deathPreset: 'gold', deathEdge: 0xf2c45a, deathRamp: COIN, pillarRamp: COIN,
  onPhase(b, ph) {
    if (ph === 2) {
      b.ai.crawl = true;
      b.play('collapse', { restart: true });
      b.speed *= 1.6;
      b.world.game.ui?.bark(b.x, b.z, 'Virgilio: «¡Calla, maldito lobo! Consúmete en tu propia rabia.»', 2.6);
      b.world.fx.emit('gold', b.x, 2, b.z, 60, { radius: 2, speed: [2, 6] });
    }
  },
  idle(b) {
    const d = b.distToTarget();
    if (d > 5) b.chase(0.9); else if (d < 3) b.steer(b.angleToTarget() + Math.PI, 0.6); else b.steer(b.angleToTarget() + Math.PI / 2, 0.5);
    b.play(b.ai.crawl ? 'crawl' : 'move');
  },
  patterns: {
    0: [
      { id: 'cortina', weight: 2, cd: 6, run: P.cortina },
      { id: 'pesos', weight: 2, cd: 5, run: P.pesos },
      { id: 'zarpazo', weight: 3, cd: 2.2, range: [0, 5], run: P.zarpazo },
      { id: 'retorno', weight: 1.5, cd: 7, run: P.retorno },
    ],
    1: [
      { id: 'cortina', weight: 2, cd: 5, run: P.cortina },
      { id: 'pesos', weight: 2.5, cd: 4, run: P.pesos },
      { id: 'zarpazo', weight: 3, cd: 2, range: [0, 5], run: P.zarpazo },
      { id: 'retorno', weight: 2, cd: 6, run: P.retorno },
    ],
    2: [
      { id: 'reptar', weight: 3, cd: 2, run: P.reptar },
      { id: 'retorno', weight: 2, cd: 5, run: P.retorno },
      { id: 'pesos', weight: 2, cd: 4, run: P.pesos },
      { id: 'cortina', weight: 1.5, cd: 5, run: P.cortina },
    ],
  },
  intro: [
    ['pluto', '"Pape Satàn, pape Satàn aleppe!"', { mood: 'shout' }],
    ['virgilio', 'No temas: por mucho poder que tenga, no te impedirá bajar por esta roca.'],
    ['pluto', (c) => ((c.run?.gold || 0) > 150 ? `Llevas ${c.run.gold} monedas encima, peregrino. Las oigo cantar. Son mías.` : 'Vienes con los bolsillos vacíos. Peor para ti: te llenaré la boca de oro fundido.')],
    ['virgilio', '¡Calla, maldito lobo! Así se quiere allí donde Miguel castigó la soberbia.'],
  ],
  outro: [['virgilio', 'Cayó como las velas cuando se rompe el mástil. Todo ese oro... y no pesaba nada.']],
});
