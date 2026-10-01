// PixelCanvas: a tiny raster toolkit for authoring SULPHUR's pixel art in code.
// Everything is drawn with integer pixels, palette ramps, dithering and hand-style outlines.
import { hash2 } from '../core/rng.js';

export function hex(c) {
  if (typeof c === 'string') c = parseInt(c.replace('#', ''), 16);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}
export function mix(a, b, t) {
  a = Array.isArray(a) ? a : hex(a); b = Array.isArray(b) ? b : hex(b);
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
export function toHex(rgb) { return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]; }
export function cssColor(c, a = 1) {
  const [r, g, b] = Array.isArray(c) ? c : hex(c);
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => BAYER[(x & 3) + (y & 3) * 4] / 16;

export class PixelCanvas {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
  static from(canvas) {
    const pc = new PixelCanvas(canvas.width, canvas.height);
    const ctx = canvas.getContext('2d');
    pc.data.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    return pc;
  }
  clone() { const p = new PixelCanvas(this.w, this.h); p.data.set(this.data); return p; }
  clear() { this.data.fill(0); return this; }
  idx(x, y) { return (y * this.w + x) * 4; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  set(x, y, c, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inb(x, y) || c == null) return;
    const rgb = Array.isArray(c) ? c : hex(c);
    const i = this.idx(x, y);
    if (a >= 255) {
      this.data[i] = rgb[0]; this.data[i + 1] = rgb[1]; this.data[i + 2] = rgb[2]; this.data[i + 3] = 255;
    } else {
      const sa = a / 255, da = this.data[i + 3] / 255;
      const oa = sa + da * (1 - sa);
      if (oa <= 0) return;
      for (let k = 0; k < 3; k++) this.data[i + k] = (rgb[k] * sa + this.data[i + k] * da * (1 - sa)) / oa;
      this.data[i + 3] = oa * 255;
    }
  }
  get(x, y) {
    if (!this.inb(x, y)) return null;
    const i = this.idx(x, y);
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  alpha(x, y) { return this.inb(x, y) ? this.data[this.idx(x, y) + 3] : 0; }
  erase(x, y) { if (this.inb(x, y)) this.data[this.idx(x, y) + 3] = 0; }

  rect(x, y, w, h, c, a) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
    return this;
  }
  hline(x0, x1, y, c) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c); }

  line(x0, y0, x1, y1, c, a) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  thickLine(x0, y0, x1, y1, r, c) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c);
    }
  }

  // filled ellipse; `shade` optional fn(nx, ny) -> color for per-pixel shading (nx,ny in -1..1)
  ellipse(cx, cy, rx, ry, c, shade) {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / (rx + 0.01), ny = (y + 0.5 - cy) / (ry + 0.01);
        if (nx * nx + ny * ny <= 1) this.set(x, y, shade ? shade(nx, ny, x, y) : c);
      }
    }
    return this;
  }
  disc(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  ring(cx, cy, r, c, thick = 1) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - thick) this.set(x, y, c);
      }
    }
  }

  // scanline polygon fill; pts = [[x,y],...]
  poly(pts, c, shade) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      const yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, shade ? shade(x, y) : c);
      }
    }
    return this;
  }

  // Draw an ASCII stamp: rows of chars mapped via palette {char: color}. '.' or ' ' = transparent.
  stamp(rows, x, y, pal, flip = false) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[flip ? row.length - 1 - i : i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c != null) this.set(x + i, y + j, c);
      }
    }
    return this;
  }

  // 1px outline around all opaque pixels. `inner` darkens interior edge pixels for a softer selout look.
  outline(c = 0x0a0608, opts = {}) {
    const src = this.data.slice();
    const w = this.w, h = this.h;
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    const rgb = hex(c);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (A(x, y) > 0) continue;
        const n = A(x + 1, y) | A(x - 1, y) | A(x, y + 1) | A(x, y - 1);
        const d = opts.diagonal ? A(x + 1, y + 1) | A(x - 1, y - 1) | A(x + 1, y - 1) | A(x - 1, y + 1) : 0;
        if (n || d) this.set(x, y, rgb);
      }
    }
    return this;
  }
  // Selective outline: darkens existing edge pixels toward `c` (adds hand-shaded volume).
  selout(c = 0x0a0608, t = 0.5) {
    const src = this.data.slice();
    const w = this.w, h = this.h;
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    const rgb = hex(c);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!A(x, y)) continue;
      if (!A(x, y + 1) || !A(x + 1, y)) {
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) this.data[i + k] = src[i + k] + (rgb[k] - src[i + k]) * t;
      }
    }
    return this;
  }

  // Ordered-dither between two colors over a region by a field fn(x,y)->0..1
  ditherFill(x, y, w, h, c0, c1, field) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = field(x + i, y + j);
      this.set(x + i, y + j, v > bayer(x + i, y + j) ? c1 : c0);
    }
  }

  // Replace colors only where alpha>0 via fn(rgb,x,y)->rgb
  map(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = this.idx(x, y);
      if (this.data[i + 3] === 0) continue;
      const r = fn([this.data[i], this.data[i + 1], this.data[i + 2]], x, y, this.data[i + 3]);
      if (r === null) { this.data[i + 3] = 0; continue; }
      this.data[i] = r[0]; this.data[i + 1] = r[1]; this.data[i + 2] = r[2];
      if (r[3] !== undefined) this.data[i + 3] = r[3];
    }
    return this;
  }

  blit(src, dx, dy, opts = {}) {
    const flip = opts.flip, a = opts.alpha ?? 1;
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const sx = flip ? src.w - 1 - x : x;
      const i = src.idx(sx, y);
      const al = src.data[i + 3];
      if (!al) continue;
      this.set(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2]], al * a);
    }
    return this;
  }

  // rotate (nearest, rotsprite-lite via 2x supersample)
  rotated(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const size = Math.ceil(Math.hypot(this.w, this.h)) + 2;
    const out = new PixelCanvas(size, size);
    const cx = this.w / 2, cy = this.h / 2, ox = size / 2, oy = size / 2;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - ox, dy = y + 0.5 - oy;
      const sx = Math.floor(c * dx + s * dy + cx), sy = Math.floor(-s * dx + c * dy + cy);
      if (sx < 0 || sy < 0 || sx >= this.w || sy >= this.h) continue;
      const i = this.idx(sx, sy);
      if (this.data[i + 3]) out.set(x, y, [this.data[i], this.data[i + 1], this.data[i + 2]], this.data[i + 3]);
    }
    return out;
  }

  noise(seed, x, y) { return hash2(x, y, seed); }

  toCanvas(scale = 1) {
    const cv = document.createElement('canvas');
    cv.width = this.w * scale; cv.height = this.h * scale;
    const ctx = cv.getContext('2d');
    const img = new ImageData(this.data.slice(), this.w, this.h);
    if (scale === 1) { ctx.putImageData(img, 0, 0); return cv; }
    const tmp = document.createElement('canvas');
    tmp.width = this.w; tmp.height = this.h;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
    return cv;
  }
  toDataURL(scale = 1) { return this.toCanvas(scale).toDataURL(); }
}

// Shading helper for spheres/ellipsoids lit from top-left with a ramp (dark -> light).
export function rampShade(ramp, opts = {}) {
  const lx = opts.lx ?? -0.55, ly = opts.ly ?? -0.75;
  const bias = opts.bias ?? 0;
  return (nx, ny, x, y) => {
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let l = nx * lx + ny * ly + nz * 0.55 + bias;
    l = (l + 0.6) / 1.6;
    const f = l * (ramp.length - 1) + (bayer(x, y) - 0.5) * (opts.dither ?? 0.6);
    const i = Math.max(0, Math.min(ramp.length - 1, Math.round(f)));
    return ramp[i];
  };
}
// Vertical gradient using a ramp with Bayer dithering.
export function vRamp(ramp, y0, y1, dither = 0.8) {
  return (x, y) => {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const f = (1 - t) * (ramp.length - 1) + (bayer(x, y) - 0.5) * dither;
    return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f)))];
  };
}
