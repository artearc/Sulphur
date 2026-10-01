// Packs procedurally drawn frames into a texture atlas (color + emissive layers).
import * as THREE from 'three';
import { PixelCanvas } from './pixel.js';

export function makeTexture(canvasOrPc) {
  const cv = canvasOrPc instanceof PixelCanvas ? canvasOrPc.toCanvas() : canvasOrPc;
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * def = {
 *   w, h,                // frame size in px (include ~1px transparent padding for outlines)
 *   anims: { name: { frames, fps, loop, draw(c, e, i, n, ctx) } },
 *   outline: color|false, emissive: bool, pivotY (px from bottom where feet are)
 * }
 * draw() paints into `c` (color PixelCanvas) and optionally `e` (emissive PixelCanvas).
 */
export class SpriteSheet {
  constructor(def) {
    this.def = def;
    this.fw = def.w; this.fh = def.h;
    const animNames = Object.keys(def.anims);
    let total = 0;
    for (const n of animNames) total += def.anims[n].frames;
    const cols = Math.max(1, Math.min(total, Math.floor(2048 / this.fw)));
    const rows = Math.ceil(total / cols);
    this.cols = cols;
    this.width = cols * this.fw;
    this.height = rows * this.fh;
    const color = new PixelCanvas(this.width, this.height);
    const emis = def.emissive ? new PixelCanvas(this.width, this.height) : null;
    this.anims = {};
    let k = 0;
    for (const n of animNames) {
      const a = def.anims[n];
      this.anims[n] = { start: k, count: a.frames, fps: a.fps ?? 8, loop: a.loop ?? true, events: a.events || {} };
      for (let i = 0; i < a.frames; i++, k++) {
        const fc = new PixelCanvas(this.fw, this.fh);
        const fe = def.emissive ? new PixelCanvas(this.fw, this.fh) : null;
        a.draw(fc, fe, i, a.frames, def.ctx || {});
        if (def.outline !== false && a.outline !== false) fc.outline(def.outline ?? 0x0b0709);
        if (def.post) def.post(fc, fe, n, i);
        const fx = (k % cols) * this.fw, fy = Math.floor(k / cols) * this.fh;
        color.blit(fc, fx, fy);
        if (fe) emis.blit(fe, fx, fy);
      }
    }
    this.frameCount = k;
    this.colorPc = color;
    this.texture = makeTexture(color);
    this.emissive = emis ? makeTexture(emis) : null;
  }

  // UV rect for frame index (flipY texture => v measured from bottom)
  frameRect(index, out) {
    const col = index % this.cols, row = Math.floor(index / this.cols);
    const u0 = (col * this.fw) / this.width;
    const v0 = 1 - ((row + 1) * this.fh) / this.height;
    out.set(u0, v0, this.fw / this.width, this.fh / this.height);
    return out;
  }

  // Extract single frame as data URL (for UI icons/portraits)
  frameDataURL(anim = null, i = 0, scale = 1) {
    const a = anim ? this.anims[anim] : { start: 0 };
    const k = a.start + i;
    const pc = new PixelCanvas(this.fw, this.fh);
    const fx = (k % this.cols) * this.fw, fy = Math.floor(k / this.cols) * this.fh;
    for (let y = 0; y < this.fh; y++) for (let x = 0; x < this.fw; x++) {
      const p = this.colorPc.get(fx + x, fy + y);
      if (p && p[3]) pc.set(x, y, [p[0], p[1], p[2]], p[3]);
    }
    return pc.toDataURL(scale);
  }
}

// Registry so identical sheets are generated once.
const cache = new Map();
export function getSheet(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}
