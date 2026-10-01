// V · IRA bestiary art — the Styx: black mud, smoke, and souls that burn with rage until they burst.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const EMB = R.ember;
const CHAR = [0x0a0606, 0x1a0e0c, 0x2e1812, 0x46241a, 0x603226];
const MUD = [0x050808, 0x0c1414, 0x162420, 0x22342c, 0x30463c, 0x42584c];
const SMOKE = [0x0a0809, 0x1a1618, 0x2a2426, 0x3c3436, 0x524a4c, 0x6a6264];
const SKIN = [0x241818, 0x40302c, 0x604a44, 0x80665e];

// IRACUNDO — a soul swollen with fury, cracks of fire across its skin; it swells before bursting
function iraBody(c, e, p) {
  const cx = 14, by = 31;
  const swell = p.swell || 0;               // 0..1 (about to explode)
  const bob = p.bob || 0;
  const r = 6 + swell * 3;
  // legs
  c.line(cx - 2, by - 6, cx - 3 - (p.step || 0), by, CHAR[2]); c.line(cx + 2, by - 6, cx + 3 + (p.step || 0), by, CHAR[2]);
  // body
  c.ellipse(cx, by - 12 + bob, r, r + 1, null, (nx, ny, x, y) => {
    const crack = Math.abs(Math.sin(nx * 7 + ny * 5)) < 0.18 + swell * 0.2 || Math.abs(Math.sin(ny * 9 - nx * 3)) < 0.12;
    if (crack) return EMB[Math.min(5, 3 + Math.round(swell * 2))];
    return pk(CHAR, 3.4 - nx * 1.2 - ny * 1.2, x, y);
  });
  if (e) e.ellipse(cx, by - 12 + bob, r * 0.5, r * 0.6, swell > 0.5 ? EMB[3] : EMB[1]);
  // head (screaming)
  const hy = by - 12 - r + bob;
  c.ellipse(cx + 1, hy, 3.4, 3.4, null, (nx, ny, x, y) => pk(CHAR, 3.6 - nx - ny, x, y));
  c.rect(cx, hy + 1, 3, 2 + Math.round(swell * 2), 0x200402);
  c.set(cx, hy - 1, EMB[5]); c.set(cx + 2, hy - 1, EMB[5]);
  if (e) { e.set(cx, hy - 1, EMB[4]); e.set(cx + 2, hy - 1, EMB[4]); e.rect(cx, hy + 1, 3, 1, EMB[2]); }
  // fists
  const fy = by - 13 + bob - (p.raise ? 6 : 0);
  c.disc(cx - r - 1, fy, 1.6, CHAR[3]); c.disc(cx + r + 1, fy, 1.6, CHAR[3]);
  // flames rising off the head
  for (let k = 0; k < 3; k++) {
    const x = cx - 1 + k, h = 2 + ((k + (p.ph || 0)) % 3) + Math.round(swell * 3);
    for (let y = 0; y < h; y++) { c.set(x, hy - 3 - y, EMB[Math.max(1, 4 - y)]); if (e) e.set(x, hy - 3 - y, EMB[Math.max(1, 4 - y)]); }
  }
}

export function iracundoSheet() {
  return getSheet('en_iracundo', () => new SpriteSheet({
    w: 30, h: 34, emissive: true,
    anims: {
      idle: { frames: 4, fps: 8, draw: (c, e, i) => iraBody(c, e, { bob: i % 2, ph: i }) },
      move: { frames: 4, fps: 12, draw: (c, e, i) => iraBody(c, e, { bob: i % 2, ph: i, step: i % 2 ? 1 : -1, raise: true }) },
      windup: { frames: 4, fps: 10, draw: (c, e, i) => iraBody(c, e, { bob: i % 2, ph: i, swell: 0.4 + i * 0.2, raise: true }) },
      attack: { frames: 2, fps: 14, draw: (c, e, i) => iraBody(c, e, { bob: 0, ph: i, swell: 1, raise: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => iraBody(c, e, { bob: 1, swell: 0.3 }) },
      death: { frames: 4, fps: 12, loop: false, draw: (c, e, i) => iraBody(c, e, { swell: 1, ph: i }) },
    },
  }));
}

// HUNDIDO DEL ESTIGIO — a drowned soul of mud that rises to drag you under
function hundidoBody(c, e, p) {
  const cx = 14, by = 30;
  const rise = p.rise ?? 1;
  // ripples
  c.ellipse(cx, by - 1, 9, 2.4, null, (nx, ny, x, y) => (Math.hypot(nx, ny) > 0.7 ? MUD[3] : MUD[1]));
  if (rise <= 0.05) { c.set(cx - 2, by - 2, MUD[4]); c.set(cx + 2, by - 2, MUD[4]); return; }
  const top = by - 2 - Math.round(20 * rise);
  // mud body dripping
  c.poly([[cx - 5, by - 2], [cx - 4, top + 6], [cx + 4, top + 6], [cx + 5, by - 2]], null, (x, y) => {
    let f = 3 - (x - cx + 5) * 0.2;
    if ((x + y * 3) % 7 === 0) f += 1;
    return pk(MUD, f, x, y);
  });
  c.ellipse(cx, top + 3, 4, 4, null, (nx, ny, x, y) => pk(MUD, 3.6 - nx - ny, x, y));
  c.set(cx - 1, top + 3, 0x9ab0a0); c.set(cx + 2, top + 3, 0x9ab0a0);
  if (e) { e.set(cx - 1, top + 3, 0x405048); e.set(cx + 2, top + 3, 0x405048); }
  c.rect(cx - 1, top + 5, 3, 1, 0x050808);
  // reaching arms
  const reach = p.reach || 0;
  c.thickLine(cx - 4, top + 8, cx - 8 - reach * 3, top + 4 - reach * 2, 0.8, MUD[3]);
  c.thickLine(cx + 4, top + 8, cx + 8 + reach * 3, top + 4 - reach * 2, 0.8, MUD[4]);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) c.set(cx + s * (8 + reach * 3) + s * (k - 1), top + 3 - reach * 2 - (k % 2), SKIN[2]);
  // drips
  for (let k = 0; k < 4; k++) c.vline(cx - 4 + k * 3, top + 7 + ((k + (p.ph || 0)) % 4), top + 9 + ((k + (p.ph || 0)) % 4), MUD[1]);
}

export function hundidoSheet() {
  return getSheet('en_hundido', () => new SpriteSheet({
    w: 30, h: 32, emissive: true,
    anims: {
      under: { frames: 4, fps: 6, draw: (c, e, i) => hundidoBody(c, e, { rise: 0, ph: i }) },
      emerge: { frames: 4, fps: 10, loop: false, draw: (c, e, i) => hundidoBody(c, e, { rise: (i + 1) / 4 }) },
      idle: { frames: 4, fps: 5, draw: (c, e, i) => hundidoBody(c, e, { rise: 1, ph: i }) },
      move: { frames: 4, fps: 6, draw: (c, e, i) => hundidoBody(c, e, { rise: 0.85, ph: i }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => hundidoBody(c, e, { rise: 1, reach: 0.5 + i * 0.3 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => hundidoBody(c, e, { rise: 1, reach: 1.5 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => hundidoBody(c, e, { rise: 0.9 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => hundidoBody(c, e, { rise: 1 - i / 5, ph: i }) },
    },
  }));
}

// HUMO HOSCO — the sullen (accidiosi) whose sighs bubble up as smoke
function humoBody(c, e, p) {
  const cx = 16, by = 30;
  const ph = p.ph || 0;
  for (let k = 0; k < 9; k++) {
    const a = ph * 0.6 + k * 0.7;
    const x = cx + Math.cos(a) * (3 + k * 0.5) * (p.spread || 1), y = by - 4 - k * 2.4 + Math.sin(a) * 1.2;
    const r = 4.2 - k * 0.25;
    c.ellipse(x, y, r, r * 0.8, null, (nx, ny, px, py) => ((1 - Math.hypot(nx, ny)) * 1.4 > bayer(px, py) * 0.9 ? pk(SMOKE, 3.4 - ny * 1.4 - nx * 0.5 - k * 0.15, px, py) : null));
  }
  // a sad face sunk in the smoke
  const fy = by - 15;
  c.set(cx - 2, fy, 0x050405); c.set(cx + 1, fy, 0x050405);
  c.hline(cx - 2, cx + 1, fy + 3, 0x050405); c.set(cx - 3, fy + 4, 0x050405); c.set(cx + 2, fy + 4, 0x050405);
  if (e) { e.set(cx - 2, fy, 0x301a10); e.set(cx + 1, fy, 0x301a10); }
  if (p.ember) for (let k = 0; k < 4; k++) { const x = cx - 4 + k * 3, y = by - 6 - (k * 5 + ph) % 18; c.set(x, y, EMB[3]); if (e) e.set(x, y, EMB[3]); }
}

export function humoSheet() {
  return getSheet('en_humo', () => new SpriteSheet({
    w: 32, h: 34, emissive: true, outline: false,
    anims: {
      idle: { frames: 6, fps: 6, draw: (c, e, i) => humoBody(c, e, { ph: i }) },
      move: { frames: 6, fps: 8, draw: (c, e, i) => humoBody(c, e, { ph: i * 1.3 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => humoBody(c, e, { ph: i, spread: 1.3, ember: true }) },
      attack: { frames: 3, fps: 10, loop: false, draw: (c, e, i) => humoBody(c, e, { ph: i * 2, spread: 1.6, ember: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => humoBody(c, e, { ph: 3, spread: 0.8 }) },
      death: { frames: 6, fps: 8, loop: false, draw: (c, e, i) => humoBody(c, e, { ph: i * 2, spread: 1 + i * 0.4 }) },
    },
  }));
}

// FILIPPO ARGENTI — the wrathful Florentine, mud-caked giant of a man, biting his own arm (miniboss)
function argentiBody(c, e, p) {
  const cx = 26, by = 54;
  const bob = p.bob || 0, rage = p.rage || 0;
  const SK = [0x1e1614, 0x3a2a24, 0x5a443a, 0x7a5e50, 0x9a7a68];
  // legs in the mud
  for (const s of [-1, 1]) c.thickLine(cx + s * 5, by - 18 + bob, cx + s * 7 + (p.step || 0) * s, by - 2, 2.2, SK[1]);
  c.ellipse(cx, by - 2, 14, 2.5, MUD[2]);
  // torso: broad, mud-caked
  c.poly([[cx - 11, by - 38 + bob], [cx + 11, by - 38 + bob], [cx + 8, by - 18 + bob], [cx - 8, by - 18 + bob]], null, (x, y) => {
    let f = 3.2 - (x - cx + 11) * 0.09 - (y - by + 38) * 0.03;
    if (bayer(x * 2, y) < 0.25) return pk(MUD, 3, x, y);
    return pk(SK, f, x, y);
  });
  // rage veins glowing
  for (let k = 0; k < 5 + rage * 4; k++) {
    const x = cx - 8 + ((k * 7) % 16), y = by - 34 + ((k * 5) % 14) + bob;
    c.set(x, y, EMB[3]); c.set(x + 1, y + 1, EMB[2]);
    if (e) e.set(x, y, EMB[2 + Math.round(rage)]);
  }
  // head
  const hy = by - 44 + bob;
  c.ellipse(cx + 1, hy, 6, 6.5, null, (nx, ny, x, y) => pk(SK, 3.6 - nx - ny, x, y));
  c.ellipse(cx + 1, hy - 4, 6, 3, null, (nx, ny, x, y) => pk([0x0a0606, 0x1a0e0c, 0x2a1814], 2 - ny, x, y));   // matted hair
  c.set(cx - 1, hy, EMB[5]); c.set(cx + 3, hy, EMB[5]);
  if (e) { e.set(cx - 1, hy, EMB[4]); e.set(cx + 3, hy, EMB[4]); }
  c.rect(cx - 1, hy + 3, 5, 2, 0x200402); c.hline(cx - 1, cx + 3, hy + 3, R.bone[3]);
  // arms
  const A = p.arms || 'rest';
  const arm = (s, hx, hy2) => { c.thickLine(cx + s * 11, by - 36 + bob, hx, hy2, 2.2, SK[2]); c.disc(hx, hy2, 2.6, SK[3]); };
  if (A === 'rest') { arm(-1, cx - 15, by - 22 + bob); arm(1, cx + 15, by - 22 + bob); }
  else if (A === 'up') { arm(-1, cx - 14, by - 54 + bob); arm(1, cx + 14, by - 54 + bob); }
  else if (A === 'punch') { arm(-1, cx - 14, by - 26 + bob); arm(1, cx + 24, by - 34 + bob); }
  else if (A === 'bite') { arm(-1, cx - 15, by - 24 + bob); arm(1, cx + 4, hy + 4); c.set(cx + 4, hy + 6, R.blood[4]); }
}

export function argentiSheet() {
  return getSheet('en_argenti', () => new SpriteSheet({
    w: 54, h: 60, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => argentiBody(c, e, { bob: [0, 0, 1, 1][i], arms: i === 2 ? 'bite' : 'rest' }) },
      move: { frames: 4, fps: 8, draw: (c, e, i) => argentiBody(c, e, { bob: [0, 1, 0, 1][i], step: i % 2 ? 1 : -1 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => argentiBody(c, e, { bob: -1, arms: 'up', rage: 1 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => argentiBody(c, e, { bob: 2 - i, arms: i === 0 ? 'up' : 'punch', rage: 1 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => argentiBody(c, e, { bob: i % 2, arms: 'bite', rage: 2 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => argentiBody(c, e, { bob: 1, rage: 1 }) },
      death: { frames: 6, fps: 7, loop: false, draw: (c, e, i) => argentiBody(c, e, { bob: i * 3, arms: 'bite', rage: 2 - i * 0.3 }) },
    },
  }));
}
