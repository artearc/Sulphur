// BOSS I · MINOS, el Juez. Guards the threshold of the second circle.
// Readable verbs: the TAIL sentences you (line slams), the LEDGER summons judgment (ground sigils),
// the CROWN screams (radial souls). Each phase adds one coil — and one more sentence per volley.
import { registerBoss } from '../boss.js';
import { minosSheet } from '../../art/bosses/minos.js';
import { angleTo } from '../../core/math.js';
import { pillarSheet } from '../../art/fx.js';
import { Events } from '../../core/events.js';

const WISP = [0x241a30, 0x5c4678, 0xb0a0e0, 0xffffff];
const PURPLE = [0x241a30, 0x5c4678, 0xb0a0e0, 0xf0e8ff];

function sentencia(b, dt, S) {
  // tail slams along a line toward the player; number of slams = coils
  const coils = 1 + b.phase + (b.phase >= 2 ? 1 : 0);
  if (S.t === 0) { S.n = 0; S.phase = 'aim'; S.pt = 0; }
  S.pt += dt;
  if (S.phase === 'aim') {
    b.play('windup', { restart: true });
    S.angle = angleTo(b.x, b.z, b.target.x, b.target.z);
    b.faceAngle(S.angle);
    S.len = Math.min(13, b.world.room.raycast(b.x, b.z, S.angle, 14) + 0.5);
    S.tele = b.telegraph({ shape: 'rect', x: b.x, z: b.z, angle: S.angle, length: S.len, width: 1.9, duration: S.n === 0 ? 0.85 : 0.55 });
    S.phase = 'wind'; S.pt = 0;
    Events.emit('boss:windup', { boss: b });
  } else if (S.phase === 'wind' && S.pt >= (S.n === 0 ? 0.85 : 0.55) * b.teleMul) {
    b.play('attack', { restart: true });
    b.strike({ shape: 'line', x: b.x, z: b.z, angle: S.angle, length: S.len, width: 1.9, damage: 18, knockback: 9 });
    const ex = b.x + Math.cos(S.angle) * S.len, ez = b.z + Math.sin(S.angle) * S.len;
    const fx = b.world.fx;
    fx.line('dust', b.x, b.z, ex, ez, 22, { y: 0.2 });
    fx.line('spark', b.x, b.z, ex, ez, 10, { y: 0.4, c0: 0xd0c0ff, c1: 0x342648 });
    fx.decal('crack', ex, ez, 1.4, { alpha: 0.9 });
    fx.shake(0.4);
    fx.lightFlash(ex, ez, 0xb0a0e0, 2.5, 6, 0.25);
    // shockwave of souls from the impact
    for (let k = 0; k < 5 + b.phase; k++) {
      const a = S.angle + Math.PI + (k / (4 + b.phase) - 0.5) * 2.2;
      b.shoot({ x: ex, z: ez, angle: a, speed: 5.5, kind: 'wisp', ramp: WISP, size: 10, damage: 9, life: 2.2, trail: 'soul', element: 'ice' });
    }
    Events.emit('boss:slam', { boss: b });
    S.n++; S.phase = S.n >= coils ? 'rec' : 'aim'; S.pt = 0;
  } else if (S.phase === 'rec' && S.pt > 0.7) return 'done';
}

function almas(b, dt, S) {
  // the crown screams: spiral of tormented souls
  if (S.t === 0) { b.play('roar', { restart: true }); b.sprite.flash(0xd0c0ff, 0.4); S.w = 0; S.next = 0.6; Events.emit('boss:roar', { boss: b }); }
  if (S.t >= S.next && S.w < 3 + b.phase) {
    const n = 12 + b.phase * 2;
    const off = S.w * 0.22;
    for (let k = 0; k < n; k++) b.shoot({ angle: off + (k / n) * Math.PI * 2, speed: 4.2, curve: S.w % 2 ? 0.5 : -0.5, kind: 'wisp', ramp: WISP, size: 10, damage: 9, life: 4, trail: 'soul', element: 'ice' });
    b.world.fx.ring('soul', b.x, b.z, 1.2, 18);
    S.w++; S.next = S.t + 0.55;
  }
  if (S.w >= 3 + b.phase && S.t > S.next + 0.4) { b.play('idle'); return 'done'; }
}

function juicio(b, dt, S) {
  // the ledger: judgment sigils open under the player and erupt
  if (S.t === 0) { b.play('point', { restart: true }); S.k = 0; S.next = 0.2; S.marks = []; }
  const count = 3 + b.phase * 2;
  if (S.k < count && S.t >= S.next) {
    const p = b.target;
    const lead = 0.5;
    const x = p.x + p.vx * lead * 0.3, z = p.z + p.vz * lead * 0.3;
    const tele = b.telegraph({ shape: 'circle', x, z, radius: 1.5, duration: 0.95, color: 0x5c4678, edge: 0xd0c0ff });
    S.marks.push({ x, z, at: S.t + 0.95 * b.teleMul, done: false });
    S.k++; S.next = S.t + 0.32 - b.phase * 0.04;
  }
  for (const m of S.marks) {
    if (!m.done && S.t >= m.at) {
      m.done = true;
      b.strike({ shape: 'circle', x: m.x, z: m.z, radius: 1.5, damage: 16, knockback: 6, element: 'holy' });
      b.world.fx.play(pillarSheet('judgment', PURPLE, 24, 80), { x: m.x, y: 0, z: m.z + 0.05, pivot: 0 });
      b.world.fx.emit('soul', m.x, 0.5, m.z, 14, { radius: 0.8 });
      b.world.fx.shake(0.15);
      Events.emit('boss:sigil', {});
    }
  }
  if (S.k >= count && S.marks.every((m) => m.done) && S.t > S.next + 0.5) { b.play('idle'); return 'done'; }
}

function repulsa(b, dt, S) {
  if (S.t === 0) { b.play('windup', { restart: true }); S.tele = b.telegraph({ shape: 'circle', radius: 3.3, duration: 0.6, follow: b }); }
  if (S.t >= 0.6 * b.teleMul && !S.hit) {
    S.hit = true;
    b.play('attack', { restart: true });
    b.strike({ shape: 'circle', radius: 3.3, damage: 14, knockback: 13 });
    b.world.fx.ring('dust', b.x, b.z, 1.5, 30, { speed: [6, 9] });
    b.world.fx.shake(0.35);
  }
  if (S.t > 1.1) return 'done';
}

function citacion(b, dt, S) {
  if (S.t === 0) { b.play('roar', { restart: true }); }
  if (S.t > 0.5 && !S.sp) {
    S.sp = true;
    const W = b.world;
    for (let k = 0; k < 2; k++) {
      const a = Math.random() * Math.PI * 2;
      W.controller?.spawnEnemy?.(k === 0 ? 'sombra' : 'lamento', b.x + Math.cos(a) * 4, b.z + Math.sin(a) * 3, {});
    }
  }
  if (S.t > 1.2) return 'done';
}

function condena(b, dt, S) {
  // final phase: five sentences fan out and rotate before falling
  if (S.t === 0) {
    b.play('raise', {}); b.play('windup', { restart: true });
    S.base = angleTo(b.x, b.z, b.target.x, b.target.z);
    S.lines = [];
    for (let k = 0; k < 5; k++) {
      const a = S.base + (k - 2) * 0.55;
      S.lines.push({ a, tele: b.telegraph({ shape: 'rect', x: b.x, z: b.z, angle: a, length: 12, width: 1.3, duration: 1.1 }) });
    }
  }
  if (S.t >= 1.1 * b.teleMul && !S.hit) {
    S.hit = true;
    b.play('attack', { restart: true });
    for (const l of S.lines) {
      b.strike({ shape: 'line', x: b.x, z: b.z, angle: l.a, length: 12, width: 1.3, damage: 16, knockback: 8 });
      b.world.fx.line('spark', b.x, b.z, b.x + Math.cos(l.a) * 12, b.z + Math.sin(l.a) * 12, 10, { y: 0.4, c0: 0xd0c0ff, c1: 0x342648 });
    }
    b.world.fx.shake(0.5);
  }
  if (S.t > 1.8) return 'done';
}

registerBoss({
  id: 'minos', name: 'Minos', title: 'El Juez del Umbral', boss: true, circle: 'limbo',
  hp: 900, speed: 1.6, radius: 1.3, mass: 20, blood: 'ichor', pivot: 2, shadow: 2.2,
  sheet: () => minosSheet(), aura: 'soul', auraY: 2,
  light: { color: 0xb0a0e0, intensity: 1.2, radius: 6, y: 3 },
  phases: [0.6, 0.3], phaseFx: 'soul',
  deathRamp: [0x241a30, 0x5c4678, 0xb0a0e0, 0xf0e8ff], deathPreset: 'soul', deathEdge: 0xd0c0ff, pillarRamp: PURPLE,
  idle(b, dt) {
    const d = b.distToTarget();
    if (d > 6) b.chase(0.8); else if (d < 3.5) b.steer(b.angleToTarget() + Math.PI, 0.6); else b.stop(0.5);
    b.play(Math.hypot(b.vx, b.vz) > 0.3 ? 'move' : 'idle');
    if (Math.abs(Math.cos(b.angleToTarget())) > 0.3) b.faceAngle(b.angleToTarget());
  },
  patterns: {
    0: [
      { id: 'sentencia', weight: 3, cd: 2.5, run: sentencia },
      { id: 'almas', weight: 2, cd: 5, run: almas },
      { id: 'juicio', weight: 2, cd: 4, run: juicio },
      { id: 'repulsa', weight: 4, cd: 3, range: [0, 2.8], run: repulsa },
    ],
    1: [
      { id: 'sentencia', weight: 3, cd: 2.2, run: sentencia },
      { id: 'almas', weight: 2, cd: 4.5, run: almas },
      { id: 'juicio', weight: 2, cd: 3.5, run: juicio },
      { id: 'citacion', weight: 1.5, cd: 12, run: citacion, cond: (b) => b.world.enemies.filter((e) => e.alive).length < 3 },
      { id: 'repulsa', weight: 4, cd: 3, range: [0, 2.8], run: repulsa },
    ],
    2: [
      { id: 'sentencia', weight: 2, cd: 2, run: sentencia },
      { id: 'condena', weight: 3, cd: 4, run: condena },
      { id: 'almas', weight: 2, cd: 4, run: almas },
      { id: 'juicio', weight: 2, cd: 3, run: juicio },
      { id: 'repulsa', weight: 4, cd: 2.5, range: [0, 2.8], run: repulsa },
    ],
  },
  intro: [
    ['minos', '"O tu che vieni al doloroso ospizio..."', { mood: 'angry' }],
    ['minos', 'Tú, que vienes a la morada del dolor: mira cómo entras y de quién te fías.'],
    ['virgilio', 'No le estorbes el paso, Minos. Así se quiere allí donde se puede lo que se quiere.'],
    ['minos', (c) => (c.tier >= 1 ? 'Huele a incienso. Los que rezan tanto suelen tener más que esconder.' : c.tier <= -1 ? 'Ya llevas mi sentencia escrita en la piel, peregrino. Sólo vengo a leerla.' : 'Todo el que cruza confiesa. Todo el que confiesa, es juzgado.')],
    ['minos', 'Mi cola dirá cuántos círculos te esperan. ¡Desciende... o arrodíllate!', { mood: 'shout' }],
  ],
});
