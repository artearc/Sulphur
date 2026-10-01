// Minibosses of the lower circles: Heresiarca (VI), Neso (VII), Malacoda (VIII), Efialtes (IX).
import { SpriteSheet, getSheet } from '../sheet.js';
import { R, CIRCLE_PALETTES } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const EMB = R.ember;

function flame(c, e, cx, by, h, i, ramp = EMB, w = 3) {
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const ww = Math.max(0, Math.round(w * (1 - t) * (0.8 + 0.3 * Math.sin(i * 2.1 + y))));
    const sway = Math.round(Math.sin(i * 1.7 + y * 0.6) * t * 1.5);
    for (let x = -ww; x <= ww; x++) {
      const f = (1 - Math.abs(x) / (ww + 1)) * (1 - t * 0.6) * (ramp.length - 1) + (bayer(x + 9, y + i) - 0.5);
      const col = ramp[Math.max(1, Math.min(ramp.length - 1, Math.round(f)))];
      c.set(cx + x + sway, by - y, col);
      if (e) e.set(cx + x + sway, by - y, col);
    }
  }
}

// ------------------------------------------------------------------------------------------
// EL HERESIARCA — a mitred arch-heretic rising from his burning sarcophagus, book of fire open
// ------------------------------------------------------------------------------------------
function heresiarca(c, e, p) {
  const cx = 34, by = 66;
  const rise = p.rise ?? 1, ph = p.ph || 0;
  const STONE = [0x120a08, 0x22140e, 0x36221a, 0x4c3226, 0x664434, 0x82584a];
  const ROBE = [0x1a0606, 0x340c0a, 0x521810, 0x6e2616, 0x8a3a1e];
  // sarcophagus
  c.poly([[cx - 22, by - 14], [cx + 22, by - 14], [cx + 22, by], [cx - 22, by]], null, (x, y) => pk(STONE, 3 - (y - by + 14) * 0.12 + (x < cx - 20 ? 1 : 0), x, y));
  c.hline(cx - 22, cx + 22, by - 14, STONE[5]);
  for (let k = 0; k < 5; k++) flame(c, e, cx - 18 + k * 9, by - 14, 6 + ((k + ph) % 3) * 3, ph + k, EMB, 2);
  // the heretic rising
  const top = by - 14 - Math.round(40 * rise) + (p.bob || 0);
  c.poly([[cx - 8, top + 12], [cx + 8, top + 12], [cx + 12, by - 12], [cx - 12, by - 12]], null, (x, y) => {
    let f = 3.4 - (x - cx + 12) * 0.1;
    if (Math.abs(x - cx) < 1) return EMB[3];
    if ((x + y) % 9 === 0) f -= 1;
    return pk(ROBE, f, x, y);
  });
  // painted flames on the sanbenito
  for (let k = 0; k < 4; k++) flame(c, null, cx - 6 + k * 4, by - 14, 6, ph + k, [ROBE[1], EMB[1], EMB[2], EMB[3]], 1);
  // head and tall mitre of the condemned
  const hy = top + 6;
  c.ellipse(cx, hy, 5, 5.5, null, (nx, ny, x, y) => pk([0x241c1c, 0x463a38, 0x6e605a, 0x988a7e, 0xc0b2a0], 3.4 - nx - ny, x, y));
  c.poly([[cx - 5, hy - 4], [cx + 5, hy - 4], [cx + 1, hy - 20], [cx - 1, hy - 20]], null, (x, y) => pk([0x3a2a10, 0x6a5020, 0x9a7a3a, 0xc8a85a], 3 - (x - cx + 5) * 0.2, x, y));
  for (let k = 0; k < 3; k++) c.set(cx - 2 + k * 2, hy - 8 - k * 3, EMB[4]);
  c.set(cx - 2, hy, EMB[5]); c.set(cx + 2, hy, EMB[5]);
  if (e) { e.set(cx - 2, hy, EMB[4]); e.set(cx + 2, hy, EMB[4]); }
  // arms and the book of fire
  const A = p.arms || 'book';
  if (A === 'raise') {
    c.thickLine(cx - 8, top + 14, cx - 16, top - 2, 1.4, ROBE[2]); c.thickLine(cx + 8, top + 14, cx + 16, top - 2, 1.4, ROBE[3]);
    flame(c, e, cx - 16, top - 3, 8, ph, EMB, 2); flame(c, e, cx + 16, top - 3, 8, ph + 2, EMB, 2);
  } else {
    c.thickLine(cx - 8, top + 14, cx - 3, top + 22, 1.4, ROBE[2]); c.thickLine(cx + 8, top + 14, cx + 4, top + 22, 1.4, ROBE[3]);
    c.rect(cx - 6, top + 20, 12, 7, [0xd8c8a0, 0xb8a080][0]); c.vline(cx, top + 20, top + 26, 0x6a5020);
    flame(c, e, cx, top + 19, 6 + (ph % 3), ph, EMB, 4);
  }
  // shifted lid leaning on the side
  c.poly([[cx + 18, by - 30], [cx + 30, by - 20], [cx + 27, by - 4], [cx + 15, by - 14]], null, (x, y) => pk(STONE, 3.8 - (x - cx - 15) * 0.1, x, y));
}

export function heresiarcaSheet() {
  return getSheet('mb_heresiarca', () => new SpriteSheet({
    w: 68, h: 70, emissive: true,
    anims: {
      idle: { frames: 6, fps: 8, draw: (c, e, i) => heresiarca(c, e, { ph: i, bob: [0, 0, 1, 1, 1, 0][i] }) },
      move: { frames: 6, fps: 8, draw: (c, e, i) => heresiarca(c, e, { ph: i, bob: i % 2 }) },
      windup: { frames: 3, fps: 8, loop: false, draw: (c, e, i) => heresiarca(c, e, { ph: i, arms: 'raise', bob: -1 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => heresiarca(c, e, { ph: i * 2, arms: i ? 'book' : 'raise', bob: 1 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => heresiarca(c, e, { ph: i * 2, arms: 'raise' }) },
      rise: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => heresiarca(c, e, { ph: i, rise: (i + 1) / 6 }) },
      sink: { frames: 4, fps: 8, loop: false, draw: (c, e, i) => heresiarca(c, e, { ph: i, rise: 1 - (i + 1) / 4 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => heresiarca(c, e, { ph: 1, bob: 2 }) },
      death: { frames: 6, fps: 6, loop: false, draw: (c, e, i) => heresiarca(c, e, { ph: i * 2, rise: 1 - i / 6, arms: 'raise' }) },
    },
  }));
}

// ------------------------------------------------------------------------------------------
// NESO — the centaur who carried Deianira: bow drawn, blood-red flanks, a cloak of lion skin
// ------------------------------------------------------------------------------------------
const HIDE = [0x1a0a06, 0x341610, 0x52241a, 0x703424, 0x8e4a34, 0xae664a];
const SKIN = [0x2a1610, 0x4e2e22, 0x784c3a, 0xa06a54, 0xc89078];
export function centaurBody(c, e, p) {
  const by = p.by ?? 48, lean = p.lean || 0, leg = p.leg || 0, bob = p.bob || 0;
  const x0 = p.x0 ?? 8;
  const s = p.s ?? 1;
  // horse body
  c.ellipse(x0 + 16 * s, by - 18 * s + bob, 14 * s, 7 * s, null, (nx, ny, x, y) => pk(HIDE, 3.6 - nx * 0.8 - ny * 1.3, x, y));
  // legs
  for (const [lx, ph] of [[3, -leg], [8, leg], [22, leg], [27, -leg]]) {
    const X = x0 + lx * s;
    c.thickLine(X, by - 14 * s + bob, X + ph * 3, by - 6 * s, 0.9 * s, HIDE[2]);
    c.thickLine(X + ph * 3, by - 6 * s, X + ph * 2, by - 1, 0.7 * s, HIDE[1]);
    c.hline(X + ph * 2 - 1, X + ph * 2 + 1, by - 1, 0x0a0404);
  }
  // tail
  c.thickLine(x0 + 2 * s, by - 20 * s + bob, x0 - 4 * s, by - 10 * s + bob + (p.ph % 2), 1 * s, HIDE[0]);
  // human torso
  const tx = x0 + 28 * s + lean, ty = by - 22 * s + bob;
  c.poly([[tx - 4 * s, ty], [tx + 4 * s, ty], [tx + 3 * s, ty - 14 * s], [tx - 3 * s, ty - 14 * s]], null, (x, y) => pk(SKIN, 3.4 - (x - tx + 4 * s) * 0.3 / s, x, y));
  // lion-skin mantle
  c.poly([[tx - 4 * s, ty - 14 * s], [tx - 7 * s, ty - 4 * s], [tx - 3 * s, ty - 6 * s]], [0x6a4a1a, 0x8a6a2a][0]);
  // head
  c.ellipse(tx, ty - 17 * s, 3 * s, 3.4 * s, null, (nx, ny, x, y) => pk(SKIN, 3.6 - nx - ny, x, y));
  c.ellipse(tx - 1 * s, ty - 19 * s, 3 * s, 2 * s, HIDE[1]);
  c.set(tx + 1 * s, ty - 17 * s, 0xff4030); if (e) e.set(tx + 1 * s, ty - 17 * s, 0xc02820);
  // bow
  const draw = p.draw || 0;
  const bx = tx + 6 * s, byy = ty - 10 * s;
  for (let k = -8; k <= 8; k++) c.set(bx + Math.round(Math.cos(k / 8 * 1.2) * 3 * s) - 3 * s, byy + k * s, R.wood[3]);
  c.line(bx - 3 * s, byy - 8 * s, bx - 3 * s - draw * 3, byy, 0xd8d0c0); c.line(bx - 3 * s - draw * 3, byy, bx - 3 * s, byy + 8 * s, 0xd8d0c0);
  c.thickLine(tx + 3 * s, ty - 11 * s, bx - 2 * s, byy, 0.6 * s, SKIN[2]);
  if (draw) { c.line(bx - 3 * s - draw * 3, byy, bx + 4 * s, byy, R.wood[3]); c.set(bx + 5 * s, byy, R.steel[4]); if (e && draw > 1) e.set(bx + 5 * s, byy, 0xff6040); }
}

export function nesoSheet() {
  return getSheet('mb_neso', () => new SpriteSheet({
    w: 66, h: 52, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50, bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 6, fps: 14, draw: (c, e, i) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50, bob: [0, 1, 1, 0, 1, 1][i], leg: [-1, -0.5, 0.5, 1, 0.5, -0.5][i], ph: i, lean: 1 }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50, draw: 1 + i * 0.5, ph: i }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50, draw: i === 0 ? 2 : 0, lean: i, ph: i }) },
      roar: { frames: 4, fps: 8, draw: (c, e, i) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50, bob: -1, leg: i % 2 ? 1 : -1, ph: i }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50, lean: -2, bob: 1, ph: 0 }) },
      death: { frames: 6, fps: 7, loop: false, draw: (c, e, i) => centaurBody(c, e, { s: 1.15, x0: 6, by: 50 + Math.min(i, 3), bob: i * 2, lean: -i, ph: i }) },
    },
  }));
}

// ------------------------------------------------------------------------------------------
// MALACODA — captain of the Malebranche: black-winged demon with a long iron hook
// ------------------------------------------------------------------------------------------
const DEMON = [0x08060a, 0x140e16, 0x241a28, 0x36283c, 0x4a3852, 0x60486a];
export function demonBody(c, e, p) {
  const s = p.s ?? 1, cx = p.cx ?? 16, by = p.by ?? 34, bob = p.bob || 0;
  const top = by - 24 * s + bob;
  // wings
  const w = p.wing || 0;
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
    c.line(cx + sd * 3 * s, top + 6 * s, cx + sd * (9 + k * 3) * s, top - (3 - k * 2) * s - w * 2, DEMON[2 + (k % 2)]);
    c.line(cx + sd * (9 + k * 3) * s, top - (3 - k * 2) * s - w * 2, cx + sd * (6 + k * 2) * s, top + 10 * s, DEMON[1]);
  }
  // legs (goat-like)
  for (const sd of [-1, 1]) { c.line(cx + sd * 2 * s, by - 9 * s + bob, cx + sd * 4 * s + (p.step || 0) * sd, by - 4 * s, DEMON[2]); c.line(cx + sd * 4 * s + (p.step || 0) * sd, by - 4 * s, cx + sd * 3 * s, by - 1, DEMON[1]); }
  // torso
  c.poly([[cx - 5 * s, top + 4 * s], [cx + 5 * s, top + 4 * s], [cx + 3 * s, by - 9 * s + bob], [cx - 3 * s, by - 9 * s + bob]], null, (x, y) => pk(DEMON, 3.6 - (x - cx + 5 * s) * 0.25 / s, x, y));
  // head with horns and grin
  c.ellipse(cx + 1, top + 1, 3.6 * s, 3.4 * s, null, (nx, ny, x, y) => pk(DEMON, 4 - nx - ny, x, y));
  c.line(cx - 2 * s, top - 2 * s, cx - 4 * s, top - 6 * s, R.bone[2]); c.line(cx + 3 * s, top - 2 * s, cx + 5 * s, top - 6 * s, R.bone[2]);
  c.set(cx, top + 1, 0xff3020); c.set(cx + 2 * s, top + 1, 0xff3020);
  if (e) { e.set(cx, top + 1, 0xff3020); e.set(cx + 2 * s, top + 1, 0xff3020); }
  c.hline(cx - 1, cx + 3 * s, top + 3 * s, R.bone[4]);
  // the hook (raffio)
  const hk = p.hook || 0;
  const hx = cx + (6 + hk * 5) * s, hy = top + (2 - hk * 2) * s;
  c.thickLine(cx + 4 * s, top + 7 * s, hx, hy + 6 * s, 0.6 * s, DEMON[3]);
  c.line(hx, hy + 8 * s, hx + 1, hy - 8 * s, R.wood[2]);
  c.line(hx + 1, hy - 8 * s, hx + 4 * s, hy - 7 * s, R.steel[4]); c.line(hx + 4 * s, hy - 7 * s, hx + 4 * s, hy - 4 * s, R.steel[3]);
  if (p.crown) { c.hline(cx - 2, cx + 3, top - 3 * s, R.gold[4]); c.set(cx, top - 4 * s, R.gold[5]); }
}

export function malacodaSheet() {
  return getSheet('mb_malacoda', () => new SpriteSheet({
    w: 52, h: 56, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, bob: [0, 0, 1, 1][i], wing: i % 2, crown: true }) },
      move: { frames: 4, fps: 10, draw: (c, e, i) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, bob: [0, 1, 0, 1][i], step: i % 2 ? 1 : -1, wing: i % 2, crown: true }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, bob: -1, hook: -0.6, wing: 2, crown: true }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, bob: 1, hook: 0.5 + i * 0.4, wing: 1, crown: true }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, wing: 2 + (i % 2), crown: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, bob: 1, crown: true }) },
      death: { frames: 6, fps: 7, loop: false, draw: (c, e, i) => demonBody(c, e, { s: 1.6, cx: 24, by: 54, bob: i * 3, wing: -i, crown: true }) },
    },
  }));
}

// ------------------------------------------------------------------------------------------
// EFIALTES — the chained giant (Canto XXXI): one arm bound before, one behind, five coils of chain
// ------------------------------------------------------------------------------------------
function efialtes(c, e, p) {
  const cx = 40, by = 86, bob = p.bob || 0;
  const SK = [0x141a24, 0x26303e, 0x3a4658, 0x546274, 0x728294, 0x94a4b4];
  const ICE = R.ice;
  // ice floe he stands in (waist-deep in the well)
  c.ellipse(cx, by - 6, 34, 7, null, (nx, ny, x, y) => pk(ICE, 3.6 - ny * 1.5 - nx * 0.5, x, y));
  const top = by - 70 + bob;
  // torso (huge)
  c.poly([[cx - 20, top + 18], [cx + 20, top + 18], [cx + 16, by - 8], [cx - 16, by - 8]], null, (x, y) => {
    let f = 3.4 - (x - cx + 20) * 0.06 - (y - top) * 0.012;
    if (Math.abs(x - cx) < 1 && y > top + 22) f -= 1;
    return pk(SK, f, x, y);
  });
  // chains coiled around (five turns)
  for (let k = 0; k < 5; k++) {
    const y = top + 26 + k * 7;
    for (let x = cx - 18; x <= cx + 18; x += 2) { c.set(x, y + ((x >> 1) % 2), R.steel[3]); c.set(x + 1, y + ((x >> 1) % 2), R.steel[2]); }
  }
  // head
  const hy = top + 8;
  c.ellipse(cx, hy, 9, 10, null, (nx, ny, x, y) => pk(SK, 3.8 - nx - ny, x, y));
  c.ellipse(cx, hy - 6, 9, 5, null, (nx, ny, x, y) => pk([0x0a0c10, 0x141820, 0x20262e], 2 - ny, x, y));
  const eye = p.eyes ?? 0x9ad8ff;
  c.rect(cx - 5, hy, 3, 2, eye); c.rect(cx + 2, hy, 3, 2, eye);
  if (e) { e.rect(cx - 5, hy, 3, 2, eye); e.rect(cx + 2, hy, 3, 2, eye); }
  c.rect(cx - 3, hy + 5, 7, p.roar ? 4 : 2, 0x05080c);
  // free arm (right) swinging a broken chain; bound arm (left)
  const sw = p.swing ?? 0;
  const ax = cx + 20 + Math.cos(sw) * 22, ay = top + 22 + Math.sin(sw) * 14;
  c.thickLine(cx + 18, top + 20, ax, ay, 3.5, SK[3]);
  for (let k = 0; k < 10; k++) { const t = k / 10; const x = ax + Math.cos(sw + 0.6) * 14 * t, y = ay + Math.sin(sw + 0.6) * 14 * t + Math.sin(t * 3) * 2; c.disc(x, y, 1, R.steel[2 + (k % 2)]); }
  c.thickLine(cx - 18, top + 20, cx - 12, top + 40, 3.5, SK[2]);
  c.disc(cx - 12, top + 42, 4, SK[2]);
  for (let k = 0; k < 6; k++) c.set(cx - 16 + k, top + 42, R.steel[4]);
  // frost on shoulders
  for (let k = 0; k < 14; k++) c.set(cx - 18 + ((k * 7) % 36), top + 18 + (k % 3), ICE[5]);
}

export function efialtesSheet() {
  return getSheet('mb_efialtes', () => new SpriteSheet({
    w: 86, h: 90, emissive: true,
    anims: {
      idle: { frames: 4, fps: 4, draw: (c, e, i) => efialtes(c, e, { bob: [0, 0, 1, 1][i], swing: 0.6 + Math.sin(i * 1.57) * 0.1 }) },
      move: { frames: 4, fps: 5, draw: (c, e, i) => efialtes(c, e, { bob: i % 2, swing: 0.7 }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => efialtes(c, e, { bob: -1, swing: -1.2 - i * 0.3, eyes: 0xffffff }) },
      attack: { frames: 4, fps: 12, loop: false, draw: (c, e, i) => efialtes(c, e, { bob: 1, swing: -1.5 + i * 1.1 }) },
      roar: { frames: 4, fps: 8, draw: (c, e, i) => efialtes(c, e, { bob: i % 2, roar: true, swing: 0.4, eyes: 0xffffff }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => efialtes(c, e, { bob: 2, swing: 0.9 }) },
      death: { frames: 6, fps: 6, loop: false, draw: (c, e, i) => efialtes(c, e, { bob: i * 4, roar: true, swing: 1.2 }) },
    },
  }));
}
