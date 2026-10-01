// Base entity: position on the XZ plane, physics (knockback, friction), statuses, sprite + shadow.
import * as THREE from 'three';
import { createDecalMaterial } from '../render/materials.js';
import { decalAtlas, DECAL } from '../art/fx.js';
import { clamp } from '../core/math.js';

let shadowMat = null;
const shadowGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; })();
function getShadowMat() {
  if (shadowMat) return shadowMat;
  const A = decalAtlas();
  shadowMat = createDecalMaterial(A.texture, { color: 0x000000, alpha: 0.55, unlit: true });
  const fw = A.cell / A.width, fh = A.cell / A.height;
  const c = DECAL.shadow;
  shadowMat.uniforms.uFrame.value.set(c[0] * fw, 1 - (c[1] + 1) * fh, fw, fh);
  shadowMat.renderOrder = 1;
  return shadowMat;
}

let NEXT_ID = 1;

export class Entity {
  constructor(world, o = {}) {
    this.id = NEXT_ID++;
    this.world = world;
    this.x = o.x ?? 0; this.z = o.z ?? 0; this.y = o.y ?? 0;
    this.vx = 0; this.vz = 0;
    this.kx = 0; this.kz = 0;           // knockback velocity
    this.radius = o.radius ?? 0.4;
    this.team = o.team ?? 'enemy';
    this.maxHp = o.hp ?? 10; this.hp = this.maxHp;
    this.mode = o.mode ?? 'walk';       // walk | fly
    this.mass = o.mass ?? 1;
    this.alive = true; this.dead = false; this.removed = false;
    this.hitstun = 0; this.invuln = 0;
    this.status = { burn: 0, poison: 0, slow: 0, freeze: 0, frozen: 0, stun: 0, curse: 0, charm: 0, mark: 0 };
    this.statusTick = 0;
    this.angle = 0;                     // facing (xz)
    this.sprite = null;
    this.shadow = null;
    this.shadowSize = o.shadow ?? this.radius * 1.5;
    this.solid = o.solid ?? true;       // participates in entity separation
    this.armor = o.armor ?? 0;          // flat damage reduction fraction
    this.poise = o.poise ?? 0;          // resistance to hitstun
    this.tags = new Set(o.tags || []);
    this.age = 0;
  }

  attachSprite(sprite) {
    this.sprite = sprite;
    this.world.root.add(sprite.mesh);
    if (this.shadowSize > 0) {
      this.shadow = new THREE.Mesh(shadowGeo, getShadowMat());
      this.shadow.renderOrder = 1;
      this.shadow.frustumCulled = false;
      this.shadow.scale.set(this.shadowSize * 1.6, 1, this.shadowSize * 1.1);
      this.world.root.add(this.shadow);
    }
  }

  get speedMul() {
    let m = 1;
    if (this.status.slow > 0) m *= 0.55;
    if (this.status.freeze > 0) m *= 1 - clamp(this.status.freeze, 0, 1) * 0.6;
    if (this.status.frozen > 0 || this.status.stun > 0) m = 0;
    return m;
  }

  applyStatus(kind, amount, dur) {
    const s = this.status;
    if (kind === 'freeze') {
      s.freeze = Math.min(1.2, s.freeze + amount);
      if (s.freeze >= 1 && s.frozen <= 0) { s.frozen = dur ?? 1.4; s.freeze = 0; this.onFrozen?.(); }
    } else {
      s[kind] = Math.max(s[kind], dur ?? amount);
    }
  }

  updateStatus(dt) {
    const s = this.status;
    for (const k in s) if (k !== 'freeze' && s[k] > 0) s[k] = Math.max(0, s[k] - dt);
    if (s.freeze > 0) s.freeze = Math.max(0, s.freeze - dt * 0.25);
    this.statusTick -= dt;
    if (this.statusTick <= 0) {
      this.statusTick = 0.5;
      const fx = this.world.fx;
      if (s.burn > 0) { this.world.dot(this, 3 + (this.maxHp > 200 ? 4 : 0), 'fire'); fx.emit('fire', this.x, 0.8, this.z, 4, { radius: this.radius }); }
      if (s.poison > 0) { this.world.dot(this, 2.5 + (this.maxHp > 200 ? 3 : 0), 'poison'); fx.emit('poison', this.x, 0.7, this.z, 3, { radius: this.radius }); }
    }
  }

  // integrate velocity + knockback against the room
  integrate(dt) {
    const room = this.world.room;
    const k = Math.exp(-9 * dt);
    this.kx *= k; this.kz *= k;
    if (Math.abs(this.kx) < 0.01) this.kx = 0;
    if (Math.abs(this.kz) < 0.01) this.kz = 0;
    const dx = (this.vx * this.speedMul + this.kx) * dt;
    const dz = (this.vz * this.speedMul + this.kz) * dt;
    if (!room) { this.x += dx; this.z += dz; return; }
    const r = room.move(this.x, this.z, dx, dz, this.radius, this.mode);
    if (r.hitX) { this.onWall?.('x', this.kx); this.kx *= -0.3; }
    if (r.hitZ) { this.onWall?.('z', this.kz); this.kz *= -0.3; }
    this.x = r.x; this.z = r.z;
    this.world.pushOutObstacles(this);
  }

  knock(angle, force) {
    const f = force / Math.max(0.3, this.mass);
    this.kx += Math.cos(angle) * f;
    this.kz += Math.sin(angle) * f;
  }

  syncSprite(yOffset = 0) {
    if (this.sprite) this.sprite.place(this.x, this.y + yOffset, this.z);
    if (this.shadow) {
      this.shadow.position.set(this.x, 0.015, this.z);
      const s = 1 / (1 + this.y * 0.4);
      this.shadow.scale.set(this.shadowSize * 1.6 * s, 1, this.shadowSize * 1.1 * s);
    }
  }

  destroy() {
    this.removed = true;
    this.sprite?.dispose();
    this.shadow?.removeFromParent();
    this.light && this.world.lights.remove(this.light);
  }
}
