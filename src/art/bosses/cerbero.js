// CERBERO, il gran vermo — three-headed dog of Gula: red eyes, greasy black beard, swollen belly,
// clawed paws that flay the gluttons in the rain (Canto VI).
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const HIDE = [0x080806, 0x14120c, 0x221e14, 0x34301e, 0x4a442a, 0x625a38];
const BELLY = [0x2a2a14, 0x46461e, 0x66662a, 0x86863a, 0xa6a24e];
const BEARD = [0x040404, 0x0c0a08, 0x16120e];
const W = 120, H = 92;

function head(c, e, hx, hy, o) {
  // o: { open, lift, eye, drool, howl }
  const open = o.open || 0;
  c.ellipse(hx, hy, 9, 7.5, null, (nx, ny, x, y) => pk(HIDE, 3.8 - nx * 1.1 - ny * 1.2, x, y));
  // snout
  c.poly([[hx + 3, hy - 3], [hx + 15, hy - 1], [hx + 15, hy + 3], [hx + 3, hy + 4]], null, (x, y) => pk(HIDE, 3.4 - (y - hy) * 0.2, x, y));
  c.set(hx + 15, hy - 1, 0x000000); c.set(hx + 14, hy - 1, 0x000000);
  // jaw
  c.poly([[hx + 3, hy + 4], [hx + 14, hy + 3 + open], [hx + 13, hy + 6 + open], [hx + 2, hy + 7]], null, (x, y) => pk(HIDE, 2.4, x, y));
  if (open > 0) {
    c.poly([[hx + 4, hy + 4], [hx + 14, hy + 3], [hx + 14, hy + 3 + open], [hx + 4, hy + 5]], 0x3a0408);
    for (let k = 0; k < 5; k++) { c.set(hx + 5 + k * 2, hy + 3, R.bone[4]); c.set(hx + 5 + k * 2, hy + 3 + open, R.bone[3]); }
    if (o.vomit && e) for (let k = 0; k < 4; k++) e.set(hx + 7 + k * 2, hy + 4, R.poison[4]);
  }
  // greasy black beard
  for (let k = 0; k < 7; k++) c.vline(hx - 3 + k * 2, hy + 6, hy + 11 + (k % 3), BEARD[k % 3]);
  // ears
  c.poly([[hx - 6, hy - 5], [hx - 9, hy - 13 - (o.lift || 0)], [hx - 2, hy - 7]], HIDE[2]);
  // the burning red eye
  const ey = o.eye ?? 0xff2010;
  c.rect(hx + 2, hy - 3, 3, 2, ey); if (e) e.rect(hx + 2, hy - 3, 3, 2, ey);
  c.set(hx + 4, hy - 4, HIDE[0]);
  if (o.drool) c.vline(hx + 8, hy + 7 + open, hy + 10 + open, R.poison[4]);
}

function cerbero(c, e, p) {
  const by = 88, bob = p.bob || 0, step = p.step || 0;
  // back legs
  for (const [lx, s] of [[24, 1], [36, -1]]) { c.thickLine(lx, 62 + bob, lx - 2 + step * s, by - 3, 4, HIDE[1]); c.rect(lx - 6 + step * s, by - 4, 9, 4, HIDE[0]); }
  // tail: a serpent
  for (let k = 0; k < 18; k++) { const t = k / 18; c.disc(16 - k * 0.8, 52 + bob - Math.sin(t * 4 + (p.ph || 0)) * 6, 2 - t, k % 3 ? HIDE[2] : HIDE[3]); }
  // body with swollen belly
  c.ellipse(52, 56 + bob, 34, 17, null, (nx, ny, x, y) => {
    if (ny > 0.25 && Math.abs(nx) < 0.75) return pk(BELLY, 3 - ny * 2 + (bayer(x, y) < 0.15 ? -1 : 0), x, y);
    let f = 3.6 - nx * 0.8 - ny * 1.4;
    if ((x * 3 + y) % 13 === 0) f -= 1;
    return pk(HIDE, f, x, y);
  });
  // mud and rain streaks
  for (let k = 0; k < 10; k++) c.vline(30 + k * 5, 64 + bob + (k % 3), 68 + bob + (k % 4), R.poison[1]);
  // front legs with flaying claws
  const claw = p.claw || 0;
  for (const [lx, s] of [[70, -1], [82, 1]]) {
    const fx = lx + step * s + (s > 0 ? claw * 8 : 0), fy = by - 3 - (s > 0 ? claw * 10 : 0);
    c.thickLine(lx, 62 + bob, fx, fy, 4, HIDE[2]);
    for (let k = -1; k <= 1; k++) c.line(fx + 2, fy, fx + 5, fy + 2 + k * 2, R.bone[3]);
  }
  // three heads on thick necks
  const hp = p.heads || [{}, {}, {}];
  const bases = [[64, 46], [74, 38], [84, 48]];
  const offs = [[70, 34], [86, 22], [98, 40]];
  for (let k = 0; k < 3; k++) {
    const [bx, byy] = bases[k];
    const h = hp[k] || {};
    const [hx, hy] = [offs[k][0] + (h.dx || 0), offs[k][1] + bob + (h.dy || 0)];
    c.thickLine(bx, byy + bob, hx - 2, hy + 2, 6 - k % 2, HIDE[2 + (k % 2)]);
    if (h.stunned) head(c, e, hx, hy + 4, { ...h, eye: 0x401010, open: 3, lift: -2 });
    else head(c, e, hx, hy, h);
  }
}

const heads = (a, b, c2) => [a || {}, b || {}, c2 || {}];

export function cerberoSheet() {
  return getSheet('boss_cerbero', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 6, draw: (c, e, i) => cerbero(c, e, { bob: [0, 0, 1, 1, 1, 0][i], ph: i, heads: heads({ drool: true, dy: i % 2 }, { dy: (i + 1) % 2 }, { drool: i > 2 }) }) },
      move: { frames: 6, fps: 9, draw: (c, e, i) => cerbero(c, e, { bob: [0, 1, 1, 0, 1, 1][i], step: [-2, -1, 1, 2, 1, -1][i], ph: i, heads: heads({ dy: i % 2 }, {}, { dy: -(i % 2) }) }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => cerbero(c, e, { bob: -1, heads: heads({ open: 2 + i, dx: -2 }, { lift: 2 }, { open: 2 }) }) },
      bite: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => cerbero(c, e, { bob: 1, heads: heads({ open: i === 0 ? 6 : 1, dx: 6 - i * 2, dy: 3 }, {}, {}) }) },
      vomit: { frames: 4, fps: 10, draw: (c, e, i) => cerbero(c, e, { bob: i % 2, heads: heads({}, { open: 5, dy: 4, vomit: true, dx: 2 }, {}) }) },
      howl: { frames: 4, fps: 10, draw: (c, e, i) => cerbero(c, e, { bob: 0, heads: heads({}, {}, { open: 5, dy: -6 - (i % 2), lift: 4 }) }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => cerbero(c, e, { bob: 2 - i, claw: 1 - i * 0.4, heads: heads({ open: 3 }, { open: 3 }, { open: 3 }) }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => cerbero(c, e, { bob: i % 2, heads: heads({ open: 4 + (i % 2) }, { open: 5, dy: -3 }, { open: 4 + ((i + 1) % 2) }) }) },
      stunL: { frames: 2, fps: 4, draw: (c, e, i) => cerbero(c, e, { bob: 1, heads: heads({ stunned: true }, {}, {}) }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => cerbero(c, e, { bob: 2, heads: heads({ dy: 2, open: 2 }, { dy: 2, open: 2 }, { dy: 2, open: 2 }) }) },
      death: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => cerbero(c, e, { bob: i * 3, heads: heads({ stunned: i > 1, dy: i * 2 }, { stunned: i > 2, dy: i * 3 }, { stunned: i > 3, dy: i * 2 }) }) },
    },
  }));
}
