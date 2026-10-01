// Adaptive music: per-circle procedural pieces built from choir, drones, strings, bells, horns and
// percussion. Layers crossfade by state (explore / combat / boss / narrative) and by Dante's moral
// balance (virtue → high shimmering choir and bells; corruption → distorted sub-drone, darker filter).
import { CIRCLES } from '../data/circles.js';
import { mtof, choir, drone, strings, bell, drum, horn, organ, pluck, noise } from './synth.js';

const SCALES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11], whole: [0, 2, 4, 6, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
};

// chord roots as scale degrees for 4-bar cycles
const PROGRESSIONS = {
  default: [[0, 5, 3, 4], [0, 3, 5, 6], [0, 6, 5, 4]],
  dark: [[0, 1, 0, 6], [0, 5, 1, 0]],
  whole: [[0, 2, 4, 1], [0, 3, 1, 4]],
};

// 16-step percussion patterns: [step, instrument, velocity]
const PERC = {
  soft: [[0, 'low', 0.7], [6, 'low', 0.4], [8, 'low', 0.6], [14, 'low', 0.3]],
  gallop: [[0, 'low', 0.9], [3, 'mid', 0.5], [4, 'mid', 0.6], [8, 'low', 0.8], [11, 'mid', 0.5], [12, 'mid', 0.6], [14, 'hi', 0.3]],
  heavy: [[0, 'low', 1], [5, 'low', 0.6], [8, 'low', 0.9], [10, 'mid', 0.5], [13, 'low', 0.6]],
  metal: [[0, 'low', 0.9], [4, 'clank', 0.5], [8, 'low', 0.7], [10, 'clank', 0.4], [12, 'clank', 0.6], [14, 'hi', 0.3]],
  frantic: [[0, 'low', 1], [2, 'mid', 0.5], [3, 'mid', 0.4], [4, 'low', 0.8], [6, 'mid', 0.6], [7, 'hi', 0.4], [8, 'low', 1], [10, 'mid', 0.5], [11, 'hi', 0.4], [12, 'low', 0.8], [14, 'mid', 0.6], [15, 'mid', 0.5]],
  tribal: [[0, 'low', 1], [3, 'low', 0.6], [6, 'mid', 0.7], [8, 'low', 0.9], [10, 'mid', 0.5], [11, 'mid', 0.5], [12, 'low', 0.7], [14, 'hi', 0.5]],
  liar: [[0, 'low', 0.9], [3, 'clank', 0.5], [7, 'mid', 0.6], [9, 'low', 0.7], [13, 'hi', 0.4]],
  ice: [[0, 'glass', 0.5], [10, 'glass', 0.3]],
  boss: [[0, 'low', 1], [2, 'mid', 0.5], [4, 'low', 0.8], [6, 'mid', 0.6], [8, 'low', 1], [9, 'mid', 0.4], [10, 'mid', 0.6], [12, 'low', 0.9], [14, 'hi', 0.5], [15, 'mid', 0.5]],
};

const PROFILE = {
  title: { root: 45, scale: 'aeolian', tempo: 50, pad: 'choir', vowel: 'o', perc: null, prog: 'dark', melody: 'bell' },
  hub: { root: 50, scale: 'dorian', tempo: 56, pad: 'organ', vowel: 'a', perc: null, prog: 'default', melody: 'pluck' },
  limbo: { pad: 'choir', vowel: 'u', perc: 'soft', melody: 'bell', prog: 'default' },
  lujuria: { pad: 'strings', vowel: 'e', perc: 'gallop', melody: 'pluck', prog: 'dark', windy: true, trem: 7 },
  gula: { pad: 'choir', vowel: 'o', perc: 'heavy', melody: 'horn', prog: 'dark', distort: 0.4 },
  avaricia: { pad: 'strings', vowel: 'a', perc: 'metal', melody: 'bell', prog: 'default', bells: true },
  ira: { pad: 'choir', vowel: 'a', perc: 'frantic', melody: 'horn', prog: 'dark', distort: 0.3 },
  herejia: { pad: 'choir', vowel: 'e', perc: 'heavy', melody: 'organ', prog: 'dark', distort: 0.5, crackle: true },
  violencia: { pad: 'strings', vowel: 'o', perc: 'tribal', melody: 'horn', prog: 'default' },
  fraude: { pad: 'choir', vowel: 'i', perc: 'liar', melody: 'pluck', prog: 'whole', liar: true },
  traicion: { pad: 'glass', vowel: 'u', perc: 'ice', melody: 'glass', prog: 'dark', sparse: true },
};

// layer targets per mode
const MODES = {
  silent: { pad: 0, drone: 0, melody: 0, perc: 0, stab: 0 },
  title: { pad: 0.9, drone: 0.8, melody: 0.5, perc: 0, stab: 0 },
  hub: { pad: 0.7, drone: 0.4, melody: 0.6, perc: 0, stab: 0 },
  explore: { pad: 0.75, drone: 0.7, melody: 0.45, perc: 0.15, stab: 0 },
  combat: { pad: 0.8, drone: 0.8, melody: 0.25, perc: 1, stab: 0.6 },
  boss: { pad: 1, drone: 1, melody: 0.2, perc: 1, stab: 1 },
  narrative: { pad: 0.6, drone: 0.5, melody: 0.15, perc: 0, stab: 0 },
  ending: { pad: 0.9, drone: 0.6, melody: 0.6, perc: 0, stab: 0 },
};

export class Music {
  constructor(mix) {
    this.mix = mix;
    this.ready = false;
    this.mode = 'silent';
    this.circleId = 'title';
    this.step = 0;
    this.nextTime = 0;
    this.bar = 0;
    this.progIdx = 0;
    this.corruption = 0; this.virtue = 0; this.lowHp = 0;
    this.override = null;
  }

  build() {
    if (this.ready || !this.mix.ok) return;
    const ctx = this.mix.ctx;
    const bus = this.mix.buses.music.input;
    this.out = ctx.createGain(); this.out.gain.value = 1;
    this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 9000; this.tone.Q.value = 0.5;
    this.out.connect(this.tone).connect(bus);
    this.layers = {};
    for (const n of ['pad', 'drone', 'melody', 'perc', 'stab', 'shimmer', 'dark']) {
      const g = ctx.createGain(); g.gain.value = 0;
      g.connect(this.out);
      this.layers[n] = g;
    }
    // distortion insert for corrupted / wrathful circles
    this.shaper = ctx.createWaveShaper(); this.shaper.curve = this.mix.curves.hard;
    this.distGain = ctx.createGain(); this.distGain.gain.value = 0;
    this.layers.pad.connect(this.shaper); this.shaper.connect(this.distGain).connect(this.out);
    this.ready = true;
    this.nextTime = ctx.currentTime + 0.1;
  }

  setCircle(id) {
    if (id === this.circleId) return;
    this.circleId = id;
    this.bar = 0; this.step = 0;
    this.progIdx = Math.floor(Math.random() * 3);
  }
  setMode(m) { this.mode = m; }

  profile() {
    if (this._pcache && this._pcache.id === this.circleId && this._pcache.mode === this.mode) return this._pcache.p;
    const base = PROFILE[this.circleId] || PROFILE.limbo;
    const c = CIRCLES.find((x) => x.id === this.circleId)?.music || {};
    const p = { root: 50, scale: 'aeolian', tempo: 70, ...base, root: base.root ?? c.root ?? 50, scale: base.scale ?? c.scale ?? 'aeolian', tempo: base.tempo ?? c.tempo ?? 70 };
    // boss fights push the tempo; narrative slows it down
    if (this.mode === 'boss') p.tempo = Math.min(140, p.tempo * 1.15);
    if (this.mode === 'narrative') p.tempo *= 0.8;
    this._pcache = { id: this.circleId, mode: this.mode, p };
    return p;
  }
  setCircleMusic(m) { this._circleMusic = m || {}; }

  update(dt) {
    if (!this.ready || !this.mix.running) return;
    const ctx = this.mix.ctx, t = ctx.currentTime;
    const P = this.profile();
    // layer mix
    const L = MODES[this.mode] || MODES.explore;
    const tc = 1.2;
    for (const [k, v] of Object.entries(L)) this.layers[k].gain.setTargetAtTime(v, t, tc);
    this.layers.shimmer.gain.setTargetAtTime(this.virtue * (this.mode === 'silent' ? 0 : 0.8), t, 2);
    this.layers.dark.gain.setTargetAtTime(this.corruption * (this.mode === 'silent' ? 0 : 0.9), t, 2);
    this.distGain.gain.setTargetAtTime((P.distort || 0) * 0.3 + this.corruption * 0.35, t, 2);
    const cut = 9000 - this.corruption * 5500 + this.virtue * 2000 - this.lowHp * 6000;
    this.tone.frequency.setTargetAtTime(Math.max(600, cut), t, 0.5);
    // scheduler (lookahead)
    const beat = 60 / P.tempo;
    const sixteenth = beat / 4;
    if (this.nextTime < t - 1) this.nextTime = t + 0.05;
    while (this.nextTime < t + 0.25) {
      this.scheduleStep(this.nextTime, P, sixteenth);
      let swing = sixteenth;
      if (P.liar && Math.random() < 0.08) swing *= Math.random() < 0.5 ? 0.5 : 1.5;     // fraud: the rhythm lies
      this.nextTime += swing;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  note(deg, oct = 0, P) {
    const sc = SCALES[P.scale] || SCALES.aeolian;
    const n = sc.length;
    const o = Math.floor(deg / n);
    const d = ((deg % n) + n) % n;
    return P.root + sc[d] + 12 * (o + oct);
  }

  scheduleStep(t, P, s16) {
    const mix = this.mix, ctx = mix.ctx, L = this.layers;
    const progs = PROGRESSIONS[P.prog] || PROGRESSIONS.default;
    const prog = progs[this.progIdx % progs.length];
    const deg = prog[this.bar % 4];
    const barLen = s16 * 16;
    const mode = this.mode;
    if (mode === 'silent') return;
    // ---- bar start: pad chord + drone
    if (this.step === 0) {
      if (this.bar % 4 === 0 && Math.random() < 0.5) this.progIdx++;
      const chord = [deg, deg + 2, deg + 4];
      if (P.pad === 'choir') chord.forEach((d, i) => choir(mix, L.pad, t, { f: mtof(this.note(d, i === 0 ? -1 : 0, P)), vowel: P.vowel, len: barLen * 0.95, v: 0.07, a: 0.5, r: 1.2, breath: 0.02 }));
      else if (P.pad === 'strings') chord.forEach((d, i) => strings(ctx, L.pad, t, { f: mtof(this.note(d, i === 0 ? -1 : 0, P)), len: barLen * 0.95, v: 0.045, trem: P.trem, cut: 1600 }));
      else if (P.pad === 'organ') chord.forEach((d, i) => organ(mix, L.pad, t, { f: mtof(this.note(d, i === 0 ? -1 : 0, P)), len: barLen * 0.95, v: 0.045, a: 0.3, r: 0.8 }));
      else if (P.pad === 'glass') { if (this.bar % 2 === 0) chord.forEach((d) => osc2(ctx, L.pad, t, mtof(this.note(d, 1, P)), barLen * 1.8, 0.025)); }
      if (this.bar % 2 === 0) drone(ctx, L.drone, t, { f: mtof(this.note(0, -2, P)), len: barLen * 2, v: 0.09, cut: 300, type: P.pad === 'glass' ? 'triangle' : 'sawtooth' });
      // virtue shimmer: a high, pure choir an octave above
      if (this.virtue > 0.1 && this.bar % 2 === 0) choir(mix, L.shimmer, t, { f: mtof(this.note(deg + 4, 2, P)), vowel: 'i', len: barLen * 1.8, v: 0.03, a: 1.2, r: 2, voices: 2, spread: 4 });
      if (this.virtue > 0.4 && this.bar % 2 === 1) bell(ctx, L.shimmer, t + s16 * 4, { f: mtof(this.note(deg, 3, P)), v: 0.05, dur: 3, ratio: 2.76, index: 2 });
      // corruption: a sub drone, beating against the root
      if (this.corruption > 0.1 && this.bar % 2 === 0) drone(ctx, L.dark, t, { f: mtof(this.note(1, -3, P)), len: barLen * 2, v: 0.12, cut: 180, q: 6, lfo: 0.3 });
      if (P.windy && mode !== 'boss') noise(mix, L.pad, t, { color: 'pink', filter: 'bandpass', freq: 500, freq2: 1400, sweep: barLen * 0.6, q: 1.5, a: barLen * 0.4, d: 0.5, s: 0.5, r: 1, v: 0.05, len: barLen * 0.5 });
      if (P.crackle) noise(mix, L.pad, t, { filter: 'highpass', freq: 3000, a: 0.01, d: 0.05, s: 0.1, r: 0.2, v: 0.02, len: barLen });
      // boss: brass on the downbeat, choir stabs
      if (mode === 'boss' || mode === 'combat') horn(ctx, L.stab, t, { f: mtof(this.note(deg, -1, P)), len: s16 * 6, v: mode === 'boss' ? 0.1 : 0.06 });
    }
    // ---- choir stabs (chaotic, urgent) in combat & boss
    if ((mode === 'combat' || mode === 'boss') && (this.step === 8 || (mode === 'boss' && this.step === 4)) && Math.random() < 0.8) {
      const d = deg + [0, 2, 4, 7][Math.floor(Math.random() * 4)];
      choir(mix, L.stab, t, { f: mtof(this.note(d, 0, P)), vowel: 'a', len: s16 * 3, a: 0.02, d: 0.2, s: 0.5, r: 0.4, v: 0.09, spread: 18 });
    }
    // ---- melody: sparse, by circle instrument
    const melodyChance = P.sparse ? 0.06 : mode === 'hub' || mode === 'title' ? 0.2 : 0.12;
    if (this.step % 2 === 0 && Math.random() < melodyChance) {
      const d = deg + [0, 2, 4, 5, 7, 9][Math.floor(Math.random() * 6)];
      const f = mtof(this.note(d, 1, P));
      if (P.melody === 'bell' || P.bells) bell(ctx, L.melody, t, { f, v: 0.06, dur: 2.5, ratio: P.bells ? 3.51 : 2.0, index: P.bells ? 5 : 2 });
      else if (P.melody === 'pluck') pluck(ctx, L.melody, t, { f, v: 0.08 });
      else if (P.melody === 'horn') horn(ctx, L.melody, t, { f: f / 2, len: s16 * 4, v: 0.06 });
      else if (P.melody === 'organ') organ(mix, L.melody, t, { f, len: s16 * 3, v: 0.04 });
      else if (P.melody === 'glass') osc2(ctx, L.melody, t, f * 2, 2.5, 0.03);
    }
    // ---- percussion
    const pat = PERC[mode === 'boss' ? 'boss' : P.perc];
    if (pat) for (const [st, inst, vel] of pat) {
      if (st !== this.step) continue;
      if (P.liar && Math.random() < 0.15) continue;
      const v = vel * (mode === 'explore' ? 0.5 : 1);
      if (inst === 'low') drum(mix, L.perc, t, { f: 52, v: v * 0.9, d: 0.35 });
      else if (inst === 'mid') drum(mix, L.perc, t, { f: 95, v: v * 0.6, d: 0.18, click: 2400 });
      else if (inst === 'hi') noise(mix, L.perc, t, { filter: 'highpass', freq: 5000, a: 0.001, d: 0.04, s: 0.0001, r: 0.05, v: v * 0.15 });
      else if (inst === 'clank') bell(ctx, L.perc, t, { f: 320 + Math.random() * 40, v: v * 0.08, dur: 0.6, ratio: 4.17, index: 6 });
      else if (inst === 'glass') osc2(ctx, L.perc, t, 1800 + Math.random() * 600, 1.2, v * 0.03);
    }
  }
}

// pure icy sine with soft attack
function osc2(ctx, dest, t, f, len, v) {
  const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(g).connect(dest); s.start(t); s.stop(t + len + 0.05);
}
