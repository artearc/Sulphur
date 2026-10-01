// MEDUSA — the Gorgon summoned at the gates of Dis. Veiled face, crown of living serpents,
// a skirt of petrified heretics. When the veil lifts, the world turns to stone.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const SCALE = [0x08140c, 0x10241a, 0x1c3a28, 0x2c5438, 0x40744c, 0x5c9664];
const SKIN = [0x1a2418, 0x2e3e2a, 0x4a5c42, 0x6a7c5c, 0x8e9e7c];
const STONE = [0x1a1818, 0x2e2a2a, 0x464040, 0x625a58, 0x807876, 0xa09896];
const VEIL = [0x1a0606, 0x340c0c, 0x521414, 0x6e1e1e];
const W = 104, H = 112;

function medusa(c, e, p) {
  const cx = 52, by = 108, bob = p.bob || 0, ph = p.ph || 0;
  // a coiling serpent tail as lower body, ringed by petrified heretics
  for (let k = 0; k < 3; k++) {
    const ry = by - 10 - k * 8, rx = 30 - k * 6;
    for (let a = 0; a < Math.PI * 2; a += 0.03) {
      const x = cx + Math.cos(a + ph * 0.3 + k) * rx, y = ry + Math.sin(a + ph * 0.3 + k) * 5;
      const front = Math.sin(a + ph * 0.3 + k) > 0;
      for (let t = -3; t <= 3; t++) c.set(x, y + t, pk(SCALE, 3 - t * 0.4 + (front ? 0.6 : -0.6) + ((Math.round(a * 20) % 4) === 0 ? -1 : 0), Math.round(x), Math.round(y + t)));
    }
  }
  // petrified figures half-sunk around her
  for (const [fx, fs] of [[cx - 34, -1], [cx + 34, 1]]) {
    c.poly([[fx - 4, by - 2], [fx + 4, by - 2], [fx + 3, by - 18], [fx - 3, by - 18]], null, (x, y) => pk(STONE, 3.2 - (x - fx + 4) * 0.25, x, y));
    c.ellipse(fx, by - 21, 3, 3.4, null, (nx, ny, x, y) => pk(STONE, 3.6 - nx - ny, x, y));
    c.line(fx + fs * 3, by - 15, fx + fs * 8, by - 24, STONE[3]);                // raised arm frozen in horror
  }
  // torso
  const top = by - 66 + bob;
  c.poly([[cx - 10, top + 16], [cx + 10, top + 16], [cx + 13, by - 30], [cx - 13, by - 30]], null, (x, y) => pk(SKIN, 3.4 - (x - cx + 13) * 0.1, x, y));
  // bronze breastplate of scales
  for (let y = top + 18; y < by - 32; y += 3) for (let x = cx - 9; x <= cx + 9; x += 3) c.ellipse(x + (y % 2), y, 1.4, 1.2, R.bronze[2 + ((x + y) % 2)]);
  // arms
  const A = p.arms || 'rest';
  const arm = (s, hx, hy) => { c.thickLine(cx + s * 10, top + 18, hx, hy, 2, SKIN[2 + (s > 0 ? 1 : 0)]); for (let k = -1; k <= 1; k++) c.line(hx, hy, hx + s * 3, hy + k * 2 + 2, SKIN[4]); };
  if (A === 'rest') { arm(-1, cx - 18, top + 36); arm(1, cx + 18, top + 36); }
  else if (A === 'veil') { arm(-1, cx - 6, top + 4); arm(1, cx + 6, top + 4); }
  else if (A === 'lash') { arm(-1, cx - 16, top + 30); arm(1, cx + 26, top + 18); }
  else if (A === 'raise') { arm(-1, cx - 20, top - 4); arm(1, cx + 20, top - 4); }
  // head
  const hy = top + 6;
  c.ellipse(cx, hy, 7, 8, null, (nx, ny, x, y) => pk(SKIN, 3.8 - nx - ny, x, y));
  // the veil (crimson), lifted according to p.veil (0 = covering .. 1 = lifted)
  const v = p.veil ?? 0;
  if (v < 1) {
    const vy = hy - 7 + Math.round(v * -8);
    c.poly([[cx - 8, vy], [cx + 8, vy], [cx + 9, vy + 14 - v * 10], [cx - 9, vy + 14 - v * 10]], null, (x, y) => pk(VEIL, 3 - (y - vy) * 0.15 + ((x + y) % 5 === 0 ? -1 : 0), x, y));
  }
  if (v > 0.4) {
    // the eyes: unbearable light
    const glow = v > 0.9 ? 0xffffff : 0xb8f0b0;
    c.rect(cx - 4, hy - 1, 3, 2, glow); c.rect(cx + 1, hy - 1, 3, 2, glow);
    if (e) { e.rect(cx - 5, hy - 2, 5, 4, 0x7ac080); e.rect(cx, hy - 2, 5, 4, 0x7ac080); e.rect(cx - 4, hy - 1, 3, 2, glow); e.rect(cx + 1, hy - 1, 3, 2, glow); }
  } else if (e) { e.set(cx - 3, hy + 2, 0x305a30); e.set(cx + 2, hy + 2, 0x305a30); }
  // crown of living serpents
  for (let k = 0; k < 11; k++) {
    let x = cx - 9 + k * 1.8, y = hy - 6;
    const len = 9 + (k % 3) * 3 + (p.wild ? 4 : 0);
    for (let s = 0; s < len; s++) {
      x += Math.cos(k * 0.9 + s * 0.6 + ph * 1.5) * 1.1 + (k - 5) * 0.08;
      y -= 0.8 + (p.wild ? 0.2 : 0);
      c.set(x, y, SCALE[2 + ((s + k) % 3)]); c.set(x + 1, y, SCALE[1]);
    }
    c.set(x, y, SCALE[5]); if (e && k % 3 === 0) e.set(x + 1, y, 0xffd040);
  }
}

export function medusaSheet() {
  return getSheet('boss_medusa', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 7, draw: (c, e, i) => medusa(c, e, { bob: [0, 0, 1, 1, 1, 0][i], ph: i }) },
      move: { frames: 6, fps: 9, draw: (c, e, i) => medusa(c, e, { bob: [0, 1, 1, 0, 1, 1][i], ph: i * 1.5 }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => medusa(c, e, { bob: -1, ph: i, arms: 'raise', wild: true }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => medusa(c, e, { bob: 1, ph: i * 2, arms: 'lash', wild: true }) },
      unveil: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => medusa(c, e, { bob: 0, ph: i, arms: 'veil', veil: i / 5, wild: i > 3 }) },
      gaze: { frames: 2, fps: 8, draw: (c, e, i) => medusa(c, e, { bob: 0, ph: i, arms: 'raise', veil: 1, wild: true }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => medusa(c, e, { bob: i % 2, ph: i * 2, arms: 'raise', wild: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => medusa(c, e, { bob: 2, ph: 1 }) },
      death: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => medusa(c, e, { bob: i * 3, ph: i, arms: 'veil', veil: 0, wild: i < 3 }) },
    },
  }));
}
