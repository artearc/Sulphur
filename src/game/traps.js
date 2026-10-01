// Circle traps. Corruption makes them more frequent (GDD 3.2.1). All are telegraphed:
// a visible seal on the floor that glows, fills, then erupts in the circle's element.
import { resolveHit } from './combat.js';
import { Projectile } from './projectile.js';
import { pillarSheet, explosionSheet } from '../art/fx.js';
import { R } from '../art/palette.js';
import { Events } from '../core/events.js';

const STYLE = {
  limbo: { decal: 'runes', color: 0x7898b0, preset: 'soul', element: 'ice', pillar: R.soul, dmg: 10 },
  lujuria: { decal: 'runes', color: 0xe04a7a, preset: 'petal', element: 'wind', pillar: [0x4a0e2a, 0x7a1a44, 0xe04a7a, 0xffc0d0], dmg: 8, knock: 14 },
  gula: { decal: 'bile', color: 0xb8d040, preset: 'bile', element: 'poison', pillar: R.poison, dmg: 8, status: { poison: { amount: 1, dur: 3 } } },
  avaricia: { decal: 'gold', color: 0xffe080, preset: 'gold', element: 'gold', pillar: R.gold, dmg: 10 },
  ira: { decal: 'scorch', color: 0xff6020, preset: 'fire', element: 'fire', pillar: R.ember, dmg: 12, status: { burn: { amount: 1, dur: 2 } } },
  herejia: { decal: 'scorch', color: 0xff7a20, preset: 'fire', element: 'fire', pillar: R.ember, dmg: 14, status: { burn: { amount: 1, dur: 2.5 } } },
  violencia: { decal: 'blood0', color: 0xc02820, preset: 'blood', element: 'physical', pillar: R.blood, dmg: 13 },
  fraude: { decal: 'runes', color: 0x40e0c0, preset: 'shadow', element: 'corrupt', pillar: R.teal, dmg: 12 },
  traicion: { decal: 'frost', color: 0x9ad8ff, preset: 'ice', element: 'ice', pillar: R.ice, dmg: 12, status: { freeze: { amount: 0.5, dur: 1.4 } } },
  hub: { decal: 'runes', color: 0xf2c45a, preset: 'holy', element: 'holy', pillar: R.holy, dmg: 0 },
};

export class Trap {
  constructor(world, x, z, circle, o = {}) {
    this.world = world; this.x = x; this.z = z;
    this.kind = o.kind || 'seal';
    this.s = STYLE[circle] || STYLE.limbo;
    this.r = o.radius ?? 1.1;
    this.period = o.period ?? 3.2 + Math.random() * 1.5;
    this.t = Math.random() * this.period;
    this.done = false;
    this.armed = true;
    this.decal = world.fx.decal(this.kind === 'coinTrap' ? 'gold' : this.s.decal, x, z, this.r, { temp: true, alpha: 0.75, unlit: false });
    this.ring = world.fx.decal('runes', x, z, this.r * 0.9, { temp: true, unlit: true, color: this.s.color, alpha: 0.35 });
  }
  disarm() {
    this.armed = false;
    this.world.fx.emit('dust', this.x, 0.2, this.z, 6, { radius: this.r });
  }
  update(dt) {
    if (!this.armed) { this.ring.material.uniforms.uAlpha.value = 0.15; return; }
    this.t += dt;
    const W = this.world;
    const phase = this.t % this.period;
    const teleT = 0.85;
    const pulse = phase > this.period - teleT ? 0.4 + 0.6 * ((phase - (this.period - teleT)) / teleT) : 0.25;
    this.ring.material.uniforms.uAlpha.value = pulse;
    if (phase > this.period - teleT && !this.tele) {
      this.tele = W.fx.telegraph({ shape: 'circle', x: this.x, z: this.z, radius: this.r, duration: teleT, color: 0x6a0a18, edge: this.s.color });
      Events.emit('trap:arm', {});
    }
    if (this.tele && phase < this.period - teleT) {
      this.tele = null;
      this.fire();
    }
  }
  fire() {
    const W = this.world, s = this.s;
    if (this.kind === 'coinTrap') {
      // Avaricia: the plate spits cursed coins in a cross
      for (let k = 0; k < 8; k++) {
        W.addProjectile(new Projectile(W, { x: this.x, z: this.z, angle: (k / 8) * Math.PI * 2, speed: 7, team: 'enemy', damage: 8, kind: 'coin', ramp: R.gold, size: 10, life: 1.6, trail: 'gold', element: 'gold' }));
      }
      W.fx.emit('gold', this.x, 0.5, this.z, 14);
      Events.emit('trap:fire', { kind: 'coins' });
      return;
    }
    resolveHit(W, { team: 'enemy', shape: 'circle', x: this.x, z: this.z, radius: this.r, damage: s.dmg * (1 + (W.game.run?.circleIndex || 0) * 0.1), knockback: s.knock ?? 6, element: s.element, status: s.status, env: true });
    // traps hurt the damned too (use them!)
    resolveHit(W, { team: 'player', env: true, shape: 'circle', x: this.x, z: this.z, radius: this.r, damage: s.dmg * 1.5, knockback: 6, element: s.element, status: s.status });
    if (this.kind === 'flameTomb' || s.element === 'fire') W.fx.play(explosionSheet('trapfire', R.ember, 48), { x: this.x, y: 0.6, z: this.z + 0.05, scale: this.r, onTop: false });
    W.fx.play(pillarSheet('trap_' + (s.element), s.pillar, 20, 64), { x: this.x, y: 0, z: this.z + 0.05, pivot: 0, scale: this.r });
    W.fx.emit(s.preset, this.x, 0.3, this.z, 18, { radius: this.r * 0.6, speed: [1, 4] });
    W.fx.lightFlash(this.x, this.z, s.color, 2, 4, 0.25);
    Events.emit('trap:fire', { element: s.element });
  }
  destroy() {
    this.done = true;
    for (const d of [this.decal, this.ring]) if (d) { d.removeFromParent(); d.material.dispose(); }
  }
}
