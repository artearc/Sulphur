// Hand-pixeled 14x14 icon set (outlined to 16x16). Used in-world above doors/pickups and in the UI.
import { PixelCanvas } from './pixel.js';
import { SpriteSheet, getSheet, makeTexture } from './sheet.js';

const PAL = {
  y: 0x6a4410, g: 0xd49a2a, G: 0xf2c45a, w: 0xfff4cc, W: 0xffffff,
  d: 0x3e060e, r: 0x9a1224, R: 0xf05060,
  k: 0x3a3e4a, s: 0x9aa2b4, S: 0xd2d8e4,
  b: 0x8e8266, B: 0xece2c4,
  e: 0x3c5a26, E: 0x8aa84a, l: 0x5aa060,
  v: 0x3c1a4a, p: 0x84408e, P: 0xd0a0e0,
  c: 0x2a5478, C: 0x9ad8ff,
  o: 0xc04008, O: 0xffb840,
  n: 0x44301c, N: 0x80663e,
  x: 0xc89a78, X: 0xe6c4a0,
  m: 0x2e4054, M: 0xa8c4d8,
  t: 0x1e5c5a, T: 0x52b4a0,
  z: 0x1a1014,
};

const ICONS = {
  cross: [
    '......yy', '.....yGGy', '.....yGwy', '.....yGgy', '..yyyyGgyyyy', '.yGGGGGwGGGGy', '.ygggggGggggy', '..yyyyGgyyyy',
    '.....yGgy', '.....yGgy', '.....yGgy', '.....yggy', '......yy',
  ],
  anchor: [
    '......ss', '.....sSSs', '.....s..s', '......ss', '...ssssssss', '......ss', '......ss', '......ss',
    '.s....ss....s', '.Ss...ss...sS', '..Ss..ss..sS', '...SSSSSSSS', '.....ssss',
  ],
  heart: [
    '..rr....rr', '.rRRr..rRRr', 'rRwRRrrRRRRr', 'rRRRRRRRRRRr', 'rRRRRRRRRRRr', '.rRRRRRRRRr', '..rRRRRRRr', '...rRRRRr',
    '....rRRr', '.....rr',
  ],
  eye: [
    '', '', '....kkkkkk', '..kkSSSSSSkk', '.kSSScccSSSSk', 'kSSScCCCcSSSSk', 'kSSScCzzcSSSSk', 'kSSScCzzcSSSSk', '.kSSSccccSSSk', '..kkSSSSSSkk',
    '....kkkkkk',
  ],
  scales: [
    '......gg', '.....gGGg', '.gggggGGggggg', '.g....gg....g', 'g.g...gg...g.g', 'g..g..gg..g..g', 'GGGGG.gg.GGGGG', '.ggg..gg..ggg.',
    '......gg', '......gg', '....gggggg', '...gGGGGGGg',
  ],
  tower: [
    '..b.b.bb.b.b', '..bbbbbbbbbb', '..bBBBBBBBBb', '...bBBBBBBb', '...bBBzzBBb', '...bBBzzBBb', '...bBBBBBBb', '...bBBBBBBb',
    '...bBBzzBBb', '...bBBzzBBb', '..bBBBBBBBBb', '.bbbbbbbbbbbb',
  ],
  chalice: [
    '', '.gggggggggggg', '.gGGGGGGGGGGg', '.gGPPPPPPPPGg', '..gGPPPPPPGg', '...gGGGGGGg', '....gGGGGg', '......Gg', '......Gg',
    '......Gg', '....ggGGgg', '...gGGGGGGg', '...gggggggg',
  ],
  crown: [
    '', '', 'r....r....r', 'rr..rRr..rr', 'grrgrRrgrrg', 'gGgGgGgGgGg', 'gGGGGGGGGGg', 'gGrGGRGGrGg', 'gGGGGGGGGGg', 'ggggggggggg',
  ],
  serpent: [
    '........lll', '.......lElEl', '.......lEEEl.R', '......lEEEl.R', '.....lEEl', '....lEEl', '...lEEl', '..lEEl',
    '..lEEl...ll', '...lEEllEEl', '....lEEEEl', '.....llll',
  ],
  flame: [
    '......o', '.....oO', '....oOO.o', '...oOOOooO', '..oOOWOOOO', '..oOWWWOOo', '.oOOWWWWOOo', '.oOOWWWWOOo', '.oOOOWWOOOo',
    '..oOOOOOOo', '...ooooooo',
  ],
  hourglass: [
    '.nnnnnnnnnnnn', '..NnnnnnnnnN', '..N.BBBBBB.N', '..N..BBBB..N', '..N...BB...N', '..N....B...N', '..N...b....N', '..N...bb...N',
    '..N..bbbb..N', '..N.bbbbbb.N', '..NnnnnnnnnN', '.nnnnnnnnnnnn',
  ],
  coin: [
    '', '....gggggg', '...gGGGGGGg', '..gGGwGGGGGy', '..gGwGGgGGGy', '..gGGGgGGGGy', '..gGGgggGGGy', '..gGGGgGGGGy', '..gGGGgGGGGy',
    '..gGGGGGGGGy', '...yGGGGGGy', '....yyyyyy',
  ],
  mouth: [
    '', '', '..rrrrrrrrrr', '.rBdBdBdBdBr', '.rddddddddddr', '.rddRRRRRdddr', '.rdRRRRRRRddr', '.rddddddddddr', '.rBdBdBdBdBr', '..rrrrrrrrrr',
  ],
  rose: [
    '....rrrr', '...rRRrRr', '..rRrRRRr', '..rRRrRRr', '...rRRRr', '....rrr', '.....e..e', '...ee.e.e', '......ee', '.....ee',
    '.....e', '....ee',
  ],
  // ---- relics ----
  laurel: [
    '', '...E.....E', '..EeE...EeE', '.EeE.....EeE', '.Ee.......eE', 'Ee.........eE', 'Ee.........eE', '.Ee.......eE', '.EeE.....EeE', '..EeE...EeE',
    '...eEe.eEe', '.....ggg',
  ],
  lamp: [
    '......k', '.....kSk', '....kkkkk', '....kOOOk', '...kOWWOk', '...kOWWOk', '...kOOOOk', '....kkkk', '....kSSk', '...kkkkkk',
  ],
  cord: [
    '..NN', '.N..N', '.N..N...NN', '..NN...N..N', '...N...N..N', '....N...NN', '.....N..N', '......NN', '......N', '.....NN',
    '.....N.N', '....N...N',
  ],
  branch: [
    '...........G', '..........GgG', '.........Gg', '....G...Gg', '...GgG.Gg', '....GgGg', '.....Gg..G', '....Gg.GgG', '...Gg...G', '..Gg',
    '.Gg', 'Gg',
  ],
  tear: [
    '......c', '......c', '.....cCc', '.....cCc', '....cCCCc', '...cCCWCCc', '...cCWCCCc', '...cCCCCCc', '....cCCCc', '.....ccc',
  ],
  horn: [
    '...........b', '..........bB', '.........bB', '........bBb', '.......bBb', '.....bbBBb', '...bbBBBb', '.bbBBBbb', 'bBBbbb', 'bbb',
  ],
  key: [
    '', '..gggg', '.gGGGGg', '.gG..Gg', '.gG..Gg', '.gGGGGg', '..gGGg', '...gGg', '...gGgg', '...gGGg', '...gGg', '...gGggg', '...gGGGg',
  ],
  scale: [
    '', '...tttttt', '..tTTTTTTt', '.tTTttttTTt', '.tTt.TT.tTt', '.tTTTTTTTTt', '..tTttttTt', '...tTTTTt', '....tttt',
  ],
  feather: [
    '...........k', '..........kz', '.........kzz', '........kzzk', '.......kzzk', '......kzzk', '.....kzzk', '....kzzk', '...kzzk', '..kzk',
    '.kk', 'k',
  ],
  thorns: [
    '', '..n.n.n.n.n', '.nNnNnNnNnNn', 'nNnnnnnnnnnNn', '.nNnNnNnNnNn', '..n.n.n.n.n', '...R.....R', '...R.....R',
  ],
  wheel: [
    '....nnnnn', '..nnNNNNNnn', '.nN..N..Nn', '.nN..N..Nn', 'nN.N.N.N.Nn', 'nNNNNgNNNNn', 'nN.N.N.N.Nn', '.nN..N..Nn', '.nN..N..Nn', '..nnNNNNNnn',
    '....nnnnn',
  ],
  ember: [
    '', '', '.....o', '....oOo', '...oOWOo', '..oOWWWOo', '..oOWWWOo', '...oOOOo', '..nnnnnnn', '.nNnNnNnNn',
  ],
  snow: [
    '......C', '...C..C..C', '....C.C.C', '.....CCC', 'CCCCCCWCCCCCC', '.....CCC', '....C.C.C', '...C..C..C', '......C',
  ],
  seal: [
    '', '...rrrrrr', '..rRRRRRRr', '.rRRrrrrRRr', '.rRrRRRRrRr', '.rRrRgRRrRr', '.rRrRRRRrRr', '.rRRrrrrRRr', '..rRRRRRRr', '...rrrrrr',
    '....r..r', '....r..r',
  ],
  thread: [
    '', '...RRRR', '..R....R', '.R..RR..R', '.R.R..R.R', '.R.R.RR.R', '.R..R...R', '..R....R', '...RRRR.R', '.........R', '..........R',
  ],
  bell: [
    '......y', '.....yGy', '....yGGGy', '...yGGGGGy', '...yGGGGGy', '...yGGGGGy', '..yGGGGGGGy', '.yGGGGGGGGGy', '.yyyyyyyyyyy', '......gg',
  ],
  mask: [
    '', '..gggggggg', '.gGGGGGGGGg', '.gGzzGGzzGg', '.gGzzGGzzGg', '.gGGGGGGGGg', '.gGGGgGGGGg', '..gGGGGGGg', '..gGzzzzGg', '...gGGGGg', '....gggg',
  ],
  vial: [
    '.....nn', '.....kk', '.....SS', '....SttS', '...SttttS', '..SttTTttS', '..StTTTTtS', '..StTTTTtS', '..SttttttS', '...SSSSSS',
  ],
  book: [
    '', '.nnnnnnnnnnn', '.nBBBBBnBBBBn', '.nBbbBBnBbbBn', '.nBBBBBnBBBBn', '.nBbbbBnBbbBn', '.nBBBBBnBBBBn', '.nBbbBBnBbBBn', '.nBBBBBnBBBBn', '.nnnnnnnnnnn',
  ],
  // ---- rewards / rooms ----
  essence: [
    '......M', '.....MWM', '....MCWCM', '...MCCWCCM', '..mMCCCCCMm', '..mMCCWCCMm', '...mMCCCMm', '....mMCMm', '.....mMm', '......m',
  ],
  fragment: [
    '......G', '.....GwG', '....GwGgy', '...GwGggy', '..GwGgggyy', '...GgggGy', '....ggGy', '.....gy', '......y',
  ],
  heal: [
    '', '....rrrr', '...rRRRRr', '...rRRRRr', '..rRRwRRRr', '..rRwRRRRr', '..rRRRRRRr', '...rRRRRr', '....rrrr', '.....gg', '....gGGg', '...gggggg',
  ],
  relic: [
    '......g', '.....gGg', '....gGwGg', '...gGGGGGg', '..gGGPPPGGg', '..gGPPWPPGg', '..gGGPPPGGg', '...gGGGGGg', '....gGGGg', '.....gGg', '......g',
  ],
  soul: [
    '....MMMM', '...MWWWWM', '..MWWWWWWM', '..MWmWWmWM', '..MWWWWWWM', '..MWWmmWWM', '...MWWWWM', '...MWWWWWM', '..MWWWWWWM', '..MWMWMWM', '...M.M.M',
  ],
  virtue: [
    '......w', '..w...w...w', '...w.www.w', '....wwGww', '..wwwGGGwww', '.wwGGGWGGGww', '..wwwGGGwww', '....wwGww', '...w.www.w', '..w...w...w', '......w',
  ],
  sin: [
    'b..........b', 'bb........bb', '.bb......bb', '..bbrrrrbb', '...rRRRRr', '..rRdRRdRr', '..rRRRRRRr', '..rRRddRRr', '...rRRRRr', '....rrrr',
  ],
  shop: [
    '', '...gggggg', '..g......g', '..g......g', '.gggggggggg', '.gGGGGGGGGg', '.gGGGgGGGGg', '.gGGgggGGGg', '.gGGGgGGGGg', '.gGGGGGGGGg', '.gggggggggg',
  ],
  skull: [
    '...BBBBBB', '..BBBBBBBB', '.BBBBBBBBBB', '.BzzBBBzzBB', '.BzzBBBzzBB', '.BBBBzBBBBB', '..BBBBBBBB', '...BzBzBzB', '...BBBBBB',
  ],
  horns: [
    'b..........b', 'bb........bb', '.bb......bb', '..bbBBBBbb', '...BBBBBB', '..BzzBBzzB', '..BzzBBzzB', '...BBBBBB', '....BzBzB',
  ],
  boss: [
    'r....r....r', 'rr..rRr..rr', 'rRrrRRRrrRr', 'rRRRRRRRRRr', '.BBBBBBBBB', '.BzzBBBzzB', '.BzRBBBzRB', '.BBBBzBBBB', '..BBBBBBB', '..BzBzBzB',
  ],
  gate: [
    '....kkkkk', '..kkksssskk', '.kks.....skk', '.ks..z.z..sk', '.ks.......sk', '.ks..z.z..sk', '.ks.......sk', '.ks..z.z..sk', '.ks.......sk', 'kkkkkkkkkkkkk',
  ],
  rest: [
    '', '......C', '.....C', '......C', '..kkkkkkkk', '.kSSccccSSk', '.kScCCCCcSk', '..kSSSSSSk', '...kSSSSk', '....kSSk', '...kkkkkk',
  ],
  secret: [
    '...pppppp', '..pP....Pp', '.pP..pp..Pp', '.p..pPPp..p', '.p..p..p..p', '......pP', '.....pP', '.....p', '', '.....p', '.....p',
  ],
  sword: [
    '...........S', '..........SS', '.........SS', '........SS', '.......SS', '......SS', '..g..SS', '...gSS', '...gg', '..n.gg', '.n', 'n',
  ],
};

export function iconPc(name) {
  const rows = ICONS[name] || ICONS.relic;
  const pc = new PixelCanvas(16, 16);
  rows.forEach((row, j) => {
    for (let i = 0; i < Math.min(14, row.length); i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      if (PAL[ch] != null) pc.set(i + 1, j + 1 + Math.max(0, Math.floor((14 - rows.length) / 2)), PAL[ch]);
    }
  });
  pc.outline(0x0b0709);
  return pc;
}

const urlCache = new Map();
export function iconURL(name, scale = 1) {
  const k = name + '@' + scale;
  if (!urlCache.has(k)) urlCache.set(k, iconPc(name).toDataURL(scale));
  return urlCache.get(k);
}

// Floating world icon sheet (bobbing glow)
export function iconSheet(name, glow = 0xfff4cc) {
  return getSheet('icon_' + name + glow, () => new SpriteSheet({
    w: 18, h: 18, emissive: true, outline: false,
    anims: {
      idle: {
        frames: 1, fps: 1,
        draw: (c, e) => {
          const pc = iconPc(name);
          c.blit(pc, 1, 1);
          for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const p = pc.get(x, y);
            if (p && p[3] && (p[0] + p[1] + p[2]) > 300) e.set(x + 1, y + 1, [p[0] * 0.6, p[1] * 0.6, p[2] * 0.6]);
          }
        },
      },
    },
  }));
}
export const ICON_NAMES = Object.keys(ICONS);
