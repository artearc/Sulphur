// II · LUJURIA bestiary art — lovers torn by the storm. Violet night, crimson silk, white lightning.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R, CIRCLE_PALETTES } from '../palette.js';
import { bayer, mix } from '../pixel.js';

const P = CIRCLE_PALETTES.lujuria;
const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const SILK = P.accent;                                   // 4a0e2a .. ff86a8
const FLESH = [0x2a1a2e, 0x4e3a56, 0x7a6684, 0xa894ae, 0xd4c4d8];   // bloodless lilac skin
const HAIR = [0x0e0612, 0x1e0e26, 0x341a40, 0x50285c];
const STORM = [0x120818, 0x24102e, 0x3c1a4a, 0x5c2a6a, 0x84408e, 0xb46ab4];

// a ribbon of silk streaming in the wind
function ribbon(c, e, x0, y0, len, w0, ramp, ph, amp = 2, dir = -1, rise = 0) {
  for (let k = 0; k < len; k++) {
    const t = k / len;
    const x = x0 + dir * k;
    const y = y0 + Math.sin(k * 0.45 + ph) * amp * t + rise * k;
    const w = Math.max(0, Math.round(w0 * (1 - t * 0.8)));
    for (let s = 0; s <= w; s++) {
      if (t > 0.6 && bayer(Math.round(x), Math.round(y + s)) < (t - 0.6) * 2) continue;
      c.set(x, y + s, pk(ramp, (1 - t) * (ramp.length - 1) - s * 0.5 + 0.5, Math.round(x), Math.round(y + s)));
    }
  }
}

// gaunt spirit torso + head, used by lovers and the succubus
function spiritBody(c, e, cx, top, o = {}) {
  const lean = o.lean || 0;
  // torso
  c.poly([[cx - 3 + lean, top + 6], [cx + 3 + lean, top + 6], [cx + 2, top + 14], [cx - 2, top + 14]], null, (x, y) => pk(FLESH, 3.4 - (x - (cx - 3)) * 0.35, x, y));
  // ribs shading
  for (let k = 0; k < 3; k++) c.hline(cx - 2 + lean, cx + 1 + lean, top + 8 + k * 2, FLESH[1]);
  // head
  c.ellipse(cx + lean + 1, top + 3, 2.8, 3.2, null, (nx, ny, x, y) => pk(FLESH, 3.6 - nx - ny, x, y));
  // hollow eyes
  c.set(cx + lean + 1, top + 3, 0x0a040c); c.set(cx + lean + 3, top + 3, 0x0a040c);
  if (e && o.eyes) { e.set(cx + lean + 1, top + 3, o.eyes); e.set(cx + lean + 3, top + 3, o.eyes); }
  // wind-torn hair streaming back
  for (let k = 0; k < 5; k++) ribbon(c, e, cx + lean - 1, top + 1 + k, 7 + k * 2, 0, HAIR, (o.ph || 0) + k, 1.2, -1, 0.15);
}

// AMANTE — a lover whose body has become the silk that wrapped them
function amanteBody(c, e, p) {
  const cx = 15, top = 6 + (p.bob || 0);
  const ph = p.ph || 0;
  // long torn silk train (the body below the waist is only fabric)
  for (let k = 0; k < 4; k++) ribbon(c, e, cx + 1, top + 12 + k * 1.5, 14 + k * 3 + (p.stretch || 0), 2 - (k >> 1), SILK, ph + k * 0.9, 2.5, -1, 0.35);
  spiritBody(c, e, cx, top, { lean: p.lean || 0, ph, eyes: 0xff86a8 });
  // reaching arms
  const ax = p.reach ? 8 : 4;
  c.thickLine(cx + 2 + (p.lean || 0), top + 7, cx + 2 + ax + (p.lean || 0), top + (p.reach ? 6 : 11), 0.6, FLESH[2]);
  c.set(cx + 3 + ax + (p.lean || 0), top + (p.reach ? 6 : 11), FLESH[4]);
  c.thickLine(cx - 2 + (p.lean || 0), top + 7, cx - 5, top + 12, 0.6, FLESH[1]);
  // a crimson thread tied at the wrist (the bond that damns them)
  c.line(cx + 2 + ax, top + (p.reach ? 6 : 11), cx + 6 + ax, top + 2, SILK[3]);
  if (e) e.set(cx + 6 + ax, top + 2, SILK[2]);
}

export function amanteSheet() {
  return getSheet('en_amante', () => new SpriteSheet({
    w: 32, h: 30, emissive: true,
    anims: {
      idle: { frames: 4, fps: 7, draw: (c, e, i) => amanteBody(c, e, { bob: [0, 1, 1, 0][i], ph: i * 1.5 }) },
      move: { frames: 4, fps: 10, draw: (c, e, i) => amanteBody(c, e, { bob: [0, 1, 1, 0][i], ph: i * 2, lean: 1, stretch: 3 }) },
      windup: { frames: 2, fps: 8, loop: false, draw: (c, e, i) => amanteBody(c, e, { bob: 2, ph: i, lean: -1 }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => amanteBody(c, e, { bob: 0, ph: i * 3, lean: 2, reach: true, stretch: 8 - i * 2 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => amanteBody(c, e, { bob: 1, lean: -2, ph: 2 }) },
      death: { frames: 6, fps: 10, loop: false, draw: (c, e, i) => { amanteBody(c, e, { bob: i, ph: i * 2, lean: -1, stretch: i * 3 }); unravel(c, i / 5); } },
    },
  }));
}

// death: the figure comes apart into strands from the top
function unravel(c, k) {
  if (k <= 0) return;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.alpha(x, y)) continue;
    if (bayer(x, y) < k * 1.1 - (y / c.h) * 0.4 || (k > 0.4 && (x + y) % 3 === 0 && bayer(y, x) < k)) c.erase(x, y);
  }
}

// SÚCUBO DE LA TORMENTA — hovering temptress; a heart-shaped void where the heart should be
function sucuboBody(c, e, p) {
  const cx = 15, top = 5 + (p.bob || 0);
  const ph = p.ph || 0;
  // storm-cloud lower body
  for (let k = 0; k < 7; k++) {
    const x = cx - 7 + k * 2 + Math.round(Math.sin(ph + k) * 1), y = top + 17 + (k % 3);
    c.ellipse(x, y, 3.2, 2.2, null, (nx, ny, px, py) => pk(STORM, 3 - ny * 1.5 - nx * 0.5, px, py));
  }
  // wings of torn veil
  const wing = p.wing ?? 0;
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x1 = cx + s * (6 + k * 2 + wing), y1 = top + 2 - k * 2 + wing * (k * 0.5);
      c.line(cx + s * 2, top + 8, x1, y1, STORM[3 + (k % 2)]);
      c.line(cx + s * 2, top + 9, x1, y1 + 3, STORM[2]);
    }
  }
  // dress of crimson silk
  c.poly([[cx - 3, top + 8], [cx + 3, top + 8], [cx + 5, top + 18], [cx - 5, top + 18]], null, (x, y) => pk(SILK, 3.5 - (x - (cx - 5)) * 0.25 - (y - top - 8) * 0.06, x, y));
  spiritBody(c, e, cx, top, { ph, eyes: 0xffd0e0 });
  // the void heart, glowing at its rim
  const hx = cx, hy = top + 10;
  const H = ['.##.##.', '#######', '.#####.', '..###..', '...#...'];
  H.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '#') return;
    const edge = j === 0 || i === 0 || i === 6 || j === 4 || H[j - 1]?.[i] !== '#' || row[i - 1] !== '#' || row[i + 1] !== '#';
    c.set(hx - 3 + i, hy - 2 + j, edge ? SILK[4] : 0x050208);
    if (e && edge) e.set(hx - 3 + i, hy - 2 + j, p.cast ? 0xff86a8 : SILK[2]);
  }));
  // arms raised when casting
  if (p.cast) {
    c.thickLine(cx - 3, top + 7, cx - 7, top + 1, 0.6, FLESH[2]); c.thickLine(cx + 3, top + 7, cx + 7, top + 1, 0.6, FLESH[3]);
    if (e) { e.disc(cx - 7, top, 1.2, 0xff86a8); e.disc(cx + 7, top, 1.2, 0xff86a8); }
  } else {
    c.thickLine(cx - 3, top + 7, cx - 5, top + 13, 0.6, FLESH[1]); c.thickLine(cx + 3, top + 7, cx + 5, top + 12, 0.6, FLESH[2]);
  }
}

export function sucuboSheet() {
  return getSheet('en_sucubo', () => new SpriteSheet({
    w: 32, h: 32, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => sucuboBody(c, e, { bob: [0, 1, 1, 0][i], ph: i, wing: i % 2 }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => sucuboBody(c, e, { bob: [0, 1, 1, 0][i], ph: i * 2, wing: (i + 1) % 2 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => sucuboBody(c, e, { bob: 1, ph: i, wing: 2, cast: true }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => sucuboBody(c, e, { bob: 0, ph: i * 2, wing: 2 - i, cast: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => sucuboBody(c, e, { bob: 2, ph: 1 }) },
      death: { frames: 6, fps: 9, loop: false, draw: (c, e, i) => { sucuboBody(c, e, { bob: i, ph: i, wing: -i * 0.5 }); unravel(c, i / 5); } },
    },
  }));
}

// PAREJA ENTRELAZADA — each of the two lovers (variant 0 = he, 1 = she)
function loverBody(c, e, p) {
  const cx = 13, top = 5 + (p.bob || 0);
  const ph = p.ph || 0;
  const she = p.v === 1;
  const robe = she ? SILK : STORM;
  // flowing robe/cloak in the wind
  for (let k = 0; k < 3; k++) ribbon(c, e, cx - 2, top + 11 + k * 2, 9 + k * 2, 2, robe, ph + k, 1.8, -1, 0.2);
  c.poly([[cx - 3, top + 7], [cx + 3, top + 7], [cx + 4, top + 22], [cx - 4, top + 22]], null, (x, y) => pk(robe, 3.4 - (x - (cx - 4)) * 0.3 - (y - top) * 0.04, x, y));
  spiritBody(c, e, cx, top, { ph, eyes: she ? 0xff86a8 : 0xd0a0ff, lean: p.lean || 0 });
  if (she) { for (let k = 0; k < 4; k++) c.set(cx - 2 + k, top - 1, HAIR[3]); }
  // the arm that reaches for the other lover
  const reach = p.reach ? 9 : 6;
  c.thickLine(cx + 3, top + 8, cx + 3 + reach, top + 7 - (p.reach ? 2 : 0), 0.6, FLESH[3]);
  // crimson bond
  if (e) e.set(cx + 3 + reach, top + 7 - (p.reach ? 2 : 0), 0xff4a7a);
  c.set(cx + 3 + reach, top + 7 - (p.reach ? 2 : 0), 0xff4a7a);
}

export function loverSheet(v) {
  return getSheet('en_pareja' + v, () => new SpriteSheet({
    w: 28, h: 32, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => loverBody(c, e, { v, bob: [0, 1, 1, 0][i], ph: i }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => loverBody(c, e, { v, bob: [0, 1, 1, 0][i], ph: i * 2, lean: 1 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => loverBody(c, e, { v, bob: 1, ph: i, reach: true }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => loverBody(c, e, { v, bob: 0, ph: i * 2, reach: true, lean: 1 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => loverBody(c, e, { v, bob: 2, lean: -1 }) },
      death: { frames: 6, fps: 9, loop: false, draw: (c, e, i) => { loverBody(c, e, { v, bob: i, ph: i }); unravel(c, i / 5); } },
    },
  }));
}

// EL TORBELLINO DE LOS AMANTES — a vortex of entwined souls (miniboss)
function vortex(c, e, p) {
  const cx = 32, by = 70;
  const ph = p.ph || 0;
  const H = 62;
  for (let y = 0; y < H; y++) {
    const t = y / H;                         // 0 top .. 1 bottom
    const w = 6 + (1 - t) * 20 * (p.wide ?? 1);
    const yy = by - y;
    const sway = Math.sin(t * 5 + ph * 0.8) * 3 * (1 - t);
    for (let k = 0; k < 3; k++) {
      const a = ph * 1.4 + y * 0.32 + k * 2.09;
      const x = cx + sway + Math.cos(a) * w;
      const front = Math.sin(a) > 0;
      const col = front ? STORM[4 + (y % 7 === 0 ? 1 : 0)] : STORM[2];
      c.set(x, yy, col); c.set(x + 1, yy, front ? STORM[3] : STORM[1]);
      if (k === 0 && front && y % 9 === Math.floor(ph * 2) % 9) {
        // a face screaming inside the wind
        c.ellipse(x, yy, 2, 2.4, FLESH[3]); c.set(x - 1, yy, 0x0a040c); c.set(x + 1, yy, 0x0a040c); c.set(x, yy + 1, 0x0a040c);
      }
      if (k === 1 && front && y % 6 === 0) { c.set(x, yy - 1, SILK[3]); c.set(x - 1, yy - 1, SILK[2]); if (e) e.set(x, yy - 1, SILK[2]); }
    }
    // dark core
    if (bayer(cx, yy) < 0.5 - t * 0.3) c.set(cx + sway, yy, STORM[0]);
  }
  // heart of the storm: two lovers' silhouettes at the eye
  const ey = by - H * 0.55;
  c.ellipse(cx - 2, ey, 2, 2.5, FLESH[2]); c.ellipse(cx + 2, ey - 1, 2, 2.5, FLESH[3]);
  if (e) { e.disc(cx, ey + 3, 2.2, p.glow ? 0xff86a8 : 0x7a1a44); }
  // lightning flicker
  if (p.bolt) {
    let x = cx + 6, y = by - H + 4;
    for (let k = 0; k < 12; k++) { const nx = x + Math.round((Math.sin(k * 7 + ph) * 2)); c.line(x, y, nx, y + 3, 0xffffff); if (e) e.line(x, y, nx, y + 3, 0xd0e0ff); x = nx; y += 3; }
  }
}

export function torbellinoSheet() {
  return getSheet('en_torbellino', () => new SpriteSheet({
    w: 64, h: 74, emissive: true,
    anims: {
      idle: { frames: 8, fps: 12, draw: (c, e, i) => vortex(c, e, { ph: i * 0.785 }) },
      move: { frames: 8, fps: 14, draw: (c, e, i) => vortex(c, e, { ph: i * 0.785, wide: 0.9 }) },
      windup: { frames: 4, fps: 14, loop: false, draw: (c, e, i) => vortex(c, e, { ph: i * 1.2, wide: 0.75, glow: true }) },
      attack: { frames: 4, fps: 16, loop: false, draw: (c, e, i) => vortex(c, e, { ph: i * 1.5, wide: 1.25, glow: true, bolt: i % 2 === 0 }) },
      roar: { frames: 4, fps: 12, draw: (c, e, i) => vortex(c, e, { ph: i * 1.5, wide: 1.1, bolt: true, glow: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => vortex(c, e, { ph: 2, wide: 0.85 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { vortex(c, e, { ph: i, wide: 1 - i * 0.12 }); unravel(c, i / 5); } },
    },
  }));
}
