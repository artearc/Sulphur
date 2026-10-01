// BOSS VIII · GERIÓN, sozza imagine di froda. Deception made flesh — but always fair:
// THE COLOR RULE: violet seals lie, crimson seals don't. Kind words from the honest face while the
// tail strikes from elsewhere; a dive into darkness; copies of himself that only pretend.
import { registerBoss } from '../boss.js';
import { registerEnemy } from '../enemy.js';
import { gerionSheet } from '../../art/bosses/gerion.js';
import { SharedUniforms } from '../../render/lighting.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const VENOM = [0x0a2a10, 0x3a8a30, 0xa0ff60, 0xe8ffd0];
const KIND = ['Ven, peregrino. Yo te llevaré abajo sobre mi espalda.', 'No temas: mi rostro es el de un hombre justo.', 'Confía en mí. Todos confiaron.', 'Te deseo el bien, de verdad.'];

function seal(b, x, z, real, o = {}) {
  const r = o.r ?? 1.5;
  b.telegraph({ shape: 'circle', x, z, radius: r, duration: o.windup ?? 0.85, color: real ? 0x8a0a18 : 0x2e1450, edge: real ? 0xff4a4a : 0xa070e0 });
  b.after((o.windup ?? 0.85) * b.teleMul, () => {
    const W = b.world;
    if (real) {
      b.strike({ shape: 'circle', x, z, radius: r, damage: o.damage ?? 22, knockback: 7, element: 'poison', status: { poison: { amount: 1, dur: 4 } } });
      W.fx.emit('poison', x, 0.6, z, 18, { speed: [2, 5], c0: 0xa0ff60, c1: 0x0a2a10 });
      W.fx.decal('bile', x, z, r * 0.8, { alpha: 0.8 });
      W.fx.shake(0.25);
    } else {
      W.fx.emit('shadow', x, 0.6, z, 12);
      W.fx.emit('soul', x, 0.6, z, 6, { c0: 0xa070e0, c1: 0x1a0a2a });
    }
  });
}

function teach(b) {
  const W = b.world;
  if (b.ai.taught) return;
  b.ai.taught = true;
  W.game.ui?.bark(W.player.x, W.player.z, 'Virgilio: «Sus sellos violeta mienten. Teme sólo a los rojos.»', 2.6);
}

const P = {
  aguijon: (b, dt, S) => {
    if (S.t === 0) { b.play('windup', { restart: true }); teach(b); b.world.game.ui?.bark(b.x, b.z, KIND[(Math.random() * KIND.length) | 0], 1.8); S.k = 0; }
    const n = 3 + b.phase;
    if (S.k < n && S.t >= 0.3 + S.k * 0.4) {
      const p = b.target;
      const realIdx = Math.floor(Math.random() * 3);
      for (let j = 0; j < 3; j++) {
        const x = p.x + (j === realIdx ? p.vx * 0.2 : (Math.random() - 0.5) * 5), z = p.z + (j === realIdx ? p.vz * 0.2 : (Math.random() - 0.5) * 4);
        seal(b, x, z, j === realIdx);
      }
      S.k++;
      if (S.k === n) b.play('sting', { restart: true });
    }
    if (S.t > 0.3 + n * 0.4 + 1) return 'done';
  },
  garras: (b, dt, S) => {
    if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 4.5, halfAngle: 0.8, angle: S.a, duration: 0.6 }); }
    if (S.t >= 0.6 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      b.strike({ shape: 'arc', angle: S.a, range: 4.5, arc: 1.6, damage: 24, knockback: 10 });
      b.world.fx.shake(0.3);
    }
    if (S.t > 1.2) return 'done';
  },
  vuelo: (b, dt, S) => {
    // swoops over the abyss in a long line
    if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('roar'); b.telegraph({ shape: 'rect', angle: S.a, length: 15, width: 3, duration: 0.85 }); S.hit = new Set(); Events.emit('boss:windup', { boss: b }); }
    const go = 0.85 * b.teleMul;
    if (S.t >= go && S.t < go + 0.8) { b.play('move'); b.vx = Math.cos(S.a) * 18 / b.speedMul; b.vz = Math.sin(S.a) * 18 / b.speedMul; b.strike({ shape: 'circle', radius: 1.9, damage: 22, knockback: 12, hitSet: S.hit }); if (Math.random() < 0.6) b.world.fx.emit('shadow', b.x, 1, b.z, 2); }
    else if (S.t >= go) b.stop(0.3);
    if (S.t > go + 1.1) return 'done';
  },
  tinieblas: (b, dt, S) => {
    // he sinks into the dark; only your light remains, and his tail finds you from the black
    const W = b.world, p = W.player;
    if (S.t === 0) { W.visionOverride = true; b.untargetable = true; b.sprite.setAlpha(0.15); S.k = 0; W.game.ui?.bark(b.x, b.z, 'Cierra los ojos, si quieres. Ya da igual.', 2); Events.emit('boss:roar', { boss: b }); }
    const k = Math.min(1, S.t / 0.8) * (S.t < 5.2 ? 1 : Math.max(0, 1 - (S.t - 5.2) / 0.6));
    SharedUniforms.uVision.value.set(p.x, p.z, 5.5, 0.92 * k);
    b.stop(0);
    if (S.t > 1 && S.k < 6 && S.t >= 1 + S.k * 0.65) { seal(b, p.x + p.vx * 0.25, p.z + p.vz * 0.25, true, { windup: 0.75, damage: 18, r: 1.3 }); S.k++; }
    if (S.t > 5.8) {
      SharedUniforms.uVision.value.w = 0;
      W.visionOverride = false;
      const pt = W.room.randomFloor({ int: (a, c) => a + Math.floor(Math.random() * (c - a + 1)) }, (x, z) => Math.hypot(x - p.x, z - p.z) > 5);
      if (pt) { b.x = pt.x; b.z = pt.z; }
      b.untargetable = false; b.sprite.setAlpha(1);
      W.fx.emit('shadow', b.x, 1.5, b.z, 30, { radius: 1.2 });
      return 'done';
    }
  },
  copias: (b, dt, S) => {
    if (S.t === 0) { b.play('roar'); }
    if (S.t > 0.6 && !S.f) {
      S.f = true;
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * 6.28;
        const c = b.world.controller?.spawnEnemy?.('gerionEco', b.x + Math.cos(a) * 5, b.z + Math.sin(a) * 3, { master: b, noSpawnFx: true });
        if (c) b.world.fx.emit('shadow', c.x, 1.5, c.z, 20);
      }
      b.world.game.ui?.bark(b.x, b.z, '¿Cuál de nosotros miente?', 1.8);
    }
    if (S.t > 1.2) return 'done';
  },
};

registerBoss({
  id: 'gerion', name: 'Gerión', title: 'Sozza imagine di froda', boss: true, circle: 'fraude',
  hp: 3800, speed: 2, radius: 1.7, mass: 50, mode: 'fly', blood: 'ichor', pivot: 2, shadow: 2.8,
  sheet: () => gerionSheet(), aura: 'shadow', auraY: 1.5,
  light: { color: 0x40e0c0, intensity: 1, radius: 6, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'shadow', deathPreset: 'shadow', deathEdge: 0x40e0c0, deathRamp: VENOM, pillarRamp: R.teal,
  onDeath(b) { SharedUniforms.uVision.value.w = 0; b.world.visionOverride = false; },
  idle(b) { const d = b.distToTarget(); if (d > 6) b.chase(0.8); else if (d < 3) b.steer(b.angleToTarget() + Math.PI, 0.6); else b.steer(b.angleToTarget() + Math.PI / 2, 0.5); b.play('move'); },
  patterns: {
    0: [
      { id: 'aguijon', weight: 3, cd: 3.4, run: P.aguijon },
      { id: 'garras', weight: 3, cd: 2, range: [0, 5], run: P.garras },
      { id: 'vuelo', weight: 2, cd: 4, range: [3, 16], run: P.vuelo },
    ],
    1: [
      { id: 'aguijon', weight: 3, cd: 3, run: P.aguijon },
      { id: 'garras', weight: 3, cd: 1.8, range: [0, 5], run: P.garras },
      { id: 'vuelo', weight: 2, cd: 3.4, range: [3, 16], run: P.vuelo },
      { id: 'tinieblas', weight: 2, cd: 12, run: P.tinieblas },
    ],
    2: [
      { id: 'copias', weight: 2, cd: 14, cond: (b) => !b.world.enemies.some((e) => e.type === 'gerionEco' && e.alive), run: P.copias },
      { id: 'aguijon', weight: 3, cd: 2.6, run: P.aguijon },
      { id: 'garras', weight: 3, cd: 1.6, range: [0, 5], run: P.garras },
      { id: 'vuelo', weight: 2, cd: 3, range: [3, 16], run: P.vuelo },
      { id: 'tinieblas', weight: 2, cd: 10, run: P.tinieblas },
    ],
  },
  intro: [
    ['virgilio', 'He aquí la bestia de la cola aguzada, la que atraviesa montes y rompe muros y armas: la que apesta al mundo entero.'],
    ['gerion', 'Bienvenido, hijo. Tienes cara de cansado. Sube a mi espalda: te bajaré con suavidad.', { name: 'Gerión', mood: 'smile' }],
    ['dante', (c) => (c.decided('ulises') === 'absolve' ? 'Ulises también hablaba bonito. Lo absolví. No voy a cometer dos veces el mismo error.' : 'Tu rostro es el de un hombre justo... y tu cola, la de un escorpión.')],
    ['virgilio', 'Fíjate en sus sellos: los violeta son mentira. Los rojos, no. El fraude siempre deja una costura.'],
  ],
  outro: [['virgilio', 'El fraude cae, pero no muere: sólo cambia de cara. Abajo nos espera el hielo.']],
});

registerEnemy({
  id: 'gerionEco', name: 'Reflejo de Gerión', circle: 'fraude', hp: 160, speed: 2.2, radius: 1.5, mode: 'fly', blood: 'ichor', pivot: 2, noSpawnFx: true,
  sheet: () => gerionSheet(), aura: 'shadow', auraY: 1.5,
  init(e, o) { e.master = o.master; e.ignoreForClear = true; e.noLoot = true; e.sprite.setAlpha(0.7); },
  think(e, dt) {
    if (!e.master || !e.master.alive) { e.alive = false; e.die({}); return; }
    if (e.cd('lie', 2.8)) { const p = e.target; for (let k = 0; k < 2; k++) seal(e, p.x + (Math.random() - 0.5) * 3, p.z + (Math.random() - 0.5) * 2.5, false); e.play('sting', { restart: true }); }
    const d = e.distToTarget();
    if (d > 6) e.chase(0.8); else e.steer(e.angleToTarget() + Math.PI / 2, 0.6);
    e.play('move');
  },
});
