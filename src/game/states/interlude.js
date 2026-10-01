// Interlude between circles (GDD 8.2.3): a short narrative pause — ferryman or guardian,
// reactive dialogue, one extra decision, a small offering and a breath before descending.
import { generateRoom } from '../roomgen.js';
import { TZ, C } from '../room.js';
import { Rng } from '../../core/rng.js';
import { NPC, Pedestal, Door } from '../objects.js';
import { ferrymanSheet, virgilSheet } from '../../art/characters.js';
import { CIRCLES } from '../../data/circles.js';
import { INTERLUDE_NPC } from '../../data/interludes.js';
import { DIALOGUE } from '../../data/dialogue/index.js';
import { SOULS } from '../../data/souls.js';
import { DialogueRunner, pickDialogue, makeContext } from '../dialogue.js';
import { BOONS } from '../../data/boons.js';
import { Events } from '../../core/events.js';
import { Input } from '../../core/input.js';
import { Save } from '../../core/save.js';

export class InterludeState {
  enter(params = {}) {
    const g = this.game, W = g.world, run = g.run;
    this.dialog = new DialogueRunner(g);
    this.talked = false; this.talking = false; this.leaving = false;
    g.controller = this;
    W.controller = this;
    const fromIdx = params.from ?? run.circleIndex;
    this.from = CIRCLES[fromIdx];
    this.to = CIRCLES[fromIdx + 1];
    const npcDef = INTERLUDE_NPC[this.from.id] || { speaker: 'virgilio', sheet: 'virgil', name: 'Virgilio' };
    this.npcDef = npcDef;
    const rng = new Rng((run.seed ^ 31337 ^ (fromIdx * 977)) >>> 0);
    const circle = { ...this.to, liquid: { ...this.to.liquid, block: true } };
    const layout = generateRoom({ type: 'interlude', circle, rng, exits: [{ node: 'next' }], shape: 'plain' });
    // a river crosses the room — the passage the guardian controls
    const rj = Math.floor(layout.h / 2) + 1;
    for (let i = 1; i < layout.w - 1; i++) for (let j = rj; j < rj + 2; j++) {
      if (Math.abs(i + 0.5 - layout.w / 2) > 1.6) layout.cells[j * layout.w + i] = C.VOID;
    }
    layout.props = layout.props.filter((p) => Math.abs(p.z / TZ - rj) > 2);
    layout.spawns = [];
    W.loadRoom(layout, circle);
    this.layout = layout;
    const p = W.player;
    p.x = layout.entrance.x; p.z = layout.entrance.z + 1.2;
    p.vx = p.vz = p.kx = p.kz = 0;
    p.locked = false; p.state = 'free';
    g.rig.snapTo(p.x, p.z - 3);
    g.ui.clearLabels();
    // the guardian of the crossing
    const nx = layout.w / 2 + 3.5, nz = (rj - 1.2) * TZ + 0.3;
    const sheet = npcDef.sheet === 'virgil' ? virgilSheet() : ferrymanSheet(npcDef.sheet || 'caronte');
    this.npc = new NPC(W, nx, nz, { name: npcDef.name, sheet, anim: 'idle_down', light: npcDef.light ?? 0xe08a40, prompt: 'Hablar', onInteract: () => this.talk() });
    W.addInteractable(this.npc);
    g.ui.addLabel(nx, 3.2, nz, npcDef.name);
    if (npcDef.sheet !== 'virgil') {
      const vx = layout.w / 2 - 4, vz = (layout.h - 4) * TZ;
      this.virgil = new NPC(W, vx, vz, { name: 'Virgilio', sheet: virgilSheet(), anim: 'idle_down', light: 0xffb060, prompt: 'Hablar', onInteract: () => this.talkVirgil() });
      W.addInteractable(this.virgil);
      g.ui.addLabel(vx, 3.1, vz, 'Virgilio');
    }
    // small offering: healing chalice + a boon of the side the scale leans to
    const kind = run.moral.balance >= 0 ? 'virtue' : 'sin';
    const bid = run.boonOffers(kind, 1)[0];
    const items = [{ kind: 'heal', base: 35, icon: 'heal', name: 'Cáliz de vida' }];
    if (bid) items.push({ kind: 'boon', id: bid, base: 90, icon: BOONS[bid].icon, name: BOONS[bid].name });
    items.forEach((it, k) => {
      const ix = layout.w / 2 + (k === 0 ? -6 : 6), iz = (layout.h - 3.2) * TZ;
      const price = run.shopPrice(it.base, p);
      const ped = new Pedestal(W, ix, iz, {
        item: it, price, icon: it.icon, prompt: () => `${it.name} · ${price} oro`,
        onInteract: (pl, pd) => {
          if (pd.used) return;
          if (run.gold < price) { g.ui.toast('No tienes oro suficiente'); Events.emit('ui:deny'); return; }
          run.gold -= price;
          if (it.kind === 'heal') pl.heal(Math.round(pl.stats.maxHp * 0.4));
          else { run.addBoon(it.id); run.applyToPlayer(pl); g.ui.toast(BOONS[it.id].name, BOONS[it.id].kind); }
          pd.sold();
          Events.emit('shop:buy', {});
        },
      });
      W.addInteractable(ped);
      g.ui.addLabel(ix, 0.2, iz + 0.6, () => (ped.used ? 'Vendido' : `${price}`));
    });
    // the way down, opened once the guardian has spoken
    const d = layout.doors[0];
    this.door = new Door(W, d, { node: { type: 'exit' }, circle: this.to.id, kind: 'exit', icon: 'gate', state: 'locked' });
    this.door.onEnter = () => this.descend();
    W.addInteractable(this.door);
    g.ui.addLabel(d.x, 0.05, d.z + 0.55, `Hacia ${this.to.name}`);
    p.heal(p.stats.maxHp * 0.15);
    g.pipe.post.uFade.value.w = 1;
    this.fade = { from: 1, to: 0, t: 0, d: 0.8 };
    Events.emit('interlude:enter', { from: this.from.id, to: this.to.id });
    Save.save();
    g.after(0.9, () => this.talk(true), 'real');
  }

  exit() { this.game.ui.clearLabels(); }

  async talk(auto = false) {
    if (this.talking || (auto && this.talked)) return;
    this.talking = true;
    const g = this.game;
    const ctx = makeContext(g);
    const id = pickDialogue(DIALOGUE, `interludio.${this.from.id}`, ctx);
    const focus = { x: this.npc.x, z: this.npc.z };
    if (id) await this.dialog.play(id, { registry: DIALOGUE, focus, zoom: 1.5 });
    else await this.dialog.play({ lines: [[this.npcDef.speaker || 'virgilio', 'Sigue bajando, peregrino.']] }, { focus, zoom: 1.5 });
    this.talked = true;
    this.talking = false;
    if (this.door.state !== 'open') { this.door.setState('open'); Events.emit('door:open', {}); }
  }

  async talkVirgil() {
    const g = this.game, run = g.run;
    const mine = run.decisions.filter((d) => d.circle === this.from.id);
    const lines = [];
    for (const d of mine) if (SOULS[d.soul]?.virgil?.[d.choice]) lines.push(['virgilio', SOULS[d.soul].virgil[d.choice]]);
    if (!lines.length) lines.push(['virgilio', (c) => (c.tier >= 1 ? 'Caminas más ligero que al principio.' : c.tier <= -1 ? 'Pesas más a cada paso, Dante. Lo noto en el suelo que pisas.' : 'Sigue. Lo peor nunca está detrás.')]);
    await this.dialog.play({ lines }, { focus: { x: this.virgil.x, z: this.virgil.z }, zoom: 1.5 });
  }

  async descend() {
    if (this.leaving) return;
    this.leaving = true;
    const g = this.game, run = g.run;
    g.world.player.locked = true;
    await new Promise((r) => { this.fade = { from: g.pipe.post.uFade.value.w, to: 1, t: 0, d: 0.7, done: r }; });
    this.leaving = false;
    g.setState('run', { circle: run.circleIndex + 1 });
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
    if (!blocked && Input.wasPressed('pause')) g.ui.options();
    W.paused = blocked;
    W.update(blocked ? 0 : dt);
    if (p) { g.rig.update(rawDt, p.x, p.z, 0, 0); W.lights.update(rawDt, p.x, p.z); }
    g.pipe.post.uCorruption.value = g.run.moral.corruption01;
    g.pipe.post.uVirtue.value = g.run.moral.virtue01;
  }
  onEnemyKilled() {}
  dropLoot() {}
  onPlayerDeath() {}
  spawnEnemy() { return null; }
}
