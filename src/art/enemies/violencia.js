// VII · VIOLENCIA bestiary art — blood desert, Phlegethon, the wood of the suicides.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';
import { centaurBody } from './minibosses_b.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const BULL = [0x120806, 0x241210, 0x3a1e18, 0x542c22, 0x703c2e, 0x8e503c];
const HARPY = [0x0e0a0a, 0x1e1614, 0x342620, 0x4a382c, 0x604a3a];
const FACE = [0x2a1a14, 0x4e3428, 0x785444, 0xa07a64, 0xc8a088];

export function centauroSheet() {
  return getSheet('en_centauro', () => new SpriteSheet({
    w: 48, h: 40, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => centaurBody(c, e, { s: 0.85, x0: 6, by: 38, bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 6, fps: 14, draw: (c, e, i) => centaurBody(c, e, { s: 0.85, x0: 6, by: 38, bob: [0, 1, 1, 0, 1, 1][i], leg: [-1, -0.5, 0.5, 1, 0.5, -0.5][i], ph: i, lean: 1 }) },
      windup: { frames: 2, fps: 5, loop: false, draw: (c, e, i) => centaurBody(c, e, { s: 0.85, x0: 6, by: 38, draw: 1 + i, ph: i }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => centaurBody(c, e, { s: 0.85, x0: 6, by: 38, draw: i === 0 ? 2 : 0, ph: i }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => centaurBody(c, e, { s: 0.85, x0: 6, by: 38, lean: -2, bob: 1, ph: 0 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => centaurBody(c, e, { s: 0.85, x0: 6, by: 38 + Math.min(i, 2), bob: i * 2, lean: -i, ph: i }) },
    },
  }));
}

// BESTIA — minotaur-kin: bull head, hunched human torso, broken shackles
function bestiaBody(c, e, p) {
  const cx = 20, by = 42;
  const bob = p.bob || 0, lean = p.lean || 0;
  // legs (hooves)
  for (const s of [-1, 1]) { c.thickLine(cx + s * 4, by - 14 + bob, cx + s * 6 + (p.step || 0) * s, by - 2, 1.6, BULL[1]); c.rect(cx + s * 6 + (p.step || 0) * s - 1, by - 2, 3, 2, 0x080404); }
  // torso
  c.poly([[cx - 9 + lean, by - 30 + bob], [cx + 9 + lean, by - 30 + bob], [cx + 6, by - 13 + bob], [cx - 6, by - 13 + bob]], null, (x, y) => {
    let f = 3.4 - (x - cx + 9) * 0.12 - (y - by + 30) * 0.02;
    if ((x + y) % 8 === 0) f -= 0.8;
    return pk(BULL, f, x, y);
  });
  // gore stains
  for (let k = 0; k < 5; k++) c.set(cx - 5 + k * 3, by - 22 + (k % 3) + bob, R.blood[3]);
  // bull head lowered
  const hx = cx + 8 + lean, hy = by - 33 + bob + (p.lower || 0);
  c.ellipse(hx, hy, 5.5, 4.5, null, (nx, ny, x, y) => pk(BULL, 4 - nx - ny, x, y));
  c.rect(hx + 3, hy, 4, 3, BULL[4]); c.set(hx + 6, hy + 1, 0x080404);
  // horns
  c.line(hx - 3, hy - 3, hx - 7, hy - 9, R.bone[3]); c.line(hx - 7, hy - 9, hx - 5, hy - 11, R.bone[4]);
  c.line(hx + 2, hy - 4, hx + 6, hy - 9, R.bone[3]); c.set(hx + 6, hy - 10, R.bone[4]);
  c.set(hx + 7, hy - 9, R.blood[3]);
  c.set(hx + 1, hy - 1, 0xff3020); if (e) e.set(hx + 1, hy - 1, 0xff3020);
  // arms with shackles
  c.thickLine(cx - 8 + lean, by - 28 + bob, cx - 12, by - 16 + bob - (p.raise || 0) * 8, 1.6, BULL[2]);
  c.thickLine(cx + 8 + lean, by - 28 + bob, cx + 12 + (p.punch || 0) * 4, by - 18 + bob - (p.raise || 0) * 8, 1.6, BULL[3]);
  c.rect(cx - 13, by - 18 + bob - (p.raise || 0) * 8, 3, 2, R.steel[3]);
  for (let k = 0; k < 3; k++) c.set(cx - 14 - k, by - 16 + bob + k - (p.raise || 0) * 8, R.steel[2]);
}

export function bestiaSheet() {
  return getSheet('en_bestia', () => new SpriteSheet({
    w: 40, h: 46, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => bestiaBody(c, e, { bob: [0, 0, 1, 1][i] }) },
      move: { frames: 4, fps: 9, draw: (c, e, i) => bestiaBody(c, e, { bob: [0, 1, 0, 1][i], step: i % 2 ? 1 : -1, lean: 1 }) },
      windup: { frames: 2, fps: 5, loop: false, draw: (c, e, i) => bestiaBody(c, e, { bob: 1, lower: 3, lean: -1, raise: 0.5 }) },
      attack: { frames: 4, fps: 14, draw: (c, e, i) => bestiaBody(c, e, { bob: i % 2, lower: 4, lean: 3, step: i % 2 ? 2 : -2 }) },
      slam: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => bestiaBody(c, e, { bob: 2 - i, raise: i === 0 ? 1 : 0, punch: i }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => bestiaBody(c, e, { bob: 2, lower: -2, lean: -2 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => bestiaBody(c, e, { bob: i * 3, lower: i, lean: -i }) },
    },
  }));
}

// ARPÍA — woman-faced bird of the wood of the suicides: wide wings, talons, a sorrowful face
function arpiaBody(c, e, p) {
  const cx = 18, cy = 14 + (p.bob || 0);
  const flap = p.flap ?? 0;          // -1 up .. 1 down
  // wings
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const wx = cx + s * (4 + k * 3), wy = cy - 2 + flap * (k * 1.6) - (k === 4 ? 1 : 0);
      c.line(cx + s * 2, cy, wx, wy, HARPY[2 + (k % 2)]);
      c.line(wx, wy, wx - s, wy + 5 - flap * 2, HARPY[1]);
      if (k % 2) c.set(wx, wy + 1, HARPY[4]);
    }
  }
  // feathered body
  c.ellipse(cx, cy + 4, 3.6, 5, null, (nx, ny, x, y) => pk(HARPY, 3.4 - nx - ny, x, y));
  // talons
  const t = p.talons || 0;
  c.line(cx - 1, cy + 9, cx - 2, cy + 12 + t * 2, R.bone[2]); c.line(cx + 1, cy + 9, cx + 2, cy + 12 + t * 2, R.bone[2]);
  // human face (pale, weeping)
  c.ellipse(cx + 1, cy - 2, 2.8, 3.2, null, (nx, ny, x, y) => pk(FACE, 3.6 - nx - ny, x, y));
  c.ellipse(cx, cy - 4, 3.2, 1.8, HARPY[1]);
  c.set(cx, cy - 2, 0x0a0404); c.set(cx + 2, cy - 2, 0x0a0404);
  if (e) { e.set(cx, cy - 2, 0xc02820); e.set(cx + 2, cy - 2, 0xc02820); }
  if (p.shriek) c.rect(cx, cy, 3, 2, 0x200404); else c.hline(cx, cx + 2, cy, FACE[0]);
}

export function arpiaSheet() {
  return getSheet('en_arpia', () => new SpriteSheet({
    w: 36, h: 30, emissive: true,
    anims: {
      idle: { frames: 4, fps: 10, draw: (c, e, i) => arpiaBody(c, e, { flap: [-1, 0, 1, 0][i], bob: [0, 1, 1, 0][i] }) },
      move: { frames: 4, fps: 12, draw: (c, e, i) => arpiaBody(c, e, { flap: [-1, 0, 1, 0][i], bob: [0, 1, 1, 0][i] }) },
      windup: { frames: 2, fps: 8, loop: false, draw: (c, e, i) => arpiaBody(c, e, { flap: -1, shriek: true, talons: 1 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => arpiaBody(c, e, { flap: 1, talons: 2, shriek: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => arpiaBody(c, e, { flap: 0.5, bob: 2 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => arpiaBody(c, e, { flap: 1, bob: i * 3, talons: 0 }) },
    },
  }));
}
