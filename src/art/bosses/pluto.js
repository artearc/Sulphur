// PLUTO, il gran nemico — "Pape Satàn, pape Satàn aleppe!": a bloated wolf-demon of wealth,
// gilded hide cracking over rot, wrapped in chains of coins. When rebuked he collapses like a sail.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const GILD = [0x2a1a06, 0x4a300c, 0x7a5414, 0xa87a20, 0xd4a42e, 0xf2cc5a];
const ROT = [0x1a1408, 0x2e2410, 0x463818];
const W = 108, H = 104;

function pluto(c, e, p) {
  const cx = 52, by = 100, bob = p.bob || 0;
  const deflate = p.deflate || 0;            // 0 swollen .. 1 collapsed
  const bw = 30 - deflate * 10, bh = 26 - deflate * 12;
  // hind legs / haunches
  for (const s of [-1, 1]) { c.ellipse(cx + s * 18, by - 12, 10, 9 - deflate * 3, null, (nx, ny, x, y) => pk(GILD, 3 - nx * s * 0.6 - ny, x, y)); c.rect(cx + s * 22 - 4, by - 4, 8, 4, ROT[0]); }
  // swollen body
  const bcy = by - 24 - bh + deflate * 8 + bob;
  c.ellipse(cx, bcy, bw, bh, null, (nx, ny, x, y) => {
    let f = 3.8 - nx * 1.1 - ny * 1.3;
    const crack = Math.abs(Math.sin(nx * 9 + ny * 4)) < 0.1 || Math.abs(Math.sin(ny * 11 - nx * 2)) < 0.07;
    if (crack) return pk(ROT, 1.5, x, y);
    if (deflate > 0.3 && bayer(x, y * 2) < deflate * 0.35) return pk(ROT, 2, x, y);
    return pk(GILD, f, x, y);
  });
  // chains of coins wrapping the belly
  for (let k = 0; k < 3; k++) {
    const yy = bcy - 8 + k * 9;
    for (let x = cx - bw + 3; x < cx + bw - 3; x += 3) {
      const y = yy + Math.round(Math.sin((x - cx) * 0.08 + k) * 3);
      c.ellipse(x, y, 1.6, 1.2, R.gold[3 + ((x + k) % 2)]);
      if (e && (x + k * 5) % 9 === 0) e.set(x, y, R.gold[3]);
    }
  }
  // arms with claws gripping coins
  const raise = p.raise || 0;
  for (const s of [-1, 1]) {
    const hx = cx + s * (bw + 6), hy = bcy - raise * 18 + 6;
    c.thickLine(cx + s * (bw - 6), bcy - 10, hx, hy, 4, GILD[2]);
    c.disc(hx, hy, 4.5, GILD[3]);
    for (let k = -1; k <= 1; k++) c.line(hx, hy, hx + s * 6, hy + k * 3 - 2, R.bone[3]);
    if (p.coins) { c.ellipse(hx, hy - 6, 3, 2, R.gold[4]); if (e) e.ellipse(hx, hy - 6, 2, 1.4, R.gold[3]); }
  }
  // wolf head
  const hy = bcy - bh - 6 + (p.head || 0);
  c.ellipse(cx + 6, hy, 11, 9, null, (nx, ny, x, y) => pk(GILD, 4 - nx - ny, x, y));
  c.poly([[cx + 10, hy - 3], [cx + 28, hy + 1], [cx + 27, hy + 6], [cx + 10, hy + 7]], null, (x, y) => pk(GILD, 3.4 - (y - hy) * 0.15, x, y));
  const open = p.open || 0;
  c.poly([[cx + 10, hy + 7], [cx + 26, hy + 6 + open], [cx + 24, hy + 10 + open], [cx + 9, hy + 11]], null, (x, y) => pk(GILD, 2.2, x, y));
  if (open) { c.poly([[cx + 12, hy + 7], [cx + 26, hy + 6], [cx + 26, hy + 6 + open], [cx + 12, hy + 8]], 0x3a0408); for (let k = 0; k < 6; k++) c.set(cx + 13 + k * 2, hy + 7, R.bone[4]); }
  // ears / horns
  c.poly([[cx - 2, hy - 6], [cx - 6, hy - 18 - (p.horn || 0)], [cx + 3, hy - 8]], GILD[4]);
  c.poly([[cx + 6, hy - 7], [cx + 6, hy - 19 - (p.horn || 0)], [cx + 11, hy - 7]], GILD[5]);
  // eyes: molten coins
  c.disc(cx + 12, hy - 2, 1.6, 0xfff080);
  if (e) e.disc(cx + 12, hy - 2, 1.6, 0xffe080);
  c.set(cx + 12, hy - 2, 0xffffff);
  // crown of coins
  for (let k = -3; k <= 3; k++) c.ellipse(cx + 4 + k * 3, hy - 9 - Math.abs(k) * 0.5, 1.4, 1, R.gold[5]);
}

export function plutoSheet() {
  return getSheet('boss_pluto', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 6, draw: (c, e, i) => pluto(c, e, { bob: [0, 0, 1, 1, 1, 0][i], open: i === 3 ? 2 : 0 }) },
      move: { frames: 6, fps: 8, draw: (c, e, i) => pluto(c, e, { bob: [0, 1, 2, 1, 0, 1][i] }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => pluto(c, e, { bob: -1, raise: 0.5 + i * 0.25, open: 2, coins: true }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => pluto(c, e, { bob: 2 - i, raise: 1 - i * 0.5, open: 4 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => pluto(c, e, { bob: i % 2, head: -3, open: 6 + (i % 2), horn: 2, raise: 0.6 }) },
      cast: { frames: 4, fps: 8, draw: (c, e, i) => pluto(c, e, { bob: i % 2, raise: 1, coins: true, open: 3 }) },
      collapse: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => pluto(c, e, { deflate: i / 5, head: i * 3, open: 4 }) },
      crawl: { frames: 4, fps: 8, draw: (c, e, i) => pluto(c, e, { deflate: 1, head: 15, bob: i % 2, open: 3 + (i % 2) }) },
      crawlAttack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => pluto(c, e, { deflate: 1, head: 12 - i * 2, open: 7, raise: 0.3 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => pluto(c, e, { bob: 2, open: 3 }) },
      death: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => pluto(c, e, { deflate: 1, head: 15 + i * 2, bob: i, open: 6 }) },
    },
  }));
}
