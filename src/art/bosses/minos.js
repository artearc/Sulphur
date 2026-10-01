// MINOS, the Judge — crowned giant whose serpent tail coils once for every circle it condemns.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer, mix } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const ROBE = [0x0c0812, 0x16101e, 0x241a30, 0x342648, 0x463460, 0x5c4678];
const SKIN = [0x1e1e2a, 0x30303e, 0x464658, 0x606076, 0x7c7c94];
const SCALE = [0x0a120e, 0x14221a, 0x203426, 0x2e4a36, 0x426648, 0x5e8a5e];
const W = 88, H = 96;

function drawMinos(c, e, p) {
  const cx = 44 + (p.lean || 0);
  const by = 92;
  const bob = p.bob || 0;
  const coils = p.coils ?? 3;
  const tailPh = p.tail || 0;
  // ---- serpent tail coiled around the base (behind and in front) ----
  const coil = (k, front) => {
    const cy = by - 6 - k * 6;
    const rx = 26 - k * 3, ry = 5;
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const isFront = Math.sin(a) > 0;
      if (isFront !== front) continue;
      const x = cx + Math.cos(a + tailPh * 0.2) * rx, y = cy + Math.sin(a) * ry;
      const th = 4 - k * 0.5;
      for (let t = -th; t <= th; t++) {
        const f = 3 - t * 0.35 + (isFront ? 0.6 : -0.8) + ((Math.round(a * 20) + k) % 4 === 0 ? -1.2 : 0);
        c.set(x, y + t, pk(SCALE, f, Math.round(x), Math.round(y + t)));
      }
      if (isFront && (Math.round(a * 30) % 7 === 0)) c.set(x, y - th, SCALE[5]);
    }
  };
  for (let k = 0; k < coils; k++) coil(k, false);
  // ---- robed body ----
  const top = 30 + bob, waist = 62 + bob;
  c.poly([[cx - 14, top], [cx + 14, top], [cx + 22, by - 8], [cx - 22, by - 8]], null, (x, y) => {
    const u = (x - (cx - 22)) / 44;
    let f = 3.8 - u * 2.8 - (y - top) * 0.012;
    if (Math.abs(x - cx) < 1 && y > top + 4) return pk(R.gold, 3, x, y);
    if ((x - cx + 40) % 9 === 0 && y > waist) f -= 1.2;
    return pk(ROBE, f, x, y);
  });
  // gold-trimmed collar & belt of keys
  for (let x = cx - 14; x <= cx + 14; x++) { c.set(x, top, R.gold[3]); c.set(x, top + 1, R.gold[1]); }
  for (let x = cx - 17; x <= cx + 17; x++) c.set(x, waist, R.gold[2]);
  for (let k = -2; k <= 2; k++) { c.vline(cx + k * 6, waist + 1, waist + 4, R.steel[3]); c.set(cx + k * 6, waist + 5, R.steel[4]); }
  // shoulders (pauldrons of bone)
  for (const s of [-1, 1]) c.ellipse(cx + s * 15, top + 3, 7, 5, null, (nx, ny, x, y) => pk(R.bone, 3.2 - nx * s * 0.6 - ny * 1.2, x, y));
  // ---- arms ----
  const arm = (s, hx, hy) => {
    const sx = cx + s * 17, sy = top + 6;
    c.thickLine(sx, sy, hx, hy, 3, ROBE[2]);
    c.thickLine(sx, sy + 1, hx, hy + 1, 1.5, ROBE[1]);
    // claw hand
    c.ellipse(hx, hy + 2, 3.5, 3, null, (nx, ny, x, y) => pk(SKIN, 3 - nx - ny, x, y));
    for (let k = -1; k <= 1; k++) c.line(hx + k * 2, hy + 4, hx + k * 2 + s, hy + 8, SKIN[1]);
  };
  const A = p.arms || 'rest';
  if (A === 'rest') { arm(-1, cx - 22, top + 26); arm(1, cx + 22, top + 26); }
  else if (A === 'raise') { arm(-1, cx - 26, top - 8); arm(1, cx + 26, top - 8); }
  else if (A === 'point') { arm(-1, cx - 22, top + 24); arm(1, cx + 34, top + 10); }
  else if (A === 'slam') { arm(-1, cx - 30, top + 34); arm(1, cx + 30, top + 34); }
  // ledger of the damned in the left hand (when resting)
  if (A === 'rest' || A === 'point') {
    c.rect(cx - 30, top + 22, 9, 12, R.bone[3]); c.rect(cx - 29, top + 23, 7, 10, R.bone[4]);
    for (let k = 0; k < 4; k++) c.hline(cx - 28, cx - 23, top + 25 + k * 2, R.bone[1]);
    c.vline(cx - 30, top + 22, top + 33, R.crimson[2]);
  }
  // ---- head: crowned, bearded, glowing eyes ----
  const hy = top - 10;
  c.ellipse(cx, hy, 8, 9, null, (nx, ny, x, y) => pk(SKIN, 3.4 - nx * 1.3 - ny, x, y));
  // beard flowing down onto the chest
  c.poly([[cx - 7, hy + 3], [cx + 7, hy + 3], [cx + 4, hy + 20], [cx, hy + 24], [cx - 4, hy + 20]], null, (x, y) => pk([0x14101a, 0x241c2e, 0x382c44, 0x4e405e], 2.6 - (x - cx) * 0.1 - (y - hy) * 0.05, x, y));
  // eyes
  const glow = p.eyes ?? 0xd0c0ff;
  for (const s of [-1, 1]) { c.rect(cx + s * 3 - (s > 0 ? 0 : 1), hy - 1, 2, 2, glow); if (e) e.rect(cx + s * 3 - (s > 0 ? 0 : 1), hy - 1, 2, 2, glow); }
  c.hline(cx - 5, cx + 5, hy - 3, SKIN[0]);
  if (p.roar) { c.rect(cx - 2, hy + 3, 5, 3, 0x0a0408); if (e) e.rect(cx - 1, hy + 4, 3, 1, 0x402060); }
  // iron crown with tall spikes
  for (let x = cx - 8; x <= cx + 8; x++) { c.set(x, hy - 7, R.steel[2]); c.set(x, hy - 8, R.steel[3]); }
  for (const k of [-8, -4, 0, 4, 8]) { const h = k === 0 ? 7 : Math.abs(k) === 4 ? 5 : 3; c.vline(cx + k, hy - 8 - h, hy - 8, R.steel[3]); c.set(cx + k, hy - 9 - h, R.steel[5]); }
  c.set(cx, hy - 10, R.crimson[4]); if (e) e.set(cx, hy - 10, R.crimson[3]);
  // front coils over the robe
  for (let k = 0; k < coils; k++) coil(k, true);
  // tail tip rising behind (rattling while judging)
  const tx = cx + 30, ty = by - 30 + Math.round(Math.sin(tailPh) * 3);
  c.thickLine(cx + 24, by - 10, tx, ty, 2, SCALE[2]);
  c.thickLine(tx, ty, tx + 6, ty - 10 + Math.round(Math.cos(tailPh) * 2), 1.2, SCALE[3]);
  c.set(tx + 6, ty - 11, SCALE[5]);
}

export function minosSheet() {
  return getSheet('boss_minos', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 6, draw: (c, e, i) => drawMinos(c, e, { bob: [0, 0, 1, 1, 1, 0][i], tail: i * 1.05 }) },
      move: { frames: 6, fps: 8, draw: (c, e, i) => drawMinos(c, e, { bob: [0, 1, 1, 0, 1, 1][i], tail: i * 1.4, lean: 1 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => drawMinos(c, e, { bob: 1, arms: 'raise', tail: i * 2, eyes: 0xffffff }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => drawMinos(c, e, { bob: 2 - i, arms: 'slam', tail: i, lean: 0 }) },
      point: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => drawMinos(c, e, { bob: 0, arms: 'point', tail: i * 2 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => drawMinos(c, e, { bob: i % 2, arms: 'raise', roar: true, tail: i * 1.5, eyes: 0xff80ff }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => drawMinos(c, e, { bob: 1, lean: -2 }) },
      death: { frames: 4, fps: 4, loop: false, draw: (c, e, i) => drawMinos(c, e, { bob: 2 + i * 3, arms: i > 1 ? 'slam' : 'raise', coils: Math.max(0, 3 - i), roar: true }) },
    },
  }));
}
