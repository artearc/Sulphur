// Light registry -> fixed GPU pool. Static lights (braziers), dynamic lights (player, projectiles)
// and transient flashes (impacts, explosions, lightning) compete by priority and distance.
import * as THREE from 'three';
import { SharedUniforms, MAX_LIGHTS } from './lighting.js';

const tmp = new THREE.Color();

export class LightSystem {
  constructor() {
    this.lights = new Set();
    this.flashes = [];
    this.time = 0;
  }
  clear() { this.lights.clear(); this.flashes.length = 0; }

  // Persistent light. Returns handle (mutable object).
  add(o) {
    const l = {
      x: o.x ?? 0, y: o.y ?? 1.2, z: o.z ?? 0,
      color: new THREE.Color(o.color ?? 0xffa040), intensity: o.intensity ?? 1, radius: o.radius ?? 6,
      flicker: o.flicker ?? 0, priority: o.priority ?? 0, enabled: true, seed: Math.random() * 100,
      follow: o.follow || null, oy: o.y ?? 1.2, oz: o.oz ?? 0,
    };
    this.lights.add(l);
    return l;
  }
  remove(l) { this.lights.delete(l); }

  // Transient flash that decays
  flash(x, z, color, intensity = 2, radius = 6, duration = 0.18, y = 1) {
    this.flashes.push({ x, y, z, color: new THREE.Color(color), intensity, radius, life: duration, max: duration });
  }

  update(dt, cx, cz) {
    this.time += dt;
    const cand = [];
    for (const l of this.lights) {
      if (!l.enabled || l.intensity <= 0) continue;
      if (l.follow) { l.x = l.follow.x; l.z = l.follow.z + l.oz; l.y = l.oy + (l.follow.y || 0); }
      let inten = l.intensity;
      if (l.flicker) {
        const t = this.time * 9 + l.seed;
        inten *= 1 - l.flicker * (0.5 + 0.5 * Math.sin(t) * Math.sin(t * 2.3 + 1.1)) * 0.6;
      }
      const d = Math.hypot(l.x - cx, l.z - cz);
      cand.push({ l, inten, score: l.priority * 100 - d + l.radius * 0.5 });
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) { this.flashes.splice(i, 1); continue; }
      const k = f.life / f.max;
      cand.push({ l: f, inten: f.intensity * k * k, score: 50 - Math.hypot(f.x - cx, f.z - cz) });
    }
    cand.sort((a, b) => b.score - a.score);
    const P = SharedUniforms.uLightPos.value, C = SharedUniforms.uLightCol.value;
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const c = cand[i];
      if (!c) { C[i].w = 0; continue; }
      P[i].set(c.l.x, c.l.y, c.l.z, c.l.radius);
      C[i].set(c.l.color.r, c.l.color.g, c.l.color.b, c.inten);
    }
  }
}
