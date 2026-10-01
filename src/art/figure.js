// The SULPHUR "hand": one parametric robed-figure painter shared by Dante, Virgil, Beatrice and
// the damned, so every human silhouette in the Inferno is drawn with the same rules
// (ink outline, top-left light, ramp shading with Bayer dither, robe folds, hem motion).
import { bayer, hex } from './pixel.js';
import { R } from './palette.js';

const clampi = (v, a, b) => Math.max(a, Math.min(b, v));
const rampAt = (ramp, f, x, y, d = 0.7) => ramp[clampi(Math.round(f + (bayer(x, y) - 0.5) * d), 0, ramp.length - 1)];

/**
 * P: {
 *  dir: 'down'|'up'|'side', bob, lean, hem (-1..1), crouch (0..),
 *  robe, hood, skin (ramps), trim (ramp|null), headwear: 'dante'|'hood'|'veil'|'bare'|'crown'|'horns'|'none',
 *  laurel, beard, hair (ramp), staff, armF:{x,y}, armB:{x,y}, width (robe hem half-width), tall (extra height),
 *  eyeColor, eyesGlow, ghost, cx, baseY
 * }
 */
export function drawFigure(c, e, P) {
  const dir = P.dir || 'down';
  const bob = P.bob || 0;
  const lean = P.lean || 0;
  const cx = P.cx ?? Math.floor(c.w / 2);
  const baseY = P.baseY ?? c.h - 2;              // hem line
  const tall = P.tall || 0;
  const crouch = P.crouch || 0;
  const robe = P.robe || R.danteRobe;
  const hood = P.hood || robe;
  const skin = P.skin || R.skin;
  const hw = P.width ?? 6;                         // half width at hem
  const sw = P.shoulder ?? 4;                      // half width at shoulders
  const top = baseY - 17 - tall + bob + crouch;    // shoulder line
  const headY = top - 4;                           // head center
  const side = dir === 'side';
  const back = dir === 'up';
  const hem = P.hem || 0;
  const L = side ? lean : 0;

  // ---- back arm (behind body) ----
  if (P.armB && !back) drawArm(c, cx + (side ? -1 : -sw) + L, top + 2, P.armB, robe, skin, side ? 1 : -1, true);

  // ---- robe body ----
  const tx0 = cx - sw + L, tx1 = cx + sw + L;
  const hemShift = side ? Math.round(hem * 1.5) : 0;
  const bx0 = cx - hw - (side ? 1 : 0) + hemShift + (dir === 'down' ? -Math.round(hem) : 0);
  const bx1 = cx + hw + (side ? 1 : 0) + hemShift + (dir === 'down' ? Math.round(hem) : 0);
  const pts = [[tx0, top], [tx1 + 1, top], [bx1 + 1, baseY + 1], [bx0, baseY + 1]];
  c.poly(pts, null, (x, y) => {
    const t = (y - top) / Math.max(1, baseY - top);
    const lx = tx0 + (bx0 - tx0) * t, rx = tx1 + (bx1 - tx1) * t;
    const u = (x - lx) / Math.max(1, rx - lx);   // 0 left .. 1 right
    let f = (1 - u) * 2.2 + 1.6 - t * 0.6;        // lit from left
    if (back) f -= 0.5;
    // folds: thin darker vertical lines that open toward the hem
    const folds = side ? [0.35, 0.7] : [0.3, 0.5, 0.72];
    for (const fu of folds) if (Math.abs(u - fu - hem * 0.04 * t) < 0.06 && t > 0.25) f -= 1.3;
    if (y >= baseY) f -= 1.4;                       // hem shadow
    if (y === top) f += 0.6;
    return rampAt(robe, f, x, y);
  });

  // belt / cord
  if (P.trim) {
    const by = top + 6;
    const t = (by - top) / (baseY - top);
    const lx = Math.round(tx0 + (bx0 - tx0) * t), rx = Math.round(tx1 + (bx1 - tx1) * t);
    for (let x = lx; x <= rx; x++) c.set(x, by, P.trim[(x + by) % 2 ? 1 : 2]);
    if (!back) {
      const kx = side ? rx - 1 : cx + 1;
      c.set(kx, by + 1, P.trim[2]); c.set(kx, by + 2, P.trim[1]); c.set(kx + (side ? 0 : 1), by + 3, P.trim[1]);
    }
  }
  if (P.stole) { // vertical stole/trim down the front
    if (!back) {
      const sx = side ? tx1 - 1 : cx;
      for (let y = top + 1; y < baseY; y++) c.set(sx, y, P.stole[(y % 3) ? 2 : 3]);
    }
  }

  // feet peeking under hem (walk)
  if (P.feet !== false) {
    const fy = baseY + 1;
    const fc = 0x1c1214;
    if (side) {
      const f = Math.round(hem * 2);
      c.set(cx + 2 + f + L, fy, fc); c.set(cx + 3 + f + L, fy, fc);
      c.set(cx - 2 - f + L, fy, fc);
    } else if (!back) {
      c.set(cx - 2, fy - (hem > 0.3 ? 1 : 0), fc); c.set(cx + 2, fy - (hem < -0.3 ? 1 : 0), fc);
    }
  }

  // ---- head ----
  drawHead(c, e, { ...P, cx: cx + L + (side ? 1 : 0), cy: headY, dir, hood, skin });

  // ---- front arm ----
  if (P.armF && !back) drawArm(c, cx + (side ? 1 : sw) + L, top + 2, P.armF, robe, skin, 1, false);
  if (back && P.armF) {
    drawArm(c, cx + sw + L, top + 2, P.armF, robe, skin, 1, false);
    if (P.armB) drawArm(c, cx - sw + L, top + 2, P.armB, robe, skin, -1, false);
  }
  if (P.staff) drawStaff(c, e, cx + (side ? 4 : sw + 2) + L + (P.armF?.x || 0), top + 2 + (P.armF?.y ?? 4), P.staff, baseY);
}

function drawArm(c, sx, sy, a, robe, skin, s, behind) {
  const hx = sx + (a.x ?? 0), hy = sy + (a.y ?? 5);
  const col = behind ? robe[1] : robe[3];
  const col2 = behind ? robe[0] : robe[2];
  c.thickLine(sx, sy, hx, hy - 1, 1, col);
  c.line(sx + (s > 0 ? 1 : -1), sy + 1, hx + (s > 0 ? 1 : -1), hy - 1, col2);
  // hand
  if (a.hand !== false) {
    c.set(hx, hy, skin[behind ? 1 : 3]);
    c.set(hx + (s > 0 ? 1 : 0), hy, skin[behind ? 1 : 2]);
    c.set(hx, hy + 1, skin[1]);
  }
}

function drawStaff(c, e, x, y, staff, baseY) {
  const wood = staff.ramp || R.wood;
  for (let yy = y - 9; yy <= baseY + 1; yy++) c.set(x, yy, wood[(yy % 4 === 0) ? 2 : 3]);
  c.set(x + 1, y - 9, wood[2]); c.set(x - 1, y - 8, wood[2]);
  if (staff.lantern) {
    c.rect(x - 1, y - 12, 3, 3, staff.lantern[1]);
    c.set(x, y - 11, staff.lantern[3]);
    if (e) { e.set(x, y - 11, staff.lantern[3]); e.set(x, y - 12, staff.lantern[2], 160); }
  }
}

export function drawHead(c, e, P) {
  const { cx, cy, dir, hood, skin } = P;
  const side = dir === 'side', back = dir === 'up';
  const hw = P.headwear || 'dante';
  const eyeCol = P.eyeColor ?? 0x120a0c;

  // base skull / face
  if (!back) {
    if (side) {
      c.ellipse(cx + 1, cy + 1, 2.6, 3.0, null, (nx, ny, x, y) => rampAt(skin, 2.6 - nx * 0.6 - ny * 0.8, x, y, 0.5));
      // aquiline nose (Dante's profile)
      if (P.nose !== false) { c.set(cx + 4, cy + 1, skin[2]); c.set(cx + 4, cy, skin[3]); }
      c.set(cx + 3, cy, eyeCol);
      if (P.eyesGlow && e) e.set(cx + 3, cy, P.eyesGlow);
      c.set(cx + 2, cy + 3, skin[1]); // jaw shadow
    } else {
      c.ellipse(cx, cy + 1, 2.8, 3.1, null, (nx, ny, x, y) => rampAt(skin, 2.8 - nx * 0.9 - ny * 0.7, x, y, 0.5));
      c.set(cx - 1, cy + 1, eyeCol); c.set(cx + 1, cy + 1, eyeCol);
      c.set(cx - 1, cy, skin[1]); c.set(cx + 1, cy, skin[1]); // brow shadow
      if (P.eyesGlow && e) { e.set(cx - 1, cy + 1, P.eyesGlow); e.set(cx + 1, cy + 1, P.eyesGlow); }
      c.set(cx, cy + 3, skin[1]);
    }
    if (P.beard) {
      const b = P.beard;
      if (side) { c.rect(cx, cy + 3, 3, 2, b[1]); c.set(cx + 1, cy + 5, b[0]); c.set(cx + 2, cy + 3, b[2]); }
      else { c.rect(cx - 2, cy + 3, 5, 2, b[1]); c.rect(cx - 1, cy + 5, 3, 1, b[0]); c.set(cx, cy + 3, b[2]); }
    }
  }

  const H = (nx, ny, x, y) => rampAt(hood, 3.3 - nx * 1.2 - ny * 1.3, x, y, 0.6);
  if (hw === 'dante' || hw === 'hood') {
    // the cappuccio: hood framing the face with the hanging becchetto tail
    if (side) {
      c.ellipse(cx - 1, cy - 1, 4.2, 4.2, null, H);
      // open face area
      c.ellipse(cx + 2, cy + 1, 2.1, 2.6, null, (nx, ny, x, y) => rampAt(skin, 2.7 - nx * 0.6 - ny * 0.8, x, y, 0.5));
      c.set(cx + 3, cy, eyeCol);
      if (P.eyesGlow && e) e.set(cx + 3, cy, P.eyesGlow);
      if (P.nose !== false) { c.set(cx + 4, cy + 1, skin[2]); c.set(cx + 4, cy, skin[3]); }
      c.set(cx + 4, cy - 2, hood[3]); c.set(cx + 3, cy - 3, hood[4]);
      if (hw === 'dante') { // becchetto tail
        c.line(cx - 4, cy + 1, cx - 6, cy + 6, hood[2]);
        c.line(cx - 5, cy + 1, cx - 7, cy + 5, hood[1]);
      }
    } else if (back) {
      c.ellipse(cx, cy - 0.5, 4.3, 4.4, null, (nx, ny, x, y) => rampAt(hood, 2.6 - nx * 1.1 - ny * 1.0, x, y, 0.6));
      if (hw === 'dante') { c.vline(cx, cy + 3, cy + 8, hood[1]); c.vline(cx + 1, cy + 3, cy + 7, hood[2]); }
      c.set(cx - 3, cy - 3, hood[4]);
    } else {
      // front: hood frames face
      c.ellipse(cx, cy - 0.5, 4.4, 4.4, null, H);
      c.ellipse(cx, cy + 1.2, 2.5, 2.7, null, (nx, ny, x, y) => rampAt(skin, 2.8 - nx * 0.9 - ny * 0.7, x, y, 0.5));
      c.set(cx - 1, cy + 1, eyeCol); c.set(cx + 1, cy + 1, eyeCol);
      if (P.eyesGlow && e) { e.set(cx - 1, cy + 1, P.eyesGlow); e.set(cx + 1, cy + 1, P.eyesGlow); }
      c.set(cx, cy + 3, skin[1]);
      c.set(cx - 3, cy - 3, hood[4]); c.set(cx - 2, cy - 4, hood[4]);
    }
  } else if (hw === 'veil') {
    const v = P.veil || R.beatriceVeil;
    const VS = (nx, ny, x, y) => rampAt(v, 3 - nx * 1.0 - ny * 1.2, x, y, 0.6);
    c.ellipse(cx + (side ? -1 : 0), cy - 0.5, 4.2, 4.3, null, VS);
    if (!back) c.ellipse(cx + (side ? 2 : 0), cy + 1.2, 2.3, 2.6, null, (nx, ny, x, y) => rampAt(skin, 3 - nx * 0.8 - ny * 0.6, x, y, 0.5));
    if (!back) {
      if (side) c.set(cx + 3, cy + 1, eyeCol); else { c.set(cx - 1, cy + 1, eyeCol); c.set(cx + 1, cy + 1, eyeCol); }
    }
    // veil falls to shoulders
    c.rect(cx - 4 + (side ? -1 : 0), cy + 2, 2, 4, v[1]);
    if (!side) c.rect(cx + 3, cy + 2, 2, 4, v[1]);
  } else if (hw === 'bare' || hw === 'crown' || hw === 'horns') {
    const hair = P.hair || [0x1a1414, 0x2e2420, 0x463630];
    if (back) c.ellipse(cx, cy, 3.2, 3.4, null, (nx, ny, x, y) => rampAt(hair, 1.6 - nx - ny, x, y));
    else {
      // hair cap on top/back
      c.ellipse(cx + (side ? -1 : 0), cy - 2, 3.2, 2.0, null, (nx, ny, x, y) => rampAt(hair, 1.8 - nx - ny, x, y));
      if (side) c.rect(cx - 3, cy - 1, 2, 3, hair[0]);
    }
    if (hw === 'crown') {
      const g = R.gold;
      c.hline(cx - 3, cx + 3, cy - 3, g[3]);
      c.set(cx - 3, cy - 4, g[4]); c.set(cx, cy - 5, g[5]); c.set(cx + 3, cy - 4, g[4]); c.set(cx, cy - 4, g[3]);
    }
    if (hw === 'horns') {
      const hr = P.hornRamp || R.bone;
      c.line(cx - 3, cy - 2, cx - 5, cy - 6, hr[2]); c.set(cx - 5, cy - 7, hr[4]);
      c.line(cx + 3, cy - 2, cx + 5, cy - 6, hr[2]); c.set(cx + 5, cy - 7, hr[4]);
    }
  }

  // laurel crown
  if (P.laurel) {
    const lr = R.laurel;
    const y = cy - 3;
    if (side) {
      for (let i = -3; i <= 2; i++) c.set(cx + i, y + (i % 2 ? 0 : -1), lr[(i + 9) % 2 ? 3 : 4]);
      c.set(cx - 4, y + 1, lr[2]);
    } else if (back) {
      for (let i = -4; i <= 4; i++) c.set(cx + i, y + 1 + (Math.abs(i) > 3 ? 1 : 0), lr[(i + 9) % 2 ? 2 : 3]);
    } else {
      for (let i = -4; i <= 4; i++) c.set(cx + i, y + (Math.abs(i) > 3 ? 1 : 0) + ((i + 9) % 2 ? -1 : 0), lr[(i + 9) % 2 ? 3 : 4]);
    }
  }
}

// Standard animation pose table for humanoids
export function figurePose(anim, i, n) {
  switch (anim) {
    case 'idle': return { bob: [0, 0, 1, 1][i % 4], hem: 0 };
    case 'run': return { bob: [0, 1, 1, 0, 1, 1][i % 6], hem: [-1, -0.4, 0.6, 1, 0.4, -0.6][i % 6], lean: 1 };
    case 'attack': return [
      { lean: -1, bob: 0, armF: { x: -3, y: 2 } },
      { lean: 2, bob: 1, armF: { x: 5, y: 1 }, hem: 0.6 },
      { lean: 1, bob: 0, armF: { x: 3, y: 4 }, hem: 0.3 },
    ][i];
    case 'heavy': return [
      { lean: -2, bob: 2, crouch: 1, armF: { x: -4, y: -3 } },
      { lean: -2, bob: 2, crouch: 1, armF: { x: -4, y: -4 } },
      { lean: 3, bob: 1, armF: { x: 6, y: 2 }, hem: 1 },
      { lean: 2, bob: 0, armF: { x: 4, y: 4 }, hem: 0.5 },
    ][i];
    case 'dash': return [{ lean: 3, bob: 2, hem: -1.5 }, { lean: 2, bob: 1, hem: -1 }][i];
    case 'hurt': return [{ lean: -2, bob: 1 }, { lean: -1, bob: 0 }][i];
    case 'cast': return [
      { bob: 1, armF: { x: 2, y: -2 }, armB: { x: -2, y: -2 } },
      { bob: 0, armF: { x: 3, y: -6 }, armB: { x: -3, y: -6 } },
      { bob: 0, armF: { x: 2, y: -4 }, armB: { x: -2, y: -4 } },
    ][i];
    case 'death': {
      const t = i / (n - 1);
      return { bob: Math.round(t * 9), crouch: 0, lean: -Math.round(t * 2), hem: -t };
    }
    default: return {};
  }
}
