// EL MINOTAURO — "l'infamia di Creti": a bull-man raging like a bull struck by the death blow,
// biting himself, broken chains, gore-crusted horns, a double axe.
import { SpriteSheet, getSheet } from '../sheet.js';
import { R } from '../palette.js';
import { bayer } from '../pixel.js';

const pk = (ramp, f, x, y, d = 0.6) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * d)))];
const HIDE = [0x0e0605, 0x1e0e0a, 0x321812, 0x4a241a, 0x643224, 0x7e4430];
const SKIN = [0x200e0a, 0x3c1c14, 0x5a2c1e, 0x7a3e2a, 0x9a5236];
const W = 104, H = 104;

function minotauro(c, e, p) {
  const cx = 50, by = 100, bob = p.bob || 0, lean = p.lean || 0;
  const rage = p.rage || 0;
  // legs (bull hocks + hooves)
  for (const s of [-1, 1]) {
    const st = (p.step || 0) * s;
    c.thickLine(cx + s * 9, by - 34 + bob, cx + s * 12 + st, by - 16, 4, HIDE[2]);
    c.thickLine(cx + s * 12 + st, by - 16, cx + s * 10 + st, by - 4, 3, HIDE[1]);
    c.rect(cx + s * 10 + st - 4, by - 4, 8, 4, 0x060302);
  }
  // loincloth
  c.poly([[cx - 12, by - 40 + bob], [cx + 12, by - 40 + bob], [cx + 8, by - 26 + bob], [cx - 8, by - 26 + bob]], null, (x, y) => pk(R.wood, 2.4 - (y - by + 40) * 0.05, x, y));
  // torso: enormous, scarred
  const ty = by - 72 + bob;
  c.poly([[cx - 22 + lean, ty], [cx + 22 + lean, ty], [cx + 13, by - 38 + bob], [cx - 13, by - 38 + bob]], null, (x, y) => {
    let f = 3.6 - (x - cx + 22) * 0.06 - (y - ty) * 0.02;
    if (Math.abs(Math.sin((x + y * 0.5) * 0.4)) < 0.06) return R.blood[2];       // scars
    if (Math.abs(x - cx - lean * 0.5) < 1 && y > ty + 8) f -= 0.8;
    return pk(SKIN, f, x, y);
  });
  // rage veins
  for (let k = 0; k < 4 + rage * 6; k++) { const x = cx - 14 + ((k * 9) % 28), y = ty + 6 + ((k * 7) % 22); c.set(x, y, R.blood[4]); if (e && rage) e.set(x, y, 0x801010); }
  // broken chains on the wrists
  // arms + double axe
  const A = p.arms || 'rest';
  let ax, ay, aAngle;
  if (A === 'rest') { ax = cx + 30; ay = ty + 26; aAngle = 1.2; }
  else if (A === 'raise') { ax = cx + 18; ay = ty - 20; aAngle = -1.4; }
  else if (A === 'swing') { ax = cx + 36; ay = ty + 10; aAngle = 0.2; }
  else if (A === 'low') { ax = cx + 32; ay = by - 20; aAngle = 1.6; }
  else { ax = cx + 26; ay = ty + 14; aAngle = 0.8; }
  c.thickLine(cx + 20 + lean, ty + 4, ax, ay, 4, SKIN[3]);
  c.thickLine(cx - 20 + lean, ty + 4, cx - 28, ty + 30 - (A === 'raise' ? 24 : 0), 4, SKIN[2]);
  for (const [hx, hy] of [[ax, ay], [cx - 28, ty + 30 - (A === 'raise' ? 24 : 0)]]) {
    c.rect(hx - 3, hy - 2, 6, 3, R.steel[2]);
    for (let k = 0; k < 4; k++) c.set(hx - 4 - k, hy + 1 + (k % 2), R.steel[3]);
  }
  // the labrys
  const hx = Math.cos(aAngle), hy2 = Math.sin(aAngle);
  const tip = [ax + hx * -18, ay + hy2 * -18];
  c.line(ax + hx * 8, ay + hy2 * 8, tip[0], tip[1], R.wood[2]);
  for (const s of [-1, 1]) {
    const bx = tip[0] - hy2 * s * 2, by2 = tip[1] + hx * s * 2;
    c.poly([[tip[0], tip[1]], [bx - hy2 * s * 8 - hx * 5, by2 + hx * s * 8 - hy2 * 5], [bx - hy2 * s * 8 + hx * 5, by2 + hx * s * 8 + hy2 * 5]], null, (x, y) => pk(R.steel, 3.6 - Math.abs(x - tip[0]) * 0.1, x, y));
  }
  if (p.axeGlow && e) e.disc(tip[0], tip[1], 3, 0xff4020);
  // bull head
  const hyy = ty - 10 + (p.lower || 0);
  c.ellipse(cx + 4 + lean, hyy, 12, 10, null, (nx, ny, x, y) => pk(HIDE, 3.9 - nx - ny, x, y));
  c.poly([[cx + 10 + lean, hyy - 2], [cx + 24 + lean, hyy + 4], [cx + 22 + lean, hyy + 10], [cx + 8 + lean, hyy + 9]], null, (x, y) => pk(HIDE, 3.4 - (y - hyy) * 0.1, x, y));
  c.set(cx + 22 + lean, hyy + 6, 0x000000); c.set(cx + 20 + lean, hyy + 6, 0x000000);
  c.ellipse(cx + 20 + lean, hyy + 8, 2, 1.2, R.steel[3]);                  // nose ring
  // horns gore-stained
  for (const s of [-1, 1]) {
    const bx = cx + 4 + lean + s * 8, byy = hyy - 6;
    c.thickLine(bx, byy, bx + s * 10, byy - 10, 2.2, R.bone[3]);
    c.thickLine(bx + s * 10, byy - 10, bx + s * 8, byy - 18, 1.4, R.bone[4]);
    c.set(bx + s * 8, byy - 18, R.blood[4]); c.set(bx + s * 9, byy - 16, R.blood[3]);
  }
  // eye
  const eye = rage ? 0xff2010 : 0xc03010;
  c.rect(cx + 10 + lean, hyy - 3, 3, 2, eye); if (e) e.rect(cx + 10 + lean, hyy - 3, 3, 2, eye);
  if (p.snort) for (let k = 0; k < 4; k++) { c.set(cx + 26 + lean + k, hyy + 6 - k, 0xc8c0b8); }
  if (p.bite) { c.rect(cx - 22, ty + 30, 6, 4, R.blood[3]); }
}

export function minotauroSheet() {
  return getSheet('boss_minotauro', () => new SpriteSheet({
    w: W, h: H, emissive: true,
    anims: {
      idle: { frames: 4, fps: 5, draw: (c, e, i) => minotauro(c, e, { bob: [0, 0, 1, 1][i], snort: i === 3 }) },
      move: { frames: 6, fps: 10, draw: (c, e, i) => minotauro(c, e, { bob: [0, 1, 2, 1, 0, 1][i], step: [-2, -1, 1, 2, 1, -1][i], lean: 1 }) },
      windup: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => minotauro(c, e, { bob: -1, arms: 'raise', axeGlow: true, snort: true }) },
      attack: { frames: 3, fps: 14, loop: false, draw: (c, e, i) => minotauro(c, e, { bob: 2, arms: i === 0 ? 'swing' : 'low', lean: 3 }) },
      charge: { frames: 4, fps: 14, draw: (c, e, i) => minotauro(c, e, { bob: i % 2, lower: 10, lean: 4, step: i % 2 ? 3 : -3, rage: 1, snort: true }) },
      gore: { frames: 3, fps: 6, loop: false, draw: (c, e, i) => minotauro(c, e, { bob: 1, lower: 8, snort: true, rage: 1 }) },
      stun: { frames: 4, fps: 6, draw: (c, e, i) => minotauro(c, e, { bob: 3 + (i % 2), lower: 6, arms: 'low', lean: -2 }) },
      roar: { frames: 4, fps: 10, draw: (c, e, i) => minotauro(c, e, { bob: i % 2, lower: -4, arms: 'raise', rage: 2, bite: i > 1, snort: true }) },
      hurt: { frames: 1, fps: 1, draw: (c, e) => minotauro(c, e, { bob: 2, lean: -3 }) },
      death: { frames: 6, fps: 5, loop: false, draw: (c, e, i) => minotauro(c, e, { bob: i * 4, lower: i * 3, arms: 'low', lean: -i }) },
    },
  }));
}
