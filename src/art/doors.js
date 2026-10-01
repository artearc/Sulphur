// Doors: gothic archway frame + animated portal + locked/sealed overlays.
import { SpriteSheet, getSheet } from './sheet.js';
import { CIRCLE_PALETTES, R } from './palette.js';
import { bayer, mix } from './pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];

export const PORTAL_COLORS = {
  combat: [0x2a0408, 0x6a0a18, 0xc8243a, 0xff8a7a],
  elite: [0x1a0206, 0x5a0410, 0xd01830, 0xffb0a0],
  soul: [0x0e1a2a, 0x2e4a6a, 0x7898b0, 0xdcecf4],
  altarV: [0x3a2408, 0xa06c18, 0xf2c45a, 0xfff4cc],
  altarS: [0x1a0206, 0x6a0a18, 0xc8243a, 0xf05060],
  shop: [0x1a2010, 0x4a6a20, 0xb8c040, 0xf0f0a0],
  treasure: [0x2a1a40, 0x6a40a0, 0xc0a0f0, 0xfff0ff],
  rest: [0x0a2028, 0x1e5c5a, 0x52b4a0, 0xc0fff0],
  miniboss: [0x200410, 0x6a1030, 0xe04a7a, 0xffc0d0],
  secret: [0x14081e, 0x3c1a4a, 0x84408e, 0xe0b0f0],
  boss: [0x050102, 0x3a0204, 0x9a0a10, 0xff4020],
  start: [0x101010, 0x404040, 0x909090, 0xffffff],
  exit: [0x3a2408, 0xa06c18, 0xf2c45a, 0xfff4cc],
};

// stone archway, 48x60, opening is 32px wide
export function archSheet(circleId) {
  const P = CIRCLE_PALETTES[circleId] || CIRCLE_PALETTES.limbo;
  return getSheet('arch_' + circleId, () => new SpriteSheet({
    w: 52, h: 64, emissive: true,
    anims: {
      idle: {
        frames: 1, fps: 1,
        draw: (c, e) => {
          const W = P.wall;
          const cx = 26;
          for (let y = 0; y < 63; y++) for (let x = 0; x < 52; x++) {
            const dx = Math.abs(x + 0.5 - cx);
            // pointed arch: inner opening
            const innerTop = 22 - Math.sqrt(Math.max(0, 16 * 16 - dx * dx)) * 0.9 + 6;
            const inner = dx < 16 && y > innerTop;
            const outerTop = 22 - Math.sqrt(Math.max(0, 26 * 26 - dx * dx)) * 0.8 - 2;
            if (y < outerTop || inner) continue;
            let f = 2.6 - (x / 52) * 1.4;
            const stoneRow = Math.floor((y + (x > cx ? 3 : 0)) / 6);
            if ((y + (x > cx ? 3 : 0)) % 6 === 0) f = 0.6;
            if (dx > 16 && dx < 18 && y > innerTop - 2) f = 3.8 - (x > cx ? 1.6 : 0);
            if (y > 58) f = 1.4;
            c.set(x, y, pk(W, f + (stoneRow % 2) * 0.3, x, y));
          }
          // keystone with sigil
          c.rect(23, 5, 6, 7, W[4]); c.vline(23, 5, 11, W[5]); c.set(26, 8, P.accent[3] ?? P.accent[2]);
          if (e) e.set(26, 8, P.accent[2]);
          // capitals
          c.rect(6, 28, 6, 3, W[5]); c.rect(40, 28, 6, 3, W[4]);
        },
      },
    },
  }));
}

export function portalSheet(kind) {
  const ramp = PORTAL_COLORS[kind] || PORTAL_COLORS.combat;
  return getSheet('portal_' + kind, () => new SpriteSheet({
    w: 34, h: 44, emissive: true, outline: false,
    anims: {
      idle: {
        frames: 8, fps: 10,
        draw: (c, e, i) => {
          const cx = 17;
          for (let y = 0; y < 44; y++) for (let x = 0; x < 34; x++) {
            const dx = Math.abs(x + 0.5 - cx);
            const top = 22 - Math.sqrt(Math.max(0, 16 * 16 - dx * dx)) * 0.9 + 6 - 0;
            if (dx >= 16 || y < top - 0) continue;
            const v = Math.sin(y * 0.35 - i * 0.8 + Math.sin(x * 0.3) * 1.5) * 0.5 + 0.5;
            const depth = 1 - Math.min(1, Math.abs(x + 0.5 - cx) / 16);
            let f = (v * 0.6 + depth * 0.6) * ramp.length - 0.6 + (bayer(x, y + i) - 0.5);
            const col = ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(f)))];
            c.set(x, y, col);
            e.set(x, y, mix(col, [0, 0, 0], 0.45));
          }
        },
      },
    },
  }));
}

export function barsSheet(kind = 'locked') {
  return getSheet('bars_' + kind, () => new SpriteSheet({
    w: 34, h: 44, emissive: true,
    anims: {
      idle: {
        frames: kind === 'locked' ? 1 : 6, fps: 6,
        draw: (c, e, i) => {
          if (kind === 'locked') {
            // iron portcullis
            for (let x = 3; x < 32; x += 4) for (let y = 4; y < 44; y++) c.set(x, y, y % 8 === 0 ? R.steel[3] : R.steel[2]);
            for (let y = 10; y < 44; y += 8) c.hline(2, 32, y, R.steel[1]);
            for (let x = 3; x < 32; x += 4) { c.set(x, 43, R.steel[4]); }
          } else {
            const ramp = kind === 'virtue' ? R.gold : R.crimson;
            // chains crossing the opening + seal
            for (let k = 0; k < 34; k++) {
              const y1 = 8 + k * 1.0, y2 = 42 - k * 1.0;
              const col = (k + i) % 4 < 2 ? ramp[3] : ramp[2];
              c.set(k, Math.round(y1), col); c.set(k, Math.round(y2), col);
            }
            c.disc(17, 25, 5, ramp[2]); c.disc(17, 25, 3.5, ramp[3 + (i % 2)]);
            c.set(17, 25, ramp[5] ?? ramp[4]);
            if (e) e.disc(17, 25, 3, ramp[2]);
          }
        },
      },
    },
  }));
}
