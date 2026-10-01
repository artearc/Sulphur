// Reusable ground hazards spawned by enemies and bosses: pools, fire trails, frost fields, blood fissures.
import { resolveHit } from './combat.js';
import { dist2, segCircle } from '../core/math.js';

/**
 * GroundHazard: a circle on the floor that hurts whoever stands in it.
 * o: { r, dur, tick, damage, element, status, decal, color, preset, slow, team ('enemy' hurts Dante), light }
 */
export class GroundHazard {
  constructor(world, x, z, o = {}) {
    Object.assign(this, { world, x, z, r: o.r ?? 1.2, dur: o.dur ?? 3, tick: o.tick ?? 0.4, damage: o.damage ?? 4, element: o.element ?? 'poison', status: o.status, slow: o.slow, team: o.team ?? 'enemy', preset: o.preset, t: 0, nt: 0.15, done: false });
    this.decal = world.fx.decal(o.decal || 'bile', x, z, this.r, { temp: true, color: o.color ?? 0xffffff, alpha: 0.95, unlit: !!o.unlit, glow: o.glow });
    if (o.light) this.light = world.lights.add({ x, z, y: 0.4, color: o.light, intensity: 0.7, radius: this.r * 2.5, flicker: 0.4 });
  }
  update(dt) {
    this.t += dt; this.nt -= dt;
    const W = this.world, p = W.player;
    if (this.slow && p && dist2(p.x, p.z, this.x, this.z) < this.r * this.r && !p.dashing) p.status.slow = Math.max(p.status.slow, 0.15);
    if (this.nt <= 0) {
      this.nt = this.tick;
      const victims = this.team === 'enemy' ? [p] : W.enemies;
      for (const v of victims) {
        if (!v || !v.alive || v.mode === 'fly' && this.team !== 'enemy' || dist2(v.x, v.z, this.x, this.z) > (this.r * 0.85 + v.radius) ** 2) continue;
        if (v === p && p.dashing) continue;
        W.dot(v, this.damage, this.element);
        if (this.status) for (const [k, s] of Object.entries(this.status)) v.applyStatus(k, s.amount ?? s, s.dur);
      }
      if (this.preset) W.fx.emit(this.preset, this.x, 0.15, this.z, 2, { radius: this.r * 0.7 });
    }
    const k = this.t / this.dur;
    this.decal.material.uniforms.uAlpha.value = k > 0.75 ? (1 - k) / 0.25 : 0.95;
    if (this.t >= this.dur) this.destroy();
  }
  destroy() {
    this.done = true;
    if (this.decal) { this.decal.removeFromParent(); this.decal.material.dispose(); this.decal = null; }
    if (this.light) this.world.lights.remove(this.light);
  }
}

/** A damaging line segment (fissures, fire walls, blood rivers). */
export class LineHazard {
  constructor(world, x0, z0, x1, z1, o = {}) {
    Object.assign(this, { world, x0, z0, x1, z1, w: o.w ?? 0.8, dur: o.dur ?? 3, tick: o.tick ?? 0.35, damage: o.damage ?? 6, element: o.element ?? 'fire', status: o.status, preset: o.preset ?? 'fire', t: 0, nt: 0.2, done: false, hitT: 0 });
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.9));
    this.decals = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      this.decals.push(world.fx.decal(o.decal || 'scorch', x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, this.w * 0.8, { temp: true, alpha: 0.9, color: o.color ?? 0xffffff, unlit: !!o.unlit, glow: o.glow }));
    }
  }
  update(dt) {
    this.t += dt; this.hitT -= dt;
    const W = this.world, p = W.player;
    if (Math.random() < dt * 14) { const t = Math.random(); W.fx.emit(this.preset, this.x0 + (this.x1 - this.x0) * t, 0.2, this.z0 + (this.z1 - this.z0) * t, 1, { radius: 0.2 }); }
    if (p && p.alive && this.hitT <= 0 && segCircle(this.x0, this.z0, this.x1, this.z1, p.x, p.z, p.radius + this.w * 0.4)) {
      this.hitT = this.tick;
      if (!p.dashing) {
        W.dot(p, this.damage, this.element);
        if (this.status) for (const [k, s] of Object.entries(this.status)) p.applyStatus(k, s.amount ?? s, s.dur);
      }
    }
    const k = this.t / this.dur;
    for (const d of this.decals) d.material.uniforms.uAlpha.value = k > 0.8 ? (1 - k) / 0.2 : 0.9;
    if (this.t >= this.dur) this.destroy();
  }
  destroy() {
    this.done = true;
    for (const d of this.decals) { d.removeFromParent(); d.material.dispose(); }
    this.decals = [];
  }
}
