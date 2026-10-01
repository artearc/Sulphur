// LAS TRES FURIAS — Alecto, Megera, Tisífone atop a shard of the walls of Dis (Canto IX):
// stained with blood, girdled with green hydras, serpents for hair.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const SKIN = [0x1a0e0e, 0x341c1a, 0x52302a, 0x744840, 0x96645a];
const HYDRA = [0x0a1a0e, 0x163020, 0x244a30, 0x346a44, 0x4a8a5a];
const WALL = [0x080606, 0x140e0c, 0x221812, 0x34241a, 0x483222];
const RAGS = [0x140406, 0x2a080c, 0x440c14, 0x601420];
const W = 128, H = 100;

function fury(c, e, cx, by, o) {
  const bob = o.bob || 0, arms = o.arms || 'rest', ph = o.ph || 0;
  // ragged wings
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
    const wx = cx + s * (8 + k * 3), wy = by - 30 - (o.wing || 0) * 3 + k * 2 + bob;
    c.line(cx + s * 3, by - 24 + bob, wx, wy, RAGS[1 + (k % 2)]);
    c.line(wx, wy, cx + s * (6 + k * 2), by - 12 + bob, RAGS[0]);
  }
  // body in blood-stained rags
  c.poly([[cx - 4, by - 24 + bob], [cx + 4, by - 24 + bob], [cx + 6, by], [cx - 6, by]], null, (x, y) => {
    let f = 3 - (x - cx + 6) * 0.2;
    if (bayer(x * 3, y) < 0.15) return R.blood[3];
    return pk(RAGS, f, x, y);
  });
  // hydra girdle
  for (let x = cx - 5; x <= cx + 5; x++) c.set(x, by - 14 + bob + Math.round(Math.sin(x * 0.9 + ph) * 1), HYDRA[3 + (x % 2)]);
  // head
  const hy = by - 28 + bob;
  c.ellipse(cx, hy, 3.6, 4, null, (nx, ny, x, y) => pk(SKIN, 3.6 - nx - ny, x, y));
  c.set(cx - 1, hy, o.eye); c.set(cx + 2, hy, o.eye);
  if (e) { e.set(cx - 1, hy, o.eye); e.set(cx + 2, hy, o.eye); }
  if (o.scream) c.rect(cx - 1, hy + 2, 3, 2, 0x200404); else c.hline(cx - 1, cx + 1, hy + 2, SKIN[0]);
  // serpents for hair
  for (let k = 0; k < 6; k++) {
    let x = cx - 3 + k * 1.2, y = hy - 3;
    for (let s = 0; s < 6; s++) { x += Math.cos(k + s * 0.8 + ph) * 0.9 - 0.2 + k * 0.08; y -= 0.9; c.set(x, y, HYDRA[2 + (s % 3)]); }
    c.set(x, y, HYDRA[4]);
  }
  // arms
  const sh = by - 22 + bob;
  if (arms === 'claw') { c.thickLine(cx + 3, sh, cx + 11, sh - 4, 0.8, SKIN[3]); for (let k = 0; k < 3; k++) c.line(cx + 11, sh - 4, cx + 14, sh - 6 + k * 2, R.bone[3]); if (o.fire) { c.disc(cx + 13, sh - 4, 2, R.ember[4]); if (e) e.disc(cx + 13, sh - 4, 2, R.ember[3]); } }
  else if (arms === 'raise') { c.thickLine(cx - 3, sh, cx - 7, sh - 10, 0.8, SKIN[2]); c.thickLine(cx + 3, sh, cx + 7, sh - 10, 0.8, SKIN[3]); }
  else if (arms === 'tear') { c.thickLine(cx - 3, sh, cx - 1, hy + 1, 0.8, SKIN[2]); c.thickLine(cx + 3, sh, cx + 2, hy + 1, 0.8, SKIN[3]); for (let k = 0; k < 3; k++) c.set(cx - 2 + k * 2, hy + 3 + k, R.blood[4]); }
  else { c.thickLine(cx - 3, sh, cx - 6, sh + 8, 0.8, SKIN[2]); c.thickLine(cx + 3, sh, cx + 6, sh + 8, 0.8, SKIN[3]); }
  if (o.spit) for (let k = 0; k < 5; k++) { const x = cx + 6 + k * 2, y = hy - 1 + Math.round(Math.sin(k + ph) * 1); c.set(x, y, HYDRA[4]); if (e) e.set(x, y, 0x5aa060); }
}

function furias(c, e, p) {
  const ph = p.ph || 0;
  // the shard of the walls of Dis, burning at its base
  c.poly([[22, 98], [26, 72], [102, 70], [106, 98]], null, (x, y) => {
    const f = 2.8 - (y - 70) * 0.05 + ((Math.floor(y / 5) + Math.floor(x / 9)) % 2 ? 0.3 : 0);
    if (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 4) % 9 === 0) return WALL[0];
    return pk(WALL, f, x, y);
  });
  for (let x = 24; x < 104; x += 4) { c.rect(x, 66, 2, 4, WALL[3]); }       // crenellations
  for (let k = 0; k < 8; k++) { const x = 28 + k * 10, h = 3 + ((k + ph) % 3) * 2; for (let y = 0; y < h; y++) { const col = R.ember[Math.max(1, 4 - y)]; c.set(x, 97 - y, col); if (e) e.set(x, 97 - y, col); } }
  // blood streaming down the stones
  for (let k = 0; k < 5; k++) c.vline(34 + k * 15, 71, 76 + ((k * 7 + ph) % 10), R.blood[2]);
  const f = p.f || [{}, {}, {}];
  // Megera (left, envious: spits hydras) · Tisífone (center, vengeance) · Alecto (right, relentless)
  fury(c, e, 40, 70, { eye: 0x5aa060, ph, ...f[0] });
  fury(c, e, 64, 66, { eye: 0xff2030, ph: ph + 1, ...f[1] });
  fury(c, e, 88, 70, { eye: 0xffa040, ph: ph + 2, ...f[2] });
}

const F = (a, b, d) => [a || {}, b || {}, d || {}];

export function furiasSheet() {
  return getSheet('boss_furias', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 7, draw: (c, e, i) => furias(c, e, { ph: i, f: F({ bob: i % 2, wing: i % 3 }, { bob: (i + 1) % 2, wing: (i + 1) % 3 }, { bob: i % 2, wing: (i + 2) % 3 }) }) },
      move: { frames: 6, fps: 9, draw: (c, e, i) => furias(c, e, { ph: i, f: F({ bob: i % 2, wing: 2 }, { bob: (i + 1) % 2, wing: 2 }, { bob: i % 2, wing: 2 }) }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => furias(c, e, { ph: i, f: F({ arms: 'raise' }, { arms: 'raise', scream: true }, { arms: 'raise' }) }) },
      claw: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => furias(c, e, { ph: i, f: F({}, {}, { arms: 'claw', fire: true, scream: true, bob: -i }) }) },
      spit: { frames: 4, fps: 10, draw: (c, e, i) => furias(c, e, { ph: i, f: F({ arms: 'raise', spit: true, scream: true }, {}, {}) }) },
      mark: { frames: 4, fps: 8, draw: (c, e, i) => furias(c, e, { ph: i, f: F({}, { arms: 'tear', scream: i % 2 === 0 }, {}) }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => furias(c, e, { ph: i, f: F({ arms: 'claw' }, { arms: 'claw', scream: true }, { arms: 'claw', fire: true }) }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => furias(c, e, { ph: i * 2, f: F({ arms: 'raise', scream: true, wing: 3 }, { arms: 'raise', scream: true, wing: 3 }, { arms: 'raise', scream: true, wing: 3 }) }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => furias(c, e, { ph: 1, f: F({ bob: 2 }, { bob: 2 }, { bob: 2 }) }) },
      death: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => furias(c, e, { ph: i, f: F({ bob: i * 3, arms: 'tear' }, { bob: i * 2, arms: 'tear', scream: true }, { bob: i * 3, arms: 'tear' }) }) },
    },
  }));
}
