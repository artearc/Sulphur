// A single descent: resources, boons, relics, moral balance, map per circle and run-wide rules.
import { Rng } from '../core/rng.js';
import { Moral } from './moral.js';
import { CIRCLES } from '../data/circles.js';
import { BOONS, VIRTUE_IDS, SIN_IDS } from '../data/boons.js';
import { RELICS } from '../data/relics.js';
import { UPGRADES } from '../data/upgrades.js';
import { BASE_STATS, Player } from './player.js';
import { Save } from '../core/save.js';
import { Events } from '../core/events.js';
import { generateCircleMap } from './map.js';

export class Run {
  constructor(o = {}) {
    this.seed = o.seed ?? ((Math.random() * 2 ** 31) | 0);
    this.rng = new Rng(this.seed);
    this.weapon = o.weapon || Save.meta.selectedWeapon || 'espada';
    this.circleIndex = 0;
    this.map = null;
    this.nodeId = null;
    this.gold = 0;
    this.essences = 0;
    this.fragments = 0;
    this.boons = {};           // id -> level
    this.relics = [];          // ids
    this.moral = new Moral();
    this.decisions = [];       // { soul, choice, circle }
    this.flags = {};
    this.roomFlags = {};
    this.kills = 0;
    this.roomsCleared = 0;
    this.startTime = performance.now();
    this.hp = null;            // carried between rooms
    this.fervor = 0;
    this.visited = [];
    this.bossesDefeated = [];
    this.finished = false;
    this.result = null;
    const meta = Save.meta;
    this.metaStats = this.computeMetaStats();
    this.gold = this.metaStats.startGold || 0;
    if (this.metaStats.startVirtue) {
      const id = this.rng.pick(VIRTUE_IDS);
      this.boons[id] = 1;
      this.moral.add('virtue', 6, 'penitencia');
    }
    if (meta.flags.power_secondBreath) this.relics.push('obolo');
    if (meta.flags.blessing) { this.flags.maxHpBonus = (this.flags.maxHpBonus || 0) + 15; meta.flags.blessing = false; this.blessed = true; }
  }

  get circle() { return CIRCLES[this.circleIndex]; }
  get node() { return this.map?.nodes[this.nodeId]; }

  computeMetaStats() {
    const s = { ...BASE_STATS };
    for (const u of UPGRADES) {
      const l = Save.upgrade(u.id);
      if (l > 0) u.apply(s, l);
    }
    return s;
  }

  startCircle(index) {
    this.circleIndex = index;
    this.map = generateCircleMap(this.circle, this.rng.fork(), this);
    this.nodeId = this.map.start;
    Events.emit('circle:start', { circle: this.circle, index });
  }

  // Dynamic difficulty (GDD 3.2.1 / 3.4)
  enemyMods() {
    const c = this.circleIndex;
    const m = this.moral;
    return {
      hp: 1 + c * 0.22 + m.virtue01 * 0.15,
      dmg: 1 + c * 0.13,
      speed: 1 + c * 0.025 + m.corruption01 * 0.12,
      cooldown: 1 / m.aggression,
      telegraph: 1 + m.virtue01 * 0.12 - c * 0.012,
    };
  }

  // Rebuild the player's stats and hooks from meta upgrades + boons + relics.
  applyToPlayer(p) {
    p.resetModifiers();
    Object.assign(p.stats, this.computeMetaStats());
    for (const [id, l] of Object.entries(this.boons)) BOONS[id]?.apply(p, l);
    for (const id of this.relics) RELICS[id]?.apply(p);
    if (Save.meta.flags.power_juicioPlus) p.stats.juicioMul = 1.4;
    p.stats.maxHp += this.flags.maxHpBonus || 0;
    p.stats.damageMul += this.flags.damageBonus || 0;
    p.stats.armor = Math.min(0.6, p.stats.armor);
    p.stats.attackSpeed = Math.max(0.6, p.stats.attackSpeed);
    p.stats.specialCost = Math.max(16, p.stats.specialCost);
    p.dashCharges = Math.min(p.dashCharges, p.stats.dashCharges);
    if (p.hp > p.stats.maxHp) p.hp = p.stats.maxHp;
    p.maxHp = p.stats.maxHp;
  }

  addBoon(id) {
    const b = BOONS[id];
    const l = (this.boons[id] || 0) + 1;
    this.boons[id] = Math.min(3, l);
    this.moral.add(b.kind === 'virtue' ? 'virtue' : 'sin', l === 1 ? 10 : 6, 'boon:' + id);
    Events.emit('boon:gain', { id, level: this.boons[id], kind: b.kind });
  }
  addRelic(id) {
    if (this.relics.includes(id)) return;
    this.relics.push(id);
    const r = RELICS[id];
    if (r.sin) this.moral.add('sin', r.sin, 'relic:' + id);
    if (r.virtue) this.moral.add('virtue', r.virtue, 'relic:' + id);
    Events.emit('relic:gain', { id });
  }

  addGold(n, player) {
    const g = Math.round(n * (player?.stats.goldMul || 1));
    this.gold += g;
    if (player?.stats.goldHeal) player.heal(player.stats.goldHeal * Math.min(g, 10) * 0.2, true);
    if (player?.stats.goldFervor && Math.random() < 0.3) player.fervor = Math.min(100, player.fervor + player.stats.goldFervor);
    Events.emit('gold', { amount: g, total: this.gold });
    return g;
  }
  addEssence(n, player) {
    const e = Math.round(n * (player?.stats.essenceMul || 1));
    this.essences += e;
    Events.emit('essence', { amount: e, total: this.essences });
  }
  addFragment(n = 1) { this.fragments += n; Events.emit('fragment', { amount: n, total: this.fragments }); }

  shopPrice(base, player) {
    const disc = Math.min(0.6, (player?.stats.shopDiscount || 0) + this.moral.shopDiscount);
    return Math.max(1, Math.round(base * (1 - disc) * (1 + this.circleIndex * 0.08)));
  }

  // pick boon offers for an altar
  boonOffers(kind, n = 3) {
    const ids = this.rng.shuffle([...(kind === 'virtue' ? VIRTUE_IDS : SIN_IDS)]);
    // favor upgrades of owned boons sometimes
    const owned = ids.filter((id) => this.boons[id] && this.boons[id] < 3);
    const fresh = ids.filter((id) => !this.boons[id]);
    const out = [];
    if (owned.length && this.rng.chance(0.5)) out.push(owned[0]);
    for (const id of fresh) if (out.length < n) out.push(id);
    for (const id of owned) if (out.length < n && !out.includes(id)) out.push(id);
    return out.slice(0, n);
  }
  relicPool() {
    const unlocked = new Set(Save.meta.unlockedRelics);
    return Object.values(RELICS).filter((r) => (r.pool === 'base' || unlocked.has(r.id)) && !this.relics.includes(r.id)).map((r) => r.id);
  }
  randomRelic() {
    const pool = this.relicPool();
    return pool.length ? this.rng.pick(pool) : null;
  }

  record(soul, choice) {
    this.decisions.push({ soul, choice, circle: this.circle.id });
    const s = Save.meta.souls[soul] || (Save.meta.souls[soul] = { absolved: 0, condemned: 0, last: null });
    if (choice === 'absolve') { s.absolved++; this.moral.absolved++; Save.meta.totalAbsolved++; }
    else if (choice === 'condemn') { s.condemned++; this.moral.condemned++; Save.meta.totalCondemned++; }
    s.last = choice;
  }

  summary() {
    return {
      circle: this.circleIndex + 1, circleName: this.circle.name, kills: this.kills, rooms: this.roomsCleared,
      gold: this.gold, essences: this.essences, fragments: this.fragments, balance: this.moral.balance, tier: this.moral.tier,
      absolved: this.moral.absolved, condemned: this.moral.condemned, time: (performance.now() - this.startTime) / 1000,
      boons: { ...this.boons }, relics: [...this.relics], weapon: this.weapon, result: this.result,
    };
  }
}
