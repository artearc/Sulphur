// FX art: slash arcs, projectiles, decals, halo, blob shadow, digits, sigils.
import { PixelCanvas, hex, mix, bayer } from './pixel.js';
import { SpriteSheet, getSheet, makeTexture } from './sheet.js';
import { R } from './palette.js';

// ---------------------------------------------------------------------------------------------
// Slash arcs — drawn facing +x; the mesh is rotated to the attack angle.
// style: { ramp: [dark..light], width: px band, arc: radians, radius: px, frames }
// ---------------------------------------------------------------------------------------------
export function slashSheet(key, style) {
  return getSheet('slash_' + key, () => {
    const size = style.size || 56;
    const frames = style.frames || 5;
    const ramp = style.ramp;
    return new SpriteSheet({
      w: size, h: size, outline: false, emissive: false,
      anims: {
        swing: {
          frames, fps: 30, loop: false,
          draw: (c, e, i, n) => {
            const cx = size / 2, cy = size / 2;
            const R0 = style.radius || size / 2 - 3;
            const W = style.width || 6;
            const arc = style.arc || 2.2;
            const prog = (i + 1) / n;                 // sweep progress
            const head = -arc / 2 + arc * Math.min(1, prog * 1.35);
            const tailLen = arc * (0.9 - prog * 0.5);
            const fade = i >= n - 2 ? (i === n - 1 ? 0.45 : 0.75) : 1;
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
              const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
              const d = Math.hypot(dx, dy);
              const a = Math.atan2(dy, dx);
              if (a > head || a < head - tailLen || a < -arc / 2) continue;
              const along = (head - a) / Math.max(0.001, tailLen); // 0 at head .. 1 at tail
              const thick = W * (1 - along * 0.85) * (style.taper === false ? 1.2 : 1);
              const inner = R0 - thick;
              if (d > R0 || d < inner) continue;
              const across = (d - inner) / Math.max(1, thick); // 0 inner .. 1 outer edge
              let f = across * 0.7 + (1 - along) * 0.6;
              f = f * fade;
              if (f + (bayer(x, y) - 0.5) * 0.35 < 0.28 + along * 0.25) continue;
              const idx = Math.min(ramp.length - 1, Math.max(0, Math.round(f * (ramp.length - 1) + (bayer(x, y) - 0.5) * 0.8)));
              c.set(x, y, ramp[idx]);
            }
          },
        },
      },
    });
  });
}

// Thrust / lunge streak
export function thrustSheet(key, ramp) {
  return getSheet('thrust_' + key, () => new SpriteSheet({
    w: 64, h: 16, outline: false,
    anims: {
      swing: {
        frames: 4, fps: 28, loop: false,
        draw: (c, e, i, n) => {
          const len = 20 + i * 12;
          for (let x = 0; x < len; x++) {
            const t = x / len;
            const w = Math.max(0, Math.round((1 - Math.abs(t - 0.75) * 1.6) * 3 * (1 - i / n * 0.6)));
            for (let y = -w; y <= w; y++) {
              const f = (1 - Math.abs(y) / (w + 1)) * (0.4 + t * 0.6) * (1 - i / (n + 1));
              if (f < 0.15) continue;
              c.set(x + 2, 8 + y, ramp[Math.min(ramp.length - 1, Math.round(f * (ramp.length - 1)))]);
            }
          }
        },
      },
    },
  }));
}

// ---------------------------------------------------------------------------------------------
// Projectiles (animated orbs / bolts). kind: orb | bolt | shard | coin | skull | wisp | arrow
// ---------------------------------------------------------------------------------------------
export function projectileSheet(kind, ramp, size = 12) {
  return getSheet(`proj_${kind}_${ramp.join(',')}_${size}`, () => new SpriteSheet({
    w: size, h: size, emissive: true, outline: kind === 'arrow' || kind === 'coin' || kind === 'skull' ? 0x0b0709 : false,
    anims: {
      fly: {
        frames: 4, fps: 14,
        draw: (c, e, i) => {
          const cx = size / 2, cy = size / 2;
          if (kind === 'orb' || kind === 'wisp') {
            const r = size / 2 - 2 + (i % 2 ? 0.4 : 0);
            c.ellipse(cx, cy, r, r, null, (nx, ny, x, y) => {
              const d = Math.hypot(nx, ny);
              const f = (1 - d) * (ramp.length) + (bayer(x + i, y) - 0.5);
              return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f)))];
            });
            c.set(cx - 1, cy - 1, ramp[ramp.length - 1]);
            if (kind === 'wisp') { c.set(cx - r - 1 + (i % 3), cy + 1, ramp[1]); c.set(cx - r, cy + 2 - (i % 2), ramp[0]); }
            e.ellipse(cx, cy, r - 1, r - 1, ramp[ramp.length - 2]);
          } else if (kind === 'bolt' || kind === 'shard') {
            const len = size - 3;
            for (let x = 0; x < len; x++) {
              const t = x / len;
              const w = kind === 'shard' ? Math.round((1 - Math.abs(t - 0.6) * 2) * 2) : (t > 0.6 ? 1 : 0);
              for (let y = -w; y <= w; y++) {
                const f = t * (ramp.length - 1) - Math.abs(y) * 0.8;
                c.set(x + 1, cy + y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f)))]);
                if (t > 0.5) e.set(x + 1, cy + y, ramp[ramp.length - 1], 200);
              }
            }
          } else if (kind === 'coin') {
            const w = [3, 2, 1, 2][i];
            c.ellipse(cx, cy, w, 3, null, (nx) => (nx < -0.2 ? ramp[ramp.length - 1] : nx > 0.4 ? ramp[1] : ramp[3]));
            e.set(cx - 1, cy - 1, ramp[ramp.length - 1]);
          } else if (kind === 'skull') {
            c.ellipse(cx, cy - 1, 3.5, 3, R.bone[3]);
            c.rect(cx - 2, cy + 1, 5, 2, R.bone[2]);
            c.set(cx - 1, cy - 1, 0x200000); c.set(cx + 1, cy - 1, 0x200000);
            e.set(cx - 1, cy - 1, ramp[ramp.length - 1]); e.set(cx + 1, cy - 1, ramp[ramp.length - 1]);
            for (let k = 0; k < 3; k++) { c.set(cx - 4 - k, cy + (k + i) % 3 - 1, ramp[2 - k] ?? ramp[0]); e.set(cx - 4 - k, cy + (k + i) % 3 - 1, ramp[2]); }
          } else if (kind === 'arrow') {
            c.line(1, cy, size - 3, cy, R.wood[3]);
            c.set(size - 2, cy, R.steel[4]); c.set(size - 3, cy - 1, R.steel[3]); c.set(size - 3, cy + 1, R.steel[3]);
            c.set(1, cy - 1, ramp[3]); c.set(2, cy - 1, ramp[3]); c.set(1, cy + 1, ramp[3]); c.set(2, cy + 1, ramp[3]);
          }
        },
      },
    },
  }));
}

// ---------------------------------------------------------------------------------------------
// Decals (ground stamps): blood splats, scorch, bile, frost, gold, sigils. 4x4 atlas of 32px cells.
// ---------------------------------------------------------------------------------------------
export function decalAtlas() {
  return getSheet('decals', () => {
    const cell = 32, cols = 4, rows = 4;
    const pc = new PixelCanvas(cell * cols, cell * rows);
    const splat = (ox, oy, seed, ramp, blobs = 7) => {
      let s = seed;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const cx = ox + 16, cy = oy + 16;
      pc.ellipse(cx, cy, 6 + rnd() * 2, 5 + rnd() * 2, null, (nx, ny, x, y) => ramp[(bayer(x, y) > 0.7 ? 0 : 1)]);
      for (let k = 0; k < blobs; k++) {
        const a = rnd() * Math.PI * 2, d = 5 + rnd() * 8, r = 1 + rnd() * 2.5;
        pc.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, r * 0.8, ramp[1]);
        if (rnd() > 0.5) pc.set(cx + Math.cos(a) * (d + r + 2), cy + Math.sin(a) * (d + r + 2), ramp[1]);
      }
      pc.set(cx - 2, cy - 2, ramp[2]); pc.set(cx - 1, cy - 2, ramp[2]);
    };
    // row 0: blood splats
    for (let i = 0; i < 4; i++) splat(i * cell, 0, 1234 + i * 77, R.blood.slice(1));
    // row 1: scorch, bile, frost, gold coins
    {
      const ox = 0, oy = cell;
      pc.ellipse(ox + 16, oy + 16, 12, 10, null, (nx, ny, x, y) => {
        const d = Math.hypot(nx, ny);
        return d + (bayer(x, y) - 0.5) * 0.5 > 0.75 ? null : d > 0.45 ? 0x1a100c : 0x0a0606;
      });
      splat(cell, cell, 999, R.poison.slice(1));
      const fx = cell * 2, fy = cell;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        pc.line(fx + 16, fy + 16, fx + 16 + Math.cos(a) * (8 + (k % 3) * 3), fy + 16 + Math.sin(a) * (8 + (k % 3) * 3), R.ice[4]);
      }
      pc.ellipse(fx + 16, fy + 16, 4, 3, R.ice[5]);
      const gx = cell * 3, gy = cell;
      for (let k = 0; k < 10; k++) {
        const x = gx + 8 + ((k * 37) % 16), y = gy + 10 + ((k * 23) % 12);
        pc.ellipse(x, y, 2, 1.4, R.gold[3]); pc.set(x - 1, y - 1, R.gold[5]);
      }
    }
    // row 2: sigils (summoning circle, holy cross, sin brand, crack)
    {
      const sig = (ox, oy, col, draw) => draw(ox + 16, oy + 16, col);
      sig(0, cell * 2, 0xc0203a, (cx, cy, c) => {
        pc.ring(cx, cy, 14, c, 1); pc.ring(cx, cy, 10, c, 1);
        for (let k = 0; k < 5; k++) {
          const a0 = (k / 5) * Math.PI * 2 - Math.PI / 2, a1 = ((k + 2) / 5) * Math.PI * 2 - Math.PI / 2;
          pc.line(cx + Math.cos(a0) * 10, cy + Math.sin(a0) * 10, cx + Math.cos(a1) * 10, cy + Math.sin(a1) * 10, c);
        }
      });
      sig(cell, cell * 2, 0xf2c45a, (cx, cy, c) => {
        pc.ring(cx, cy, 14, c, 1);
        pc.rect(cx - 1, cy - 10, 3, 20, c); pc.rect(cx - 7, cy - 4, 15, 3, c);
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; pc.set(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, c); }
      });
      sig(cell * 2, cell * 2, 0x9a1224, (cx, cy, c) => {
        pc.ring(cx, cy, 13, c, 2);
        pc.line(cx - 8, cy - 8, cx + 8, cy + 8, c); pc.line(cx + 8, cy - 8, cx - 8, cy + 8, c);
        pc.ring(cx, cy, 5, c, 1);
      });
      sig(cell * 3, cell * 2, 0x060406, (cx, cy, c) => {
        let x = cx - 12, y = cy;
        for (let k = 0; k < 24; k++) { pc.set(x, y, c); pc.set(x, y + 1, 0x2a2224); x++; y += ((k * 7) % 3) - 1; }
        pc.line(cx - 2, cy, cx + 3, cy - 9, c); pc.line(cx + 4, cy + 1, cx + 7, cy + 10, c);
      });
    }
    // row 3: blob shadow, soft glow, rune ring, footprint ash
    {
      pc.ellipse(16, cell * 3 + 16, 12, 12, null, (nx, ny, x, y) => {
        const d = Math.hypot(nx, ny);
        return d + (bayer(x, y) - 0.5) * 0.45 < 0.85 ? 0x000000 : null;
      });
      pc.ellipse(cell + 16, cell * 3 + 16, 14, 14, null, (nx, ny, x, y) => {
        const d = Math.hypot(nx, ny);
        return (1 - d) > bayer(x, y) * 0.9 ? 0xffffff : null;
      });
      pc.ring(cell * 2 + 16, cell * 3 + 16, 14, 0xffffff, 1);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; if (k % 2) pc.set(cell * 2 + 16 + Math.cos(a) * 11, cell * 3 + 16 + Math.sin(a) * 11, 0xffffff); }
      pc.ring(cell * 2 + 16, cell * 3 + 16, 9, 0xffffff, 1);
      // puddle (generic liquid, tinted at runtime)
      pc.ellipse(cell * 3 + 16, cell * 3 + 16, 13, 9, null, (nx, ny, x, y) => (Math.hypot(nx, ny) > 0.8 ? 0x9a9a9a : ny < -0.3 && nx < 0 ? 0xffffff : 0xc8c8c8));
    }
    const tex = makeTexture(pc);
    return { texture: tex, cell, cols, rows, width: pc.w, height: pc.h, pc };
  });
}
export const DECAL = {
  blood0: [0, 0], blood1: [1, 0], blood2: [2, 0], blood3: [3, 0],
  scorch: [0, 1], bile: [1, 1], frost: [2, 1], gold: [3, 1],
  sigilSin: [0, 2], sigilHoly: [1, 2], brand: [2, 2], crack: [3, 2],
  shadow: [0, 3], glow: [1, 3], runes: [2, 3], puddle: [3, 3],
};

// ---------------------------------------------------------------------------------------------
// Halo (virtue) — floats above Dante's head; brightness by virtue level
// ---------------------------------------------------------------------------------------------
export function haloSheet() {
  return getSheet('halo', () => new SpriteSheet({
    w: 16, h: 8, emissive: true, outline: false,
    anims: {
      glow: {
        frames: 4, fps: 6,
        draw: (c, e, i) => {
          for (let x = 0; x < 16; x++) for (let y = 0; y < 8; y++) {
            const nx = (x + 0.5 - 8) / 6.5, ny = (y + 0.5 - 4) / 2.6;
            const d = nx * nx + ny * ny;
            if (d < 1 && d > 0.38) {
              const bright = (Math.atan2(ny, nx) + Math.PI + i * 1.57) % (Math.PI * 2) < 1.2;
              c.set(x, y, bright ? 0xfff4cc : 0xf2c45a);
              e.set(x, y, bright ? 0xfff4cc : 0xd49a2a);
            }
          }
        },
      },
    },
  }));
}

// ---------------------------------------------------------------------------------------------
// Bitmap digits for damage numbers (3x5 glyphs, outlined)
// ---------------------------------------------------------------------------------------------
const GLYPHS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '011', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'], '+': ['000', '010', '111', '010', '000'], '-': ['000', '000', '111', '000', '000'],
  '!': ['010', '010', '010', '000', '010'], x: ['000', '101', '010', '101', '000'],
};
const numCache = new Map();
export function numberTexture(text, color = 0xffffff, color2 = null) {
  const key = text + '|' + color + '|' + color2;
  if (numCache.has(key)) return numCache.get(key);
  const w = text.length * 4 + 3, h = 9;
  const pc = new PixelCanvas(w, h);
  const c1 = hex(color), c2 = color2 != null ? hex(color2) : mix(c1, [0, 0, 0], 0.35);
  [...text].forEach((ch, k) => {
    const g = GLYPHS[ch];
    if (!g) return;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (g[y][x] === '1') pc.set(1 + k * 4 + x, 2 + y, y >= 3 ? c2 : c1);
  });
  pc.outline(0x0b0709);
  const res = { texture: makeTexture(pc), w, h };
  numCache.set(key, res);
  return res;
}

// ---------------------------------------------------------------------------------------------
// One-shot animated effects
// ---------------------------------------------------------------------------------------------
// Impact star: sharp cross-shaped spark that reads instantly as "hit"
export function impactSheet(key, ramp, size = 24) {
  return getSheet('impact_' + key, () => new SpriteSheet({
    w: size, h: size, outline: false,
    anims: {
      play: {
        frames: 4, fps: 24, loop: false,
        draw: (c, e, i) => {
          const cx = size / 2, cy = size / 2;
          const L = [5, 9, 10, 8][i], W = [2, 2, 1, 0][i];
          const col = ramp[Math.max(0, ramp.length - 1 - i)];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            for (let k = 0; k < L; k++) {
              const w = Math.max(0, Math.round(W * (1 - k / L)));
              for (let s = -w; s <= w; s++) c.set(cx + dx * k + (dy ? s : 0), cy + dy * k + (dx ? s : 0), k < 2 ? ramp[ramp.length - 1] : col);
            }
          }
          for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            for (let k = 2; k < L * 0.6; k++) c.set(cx + dx * k, cy + dy * k, col);
          }
          if (i < 2) c.disc(cx, cy, 3 - i, ramp[ramp.length - 1]);
          if (i >= 2) { c.ring(cx, cy, 4 + i * 2, ramp[1], 1); }
        },
      },
    },
  }));
}

// Explosion: dithered fireball that collapses into smoke rings
export function explosionSheet(key, ramp, size = 48) {
  return getSheet('explo_' + key, () => new SpriteSheet({
    w: size, h: size, outline: false,
    anims: {
      play: {
        frames: 7, fps: 18, loop: false,
        draw: (c, e, i, n) => {
          const cx = size / 2, cy = size / 2 + 2;
          const t = i / (n - 1);
          const r = 6 + t * (size / 2 - 7);
          let s = 77 + i * 13;
          const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * 1.15;
            const d = Math.hypot(dx, dy) / r;
            const noise = Math.sin(x * 0.9 + i) * 0.08 + Math.cos(y * 1.1 - i * 0.7) * 0.08;
            if (d + noise > 1) continue;
            const hole = t > 0.45 ? (t - 0.45) * 1.9 : 0;
            if (d + noise < hole) continue;
            let f = (1 - d) * (1 - t * 0.85) * ramp.length * 1.3;
            f += (bayer(x, y) - 0.5) * 1.2;
            const idx = Math.max(0, Math.min(ramp.length - 1, Math.floor(f)));
            c.set(x, y, ramp[idx]);
          }
          for (let k = 0; k < 6 * (1 - t); k++) {
            const a = rnd() * 6.28, d = r * (0.9 + rnd() * 0.5);
            c.set(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, ramp[ramp.length - 1]);
          }
        },
      },
    },
  }));
}

// Pillar of light (absolution / holy) or shadow (condemnation)
export function pillarSheet(key, ramp, w = 24, h = 96) {
  return getSheet('pillar_' + key, () => new SpriteSheet({
    w, h, outline: false,
    anims: {
      play: {
        frames: 10, fps: 14, loop: false,
        draw: (c, e, i, n) => {
          const t = i / (n - 1);
          const width = (t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7) * (w / 2 - 1);
          const cx = w / 2;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const dx = Math.abs(x + 0.5 - cx);
            if (dx > width) continue;
            const u = dx / Math.max(0.5, width);
            const vy = y / h;
            let f = (1 - u) * ramp.length * (0.6 + 0.4 * Math.sin(vy * 18 - i * 1.4) * 0.5 + 0.2);
            f += (bayer(x, y + i) - 0.5) * 1.0;
            if (f < 0.6) continue;
            c.set(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(f)))]);
          }
        },
      },
    },
  }));
}

// Spawn portal / sigil rising (enemy spawn telegraph)
export function spawnSheet(key, ramp) {
  return getSheet('spawn_' + key, () => new SpriteSheet({
    w: 32, h: 40, outline: false,
    anims: {
      play: {
        frames: 8, fps: 12, loop: false,
        draw: (c, e, i, n) => {
          const t = i / (n - 1);
          const cx = 16;
          for (let k = 0; k < 14; k++) {
            const x = cx + Math.round(Math.sin(k * 2.4 + i) * (6 + (k % 3) * 2) * (1 - t * 0.5));
            const y0 = 38 - Math.round(((k * 7 + i * 5) % 30) * (0.5 + t));
            c.vline(x, Math.max(0, y0 - 3), y0, ramp[(k + i) % ramp.length]);
          }
          c.ellipse(cx, 37, 10 * (0.4 + t * 0.6), 2.5, ramp[1]);
          c.ellipse(cx, 37, 6 * (0.4 + t * 0.6), 1.5, ramp[ramp.length - 1]);
        },
      },
    },
  }));
}
