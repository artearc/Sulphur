// Per-circle tileset atlases (16px cells, 16x8 grid) + matching emissive atlas.
// Layout:
//   row 0: floor variants 0..11, floor specials 12..15
//   row 1: wall faces 0..7 (plain, arch, window, niche, carved, cracked, banner, relief), 8..11 base trim, 12..15 cornice
//   row 2: wall tops 0..3, pillar faces 4..7, pillar caps 8..9, cliff (pit edge) faces 10..13, parapet 14..15
//   row 3: liquid 0..3 (animated by scroll), liquid edge 4..7, rubble 8..11, special 12..15
//   row 4: prop box textures (tomb side/top, altar side/top, chest, pedestal, crate, ice block)
import { PixelCanvas, mix, bayer } from './pixel.js';
import { makeTexture } from './sheet.js';
import { CIRCLE_PALETTES, R } from './palette.js';
import { hash2 } from '../core/rng.js';

export const T = 16;
export const ATLAS_COLS = 16, ATLAS_ROWS = 8;

const pick = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];

// ------------------------------------------------------------------------------------------
// Circle styles: floor/wall algorithms + overlay motifs
// ------------------------------------------------------------------------------------------
const STYLE = {
  hub: { floor: ['slab', 'slab', 'cobble', 'marble'], wall: 'ashlar', overlay: 'candlewax', liquid: 'water', liquidRamp: [0x060408, 0x0e0a12, 0x1a1420, 0x2a2232], liquidGlow: false },
  limbo: { floor: ['marble', 'slab', 'marble', 'ash'], wall: 'ashlar', overlay: 'mist', liquid: 'mist', liquidRamp: [0x2a2c34, 0x3a3c46, 0x4e505c, 0x6a6c78, 0x8a8c98], liquidGlow: false },
  lujuria: { floor: ['rock', 'slab', 'rock', 'scour'], wall: 'rockwall', overlay: 'petals', liquid: 'void', liquidRamp: [0x1a0a20, 0x2a1032, 0x3e1848, 0x5a2460], liquidGlow: true },
  gula: { floor: ['mud', 'cobble', 'mud', 'slime'], wall: 'fleshwall', overlay: 'slime', liquid: 'muck', liquidRamp: [0x1a2008, 0x2a3410, 0x3e4c16, 0x5a6a20, 0x7a8a2a], liquidGlow: false },
  avaricia: { floor: ['goldtile', 'slab', 'goldtile', 'coins'], wall: 'gilded', overlay: 'coins', liquid: 'gold', liquidRamp: [0x5a3a0a, 0x8a5c12, 0xb8841e, 0xe0b040, 0xffe080], liquidGlow: true },
  ira: { floor: ['rock', 'mud', 'rock', 'cobble'], wall: 'rockwall', overlay: 'soot', liquid: 'styx', liquidRamp: [0x040606, 0x081010, 0x0e1a18, 0x162420, 0x22342c], liquidGlow: false },
  herejia: { floor: ['slab', 'ash', 'slab', 'cobble'], wall: 'ashlar', overlay: 'embers', liquid: 'lava', liquidRamp: [0x5a0800, 0x9a2000, 0xd04808, 0xf08018, 0xffc040, 0xfff0a0], liquidGlow: true },
  violencia: { floor: ['sand', 'rock', 'sand', 'bones'], wall: 'rockwall', overlay: 'bloodstain', liquid: 'blood', liquidRamp: [0x2a0204, 0x4a0408, 0x700a10, 0x981418, 0xc02820], liquidGlow: true },
  fraude: { floor: ['cobble', 'tiles', 'cobble', 'slab'], wall: 'cave', overlay: 'illusion', liquid: 'pitch', liquidRamp: [0x020304, 0x060a0c, 0x0c1418, 0x14222a], liquidGlow: false },
  traicion: { floor: ['ice', 'ice', 'frostrock', 'ice'], wall: 'icewall', overlay: 'frost', liquid: 'ice', liquidRamp: [0x10243c, 0x1a3a5c, 0x2a5a80, 0x4a84a8, 0x84bcd8], liquidGlow: false },
};

function floorTile(pc, ox, oy, ramp, kind, seed, em) {
  const N = (x, y, s = 0) => hash2(x + ox, y + oy, seed + s);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    let f = 2.2;
    const gx = ox + x, gy = oy + y;
    switch (kind) {
      case 'slab': {
        // two irregular slabs with a seam, chipped corners
        const seamY = 7 + Math.floor(N(0, 0) * 3);
        const seamX = 5 + Math.floor(N(1, 1) * 6);
        const top = y < seamY;
        const seam = y === seamY || (top && x === seamX) || (!top && x === (seamX + 6) % 16);
        f = 2.4 + (N(x >> 2, y >> 2, 3) - 0.5) * 0.8;
        if (seam) f = 0.4;
        else if (y === seamY + 1 || (top && x === seamX + 1) || y === 0) f += 0.9; // lit edge
        else if (y === seamY - 1 || x === seamX - 1) f -= 0.6;
        if (N(x, y, 7) > 0.93) f -= 1;
        break;
      }
      case 'marble': {
        const v = Math.sin((x + y * 0.6) * 0.5 + N(0, 0) * 6 + Math.sin(y * 0.4) * 2);
        f = 3.0 + (N(x >> 1, y >> 1, 3) - 0.5) * 0.5;
        if (Math.abs(v) < 0.12) f = 1.6;
        if (x === 0 || y === 0) f = 1.0;
        if (x === 1 || y === 1) f += 0.6;
        break;
      }
      case 'cobble': {
        // voronoi-ish stones
        let best = 9, second = 9;
        for (let k = 0; k < 6; k++) {
          const px = N(k, 0, 11) * 16, py = N(k, 1, 13) * 16;
          for (const [wx, wy] of [[0, 0], [16, 0], [-16, 0], [0, 16], [0, -16]]) {
            const d = Math.hypot(x - px - wx, y - py - wy);
            if (d < best) { second = best; best = d; } else if (d < second) second = d;
          }
        }
        f = second - best < 1.2 ? 0.5 : 2.3 + (best < 2 ? 0.8 : 0) - best * 0.08;
        break;
      }
      case 'rock': {
        const n = N(x >> 1, y >> 1, 5) * 0.6 + N(x, y, 6) * 0.4;
        f = 1.6 + n * 1.6;
        if (N(x, y, 9) > 0.96) f = 0.5;
        if ((x + y * 3 + Math.floor(N(0, 0) * 16)) % 17 === 0) f = 0.6;
        break;
      }
      case 'scour': {
        // wind-scoured streaks
        const s = Math.sin(x * 0.4 - y * 1.6 + N(0, 0) * 6);
        f = 2 + s * 0.8 + (N(x, y, 2) - 0.5) * 0.5;
        break;
      }
      case 'mud': {
        const n = Math.sin(gx * 0.35 + Math.sin(gy * 0.3) * 2) * Math.cos(gy * 0.33 + gx * 0.1);
        f = 1.7 + n * 0.9 + (N(x, y, 4) - 0.5) * 0.4;
        if (n > 0.65) f = 3.4; // wet sheen
        break;
      }
      case 'slime': {
        const n = Math.sin(gx * 0.5) * Math.sin(gy * 0.45 + 1);
        f = 1.5 + n * 0.8;
        if (N(x, y, 3) > 0.9) f = 3.6;
        break;
      }
      case 'goldtile': {
        const bx = x % 8, by = y % 8;
        f = 2.5 + (N(x >> 3, y >> 3, 1) - 0.5) * 0.6;
        if (bx === 0 || by === 0) f = 0.9;
        else if (bx === 1 || by === 1) f = 3.6;
        if ((bx === 4 && by === 4) || (bx === 3 && by === 4) || (bx === 4 && by === 3)) f = 4.5; // stud
        break;
      }
      case 'coins': {
        f = 1.4 + N(x, y, 1) * 0.6;
        break;
      }
      case 'ash': {
        f = 1.4 + N(x, y, 1) * 1.2 + (N(x >> 2, y >> 2, 2) - 0.5);
        if (N(x, y, 8) > 0.97) f = 3.5;
        break;
      }
      case 'sand': {
        const d = Math.sin(gx * 0.25 + gy * 0.6 + Math.sin(gx * 0.1) * 3);
        f = 2.4 + d * 0.7 + (N(x, y, 3) - 0.5) * 0.6;
        break;
      }
      case 'bones': {
        f = 2.0 + (N(x, y, 3) - 0.5) * 0.8;
        break;
      }
      case 'tiles': {
        const bx = x % 8, by = y % 8;
        const dark = ((x >> 3) + (y >> 3)) % 2;
        f = dark ? 1.4 : 2.6;
        if (bx === 0 || by === 0) f = 0.6;
        if (N(x >> 3, y >> 3, 4) > 0.75 && bx > 2 && by > 2) f -= 0.8; // missing tiles
        break;
      }
      case 'ice': {
        const n = N(x >> 2, y >> 2, 1);
        f = 3.0 + n * 0.6;
        const crack = Math.abs(Math.sin(x * 0.7 + y * 0.31 + N(0, 0) * 9) + Math.sin(y * 0.5 - x * 0.2)) < 0.08;
        if (crack) f = 1.4;
        if ((x - y + 32) % 13 === 0 && n > 0.5) f = 5; // glint
        break;
      }
      case 'frostrock': {
        f = 1.8 + N(x >> 1, y >> 1, 5) * 1.4;
        if (N(x, y, 7) > 0.8) f = 4.2;
        break;
      }
    }
    pc.set(gx, gy, pick(ramp, f, gx, gy));
  }
  // decorations per kind
  const r = (s) => N(0, 0, s);
  if (kind === 'coins') {
    for (let k = 0; k < 6; k++) {
      const x = ox + 2 + Math.floor(r(k) * 12), y = oy + 2 + Math.floor(r(k + 9) * 12);
      pc.set(x, y, R.gold[4]); pc.set(x + 1, y, R.gold[3]); pc.set(x, y + 1, R.gold[2]);
      if (em && k % 2 === 0) em.set(x, y, 0x402a08);
    }
  }
  if (kind === 'bones') {
    const x = ox + 3 + Math.floor(r(1) * 8), y = oy + 4 + Math.floor(r(2) * 8);
    pc.line(x, y, x + 5, y + 2, R.bone[3]); pc.set(x - 1, y, R.bone[4]); pc.set(x + 6, y + 2, R.bone[4]);
    if (r(3) > 0.5) { pc.ellipse(x + 2, y - 3, 2, 1.6, R.bone[3]); pc.set(x + 1, y - 3, 0x100808); pc.set(x + 3, y - 3, 0x100808); }
  }
}

function wallFace(pc, ox, oy, ramp, kind, variant, seed, em, st) {
  const N = (x, y, s = 0) => hash2(x + ox, y + oy, seed + s);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = ox + x, gy = oy + y;
    let f = 2;
    if (kind === 'ashlar' || kind === 'gilded' || kind === 'icewall') {
      const rowH = 8;
      const row = Math.floor(y / rowH);
      const off = row % 2 ? 4 : 0;
      const bx = (x + off) % 8, by = y % rowH;
      f = 2.6 + (N((x + off) >> 3, row, 1) - 0.5) * 0.9;
      if (by === 0 || bx === 0) f = 0.5;
      else if (by === 1 || bx === 1) f += 0.9;
      else if (by === rowH - 1 || bx === 7) f -= 0.7;
      if (N(x, y, 5) > 0.95) f -= 1.2;
      if (kind === 'icewall') f += (Math.sin(x * 0.8 + y * 0.3) > 0.85 ? 1.4 : 0);
    } else if (kind === 'rockwall' || kind === 'cave') {
      const n = N(x >> 2, y >> 1, 2) * 0.6 + N(x, y, 3) * 0.4;
      f = 1.4 + n * 1.8 - (y > 12 ? 0.6 : 0);
      const strata = Math.sin(y * 0.9 + Math.sin(x * 0.3 + N(0, 0) * 5) * 1.5);
      if (strata > 0.9) f += 1.0; else if (strata < -0.92) f = 0.4;
      if (kind === 'cave') f -= 0.4;
    } else if (kind === 'fleshwall') {
      const n = Math.sin(gx * 0.45 + Math.sin(gy * 0.5) * 2) * Math.cos(gy * 0.4);
      f = 2 + n * 1.2;
      if (Math.abs(n) < 0.06) f = 0.5; // sinew grooves
    }
    pc.set(gx, gy, pick(ramp, f, gx, gy));
  }
  const acc = st.accent;
  // architectural variants (gothic vocabulary)
  if (variant === 1) { // pointed arch niche
    for (let y = 2; y < T; y++) for (let x = 3; x < 13; x++) {
      const cx = 8, w = 5 - Math.max(0, (6 - y) * 0.9);
      if (Math.abs(x + 0.5 - cx) < w) pc.set(ox + x, oy + y, y < 4 ? ramp[0] : ramp[Math.abs(x + 0.5 - cx) > w - 1.2 ? 1 : 0]);
    }
    pc.vline(ox + 3, oy + 6, oy + 15, ramp[4]); pc.vline(ox + 12, oy + 6, oy + 15, ramp[2]);
  } else if (variant === 2) { // lancet window glowing
    for (let y = 2; y < 15; y++) for (let x = 5; x < 11; x++) {
      const w = 3 - Math.max(0, (5 - y) * 0.7);
      if (Math.abs(x + 0.5 - 8) < w) {
        const edge = Math.abs(x + 0.5 - 8) > w - 1;
        pc.set(ox + x, oy + y, edge ? ramp[0] : acc[Math.min(acc.length - 1, 2 + ((x + y) % 2))]);
        if (em && !edge) em.set(ox + x, oy + y, acc[Math.min(acc.length - 1, 1 + ((x * 3 + y) % 3))]);
      }
    }
    pc.hline(ox + 5, ox + 10, oy + 9, ramp[0]); pc.vline(ox + 8, oy + 3, oy + 14, ramp[0]);
  } else if (variant === 3) { // statue niche with skull
    pc.rect(ox + 4, oy + 3, 8, 12, ramp[0]);
    pc.ellipse(ox + 8, oy + 10, 2.5, 2.2, R.bone[3]);
    pc.set(ox + 7, oy + 10, 0x080404); pc.set(ox + 9, oy + 10, 0x080404); pc.rect(ox + 7, oy + 12, 3, 1, R.bone[2]);
    pc.hline(ox + 3, ox + 12, oy + 15, ramp[4]);
  } else if (variant === 4) { // carved relief: chained figure
    pc.ellipse(ox + 8, oy + 4, 1.6, 1.6, ramp[4]);
    pc.rect(ox + 7, oy + 6, 3, 6, ramp[4]); pc.vline(ox + 7, oy + 6, oy + 12, ramp[3]);
    pc.line(ox + 7, oy + 7, ox + 3, oy + 3, ramp[3]); pc.line(ox + 9, oy + 7, ox + 13, oy + 3, ramp[3]);
    pc.line(ox + 7, oy + 12, ox + 6, oy + 15, ramp[3]); pc.line(ox + 9, oy + 12, ox + 10, oy + 15, ramp[3]);
    for (let k = 0; k < 4; k++) { pc.set(ox + 2 + k % 2, oy + 2 + k, R.steel[2]); pc.set(ox + 13 + k % 2, oy + 2 + k, R.steel[2]); }
  } else if (variant === 5) { // big crack
    let x = ox + 6 + Math.floor(N(0, 0, 9) * 4);
    for (let y = oy; y < oy + T; y++) { pc.set(x, y, ramp[0]); pc.set(x + 1, y, ramp[1]); x += Math.round((N(0, y, 3) - 0.5) * 2); }
  } else if (variant === 6) { // torn banner
    const bc = acc;
    for (let y = 0; y < 13; y++) for (let x = 4; x < 12; x++) {
      if (y > 9 && (x + y) % 3 === 0) continue;
      pc.set(ox + x, oy + y, bc[Math.min(bc.length - 1, (x === 4 ? 1 : x === 11 ? 0 : 2))]);
    }
    pc.hline(ox + 3, ox + 12, oy, R.wood[3]);
    // sigil on banner
    pc.vline(ox + 8, oy + 3, oy + 8, bc[bc.length - 1]); pc.hline(ox + 6, ox + 10, oy + 5, bc[bc.length - 1]);
  } else if (variant === 7) { // memento mori relief: rows of skulls
    for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) {
      const sx = ox + 3 + k * 5, sy = oy + 4 + j * 6;
      pc.ellipse(sx, sy, 1.8, 1.6, R.bone[2]); pc.set(sx - 1, sy, 0x0a0606); pc.set(sx + 1, sy, 0x0a0606);
    }
  }
  if (kind === 'gilded') {
    // gold leaf flaking off the stone
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (N(x >> 1, y >> 1, 21) > 0.55 && N(x, y, 22) > 0.25) {
      const g = R.gold;
      const c = pc.get(ox + x, oy + y);
      if (!c) continue;
      pc.set(ox + x, oy + y, g[Math.min(5, Math.max(1, Math.round((c[0] / 255) * 9)))]);
      if (em && N(x, y, 23) > 0.97) em.set(ox + x, oy + y, 0x604010);
    }
  }
  if (kind === 'icewall' && variant === 0 && N(0, 0, 99) > 0.4) {
    // a frozen damned face trapped in the ice (Cocito)
    pc.ellipse(ox + 8, oy + 8, 3, 3.4, mix(R.skinPale[2], R.ice[3], 0.5));
    pc.set(ox + 7, oy + 8, R.ice[0]); pc.set(ox + 9, oy + 8, R.ice[0]); pc.hline(ox + 7, ox + 9, oy + 10, R.ice[1]);
    pc.line(ox + 5, oy + 11, ox + 3, oy + 14, mix(R.skinPale[2], R.ice[3], 0.6));
  }
  if (kind === 'fleshwall' && variant === 0) {
    // embedded teeth / eye
    if (N(0, 0, 4) > 0.5) { pc.ellipse(ox + 8, oy + 8, 2.5, 1.6, 0xd8d0b0); pc.disc(ox + 8, oy + 8, 1, 0x3a1a08); pc.set(ox + 8, oy + 8, 0x000000); }
  }
}

function overlay(pc, ox, oy, st, seed, em) {
  const N = (x, y, s = 0) => hash2(x + ox, y + oy, seed + s);
  const kind = st.overlay;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = ox + x, gy = oy + y;
    const c = pc.get(gx, gy);
    if (!c || !c[3]) continue;
    const n = N(x >> 1, y >> 1, 40);
    if (kind === 'mist' && n > 0.82) pc.set(gx, gy, mix(c, [150, 156, 170], 0.25));
    if (kind === 'slime' && n > 0.8 && N(x, y, 41) > 0.3) pc.set(gx, gy, mix(c, R.poison[4], 0.45));
    if (kind === 'soot' && n > 0.7) pc.set(gx, gy, mix(c, [8, 6, 6], 0.5));
    if (kind === 'bloodstain' && n > 0.86) pc.set(gx, gy, mix(c, R.blood[2], 0.6));
    if (kind === 'frost' && n > 0.75 && N(x, y, 42) > 0.4) pc.set(gx, gy, mix(c, R.ice[5], 0.35));
    if (kind === 'embers' && N(x, y, 43) > 0.985) { pc.set(gx, gy, R.ember[4]); if (em) em.set(gx, gy, R.ember[3]); }
    if (kind === 'illusion' && N(x, y, 44) > 0.992) { pc.set(gx, gy, R.teal[5]); if (em) em.set(gx, gy, R.teal[4]); }
    if (kind === 'petals' && N(x, y, 45) > 0.985) pc.set(gx, gy, [224, 74, 122]);
    if (kind === 'candlewax' && N(x, y, 46) > 0.99) pc.set(gx, gy, [220, 210, 180]);
  }
}

function liquidTile(pc, ox, oy, st, frame, em) {
  const ramp = st.liquidRamp;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = ox + x, gy = oy + y;
    const w = Math.sin((x + frame * 4) * 0.785) * 0.5 + Math.sin((y * 2 + x) * 0.39 + frame) * 0.5;
    let f = ramp.length * 0.4 + w * 1.1;
    if (st.liquid === 'lava' || st.liquid === 'gold') f += Math.sin(x * 0.4 + y * 0.9) * 0.8;
    if (st.liquid === 'ice') f = 2.5 + (Math.abs(Math.sin(x * 0.6 - y * 0.4)) < 0.1 ? 1.5 : 0) + (hash2(gx, gy, 3) > 0.97 ? 2 : 0);
    const col = pick(ramp, f, gx, gy, 0.9);
    pc.set(gx, gy, col);
    if (em && st.liquidGlow) em.set(gx, gy, mix(col, [0, 0, 0], 0.35));
  }
}

function boxTexture(pc, ox, oy, kind, st, em) {
  const wall = st.wall;
  switch (kind) {
    case 'tombSide': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(R.stone, 2.6 - y * 0.08 + (x === 0 ? 1 : 0) - (x === 15 ? 1 : 0), ox + x, oy + y));
      pc.hline(ox, ox + 15, oy, R.stone[5]); pc.hline(ox, ox + 15, oy + 15, R.stone[0]);
      pc.rect(ox + 6, oy + 4, 4, 1, R.stone[1]); pc.rect(ox + 7, oy + 2, 2, 6, R.stone[1]); // cross carving
      break;
    }
    case 'tombTop': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(R.stone, 3 + (hash2(x, y, 4) - 0.5) * 0.8, ox + x, oy + y));
      pc.rect(ox + 2, oy + 2, 12, 12, R.stone[2]); pc.rect(ox + 3, oy + 3, 10, 10, R.stone[3]);
      break;
    }
    case 'altarSide': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(wall, 2.4 - (y > 12 ? 1 : 0) + (y < 2 ? 1.5 : 0), ox + x, oy + y));
      for (let x = 2; x < 14; x += 3) pc.vline(ox + x, oy + 4, oy + 11, wall[1]);
      break;
    }
    case 'altarTop': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(wall, 3.6 + (hash2(x, y, 9) - 0.5), ox + x, oy + y));
      pc.rect(ox + 1, oy + 1, 14, 1, wall[5]);
      break;
    }
    case 'pedestal': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(R.stone, 2.8 - Math.abs(x - 7.5) * 0.18, ox + x, oy + y));
      pc.hline(ox, ox + 15, oy + 1, R.stone[5]); pc.hline(ox, ox + 15, oy + 13, R.stone[1]);
      break;
    }
    case 'iceBlock': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(R.ice, 3.5 + Math.sin(x * 0.7 + y * 0.2) * 0.8, ox + x, oy + y));
      pc.line(ox + 2, oy + 2, ox + 6, oy + 9, R.ice[6]);
      break;
    }
    case 'chest': {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(R.wood, 2.6 - y * 0.06, ox + x, oy + y));
      pc.hline(ox, ox + 15, oy + 5, R.gold[3]); pc.vline(ox + 7, oy + 5, oy + 10, R.gold[4]);
      break;
    }
    default: {
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) pc.set(ox + x, oy + y, pick(wall, 2.5, ox + x, oy + y));
    }
  }
}

const atlasCache = new Map();
export function circleAtlas(circleId) {
  if (atlasCache.has(circleId)) return atlasCache.get(circleId);
  const P = CIRCLE_PALETTES[circleId];
  const st = { ...STYLE[circleId], accent: P.accent, wall: P.wall };
  const pc = new PixelCanvas(T * ATLAS_COLS, T * ATLAS_ROWS);
  const em = new PixelCanvas(T * ATLAS_COLS, T * ATLAS_ROWS);
  em.rect(0, 0, em.w, em.h, 0x000000);
  const seedBase = [...circleId].reduce((a, c) => a + c.charCodeAt(0), 0) * 97;

  // row 0: floors (12 variants cycling 4 styles; 12-15 specials)
  for (let i = 0; i < 12; i++) {
    const kind = st.floor[i % st.floor.length];
    floorTile(pc, i * T, 0, P.floor, kind, seedBase + i * 31, em);
    overlay(pc, i * T, 0, st, seedBase + i, em);
  }
  // specials: mosaic medallion pieces (2x2) and a rune slab
  for (let i = 12; i < 16; i++) {
    floorTile(pc, i * T, 0, P.floor, st.floor[0], seedBase + i * 31, em);
    const qx = (i - 12) % 2, qy = Math.floor((i - 12) / 2);
    const cx = (1 - qx) * 16, cy = (1 - qy) * 16; // center of 2x2 block is the shared corner
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const ring = Math.abs(d - 12) < 0.8 || Math.abs(d - 8) < 0.6;
      const spoke = Math.abs(Math.atan2(y + 0.5 - cy, x + 0.5 - cx) * 8 / Math.PI % 1) < 0.08 && d < 12 && d > 8;
      if (ring || spoke) { pc.set(i * T + x, y, P.accent[Math.min(P.accent.length - 1, 2)]); }
    }
  }
  // row 1: wall faces + trims
  for (let i = 0; i < 8; i++) {
    wallFace(pc, i * T, T, P.wall, st.wall, i, seedBase + 500 + i * 7, em, st);
    overlay(pc, i * T, T, st, seedBase + 77 + i, em);
  }
  for (let i = 8; i < 12; i++) { // base trim (plinth)
    wallFace(pc, i * T, T, P.wall, st.wall, 0, seedBase + 600 + i, em, st);
    for (let x = 0; x < T; x++) { pc.set(i * T + x, T + 12, P.wall[4]); pc.set(i * T + x, T + 13, P.wall[2]); pc.set(i * T + x, T + 15, P.wall[0]); pc.set(i * T + x, T + 14, P.wall[1]); }
  }
  for (let i = 12; i < 16; i++) { // cornice with dentils
    wallFace(pc, i * T, T, P.wall, st.wall, 0, seedBase + 700 + i, em, st);
    for (let x = 0; x < T; x++) {
      pc.set(i * T + x, T, P.wall[5]); pc.set(i * T + x, T + 1, P.wall[4]); pc.set(i * T + x, T + 2, P.wall[1]);
      if (x % 4 < 2) pc.set(i * T + x, T + 3, P.wall[3]); else pc.set(i * T + x, T + 3, P.wall[0]);
    }
  }
  // row 2: wall tops, pillar faces, caps, cliff faces, parapet
  for (let i = 0; i < 4; i++) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = hash2(x + i * 16, y, seedBase + 3);
      pc.set(i * T + x, 2 * T + y, pick(P.wall, 1.2 + n * 0.8 - (y > 13 ? 0.8 : 0) + (y < 1 ? 1.5 : 0), i * T + x, 2 * T + y));
    }
  }
  for (let i = 4; i < 8; i++) { // pillar faces: fluted column
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = x / 15;
      let f = 3.4 - Math.abs(u - 0.35) * 4;
      if ((x - 1) % 4 === 0) f -= 1.1;
      pc.set(i * T + x, 2 * T + y, pick(P.wall, f, i * T + x, 2 * T + y));
    }
    if (i === 6) for (let y = 0; y < T; y++) if (hash2(0, y, i) > 0.5) pc.set(i * T + 7, 2 * T + y, P.wall[0]);
  }
  for (let i = 8; i < 10; i++) { // capitals
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const f = y < 3 ? 4.2 : y < 6 ? 2.0 : y < 12 ? 3 - Math.abs(x - 7.5) * 0.2 + ((x + y) % 3 === 0 ? -1 : 0) : 1.6;
      pc.set(i * T + x, 2 * T + y, pick(P.wall, f, i * T + x, 2 * T + y));
    }
  }
  for (let i = 10; i < 14; i++) { // cliff faces (edge into the abyss)
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const n = hash2(x + i * 16, y >> 1, seedBase + 8);
      const f = 2.4 - y * 0.16 + n * 0.8 + (y === 0 ? 1.5 : 0);
      pc.set(i * T + x, 2 * T + y, pick(P.wall, f, i * T + x, 2 * T + y));
    }
  }
  for (let i = 14; i < 16; i++) { // balustrade parapet
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let f = 2.2;
      if (y < 3) f = 3.8 - y * 0.5; else if (y > 13) f = 1.2;
      else if (x % 4 === 1 || x % 4 === 2) f = 3 - (x % 4 === 2 ? 0.8 : 0); else f = 0.3;
      pc.set(i * T + x, 2 * T + y, pick(P.wall, f, i * T + x, 2 * T + y));
    }
  }
  // row 3: liquids (4 frames by phase) + edges + rubble
  for (let i = 0; i < 4; i++) liquidTile(pc, i * T, 3 * T, st, i * 0.25, em);
  for (let i = 4; i < 8; i++) {
    liquidTile(pc, i * T, 3 * T, st, 0, em);
    for (let x = 0; x < T; x++) for (let y = 0; y < 3; y++) {
      pc.set(i * T + x, 3 * T + y, y === 0 ? P.floor[4] : y === 1 ? P.floor[2] : mix(st.liquidRamp[st.liquidRamp.length - 1], P.floor[1], 0.5));
    }
  }
  for (let i = 8; i < 12; i++) {
    floorTile(pc, i * T, 3 * T, P.floor, st.floor[0], seedBase + i * 11, em);
    for (let k = 0; k < 5; k++) {
      const x = i * T + 2 + Math.floor(hash2(k, i, 1) * 11), y = 3 * T + 2 + Math.floor(hash2(i, k, 2) * 11);
      pc.ellipse(x, y, 1.5 + hash2(k, k, i) * 1.5, 1.2, null, (nx, ny, px, py) => pick(P.wall, 3 - nx - ny, px, py));
    }
  }
  for (let i = 12; i < 16; i++) floorTile(pc, i * T, 3 * T, P.floor, st.floor[1], seedBase + i * 13, em);
  // row 4: prop boxes
  const boxes = ['tombSide', 'tombTop', 'altarSide', 'altarTop', 'pedestal', 'iceBlock', 'chest', 'generic'];
  boxes.forEach((b, i) => boxTexture(pc, i * T, 4 * T, b, st, em));

  const res = {
    id: circleId,
    texture: makeTexture(pc),
    emissive: makeTexture(em),
    pc, em,
    style: st,
    palette: P,
    uv(col, row) { // returns [u0,v0,u1,v1] for flipY texture
      const u0 = (col * T) / pc.w, u1 = ((col + 1) * T) / pc.w;
      const v1 = 1 - (row * T) / pc.h, v0 = 1 - ((row + 1) * T) / pc.h;
      return [u0, v0, u1, v1];
    },
  };
  atlasCache.set(circleId, res);
  return res;
}
export { STYLE as CIRCLE_STYLE };
