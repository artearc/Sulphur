// III · GULA bestiary art — bloated, wet, rotten. Bile green, bruise yellow, grease-black.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R, CIRCLE_PALETTES } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const BLOAT = [0x1e2410, 0x3a4420, 0x5e6a32, 0x86904a, 0xb0b46a, 0xd8d898];   // drowned, swollen skin
const BRUISE = [0x2a1a20, 0x4a2a34, 0x6e3e4a];
const MUD = [0x140f08, 0x261c10, 0x3a2c18, 0x524024, 0x6a5430];
const BILE = R.poison;
const TEETH = [0x8e8266, 0xc4b896, 0xece2c4];

// GLOTÓN HINCHADO — a drowned glutton, belly like a sack of rain
function glotonBody(c, e, p) {
  const cx = 17, by = 33;
  const g = p.grow || 0;             // fatter as it devours
  const sq = p.squash || 0;
  const bw = 9 + g, bh = 8 + g * 0.5 - sq;
  const top = by - 6 - bh * 2 + (p.bob || 0);
  // stubby legs
  c.rect(cx - 5, by - 4, 3, 4, BLOAT[1]); c.rect(cx + 2, by - 4, 3, 4, BLOAT[1]);
  // belly
  c.ellipse(cx, by - 6 - bh + (p.bob || 0), bw + sq, bh, null, (nx, ny, x, y) => {
    let f = 3.6 - nx * 1.2 - ny * 1.4;
    if (Math.abs(nx * 0.7 + ny) < 0.06) f -= 1.1;                 // stretch marks
    if (nx > 0.2 && ny > 0.2 && bayer(x, y) < 0.3) return BRUISE[1];
    return pk(BLOAT, f, x, y);
  });
  // navel and drips of grease
  c.set(cx + 1, by - 5 - bh + (p.bob || 0), BLOAT[0]);
  for (let k = 0; k < 3; k++) c.vline(cx - 4 + k * 4, by - 6 + (k % 2), by - 5 + ((k + (p.ph || 0)) % 3), BILE[3]);
  // small head sunk into the shoulders
  const hy = top + 2;
  c.ellipse(cx + 2, hy, 4, 3.4, null, (nx, ny, x, y) => pk(BLOAT, 3.8 - nx - ny, x, y));
  // tiny eyes, huge mouth
  c.set(cx + 1, hy - 1, 0x0a0a04); c.set(cx + 4, hy - 1, 0x0a0a04);
  if (e) { e.set(cx + 1, hy - 1, 0x9bb03a); e.set(cx + 4, hy - 1, 0x9bb03a); }
  const mo = p.mouth ?? 0.5;
  c.rect(cx - 1, hy + 1, 6, Math.round(1 + mo * 2), 0x140808);
  for (let k = 0; k < 6; k += 2) c.set(cx - 1 + k, hy + 1, TEETH[1]);
  // arms
  const ar = p.arms ?? 0;
  c.thickLine(cx - bw + 1, by - 12 - bh * 0.6, cx - bw - 2, by - 8 - ar * 6, 1.2, BLOAT[2]);
  c.thickLine(cx + bw - 1, by - 12 - bh * 0.6, cx + bw + 2, by - 8 - ar * 6, 1.2, BLOAT[3]);
  if (p.food) { c.ellipse(cx + bw + 3, by - 9 - ar * 6, 2, 1.5, R.blood[3]); c.set(cx + bw + 4, by - 10 - ar * 6, R.bone[4]); }
}

export function glotonSheet() {
  return getSheet('en_gloton', () => new SpriteSheet({
    w: 36, h: 36, emissive: true,
    anims: {
      idle: { frames: 4, fps: 4, draw: (c, e, i) => glotonBody(c, e, { bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 4, fps: 6, draw: (c, e, i) => glotonBody(c, e, { bob: [0, 1, 0, 1][i], ph: i, squash: i % 2 }) },
      windup: { frames: 2, fps: 5, loop: false, draw: (c, e, i) => glotonBody(c, e, { bob: -1 - i, arms: 1, mouth: 1 }) },
      attack: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => glotonBody(c, e, { bob: 2 - i, squash: 2 - i, arms: 0, mouth: 1.5 }) },
      eat: { frames: 4, fps: 8, draw: (c, e, i) => glotonBody(c, e, { bob: i % 2, mouth: i % 2 ? 1.5 : 0.2, arms: 0.6, food: i % 2 === 0 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => glotonBody(c, e, { bob: 1, squash: 2, mouth: 1 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { glotonBody(c, e, { bob: i * 2, squash: i, mouth: 1.5 }); burst(c, e, i / 5); } },
    },
  }));
}

// bursting death: holes open and bile spills
function burst(c, e, k) {
  if (k <= 0) return;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.alpha(x, y)) continue;
    const b = bayer(x * 3, y * 5);
    if (b < k * 0.9) c.erase(x, y);
    else if (b < k * 0.9 + 0.08) c.set(x, y, BILE[4]);
  }
}

// GUSANO DEL FANGO — a pale segmented worm with a ring of teeth; spends its life underground
function gusanoBody(c, e, p) {
  const cx = 14, by = 30;
  const rise = p.rise ?? 1;                 // 0 = hidden mound, 1 = fully out
  // mud mound
  c.ellipse(cx, by - 1, 9, 2.6, null, (nx, ny, x, y) => pk(MUD, 2.4 - ny * 1.5 - nx * 0.5, x, y));
  if (rise <= 0.05) { for (let k = 0; k < 5; k++) c.set(cx - 6 + k * 3, by - 3 - (k % 2), MUD[4]); return; }
  const H = Math.round(20 * rise);
  const sway = p.sway || 0;
  for (let y = 0; y < H; y++) {
    const t = y / 20;
    const x0 = cx + Math.round(Math.sin(t * 3 + (p.ph || 0)) * 1.5 + sway * t * 3);
    const w = 3.6 - t * 0.6;
    const seg = y % 4 === 0;
    for (let x = Math.floor(x0 - w); x <= Math.ceil(x0 + w); x++) {
      const nx = (x - x0) / w;
      c.set(x, by - 3 - y, seg ? BLOAT[1] : pk([0x3a2a28, 0x6a504a, 0x947068, 0xbc9488, 0xdcb8a8], 3 - nx * 1.4, x, by - 3 - y));
    }
  }
  // maw with rings of teeth at the top
  const mx = cx + Math.round(Math.sin(H / 20 * 3 + (p.ph || 0)) * 1.5 + sway * 3), my = by - 3 - H;
  c.ellipse(mx, my, 4, 2.2 + (p.open || 0), 0x200808);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.set(mx + Math.round(Math.cos(a) * 3.4), my + Math.round(Math.sin(a) * (1.6 + (p.open || 0))), TEETH[2]); }
  if (e) e.disc(mx, my, 1, 0x4a1010);
}

export function gusanoSheet() {
  return getSheet('en_gusano', () => new SpriteSheet({
    w: 28, h: 34, emissive: true,
    anims: {
      idle: { frames: 4, fps: 6, draw: (c, e, i) => gusanoBody(c, e, { rise: 1, ph: i * 0.8, sway: [0, 0.5, 0, -0.5][i] }) },
      burrow: { frames: 4, fps: 8, draw: (c, e, i) => gusanoBody(c, e, { rise: 0, ph: i }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => gusanoBody(c, e, { rise: 0, ph: i }) },
      emerge: { frames: 4, fps: 12, loop: false, draw: (c, e, i) => gusanoBody(c, e, { rise: (i + 1) / 4, open: 1 }) },
      windup: { frames: 2, fps: 8, loop: false, draw: (c, e, i) => gusanoBody(c, e, { rise: 0.9, sway: -1, open: 1 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => gusanoBody(c, e, { rise: 1, sway: 1 + i * 0.3, open: 2 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => gusanoBody(c, e, { rise: 0.8, sway: -1 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => gusanoBody(c, e, { rise: 1 - i / 5, sway: -i * 0.4, open: 2 }) },
    },
  }));
}

// CEBADO — a fattened sinner-swine, chained to its trough, that vomits bile
function cebadoBody(c, e, p) {
  const cx = 15, by = 28;
  const bob = p.bob || 0;
  // body (side view, quadruped)
  c.ellipse(cx - 1, by - 8 + bob, 10, 6, null, (nx, ny, x, y) => pk([0x2a1e1a, 0x4e3630, 0x7a5448, 0xa47666, 0xc89a88], 3.4 - nx * 0.8 - ny * 1.4, x, y));
  // legs
  for (const lx of [-7, -3, 3, 6]) c.rect(cx + lx, by - 4 + bob, 2, 4 - bob, 0x3a2620);
  // head with snout, tiny human eyes
  const hx = cx + 9, hy = by - 11 + bob - (p.lift || 0);
  c.ellipse(hx, hy, 4.2, 3.6, null, (nx, ny, x, y) => pk([0x2a1e1a, 0x4e3630, 0x7a5448, 0xa47666, 0xc89a88], 3.6 - nx - ny, x, y));
  c.rect(hx + 3, hy, 3, 2, 0x8a5a4a); c.set(hx + 5, hy + 1, 0x200a08);
  c.set(hx, hy - 1, 0xe8e0d0); c.set(hx + 1, hy - 1, 0x0a0404);
  if (e) e.set(hx + 1, hy - 1, 0x9bb03a);
  // a broken iron collar and chain
  c.vline(hx - 3, hy - 2, hy + 3, R.steel[2]);
  for (let k = 0; k < 4; k++) c.set(hx - 4 - k, hy + 3 + (k % 2), R.steel[3]);
  // vomit stream
  if (p.vomit) {
    for (let k = 0; k < 10; k++) {
      const x = hx + 5 + k, y = hy + 1 + Math.round(k * k * 0.06) + ((k + p.vomit) % 2);
      c.set(x, y, BILE[3 + (k % 2)]); c.set(x, y + 1, BILE[2]);
      if (e) e.set(x, y, BILE[2]);
    }
  }
  // drool
  c.vline(hx + 4, hy + 2, hy + 3 + ((p.ph || 0) % 2), BILE[4]);
}

export function cebadoSheet() {
  return getSheet('en_cebado', () => new SpriteSheet({
    w: 34, h: 30, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => cebadoBody(c, e, { bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => cebadoBody(c, e, { bob: [0, 1, 0, 1][i], ph: i }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => cebadoBody(c, e, { bob: 1, lift: 2 + i }) },
      attack: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => cebadoBody(c, e, { bob: 0, lift: 0, vomit: i + 1 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => cebadoBody(c, e, { bob: 1, lift: 1 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { cebadoBody(c, e, { bob: Math.min(3, i), vomit: i }); burst(c, e, i / 5); } },
    },
  }));
}

// EL DEVORADOR — a walking maw: a belly with legs whose mouth runs from hip to hip (miniboss)
function devoradorBody(c, e, p) {
  const cx = 32, by = 58;
  const open = p.open ?? 0.3;
  const bob = p.bob || 0;
  // legs
  for (const s of [-1, 1]) {
    c.thickLine(cx + s * 12, by - 14 + bob, cx + s * 16, by - 2, 2.5, BLOAT[1]);
    c.rect(cx + s * 16 - 3, by - 2, 6, 2, BLOAT[0]);
  }
  // body
  c.ellipse(cx, by - 26 + bob, 22, 18, null, (nx, ny, x, y) => {
    let f = 3.6 - nx * 1.1 - ny * 1.3;
    if (bayer(x * 2, y) < 0.08) f -= 1.5;          // pustules
    return pk(BLOAT, f, x, y);
  });
  // vertical belly maw
  const mh = 5 + open * 10, mw = 8 + open * 4;
  c.ellipse(cx + 2, by - 24 + bob, mw, mh, null, (nx, ny) => (Math.hypot(nx, ny) > 0.82 ? 0x5a1414 : 0x140404));
  if (e) e.ellipse(cx + 2, by - 24 + bob, mw * 0.5, mh * 0.5, open > 0.6 ? 0x4a1008 : 0x200404);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const tx = cx + 2 + Math.cos(a) * (mw - 0.5), ty = by - 24 + bob + Math.sin(a) * (mh - 0.5);
    c.line(tx, ty, cx + 2 + Math.cos(a) * (mw - 3), by - 24 + bob + Math.sin(a) * (mh - 3), TEETH[1 + (k % 2)]);
  }
  // little head on top, crying
  c.ellipse(cx - 2, by - 44 + bob, 5, 4.4, null, (nx, ny, x, y) => pk(BLOAT, 3.8 - nx - ny, x, y));
  c.set(cx - 4, by - 45 + bob, 0x0a0a04); c.set(cx - 1, by - 45 + bob, 0x0a0a04);
  c.vline(cx - 4, by - 44 + bob, by - 42 + bob, 0xa8c8a0);
  if (e) { e.set(cx - 4, by - 45 + bob, 0xb8d040); e.set(cx - 1, by - 45 + bob, 0xb8d040); }
  // arms that shovel food
  const ar = p.arms ?? 0;
  for (const s of [-1, 1]) c.thickLine(cx + s * 18, by - 34 + bob, cx + s * (24 - ar * 6), by - 22 - ar * 10 + bob, 2, BLOAT[s > 0 ? 3 : 2]);
}

export function devoradorSheet() {
  return getSheet('en_devorador', () => new SpriteSheet({
    w: 64, h: 62, emissive: true,
    anims: {
      idle: { frames: 4, fps: 4, draw: (c, e, i) => devoradorBody(c, e, { bob: [0, 0, 1, 1][i], open: 0.3 + (i % 2) * 0.1 }) },
      move: { frames: 4, fps: 6, draw: (c, e, i) => devoradorBody(c, e, { bob: [0, 1, 0, 1][i], open: 0.2 }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => devoradorBody(c, e, { bob: -i, open: 0.5 + i * 0.25, arms: i * 0.4 }) },
      attack: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => devoradorBody(c, e, { bob: 2 - i, open: i === 0 ? 0 : 0.4, arms: 1 }) },
      inhale: { frames: 4, fps: 10, draw: (c, e, i) => devoradorBody(c, e, { bob: -1, open: 1.1 + (i % 2) * 0.1, arms: 0.8 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => devoradorBody(c, e, { bob: i % 2, open: 1, arms: 1 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => devoradorBody(c, e, { bob: 1, open: 0.6 }) },
      death: { frames: 6, fps: 6, loop: false, draw: (c, e, i) => { devoradorBody(c, e, { bob: i * 2, open: 1 }); burst(c, e, i / 5); } },
    },
  }));
}
