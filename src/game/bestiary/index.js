// Bestiary registry: importing a circle module registers its enemies.
import { ENEMY_DEFS, Enemy } from '../enemy.js';
import './limbo.js';
import './lujuria.js';
import './gula.js';
import './avaricia.js';
import './ira.js';
import './herejia.js';
import './violencia.js';
import './fraude.js';
import './traicion.js';
import '../bosses/index.js';

export function createEnemy(world, id, x, z, o = {}) {
  const def = ENEMY_DEFS[id];
  if (!def) { console.warn('Unknown enemy', id); return null; }
  const Cls = def.cls || Enemy;
  const e = new Cls(world, def, { x, z, ...o });
  world.addEnemy(e);
  return e;
}
export { ENEMY_DEFS };
