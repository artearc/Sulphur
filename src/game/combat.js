// Hit resolution + the full impact feedback stack:
// hitstop, flash, knockback, hitstun, element particles, blood, decals, numbers, camera, audio hooks.
import { Events } from '../core/events.js';
import { angleTo, angleDiff, dist2, segCircle } from '../core/math.js';
import { impactSheet } from '../art/fx.js';
import { R } from '../art/palette.js';

export const ELEMENT_FX = {
  physical: { preset: 'spark', c0: 0xfff4cc, c1: 0xb8a060, impact: R.holy },
  holy: { preset: 'holy', c0: 0xffffff, c1: 0xf2c45a, impact: R.gold.slice(2) },
  fire: { preset: 'fire', c0: 0xffd060, c1: 0x801000, impact: R.ember.slice(1) },
  ice: { preset: 'ice', c0: 0xffffff, c1: 0x4a84a8, impact: R.ice.slice(2) },
  corrupt: { preset: 'corruptGlow', c0: 0xf05060, c1: 0x200008, impact: R.crimson.slice(1) },
  poison: { preset: 'poison', c0: 0xc8d050, c1: 0x24320e, impact: R.poison.slice(1) },
  wind: { preset: 'wind', c0: 0xffffff, c1: 0x8a70b0, impact: [0x4a3a6a, 0x8a70b0, 0xd0c0ff, 0xffffff] },
  gold: { preset: 'gold', c0: 0xffe8a0, c1: 0xa06c18, impact: R.gold.slice(2) },
};

const BLOOD = {
  blood: { preset: 'blood', mist: 'bloodMist', c0: 0x8a1016, c1: 0x3a0408 },
  ichor: { preset: 'blood', mist: 'shadow', c0: 0x1a0a20, c1: 0x050208 },
  ecto: { preset: 'soul', mist: 'soul', c0: 0xdcecf4, c1: 0x2e4054, noStain: true },
  bile: { preset: 'bile', mist: 'poison', c0: 0xc8d050, c1: 0x3e5216 },
  gold: { preset: 'gold', mist: 'gold', c0: 0xffe8a0, c1: 0xa06c18, noStain: true },
  ember: { preset: 'ember', mist: 'fire', c0: 0xffb040, c1: 0x601000, noStain: true },
  ice: { preset: 'ice', mist: 'frost', c0: 0xffffff, c1: 0x4a84a8, noStain: true },
  smoke: { preset: 'smoke', mist: 'smoke', c0: 0x2a2224, c1: 0x0a0809, noStain: true },
};

function inShape(hit, t) {
  const r = t.radius;
  switch (hit.shape) {
    case 'circle':
      return dist2(hit.x, hit.z, t.x, t.z) <= (hit.radius + r) ** 2;
    case 'ring': {
      const d = Math.sqrt(dist2(hit.x, hit.z, t.x, t.z));
      return d <= hit.radius + r && d >= (hit.inner || 0) - r;
    }
    case 'arc': {
      const d2 = dist2(hit.x, hit.z, t.x, t.z);
      if (d2 > (hit.range + r) ** 2) return false;
      if (d2 < (r + 0.5) ** 2) return true;
      const a = angleTo(hit.x, hit.z, t.x, t.z);
      const slack = Math.atan2(r, Math.sqrt(d2));
      return Math.abs(angleDiff(hit.angle, a)) <= hit.arc / 2 + slack;
    }
    case 'line': {
      const x1 = hit.x + Math.cos(hit.angle) * hit.length, z1 = hit.z + Math.sin(hit.angle) * hit.length;
      return segCircle(hit.x, hit.z, x1, z1, t.x, t.z, r + (hit.width || 0.5) / 2);
    }
    default: return false;
  }
}

// Apply an area hit to every valid target. Returns number of targets hit.
export function resolveHit(world, hit) {
  const targets = hit.team === 'player' ? world.enemies : [world.player, ...world.allies];
  let n = 0;
  hit.hitSet ||= new Set();
  for (const t of targets) {
    if (!t || !t.alive || hit.hitSet.has(t.id)) continue;
    if (t.untargetable) continue;
    if (!inShape(hit, t)) continue;
    if (hit.requireLos && world.room && !world.room.los(hit.x, hit.z, t.x, t.z)) continue;
    hit.hitSet.add(t.id);
    applyHit(world, hit, t);
    n++;
    if (hit.maxTargets && n >= hit.maxTargets) break;
  }
  // props (urns etc.) breakable by the player
  if (hit.team === 'player' && world.breakables) {
    for (const b of world.breakables) if (!b.broken && inShape(hit, b)) world.breakProp(b, hit);
  }
  return n;
}

export function applyHit(world, hit, t) {
  const src = hit.source;
  const fx = world.fx;
  const ang = hit.knockAngle ?? (src ? angleTo(src.x, src.z, t.x, t.z) : hit.angle ?? 0);
  // player i-frames
  if (t === world.player) {
    if (!t.canBeHit()) { if (t.dashing) t.onDodge?.(hit); return 0; }
  }
  let dmg = hit.damage;
  let crit = false;
  if (hit.team === 'player' && !hit.env) {
    const P = world.player;
    dmg = P.modifyOutgoing(dmg, hit, t);
    if (Math.random() < (hit.crit ?? P.stats.crit)) { crit = true; dmg *= P.stats.critMul; }
  }
  const takenMul = t.damageTakenMul ? t.damageTakenMul(hit) : 1;
  if (takenMul <= 0) {
    world.fx.emit('spark', t.x, 1.2, t.z, 4, { c0: 0xb0b0c0, c1: 0x404050 });
    return 0;
  }
  dmg = dmg * (1 - (t.armor || 0)) * takenMul;
  if (t.status.curse > 0) dmg *= 1.25;
  if (t.status.frozen > 0 && hit.heavy) dmg *= 1.5;
  dmg = Math.max(1, Math.round(dmg));

  t.hp -= dmg;
  t.lastHit = hit;
  const heavy = !!hit.heavy;

  // knockback & hitstun (poise resists)
  const kb = (hit.knockback ?? 3) * (t.knockMul ?? 1);
  if (kb > 0) t.knock(ang, kb);
  const stun = (hit.stagger ?? (heavy ? 0.35 : 0.18)) * (1 - (t.poise || 0));
  t.hitstun = Math.max(t.hitstun, stun);
  t.onHurt?.(hit, dmg);

  // statuses
  if (hit.status) for (const [k, v] of Object.entries(hit.status)) t.applyStatus(k, v.amount ?? v, v.dur);

  // ---------- sensory feedback ----------
  const elem = ELEMENT_FX[hit.element || 'physical'] || ELEMENT_FX.physical;
  t.sprite?.flash(t === world.player ? 0xff2020 : 0xffffff, heavy ? 0.12 : 0.08);
  const hx = t.x - Math.cos(ang) * t.radius * 0.5, hz = t.z - Math.sin(ang) * t.radius * 0.5;
  fx.emit(elem.preset, hx, 0.9, hz, heavy ? 14 : 7, { dir: ang, spread: 1.4, c0: elem.c0, c1: elem.c1 });
  const b = t === world.player ? BLOOD.blood : BLOOD[t.bloodType || 'blood'];
  if (b) {
    fx.emit(b.preset, t.x, 0.9, t.z, heavy ? 10 : 5, { dir: ang, spread: 1.2, c0: b.c0, c1: b.c1, stain: !b.noStain });
    fx.emit(b.mist, t.x, 0.9, t.z, heavy ? 5 : 2, { dir: ang, spread: 1.5 });
  }
  fx.play(impactSheet(hit.element || 'physical', elem.impact, heavy ? 32 : 24), { x: hx, y: 0.9, z: hz + 0.05, onTop: true, additive: false });
  fx.lightFlash(hx, hz, elem.c0, heavy ? 2.6 : 1.4, heavy ? 5 : 3.5, 0.12);

  if (t === world.player) {
    fx.number(dmg, t.x, t.z, { color: 0xff4040, y: 2.0 });
    world.game.hitstop(0.09);
    fx.shake(0.45);
    fx.screenFlash(0x8a0010, 0.28, 0.16);
    fx.aberration(0.9);
    Events.emit('player:hurt', { dmg, hit });
  } else {
    fx.number(dmg, t.x, t.z, crit ? { color: 0xffe080, color2: 0xf07818, big: true } : heavy ? { color: 0xfff4cc } : { color: 0xffffff, color2: 0xa8a0a0 });
    world.game.hitstop(heavy ? 0.075 : crit ? 0.06 : 0.035);
    fx.shake(heavy ? 0.28 : 0.1);
    fx.kick(ang, heavy ? 0.18 : 0.07);
    if (heavy) fx.aberration(0.4);
    Events.emit(heavy ? 'hit:heavy' : 'hit', { target: t, dmg, crit, element: hit.element });
  }
  hit.onHit?.(t, dmg);
  if (hit.team === 'player' && !hit.env) world.player.onDealtDamage(t, dmg, hit);

  if (t.hp <= 0 && t.alive) {
    t.alive = false;
    t.die?.(hit);
    if (t !== world.player) {
      world.onEnemyKilled(t, hit);
    }
  }
  return dmg;
}

// Projectile helper (data only — see projectiles.js)
export function makeHit(o) {
  return { shape: 'circle', damage: 10, knockback: 3, element: 'physical', team: 'player', ...o };
}
