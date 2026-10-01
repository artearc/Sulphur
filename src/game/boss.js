// Boss base: phases, pattern scheduler, intro hooks, boss bar, defeat sequence.
// A boss def extends the enemy def with:
//   { boss: true, title, phases: [0.6, 0.3], patterns: { phaseIndex: [ { id, weight, cd, range?: [min,max], run: fn(b, dt, S) => 'done'|undefined } ] },
//     intro?: [dialogue steps], outro?: [dialogue steps], onPhase?(b, phase), arena?(world, b) }
import { Enemy, registerEnemy } from './enemy.js';
import { Events } from '../core/events.js';
import { explosionSheet, pillarSheet } from '../art/fx.js';
import { R } from '../art/palette.js';

export class Boss extends Enemy {
  constructor(world, def, o = {}) {
    super(world, def, { ...o, noSpawnFx: true });
    this.isBoss = !def.miniboss;
    this.isMiniboss = !!def.miniboss;
    this.poise = def.poise ?? 0.85;
    this.knockMul = def.knockMul ?? 0.15;
    this.phase = 0;
    this.phases = def.phases || [];
    this.current = null;
    this.patternCd = {};
    this.idleT = def.firstDelay ?? 1.2;
    this.active = false;   // starts after intro
    this.sprite.setAlpha(1);
    this.untargetable = true;
    this.state = 'idle';
    this.spawnDur = 0.01;
    this.deathDur = def.deathDur ?? 3.2;
    this.dying = false;
  }

  activate() {
    this.active = true;
    this.untargetable = false;
    const ui = this.world.game.ui;
    if (this.isBoss || this.def.showBar) ui?.bossShow(this.def.name, this.def.title, this.phases);
    Events.emit(this.isBoss ? 'boss:appear' : 'miniboss:appear', { boss: this });
  }

  update(dt) {
    if (!this.active && !this.dying) {
      this.age += dt;
      this.sprite.update(dt);
      this.updateAura(dt);
      this.syncSprite(this.ai.hover || 0);
      return;
    }
    super.update(dt);
    if (this.alive && (this.isBoss || this.def.showBar)) this.world.game.ui?.bossSet(this.hp / this.maxHp);
  }

  onHurt(hit, dmg) {
    super.onHurt(hit, dmg);
    const pct = this.hp / this.maxHp;
    while (this.phase < this.phases.length && pct <= this.phases[this.phase]) {
      this.phase++;
      this.phaseChange();
    }
  }

  phaseChange() {
    const W = this.world, fx = W.fx;
    if (this.current?.S?.tele) this.current.S.tele.cancel = true;
    this.current = null;
    this.ai = { ...this.ai, melee: null, charge: null, volley: null };
    this.idleT = 1.4;
    this.invulnT = 1.2;
    this.hitstun = 0;
    fx.shake(0.6);
    fx.screenFlash(0xffffff, 0.35, 0.2);
    fx.aberration(1);
    fx.ring(this.def.phaseFx || 'corruptGlow', this.x, this.z, 1.5, 40, { speed: [6, 10] });
    W.game.slowmo(0.35, 0.6);
    // shockwave pushes the player away
    const p = W.player;
    const a = Math.atan2(p.z - this.z, p.x - this.x);
    p.knock(a, 14);
    this.def.onPhase?.(this, this.phase);
    Events.emit('boss:phase', { boss: this, phase: this.phase });
  }

  // invulnerable during phase transitions
  damageTakenMul() { return this.invulnT > 0 ? 0 : 1; }

  die(hit) {
    if (this.dying) return;
    this.dying = true;
    this.state = 'dead';
    this.stateT = 0;
    this.untargetable = true;
    this.current = null;
    const W = this.world, fx = W.fx;
    W.game.ui?.bossHide();
    W.game.slowmo(0.2, 1.4);
    fx.screenFlash(0xffffff, 0.8, 0.5);
    fx.shake(1);
    fx.aberration(1.2);
    for (const e of W.enemies) if (e !== this && e.alive) { e.alive = false; e.noLoot = true; e.die({}); }
    for (const pr of W.projectiles) if (pr.team === 'enemy') pr.expire(false);
    Events.emit(this.isBoss ? 'boss:death' : 'miniboss:death', { boss: this });
    this.def.onDeath?.(this, hit);
    this.deathBursts = 0;
  }

  updateDeath(dt) {
    const W = this.world, fx = W.fx;
    const t = this.stateT;
    this.sprite.update(dt);
    this.sprite.flash(0xffffff, 0.02);
    // sequence of explosions, then a final pillar and dissolve
    if (t < this.deathDur * 0.7 && Math.floor(t * 6) > this.deathBursts) {
      this.deathBursts++;
      const ox = (Math.random() - 0.5) * this.radius * 3, oz = (Math.random() - 0.5) * this.radius * 1.5;
      fx.play(explosionSheet(this.def.deathKey || 'bossdeath', this.def.deathRamp || R.ember, 48), { x: this.x + ox, y: 1 + Math.random() * 2, z: this.z + oz + 0.1, scale: 1 + Math.random() * 0.6, onTop: true });
      fx.emit(this.def.deathPreset || 'blood', this.x + ox, 1.5, this.z + oz, 14, { speed: [3, 7] });
      fx.shake(0.3);
      Events.emit('explosion', {});
    }
    const k = Math.max(0, (t - this.deathDur * 0.55) / (this.deathDur * 0.45));
    this.sprite.setDissolve(k, this.def.deathEdge ?? 0xffa040);
    if (t > this.deathDur * 0.55 && !this.pillarDone) {
      this.pillarDone = true;
      fx.play(pillarSheet('boss', this.def.pillarRamp || R.holy, 40, 120), { x: this.x, y: 0, z: this.z + 0.2, pivot: 0, scale: 1.4 });
      fx.screenFlash(0xfff4cc, 0.6, 0.4);
    }
    if (this.shadow) this.shadow.visible = k < 0.5;
    this.syncSprite(this.ai.hover || 0);
    if (t >= this.deathDur) {
      this.destroy();
      if (this.isBoss) W.controller?.onBossDefeated?.(this);
      else W.controller?.onMinibossDefeated?.(this);
    }
  }
}

// Boss think: runs patterns from the current phase's table.
export function bossThink(b, dt) {
  const def = b.def;
  if (b.invulnT > 0) b.invulnT -= dt;
  if (b.current) {
    const r = b.current.run(b, dt, b.current.S);
    b.current.S.t += dt;
    if (r === 'done') { b.patternCd[b.current.id] = b.current.cd; b.current = null; b.idleT = def.idleBetween ?? 0.55; }
    return;
  }
  for (const k in b.patternCd) b.patternCd[k] -= dt;
  b.idleT -= dt;
  def.idle?.(b, dt);
  if (b.idleT > 0) return;
  const table = (def.patterns[b.phase] || def.patterns[0]).filter((p) => (b.patternCd[p.id] || 0) <= 0 && (!p.range || (b.distToTarget() >= p.range[0] && b.distToTarget() <= p.range[1])) && (!p.cond || p.cond(b)));
  if (!table.length) { def.idle?.(b, dt); return; }
  let total = 0;
  for (const p of table) total += p.weight ?? 1;
  let r = Math.random() * total;
  let pick = table[0];
  for (const p of table) { r -= p.weight ?? 1; if (r <= 0) { pick = p; break; } }
  b.current = { id: pick.id, run: pick.run, cd: pick.cd ?? 2, S: { t: 0 } };
  Events.emit('boss:pattern', { boss: b, id: pick.id });
}

export function registerBoss(def) {
  registerEnemy({ ...def, cls: Boss, think: def.think || bossThink });
}
