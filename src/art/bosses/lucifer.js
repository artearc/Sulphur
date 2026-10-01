// LUCIFER — "Lo 'mperador del doloroso regno da mezzo 'l petto uscia fuor de la ghiaccia".
// Waist-deep in Cocytus. Three faces (vermilion, pale yellow, black), each chewing a traitor;
// six featherless bat wings whose beating freezes the lake; tears and bloody slaver down three chins.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer, mix } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const W = 208, H = 168;
const SKIN = [0x06040c, 0x0e0a1a, 0x1a1430, 0x2a2248, 0x3c3462, 0x544a80];       // bruised violet of the fallen angel
const WING = [0x020103, 0x07040a, 0x0e0814, 0x180e20, 0x24162e];
const ICE = R.ice;
const RED = [0x2a0204, 0x5a0408, 0x8a0c10, 0xb81c1c, 0xe0402e];
const YEL = [0x3a3218, 0x6a5c30, 0x9a8a52, 0xc8b878, 0xe8dcaa];
const BLK = [0x020203, 0x08080a, 0x121216, 0x1e1e24, 0x2a2a32];

function wing(c, e, cx, cy, side, spread, lift, scale) {
  // a bat wing: arm bone + 4 finger bones with membrane between
  const sx = side;
  const ax = cx + sx * 26 * scale, ay = cy - 30 * scale - lift;
  c.thickLine(cx, cy, ax, ay, 2.4 * scale, WING[3]);
  const fingers = [];
  for (let k = 0; k < 4; k++) {
    const a = (-1.4 + k * 0.42) * (1 + spread * 0.25);
    const len = (52 - k * 6) * scale * (0.8 + spread * 0.25);
    const fx = ax + sx * Math.cos(a) * len, fy = ay + Math.sin(a) * len + k * 6 * scale;
    fingers.push([fx, fy]);
  }
  // membrane: fill triangles between body, wrist and fingertips
  const anchor = [cx + sx * 6 * scale, cy + 30 * scale];
  const poly = [[cx, cy], [ax, ay], ...fingers, anchor];
  c.poly(poly, null, (x, y) => {
    const t = Math.abs(x - cx) / (70 * scale);
    let f = 2.2 - t * 1.4 + (y - ay) * 0.006;
    // veins
    if (Math.abs(Math.sin((x - ax) * 0.12 + (y - ay) * 0.05)) < 0.06) f -= 1;
    return pk(WING, f, x, y);
  });
  // scalloped trailing edge
  for (let k = 0; k < fingers.length; k++) {
    const [fx, fy] = fingers[k];
    c.thickLine(ax, ay, fx, fy, 1.1 * scale, WING[4]);
    c.set(fx, fy, R.bone[1]);
  }
  // frost forming on the membrane edges
  for (let k = 0; k < 10; k++) { const [fx, fy] = fingers[k % 4]; c.set(fx - sx * k * 1.5, fy + k * 0.8, ICE[4]); }
}

function face(c, e, cx, cy, ramp, o) {
  // o: { open, chew, eyes, traitor: 'head'|'legs' }
  c.ellipse(cx, cy, 13, 15, null, (nx, ny, x, y) => pk(ramp, 3.6 - nx * 1.1 - ny * 1.2, x, y));
  // brow ridge and horns
  c.hline(cx - 9, cx + 9, cy - 5, ramp[0]);
  for (const s of [-1, 1]) {
    c.thickLine(cx + s * 8, cy - 11, cx + s * 14, cy - 22, 2, BLK[3]);
    c.thickLine(cx + s * 14, cy - 22, cx + s * 12, cy - 30, 1.2, BLK[4]);
  }
  // eyes (weeping)
  const ey = o.eyes ?? 0xff2030;
  for (const s of [-1, 1]) {
    c.rect(cx + s * 5 - 1, cy - 3, 3, 2, ey);
    if (e) e.rect(cx + s * 5 - 1, cy - 3, 3, 2, ey);
    c.vline(cx + s * 5, cy - 1, cy + 6 + (o.chew || 0) % 2, ICE[5]);                // tears freezing
    if (e) e.set(cx + s * 5, cy + 4, ICE[3]);
  }
  // mouth chewing a traitor
  const open = o.open ?? 3;
  c.ellipse(cx, cy + 8, 8, 2 + open, 0x100206);
  for (let k = -3; k <= 3; k++) { c.set(cx + k * 2, cy + 6, R.bone[4]); c.set(cx + k * 2, cy + 8 + open, R.bone[3]); }
  if (o.traitor === 'head') {
    // Judas: head inside the mouth, legs kicking out
    const kick = (o.chew || 0) % 2;
    c.thickLine(cx - 1, cy + 9 + open, cx - 4 - kick, cy + 22, 1.4, mix(R.skinPale[2], [80, 40, 40], 0.3));
    c.thickLine(cx + 2, cy + 9 + open, cx + 5 + kick, cy + 22, 1.4, mix(R.skinPale[2], [80, 40, 40], 0.3));
  } else if (o.traitor === 'legs') {
    // Brutus/Cassius: head hanging out, body in the jaws
    c.ellipse(cx + (o.side || 1) * 3, cy + 16 + open, 3, 3.4, R.skinPale[2]);
    c.set(cx + (o.side || 1) * 3 - 1, cy + 16 + open, 0x0a1428);
  }
  // bloody slaver dripping down the chin, freezing
  for (let k = 0; k < 4; k++) { c.vline(cx - 4 + k * 3, cy + 10 + open, cy + 14 + open + ((k + (o.chew || 0)) % 3) * 2, R.blood[3]); c.set(cx - 4 + k * 3, cy + 15 + open + ((k + (o.chew || 0)) % 3) * 2, ICE[5]); }
  if (o.glow && e) e.ellipse(cx, cy + 8, 6, 1 + open * 0.6, o.glow);
}

function lucifer(c, e, p) {
  const cx = W / 2, waist = H - 30;
  const beat = p.beat ?? 0;            // wing phase: -1 up .. 1 down
  const bob = p.bob || 0;
  const corr = p.corr || 0;            // phase 3 corruption
  // six wings: three pairs stacked behind
  for (let pair = 0; pair < 3; pair++) {
    const scale = 1 - pair * 0.18;
    const ly = waist - 70 + pair * 12 + bob;
    for (const s of [-1, 1]) wing(c, e, cx + s * (10 + pair * 4), ly, s, beat * (pair === 1 ? 0.6 : 1), (beat > 0 ? -beat * 8 : -beat * 12) * scale, scale * 1.05);
  }
  // torso rising from the ice
  const top = waist - 74 + bob;
  c.poly([[cx - 34, top + 22], [cx + 34, top + 22], [cx + 40, waist + 4], [cx - 40, waist + 4]], null, (x, y) => {
    let f = 3.4 - (x - cx + 40) * 0.035 - (y - top) * 0.012;
    if (Math.abs(x - cx) < 1.2 && y > top + 30) f -= 1.2;                       // sternum
    if (Math.abs(Math.sin((x - cx) * 0.18)) < 0.12 && y > top + 34 && y < top + 58) f -= 0.7;   // ribs
    if (corr && bayer(x * 2, y) < corr * 0.4) return pk([0x200008, 0x5a0418, 0xa0102a], 2, x, y);
    return pk(SKIN, f, x, y);
  });
  // corruption veins (phase 3)
  if (corr) for (let k = 0; k < 30 * corr; k++) { const x = cx - 34 + ((k * 13) % 68), y = top + 26 + ((k * 7) % 44); c.set(x, y, 0xff1030); if (e) e.set(x, y, 0xa00820); }
  // chest hair of icicles
  for (let k = 0; k < 14; k++) c.vline(cx - 26 + k * 4, top + 24, top + 28 + (k % 3) * 2, ICE[4]);
  // arms gripping the ice / raised
  const arms = p.arms || 'grip';
  const arm = (s, hx, hy) => {
    c.thickLine(cx + s * 32, top + 30, hx, hy, 6, SKIN[2 + (s > 0 ? 1 : 0)]);
    c.disc(hx, hy, 7, SKIN[3]);
    for (let k = -1; k <= 1; k++) c.thickLine(hx + s * 2, hy + 2, hx + s * 9, hy + 8 + k * 4, 1.2, R.bone[3]);
  };
  if (arms === 'grip') { arm(-1, cx - 58, waist - 4); arm(1, cx + 58, waist - 4); }
  else if (arms === 'raise') { arm(-1, cx - 62, top - 6); arm(1, cx + 62, top - 6); }
  else if (arms === 'slam') { arm(-1, cx - 50, waist + 6); arm(1, cx + 50, waist + 6); }
  else if (arms === 'reach') { arm(-1, cx - 58, waist - 4); arm(1, cx + 44, waist + 2); }
  // the three faces on one head: center red, right pale yellow, left black
  const hy = top + 6;
  const f = p.faces || {};
  face(c, e, cx - 24, hy + 6, BLK, { open: f.b ?? 3, chew: p.chew, eyes: 0xd060ff, traitor: 'legs', side: -1, glow: f.bGlow, ...(f.bo || {}) });
  face(c, e, cx + 24, hy + 6, YEL, { open: f.y ?? 3, chew: (p.chew || 0) + 1, eyes: 0x9ad8ff, traitor: 'legs', side: 1, glow: f.yGlow, ...(f.yo || {}) });
  face(c, e, cx, hy, RED, { open: f.r ?? 4, chew: p.chew, eyes: 0xff2030, traitor: 'head', glow: f.rGlow, ...(f.ro || {}) });
  // the frozen lake: waist sunk in Cocytus
  c.ellipse(cx, H - 18, 98, 16, null, (nx, ny, x, y) => {
    if (y < waist - 2) return null;
    let f = 4 - ny * 1.6 - Math.abs(nx) * 0.6;
    if (Math.abs(Math.sin(x * 0.11 + y * 0.4)) < 0.05) f = 1.5;                 // cracks
    if (p.crack && Math.abs(Math.sin(x * 0.05 - y * 0.3 + 1)) < 0.08) return 0xff1030;
    return pk(ICE, f, x, y);
  });
  // frozen sinners in the ice around him
  for (const [fx, fy] of [[cx - 70, H - 12], [cx + 66, H - 10], [cx - 40, H - 6], [cx + 30, H - 5]]) {
    c.ellipse(fx, fy, 3, 3.2, mix(R.skinPale[2], [154, 200, 230], 0.5));
    c.set(fx - 1, fy, 0x0a1428); c.set(fx + 1, fy, 0x0a1428);
  }
  if (p.crack && e) for (let x = 20; x < W - 20; x += 3) { const y = H - 18 + Math.round(Math.sin(x * 0.09) * 6); if (c.alpha(x, y)) e.set(x, y, 0x800818); }
}

export function luciferSheet() {
  return getSheet('boss_lucifer', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 8, fps: 5, draw: (c, e, i) => lucifer(c, e, { beat: Math.sin(i / 8 * Math.PI * 2) * 0.5, bob: i < 4 ? 0 : 1, chew: i }) },
      move: { frames: 8, fps: 5, draw: (c, e, i) => lucifer(c, e, { beat: Math.sin(i / 8 * Math.PI * 2) * 0.5, bob: i < 4 ? 0 : 1, chew: i }) },
      beat: { frames: 6, fps: 10, draw: (c, e, i) => lucifer(c, e, { beat: Math.sin(i / 6 * Math.PI * 2), bob: i % 2, chew: i, arms: 'raise' }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => lucifer(c, e, { beat: -0.8, arms: 'raise', chew: i, faces: { r: 6, y: 5, b: 5 } }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => lucifer(c, e, { beat: 0.8, arms: i === 0 ? 'raise' : 'slam', bob: 2 - i, chew: i }) },
      claw: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => lucifer(c, e, { beat: 0.2, arms: 'reach', chew: i }) },
      faceR: { frames: 4, fps: 8, draw: (c, e, i) => lucifer(c, e, { beat: 0, chew: i, faces: { r: 8 + (i % 2), rGlow: 0xff3010, ro: { traitor: 'none' } } }) },
      faceY: { frames: 4, fps: 8, draw: (c, e, i) => lucifer(c, e, { beat: 0, chew: i, faces: { y: 7 + (i % 2), yGlow: 0x9ad8ff, yo: { traitor: 'none' } } }) },
      faceB: { frames: 4, fps: 8, draw: (c, e, i) => lucifer(c, e, { beat: 0, chew: i, faces: { b: 7 + (i % 2), bGlow: 0x8030c0, bo: { traitor: 'none' } } }) },
      roar: { frames: 6, fps: 10, draw: (c, e, i) => lucifer(c, e, { beat: Math.sin(i), arms: 'raise', bob: i % 2, chew: i, faces: { r: 9, y: 7, b: 7, rGlow: 0xff3010 } }) },
      crack: { frames: 6, fps: 8, draw: (c, e, i) => lucifer(c, e, { beat: Math.sin(i / 6 * Math.PI * 2), corr: 0.6 + (i % 2) * 0.2, crack: true, chew: i, arms: i % 2 ? 'raise' : 'grip', faces: { r: 6, rGlow: 0x800010 } }) },
      corrupt: { frames: 8, fps: 6, draw: (c, e, i) => lucifer(c, e, { beat: Math.sin(i / 8 * Math.PI * 2) * 0.6, corr: 1, crack: true, chew: i, bob: i < 4 ? 0 : 1 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => lucifer(c, e, { beat: 0.3, bob: 2, faces: { r: 6, y: 5, b: 5 } }) },
      death: { frames: 8, fps: 4, loop: false, draw: (c, e, i) => { lucifer(c, e, { beat: 1 - i * 0.2, bob: i * 3, crack: i > 2, arms: 'slam', chew: 0, faces: { r: 2, y: 1, b: 1 } }); freeze(c, e, i / 7); } },
    },
  }));
}

// death: he freezes solid from the edges inward
function freeze(c, e, k) {
  if (k <= 0) return;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.alpha(x, y)) continue;
    const d = Math.min(x, c.w - x, y) / 60;
    if (d < k * 1.2 + (bayer(x, y) - 0.5) * 0.2) { c.set(x, y, pk(ICE, 3 + ((x + y) % 3 === 0 ? 1.5 : 0), x, y)); if (e) e.set(x, y, 0x101820); }
  }
}
