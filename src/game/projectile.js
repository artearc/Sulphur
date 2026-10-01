// Projectiles for both teams: bolts, orbs, shards, coins, skulls, arrows.
import { Sprite } from '../render/sprite.js';
import { projectileSheet } from '../art/fx.js';
import { applyHit } from './combat.js';
import { angleTo, angleDiff, dist2 } from '../core/math.js';
import { PITCH } from '../render/materials.js';

const SIN = Math.sin(PITCH);

/**
 * o: { x, z, angle, speed, team, damage, radius, life, kind, ramp, size, pierce, homing, element,
 *      knockback, status, trail (preset), light (color), gravity (arc lob), onExpire, accel, curve, bounce }
 */
export class Projectile {
  constructor(world, o) {
    this.world = world;
    Object.assign(this, {
      x: o.x, z: o.z, y: o.y ?? 0.8, angle: o.angle, speed: o.speed ?? 10, team: o.team ?? 'enemy',
      damage: o.damage ?? 8, radius: o.radius ?? 0.25, life: o.life ?? 3, pierce: o.pierce ?? 0,
      homing: o.homing ?? 0, element: o.element ?? 'physical', knockback: o.knockback ?? 2.5,
      status: o.status, trail: o.trail, accel: o.accel ?? 0, curve: o.curve ?? 0, bounce: o.bounce ?? 0,
      onExpire: o.onExpire, onHit: o.onHit, fromBoon: o.fromBoon, source: o.source, heavy: o.heavy, crit: o.crit, delay: o.delay ?? 0,
      maxSpeed: o.maxSpeed ?? 40, wobble: o.wobble ?? 0, ignoreWalls: o.ignoreWalls, harmless: o.harmless,
    });
    this.dead = false;
    this.hitSet = new Set();
    this.t = 0;
    this.trailT = 0;
    const sheet = projectileSheet(o.kind || 'orb', o.ramp || [0x3a0408, 0x8a1016, 0xf05060, 0xffc0c0], o.size || 12);
    this.sprite = new Sprite(sheet, { anim: 'fly', pivot: sheet.fh / 2, unlit: true, renderOrder: 12 });
    this.sprite.mesh.rotation.order = 'XYZ';
    this.sprite.mesh.rotation.x = -PITCH;
    this.rotates = o.kind === 'bolt' || o.kind === 'shard' || o.kind === 'arrow';
    if (o.scale) this.sprite.setScale(o.scale);
    world.root.add(this.sprite.mesh);
    if (o.light) this.light = world.lights.add({ x: this.x, z: this.z, y: this.y, color: o.light, intensity: o.lightIntensity ?? 0.9, radius: o.lightRadius ?? 3 });
    if (this.delay > 0) this.sprite.mesh.visible = false;
  }

  update(dt) {
    if (this.delay > 0) { this.delay -= dt; if (this.delay <= 0) this.sprite.mesh.visible = true; else return; }
    this.t += dt;
    this.life -= dt;
    const W = this.world;
    if (this.homing > 0) {
      const tgt = this.team === 'player' ? W.nearestEnemy(this.x, this.z, 9) : W.player;
      if (tgt && tgt.alive) {
        const a = angleTo(this.x, this.z, tgt.x, tgt.z);
        this.angle += Math.max(-this.homing * dt, Math.min(this.homing * dt, angleDiff(this.angle, a)));
      }
    }
    this.angle += this.curve * dt;
    this.speed = Math.min(this.maxSpeed, Math.max(0, this.speed + this.accel * dt));
    let a = this.angle + (this.wobble ? Math.sin(this.t * 10) * this.wobble : 0);
    const nx = this.x + Math.cos(a) * this.speed * dt;
    const nz = this.z + Math.sin(a) * this.speed * dt;
    const room = W.room;
    if (room && !this.ignoreWalls && room.blocksShot(room.typeAt(nx, nz))) {
      if (this.bounce > 0) {
        this.bounce--;
        const bx = room.blocksShot(room.typeAt(nx, this.z)), bz = room.blocksShot(room.typeAt(this.x, nz));
        if (bx) this.angle = Math.PI - this.angle;
        if (bz) this.angle = -this.angle;
        if (!bx && !bz) this.angle += Math.PI;
      } else { this.expire(true); return; }
    } else { this.x = nx; this.z = nz; }

    // hits
    const targets = this.team === 'player' ? W.enemies : [W.player, ...W.allies];
    for (const t of targets) {
      if (!t || !t.alive || this.hitSet.has(t.id) || t.untargetable) continue;
      if (dist2(this.x, this.z, t.x, t.z) > (this.radius + t.radius) ** 2) continue;
      if (t === W.player && !t.canBeHit()) { if (t.dashing) t.onDodge?.(this); continue; }
      if (this.harmless) { this.expire(false); return; }
      this.hitSet.add(t.id);
      applyHit(W, {
        team: this.team, damage: this.damage, knockback: this.knockback, element: this.element, status: this.status,
        source: this.source, knockAngle: this.angle, heavy: this.heavy, crit: this.crit, projectile: true, onHit: this.onHit, fromBoon: this.fromBoon,
      }, t);
      if (this.pierce-- <= 0) { this.expire(false); return; }
    }
    // reflected by player's ward (Prudencia) etc.
    if (this.team === 'enemy' && W.wards) {
      for (const w of W.wards) if (dist2(this.x, this.z, w.x, w.z) < w.r * w.r) { this.expire(true); return; }
    }

    if (this.trail) {
      this.trailT -= dt;
      if (this.trailT <= 0) { this.trailT = 0.03; W.fx.emit(this.trail, this.x, this.y, this.z, 1, { radius: 0.05 }); }
    }
    if (this.life <= 0) { this.expire(false); return; }
    if (this.rotates) {
      const sa = Math.atan2(-Math.sin(a) * SIN, Math.cos(a));
      this.sprite.mesh.rotation.z = sa;
    }
    this.sprite.update(dt);
    this.sprite.place(this.x, this.y, this.z);
    if (this.light) { this.light.x = this.x; this.light.z = this.z; }
  }

  expire(wall) {
    if (this.dead) return;
    this.dead = true;
    const W = this.world;
    const preset = this.trail || 'spark';
    W.fx.emit(preset, this.x, this.y, this.z, wall ? 6 : 3, { dir: this.angle + Math.PI, spread: 2 });
    this.onExpire?.(this);
    this.sprite.dispose();
    if (this.light) W.lights.remove(this.light);
  }
}
