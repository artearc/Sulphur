// SULPHUR UI: DOM overlay authored in game pixels and scaled with the renderer so every element
// sits on the same pixel grid as the world. Modal components are promise-based and keyboard/pad
// navigable; the world pauses while a blocking modal is open.
import './ui.css';
import { Input } from '../core/input.js';
import { Events } from '../core/events.js';
import { Save } from '../core/save.js';
import { frameURL, dividerURL, cursorURL } from './frames.js';
import { iconURL } from '../art/icons.js';
import { portraitURL } from '../art/portraits.js';
import { TIERS } from '../game/moral.js';
import { BOONS } from '../data/boons.js';
import { RELICS } from '../data/relics.js';
import { WEAPON_ART } from '../art/weapons.js';
import { weaponIconURL } from '../art/weapons.js';
import { clamp } from '../core/math.js';

const h = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const framed = (el, style) => { el.classList.add('frame'); el.style.borderImageSource = `url(${frameURL(style)})`; return el; };

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui-root');
    this.layers = {};
    for (const n of ['world', 'hud', 'overlay', 'modal', 'top']) {
      const l = h('div', 'ui-layer');
      this.root.appendChild(l);
      this.layers[n] = l;
    }
    this.modal = null;
    this.prompts = new Map();
    this.labels = [];
    this.buildHud();
    this.buildToasts();
    this.dialogue = new DialogueBox(this);
    this.cursor = h('img', 'px');
    this.cursor.src = cursorURL();
    this.cursor.style.cssText = 'position:absolute;width:11px;height:11px;margin:-5px 0 0 -5px;pointer-events:none;z-index:50';
    this.layers.top.appendChild(this.cursor);
    this.letterbox = [h('div', 'letterbox top'), h('div', 'letterbox bot')];
    this.letterbox.forEach((l) => this.layers.overlay.appendChild(l));
    this.resize();
    window.addEventListener('resize', () => this.resize());
    Events.on('player:hurt', () => this.hpShake());
  }

  resize() {
    const p = this.game.pipe;
    if (!window.innerWidth) return;
    const dpr = p.W / window.innerWidth;
    this.cssScale = p.scale / dpr;
    this.root.style.width = p.lowW + 'px';
    this.root.style.height = p.lowH + 'px';
    this.root.style.transform = `scale(${this.cssScale})`;
    this.w = p.lowW; this.h = p.lowH;
  }

  get blocking() { return !!this.modal && this.modal.blocking !== false; }

  // world (x,y,z) -> ui pixel coords
  toUi(x, y, z) {
    const s = this.game.rig.worldToScreen(x, y, z);
    return { x: s.x / this.cssScale, y: s.y / this.cssScale };
  }

  update(dt) {
    if (this.game.pipe.lowW !== this.w || this.game.pipe.lowH !== this.h) this.resize();
    // cursor
    const m = Input.mouse;
    this.cursor.style.left = m.x / this.cssScale + 'px';
    this.cursor.style.top = m.y / this.cssScale + 'px';
    this.cursor.style.display = Input.usingPad ? 'none' : 'block';
    if (this.modal) this.modal.input?.(dt);
    this.updateHud(dt);
    this.updatePrompts();
    this.updateToasts(dt);
  }

  setLetterbox(on) { this.letterbox.forEach((l) => l.classList.toggle('on', on)); }

  // ------------------------------------------------ HUD ------------------------------------------------
  buildHud() {
    const hud = h('div', 'hud');
    this.hud = hud;
    this.layers.hud.appendChild(hud);
    // top-left: life reliquary + fervor + dash
    const tl = h('div', 'hud-tl');
    const hp = h('div', 'hp-wrap');
    const frameImg = h('div', 'hp-frame');
    framed(frameImg, 'crimson');
    frameImg.style.borderWidth = '4px';
    frameImg.style.borderImageWidth = '4px';
    frameImg.style.borderImageSlice = '8 fill';
    this.hpGhost = h('div', 'hp-ghost');
    this.hpFill = h('div', 'hp-fill');
    this.hpText = h('div', 'hp-text shadowtxt');
    const heart = h('img', 'px');
    heart.src = iconURL('heart');
    heart.style.cssText = 'position:absolute;left:-3px;top:-1px;width:16px;height:16px';
    hp.append(frameImg, this.hpGhost, this.hpFill, this.hpText, heart);
    this.hpWrap = hp;
    const fer = h('div', 'fervor-wrap');
    this.ferFill = h('div', 'fervor-fill');
    fer.appendChild(this.ferFill);
    this.ferWrap = fer;
    this.ferTicks = [];
    this.dashPips = h('div', 'dash-pips');
    tl.append(hp, fer, this.dashPips);
    hud.appendChild(tl);

    // top-center: the scale (balanza)
    const tc = h('div', 'hud-tc');
    const sc = h('div', 'scale-wrap');
    const bar = h('div', 'scale-bar');
    this.scaleMark = h('div', 'scale-mark');
    const l = h('img', 'scale-end l px'); l.src = iconURL('sin');
    const r = h('img', 'scale-end r px'); r.src = iconURL('virtue');
    l.style.width = r.style.width = '12px'; l.style.height = r.style.height = '12px';
    sc.append(bar, this.scaleMark, l, r);
    this.scaleLabel = h('div', 'scale-label goth shadowtxt');
    this.scaleNums = h('div', 'scale-nums shadowtxt');
    tc.append(sc, this.scaleLabel, this.scaleNums);
    hud.appendChild(tc);

    // top-right: resources
    const tr = h('div', 'hud-tr');
    const res = (icon) => { const d = h('div', 'res shadowtxt'); const im = h('img', 'px'); im.src = iconURL(icon); const sp = h('span'); d.append(sp, im); tr.appendChild(d); return sp; };
    this.goldTxt = res('coin');
    this.essTxt = res('essence');
    this.fragTxt = res('fragment');
    hud.appendChild(tr);
    this.minimap = h('div', 'minimap');
    hud.appendChild(this.minimap);

    // bottom-left: boons + relics
    const bl = h('div', 'hud-bl');
    this.boonRow = h('div', 'boon-row');
    this.relicRow = h('div', 'relic-row');
    bl.append(this.relicRow, this.boonRow);
    hud.appendChild(bl);

    // bottom-right: weapon + special
    const br = h('div', 'hud-br');
    const slot = (key) => { const s = framed(h('div', 'slot'), 'stone'); s.style.borderWidth = '4px'; s.style.borderImageWidth = '4px'; const im = h('img', 'px'); const k = h('div', 'key', key); const cover = h('div', 'cover'); s.append(im, cover, k); br.appendChild(s); return { s, im, cover, k }; };
    this.slotWeapon = slot('LMB');
    this.slotSpecial = slot('Q');
    hud.appendChild(br);

    this.bossbar = h('div', 'bossbar hidden');
    this.bossbar.innerHTML = `<div class="title"></div><div class="name shadowtxt"></div><div class="bar"><div class="ghost"></div><div class="fill"></div></div>`;
    hud.appendChild(this.bossbar);
    this._last = {};
  }

  hpShake() {
    this.hpWrap.animate([{ transform: 'translate(2px,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(1px,-1px)' }, { transform: 'none' }], { duration: 200, easing: 'steps(4)' });
  }

  showHud(on) { this.hud.classList.toggle('dim', !on); this.hudVisible = on; }

  updateHud() {
    const g = this.game, p = g.world.player, run = g.run;
    if (!p) return;
    const L = this._last;
    const maxHp = p.stats.maxHp;
    const hpPct = clamp(p.hp / maxHp, 0, 1);
    const barW = 94;
    const hw = Math.round(barW * hpPct);
    if (L.hw !== hw) { this.hpFill.style.width = hw + 'px'; this.hpGhost.style.width = hw + 'px'; L.hw = hw; }
    const hpT = `${Math.max(0, Math.ceil(p.hp))}/${maxHp}`;
    if (L.hpT !== hpT) { this.hpText.textContent = hpT; L.hpT = hpT; }
    const fw = Math.round(84 * p.fervor / 100);
    if (L.fw !== fw) { this.ferFill.style.width = fw + 'px'; L.fw = fw; }
    const cost = p.stats.specialCost;
    if (L.cost !== cost) {
      this.ferTicks.forEach((t) => t.remove());
      this.ferTicks = [];
      for (let v = cost; v < 100; v += cost) { const t = h('div', 'fervor-tick'); t.style.left = Math.round(84 * v / 100) + 'px'; this.ferWrap.appendChild(t); this.ferTicks.push(t); }
      L.cost = cost;
    }
    this.ferWrap.classList.toggle('ready', p.fervor >= cost);
    const dk = p.dashCharges + '/' + p.stats.dashCharges;
    if (L.dk !== dk) {
      this.dashPips.innerHTML = '';
      for (let i = 0; i < p.stats.dashCharges; i++) this.dashPips.appendChild(h('div', 'dash-pip' + (i < p.dashCharges ? ' on' : '')));
      L.dk = dk;
    }
    if (run) {
      const m = run.moral;
      const pos = Math.round(10 + (clamp(m.balance, -100, 100) + 100) / 200 * 112);
      if (L.pos !== pos) { this.scaleMark.style.left = pos + 'px'; L.pos = pos; }
      const t = m.tier;
      if (L.tier !== t) { const T = TIERS[t]; this.scaleLabel.textContent = T.name; this.scaleLabel.style.color = T.color; L.tier = t; }
      const nums = `<span style="color:#ff8a90">✝ ${m.sin}</span><span style="color:#ffe8a0">${m.virtue} ✝</span>`;
      if (L.nums !== nums) { this.scaleNums.innerHTML = `<span style="color:#ff8a90">Pecado ${m.sin}</span><span style="color:#c8c8e8">${m.doubt ? 'Duda ' + m.doubt : ''}</span><span style="color:#ffe8a0">Virtud ${m.virtue}</span>`; L.nums = nums; }
      if (L.gold !== run.gold) { this.goldTxt.textContent = run.gold; L.gold = run.gold; }
      const ess = Save.meta.essences + run.essences;
      if (L.ess !== ess) { this.essTxt.textContent = ess; L.ess = ess; }
      const fr = Save.meta.fragments + run.fragments;
      if (L.fr !== fr) { this.fragTxt.textContent = fr; L.fr = fr; }
      const bk = JSON.stringify(run.boons) + run.relics.join();
      if (L.bk !== bk) { this.renderBuild(run); L.bk = bk; }
    } else {
      const ess = Save.meta.essences, fr = Save.meta.fragments;
      if (L.ess !== ess) { this.essTxt.textContent = ess; L.ess = ess; }
      if (L.fr !== fr) { this.fragTxt.textContent = fr; L.fr = fr; }
      if (L.gold !== '-') { this.goldTxt.textContent = '-'; L.gold = '-'; }
      if (L.tier !== 'hub') { this.scaleLabel.textContent = 'Antesala'; this.scaleLabel.style.color = '#a8987a'; this.scaleNums.innerHTML = ''; L.tier = 'hub'; this.scaleMark.style.left = '66px'; }
    }
    const wk = p.weaponId + ':' + p.tier;
    if (L.wk !== wk) {
      this.slotWeapon.im.src = iconURL('sword');
      this.slotSpecial.im.src = iconURL(p.tier > 0 ? 'virtue' : p.tier < 0 ? 'sin' : 'book');
      L.wk = wk;
    }
    const cov = Math.round(16 * (1 - clamp(p.fervor / cost, 0, 1)));
    if (L.cov !== cov) { this.slotSpecial.cover.style.height = cov + 'px'; L.cov = cov; }
    const keyHint = Input.lastDevice === 'pad' ? ['X', 'RB'] : ['LMB', 'Q'];
    if (L.kh !== keyHint[0]) { this.slotWeapon.k.textContent = keyHint[0]; this.slotSpecial.k.textContent = keyHint[1]; L.kh = keyHint[0]; }
  }

  renderBuild(run) {
    this.boonRow.innerHTML = '';
    for (const [id, l] of Object.entries(run.boons)) {
      const b = BOONS[id];
      const d = h('div', 'boon-ic ' + b.kind);
      const im = h('img', 'px'); im.src = iconURL(b.icon);
      d.append(im, h('div', 'boon-lv shadowtxt', 'I'.repeat(l)));
      d.title = b.name;
      this.boonRow.appendChild(d);
    }
    this.relicRow.innerHTML = '';
    for (const id of run.relics) {
      const im = h('img', 'relic-ic px'); im.src = iconURL(RELICS[id].icon);
      this.relicRow.appendChild(im);
    }
  }

  // ------------------------------------------------ boss bar ------------------------------------------------
  bossShow(name, title, phases = []) {
    const b = this.bossbar;
    b.classList.remove('hidden');
    b.querySelector('.name').textContent = name;
    b.querySelector('.title').textContent = title || '';
    b.querySelectorAll('.phase').forEach((x) => x.remove());
    for (const ph of phases) { const m = h('div', 'phase'); m.style.left = Math.round(ph * 100) + '%'; b.querySelector('.bar').appendChild(m); }
    this.bossSet(1);
  }
  bossSet(pct) {
    const w = Math.round(clamp(pct, 0, 1) * 100) + '%';
    this.bossbar.querySelector('.fill').style.width = w;
    this.bossbar.querySelector('.ghost').style.width = w;
  }
  bossHide() { this.bossbar.classList.add('hidden'); }

  // ------------------------------------------------ prompts & world labels ------------------------------------------------
  updatePrompts() {
    const p = this.game.world.player;
    const t = p?.interactTarget;
    if (!this.promptEl) { this.promptEl = h('div', 'prompt hidden'); this.layers.world.appendChild(this.promptEl); }
    if (t && !this.blocking && !p.locked && t.prompt && t.active !== false) {
      const pos = this.toUi(t.x, (t.promptY ?? 2.6), t.z);
      const key = Input.lastDevice === 'pad' ? 'B' : 'E';
      const txt = `<b>[${key}]</b> ${typeof t.prompt === 'function' ? t.prompt() : t.prompt}`;
      if (this.promptEl._t !== txt) { this.promptEl.innerHTML = txt; this.promptEl._t = txt; }
      this.promptEl.style.left = Math.round(pos.x) + 'px';
      this.promptEl.style.top = Math.round(pos.y) + 'px';
      this.promptEl.classList.remove('hidden');
    } else this.promptEl.classList.add('hidden');
    for (const l of this.labels) {
      const pos = this.toUi(l.x, l.y, l.z);
      l.el.style.left = Math.round(pos.x) + 'px';
      l.el.style.top = Math.round(pos.y) + 'px';
      if (l.fn) { const tx = l.fn(); if (tx !== l.last) { l.el.innerHTML = tx; l.last = tx; } }
    }
  }
  addLabel(x, y, z, html, cls = '') {
    const el = h('div', 'wlabel ' + cls, typeof html === 'function' ? '' : html);
    this.layers.world.appendChild(el);
    const l = { x, y, z, el, fn: typeof html === 'function' ? html : null };
    this.labels.push(l);
    return l;
  }
  removeLabel(l) { l.el.remove(); this.labels = this.labels.filter((x) => x !== l); }
  clearLabels() { for (const l of this.labels) l.el.remove(); this.labels = []; }

  bark(x, z, text, dur = 2.5) {
    const el = h('div', 'bark shadowtxt', text);
    this.layers.world.appendChild(el);
    const l = { x, y: 3.2, z, el };
    this.labels.push(l);
    this.game.after(dur, () => this.removeLabel(l), 'real');
  }

  // ------------------------------------------------ toasts ------------------------------------------------
  buildToasts() { this.toastBox = h('div', 'toasts'); this.layers.top.appendChild(this.toastBox); this.toastList = []; }
  toast(text, kind = '') {
    const el = h('div', 'toast shadowtxt ' + kind, text);
    this.toastBox.appendChild(el);
    this.toastList.push({ el, t: 2.4 });
    if (this.toastList.length > 5) { const o = this.toastList.shift(); o.el.remove(); }
  }
  updateToasts(dt) {
    for (const t of this.toastList) {
      t.t -= dt;
      if (t.t < 0.4) t.el.classList.add('out');
      if (t.t <= 0) t.el.remove();
    }
    this.toastList = this.toastList.filter((t) => t.t > 0);
  }

  // ------------------------------------------------ generic modal helpers ------------------------------------------------
  openModal(m) { this.modal = m; }
  closeModal(m) { if (this.modal === m) this.modal = null; }

  // Card picker: boons, relics, shop
  pick({ title, sub, cards, style = 'stone', allowSkip = false, foot }) {
    return new Promise((resolve) => {
      const el = h('div', 'picker ui-interactive fade-in');
      el.appendChild(h('div', 'ttl shadowtxt', title));
      if (sub) el.appendChild(h('div', 'sub', sub));
      const row = h('div', 'row');
      el.appendChild(row);
      const cardEls = cards.map((c, i) => {
        const ce = framed(h('div', 'card'), c.style || style);
        const ic = h('img', 'ic px'); ic.src = c.iconURL || iconURL(c.icon, 2);
        ce.append(ic, h('div', 'nm shadowtxt', c.name));
        if (c.level) ce.appendChild(h('div', 'lv', c.level));
        if (c.kind) { const k = h('div', 'kind', c.kind); k.style.color = c.kindColor || '#a8987a'; ce.appendChild(k); }
        ce.appendChild(h('div', 'ds', c.desc));
        if (c.price != null) ce.appendChild(h('div', 'price', c.price));
        if (c.nm_color) ce.querySelector('.nm').style.color = c.nm_color;
        if (c.disabled) ce.style.opacity = 0.45;
        ce.onmouseenter = () => { sel = i; render(); };
        ce.onclick = () => choose(i);
        row.appendChild(ce);
        return ce;
      });
      el.appendChild(h('div', 'foot', foot || (allowSkip ? '[Esc] Rechazar' : '')));
      this.layers.modal.appendChild(el);
      let sel = 0;
      const render = () => cardEls.forEach((c, i) => c.classList.toggle('sel', i === sel));
      render();
      Events.emit('ui:open', { kind: 'pick' });
      const m = {
        input: () => {
          if (Input.wasPressed('left')) { sel = (sel + cards.length - 1) % cards.length; render(); Events.emit('ui:hover'); }
          if (Input.wasPressed('right')) { sel = (sel + 1) % cards.length; render(); Events.emit('ui:hover'); }
          if (Input.wasPressed('confirm') || Input.wasPressed('interact')) choose(sel);
          if (allowSkip && Input.wasPressed('back')) done(-1);
        },
      };
      const choose = (i) => { if (cards[i].disabled) { Events.emit('ui:deny'); return; } Events.emit('ui:click'); done(i); };
      const done = (i) => { el.remove(); this.closeModal(m); resolve(i); };
      this.openModal(m);
    });
  }

  // ABSOLVER / CONDENAR — the central decision. Big, readable, unmistakable.
  moralChoice(soul) {
    return new Promise((resolve) => {
      const el = h('div', 'moral ui-interactive fade-in');
      el.appendChild(h('div', 'q shadowtxt', soul.question || '¿Absolver o condenar?'));
      el.appendChild(h('div', 'soulname shadowtxt', soul.name));
      const opts = h('div', 'opts');
      const mk = (kind) => {
        const d = soul[kind];
        const c = framed(h('div', 'card ' + kind), kind === 'absolve' ? 'holy' : 'crimson');
        const ic = h('img', 'ic px'); ic.src = iconURL(kind === 'absolve' ? 'virtue' : 'sin', 2);
        c.append(h('div', 'big shadowtxt', kind === 'absolve' ? 'ABSOLVER' : 'CONDENAR'), ic);
        const eff = h('div', 'eff');
        for (const line of d.preview || []) eff.appendChild(h('div', '', line));
        c.appendChild(eff);
        c.onmouseenter = () => { sel = kind === 'absolve' ? 0 : 1; render(); };
        c.onclick = () => done(kind);
        opts.appendChild(c);
        return c;
      };
      const ca = mk('absolve'), cc = mk('condemn');
      el.appendChild(opts);
      el.appendChild(h('div', 'hint', 'Sólo puedes elegir una vez. La balanza recordará.'));
      this.layers.modal.appendChild(el);
      let sel = -1;
      const render = () => { ca.classList.toggle('sel', sel === 0); cc.classList.toggle('sel', sel === 1); if (sel >= 0) Events.emit('ui:hover', { moral: sel === 0 ? 'absolve' : 'condemn' }); };
      Events.emit('moral:choice', { soul: soul.id });
      const m = {
        input: () => {
          if (Input.wasPressed('left')) { sel = 0; render(); }
          if (Input.wasPressed('right')) { sel = 1; render(); }
          if ((Input.wasPressed('confirm') || Input.wasPressed('interact')) && sel >= 0) done(sel === 0 ? 'absolve' : 'condemn');
        },
      };
      const done = (k) => { el.remove(); this.closeModal(m); resolve(k); };
      this.openModal(m);
    });
  }

  // Vertical menu
  menu({ title, items, sub, style = 'stone', cancel = -1, cls = '' }) {
    return new Promise((resolve) => {
      const el = h('div', 'screen ui-interactive fade-in ' + cls);
      if (title) el.appendChild(h('div', 'ttl shadowtxt', title));
      if (sub) el.appendChild(h('div', 'hint', sub));
      const box = framed(h('div', 'menu panel'), style);
      box.style.marginTop = '6px';
      const its = items.map((it, i) => {
        const d = h('div', 'it' + (it.disabled ? ' dis' : ''), it.label);
        d.onmouseenter = () => { sel = i; render(); };
        d.onclick = () => choose(i);
        box.appendChild(d);
        return d;
      });
      el.appendChild(box);
      this.layers.modal.appendChild(el);
      let sel = items.findIndex((x) => !x.disabled);
      const render = () => its.forEach((d, i) => d.classList.toggle('sel', i === sel));
      render();
      const m = {
        input: () => {
          if (Input.wasPressed('up')) { do sel = (sel + items.length - 1) % items.length; while (items[sel].disabled); render(); Events.emit('ui:hover'); }
          if (Input.wasPressed('down')) { do sel = (sel + 1) % items.length; while (items[sel].disabled); render(); Events.emit('ui:hover'); }
          if (Input.wasPressed('confirm') || Input.wasPressed('interact')) choose(sel);
          if (cancel >= 0 && (Input.wasPressed('back') || Input.wasPressed('pause'))) done(cancel);
        },
      };
      const choose = (i) => { if (items[i].disabled) return; Events.emit('ui:click'); done(i); };
      const done = (i) => { el.remove(); this.closeModal(m); resolve(i); };
      this.openModal(m);
    });
  }

  // Circle title card
  titleCard(circle, dur = 4.2) {
    return new Promise((resolve) => {
      const el = h('div', 'titlecard fade-in');
      el.innerHTML = `<div class="num shadowtxt">CÍRCULO ${circle.roman}</div><div class="nm shadowtxt">${circle.name}</div>
        <img class="div px" src="${dividerURL('gold')}"><div class="st shadowtxt">${circle.subtitle}</div>
        <div class="vs shadowtxt">${circle.verse[0]}</div><div class="vt shadowtxt">${circle.verse[1]}</div>`;
      this.layers.overlay.appendChild(el);
      Events.emit('titlecard', { circle });
      this.game.after(dur - 0.8, () => { el.style.transition = 'opacity 0.8s steps(8)'; el.style.opacity = 0; }, 'real');
      this.game.after(dur, () => { el.remove(); resolve(); }, 'real');
    });
  }

  bigText(text, sub = '', color = '#e8d9b5', dur = 2.5) {
    return new Promise((resolve) => {
      const el = h('div', 'titlecard fade-in');
      el.innerHTML = `<div class="nm shadowtxt" style="font-size:36px;line-height:36px;color:${color}">${text}</div><div class="st shadowtxt">${sub}</div>`;
      this.layers.overlay.appendChild(el);
      this.game.after(dur - 0.6, () => { el.style.transition = 'opacity 0.6s steps(6)'; el.style.opacity = 0; }, 'real');
      this.game.after(dur, () => { el.remove(); resolve(); }, 'real');
    });
  }

  clearModals() {
    this.layers.modal.innerHTML = '';
    this.modal = null;
  }
}

// ---------------------------------------------------------------------------------------------
// Dialogue box with portrait, gothic nameplate, typewriter text and choices
// ---------------------------------------------------------------------------------------------
class DialogueBox {
  constructor(ui) {
    this.ui = ui;
    this.el = h('div', 'dlg hidden ui-interactive');
    this.portraitBox = framed(h('div', 'portrait'), 'stone');
    this.portraitImg = h('img', 'px');
    this.portraitBox.appendChild(this.portraitImg);
    this.box = framed(h('div', 'box'), 'stone');
    this.name = h('div', 'nameplate shadowtxt');
    this.text = h('div', 'text');
    this.cont = h('div', 'cont', '▼');
    this.choices = h('div', 'choices');
    this.box.append(this.name, this.text, this.choices, this.cont);
    this.el.append(this.portraitBox, this.box);
    ui.layers.overlay.appendChild(this.el);
    this.open = false;
  }

  show(o) {
    const ui = this.ui;
    this.el.classList.remove('hidden');
    this.open = true;
    ui.setLetterbox(true);
    ui.showHud(false);
    this.choices.innerHTML = '';
    this.name.textContent = o.name || '';
    this.name.style.color = o.color || '#e8d9b5';
    this.box.style.borderImageSource = `url(${frameURL(o.speaker === 'beatriz' ? 'holy' : o.speaker === 'lucifer' || o.speaker === 'acusador' ? 'crimson' : o.speaker === 'dante' ? 'stone' : 'stone')})`;
    if (o.portrait) {
      this.portraitBox.classList.remove('hidden');
      this.portraitImg.src = portraitURL(o.portrait, o.portraitKey);
    } else this.portraitBox.classList.add('hidden');
    this.el.classList.toggle('right', o.speaker === 'dante');
    this.text.textContent = '';
    this.cont.style.visibility = 'hidden';
    const full = o.text;
    return new Promise((resolve) => {
      let i = 0, t = 0;
      const speed = 55; // chars per second
      const m = {
        input: (dt) => {
          if (i < full.length) {
            t += dt * speed;
            const n = Math.min(full.length, Math.floor(t));
            if (n > i) {
              i = n;
              this.text.textContent = full.slice(0, i);
              if (i % 3 === 0) Events.emit('dialogue:blip', { speaker: o.speaker });
            }
            if (Input.wasPressed('confirm') || Input.wasPressed('interact') || Input.wasPressed('light')) { i = full.length; this.text.textContent = full; }
            if (i >= full.length) this.cont.style.visibility = 'visible';
            return;
          }
          if (Input.wasPressed('confirm') || Input.wasPressed('interact') || Input.wasPressed('light')) {
            Events.emit('ui:click');
            ui.closeModal(m);
            resolve();
          }
        },
      };
      this.el.onclick = () => { if (i < full.length) { i = full.length; this.text.textContent = full; } else { ui.closeModal(m); resolve(); } };
      ui.openModal(m);
    });
  }

  choose(options) {
    const ui = this.ui;
    this.cont.style.visibility = 'hidden';
    this.choices.innerHTML = '';
    return new Promise((resolve) => {
      let sel = 0;
      const els = options.map((o, i) => {
        const d = h('div', 'choice' + (o.tag === 'doubt' ? ' doubt' : ''), '› ' + o.text + (o.tag ? `<span class="tag">${o.tag === 'doubt' ? '[Duda]' : o.tag === 'virtue' ? '[Virtud]' : o.tag === 'sin' ? '[Pecado]' : ''}</span>` : ''));
        d.onmouseenter = () => { sel = i; render(); };
        d.onclick = (e) => { e.stopPropagation(); done(i); };
        this.choices.appendChild(d);
        return d;
      });
      const render = () => els.forEach((d, i) => d.classList.toggle('sel', i === sel));
      render();
      const m = {
        input: () => {
          if (Input.wasPressed('up')) { sel = (sel + options.length - 1) % options.length; render(); Events.emit('ui:hover'); }
          if (Input.wasPressed('down')) { sel = (sel + 1) % options.length; render(); Events.emit('ui:hover'); }
          if (Input.wasPressed('confirm') || Input.wasPressed('interact')) done(sel);
        },
      };
      const done = (i) => { Events.emit('ui:click'); this.choices.innerHTML = ''; ui.closeModal(m); resolve(i); };
      this.el.onclick = null;
      ui.openModal(m);
    });
  }

  close() {
    this.el.classList.add('hidden');
    this.open = false;
    this.ui.setLetterbox(false);
    this.ui.showHud(true);
  }
}
