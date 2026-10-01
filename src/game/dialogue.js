// Dialogue runner.
// Script format (data/dialogue/*.js):
//   { lines: [ step, step, ... ], once?, priority?, cond?(ctx) }
// Steps:
//   ['speaker', 'text' | (ctx)=>text, { mood, zoom }]       a line
//   { choice: [ { t, then?: [steps] | 'label', fx?, cond?(ctx), tag? } ] }   branching choice
//   { if: (ctx)=>bool, then: [steps], else: [steps] }      conditional block
//   { fx: { virtue, sin, doubt, flag, metaFlag, gold, heal, essence, fragment } | (ctx)=>void }
//   { moral: soulId }                                       ABSOLVER / CONDENAR (see data/souls.js)
//   { label: 'name' } / { goto: 'name' } / { end: true }
//   { event: 'name', payload }                              emits a game event (cutscene hooks)
import { Events } from '../core/events.js';
import { Save } from '../core/save.js';
import { SPEAKERS } from '../data/speakers.js';

export function makeContext(game, extra = {}) {
  const run = game.run;
  const meta = Save.meta;
  return {
    game, run, meta, extra,
    moral: run?.moral,
    tier: run?.moral.tier ?? meta.flags.lastTier ?? 0,
    balance: run?.moral.balance ?? 0,
    circle: run?.circle,
    circleIndex: run?.circleIndex ?? -1,
    player: game.world.player,
    flag: (k) => meta.flags[k],
    runFlag: (k) => run?.flags[k],
    seen: (id) => Save.seenCount(id),
    soul: (id) => meta.souls[id] || { absolved: 0, condemned: 0, last: null },
    decided: (id) => run?.decisions.find((d) => d.soul === id)?.choice,
    runs: meta.runs, deaths: meta.deaths, victories: meta.victories,
    absolvedTotal: meta.totalAbsolved, condemnedTotal: meta.totalCondemned,
    ...extra,
  };
}

export class DialogueRunner {
  constructor(game) {
    this.game = game;
    this.active = false;
  }

  async play(script, opts = {}) {
    const g = this.game;
    const ui = g.ui;
    const ctx = makeContext(g, opts.ctx || {});
    if (typeof script === 'string') {
      const id = script;
      script = opts.registry?.[id];
      if (!script) { console.warn('dialogue not found', id); return {}; }
      Save.markSeen(id);
    }
    this.active = true;
    const p = g.world.player;
    if (p) p.locked = true;
    Events.emit('dialogue:open', { id: opts.id });
    if (opts.focus) g.rig.setZoom(opts.zoom ?? 1.45, opts.focus, 3.5);
    const result = { choices: [] };
    try {
      await this.runSteps(script.lines || script, ctx, result, opts);
    } finally {
      ui.dialogue.close();
      if (opts.focus) g.rig.setZoom(1, null, 3);
      if (p && !opts.keepLocked) p.locked = false;
      this.active = false;
      Events.emit('dialogue:close', {});
    }
    return result;
  }

  async runSteps(steps, ctx, result, opts) {
    const labels = {};
    steps.forEach((s, i) => { if (s && s.label) labels[s.label] = i; });
    let i = 0;
    while (i < steps.length) {
      const s = steps[i];
      i++;
      if (!s) continue;
      if (Array.isArray(s)) {
        const [speaker, text, o = {}] = s;
        const t = typeof text === 'function' ? text(ctx) : text;
        if (t == null || t === '') continue;
        await this.line(speaker, t, o, ctx);
        continue;
      }
      if (s.label) continue;
      if (s.end) return 'end';
      if (s.goto) { if (labels[s.goto] != null) { i = labels[s.goto]; continue; } return s.goto; }
      if (s.if) {
        const ok = s.if(ctx);
        const r = await this.runSteps(ok ? s.then || [] : s.else || [], ctx, result, opts);
        if (r === 'end') return 'end';
        continue;
      }
      if (s.fx) { this.applyFx(s.fx, ctx); continue; }
      if (s.event) { Events.emit(s.event, s.payload); continue; }
      if (s.wait) { await this.game.wait(s.wait); continue; }
      if (s.choice) {
        const opts2 = s.choice.filter((c) => !c.cond || c.cond(ctx));
        const idx = await this.game.ui.dialogue.choose(opts2.map((c) => ({ text: typeof c.t === 'function' ? c.t(ctx) : c.t, tag: c.tag })));
        const c = opts2[idx];
        result.choices.push(c.id ?? idx);
        if (c.fx) this.applyFx(c.fx, ctx);
        if (c.then) {
          if (typeof c.then === 'string') { if (labels[c.then] != null) { i = labels[c.then]; continue; } }
          else { const r = await this.runSteps(c.then, ctx, result, opts); if (r === 'end') return 'end'; }
        }
        continue;
      }
      if (s.moral) {
        const choice = await this.game.controller?.moralChoice?.(s.moral, ctx);
        result.moral = choice;
        const branch = choice === 'absolve' ? s.absolve : s.condemn;
        if (branch) { const r = await this.runSteps(branch, ctx, result, opts); if (r === 'end') return 'end'; }
        continue;
      }
    }
    return null;
  }

  async line(speaker, text, o, ctx) {
    const sp = SPEAKERS[speaker] || SPEAKERS.alma;
    const portrait = sp.portrait ? { ...sp.portrait(ctx), ...(o.mood ? { mood: o.mood } : {}) } : null;
    Events.emit('dialogue:line', { speaker, voice: sp.voice, text });
    await this.game.ui.dialogue.show({ speaker, name: o.name || (speaker === 'alma' && ctx.soulName) || sp.name, color: sp.color, text, portrait, portraitKey: speaker + (o.mood || '') + (speaker === 'dante' ? ctx.tier : ''), side: o.side });
  }

  applyFx(fx, ctx) {
    if (typeof fx === 'function') { fx(ctx); return; }
    const run = ctx.run, meta = Save.meta, ui = this.game.ui;
    if (fx.virtue && run) { run.moral.add('virtue', fx.virtue, 'dialogue'); ui.toast(`+${fx.virtue} Virtud`, 'virtue'); }
    if (fx.sin && run) { run.moral.add('sin', fx.sin, 'dialogue'); ui.toast(`+${fx.sin} Pecado`, 'sin'); }
    if (fx.doubt) { if (run) run.moral.add('doubt', fx.doubt, 'dialogue'); meta.flags.doubt = (meta.flags.doubt || 0) + fx.doubt; ui.toast('La duda crece', 'doubt'); }
    if (fx.flag) for (const [k, v] of Object.entries(fx.flag)) meta.flags[k] = v;
    if (fx.runFlag && run) for (const [k, v] of Object.entries(fx.runFlag)) run.flags[k] = v;
    if (fx.gold && run) run.addGold(fx.gold);
    if (fx.heal && ctx.player) ctx.player.heal(fx.heal);
    if (fx.essence && run) run.addEssence(fx.essence);
    if (fx.fragment && run) run.addFragment(fx.fragment);
    if (fx.metaEssence) meta.essences += fx.metaEssence;
  }
}

// Pick the best available dialogue from a registry for a given topic prefix.
export function pickDialogue(registry, prefix, ctx) {
  const cands = Object.entries(registry)
    .filter(([id, d]) => id.startsWith(prefix) && (!d.once || !Save.seenCount(id)) && (!d.cond || d.cond(ctx)))
    .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0) || Save.seenCount(a[0]) - Save.seenCount(b[0]));
  return cands.length ? cands[0][0] : null;
}
