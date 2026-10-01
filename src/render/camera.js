// Fixed 3/4 orthographic camera (no rotation, GDD 5.1.1), pixel-snapped with sub-pixel
// remainder handed to the composite pass, trauma-based shake, kicks and narrative zoom.
import * as THREE from 'three';
import { PPU, PITCH } from './materials.js';
import { damp, clamp, lerp } from '../core/math.js';
import { Save } from '../core/save.js';

const SIN = Math.sin(PITCH), COS = Math.cos(PITCH);

export class CameraRig {
  constructor(pipeline) {
    this.pipeline = pipeline;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = -PITCH;
    this.distance = 60;
    this.target = new THREE.Vector3();   // smoothed focus
    this.goal = new THREE.Vector3();     // desired focus
    this.lead = new THREE.Vector2();     // aim lead
    this.bounds = null;                  // {minX,maxX,minZ,maxZ}
    this.trauma = 0;
    this.kick = new THREE.Vector2();
    this.zoom = 1; this.zoomGoal = 1; this.zoomSpeed = 4;
    this.zoomFocus = null;               // world point to zoom on
    this.followSpeed = 9;
    this.time = 0;
    pipeline.onResize = () => this.updateProjection();
    this.updateProjection();
  }

  updateProjection() {
    const p = this.pipeline;
    const w = (p.lowW + 2 * p.margin) / PPU;
    const h = (p.lowH + 2 * p.margin) / PPU;
    this.viewW = p.lowW / PPU; this.viewH = p.lowH / PPU;
    this.camera.left = -w / 2; this.camera.right = w / 2;
    this.camera.top = h / 2; this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
  }

  setBounds(b) { this.bounds = b; }

  snapTo(x, z) {
    this.goal.set(x, 0, z);
    this.target.copy(this.goal);
  }

  addTrauma(t) { this.trauma = clamp(this.trauma + t * Save.settings.screenShake, 0, 1); }
  addKick(dx, dz, strength = 1) {
    const s = strength * Save.settings.screenShake;
    this.kick.x += dx * s; this.kick.y += dz * s;
  }
  // Narrative zoom: the camera glides to the focus point and the image is magnified in the composite.
  setZoom(z, focus = null, speed = 4) { this.zoomGoal = z; this.focusOverride = focus; this.zoomSpeed = speed; }

  update(dt, followX, followZ, aimX = 0, aimZ = 0) {
    this.time += dt;
    if (this.bossFocus && this.bossFocus.alive && !this.focusOverride) {
      // frame Dante together with a colossal boss
      const bf = this.bossFocus;
      followX = followX * 0.7 + bf.x * 0.3;
      followZ = followZ * 0.62 + (bf.z - (bf.def?.camLift ?? 4)) * 0.38;
      aimX *= 0.4; aimZ *= 0.4;
    }
    if (this.focusOverride) {
      const f = this.focusOverride;
      // frame both the speaker and Dante, weighted toward the speaker
      followX = f.x * 0.75 + followX * 0.25; followZ = f.z * 0.75 + followZ * 0.25 + 0.6;
      aimX = 0; aimZ = 0;
    }
    this.goal.set(followX + aimX, 0, followZ + aimZ);
    // clamp to room bounds so the view never shows beyond the arena
    if (this.bounds) {
      const hw = this.viewW / 2, hv = this.viewH / 2;
      const b = this.bounds;
      const cx = (b.minX + b.maxX) / 2;
      this.goal.x = b.maxX - b.minX < hw * 2 ? cx : clamp(this.goal.x, b.minX + hw, b.maxX - hw);
      // vertical clamp in screen space: s = y*cos - z*sin (top of the north wall .. bottom cliff)
      const sTop = (b.sTop ?? (-b.minZ * SIN + 1)) + (this.extraTop || 0), sBot = b.sBottom ?? (-b.maxZ * SIN - 1);
      let sc = -this.goal.z * SIN;
      if (sTop - sBot < hv * 2) sc = (sTop + sBot) / 2;
      else sc = clamp(sc, sBot + hv, sTop - hv);
      this.goal.z = -sc / SIN;
    }
    this.target.x = damp(this.target.x, this.goal.x, this.followSpeed, dt);
    this.target.z = damp(this.target.z, this.goal.z, this.followSpeed, dt);

    this.kick.x = damp(this.kick.x, 0, 14, dt);
    this.kick.y = damp(this.kick.y, 0, 14, dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    // place camera
    const fx = this.target.x + this.kick.x;
    const fz = this.target.z + this.kick.y;
    // pixel snap in view space
    const unit = 1 / PPU;
    const sx = Math.round(fx / unit) * unit;
    const sv = Math.round((fz * SIN) / unit) * unit; // vertical screen coordinate of ground point
    const sz = sv / SIN;
    const subX = (fx - sx) * PPU;
    const subY = -((fz - sz) * SIN) * PPU;
    this.camera.position.set(sx, this.distance * SIN, sz + this.distance * COS);
    this.camera.updateMatrixWorld();

    // shake in screen pixels (smooth, sub-pixel)
    const shakeAmt = this.trauma * this.trauma;
    const p = this.pipeline;
    const t = this.time * 38;
    const shx = (Math.sin(t * 1.3) + Math.sin(t * 2.7 + 1.7) * 0.5) * shakeAmt * 4.0 * p.scale;
    const shy = (Math.cos(t * 1.1 + 0.4) + Math.sin(t * 3.1) * 0.5) * shakeAmt * 4.0 * p.scale;
    p.post.uSub.value.set(subX, subY);
    p.post.uShake.value.set(shx, shy);

    // zoom (applied in composite so sprites stay texel-perfect)
    this.zoom = damp(this.zoom, this.zoomGoal, this.zoomSpeed, dt);
    p.post.uZoom.value = this.zoom;
    let zc = new THREE.Vector2(0.5, 0.5);
    if (this.bossFocus && this.bossFocus.alive && !this.focusOverride) {
      // frame Dante together with a colossal boss
      const bf = this.bossFocus;
      followX = followX * 0.7 + bf.x * 0.3;
      followZ = followZ * 0.62 + (bf.z - (bf.def?.camLift ?? 4)) * 0.38;
      aimX *= 0.4; aimZ *= 0.4;
    }
    if (this.focusOverride) {
      const ndc = this.worldToNdc(this.focusOverride.x, 1.2, this.focusOverride.z);
      zc.set(clamp(ndc.x * 0.5 + 0.5, 0.3, 0.7), clamp(ndc.y * 0.5 + 0.5, 0.35, 0.65));
    }
    const cur = p.post.uZoomCenter.value;
    cur.set(lerp(cur.x, zc.x, Math.min(1, dt * 6)), lerp(cur.y, zc.y, Math.min(1, dt * 6)));
  }

  worldToNdc(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return v;
  }

  // world point -> CSS pixel position on screen (for DOM overlays)
  worldToScreen(x, y, z) {
    const v = this.worldToNdc(x, y, z);
    const p = this.pipeline;
    const tw = p.lowW + 2 * p.margin, th = p.lowH + 2 * p.margin;
    let lx = (v.x * 0.5 + 0.5) * tw - p.margin - p.post.uSub.value.x;
    let ly = (v.y * 0.5 + 0.5) * th - p.margin - p.post.uSub.value.y;
    const zm = p.post.uZoom.value, c = p.post.uZoomCenter.value;
    lx = (lx - c.x * p.lowW) * zm + c.x * p.lowW;
    ly = (ly - c.y * p.lowH) * zm + c.y * p.lowH;
    const iw = window.innerWidth || p.W, ih = window.innerHeight || p.H;
    const dpr = p.W / iw;
    return { x: (lx * p.scale) / dpr, y: ih - (ly * p.scale) / dpr };
  }

  // Mouse ray onto ground plane y=0
  screenToGround(cssX, cssY, groundY = 0) {
    const ndc = this.pipeline.screenToLowNdc(cssX, cssY);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
    const t = (groundY - ray.ray.origin.y) / ray.ray.direction.y;
    return { x: ray.ray.origin.x + ray.ray.direction.x * t, z: ray.ray.origin.z + ray.ray.direction.z * t };
  }
}
