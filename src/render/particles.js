// Pixel particle system: square points sized in low-res pixels (1-4 px), CPU-simulated in a
// single pooled buffer per blend mode. Presets express SULPHUR's element language:
// fire, ember, holy, corruption, blood, ice, wind, poison, gold, ash, smoke, spark, soul.
import * as THREE from 'three';
import { SharedUniforms } from './lighting.js';

const MAX = 6000;

class ParticleLayer {
  constructor(additive) {
    this.additive = additive;
    this.n = 0;
    this.px = new Float32Array(MAX); this.py = new Float32Array(MAX); this.pz = new Float32Array(MAX);
    this.vx = new Float32Array(MAX); this.vy = new Float32Array(MAX); this.vz = new Float32Array(MAX);
    this.life = new Float32Array(MAX); this.max = new Float32Array(MAX);
    this.size0 = new Float32Array(MAX); this.size1 = new Float32Array(MAX);
    this.c0 = new Float32Array(MAX * 3); this.c1 = new Float32Array(MAX * 3);
    this.grav = new Float32Array(MAX); this.drag = new Float32Array(MAX);
    this.floor = new Uint8Array(MAX); this.stain = new Uint8Array(MAX);
    this.wob = new Float32Array(MAX);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('aCol', this.aCol);
    g.setAttribute('aSize', this.aSize);
    g.setDrawRange(0, 0);
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uVision: SharedUniforms.uVision },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */ `
        attribute vec4 aCol; attribute float aSize;
        varying vec4 vCol; varying vec3 vWp;
        void main() {
          vCol = aCol;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWp = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
          gl_PointSize = aSize;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec4 uVision;
        varying vec4 vCol; varying vec3 vWp;
        void main() {
          if (vCol.a <= 0.01) discard;
          float m = 1.0;
          if (uVision.w > 0.0) m = mix(1.0, 1.0 - smoothstep(uVision.z * 0.55, uVision.z, length(vWp.xz - uVision.xy)), uVision.w * 0.9);
          gl_FragColor = vec4(vCol.rgb * m, vCol.a * m);
        }`,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 10;
  }

  spawn(o) {
    if (this.n >= MAX) return;
    const i = this.n++;
    this.px[i] = o.x; this.py[i] = o.y; this.pz[i] = o.z;
    this.vx[i] = o.vx; this.vy[i] = o.vy; this.vz[i] = o.vz;
    this.life[i] = o.life; this.max[i] = o.life;
    this.size0[i] = o.size0; this.size1[i] = o.size1;
    this.c0[i * 3] = o.c0.r; this.c0[i * 3 + 1] = o.c0.g; this.c0[i * 3 + 2] = o.c0.b;
    this.c1[i * 3] = o.c1.r; this.c1[i * 3 + 1] = o.c1.g; this.c1[i * 3 + 2] = o.c1.b;
    this.grav[i] = o.grav; this.drag[i] = o.drag; this.floor[i] = o.floor ? 1 : 0;
    this.stain[i] = o.stain ? 1 : 0; this.wob[i] = o.wobble || 0;
  }

  kill(i) {
    const j = --this.n;
    if (i === j) return;
    this.px[i] = this.px[j]; this.py[i] = this.py[j]; this.pz[i] = this.pz[j];
    this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j]; this.vz[i] = this.vz[j];
    this.life[i] = this.life[j]; this.max[i] = this.max[j];
    this.size0[i] = this.size0[j]; this.size1[i] = this.size1[j];
    for (let k = 0; k < 3; k++) { this.c0[i * 3 + k] = this.c0[j * 3 + k]; this.c1[i * 3 + k] = this.c1[j * 3 + k]; }
    this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.floor[i] = this.floor[j];
    this.stain[i] = this.stain[j]; this.wob[i] = this.wob[j];
  }

  update(dt, time, onStain, wind) {
    const P = this.aPos.array, C = this.aCol.array, S = this.aSize.array;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); i--; continue; }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vx[i] *= d; this.vz[i] *= d; this.vy[i] = this.vy[i] * d - this.grav[i] * dt;
      if (wind && this.wob[i] >= 0) { this.vx[i] += wind.x * dt * 0.6; this.vz[i] += wind.z * dt * 0.6; }
      if (this.wob[i] > 0) {
        this.vx[i] += Math.sin(time * 6 + i) * this.wob[i] * dt;
        this.vz[i] += Math.cos(time * 5 + i * 1.3) * this.wob[i] * dt;
      }
      this.px[i] += this.vx[i] * dt; this.py[i] += this.vy[i] * dt; this.pz[i] += this.vz[i] * dt;
      if (this.floor[i] && this.py[i] < 0.02) {
        this.py[i] = 0.02;
        if (this.stain[i] && onStain) { onStain(this.px[i], this.pz[i], this.c0[i * 3], this.c0[i * 3 + 1], this.c0[i * 3 + 2]); this.kill(i); i--; continue; }
        this.vy[i] *= -0.25; this.vx[i] *= 0.6; this.vz[i] *= 0.6;
      }
    }
    for (let i = 0; i < this.n; i++) {
      const t = 1 - this.life[i] / this.max[i];
      P[i * 3] = this.px[i]; P[i * 3 + 1] = this.py[i]; P[i * 3 + 2] = this.pz[i];
      for (let k = 0; k < 3; k++) C[i * 4 + k] = this.c0[i * 3 + k] + (this.c1[i * 3 + k] - this.c0[i * 3 + k]) * t;
      C[i * 4 + 3] = t > 0.75 ? (1 - t) / 0.25 : 1;
      S[i] = Math.max(1, Math.round(this.size0[i] + (this.size1[i] - this.size0[i]) * t)) * this.pixelScale;
    }
    this.geo.setDrawRange(0, this.n);
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
  }
}

const tmpA = new THREE.Color(), tmpB = new THREE.Color();

export const PRESETS = {
  spark: { add: true, c0: 0xfff4cc, c1: 0xf07818, life: [0.15, 0.35], speed: [4, 9], size: [2, 1], grav: 6, drag: 4, up: [1, 3] },
  fire: { add: true, c0: 0xffd060, c1: 0x801000, life: [0.35, 0.8], speed: [0.3, 1.2], size: [3, 1], grav: -2.5, drag: 1.5, up: [0.8, 2], wobble: 2 },
  ember: { add: true, c0: 0xffb040, c1: 0x601000, life: [0.8, 1.8], speed: [0.2, 0.8], size: [1, 1], grav: -1.2, drag: 0.5, up: [0.5, 1.5], wobble: 3 },
  holy: { add: true, c0: 0xffffff, c1: 0xf2c45a, life: [0.4, 0.9], speed: [1, 4], size: [2, 1], grav: -1.5, drag: 3, up: [0.5, 2] },
  holyMote: { add: true, c0: 0xfff4cc, c1: 0xa06c18, life: [1.0, 2.0], speed: [0.1, 0.4], size: [1, 1], grav: -0.6, drag: 0.6, up: [0.3, 0.9], wobble: 1.5 },
  corruption: { add: false, c0: 0x2a0a20, c1: 0x050208, life: [0.5, 1.1], speed: [0.5, 2.5], size: [3, 1], grav: -1.2, drag: 2.5, up: [0.3, 1.5], wobble: 2 },
  corruptGlow: { add: true, c0: 0xc0102a, c1: 0x200008, life: [0.4, 0.9], speed: [0.5, 2.5], size: [2, 1], grav: -0.8, drag: 2, up: [0.3, 1.2] },
  blood: { add: false, c0: 0x8a1016, c1: 0x3a0408, life: [0.4, 0.9], speed: [2, 6], size: [2, 1], grav: 18, drag: 1.5, up: [2, 5], floor: true, stain: true },
  bloodMist: { add: false, c0: 0x6a0a10, c1: 0x200204, life: [0.3, 0.6], speed: [1, 3], size: [3, 2], grav: 2, drag: 4, up: [0.5, 1.5] },
  ice: { add: true, c0: 0xffffff, c1: 0x4a84a8, life: [0.3, 0.8], speed: [2, 6], size: [2, 1], grav: 10, drag: 2, up: [1, 4], floor: true },
  frost: { add: true, c0: 0xc8ecf8, c1: 0x16304e, life: [0.8, 1.6], speed: [0.1, 0.6], size: [1, 1], grav: 0.3, drag: 0.8, up: [0, 0.5], wobble: 1 },
  wind: { add: false, c0: 0xd0c0e0, c1: 0x403050, life: [0.5, 1.2], speed: [0, 0], size: [1, 1], grav: 0, drag: 0, up: [0, 0.2] },
  poison: { add: false, c0: 0x92a82e, c1: 0x24320e, life: [0.6, 1.2], speed: [0.3, 1.5], size: [3, 1], grav: -0.5, drag: 2, up: [0.2, 1], wobble: 1 },
  bile: { add: false, c0: 0xc8d050, c1: 0x3e5216, life: [0.4, 0.8], speed: [2, 5], size: [2, 1], grav: 14, drag: 1, up: [2, 4], floor: true, stain: true },
  gold: { add: true, c0: 0xffe8a0, c1: 0xa06c18, life: [0.4, 0.9], speed: [1.5, 4], size: [2, 1], grav: 9, drag: 1.5, up: [2, 4], floor: true },
  ash: { add: false, c0: 0x6a6872, c1: 0x2a2930, life: [1.5, 3], speed: [0.1, 0.5], size: [1, 1], grav: 0.4, drag: 0.4, up: [0, 0.3], wobble: 0.8 },
  smoke: { add: false, c0: 0x2a2224, c1: 0x0a0809, life: [0.8, 1.6], speed: [0.2, 1], size: [4, 7], grav: -0.8, drag: 1.2, up: [0.3, 1], wobble: 0.6 },
  dust: { add: false, c0: 0x5a5048, c1: 0x2a2420, life: [0.3, 0.6], speed: [1, 2.5], size: [2, 3], grav: 1, drag: 4, up: [0.2, 0.8] },
  soul: { add: true, c0: 0xdcecf4, c1: 0x2e4054, life: [0.6, 1.4], speed: [0.2, 1], size: [2, 1], grav: -1.6, drag: 1.5, up: [0.5, 1.5], wobble: 2 },
  shadow: { add: false, c0: 0x100818, c1: 0x020104, life: [0.4, 0.9], speed: [0.3, 1.5], size: [3, 1], grav: -0.6, drag: 2, up: [0.2, 1], wobble: 1.5 },
  lightning: { add: true, c0: 0xffffff, c1: 0x8aa0e0, life: [0.08, 0.2], speed: [3, 8], size: [2, 1], grav: 0, drag: 6, up: [0, 1] },
  petal: { add: false, c0: 0xe04a7a, c1: 0x4a0e2a, life: [1.0, 2.0], speed: [0.5, 1.5], size: [2, 1], grav: 0.5, drag: 0.6, up: [0, 0.5], wobble: 2.5 },
};

export class Particles {
  constructor(scene) {
    this.add = new ParticleLayer(true);
    this.norm = new ParticleLayer(false);
    this.root = new THREE.Group();
    this.root.add(this.norm.points, this.add.points);
    scene.add(this.root);
    this.time = 0;
    this.onStain = null;
    this.wind = null;
    this.setPixelScale(1);
  }
  setPixelScale(s) { this.add.pixelScale = s; this.norm.pixelScale = s; }
  clear() { this.add.n = 0; this.norm.n = 0; }

  /**
   * Emit `count` particles from preset at (x,y,z).
   * o: { dir: angle (xz), spread, speed:[a,b] override, color overrides c0/c1, radius (spawn disk), y spread }
   */
  emit(preset, x, y, z, count = 8, o = {}) {
    const p = typeof preset === 'string' ? PRESETS[preset] : preset;
    if (!p) return;
    const layer = (o.add ?? p.add) ? this.add : this.norm;
    tmpA.set(o.c0 ?? p.c0); tmpB.set(o.c1 ?? p.c1);
    const sp = o.speed || p.speed, lf = o.life || p.life, up = o.up || p.up;
    for (let k = 0; k < count; k++) {
      const a = o.dir !== undefined ? o.dir + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * Math.PI * 2;
      const s = sp[0] + Math.random() * (sp[1] - sp[0]);
      const r = o.radius ? Math.sqrt(Math.random()) * o.radius : 0;
      const ra = Math.random() * Math.PI * 2;
      layer.spawn({
        x: x + Math.cos(ra) * r, y: y + (o.ySpread ? Math.random() * o.ySpread : 0), z: z + Math.sin(ra) * r,
        vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: up[0] + Math.random() * (up[1] - up[0]),
        life: lf[0] + Math.random() * (lf[1] - lf[0]),
        size0: (o.size || p.size)[0], size1: (o.size || p.size)[1],
        c0: tmpA, c1: tmpB, grav: o.grav ?? p.grav, drag: p.drag, floor: p.floor, stain: o.stain ?? p.stain,
        wobble: o.wobble ?? p.wobble,
      });
    }
  }

  // ring burst on the ground plane
  ring(preset, x, z, radius, count = 24, o = {}) {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      this.emit(preset, x + Math.cos(a) * radius, o.y ?? 0.2, z + Math.sin(a) * radius, 1, { ...o, dir: a, spread: 0.2 });
    }
  }

  // line of particles (beams, dash trails)
  line(preset, x0, z0, x1, z1, count = 12, o = {}) {
    for (let k = 0; k < count; k++) {
      const t = k / Math.max(1, count - 1);
      this.emit(preset, x0 + (x1 - x0) * t, o.y ?? 0.5, z0 + (z1 - z0) * t, 1, o);
    }
  }

  update(dt) {
    this.time += dt;
    this.add.update(dt, this.time, null, this.wind);
    this.norm.update(dt, this.time, this.onStain, this.wind);
  }
}
