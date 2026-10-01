// Pixel-art 9-slice frames for the UI (generated once, used as CSS border-images).
import { PixelCanvas } from '../art/pixel.js';
import { R } from '../art/palette.js';

function frame(style) {
  const S = 24;
  const pc = new PixelCanvas(S, S);
  const sets = {
    stone: { fill: 0x110b0d, o: 0x050304, b1: 0x3a2e30, b2: 0x241c1e, hi: 0x5a4a44, accent: R.gold },
    gold: { fill: 0x140d0a, o: 0x050304, b1: 0xa06c18, b2: 0x6a4410, hi: 0xf2c45a, accent: R.gold },
    crimson: { fill: 0x12060a, o: 0x050304, b1: 0x8a1016, b2: 0x4a060c, hi: 0xd0283a, accent: R.crimson },
    holy: { fill: 0x18140c, o: 0x050304, b1: 0xd8c08a, b2: 0x8a7a54, hi: 0xfff4cc, accent: R.holy },
    soul: { fill: 0x0a0e14, o: 0x050304, b1: 0x4a6680, b2: 0x2e4054, hi: 0xa8c4d8, accent: R.soul },
    dark: { fill: 0x080506, o: 0x050304, b1: 0x2a2024, b2: 0x181214, hi: 0x3e3236, accent: R.stone },
  };
  const s = sets[style] || sets.stone;
  pc.rect(0, 0, S, S, s.fill);
  // outer ink + double bevel
  for (let i = 0; i < S; i++) {
    pc.set(i, 0, s.o); pc.set(i, S - 1, s.o); pc.set(0, i, s.o); pc.set(S - 1, i, s.o);
    pc.set(i, 1, s.hi); pc.set(1, i, s.hi); pc.set(i, S - 2, s.b2); pc.set(S - 2, i, s.b2);
    pc.set(i, 2, s.b1); pc.set(2, i, s.b1); pc.set(i, S - 3, s.b1); pc.set(S - 3, i, s.b1);
    pc.set(i, 3, s.o); pc.set(3, i, s.o); pc.set(i, S - 4, s.o); pc.set(S - 4, i, s.o);
  }
  pc.rect(4, 4, S - 8, S - 8, s.fill);
  // corner ornaments: little gothic quatrefoil studs
  const a = s.accent;
  for (const [cx, cy] of [[3, 3], [S - 4, 3], [3, S - 4], [S - 4, S - 4]]) {
    pc.rect(cx - 2, cy - 2, 5, 5, s.o);
    pc.rect(cx - 1, cy - 1, 3, 3, a[2] ?? a[1]);
    pc.set(cx, cy, a[a.length - 1]);
    pc.set(cx - 1, cy - 1, a[a.length - 2] ?? a[1]);
  }
  return pc.toDataURL();
}

const cache = {};
export function frameURL(style) {
  if (!cache[style]) cache[style] = frame(style);
  return cache[style];
}

// Divider ornament (horizontal), e.g. under titles
export function dividerURL(color = 'gold') {
  const pc = new PixelCanvas(64, 5);
  const c = color === 'gold' ? R.gold : color === 'crimson' ? R.crimson : R.soul;
  for (let x = 0; x < 64; x++) {
    const d = Math.abs(x - 31.5);
    if (d < 28) pc.set(x, 2, c[d < 6 ? 4 : d < 16 ? 3 : 2]);
  }
  pc.rect(30, 0, 4, 5, c[2]); pc.rect(31, 1, 2, 3, c[4]);
  pc.set(29, 2, c[3]); pc.set(34, 2, c[3]);
  return pc.toDataURL();
}

export function cursorURL() {
  const pc = new PixelCanvas(11, 11);
  const g = R.gold;
  for (let k = 0; k < 11; k++) { if (k < 4 || k > 6) { pc.set(k, 5, g[4]); pc.set(5, k, g[4]); } }
  pc.set(5, 5, g[5]);
  pc.outline(0x0b0709);
  return pc.toDataURL();
}
