// BOSS VI · MEDUSA at the gates of Dis. Core rule, taught clearly: when the veil lifts, look away
// or hide behind stone. Around it: serpent lashes, burning tombs, and statues — her victims — that
// become your cover until she shatters them.
import { registerBoss } from '../boss.js';
import { medusaSheet } from '../../art/bosses/medusa.js';
import { gazeStep } from './gaze.js';
import { firePillar } from '../bestiary/herejia.js';
import { Sprite } from '../../render/sprite.js';
import { propSheet } from '../../art/props.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const STONE = [0x2e2a2a, 0x464040, 0x807876, 0xc0b8b6];
const SCALE = [0x08140c, 0x2c5438, 0x5c9664, 0xb8f0b0];

function raiseStatue(b, x, z) {
  const W = b.world;
  const s = new Sprite(propSheet('mourner', { stone: [0x1a1818, 0x2e2a2a, 0x464040, 0x625a58, 0x807876, 0xa09896] }), { anim: 'idle', pivot: 2, minLight: 0.4 });
  s.place(x, 0, z);
  W.root.add(s.mesh);
  const st = { x, z, r: 0.7, sprite: s, hp: 3 };
  W.gazeBlockers = W.gazeBlockers || [];
  W.gazeBlockers.push(st);
  W.addObstacle(x, z, 0.55);
  W.fx.emit('dust', x, 0.4, z, 16, { c0: 0xb0a8a0, c1: 0x403838 });
  return st;
}
function shatterStatues(b) {
  const W = b.world;
  for (const st of W.gazeBlockers || []) {
    W.fx.emit('dust', st.x, 1, st.z, 20, { c0: 0xb0a8a0, c1: 0x403838 });
    for (let k = 0; k < 6; k++) b.shoot({ x: st.x, z: st.z, angle: (k / 6) * 6.28, speed: 7, kind: 'shard', ramp: STONE, size: 10, damage: 10, life: 1.2 });
    st.sprite.dispose();
    W.obstacles = W.obstacles.filter((o) => !(o.x === st.x && o.z === st.z));
  }
  W.gazeBlockers = [];
}

const P = {
  mirada: (b, dt, S) => {
    if (S.t === 0) { b.play('unveil', { restart: true }); b.stop(0); }
    b.stop(0);
    if (S.t > 1.2 * b.teleMul) b.play('gaze');
    if (gazeStep(b, S, dt, { windup: 2.2, damage: 28, x: b.x, z: b.z - 0.3 })) { b.play('idle'); return 'done'; }
  },
  latigos: (b, dt, S) => {
    if (S.t === 0) { S.n = 0; }
    const n = 2 + (b.phase >= 1 ? 1 : 0);
    if (S.n < n && S.t >= S.n * 0.7) {
      b.faceTarget(); const a = b.angleToTarget();
      b.play('windup', { restart: true });
      b.telegraph({ shape: 'cone', radius: 6, halfAngle: 0.5, angle: a, duration: 0.5 });
      b.after(0.5 * b.teleMul, () => {
        b.play('attack', { restart: true });
        b.strike({ shape: 'arc', angle: a, range: 6, arc: 1, damage: 20, knockback: 8, element: 'poison', status: { poison: { amount: 1, dur: 3 } } });
        for (let k = 0; k < 10; k++) b.world.fx.emit('poison', b.x + Math.cos(a) * k * 0.6, 1.2, b.z + Math.sin(a) * k * 0.6, 1);
      });
      S.n++;
    }
    if (S.t > n * 0.7 + 0.6) return 'done';
  },
  tumbas: (b, dt, S) => {
    if (S.t === 0) { b.play('roar'); S.k = 0; Events.emit('boss:roar', { boss: b }); }
    const n = 5 + b.phase * 2;
    if (S.k < n && S.t >= 0.3 + S.k * 0.28) {
      const p = b.target;
      firePillar(b, p.x + (Math.random() - 0.5) * 2.4, p.z + (Math.random() - 0.5) * 2, { damage: 18, radius: 1.3 });
      S.k++;
    }
    if (S.t > 0.3 + n * 0.28 + 1) return 'done';
  },
  estatuas: (b, dt, S) => {
    // her victims rise: cover against the gaze (and they shatter into shrapnel later)
    if (S.t === 0) {
      b.play('windup', { restart: true });
      if ((b.world.gazeBlockers || []).length) shatterStatues(b);
      const room = b.world.room;
      for (let k = 0; k < 3; k++) {
        const pt = room.randomFloor({ int: (a, c) => a + Math.floor(Math.random() * (c - a + 1)) }, (x, z) => Math.hypot(x - b.x, z - b.z) > 4);
        if (pt) raiseStatue(b, pt.x, pt.z);
      }
    }
    if (S.t > 1) return 'done';
  },
  esquirlas: (b, dt, S) => {
    if (S.t === 0) { b.play('windup', { restart: true }); }
    if (S.t >= 0.6 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      for (let w = 0; w < 3; w++) b.after(w * 0.3, () => b.ring(14, { angle: w * 0.15, speed: 6, kind: 'shard', ramp: SCALE, size: 10, damage: 11, life: 2.2, element: 'poison' }));
    }
    if (S.t > 1.6) return 'done';
  },
};

registerBoss({
  id: 'medusa', name: 'Medusa', title: 'La Gorgona de Dite', boss: true, circle: 'herejia',
  hp: 2800, speed: 1.4, radius: 1.6, mass: 40, blood: 'ichor', pivot: 2, shadow: 2.6,
  sheet: () => medusaSheet(), aura: 'poison', auraY: 2,
  light: { color: 0x9ae0a0, intensity: 1.1, radius: 6, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'poison', deathPreset: 'poison', deathEdge: 0xb8f0b0, deathRamp: SCALE, pillarRamp: STONE,
  onDeath(b) { shatterStatues(b); },
  arena(W, b) { W.gazeBlockers = []; },
  idle(b) {
    const d = b.distToTarget();
    if (d > 6) b.chase(0.8); else if (d < 3) b.steer(b.angleToTarget() + Math.PI, 0.6); else b.steer(b.angleToTarget() + Math.PI / 2, 0.4);
    b.play('move');
  },
  patterns: {
    0: [
      { id: 'mirada', weight: 2, cd: 8, run: P.mirada },
      { id: 'latigos', weight: 3, cd: 2.4, range: [0, 6.5], run: P.latigos },
      { id: 'tumbas', weight: 2, cd: 4, run: P.tumbas },
      { id: 'estatuas', weight: 1.5, cd: 10, cond: (b) => !(b.world.gazeBlockers || []).length, run: P.estatuas },
    ],
    1: [
      { id: 'mirada', weight: 2.5, cd: 7, run: P.mirada },
      { id: 'latigos', weight: 3, cd: 2, range: [0, 6.5], run: P.latigos },
      { id: 'tumbas', weight: 2, cd: 3.5, run: P.tumbas },
      { id: 'estatuas', weight: 2, cd: 9, run: P.estatuas },
      { id: 'esquirlas', weight: 2, cd: 4, run: P.esquirlas },
    ],
    2: [
      { id: 'mirada', weight: 3, cd: 5.5, run: P.mirada },
      { id: 'latigos', weight: 3, cd: 1.8, range: [0, 6.5], run: P.latigos },
      { id: 'tumbas', weight: 2, cd: 3, run: P.tumbas },
      { id: 'estatuas', weight: 2, cd: 8, run: P.estatuas },
      { id: 'esquirlas', weight: 2, cd: 3.4, run: P.esquirlas },
    ],
  },
  intro: [
    ['virgilio', '¡Vuélvete! Si la Gorgona se muestra y la ves, no habrá regreso posible.'],
    ['medusa', 'Mírame, poeta. Todos los que negaron el alma acabaron mirándome. Es tan fácil...', { name: 'Medusa' }],
    ['dante', (c) => (c.tier >= 1 ? 'Cerraré los ojos. He aprendido a ver sin ellos.' : c.tier <= -1 ? '¿Y si quiero mirar?' : 'Maestro, ¿cómo se lucha contra lo que no se puede ver?')],
    ['virgilio', 'Cuando levante el velo, aparta la mirada o escóndete tras la piedra. Lo demás, con la espada.'],
  ],
  outro: [['virgilio', 'Oh vosotros que tenéis el entendimiento sano: mirad la doctrina que se esconde bajo el velo de los versos extraños.']],
});
