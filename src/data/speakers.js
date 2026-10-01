// Speakers: display name, nameplate color, portrait parameters, voice timbre (for the audio engine).
import { R } from '../art/palette.js';
import { mix } from '../art/pixel.js';

const robeTier = (t) => (t >= 2 ? R.danteRobeVirtue : t === 1 ? R.danteRobe.map((c, i) => mix(c, R.danteRobeVirtue[i], 0.45)) : t === -1 ? R.danteRobe.map((c, i) => mix(c, R.danteRobeSin[i], 0.55)) : t <= -2 ? R.danteRobeSin : R.danteRobe);

export const SPEAKERS = {
  dante: {
    name: 'Dante', color: '#d45a52', voice: { base: 150, formant: 'o', breath: 0.2 },
    portrait: (ctx = {}) => {
      const t = ctx.tier ?? 0;
      return {
        head: 'dante', laurel: t > -2, robe: robeTier(t), hood: robeTier(t), skin: t <= -2 ? R.skinPale : R.skin, nose: 'hook', gaunt: true, turn: 1,
        eyesGlow: t <= -2 ? 0xff2020 : t === -1 ? 0x901818 : null, glow: t >= 1 ? 0xf2c45a : t <= -1 ? 0x5a0810 : null, corrupt: t <= -2, trim: t >= 1 ? R.gold.slice(1) : R.cord,
        bg: t <= -1 ? [0x080206, 0x14060a, 0x260a12] : [0x0a0608, 0x160c0e, 0x261a1a],
      };
    },
  },
  virgilio: {
    name: 'Virgilio', color: '#c8c8b0', voice: { base: 110, formant: 'a', breath: 0.3 },
    portrait: () => ({ head: 'bare', hair: [0x8a8a90, 0xb8b8bc, 0xe0e0e2], beard: [0x8a8a8e, 0xb4b4b8, 0xdedee2], laurel: true, robe: R.virgilRobe, stole: R.virgilMantle, skin: R.skin, bg: [0x080a0a, 0x101614, 0x1c2620], glow: 0x3a4a3a }),
  },
  beatriz: {
    name: 'Beatriz', color: '#f2c45a', voice: { base: 260, formant: 'e', breath: 0.5, shimmer: true },
    portrait: () => ({ head: 'veil', veil: R.beatriceVeil, robe: R.beatriceGown.concat([0xf0a060]), stole: R.beatriceMantle, skin: [0x6a4a3a, 0xa07a60, 0xd8b090, 0xf4dcc0, 0xfff0e0], eyes: 0x2a4a2a, glow: 0xffe0a0, bg: [0x1a1408, 0x3a2a10, 0x6a5020] }),
  },
  caronte: {
    name: 'Caronte', color: '#e08a40', voice: { base: 70, formant: 'u', breath: 0.6, growl: true },
    portrait: () => ({ head: 'hood', hood: [0x0e0c10, 0x1a1720, 0x2a2630, 0x3c3644, 0x524a5a], robe: [0x0e0c10, 0x1a1720, 0x2a2630, 0x3c3644], skin: [0x2a2420, 0x4a4038, 0x6e6254, 0x948670, 0xb8a88e], beard: [0x6a6460, 0x948e88, 0xc8c4be], eyesGlow: 0xff7a20, gaunt: true, bg: [0x04060a, 0x0a1018, 0x142030] }),
  },
  flegias: {
    name: 'Flegias', color: '#e05030', voice: { base: 85, formant: 'a', growl: true },
    portrait: () => ({ head: 'bare', hair: [0x3a0c08, 0x6a1a10, 0x9a2a18], beard: [0x3a0c08, 0x6a1a10, 0x9a2a18], skin: [0x4a2018, 0x7a3a28, 0xa85a40, 0xd08060, 0xe8a888], eyesGlow: 0xff4010, mood: 'angry', robe: [0x140806, 0x26100a, 0x3c1a10, 0x562618], fire: true, bg: [0x0a0402, 0x1a0804, 0x3a1006] }),
  },
  minos: {
    name: 'Minos', color: '#b0a0d0', voice: { base: 60, formant: 'o', growl: true },
    portrait: () => ({ head: 'crown', hair: [0x1a1420, 0x2e2438, 0x463a54], beard: [0x2e2438, 0x463a54, 0x60507a], skin: [0x2a2a3a, 0x44445a, 0x60607a, 0x7e7e9a, 0x9e9eba], eyesGlow: 0xd0c0ff, mood: 'angry', robe: [0x14101c, 0x241c30, 0x382c48, 0x4e3e62], bg: [0x06040a, 0x0e0a16, 0x1a1428] }),
  },
  francesca: {
    name: 'Francesca da Rimini', color: '#e04a7a', voice: { base: 230, formant: 'e', breath: 0.6 },
    portrait: () => ({ head: 'bare', hair: [0x2a0a10, 0x4a1420, 0x6a2030], robe: [0x3a0820, 0x6a1438, 0x9a2050, 0xc83a6a], skin: R.skinPale.map((c) => mix(c, 0xe0b0b8, 0.3)), tears: true, mood: 'sad', bg: [0x0e0410, 0x1e0a22, 0x341440], glow: 0x6a2050 }),
  },
  paolo: {
    name: 'Paolo Malatesta', color: '#c06090', voice: { base: 140, formant: 'o', breath: 0.6 },
    portrait: () => ({ head: 'bare', hair: [0x1a1008, 0x2e1c10, 0x46301c], robe: [0x200a1a, 0x3a1430, 0x5a2048, 0x7a3060], skin: R.skinPale, mood: 'sad', bg: [0x0e0410, 0x1e0a22, 0x341440] }),
  },
  ciacco: {
    name: 'Ciacco', color: '#9bb03a', voice: { base: 95, formant: 'u', breath: 0.4 },
    portrait: () => ({ head: 'bare', hair: [0x1a1a10, 0x2e2e1c, 0x46462a], skin: [0x2a3010, 0x4a5418, 0x6e7a32, 0x929a52, 0xb8b878], robe: [0x1a1a0c, 0x2a2a14, 0x3e3e1e, 0x54542a], mood: 'sad', bg: [0x080a04, 0x10140a, 0x1c2410] }),
  },
  pluto: {
    name: 'Pluto', color: '#e2b23c', voice: { base: 55, formant: 'a', growl: true },
    portrait: () => ({ head: 'horns', hair: [0x2a1a08, 0x4a3010, 0x6a4a18], beard: [0x6a4410, 0xa06c18, 0xd49a2a], skin: [0x3a2408, 0x6a4410, 0x9a6c20, 0xc89838, 0xe8c060], eyesGlow: 0xfff080, mood: 'shout', robe: R.gold.slice(0, 5), hornRamp: R.gold, bg: [0x0a0602, 0x1a1006, 0x3a2408] }),
  },
  argenti: {
    name: 'Filippo Argenti', color: '#c04030', voice: { base: 120, formant: 'a', growl: true },
    portrait: () => ({ head: 'bare', hair: [0x0a0606, 0x1a0e0c, 0x2a1814], skin: [0x2a2020, 0x4a3a36, 0x6a5650, 0x8e7a70, 0xb09a90], mood: 'angry', robe: [0x101414, 0x1a2220, 0x26322e, 0x34443e], bg: [0x040606, 0x0a1010, 0x142020] }),
  },
  farinata: {
    name: 'Farinata degli Uberti', color: '#ff8a2a', voice: { base: 100, formant: 'o', breath: 0.2 },
    portrait: () => ({ head: 'bare', hair: [0x1a1410, 0x2e2420, 0x463830], beard: [0x2e2420, 0x463830, 0x5e4c40], skin: R.skin, robe: [0x2a0a04, 0x4a1808, 0x6e2a10, 0x903c18], fire: true, mood: 'neutral', bg: [0x0a0402, 0x1e0a04, 0x3a1408], glow: 0x6a2008 }),
  },
  pier: {
    name: 'Pier della Vigna', color: '#8a5a3a', voice: { base: 125, formant: 'e', breath: 0.5 },
    portrait: () => ({ head: 'bare', hair: [0x140c08, 0x241810, 0x382418], skin: [0x2a1a10, 0x4a3020, 0x6a4a34, 0x8a6a50, 0xaa8a6e], robe: R.wood, mood: 'sad', tears: true, bg: [0x060202, 0x120606, 0x240a0a] }),
  },
  ulises: {
    name: 'Ulises', color: '#40e0c0', voice: { base: 115, formant: 'a', breath: 0.2 },
    portrait: () => ({ head: 'bare', hair: [0x1a1410, 0x2e2420, 0x463830], beard: [0x2e2420, 0x463830, 0x5e4c40], skin: R.skin, robe: [0x041a1a, 0x0a3434, 0x125050, 0x1e7070], fire: true, mood: 'smile', bg: [0x020606, 0x061010, 0x0c2020], glow: 0x1e7070 }),
  },
  ugolino: {
    name: 'Ugolino della Gherardesca', color: '#9ad8ff', voice: { base: 90, formant: 'u', breath: 0.5, growl: true },
    portrait: () => ({ head: 'bare', hair: [0x2a2a30, 0x4a4a54, 0x6a6a78], beard: [0x4a4a54, 0x6a6a78, 0x8a8a98], skin: R.skinPale, gaunt: true, mood: 'angry', robe: R.ice.slice(0, 5), frost: true, bg: [0x040810, 0x0a1420, 0x142438] }),
  },
  mercader: {
    name: 'Mercader espectral', color: '#f0c040', voice: { base: 180, formant: 'i', breath: 0.3 },
    portrait: () => ({ head: 'hood', hood: [0x0c0a14, 0x18142a, 0x262040, 0x382e58, 0x4c4274], robe: [0x0c0a14, 0x18142a, 0x262040, 0x382e58], skin: [0x1a2a2a, 0x2a4440, 0x40625a, 0x5e887a, 0x86b0a0], eyesGlow: 0xf0c040, mood: 'smile', trim: R.gold, bg: [0x04040a, 0x0a0a14, 0x14142a] }),
  },
  alma: {
    name: 'Alma condenada', color: '#a8c4d8', voice: { base: 160, formant: 'o', breath: 0.7 },
    portrait: () => ({ head: 'hood', hood: R.soul, robe: R.soul, skin: R.skinPale, mood: 'sad', bg: [0x04060a, 0x0a1018, 0x141e2a] }),
  },
  acusador: {
    name: 'Espectro acusador', color: '#c8243a', voice: { base: 75, formant: 'u', growl: true },
    portrait: () => ({ head: 'hood', hood: R.danteRobeSin, robe: R.danteRobeSin, skin: R.skinPale, eyesGlow: 0xff2020, mood: 'angry', corrupt: true, bg: [0x060002, 0x120004, 0x24000a] }),
  },
  lucifer: {
    name: 'Lucifer', color: '#9ad8ff', voice: { base: 45, formant: 'o', growl: true, shimmer: true },
    portrait: () => ({ head: 'horns', hair: [0x050208, 0x0e0614, 0x1a0c24], skin: [0x0a1428, 0x16304e, 0x2a5478, 0x4a84a8, 0x84bcd8], eyesGlow: 0xff2030, mood: 'neutral', robe: [0x050208, 0x0e0614, 0x1a0c24, 0x2a1438], hornRamp: [0x0a0410, 0x1e0a2a, 0x3a1450, 0x5c2478, 0x8a40a0], frost: true, bg: [0x020408, 0x060c18, 0x0c1830], glow: 0x2a1450 }),
  },
  semiramis: {
    name: 'Semíramis', color: '#ff86a8', voice: { base: 200, formant: 'e', breath: 0.5, shimmer: true },
    portrait: () => ({ head: 'crown', hair: [0x0e0612, 0x1e0e26, 0x341a40], skin: [0x2c2232, 0x5a4a62, 0x8e7c96, 0xbcaabe, 0xe2d4e0], robe: [0x4a0e2a, 0x7a1a44, 0xb02a5a, 0xe04a7a], mood: 'smile', eyesGlow: 0xffd0e0, bg: [0x0e0410, 0x24102e, 0x3c1a4a], glow: 0x7a1a44 }),
  },
  furias: {
    name: 'Las Furias', color: '#ff5060', voice: { base: 210, formant: 'i', breath: 0.6, growl: true },
    portrait: () => ({ head: 'bare', hair: [0x0a1a0e, 0x244a30, 0x4a8a5a], skin: [0x1a0e0e, 0x341c1a, 0x52302a, 0x744840, 0x96645a], robe: [0x140406, 0x2a080c, 0x440c14, 0x601420], mood: 'shout', eyesGlow: 0xff2030, tears: true, fire: true, bg: [0x0a0202, 0x1a0606, 0x300a0a] }),
  },
  medusa: {
    name: 'Medusa', color: '#b8f0b0', voice: { base: 170, formant: 'a', breath: 0.7, shimmer: true },
    portrait: () => ({ head: 'bare', hair: [0x10241a, 0x2c5438, 0x5c9664], skin: [0x1a2418, 0x2e3e2a, 0x4a5c42, 0x6a7c5c, 0x8e9e7c], robe: R.bronze, mood: 'smile', eyesGlow: 0xffffff, bg: [0x040806, 0x0a140c, 0x14281a], glow: 0x2c5438 }),
  },
  gerion: {
    name: 'Gerión', color: '#40e0c0', voice: { base: 120, formant: 'o', breath: 0.2 },
    portrait: () => ({ head: 'bare', hair: [0x3a3030, 0x5a4a48, 0x7a6a66], beard: [0x3a3030, 0x5a4a48, 0x7a6a66], skin: [0x3a2a20, 0x6a5040, 0x987660, 0xc49e84, 0xe8c8ac], robe: [0x06100e, 0x14342e, 0x2a685a, 0x3c8a74], mood: 'smile', bg: [0x020606, 0x061010, 0x0c2020] }),
  },
  narrador: { name: '', color: '#a8987a', voice: null, portrait: null },
};
