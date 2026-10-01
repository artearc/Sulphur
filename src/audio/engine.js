// Mixer: lazily-created AudioContext, bus graph, generated cathedral reverb, master dynamics,
// shared noise buffers / waveshaper curves and a voice allocator with stealing.
//
//  [bus.input] -> bus.vol --+--> master.sum
//  [bus.wet]   -> bus.wetVol -> reverb (convolver) -> reverbReturn -> master.sum
//  bus.vol also feeds bus.send -> reverb (per-bus default send)
//  master.sum -> muffle (lowpass) -> masterVol -> glue compressor -> limiter -> destination

const BUS_DEFS = {
  music: { send: 0.32 },
  sfx: { send: 0.12 },
  voice: { send: 0.22 },
  amb: { send: 0.3 },
};

const LIMITS = { sfx: 24, voice: 6, amb: 14, music: 96 };

export class Mixer {
  constructor() {
    this.ctx = null;
    this.ok = false;
    this.failed = false;
    this.buses = {};
    this.voices = { sfx: [], voice: [], amb: [], music: [] };
    this.stolen = 0;
    this.settings = { masterVolume: 0.9, musicVolume: 0.7, sfxVolume: 0.8, voiceVolume: 0.8 };
  }

  // Creates the context and the whole graph. Safe to call many times; never throws.
  init() {
    if (this.ok || this.failed) return this.ok;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.failed = true; return false; }
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.build();
      this.ok = true;
    } catch (err) {
      console.warn('[audio] unavailable:', err);
      this.failed = true;
      this.ok = false;
    }
    return this.ok;
  }

  resume() {
    if (!this.ok) return;
    try { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); } catch { /* ignore */ }
  }

  get running() { return this.ok && this.ctx.state === 'running'; }
  get now() { return this.ok ? this.ctx.currentTime : 0; }

  build() {
    const ctx = this.ctx;
    this.sr = ctx.sampleRate;
    this.makeBuffers();

    // master
    this.sum = ctx.createGain();
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 20000;
    this.muffle.Q.value = 0.5;
    this.masterVol = ctx.createGain();
    this.glue = ctx.createDynamicsCompressor();
    this.glue.threshold.value = -16; this.glue.knee.value = 10; this.glue.ratio.value = 3;
    this.glue.attack.value = 0.008; this.glue.release.value = 0.22;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2.5; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002; this.limiter.release.value = 0.1;
    this.sum.connect(this.muffle).connect(this.masterVol).connect(this.glue).connect(this.limiter).connect(ctx.destination);

    // reverb (generated cathedral impulse), with a pre-filter to keep it dark
    this.reverbIn = ctx.createGain();
    const pre = ctx.createBiquadFilter(); pre.type = 'highpass'; pre.frequency.value = 160;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
    this.reverb = ctx.createConvolver();
    this.reverb.normalize = true;
    this.reverb.buffer = this.makeImpulse(4.6);
    this.reverbRet = ctx.createGain(); this.reverbRet.gain.value = 0.9;
    this.reverbIn.connect(pre).connect(tone).connect(this.reverb).connect(this.reverbRet).connect(this.sum);

    for (const [name, d] of Object.entries(BUS_DEFS)) {
      const input = ctx.createGain();
      const vol = ctx.createGain();
      const send = ctx.createGain(); send.gain.value = d.send;
      const wet = ctx.createGain();
      const wetVol = ctx.createGain();
      input.connect(vol); vol.connect(this.sum); vol.connect(send).connect(this.reverbIn);
      wet.connect(wetVol).connect(this.reverbIn);
      this.buses[name] = { input, vol, send, wet, wetVol };
    }
    this.applySettings(this.settings, true);
  }

  // ---------------------------------------------------------------- settings
  applySettings(s, instant = false) {
    if (s) Object.assign(this.settings, {
      masterVolume: s.masterVolume ?? this.settings.masterVolume,
      musicVolume: s.musicVolume ?? this.settings.musicVolume,
      sfxVolume: s.sfxVolume ?? this.settings.sfxVolume,
      voiceVolume: s.voiceVolume ?? this.settings.voiceVolume,
    });
    if (!this.ok) return;
    const S = this.settings, t = this.ctx.currentTime, tc = instant ? 0.001 : 0.05;
    const curve = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1.6); // perceptual taper
    this.masterVol.gain.setTargetAtTime(curve(S.masterVolume) * 0.9, t, tc);
    const set = (bus, v) => { const b = this.buses[bus]; b.vol.gain.setTargetAtTime(v, t, tc); b.wetVol.gain.setTargetAtTime(v, t, tc); };
    set('music', curve(S.musicVolume) * 0.8);
    set('sfx', curve(S.sfxVolume));
    set('voice', curve(S.voiceVolume) * 0.9);
    // ambience follows music & sfx (environmental sound)
    set('amb', curve((S.musicVolume + S.sfxVolume) * 0.5) * 0.9);
  }

  setMuffle(freq, tc = 0.3) {
    if (!this.ok) return;
    this.muffle.frequency.setTargetAtTime(freq, this.ctx.currentTime, tc);
  }

  // ---------------------------------------------------------------- buffers
  makeBuffers() {
    const sr = this.sr, ctx = this.ctx;
    const mk = (secs, fill, ch = 1) => {
      const b = ctx.createBuffer(ch, Math.floor(secs * sr), sr);
      for (let c = 0; c < ch; c++) fill(b.getChannelData(c), c);
      return b;
    };
    this.noise = {
      white: mk(2, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }),
      pink: mk(3, (d) => {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        }
      }),
      brown: mk(4, (d) => {
        let last = 0;
        for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      }),
    };
    // waveshaper curves
    this.curves = { soft: shaperCurve(2.2), hard: shaperCurve(8), crush: crushCurve(10) };
    this.textures = {}; // lazily generated loops (rain, fire crackle, bubbles…)
    this.waves = {};    // PeriodicWaves
  }

  // Cathedral impulse: pre-delay, sparse early reflections, dense exponentially decaying tail that
  // darkens over time (one-pole lowpass with falling cutoff). Stereo-decorrelated.
  makeImpulse(secs) {
    const sr = this.sr, len = Math.floor(secs * sr);
    const buf = this.ctx.createBuffer(2, len, sr);
    const pre = Math.floor(0.022 * sr);
    const k = 6.9 / (secs * 0.86);
    const early = [0.011, 0.019, 0.027, 0.041, 0.053, 0.067, 0.081].map((s) => Math.floor(s * sr));
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / sr;
        const env = Math.exp(-k * t) * Math.min(1, t / 0.05 + 0.25);
        const a = 0.12 + 0.75 * Math.exp(-t * 1.25); // coefficient: bright early, dark late
        lp += a * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * env;
      }
      for (let j = 0; j < early.length; j++) {
        const at = pre + early[j] + (c ? 37 : 0) * (j % 2 ? 1 : -1) + 40;
        if (at > 0 && at < len) d[at] += (c ^ (j & 1) ? 0.55 : 0.4) * (1 - j / early.length);
      }
    }
    return buf;
  }

  wave(name, harmonics) {
    if (!this.waves[name]) {
      const n = harmonics.length + 1;
      const real = new Float32Array(n), imag = new Float32Array(n);
      harmonics.forEach((h, i) => { imag[i + 1] = h; });
      this.waves[name] = this.ctx.createPeriodicWave(real, imag);
    }
    return this.waves[name];
  }

  texture(name, secs, painter) {
    if (!this.textures[name]) {
      const b = this.ctx.createBuffer(1, Math.floor(secs * this.sr), this.sr);
      painter(b.getChannelData(0), this.sr);
      this.textures[name] = b;
    }
    return this.textures[name];
  }

  // ---------------------------------------------------------------- voices
  // Allocates a transient output for one sound. Sources started inside should be stopped by `end`.
  // Returns { out, t, end } or null if audio is unavailable.
  voice(bus = 'sfx', dur = 1, o = {}) {
    if (!this.running) return null;
    const ctx = this.ctx, t = ctx.currentTime + (o.delay || 0) + 0.005;
    const list = this.voices[bus] || this.voices.sfx;
    const limit = LIMITS[bus] || 24;
    if (o.priority === undefined) o.priority = 1;
    while (list.length >= limit) this.steal(list);
    const out = ctx.createGain();
    out.gain.value = o.gain ?? 1;
    let tail = out;
    let pan = null;
    if (o.pan && ctx.createStereoPanner) {
      pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, o.pan));
      out.connect(pan); tail = pan;
    }
    const B = this.buses[bus] || this.buses.sfx;
    tail.connect(B.input);
    let wet = null;
    if (o.wet) { wet = ctx.createGain(); wet.gain.value = o.wet; tail.connect(wet).connect(B.wet); }
    const v = { out, pan, wet, t, end: t + dur + 0.15, born: t, srcs: [] };
    list.push(v);
    return v;
  }

  steal(list) {
    const v = list.shift();
    if (!v) return;
    this.stolen++;
    try {
      const t = this.ctx.currentTime;
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setValueAtTime(v.out.gain.value, t);
      v.out.gain.linearRampToValueAtTime(0, t + 0.03);
      setTimeout(() => this.release(v), 60);
    } catch { this.release(v); }
  }

  release(v) {
    try { v.out.disconnect(); } catch { /* */ }
    try { v.pan?.disconnect(); } catch { /* */ }
    try { v.wet?.disconnect(); } catch { /* */ }
  }

  prune() {
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    for (const list of Object.values(this.voices)) {
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].end < t) { this.release(list[i]); list.splice(i, 1); }
      }
    }
  }

  stats() {
    const o = {};
    for (const [k, v] of Object.entries(this.voices)) o[k] = v.length;
    return o;
  }
}

function shaperCurve(k) {
  const n = 2048, c = new Float32Array(n), norm = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / norm; }
  return c;
}
function crushCurve(steps) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(Math.tanh(x * 3) * steps) / steps; }
  return c;
}
