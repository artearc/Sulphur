// Larger UI screens: circle map, options, run summary. Installed onto the UI prototype.
import { UI } from './ui.js';
import { Input } from '../core/input.js';
import { Events } from '../core/events.js';
import { Save } from '../core/save.js';
import { iconURL } from '../art/icons.js';
import { frameURL, dividerURL } from './frames.js';
import { ROOM_TYPES, REWARDS, gateState } from '../game/map.js';
import { BOONS } from '../data/boons.js';
import { RELICS } from '../data/relics.js';
import { TIERS } from '../game/moral.js';
import { WEAPONS } from '../data/weapons.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const framed = (el, style) => { el.classList.add('frame'); el.style.borderImageSource = `url(${frameURL(style)})`; return el; };

const NODE_ICON = { start: 'gate', combat: 'sword', elite: 'skull', soul: 'soul', altarV: 'virtue', altarS: 'sin', shop: 'shop', treasure: 'relic', rest: 'rest', miniboss: 'horns', secret: 'secret', boss: 'boss' };
const REWARD_ICON = { gold: 'coin', essence: 'essence', fragment: 'fragment', boonV: 'virtue', boonS: 'sin', heal: 'heal', relic: 'relic' };

UI.prototype.showMap = function (run, currentId) {
  return new Promise((resolve) => {
    const map = run.map;
    const p = this.game.world.player;
    const el = h('div', 'mapov ui-interactive fade-in');
    el.appendChild(h('div', 'goth24 shadowtxt', `Círculo ${run.circle.roman} · ${run.circle.name}`));
    const div = h('img', 'px'); div.src = dividerURL('gold'); div.style.cssText = 'width:64px;height:5px;margin:2px 0 4px';
    el.appendChild(div);
    const W = Math.min(this.w - 40, 360), H = Math.min(this.h - 70, 190);
    const layers = {};
    for (const n of Object.values(map.nodes)) (layers[n.layer] ||= []).push(n);
    const keys = Object.keys(layers).map(Number).sort((a, b) => a - b);
    const pos = {};
    keys.forEach((L, li) => {
      const row = layers[L];
      row.forEach((n, i) => { pos[n.id] = { x: 20 + (W - 40) * (li / Math.max(1, keys.length - 1)), y: H / 2 + (i - (row.length - 1) / 2) * 34 }; });
    });
    const box = h('div', '');
    box.style.cssText = `position:relative;width:${W}px;height:${H}px`;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.style.position = 'absolute';
    const sight = p?.stats.fullMap ? 99 : p?.stats.mapSight || Save.upgrade('vista') ? 2 : 1;
    const curLayer = map.nodes[currentId]?.layer ?? 0;
    const visible = (n) => {
      if (n.hidden && gateState(n, run, p) === 'hidden' && !n.visited) return false;
      return true;
    };
    for (const n of Object.values(map.nodes)) {
      if (!visible(n)) continue;
      for (const e of n.exits) {
        const m = map.nodes[e];
        if (!visible(m)) continue;
        const a = pos[n.id], b = pos[e];
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        const travelled = n.visited && m.visited;
        line.setAttribute('stroke', travelled ? '#f2c45a' : m.gate === 'virtue' ? '#a06c18' : m.gate === 'sin' ? '#8a1016' : '#4a3e40');
        line.setAttribute('stroke-width', travelled ? 2 : 1);
        if (!travelled) line.setAttribute('stroke-dasharray', '2 2');
        line.setAttribute('shape-rendering', 'crispEdges');
        svg.appendChild(line);
      }
    }
    box.appendChild(svg);
    for (const n of Object.values(map.nodes)) {
      if (!visible(n)) continue;
      const a = pos[n.id];
      const nd = h('div', '');
      const known = n.visited || n.layer - curLayer <= sight;
      const icon = known ? ((n.type === 'combat' || n.type === 'elite') && n.reward ? REWARD_ICON[n.reward] : NODE_ICON[n.type]) : 'secret';
      nd.style.cssText = `position:absolute;left:${Math.round(a.x - 9)}px;top:${Math.round(a.y - 9)}px;width:18px;height:18px;background:#0b0709;border:1px solid ${n.id === currentId ? '#fff4cc' : n.visited ? '#a06c18' : '#3a2e30'};opacity:${n.cleared || n.id === currentId || !n.visited ? 1 : 0.6}`;
      const im = h('img', 'px'); im.src = iconURL(icon); im.style.cssText = 'position:absolute;left:0;top:0;width:16px;height:16px';
      nd.appendChild(im);
      if (n.id === currentId) { const m = h('div', ''); m.style.cssText = 'position:absolute;left:5px;top:-6px;width:6px;height:4px;background:#fff4cc;animation:uiBob 0.8s steps(2) infinite'; nd.appendChild(m); }
      nd.title = ROOM_TYPES[n.type].label;
      box.appendChild(nd);
    }
    el.appendChild(box);
    const legend = h('div', 'hint', 'Las líneas doradas son tu camino. Senderos de Virtud (oro) y Grietas del Pecado (rojo) exigen una balanza inclinada. [Tab/Esc] Cerrar');
    legend.style.marginTop = '6px'; legend.style.maxWidth = W + 'px'; legend.style.textAlign = 'center';
    el.appendChild(legend);
    this.layers.modal.appendChild(el);
    Events.emit('ui:open', { kind: 'map' });
    const m = { input: () => { if (Input.wasPressed('map') || Input.wasPressed('back') || Input.wasPressed('pause') || Input.wasPressed('confirm')) done(); } };
    const done = () => { el.remove(); this.closeModal(m); resolve(); };
    el.onclick = done;
    this.openModal(m);
  });
};

UI.prototype.options = function () {
  return new Promise((resolve) => {
    const S = Save.settings;
    const rows = [
      { key: 'masterVolume', label: 'Volumen general', type: 'pct' },
      { key: 'musicVolume', label: 'Música', type: 'pct' },
      { key: 'sfxVolume', label: 'Efectos', type: 'pct' },
      { key: 'voiceVolume', label: 'Voces', type: 'pct' },
      { key: 'screenShake', label: 'Temblor de cámara', type: 'pct' },
      { key: 'gameSpeed', label: 'Velocidad del juego', type: 'list', values: [0.7, 0.85, 1] , fmt: (v) => Math.round(v * 100) + '%' },
      { key: 'colorblind', label: 'Modo daltónico', type: 'list', values: ['none', 'deuter', 'protan', 'tritan'], fmt: (v) => ({ none: 'No', deuter: 'Deuteranopía', protan: 'Protanopía', tritan: 'Tritanopía' }[v]) },
      { key: 'damageNumbers', label: 'Números de daño', type: 'bool' },
      { key: 'subtitles', label: 'Subtítulos', type: 'bool' },
      { key: 'bloom', label: 'Resplandor', type: 'bool' },
      { key: 'pixelScale', label: 'Escala de píxel', type: 'list', values: ['auto', 2, 3, 4, 5, 6], fmt: (v) => (v === 'auto' ? 'Auto' : 'x' + v) },
      { key: 'fullscreen', label: 'Pantalla completa', type: 'bool' },
      { key: '_back', label: 'Volver', type: 'back' },
    ];
    const el = h('div', 'screen ui-interactive fade-in');
    el.appendChild(h('div', 'ttl shadowtxt', 'Opciones'));
    const box = framed(h('div', 'panel'), 'stone');
    box.style.cssText += ';min-width:220px;margin-top:6px';
    const els = rows.map((r, i) => {
      const d = h('div', 'kv');
      d.style.cssText = 'padding:1px 4px;cursor:pointer;border:1px solid transparent';
      d.onmouseenter = () => { sel = i; render(); };
      d.onclick = () => change(i, 1);
      box.appendChild(d);
      return d;
    });
    el.appendChild(box);
    el.appendChild(h('div', 'hint', '← → cambiar · Esc volver'));
    this.layers.modal.appendChild(el);
    let sel = 0;
    const fmt = (r) => {
      const v = S[r.key];
      if (r.type === 'pct') return Math.round(v * 100) + '%';
      if (r.type === 'bool') return v ? 'Sí' : 'No';
      if (r.type === 'list') return r.fmt ? r.fmt(v) : String(v);
      return '';
    };
    const render = () => els.forEach((d, i) => {
      const r = rows[i];
      d.innerHTML = `<span>${r.label}</span><span class="v">${fmt(r)}</span>`;
      d.style.borderColor = i === sel ? '#a06c18' : 'transparent';
    });
    const change = (i, dir) => {
      const r = rows[i];
      if (r.type === 'back') return done();
      if (r.type === 'pct') S[r.key] = Math.max(0, Math.min(1, Math.round((S[r.key] + dir * 0.1) * 10) / 10));
      if (r.type === 'bool') S[r.key] = !S[r.key];
      if (r.type === 'list') { const k = r.values.indexOf(S[r.key]); S[r.key] = r.values[(k + dir + r.values.length) % r.values.length]; }
      if (r.key === 'fullscreen') { try { if (S.fullscreen) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); } catch { /* ignore */ } }
      if (r.key === 'pixelScale') this.game.pipe.resize();
      Save.saveSettings();
      Events.emit('settings', { key: r.key });
      Events.emit('ui:hover');
      render();
    };
    render();
    const m = {
      input: () => {
        if (Input.wasPressed('up')) { sel = (sel + rows.length - 1) % rows.length; render(); }
        if (Input.wasPressed('down')) { sel = (sel + 1) % rows.length; render(); }
        if (Input.wasPressed('left')) change(sel, -1);
        if (Input.wasPressed('right')) change(sel, 1);
        if (Input.wasPressed('confirm')) change(sel, 1);
        if (Input.wasPressed('back') || Input.wasPressed('pause')) done();
      },
    };
    const done = () => { el.remove(); this.closeModal(m); resolve(); };
    this.openModal(m);
  });
};

UI.prototype.runSummary = function (sum, result) {
  return new Promise((resolve) => {
    const el = h('div', 'screen runend ui-interactive fade-in');
    const titles = { death: 'Has caído', abandon: 'Abandonas el descenso', victory: 'El descenso ha terminado' };
    el.appendChild(h('div', 'ttl shadowtxt ' + (result === 'death' ? 'death' : 'win'), titles[result] || 'Fin'));
    const sub = result === 'death' ? `El Infierno te reclamó en ${sum.circleName} (Círculo ${sum.circle}).` : result === 'abandon' ? 'Virgilio te espera arriba, en silencio.' : 'Ves de nuevo las estrellas.';
    el.appendChild(h('div', 'hint', sub));
    const box = framed(h('div', 'panel'), result === 'death' ? 'crimson' : 'gold');
    box.style.marginTop = '6px';
    const grid = h('div', 'grid');
    const T = TIERS[sum.tier];
    const kv = (k, v, c) => `<div class="kv"><span>${k}</span><span class="v" ${c ? `style="color:${c}"` : ''}>${v}</span></div>`;
    grid.innerHTML = kv('Arma', WEAPONS[sum.weapon]?.short || sum.weapon) + kv('Destino', T.name, T.color)
      + kv('Salas despejadas', sum.rooms) + kv('Condenados vencidos', sum.kills)
      + kv('Almas absueltas', sum.absolved, '#ffe8a0') + kv('Almas condenadas', sum.condemned, '#ff8a90')
      + kv('Esencias conservadas', '+' + sum.essences, '#9ad8ff') + kv('Fragmentos conservados', '+' + sum.fragments, '#f2c45a')
      + kv('Oro perdido', sum.gold) + kv('Tiempo', `${Math.floor(sum.time / 60)}:${String(Math.floor(sum.time % 60)).padStart(2, '0')}`);
    box.appendChild(grid);
    const build = h('div', '');
    build.style.cssText = 'display:flex;gap:1px;flex-wrap:wrap;max-width:220px;margin-top:3px';
    for (const [id, l] of Object.entries(sum.boons)) { const im = h('img', 'px'); im.src = iconURL(BOONS[id].icon); im.title = BOONS[id].name + ' ' + l; build.appendChild(im); }
    for (const id of sum.relics) { const im = h('img', 'px'); im.src = iconURL(RELICS[id].icon); build.appendChild(im); }
    box.appendChild(build);
    el.appendChild(box);
    el.appendChild(h('div', 'hint', '[E] Volver a la Antesala'));
    this.layers.modal.appendChild(el);
    const m = { input: () => { if (Input.wasPressed('confirm') || Input.wasPressed('interact')) done(); } };
    const done = () => { Events.emit('ui:click'); el.remove(); this.closeModal(m); resolve(); };
    el.onclick = done;
    this.game.after(0.6, () => this.openModal(m), 'real');
  });
};
