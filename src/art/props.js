// Environmental props: monumental gothic & allegorical set dressing for each circle.
// Each prop: { w, h, frames, fps, draw(c,e,i,n), light?, emit?, solid? (collision radius), shadow? }
import { SpriteSheet, getSheet } from './sheet.js';
import { R } from './palette.js';
import { bayer, mix } from './pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const sh = (ramp, lx = -0.6, ly = -0.7) => (nx, ny, x, y) => pk(ramp, (ramp.length - 1) * (0.55 - nx * lx * -0.6 - ny * 0.5) , x, y);

function flame(c, e, cx, by, h, i, ramp = R.ember, w = 3) {
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const ww = Math.max(0, Math.round(w * (1 - t) * (0.8 + 0.3 * Math.sin(i * 2.1 + y))));
    const sway = Math.round(Math.sin(i * 1.7 + y * 0.6) * t * 1.5);
    for (let x = -ww; x <= ww; x++) {
      const f = (1 - Math.abs(x) / (ww + 1)) * (1 - t * 0.6) * (ramp.length - 1) + (bayer(x + 9, y + i) - 0.5);
      const col = ramp[Math.max(1, Math.min(ramp.length - 1, Math.round(f)))];
      c.set(cx + x + sway, by - y, col);
      if (e) e.set(cx + x + sway, by - y, col);
    }
  }
}

function column(c, x0, y0, w, h, ramp, broken = false) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const u = (x - x0) / (w - 1);
    let f = 3.4 - Math.abs(u - 0.3) * 4.5;
    if ((x - x0) % 3 === 1) f -= 0.9;
    c.set(x, y, pk(ramp, f, x, y));
  }
  // capital/base
  c.rect(x0 - 1, y0 + h - 2, w + 2, 2, ramp[1]); c.hline(x0 - 1, x0 + w, y0 + h - 2, ramp[3]);
  if (!broken) { c.rect(x0 - 1, y0, w + 2, 2, ramp[4]); c.hline(x0 - 1, x0 + w, y0 + 1, ramp[2]); }
  else {
    for (let x = x0; x < x0 + w; x++) { const d = Math.round(Math.abs(Math.sin(x * 1.7)) * 3); for (let y = y0; y < y0 + d; y++) c.erase(x, y); }
  }
}

function hoodedStatue(c, cx, by, ramp, weep = false, e = null) {
  // gothic hooded mourner on a plinth
  c.rect(cx - 6, by - 6, 13, 6, ramp[1]); c.hline(cx - 6, cx + 6, by - 6, ramp[4]); c.hline(cx - 6, cx + 6, by - 5, ramp[3]);
  c.poly([[cx - 4, by - 26], [cx + 4, by - 26], [cx + 6, by - 6], [cx - 6, by - 6]], null, (x, y) => {
    const u = (x - (cx - 6)) / 12;
    let f = 3.6 - u * 2.6;
    if ((x - cx + 20) % 4 === 0 && y > by - 20) f -= 1;
    return pk(ramp, f, x, y);
  });
  c.ellipse(cx, by - 29, 4.5, 5, null, (nx, ny, x, y) => pk(ramp, 3.4 - nx * 1.5 - ny * 1.2, x, y));
  c.ellipse(cx + 1, by - 27, 2.4, 2.8, ramp[0]); // shadowed face
  // hands clasped
  c.rect(cx - 1, by - 21, 3, 2, ramp[4]);
  if (weep) { c.vline(cx + 1, by - 26, by - 23, R.soul[4]); if (e) e.set(cx + 1, by - 26, R.soul[3]); }
}

export const PROPS = {
  // ------------------------------------------------ universal ------------------------------------------------
  brazier: {
    w: 20, h: 32, frames: 6, fps: 10, solid: 0.45,
    light: { color: null, intensity: 1.7, radius: 7.5, y: 1.6, flicker: 0.5 }, emit: { preset: 'ember', rate: 4, y: 1.7 },
    draw: (c, e, i, n, ctx) => {
      const iron = R.steel.slice(0, 4);
      c.rect(9, 18, 2, 12, iron[2]); c.vline(9, 18, 29, iron[3]);
      c.line(6, 30, 9, 26, iron[1]); c.line(13, 30, 10, 26, iron[1]); c.hline(5, 14, 30, iron[0]);
      c.ellipse(10, 16, 6, 3, null, (nx, ny, x, y) => pk(iron, 2.6 - nx - ny * 0.5, x, y));
      c.hline(4, 16, 14, iron[3]);
      flame(c, e, 10, 13, 12, i, ctx.fire || R.ember, 4);
      for (let k = 0; k < 3; k++) { c.set(6 + k * 4, 14, ctx.fire ? ctx.fire[4] : R.ember[4]); }
    },
  },
  candelabra: {
    w: 16, h: 30, frames: 4, fps: 8, solid: 0.25,
    light: { intensity: 1.0, radius: 5, y: 1.9, flicker: 0.35, color: 0xffc070 },
    draw: (c, e, i) => {
      const g = R.bronze;
      c.vline(8, 10, 28, g[3]); c.hline(5, 11, 28, g[2]); c.hline(6, 10, 27, g[1]);
      c.hline(3, 13, 12, g[3]); c.vline(3, 9, 12, g[2]); c.vline(13, 9, 12, g[2]);
      for (const x of [3, 8, 13]) {
        c.rect(x - 1 + (x === 8 ? 0 : 0), x === 8 ? 5 : 6, 2, x === 8 ? 5 : 3, R.bone[4]);
        flame(c, e, x, x === 8 ? 4 : 5, 4, i + x, [0x7a3000, 0xf09020, 0xffd060, 0xfff4c0], 1);
      }
    },
  },
  skullPile: {
    w: 24, h: 16, frames: 1, solid: 0.5,
    draw: (c) => {
      const b = R.bone;
      const skulls = [[6, 11], [12, 12], [18, 11], [9, 7], [15, 7], [12, 3]];
      for (const [x, y] of skulls) {
        c.ellipse(x, y, 3, 2.6, null, (nx, ny, px, py) => pk(b, 3.2 - nx - ny, px, py));
        c.set(x - 1, y, 0x140a08); c.set(x + 1, y, 0x140a08); c.set(x, y + 2, b[1]);
      }
    },
  },
  bones: {
    w: 20, h: 10, frames: 1,
    draw: (c) => {
      const b = R.bone;
      c.line(2, 6, 14, 3, b[3]); c.line(2, 7, 14, 4, b[2]); c.disc(2, 6, 1.4, b[4]); c.disc(14, 3, 1.4, b[4]);
      c.line(6, 8, 17, 8, b[3]); c.disc(17, 8, 1.2, b[4]);
      c.ellipse(9, 5, 2.4, 2, b[3]); c.set(8, 5, 0x100808); c.set(10, 5, 0x100808);
    },
  },
  brokenColumn: {
    w: 18, h: 40, frames: 1, solid: 0.6,
    draw: (c, e, i, n, ctx) => {
      column(c, 5, 6, 8, 32, ctx.stone || R.stone, true);
      c.ellipse(13, 37, 3, 1.5, (ctx.stone || R.stone)[2]);
    },
  },
  column: {
    w: 18, h: 56, frames: 1, solid: 0.6,
    draw: (c, e, i, n, ctx) => column(c, 5, 2, 8, 52, ctx.stone || R.stone, false),
  },
  mourner: {
    w: 20, h: 40, frames: 1, solid: 0.55,
    draw: (c, e, i, n, ctx) => hoodedStatue(c, 10, 38, ctx.stone || R.stone, ctx.weep, e),
  },
  urn: {
    w: 14, h: 18, frames: 1, solid: 0.35,
    draw: (c, e, i, n, ctx) => {
      const r = ctx.clay || [0x2a1a14, 0x4a2e20, 0x6e4430, 0x946048, 0xb88466];
      c.ellipse(7, 10, 5, 6, null, (nx, ny, x, y) => pk(r, 2.8 - nx * 1.4 - ny * 0.8, x, y));
      c.rect(5, 2, 5, 3, r[2]); c.hline(4, 10, 2, r[4]); c.hline(3, 11, 16, r[1]);
      c.hline(3, 11, 9, r[0]);
    },
  },
  graveCross: {
    w: 16, h: 28, frames: 1, solid: 0.3,
    draw: (c, e, i, n, ctx) => {
      const s = ctx.stone || R.stone;
      c.rect(6, 4, 4, 22, s[3]); c.vline(6, 4, 25, s[4]); c.vline(9, 4, 25, s[1]);
      c.rect(2, 9, 12, 4, s[3]); c.hline(2, 13, 9, s[4]); c.hline(2, 13, 12, s[1]);
      c.ellipse(8, 11, 3, 3, null, (nx, ny) => (Math.hypot(nx, ny) > 0.7 ? s[2] : null));
      c.rect(4, 25, 8, 2, s[1]);
    },
  },
  cage: {
    w: 20, h: 36, frames: 4, fps: 3, solid: 0.5,
    draw: (c, e, i) => {
      const s = R.steel;
      c.vline(10, 0, 4, s[2]);
      const sw = [0, 1, 0, -1][i];
      c.ellipse(10 + sw, 6, 7, 2, null, (nx, ny) => (Math.hypot(nx, ny) > 0.6 ? s[3] : null));
      for (let k = 0; k < 6; k++) c.vline(4 + sw + k * 2 + (k > 2 ? 1 : 0), 6, 28, s[k % 2 ? 2 : 3]);
      c.hline(3 + sw, 17 + sw, 28, s[2]); c.hline(3 + sw, 17 + sw, 18, s[1]);
      // skeleton inside
      c.ellipse(10 + sw, 12, 2, 2, R.bone[3]); c.vline(10 + sw, 14, 24, R.bone[2]);
      c.hline(8 + sw, 12 + sw, 17, R.bone[2]); c.hline(8 + sw, 12 + sw, 19, R.bone[2]);
    },
  },
  // ------------------------------------------------ Limbo ------------------------------------------------
  poetBust: {
    w: 18, h: 34, frames: 1, solid: 0.5,
    draw: (c, e, i, n, ctx) => {
      const s = ctx.stone || [0x2a2a32, 0x44444e, 0x62626e, 0x84848e, 0xa8a8b0, 0xcacad0];
      c.rect(4, 18, 10, 14, s[2]); c.vline(4, 18, 31, s[4]); c.vline(13, 18, 31, s[1]); c.hline(3, 14, 18, s[5]); c.hline(3, 14, 31, s[0]);
      c.ellipse(9, 14, 5, 3, s[3]);
      c.ellipse(9, 8, 3.5, 4.2, null, (nx, ny, x, y) => pk(s, 3.6 - nx * 1.4 - ny, x, y));
      for (let k = -3; k <= 3; k++) c.set(9 + k, 4 + (k % 2 ? 1 : 0), R.laurel[3]);
      c.set(8, 8, s[0]); c.set(10, 8, s[0]);
    },
  },
  lectern: {
    w: 18, h: 26, frames: 1, solid: 0.4,
    draw: (c) => {
      const w = R.wood;
      c.rect(8, 10, 3, 14, w[2]); c.hline(5, 13, 24, w[1]);
      c.poly([[2, 6], [16, 4], [16, 10], [2, 12]], null, (x, y) => pk(w, 3 - (x - 2) * 0.1, x, y));
      c.poly([[3, 5], [9, 3], [9, 8], [3, 10]], null, (x, y) => pk(R.bone, 3.5, x, y));
      c.poly([[9, 3], [15, 2], [15, 7], [9, 8]], null, (x, y) => pk(R.bone, 2.8, x, y));
      for (let k = 0; k < 3; k++) { c.hline(4, 7, 5 + k * 1.4, R.bone[1]); c.hline(10, 13, 4 + k * 1.3, R.bone[1]); }
    },
  },
  mistCloud: {
    w: 40, h: 16, frames: 6, fps: 4, unlitAlpha: 0.5,
    draw: (c, e, i) => {
      const r = [0x50525c, 0x6a6c78, 0x8a8c98, 0xa8aab4];
      for (let k = 0; k < 5; k++) {
        const x = 6 + k * 7 + Math.round(Math.sin(i + k) * 1.5), y = 9 + Math.round(Math.cos(i * 0.7 + k) * 1.5);
        c.ellipse(x, y, 6, 4, null, (nx, ny, px, py) => ((1 - Math.hypot(nx, ny)) > bayer(px, py) * 0.9 ? pk(r, 2 - ny * 1.5, px, py) : null));
      }
    },
  },
  // ------------------------------------------------ Lujuria ------------------------------------------------
  windTree: {
    w: 32, h: 44, frames: 4, fps: 5, solid: 0.5,
    draw: (c, e, i) => {
      const w = [0x0e0810, 0x1e1220, 0x2e1c30, 0x422a44];
      const sway = [0, 1, 2, 1][i];
      c.thickLine(14, 42, 13, 26, 2, w[2]);
      c.thickLine(13, 26, 22 + sway, 14, 1.4, w[2]);
      c.line(22 + sway, 14, 30 + sway, 10, w[3]); c.line(18 + sway, 19, 28 + sway, 18, w[2]);
      c.line(13, 26, 6 + sway, 16, w[2]); c.line(6 + sway, 16, 9 + sway * 2, 8, w[1]);
      c.line(16 + sway, 20, 25 + sway * 2, 24, w[1]);
      for (let k = 0; k < 6; k++) c.set(20 + k * 2 + sway, 10 + (k % 3), [0xe04a7a, 0xb02a5a, 0x7a1a44][k % 3]);
      c.hline(10, 18, 43, w[0]);
    },
  },
  loversStatue: {
    w: 26, h: 42, frames: 1, solid: 0.6,
    draw: (c, e, i, n, ctx) => {
      const s = [0x1e1022, 0x321c38, 0x4a2a52, 0x66406e, 0x86588c, 0xa878a8];
      c.rect(5, 34, 16, 6, s[1]); c.hline(5, 20, 34, s[4]);
      c.poly([[8, 12], [13, 10], [12, 34], [6, 34]], null, (x, y) => pk(s, 3.4 - (x - 6) * 0.2, x, y));
      c.poly([[13, 10], [18, 13], [20, 34], [13, 34]], null, (x, y) => pk(s, 2.8 - (x - 13) * 0.2, x, y));
      c.ellipse(10, 9, 3, 3.4, s[4]); c.ellipse(15, 8, 3, 3.4, s[3]);
      c.line(9, 15, 17, 18, s[5]); c.line(17, 15, 10, 19, s[2]);
      // wind-torn veil
      c.line(15, 6, 24, 4, s[5]); c.line(15, 7, 25, 7, s[4]); c.line(16, 8, 23, 10, s[3]);
    },
  },
  thornRose: {
    w: 20, h: 16, frames: 1,
    draw: (c) => {
      const g = [0x140a10, 0x2a1420, 0x3e1e2e];
      for (let k = 0; k < 7; k++) c.line(10, 15, 2 + k * 3, 4 + (k % 3) * 2, g[k % 3]);
      for (const [x, y] of [[4, 5], [11, 3], [16, 6]]) { c.disc(x, y, 1.6, 0xb02a5a); c.set(x, y - 1, 0xff86a8); }
    },
  },
  // ------------------------------------------------ Gula ------------------------------------------------
  bloatedCorpse: {
    w: 28, h: 16, frames: 3, fps: 2,
    draw: (c, e, i) => {
      const s = [0x2a3010, 0x4a5418, 0x6e7a22, 0x929a3a, 0xb8b85a];
      c.ellipse(14, 9 - (i === 1 ? 0.5 : 0), 10, 5 + (i === 1 ? 0.6 : 0), null, (nx, ny, x, y) => pk(s, 3 - nx - ny * 1.4, x, y));
      c.ellipse(4, 9, 3, 2.6, null, (nx, ny, x, y) => pk(s, 2.6 - nx - ny, x, y));
      c.set(3, 9, 0x101008); c.set(5, 9, 0x101008);
      c.line(20, 12, 26, 14, s[1]); c.line(9, 12, 6, 15, s[1]);
      for (let k = 0; k < 4; k++) c.set(10 + k * 3, 7 + (k % 2), s[0]);
    },
  },
  feastRemains: {
    w: 32, h: 20, frames: 1, solid: 0.9,
    draw: (c) => {
      const w = R.wood;
      c.rect(2, 8, 28, 4, w[3]); c.hline(2, 29, 8, w[4]); c.rect(4, 12, 2, 7, w[1]); c.rect(26, 12, 2, 7, w[1]);
      c.ellipse(9, 6, 4, 2, 0x6a3a1e); c.ellipse(9, 5, 3, 1.4, 0x9a5a2e);
      c.ellipse(20, 6, 3, 2, R.bone[3]); c.line(17, 4, 23, 7, R.bone[2]);
      c.ellipse(25, 6, 2, 2, 0x5a6a20);
      for (let k = 0; k < 6; k++) c.set(4 + k * 4, 7, 0x92a82e);
    },
  },
  maggotMound: {
    w: 22, h: 14, frames: 4, fps: 6,
    draw: (c, e, i) => {
      c.ellipse(11, 10, 9, 4, null, (nx, ny, x, y) => pk([0x2a2010, 0x463418, 0x5e4a22], 2 - ny, x, y));
      for (let k = 0; k < 9; k++) {
        const x = 4 + ((k * 5 + i) % 14), y = 7 + ((k * 3 + i * 2) % 5);
        c.set(x, y, 0xe8e0c0); c.set(x + 1, y, 0xc8c0a0);
      }
    },
  },
  // ------------------------------------------------ Avaricia ------------------------------------------------
  coinPile: {
    w: 24, h: 14, frames: 4, fps: 3, light: { color: 0xffc050, intensity: 0.5, radius: 3, y: 0.5 },
    draw: (c, e, i) => {
      const g = R.gold;
      c.ellipse(12, 10, 10, 4, null, (nx, ny, x, y) => pk(g, 3 - nx - ny * 1.5 + (hash(x, y) > 0.8 ? 1 : 0), x, y));
      c.ellipse(12, 7, 6, 3, null, (nx, ny, x, y) => pk(g, 3.6 - nx - ny * 1.5, x, y));
      const gx = [4, 9, 15, 19][i];
      c.set(gx, 8, g[5]); if (e) e.set(gx, 8, g[4]);
    },
  },
  moneySack: {
    w: 18, h: 18, frames: 1, solid: 0.5,
    draw: (c) => {
      const s = [0x2a1a0a, 0x4a3016, 0x6e4a24, 0x94683a, 0xb88a52];
      c.ellipse(9, 11, 7, 6, null, (nx, ny, x, y) => pk(s, 3 - nx * 1.2 - ny, x, y));
      c.rect(7, 3, 4, 3, s[2]); c.hline(6, 11, 5, R.gold[3]);
      c.set(8, 11, R.gold[4]); c.set(9, 10, R.gold[4]); c.set(10, 11, R.gold[4]); c.set(9, 12, R.gold[4]);
    },
  },
  goldStatue: {
    w: 20, h: 42, frames: 1, solid: 0.55,
    draw: (c, e) => {
      hoodedStatue(c, 10, 40, R.gold.slice(1));
      if (e) { e.set(7, 12, 0x604010); e.set(12, 24, 0x604010); }
    },
  },
  scales: {
    w: 24, h: 30, frames: 4, fps: 2, solid: 0.4,
    draw: (c, e, i) => {
      const g = R.bronze;
      c.vline(12, 4, 27, g[3]); c.hline(8, 16, 28, g[2]);
      const tilt = [0, 1, 0, -1][i];
      c.line(3, 7 + tilt, 21, 7 - tilt, g[4]);
      for (const [x, y] of [[3, 7 + tilt], [21, 7 - tilt]]) {
        c.line(x, y, x - 2, y + 7, g[2]); c.line(x, y, x + 2, y + 7, g[2]);
        c.ellipse(x, y + 8, 3, 1.2, g[3]);
      }
      c.set(19, 13 - tilt, R.gold[5]); c.set(20, 13 - tilt, R.gold[4]);
    },
  },
  // ------------------------------------------------ Ira ------------------------------------------------
  reeds: {
    w: 18, h: 22, frames: 4, fps: 5,
    draw: (c, e, i) => {
      const g = [0x0c1410, 0x16241c, 0x22342a, 0x2e4636];
      for (let k = 0; k < 6; k++) {
        const x = 3 + k * 2.5, s = Math.round(Math.sin(i + k) * 1.2);
        c.line(x, 21, x + s, 6 + (k % 3) * 3, g[1 + (k % 3)]);
      }
    },
  },
  drownedHand: {
    w: 14, h: 16, frames: 4, fps: 4,
    draw: (c, e, i) => {
      const s = [0x202a28, 0x34443e, 0x4a5e56, 0x627a70];
      const o = [0, 1, 0, -1][i];
      c.rect(5, 6 + o, 4, 9, s[2]); c.vline(5, 6 + o, 14, s[3]);
      for (let k = 0; k < 4; k++) c.vline(4 + k + (k > 1 ? 1 : 0), 2 + o + (k === 0 || k === 3 ? 2 : 0), 6 + o, s[2 + (k % 2)]);
      c.ellipse(7, 15, 5, 1.2, 0x0e1a18);
    },
  },
  burningDebris: {
    w: 22, h: 20, frames: 6, fps: 10,
    light: { color: 0xff6020, intensity: 1.0, radius: 4.5, y: 0.8, flicker: 0.6 }, emit: { preset: 'ember', rate: 3, y: 0.6 },
    draw: (c, e, i) => {
      c.line(3, 17, 18, 14, R.wood[1]); c.line(5, 18, 16, 18, R.wood[2]); c.line(7, 13, 14, 19, R.wood[0]);
      flame(c, e, 10, 15, 8, i, R.ember, 3);
      flame(c, e, 15, 16, 5, i + 3, R.ember, 2);
    },
  },
  // ------------------------------------------------ Herejía ------------------------------------------------
  flameTomb: {
    w: 32, h: 34, frames: 6, fps: 10, solid: 1.0,
    light: { color: 0xff7020, intensity: 1.8, radius: 6.5, y: 1.2, flicker: 0.6 }, emit: { preset: 'fire', rate: 6, y: 0.9, radius: 0.5 },
    draw: (c, e, i) => {
      const s = [0x120a08, 0x22140e, 0x36221a, 0x4c3226, 0x664434, 0x82584a];
      // open sarcophagus box
      c.poly([[3, 18], [29, 18], [29, 31], [3, 31]], null, (x, y) => pk(s, 3 - (y - 18) * 0.1 + (x < 5 ? 1 : 0), x, y));
      c.poly([[5, 14], [27, 14], [29, 18], [3, 18]], null, (x, y) => pk(s, 1, x, y));
      c.hline(3, 29, 18, s[5]);
      // shifted lid
      c.poly([[18, 8], [31, 10], [30, 14], [17, 12]], null, (x, y) => pk(s, 3.8, x, y));
      c.line(20, 10, 28, 11, s[1]);
      for (let k = 0; k < 4; k++) flame(c, e, 8 + k * 5, 17, 10 + ((k + i) % 3) * 2, i + k * 2, R.ember, 2);
      c.rect(12, 22, 8, 1, s[1]); c.rect(15, 20, 2, 7, s[1]);
    },
  },
  ironCross: {
    w: 16, h: 30, frames: 1, solid: 0.3,
    draw: (c) => {
      const s = R.steel.slice(0, 4);
      c.rect(7, 2, 2, 26, s[2]); c.rect(3, 8, 10, 2, s[2]); c.vline(7, 2, 27, s[3]);
      for (const [x, y] of [[7, 1], [2, 8], [13, 8]]) c.rect(x, y, 2, 2, s[1]);
      c.line(4, 12, 12, 20, R.ember[2]);
    },
  },
  // ------------------------------------------------ Violencia ------------------------------------------------
  suicideTree: {
    w: 36, h: 48, frames: 4, fps: 3, solid: 0.6,
    draw: (c, e, i) => {
      const w = [0x0a0606, 0x180c0a, 0x281410, 0x3c1e18];
      c.thickLine(18, 47, 17, 24, 2.5, w[2]);
      const br = [[17, 24, 6, 10], [17, 24, 30, 8], [17, 30, 4, 22], [18, 28, 32, 22], [12, 15, 10, 4], [26, 13, 28, 3]];
      for (const [a, b, cx, cy] of br) c.thickLine(a, b, cx, cy, 1, w[1]);
      // thorns
      for (let k = 0; k < 14; k++) c.set(6 + ((k * 7) % 26), 6 + ((k * 11) % 20), w[3]);
      // bleeding sap
      const drip = i % 4;
      c.vline(19, 30, 33 + drip, R.blood[3]); c.set(19, 34 + drip, R.blood[4]);
      // human face in the bark
      c.set(16, 34, w[0]); c.set(19, 34, w[0]); c.hline(16, 19, 37, w[0]);
    },
  },
  thornBush: {
    w: 22, h: 16, frames: 1,
    draw: (c) => {
      const w = [0x180a08, 0x2e1410, 0x4a1e16];
      for (let k = 0; k < 9; k++) c.line(11, 15, 1 + k * 2.5, 2 + (k % 4) * 2, w[k % 3]);
      for (let k = 0; k < 5; k++) c.set(3 + k * 4, 5 + (k % 2) * 3, R.blood[4]);
    },
  },
  skullTotem: {
    w: 14, h: 34, frames: 1, solid: 0.3,
    draw: (c) => {
      c.vline(7, 6, 32, R.wood[2]); c.vline(6, 6, 32, R.wood[3]);
      for (const y of [5, 13]) { c.ellipse(7, y, 3.4, 3, null, (nx, ny, x, yy) => pk(R.bone, 3 - nx - ny, x, yy)); c.set(6, y, 0x200404); c.set(8, y, 0x200404); }
      c.line(3, 20, 11, 22, R.blood[3]);
    },
  },
  // ------------------------------------------------ Fraude ------------------------------------------------
  mirror: {
    w: 20, h: 36, frames: 6, fps: 6, solid: 0.45,
    draw: (c, e, i) => {
      const f = R.bronze;
      c.ellipse(10, 15, 8, 13, null, (nx, ny) => (Math.hypot(nx, ny) > 0.82 ? pk(f, 3 - nx - ny, 0, 0) : null));
      c.ellipse(10, 15, 6.6, 11.6, null, (nx, ny, x, y) => {
        const v = Math.sin(y * 0.6 + i * 1.1 + nx * 2) * 0.5 + 0.5;
        const col = pk(R.teal, 1 + v * 3 - ny, x, y);
        if (e && v > 0.85) e.set(x, y, R.teal[3]);
        return col;
      });
      c.rect(8, 28, 4, 6, f[2]); c.hline(5, 14, 34, f[1]);
      // a face that is not yours
      if (i === 3 || i === 4) { c.set(8, 12, 0xff3040); c.set(12, 12, 0xff3040); if (e) { e.set(8, 12, 0xff3040); e.set(12, 12, 0xff3040); } }
    },
  },
  maskPedestal: {
    w: 16, h: 26, frames: 1, solid: 0.35,
    draw: (c, e) => {
      c.rect(4, 12, 8, 13, R.stone[2]); c.hline(3, 12, 12, R.stone[4]);
      c.ellipse(8, 7, 4, 4.6, null, (nx, ny, x, y) => pk(R.gold, 3.6 - nx - ny, x, y));
      c.set(6, 6, 0x000000); c.set(10, 6, 0x000000); c.hline(6, 10, 9, R.gold[1]);
      c.set(7, 9, R.gold[5]);
    },
  },
  serpentStatue: {
    w: 22, h: 36, frames: 1, solid: 0.5,
    draw: (c) => {
      const s = R.teal.slice(0, 5);
      c.rect(4, 30, 14, 5, R.stone[2]); c.hline(4, 17, 30, R.stone[4]);
      for (let y = 4; y < 30; y++) {
        const x = 11 + Math.round(Math.sin(y * 0.35) * 4);
        c.rect(x - 2, y, 4, 1, pk(s, 3 - (y % 4 === 0 ? 1 : 0), x, y));
      }
      c.ellipse(11 + Math.round(Math.sin(4 * 0.35) * 4), 4, 3, 2.4, s[3]);
      c.set(10, 3, 0xffd040);
    },
  },
  // ------------------------------------------------ Traición ------------------------------------------------
  iceSpike: {
    w: 18, h: 34, frames: 1, solid: 0.45,
    draw: (c, e) => {
      const r = R.ice;
      c.poly([[4, 33], [9, 2], [14, 33]], null, (x, y) => pk(r, 4.5 - (x - 4) * 0.35 + (x === 8 ? 1.5 : 0), x, y));
      c.poly([[12, 33], [15, 16], [17, 33]], null, (x, y) => pk(r, 3, x, y));
      c.poly([[1, 33], [3, 22], [6, 33]], null, (x, y) => pk(r, 3.6, x, y));
      if (e) { e.set(8, 6, 0x2a4a60); e.set(8, 12, 0x2a4a60); }
    },
  },
  frozenSinner: {
    w: 24, h: 26, frames: 1, solid: 0.7,
    draw: (c) => {
      const r = R.ice;
      c.ellipse(12, 19, 11, 6, null, (nx, ny, x, y) => pk(r, 3.5 - nx - ny, x, y));
      // head and hands breaking through the ice (Cocito)
      c.ellipse(12, 10, 3.6, 4, null, (nx, ny, x, y) => pk(R.skinPale, 2.6 - nx - ny, x, y));
      c.set(11, 10, 0x0a1428); c.set(13, 10, 0x0a1428); c.hline(11, 13, 12, R.skinPale[0]);
      c.line(6, 16, 3, 9, R.skinPale[2]); c.line(18, 16, 21, 10, R.skinPale[2]);
      c.set(3, 8, R.skinPale[3]); c.set(21, 9, R.skinPale[3]);
      for (let k = 0; k < 5; k++) c.set(7 + k * 2, 14, r[5]);
    },
  },
  crystalCluster: {
    w: 20, h: 18, frames: 4, fps: 3,
    light: { color: 0x7ad0ff, intensity: 0.6, radius: 3.5, y: 0.5 },
    draw: (c, e, i) => {
      const r = R.ice;
      for (const [x, h, w] of [[5, 10, 2], [10, 15, 3], [15, 9, 2]]) {
        c.poly([[x - w, 17], [x, 17 - h], [x + w, 17]], null, (px, py) => pk(r, 4 - (px - x) * 0.6, px, py));
        if (e) e.set(x, 18 - h + 2 + (i % 2), r[4]);
      }
    },
  },
  brokenSword: {
    w: 12, h: 22, frames: 1,
    draw: (c) => {
      c.rect(5, 2, 2, 12, R.steel[3]); c.vline(5, 2, 13, R.steel[4]);
      c.hline(2, 9, 14, R.bronze[3]); c.rect(5, 15, 2, 4, R.wood[2]);
      c.ellipse(6, 20, 5, 1.6, R.ice[4]);
    },
  },
  // ------------------------------------------------ Hub ------------------------------------------------
  weaponRack: {
    w: 32, h: 34, frames: 1, solid: 0.8,
    draw: (c) => {
      const w = R.wood;
      c.rect(2, 8, 28, 3, w[3]); c.rect(2, 26, 28, 3, w[2]); c.rect(3, 8, 2, 25, w[1]); c.rect(27, 8, 2, 25, w[1]);
      // sword
      c.vline(9, 2, 28, R.steel[4]); c.vline(10, 2, 28, R.steel[2]); c.hline(6, 13, 22, R.bronze[3]);
      // scythe
      c.vline(16, 4, 31, w[3]); c.line(16, 4, 23, 7, R.steel[3]); c.line(23, 7, 25, 12, R.steel[4]);
      // chains
      for (let y = 10; y < 26; y += 2) c.set(21 + (y % 4 ? 0 : 1), y, R.steel[3]);
      // cross
      c.vline(25, 12, 26, R.gold[3]); c.hline(23, 27, 15, R.gold[4]);
    },
  },
  shrineBeatrice: {
    w: 40, h: 56, frames: 6, fps: 5, solid: 1.0,
    light: { color: 0xffd890, intensity: 1.3, radius: 7, y: 2.4, flicker: 0.15 }, emit: { preset: 'holyMote', rate: 2, y: 2.0, radius: 0.8 },
    draw: (c, e, i) => {
      const s = R.stone;
      // stained glass rose window under a pointed arch
      c.poly([[4, 54], [4, 20], [20, 2], [36, 20], [36, 54]], null, (x, y) => pk(s, 2.4 + (x < 7 ? 1 : 0) - (x > 33 ? 1 : 0), x, y));
      const glass = [0x6a1a1a, 0xc0402e, 0xf2c45a, 0x2e6a3a, 0x4a5a9a, 0xfff4cc];
      c.poly([[8, 50], [8, 22], [20, 8], [32, 22], [32, 50]], null, (x, y) => {
        const d = Math.hypot(x - 20, y - 26);
        const a = Math.atan2(y - 26, x - 20);
        let idx = Math.floor((a + Math.PI) / (Math.PI / 4)) % 5;
        if (d < 4) idx = 5;
        if (Math.abs(d - 10) < 0.8 || Math.abs(Math.sin(a * 4)) < 0.12) return 0x0a0608;
        const col = glass[idx];
        if (e) e.set(x, y, mix(col, [0, 0, 0], 0.3 - 0.15 * Math.sin(i + d * 0.5)));
        return col;
      });
      c.rect(14, 50, 12, 4, s[3]); c.hline(14, 25, 50, s[5]);
      for (const x of [16, 20, 24]) { c.rect(x, 46, 1, 4, R.bone[4]); flame(c, e, x, 45, 3, i + x, [0x7a3000, 0xf09020, 0xffe080], 1); }
    },
  },
  virtueAltar: {
    w: 32, h: 40, frames: 6, fps: 6, solid: 0.9,
    light: { color: 0xf2c45a, intensity: 1.1, radius: 5.5, y: 1.6, flicker: 0.2 },
    draw: (c, e, i) => {
      const s = R.stone;
      c.rect(4, 26, 24, 12, s[2]); c.hline(3, 28, 26, s[5]); c.hline(3, 28, 27, s[4]); c.hline(4, 27, 37, s[0]);
      for (let k = 0; k < 4; k++) c.rect(6 + k * 6, 30, 2, 5, s[1]);
      // floating book of virtues
      const f = [0, 1, 1, 0, -1, -1][i];
      c.poly([[8, 16 + f], [16, 18 + f], [24, 16 + f], [24, 22 + f], [16, 24 + f], [8, 22 + f]], null, (x, y) => pk(R.bone, x < 16 ? 3.6 : 2.8, x, y));
      c.vline(16, 18 + f, 24 + f, R.bone[1]);
      for (let k = 0; k < 3; k++) { c.hline(10, 14, 19 + k * 1.3 + f, R.gold[2]); c.hline(18, 22, 19 + k * 1.3 + f, R.gold[2]); }
      if (e) { e.ellipse(16, 20 + f, 9, 5, 0x3a2a08); e.set(12, 19 + f, 0xf2c45a); e.set(20, 20 + f, 0xf2c45a); }
    },
  },
  sinAltar: {
    w: 32, h: 40, frames: 6, fps: 6, solid: 0.9,
    light: { color: 0xc0102a, intensity: 1.2, radius: 5.5, y: 1.4, flicker: 0.4 }, emit: { preset: 'corruptGlow', rate: 2, y: 1.2, radius: 0.5 },
    draw: (c, e, i) => {
      const s = [0x0a0406, 0x180a0e, 0x281218, 0x3a1a22, 0x50242e, 0x6a3038];
      c.rect(4, 24, 24, 14, s[2]); c.hline(3, 28, 24, s[5]); c.hline(4, 27, 37, s[0]);
      // horns
      c.line(5, 24, 2, 12, R.bone[2]); c.line(2, 12, 4, 6, R.bone[3]);
      c.line(26, 24, 29, 12, R.bone[2]); c.line(29, 12, 27, 6, R.bone[3]);
      // bleeding chalice
      c.ellipse(16, 16, 5, 2, R.gold[2]); c.rect(15, 17, 3, 5, R.gold[3]); c.hline(12, 20, 22, R.gold[2]);
      c.ellipse(16, 15, 4, 1.2, R.crimson[3 + (i % 2)]);
      const d = i % 6;
      c.vline(12, 16, 17 + d, R.crimson[3]); c.vline(20, 16, 19 + (d + 3) % 6, R.crimson[3]);
      if (e) { e.ellipse(16, 15, 4, 1.2, R.crimson[4]); e.set(8, 30, 0x400008); }
      for (let k = 0; k < 3; k++) c.rect(8 + k * 7, 28, 3, 6, s[0]);
    },
  },
  gateArch: {
    w: 96, h: 80, frames: 1, solid: 0,
    draw: (c, e) => {
      const s = [0x0a0809, 0x16110f, 0x241c18, 0x352a22, 0x4a3b2e, 0x625040];
      // massive pointed arch: "Per me si va ne la città dolente"
      c.poly([[2, 79], [2, 30], [48, 1], [94, 30], [94, 79], [76, 79], [76, 40], [48, 20], [20, 40], [20, 79]], null, (x, y) => {
        const n = ((x >> 3) + (y >> 2)) % 2;
        let f = 2.4 + n * 0.4;
        if (y % 8 === 0 || (x + (Math.floor(y / 8) % 2) * 4) % 8 === 0) f = 0.6;
        return pk(s, f, x, y);
      });
      // inscription band
      c.rect(14, 26, 68, 6, s[1]);
      for (let k = 0; k < 30; k++) { const x = 16 + k * 2.2; c.set(x, 28 + (k % 2), R.gold[3]); if (e) e.set(x, 28 + (k % 2), 0x503810); c.set(x, 29, R.gold[2]); }
      c.hline(14, 81, 25, s[5]); c.hline(14, 81, 32, s[0]);
      // keystone skull
      c.ellipse(48, 13, 4, 3.6, R.bone[3]); c.set(47, 13, 0x100808); c.set(49, 13, 0x100808);
    },
  },
  descentStairs: {
    w: 48, h: 40, frames: 6, fps: 6,
    light: { color: 0xff4020, intensity: 1.6, radius: 6, y: 0.4, flicker: 0.5 }, emit: { preset: 'ember', rate: 5, y: 0.3, radius: 1.0 },
    draw: (c, e, i) => {
      const s = R.stone;
      for (let k = 0; k < 7; k++) {
        const y = 4 + k * 5, inset = k * 2;
        c.rect(4 + inset, y, 40 - inset * 2, 5, pk(s, 3.5 - k * 0.5, 0, 0));
        c.hline(4 + inset, 43 - inset, y, s[Math.max(0, 5 - k)]);
      }
      for (let y = 30; y < 40; y++) for (let x = 16; x < 32; x++) {
        const f = (y - 30) / 10 + Math.sin(x * 0.7 + i) * 0.1;
        const col = mix(0x200402, 0xff5010, f * 0.8);
        c.set(x, y, col); if (e) e.set(x, y, mix([0, 0, 0], col, f));
      }
    },
  },
};

function hash(x, y) { return ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1; }

export function propSheet(name, ctx = {}) {
  const def = PROPS[name];
  const key = 'prop_' + name + '_' + JSON.stringify(ctx);
  return getSheet(key, () => new SpriteSheet({
    w: def.w, h: def.h, emissive: true, ctx,
    anims: { idle: { frames: def.frames || 1, fps: def.fps || 1, draw: (c, e, i, n, cx) => def.draw(c, e, i, n, cx) } },
  }));
}
