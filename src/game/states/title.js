// Title screen: the Gate of Hell under ash, the logo in blackletter, the main menu (GDD 4.6.1).
import { generateRoom, NORTH_BAND } from '../roomgen.js';
import { TZ } from '../room.js';
import { Rng } from '../../core/rng.js';
import { Sprite } from '../../render/sprite.js';
import { propSheet } from '../../art/props.js';
import { danteSheet, virgilSheet } from '../../art/characters.js';
import { Save } from '../../core/save.js';
import { Events } from '../../core/events.js';
import { dividerURL } from '../../ui/frames.js';

const TITLE_CIRCLE = {
  id: 'hub', name: 'Antesala', liquid: { kind: 'water', block: false },
  props: { common: ['mourner', 'brokenColumn', 'graveCross', 'urn', 'skullPile'], light: 'brazier', fireRamp: null }, ambient: 'ash',
};

export class TitleState {
  async enter() {
    const g = this.game, W = g.world;
    g.run = null;
    g.controller = this;
    W.controller = this;
    if (W.player) { W.player.destroy(); W.player.weaponSprite.dispose(); W.player.halo.dispose(); W.lights.remove(W.player.light); W.player = null; }
    const layout = generateRoom({ type: 'interlude', circle: TITLE_CIRCLE, rng: new Rng(4242), exits: [], shape: 'plain' });
    W.loadRoom(layout, TITLE_CIRCLE);
    const cx = layout.w / 2;
    const gate = new Sprite(propSheet('gateArch'), { anim: 'idle', pivot: 2, minLight: 0.35 });
    gate.place(cx, 0, NORTH_BAND * TZ + 0.05);
    W.built.group.add(gate.mesh);
    const st = new Sprite(propSheet('descentStairs'), { anim: 'idle', pivot: 2 });
    st.place(cx, 0, (NORTH_BAND + 2.2) * TZ);
    W.built.group.add(st.mesh);
    this.extra = [st];
    W.lights.add({ x: cx, z: NORTH_BAND * TZ + 1.5, y: 1, color: 0xff4020, intensity: 1.8, radius: 9, flicker: 0.5 });
    // Dante and Virgil before the gate, seen from behind
    const d = new Sprite(danteSheet(0), { anim: 'idle_up', pivot: 1, minLight: 0.5 });
    d.place(cx - 0.7, 0, (NORTH_BAND + 5) * TZ);
    const v = new Sprite(virgilSheet(), { anim: 'idle_up', pivot: 1, minLight: 0.5 });
    v.place(cx + 0.8, 0, (NORTH_BAND + 5.1) * TZ);
    W.built.group.add(d.mesh, v.mesh);
    this.extra.push(d, v);
    W.lights.add({ x: cx, z: (NORTH_BAND + 6.5) * TZ, y: 2, color: 0xffb070, intensity: 0.8, radius: 6 });
    this.camT = 0;
    this.cx = cx; this.cz = (NORTH_BAND + 3) * TZ;
    g.rig.snapTo(this.cx, this.cz);
    g.ui.showHud(false);
    g.pipe.post.uFade.value.w = 1;
    this.fade = { from: 1, to: 0, t: 0, d: 2 };
    Events.emit('title', {});
    this.buildLogo();
    await this.mainMenu();
  }

  buildLogo() {
    const g = this.game;
    const el = document.createElement('div');
    el.className = 'title';
    el.innerHTML = `<div class="logo">Sulphur</div><img class="px" src="${dividerURL('crimson')}" style="width:64px;height:5px;margin:2px 0"><div class="tag shadowtxt">Nueve círculos. Una balanza. Ningún perdón gratuito.</div><div class="credits">La Divina Comedia · Inferno</div>`;
    el.style.pointerEvents = 'none';
    g.ui.layers.overlay.appendChild(el);
    this.logo = el;
  }

  async mainMenu() {
    const g = this.game;
    for (;;) {
      const has = Save.hasSave && Save.meta.runs > 0;
      const items = has ? [{ label: 'Continuar' }, { label: 'Nuevo juego' }, { label: 'Opciones' }, { label: 'Créditos' }] : [{ label: 'Comenzar' }, { label: 'Opciones' }, { label: 'Créditos' }];
      const i = await g.ui.menu({ items, cls: 'titlemenu' });
      const pick = items[i].label;
      Events.emit('ui:start', {});
      if (pick === 'Continuar' || pick === 'Comenzar') { this.go(); return; }
      if (pick === 'Nuevo juego') {
        const c = await g.ui.menu({ title: '¿Empezar de nuevo?', sub: 'Se perderá todo el progreso: esencias, armas, recuerdos.', items: [{ label: 'No' }, { label: 'Sí, olvidar' }], cancel: 0, style: 'crimson' });
        if (c === 1) { Save.reset(); this.go(); return; }
      }
      if (pick === 'Opciones') await g.ui.options();
      if (pick === 'Créditos') {
        await g.ui.menu({ title: 'SULPHUR', sub: 'Roguelike narrativo inspirado en el Inferno de Dante Alighieri. Arte, música y sonido generados por código.', items: [{ label: 'Volver' }], cancel: 0 });
      }
    }
  }

  go() {
    const g = this.game;
    this.fade = { from: 0, to: 1, t: 0, d: 1.0, done: () => g.setState('hub', {}) };
  }

  exit() {
    this.logo?.remove();
    for (const s of this.extra || []) s.dispose();
    this.game.ui.clearModals();
  }

  update(dt, rawDt) {
    const g = this.game, W = g.world;
    if (this.fade) {
      const F = this.fade;
      F.t += rawDt;
      const k = Math.min(1, F.t / F.d);
      g.pipe.post.uFade.value.w = F.from + (F.to - F.from) * k;
      if (k >= 1) { const d = F.done; this.fade = null; d?.(); }
    }
    this.camT += rawDt;
    W.update(dt);
    for (const s of this.extra) s.update(dt);
    g.rig.update(rawDt, this.cx + Math.sin(this.camT * 0.15) * 1.2, this.cz + Math.sin(this.camT * 0.1) * 0.4);
    W.lights.update(rawDt, this.cx, this.cz);
  }
  onEnemyKilled() {}
  dropLoot() {}
}
