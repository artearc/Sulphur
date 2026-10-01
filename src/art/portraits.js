// Dialogue portraits (48x48), painted with the same ramp-and-dither hand as the sprites.
// Parametric bust: hood / veil / hair / crown / horns / laurel / beard / glowing eyes / mood.
import { PixelCanvas, bayer, mix } from './pixel.js';
import { R } from './palette.js';

const S = 48;
const pk = (ramp, f, x, y, d = 0.7) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];

export function paintPortrait(o) {
  const pc = new PixelCanvas(S, S);
  const skin = o.skin || R.skin;
  const robe = o.robe || R.danteRobe;
  const hood = o.hood || robe;
  const bg = o.bg || [0x0a0608, 0x140c0e, 0x22161a];
  const mood = o.mood || 'neutral';
  // background: dark niche with a pointed arch and a glow behind the head
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - 24, y - 18) / 30;
    let f = (1 - d) * 2.2;
    pc.set(x, y, pk(bg, f, x, y, 0.9));
  }
  if (o.glow) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - 24, y - 16) / 18;
      if (d < 1 && bayer(x, y) < (1 - d) * 0.6) pc.set(x, y, mix(pc.get(x, y), o.glow, 0.5));
    }
  }
  // arch frame lines
  for (let y = 0; y < S; y++) {
    const w = y < 14 ? Math.sqrt(Math.max(0, 22 * 22 - (14 - y) * (14 - y) * 2.2)) : 22;
    pc.set(Math.round(24 - w), y, bg[2]); pc.set(Math.round(23 + w), y, bg[2]);
  }
  const hx = 24 + (o.turn || 0), hy = 19;
  // shoulders / robe
  pc.poly([[6, 48], [10, 36], [17, 32], [31, 32], [38, 36], [42, 48]], null, (x, y) => {
    let f = 3.2 - (x - 6) / 36 * 2.4 - (y - 32) * 0.03;
    if (Math.abs(x - 24) < 1 && o.stole) return pk(o.stole, 3, x, y);
    return pk(robe, f, x, y);
  });
  if (o.trim) { for (let x = 12; x < 37; x++) pc.set(x, 33 + Math.round(Math.abs(x - 24) * 0.12), o.trim[2]); }
  // neck
  pc.rect(hx - 3, 27, 7, 6, skin[1]);
  pc.rect(hx - 2, 27, 4, 5, skin[2]);
  // hair behind (for bare heads and veils)
  if (o.hair && (o.head === 'bare' || o.head === 'crown' || o.head === 'horns')) {
    pc.ellipse(hx, hy - 2, 9.5, 10, null, (nx, ny, x, y) => pk(o.hair, 2.4 - nx - ny, x, y));
  }
  if (o.head === 'veil') pc.ellipse(hx, hy, 11, 13, null, (nx, ny, x, y) => pk(o.veil || R.beatriceVeil, 3 - nx * 1.2 - ny * 0.8, x, y));
  // head
  pc.ellipse(hx, hy, 7.5, 9.5, null, (nx, ny, x, y) => pk(skin, 3.2 - nx * 1.4 - ny * 0.9 + (o.gaunt && Math.abs(nx) > 0.6 && ny > -0.1 ? -1 : 0), x, y));
  // features
  const ey = hy - 1;
  const eyeCol = o.eyes || 0x140a0a;
  const browY = ey - 2 + (mood === 'angry' ? 1 : mood === 'sad' ? 0 : 0);
  for (const sx of [-1, 1]) {
    const ex = hx + sx * 3 + (o.turn || 0) * 0.3;
    pc.set(ex, ey, 0xe8e0d0); pc.set(ex + sx * -1, ey, eyeCol); // white + iris
    pc.set(ex + sx * -1, ey - 1, skin[1]);
    // brows
    if (mood === 'angry') { pc.set(ex - 1, browY - (sx > 0 ? 0 : 1), skin[0]); pc.set(ex, browY, skin[0]); pc.set(ex + 1, browY - (sx > 0 ? 1 : 0), skin[0]); }
    else if (mood === 'sad') { pc.set(ex - 1, browY + (sx > 0 ? 0 : -1), skin[0]); pc.set(ex, browY - 1, skin[0]); pc.set(ex + 1, browY + (sx > 0 ? -1 : 0), skin[0]); }
    else { pc.hline(ex - 1, ex + 1, browY, skin[0]); }
    if (o.eyesGlow) { pc.set(ex, ey, o.eyesGlow); pc.set(ex + sx * -1, ey, o.eyesGlow); }
  }
  // nose (Dante's aquiline nose when profile-ish)
  pc.vline(hx + (o.turn || 0) * 0.5, ey, ey + 4, skin[1]);
  pc.set(hx + 1 + (o.nose === 'hook' ? 1 : 0), ey + 4, skin[0]);
  if (o.nose === 'hook') pc.set(hx + 1, ey + 2, skin[3]);
  // mouth
  const my = hy + 5;
  if (mood === 'sad') { pc.hline(hx - 2, hx + 2, my, skin[0]); pc.set(hx - 3, my + 1, skin[0]); pc.set(hx + 3, my + 1, skin[0]); }
  else if (mood === 'angry' || mood === 'shout') { pc.rect(hx - 2, my - 1, 5, 2, 0x200808); pc.hline(hx - 2, hx + 2, my - 1, 0xd0c8b0); }
  else if (mood === 'smile') { pc.hline(hx - 2, hx + 2, my, skin[0]); pc.set(hx - 3, my - 1, skin[0]); pc.set(hx + 3, my - 1, skin[0]); }
  else pc.hline(hx - 2, hx + 2, my, skin[0]);
  // cheek shadow
  for (let y = hy; y < hy + 7; y++) pc.set(hx + 6, y, skin[1]);
  // tears
  if (o.tears) { pc.vline(hx - 4, ey + 1, ey + 4, 0xa8d8ff); pc.vline(hx + 3, ey + 1, ey + 3, 0xa8d8ff); }
  // beard
  if (o.beard) pc.ellipse(hx, hy + 7, 6.5, 4.5, null, (nx, ny, x, y) => (ny < -0.3 && Math.abs(nx) < 0.35 ? null : pk(o.beard, 2.6 - nx - ny, x, y)));
  if (o.beard) pc.hline(hx - 2, hx + 2, my, 0x1a1010);
  // headwear
  const H = (nx, ny, x, y) => pk(hood, 3.4 - nx * 1.3 - ny * 1.1, x, y);
  if (o.head === 'hood' || o.head === 'dante') {
    // hood ring framing the face
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x + 0.5 - hx) / 12, ny = (y + 0.5 - (hy - 1)) / 13;
      const fx = (x + 0.5 - hx) / 7.6, fy = (y + 0.5 - (hy + 1)) / 9.4;
      if (nx * nx + ny * ny <= 1 && !(fx * fx + fy * fy <= 1 && y > hy - 8) && y < 34) pc.set(x, y, H(nx, ny, x, y));
    }
    if (o.head === 'dante') {
      // becchetto tail falling over the shoulder
      for (let y = 26; y < 44; y++) pc.rect(hx + 9 + Math.round((y - 26) * 0.2), y, 3, 1, hood[(y % 3) ? 2 : 1]);
    }
  } else if (o.head === 'veil') {
    pc.ellipse(hx, hy - 7, 9, 5, null, (nx, ny, x, y) => pk(o.veil || R.beatriceVeil, 3.2 - nx - ny, x, y));
  } else if (o.head === 'bare' && o.hair) {
    pc.ellipse(hx, hy - 7, 8, 4, null, (nx, ny, x, y) => pk(o.hair, 2.6 - nx - ny, x, y));
  }
  if (o.laurel) {
    const lr = R.laurel;
    for (let k = -8; k <= 8; k++) {
      const x = hx + k, y = hy - 8 + Math.round((k * k) / 22);
      pc.set(x, y, lr[(k + 20) % 2 ? 3 : 4]); pc.set(x, y - 1 + ((k + 20) % 3 === 0 ? 0 : 1), lr[2]);
    }
  }
  if (o.head === 'crown' || o.crown) {
    const g = R.gold;
    pc.rect(hx - 7, hy - 10, 15, 3, g[3]); pc.hline(hx - 7, hx + 7, hy - 10, g[4]);
    for (const k of [-6, -2, 2, 6]) { pc.rect(hx + k, hy - 13, 2, 3, g[3]); pc.set(hx + k, hy - 14, g[5]); }
    pc.set(hx, hy - 9, R.crimson[4]);
  }
  if (o.head === 'horns' || o.horns) {
    const b = o.hornRamp || R.bone;
    pc.thickLine(hx - 6, hy - 6, hx - 12, hy - 16, 1.2, b[2]); pc.line(hx - 12, hy - 16, hx - 11, hy - 20, b[4]);
    pc.thickLine(hx + 6, hy - 6, hx + 12, hy - 16, 1.2, b[2]); pc.line(hx + 12, hy - 16, hx + 11, hy - 20, b[4]);
  }
  if (o.fire) for (let k = 0; k < 40; k++) {
    const x = 6 + ((k * 13) % 36), y = 46 - ((k * 7) % 14);
    pc.set(x, y, R.ember[2 + (k % 3)]);
  }
  if (o.frost) for (let k = 0; k < 30; k++) pc.set((k * 17) % 48, (k * 29) % 48, R.ice[5]);
  if (o.corrupt) for (let k = 0; k < 60; k++) { const x = (k * 23) % 48, y = 30 + ((k * 11) % 18); if (pc.get(x, y)) pc.set(x, y, 0x080206); }
  pc.outline(0x0b0709);
  // final ink border
  for (let i = 0; i < S; i++) { pc.set(i, 0, 0x050304); pc.set(i, S - 1, 0x050304); pc.set(0, i, 0x050304); pc.set(S - 1, i, 0x050304); }
  return pc;
}

const cache = new Map();
export function portraitURL(o, key) {
  const k = key || JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, paintPortrait(o).toDataURL(1));
  return cache.get(k);
}
