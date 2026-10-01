// World: the live simulation of one room — entities, projectiles, hazards, pickups, FX, lights.
import * as THREE from 'three';
import { Room, C, TZ } from './room.js';
import { buildRoom } from './roombuilder.js';
import { LightSystem } from '../render/lights.js';
import { FX } from '../render/fx.js';
import { SharedUniforms } from '../render/lighting.js';
import { CIRCLE_PALETTES } from '../art/palette.js';
import { Events } from '../core/events.js';
import { dist2 } from '../core/math.js';
import { applyHit } from './combat.js';

export class World {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.lights = new LightSystem();
    this.fx = new FX(this.scene, game.rig, game.pipe, this.lights);
    this.player = null;
    this.enemies = [];
    this.allies = [];
    this.projectiles = [];
    this.pickups = [];
    this.interactables = [];
    this.hazards = [];
    this.wards = [];
    this.obstacles = [];
    this.breakables = [];
    this.corpses = [];
    this.room = null;
    this.built = null;
    this.time = 0;
    this.paused = false;
    this.controller = null;
    this.wind = null;
    this.ambientT = 0;
    this.circle = null;
  }

  clearRoom() {
    for (const e of this.enemies) e.destroy();
    for (const e of this.allies) e.destroy();
    for (const p of this.projectiles) if (!p.dead) { p.dead = true; p.sprite.dispose(); p.light && this.lights.remove(p.light); }
    for (const p of this.pickups) p.destroy();
    for (const i of this.interactables) i.destroy?.();
    for (const h of this.hazards) h.destroy?.();
    this.enemies = []; this.allies = []; this.projectiles = []; this.pickups = []; this.interactables = []; this.hazards = []; this.wards = [];
    for (const g of this.gazeBlockers || []) g.sprite?.dispose();
    this.obstacles = []; this.breakables = []; this.corpses = []; this.gazeBlockers = []; this.visionOverride = false;
    this.built?.dispose();
    this.built = null;
    this.fx.clear();
    // keep the player's light registered across rooms
    const keep = this.player?.lightHandles || [];
    this.lights.clear();
    for (const l of keep) this.lights.lights.add(l);
    this.wind = null;
  }

  loadRoom(layout, circle) {
    this.clearRoom();
    this.circle = circle;
    this.room = new Room(layout);
    this.layout = layout;
    this.built = buildRoom(layout, this.room, circle, this);
    this.root.add(this.built.group);
    this.applyPalette(circle.id);
    this.game.rig.setBounds(this.room.bounds);
    this.wind = layout.wind ? { ...layout.wind, t: 0, active: false, x: 0, z: 0 } : null;
    this.fx.particles.wind = null;
  }

  applyPalette(id) {
    const P = CIRCLE_PALETTES[id] || CIRCLE_PALETTES.limbo;
    const U = SharedUniforms;
    U.uAmbient.value.setRGB(...P.ambient);
    U.uSkyLight.value.setRGB(...P.sky);
    U.uKeyCol.value.setRGB(...P.key);
    U.uAbyssColor.value.setRGB(...P.abyss);
    U.uFogColor.value.set(P.fog);
    const post = this.game.pipe.post;
    post.uShadowTint.value.setRGB(...P.grade.shadow);
    post.uHighTint.value.setRGB(...P.grade.high);
    post.uSaturation.value = P.grade.sat;
    post.uContrast.value = P.grade.contrast;
    U.uVision.value.w = 0;
  }

  addObstacle(x, z, r) { this.obstacles.push({ x, z, r }); }
  pushOutObstacles(e) {
    if (e.mode === 'fly') return;
    for (const o of this.obstacles) {
      const dx = e.x - o.x, dz = e.z - o.z;
      const rr = o.r + e.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        e.x = o.x + (dx / d) * rr; e.z = o.z + (dz / d) * rr;
      }
    }
  }

  addEnemy(e) { this.enemies.push(e); return e; }
  addProjectile(p) { this.projectiles.push(p); return p; }
  addPickup(p) { this.pickups.push(p); return p; }
  addInteractable(i) { this.interactables.push(i); return i; }
  addHazard(h) { this.hazards.push(h); return h; }

  nearestEnemy(x, z, maxD = 99) {
    let best = null, bd = maxD * maxD;
    for (const e of this.enemies) {
      if (!e.alive || e.untargetable) continue;
      const d = dist2(x, z, e.x, e.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  enemiesInRadius(x, z, r) { return this.enemies.filter((e) => e.alive && dist2(x, z, e.x, e.z) <= (r + e.radius) ** 2); }
  aliveEnemies() { return this.enemies.filter((e) => e.alive && !e.ignoreForClear); }

  // damage over time — no hitstop, small numbers
  dot(t, dmg, element) {
    if (!t.alive) return;
    if (t === this.player && !this.player.canBeHit(true)) return;
    dmg = Math.max(1, Math.round(dmg * (t === this.player ? 1 : this.player?.stats.dotMul ?? 1)));
    t.hp -= dmg;
    this.fx.number(dmg, t.x, t.z, { color: element === 'fire' ? 0xffa040 : element === 'poison' ? 0xb8d040 : 0xc0c0ff, y: 1.4 });
    t.sprite?.flash(element === 'fire' ? 0xffa040 : 0xb8d040, 0.06);
    if (t === this.player) Events.emit('player:hurt', { dmg, dot: true });
    if (t.hp <= 0 && t.alive) {
      t.alive = false;
      t.die?.({ element });
      if (t !== this.player) this.onEnemyKilled(t, { element, dot: true });
    }
  }

  onEnemyKilled(e, hit) {
    Events.emit('enemy:death', { enemy: e, hit });
    this.player?.onKill?.(e, hit);
    this.controller?.onEnemyKilled?.(e, hit);
  }

  breakProp(b, hit) {
    b.broken = true;
    b.onBreak?.(hit);
  }

  // Liquids & circle mechanics acting on an entity standing on the current cell
  terrainEffects(e, dt) {
    if (!this.room || e.mode === 'fly' || e.dashing) return;
    const t = this.room.typeAt(e.x, e.z);
    e.onLiquid = t === C.LIQUID;
    if (!e.onLiquid) return;
    const L = this.room.liquid;
    e.liquidTimer = (e.liquidTimer || 0) - dt;
    if (L.slow) e.status.slow = Math.max(e.status.slow, 0.1);
    if (e.liquidTimer <= 0) {
      e.liquidTimer = 0.45;
      if (L.damage && !(e.immune && e.immune.has(L.kind))) this.dot(e, L.damage * (e === this.player ? 1 : 0.5), L.kind === 'lava' ? 'fire' : 'physical');
      if (L.poison && e === this.player) e.applyStatus('poison', 1, 1.5);
      if (L.burn) e.applyStatus('burn', 1, 1.5);
      const fxp = { muck: 'poison', gold: 'gold', styx: 'smoke', lava: 'fire', blood: 'bloodMist', pitch: 'shadow', mist: 'ash' }[L.kind];
      if (fxp) this.fx.emit(fxp, e.x, 0.2, e.z, 3, { radius: e.radius });
    }
  }

  separate() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive || !a.solid) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive || !b.solid) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (rr - d) * 0.5;
          const ma = a.mass / (a.mass + b.mass);
          a.x -= (dx / d) * push * (1 - ma); a.z -= (dz / d) * push * (1 - ma);
          b.x += (dx / d) * push * ma; b.z += (dz / d) * push * ma;
        }
      }
      // enemies vs player: soft push (player keeps control, enemies yield)
      const p = this.player;
      if (p && p.alive && !p.dashing) {
        const dx = p.x - a.x, dz = p.z - a.z;
        const rr = a.radius + p.radius * 0.8;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = rr - d;
          a.x -= (dx / d) * push * 0.7; a.z -= (dz / d) * push * 0.7;
          p.x += (dx / d) * push * 0.3; p.z += (dz / d) * push * 0.3;
        }
      }
    }
  }

  update(dt) {
    this.time += dt;
    SharedUniforms.uTime.value = this.time;
    if (!this.paused) {
      // circle-wide forces
      if (this.wind) this.updateWind(dt);
      if (this.player) this.player.update(dt);
      for (const e of this.enemies) {
        if (e.removed) continue;
        e.update(dt);
        this.terrainEffects(e, dt);
      }
      for (const a of this.allies) if (!a.removed) a.update(dt);
      this.separate();
      for (const p of this.projectiles) if (!p.dead) p.update(dt);
      for (const h of this.hazards) if (!h.done) h.update(dt);
      for (const p of this.pickups) if (!p.done) p.update(dt);
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      this.hazards = this.hazards.filter((h) => !h.done);
      this.pickups = this.pickups.filter((p) => !p.done);
      this.enemies = this.enemies.filter((e) => !e.removed);
      this.allies = this.allies.filter((e) => !e.removed);
      for (const i of this.interactables) i.update?.(dt);
      this.ambient(dt);
    }
    this.built?.update(dt, this.fx);
    this.fx.update(dt);
  }

  updateWind(dt) {
    const W = this.wind;
    W.t += dt;
    const phase = W.t % W.period;
    // gust telegraph (streaks) for 1s, then gust for 2s, calm otherwise
    const tele = phase < 1.0, gust = phase >= 1.0 && phase < 3.0;
    if (phase < dt) {
      W.angle += (Math.random() < 0.5 ? 1 : -1) * Math.PI * (Math.random() < 0.5 ? 0.5 : 1);
      Events.emit('wind:telegraph', { angle: W.angle });
    }
    W.x = Math.cos(W.angle) * W.strength; W.z = Math.sin(W.angle) * W.strength;
    W.active = gust;
    const b = this.room.bounds;
    const n = tele ? 2 : gust ? 6 : 0;
    for (let k = 0; k < n; k++) {
      const x = b.minX + Math.random() * (b.maxX - b.minX), z = b.minZ + 3 + Math.random() * (b.maxZ - b.minZ - 3);
      this.fx.emit({ ...{ add: false, c0: 0xd8c8f0, c1: 0x3a2a50, life: [0.4, 0.8], speed: [0, 0], size: [1, 1], grav: 0, drag: 0, up: [0, 0.1] } }, x, 0.4 + Math.random() * 1.5, z, 1, {});
    }
    // streak particles move with the wind
    this.fx.particles.wind = gust ? { x: W.x * 6, z: W.z * 6 } : tele ? { x: W.x * 1.5, z: W.z * 1.5 } : null;
    if (gust) {
      for (const e of [this.player, ...this.enemies]) {
        if (!e || !e.alive || e.windImmune) continue;
        const k = e === this.player ? (e.dashing ? 0.2 : 1) : 0.5;
        e.kx += W.x * dt * 4 * k / Math.max(0.5, e.mass); e.kz += W.z * dt * 4 * k / Math.max(0.5, e.mass);
      }
    }
  }

  ambient(dt) {
    this.ambientT -= dt;
    if (this.ambientT > 0 || !this.room || !this.circle) return;
    this.ambientT = 0.08;
    const b = this.room.bounds;
    const amb = this.circle.ambient;
    if (!amb) return;
    const x = b.minX + Math.random() * (b.maxX - b.minX);
    const z = b.minZ + Math.random() * (b.maxZ - b.minZ);
    const y = amb === 'frost' || amb === 'ash' || amb === 'petal' ? 5 : 0.2;
    this.fx.emit(amb === 'gold' ? 'holyMote' : amb, x, y, z, 1, amb === 'gold' ? { c0: 0xffe8a0, c1: 0x6a4410 } : {});
  }

  hit(o) { return applyHit(this, o, o.target); }
}
