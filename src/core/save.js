// Persistent meta-progression. Autosaved in the Hub and at the start of every run (GDD 4.6.2).
const KEY = 'sulphur.save.v1';
const SETTINGS_KEY = 'sulphur.settings.v1';

export function defaultMeta() {
  return {
    version: 1,
    created: Date.now(),
    essences: 0,
    fragments: 0,
    runs: 0,
    deaths: 0,
    victories: 0,
    bestCircle: 0,
    upgrades: {},             // id -> level
    unlockedWeapons: ['espada'],
    unlockedRelics: [],       // extra relics added to the pool
    selectedWeapon: 'espada',
    flags: {},                // narrative flags (persist between runs)
    seen: {},                 // dialogue ids seen -> count
    souls: {},                // soulId -> { absolved: n, condemned: n, last: 'absolve'|'condemn' }
    endings: [],              // endings achieved
    totalAbsolved: 0,
    totalCondemned: 0,
    lastRun: null,
    bossKills: {},
    beatriceVisions: 0,
  };
}

export function defaultSettings() {
  return {
    musicVolume: 0.7,
    sfxVolume: 0.8,
    voiceVolume: 0.8,
    masterVolume: 0.9,
    screenShake: 1,
    gameSpeed: 1,
    subtitles: true,
    colorblind: 'none',      // none | deuter | protan | tritan
    minimap: true,
    fullscreen: false,
    pixelScale: 'auto',
    bloom: true,
    damageNumbers: true,
  };
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, v) {
  try { localStorage.setItem(key, v); return true; } catch { return false; }
}

export const Save = {
  meta: defaultMeta(),
  settings: defaultSettings(),
  hasSave: false,

  load() {
    const raw = safeGet(KEY);
    if (raw) {
      try {
        this.meta = Object.assign(defaultMeta(), JSON.parse(raw));
        this.hasSave = true;
      } catch { this.meta = defaultMeta(); }
    }
    const rs = safeGet(SETTINGS_KEY);
    if (rs) {
      try { this.settings = Object.assign(defaultSettings(), JSON.parse(rs)); } catch { /* keep defaults */ }
    }
  },
  save() {
    this.hasSave = safeSet(KEY, JSON.stringify(this.meta)) || this.hasSave;
  },
  saveSettings() { safeSet(SETTINGS_KEY, JSON.stringify(this.settings)); },
  reset() {
    this.meta = defaultMeta();
    this.save();
  },
  flag(name, value) {
    if (value === undefined) return this.meta.flags[name];
    this.meta.flags[name] = value;
  },
  markSeen(id) { this.meta.seen[id] = (this.meta.seen[id] || 0) + 1; },
  seenCount(id) { return this.meta.seen[id] || 0; },
  upgrade(id) { return this.meta.upgrades[id] || 0; },
};
