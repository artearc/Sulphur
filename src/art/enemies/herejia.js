// VI · HEREJÍA bestiary art — the City of Dis: heretics burning inside their own shrouds, the
// coroza-crowned necromancer with his inverted book, the sanbenito-clad caster and their
// charred dead. Palette: burnt umber, charcoal, ember. Fire is always emissive.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R, CIRCLE_PALETTES } from '../palette.js';
import { bayer, mix, toHex } from '../pixel.js';
import { drawFigure, figurePose } from '../figure.js';

const HP = CIRCLE_PALETTES.herejia;
const clampi = (v, a, b) => (v < a ? a : v > b ? b : v);
const pk = (ramp, f, x, y, d = 0.6) => ramp[clampi(Math.round(f + (bayer(x, y) - 0.5) * d), 0, ramp.length - 1)];
const EMB = R.ember;
// scorched linen of a burial shroud
const SHROUD = [0x120c0a, 0x221814, 0x3a2a22, 0x56423a, 0x7a6456, 0x9c8674];
// charcoal robes (herejía accent2 extended into the dark)
const CHAR = [0x0c0908, 0x18120f, ...HP.accent2];
// charred bone
const CBONE = [0x1a1210, 0x3a2c22, 0x5e4c3a, 0x8a7458, 0xb49e7c];
const GAUNT = [0x241c1c, 0x463a38, 0x6e605a, 0x988a7e, 0xc0b2a0];
const LEATHER = [0x1a0606, 0x340c0a, 0x521810, 0x6e2616];
const SANB = R.bronze; // ochre penitential sanbenito

export function flame(c, e, cx, by, h, i, ramp = EMB, w = 3) {
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const ww = Math.max(0, Math.round(w * (1 - t) * (0.8 + 0.3 * Math.sin(i * 2.1 + y))));
    const sway = Math.round(Math.sin(i * 1.7 + y * 0.6) * t * 1.5);
    for (let x = -ww; x <= ww; x++) {
      const f = (1 - Math.abs(x) / (ww + 1)) * (1 - t * 0.6) * (ramp.length - 1) + (bayer(x + 9, y + i) - 0.5);
      const col = ramp[Math.max(1, Math.min(ramp.length - 1, Math.round(f)))];
      c.set(cx + x + sway, by - y, col);
      if (e) e.set(cx + x + sway, by - y, col);
    }
  }
}

// Death helper: the sprite burns away from the top, leaving an ember seam that glows.
export function burnAway(c, e, k, ramp = EMB) {
  if (k <= 0) return;
  let minY = c.h, maxY = 0;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.alpha(x, y)) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const cut = minY + (maxY - minY + 4) * k;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.alpha(x, y)) continue;
    const d = y - cut + (bayer(x, y) - 0.5) * 3;
    if (d < 0) { c.erase(x, y); if (e) e.erase(x, y); }
    else if (d < 1.6) { const col = ramp[d < 0.8 ? 4 : 3]; c.set(x, y, col); if (e) e.set(x, y, col); }
    else if (d < 3.2) c.set(x, y, ramp[1]);
  }
}

// ---------------------------------------------------------------------------------------------
// ESPECTRO DE FUEGO — a heretic wound in a burial shroud that burns from within. Spindle
// silhouette, flame crown, glowing seams where the linen has split.
// ---------------------------------------------------------------------------------------------
function espectroBody(c, e, p) {
  const ph = p.ph || 0;
  const cx = 13 + (p.lean || 0);
  const top = 15 + (p.bob || 0);
  const bot = 37;
  const tail = p.tail ?? 0;
  const heat = p.heat ?? 1;
  // flames behind the shoulders
  flame(c, e, cx - 3, top + 4, 5 + heat * 2 + (ph % 2), ph, EMB, 2);
  if (p.stream) for (let k = 0; k < 3; k++) {
    // dash: fire streams backwards off the body
    const y = top + 4 + k * 4;
    for (let x = cx - 14; x < cx - 3; x++) {
      const t = (x - (cx - 14)) / 11;
      if (bayer(x + ph, y) > t + 0.15) continue;
      const col = EMB[clampi(Math.round(t * 4 + 0.5), 1, 5)];
      c.set(x, y + Math.round(Math.sin(x * 0.7 + ph) * 0.8), col); if (e) e.set(x, y + Math.round(Math.sin(x * 0.7 + ph) * 0.8), col);
    }
  }
  // shroud
  const pts = [[cx - 4, top + 2], [cx + 4, top + 2], [cx + 6, top + 9], [cx + 4, top + 16], [cx + 1 - tail, bot], [cx - 1 - tail, bot], [cx - 5, top + 12]];
  c.poly(pts, null, (x, y) => {
    const t = (y - top) / (bot - top);
    const u = (x - (cx - 5)) / 11;
    let f = 4.1 - u * 2.4 - t * 1.8;
    if (((x + y * 2 + 40) % 7) === 0 && t < 0.85) f -= 1.3;           // burial wrappings
    if (y === top + 2) f += 0.5;
    return pk(SHROUD, f, x, y);
  });
  // ragged tail end
  for (let k = 0; k < 4; k++) {
    const x = cx - 2 - tail + k, y = bot + 1 + ((k + ph) % 2);
    if (bayer(x, y) < 0.6) c.set(x, y, SHROUD[1]);
  }
  // bound arms crossed over the chest
  c.hline(cx - 3, cx + 5, top + 7, SHROUD[1]);
  c.hline(cx - 2, cx + 5, top + 8, SHROUD[2]);
  c.set(cx + 5, top + 7, CBONE[3]); c.set(cx + 6, top + 8, CBONE[2]);
  // seams of fire: the shroud has split where the heretic burns
  const glow = Math.min(5, 3 + heat);
  const seams = [[cx + 2, top + 4, 4], [cx - 1, top + 10, 6], [cx + 3, top + 12, 4]];
  seams.forEach(([sx, sy, len], s) => {
    for (let k = 0; k < len; k++) {
      const x = sx + (((k + s + ph) % 3) - 1) * (k % 2), y = sy + k;
      if (!c.alpha(x, y)) continue;
      const col = EMB[k === 0 || k === len - 1 ? glow - 1 : glow];
      c.set(x, y, col); if (e) e.set(x, y, col);
    }
  });
  // wrapped head
  const hx = cx + 1, hy = top - 1;
  c.ellipse(hx, hy, 3.3, 3.8, null, (nx, ny, x, y) => {
    let f = 4.4 - nx * 1.3 - ny * 1.3;
    if ((x + y) % 4 === 0) f -= 1;
    return pk(SHROUD, f, x, y);
  });
  // eye slits burn through the linen
  const eyeC = EMB[heat > 1 ? 5 : 4];
  c.set(hx + 1, hy, eyeC); c.set(hx + 3, hy, eyeC); c.set(hx + 2, hy + 2, EMB[2]);
  if (e) { e.set(hx + 1, hy, eyeC); e.set(hx + 3, hy, eyeC); e.set(hx + 2, hy + 2, EMB[2]); }
  // crown of fire rising from the skull
  flame(c, e, hx, hy - 3, 6 + heat * 3 + (ph % 2), ph + 1, EMB, 3);
  flame(c, e, hx + 2, hy - 2, 3 + heat, ph + 3, EMB, 1);
  c.selout(0x0b0709, 0.25);
}

export function espectroSheet() {
  return getSheet('en_espectroFuego', () => new SpriteSheet({
    w: 30, h: 42, emissive: true,
    anims: {
      idle: { frames: 4, fps: 7, draw: (c, e, i) => espectroBody(c, e, { bob: [0, 1, 1, 0][i], ph: i, tail: [0, 1, 0, -1][i] }) },
      move: { frames: 4, fps: 9, draw: (c, e, i) => espectroBody(c, e, { bob: [0, 1, 1, 0][i], lean: 1, ph: i * 2, tail: 2 + (i % 2) }) },
      windup: { frames: 2, fps: 8, loop: false, draw: (c, e, i) => espectroBody(c, e, { bob: 1, lean: -2, ph: i + 5, tail: -1, heat: 2 }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => espectroBody(c, e, { bob: 0, lean: 3 - i, ph: i * 3, tail: 5 - i, heat: 2, stream: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => espectroBody(c, e, { bob: 1, lean: -2, ph: 2, heat: 0 }) },
      death: { frames: 6, fps: 10, loop: false, draw: (c, e, i) => { espectroBody(c, e, { bob: i, lean: -1, ph: i, heat: 2 - i * 0.3 }); burnAway(c, e, i / 5.5); } },
    },
  }));
}

// ---------------------------------------------------------------------------------------------
// NECROMANTE — gaunt heretic under a painted coroza (the Inquisition's paper mitre), reading
// an inverted book whose pages burn with the wrong prayers.
// ---------------------------------------------------------------------------------------------
function coroza(c, e, hx, hy, tilt = 0, glow = 0) {
  const base = hy - 2, apexX = hx - 1 - tilt, apexY = hy - 15;
  c.poly([[hx - 4, base + 1], [hx + 4, base + 1], [apexX + 1, apexY], [apexX, apexY]], null, (x, y) => {
    const t = (base - y) / (base - apexY);
    const lx = hx - 4 + (apexX - (hx - 4)) * t, rx = hx + 4 + (apexX + 1 - (hx + 4)) * t;
    const u = (x - lx) / Math.max(1, rx - lx);
    return pk(R.bone, 3.6 - u * 2.4 - t * 0.4, x, y);
  });
  c.hline(hx - 4, hx + 4, base + 1, CHAR[2]);
  // painted flames and a devil's eye on the paper
  const fl = [[hx - 2, base - 2], [hx + 1, base - 3], [hx - 1, base - 6], [hx, base - 9]];
  fl.forEach(([x, y], k) => {
    c.set(x, y, R.crimson[3]); c.set(x, y - 1, EMB[2]); if (k % 2 === 0) c.set(x + 1, y, R.crimson[2]);
    if (e && glow) e.set(x, y - 1, EMB[2], 120 + glow * 60);
  });
}

function invertedBook(c, e, x, y, open = 0, glow = 0) {
  // spine on top, pages hanging open below — held upside down
  const w = 3 + Math.round(open);
  c.rect(x - w, y, w * 2 + 1, 2, LEATHER[2]);
  c.hline(x - w, x + w, y, LEATHER[3]);
  for (let k = -w; k <= w; k++) {
    const len = 3 + (Math.abs(k) < w ? 1 : 0) + Math.round(open * 0.5);
    for (let j = 0; j < len; j++) c.set(x + k, y + 2 + j, j === len - 1 ? R.bone[2] : R.bone[(k + j) % 3 === 0 ? 3 : 4]);
  }
  c.set(x - w, y + 1, LEATHER[1]); c.set(x + w, y + 1, LEATHER[1]);
  // backwards letters glow ember
  const gl = [[x - 2, y + 3], [x + 1, y + 4], [x - 1, y + 5], [x + 2, y + 3]];
  for (const [gx, gy] of gl) {
    c.set(gx, gy, glow > 0.5 ? EMB[4] : EMB[2]);
    if (e) e.set(gx, gy, glow > 0.5 ? EMB[4] : EMB[2], glow > 0.5 ? 255 : 150);
  }
}

function necroBody(c, e, anim, i, n) {
  const pose = figurePose(anim === 'cast' || anim === 'windup' ? 'cast' : anim === 'move' ? 'run' : anim, Math.min(i, 2), n) || {};
  const P = {
    dir: 'side', robe: CHAR, hood: CHAR, skin: GAUNT, headwear: 'none', stole: [0, 0, 0x7a1a00, 0xa83010],
    width: 6, shoulder: 3, tall: 2, feet: false, eyeColor: EMB[3], eyesGlow: EMB[4], nose: true,
    armF: { x: 4, y: 3 }, armB: { x: -1, y: 5 }, ...pose,
  };
  if (anim === 'idle') P.bob = [0, 0, 1, 1][i];
  if (anim === 'move') { P.hem = [-1, -0.4, 0.6, 1][i]; P.bob = [0, 1, 0, 1][i]; P.lean = 1; }
  let bookX, bookY, open = 0, glow = 0;
  if (anim === 'windup') { P.armF = { x: 3, y: -4 }; P.armB = { x: -3, y: -3 }; P.lean = -1; glow = 1; open = 1; }
  if (anim === 'attack') { P.armF = { x: 6 - i, y: 0 }; P.lean = 1; glow = 1; open = 2; }
  if (anim === 'cast') { P.armF = { x: 2, y: -7 }; P.armB = { x: -3, y: -7 }; P.bob = i % 2; glow = 1; open = 2; }
  if (anim === 'hurt') { P.lean = -2; P.bob = 1; P.armF = { x: 2, y: 4 }; }
  if (anim === 'death') { P.armF = { x: 3, y: 6 }; }
  drawFigure(c, e, { cx: 13, baseY: c.h - 2, ...P });
  // coroza over the head
  const top = c.h - 2 - 17 - 2 + (P.bob || 0) + (P.crouch || 0);
  const hx = 13 + (P.lean || 0) + 1, hy = top - 4;
  coroza(c, e, hx, hy, P.lean < 0 ? -1 : anim === 'move' ? 1 : 0, glow);
  // the inverted book in the front hand (floats above the head when raising the dead)
  const sx = 13 + 1 + (P.lean || 0), sy = top + 2;
  if (anim === 'cast') { bookX = hx + 1; bookY = hy - 22 + 6 + (i % 2); }
  else { bookX = sx + P.armF.x + 2; bookY = sy + P.armF.y - 1; }
  if (anim !== 'death' || i < 3) invertedBook(c, e, bookX, bookY, open, glow);
  if (anim === 'cast' && e) {
    // a ring of ember script under the floating book
    for (let a = 0; a < 12; a++) {
      const x = Math.round(bookX + Math.cos(a / 12 * Math.PI * 2 + i * 0.4) * 5), y = Math.round(bookY + 3 + Math.sin(a / 12 * Math.PI * 2 + i * 0.4) * 2);
      if (a % 2) { c.set(x, y, EMB[3]); e.set(x, y, EMB[3]); }
    }
  }
  c.selout(0x0b0709, 0.25);
}

export function necromanteSheet() {
  return getSheet('en_necromante', () => {
    const A = (name, frames, fps, loop = true) => ({ frames, fps, loop, draw: (c, e, i, n) => necroBody(c, e, name, i, n) });
    return new SpriteSheet({
      w: 28, h: 42, emissive: true,
      anims: {
        idle: A('idle', 4, 4),
        move: A('move', 4, 8),
        windup: A('windup', 2, 6, false),
        attack: A('attack', 3, 12, false),
        cast: A('cast', 4, 8),
        hurt: A('hurt', 1, 1),
        death: { frames: 6, fps: 9, loop: false, draw: (c, e, i, n) => { necroBody(c, e, 'death', i, n); burnAway(c, e, Math.max(0, (i - 1) / 4.5)); } },
      },
    });
  });
}

// ---------------------------------------------------------------------------------------------
// ESQUELETO — the charred dead raised from the burning tombs. Rusted blade, coal-ember eyes.
// ---------------------------------------------------------------------------------------------
const RUST = [0x1a0e0a, 0x3a2016, 0x5e3a26, 0x7e5a40, 0xa08068];
function skeleton(c, e, p) {
  const by = 28;
  const cx = 11 + (p.lean || 0);
  const bob = p.bob || 0;
  const st = p.stride || 0;
  const hipY = by - 9 + bob;
  const B = CBONE;
  // legs (back leg darker)
  const leg = (dx, s, col, col2) => {
    const kx = cx + dx + s * 2, ky = hipY + 4;
    const fx = cx + dx + s * 3 - (s < 0 ? 1 : 0), fy = by;
    c.line(cx + dx, hipY, kx, ky, col); c.line(kx, ky, fx, fy - 1, col);
    c.set(kx, ky, col2); c.hline(fx, fx + 2, fy, col);
  };
  leg(-1, -st, B[1], B[2]);
  // pelvis
  c.rect(cx - 2, hipY - 1, 5, 2, B[2]); c.set(cx - 2, hipY - 1, B[3]);
  leg(1, st, B[3], B[4]);
  // spine
  const chestY = hipY - 7;
  c.vline(cx, hipY - 1, chestY, B[2]);
  for (let y = chestY + 1; y < hipY - 1; y += 2) c.set(cx + 1, y, B[1]);
  // ribcage
  c.ellipse(cx + 1, chestY + 1, 3.6, 3.2, null, (nx, ny, x, y) => {
    if ((y + 1) % 2 === 0 && Math.abs(nx) < 0.75) return B[0];
    return pk(B, 3.4 - nx * 1.2 - ny, x, y);
  });
  // back arm
  const shX = cx + 1, shY = chestY - 2;
  const ab = p.armB || { x: -2, y: 7 };
  c.line(shX - 1, shY, shX - 1 + ab.x, shY + ab.y, B[1]);
  // skull
  const hx = cx + 2 + (p.headLean || 0), hy = chestY - 6;
  c.ellipse(hx, hy, 3.1, 3.2, null, (nx, ny, x, y) => pk(B, 3.9 - nx * 1.3 - ny * 1.2, x, y));
  c.rect(hx, hy + 2, 3, 2, B[2]); c.hline(hx, hx + 2, hy + 3, B[1]); c.set(hx + 1, hy + 3, B[3]);
  // scorched crown of the skull
  c.set(hx - 2, hy - 2, B[0]); c.set(hx - 1, hy - 3, B[1]); c.set(hx - 2, hy - 1, B[1]);
  c.rect(hx, hy - 1, 2, 2, 0x080404); c.set(hx + 3, hy - 1, 0x080404);
  const eyeC = p.eye ?? EMB[3];
  c.set(hx + 1, hy - 1, eyeC); c.set(hx + 3, hy - 1, eyeC);
  if (e) { e.set(hx + 1, hy - 1, eyeC); e.set(hx + 3, hy - 1, eyeC); }
  // front arm + rusted blade
  const af = p.armF || { x: 3, y: 6 };
  const hx2 = shX + 1 + af.x, hy2 = shY + af.y;
  c.line(shX + 1, shY, hx2, hy2, B[3]);
  c.set(hx2, hy2, B[4]);
  const ba = p.blade ?? 0.2;   // blade angle (screen radians, 0 = forward, negative = up)
  const bl = 9;
  const ex = hx2 + Math.cos(ba) * bl, ey = hy2 + Math.sin(ba) * bl;
  c.line(hx2, hy2, ex, ey, RUST[3]);
  c.line(hx2 + Math.sin(ba), hy2 - Math.cos(ba) * 0, ex + Math.sin(ba) * 0.5, ey + 1, RUST[1]);
  c.set(Math.round(hx2 + Math.cos(ba) * 4), Math.round(hy2 + Math.sin(ba) * 4), RUST[4]);
  c.line(hx2 - Math.sin(ba) * 2, hy2 + Math.cos(ba) * 2, hx2 + Math.sin(ba) * 2, hy2 - Math.cos(ba) * 2, RUST[2]);
  if (p.smoulder && e) for (let k = 0; k < 3; k++) { const x = cx - 1 + k * 2, y = chestY + 1 + (k % 2); c.set(x, y, EMB[2]); e.set(x, y, EMB[2], 160); }
}

function skeletonRise(c, e, i, n) {
  // claws out of the ground: draw the full body offset down, then cut at the ground line with a dirt mound
  const t = i / (n - 1);
  const off = Math.round((1 - t) * 22);
  const tmp = { w: c.w, h: c.h };
  skeleton(c, e, { bob: off, lean: 0, armF: { x: 2, y: -6 + Math.round(t * 10) }, armB: { x: -3, y: -4 }, blade: -1.2 + t * 1.4, smoulder: true });
  for (let y = 27; y < tmp.h; y++) for (let x = 0; x < tmp.w; x++) { c.erase(x, y); if (e) e.erase(x, y); }
  // dirt and embers bursting
  for (let x = 4; x < 21; x++) {
    const h = Math.round(2 + Math.sin(x * 1.3 + i) * 1.2 * (1 - t * 0.5));
    for (let y = 28 - h; y <= 28; y++) c.set(x, y, pk(HP.floor, 3.5 - (y - 25) * 0.6 - (x - 4) * 0.08, x, y));
  }
  if (e) for (let k = 0; k < 4; k++) { const x = 6 + ((k * 5 + i * 3) % 13), y = 25 - ((k + i) % 3); c.set(x, y, EMB[3]); e.set(x, y, EMB[3]); }
}

export function esqueletoSheet() {
  return getSheet('en_esqueleto', () => new SpriteSheet({
    w: 26, h: 30, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => skeleton(c, e, { bob: [0, 0, 1, 0][i], headLean: i === 2 ? -1 : 0, smoulder: i % 2 === 0 }) },
      move: { frames: 4, fps: 9, draw: (c, e, i) => skeleton(c, e, { bob: [0, 1, 0, 1][i], stride: [1, 0, -1, 0][i], lean: 1, smoulder: i % 2 === 1 }) },
      windup: { frames: 2, fps: 7, loop: false, draw: (c, e, i) => skeleton(c, e, { bob: 1, lean: -1, armF: { x: -1, y: -6 }, blade: -1.9 + i * 0.2, eye: EMB[5] }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => skeleton(c, e, { bob: 0, lean: 1 + (i === 0 ? 1 : 0), stride: 1, armF: [{ x: 5, y: 1 }, { x: 5, y: 5 }, { x: 3, y: 7 }][i], blade: [-0.4, 0.6, 1.1][i] }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => skeleton(c, e, { bob: 1, lean: -2, headLean: -1, armF: { x: 1, y: 7 }, blade: 1.2 }) },
      rise: { frames: 6, fps: 9, loop: false, draw: skeletonRise },
      death: {
        frames: 6, fps: 10, loop: false,
        draw: (c, e, i) => {
          // collapses into a pile of smoking bones
          if (i < 2) skeleton(c, e, { bob: i * 2, lean: -i, headLean: -i, armF: { x: 1, y: 7 }, blade: 1.4 });
          else {
            const k = i - 2;
            for (let b = 0; b < 7; b++) {
              const x = 5 + ((b * 7) % 14), y = 27 - (b % 3) - Math.max(0, 3 - k);
              c.line(x, y, x + 3 - (b % 2) * 2, y + (b % 2), CBONE[2 + (b % 2)]);
            }
            c.ellipse(13 + k, 26 - Math.max(0, 2 - k), 2.6, 2.4, null, (nx, ny, x, y) => pk(CBONE, 3.6 - nx - ny, x, y));
            c.set(13 + k, 26 - Math.max(0, 2 - k), 0x080404);
            c.line(15, 28, 22, 27, RUST[2]);
            if (e && k < 3) { e.set(13 + k, 26 - Math.max(0, 2 - k), EMB[3 - k]); }
          }
        },
      },
    },
  }));
}

// ---------------------------------------------------------------------------------------------
// HEREJE ARDIENTE — sanbenito painted with flames, scalp alight, a burning tome as a shield.
// ---------------------------------------------------------------------------------------------
function tome(c, e, x, y, open, burn, ph) {
  // a heavy book seen from the side, open toward the enemy (right). open: 0 closed .. 2 wide
  const h = 9 + open;
  // back cover
  c.poly([[x, y], [x + 2, y], [x + 2, y + h], [x, y + h]], LEATHER[1]);
  // pages fan outward
  for (let k = 0; k <= open + 1; k++) {
    const px = x + 2 + k;
    for (let yy = y + 1; yy < y + h; yy++) c.set(px, yy, R.bone[k === open + 1 ? 2 : 4 - (yy % 3 === 0 ? 1 : 0)]);
  }
  // front cover (swung open)
  const fx = x + 3 + open + 1;
  c.line(fx, y - open, fx + open, y + h - 1 - open, LEATHER[3]);
  c.line(fx + 1, y - open + 1, fx + open + 1, y + h - open, LEATHER[2]);
  c.set(fx + 1, y + 3, R.goldDim[3]); c.set(fx + 1, y + 6, R.goldDim[3]);
  // burning page edges + rune circle
  if (burn) {
    for (let k = 0; k < 3; k++) flame(c, e, x + 2 + k, y, 3 + ((k + ph) % 3), ph + k, EMB, 1);
    if (e) for (let yy = y + 2; yy < y + h - 1; yy += 2) e.set(x + 3 + open, yy, EMB[3], 200);
  }
}

function herejeBody(c, e, anim, i, n) {
  const pose = figurePose(anim === 'cast' || anim === 'windup' ? 'cast' : anim === 'move' ? 'run' : anim === 'attack' ? 'attack' : anim, Math.min(i, 2), n) || {};
  const P = {
    dir: 'side', robe: SANB, hood: SANB, skin: R.skin, headwear: 'none', trim: R.cord,
    width: 6, shoulder: 4, tall: 1, feet: true, eyeColor: 0x1a0604, eyesGlow: null, nose: true,
    armF: { x: 3, y: 4 }, armB: { x: -1, y: 5 }, ...pose,
  };
  if (anim === 'idle') P.bob = [0, 0, 1, 1][i];
  if (anim === 'move') { P.hem = [-1, -0.4, 0.6, 1][i]; P.bob = [0, 1, 0, 1][i]; P.lean = 1; }
  if (anim === 'windup') { P.armF = { x: 4, y: -2 }; P.armB = { x: -2, y: -5 }; P.lean = -1; }
  if (anim === 'cast') { P.armF = { x: 5, y: -1 }; P.armB = { x: -2, y: -8 + (i % 2) }; P.bob = i % 2; }
  if (anim === 'attack') { P.armF = [{ x: -2, y: 1 }, { x: 6, y: 0 }, { x: 5, y: 3 }][i]; P.armB = { x: 3, y: -1 }; }
  if (anim === 'hurt') { P.lean = -2; P.bob = 1; }
  const cx = 14;
  drawFigure(c, e, { cx, baseY: c.h - 2, ...P });
  // painted flames on the sanbenito (penitents condemned to the fire)
  const top = c.h - 2 - 17 - 1 + (P.bob || 0) + (P.crouch || 0);
  const motifs = [[cx - 3, top + 14], [cx + 1, top + 12], [cx - 1, top + 9]];
  for (const [mx, my] of motifs) {
    const x0 = mx + (P.lean || 0);
    if (!c.alpha(x0, my)) continue;
    c.set(x0, my, R.crimson[3]); c.set(x0 - 1, my, R.crimson[2]); c.set(x0 + 1, my, R.crimson[2]);
    c.set(x0, my - 1, R.crimson[4]); c.set(x0 + 1, my - 2, R.crimson[3]); c.set(x0 - 1, my - 2, R.crimson[2]);
  }
  // a painted saltire on the chest
  c.set(cx + (P.lean || 0), top + 3, R.crimson[3]); c.set(cx + 2 + (P.lean || 0), top + 3, R.crimson[3]);
  c.set(cx + 1 + (P.lean || 0), top + 4, R.crimson[4]);
  c.set(cx + (P.lean || 0), top + 5, R.crimson[3]); c.set(cx + 2 + (P.lean || 0), top + 5, R.crimson[3]);
  // burning scalp
  const hx = cx + (P.lean || 0) + 1, hy = top - 4;
  const heat = anim === 'cast' || anim === 'windup' ? 2 : 1;
  flame(c, e, hx, hy - 2, 4 + heat * 2 + (i % 2), i + (anim === 'move' ? 3 : 0), EMB, 2);
  flame(c, e, hx + 2, hy - 1, 2 + heat, i + 2, EMB, 1);
  // the tome
  const sx = cx + 1 + (P.lean || 0), sy = top + 2;
  if (anim === 'cast' || anim === 'windup') tome(c, e, sx + 6, sy - 3 + (i % 2), anim === 'cast' ? 2 : 1, true, i);
  else if (anim === 'death') { if (i < 3) tome(c, e, sx + 4 + i, sy + 4 + i * 3, 0, i < 2, i); }
  else tome(c, e, sx + P.armF.x + 1, sy + P.armF.y - 4 + (anim === 'idle' ? (i >> 1) : 0), 0, true, i);
  c.selout(0x0b0709, 0.25);
}

export function herejeSheet() {
  return getSheet('en_hereje', () => {
    const A = (name, frames, fps, loop = true) => ({ frames, fps, loop, draw: (c, e, i, n) => herejeBody(c, e, name, i, n) });
    return new SpriteSheet({
      w: 32, h: 40, emissive: true,
      anims: {
        idle: A('idle', 4, 5),
        move: A('move', 4, 8),
        windup: A('windup', 2, 6, false),
        cast: A('cast', 4, 8),
        attack: A('attack', 3, 12, false),
        hurt: A('hurt', 1, 1),
        death: { frames: 6, fps: 9, loop: false, draw: (c, e, i, n) => { herejeBody(c, e, 'death', i, n); burnAway(c, e, Math.max(0, (i - 1) / 4.5)); } },
      },
    });
  });
}

export const HEREJIA_RAMPS = { SHROUD, CHAR, CBONE, GAUNT, LEATHER, SANB, RUST };
// keep tree-shakers honest about helpers some sheets may share
export { pk as herejiaPick, mix as _mix, toHex as _toHex };
