// VIII · FRAUDE bestiary art — Malebolge: masks, hooks, serpents. Teal illusion over black pitch.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';
import { demonBody } from './minibosses_b.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const TEAL = R.teal;
const VIO = [0x1a0a2a, 0x2e1450, 0x4a2280, 0x7440b0, 0xa070e0];
const CLOAK = [0x050608, 0x0c1014, 0x14191e, 0x1c242a, 0x263038];
const SCALE = [0x041210, 0x0a2420, 0x123c34, 0x1e5c4c, 0x2e8468, 0x52b48a];

// FALSARIO — true form: a hollow cloak wearing a gilded smiling mask; serpent arms beneath
function falsarioBody(c, e, p) {
  const cx = 14, by = 32, bob = p.bob || 0;
  c.poly([[cx - 4, by - 22 + bob], [cx + 4, by - 22 + bob], [cx + 7, by - 1], [cx - 7, by - 1]], null, (x, y) => {
    let f = 3 - (x - cx + 7) * 0.18;
    if ((x * 2 + y) % 9 === 0) f += 1.2;
    return pk(CLOAK, f, x, y);
  });
  // snake arms
  const reach = p.reach || 0;
  for (const s of [-1, 1]) for (let k = 0; k < 9 + reach * 4; k++) {
    const x = cx + s * (3 + k), y = by - 16 + bob + Math.round(Math.sin(k * 0.9 + (p.ph || 0)) * 1.5) - reach * k * 0.3;
    c.set(x, y, SCALE[3 + (k % 2)]); c.set(x, y + 1, SCALE[2]);
  }
  // the mask (gilded, smiling) — floats slightly off the void face
  const hy = by - 24 + bob;
  c.ellipse(cx, hy, 4, 4.6, CLOAK[0]);
  c.ellipse(cx + 1, hy, 3.2, 3.8, null, (nx, ny, x, y) => pk(R.gold, 3.6 - nx - ny, x, y));
  c.set(cx, hy - 1, 0x000000); c.set(cx + 2, hy - 1, 0x000000);
  c.hline(cx - 1, cx + 3, hy + 2, R.gold[1]); c.set(cx - 1, hy + 1, R.gold[1]); c.set(cx + 3, hy + 1, R.gold[1]);
  const glow = p.eyes ?? 0x40e0c0;
  if (e) { e.set(cx, hy - 1, glow); e.set(cx + 2, hy - 1, glow); }
  c.set(cx, hy - 1, glow); c.set(cx + 2, hy - 1, glow);
}

export function falsarioSheet() {
  return getSheet('en_falsario', () => new SpriteSheet({
    w: 34, h: 36, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => falsarioBody(c, e, { bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 4, fps: 9, draw: (c, e, i) => falsarioBody(c, e, { bob: [0, 1, 0, 1][i], ph: i * 2 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => falsarioBody(c, e, { bob: -1, reach: 0.5, eyes: 0xff3040 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => falsarioBody(c, e, { bob: 0, reach: 1 + i * 0.4, ph: i * 2, eyes: 0xff3040 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => falsarioBody(c, e, { bob: 1 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { falsarioBody(c, e, { bob: i * 2, ph: i }); for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.alpha(x, y) && bayer(x, y) < i / 5.5) c.erase(x, y); } },
    },
  }));
}

export function malebrancheSheet() {
  return getSheet('en_malebranche', () => new SpriteSheet({
    w: 34, h: 38, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => demonBody(c, e, { s: 1, cx: 15, by: 36, bob: [0, 0, 1, 1][i], wing: i % 2 }) },
      move: { frames: 4, fps: 10, draw: (c, e, i) => demonBody(c, e, { s: 1, cx: 15, by: 36, bob: [0, 1, 0, 1][i], step: i % 2 ? 1 : -1, wing: i % 2 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => demonBody(c, e, { s: 1, cx: 15, by: 36, bob: -1, hook: -0.6, wing: 2 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => demonBody(c, e, { s: 1, cx: 15, by: 36, bob: 1, hook: 0.6 + i * 0.4 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => demonBody(c, e, { s: 1, cx: 15, by: 36, bob: 1 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => demonBody(c, e, { s: 1, cx: 15, by: 36, bob: i * 2, wing: -i }) },
    },
  }));
}

// LADRÓN — thief of Bolgia VII; two forms: man (form 0) and serpent (form 1)
function thiefMan(c, e, p) {
  const cx = 13, by = 30, bob = p.bob || 0;
  const SK = [0x241a14, 0x463428, 0x6a5040, 0x8e6e58];
  for (const s of [-1, 1]) c.line(cx + s * 2, by - 9 + bob, cx + s * 3 + (p.step || 0) * s, by - 1, CLOAK[3]);
  c.poly([[cx - 4, by - 20 + bob], [cx + 4, by - 20 + bob], [cx + 3, by - 9 + bob], [cx - 3, by - 9 + bob]], null, (x, y) => pk(CLOAK, 3.6 - (x - cx + 4) * 0.3, x, y));
  c.ellipse(cx + 1, by - 23 + bob, 3, 3.2, null, (nx, ny, x, y) => pk(SK, 3.4 - nx - ny, x, y));
  c.rect(cx - 1, by - 24 + bob, 5, 1, 0x101010);              // a bandit's mask
  c.set(cx + 2, by - 24 + bob, TEAL[5]); if (e) e.set(cx + 2, by - 24 + bob, TEAL[4]);
  // scales creeping up the skin (the transformation never ends)
  for (let k = 0; k < 5; k++) c.set(cx - 3 + k, by - 12 + bob + (k % 2), SCALE[3]);
  // dagger
  const st = p.stab || 0;
  c.thickLine(cx + 3, by - 18 + bob, cx + 6 + st * 3, by - 16 + bob, 0.6, SK[2]);
  c.line(cx + 6 + st * 3, by - 16 + bob, cx + 10 + st * 3, by - 17 + bob, R.steel[4]);
}
function thiefSerpent(c, e, p) {
  const by = 28;
  for (let k = 0; k < 24; k++) {
    const x = 4 + k, y = by - 4 + Math.round(Math.sin(k * 0.5 + (p.ph || 0)) * 2.5 * (1 - k / 30)) - (p.rear || 0) * Math.max(0, k - 16) * 0.8;
    const w = k < 18 ? 2 : 1;
    for (let s = -w; s <= w; s++) c.set(x, y + s, pk(SCALE, 3.4 - s * 0.6 + (k % 3 === 0 ? 0.6 : 0), x, y + s));
  }
  const hx = 28, hy = by - 4 - (p.rear || 0) * 7;
  c.ellipse(hx, hy, 3, 2.2, null, (nx, ny, x, y) => pk(SCALE, 4 - nx - ny, x, y));
  c.set(hx + 1, hy - 1, 0xffd040); if (e) e.set(hx + 1, hy - 1, 0xffd040);
  if (p.open) { c.line(hx + 2, hy + 1, hx + 5, hy + 2, 0xc0404a); c.set(hx + 2, hy, 0xffffff); }
}

export function ladronSheet() {
  return getSheet('en_ladron', () => new SpriteSheet({
    w: 34, h: 34, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => thiefMan(c, e, { bob: [0, 0, 1, 1][i] }) },
      move: { frames: 4, fps: 10, draw: (c, e, i) => thiefMan(c, e, { bob: [0, 1, 0, 1][i], step: i % 2 ? 1 : -1 }) },
      windup: { frames: 2, fps: 8, loop: false, draw: (c, e, i) => thiefMan(c, e, { bob: 1, stab: -1 }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => thiefMan(c, e, { bob: 0, stab: 1 + i * 0.5 }) },
      serpent: { frames: 4, fps: 10, draw: (c, e, i) => thiefSerpent(c, e, { ph: i * 1.5 }) },
      sWindup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => thiefSerpent(c, e, { rear: 1 + i, open: true }) },
      sAttack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => thiefSerpent(c, e, { rear: 0, open: true, ph: i * 2 }) },
      shift: { frames: 6, fps: 12, loop: false, draw: (c, e, i) => { if (i % 2) thiefSerpent(c, e, { ph: i }); else thiefMan(c, e, { bob: 1 }); } },
      hurt: { frames: 1, fps: 1, draw: (c, e) => thiefMan(c, e, { bob: 2 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { thiefSerpent(c, e, { ph: i, rear: 0 }); for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.alpha(x, y) && bayer(x, y) < i / 5.5) c.erase(x, y); } },
    },
  }));
}
