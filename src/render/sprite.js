// Billboard sprite actor: upright plane (stretched to read 1:1 under the 3/4 camera),
// frame animation, flip, flash, tint, dissolve and pixel-snapped placement.
import * as THREE from 'three';
import { createSpriteMaterial, PPU, Y_STRETCH, PITCH } from './materials.js';

const SIN = Math.sin(PITCH), COS = Math.cos(PITCH);
const geoCache = new Map();
function planeGeo(w, h, pivotY) {
  const key = `${w}|${h}|${pivotY}`;
  if (!geoCache.has(key)) {
    const g = new THREE.PlaneGeometry(w, h);
    g.translate(0, h / 2 - pivotY, 0);
    geoCache.set(key, g);
  }
  return geoCache.get(key);
}

export class Sprite {
  constructor(sheet, opts = {}) {
    this.sheet = sheet;
    const w = sheet.fw / PPU;
    const h = (sheet.fh / PPU) * Y_STRETCH;
    const pivot = ((opts.pivot ?? 1) / PPU) * Y_STRETCH; // px from bottom where the feet are
    this.material = createSpriteMaterial(sheet, opts);
    this.mesh = new THREE.Mesh(planeGeo(w, h, pivot), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder ?? 0;
    this.u = this.material.uniforms;
    this.anim = null;
    this.frame = 0;
    this.time = 0;
    this.speed = 1;
    this.finished = false;
    this.flashT = 0; this.flashDur = 0.1;
    this.x = 0; this.y = 0; this.z = 0;
    this.scale = opts.scale ?? 1;
    this.mesh.scale.setScalar(this.scale);
    this.zBias = opts.zBias ?? 0;
    if (opts.anim) this.play(opts.anim);
    else this.setFrame(0);
  }

  setSheet(sheet) {
    if (sheet === this.sheet) return;
    this.sheet = sheet;
    this.u.uMap.value = sheet.texture;
    this.u.uEmissiveMap.value = sheet.emissive || sheet.texture;
    this.u.uHasEmissive.value = sheet.emissive ? 1 : 0;
    this.u.uAtlasSize.value.set(sheet.width, sheet.height);
    const a = this.anim;
    this.anim = null;
    if (a) this.play(a, { keepTime: true });
  }

  has(name) { return !!this.sheet.anims[name]; }

  play(name, opts = {}) {
    if (!this.sheet.anims[name]) {
      // fall back gracefully: strip direction suffix or use first anim
      const base = name.split('_')[0];
      const alt = Object.keys(this.sheet.anims).find((k) => k.startsWith(base));
      if (!alt) return;
      name = alt;
    }
    if (this.anim === name && !opts.restart) return;
    const keepTime = opts.keepTime && this.anim && this.anim.split('_')[0] === name.split('_')[0];
    this.anim = name;
    if (!keepTime) { this.time = 0; this.frame = 0; }
    this.finished = false;
    this.speed = opts.speed ?? 1;
    this._apply();
  }

  setFrame(index) {
    this.sheet.frameRect(index, this.u.uFrame.value);
  }

  _apply() {
    const a = this.sheet.anims[this.anim];
    if (!a) return;
    this.setFrame(a.start + Math.min(this.frame, a.count - 1));
  }

  update(dt) {
    if (this.anim) {
      const a = this.sheet.anims[this.anim];
      this.time += dt * this.speed;
      let f = Math.floor(this.time * a.fps);
      if (a.loop) f %= a.count;
      else if (f >= a.count) { f = a.count - 1; this.finished = true; }
      if (f !== this.frame) { this.frame = f; this._apply(); }
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.u.uFlash.value.w = this.flashT > 0 ? Math.min(1, (this.flashT / this.flashDur) * 1.2) : 0;
    }
  }

  flash(color = 0xffffff, dur = 0.09) {
    const c = new THREE.Color(color);
    this.u.uFlash.value.set(c.r, c.g, c.b, 1);
    this.flashT = dur; this.flashDur = dur;
  }
  setFlip(f) { this.u.uFlip.value = f ? 1 : 0; }
  setTint(color, amt) { const c = new THREE.Color(color); this.u.uTint.value.set(c.r, c.g, c.b, amt); }
  setOutline(color, amt = 1) { const c = new THREE.Color(color); this.u.uOutline.value.set(c.r, c.g, c.b, amt); }
  setAlpha(a) { this.u.uAlpha.value = a; }
  setDissolve(d, color) { this.u.uDissolve.value = d; if (color !== undefined) this.u.uDissolveColor.value.set(color); }
  setScale(s) { this.scale = s; this.mesh.scale.setScalar(s); }
  setScaleXY(sx, sy) { this.mesh.scale.set(sx * this.scale, sy * this.scale, 1); }

  // Place with pixel snapping so sprites never shimmer against the snapped camera.
  place(x, y, z) {
    this.x = x; this.y = y; this.z = z;
    const unit = 1 / PPU;
    const sx = Math.round(x / unit) * unit;
    // screen-vertical coordinate s = y*cos - z*sin
    const s = y * COS - z * SIN;
    const ss = Math.round(s / unit) * unit;
    const sz = z + (s - ss) / SIN;
    this.mesh.position.set(sx, y, sz + this.zBias);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.material.dispose();
  }
}
