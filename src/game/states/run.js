// RunState: the descent. Rooms, waves, doors, rewards, souls, altars, shops, bosses, death.
import { generateRoom, NORTH_BAND } from '../roomgen.js';
import { TZ, C } from '../room.js';
import { Rng } from '../../core/rng.js';
import { Player } from '../player.js';
import { createEnemy, ENEMY_DEFS } from '../bestiary/index.js';
import { Door, RewardShrine, NPC, PropInteract, Pedestal, Pickup } from '../objects.js';
import { ROOM_TYPES, REWARDS, gateState } from '../map.js';
import { Input } from '../../core/input.js';
import { Events } from '../../core/events.js';
import { Save } from '../../core/save.js';
import { BOONS } from '../../data/boons.js';
import { RELICS, RELIC_ICON_COLORS } from '../../data/relics.js';
import { SOULS, GENERIC_SOULS } from '../../data/souls.js';
import { soulSheet, merchantSheet, beatriceSheet } from '../../art/characters.js';
import { DialogueRunner, pickDialogue, makeContext } from '../dialogue.js';
import { DIALOGUE } from '../../data/dialogue/index.js';
import { pillarSheet, explosionSheet } from '../../art/fx.js';
import { R } from '../../art/palette.js';
import { Trap } from '../traps.js';
import { iconURL } from '../../art/icons.js';
import { CIRCLES } from '../../data/circles.js';
import { SharedUniforms } from '../../render/lighting.js';
import { Sprite } from '../../render/sprite.js';
import { propSheet } from '../../art/props.js';

const REWARD_ICON = { gold: 'coin', essence: 'essence', fragment: 'fragment', boonV: 'virtue', boonS: 'sin', heal: 'heal', relic: 'relic' };

export class RunState {
  constructor() { this.dialog = null; }

  enter(params = {}) {
    const g = this.game;
    this.dialog = new DialogueRunner(g);
    g.controller = this;
    g.world.controller = this;
    this.run = g.run;
    this.transitioning = false;
    this.paused = false;
    this.mapOpen = false;
    if (params.resumeNode) { this.enterNode(params.resumeNode, { fromInterlude: true }); return; }
    this.startCircle(params.circle ?? 0);
  }

  exit() {
    const g = this.game;
    g.ui.bossHide();
    g.ui.clearLabels();
  }

  async startCircle(index) {
    const run = this.run, g = this.game;
    run.startCircle(index);
    Save.meta.bestCircle = Math.max(Save.meta.bestCircle, index + 1);
    Save.save();
    this.enterNode(run.map.start, { newCircle: true });
  }

  // ------------------------------------------------------------------------------------------
  // Room construction
  // ------------------------------------------------------------------------------------------
  enterNode(id, opts = {}) {
    const g = this.game, W = g.world, run = this.run;
    const node = run.map.nodes[id];
    run.nodeId = id;
    run.roomFlags = {};
    node.visited = true;
    const circle = run.circle;
    const rng = new Rng((run.seed ^ (run.circleIndex * 7919) ^ (parseInt(id.slice(1)) * 104729)) >>> 0);
    this.rng = rng;
    const exits = node.exits.map((eid) => ({ node: eid }));
    const type = node.type === 'start' ? (run.circleIndex === 0 ? 'start' : 'combat') : node.type;
    const layout = generateRoom({ type: type === 'start' ? 'start' : type, circle, rng, exits });
    layout.seed = rng.seed;
    W.loadRoom(layout, circle);
    g.ui.clearLabels();
    g.rig.extraTop = 0; g.rig.bossFocus = null;

    // player
    if (!W.player) {
      W.player = new Player(W, { x: layout.entrance.x, z: layout.entrance.z, weapon: run.weapon });
      run.applyToPlayer(W.player);
      W.player.hp = W.player.stats.maxHp;
    }
    const p = W.player;
    p.world = W;
    if (!W.root.children.includes(p.sprite.mesh)) { W.root.add(p.sprite.mesh); W.root.add(p.weaponSprite.mesh); W.root.add(p.halo.mesh); if (p.shadow) W.root.add(p.shadow); }
    p.x = layout.entrance.x; p.z = layout.entrance.z + 1.4;
    p.vx = 0; p.vz = 0; p.kx = 0; p.kz = 0;
    p.locked = false; p.state = 'free'; p.dashing = false;
    p.setTier(run.moral.tier);
    if (Save.meta.flags.power_fervorStart) p.fervor = Math.max(p.fervor, 34);
    g.rig.snapTo(p.x, p.z - 3);

    // doors
    this.doors = [];
    layout.doors.forEach((d) => {
      const target = run.map.nodes[d.node];
      const st = gateState(target, run, p);
      const kind = target.type;
      const icon = target.type === 'combat' || target.type === 'elite' || target.type === 'start' ? REWARD_ICON[target.reward] || ROOM_TYPES[target.type].icon : ROOM_TYPES[target.type].icon;
      const door = new Door(W, d, { node: target, circle: circle.id, kind, icon, state: st === 'hidden' ? 'hidden' : st === 'sealed' ? (target.gate === 'virtue' ? 'sealedV' : 'sealedS') : 'locked', label: target.label });
      door.gate = st;
      door.onEnter = () => this.goThrough(door);
      W.addInteractable(door);
      this.doors.push(door);
      const lbl = target.label || ROOM_TYPES[target.type].label;
      const rw = (target.type === 'combat' || target.type === 'elite') && target.reward ? ' · ' + REWARDS[target.reward].label : '';
      if (st !== 'hidden') door.label = g.ui.addLabel(d.x, 0.05, d.z + 0.55, lbl + rw, st === 'sealed' ? 'no' : '');
    });

    this.room = { node, layout, type, cleared: false, waves: [], wave: 0, spawning: false };
    if (circle.mechanic === 'fog') this.spawnMist(rng);
    Events.emit('room:enter', { node, circle });
    // fade in
    g.pipe.post.uFade.value.set(0, 0, 0, 1);
    this.fadeIn();

    const setup = {
      start: () => this.setupStart(opts), combat: () => this.setupCombat(), elite: () => this.setupCombat({ elite: true }),
      miniboss: () => this.setupMiniboss(), boss: () => this.setupBoss(), soul: () => this.setupSoul(), altarV: () => this.setupAltar('virtue'),
      altarS: () => this.setupAltar('sin'), shop: () => this.setupShop(), treasure: () => this.setupTreasure(), rest: () => this.setupRest(), secret: () => this.setupSecret(),
    }[type];
    this.holdWaves = !!opts.newCircle;
    const g0 = this.game;
    setup ? setup() : this.clearRoom();
    if (opts.newCircle) this.circleIntro(opts).then(() => { this.holdWaves = false; if (this.room?.combat && this.room.wave === 0 && !this.room.cleared) g0.after(0.5, () => this.nextWave()); });
  }

  // Limbo: banks of grey mist drift through the ruins, hiding the shades
  spawnMist(rng) {
    const W = this.game.world, L = this.room.layout;
    for (let k = 0; k < 5; k++) {
      const s = new Sprite(propSheet('mistCloud'), { anim: 'idle', pivot: 2, unlit: true, renderOrder: 14 });
      s.setAlpha(0.55);
      const m = { done: false, x: rng.range(2, L.w - 2), z: rng.range(5, L.h * TZ - 2), vx: rng.range(-0.4, 0.4) || 0.2, s, t: rng.next() * 10 };
      W.root.add(s.mesh);
      m.update = function (dt) {
        this.t += dt;
        this.x += this.vx * dt;
        if (this.x < 1 || this.x > L.w - 1) this.vx *= -1;
        this.s.update(dt);
        this.s.place(this.x, 0.4 + Math.sin(this.t * 0.5) * 0.2, this.z);
      };
      m.destroy = function () { this.done = true; this.s.dispose(); };
      W.addHazard(m);
    }
  }

  async circleIntro() {
    const g = this.game, run = this.run, p = g.world.player;
    if (p.stats.circleHeal) p.heal(p.stats.maxHp * p.stats.circleHeal);
    p.locked = true;
    await g.ui.titleCard(run.circle);
    p.locked = false;
    const ctx = makeContext(g);
    const id = pickDialogue(DIALOGUE, `virgilio.circle.${run.circle.id}`, ctx);
    if (id) await this.dialog.play(id, { registry: DIALOGUE, focus: { x: p.x, z: p.z }, zoom: 1.3 });
  }

  fadeIn(d = 0.45) {
    const post = this.game.pipe.post;
    this.fade = { from: post.uFade.value.w, to: 0, t: 0, d };
  }
  fadeOut(d = 0.35) {
    const post = this.game.pipe.post;
    return new Promise((r) => { this.fade = { from: post.uFade.value.w, to: 1, t: 0, d, done: r }; });
  }

  // ---- room types -----------------------------------------------------------------------
  setupStart(opts) {
    // Limbo threshold: Virgil waits; a gentle first fight teaches the verbs
    const g = this.game, W = g.world, L = this.room.layout;
    if (this.run.circleIndex === 0 && opts.newCircle) {
      this.setupCombat({ gentle: true });
    } else this.setupCombat({ gentle: true });
  }

  waveBudget(o = {}) {
    const run = this.run;
    const L = this.room.node.layer || 0;
    let budget = 3 + run.circleIndex * 0.55 + L * 0.45;
    if (o.gentle) budget = 2 + run.circleIndex * 0.4;
    if (o.elite) budget += 1;
    return Math.round(budget + this.rng.range(-0.5, 0.8));
  }

  setupCombat(o = {}) {
    const run = this.run, circle = run.circle, rng = this.rng;
    const nWaves = o.gentle ? 2 : o.elite ? 2 : rng.weighted([[2, 5], [3, 3 + run.circleIndex * 0.4]]);
    const waves = [];
    for (let w = 0; w < nWaves; w++) {
      const n = this.waveBudget(o) + (w === nWaves - 1 ? 1 : 0);
      const list = [];
      for (let k = 0; k < n; k++) {
        const id = rng.weighted(circle.enemies.map((e, i) => [e, i === 0 ? 1.3 : 1]));
        const elite = (o.elite && w === nWaves - 1 && k === 0) || rng.chance(run.moral.eliteChance * (o.gentle ? 0.2 : 1));
        const purified = !elite && rng.chance(run.moral.purifiedChance * 0.6);
        list.push({ id, elite, purified });
      }
      waves.push(list);
    }
    this.room.waves = waves;
    this.room.combat = true;
    // the Accusing Specter comes for those who condemn (GDD 4.2)
    if (!o.gentle && run.moral.condemned >= 3 && !run.flags.accuserDone && rng.chance(0.55)) this.room.accuser = true;
    // traps scale with corruption
    if (!o.gentle && rng.chance(run.moral.trapChance)) this.spawnTraps(rng.int(1, 2 + Math.floor(run.moral.corruption01 * 3)));
    for (const pad of this.room.layout.pads) this.game.world.addHazard(new Trap(this.game.world, pad.x, pad.z, circle.id, { kind: pad.kind }));
    for (const f of this.room.layout.features) if (f.kind === 'flameTomb') this.game.world.addHazard(new Trap(this.game.world, f.x, f.z + 0.9, 'herejia', { kind: 'flameTomb', radius: 1.2 }));
    this.game.world.player.locked = false;
    this.game.after(0.9, () => { if (!this.holdWaves) this.nextWave(); });
  }

  spawnTraps(n) {
    const W = this.game.world;
    for (let k = 0; k < n; k++) {
      const p = W.room.randomFloor(this.rng, (x, z) => Math.hypot(x - W.player.x, z - W.player.z) > 4);
      if (p) W.addHazard(new Trap(W, p.x, p.z, this.run.circle.id, {}));
    }
  }

  nextWave() {
    const room = this.room;
    if (!room || room.cleared || this.transitioning) return;
    const W = this.game.world;
    if (room.wave >= room.waves.length) { if (room.accuser && !room.accuserSpawned) { this.spawnAccuser(); return; } this.clearRoom(); return; }
    const list = room.waves[room.wave++];
    const spawns = this.rng.shuffle([...room.layout.spawns]).filter((s) => Math.hypot(s.x - W.player.x, s.z - W.player.z) > 4.5);
    list.forEach((e, k) => {
      const s = spawns[k % Math.max(1, spawns.length)] || room.layout.spawns[0];
      this.game.after(k * 0.16, () => {
        if (this.room !== room) return;
        this.spawnEnemy(e.id, s.x + this.rng.range(-0.4, 0.4), s.z + this.rng.range(-0.4, 0.4), { elite: e.elite, purified: e.purified, spawnDelay: 0.7 });
      });
    });
    Events.emit('wave', { index: room.wave, total: room.waves.length });
  }

  spawnEnemy(id, x, z, o = {}) {
    const W = this.game.world;
    if (!ENEMY_DEFS[id]) return null;
    // clamp to walkable
    if (!W.room.free(x, z, 0.45, ENEMY_DEFS[id].mode || 'walk')) {
      const p = W.room.randomFloor(this.rng, (px, pz) => Math.hypot(px - x, pz - z) < 4);
      if (p) { x = p.x; z = p.z; }
    }
    return createEnemy(W, id, x, z, o);
  }

  onEnemyKilled(e) {
    const run = this.run;
    run.kills++;
    if (!this.room || this.room.cleared || !this.room.combat) return;
    const alive = this.game.world.aliveEnemies().filter((x) => x !== e);
    if (alive.length === 0 && !this.room.bossRoom) {
      if (this.room.wave < this.room.waves.length) this.game.after(0.65, () => this.nextWave());
      else if (this.room.accuser && !this.room.accuserSpawned) this.game.after(0.8, () => this.spawnAccuser());
      else {
        // last kill of the room: slow-motion beat
        this.game.slowmo(0.3, 0.5);
        this.game.world.fx.screenFlash(0xffffff, 0.15, 0.1);
        this.game.after(0.7, () => this.clearRoom(), 'real');
      }
    }
  }

  async spawnAccuser() {
    const g = this.game, W = g.world, run = this.run, room = this.room;
    if (room.accuserSpawned) return;
    room.accuserSpawned = true;
    run.flags.accuserDone = true;
    const L = room.layout;
    const x = L.w / 2, z = (NORTH_BAND + 3.5) * TZ;
    W.fx.emit('corruptGlow', x, 1, z, 40, { radius: 1.2 });
    W.fx.screenFlash(0x400010, 0.4, 0.4);
    const id = pickDialogue(DIALOGUE, 'acusador', makeContext(g));
    if (id) await this.dialog.play(id, { registry: DIALOGUE, focus: { x, z }, zoom: 1.5 });
    const a = this.spawnEnemy('acusador', x, z, {});
    a?.activate?.();
    Events.emit('miniboss:appear', {});
  }

  onMinibossDefeated(b) {
    const W = this.game.world, run = this.run;
    W.addPickup(new Pickup(W, 'fragment', b.x, b.z, 1, { magnet: true, delay: 0.8 }));
    for (let k = 0; k < 6; k++) W.addPickup(new Pickup(W, 'essence', b.x, b.z, 1, { magnet: true, delay: 0.8 }));
    this.game.ui.toast(`${b.def.name} ha caído`, 'gold');
  }

  dropLoot(e) {
    const W = this.game.world, run = this.run, rng = this.rng;
    const mul = run.moral.rewardMul * (e.elite ? 2.5 : 1);
    const gold = Math.round((rng.int(1, 4) + run.circleIndex) * mul);
    const cursed = run.circle.mechanic === 'cursedGold' && rng.chance(0.4);
    if (gold > 0) {
      const pieces = Math.min(6, Math.ceil(gold / 3));
      for (let k = 0; k < pieces; k++) W.addPickup(new Pickup(W, cursed && k === 0 ? 'cursedGold' : 'gold', e.x, e.z, Math.ceil(gold / pieces)));
    }
    if (rng.chance(0.18 * mul)) W.addPickup(new Pickup(W, 'essence', e.x, e.z, 1));
    if (e.elite && rng.chance(0.35)) W.addPickup(new Pickup(W, 'fragment', e.x, e.z, 1 + (W.player.stats.eliteFragment || 0)));
    if (rng.chance(0.03)) W.addPickup(new Pickup(W, 'heal', e.x, e.z, 10));
  }

  clearRoom() {
    const room = this.room;
    if (!room || room.cleared) return;
    room.cleared = true;
    room.node.cleared = true;
    const g = this.game, W = g.world, run = this.run, p = W.player;
    if (room.combat) {
      run.roomsCleared++;
      for (const h of p.hooks.onRoomClear) h(p);
      if (p.stats.roomEssence) run.addEssence(p.stats.roomEssence, p);
      // all pickups fly to Dante
      for (const pk of W.pickups) pk.magnet = true;
      Events.emit('room:clear', {});
      g.ui.toast('Sala purificada', 'gold');
      for (const h of W.hazards) h.disarm?.();
    }
    // reward shrine for combat rooms
    const reward = room.node.reward;
    if (room.combat && reward && room.node.type !== 'boss') {
      const c = room.layout.medallion || { x: room.layout.w / 2, z: (room.layout.h / 2) * TZ };
      const pos = W.room.free(c.x, c.z, 0.5) ? c : W.room.randomFloor(this.rng) || c;
      W.addInteractable(new RewardShrine(W, pos.x, pos.z, reward, () => this.grantReward(reward, pos)));
    }
    this.unlockDoors();
  }

  unlockDoors() {
    const W = this.game.world, run = this.run;
    for (const d of this.doors) {
      const st = gateState(d.node, run, W.player);
      if (st === 'open') d.setState('open');
      else if (st === 'hidden') d.setState('hidden');
      Events.emit('door:open', {});
    }
  }

  // Re-check gates when the moral balance changes mid-room (e.g. after a dilemma)
  refreshGates() {
    const W = this.game.world, run = this.run;
    if (!this.room?.cleared) return;
    for (const d of this.doors) {
      const st = gateState(d.node, run, W.player);
      if (st === 'open' && d.state !== 'open') {
        if (d.state === 'hidden') { d.reveal(); d.label = this.game.ui.addLabel(d.door.x, 0.05, d.door.z + 0.55, ROOM_TYPES[d.node.type].label); }
        else d.setState('open');
      }
    }
  }

  async grantReward(reward, pos) {
    const g = this.game, W = g.world, run = this.run, p = W.player;
    const doubled = p.stats.doubleReward && Math.random() < p.stats.doubleReward;
    const times = doubled ? 2 : 1;
    if (doubled) g.ui.toast('La Rueda gira: recompensa doble', 'gold');
    for (let t = 0; t < times; t++) {
      switch (reward) {
        case 'gold': { const n = Math.round((40 + run.circleIndex * 12) * run.moral.rewardMul); for (let k = 0; k < 10; k++) W.addPickup(new Pickup(W, 'gold', pos.x, pos.z, Math.ceil(n / 10), { magnet: true, delay: 0.5 })); break; }
        case 'essence': { const n = 4 + Math.floor(run.circleIndex / 2); for (let k = 0; k < n; k++) W.addPickup(new Pickup(W, 'essence', pos.x, pos.z, 1, { magnet: true, delay: 0.5 })); break; }
        case 'fragment': W.addPickup(new Pickup(W, 'fragment', pos.x, pos.z, 1, { magnet: true, delay: 0.5 })); break;
        case 'heal': p.heal(Math.round(p.stats.maxHp * 0.3)); break;
        case 'boonV': await this.offerBoons('virtue'); break;
        case 'boonS': await this.offerBoons('sin'); break;
        case 'relic': await this.offerRelics(2); break;
      }
    }
  }

  async offerBoons(kind) {
    const g = this.game, run = this.run, p = g.world.player;
    const ids = run.boonOffers(kind, 3);
    if (!ids.length) return;
    const cards = ids.map((id) => {
      const b = BOONS[id];
      const l = (run.boons[id] || 0) + 1;
      return { icon: b.icon, name: b.name, level: run.boons[id] ? `Nivel ${run.boons[id]} → ${Math.min(3, l)}` : 'Nuevo', desc: b.desc(Math.min(3, l)), kind: kind === 'virtue' ? '+ Virtud' : '+ Pecado', kindColor: kind === 'virtue' ? '#ffe8a0' : '#ff8a90', style: kind === 'virtue' ? 'holy' : 'crimson', nm_color: b.color };
    });
    Events.emit(kind === 'virtue' ? 'altar:virtue' : 'altar:sin', {});
    const i = await g.ui.pick({ title: kind === 'virtue' ? 'Don de Virtud' : 'Don de Pecado', sub: kind === 'virtue' ? 'La gracia exige. Elige una virtud.' : 'El poder siempre tiene un precio. Elige un pecado.', cards, style: kind === 'virtue' ? 'holy' : 'crimson' });
    if (i < 0) return;
    run.addBoon(ids[i]);
    run.applyToPlayer(p);
    const fx = g.world.fx;
    if (kind === 'virtue') { fx.play(pillarSheet('holy', R.holy), { x: p.x, y: 0, z: p.z + 0.05, pivot: 0 }); fx.screenFlash(0xfff4cc, 0.3, 0.2); }
    else { fx.emit('corruption', p.x, 1, p.z, 30, { radius: 0.6 }); fx.screenFlash(0x6a0010, 0.35, 0.2); }
    g.ui.toast(`${BOONS[ids[i]].name} ${'I'.repeat(run.boons[ids[i]])}`, kind === 'virtue' ? 'virtue' : 'sin');
    this.refreshGates();
  }

  async offerRelics(n = 2, opts = {}) {
    const g = this.game, run = this.run, p = g.world.player;
    const pool = run.rng.shuffle(run.relicPool()).slice(0, n);
    if (!pool.length) { run.addGold(80, p); return; }
    const cards = pool.map((id) => { const r = RELICS[id]; return { icon: r.icon, name: r.name, level: r.rarity, desc: r.desc, style: r.rarity === 'maldita' ? 'crimson' : r.rarity === 'legendaria' ? 'gold' : 'stone', nm_color: RELIC_ICON_COLORS[r.rarity] }; });
    const i = await g.ui.pick({ title: 'Reliquia', sub: 'Un objeto con memoria. Elige uno.', cards, allowSkip: opts.allowSkip });
    if (i < 0) return;
    run.addRelic(pool[i]);
    run.applyToPlayer(p);
    g.world.fx.emit('holy', p.x, 1.2, p.z, 20, { radius: 0.5 });
    g.ui.toast(RELICS[pool[i]].name, 'gold');
    this.refreshGates();
  }

  // ---- soul dilemma ---------------------------------------------------------------------
  setupSoul() {
    const g = this.game, W = g.world, run = this.run, L = this.room.layout;
    const named = Object.values(SOULS).find((s) => s.circle === run.circle.id && !run.decisions.some((d) => d.soul === s.id));
    const soul = named || this.rng.pick(GENERIC_SOULS.filter((s) => !run.decisions.some((d) => d.soul === s.id))) || GENERIC_SOULS[0];
    const x = L.w / 2, z = (NORTH_BAND + 3.2) * TZ;
    const sp = soul.sprite || {};
    const npc = new NPC(W, x, z, {
      name: soul.name, sheet: soulSheet(sp), anim: 'idle_down', hover: soul.hover ?? 0.15, light: sp.glow ?? 0x6a8ab0, aura: 'soul', prompt: 'Escuchar',
      onInteract: () => this.talkToSoul(soul, npc),
    });
    W.addInteractable(npc);
    // candles around
    this.room.soulNpc = npc;
    W.fx.decal('runes', x, z, 2.2, { unlit: true, temp: true, color: 0x7898b0, alpha: 0.6 });
    this.clearRoom();
  }

  async talkToSoul(soul, npc) {
    if (npc.used) return;
    npc.used = true;
    const g = this.game;
    const res = await this.dialog.play({ lines: [...soul.intro, { moral: soul.id }] }, { focus: { x: npc.x, z: npc.z }, zoom: 1.6, ctx: { soulName: soul.name, soul } });
    void res;
  }

  // called by the dialogue runner on { moral: id }
  async moralChoice(soulId, ctx) {
    const g = this.game, W = g.world, run = this.run, p = W.player;
    const soul = SOULS[soulId] || GENERIC_SOULS.find((s) => s.id === soulId);
    g.ui.dialogue.close();
    g.rig.setZoom(1.75, { x: this.room.soulNpc?.x ?? p.x, z: this.room.soulNpc?.z ?? p.z }, 2);
    const choice = await g.ui.moralChoice(soul);
    run.record(soul.id, choice);
    const npc = this.room.soulNpc;
    const fx = W.fx;
    if (choice === 'absolve') {
      run.moral.add('virtue', soul.absolve.virtue ?? 10, 'absolve:' + soul.id);
      Events.emit('moral:absolve', { soul: soul.id });
      g.hitstop(0.15);
      fx.screenFlash(0xfff4cc, 0.75, 0.6);
      fx.play(pillarSheet('absolve', R.holy, 28, 120), { x: npc.x, y: 0, z: npc.z + 0.05, pivot: 0, scale: 1.3 });
      fx.emit('holy', npc.x, 1.2, npc.z, 60, { radius: 0.8, speed: [1, 5] });
      fx.ring('holyMote', npc.x, npc.z, 1, 30, { speed: [2, 4] });
      fx.lightFlash(npc.x, npc.z, 0xfff4cc, 4, 10, 1.2);
      npc.ascend = true;
      g.ui.toast(`Absuelto · +${soul.absolve.virtue ?? 10} Virtud`, 'virtue');
    } else {
      run.moral.add('sin', soul.condemn.sin ?? 10, 'condemn:' + soul.id);
      Events.emit('moral:condemn', { soul: soul.id });
      g.hitstop(0.2);
      fx.screenFlash(0x8a0010, 0.7, 0.5);
      fx.shake(0.8);
      fx.aberration(1.4);
      fx.decal('brand', npc.x, npc.z, 2.2, { unlit: true, glow: 1, color: 0xff3040, alpha: 1 });
      fx.emit('corruption', npc.x, 0.8, npc.z, 60, { radius: 0.8, speed: [1, 4] });
      fx.emit('corruptGlow', npc.x, 0.8, npc.z, 30, { radius: 0.6 });
      fx.lightFlash(npc.x, npc.z, 0xc0102a, 4, 10, 1.2);
      npc.condemned = true;
      // the stolen essence flows into Dante
      for (let k = 0; k < 20; k++) g.after(k * 0.04, () => fx.line('corruptGlow', npc.x, npc.z, p.x, p.z, 6, { y: 1 }), 'real');
      g.ui.toast(`Condenado · +${soul.condemn.sin ?? 10} Pecado`, 'sin');
    }
    // the soul leaves the world: ascending in light or dragged down
    const sprite = npc.sprite;
    g.tween(1.8, (k) => {
      const t = k * 1.8;
      if (!sprite.mesh.parent) return;
      if (choice === 'absolve') { sprite.place(npc.x, t * 2.2, npc.z); sprite.setDissolve(Math.min(1, t / 1.6), 0xfff4cc); }
      else { sprite.place(npc.x, -t * 1.2, npc.z); sprite.setDissolve(Math.min(1, t / 1.4), 0xff2040); sprite.setTint(0x400010, Math.min(1, t)); }
    }).then(() => npc.destroy());
    await g.wait(0.9);
    g.rig.setZoom(1.4, { x: npc.x, z: npc.z }, 3);
    const branch = soul[choice];
    await this.applySoulReward(branch.reward || {});
    if (branch.lines?.length) await this.dialog.runSteps(branch.lines, { ...ctx, soulName: soul.name }, {}, {});
    this.refreshGates();
    return choice;
  }

  async applySoulReward(r) {
    const g = this.game, run = this.run, p = g.world.player;
    if (r.boon) { run.addBoon(r.boon); g.ui.toast(BOONS[r.boon].name, BOONS[r.boon].kind); }
    if (r.boonKind) { g.ui.dialogue.close(); await this.offerBoons(r.boonKind); }
    if (r.relic) { if (!run.relics.includes(r.relic)) { run.addRelic(r.relic); g.ui.toast(RELICS[r.relic].name, 'gold'); } else run.addGold(60, p); }
    if (r.halveGold) run.gold = Math.floor(run.gold / 2);
    if (r.gold) run.addGold(r.gold, p);
    if (r.heal) p.heal(r.heal);
    if (r.maxHp) { run.flags.maxHpBonus = (run.flags.maxHpBonus || 0) + r.maxHp; }
    if (r.essence) run.addEssence(r.essence, p);
    if (r.fragment) run.addFragment(r.fragment);
    if (r.damage) run.flags.damageBonus = (run.flags.damageBonus || 0) + r.damage;
    if (r.fervor) p.fervor = Math.min(100, p.fervor + r.fervor);
    if (r.curse) p.applyStatus('curse', 1, r.curse);
    run.applyToPlayer(p);
  }

  // ---- altars / treasure / rest / shop / secret -------------------------------------------
  setupAltar(kind) {
    const g = this.game, W = g.world, L = this.room.layout;
    const x = L.w / 2, z = (NORTH_BAND + 3) * TZ;
    const node = this.room.node;
    const altar = new PropInteract(W, x, z, {
      prop: kind === 'virtue' ? 'virtueAltar' : 'sinAltar', prompt: kind === 'virtue' ? 'Rezar' : 'Ofrecer sangre', solid: 0.9,
      emit: kind === 'virtue' ? { preset: 'holyMote', rate: 4, y: 1.4 } : { preset: 'corruptGlow', rate: 4, y: 1.2 },
      onInteract: async (pl, it) => {
        if (it.used) return;
        it.used = true;
        if (kind === 'sin') { pl.hp = Math.max(1, pl.hp - 8); W.fx.emit('blood', pl.x, 1, pl.z, 12); g.ui.toast('El altar bebe tu sangre (-8)', 'sin'); }
        await this.offerBoons(kind);
        if (node.gate === 'virtue') { await this.offerRelics(2, { allowSkip: true }); }
      },
    });
    W.addInteractable(altar);
    this.clearRoom();
  }

  setupTreasure() {
    const g = this.game, W = g.world, L = this.room.layout;
    const x = L.w / 2, z = (NORTH_BAND + 3) * TZ;
    const ped = new Pedestal(W, x, z, { item: { kind: 'relic' }, icon: 'relic', prompt: 'Examinar', onInteract: async (pl, it) => { if (it.used) return; it.sold(); await this.offerRelics(3); } });
    W.addInteractable(ped);
    this.clearRoom();
  }

  setupRest() {
    const g = this.game, W = g.world, L = this.room.layout, run = this.run;
    const x = L.w / 2, z = (NORTH_BAND + 3) * TZ;
    const fountain = new PropInteract(W, x, z, {
      prop: 'shrineBeatrice', prompt: 'Beber de la fuente', solid: 1,
      light: { color: 0xffd890, intensity: 1.3, radius: 7, y: 2.4 },
      onInteract: async (pl, it) => {
        if (it.used) return;
        it.used = true;
        pl.heal(Math.round(pl.stats.maxHp * 0.4));
        W.fx.play(pillarSheet('rest', R.holy), { x: pl.x, y: 0, z: pl.z + 0.05, pivot: 0 });
        Events.emit('rest', {});
        // Beatrice appears in visions more often to the virtuous
        const chance = 0.35 + run.moral.virtue01 * 0.5;
        if (Math.random() < chance) await this.beatriceVision(x, z + 1.6);
      },
    });
    W.addInteractable(fountain);
    this.clearRoom();
  }

  async beatriceVision(x, z) {
    const g = this.game, W = g.world;
    const ctx = makeContext(g);
    const id = pickDialogue(DIALOGUE, 'beatriz.vision', ctx);
    if (!id) return;
    const npc = new NPC(W, x, z, { name: 'Beatriz', sheet: beatriceSheet(), anim: 'idle_down', hover: 0.3, light: 0xffe0a0, lightIntensity: 1.6, lightRadius: 7, aura: 'holyMote', prompt: '' });
    npc.sprite.setAlpha(0);
    npc.active = false;
    W.addInteractable(npc);
    W.fx.play(pillarSheet('beatriz', R.holy, 28, 120), { x, y: 0, z: z + 0.05, pivot: 0, scale: 1.2 });
    Events.emit('beatriz:appear', {});
    g.tween(0.6, (k) => npc.sprite.setAlpha(k));
    Save.meta.beatriceVisions++;
    await g.wait(0.7);
    await this.dialog.play(id, { registry: DIALOGUE, focus: { x, z }, zoom: 1.7 });
    g.tween(0.7, (k) => npc.sprite.setAlpha(1 - k)).then(() => npc.destroy());
  }

  setupShop() {
    const g = this.game, W = g.world, L = this.room.layout, run = this.run, p = W.player;
    const x = L.w / 2, z = (NORTH_BAND + 2.4) * TZ;
    const merchant = new NPC(W, x, z, { name: 'Mercader espectral', sheet: merchantSheet(), anim: 'idle_down', light: 0xf0c040, aura: 'holyMote', prompt: 'Hablar', onInteract: async () => {
      const ctx = makeContext(g);
      const id = pickDialogue(DIALOGUE, 'mercader', ctx);
      if (id) await this.dialog.play(id, { registry: DIALOGUE, focus: { x, z }, zoom: 1.5 });
    } });
    W.addInteractable(merchant);
    const items = [];
    const rng = this.rng;
    items.push({ kind: 'boon', id: rng.pick(run.boonOffers('virtue', 3)), base: 110 });
    items.push({ kind: 'boon', id: rng.pick(run.boonOffers('sin', 3)), base: 95 });
    const relic = run.randomRelic();
    if (relic) items.push({ kind: 'relic', id: relic, base: 150 });
    items.push({ kind: 'heal', base: 45 });
    if (rng.chance(0.5)) items.push({ kind: 'fragment', base: 90 });
    const n = items.length;
    items.forEach((it, k) => {
      const ix = x + (k - (n - 1) / 2) * 2.4, iz = z + 3.2;
      const price = run.shopPrice(it.base, p);
      const icon = it.kind === 'boon' ? BOONS[it.id].icon : it.kind === 'relic' ? RELICS[it.id].icon : it.kind === 'heal' ? 'heal' : 'fragment';
      const name = it.kind === 'boon' ? BOONS[it.id].name : it.kind === 'relic' ? RELICS[it.id].name : it.kind === 'heal' ? 'Cáliz de vida' : 'Fragmento';
      const ped = new Pedestal(W, ix, iz, {
        item: it, price, icon, color: it.kind === 'boon' && BOONS[it.id].kind === 'sin' ? 0xc8243a : 0xf2c45a,
        prompt: () => `${name} · ${price} oro`,
        onInteract: async (pl, pd) => {
          if (pd.used) return;
          if (run.gold < price) { g.ui.toast('No tienes oro suficiente', ''); Events.emit('ui:deny'); return; }
          // confirm via card
          const desc = it.kind === 'boon' ? BOONS[it.id].desc(Math.min(3, (run.boons[it.id] || 0) + 1)) : it.kind === 'relic' ? RELICS[it.id].desc : it.kind === 'heal' ? 'Recupera 40% de tu vida.' : 'Un Fragmento de Reliquia para el Hub.';
          const i = await g.ui.pick({ title: name, sub: 'El mercader sonríe con demasiados dientes.', cards: [{ icon, name, desc, price: price + ' oro', style: 'gold' }], allowSkip: true, foot: '[E] Comprar · [Esc] Dejar' });
          if (i < 0) return;
          run.gold -= price;
          if (pl.stats.purchaseSin) run.moral.add('sin', pl.stats.purchaseSin, 'judas');
          if (it.kind === 'boon') { run.addBoon(it.id); g.ui.toast(BOONS[it.id].name, BOONS[it.id].kind); }
          else if (it.kind === 'relic') { run.addRelic(it.id); g.ui.toast(RELICS[it.id].name, 'gold'); }
          else if (it.kind === 'heal') pl.heal(Math.round(pl.stats.maxHp * 0.4));
          else run.addFragment(1);
          run.applyToPlayer(pl);
          pd.sold();
          Events.emit('shop:buy', { item: it });
          W.fx.emit('gold', pd.x, 1.5, pd.z, 12);
        },
      });
      W.addInteractable(ped);
      ped.lbl = g.ui.addLabel(ix, 0.2, iz + 0.6, () => (ped.used ? 'Vendido' : `${price}`), run.gold >= price ? '' : 'no');
    });
    this.clearRoom();
  }

  setupSecret() {
    const g = this.game, W = g.world, L = this.room.layout;
    const x = L.w / 2, z = (NORTH_BAND + 3) * TZ;
    g.ui.toast('Una sala que el Infierno quería ocultar', 'doubt');
    const reward = this.room.node.reward;
    W.addInteractable(new RewardShrine(W, x, z, reward, () => this.grantReward(reward, { x, z })));
    // secret rooms also hold lore
    const ctx = makeContext(g);
    const id = pickDialogue(DIALOGUE, 'secreto', ctx);
    if (id) g.after(0.6, () => this.dialog.play(id, { registry: DIALOGUE }), 'real');
    this.clearRoom();
  }

  // ---- minibosses & bosses -------------------------------------------------------------
  setupMiniboss() {
    const g = this.game, W = g.world, L = this.room.layout, run = this.run;
    const id = this.room.node.miniboss || run.circle.miniboss;
    this.room.combat = true;
    this.room.waves = [];
    const x = L.w / 2, z = (NORTH_BAND + 4) * TZ;
    g.after(0.8, () => {
      const mb = this.spawnEnemy(ENEMY_DEFS[id] ? id : run.circle.enemies[0], x, z, { elite: !ENEMY_DEFS[id] });
      if (mb?.activate) { mb.activate(); }
      g.ui.bigText(ENEMY_DEFS[id]?.name || 'Minijefe', ENEMY_DEFS[id]?.title || '', '#ff8a90', 2.2);
      Events.emit('miniboss:appear', {});
    });
  }

  async setupBoss() {
    const g = this.game, W = g.world, L = this.room.layout, run = this.run, p = W.player;
    this.room.combat = true;
    this.room.bossRoom = true;
    this.room.waves = [];
    for (const d of this.doors) d.setState('hidden');
    const id = run.circle.boss;
    const def = ENEMY_DEFS[id];
    const x = L.w / 2, z = (NORTH_BAND + (def?.bigBoss ? 6 : 4.5)) * TZ;
    if (!def) { this.clearRoom(); this.onBossDefeated(null); return; }
    const boss = this.spawnEnemy(id, x, z, {});
    if (def.bigBoss) { g.rig.extraTop = def.bigBoss; g.rig.bossFocus = boss; }
    this.boss = boss;
    p.locked = true;
    // cinematic intro: camera on the boss, letterbox, name card, dialogue
    await g.wait(0.6);
    g.ui.setLetterbox(true);
    g.rig.setZoom(1.5, { x: boss.x, z: boss.z }, 2.5);
    Events.emit('boss:intro', { boss });
    await g.wait(0.9);
    boss.play('roar', { restart: true });
    W.fx.shake(0.5);
    await g.ui.bigText(def.name.toUpperCase(), def.title, '#f0d0c0', 2.4);
    if (def.intro) await this.dialog.play({ lines: def.intro }, { focus: { x: boss.x, z: boss.z }, zoom: 1.5 });
    g.ui.setLetterbox(false);
    g.rig.setZoom(1, null, 3);
    p.locked = false;
    boss.activate();
    def.arena?.(W, boss, this);
  }

  async onBossDefeated(boss) {
    const g = this.game, W = g.world, run = this.run, p = W.player;
    run.bossesDefeated.push(run.circle.id);
    Save.meta.bossKills[run.circle.id] = (Save.meta.bossKills[run.circle.id] || 0) + 1;
    this.room.cleared = true;
    // rewards: essences + fragment rain
    const bx = boss?.x ?? W.room.w / 2, bz = boss?.z ?? 8;
    for (let k = 0; k < 8 + run.circleIndex; k++) W.addPickup(new Pickup(W, 'essence', bx, bz, 1, { magnet: true, delay: 0.8 }));
    W.addPickup(new Pickup(W, 'fragment', bx, bz, 1, { magnet: true, delay: 1 }));
    for (let k = 0; k < 12; k++) W.addPickup(new Pickup(W, 'gold', bx, bz, 5, { magnet: true, delay: 0.8 }));
    p.heal(p.stats.maxHp * 0.25);
    Events.emit('victory', { circle: run.circle.id });
    await g.ui.bigText('JUICIO CUMPLIDO', run.circle.name + ' queda atrás', '#ffe8a0', 3);
    if (boss?.def.outro) await this.dialog.play({ lines: boss.def.outro }, { focus: { x: p.x, z: p.z }, zoom: 1.4 });
    if (run.circleIndex >= 8) { this.finishDescent(); return; }
    // exit portal to the interlude
    const L = this.room.layout;
    const d = L.doors[0] || { x: L.w / 2, z: NORTH_BAND * TZ - 0.1, side: 'N' };
    const door = new Door(W, { ...d, x: L.w / 2, z: NORTH_BAND * TZ - 0.1, side: 'N' }, { node: { type: 'exit' }, circle: run.circle.id, kind: 'exit', icon: 'gate', state: 'open' });
    door.onEnter = () => this.toInterlude();
    W.addInteractable(door);
    // carve the north wall open where the exit appears
    g.ui.addLabel(L.w / 2, 0.05, NORTH_BAND * TZ + 0.5, 'Descender');
  }

  async toInterlude() {
    if (this.transitioning) return;
    this.transitioning = true;
    const g = this.game, run = this.run, p = g.world.player;
    run.hp = p.hp;
    await this.fadeOut(0.6);
    this.transitioning = false;
    g.setState('interlude', { from: run.circleIndex });
  }

  async finishDescent() {
    const g = this.game, run = this.run;
    run.finished = true;
    run.result = 'victory';
    await this.fadeOut(1.2);
    g.setState('ending', {});
  }

  // ---- movement between rooms ----------------------------------------------------------
  async goThrough(door) {
    if (this.transitioning) return;
    this.transitioning = true;
    const g = this.game, p = g.world.player;
    p.locked = true;
    p.scriptedMove = { x: door.x, z: door.z - 1.2, speed: 5 };
    Events.emit('door:enter', { node: door.node });
    await this.fadeOut(0.35);
    this.transitioning = false;
    this.enterNode(door.node.id);
  }

  // ---- death -----------------------------------------------------------------------------
  async onPlayerDeath() {
    const g = this.game, run = this.run;
    if (this.dying) return;
    this.dying = true;
    run.result = 'death';
    g.pipe.post.uDesat.value = 0;
    g.tween(1.5, (k) => { g.pipe.post.uDesat.value = k * 0.8; });
    await g.wait(2.2);
    await this.fadeOut(1.0);
    g.pipe.post.uDesat.value = 0;
    this.dying = false;
    g.setState('runEnd', { result: 'death' });
  }

  // ---- pause / map ----------------------------------------------------------------------
  async openPause() {
    const g = this.game;
    this.paused = true;
    const i = await g.ui.menu({ title: 'Pausa', sub: `${this.run.circle.name} · ${ROOM_TYPES[this.room.node.type].label}`, items: [{ label: 'Reanudar' }, { label: 'Mapa del círculo' }, { label: 'Opciones' }, { label: 'Abandonar descenso' }], cancel: 0 });
    if (i === 1) await g.ui.showMap?.(this.run, this.room.node.id);
    if (i === 2) await g.ui.options?.();
    if (i === 3) {
      const c = await g.ui.menu({ title: '¿Abandonar?', sub: 'Conservarás las Esencias y Fragmentos obtenidos.', items: [{ label: 'Seguir descendiendo' }, { label: 'Abandonar' }], cancel: 0, style: 'crimson' });
      if (c === 1) { this.paused = false; this.run.result = 'abandon'; g.setState('runEnd', { result: 'abandon' }); return; }
    }
    this.paused = false;
  }

  // ------------------------------------------------------------------------------------------
  update(dt, rawDt) {
    const g = this.game, W = g.world, p = W.player;
    if (this.fade) {
      const F = this.fade;
      F.t += rawDt;
      const k = Math.min(1, F.t / F.d);
      g.pipe.post.uFade.value.w = F.from + (F.to - F.from) * k;
      if (k >= 1) { const d = F.done; this.fade = null; d?.(); }
    }
    const blocked = g.ui.blocking || this.paused;
    if (!blocked && Input.wasPressed('pause') && !this.transitioning) { this.openPause(); }
    if (!blocked && Input.wasPressed('map') && g.ui.showMap) { this.paused = true; g.ui.showMap(this.run, this.room.node.id).then(() => { this.paused = false; }); }
    W.paused = blocked;
    W.update(blocked ? 0 : dt);
    if (p) {
      const aimX = p.aimFromMouse && !p.locked ? Math.cos(p.aim) * 1.3 : 0, aimZ = p.aimFromMouse && !p.locked ? Math.sin(p.aim) * 1.0 : 0;
      g.rig.update(rawDt, p.x, p.z, aimX, aimZ);
      W.lights.update(rawDt, p.x, p.z);
    }
    // moral tier tracking (Dante transforms in place)
    if (p && this.run && p.tier !== this.run.moral.tier && !blocked) {
      p.setTier(this.run.moral.tier);
      g.ui.toast(`Dante es ahora ${['Caído', 'Corrompido', 'Peregrino', 'Piadoso', 'Santo'][this.run.moral.tier + 2]}`, this.run.moral.tier >= 0 ? 'virtue' : 'sin');
    }
    // Fraude: darkness — only Dante's own light reveals Malebolge
    if (this.run?.circle.mechanic === 'illusion' && p && !W.visionOverride) {
      SharedUniforms.uVision.value.set(p.x, p.z, (p.light?.radius || 7) + 0.5, 0.8);
    }
    g.pipe.post.uCorruption.value = this.run ? this.run.moral.corruption01 : 0;
    g.pipe.post.uVirtue.value = this.run ? this.run.moral.virtue01 : 0;
  }
}
