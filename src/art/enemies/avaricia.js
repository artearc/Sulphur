// IV · AVARICIA bestiary art — gilded ruin. Gold leaf over rot, bronze, verdigris and greed.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const GOLD = R.gold;
const BRONZE = R.bronze;
const MISER = [0x1a1608, 0x2e2810, 0x4a401c, 0x6a5c2c, 0x8e7c44];    // jaundiced spectral robe
const SKINY = [0x2a2414, 0x4a4026, 0x706040, 0x9a8860, 0xc0b084];
const WOOD = R.wood;

// ESPECTRO CODICIOSO — hunched miser clutching a bag, robe heavy with sewn coins
function misterBody(c, e, p) {
  const cx = 13, by = 31;
  const bob = p.bob || 0;
  const hunch = p.hunch ?? 3;
  // ghostly hem
  for (let x = cx - 7; x <= cx + 6; x++) for (let y = by - 3; y < by; y++) if (bayer(x, y + (p.ph || 0)) < 0.7 - (y - (by - 3)) * 0.25) c.set(x, y, MISER[1]);
  // robe, hunched forward
  c.poly([[cx - 4 + hunch, by - 22 + bob], [cx + 4 + hunch, by - 21 + bob], [cx + 7, by - 3], [cx - 7, by - 3]], null, (x, y) => {
    let f = 3.4 - (x - (cx - 7)) * 0.2 - (y - by + 22) * 0.04;
    if ((x * 3 + y * 5) % 11 === 0) return GOLD[3];             // sewn coins
    return pk(MISER, f, x, y);
  });
  // head bowed, hood
  const hx = cx + hunch + 3, hy = by - 22 + bob;
  c.ellipse(hx, hy, 3.6, 3.8, null, (nx, ny, x, y) => pk(MISER, 3.6 - nx - ny, x, y));
  c.ellipse(hx + 1.5, hy + 1, 1.8, 2.2, SKINY[1]);
  c.set(hx + 2, hy, 0xfff080); if (e) e.set(hx + 2, hy, 0xf2c45a);
  // long crooked nose
  c.line(hx + 3, hy + 1, hx + 5, hy + 3, SKINY[3]);
  // money bag hugged to the chest
  const bx = cx + hunch + 2, byy = by - 13 + bob;
  c.ellipse(bx, byy, 3.4, 3, null, (nx, ny, x, y) => pk(BRONZE, 3 - nx - ny, x, y));
  c.hline(bx - 1, bx + 1, byy - 3, GOLD[4]);
  // claw hands
  const th = p.throw || 0;
  c.thickLine(bx - 2, byy - 2, bx + 3 + th * 3, byy - 2 - th * 4, 0.6, SKINY[2]);
  if (th) { c.set(bx + 4 + th * 3, byy - 3 - th * 4, GOLD[5]); if (e) e.set(bx + 4 + th * 3, byy - 3 - th * 4, GOLD[4]); }
  // greedy glints of gold leaking from the bag
  if (e) e.set(bx, byy - 3, 0x806010);
}

export function codiciosoSheet() {
  return getSheet('en_codicioso', () => new SpriteSheet({
    w: 28, h: 34, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => misterBody(c, e, { bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => misterBody(c, e, { bob: [0, 1, 0, 1][i], ph: i, hunch: 4 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => misterBody(c, e, { bob: 1, hunch: 1, throw: 0 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => misterBody(c, e, { bob: 0, hunch: 2, throw: i + 1 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => misterBody(c, e, { bob: 1, hunch: 0 }) },
      death: { frames: 6, fps: 9, loop: false, draw: (c, e, i) => { misterBody(c, e, { bob: i, hunch: 3 + i }); goldCrumble(c, e, i / 5); } },
    },
  }));
}

function goldCrumble(c, e, k) {
  if (k <= 0) return;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.alpha(x, y)) continue;
    const b = bayer(x * 5, y * 3);
    if (b < k - (c.h - y) / c.h * 0.3) c.erase(x, y);
    else if (b < k + 0.1) { c.set(x, y, GOLD[4]); if (e) e.set(x, y, GOLD[2]); }
  }
}

// RODADOR DE PESOS — a damned soul pushing an enormous weight of gold, forever (Canto VII)
function rodadorBody(c, e, p) {
  const roll = p.roll || 0;
  // the weight: a huge bronze-bound sack/boulder of coin
  const bx = 21, by = 24;
  c.ellipse(bx, by, 10, 9, null, (nx, ny, x, y) => {
    let f = 3.4 - nx * 1.2 - ny * 1.3;
    const a = Math.atan2(ny, nx) + roll;
    if (Math.abs(Math.sin(a * 3)) < 0.12) return BRONZE[1];       // straps
    if (bayer(x, y) < 0.1) f += 1.5;
    return pk(GOLD, f, x, y);
  });
  for (let k = 0; k < 6; k++) { const a = roll + k; c.set(bx + Math.cos(a) * 6, by + Math.sin(a) * 6, GOLD[5]); }
  if (e) e.set(bx - 4, by - 5, 0x806010);
  // the sinner, bent double, shoulder to the weight
  const sx = 8, lean = p.lean ?? 1;
  c.poly([[sx - 3, 14 + lean], [sx + 4, 16], [sx + 5, 30], [sx - 2, 30]], null, (x, y) => pk(MISER, 3 - (x - sx) * 0.2, x, y));
  c.ellipse(sx + 5, 15 + lean, 2.6, 2.6, null, (nx, ny, x, y) => pk(SKINY, 3.2 - nx - ny, x, y));
  c.set(sx + 6, 15 + lean, 0x0a0604);
  // straining arms on the weight
  c.thickLine(sx + 3, 18, bx - 9, 20, 0.7, SKINY[2]);
  c.thickLine(sx + 2, 20, bx - 9, 24, 0.7, SKINY[1]);
  // legs pushing
  const st = p.step || 0;
  c.line(sx, 30, sx - 3 + st, 33, MISER[1]); c.line(sx + 3, 30, sx + 2 - st, 33, MISER[2]);
}

export function rodadorSheet() {
  return getSheet('en_rodador', () => new SpriteSheet({
    w: 36, h: 36, emissive: true,
    anims: {
      idle: { frames: 4, fps: 4, draw: (c, e, i) => rodadorBody(c, e, { roll: 0, lean: i % 2, step: 0 }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => rodadorBody(c, e, { roll: i * 0.4, step: i % 2 ? 1 : -1 }) },
      windup: { frames: 2, fps: 5, loop: false, draw: (c, e, i) => rodadorBody(c, e, { roll: -0.2 * i, lean: 2, step: -1 }) },
      attack: { frames: 4, fps: 16, draw: (c, e, i) => rodadorBody(c, e, { roll: i * 0.8, lean: 0, step: i % 2 ? 2 : -2 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => rodadorBody(c, e, { roll: 0, lean: 3 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { rodadorBody(c, e, { roll: i * 0.3, lean: 3 }); goldCrumble(c, e, i / 5); } },
    },
  }));
}

// COFRE MÍMICO — a reliquary chest that is a mouth
function mimicoBody(c, e, p) {
  const cx = 14, by = 26;
  const open = p.open || 0;           // 0 closed .. 1 wide
  // base
  c.rect(cx - 9, by - 9, 18, 9, WOOD[2]);
  for (let x = cx - 9; x < cx + 9; x++) { c.set(x, by - 9, WOOD[3]); c.set(x, by - 1, WOOD[0]); }
  c.vline(cx - 9, by - 9, by - 1, BRONZE[2]); c.vline(cx + 8, by - 9, by - 1, BRONZE[1]);
  c.vline(cx, by - 9, by - 1, GOLD[3]);
  // lid (tilts up when open)
  const ly = by - 9 - Math.round(open * 6);
  c.poly([[cx - 9, ly], [cx + 9, ly], [cx + 8, ly - 5], [cx - 8, ly - 5]], null, (x, y) => pk(WOOD, 3.2 - (y - ly + 5) * 0.2, x, y));
  c.hline(cx - 9, cx + 8, ly, GOLD[3]); c.set(cx, ly - 2, GOLD[5]);
  if (open > 0) {
    // inside: a red throat and teeth
    c.rect(cx - 8, ly + 1, 16, by - 9 - ly, 0x2a0408);
    for (let k = 0; k < 8; k++) { c.set(cx - 7 + k * 2, ly + 1, R.bone[4]); c.set(cx - 7 + k * 2, by - 10, R.bone[3]); }
    // tongue
    if (open > 0.6) { c.thickLine(cx, by - 11, cx + 6 + open * 6, by - 13 - open * 2, 1, 0xc0404a); }
    if (e) { e.set(cx - 3, ly + 2, 0xff3020); e.set(cx + 3, ly + 2, 0xff3020); }
    c.set(cx - 3, ly + 2, 0xff5040); c.set(cx + 3, ly + 2, 0xff5040);
  } else if (e && p.tell) {
    e.set(cx - 2, by - 9, 0x601008); e.set(cx + 2, by - 9, 0x601008);   // the eyes in the keyhole flicker
  }
  // spindly legs when awake
  if (p.legs) for (const s of [-1, 1]) { c.line(cx + s * 7, by - 1, cx + s * 10, by + 2, R.bone[2]); c.line(cx + s * 4, by - 1, cx + s * 5, by + 2, R.bone[2]); }
}

export function mimicoSheet() {
  return getSheet('en_mimico', () => new SpriteSheet({
    w: 30, h: 30, emissive: true,
    anims: {
      disguise: { frames: 6, fps: 3, draw: (c, e, i) => mimicoBody(c, e, { open: 0, tell: i === 4 }) },
      idle: { frames: 4, fps: 6, draw: (c, e, i) => mimicoBody(c, e, { open: 0.3 + (i % 2) * 0.1, legs: true }) },
      move: { frames: 4, fps: 10, draw: (c, e, i) => mimicoBody(c, e, { open: 0.25 + (i % 2) * 0.15, legs: true }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => mimicoBody(c, e, { open: 0.6 + i * 0.2, legs: true }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => mimicoBody(c, e, { open: 1, legs: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => mimicoBody(c, e, { open: 0.5, legs: true }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => { mimicoBody(c, e, { open: 1 - i * 0.15, legs: true }); goldCrumble(c, e, i / 5); } },
    },
  }));
}

// LA LOBA — the she-wolf of Canto I: gaunt, ribs showing, gold hanging from her jaws (miniboss)
function lobaBody(c, e, p) {
  const by = 44;
  const lean = p.lean || 0, bob = p.bob || 0, leg = p.leg || 0;
  const FUR = [0x0e0c0a, 0x1e1a14, 0x342c22, 0x4e4434, 0x6a5e48, 0x8a7c62];
  // body: long and emaciated
  c.poly([[10, 26 + bob], [38 + lean, 22 + bob], [44 + lean, 28 + bob], [40 + lean, 34 + bob], [12, 34 + bob]], null, (x, y) => {
    let f = 3.2 - (y - 22) * 0.12;
    if (x > 18 && x < 34 && (x % 3 === 0) && y > 26 + bob) f -= 1.3;        // ribs
    return pk(FUR, f, x, y);
  });
  // legs
  const L = [[14, -leg], [20, leg], [34 + lean, leg], [40 + lean, -leg]];
  for (const [lx, ph] of L) { c.thickLine(lx, 32 + bob, lx + ph * 3, by - 1, 0.9, FUR[2]); c.hline(lx + ph * 3 - 1, lx + ph * 3 + 2, by - 1, FUR[0]); }
  // tail
  c.thickLine(10, 27 + bob, 3, 22 + bob - (p.tail || 0), 1.1, FUR[2]);
  // head + jaws
  const hx = 46 + lean, hy = 22 + bob - (p.head || 0);
  c.poly([[hx - 6, hy - 4], [hx + 2, hy - 3], [hx + 8, hy + 1], [hx + 1, hy + 4], [hx - 6, hy + 3]], null, (x, y) => pk(FUR, 3.6 - (y - hy) * 0.3, x, y));
  c.poly([[hx - 4, hy - 4], [hx - 2, hy - 9], [hx, hy - 4]], FUR[3]);                 // ear
  const jaw = p.jaw || 0;
  if (jaw) { c.poly([[hx - 2, hy + 3], [hx + 7, hy + 2 + jaw], [hx + 6, hy + 4 + jaw], [hx - 2, hy + 5]], FUR[1]); for (let k = 0; k < 4; k++) c.set(hx + k * 2, hy + 2 + (k > 1 ? jaw : 0), R.bone[4]); }
  // burning greedy eye
  c.set(hx + 1, hy - 2, 0xffd040); c.set(hx + 2, hy - 2, 0xfff0a0);
  if (e) { e.set(hx + 1, hy - 2, 0xf2c45a); e.set(hx + 2, hy - 2, 0xfff0a0); }
  // coins dripping from the jaw (avarice)
  for (let k = 0; k < 3; k++) { const x = hx + 2 + k * 2, y = hy + 5 + ((k + (p.ph || 0)) % 3) * 2; c.set(x, y, GOLD[4]); if (e) e.set(x, y, GOLD[2]); }
}

export function lobaSheet() {
  return getSheet('en_loba', () => new SpriteSheet({
    w: 58, h: 48, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => lobaBody(c, e, { bob: [0, 0, 1, 1][i], tail: i % 2, ph: i }) },
      move: { frames: 6, fps: 12, draw: (c, e, i) => lobaBody(c, e, { bob: [0, 1, 1, 0, 1, 1][i], leg: [-1, -0.5, 0.5, 1, 0.5, -0.5][i], ph: i, lean: 1 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => lobaBody(c, e, { bob: 2, lean: -3, head: 2, jaw: 2, tail: 3 }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => lobaBody(c, e, { bob: -1, lean: 3, leg: 1, jaw: 4 - i, head: -1 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => lobaBody(c, e, { bob: 0, head: 4, jaw: 4 + (i % 2), ph: i }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => lobaBody(c, e, { bob: 1, lean: -2, jaw: 1 }) },
      death: { frames: 6, fps: 7, loop: false, draw: (c, e, i) => { lobaBody(c, e, { bob: i * 2, lean: -i, head: -i, jaw: 3 }); goldCrumble(c, e, i / 5); } },
    },
  }));
}
