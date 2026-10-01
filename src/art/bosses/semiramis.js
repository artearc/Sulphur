// SEMÍRAMIS, Reina del Torbellino — "che libito fé licito in sua legge" (Inf. V, 56).
// A towering empress whose hips unravel into the infernal storm: a funnel of entwined lovers
// spiralling down to a single point on the floor. Babylonian stepped crown, kohl-dark eyes,
// crimson and violet silks forever whipped behind her by the bufera.
import { SpriteSheet, getSheet, makeTexture } from '../sheet.js';
import { R, CIRCLE_PALETTES } from '../palette.js';
import { PixelCanvas, bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const LUJ = CIRCLE_PALETTES.lujuria;
const ROSE = LUJ.accent;                 // magenta silks of desire
const SKY = LUJ.accent2;                 // blue-lilac storm sheen
const STORM = [R.shadow[1], R.violet[1], R.violet[2], R.violet[3], R.violet[4], R.violet[5]];
const HAIR = [R.shadow[0], R.shadow[2], R.violet[0], R.violet[1], R.violet[2]];
const SKIN = [0x2c2232, 0x5a4a62, 0x8e7c96, 0xbcaabe, 0xe2d4e0];
const SILK = R.crimson;
const W = 104, H = 124;

// Storm funnel: wide under the waist, twisting down to a point. Spiral bands rotate with `ph`.
export function drawStorm(c, e, cx, top, bot, p = {}) {
  const ph = (p.ph || 0) * Math.PI * 2;
  const Hs = bot - top;
  const rTop = p.rTop ?? 22, sc = p.storm ?? 1;
  const rad = (t) => (2.5 + Math.pow(1 - t, 1.2) * rTop) * sc + Math.sin(t * 9 - ph) * 1.4 * sc;
  const off = (t) => Math.sin(t * 4.5 + ph) * 3.2 * t * sc + (p.lean || 0) * (1 - t);
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / Hs;
    const r = rad(t), ox = off(t);
    for (let x = Math.floor(cx + ox - r - 1); x <= Math.ceil(cx + ox + r + 1); x++) {
      const u = (x + 0.5 - cx - ox) / r;
      if (Math.abs(u) > 1) continue;
      if (Math.abs(u) > 0.8 && bayer(x, y) > (1 - Math.abs(u)) * 5) continue;          // ragged edge
      if (t > 0.86 && bayer(x, y + 1) < (t - 0.86) * 6) continue;                          // thinning tip
      if (p.thin && bayer(x + 2, y) < p.thin) continue;                                     // dispersing (death)
      const nz = Math.sqrt(1 - u * u);
      const th = Math.asin(u);
      const s1 = Math.sin(th * 3 + y * 0.42 - ph * 2);
      const s2 = Math.sin(th * 5 - y * 0.21 + ph * 3);
      let f = 1.3 + nz * 1.5 - u * 0.9 - t * 1.0 + (s1 > 0.55 ? 1.1 : s1 < -0.6 ? -0.9 : 0) + (s2 > 0.82 ? 0.6 : 0);
      c.set(x, y, pk(STORM, f, x, y, 0.8));
    }
  }
  // wind streaks whipping around the funnel (front arcs only)
  for (let k = 0; k < 5; k++) {
    const t = 0.08 + k * 0.18;
    const y0 = top + t * Hs, rx = rad(t) + 3, ox = off(t);
    const a0 = ph * (1.4 + k * 0.2) + k * 1.7;
    for (let a = a0; a < a0 + 2.1; a += 0.05) {
      if (Math.sin(a) < -0.15) continue;
      const x = cx + ox + Math.cos(a) * rx, y = y0 + Math.sin(a) * 2.4;
      const head = (a - a0) / 2.1;
      c.set(x, y, head > 0.7 ? SKY[3] : head > 0.35 ? SKY[2] : STORM[4]);
    }
  }
  // entwined lovers caught in the spiral — pale, half-lit souls in pairs
  const nSouls = p.souls ?? 8;
  for (let k = 0; k < nSouls; k++) {
    const tt = ((k * 0.137 + (p.ph || 0) * 0.25) % 1) * 0.72 + 0.06;
    const a = k * 2.1 + ph * (k % 2 ? 1 : 1.3);
    const front = Math.cos(a);
    if (front < -0.05) continue;
    const y = Math.round(top + tt * Hs), r = rad(tt);
    const x = Math.round(cx + off(tt) + Math.sin(a) * r * 0.82);
    const dir = Math.sin(a) > 0 ? -1 : 1;
    const fb = 1.6 + front * 2.4;
    const soul = (sx, sy, flip) => {
      c.ellipse(sx, sy, 1.4, 1.4, null, (nx, ny, px, py) => pk(R.soul, fb + 0.6 - nx - ny, px, py));
      c.line(sx - dir * flip, sy + 1, sx - dir * 4 * flip, sy + 4, pk(R.soul, fb - 0.4, sx, sy));
      c.line(sx - dir * flip, sy + 2, sx - dir * 3 * flip, sy + 5, pk(R.soul, fb - 1.2, sx, sy + 1));
      c.line(sx + dir * flip, sy, sx + dir * 3 * flip, sy - 2, pk(R.soul, fb - 0.2, sx, sy));
      if (e && front > 0.55) e.set(sx, sy, R.soul[2]);
    };
    soul(x, y, 1);
    if (k % 2 === 0) soul(x + dir * 2, y + 2, -1);       // the lover, clinging
  }
  // stray lightning inside the cloud
  if (p.crackle) {
    let lx = cx + ((p.crackle * 7) % 11) - 5, ly = top + 4;
    for (let k = 0; k < 9; k++) {
      const nx = lx + (((k * 5 + p.crackle * 3) % 7) - 3), ny = ly + 4;
      c.line(lx, ly, nx, ny, SKY[3]); if (e) e.line(lx, ly, nx, ny, SKY[2]);
      lx = nx; ly = ny;
    }
  }
}

// Silk ribbon streaming in the wind: twisting band with folds; backside darker.
function ribbon(c, x0, y0, len, w0, ramp, ph, amp, dirX = -1, rise = -0.25, droop = 0) {
  for (let s = 0; s < len; s += 0.5) {
    const k = s / len;
    const x = x0 + dirX * s;
    const y = y0 + s * rise + Math.sin(s * 0.16 - ph) * amp * k + droop * k * k * len * 0.4;
    const tw = Math.cos(s * 0.11 - ph * 0.7);
    const w = Math.max(1, w0 * (1 - k * 0.55) * (0.35 + 0.65 * Math.abs(tw)));
    for (let j = Math.round(-w / 2); j <= Math.round(w / 2); j++) {
      const across = (j + w / 2) / Math.max(1, w);
      const fold = Math.sin(s * 0.5 - ph * 2) > 0.75 ? -1 : 0;
      const f = (tw > 0 ? 3.4 : 1.9) - across * 1.5 - k * 0.9 + fold;
      if (k > 0.85 && bayer(Math.round(x), Math.round(y + j)) < (k - 0.85) * 6) continue;  // frayed tail
      c.set(x, y + j, pk(ramp, f, Math.round(x), Math.round(y + j)));
    }
  }
}

function drawSemiramis(c, e, p) {
  const cx = 52 + (p.lean || 0);
  const bob = p.bob || 0;
  const ph = (p.ph || 0) * Math.PI * 2;
  const waist = 66 + bob;
  const wind = p.wind ?? 1;
  // ---- far silk (violet) behind everything ----
  ribbon(c, cx - 6, waist - 2, 40 * wind + 8, 7, ROSE, ph + 1.2, 5, -1, -0.32, p.droop || 0);
  // long veil from the crown
  ribbon(c, cx - 3, 18 + bob, 34 * wind + 6, 5, [R.violet[1], R.violet[2], R.violet[3], R.violet[4], R.violet[5]], ph + 2.4, 4, -1, 0.15, p.droop || 0);
  // ---- hair streaming back (left) ----
  const hx = cx + 1, hy = 30 + bob;
  for (let k = 0; k < 7; k++) {
    const len = 18 + k * 3 * wind;
    let px = hx - 5, py = hy - 4 + k * 1.6;
    for (let s = 0; s < len; s++) {
      const nx = px - 1, ny = py + Math.sin(s * 0.3 - ph * 1.5 + k) * 0.7 + (p.droop ? 0.5 : 0.08);
      c.thickLine(px, py, nx, ny, s < len * 0.5 ? 1.2 : 0.6, pk(HAIR, 2.6 - k * 0.25 - s / len * 1.4, Math.round(px), Math.round(py)));
      px = nx; py = ny;
    }
  }
  // ---- the storm that is her lower body ----
  drawStorm(c, e, cx, waist + 4, 121, { ph: p.ph, lean: (p.lean || 0) * 0.5, storm: p.storm ?? 1, thin: p.thin, crackle: p.crackle, souls: p.souls });
  // skirt panels melting into the storm
  c.poly([[cx - 8, waist], [cx + 8, waist], [cx + 19, waist + 18], [cx + 6, waist + 23], [cx - 7, waist + 22], [cx - 21, waist + 17]], null, (x, y) => {
    const u = (x - (cx - 21)) / 40, t = (y - waist) / 23;
    let f = 3.6 - u * 2.2 - t * 0.6;
    if ((x - cx + 60) % 6 === 0) f -= 1.1;                       // pleats
    if ((x - cx + 60) % 6 === 1) f += 0.4;
    if (t > 0.6 && bayer(x, y) < (t - 0.6) * 2.4) return null;    // hem dissolving into wind
    return pk(ROSE, f, x, y);
  });
  // ---- bodice ----
  const top = 42 + bob;
  c.poly([[cx - 10, top], [cx + 10, top], [cx + 7, waist + 1], [cx - 8, waist + 1]], null, (x, y) => {
    const u = (x - (cx - 10)) / 20;
    let f = 4 - u * 2.6 - (y - top) * 0.02;
    if (Math.abs(x - cx) <= 0 && y > top + 3) return pk(R.gold, 3.4, x, y);
    if ((y - top) % 4 === 0 && Math.abs(x - cx) === 1) return R.gold[2];     // lacing
    return pk(SILK, f, x, y);
  });
  // décolletage + shoulders (skin)
  c.ellipse(cx, top + 1, 9, 4, null, (nx, ny, x, y) => (ny > 0.15 && Math.abs(nx) < 0.5 - ny * 0.3 ? pk(SKIN, 3.4 - nx * 1.2, x, y) : ny < 0.2 ? pk(SKIN, 3.6 - nx * 1.3 - ny, x, y) : null));
  c.rect(cx - 2, top - 6, 5, 6, SKIN[2]); c.vline(cx - 2, top - 6, top - 1, SKIN[3]); c.vline(cx + 2, top - 5, top - 1, SKIN[1]);
  // gold trims, belt with gems, necklace
  for (let x = cx - 9; x <= cx + 9; x++) c.set(x, top + 3 + Math.round(Math.abs(x - cx) * -0.25 + 2), R.gold[3]);
  for (let x = cx - 9; x <= cx + 8; x++) { c.set(x, waist, R.gold[2]); c.set(x, waist + 1, R.gold[4 - ((x + 99) % 3 === 0 ? 2 : 0)]); }
  c.set(cx, waist, R.crimson[5]); if (e) e.set(cx, waist, R.crimson[4]);
  for (let k = -5; k <= 5; k++) { const x = cx + k, y = top - 1 + Math.round(k * k * 0.08); c.set(x, y, (k & 1) ? R.gold[4] : R.gold[2]); }
  c.set(cx, top + 1, ROSE[4]); if (e) e.set(cx, top + 1, ROSE[3]);
  // the heart that still beats for her lovers (only the true queen has it)
  if (p.heart > 0 && e) {
    const hb = p.heart;
    e.ellipse(cx - 3, top + 9, 2.2 * hb + 0.4, 1.8 * hb + 0.4, ROSE[hb > 0.7 ? 4 : 3]);
    c.set(cx - 3, top + 9, ROSE[4]);
  }
  // shoulder brooches
  for (const s of [-1, 1]) { c.ellipse(cx + s * 9, top + 1, 2, 1.6, null, (nx, ny, x, y) => pk(R.gold, 4 - nx - ny * 1.4, x, y)); }
  // ---- arms ----
  const A = p.arms || 'open';
  const arm = (s, hx2, hy2) => {
    const sx = cx + s * 10, sy = top + 2;
    const ex = (sx + hx2) / 2 + s * 2, ey = (sy + hy2) / 2 + 3;
    // bell sleeve of silk hanging from the upper arm, blown back
    c.poly([[sx - 2, sy - 1], [ex + 2, ey - 1], [ex - 6 * wind, ey + 9], [sx - 5 * wind - 2, sy + 10]], null, (x, y) => pk(ROSE, 2.8 - (y - sy) * 0.08 - (s < 0 ? 0.6 : 0), x, y));
    c.thickLine(sx, sy, ex, ey, 1.6, SKIN[s < 0 ? 1 : 2]);
    c.thickLine(ex, ey, hx2, hy2, 1.2, SKIN[s < 0 ? 2 : 3]);
    c.line(sx, sy - 1, ex, ey - 1, SKIN[s < 0 ? 2 : 4]);
    // bracelet & hand
    c.set(ex + (hx2 - ex) * 0.6, ey + (hy2 - ey) * 0.6, R.gold[4]);
    c.ellipse(hx2, hy2, 1.8, 1.8, null, (nx, ny, x, y) => pk(SKIN, 3.4 - nx - ny, x, y));
    const fa = Math.atan2(hy2 - ey, hx2 - ex);
    for (let k = -1; k <= 1; k++) c.line(hx2, hy2, hx2 + Math.cos(fa + k * 0.35) * 3.2, hy2 + Math.sin(fa + k * 0.35) * 3.2, SKIN[3]);
    c.set(hx2 + Math.cos(fa) * 3.4, hy2 + Math.sin(fa) * 3.4, ROSE[2]);     // painted nails
  };
  const poses = {
    open: [[cx - 23, top + 17], [cx + 23, top + 15]],
    gather: [[cx - 10, top + 10], [cx + 12, top + 8]],
    raise: [[cx - 15, top - 24], [cx + 17, top - 26]],
    sweep: [[cx - 21, top + 12], [cx + 34, top + 2]],
    point: [[cx - 18, top + 10], [cx + 25, top + 26]],
    embrace: [[cx + 5, top + 7], [cx - 3, top + 5]],
    fall: [[cx - 14, top + 24], [cx + 14, top + 25]],
    spinL: [[cx - 30, top + 4], [cx + 22, top + 14]],
    spinR: [[cx - 22, top + 14], [cx + 30, top + 4]],
  }[A] || [[cx - 23, top + 17], [cx + 23, top + 15]];
  arm(-1, poses[0][0], poses[0][1]);
  // ---- head ----
  c.ellipse(hx, hy, 6.2, 7.6, null, (nx, ny, x, y) => pk(SKIN, 3.6 - nx * 1.4 - ny * 0.9 + (nx > 0.55 && ny > -0.2 ? -0.7 : 0), x, y));
  // hair mass framing the face (back of head, left)
  c.ellipse(hx - 3, hy - 2, 5.5, 7.5, null, (nx, ny, x, y) => (x > hx + 1 && y > hy - 5 ? null : pk(HAIR, 3 - nx - ny * 1.2, x, y)));
  for (let y = hy - 3; y < hy + 9; y++) c.set(hx - 6 + Math.round(Math.sin(y * 0.6 + ph) * 0.6), y, HAIR[2]);
  // face: kohl-lined eyes looking right, glowing with desire
  const glow = p.eyes ?? ROSE[4];
  const ey2 = hy - 1;
  for (const ex2 of [hx + 0, hx + 4]) {
    c.hline(ex2 - 1, ex2 + 1, ey2 - 1, HAIR[0]);
    c.set(ex2, ey2, glow); c.set(ex2 + 1, ey2, p.closed ? SKIN[1] : glow);
    if (e && !p.closed) { e.set(ex2, ey2, glow); e.set(ex2 + 1, ey2, glow); }
    c.set(ex2 - 1, ey2 + 1, HAIR[1]);
  }
  c.hline(hx - 1, hx + 1, ey2 - 3, HAIR[1]); c.hline(hx + 3, hx + 5, ey2 - 3, HAIR[1]);
  c.vline(hx + 3, ey2 + 1, ey2 + 3, SKIN[1]); c.set(hx + 4, ey2 + 3, SKIN[0]);
  if (p.roar) { c.rect(hx + 1, hy + 4, 4, 3, 0x0b0709); c.hline(hx + 1, hx + 4, hy + 4, SILK[4]); if (e) e.set(hx + 2, hy + 6, ROSE[1]); }
  else { c.hline(hx + 1, hx + 4, hy + 5, SILK[4]); c.set(hx + 2, hy + 4, SILK[5]); c.set(hx + 3, hy + 6, SILK[2]); }
  c.vline(hx + 6, hy, hy + 4, SKIN[1]);
  // golden ear drops
  c.vline(hx - 3, hy + 2, hy + 5, R.gold[3]); c.set(hx - 3, hy + 6, ROSE[4]); if (e) e.set(hx - 3, hy + 6, ROSE[3]);
  // ---- stepped Babylonian crown ----
  const cyb = hy - 7;
  for (let x = hx - 7; x <= hx + 7; x++) { c.set(x, cyb, R.gold[2]); c.set(x, cyb - 1, R.gold[3]); c.set(x, cyb + 1, R.gold[1]); }
  const tiers = [[7, 2], [5, 3], [3, 3], [1, 4]];
  let ty = cyb - 1;
  for (const [hw, th] of tiers) {
    for (let y = ty - th; y < ty; y++) for (let x = hx - hw; x <= hx + hw; x++) c.set(x, y, pk(R.gold, 4.2 - (x - hx + hw) / (hw * 2 + 1) * 2.4 - (ty - y) * 0.15, x, y));
    c.hline(hx - hw, hx + hw, ty - th, R.gold[5]);
    ty -= th;
  }
  // crescent finial
  c.ring(hx, ty - 3, 2.6, R.gold[4], 1); c.rect(hx - 2, ty - 1, 5, 1, R.gold[3]);
  for (const k of [-5, 0, 5]) { c.set(hx + k, cyb - 2, SILK[5]); if (e) e.set(hx + k, cyb - 2, SILK[4]); }
  c.set(hx, ty - 6, ROSE[4]); if (e) e.set(hx, ty - 6, ROSE[3]);
  // near arm over the body
  arm(1, poses[1][0], poses[1][1]);
  // ---- near silk (crimson) from the right shoulder, sweeping across and behind ----
  ribbon(c, cx + 8, top + 3, 30 * wind + 10, 6, SILK, ph, 6, -1, 0.42, p.droop || 0);
  // gathered power between the hands
  if (p.orb && e) {
    const ox = (poses[0][0] + poses[1][0]) / 2, oy = (poses[0][1] + poses[1][1]) / 2;
    c.ellipse(ox, oy, p.orb, p.orb, null, (nx, ny, x, y) => pk([SKY[1], SKY[2], SKY[3], 0xffffff], 3 - Math.hypot(nx, ny) * 3, x, y));
    e.ellipse(ox, oy, p.orb - 0.5, p.orb - 0.5, SKY[2]);
  }
  if (p.sparks && e) for (const [x, y] of poses) for (let k = 0; k < 4; k++) { const a = k * 1.6 + p.sparks; e.set(x + Math.cos(a) * 4, y + Math.sin(a) * 4, SKY[3]); c.set(x + Math.cos(a) * 4, y + Math.sin(a) * 4, SKY[3]); }
}

const heartBeat = [1, 0.55, 0.3, 0.2, 0.2, 0.7];

export function semiramisSheet(variant = 'real') {
  const real = variant === 'real';
  return getSheet('boss_semiramis_' + variant, () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 6, fps: 7, draw: (c, e, i) => drawSemiramis(c, e, { bob: [0, 0, 1, 1, 1, 0][i], ph: i / 6, heart: real ? heartBeat[i] : 0 }) },
      move: { frames: 6, fps: 9, draw: (c, e, i) => drawSemiramis(c, e, { bob: [0, 1, 1, 0, 1, 1][i], ph: i / 6, lean: 2, wind: 1.25, heart: real ? heartBeat[i] : 0 }) },
      windup: { frames: 3, fps: 7, loop: false, draw: (c, e, i) => drawSemiramis(c, e, { bob: 1, ph: i / 3, arms: 'gather', eyes: 0xffffff, orb: 1.5 + i, heart: real ? 1 : 0 }) },
      attack: { frames: 4, fps: 12, loop: false, draw: (c, e, i) => drawSemiramis(c, e, { bob: 2 - (i >> 1), ph: i / 4, arms: 'sweep', lean: 3 - i, wind: 1.5, heart: real ? 0.6 : 0 }) },
      cast: { frames: 4, fps: 9, draw: (c, e, i) => drawSemiramis(c, e, { bob: i & 1, ph: i / 4, arms: 'raise', eyes: 0xffffff, sparks: i, crackle: i + 1, heart: real ? 0.8 : 0 }) },
      point: { frames: 3, fps: 7, loop: false, draw: (c, e, i) => drawSemiramis(c, e, { bob: 0, ph: i / 3, arms: 'point', heart: real ? 1 : 0 }) },
      pull: { frames: 4, fps: 6, draw: (c, e, i) => drawSemiramis(c, e, { bob: i & 1, ph: i / 4, arms: 'embrace', closed: i % 2 === 0, wind: 0.8, heart: real ? 1 : 0.4 }) },
      spin: { frames: 6, fps: 14, draw: (c, e, i) => drawSemiramis(c, e, { bob: 0, ph: i / 6, arms: i % 2 ? 'spinL' : 'spinR', wind: 1.6, lean: i % 2 ? -2 : 2, heart: real ? 0.6 : 0 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => drawSemiramis(c, e, { bob: i & 1, ph: i / 4, arms: 'raise', roar: true, eyes: 0xffffff, wind: 1.5, crackle: i + 3, heart: real ? 1 : 0 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => drawSemiramis(c, e, { bob: 1, lean: -3, arms: 'gather', closed: true, wind: 1.3, heart: real ? 0.5 : 0 }) },
      death: { frames: 8, fps: 5, loop: false, draw: (c, e, i) => drawSemiramis(c, e, { bob: 1 + i, ph: i / 8, lean: -i * 0.6, arms: i < 3 ? 'raise' : 'fall', roar: i < 5, eyes: i < 5 ? 0xffffff : SKIN[1], storm: 1 - i * 0.09, thin: i * 0.09, souls: 8 - i, droop: i * 0.4, wind: 1 - i * 0.08, heart: Math.max(0, 1 - i * 0.2) }) },
    },
  }));
}

// Wandering whirlwind of lovers (arena hazard)
export function tornadoSheet() {
  return getSheet('semi_tornado', () => new SpriteSheet({
    w: 40, h: 64, emissive: true,
    anims: {
      idle: {
        frames: 6, fps: 14,
        draw: (c, e, i) => {
          drawStorm(c, e, 20, 4, 61, { ph: i / 6, rTop: 14, souls: 4 });
          for (let k = 0; k < 5; k++) {   // petals torn from the thorn roses
            const a = i * 1.05 + k * 1.3, y = 10 + k * 9;
            const x = 20 + Math.cos(a) * (15 - k * 2);
            if (Math.sin(a) > -0.3) { c.set(x, y, ROSE[3]); c.set(x + 1, y, ROSE[2]); }
          }
        },
      },
    },
  }));
}

// Lightning bolt that splits the storm (one-shot fx)
export function lightningSheet() {
  return getSheet('semi_bolt', () => new SpriteSheet({
    w: 32, h: 128, outline: false,
    anims: {
      play: {
        frames: 6, fps: 22, loop: false,
        draw: (c, e, i) => {
          let s = 1337 + (i < 3 ? 0 : 7);
          const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
          const k = [0.4, 1, 1, 0.8, 0.5, 0.25][i];
          let x = 16, y = 0;
          const pts = [[x, y]];
          while (y < 126) { y += 6 + rnd() * 8; x = Math.max(4, Math.min(28, x + (rnd() - 0.5) * 12)); pts.push([x, Math.min(126, y)]); }
          for (let j = 1; j < pts.length; j++) {
            const [x0, y0] = pts[j - 1], [x1, y1] = pts[j];
            if (k > 0.6) c.thickLine(x0, y0, x1, y1, 1.6 * k, R.violet[4]);
            c.thickLine(x0, y0, x1, y1, 0.8 * k + 0.2, SKY[3]);
            if (k > 0.45) c.line(x0, y0, x1, y1, 0xffffff);
            if (i > 0 && i < 5 && rnd() < 0.35) {        // branches
              let bx = x1, by = y1;
              for (let b = 0; b < 3; b++) { const nx = bx + (rnd() - 0.5) * 10, ny = by + 4 + rnd() * 4; c.line(bx, by, nx, ny, b ? SKY[2] : SKY[3]); bx = nx; by = ny; }
            }
          }
          if (i >= 1 && i <= 3) c.ellipse(16, 124, 10 * k, 3 * k, null, (nx, ny, px, py) => (Math.hypot(nx, ny) < 0.5 ? 0xffffff : SKY[3]));
        },
      },
    },
  }));
}

// "Ley del Deseo": heart sigil stamped on the floor (tinted at runtime, white = full color)
export function heartSigilTexture() {
  return getSheet('semi_heart_sigil', () => {
    const S = 64, pc = new PixelCanvas(S, S);
    const cx = 32, cy = 33;
    pc.ring(cx, cy, 30, 0xffffff, 1);
    pc.ring(cx, cy, 26, 0xc8c8c8, 1);
    for (let k = 0; k < 24; k++) {           // runic ticks between the rings
      const a = (k / 24) * Math.PI * 2;
      if (k % 3 === 0) pc.line(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, cx + Math.cos(a) * 30, cy + Math.sin(a) * 30, 0xffffff);
      else pc.set(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28, 0xa0a0a0);
    }
    // heart: two lobes + point, drawn as a thick double contour
    const heart = (t) => [16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))];
    for (let t = 0; t < Math.PI * 2; t += 0.01) {
      const [hx, hy] = heart(t);
      pc.set(cx + hx * 1.1, cy + hy * 1.1 - 2, 0xffffff);
      pc.set(cx + hx * 0.85, cy + hy * 0.85 - 1, 0xb0b0b0);
    }
    // pierced by an arrow (Amor's dart)
    pc.line(cx - 20, cy + 12, cx + 20, cy - 14, 0xe0e0e0);
    pc.line(cx + 20, cy - 14, cx + 16, cy - 14, 0xffffff); pc.line(cx + 20, cy - 14, cx + 19, cy - 10, 0xffffff);
    for (let k = 0; k < 3; k++) { pc.set(cx - 20 + k, cy + 12 - k + 2, 0xa0a0a0); pc.set(cx - 20 + k + 2, cy + 12 - k, 0xa0a0a0); }
    return { texture: makeTexture(pc), w: S, h: S };
  });
}
