// The three destinies (GDD 6.2): Redención, Caída, Final Gris. Pixel illustration + text + credits.
import { paintRedencion, paintCaida, paintGris } from '../../art/endings.js';
import { resolveEnding } from '../moral.js';
import { ENDINGS } from '../../data/endings.js';
import { Save } from '../../core/save.js';
import { Events } from '../../core/events.js';
import { Input } from '../../core/input.js';

export class EndingState {
  async enter() {
    const g = this.game, run = g.run;
    const id = resolveEnding(run.moral, run.flags.finalChoice);
    this.id = id;
    const E = ENDINGS[id];
    const meta = Save.meta;
    if (!meta.endings.includes(id)) meta.endings.push(id);
    Save.save();
    Events.emit('ending', { id });
    g.ui.showHud(false);
    const painting = id === 'redencion' ? paintRedencion() : id === 'caida' ? paintCaida() : paintGris();
    const root = g.ui.layers.modal;
    const el = document.createElement('div');
    el.className = 'screen ui-interactive';
    el.style.background = '#050304';
    const img = document.createElement('img');
    img.className = 'px';
    img.src = painting.toDataURL(1);
    const sc = Math.max(1, Math.floor(Math.min(g.ui.w / 320, (g.ui.h - 50) / 180)));
    img.style.cssText = `width:${320 * sc}px;height:${180 * sc}px;opacity:0;transition:opacity 2s steps(12)`;
    const title = document.createElement('div');
    title.className = 'ttl shadowtxt';
    title.style.cssText = `color:${E.color};margin-top:4px`;
    title.textContent = E.title;
    const text = document.createElement('div');
    text.style.cssText = 'max-width:300px;text-align:center;min-height:30px;font-size:8px;line-height:10px';
    el.append(img, title, text);
    root.appendChild(el);
    g.pipe.post.uFade.value.w = 0;
    g.after(0.05, () => { img.style.opacity = 1; }, 'real');
    Events.emit('ending:show', { id });
    await g.wait(2.2);
    for (const line of E.lines) {
      const t = typeof line === 'function' ? line(run) : line;
      await g.tween(Math.max(0.4, t.length * 0.028), (k) => { text.textContent = t.slice(0, Math.round(k * t.length)); });
      await waitKey(g, 4);
    }
    // credits
    text.innerHTML = '<div class="goth">SULPHUR</div><div>Un descenso por los nueve círculos.</div><div class="hint">Inspirado en la Divina Comedia de Dante Alighieri (1308–1321)</div>';
    await waitKey(g, 6);
    el.remove();
    run.result = 'victory';
    g.setState('runEnd', { result: 'victory' });
  }
  update() { this.game.world.update(0); }
}

function waitKey(g, maxS) {
  return new Promise((resolve) => {
    let t = 0;
    const m = {
      input: (dt) => {
        t += dt;
        if (t > 0.25 && (Input.wasPressed('confirm') || Input.wasPressed('interact') || Input.wasPressed('light')) || t > maxS) { g.ui.closeModal(m); resolve(); }
      },
    };
    g.ui.openModal(m);
  });
}
