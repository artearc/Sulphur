// Seeded RNG (mulberry32) so runs can be reproduced from a seed.
export class Rng {
  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.seed = seed >>> 0;
    this.s = this.seed;
  }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  weighted(entries) {
    // entries: [[item, weight], ...]
    let total = 0;
    for (const e of entries) total += Math.max(0, e[1]);
    let r = this.next() * total;
    for (const e of entries) {
      r -= Math.max(0, e[1]);
      if (r <= 0) return e[0];
    }
    return entries[entries.length - 1][0];
  }
  fork() { return new Rng((this.next() * 2 ** 32) >>> 0); }
}

// Stateless hash for deterministic per-pixel / per-tile noise.
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const globalRng = new Rng();
