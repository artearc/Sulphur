// Developer sandbox: one room of a circle with a wave of its enemies.
import { generateRoom } from '../roomgen.js';
import { CIRCLES } from '../../data/circles.js';
import { Rng } from '../../core/rng.js';
import { Player } from '../player.js';
import { createEnemy } from '../bestiary/index.js';
import { Input } from '../../core/input.js';

export class SandboxState {
  enter(params = {}) {
    const g = this.game, W = g.world;
    this.params = params;
    const circle = CIRCLES[params.circle ?? 0];
    this.circle = circle;
    this.rng = new Rng(params.seed ?? 1234);
    const layout = generateRoom({ type: params.type || 'combat', circle, rng: this.rng, exits: [{ kind: 'combat' }, { kind: 'soul' }] });
    W.controller = this;
    W.loadRoom(layout, circle);
    if (!W.player) W.player = new Player(W, { x: layout.entrance.x, z: layout.entrance.z });
    W.player.x = layout.entrance.x; W.player.z = layout.entrance.z;
    g.rig.snapTo(W.player.x, W.player.z);
    this.spawnWave();
  }
  spawnWave() {
    const W = this.game.world;
    if (this.params?.boss) {
      const id = this.params.boss === '1' ? this.circle.boss : this.params.boss;
      const b = createEnemy(W, id, W.layout.w / 2, 8, {});
      b?.activate?.();
      if (b?.def.bigBoss) { this.game.rig.extraTop = b.def.bigBoss; this.game.rig.bossFocus = b; b.z = 13; }
      return;
    }
    const sp = this.rng.shuffle([...W.layout.spawns]);
    const ids = this.circle.enemies;
    for (let k = 0; k < 5 && k < sp.length; k++) createEnemy(W, ids[k % ids.length], sp[k].x, sp[k].z, { elite: k === 4 });
  }
  spawnEnemy(id, x, z, o) { return createEnemy(this.game.world, id, x, z, o); }
  dropLoot() {}
  onEnemyKilled() {
    if (this.game.world.aliveEnemies().length === 0) this.game.after(1.2, () => this.spawnWave());
  }
  onPlayerDeath() {}
  update(dt) {
    const g = this.game, W = g.world;
    W.update(dt);
    const p = W.player;
    g.rig.update(g.simDt > 0 ? dt : 0.0001, p.x, p.z, Math.cos(p.aim) * 1.2, Math.sin(p.aim) * 0.9);
    W.lights.update(dt, p.x, p.z);
    if (Input.wasPressed('map')) { this.enter({ circle: (CIRCLES.indexOf(this.circle) + 1) % 9, seed: Math.random() * 1e9 | 0 }); }
  }
}
