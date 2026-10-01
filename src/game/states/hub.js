// HUB · La Antesala del Infierno. A reflective pause before each descent (GDD 8.2.1).
// Virgil, Beatrice's shrine, the weapon rack, the Altar of Virtues (Essences),
// the Reliquary (Relic Fragments) and the stairs down beneath the Gate.
import { generateRoom, NORTH_BAND } from '../roomgen.js';
import { TZ } from '../room.js';
import { Rng } from '../../core/rng.js';
import { Player } from '../player.js';
import { NPC, PropInteract } from '../objects.js';
import { virgilSheet, beatriceSheet } from '../../art/characters.js';
import { Save } from '../../core/save.js';
import { Events } from '../../core/events.js';
import { Input } from '../../core/input.js';
import { DialogueRunner, pickDialogue, makeContext } from '../dialogue.js';
import { DIALOGUE } from '../../data/dialogue/index.js';
import { SOULS } from '../../data/souls.js';
import { UPGRADES, POWERS } from '../../data/upgrades.js';
import { WEAPONS, WEAPON_ORDER } from '../../data/weapons.js';
import { RELICS } from '../../data/relics.js';
import { Run } from '../run.js';
import { weaponIconURL } from '../../art/weapons.js';
import { pillarSheet } from '../../art/fx.js';
import { R } from '../../art/palette.js';
import { Sprite } from '../../render/sprite.js';
import { propSheet } from '../../art/props.js';

const HUB_CIRCLE = {
  id: 'hub', name: 'Antesala', liquid: { kind: 'water', block: false, slow: 0, damage: 0 },
  props: { common: ['candelabra', 'mourner', 'urn', 'graveCross', 'skullPile', 'brokenColumn'], light: 'brazier', fireRamp: null },
  ambient: 'ash',
};

export class HubState {
  enter(params = {}) {
    const g = this.game, W = g.world;
    this.dialog = new DialogueRunner(g);
    g.controller = this;
    W.controller = this;
    g.run = null;
    this.paused = false;
    Save.meta.flags.lastTier = params.lastTier ?? Save.meta.flags.lastTier ?? 0;
    const rng = new Rng(777);
    const layout = generateRoom({ type: 'interlude', circle: HUB_CIRCLE, rng, exits: [], shape: 'plain' });
    // clear random dressing near the stations
    layout.props = layout.props.filter((p) => p.z > (NORTH_BAND + 1.2) * TZ && Math.abs(p.x - layout.w / 2) > 4 || p.light);
    W.loadRoom(layout, HUB_CIRCLE);
    this.layout = layout;
    // player
    if (W.player) { W.player.destroy(); W.player.weaponSprite.dispose(); W.player.halo.dispose(); W.lights.remove(W.player.light); W.player = null; }
    W.player = new Player(W, { x: layout.w / 2, z: (layout.h - 3) * TZ, weapon: Save.meta.selectedWeapon });
    const p = W.player;
    p.setTier(Save.meta.flags.lastTier || 0);
    p.hp = p.stats.maxHp;
    g.rig.snapTo(p.x, p.z - 2);
    this.buildStations();
    g.pipe.post.uFade.value.set(0, 0, 0, 1);
    this.fade = { from: 1, to: 0, t: 0, d: 1.0 };
    g.pipe.post.uCorruption.value = 0;
    g.pipe.post.uVirtue.value = 0;
    g.ui.showHud(true);
    Save.save();
    Events.emit('hub:enter', {});
    // Virgil speaks first if he has something important to say
    g.after(1.3, () => this.autoTalk(), 'real');
  }

  exit() { this.game.ui.clearLabels(); }

  buildStations() {
    const g = this.game, W = g.world, L = this.layout;
    const cx = L.w / 2, top = (NORTH_BAND + 0.6) * TZ;
    // the Gate of Hell + stairs down
    const gate = new Sprite(propSheet('gateArch'), { anim: 'idle', pivot: 2, minLight: 0.35 });
    gate.place(cx, 0, NORTH_BAND * TZ + 0.05);
    W.built.group.add(gate.mesh);
    W.lights.add({ x: cx, z: NORTH_BAND * TZ + 1, y: 3, color: 0xff5020, intensity: 1.2, radius: 8, flicker: 0.4 });
    const stairs = new PropInteract(W, cx, top + 1.6, {
      prop: 'descentStairs', prompt: 'Descender al Infierno', range: 2.2,
      light: { color: 0xff4020, intensity: 1.4, radius: 6, y: 0.5 }, emit: { preset: 'ember', rate: 6, y: 0.3, radius: 1 },
      onInteract: () => this.beginDescent(),
    });
    W.addInteractable(stairs);
    g.ui.addLabel(cx, 1.8, top + 1.6, 'Descenso');

    // Virgil by a brazier (west)
    const vx = cx - 9, vz = top + 4;
    this.virgil = new NPC(W, vx, vz, { name: 'Virgilio', sheet: virgilSheet(), anim: 'idle_down', light: 0xffb060, prompt: 'Hablar', onInteract: () => this.talkVirgil() });
    W.addInteractable(this.virgil);
    g.ui.addLabel(vx, 3.1, vz, 'Virgilio');

    // Beatrice's shrine (east)
    const bx = cx + 9, bz = top + 2.2;
    const shrine = new PropInteract(W, bx, bz, {
      prop: 'shrineBeatrice', prompt: 'Contemplar la vidriera', solid: 1.1, range: 2.4,
      light: { color: 0xffd890, intensity: 1.2, radius: 7, y: 2.4 }, emit: { preset: 'holyMote', rate: 3, y: 2, radius: 1 },
      onInteract: () => this.vision(bx, bz + 1.8),
    });
    W.addInteractable(shrine);
    g.ui.addLabel(bx, 4.2, bz, 'Vidriera de Beatriz');

    // Weapon rack (south-west)
    const wx = cx - 7, wz = top + 8.5;
    W.addInteractable(new PropInteract(W, wx, wz, { prop: 'weaponRack', prompt: 'Elegir arma', solid: 0.8, onInteract: () => this.weaponMenu() }));
    g.ui.addLabel(wx, 2.6, wz, 'Armero');

    // Altar of Virtues (upgrades) (south-east)
    const ax = cx + 7, az = top + 8.5;
    W.addInteractable(new PropInteract(W, ax, az, { prop: 'virtueAltar', prompt: 'Mejoras de Virtud', solid: 0.9, light: { color: 0xf2c45a, intensity: 1, radius: 5, y: 1.6 }, onInteract: () => this.upgradeMenu() }));
    g.ui.addLabel(ax, 3, az, 'Altar de Virtudes');

    // Reliquary (fragments): center-south lectern
    const rx = cx, rz = top + 10.5;
    W.addInteractable(new PropInteract(W, rx, rz, { prop: 'lectern', prompt: 'Relicario', solid: 0.5, light: { color: 0x9ab8d8, intensity: 0.8, radius: 4, y: 1.4 }, onInteract: () => this.reliquaryMenu() }));
    g.ui.addLabel(rx, 2.3, rz, 'Relicario');
  }

  async autoTalk() {
    const ctx = makeContext(this.game);
    const id = pickDialogue(DIALOGUE, 'virgilio.hub', ctx);
    if (id && DIALOGUE[id].priority >= 50) await this.talkVirgil(id);
  }

  async talkVirgil(forced) {
    const g = this.game;
    const ctx = makeContext(g);
    // reactive: comment on the last run's decisions first
    const last = Save.meta.lastRun;
    if (!forced && last && last.decisions && !last.virgilCommented) {
      last.virgilCommented = true;
      const lines = [];
      for (const d of last.decisions) {
        const s = SOULS[d.soul];
        if (s?.virgil?.[d.choice]) lines.push(['virgilio', s.virgil[d.choice]]);
      }
      if (lines.length) { await this.dialog.play({ lines: lines.slice(0, 2) }, { focus: { x: this.virgil.x, z: this.virgil.z }, zoom: 1.5 }); Save.save(); return; }
    }
    const id = forced || pickDialogue(DIALOGUE, 'virgilio.hub', ctx);
    if (id) await this.dialog.play(id, { registry: DIALOGUE, focus: { x: this.virgil.x, z: this.virgil.z }, zoom: 1.5 });
    Save.save();
  }

  async vision(x, z) {
    const g = this.game, W = g.world;
    const ctx = makeContext(g);
    const id = pickDialogue(DIALOGUE, 'beatriz.vision', ctx);
    if (!id) return;
    const npc = new NPC(W, x, z, { name: 'Beatriz', sheet: beatriceSheet(), anim: 'idle_down', hover: 0.3, light: 0xffe0a0, lightIntensity: 1.6, lightRadius: 7, aura: 'holyMote', prompt: '' });
    npc.active = false;
    npc.sprite.setAlpha(0);
    W.addInteractable(npc);
    W.fx.play(pillarSheet('beatriz', R.holy, 28, 120), { x, y: 0, z: z + 0.05, pivot: 0, scale: 1.2 });
    Events.emit('beatriz:appear', {});
    g.tween(0.6, (k) => npc.sprite.setAlpha(k));
    await g.wait(0.7);
    await this.dialog.play(id, { registry: DIALOGUE, focus: { x, z }, zoom: 1.7 });
    g.tween(0.6, (k) => npc.sprite.setAlpha(1 - k)).then(() => npc.destroy());
    Save.meta.beatriceVisions++;
    if (!Save.meta.flags.blessing) {
      Save.meta.flags.blessing = true;
      g.ui.toast('Bendición de Beatriz: +15 vida en el próximo descenso', 'virtue');
    }
    Save.save();
  }

  async weaponMenu() {
    const g = this.game, meta = Save.meta;
    const cards = WEAPON_ORDER.map((id) => {
      const w = WEAPONS[id];
      const owned = meta.unlockedWeapons.includes(id);
      return {
        iconURL: weaponIconURL(id, 2), name: w.name, level: owned ? (meta.selectedWeapon === id ? 'Equipada' : 'Disponible') : `Bloqueada · ${w.cost} fragmentos`,
        desc: w.desc + '\n\n' + w.lore, style: owned ? (meta.selectedWeapon === id ? 'gold' : 'stone') : 'dark',
        disabled: !owned && meta.fragments < w.cost,
      };
    });
    const i = await g.ui.pick({ title: 'El Armero', sub: 'Armas simbólicas. Cada una enseña una forma distinta de juzgar.', cards, allowSkip: true, foot: '[E] Elegir / Desbloquear · [Esc] Volver' });
    if (i < 0) return;
    const id = WEAPON_ORDER[i];
    if (!meta.unlockedWeapons.includes(id)) {
      meta.fragments -= WEAPONS[id].cost;
      meta.unlockedWeapons.push(id);
      g.ui.toast(`${WEAPONS[id].name} desbloqueada`, 'gold');
      Events.emit('unlock', { kind: 'weapon', id });
    }
    meta.selectedWeapon = id;
    g.world.player.setWeapon(id);
    g.world.fx.emit('holy', g.world.player.x, 1, g.world.player.z, 16);
    Save.save();
  }

  async upgradeMenu() {
    const g = this.game, meta = Save.meta;
    for (;;) {
      const cards = UPGRADES.map((u) => {
        const l = Save.upgrade(u.id);
        const maxed = l >= u.max;
        const cost = maxed ? null : u.cost[l];
        return { icon: u.icon, name: u.name, level: `${'◆'.repeat(l)}${'◇'.repeat(u.max - l)}`, desc: u.desc(l), price: maxed ? 'Completa' : `${cost} esencias`, disabled: maxed || meta.essences < cost, style: maxed ? 'gold' : 'stone' };
      });
      const i = await g.ui.pick({ title: 'Altar de Virtudes', sub: `Esencias: ${meta.essences}. Lo que el abismo no pudo quitarte.`, cards, allowSkip: true, foot: '[E] Mejorar · [Esc] Volver' });
      if (i < 0) break;
      const u = UPGRADES[i];
      const l = Save.upgrade(u.id);
      meta.essences -= u.cost[l];
      meta.upgrades[u.id] = l + 1;
      g.ui.toast(`${u.name} ${l + 1}`, 'virtue');
      Events.emit('upgrade', { id: u.id });
      const p = g.world.player;
      g.world.fx.play(pillarSheet('holy', R.holy), { x: p.x, y: 0, z: p.z + 0.05, pivot: 0 });
      Save.save();
    }
  }

  async reliquaryMenu() {
    const g = this.game, meta = Save.meta;
    for (;;) {
      const relics = Object.values(RELICS).filter((r) => r.pool === 'unlock');
      const cards = [
        ...relics.map((r) => { const owned = meta.unlockedRelics.includes(r.id); return { icon: r.icon, name: r.name, level: owned ? 'En el descenso' : `${r.cost} fragmentos`, desc: r.desc, disabled: owned || meta.fragments < r.cost, style: owned ? 'gold' : 'stone', kind: 'Reliquia' }; }),
        ...POWERS.map((pw) => { const owned = meta.flags['power_' + pw.id]; return { icon: 'fragment', name: pw.name, level: owned ? 'Adquirido' : `${pw.cost} fragmentos`, desc: pw.desc, disabled: owned || meta.fragments < pw.cost, style: owned ? 'gold' : 'stone', kind: 'Poder permanente' }; }),
      ];
      // show in pages of 4
      const page = this.relPage || 0;
      const pages = Math.ceil(cards.length / 4);
      const slice = cards.slice(page * 4, page * 4 + 4);
      const extra = { icon: 'book', name: pages > 1 ? 'Siguiente' : 'Cerrar', level: `${page + 1}/${pages}`, desc: 'Pasar la página del relicario.', style: 'dark' };
      const i = await g.ui.pick({ title: 'Relicario', sub: `Fragmentos de Reliquia: ${meta.fragments}`, cards: [...slice, extra], allowSkip: true, foot: '[E] Desbloquear · [Esc] Volver' });
      if (i < 0) break;
      if (i === slice.length) { this.relPage = (page + 1) % pages; continue; }
      const idx = page * 4 + i;
      if (idx < relics.length) {
        const r = relics[idx];
        meta.fragments -= r.cost; meta.unlockedRelics.push(r.id);
        g.ui.toast(`${r.name} se une al descenso`, 'gold');
      } else {
        const pw = POWERS[idx - relics.length];
        meta.fragments -= pw.cost; meta.flags['power_' + pw.id] = true;
        g.ui.toast(`${pw.name}`, 'gold');
      }
      Events.emit('unlock', {});
      Save.save();
    }
  }

  async beginDescent() {
    const g = this.game, meta = Save.meta;
    const i = await g.ui.menu({ title: 'Descender', sub: `Arma: ${WEAPONS[meta.selectedWeapon].name}`, items: [{ label: 'Comenzar el descenso' }, { label: 'Todavía no' }], cancel: 1 });
    if (i !== 0) return;
    meta.runs++;
    g.run = new Run({ weapon: meta.selectedWeapon });
    Save.save();
    Events.emit('run:start', {});
    const p = g.world.player;
    p.locked = true;
    g.world.fx.play(pillarSheet('descent', R.ember, 28, 110), { x: p.x, y: 0, z: p.z + 0.05, pivot: 0 });
    g.world.fx.screenFlash(0xff6020, 0.3, 0.5);
    this.fade = { from: 0, to: 1, t: 0, d: 0.9, done: () => {
      // the player is rebuilt by the run with run stats
      W_reset(g);
      g.setState('run', { circle: 0 });
    } };
  }

  update(dt, rawDt) {
    const g = this.game, W = g.world, p = W.player;
    if (this.fade) {
      const F = this.fade;
      F.t += rawDt;
      const k = Math.min(1, F.t / F.d);
      g.pipe.post.uFade.value.w = F.from + (F.to - F.from) * k;
      if (k >= 1) { const d = F.done; this.fade = null; d?.(); }
    }
    const blocked = g.ui.blocking;
    if (!blocked && Input.wasPressed('pause')) this.openPause();
    W.paused = blocked;
    W.update(blocked ? 0 : dt);
    if (p) {
      g.rig.update(rawDt, p.x, p.z, p.aimFromMouse && !p.locked ? Math.cos(p.aim) * 1.1 : 0, p.aimFromMouse && !p.locked ? Math.sin(p.aim) * 0.8 : 0);
      W.lights.update(rawDt, p.x, p.z);
      // no combat in the hub: attacks are just gestures
    }
  }

  async openPause() {
    const g = this.game;
    const i = await g.ui.menu({ title: 'Pausa', items: [{ label: 'Reanudar' }, { label: 'Opciones' }, { label: 'Menú principal' }], cancel: 0 });
    if (i === 1) await g.ui.options?.();
    if (i === 2) g.setState('title', {});
  }

  onEnemyKilled() {}
  onPlayerDeath() {}
  dropLoot() {}
}

function W_reset(g) {
  const W = g.world;
  if (W.player) { W.player.destroy(); W.player.weaponSprite.dispose(); W.player.halo.dispose(); W.lights.remove(W.player.light); W.player = null; }
}
