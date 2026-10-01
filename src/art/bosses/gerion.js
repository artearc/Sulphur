// GERIÓN — "sozza imagine di froda": the face of a just man, kindly outside; a serpent's trunk painted
// with knots and wheels; two hairy paws; a forked scorpion tail venomous at the tip (Canto XVII).
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const SERP = [0x06100e, 0x0c201c, 0x14342e, 0x1e4c42, 0x2a685a, 0x3c8a74];
const PAINT = [0x7440b0, 0xa070e0, 0xd8b84a, 0xe86a4a];
const FACE = [0x3a2a20, 0x6a5040, 0x987660, 0xc49e84, 0xe8c8ac];
const FUR = [0x140c08, 0x261810, 0x3a2618, 0x523822];
const W = 128, H = 100;

function gerion(c, e, p) {
  const by = 96, bob = p.bob || 0, ph = p.ph || 0;
  const tail = p.tail ?? 0;          // 0 rest .. 1 raised to sting
  // serpent trunk curving across the frame, painted with knots and wheels (deceit)
  const pts = [];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    const x = 22 + t * 76;
    const y = by - 20 - Math.sin(t * 3.2 + ph * 0.5) * 8 - (1 - t) * 6 + bob * (1 - t);
    pts.push([x, y, 12 - t * 6]);
  }
  for (const [x, y, w] of pts) for (let s = -w; s <= w; s++) {
    const f = 3.6 - s * 0.25 / (w / 6);
    c.set(x, y + s * 0.6, pk(SERP, f, Math.round(x), Math.round(y + s)));
  }
  for (let k = 2; k < 40; k += 5) {                              // painted wheels and knots
    const [x, y] = pts[k];
    c.ring(x, y, 2.5, PAINT[k % 4], 1);
    if (e && k % 10 === 2) e.set(x, y, PAINT[1]);
  }
  // scorpion tail rising from the end
  const [tx0, ty0] = pts[40];
  let tx = tx0, ty = ty0;
  for (let k = 0; k < 18; k++) {
    const t = k / 18;
    tx += 1.6 - t * 1.2 * (1 + tail);
    ty -= 0.6 + tail * 2.2 * (1 - t * 0.3) - (k > 12 ? -1.5 : 0) * tail;
    c.disc(tx, ty, 2.4 - t * 1.4, SERP[2 + (k % 3)]);
  }
  // forked venomous tip
  c.line(tx, ty, tx + 5, ty - 3, R.bone[4]); c.line(tx, ty, tx + 4, ty + 3, R.bone[3]);
  c.set(tx + 5, ty - 3, 0xa0ff60);
  if (e) { e.set(tx + 5, ty - 3, 0x80ff40); e.set(tx + 4, ty + 3, 0x80ff40); }
  // the honest man's torso + face
  const hx = 30 + (p.lean || 0), hy = by - 46 + bob;
  c.poly([[hx - 7, hy + 10], [hx + 7, hy + 10], [hx + 9, by - 26 + bob], [hx - 9, by - 26 + bob]], null, (x, y) => pk([0x241818, 0x3e2a2a, 0x5e4444, 0x7e6060], 3 - (x - hx + 9) * 0.15, x, y));
  c.ellipse(hx, hy, 6, 7, null, (nx, ny, x, y) => pk(FACE, 3.8 - nx - ny, x, y));
  // gentle eyes (until they aren't)
  const evil = p.evil || 0;
  c.set(hx - 2, hy - 1, evil ? 0xff3040 : 0x2a3a5a); c.set(hx + 2, hy - 1, evil ? 0xff3040 : 0x2a3a5a);
  if (e && evil) { e.set(hx - 2, hy - 1, 0xff3040); e.set(hx + 2, hy - 1, 0xff3040); }
  if (p.smile) { c.hline(hx - 2, hx + 2, hy + 3, FACE[1]); c.set(hx - 3, hy + 2, FACE[1]); c.set(hx + 3, hy + 2, FACE[1]); }
  else c.hline(hx - 1, hx + 1, hy + 3, FACE[1]);
  c.ellipse(hx, hy - 5, 6, 3, null, (nx, ny, x, y) => pk([0x3a3030, 0x5a4a48, 0x7a6a66], 2.6 - ny, x, y));
  // two hairy paws
  for (const [px, s] of [[hx - 12, -1], [hx + 12, 1]]) {
    const py = by - 18 + bob - (p.paw && s > 0 ? 10 : 0);
    c.thickLine(hx + s * 6, hy + 14, px, py, 2.2, FUR[2]);
    for (let k = -1; k <= 1; k++) c.line(px, py, px + s * 3 + k, py + 4, R.bone[2]);
  }
}

export function gerionSheet() {
  return getSheet('boss_gerion', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 6, draw: (c, e, i) => gerion(c, e, { bob: [0, 0, 1, 1, 1, 0][i], ph: i, smile: true }) },
      move: { frames: 6, fps: 9, draw: (c, e, i) => gerion(c, e, { bob: [0, 1, 1, 0, 1, 1][i], ph: i * 1.5, smile: true }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => gerion(c, e, { ph: i, tail: 0.4 + i * 0.25, smile: true }) },
      sting: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => gerion(c, e, { ph: i, tail: 1 - i * 0.4, evil: 1 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => gerion(c, e, { ph: i, paw: true, evil: 1, lean: 2 }) },
      roar: { frames: 4, fps: 8, draw: (c, e, i) => gerion(c, e, { ph: i * 2, evil: 1, tail: 0.7 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => gerion(c, e, { bob: 2, evil: 1 }) },
      death: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => gerion(c, e, { bob: i * 3, ph: i, evil: i < 3 ? 1 : 0, tail: -i * 0.1 }) },
    },
  }));
}
