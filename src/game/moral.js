// Virtue / Corruption balance. The central system of SULPHUR.
//   virtue  — accumulated by absolving, virtue altars, mercy
//   sin     — accumulated by condemning, sin altars, cursed gold, cruelty
//   doubt   — accumulated by questioning divine justice (dialogue options) -> feeds the Grey ending
// balance = virtue - sin, mapped to five tiers that change Dante, the world and the run rules.
import { Events } from '../core/events.js';
import { clamp } from '../core/math.js';

export const TIERS = {
  '-2': { name: 'Caído', color: '#c8243a', desc: 'Las sombras te obedecen. El Infierno te reconoce como suyo.' },
  '-1': { name: 'Corrompido', color: '#9a1224', desc: 'Tus ojos arden. La oscuridad se aferra a tu túnica.' },
  '0': { name: 'Peregrino', color: '#d8c8a8', desc: 'Caminas en el filo entre la gracia y la caída.' },
  '1': { name: 'Piadoso', color: '#f2c45a', desc: 'Una luz tenue te acompaña. Las almas te miran con esperanza.' },
  '2': { name: 'Santo', color: '#fff4cc', desc: 'Un halo te corona. Ni el fuego se atreve a tocarte sin pedir permiso.' },
};

export class Moral {
  constructor(o = {}) {
    this.virtue = o.virtue || 0;
    this.sin = o.sin || 0;
    this.doubt = o.doubt || 0;
    this.absolved = 0;
    this.condemned = 0;
    this.history = [];
    this.lastTier = this.tier;
  }
  get balance() { return this.virtue - this.sin; }
  // normalized -1..1 for UI and blends
  get norm() { return clamp(this.balance / 100, -1, 1); }
  get tier() {
    const b = this.balance;
    if (b >= 70) return 2;
    if (b >= 25) return 1;
    if (b <= -70) return -2;
    if (b <= -25) return -1;
    return 0;
  }
  get corruption01() { return clamp(-this.balance / 100, 0, 1); }
  get virtue01() { return clamp(this.balance / 100, 0, 1); }

  add(kind, amount, reason = '') {
    if (kind === 'virtue') this.virtue += amount;
    else if (kind === 'sin') this.sin += amount;
    else if (kind === 'doubt') this.doubt += amount;
    this.history.push({ kind, amount, reason });
    Events.emit('moral:change', { kind, amount, reason, balance: this.balance, tier: this.tier });
    const t = this.tier;
    if (t !== this.lastTier) {
      const up = t > this.lastTier;
      this.lastTier = t;
      Events.emit('moral:tier', { tier: t, up });
    }
  }

  // ---- GDD 3.2.1 dynamic scaling ----
  // More corruption: more elites and traps, better rewards, more aggressive enemies.
  // More virtue: more narrative events, cheaper shops, "purer" but tougher enemies.
  get eliteChance() { return 0.06 + this.corruption01 * 0.3; }
  get trapChance() { return 0.15 + this.corruption01 * 0.5; }
  get rewardMul() { return 1 + this.corruption01 * 0.6; }
  get aggression() { return 1 + this.corruption01 * 0.35; }
  get narrativeBias() { return 1 + this.virtue01 * 1.2; }
  get shopDiscount() { return this.virtue01 * 0.35; }
  get purifiedChance() { return this.virtue01 * 0.45; }

  serialize() { return { virtue: this.virtue, sin: this.sin, doubt: this.doubt, absolved: this.absolved, condemned: this.condemned }; }
}

// Which of the three destinies the descent leads to (GDD 2.6 / 6.2)
export function resolveEnding(moral, finalChoice) {
  const b = moral.balance;
  if (finalChoice === 'question' || (moral.doubt >= 6 && Math.abs(b) < 60)) return 'gris';
  if (finalChoice === 'embrace' || b <= -40) return 'caida';
  if (finalChoice === 'refuse' && b >= 25) return 'redencion';
  if (b >= 40) return 'redencion';
  if (b <= -25) return 'caida';
  return 'gris';
}
