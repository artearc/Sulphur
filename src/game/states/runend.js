// Run summary: banks meta resources (Esencias, Fragmentos) and returns to the Hub.
import { Save } from '../../core/save.js';
import { Events } from '../../core/events.js';

export class RunEndState {
  async enter(params = {}) {
    const g = this.game, run = g.run;
    const result = params.result || run?.result || 'death';
    g.world.paused = true;
    if (run) {
      const sum = run.summary();
      const meta = Save.meta;
      meta.essences += run.essences;
      meta.fragments += run.fragments;
      if (result === 'death') meta.deaths++;
      if (result === 'victory') meta.victories++;
      meta.flags.lastTier = run.moral.tier;
      meta.flags.lastBalance = run.moral.balance;
      meta.lastRun = { ...sum, result, decisions: run.decisions, virgilCommented: false };
      Save.save();
      Events.emit('run:end', { result });
      g.pipe.post.uFade.value.w = 0.6;
      await g.ui.runSummary(sum, result);
    }
    g.pipe.post.uFade.value.w = 1;
    g.setState('hub', { lastTier: run?.moral.tier ?? 0 });
  }
  update() {
    this.game.world.update(0);
  }
}
