// Character sprite sheets: Dante (5 moral tiers), Virgil, Beatrice, souls and ferrymen.
import { SpriteSheet, getSheet } from './sheet.js';
import { drawFigure, figurePose } from './figure.js';
import { R } from './palette.js';
import { mix, bayer } from './pixel.js';

const DIRS = ['down', 'side', 'up'];
const HUMAN_ANIMS = {
  idle: { frames: 4, fps: 4 },
  run: { frames: 6, fps: 12 },
  attack: { frames: 3, fps: 18, loop: false },
  heavy: { frames: 4, fps: 10, loop: false },
  dash: { frames: 2, fps: 14 },
  hurt: { frames: 2, fps: 10, loop: false },
  cast: { frames: 3, fps: 10, loop: false },
  death: { frames: 8, fps: 8, loop: false },
};

function buildHumanoid(key, base, opts = {}) {
  const anims = {};
  const list = opts.anims || HUMAN_ANIMS;
  for (const dir of DIRS) {
    for (const [name, a] of Object.entries(list)) {
      anims[`${name}_${dir}`] = {
        ...a,
        draw: (c, e, i, n) => {
          const pose = figurePose(name, i, n);
          const P = { ...base, ...pose, dir };
          if (!P.armF && base.armF) P.armF = base.armF;
          if (!P.armF) P.armF = { x: dir === 'side' ? 1 : 0, y: 5 };
          if (!P.armB) P.armB = dir === 'side' ? { x: -1, y: 5 } : { x: 0, y: 5 };
          if (opts.extra) opts.extra(c, e, P, name, i, n);
          drawFigure(c, e, P);
          if (opts.over) opts.over(c, e, P, name, i, n);
        },
      };
    }
  }
  return new SpriteSheet({ w: opts.w || 24, h: opts.h || 32, anims, emissive: true, outline: opts.outline });
}

// ---------------------------------------------------------------------------------------------
// Dante: tiers -2 (Caído) .. +2 (Santo). Appearance changes progressively (GDD 7.1.3)
// ---------------------------------------------------------------------------------------------
export const DANTE_TIERS = [-2, -1, 0, 1, 2];

export function danteSheet(tier = 0) {
  return getSheet('dante' + tier, () => {
    let robe = R.danteRobe, hood = R.danteRobe, skin = R.skin, trim = R.cord, eyesGlow = null, laurel = true;
    if (tier === 1) { robe = R.danteRobe.map((c, i) => mix(c, R.danteRobeVirtue[i], 0.45)); hood = robe; trim = R.gold.slice(2); }
    if (tier === 2) { robe = R.danteRobeVirtue; hood = R.danteRobeVirtue; trim = R.gold.slice(3); }
    if (tier === -1) { robe = R.danteRobe.map((c, i) => mix(c, R.danteRobeSin[i], 0.55)); hood = robe; skin = R.skin.map((c) => mix(c, 0x6a6070, 0.3)); eyesGlow = 0x801010; }
    if (tier === -2) { robe = R.danteRobeSin; hood = R.danteRobeSin; skin = R.skinPale; trim = [0x200810, 0x400a18, 0x6a1020, 0x901830]; eyesGlow = 0xff2020; laurel = false; }
    return buildHumanoid('dante' + tier, { robe, hood, skin, trim, laurel, headwear: 'dante', eyesGlow }, {
      over: (c, e, P) => {
        // Corrupted tiers: black veins crawling up the hem; holy tiers: gold hem embroidery
        if (tier < 0) {
          for (let x = 0; x < c.w; x++) {
            const y0 = c.h - 3;
            for (let y = y0; y > y0 - (tier === -2 ? 9 : 4); y--) {
              if (c.alpha(x, y) && bayer(x, y * 2) < 0.18 * -tier && (x * 7 + y * 3) % 5 === 0) c.set(x, y, 0x060208);
            }
          }
          if (tier === -2 && e) {
            for (let x = 0; x < c.w; x++) if (c.alpha(x, c.h - 3) && x % 3 === 0) e.set(x, c.h - 3, 0x500818);
          }
        }
        if (tier > 0) {
          const y = c.h - 3;
          for (let x = 0; x < c.w; x++) if (c.alpha(x, y) && x % 2 === 0) {
            c.set(x, y, R.gold[3 + (tier > 1 ? 1 : 0)]);
            if (e && tier === 2) e.set(x, y, 0x806020);
          }
        }
      },
    });
  });
}

export function virgilSheet() {
  return getSheet('virgil', () => buildHumanoid('virgil', {
    robe: R.virgilRobe, hood: R.virgilMantle, skin: R.skin, trim: R.virgilMantle,
    headwear: 'bare', hair: [0x8a8a90, 0xb8b8bc, 0xe0e0e2], beard: [0x9a9a9e, 0xc4c4c8, 0xe8e8ea],
    laurel: true, staff: { lantern: R.ember.slice(2) }, width: 6, tall: 1, stole: R.virgilMantle,
  }, { anims: { idle: HUMAN_ANIMS.idle, run: HUMAN_ANIMS.run, cast: HUMAN_ANIMS.cast } }));
}

export function beatriceSheet() {
  return getSheet('beatrice', () => buildHumanoid('beatrice', {
    robe: R.beatriceGown.concat([0xf0a060, 0xffd090]), hood: R.beatriceVeil, skin: [0x6a4a3a, 0xa07a60, 0xd8b090, 0xf4dcc0, 0xfff0e0],
    trim: R.gold.slice(2), headwear: 'veil', veil: R.beatriceVeil, width: 7, stole: R.beatriceMantle,
    eyeColor: 0x2a3a2a,
  }, {
    anims: { idle: { frames: 6, fps: 5 }, cast: HUMAN_ANIMS.cast },
    over: (c, e) => {
      // aura: glowing edge pixels so she reads as a vision of light
      if (!e) return;
      for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
        if (c.alpha(x, y) && (!c.alpha(x - 1, y) || !c.alpha(x + 1, y) || !c.alpha(x, y - 1))) e.set(x, y, 0xffd070, 200);
        else if (c.alpha(x, y)) e.set(x, y, 0x40300a, 120);
      }
    },
  }));
}

// Generic damned soul NPC (dilemma rooms). Variants by palette and headwear.
export function soulSheet(variant = {}) {
  const key = 'soul_' + JSON.stringify(variant);
  return getSheet(key, () => {
    const robe = variant.robe || R.soul;
    const base = {
      robe, hood: variant.hood || robe, skin: variant.skin || R.skinPale, trim: variant.trim || null,
      headwear: variant.headwear || 'hood', hair: variant.hair, beard: variant.beard, laurel: !!variant.laurel,
      width: variant.width ?? 5, shoulder: 3, eyeColor: variant.eyeColor ?? 0x0a1420, eyesGlow: variant.eyesGlow,
      feet: false, nose: variant.nose,
    };
    return buildHumanoid(key, base, {
      anims: { idle: { frames: 6, fps: 5 }, cast: HUMAN_ANIMS.cast, hurt: HUMAN_ANIMS.hurt },
      over: (c, e, P, name, i) => {
        // translucent tattered hem (spirits don't touch the ground)
        for (let x = 0; x < c.w; x++) {
          for (let y = c.h - 5; y < c.h; y++) {
            if (c.alpha(x, y) && ((x + i) % 3 === 0 || y > c.h - 3) && bayer(x, y) < (y - (c.h - 6)) / 5) c.erase(x, y);
          }
        }
        if (e) {
          for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
            if (c.alpha(x, y) && (!c.alpha(x - 1, y) || !c.alpha(x + 1, y))) e.set(x, y, variant.glow ?? 0x406080, 150);
          }
        }
      },
    });
  });
}

// Ferrymen: Caronte (Acheron) / Flegias (Styx) — hunched, oar, glowing coal eyes
export function ferrymanSheet(kind = 'caronte') {
  return getSheet('ferry_' + kind, () => {
    const robe = kind === 'caronte' ? [0x0e0c10, 0x1a1720, 0x2a2630, 0x3c3644, 0x524a5a, 0x6a6074] : [0x140806, 0x26100a, 0x3c1a10, 0x562618, 0x723422, 0x8e4630];
    const eyes = kind === 'caronte' ? 0xff6a20 : 0xff3010;
    return buildHumanoid('ferry_' + kind, {
      robe, hood: robe, skin: [0x2a2420, 0x4a4038, 0x6e6254, 0x948670, 0xb8a88e], headwear: 'hood',
      beard: [0x7a7470, 0xa49e98, 0xd0ccc6], eyeColor: eyes, eyesGlow: eyes, width: 7, shoulder: 5, tall: 3,
      staff: { ramp: R.wood }, armF: { x: 3, y: 2 },
    }, { w: 28, h: 38, anims: { idle: { frames: 6, fps: 4 }, cast: HUMAN_ANIMS.cast } });
  });
}

// Mercader espectral: hunched, many hands, coins, lantern of greed
export function merchantSheet() {
  return getSheet('merchant', () => buildHumanoid('merchant', {
    robe: [0x0c0a14, 0x18142a, 0x262040, 0x382e58, 0x4c4274, 0x645a90], hood: [0x0c0a14, 0x18142a, 0x262040, 0x382e58, 0x4c4274],
    skin: [0x1a2a2a, 0x2a4440, 0x40625a, 0x5e887a, 0x86b0a0], trim: R.gold.slice(1), headwear: 'hood',
    eyeColor: 0xf0d060, eyesGlow: 0xf0c040, width: 7, shoulder: 5, tall: 0, crouch: 2,
    staff: { lantern: R.gold.slice(2), ramp: R.bronze }, armF: { x: 3, y: 1 },
  }, {
    w: 26, h: 34, anims: { idle: { frames: 6, fps: 5 }, cast: HUMAN_ANIMS.cast },
    over: (c, e, P, name, i) => {
      // dangling coins on the belt
      const y = c.h - 13 + (P.bob || 0);
      for (let k = 0; k < 4; k++) {
        const x = 9 + k * 2;
        c.set(x, y + (k + i) % 2, R.gold[4]);
        if (e) e.set(x, y + (k + i) % 2, 0x806010);
      }
    },
  }));
}
