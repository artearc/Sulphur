// Weapon sprites (drawn pointing +x with the grip at the left edge) and their slash palettes.
import { SpriteSheet, getSheet } from './sheet.js';
import { R } from './palette.js';
import { bayer } from './pixel.js';

const pk = (ramp, f, x, y) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(f + (bayer(x, y) - 0.5) * 0.5)))];

export const WEAPON_ART = {
  espada: {
    w: 28, h: 9, grip: 3,
    draw: (c, e) => {
      // grip + pommel
      c.rect(1, 3, 4, 3, R.wood[2]); c.set(0, 4, R.gold[4]); c.hline(1, 4, 3, R.wood[3]);
      // crossguard (cruciform)
      c.rect(5, 0, 2, 9, R.gold[3]); c.vline(5, 0, 8, R.gold[4]); c.set(6, 0, R.gold[5]);
      // blade with fuller
      for (let x = 7; x < 27; x++) {
        const tip = x > 23 ? 27 - x : 2;
        for (let y = 4 - Math.min(1, tip); y <= 4 + Math.min(1, tip - 1); y++) c.set(x, y, y === 3 ? R.steel[5] : y === 4 ? R.steel[4] : R.steel[2]);
        if (x < 22) c.set(x, 4, R.steel[3]);
      }
      c.set(27, 4, R.steel[5]);
    },
    slash: [0x3a3e4a, 0x9aa2b4, 0xd2d8e4, 0xfff4cc, 0xffffff],
    slashHeavy: [0x6a4410, 0xd49a2a, 0xf2c45a, 0xfff4cc, 0xffffff],
  },
  guadana: {
    w: 34, h: 22, grip: 2,
    draw: (c, e) => {
      // long snath
      for (let x = 0; x < 30; x++) { c.set(x, 13, R.wood[x % 5 === 0 ? 2 : 3]); c.set(x, 14, R.wood[1]); }
      c.rect(10, 12, 2, 4, R.steel[2]);
      // curved blade sweeping back from the head
      for (let k = 0; k < 22; k++) {
        const t = k / 21;
        const x = Math.round(31 - t * 20 - Math.sin(t * Math.PI) * 2);
        const y = Math.round(12 - Math.sin(t * Math.PI * 0.9) * 10 + t * 2);
        const w = Math.round((1 - t) * 2.2 + 0.6);
        for (let s = 0; s < w; s++) c.set(x, y + s, s === 0 ? R.steel[5] : R.steel[3]);
        c.set(x, y + w, R.steel[1]);
      }
      if (e) for (let k = 0; k < 6; k++) e.set(30 - k * 3, 3 + k, 0x2a0810);
    },
    slash: [0x150810, 0x3c0c1a, 0x7a1626, 0xc8d0dc, 0xffffff],
    slashHeavy: [0x1a0206, 0x6a0a18, 0xc8243a, 0xf05060, 0xffe0e0],
  },
  cadenas: {
    w: 22, h: 10, grip: 2,
    draw: (c) => {
      c.rect(0, 3, 4, 4, R.wood[2]);
      for (let k = 0; k < 6; k++) {
        const x = 4 + k * 3;
        if (k % 2) { c.rect(x, 4, 3, 2, R.steel[3]); c.set(x + 1, 4, R.steel[5]); }
        else { c.rect(x, 3, 2, 4, R.steel[2]); c.set(x, 3, R.steel[4]); }
      }
      // spiked censer-weight
      c.disc(20, 5, 2.4, R.steel[2]); c.set(19, 4, R.steel[5]);
      c.set(20, 1, R.steel[4]); c.set(20, 9, R.steel[3]); c.set(17, 5, R.steel[3]);
    },
    slash: [0x1a1c24, 0x646a7a, 0x9aa2b4, 0xd2d8e4, 0xffffff],
    slashHeavy: [0x3a2408, 0x8a5c12, 0xd49a2a, 0xffe8a0, 0xffffff],
  },
  cruz: {
    w: 26, h: 14, grip: 3,
    draw: (c, e) => {
      for (let x = 0; x < 18; x++) { c.set(x, 7, R.gold[x % 4 === 0 ? 2 : 3]); c.set(x, 6, R.gold[4]); }
      // the cross head
      c.rect(17, 5, 8, 4, R.gold[3]); c.rect(19, 1, 4, 12, R.gold[3]);
      c.hline(17, 24, 5, R.gold[5]); c.vline(19, 1, 12, R.gold[5]);
      c.rect(20, 6, 2, 2, 0xffffff);
      if (e) { e.rect(19, 4, 4, 6, 0xa07a20); e.set(20, 6, 0xffffff); e.set(21, 7, 0xfff4cc); }
    },
    slash: [0x6a4410, 0xd49a2a, 0xf2c45a, 0xfff4cc, 0xffffff],
    slashHeavy: [0x6a4410, 0xd49a2a, 0xf2c45a, 0xfff4cc, 0xffffff],
  },
};

export function weaponSheet(id) {
  const a = WEAPON_ART[id];
  return getSheet('weapon_' + id, () => new SpriteSheet({
    w: a.w, h: a.h, emissive: true,
    anims: { idle: { frames: 1, fps: 1, draw: (c, e) => a.draw(c, e) } },
  }));
}

// Icon (bigger, for UI cards)
export function weaponIconURL(id, scale = 3) {
  return weaponSheet(id).frameDataURL('idle', 0, scale);
}
