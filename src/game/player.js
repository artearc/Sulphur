// Dante. Responsive 360° movement, buffered combos, chargeable heavy, i-frame dash,
// Juicio (dash + heavy), alignment-driven special, visible moral transformation.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Sprite } from '../render/sprite.js';
import { danteSheet } from '../art/characters.js';
import { weaponSheet, WEAPON_ART } from '../art/weapons.js';
import { slashSheet, thrustSheet, haloSheet, explosionSheet, pillarSheet } from '../art/fx.js';
import { WEAPONS } from '../data/weapons.js';
import { Input } from '../core/input.js';
import { Events } from '../core/events.js';
import { resolveHit } from './combat.js';
import { Projectile } from './projectile.js';
import { clamp, damp, angleDiff, lerp, easeOutCubic, easeInOut } from '../core/math.js';
import { PITCH, Y_STRETCH, PPU } from '../render/materials.js';
import { Save } from '../core/save.js';
import { R } from '../art/palette.js';
import { C } from './room.js';

const SIN = Math.sin(PITCH);
const DIR_ANIM = (a) => {
  const sx = Math.cos(a), sz = Math.sin(a);
  if (Math.abs(sx) > Math.abs(sz) * 0.75) return 'side';
  return sz < 0 ? 'up' : 'down';
};

export const BASE_STATS = {
  maxHp: 100, speed: 6.4, damageMul: 1, crit: 0.05, critMul: 1.8, dashCharges: 1, dashCooldown: 0.42,
  dashDist: 3.6, iframes: 0.12, attackSpeed: 1, heavyMul: 1, fervorGain: 1, specialCost: 34, dotMul: 1,
  armor: 0, goldMul: 1, healMul: 1, lifesteal: 0, essenceMul: 1, moveOnAttack: 1, knockMul: 1,
};

export class Player extends Entity {
  constructor(world, o = {}) {
    super(world, { ...o, team: 'player', radius: 0.38, hp: 100, shadow: 0.55, mass: 1.2 });
    this.game = world.game;
    this.weaponId = o.weapon || 'espada';
    this.weapon = WEAPONS[this.weaponId];
    this.tier = 0;
    this.sprite = null;
    this.attachSprite(new Sprite(danteSheet(0), { anim: 'idle_down', pivot: 1, minLight: 0.55, rim: 0.7 }));
    // weapon visual
    this.weaponSprite = this._makeWeaponSprite();
    world.root.add(this.weaponSprite.mesh);
    // halo
    this.halo = new Sprite(haloSheet(), { anim: 'glow', pivot: 4, unlit: true, renderOrder: 3 });
    this.halo.mesh.visible = false;
    world.root.add(this.halo.mesh);

    this.stats = { ...BASE_STATS };
    this.hooks = { onHit: [], onKill: [], onDash: [], onHurt: [], onRoomClear: [], onAttack: [], outgoing: [], onSpecial: [] };
    this.state = 'free';
    this.st = {};
    this.aim = 0;            // aim angle (xz)
    this.moveAngle = Math.PI / 2;
    this.dir = 'down';
    this.flip = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.dashCharges = 1;
    this.dashTimer = 0;
    this.dashing = false;
    this.lastDashEnd = -1;
    this.fervor = 0;
    this.locked = false;
    this.hurtInvuln = 0;
    this.afterimages = [];
    this.aimFromMouse = true;
    this.lowHpWarned = false;
    this.footT = 0;
    this.weaponSwing = null;
    this.interactTarget = null;
    this.kills = 0;
    this.revives = 0;
    this.extraLife = 0;
    this.light = world.lights.add({ follow: this, y: 1.8, oz: 0.9, color: 0xffb070, intensity: 1.35, radius: 7, priority: 10 });
    this.lightHandles = [this.light];
    this.auraT = 0;
  }

  _makeWeaponSprite() {
    const sheet = weaponSheet(this.weaponId);
    const art = WEAPON_ART[this.weaponId];
    const s = new Sprite(sheet, { anim: 'idle', pivot: sheet.fh / 2, minLight: 0.45 });
    // move the pivot to the grip: geometry is centered horizontally, shift so grip sits at origin
    const g = s.mesh.geometry.clone();
    g.translate((sheet.fw / 2 - art.grip) / PPU, 0, 0);
    s.mesh.geometry = g;
    s.mesh.rotation.order = 'XYZ';
    s.mesh.rotation.x = -PITCH;
    s.mesh.scale.set(1, 1 / Y_STRETCH, 1);
    return s;
  }

  setWeapon(id) {
    this.weaponId = id;
    this.weapon = WEAPONS[id];
    this.weaponSprite.dispose();
    this.weaponSprite = this._makeWeaponSprite();
    this.world.root.add(this.weaponSprite.mesh);
  }

  resetModifiers() {
    this.stats = { ...BASE_STATS };
    for (const k in this.hooks) this.hooks[k] = [];
    delete this.canBeHit;          // restore prototype method (relics may wrap it)
    delete this.damageTakenMul;
    this.windImmune = false;
    this.mass = 1.2;
    this.extraLife = 0;
    this.applyTierLight();
  }

  applyTierLight() {
    const L = this.light, t = this.tier;
    if (!L) return;
    if (t >= 2) { L.color.set(0xffe0a0); L.intensity = 1.6; L.radius = 8; }
    else if (t === 1) { L.color.set(0xffd090); L.intensity = 1.45; L.radius = 7.4; }
    else if (t === 0) { L.color.set(0xffb070); L.intensity = 1.35; L.radius = 7; }
    else if (t === -1) { L.color.set(0xd07060); L.intensity = 1.15; L.radius = 6.2; }
    else { L.color.set(0xa03040); L.intensity = 1.0; L.radius = 5.6; }
    if (this.stats?.revealSecrets) L.radius += 1.5;
  }

  setTier(t) {
    if (t === this.tier) return;
    const up = t > this.tier;
    this.tier = t;
    this.sprite.setSheet(danteSheet(t));
    const fx = this.world.fx;
    if (up) {
      fx.emit('holy', this.x, 1.2, this.z, 30, { radius: 0.6 });
      fx.play(pillarSheet('holy', R.holy), { x: this.x, y: 0, z: this.z + 0.05, pivot: 0 });
    } else {
      fx.emit('corruption', this.x, 1.0, this.z, 36, { radius: 0.7 });
      fx.emit('corruptGlow', this.x, 1.0, this.z, 16, { radius: 0.5 });
    }
    this.applyTierLight();
    Events.emit('dante:transform', { tier: t, up });
  }

  // ---------------------------------------------------------------------------------------------
  canBeHit(dot = false) {
    if (!this.alive || this.locked || this.game.godMode) return false;
    if (this.dashing && this.st.t < this.stats.iframes) return false;
    if (this.hurtInvuln > 0 && !dot) return false;
    if (this.state === 'dashHeavy' && this.st.t < 0.12) return false;
    return true;
  }

  onDodge(src) {
    if (this.st.dodged) return;
    this.st.dodged = true;
    // perfect dodge feedback: brief slow-mo + silver afterimage burst
    this.world.fx.emit('soul', this.x, 1, this.z, 8, { radius: 0.4 });
    this.game.slowmo(0.5, 0.12);
    Events.emit('dodge:perfect', {});
    for (const h of this.hooks.onDash) h(this, 'perfect');
  }

  modifyOutgoing(dmg, hit, target) {
    let d = dmg * this.stats.damageMul * (this.game.debugDmg || 1);
    if (hit.heavy) d *= this.stats.heavyMul;
    if (hit.juicio && this.stats.juicioMul) d *= this.stats.juicioMul;
    for (const h of this.hooks.outgoing) d = h(d, hit, target, this);
    return d;
  }

  onDealtDamage(t, dmg, hit) {
    this.fervor = Math.min(100, this.fervor + dmg * 0.55 * this.stats.fervorGain);
    if (this.stats.lifesteal > 0 && !hit.projectile) this.heal(dmg * this.stats.lifesteal, true);
    if (hit.lifesteal) this.heal(dmg * hit.lifesteal, true);
    for (const h of this.hooks.onHit) h(t, dmg, hit, this);
  }

  onKill(e, hit) {
    this.kills++;
    for (const h of this.hooks.onKill) h(e, hit, this);
  }

  heal(amount, quiet = false) {
    if (!this.alive) return 0;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + amount * this.stats.healMul);
    const gained = this.hp - before;
    if (gained >= 1 && !quiet) {
      this.world.fx.number(gained, this.x, this.z, { color: 0x80ff90, prefix: '+', y: 2 });
      this.world.fx.emit('holy', this.x, 1, this.z, 10, { c0: 0xd0ffd0, c1: 0x30a040, radius: 0.4 });
      Events.emit('player:heal', { amount: gained });
    }
    if (this.hp > this.stats.maxHp * 0.3) this.lowHpWarned = false;
    return gained;
  }

  onHurt(hit, dmg) {
    this.hurtInvuln = 0.75;
    this.fervor = Math.min(100, this.fervor + 6);
    if (this.state !== 'dead') { this.state = 'hurt'; this.st = { t: 0 }; }
    for (const h of this.hooks.onHurt) h(hit, dmg, this);
    if (this.hp > 0 && this.hp < this.stats.maxHp * 0.25 && !this.lowHpWarned) {
      this.lowHpWarned = true;
      Events.emit('player:lowhp', {});
    }
  }

  die() {
    if (this.extraLife > 0) {
      // Esperanza / Óbolo: a second breath
      this.extraLife--;
      const run = this.game.run;
      if (run) { if (run.relics.includes('obolo') && !run.flags.oboloUsed) run.flags.oboloUsed = true; else run.flags.esperanzaUsed = true; }
      this.alive = true;
      this.hp = Math.round(this.stats.maxHp * 0.4);
      this.hurtInvuln = 2;
      this.world.fx.play(pillarSheet('holy', R.holy), { x: this.x, y: 0, z: this.z + 0.05, pivot: 0 });
      this.world.fx.screenFlash(0xfff4cc, 0.7, 0.4);
      Events.emit('player:revive', {});
      this.game.ui?.toast('Una esperanza te sostiene', 'virtue');
      return;
    }
    this.state = 'dead';
    this.st = { t: 0 };
    this.sprite.play('death_' + this.dir, { restart: true });
    this.weaponSprite.mesh.visible = false;
    this.halo.mesh.visible = false;
    Events.emit('player:death', {});
    this.game.slowmo(0.25, 1.2);
    this.world.controller?.onPlayerDeath?.();
  }

  // ---------------------------------------------------------------------------------------------
  update(dt) {
    this.age += dt;
    this.updateStatus(dt);
    this.hurtInvuln = Math.max(0, this.hurtInvuln - dt);
    // dash charges
    if (this.dashCharges < this.stats.dashCharges) {
      this.dashTimer += dt;
      if (this.dashTimer >= this.stats.dashCooldown) { this.dashTimer = 0; this.dashCharges++; }
    }
    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.state === 'free') this.combo = 0;

    this.updateAim();
    if (this.state === 'dead') this.updateDead(dt);
    else if (this.locked) this.updateLocked(dt);
    else {
      switch (this.state) {
        case 'free': this.updateFree(dt); break;
        case 'attack': this.updateAttack(dt); break;
        case 'heavy': this.updateHeavy(dt); break;
        case 'dash': this.updateDash(dt); break;
        case 'dashHeavy': this.updateDashHeavy(dt); break;
        case 'special': this.updateSpecial(dt); break;
        case 'hurt': this.updateHurt(dt); break;
      }
    }
    this.integrate(dt);
    this.world.terrainEffects(this, dt);
    this.updateVisuals(dt);
    this.updateInteract();
  }

  updateAim() {
    if (this.locked || this.state === 'dead') return;
    const g = this.game;
    if (Input.usingPad) {
      const ax = Input.padAxes.ax, az = Input.padAxes.az;
      if (Math.hypot(ax, az) > 0.3) this.aim = Math.atan2(az, ax);
      else if (Math.hypot(this.vx, this.vz) > 0.5) this.aim = Math.atan2(this.vz, this.vx);
      this.aimFromMouse = false;
    } else if (Input.mouse.inside) {
      const p = g.rig.screenToGround(Input.mouse.x, Input.mouse.y, 0);
      const a = Math.atan2(p.z - this.z, p.x - this.x);
      if (Number.isFinite(a)) { this.aim = a; this.aimWorld = p; }
      this.aimFromMouse = true;
    }
  }

  face(angle) {
    this.dir = DIR_ANIM(angle);
    this.flip = Math.cos(angle) < -0.05;
    this.sprite.setFlip(this.flip);
  }

  wantMove() { return Input.moveVector(); }

  tryActions() {
    // returns true if an action began
    if (Input.buffered('dash') && this.dashCharges > 0) { Input.consume('dash'); this.startDash(); return true; }
    if (Input.buffered('special') && this.fervor >= this.stats.specialCost) { Input.consume('special'); this.startSpecial(); return true; }
    if (Input.buffered('heavy')) {
      Input.consume('heavy');
      if (this.world.time - this.lastDashEnd < 0.22 || this.state === 'dash') { this.startDashHeavy(); return true; }
      this.startHeavy(); return true;
    }
    if (Input.buffered('light')) { Input.consume('light'); this.startAttack(); return true; }
    return false;
  }

  updateFree(dt) {
    const mv = this.wantMove();
    const ice = this.onLiquid && this.world.room?.liquid.slippery;
    const speed = this.stats.speed;
    const accel = ice ? 9 : 70, decel = ice ? 2.5 : 60;
    const tx = mv.x * speed, tz = mv.z * speed;
    const moving = Math.hypot(mv.x, mv.z) > 0.1;
    this.vx = damp(this.vx, tx, moving ? accel / speed : decel / speed, dt);
    this.vz = damp(this.vz, tz, moving ? accel / speed : decel / speed, dt);
    if (moving) this.moveAngle = Math.atan2(mv.z, mv.x);
    // face aim when mouse aiming, else movement
    const faceA = this.aimFromMouse ? this.aim : this.moveAngle;
    this.face(faceA);
    const sp = Math.hypot(this.vx, this.vz);
    this.sprite.play((sp > 0.8 ? 'run_' : 'idle_') + this.dir);
    if (sp > 0.8) {
      this.footT -= dt;
      if (this.footT <= 0) {
        this.footT = 0.28;
        this.world.fx.emit(this.onLiquid ? 'dust' : 'dust', this.x, 0.05, this.z + 0.1, 2, { speed: [0.3, 0.8], size: [2, 1] });
        Events.emit('step', { liquid: this.onLiquid });
      }
    }
    if (this.tryActions()) return;
    if (Input.wasPressed('interact') && this.interactTarget) {
      this.interactTarget.interact(this);
    }
  }

  // -------------------------------------------- light combo --------------------------------------------
  startAttack() {
    const steps = this.weapon.light;
    if (this.comboTimer <= 0) this.combo = 0;
    const idx = this.combo % steps.length;
    const step = steps[idx];
    this.combo = idx + 1;
    this.state = 'attack';
    this.st = { t: 0, step, idx, phase: 'windup', fired: false, angle: this.aim };
    this.face(this.aim);
    this.sprite.play('attack_' + this.dir, { restart: true, speed: 0.9 / Math.max(0.2, (step.windup + step.active) * 3.0) * 0.18 });
    this.vx *= 0.3; this.vz *= 0.3;
    this.weaponSwing = { from: step.sweep[0], to: step.sweep[1], t: 0, windup: step.windup, active: step.active, rec: step.recovery };
    Events.emit('attack:windup', { weapon: this.weaponId, step: idx });
    for (const h of this.hooks.onAttack) h(this, step, false);
  }

  updateAttack(dt) {
    const S = this.st, step = S.step;
    const as = this.stats.attackSpeed;
    S.t += dt * as;
    // slight steering toward the aim during windup (keeps it responsive but committed)
    if (S.phase === 'windup') {
      S.angle += clamp(angleDiff(S.angle, this.aim), -10 * dt, 10 * dt);
      this.face(S.angle);
      if (S.t >= step.windup) { S.phase = 'active'; S.t = 0; this.fireStep(step, S.angle); }
    } else if (S.phase === 'active') {
      if (S.t >= step.active) { S.phase = 'recovery'; S.t = 0; }
    } else {
      // recovery: cancellable into next step after `cancel`, into dash anytime
      if (S.t >= step.cancel && (Input.buffered('light') || Input.buffered('heavy') || Input.buffered('special'))) {
        this.comboTimer = 0.5;
        if (this.tryActions()) return;
      }
      if (S.t >= step.recovery) { this.state = 'free'; this.comboTimer = 0.42; }
    }
    if (Input.buffered('dash') && this.dashCharges > 0) { Input.consume('dash'); this.comboTimer = 0.5; this.startDash(); return; }
    // lunge decay
    const k = Math.exp(-14 * dt);
    this.vx *= k; this.vz *= k;
    // small drift from movement input during recovery
    if (S.phase === 'recovery') {
      const mv = this.wantMove();
      this.vx += mv.x * 12 * dt; this.vz += mv.z * 12 * dt;
    }
  }

  fireStep(step, angle) {
    const W = this.world, fx = W.fx;
    const lunge = step.lunge * this.stats.moveOnAttack;
    // auto-align lunge: don't overshoot into an enemy that is already close
    const near = W.nearestEnemy(this.x, this.z, 2.2);
    const lk = near ? 0.4 : 1;
    this.vx = Math.cos(angle) * lunge * lk; this.vz = Math.sin(angle) * lunge * lk;
    const art = WEAPON_ART[this.weaponId];
    const heavyFeel = !!step.heavyFeel;
    Events.emit(heavyFeel ? 'attack:heavy' : 'attack:light', { weapon: this.weaponId, step: this.st.idx });

    if (step.shape === 'projectile') {
      const n = step.count || 1;
      for (let k = 0; k < n; k++) {
        const a = angle + (n > 1 ? (k / (n - 1) - 0.5) * step.spread * 2 : 0);
        W.addProjectile(new Projectile(W, {
          x: this.x + Math.cos(a) * 0.6, z: this.z + Math.sin(a) * 0.6, y: 0.95, angle: a, speed: step.speed, team: 'player',
          damage: step.damage, kind: 'bolt', ramp: [0xa06c18, 0xf2c45a, 0xfff4cc, 0xffffff], size: 14, element: 'holy', knockback: step.knockback,
          trail: 'holy', light: 0xffd890, lightIntensity: 0.7, lightRadius: 2.5, source: this, life: 0.9, pierce: this.stats.pierce || 0,
        }));
      }
      fx.emit('holy', this.x + Math.cos(angle) * 0.7, 0.95, this.z + Math.sin(angle) * 0.7, 6, { dir: angle, spread: 0.8 });
      if (step.lunge < 0) { this.vx = Math.cos(angle) * step.lunge; this.vz = Math.sin(angle) * step.lunge; }
      return;
    }
    const hit = {
      team: 'player', source: this, x: this.x, z: this.z, angle, damage: step.damage, knockback: step.knockback * this.stats.knockMul,
      stagger: step.stagger, element: this.weapon.element, heavy: heavyFeel,
      shape: step.shape, range: step.range, arc: step.arc, length: step.length, width: step.width, radius: step.radius,
    };
    // the hitbox is evaluated over the active window so fast enemies entering the arc still get hit
    this.activeHit = { hit, t: step.active + 0.02 };
    resolveHit(W, hit);

    if (step.whip) {
      // chain whip: thrust streak along the line
      fx.play(thrustSheet('chain', art.slash), { x: this.x + Math.cos(angle) * 2.2, y: 0.9, z: this.z + Math.sin(angle) * 2.2, angle, onTop: true, scale: 1.1, speed: 1.2 });
      fx.line('spark', this.x, this.z, this.x + Math.cos(angle) * step.length, this.z + Math.sin(angle) * step.length, 6, { y: 0.9, c0: 0xd2d8e4, c1: 0x3a3e4a });
    } else if (step.slash) {
      const sl = step.slash;
      const ramp = sl.heavy ? art.slashHeavy : art.slash;
      const key = `${this.weaponId}_${sl.size}_${sl.arc}_${sl.heavy ? 'h' : 'l'}`;
      fx.play(slashSheet(key, { ramp, size: sl.size, arc: sl.arc, width: sl.heavy ? 9 : 6, radius: sl.size / 2 - 2 }), {
        x: this.x + Math.cos(angle) * 0.2, y: 0.9, z: this.z + Math.sin(angle) * 0.2 + 0.01, angle, flip: false, onTop: true,
        scale: sl.scale, speed: 1, follow: this, dx: Math.cos(angle) * 0.2, dz: Math.sin(angle) * 0.2 + 0.01,
        mirror: sl.flip,
      });
      if (sl.flip) { const last = fx.oneShots[fx.oneShots.length - 1]; last.sprite.mesh.scale.y *= -1; }
    }
    fx.emit('spark', this.x + Math.cos(angle) * 1.2, 0.9, this.z + Math.sin(angle) * 1.2, heavyFeel ? 6 : 3, { dir: angle, spread: 1.2 });
    fx.kick(angle, heavyFeel ? 0.1 : 0.04);
  }

  // -------------------------------------------- heavy --------------------------------------------
  startHeavy() {
    const hv = this.weapon.heavy;
    this.state = 'heavy';
    this.st = { t: 0, charge: 0, released: false, fired: false, angle: this.aim, full: false };
    this.face(this.aim);
    this.sprite.play('heavy_' + this.dir, { restart: true, speed: 0.6 });
    this.vx *= 0.2; this.vz *= 0.2;
    this.weaponSwing = { from: -2.4, to: -2.6, t: 0, windup: hv.windup + hv.chargeMax, active: 0.1, rec: hv.recovery, charging: true };
    Events.emit('attack:charge', { weapon: this.weaponId });
    this.chargeTele = this.world.fx.telegraph(hv.shape === 'line'
      ? { shape: 'rect', x: this.x, z: this.z, angle: this.aim, length: hv.length, width: hv.width, duration: hv.windup + hv.chargeMax, color: 0x6a4410, edge: 0xf2c45a, follow: this, linger: 0.05 }
      : { shape: 'circle', x: this.x, z: this.z, radius: hv.radius, duration: hv.windup + hv.chargeMax, color: 0x6a4410, edge: 0xf2c45a, follow: this, linger: 0.05 });
  }

  updateHeavy(dt) {
    const S = this.st, hv = this.weapon.heavy;
    S.t += dt * this.stats.attackSpeed;
    if (!S.fired) {
      S.angle += clamp(angleDiff(S.angle, this.aim), -8 * dt, 8 * dt);
      this.face(S.angle);
      if (this.chargeTele && hv.shape === 'line') this.chargeTele.mesh.rotation.y = -S.angle;
      const mv = this.wantMove();
      this.vx = mv.x * 1.2; this.vz = mv.z * 1.2; // shuffle while charging
      if (!Input.isDown('heavy')) S.released = true;
      S.charge = clamp((S.t - hv.windup) / hv.chargeMax, 0, 1);
      if (S.charge >= 1 && !S.full) {
        S.full = true;
        this.sprite.flash(0xfff4cc, 0.12);
        this.world.fx.emit('holy', this.x, 1.2, this.z, 14, { radius: 0.3 });
        Events.emit('attack:charged', {});
      }
      if (S.t > hv.windup * 0.4) this.world.fx.emit('ember', this.x + Math.cos(S.angle) * 0.5, 0.9, this.z + Math.sin(S.angle) * 0.5, 1, { c0: 0xfff4cc, c1: 0xa06c18 });
      if ((S.released && S.t >= hv.windup) || S.t >= hv.windup + hv.chargeMax + 0.25) {
        this.fireHeavy(S.charge, S.angle);
        S.fired = true; S.t = 0;
        this.sprite.play('heavy_' + this.dir, { restart: true, speed: 1.6 });
        this.sprite.time = 2 / 10; // jump to release frame
      }
      if (Input.buffered('dash') && this.dashCharges > 0) {
        Input.consume('dash');
        if (this.chargeTele) this.chargeTele.cancel = true;
        this.startDash(); return;
      }
    } else {
      const k = Math.exp(-10 * dt);
      this.vx *= k; this.vz *= k;
      if (S.t >= hv.recovery) this.state = 'free';
      if (S.t > hv.recovery * 0.5 && Input.buffered('dash') && this.dashCharges > 0) { Input.consume('dash'); this.startDash(); }
    }
  }

  fireHeavy(charge, angle) {
    const hv = this.weapon.heavy;
    const W = this.world, fx = W.fx;
    if (this.chargeTele) { this.chargeTele.cancel = true; this.chargeTele = null; }
    const dmg = lerp(hv.damage[0], hv.damage[1], charge) * (charge >= 1 ? 1.15 : 1);
    const kb = lerp(hv.knockback[0], hv.knockback[1], charge);
    this.weaponSwing = { from: -2.6, to: hv.spin ? -2.6 + Math.PI * 2 : 2.2, t: 0, windup: 0, active: 0.14, rec: hv.recovery };
    Events.emit('attack:heavy', { weapon: this.weaponId, charge });
    for (const h of this.hooks.onAttack) h(this, hv, true);
    if (hv.shape === 'zone') {
      // consecration (cross)
      const p = this.aimWorld && this.aimFromMouse ? this.aimWorld : { x: this.x + Math.cos(angle) * 3, z: this.z + Math.sin(angle) * 3 };
      const d = Math.min(6, Math.hypot(p.x - this.x, p.z - this.z));
      const zx = this.x + Math.cos(angle) * d, zz = this.z + Math.sin(angle) * d;
      W.addHazard(new Consecration(W, zx, zz, hv.radius * (1 + charge * 0.3), dmg, hv.duration, hv.tick, this));
      fx.play(pillarSheet('holy', R.holy), { x: zx, y: 0, z: zz + 0.05, pivot: 0 });
      fx.shake(0.25);
      return;
    }
    const hit = {
      team: 'player', source: this, x: this.x, z: this.z, angle, damage: dmg, knockback: kb * this.stats.knockMul, stagger: hv.stagger,
      element: this.weapon.element, heavy: true, shape: hv.shape, radius: hv.radius, inner: hv.inner, length: hv.length, width: hv.width,
      lifesteal: hv.lifesteal,
    };
    if (hv.pull || hv.hook) hit.knockAngle = undefined;
    const n = resolveHit(W, hit);
    if (hv.pull || hv.hook) {
      // pull victims toward Dante
      for (const e of W.enemies) if (hit.hitSet.has(e.id)) { const a = Math.atan2(this.z - e.z, this.x - e.x); e.kx = Math.cos(a) * Math.abs(kb); e.kz = Math.sin(a) * Math.abs(kb); }
    }
    const art = WEAPON_ART[this.weaponId];
    if (hv.shape === 'line') {
      fx.play(thrustSheet('heavy_' + this.weaponId, art.slashHeavy), { x: this.x + Math.cos(angle) * 3, y: 0.9, z: this.z + Math.sin(angle) * 3, angle, onTop: true, scale: 1.6 });
      fx.line('spark', this.x, this.z, this.x + Math.cos(angle) * hv.length, this.z + Math.sin(angle) * hv.length, 12, { y: 0.9, c0: 0xffe8a0, c1: 0x6a4410 });
    } else {
      const sl = hv.slash;
      fx.play(slashSheet(`${this.weaponId}_heavy`, { ramp: art.slashHeavy, size: sl.size, arc: sl.arc, width: 10, radius: sl.size / 2 - 2, frames: 6 }), {
        x: this.x, y: 0.9, z: this.z + 0.01, angle, onTop: true, scale: sl.scale * (1 + charge * 0.15), follow: this, dz: 0.01,
      });
      fx.ring('spark', this.x, this.z, hv.radius * 0.8, 20, { y: 0.4, c0: 0xffe8a0, c1: 0x6a4410 });
    }
    fx.emit('dust', this.x, 0.1, this.z, 10, { radius: 0.6 });
    fx.shake(0.25 + charge * 0.2);
    fx.lightFlash(this.x, this.z, 0xffe0a0, 2 + charge, 6, 0.2);
    if (charge >= 1) fx.aberration(0.5);
    if (n === 0) this.game.hitstop(0.02);
  }

  // -------------------------------------------- Juicio (dash + heavy) --------------------------------------------
  startDashHeavy() {
    const dh = this.weapon.dashHeavy;
    const angle = this.dashing ? this.st.angle : this.aim;
    this.dashing = false;
    this.state = 'dashHeavy';
    this.st = { t: 0, angle, fired: false, startX: this.x, startZ: this.z };
    this.face(angle);
    this.sprite.play('heavy_' + this.dir, { restart: true, speed: 2 });
    this.sprite.time = 2 / 10;
    this.vx = 0; this.vz = 0;
    this.weaponSwing = { from: -0.3, to: dh.spin ? Math.PI * 4 : 0, t: 0, windup: dh.windup, active: dh.lungeTime || 0.12, rec: dh.recovery };
    Events.emit('attack:special', { kind: 'juicio' });
    this.world.fx.screenFlash(0xfff4cc, 0.2, 0.08);
    this.game.hitstop(0.04);
  }

  updateDashHeavy(dt) {
    const S = this.st, dh = this.weapon.dashHeavy;
    S.t += dt;
    const W = this.world, fx = W.fx;
    if (S.t >= dh.windup && !S.fired) {
      S.fired = true;
      if (dh.lunge) { this.vx = Math.cos(S.angle) * dh.lunge; this.vz = Math.sin(S.angle) * dh.lunge; }
      S.hit = {
        team: 'player', source: this, x: this.x, z: this.z, angle: S.angle, damage: dh.damage, knockback: dh.knockback * this.stats.knockMul, stagger: dh.stagger,
        element: dh.nova ? 'holy' : this.weapon.element, heavy: true, shape: dh.shape, length: dh.length, width: dh.width, radius: dh.radius, crit: 0.25, juicio: true,
      };
      if (dh.nova) {
        resolveHit(W, S.hit);
        fx.play(explosionSheet('holyNova', [0x6a4410, 0xd49a2a, 0xf2c45a, 0xfff4cc, 0xffffff], 64), { x: this.x, y: 0.6, z: this.z + 0.05, scale: 1.6, onTop: true, additive: true });
        fx.ring('holy', this.x, this.z, 1, 28, { y: 0.5, speed: [5, 8] });
      }
      fx.emit('spark', this.x, 0.9, this.z, 10, { dir: S.angle + Math.PI, spread: 0.8 });
    }
    if (S.fired && !dh.nova && S.t < dh.windup + (dh.lungeTime || 0.15)) {
      // sweep hitbox along the lunge path
      const art = WEAPON_ART[this.weaponId];
      S.hit.x = this.x - Math.cos(S.angle) * 1.5; S.hit.z = this.z - Math.sin(S.angle) * 1.5;
      if (dh.shape === 'circle') { S.hit.x = this.x; S.hit.z = this.z; }
      resolveHit(W, S.hit);
      this.spawnAfterimage(0xfff4cc);
      if (!S.streak) { S.streak = true; fx.play(thrustSheet('heavy_' + this.weaponId, art.slashHeavy), { x: this.x + Math.cos(S.angle) * 2.5, y: 0.9, z: this.z + Math.sin(S.angle) * 2.5, angle: S.angle, onTop: true, scale: 1.8, follow: this, dx: Math.cos(S.angle) * 2, dz: Math.sin(S.angle) * 2 }); }
    } else if (S.fired) {
      const k = Math.exp(-16 * dt);
      this.vx *= k; this.vz *= k;
    }
    if (S.t >= dh.windup + (dh.lungeTime || 0.15) + dh.recovery) this.state = 'free';
    if (S.t > dh.windup + (dh.lungeTime || 0.15) + dh.recovery * 0.5 && Input.buffered('dash') && this.dashCharges > 0) { Input.consume('dash'); this.startDash(); }
  }

  // -------------------------------------------- dash --------------------------------------------
  startDash() {
    const mv = this.wantMove();
    let angle = Math.hypot(mv.x, mv.z) > 0.2 ? Math.atan2(mv.z, mv.x) : (this.aimFromMouse ? this.aim : this.moveAngle);
    this.dashCharges--;
    this.dashTimer = 0;
    if (this.chargeTele) { this.chargeTele.cancel = true; this.chargeTele = null; }
    this.state = 'dash';
    this.dashing = true;
    const dur = 0.17;
    this.st = { t: 0, angle, dur, dodged: false };
    const sp = this.stats.dashDist / dur;
    this.vx = Math.cos(angle) * sp; this.vz = Math.sin(angle) * sp;
    this.kx = 0; this.kz = 0;
    this.face(angle);
    this.sprite.play('dash_' + this.dir, { restart: true });
    this.world.fx.emit('dust', this.x, 0.1, this.z, 6, { dir: angle + Math.PI, spread: 1.2 });
    Events.emit('dash', {});
    for (const h of this.hooks.onDash) h(this, 'start');
  }

  updateDash(dt) {
    const S = this.st;
    S.t += dt;
    this.st.afterT = (this.st.afterT || 0) - dt;
    if (this.st.afterT <= 0) { this.st.afterT = 0.035; this.spawnAfterimage(this.tier < 0 ? 0x400818 : this.tier > 0 ? 0xffe0a0 : 0xa0b0d0); }
    if (S.t >= S.dur) {
      this.dashing = false;
      this.lastDashEnd = this.world.time;
      this.state = 'free';
      const k = 0.35;
      this.vx *= k; this.vz *= k;
      for (const h of this.hooks.onDash) h(this, 'end');
      // dash-cancel into buffered actions feels great
      this.tryActions();
      return;
    }
    if (Input.buffered('heavy')) { Input.consume('heavy'); this.startDashHeavy(); return; }
  }

  spawnAfterimage(color) {
    const s = new Sprite(this.sprite.sheet, { pivot: 1, unlit: true });
    s.u.uFrame.value.copy(this.sprite.u.uFrame.value);
    s.setFlip(this.sprite.u.uFlip.value > 0.5);
    s.setTint(color, 0.85);
    s.place(this.x, this.y, this.z - 0.02);
    this.world.root.add(s.mesh);
    this.afterimages.push({ s, t: 0 });
  }

  // -------------------------------------------- special (moral ability) --------------------------------------------
  startSpecial() {
    this.fervor -= this.stats.specialCost;
    const kind = this.tier > 0 ? 'gracia' : this.tier < 0 ? 'pecado' : 'verbo';
    this.state = 'special';
    this.st = { t: 0, kind, angle: this.aim, fired: false };
    this.face(this.aim);
    this.sprite.play('cast_' + this.dir, { restart: true });
    this.vx = 0; this.vz = 0;
    Events.emit('attack:special', { kind });
    this.world.fx.emit(kind === 'pecado' ? 'corruptGlow' : 'holy', this.x, 1.4, this.z, 12, { radius: 0.4 });
  }

  updateSpecial(dt) {
    const S = this.st;
    S.t += dt;
    const W = this.world, fx = W.fx;
    if (!S.fired && S.t >= 0.16) {
      S.fired = true;
      const a = S.angle;
      for (const h of this.hooks.onSpecial) h(this, S.kind);
      if (S.kind === 'gracia') {
        // Rayo de Gracia: piercing lance of light
        const len = W.room ? W.room.raycast(this.x, this.z, a, 16) : 16;
        const hit = { team: 'player', source: this, x: this.x, z: this.z, angle: a, damage: 46, knockback: 6, stagger: 0.5, element: 'holy', heavy: true, shape: 'line', length: len, width: 1.4 };
        resolveHit(W, hit);
        fx.line('holy', this.x, this.z, this.x + Math.cos(a) * len, this.z + Math.sin(a) * len, Math.ceil(len * 4), { y: 0.9, speed: [0.5, 2] });
        fx.play(thrustSheet('gracia', [0x6a4410, 0xf2c45a, 0xfff4cc, 0xffffff]), { x: this.x + Math.cos(a) * len / 2, y: 0.9, z: this.z + Math.sin(a) * len / 2, angle: a, onTop: true, scale: len / 4 });
        fx.lightFlash(this.x + Math.cos(a) * 3, this.z + Math.sin(a) * 3, 0xfff4cc, 3, 9, 0.3);
        fx.screenFlash(0xfff4cc, 0.25, 0.12);
        this.heal(5);
      } else if (S.kind === 'pecado') {
        // Llama del Pecado: dark nova that drinks life
        const hit = { team: 'player', source: this, x: this.x, z: this.z, damage: 40, knockback: 9, stagger: 0.5, element: 'corrupt', heavy: true, shape: 'circle', radius: 3.6, lifesteal: 0.3 };
        resolveHit(W, hit);
        fx.play(explosionSheet('sinNova', [0x050208, 0x200008, 0x6a0a18, 0xc8243a, 0xf05060], 64), { x: this.x, y: 0.6, z: this.z + 0.05, scale: 1.8, onTop: true });
        fx.ring('corruption', this.x, this.z, 1.2, 32, { y: 0.5, speed: [4, 7] });
        fx.screenFlash(0x400010, 0.3, 0.15);
        fx.aberration(0.8);
      } else {
        // Verbo del Poeta: a cone of words that stuns
        const hit = { team: 'player', source: this, x: this.x, z: this.z, angle: a, damage: 22, knockback: 12, stagger: 0.9, element: 'wind', heavy: true, shape: 'arc', range: 5, arc: 1.4, status: { stun: { amount: 1, dur: 1.3 } } };
        resolveHit(W, hit);
        for (let k = 0; k < 24; k++) {
          const aa = a + (Math.random() - 0.5) * 1.3;
          fx.emit('wind', this.x, 1.0, this.z, 1, { dir: aa, spread: 0.1, speed: [7, 12], c0: 0xfff4cc, c1: 0x8a7a54 });
        }
        fx.play(slashSheet('verbo', { ramp: [0x5a4a30, 0xc8b88a, 0xece0b8, 0xffffff], size: 96, arc: 1.4, width: 14, radius: 46 }), { x: this.x, y: 0.9, z: this.z, angle: a, onTop: true, scale: 1.3 });
      }
      fx.shake(0.35);
    }
    if (S.t >= 0.42) this.state = 'free';
  }

  updateHurt(dt) {
    this.st.t += dt;
    this.sprite.play('hurt_' + this.dir);
    this.vx *= Math.exp(-12 * dt); this.vz *= Math.exp(-12 * dt);
    if (this.st.t > 0.16) { this.state = 'free'; this.tryActions(); }
    else if (Input.buffered('dash') && this.dashCharges > 0 && this.st.t > 0.06) { Input.consume('dash'); this.startDash(); }
  }

  updateDead(dt) {
    this.st.t += dt;
    this.vx = 0; this.vz = 0;
    if (this.st.t > 1.0) this.sprite.setDissolve(Math.min(1, (this.st.t - 1.0) / 1.2), 0x6a0a18);
  }

  updateLocked(dt) {
    this.vx = damp(this.vx, 0, 10, dt); this.vz = damp(this.vz, 0, 10, dt);
    if (this.scriptedMove) {
      const m = this.scriptedMove;
      const dx = m.x - this.x, dz = m.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) { this.scriptedMove = null; m.done?.(); }
      else { this.vx = (dx / d) * (m.speed || 4); this.vz = (dz / d) * (m.speed || 4); this.face(Math.atan2(dz, dx)); }
    }
    const sp = Math.hypot(this.vx, this.vz);
    this.sprite.play((sp > 0.6 ? 'run_' : 'idle_') + this.dir);
  }

  updateInteract() {
    let best = null, bd = 1e9;
    if (!this.locked && this.state !== 'dead') {
      for (const it of this.world.interactables) {
        if (!it.active || it.used) continue;
        const d = Math.hypot(it.x - this.x, it.z - this.z);
        if (d < (it.range || 1.6) && d < bd) { bd = d; best = it; }
      }
    }
    if (best !== this.interactTarget) {
      this.interactTarget?.setHighlight?.(false);
      best?.setHighlight?.(true);
      this.interactTarget = best;
      Events.emit('interact:target', { target: best });
    }
  }

  // -------------------------------------------- visuals --------------------------------------------
  updateVisuals(dt) {
    const s = this.sprite;
    s.update(dt);
    // invulnerability blink
    const blink = this.hurtInvuln > 0 && this.state !== 'dead' && Math.floor(this.hurtInvuln * 20) % 2 === 0;
    s.setAlpha(blink ? 0.35 : 1);
    // squash & stretch
    let sx = 1, sy = 1;
    if (this.state === 'dash') { sx = 1.12; sy = 0.9; }
    if (this.state === 'heavy' && !this.st.fired) { const c = this.st.charge || 0; sx = 1 + c * 0.08; sy = 1 - c * 0.08; }
    if (this.state === 'attack' && this.st.phase === 'active') { sx = 1.1; sy = 0.94; }
    s.setScaleXY(sx, sy);
    this.syncSprite();

    // weapon
    this.updateWeaponVisual(dt);

    // halo (virtue) / shadow aura (corruption)
    const tier = this.tier;
    this.halo.mesh.visible = tier >= 1 && this.state !== 'dead';
    if (this.halo.mesh.visible) {
      this.halo.update(dt);
      this.halo.setAlpha(tier >= 2 ? 1 : 0.6);
      this.halo.place(this.x, this.y + 2.5 + Math.sin(this.age * 2) * 0.05, this.z - 0.05);
    }
    this.auraT -= dt;
    if (this.auraT <= 0 && this.state !== 'dead') {
      this.auraT = tier <= -2 ? 0.05 : tier === -1 ? 0.14 : tier >= 2 ? 0.12 : 0.5;
      if (tier < 0) {
        this.world.fx.emit('shadow', this.x, 0.3, this.z, 1, { radius: 0.35 });
        if (tier <= -2) this.world.fx.emit('corruptGlow', this.x, 0.5, this.z, 1, { radius: 0.3 });
      } else if (tier > 0) {
        this.world.fx.emit('holyMote', this.x, 1.2, this.z, 1, { radius: 0.5 });
      }
    }

    // afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.t += dt;
      a.s.setAlpha(Math.max(0, 0.65 - a.t * 3.2));
      if (a.t > 0.2) { a.s.dispose(); this.afterimages.splice(i, 1); }
    }

    // ongoing active hitbox window
    if (this.activeHit) {
      this.activeHit.t -= dt;
      const h = this.activeHit.hit;
      h.x = this.x; h.z = this.z;
      resolveHit(this.world, h);
      if (this.activeHit.t <= 0) this.activeHit = null;
    }

    // low hp post effect
    const lowT = clamp(1 - this.hp / (this.stats.maxHp * 0.3), 0, 1);
    this.game.pipe.post.uLowHp.value = this.alive ? lowT : 0;
  }

  updateWeaponVisual(dt) {
    const ws = this.weaponSprite;
    if (this.state === 'dead' || this.hideWeapon) { ws.mesh.visible = false; return; }
    ws.mesh.visible = true;
    let rel = 0.9; // resting angle relative to facing (held low and forward)
    const sw = this.weaponSwing;
    let baseA = this.state === 'free' || this.state === 'hurt' ? (this.aimFromMouse ? this.aim : this.moveAngle) : (this.st.angle ?? this.aim);
    if (sw) {
      sw.t += dt * this.stats.attackSpeed;
      const tw = sw.windup, ta = sw.active;
      if (sw.charging && this.state === 'heavy' && !this.st.fired) {
        rel = sw.from - Math.sin(this.age * 30) * 0.03 * (this.st.charge || 0);
      } else if (sw.t < tw) rel = lerp(0.9, sw.from, easeOutCubic(sw.t / Math.max(0.001, tw)));
      else if (sw.t < tw + ta) rel = lerp(sw.from, sw.to, easeOutCubic((sw.t - tw) / Math.max(0.001, ta)));
      else if (sw.t < tw + ta + sw.rec) rel = lerp(sw.to, sw.to * 0.85, (sw.t - tw - ta) / sw.rec);
      else { rel = lerp(sw.to * 0.85, 0.9, Math.min(1, (sw.t - tw - ta - sw.rec) * 6)); if (sw.t > tw + ta + sw.rec + 0.2) this.weaponSwing = null; }
      if (this.state === 'free' && sw.t > tw + ta + 0.05 && !sw.charging) { /* returning to rest */ }
    }
    // in screen space: flip side swing for left-facing so arcs mirror naturally
    const flipSide = Math.cos(baseA) < 0 ? -1 : 1;
    const a = baseA + rel * flipSide;
    const hx = this.x + Math.cos(a) * 0.32, hz = this.z + Math.sin(a) * 0.32;
    const sa = Math.atan2(-Math.sin(a) * SIN, Math.cos(a));
    ws.mesh.rotation.z = sa;
    const behind = Math.sin(a) < -0.2; // pointing "up" on screen -> behind Dante
    ws.place(hx, this.y + 0.85 + (this.state === 'dash' ? -0.1 : 0), hz + (behind ? -0.12 : 0.12));
    ws.update(dt);
  }
}

// Consecration zone (Cruz heavy): damages enemies, heals Dante while standing inside.
class Consecration {
  constructor(world, x, z, r, dmg, dur, tick, player) {
    Object.assign(this, { world, x, z, r, dmg, dur, tick, player, t: 0, nt: 0, done: false });
    this.decal = world.fx.decal('sigilHoly', x, z, r, { unlit: true, glow: 1, temp: true, color: 0xfff0b0 });
    this.light = world.lights.add({ x, z, y: 0.6, color: 0xffd890, intensity: 1.2, radius: r + 2.5 });
  }
  update(dt) {
    this.t += dt; this.nt -= dt;
    const W = this.world;
    if (this.nt <= 0) {
      this.nt = this.tick;
      resolveHit(W, { team: 'player', source: this.player, x: this.x, z: this.z, shape: 'circle', radius: this.r, damage: this.dmg, knockback: 0.5, stagger: 0.05, element: 'holy', hitSet: new Set() });
      W.fx.ring('holy', this.x, this.z, this.r * 0.9, 10, { y: 0.2, speed: [0.2, 0.6] });
      if (Math.hypot(this.player.x - this.x, this.player.z - this.z) < this.r) this.player.heal(1.2, true);
    }
    this.decal.material.uniforms.uAlpha.value = Math.min(1, (this.dur - this.t) * 2) * (0.75 + 0.25 * Math.sin(this.t * 8));
    if (this.t >= this.dur) this.destroy();
  }
  destroy() {
    this.done = true;
    this.decal.removeFromParent(); this.decal.material.dispose();
    this.world.lights.remove(this.light);
  }
}
