// Procedural room layouts. Arenas are never empty boxes: shapes, obstacles, hazards and
// set dressing are chosen per circle so each one reads as its own biome.
import { C, TZ } from './room.js';

const SIZES = {
  combat: [[22, 28], [14, 17]],
  elite: [[24, 30], [15, 18]],
  miniboss: [[26, 30], [16, 18]],
  boss: [[32, 34], [20, 21]],
  soul: [[18, 20], [12, 13]],
  altarV: [[16, 18], [11, 12]],
  altarS: [[16, 18], [11, 12]],
  shop: [[20, 22], [12, 13]],
  treasure: [[16, 18], [11, 12]],
  secret: [[14, 16], [10, 11]],
  rest: [[18, 20], [12, 13]],
  start: [[20, 22], [13, 14]],
  interlude: [[30, 30], [16, 16]],
};

export const NORTH_BAND = 3;

export function generateRoom(opts) {
  const { type, circle, rng } = opts;
  const exits = opts.exits || [];
  const [wr, hr] = SIZES[type] || SIZES.combat;
  let w = rng.int(wr[0], wr[1]);
  let h = rng.int(hr[0], hr[1]);
  if (w % 2) w++; // even width keeps central features symmetric
  const cells = new Uint8Array(w * h).fill(C.FLOOR);
  const L = { w, h, cells, type, circle: circle.id, doors: [], props: [], lights: [], spawns: [], features: [], pads: [], liquid: circle.liquid, floorVar: null, shape: 'plain' };
  const set = (i, j, v) => { if (i >= 0 && j >= 0 && i < w && j < h) cells[j * w + i] = v; };
  const get = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? C.WALL : cells[j * w + i]);

  // ---- boundary ----
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < NORTH_BAND; j++) set(i, j, C.WALL);
    set(i, h - 1, C.LOW);
  }
  for (let j = 0; j < h; j++) { set(0, j, C.WALL); set(w - 1, j, C.WALL); }
  const ecx = Math.floor(w / 2);
  // entrance gap in the south parapet
  set(ecx - 1, h - 1, C.FLOOR); set(ecx, h - 1, C.FLOOR);
  L.entrance = { x: ecx, z: (h - 2.2) * TZ };

  const voidKind = circle.liquid.block ? C.VOID : C.LIQUID;
  const inner = { i0: 1, i1: w - 2, j0: NORTH_BAND, j1: h - 2 };
  const iw = inner.i1 - inner.i0 + 1, ih = inner.j1 - inner.j0 + 1;

  // ---- shape ----
  const combatLike = ['combat', 'elite', 'miniboss', 'boss'].includes(type);
  let shapes = combatLike ? ['octagon', 'cross', 'pillars', 'pit', 'river', 'plain', 'twin', 'islands'] : ['octagon', 'plain', 'pillars'];
  if (type === 'boss') shapes = ['octagon', 'arena'];
  if (type === 'interlude') shapes = ['plain'];
  const shape = opts.shape || rng.pick(shapes);
  L.shape = shape;

  if (shape === 'octagon' || shape === 'arena') {
    const cut = shape === 'arena' ? Math.floor(Math.min(iw, ih) / 3) : rng.int(2, 4);
    const fill = circle.liquid.block ? C.VOID : C.WALL;
    for (let k = 0; k < cut; k++) for (let m = 0; m < cut - k; m++) {
      set(inner.i0 + m, inner.j0 + k, fill); set(inner.i1 - m, inner.j0 + k, fill);
      set(inner.i0 + m, inner.j1 - k, fill); set(inner.i1 - m, inner.j1 - k, fill);
    }
  } else if (shape === 'cross') {
    const cw = Math.floor(iw / 4), ch = Math.floor(ih / 3.2);
    const fill = rng.chance(0.5) ? voidKind : C.WALL;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      set(inner.i0 + i, inner.j0 + j, fill); set(inner.i1 - i, inner.j0 + j, fill);
      set(inner.i0 + i, inner.j1 - j, fill); set(inner.i1 - i, inner.j1 - j, fill);
    }
  } else if (shape === 'pillars') {
    const sx = rng.int(4, 5), sz = rng.int(3, 4);
    for (let j = inner.j0 + 2; j <= inner.j1 - 2; j += sz) for (let i = inner.i0 + 3; i <= inner.i1 - 3; i += sx) {
      if (Math.abs(i - ecx) <= 1 && j > inner.j1 - 4) continue;
      set(i, j, C.PILLAR);
    }
  } else if (shape === 'pit') {
    const cx = (inner.i0 + inner.i1) / 2, cz = (inner.j0 + inner.j1) / 2;
    const rx = iw * 0.18, rz = ih * 0.2;
    for (let j = inner.j0; j <= inner.j1; j++) for (let i = inner.i0; i <= inner.i1; i++) {
      const d = ((i + 0.5 - cx - 0.5) / rx) ** 2 + ((j + 0.5 - cz) / rz) ** 2;
      if (d < 1) set(i, j, voidKind);
    }
  } else if (shape === 'river') {
    const rj = Math.floor((inner.j0 + inner.j1) / 2) + rng.int(-1, 1);
    const thick = rng.int(2, 3);
    const bridges = [rng.int(inner.i0 + 3, ecx - 3), rng.int(ecx + 2, inner.i1 - 3)];
    for (let i = inner.i0; i <= inner.i1; i++) {
      const wob = Math.round(Math.sin(i * 0.5) * 0.8);
      for (let t = 0; t < thick; t++) {
        const isBridge = bridges.some((b) => i >= b && i < b + 2);
        if (!isBridge) set(i, rj + t + wob, voidKind);
      }
    }
    L.bridges = bridges;
  } else if (shape === 'twin') {
    const mid = Math.floor((inner.j0 + inner.j1) / 2);
    for (let i = inner.i0; i <= inner.i1; i++) {
      if (Math.abs(i - ecx) <= 2 || i < inner.i0 + 3 || i > inner.i1 - 3) continue;
      set(i, mid, rng.chance(0.85) ? C.LOW : C.FLOOR);
    }
  } else if (shape === 'islands') {
    for (let k = 0; k < 3; k++) {
      const cx = rng.int(inner.i0 + 4, inner.i1 - 4), cz = rng.int(inner.j0 + 3, inner.j1 - 3);
      const rx = rng.range(1.5, 3.2), rz = rng.range(1.2, 2.2);
      for (let j = cz - 3; j <= cz + 3; j++) for (let i = cx - 4; i <= cx + 4; i++) {
        if (((i - cx) / rx) ** 2 + ((j - cz) / rz) ** 2 < 1) set(i, j, voidKind);
      }
    }
  }

  // ---- circle dressing: hazards & obstacles ----
  if (combatLike && circle.id !== 'lujuria' && rng.chance(0.65)) {
    const pools = rng.int(1, 3);
    for (let k = 0; k < pools; k++) {
      const cx = rng.int(inner.i0 + 3, inner.i1 - 3), cz = rng.int(inner.j0 + 2, inner.j1 - 3);
      const rx = rng.range(1.2, 2.6), rz = rng.range(1, 1.8);
      for (let j = cz - 3; j <= cz + 3; j++) for (let i = cx - 4; i <= cx + 4; i++) {
        if (get(i, j) === C.FLOOR && ((i - cx) / rx) ** 2 + ((j - cz) / rz) ** 2 < 1) set(i, j, C.LIQUID);
      }
    }
  }
  if (circle.id === 'herejia' && combatLike) {
    const n = rng.int(3, 6);
    for (let k = 0; k < n; k++) {
      const i = rng.int(inner.i0 + 2, inner.i1 - 3), j = rng.int(inner.j0 + 1, inner.j1 - 3);
      if (get(i, j) === C.FLOOR && get(i + 1, j) === C.FLOOR && Math.abs(i - ecx) > 2) {
        set(i, j, C.BOX); set(i + 1, j, C.BOX);
        L.features.push({ kind: 'flameTomb', x: i + 1, z: (j + 0.5) * TZ });
      }
    }
  }
  if (circle.id === 'avaricia' && combatLike) {
    const n = rng.int(2, 4);
    for (let k = 0; k < n; k++) {
      const p = { i: rng.int(inner.i0 + 2, inner.i1 - 2), j: rng.int(inner.j0 + 2, inner.j1 - 2) };
      if (get(p.i, p.j) === C.FLOOR) L.pads.push({ kind: 'coinTrap', x: p.i + 0.5, z: (p.j + 0.5) * TZ });
    }
  }
  if (circle.id === 'traicion' && combatLike) {
    // most of the floor becomes the frozen lake
    for (let j = inner.j0; j <= inner.j1; j++) for (let i = inner.i0; i <= inner.i1; i++) {
      const d = Math.hypot((i - ecx) / (iw * 0.42), (j - (inner.j0 + inner.j1) / 2) / (ih * 0.42));
      if (get(i, j) === C.FLOOR && d < 1 && rng.chance(0.92)) set(i, j, C.LIQUID);
    }
  }
  if (circle.id === 'lujuria' && combatLike) {
    L.wind = { angle: rng.pick([0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, (Math.PI * 3) / 4]), strength: rng.range(2.2, 3.2), period: rng.range(4, 6) };
  }

  // ---- doors ----
  const doorSlots = [];
  const nExits = exits.length;
  const northCount = Math.min(nExits, 3);
  for (let k = 0; k < northCount; k++) {
    const t = (k + 1) / (northCount + 1);
    let di = Math.round(inner.i0 + 2 + (iw - 5) * t);
    doorSlots.push({ side: 'N', i: di, j: NORTH_BAND - 1 });
  }
  for (let k = northCount; k < nExits; k++) {
    const left = (k - northCount) % 2 === 0;
    doorSlots.push({ side: left ? 'W' : 'E', i: left ? 0 : w - 1, j: Math.floor((inner.j0 + inner.j1) / 2) - 1 });
  }
  doorSlots.forEach((s, k) => {
    const ex = exits[k];
    if (s.side === 'N') {
      for (let jj = 0; jj < NORTH_BAND; jj++) { set(s.i, jj, C.DOOR); set(s.i + 1, jj, C.DOOR); }
      // keep approach clear
      for (let jj = NORTH_BAND; jj < NORTH_BAND + 3; jj++) for (let ii = s.i - 1; ii <= s.i + 2; ii++) if (get(ii, jj) !== C.WALL || ii > 0 && ii < w - 1) set(ii, jj, C.FLOOR);
      L.doors.push({ ...ex, side: 'N', x: s.i + 1, z: NORTH_BAND * TZ - 0.1, cells: [[s.i, NORTH_BAND - 1], [s.i + 1, NORTH_BAND - 1]] });
    } else {
      set(s.i, s.j, C.DOOR); set(s.i, s.j + 1, C.DOOR);
      const dir = s.side === 'W' ? 1 : -1;
      for (let ii = 1; ii <= 3; ii++) for (let jj = s.j - 1; jj <= s.j + 2; jj++) if (jj >= NORTH_BAND && jj < h - 1) set(s.i + dir * ii, jj, C.FLOOR);
      L.doors.push({ ...ex, side: s.side, x: s.side === 'W' ? 0.6 : w - 0.6, z: (s.j + 1) * TZ, cells: [[s.i, s.j], [s.i, s.j + 1]] });
    }
  });

  // ---- connectivity: carve paths from entrance to each door and spawns ----
  const reach = flood(L, ecx, h - 2);
  for (const d of L.doors) {
    const [di, dj] = d.side === 'N' ? [d.cells[0][0], NORTH_BAND] : [d.side === 'W' ? 1 : w - 2, d.cells[0][1]];
    if (!reach[dj * w + di]) carve(L, ecx, h - 2, di, dj);
  }
  const reach2 = flood(L, ecx, h - 2);
  // unreachable floor -> rubble (decorative, blocking) so nothing spawns there
  for (let k = 0; k < cells.length; k++) if (cells[k] === C.FLOOR && !reach2[k]) cells[k] = C.PILLAR;

  // ---- floor variation map (clustered noise -> variants 0..11; special medallion in center) ----
  const fv = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = Math.sin(i * 0.37 + j * 0.21 + rng.seed * 0.001) * Math.cos(j * 0.43 - i * 0.17);
    fv[j * w + i] = (Math.floor((n * 0.5 + 0.5) * 3.99) * 3 + rng.int(0, 2)) % 12;
  }
  if (!['river', 'pit', 'pillars'].includes(shape) && circle.id !== 'traicion') {
    const mi = ecx - 1, mj = Math.floor((inner.j0 + inner.j1) / 2) - 1;
    if (get(mi, mj) === C.FLOOR && get(mi + 1, mj + 1) === C.FLOOR) {
      fv[mj * w + mi] = 12; fv[mj * w + mi + 1] = 13; fv[(mj + 1) * w + mi] = 14; fv[(mj + 1) * w + mi + 1] = 15;
      L.medallion = { x: mi + 1, z: (mj + 1) * TZ };
    }
  }
  L.floorVar = fv;

  // ---- spawn candidates ----
  for (let j = inner.j0 + 1; j < inner.j1 - 1; j++) for (let i = inner.i0 + 1; i < inner.i1; i++) {
    if (cells[j * w + i] !== C.FLOOR) continue;
    let ok = true;
    for (let dj = -1; dj <= 1 && ok; dj++) for (let di = -1; di <= 1; di++) if (get(i + di, j + dj) !== C.FLOOR && get(i + di, j + dj) !== C.LIQUID) { ok = false; break; }
    if (!ok) continue;
    const dz = (h - 2 - j) * TZ, dx = i - ecx;
    if (Math.hypot(dx, dz) < 6.5) continue;
    L.spawns.push({ x: i + 0.5, z: (j + 0.5) * TZ });
  }

  // ---- props & lights ----
  placeDressing(L, circle, rng, get);
  return L;
}

function flood(L, si, sj) {
  const { w, h, cells } = L;
  const seen = new Uint8Array(w * h);
  const ok = (t) => t === C.FLOOR || t === C.DOOR || t === C.LIQUID && !L.liquid.block;
  const q = [si, sj];
  seen[sj * w + si] = 1;
  let head = 0;
  while (head < q.length) {
    const i = q[head++], j = q[head++];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const k = nj * w + ni;
      if (seen[k] || !ok(cells[k])) continue;
      seen[k] = 1; q.push(ni, nj);
    }
  }
  return seen;
}

function carve(L, i0, j0, i1, j1) {
  let i = i0, j = j0;
  const { w, cells } = L;
  while (i !== i1 || j !== j1) {
    if (j !== j1 && (Math.abs(j - j1) >= Math.abs(i - i1))) j += Math.sign(j1 - j); else i += Math.sign(i1 - i);
    const k = j * w + i;
    if (cells[k] !== C.DOOR && i > 0 && i < w - 1 && j >= NORTH_BAND) { cells[k] = C.FLOOR; if (i + 1 < w - 1) cells[k + 1] = cells[k + 1] === C.DOOR ? C.DOOR : C.FLOOR; }
  }
}

function placeDressing(L, circle, rng, get) {
  const { w, h } = L;
  const P = circle.props;
  const occupied = new Set();
  const free = (i, j) => get(i, j) === C.FLOOR && !occupied.has(i + ',' + j);
  const doorNear = (i, j) => L.doors.some((d) => Math.abs(d.x - (i + 0.5)) < 3 && Math.abs(d.z - (j + 0.5) * TZ) < 3.5);

  // braziers flanking each north door and at the corners of the north wall (light structure)
  for (const d of L.doors) {
    if (d.side !== 'N') continue;
    for (const s of [-2, 2]) {
      const i = Math.floor(d.x + s - (s > 0 ? 0 : 1)), j = NORTH_BAND;
      if (L.doors.some((o) => o.side === 'N' && Math.abs(o.x - (i + 0.5)) < 1.8)) continue;
      if (free(i, j)) { L.props.push({ name: P.light, x: i + 0.5, z: (j + 0.4) * TZ, light: true }); occupied.add(i + ',' + j); }
    }
  }
  const corners = [[2, NORTH_BAND], [w - 3, NORTH_BAND], [2, h - 3], [w - 3, h - 3]];
  for (const [i, j] of corners) {
    if (free(i, j) && !doorNear(i, j) && rng.chance(0.75)) { L.props.push({ name: P.light, x: i + 0.5, z: (j + 0.5) * TZ, light: true }); occupied.add(i + ',' + j); }
  }
  // wall-hugging dressing
  const nWall = Math.floor((w + h) * (L.type === 'boss' ? 0.5 : 0.35));
  for (let k = 0; k < nWall; k++) {
    const side = rng.int(0, 2);
    let i, j;
    if (side === 0) { i = rng.int(2, w - 3); j = NORTH_BAND; }
    else if (side === 1) { i = rng.chance(0.5) ? 1 : w - 2; j = rng.int(NORTH_BAND + 1, h - 3); }
    else { i = rng.int(2, w - 3); j = h - 2; if (Math.abs(i - w / 2) < 3) continue; }
    if (!free(i, j) || doorNear(i, j)) continue;
    const name = rng.pick(P.common);
    L.props.push({ name, x: i + 0.5 + rng.range(-0.15, 0.15), z: (j + 0.5) * TZ + rng.range(-0.1, 0.1) });
    occupied.add(i + ',' + j);
  }
  // small floor debris scattered (non-blocking decals handled by builder)
  L.debris = [];
  for (let k = 0; k < Math.floor(w * h * 0.04); k++) {
    const i = rng.int(1, w - 2), j = rng.int(NORTH_BAND, h - 2);
    if (get(i, j) === C.FLOOR) L.debris.push({ x: i + rng.next(), z: (j + rng.next()) * TZ, kind: rng.pick(['bones', 'crack', 'stain']) });
  }
  L.occupied = occupied;
}
