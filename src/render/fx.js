// FX facade: one entry point for particles, decals, telegraphs, one-shot sprite effects,
// damage numbers, light flashes, screen flashes and camera reactions.
import * as THREE from 'three';
import { Particles } from './particles.js';
import { Telegraphs } from './telegraph.js';
import { Sprite } from './sprite.js';
import { createDecalMaterial, PPU, Y_STRETCH, PITCH } from './materials.js';
import { decalAtlas, DECAL, numberTexture } from '../art/fx.js';
import { Save } from '../core/save.js';

const MAX_DECALS = 260;
const SIN = Math.sin(PITCH);

export class FX {
  constructor(scene, rig, pipeline, lights) {
    this.scene = scene;
    this.rig = rig;
    this.pipe = pipeline;
    this.lights = lights;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.particles = new Particles(this.root);
    this.telegraphs = new Telegraphs(this.root);
    this.oneShots = [];
    this.numbers = [];
    this.decals = [];
    this.fading = [];
    this.atlas = decalAtlas();
    this.decalGeo = new THREE.PlaneGeometry(1, 1);
    this.decalGeo.rotateX(-Math.PI / 2);
    this.flashT = 0; this.flashDur = 0.1;
    this.aberr = 0;
    this.particles.onStain = (x, z, r, g, b) => {
      if (Math.random() < 0.35) this.decal('blood' + Math.floor(Math.random() * 4), x, z, 0.25 + Math.random() * 0.25, { color: new THREE.Color(r * 1.4, g * 1.4, b * 1.4) });
    };
  }

  clear() {
    this.particles.clear();
    this.telegraphs.clear();
    for (const o of this.oneShots) o.sprite.dispose();
    this.oneShots.length = 0;
    for (const n of this.numbers) { n.mesh.removeFromParent(); n.mesh.material.dispose(); }
    this.numbers.length = 0;
    for (const d of this.decals) { d.removeFromParent(); d.material.dispose(); }
    this.decals.length = 0;
    for (const f of this.fading) { f.m.removeFromParent(); f.m.material.dispose(); }
    this.fading.length = 0;
  }

  // ---------------- particles ----------------
  emit(...a) { this.particles.emit(...a); }
  ring(...a) { this.particles.ring(...a); }
  line(...a) { this.particles.line(...a); }

  // ---------------- decals ----------------
  decal(name, x, z, size = 1, o = {}) {
    const cell = DECAL[name];
    if (!cell) return null;
    const A = this.atlas;
    const mat = createDecalMaterial(A.texture, { color: o.color ?? 0xffffff, alpha: o.alpha ?? 1, unlit: o.unlit, glow: o.glow, additive: o.additive });
    const fw = A.cell / A.width, fh = A.cell / A.height;
    mat.uniforms.uFrame.value.set(cell[0] * fw, 1 - (cell[1] + 1) * fh, fw, fh);
    if (o.color && o.color.isColor) mat.uniforms.uColor.value.copy(o.color);
    const m = new THREE.Mesh(this.decalGeo, mat);
    m.scale.set(size * 2, 1, size * 2);
    m.rotation.y = o.angle ?? Math.random() * Math.PI * 2;
    m.position.set(x, (o.y ?? 0) + 0.012 + this.decals.length * 0.00003, z);
    m.renderOrder = o.renderOrder ?? 1;
    m.frustumCulled = false;
    this.root.add(m);
    if (o.fade) {
      this.fading.push({ m, t: 0, life: o.fade, a0: o.alpha ?? 1, grow: o.grow || 0, s0: size });
      return m;
    }
    if (!o.temp) {
      this.decals.push(m);
      if (this.decals.length > MAX_DECALS) {
        const old = this.decals.shift();
        old.removeFromParent(); old.material.dispose();
      }
    }
    return m;
  }

  // ---------------- one-shot sprites (slashes, impacts, explosions, pillars) ----------------
  /**
   * o: { anim, x, y, z, angle (screen rotation from world xz angle), scale, additive, follow, unlit,
   *      onTop (ignore depth), flip, speed, tint }
   */
  play(sheet, o) {
    const s = new Sprite(sheet, { pivot: o.pivot ?? sheet.fh / 2, unlit: o.unlit ?? true, additive: o.additive, renderOrder: o.onTop ? 30 : 15 });
    const anim = o.anim && sheet.anims[o.anim] ? o.anim : sheet.anims.play ? 'play' : Object.keys(sheet.anims)[0];
    s.play(anim, { speed: o.speed ?? 1 });
    if (o.scale) s.setScale(o.scale);
    if (o.flip) s.setFlip(true);
    if (o.onTop) { s.material.depthTest = false; }
    if (o.angle !== undefined) {
      // world angle (xz) -> screen angle: screen y is up = -z * sin(pitch)
      const sa = Math.atan2(-Math.sin(o.angle) * SIN, Math.cos(o.angle));
      s.mesh.rotation.order = 'XYZ';
      s.mesh.rotation.x = -PITCH;   // face the camera so the rotation is a true screen rotation
      s.mesh.rotation.z = sa;
      // compensate the vertical stretch so rotated arcs keep their shape
      s.mesh.scale.set(s.scale, s.scale / Y_STRETCH, 1);
    }
    if (o.tint) s.setTint(o.tint, 1);
    s.place(o.x, o.y ?? 0.6, o.z);
    this.root.add(s.mesh);
    const entry = { sprite: s, follow: o.follow, oy: o.y ?? 0.6, dx: o.dx || 0, dz: o.dz || 0, life: o.life ?? 6, fade: o.fade };
    this.oneShots.push(entry);
    return entry;
  }

  // ---------------- damage numbers ----------------
  number(value, x, z, o = {}) {
    if (!Save.settings.damageNumbers) return;
    const text = (o.prefix || '') + String(Math.max(0, Math.round(value))) + (o.suffix || '');
    const { texture, w, h } = numberTexture(text, o.color ?? 0xffffff, o.color2);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.5, depthTest: false });
    const sc = o.big ? 2 : 1;
    const geo = new THREE.PlaneGeometry((w / PPU) * sc, (h / PPU) * sc * Y_STRETCH);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 40;
    mesh.frustumCulled = false;
    const jitter = (Math.random() - 0.5) * 0.6;
    mesh.position.set(x + jitter, o.y ?? 1.6, z);
    this.root.add(mesh);
    this.numbers.push({ mesh, t: 0, vx: jitter * 0.8, vy: o.big ? 2.6 : 2.2, life: o.big ? 0.95 : 0.7 });
  }

  // ---------------- screen-level reactions ----------------
  screenFlash(color = 0xffffff, alpha = 0.6, dur = 0.12) {
    const c = new THREE.Color(color);
    this.pipe.post.uFlash.value.set(c.r, c.g, c.b, alpha);
    this.flashT = dur; this.flashDur = dur; this.flashA = alpha;
  }
  aberration(a = 0.6) { this.aberr = Math.max(this.aberr, a); }
  shake(t) { this.rig.addTrauma(t); }
  kick(angle, s = 0.15) { this.rig.addKick(Math.cos(angle) * s, Math.sin(angle) * s); }
  lightFlash(x, z, color, intensity = 2.5, radius = 6, dur = 0.18) { this.lights.flash(x, z, color, intensity, radius, dur); }

  telegraph(o) { return this.telegraphs.add(o); }

  update(dt) {
    this.particles.update(dt);
    this.telegraphs.update(dt);
    for (let i = this.oneShots.length - 1; i >= 0; i--) {
      const e = this.oneShots[i];
      const s = e.sprite;
      s.update(dt);
      e.life -= dt;
      if (e.follow) s.place(e.follow.x + e.dx, e.oy, e.follow.z + e.dz);
      if (s.finished || e.life <= 0) { s.dispose(); this.oneShots.splice(i, 1); }
    }
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.t += dt;
      n.vy -= dt * 6;
      n.mesh.position.x += n.vx * dt;
      n.mesh.position.y += Math.max(0, n.vy) * dt;
      const k = n.t / n.life;
      n.mesh.visible = !(k > 0.7 && Math.floor(n.t * 30) % 2);
      if (n.t > n.life) { n.mesh.removeFromParent(); n.mesh.geometry.dispose(); n.mesh.material.dispose(); this.numbers.splice(i, 1); }
    }
    for (let i = this.fading.length - 1; i >= 0; i--) {
      const f = this.fading[i];
      f.t += dt;
      const k = f.t / f.life;
      f.m.material.uniforms.uAlpha.value = f.a0 * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      if (f.grow) { const s = f.s0 * (1 + f.grow * k) * 2; f.m.scale.set(s, 1, s); }
      f.m.rotation.y += dt * 0.6;
      if (k >= 1) { f.m.removeFromParent(); f.m.material.dispose(); this.fading.splice(i, 1); }
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.pipe.post.uFlash.value.w = Math.max(0, this.flashT / this.flashDur) * this.flashA;
    }
    this.aberr = Math.max(0, this.aberr - dt * 3);
    this.pipe.post.uAberration.value = this.aberr;
  }
}
