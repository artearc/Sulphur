// Limbo bestiary art: shades without hope. Grey, translucent, hollow-faced — never colorful.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer, mix } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const SHADE = [0x0a0a10, 0x16161e, 0x22222c, 0x30303c, 0x44445a, 0x60607a];
const PALE = [0x2c2e38, 0x4a4e5c, 0x6e7486, 0x9aa2b4, 0xc8d0dc, 0xeef2f8];

// Hooded shade: tall tapering cloak, white mask face, claw hands. pose: {bob, lean, arm (0 rest..1 raised..2 swipe), tatter phase}
function shadeBody(c, e, p, ramp = SHADE, mask = PALE) {
  const cx = 12 + (p.lean || 0), top = 6 + (p.bob || 0);
  const bottom = 27;
  // cloak
  c.poly([[cx - 3, top + 4], [cx + 4, top + 4], [cx + 7, bottom], [cx - 6, bottom]], null, (x, y) => {
    const t = (y - top) / (bottom - top);
    const u = (x - (cx - 6)) / 13;
    let f = 3.6 - u * 2.4 - t * 0.8;
    if (Math.abs(u - 0.45 - Math.sin(y * 0.4 + (p.ph || 0)) * 0.05) < 0.05) f -= 1.2;
    return pk(ramp, f, x, y);
  });
  // tattered hem
  for (let x = cx - 6; x <= cx + 7; x++) {
    const len = Math.round(2 + Math.sin(x * 1.7 + (p.ph || 0) * 2) * 2);
    for (let y = bottom; y < bottom + len; y++) if (bayer(x, y) < 0.7 - (y - bottom) * 0.15) c.set(x, y, ramp[1]);
  }
  // hood
  c.ellipse(cx, top + 2, 4.5, 4.8, null, (nx, ny, x, y) => pk(ramp, 3.8 - nx * 1.2 - ny * 1.4, x, y));
  // void face with porcelain mask
  c.ellipse(cx + 1, top + 3, 2.4, 2.8, ramp[0]);
  c.ellipse(cx + 1.5, top + 3, 1.8, 2.4, null, (nx, ny, x, y) => pk(mask, 4 - nx - ny * 0.8, x, y));
  c.set(cx + 1, top + 2, 0x050508); c.set(cx + 3, top + 2, 0x050508);
  c.vline(cx + 2, top + 4, top + 5, mask[1]);
  if (e) { e.set(cx + 1, top + 2, 0x6080a0); e.set(cx + 3, top + 2, 0x6080a0); }
  // arm
  const arm = p.arm || 0;
  const sx = cx + 2, sy = top + 7;
  let hx, hy;
  if (arm < 0.5) { hx = sx + 2; hy = sy + 6; }
  else if (arm < 1.5) { hx = sx - 1; hy = sy - 6; }
  else { hx = sx + 8; hy = sy + 1; }
  c.thickLine(sx, sy, hx, hy, 0.8, ramp[2]);
  // claw
  for (let k = -1; k <= 1; k++) c.line(hx, hy, hx + 2 + (arm > 1.5 ? 1 : 0), hy + k * 2 - 1, mask[3]);
}

export function sombraSheet(variant = 'sombra') {
  return getSheet('en_' + variant, () => {
    const ramp = variant === 'eco' ? SHADE.map((c) => mix(c, 0x2a3a5a, 0.35)) : SHADE;
    return new SpriteSheet({
      w: 26, h: 34, emissive: true,
      anims: {
        idle: { frames: 4, fps: 5, draw: (c, e, i) => shadeBody(c, e, { bob: [0, 1, 1, 0][i], ph: i }, ramp) },
        move: { frames: 4, fps: 8, draw: (c, e, i) => shadeBody(c, e, { bob: [0, 1, 1, 0][i], lean: 1, ph: i * 2 }, ramp) },
        windup: { frames: 2, fps: 8, loop: false, draw: (c, e, i) => shadeBody(c, e, { bob: 1, lean: -1, arm: 1, ph: i }, ramp) },
        attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => shadeBody(c, e, { bob: 0, lean: 2 - i * 0.5, arm: 2, ph: i }, ramp) },
        hurt: { frames: 1, fps: 1, draw: (c, e) => shadeBody(c, e, { bob: 1, lean: -2, arm: 0 }, ramp.map((x) => mix(x, 0xffffff, 0.15))) },
        death: { frames: 6, fps: 10, loop: false, draw: (c, e, i) => shadeBody(c, e, { bob: i * 2, lean: -i * 0.5, arm: 1, ph: i }, ramp) },
      },
    });
  });
}

// Lamento: a weeping soul with mouth agape and arms lifted, trailing mist
function lamentBody(c, e, p) {
  const cx = 12, top = 7 + (p.bob || 0);
  const r = PALE;
  // misty tail
  for (let y = top + 10; y < 30; y++) {
    const w = Math.max(0, 5 - (y - top - 10) * 0.35 + Math.sin(y * 0.8 + (p.ph || 0)) * 0.8);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) if (bayer(x, y) < 1 - (y - top - 10) / 14) c.set(x + Math.round(Math.sin(y * 0.5 + (p.ph || 0)) * 1), y, pk(r, 2.5 - (y - top) * 0.08, x, y));
  }
  // torso
  c.ellipse(cx, top + 8, 4, 4.5, null, (nx, ny, x, y) => pk(r, 3.8 - nx * 1.2 - ny, x, y));
  // head thrown back, mouth open
  c.ellipse(cx, top + 2, 3.4, 3.6, null, (nx, ny, x, y) => pk(r, 4.2 - nx - ny, x, y));
  const mo = p.mouth ?? 1;
  c.ellipse(cx + 0.5, top + 3.5, 1.2, 0.8 + mo * 0.8, 0x08080c);
  c.set(cx - 1, top + 1, 0x08080c); c.set(cx + 2, top + 1, 0x08080c);
  if (e) { e.ellipse(cx + 0.5, top + 3.5, 1, 0.6 + mo * 0.6, 0x30406a); e.set(cx - 1, top + 1, 0x90b0e0); e.set(cx + 2, top + 1, 0x90b0e0); }
  // arms raised in lament
  const ar = p.arms ?? 0;
  c.thickLine(cx - 3, top + 6, cx - 6, top + 1 - ar * 3, 0.7, r[3]);
  c.thickLine(cx + 3, top + 6, cx + 6, top + 1 - ar * 3, 0.7, r[3]);
  // tear streaks
  c.set(cx - 1, top + 2, r[5]); c.set(cx + 2, top + 2, r[5]);
}

export function lamentoSheet() {
  return getSheet('en_lamento', () => new SpriteSheet({
    w: 26, h: 34, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => lamentBody(c, e, { bob: [0, 1, 1, 0][i], ph: i, mouth: 0.5 }) },
      move: { frames: 4, fps: 7, draw: (c, e, i) => lamentBody(c, e, { bob: [0, 1, 1, 0][i], ph: i * 2, mouth: 0.5 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => lamentBody(c, e, { bob: 1, ph: i, mouth: 1.4, arms: 1 }) },
      attack: { frames: 3, fps: 12, loop: false, draw: (c, e, i) => lamentBody(c, e, { bob: 0, ph: i, mouth: 2, arms: 1 - i * 0.3 }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => lamentBody(c, e, { bob: 2, mouth: 1 }) },
      death: { frames: 6, fps: 10, loop: false, draw: (c, e, i) => lamentBody(c, e, { bob: i * 2, ph: i, mouth: 2, arms: 1 }) },
    },
  }));
}

// LA LONZA — the leopard of the dark wood (Canto I): lithe, spotted, a beast of the first temptation
function lonzaBody(c, e, p) {
  const by = 40;
  const lean = p.lean || 0, bob = p.bob || 0, leg = p.leg || 0, crouch = p.crouch || 0;
  const FUR = [0x1a1610, 0x3a3022, 0x5e4e36, 0x8a7656, 0xb8a27a, 0xd8c8a0];
  const top = 22 + bob + crouch;
  // tail curling up
  for (let k = 0; k < 14; k++) { const t = k / 14; c.set(8 - k * 0.6, top + 2 - Math.sin(t * 3 + (p.ph || 0)) * 5 * t, FUR[2 + (k % 2)]); c.set(8 - k * 0.6, top + 3 - Math.sin(t * 3 + (p.ph || 0)) * 5 * t, FUR[1]); }
  // body
  c.poly([[9, top + 1], [34 + lean, top - 2], [40 + lean, top + 3], [36 + lean, top + 9], [11, top + 9]], null, (x, y) => {
    let f = 3.6 - (y - top + 2) * 0.22;
    return pk(FUR, f, x, y);
  });
  // rosettes (the spotted hide that seduced)
  for (let k = 0; k < 9; k++) { const x = 13 + ((k * 7) % 22), y = top + 1 + ((k * 5) % 7); c.set(x, y, FUR[0]); c.set(x + 1, y, FUR[0]); c.set(x, y + 1, FUR[1]); }
  // legs
  for (const [lx, ph] of [[13, -leg], [18, leg], [31 + lean, leg], [36 + lean, -leg]]) { c.thickLine(lx, top + 8, lx + ph * 3, by - 1, 0.8, FUR[2]); c.hline(lx + ph * 3 - 1, lx + ph * 3 + 1, by - 1, FUR[0]); }
  // head
  const hx = 42 + lean, hy = top - 1 - (p.head || 0);
  c.ellipse(hx, hy, 4.5, 3.6, null, (nx, ny, x, y) => pk(FUR, 4 - nx - ny, x, y));
  c.poly([[hx - 3, hy - 3], [hx - 2, hy - 6], [hx, hy - 3]], FUR[3]);
  c.set(hx + 1, hy - 1, 0x9ab8d8); c.set(hx + 2, hy - 1, 0xdcecf4);
  if (e) { e.set(hx + 1, hy - 1, 0x7898b0); e.set(hx + 2, hy - 1, 0xdcecf4); }
  if (p.jaw) { c.rect(hx + 1, hy + 2, 4, p.jaw, 0x200a0a); c.set(hx + 2, hy + 2, R.bone[4]); c.set(hx + 4, hy + 2, R.bone[4]); }
  c.set(hx + 4, hy + 1, FUR[0]);
}

export function lonzaSheet() {
  return getSheet('en_lonza', () => new SpriteSheet({
    w: 52, h: 44, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => lonzaBody(c, e, { bob: [0, 0, 1, 1][i], ph: i }) },
      move: { frames: 6, fps: 14, draw: (c, e, i) => lonzaBody(c, e, { bob: [0, 1, 1, 0, 1, 1][i], leg: [-1, -0.5, 0.5, 1, 0.5, -0.5][i], ph: i, lean: 1 }) },
      windup: { frames: 2, fps: 6, loop: false, draw: (c, e, i) => lonzaBody(c, e, { crouch: 3, lean: -3, head: -1, jaw: 1, ph: i }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => lonzaBody(c, e, { bob: -2, lean: 4, leg: 1, jaw: 3 - i }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => lonzaBody(c, e, { head: 3, jaw: 3 + (i % 2), ph: i }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => lonzaBody(c, e, { bob: 1, lean: -2 }) },
      death: { frames: 6, fps: 7, loop: false, draw: (c, e, i) => lonzaBody(c, e, { bob: i * 2, crouch: i, lean: -i, jaw: 2 }) },
    },
  }));
}
