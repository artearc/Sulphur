// Instrument primitives. Every function schedules nodes at absolute time `t` into `dest`
// (an AudioNode) and auto-stops its sources. No buffers are created per call except tiny envelopes.

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// vowel formants (F1, F2, F3) for a dark male choir
export const FORMANTS = {
  a: [700, 1150, 2600], o: [450, 800, 2830], u: [325, 700, 2530], e: [400, 1700, 2500], i: [300, 2100, 2900],
};

function env(g, t, a, d, s, r, peak = 1, len = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * s, t + a, d / 3 + 0.0001);
  const rel = t + a + Math.max(len, d);
  g.gain.setTargetAtTime(0.0001, rel, r / 3 + 0.0001);
  return rel + r;
}

export function osc(ctx, dest, t, o) {
  const s = ctx.createOscillator();
  if (o.wave) s.setPeriodicWave(o.wave); else s.type = o.type || 'sine';
  s.frequency.setValueAtTime(o.f, t);
  if (o.f2) s.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.glide ?? 0.2));
  if (o.detune) s.detune.value = o.detune;
  const g = ctx.createGain();
  const end = env(g, t, o.a ?? 0.005, o.d ?? 0.1, o.s ?? 0.5, o.r ?? 0.2, o.v ?? 0.3, o.len ?? 0);
  s.connect(g).connect(dest);
  s.start(t); s.stop(end + 0.05);
  return { s, g, end };
}

export function noise(mix, dest, t, o) {
  const ctx = mix.ctx;
  const src = ctx.createBufferSource();
  src.buffer = mix.noise[o.color || 'white'];
  src.loop = true;
  src.playbackRate.value = o.rate ?? 1;
  let node = src;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter; f.frequency.setValueAtTime(o.freq ?? 1000, t); f.Q.value = o.q ?? 1;
    if (o.freq2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq2), t + (o.sweep ?? 0.2));
    node.connect(f); node = f;
  }
  const g = ctx.createGain();
  const end = env(g, t, o.a ?? 0.002, o.d ?? 0.08, o.s ?? 0.2, o.r ?? 0.1, o.v ?? 0.3, o.len ?? 0);
  node.connect(g).connect(dest);
  src.start(t, Math.random() * 1.5); src.stop(end + 0.05);
  return end;
}

// Drum: sine with fast pitch drop + noise click (taiko / tom / frame drum)
export function drum(mix, dest, t, o = {}) {
  const ctx = mix.ctx;
  const f = o.f ?? 60;
  osc(ctx, dest, t, { type: 'sine', f: f * (o.bend ?? 2.6), f2: f, glide: o.glide ?? 0.08, a: 0.002, d: o.d ?? 0.25, s: 0.0001, r: o.r ?? 0.3, v: o.v ?? 0.9 });
  if (o.body !== false) osc(ctx, dest, t, { type: 'triangle', f: f * 1.5, f2: f * 0.9, glide: 0.1, a: 0.001, d: 0.08, s: 0.0001, r: 0.1, v: (o.v ?? 0.9) * 0.35 });
  noise(mix, dest, t, { filter: 'bandpass', freq: o.click ?? 1800, q: 0.8, a: 0.001, d: 0.03, s: 0.0001, r: 0.05, v: (o.v ?? 0.9) * (o.clickV ?? 0.35) });
}

// FM bell (metallic, inharmonic)
export function bell(ctx, dest, t, o = {}) {
  const f = o.f ?? 440;
  const car = ctx.createOscillator(); car.frequency.value = f;
  const mod = ctx.createOscillator(); mod.frequency.value = f * (o.ratio ?? 3.51);
  const mg = ctx.createGain(); mg.gain.setValueAtTime(f * (o.index ?? 4), t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + (o.dur ?? 2.5));
  mod.connect(mg).connect(car.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.v ?? 0.25, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur ?? 2.5));
  car.connect(g).connect(dest);
  car.start(t); mod.start(t); car.stop(t + (o.dur ?? 2.5) + 0.1); mod.stop(t + (o.dur ?? 2.5) + 0.1);
}

// Choir voice: detuned saws through three formant bandpasses, slow vibrato
export function choir(mix, dest, t, o = {}) {
  const ctx = mix.ctx;
  const f = o.f ?? 110, len = o.len ?? 2, vowel = FORMANTS[o.vowel || 'a'];
  const mixer = ctx.createGain(); mixer.gain.value = 1;
  const out = ctx.createGain();
  const end = env(out, t, o.a ?? 0.6, o.d ?? 0.5, o.s ?? 0.85, o.r ?? 1.2, o.v ?? 0.12, len);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6 + Math.random() * 0.8;
  const lg = ctx.createGain(); lg.gain.value = f * 0.006;
  lfo.connect(lg);
  const nv = o.voices ?? 3;
  for (let k = 0; k < nv; k++) {
    const s = ctx.createOscillator();
    s.type = 'sawtooth';
    s.frequency.value = f;
    s.detune.value = (k - (nv - 1) / 2) * (o.spread ?? 9);
    lg.connect(s.frequency);
    s.connect(mixer);
    s.start(t); s.stop(end + 0.1);
  }
  vowel.forEach((fr, i) => {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr * (o.formantShift ?? 1); bp.Q.value = [6, 8, 9][i];
    const g = ctx.createGain(); g.gain.value = [1, 0.6, 0.25][i];
    mixer.connect(bp).connect(g).connect(out);
  });
  if (o.breath) noise(mix, out, t, { color: 'pink', filter: 'bandpass', freq: vowel[1], q: 2, a: o.a ?? 0.6, d: 0.5, s: 0.6, r: 1, v: o.breath, len });
  out.connect(dest);
  lfo.start(t); lfo.stop(end + 0.1);
  return end;
}

// Drone: two detuned oscillators through a lowpass with slow movement
export function drone(ctx, dest, t, o = {}) {
  const f = o.f ?? 55, len = o.len ?? 4;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut ?? 400; lp.Q.value = o.q ?? 2;
  const g = ctx.createGain();
  const end = env(g, t, o.a ?? 1.5, 1, 0.9, o.r ?? 2, o.v ?? 0.15, len);
  for (const d of [-7, 6]) {
    const s = ctx.createOscillator(); s.type = o.type || 'sawtooth'; s.frequency.value = f; s.detune.value = d;
    s.connect(lp); s.start(t); s.stop(end + 0.1);
  }
  const lfo = ctx.createOscillator(); lfo.frequency.value = o.lfo ?? 0.08;
  const lg = ctx.createGain(); lg.gain.value = (o.cut ?? 400) * 0.5;
  lfo.connect(lg).connect(lp.frequency); lfo.start(t); lfo.stop(end + 0.1);
  lp.connect(g).connect(dest);
  return end;
}

// String section: detuned saws, slow attack, lowpass
export function strings(ctx, dest, t, o = {}) {
  const f = o.f ?? 220, len = o.len ?? 2;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.cut ?? 1800; lp.Q.value = 0.7;
  const g = ctx.createGain();
  const end = env(g, t, o.a ?? 0.3, 0.4, 0.8, o.r ?? 0.6, o.v ?? 0.07, len);
  for (const d of [-11, 0, 9]) {
    const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = d;
    s.connect(lp); s.start(t); s.stop(end + 0.1);
  }
  if (o.trem) {
    const lfo = ctx.createOscillator(); lfo.frequency.value = o.trem;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    const tg = ctx.createGain(); tg.gain.value = 0.5;
    lfo.connect(lg).connect(tg.gain); lp.connect(tg).connect(g);
    lfo.start(t); lfo.stop(end + 0.1);
  } else lp.connect(g);
  g.connect(dest);
  return end;
}

// Low horn / brass: square-ish wave with filter swell
export function horn(ctx, dest, t, o = {}) {
  const f = o.f ?? 73, len = o.len ?? 1.5;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.linearRampToValueAtTime(f * (o.bright ?? 6), t + 0.25); lp.frequency.setTargetAtTime(f * 3, t + 0.3, 0.4);
  const g = ctx.createGain();
  const end = env(g, t, 0.08, 0.3, 0.75, o.r ?? 0.5, o.v ?? 0.12, len);
  for (const d of [-5, 5]) { const s = ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = d; s.connect(lp); s.start(t); s.stop(end + 0.1); }
  lp.connect(g).connect(dest);
  return end;
}

// Organ: additive harmonics
export function organ(mix, dest, t, o = {}) {
  const ctx = mix.ctx;
  const w = mix.wave('organ', [1, 0.5, 0.33, 0.2, 0.1, 0.12, 0.05, 0.08]);
  return osc(ctx, dest, t, { wave: w, f: o.f ?? 220, a: o.a ?? 0.05, d: 0.2, s: 0.8, r: o.r ?? 0.4, v: o.v ?? 0.07, len: o.len ?? 1 }).end;
}

// Pluck / harp (string decay)
export function pluck(ctx, dest, t, o = {}) {
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime((o.f ?? 440) * 8, t); lp.frequency.exponentialRampToValueAtTime((o.f ?? 440) * 1.2, t + 0.4);
  const r = osc(ctx, lp, t, { type: o.type || 'triangle', f: o.f ?? 440, a: 0.002, d: o.d ?? 0.6, s: 0.0001, r: 0.4, v: o.v ?? 0.15 });
  lp.connect(dest);
  return r.end;
}
