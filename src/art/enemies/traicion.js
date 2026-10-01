// IX · TRAICIÓN bestiary art — Cocytus: ice-armoured demons, heads frozen in the lake, glacial wraiths.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const ICE = R.ice;
const DEM = [0x06080e, 0x0e1420, 0x182234, 0x24324a, 0x324664, 0x445c80];
const PALE = R.skinPale;
const VOID = [0x0a0410, 0x1e0a2a, 0x3a1450, 0x5c2478];

// DEMONIO CONGELADO — a hulking demon encased in black ice, a glacier for a fist
function congeladoBody(c, e, p) {
  const cx = 22, by = 46, bob = p.bob || 0;
  // legs
  for (const s of [-1, 1]) { c.thickLine(cx + s * 6, by - 16 + bob, cx + s * 8 + (p.step || 0) * s, by - 2, 2.6, DEM[1]); c.rect(cx + s * 8 + (p.step || 0) * s - 2, by - 3, 5, 3, ICE[2]); }
  // torso with ice plates
  c.poly([[cx - 12, by - 36 + bob], [cx + 12, by - 36 + bob], [cx + 9, by - 15 + bob], [cx - 9, by - 15 + bob]], null, (x, y) => {
    const plate = ((x >> 2) + (y >> 2)) % 3 === 0;
    return plate ? pk(ICE, 3.6 - (x - cx + 12) * 0.08, x, y) : pk(DEM, 3.2 - (x - cx + 12) * 0.1, x, y);
  });
  // head: horned, frozen beard of icicles
  const hy = by - 40 + bob;
  c.ellipse(cx + 2, hy, 6, 5.5, null, (nx, ny, x, y) => pk(DEM, 4 - nx - ny, x, y));
  for (let k = 0; k < 5; k++) c.vline(cx - 2 + k * 2, hy + 4, hy + 6 + (k % 3), ICE[5 - (k % 2)]);
  c.line(cx - 3, hy - 3, cx - 9, hy - 10, ICE[4]); c.line(cx + 7, hy - 3, cx + 12, hy - 10, ICE[4]);
  c.set(cx, hy - 1, 0x9ad8ff); c.set(cx + 4, hy - 1, 0x9ad8ff);
  if (e) { e.set(cx, hy - 1, 0x9ad8ff); e.set(cx + 4, hy - 1, 0x9ad8ff); }
  // arms: one ends in a club of ice
  const raise = p.raise || 0;
  c.thickLine(cx - 11, by - 33 + bob, cx - 15, by - 20 + bob, 2, DEM[2]);
  const fx = cx + 15 - raise * 4, fy = by - 22 + bob - raise * 22;
  c.thickLine(cx + 11, by - 33 + bob, fx, fy, 2, DEM[3]);
  c.poly([[fx - 4, fy - 3], [fx + 5, fy - 4], [fx + 6, fy + 5], [fx - 3, fy + 6]], null, (x, y) => pk(ICE, 4 - (x - fx) * 0.15 - (y - fy) * 0.15, x, y));
  if (e) e.set(fx + 1, fy, ICE[4]);
}

export function congeladoSheet() {
  return getSheet('en_congelado', () => new SpriteSheet({
    w: 44, h: 50, emissive: true,
    anims: {
      idle: { frames: 4, fps: 3, draw: (c, e, i) => congeladoBody(c, e, { bob: [0, 0, 1, 1][i] }) },
      move: { frames: 4, fps: 5, draw: (c, e, i) => congeladoBody(c, e, { bob: [0, 1, 0, 1][i], step: i % 2 ? 1 : -1 }) },
      windup: { frames: 3, fps: 4, loop: false, draw: (c, e, i) => congeladoBody(c, e, { bob: -1, raise: 0.4 + i * 0.3 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => congeladoBody(c, e, { bob: 2 - i, raise: 1 - i * 0.5 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => congeladoBody(c, e, { bob: 1 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { congeladoBody(c, e, { bob: i * 2 }); shatter(c, e, i / 5); } },
    },
  }));
}

function shatter(c, e, k) {
  if (k <= 0) return;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.alpha(x, y)) continue;
    const b = bayer((x >> 1) * 3, (y >> 1) * 5);
    if (b < k * 0.95) c.erase(x, y);
    else if (b < k + 0.06) c.set(x, y, ICE[6]);
  }
}

// TRAIDOR EN EL HIELO — only head and shoulders above the lake; tears frozen into shards
function traidorBody(c, e, p) {
  const cx = 14, by = 24;
  c.ellipse(cx, by - 1, 11, 3, null, (nx, ny, x, y) => pk(ICE, 3.8 - ny * 1.5 - nx * 0.4, x, y));
  const rise = p.rise ?? 1;
  const hy = by - 3 - Math.round(7 * rise);
  c.ellipse(cx, hy + 6, 7, 3, null, (nx, ny, x, y) => (y > by - 3 ? null : pk(DEM, 3 - ny - nx, x, y)));
  c.ellipse(cx, hy, 4.4, 5, null, (nx, ny, x, y) => (y > by - 3 ? null : pk(PALE, 3.2 - nx - ny, x, y)));
  c.set(cx - 2, hy, 0x0a1428); c.set(cx + 1, hy, 0x0a1428);
  // frozen tears
  c.vline(cx - 2, hy + 1, hy + 3, ICE[5]); c.vline(cx + 1, hy + 1, hy + 2, ICE[5]);
  if (e) { e.set(cx - 2, hy + 3, ICE[4]); e.set(cx + 1, hy + 2, ICE[4]); }
  // mouth (open when firing)
  if (p.open) c.rect(cx - 1, hy + 3, 2, 2, 0x050a14); else c.hline(cx - 1, cx, hy + 3, PALE[0]);
  // frost crust on the hair
  for (let k = 0; k < 6; k++) c.set(cx - 3 + k, hy - 4 - (k % 2), ICE[5]);
}

export function traidorSheet() {
  return getSheet('en_traidor', () => new SpriteSheet({
    w: 28, h: 26, emissive: true,
    anims: {
      idle: { frames: 4, fps: 3, draw: (c, e, i) => traidorBody(c, e, { rise: 1 - (i % 2) * 0.1 }) },
      move: { frames: 1, fps: 1, draw: (c, e) => traidorBody(c, e, {}) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => traidorBody(c, e, { open: true, rise: 1.1 }) },
      attack: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => traidorBody(c, e, { open: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => traidorBody(c, e, { rise: 0.8 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { traidorBody(c, e, { rise: 1 - i / 5 }); shatter(c, e, i / 6); } },
    },
  }));
}

// ESPECTRO GLACIAL — a drifting cloak of frost with a void at its heart
function glacialBody(c, e, p) {
  const cx = 15, by = 32, bob = p.bob || 0, ph = p.ph || 0;
  for (let y = by - 24; y < by; y++) {
    const t = (y - by + 24) / 24;
    const w = 3 + t * 6 + Math.sin(y * 0.6 + ph) * 0.8;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      if (t > 0.7 && bayer(x, y + ph) < (t - 0.7) * 3) continue;
      c.set(x, y + bob, pk(ICE, 4.2 - t * 2 - (x - cx + w) / (2 * w) * 1.6, x, y));
    }
  }
  // hood void with two cold stars
  c.ellipse(cx, by - 22 + bob, 3.6, 4, VOID[1]);
  c.set(cx - 1, by - 22 + bob, 0xffffff); c.set(cx + 2, by - 22 + bob, 0xffffff);
  if (e) { e.set(cx - 1, by - 22 + bob, 0x9ad8ff); e.set(cx + 2, by - 22 + bob, 0x9ad8ff); }
  // breath
  if (p.breath) for (let k = 0; k < 10; k++) { const x = cx + 3 + k, y = by - 20 + bob + Math.round(Math.sin(k + ph) * (k * 0.3)); c.set(x, y, ICE[5]); if (e) e.set(x, y, ICE[4]); }
}

export function glacialSheet() {
  return getSheet('en_glacial', () => new SpriteSheet({
    w: 32, h: 36, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => glacialBody(c, e, { bob: [0, 1, 1, 0][i], ph: i }) },
      move: { frames: 4, fps: 7, draw: (c, e, i) => glacialBody(c, e, { bob: [0, 1, 1, 0][i], ph: i * 2 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => glacialBody(c, e, { bob: -1, ph: i }) },
      attack: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => glacialBody(c, e, { bob: 0, ph: i * 2, breath: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => glacialBody(c, e, { bob: 2 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { glacialBody(c, e, { bob: i, ph: i }); shatter(c, e, i / 5); } },
    },
  }));
}
