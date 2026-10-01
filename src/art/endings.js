// The three destinies, painted as pixel illustrations (320x180).
import { PixelCanvas, bayer, mix } from './pixel.js';
import { R } from './palette.js';
import { hash2 } from '../core/rng.js';

const W = 320, H = 180;
const pk = (ramp, f, x, y, d = 0.8) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];

function figure(pc, x, y, robe, s = 1, halo = null, wings = null) {
  // tiny robed figure (Dante silhouette) seen from behind
  const h = Math.round(14 * s);
  if (wings) {
    for (let k = 0; k < 3; k++) {
      pc.thickLine(x, y - h * 0.7, x - (10 + k * 6) * s, y - h * (1.6 - k * 0.3), 1.5 * s, wings[1]);
      pc.thickLine(x, y - h * 0.7, x + (10 + k * 6) * s, y - h * (1.6 - k * 0.3), 1.5 * s, wings[1]);
    }
  }
  pc.poly([[x - 2 * s, y - h * 0.75], [x + 2 * s, y - h * 0.75], [x + 4 * s, y], [x - 4 * s, y]], robe[2]);
  pc.ellipse(x, y - h * 0.82, 2.4 * s, 2.6 * s, robe[3]);
  pc.vline(x - Math.round(1 * s), y - h * 0.7, y - 1, robe[1]);
  if (halo) pc.ring(x, y - h * 1.05, 3 * s, halo, 1);
}

export function paintRedencion() {
  const pc = new PixelCanvas(W, H);
  const sky = [0x020410, 0x060c24, 0x0e1a3c, 0x1c2c58, 0x3a4a78, 0x7a6a7a, 0xd8a868, 0xffe0a0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = y / 120;
    pc.set(x, y, pk(sky, t * 6.4 + Math.sin(x * 0.02) * 0.2, x, y, 1));
  }
  // stars — "E quindi uscimmo a riveder le stelle"
  for (let k = 0; k < 320; k++) {
    const x = Math.floor(hash2(k, 1, 7) * W), y = Math.floor(hash2(k, 2, 7) * 100);
    const b = hash2(k, 3, 7);
    pc.set(x, y, b > 0.9 ? 0xffffff : b > 0.6 ? 0xc8d8ff : 0x7a8ab8);
    if (b > 0.97) { pc.set(x + 1, y, 0x9aa8d8); pc.set(x - 1, y, 0x9aa8d8); pc.set(x, y + 1, 0x9aa8d8); pc.set(x, y - 1, 0x9aa8d8); }
  }
  // a faint figure of light among the stars (Beatrice)
  for (let y = 20; y < 70; y++) for (let x = 230; x < 270; x++) {
    const d = Math.hypot((x - 250) / 18, (y - 45) / 24);
    if (d < 1 && bayer(x, y) < (1 - d) * 0.35) pc.set(x, y, mix(pc.get(x, y), [255, 236, 190], 0.6));
  }
  // the sea and Mount Purgatory far away
  for (let y = 118; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y - 118) / 62;
    const shine = Math.abs(x - 250) < 30 - t * 20 && (y + x) % 3 === 0;
    pc.set(x, y, shine ? 0xd8a868 : pk([0x020410, 0x060c24, 0x0e1a3c, 0x1c2c58], 3 - t * 3, x, y));
  }
  pc.poly([[200, 118], [250, 70], [262, 74], [300, 118]], null, (x, y) => pk([0x0a0c1c, 0x141a30, 0x222a48], 2 - (y - 70) / 30, x, y));
  for (let k = 0; k < 6; k++) pc.hline(222 + k * 6, 240 + k * 5, 84 + k * 6, 0x2a3458);
  // cave mouth (the way out of Hell)
  pc.poly([[0, 180], [0, 120], [40, 100], [110, 96], [150, 118], [170, 180]], null, (x, y) => pk([0x020102, 0x07050a, 0x110c14, 0x1c1620], 2.4 - (y - 96) / 60 + (x < 20 ? -1 : 0), x, y));
  pc.poly([[60, 180], [70, 140], [100, 128], [130, 140], [140, 180]], 0x010102);
  // two figures stepping out: Dante with a halo and Virgil
  figure(pc, 92, 150, R.danteRobeVirtue, 1.6, 0xf2c45a);
  figure(pc, 112, 152, R.virgilRobe, 1.5);
  // warm rim light on them
  for (let k = 0; k < 40; k++) pc.set(84 + (k % 30), 128 + Math.floor(k / 3), mix(pc.get(84 + (k % 30), 128 + Math.floor(k / 3)) || [0, 0, 0], [255, 220, 150], 0.08));
  return pc;
}

export function paintCaida() {
  const pc = new PixelCanvas(W, H);
  const bg = [0x010204, 0x04080e, 0x08121e, 0x0e1c30, 0x1a2a48];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 160) / 200, (y - 70) / 120);
    pc.set(x, y, pk(bg, 3.6 - d * 4, x, y, 1));
  }
  // frozen lake of Cocytus with heads trapped in the ice
  for (let y = 120; y < H; y++) for (let x = 0; x < W; x++) {
    const crack = Math.abs(Math.sin(x * 0.07 + y * 0.31) + Math.sin(y * 0.2 - x * 0.03)) < 0.06;
    pc.set(x, y, crack ? R.ice[1] : pk(R.ice, 2.2 + (y - 120) / 40 + Math.sin(x * 0.05) * 0.3, x, y));
  }
  for (let k = 0; k < 22; k++) {
    const x = 10 + Math.floor(hash2(k, 4, 2) * 300), y = 128 + Math.floor(hash2(k, 5, 2) * 46);
    if (Math.abs(x - 160) < 40) continue;
    pc.ellipse(x, y, 2.4, 2.6, R.skinPale[2]); pc.set(x - 1, y, 0x0a1428); pc.set(x + 1, y, 0x0a1428);
  }
  // great black wings opening behind the throne
  const wing = [0x020103, 0x07040a, 0x0e0814, 0x18101e];
  for (let side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const ax = 160 + side * 10, ay = 80;
      const bx = 160 + side * (60 + k * 16), by = 20 + k * 12;
      pc.thickLine(ax, ay, bx, by, 2.5, wing[2]);
      pc.thickLine(bx, by, bx + side * 6, by + 40 - k * 4, 1.5, wing[1]);
      for (let m = 0; m < 30; m++) { const t = m / 30; pc.thickLine(ax + (bx - ax) * t, ay + (by - ay) * t, ax + (bx - ax) * t + side * 4, ay + (by - ay) * t + 30 - k * 3, 1, wing[(m % 2) + 1]); }
    }
  }
  // throne of ice
  pc.poly([[128, 140], [134, 60], [146, 50], [160, 40], [174, 50], [186, 60], [192, 140]], null, (x, y) => pk(R.ice, 3.6 - (x - 128) / 64 * 2 + (Math.abs(x - 160) % 9 === 0 ? 1.4 : 0), x, y));
  for (const sx of [134, 186]) pc.poly([[sx - 4, 60], [sx, 34], [sx + 4, 60]], R.ice[4]);
  // Dante enthroned, crowned in ice, eyes burning
  pc.poly([[146, 132], [150, 92], [170, 92], [174, 132]], null, (x, y) => pk(R.danteRobeSin, 3 - (x - 146) / 28 * 2, x, y));
  pc.ellipse(160, 84, 6, 7, null, (nx, ny, x, y) => pk(R.skinPale, 3 - nx - ny, x, y));
  pc.set(158, 84, 0xff2020); pc.set(162, 84, 0xff2020); pc.set(157, 84, 0x900810); pc.set(163, 84, 0x900810);
  for (const k of [-5, -2, 1, 4]) { pc.vline(160 + k, 72, 77, R.ice[5]); pc.set(160 + k, 71, 0xffffff); }
  pc.thickLine(150, 100, 140, 118, 1.5, R.danteRobeSin[2]); pc.thickLine(170, 100, 180, 118, 1.5, R.danteRobeSin[2]);
  // red glow at the eyes / bloom
  for (let y = 78; y < 90; y++) for (let x = 150; x < 170; x++) if (bayer(x, y) < 0.15) pc.set(x, y, mix(pc.get(x, y), [255, 40, 40], 0.3));
  return pc;
}

export function paintGris() {
  const pc = new PixelCanvas(W, H);
  // upper half: cold gold light; lower half: crimson dark — divided by a perfectly level horizon
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const up = y < 90;
    const t = up ? y / 90 : (y - 90) / 90;
    const c = up ? pk([0xfff4cc, 0xd8c8a0, 0x9a8e78, 0x5a5450, 0x2a2828], t * 4.2, x, y, 1) : pk([0x2a2828, 0x3a1418, 0x2a0a10, 0x16040a, 0x080204], t * 4.2, x, y, 1);
    pc.set(x, y, c);
  }
  // endless stair spiralling through both
  for (let k = 0; k < 60; k++) {
    const t = k / 60;
    const y = 10 + t * 160;
    const x = 160 + Math.sin(t * 18) * (40 + t * 30);
    const w = 14 + t * 8;
    pc.rect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2, k % 2 ? 0x4a4450 : 0x6a6470);
    pc.hline(Math.round(x - w / 2), Math.round(x + w / 2), Math.round(y), 0x8a8490);
  }
  // the scale, perfectly balanced, huge and faint behind
  pc.vline(160, 30, 150, 0x5a5450);
  pc.hline(80, 240, 40, 0x6a6460);
  for (const sx of [80, 240]) { pc.line(sx, 40, sx - 14, 70, 0x5a5450); pc.line(sx, 40, sx + 14, 70, 0x5a5450); pc.hline(sx - 16, sx + 16, 71, 0x7a7470); }
  // Dante alone midway, looking at his own hands
  figure(pc, 160, 98, [0x2a2a30, 0x3a3a44, 0x5a5a66, 0x8a8a96], 2);
  pc.set(155, 86, 0xc89a78); pc.set(165, 86, 0xc89a78);
  // ash falling in both directions
  for (let k = 0; k < 200; k++) {
    const x = Math.floor(hash2(k, 8, 1) * W), y = Math.floor(hash2(k, 9, 1) * H);
    pc.set(x, y, y < 90 ? 0x6a6470 : 0x9a8e78);
  }
  return pc;
}
