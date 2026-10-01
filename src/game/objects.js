// In-world objects: pickups, reward shrines, doors, NPCs, altars, shop pedestals.
import { Sprite } from '../render/sprite.js';
import { projectileSheet, pillarSheet } from '../art/fx.js';
import { iconSheet } from '../art/icons.js';
import { archSheet, portalSheet, barsSheet } from '../art/doors.js';
import { propSheet } from '../art/props.js';
import { R } from '../art/palette.js';
import { Events } from '../core/events.js';
import { dist, damp } from '../core/math.js';
import { TZ } from './room.js';

// ------------------------------------------------------------------------------------------
// Pickups (gold, essence, fragment, heal, cursed gold)
// ------------------------------------------------------------------------------------------
const PICK = {
  gold: { sheet: () => projectileSheet('coin', R.gold, 10), light: null },
  cursedGold: { sheet: () => projectileSheet('coin', [0x3a0408, 0x6a0a18, 0xd49a2a, 0xf05060, 0xffe0a0], 10), light: 0xc0203a },
  essence: { sheet: () => projectileSheet('orb', [0x16304e, 0x4a84a8, 0x9ad8ff, 0xffffff], 9), light: 0x7ad0ff },
  fragment: { sheet: () => iconSheet('fragment'), light: 0xf2c45a },
  heal: { sheet: () => iconSheet('heal', 0xff8080), light: 0xff6060 },
};

export class Pickup {
  constructor(world, kind, x, z, amount = 1, o = {}) {
    this.world = world; this.kind = kind; this.amount = amount;
    this.x = x; this.z = z; this.y = 0.6;
    const a = Math.random() * Math.PI * 2, s = o.burst ?? (1.5 + Math.random() * 3);
    this.vx = Math.cos(a) * s; this.vz = Math.sin(a) * s; this.vy = 4 + Math.random() * 2;
    this.t = 0; this.done = false;
    this.magnet = o.magnet ?? false;
    this.delay = o.delay ?? 0.35;
    const def = PICK[kind];
    this.sprite = new Sprite(def.sheet(), { anim: kind === 'fragment' || kind === 'heal' ? 'idle' : 'fly', pivot: 6, unlit: true });
    this.sprite.time = Math.random();
    world.root.add(this.sprite.mesh);
    if (def.light) this.light = world.lights.add({ x, z, y: 0.6, color: def.light, intensity: 0.5, radius: 2 });
  }
  update(dt) {
    this.t += dt;
    const p = this.world.player;
    // bounce
    this.vy -= 22 * dt;
    this.y += this.vy * dt;
    if (this.y < 0.25) { this.y = 0.25; this.vy = Math.abs(this.vy) * 0.35; this.vx *= 0.6; this.vz *= 0.6; }
    const room = this.world.room;
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    if (room && room.free(nx, nz, 0.15)) { this.x = nx; this.z = nz; } else { this.vx *= -0.5; this.vz *= -0.5; }
    this.vx *= Math.exp(-2 * dt); this.vz *= Math.exp(-2 * dt);
    if (p && p.alive && this.t > this.delay) {
      const d = dist(this.x, this.z, p.x, p.z);
      if (this.magnet || d < 2.6) {
        const k = this.magnet ? 14 : 10;
        this.x = damp(this.x, p.x, k * (this.magnet ? 0.6 : 1), dt);
        this.z = damp(this.z, p.z, k * (this.magnet ? 0.6 : 1), dt);
      }
      if (d < 0.55) this.collect();
    }
    this.sprite.update(dt);
    this.sprite.place(this.x, this.y + Math.sin(this.t * 4) * 0.05, this.z);
    if (this.light) { this.light.x = this.x; this.light.z = this.z; }
  }
  collect() {
    if (this.done) return;
    this.done = true;
    const W = this.world, run = W.game.run, p = W.player;
    const fx = W.fx;
    switch (this.kind) {
      case 'gold': run?.addGold(this.amount, p); fx.emit('gold', this.x, 0.6, this.z, 3); break;
      case 'cursedGold':
        run?.addGold(this.amount * 2, p);
        run?.moral.add('sin', 1, 'cursedGold');
        p.applyStatus('curse', 1, 4);
        fx.emit('corruptGlow', this.x, 0.6, this.z, 6);
        W.game.ui?.toast('Oro maldito: +' + this.amount * 2 + ' oro · la codicia te mancha', 'sin');
        break;
      case 'essence': run?.addEssence(this.amount, p); fx.emit('holy', this.x, 0.6, this.z, 4, { c0: 0xffffff, c1: 0x4a84a8 }); break;
      case 'fragment': run?.addFragment(this.amount); fx.emit('holy', this.x, 0.8, this.z, 12); W.game.ui?.toast('Fragmento de Reliquia', 'gold'); break;
      case 'heal': p.heal(this.amount); break;
    }
    Events.emit('pickup', { kind: this.kind, amount: this.amount });
    this.destroy();
  }
  destroy() {
    this.done = true;
    this.sprite.dispose();
    if (this.light) this.world.lights.remove(this.light);
  }
}

// ------------------------------------------------------------------------------------------
// Interactable base
// ------------------------------------------------------------------------------------------
export class Interactable {
  constructor(world, x, z, o = {}) {
    this.world = world; this.x = x; this.z = z;
    this.range = o.range ?? 1.6;
    this.active = o.active ?? true;
    this.used = false;
    this.prompt = o.prompt || 'Interactuar';
    this.sprites = [];
    this.t = Math.random() * 10;
    this.onInteract = o.onInteract;
  }
  addSprite(s, x, y, z) { s.place(x ?? this.x, y ?? 0, z ?? this.z); this.world.root.add(s.mesh); this.sprites.push(s); return s; }
  setHighlight(on) {
    this.highlight = on;
    for (const s of this.sprites) if (!s.noOutline) s.setOutline(0xf2c45a, on ? 1 : 0);
  }
  interact(p) { this.onInteract?.(p, this); }
  update(dt) { this.t += dt; for (const s of this.sprites) s.update(dt); }
  destroy() {
    for (const s of this.sprites) s.dispose();
    if (this.light) this.world.lights.remove(this.light);
    this.sprites = [];
    const i = this.world.interactables.indexOf(this);
    if (i >= 0) this.world.interactables.splice(i, 1);
  }
}

// ------------------------------------------------------------------------------------------
// Door to another node. state: locked | open | sealedV | sealedS | hidden
// ------------------------------------------------------------------------------------------
export class Door extends Interactable {
  constructor(world, d, o) {
    super(world, d.x, d.z, { range: 1.5, prompt: o.prompt || 'Entrar' });
    this.door = d; this.node = o.node; this.state = o.state || 'locked'; this.kind = o.kind || 'combat';
    this.icon = o.icon; this.label = o.label;
    const side = d.side;
    const zFront = side === 'N' ? d.z + 0.06 : d.z;
    this.zFront = zFront;
    this.arch = this.addSprite(new Sprite(archSheet(o.circle), { anim: 'idle', pivot: 2, minLight: 0.3 }), d.x, 0, zFront);
    this.arch.noOutline = true;
    this.portal = this.addSprite(new Sprite(portalSheet(this.kind), { anim: 'idle', pivot: 2, unlit: true }), d.x, 0, zFront + 0.02);
    this.portal.noOutline = true;
    this.bars = null;
    if (o.icon) {
      this.iconSprite = this.addSprite(new Sprite(iconSheet(o.icon), { anim: 'idle', pivot: 9, unlit: true }), d.x, 3.9, zFront + 0.05);
    }
    this.light = world.lights.add({ x: d.x, z: zFront + 0.6, y: 1.4, color: (this.kind === 'altarV' || this.kind === 'exit') ? 0xf2c45a : this.kind === 'soul' ? 0x9ab8d8 : this.kind === 'boss' ? 0xff2010 : 0xc8243a, intensity: 0, radius: 4.5 });
    this.setState(this.state);
  }
  setState(s) {
    this.state = s;
    if (this.bars) { const i = this.sprites.indexOf(this.bars); if (i >= 0) this.sprites.splice(i, 1); this.bars.dispose(); this.bars = null; }
    const hidden = s === 'hidden';
    for (const sp of this.sprites) sp.mesh.visible = !hidden;
    this.active = s === 'open';
    this.portal.mesh.visible = !hidden && s !== 'locked';
    this.portal.setAlpha(s === 'open' ? 1 : 0.5);
    if (s === 'locked' || s === 'sealedV' || s === 'sealedS') {
      this.bars = this.addSprite(new Sprite(barsSheet(s === 'locked' ? 'locked' : s === 'sealedV' ? 'virtue' : 'sin'), { anim: 'idle', pivot: 2, minLight: 0.4 }), this.x, 0, this.zFront + 0.04);
      this.bars.noOutline = true;
    }
    this.light.intensity = s === 'open' ? 1.3 : s === 'hidden' ? 0 : 0.35;
    if (this.iconSprite) this.iconSprite.setAlpha(s === 'open' ? 1 : 0.55);
  }
  reveal() {
    this.setState('open');
    const fx = this.world.fx;
    fx.emit('holy', this.x, 1.5, this.zFront + 0.3, 30, { radius: 1.2, c0: 0xe0b0f0, c1: 0x3c1a4a });
    Events.emit('door:reveal', {});
  }
  update(dt) {
    super.update(dt);
    if (this.iconSprite) this.iconSprite.place(this.x, 3.9 + Math.sin(this.t * 2.5) * 0.12, this.zFront + 0.05);
    // walk-in to enter (doors don't need a button press)
    const p = this.world.player;
    if (this.state === 'open' && p && p.alive && !p.locked) {
      const dz = p.z - this.z, dx = p.x - this.x;
      if (Math.abs(dx) < 1.1 && dz < 0.9 && dz > -2) this.onEnter?.(this);
    }
  }
}

// ------------------------------------------------------------------------------------------
// Reward shrine: the room reward manifests after clearing it
// ------------------------------------------------------------------------------------------
export class RewardShrine extends Interactable {
  constructor(world, x, z, reward, onTake) {
    super(world, x, z, { range: 1.4, prompt: 'Tomar' });
    this.reward = reward;
    const icon = { gold: 'coin', essence: 'essence', fragment: 'fragment', boonV: 'virtue', boonS: 'sin', heal: 'heal', relic: 'relic' }[reward] || 'relic';
    this.icon = this.addSprite(new Sprite(iconSheet(icon), { anim: 'idle', pivot: 9, unlit: true, scale: 1.4 }), x, 1.2, z);
    const col = reward === 'boonS' ? 0xc8243a : reward === 'boonV' ? 0xf2c45a : reward === 'essence' ? 0x7ad0ff : reward === 'heal' ? 0xff6060 : 0xf2c45a;
    this.color = col;
    this.light = world.lights.add({ x, z, y: 1.2, color: col, intensity: 1.4, radius: 5 });
    this.decal = world.fx.decal(reward === 'boonS' ? 'sigilSin' : 'sigilHoly', x, z, 1.1, { unlit: true, temp: true, color: col, alpha: 0.9 });
    this.onTake = onTake;
    world.fx.play(pillarSheet(reward === 'boonS' ? 'sin' : 'holy', reward === 'boonS' ? R.crimson : R.holy), { x, y: 0, z: z + 0.02, pivot: 0 });
    Events.emit('reward:appear', { reward });
  }
  update(dt) {
    super.update(dt);
    this.icon.place(this.x, 1.1 + Math.sin(this.t * 2.2) * 0.15, this.z);
    if (Math.random() < dt * 6) this.world.fx.emit(this.reward === 'boonS' ? 'corruptGlow' : 'holyMote', this.x, 0.6, this.z, 1, { radius: 0.5 });
  }
  interact(p) {
    if (this.used) return;
    this.used = true;
    this.onTake?.(this);
    this.destroy();
  }
  destroy() {
    super.destroy();
    if (this.decal) { this.decal.removeFromParent(); this.decal.material.dispose(); this.decal = null; }
  }
}

// ------------------------------------------------------------------------------------------
// NPC (souls, Virgil, ferrymen, merchant)
// ------------------------------------------------------------------------------------------
export class NPC extends Interactable {
  constructor(world, x, z, o) {
    super(world, x, z, { range: o.range ?? 1.9, prompt: o.prompt || 'Hablar' });
    this.name = o.name; this.id = o.id;
    this.sprite = this.addSprite(new Sprite(o.sheet, { anim: o.anim || 'idle_down', pivot: o.pivot ?? 1, minLight: 0.5, scale: o.scale ?? 1 }), x, 0, z);
    if (o.flip) this.sprite.setFlip(true);
    this.onInteract = o.onInteract;
    this.hover = o.hover || 0;
    if (o.light) this.light = world.lights.add({ x, z: z + 0.6, y: 1.8, color: o.light, intensity: o.lightIntensity ?? 0.9, radius: o.lightRadius ?? 4 });
    this.aura = o.aura;
    this.world.addObstacle(x, z, 0.4);
  }
  update(dt) {
    super.update(dt);
    if (this.hover) this.sprite.place(this.x, Math.sin(this.t * 1.6) * this.hover + this.hover, this.z);
    if (this.aura && Math.random() < dt * 5) this.world.fx.emit(this.aura, this.x, 0.8, this.z, 1, { radius: 0.4 });
  }
  interact(p) { this.onInteract?.(p, this); }
}

// ------------------------------------------------------------------------------------------
// Prop-based interactable (altars, pedestals, weapon rack, shrine, stairs)
// ------------------------------------------------------------------------------------------
export class PropInteract extends Interactable {
  constructor(world, x, z, o) {
    super(world, x, z, { range: o.range ?? 1.8, prompt: o.prompt });
    this.sprite = this.addSprite(new Sprite(propSheet(o.prop, o.ctx || {}), { anim: 'idle', pivot: 2, minLight: 0.4 }), x, 0, z);
    this.onInteract = o.onInteract;
    if (o.solid) world.addObstacle(x, z, o.solid);
    if (o.light) this.light = world.lights.add({ x, z: z + 0.4, y: o.light.y ?? 1.5, color: o.light.color, intensity: o.light.intensity ?? 1, radius: o.light.radius ?? 5, flicker: o.light.flicker ?? 0.2 });
    this.emit = o.emit;
  }
  update(dt) {
    super.update(dt);
    if (this.emit && Math.random() < dt * (this.emit.rate || 3)) this.world.fx.emit(this.emit.preset, this.x, this.emit.y ?? 1, this.z, 1, { radius: this.emit.radius ?? 0.4 });
  }
}

// Shop / relic pedestal with a floating item icon and price
export class Pedestal extends Interactable {
  constructor(world, x, z, o) {
    super(world, x, z, { range: 1.3, prompt: o.prompt || 'Comprar' });
    this.item = o.item; this.price = o.price ?? 0;
    this.base = this.addSprite(new Sprite(propSheet('urn', { clay: [0x14121a, 0x26222e, 0x3a3444, 0x544c60, 0x6e6680] }), { anim: 'idle', pivot: 2, minLight: 0.4 }), x, 0, z);
    this.base.noOutline = true;
    this.icon = this.addSprite(new Sprite(iconSheet(o.icon), { anim: 'idle', pivot: 9, unlit: true, scale: 1.2 }), x, 1.6, z + 0.02);
    this.onInteract = o.onInteract;
    this.light = world.lights.add({ x, z: z + 0.3, y: 1.6, color: o.color ?? 0xf2c45a, intensity: 0.8, radius: 3 });
    world.addObstacle(x, z, 0.35);
  }
  update(dt) {
    super.update(dt);
    if (this.icon) this.icon.place(this.x, 1.6 + Math.sin(this.t * 2) * 0.1, this.z + 0.02);
  }
  sold() {
    this.used = true;
    const i = this.sprites.indexOf(this.icon);
    if (i >= 0) this.sprites.splice(i, 1);
    this.icon.dispose(); this.icon = null;
    this.light.intensity = 0.2;
  }
}
