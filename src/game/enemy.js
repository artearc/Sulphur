// Enemy base: state machine + behaviour toolkit shared by the whole bestiary.
// Design rules: every attack is telegraphed (pose + ground shape), every hit staggers unless the
// enemy has poise, and every death is a small event (burst, decal, loot).
import { Entity } from './entity.js';
import { Sprite } from '../render/sprite.js';
import { resolveHit } from './combat.js';
import { Projectile } from './projectile.js';
import { spawnSheet, explosionSheet } from '../art/fx.js';
import { Events } from '../core/events.js';
import { angleTo, dist, clamp, angleDiff, rotateTowards } from '../core/math.js';
import { R } from '../art/palette.js';

export const ENEMY_DEFS = {};      // id -> def (registered by bestiary modules)
export function registerEnemy(def) { ENEMY_DEFS[def.id] = def; }

export class Enemy extends Entity {
  constructor(world, def, o = {}) {
    const scale = (def.scale || 1) * (o.elite ? 1.2 : 1);
    super(world, {
      x: o.x, z: o.z, radius: (def.radius || 0.45) * scale, hp: def.hp, team: 'enemy', mode: def.mode || 'walk',
      mass: (def.mass || 1) * (o.elite ? 1.6 : 1), shadow: def.shadow ?? (def.radius || 0.45) * 1.3 * scale, poise: def.poise || 0, armor: def.armor || 0,
    });
    this.def = def;
    this.type = def.id;
    this.elite = !!o.elite;
    this.purified = !!o.purified;
    this.bloodType = def.blood || 'blood';
    const mods = world.game.run?.enemyMods?.() || { hp: 1, dmg: 1, speed: 1, cooldown: 1, telegraph: 1 };
    this.mods = mods;
    let hpMul = mods.hp * (this.elite ? 2.4 : 1) * (this.purified ? 1.4 : 1);
    this.maxHp = this.hp = Math.round(def.hp * hpMul);
    this.dmgMul = mods.dmg * (this.elite ? 1.3 : 1);
    this.speed = (def.speed ?? 3) * mods.speed * (this.elite ? 1.08 : 1) * (this.purified ? 0.92 : 1);
    this.cdMul = mods.cooldown * (this.elite ? 0.8 : 1);
    this.teleMul = mods.telegraph * (this.purified ? 1.25 : 1);
    if (this.purified) this.armor = Math.max(this.armor, 0.15);
    this.state = 'spawn';
    this.stateT = 0;
    this.timers = [];
    this.cooldowns = {};
    this.target = world.player;
    this.facing = 1;
    this.anim = 'idle';
    this.knockMul = def.knockMul ?? 1;
    this.windImmune = !!def.windImmune;
    const sheet = def.sheet(this);
    this.attachSprite(new Sprite(sheet, { anim: 'idle', pivot: def.pivot ?? 1, scale, minLight: def.minLight ?? (def.boss || def.miniboss ? 0.5 : 0.34), rim: def.boss ? 0.8 : 0.6 }));
    if (this.elite) this.sprite.setOutline(0xd01830, 1);
    if (this.purified) this.sprite.setOutline(0xf2e8b0, 1);
    this.sprite.setAlpha(0);
    this.untargetable = true;
    this.spawnDur = o.spawnDelay ?? 0.75;
    this.spawnFx(o);
    this.ai = {};
    def.init?.(this, o);
    this.contactCd = 0;
    this.auraT = Math.random();
    this.lootDropped = false;
    if (def.light) this.light = world.lights.add({ follow: this, y: def.light.y ?? 1, color: def.light.color, intensity: def.light.intensity ?? 0.8, radius: def.light.radius ?? 3 });
  }

  spawnFx(o) {
    if (o.noSpawnFx || this.def.noSpawnFx) { this.spawnDur = 0.01; return; }
    const W = this.world;
    const ramp = this.def.spawnRamp || [0x200008, 0x6a0a18, 0xc8243a, 0xff8090];
    W.fx.decal('sigilSin', this.x, this.z, this.radius * 2.2 + 0.6, { unlit: true, glow: 1, fade: 1.4, alpha: 0.9, color: this.elite ? 0xff4060 : 0xc0203a });
    W.fx.play(spawnSheet(this.def.spawnKey || 'sin', ramp), { x: this.x, y: 0, z: this.z + 0.02, pivot: 0, scale: 1 + this.radius });
    Events.emit('enemy:spawn', { enemy: this });
  }

  // ---------------------------------------------------------------- utilities
  after(t, fn) { this.timers.push({ t, fn }); }
  cd(name, t) { if ((this.cooldowns[name] || 0) > 0) return false; this.cooldowns[name] = t * this.cdMul; return true; }
  ready(name) { return (this.cooldowns[name] || 0) <= 0; }
  setState(s) { this.state = s; this.stateT = 0; }
  play(a, opts) { if (this.sprite.has(a)) { this.sprite.play(a, opts); this.anim = a; } }
  distToTarget() { return this.target ? dist(this.x, this.z, this.target.x, this.target.z) : 99; }
  angleToTarget() { return this.target ? angleTo(this.x, this.z, this.target.x, this.target.z) : 0; }
  faceTarget() { this.faceAngle(this.angleToTarget()); }
  faceAngle(a) { this.angle = a; this.facing = Math.cos(a) < 0 ? -1 : 1; this.sprite.setFlip(this.def.artFacesLeft ? this.facing > 0 : this.facing < 0); }
  hasLos() { return this.world.room ? this.world.room.los(this.x, this.z, this.target.x, this.target.z) : true; }

  moveToward(x, z, mul = 1) {
    const a = angleTo(this.x, this.z, x, z);
    this.steer(a, mul);
  }
  steer(a, mul = 1) {
    // simple whisker avoidance against walls
    const room = this.world.room;
    if (room && this.mode !== 'fly') {
      const look = this.radius + 0.6;
      const blocked = (ang) => room.blocks(room.typeAt(this.x + Math.cos(ang) * look, this.z + Math.sin(ang) * look), this.mode);
      if (blocked(a)) {
        for (const off of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) if (!blocked(a + off)) { a = a + off; break; }
      }
    }
    this.vx = Math.cos(a) * this.speed * mul;
    this.vz = Math.sin(a) * this.speed * mul;
    if (Math.abs(Math.cos(a)) > 0.2) this.faceAngle(a);
  }
  stop(k = 0.2) { this.vx *= k; this.vz *= k; }
  chase(mul = 1) { if (this.target) this.moveToward(this.target.x, this.target.z, mul); }
  keepDistance(min, max, mul = 1) {
    const d = this.distToTarget();
    const a = this.angleToTarget();
    if (d < min) this.steer(a + Math.PI, mul);
    else if (d > max) this.steer(a, mul);
    else this.steer(a + Math.PI / 2 * (this.ai.strafe || 1), mul * 0.6);
    if (Math.random() < 0.01) this.ai.strafe = -(this.ai.strafe || 1);
  }

  telegraph(o) {
    return this.world.fx.telegraph({ x: this.x, z: this.z, color: this.elite ? 0xc00020 : 0xa01020, edge: 0xff5a3a, ...o, duration: (o.duration ?? 0.6) * this.teleMul });
  }

  // Melee/area hit from this enemy
  strike(o) {
    if (this.illusion) return 0;
    return resolveHit(this.world, { team: 'enemy', source: this, x: this.x, z: this.z, angle: this.angle, knockback: 5, element: 'physical', ...o, damage: (o.damage ?? 10) * this.dmgMul });
  }
  shoot(o) {
    if (this.illusion) o = { ...o, damage: 0, harmless: true };
    const p = new Projectile(this.world, {
      x: this.x + Math.cos(o.angle ?? this.angle) * (this.radius + 0.2), z: this.z + Math.sin(o.angle ?? this.angle) * (this.radius + 0.2),
      team: 'enemy', source: this, angle: this.angle, ...o, damage: (o.damage ?? 8) * this.dmgMul,
    });
    this.world.addProjectile(p);
    return p;
  }
  ring(n, o) { for (let k = 0; k < n; k++) this.shoot({ ...o, angle: (o.angle ?? 0) + (k / n) * Math.PI * 2 }); }
  spread(n, arc, o) { for (let k = 0; k < n; k++) this.shoot({ ...o, angle: (o.angle ?? this.angle) + (n > 1 ? (k / (n - 1) - 0.5) * arc : 0) }); }

  // ---------------------------------------------------------------- lifecycle
  update(dt) {
    this.age += dt;
    this.stateT += dt;
    for (const k in this.cooldowns) this.cooldowns[k] -= dt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); if (this.alive) t.fn(); }
    }
    this.updateStatus(dt);
    this.target = this.world.player;

    if (this.state === 'spawn') {
      const k = clamp(this.stateT / this.spawnDur, 0, 1);
      this.sprite.setAlpha(k);
      this.sprite.setDissolve(1 - k, this.def.spawnEdge ?? 0xff3040);
      if (k >= 1) { this.sprite.setDissolve(0); this.untargetable = false; this.setState('idle'); this.def.onSpawned?.(this); }
      this.sprite.update(dt);
      this.syncSprite();
      return;
    }
    if (this.state === 'dead') { this.updateDeath(dt); return; }

    const stunned = this.status.stun > 0 || this.status.frozen > 0;
    if (this.hitstun > 0 || stunned) {
      this.hitstun -= dt;
      this.vx *= Math.exp(-10 * dt); this.vz *= Math.exp(-10 * dt);
      if (this.def.onStagger && this.hitstun > 0) this.def.onStagger(this, dt);
      this.play(this.sprite.has('hurt') ? 'hurt' : 'idle');
      if (this.ai.tele && this.def.interruptible !== false && this.hitstun > 0.1) { this.ai.tele.cancel = true; this.ai.tele = null; }
      if (stunned && this.status.frozen > 0) this.sprite.setTint(0x9ad8ff, 0.7);
      else if (stunned) this.sprite.setTint(0xffe8a0, 0.3);
    } else if (this.status.charm > 0 && !this.isBoss) {
      // seduced (Lujuria boon): wanders, dazed, does not attack
      B.wander(this, dt, 0.35);
      this.play(this.sprite.has('move') ? 'move' : 'idle');
      this.sprite.setTint(0xff86a8, 0.35);
      if (Math.random() < dt * 3) this.world.fx.emit('petal', this.x, 1.4, this.z, 1);
    } else {
      this.sprite.setTint(0xffffff, this.status.freeze > 0 ? this.status.freeze * 0.6 : 0);
      if (this.status.freeze > 0) this.sprite.setTint(0x9ad8ff, this.status.freeze * 0.6);
      this.def.think(this, dt);
    }
    this.integrate(dt);
    // safety: never leave an enemy embedded in architecture (would soft-lock the room)
    this.stuckT = (this.stuckT || 0) + dt;
    if (this.stuckT > 1) {
      this.stuckT = 0;
      const room = this.world.room;
      if (room && !room.free(this.x, this.z, Math.min(this.radius, 0.4) * 0.5, this.mode)) {
        const p = room.randomFloor({ int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)) }, (x, z) => Math.hypot(x - this.x, z - this.z) < 5);
        if (p) { this.x = p.x; this.z = p.z; this.kx = this.kz = 0; }
      }
    }
    // contact damage
    if (this.def.touch && this.contactCd <= 0 && this.target?.alive && this.hitstun <= 0) {
      const d = dist(this.x, this.z, this.target.x, this.target.z);
      if (d < this.radius + this.target.radius + 0.05) {
        this.contactCd = 0.8;
        resolveHit(this.world, { team: 'enemy', source: this, shape: 'circle', x: this.x, z: this.z, radius: this.radius + 0.1, damage: this.def.touch * this.dmgMul, knockback: 4 });
      }
    }
    this.contactCd -= dt;
    this.sprite.update(dt);
    this.updateAura(dt);
    this.syncSprite(this.ai.hover || 0);
  }

  updateAura(dt) {
    this.auraT -= dt;
    if (this.auraT > 0) return;
    this.auraT = this.elite ? 0.12 : 0.6;
    const fx = this.world.fx;
    if (this.elite) fx.emit('corruptGlow', this.x, 0.4, this.z, 1, { radius: this.radius });
    if (this.purified) fx.emit('holyMote', this.x, 0.8, this.z, 1, { radius: this.radius });
    if (this.def.aura) fx.emit(this.def.aura, this.x, this.def.auraY ?? 0.8, this.z, 1, { radius: this.radius * 0.8 });
  }

  onHurt(hit, dmg) {
    this.def.onHurt?.(this, hit, dmg);
    if (this.state === 'idle') this.ai.alerted = true;
  }

  die(hit) {
    this.state = 'dead';
    this.stateT = 0;
    this.untargetable = true;
    if (this.ai.tele) { this.ai.tele.cancel = true; this.ai.tele = null; }
    const W = this.world, fx = W.fx;
    this.vx = 0; this.vz = 0;
    this.play('death', { restart: true });
    const ramp = this.def.deathRamp || [0x3a0408, 0x8a1016, 0xc8243a, 0xf05060];
    fx.emit(this.def.deathPreset || 'blood', this.x, 0.8, this.z, 18, { speed: [2, 6] });
    fx.emit('soul', this.x, 1.0, this.z, 6, { radius: 0.3 });
    if (this.bloodType === 'blood' || this.bloodType === 'bile') fx.decal(this.bloodType === 'bile' ? 'bile' : 'blood' + ((Math.random() * 4) | 0), this.x, this.z, 0.6 + this.radius, { alpha: 0.9 });
    else if (this.bloodType === 'ember') fx.decal('scorch', this.x, this.z, 0.6 + this.radius, { alpha: 0.8 });
    else if (this.bloodType === 'ice') fx.decal('frost', this.x, this.z, 0.6 + this.radius, { unlit: true, alpha: 0.8 });
    this.def.onDeath?.(this, hit);
    if (!this.illusion && !this.isBoss) W.corpses.push({ x: this.x, z: this.z, t: W.time, eaten: false });
    if (!this.noLoot) W.controller?.dropLoot?.(this);
    this.deathDur = this.def.deathDur ?? 0.7;
    if (this.light) { this.world.lights.remove(this.light); this.light = null; }
  }

  updateDeath(dt) {
    const k = clamp(this.stateT / this.deathDur, 0, 1);
    this.sprite.update(dt);
    this.sprite.setDissolve(Math.max(0, (k - 0.25) / 0.75), this.def.deathEdge ?? 0xff6a2a);
    this.integrate(dt);
    this.syncSprite(this.ai.hover || 0);
    if (this.shadow) this.shadow.visible = k < 0.6;
    if (k >= 1) this.destroy();
  }
}

// ---------------------------------------------------------------------------------------------
// Reusable behaviour patterns (compose in def.think)
// ---------------------------------------------------------------------------------------------
export const B = {
  // Telegraphed melee: windup with cone/circle, then strike. Returns true while busy.
  melee(e, dt, o) {
    const A = e.ai;
    if (!A.melee) {
      if (e.distToTarget() > (o.trigger ?? o.range + 0.4) || !e.ready('melee')) return false;
      e.faceTarget();
      A.melee = { t: 0, angle: e.angle, phase: 'wind' };
      e.play(o.windAnim || 'windup', { restart: true });
      A.tele = e.telegraph(o.shape === 'circle'
        ? { shape: 'circle', radius: o.range, duration: o.windup, follow: e }
        : { shape: 'cone', radius: o.range, halfAngle: (o.arc ?? 1.6) / 2, angle: e.angle, duration: o.windup });
      Events.emit('enemy:windup', { enemy: e });
      e.stop(0);
      return true;
    }
    const M = A.melee;
    M.t += dt;
    if (M.phase === 'wind') {
      if (o.track && M.t < o.windup * 0.6) { M.angle = rotateTowards(M.angle, e.angleToTarget(), dt * o.track); e.faceAngle(M.angle); if (A.tele) A.tele.mesh.rotation.y = -M.angle; }
      e.stop(0.5);
      if (M.t >= o.windup * e.teleMul) {
        M.phase = 'hit'; M.t = 0;
        e.play(o.attackAnim || 'attack', { restart: true });
        if (o.lunge) { e.vx = Math.cos(M.angle) * o.lunge; e.vz = Math.sin(M.angle) * o.lunge; }
        e.strike({ shape: o.shape === 'circle' ? 'circle' : 'arc', angle: M.angle, range: o.range, arc: o.arc ?? 1.6, radius: o.range, damage: o.damage, knockback: o.knockback ?? 6, element: o.element || 'physical', status: o.status });
        o.onHit?.(e, M.angle);
        e.world.fx.emit('dust', e.x + Math.cos(M.angle) * o.range * 0.6, 0.1, e.z + Math.sin(M.angle) * o.range * 0.6, 6);
        Events.emit('enemy:attack', { enemy: e });
      }
    } else if (M.phase === 'hit') {
      e.vx *= Math.exp(-8 * dt); e.vz *= Math.exp(-8 * dt);
      if (M.t >= (o.recover ?? 0.5)) { A.melee = null; A.tele = null; e.cd('melee', o.cooldown ?? 1.2); }
    }
    return true;
  },

  // Telegraphed charge along a line
  charge(e, dt, o) {
    const A = e.ai;
    if (!A.charge) {
      if (!e.ready('charge') || e.distToTarget() > (o.maxRange ?? 10) || e.distToTarget() < (o.minRange ?? 2.5) || !e.hasLos()) return false;
      e.faceTarget();
      A.charge = { t: 0, angle: e.angle, phase: 'wind', hit: new Set() };
      e.play('windup', { restart: true });
      A.tele = e.telegraph({ shape: 'rect', length: o.length ?? 8, width: (e.radius * 2 + 0.4), angle: e.angle, duration: o.windup ?? 0.7 });
      Events.emit('enemy:windup', { enemy: e, charge: true });
      return true;
    }
    const Cg = A.charge;
    Cg.t += dt;
    if (Cg.phase === 'wind') {
      e.stop(0);
      if (Cg.t < (o.windup ?? 0.7) * 0.5) { Cg.angle = rotateTowards(Cg.angle, e.angleToTarget(), dt * 2.5); e.faceAngle(Cg.angle); if (A.tele) A.tele.mesh.rotation.y = -Cg.angle; }
      if (Cg.t >= (o.windup ?? 0.7) * e.teleMul) { Cg.phase = 'run'; Cg.t = 0; e.play('attack', { restart: true }); e.onWall = (axis) => { if (A.charge?.phase === 'run') { Cg.t = 99; e.world.fx.shake(0.2); e.world.fx.emit('dust', e.x, 0.3, e.z, 14); e.hitstun = o.wallStun ?? 0.6; } }; }
    } else if (Cg.phase === 'run') {
      const sp = o.speed ?? 14;
      e.vx = Math.cos(Cg.angle) * sp / e.speedMul; e.vz = Math.sin(Cg.angle) * sp / e.speedMul;
      e.strike({ shape: 'circle', radius: e.radius + 0.25, damage: o.damage, knockback: o.knockback ?? 9, hitSet: Cg.hit, knockAngle: Cg.angle });
      if (Math.random() < 0.6) e.world.fx.emit('dust', e.x, 0.1, e.z, 1);
      if (Cg.t >= (o.length ?? 8) / sp) { Cg.phase = 'rec'; Cg.t = 0; e.stop(0.2); e.play('idle'); }
    } else {
      e.stop(0.6);
      if (Cg.t >= (o.recover ?? 0.6)) { A.charge = null; A.tele = null; e.onWall = null; e.cd('charge', o.cooldown ?? 3); }
    }
    return true;
  },

  // Ranged volley with windup glow
  volley(e, dt, o) {
    const A = e.ai;
    if (!A.volley) {
      if (!e.ready('volley') || e.distToTarget() > (o.range ?? 12) || !e.hasLos()) return false;
      e.faceTarget();
      A.volley = { t: 0, shots: 0 };
      e.play('windup', { restart: true });
      e.sprite.flash(o.flash ?? 0xff4040, (o.windup ?? 0.5) * 0.6);
      Events.emit('enemy:windup', { enemy: e, ranged: true });
      return true;
    }
    const V = A.volley;
    V.t += dt;
    e.stop(0.3);
    const wind = (o.windup ?? 0.5) * e.teleMul;
    if (V.t >= wind + V.shots * (o.interval ?? 0.15) && V.shots < (o.shots ?? 1)) {
      e.faceTarget();
      e.play('attack', { restart: true });
      o.fire(e, V.shots);
      V.shots++;
      Events.emit('enemy:shoot', { enemy: e });
    }
    if (V.shots >= (o.shots ?? 1) && V.t >= wind + (o.shots ?? 1) * (o.interval ?? 0.15) + (o.recover ?? 0.4)) { A.volley = null; e.cd('volley', o.cooldown ?? 2); }
    return true;
  },

  wander(e, dt, mul = 0.4) {
    const A = e.ai;
    A.wanderT = (A.wanderT || 0) - dt;
    if (A.wanderT <= 0) { A.wanderT = 1 + Math.random() * 1.5; A.wanderA = Math.random() * Math.PI * 2; }
    e.steer(A.wanderA, mul);
  },

  explode(e, o) {
    const W = e.world;
    e.strike({ shape: 'circle', radius: o.radius, damage: o.damage, knockback: o.knockback ?? 10, element: o.element || 'fire' });
    // explosions also hurt other enemies a little (wrath consumes all)
    resolveHit(W, { team: 'player', env: true, source: e, shape: 'circle', x: e.x, z: e.z, radius: o.radius, damage: (o.damage ?? 20) * 0.5, knockback: 8, element: 'fire' });
    W.fx.play(explosionSheet(o.key || 'fire', o.ramp || R.ember, 64), { x: e.x, y: 0.7, z: e.z + 0.05, scale: o.radius / 1.6, onTop: true });
    W.fx.emit('fire', e.x, 0.6, e.z, 24, { speed: [2, 6], radius: 0.5 });
    W.fx.emit('smoke', e.x, 0.8, e.z, 10, { radius: 0.6 });
    W.fx.decal('scorch', e.x, e.z, o.radius * 0.8, { alpha: 0.9 });
    W.fx.lightFlash(e.x, e.z, 0xff8030, 3.5, o.radius * 3, 0.3);
    W.fx.shake(0.35);
    Events.emit('explosion', { x: e.x, z: e.z });
  },
};
