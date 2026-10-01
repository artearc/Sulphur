// Room grid: collision, line of sight, spatial queries. Cells are 1 x TZ world units so floor
// texels map 1:1 to screen pixels under the 3/4 camera.
import { Z_SCALE, PITCH, Y_STRETCH } from '../render/materials.js';

export const TZ = Z_SCALE;
export const C = { VOID: 0, FLOOR: 1, WALL: 2, LIQUID: 3, PILLAR: 4, LOW: 5, BOX: 6, DOOR: 7 };

export class Room {
  constructor(layout) {
    this.layout = layout;
    this.w = layout.w; this.h = layout.h;
    this.cells = layout.cells;
    this.liquid = layout.liquid || { block: false };
  }
  get(i, j) { return i < 0 || j < 0 || i >= this.w || j >= this.h ? C.WALL : this.cells[j * this.w + i]; }
  set(i, j, v) { if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.cells[j * this.w + i] = v; }
  cellAt(x, z) { return [Math.floor(x), Math.floor(z / TZ)]; }
  typeAt(x, z) { const [i, j] = this.cellAt(x, z); return this.get(i, j); }
  center(i, j) { return { x: i + 0.5, z: (j + 0.5) * TZ }; }
  get bounds() {
    // screen-space vertical extent: top of the north wall (3 tile rows tall) down to the cliff below the parapet
    const SIN = Math.sin(PITCH), COS = Math.cos(PITCH);
    const band = this.layout.northBand ?? 3;
    const wallTop = (this.layout.wallH ?? Y_STRETCH * 3) * COS - band * TZ * SIN;
    return { minX: 0, maxX: this.w, minZ: 0, maxZ: this.h * TZ, sTop: wallTop + 1.2, sBottom: -this.h * TZ * SIN - 1.6 };
  }

  // movement blocking per locomotion mode
  blocks(t, mode = 'walk') {
    if (t === C.WALL || t === C.PILLAR || t === C.BOX) return true;
    if (t === C.LOW) return mode !== 'fly';
    if (t === C.VOID) return mode !== 'fly';
    if (t === C.LIQUID) return this.liquid.block && mode !== 'fly';
    if (t === C.DOOR) return mode === 'locked';
    return false;
  }
  blocksShot(t) { return t === C.WALL || t === C.PILLAR || t === C.BOX; }

  // Resolve a circle moving by (dx,dz). Returns {x,z,hitX,hitZ}.
  move(x, z, dx, dz, r, mode = 'walk') {
    let hitX = false, hitZ = false;
    // big bodies collide with architecture using a capped radius so they can't tunnel through 1-cell walls
    r = Math.min(r, 0.85);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / (r * 0.8)));
    const sx = dx / steps, sz = dz / steps;
    for (let s = 0; s < steps; s++) {
      x += sx;
      const rx = this._push(x, z, r, mode, 'x', sx);
      if (rx !== x) { hitX = true; x = rx; }
      z += sz;
      const rz = this._push(x, z, r, mode, 'z', sz);
      if (rz !== z) { hitZ = true; z = rz; }
    }
    // never leave the room
    const minX = 1 + r, maxX = this.w - 1 - r, minZ = TZ * (this.layout.northBand ?? 3) + r, maxZ = (this.h - 1) * TZ - r;
    if (x < minX) { x = minX; hitX = true; } else if (x > maxX) { x = maxX; hitX = true; }
    if (z < minZ) { z = minZ; hitZ = true; } else if (z > maxZ) { z = maxZ; hitZ = true; }
    return { x, z, hitX, hitZ };
  }

  _push(x, z, r, mode, axis, dir = 0) {
    const i0 = Math.floor(x - r), i1 = Math.floor(x + r);
    const j0 = Math.floor((z - r) / TZ), j1 = Math.floor((z + r) / TZ);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (!this.blocks(this.get(i, j), mode)) continue;
      const minX = i, maxX = i + 1, minZ = j * TZ, maxZ = (j + 1) * TZ;
      const cx = Math.max(minX, Math.min(x, maxX)), cz = Math.max(minZ, Math.min(z, maxZ));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (axis === 'x') {
        if (dir > 0 || (dir === 0 && x < (minX + maxX) / 2)) x = Math.min(x, minX - r * Math.sqrt(Math.max(0, 1 - (dz * dz) / (r * r))) - 1e-4);
        else x = Math.max(x, maxX + r * Math.sqrt(Math.max(0, 1 - (dz * dz) / (r * r))) + 1e-4);
      } else {
        if (dir > 0 || (dir === 0 && z < (minZ + maxZ) / 2)) z = Math.min(z, minZ - r * Math.sqrt(Math.max(0, 1 - (dx * dx) / (r * r))) - 1e-4);
        else z = Math.max(z, maxZ + r * Math.sqrt(Math.max(0, 1 - (dx * dx) / (r * r))) + 1e-4);
      }
    }
    return axis === 'x' ? x : z;
  }

  // Is circle position free?
  free(x, z, r, mode = 'walk') {
    const i0 = Math.floor(x - r), i1 = Math.floor(x + r);
    const j0 = Math.floor((z - r) / TZ), j1 = Math.floor((z + r) / TZ);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (this.blocks(this.get(i, j), mode)) return false;
    return true;
  }

  // Grid DDA line of sight for shots
  los(x0, z0, x1, z1, forShots = true) {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.ceil(dist * 3);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const t2 = this.typeAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
      if (forShots ? this.blocksShot(t2) : this.blocks(t2)) return false;
    }
    return true;
  }

  // Raycast returning distance to first shot-blocking cell (for beams)
  raycast(x0, z0, ang, maxD) {
    const dx = Math.cos(ang), dz = Math.sin(ang);
    for (let d = 0; d < maxD; d += 0.2) {
      if (this.blocksShot(this.typeAt(x0 + dx * d, z0 + dz * d))) return d;
    }
    return maxD;
  }

  randomFloor(rng, filter) {
    for (let k = 0; k < 400; k++) {
      const i = rng.int(1, this.w - 2), j = rng.int(1, this.h - 2);
      if (this.get(i, j) !== C.FLOOR) continue;
      const p = this.center(i, j);
      if (!filter || filter(p.x, p.z, i, j)) return p;
    }
    return null;
  }

  // BFS distance field from a world point (for simple pathing of ground enemies)
  flowField(tx, tz, mode = 'walk') {
    const [ti, tj] = this.cellAt(tx, tz);
    const dist = new Int16Array(this.w * this.h).fill(-1);
    const q = [];
    if (ti < 0 || tj < 0 || ti >= this.w || tj >= this.h) return dist;
    dist[tj * this.w + ti] = 0;
    q.push(ti, tj);
    let head = 0;
    while (head < q.length) {
      const i = q[head++], j = q[head++];
      const d = dist[j * this.w + i];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= this.w || nj >= this.h) continue;
        const k = nj * this.w + ni;
        if (dist[k] !== -1) continue;
        if (this.blocks(this.cells[k], mode)) continue;
        dist[k] = d + 1;
        q.push(ni, nj);
      }
    }
    return dist;
  }
}
