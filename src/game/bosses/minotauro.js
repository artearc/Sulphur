// BOSS VII · EL MINOTAURO — "qual è quel toro che si slaccia in quella c'ha ricevuto già 'l colpo mortale".
// Charges that ricochet off the walls (he stuns himself: punish him), axe sweeps, blood fissures,
// and a berserk phase where he bites himself and grows faster.
import { registerBoss } from '../boss.js';
import { minotauroSheet } from '../../art/bosses/minotauro.js';
import { LineHazard } from '../hazards.js';
import { bloodPool } from '../bestiary/violencia.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const BLOOD = R.blood;

const P = {
  embestida: (b, dt, S) => {
    // multi-charge: ricochets up to N walls; hitting a wall at the end leaves him stunned
    const charges = 1 + b.phase;
    if (S.t === 0) { S.n = 0; S.state = 'aim'; S.st = 0; }
    S.st += dt;
    if (S.state === 'aim') {
      b.faceTarget(); S.a = b.angleToTarget();
      b.play('gore', { restart: true });
      b.telegraph({ shape: 'rect', angle: S.a, length: 14, width: 2.6, duration: 0.75 });
      Events.emit('boss:windup', { boss: b });
      S.state = 'wind'; S.st = 0; S.hit = new Set();
      b.onWall = () => { if (S.state === 'run') { S.wall = true; } };
    } else if (S.state === 'wind') {
      b.stop(0);
      if (S.st > 0.75 * b.teleMul) { S.state = 'run'; S.st = 0; S.wall = false; }
    } else if (S.state === 'run') {
      b.play('charge');
      b.vx = Math.cos(S.a) * 17 / b.speedMul; b.vz = Math.sin(S.a) * 17 / b.speedMul;
      b.strike({ shape: 'circle', radius: 1.8, damage: 26, knockback: 16, hitSet: S.hit, knockAngle: S.a });
      if (Math.random() < 0.7) b.world.fx.emit('dust', b.x, 0.3, b.z, 2, { c0: 0x7a321c, c1: 0x2e0e0a });
      if (S.wall || S.st > 1.2) {
        b.world.fx.shake(0.6); b.world.fx.emit('dust', b.x, 1, b.z, 30, { speed: [3, 7] });
        Events.emit('boss:slam', { boss: b });
        S.n++;
        if (S.n >= charges || !S.wall) {
          b.stop(0);
          if (S.wall) { b.play('stun'); b.hitstun = 1.8; b.world.game.ui?.bark(b.x, b.z, '(aturdido)', 1.2); }
          b.onWall = null;
          return 'done';
        }
        // ricochet toward Dante again after a short beat
        S.state = 'aim'; S.st = 0;
      }
    }
  },
  hachazo: (b, dt, S) => {
    if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 5.2, halfAngle: 1.2, angle: S.a, duration: 0.75 }); }
    if (S.t >= 0.75 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      b.strike({ shape: 'arc', angle: S.a, range: 5.2, arc: 2.4, damage: 28, knockback: 13 });
      for (let k = 0; k < 16; k++) b.world.fx.emit('spark', b.x + Math.cos(S.a + (k / 15 - 0.5) * 2.4) * 4, 1, b.z + Math.sin(S.a + (k / 15 - 0.5) * 2.4) * 4, 1);
      b.world.fx.shake(0.4);
      Events.emit('boss:slam', { boss: b });
    }
    if (S.t > 1.3) return 'done';
  },
  grieta: (b, dt, S) => {
    // the axe splits the ground: lines of boiling blood open toward Dante
    if (S.t === 0) { b.play('windup', { restart: true }); S.a = b.angleToTarget(); S.lines = [[0], [-0.35, 0.35], [-0.45, 0, 0.45]][Math.min(2, b.phase)]; for (const o of S.lines) b.telegraph({ shape: 'rect', angle: S.a + o, length: 11, width: 1.1, duration: 0.85 }); }
    if (S.t >= 0.85 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      for (const o of S.lines) {
        const a = S.a + o;
        const x1 = b.x + Math.cos(a) * 11, z1 = b.z + Math.sin(a) * 11;
        b.strike({ shape: 'line', angle: a, length: 11, width: 1.1, damage: 20, knockback: 8 });
        b.world.addHazard(new LineHazard(b.world, b.x, b.z, x1, z1, { w: 1, dur: 4, damage: 7, element: 'physical', decal: 'blood0', preset: 'bloodMist', status: { slow: { amount: 1, dur: 0.6 } } }));
      }
      b.world.fx.shake(0.5);
    }
    if (S.t > 1.4) return 'done';
  },
  pisoton: (b, dt, S) => {
    if (S.t === 0) { b.play('windup', { restart: true }); b.telegraph({ shape: 'circle', radius: 4, duration: 0.7, follow: b }); }
    if (S.t >= 0.7 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      b.strike({ shape: 'circle', radius: 4, damage: 22, knockback: 15 });
      b.world.fx.ring('dust', b.x, b.z, 2, 30, { speed: [5, 9] });
      bloodPool(b.world, b.x, b.z, { r: 2.5, dur: 3 });
      b.world.fx.shake(0.5);
    }
    if (S.t > 1.2) return 'done';
  },
  furor: (b, dt, S) => {
    // berserk: he bites his own arm and the blood makes him faster
    if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); b.world.game.ui?.bark(b.x, b.z, '(se muerde a sí mismo, rugiendo)', 1.8); }
    if (S.t > 0.8 && !S.f) { S.f = true; b.speed *= 1.12; b.cdMul *= 0.9; b.world.fx.emit('blood', b.x, 2, b.z, 30); b.hp = Math.max(1, b.hp - 40); }
    if (S.t > 1.4) return 'done';
  },
};

registerBoss({
  id: 'minotauro', name: 'El Minotauro', title: "L'infamia di Creti", boss: true, circle: 'violencia',
  hp: 3300, speed: 2.4, radius: 1.6, mass: 60, blood: 'blood', pivot: 2, shadow: 2.6,
  sheet: () => minotauroSheet(), aura: 'bloodMist', auraY: 1.5,
  light: { color: 0xff4030, intensity: 1, radius: 6, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'bloodMist', deathPreset: 'blood', deathEdge: 0xff6040, deathRamp: BLOOD, pillarRamp: BLOOD,
  idle(b) { const d = b.distToTarget(); if (d > 4) b.chase(1); else b.steer(b.angleToTarget() + Math.PI / 2, 0.5); b.play('move'); },
  patterns: {
    0: [
      { id: 'embestida', weight: 3, cd: 3, range: [3, 16], run: P.embestida },
      { id: 'hachazo', weight: 3, cd: 2, range: [0, 5.5], run: P.hachazo },
      { id: 'grieta', weight: 2, cd: 4, run: P.grieta },
      { id: 'pisoton', weight: 2, cd: 3, range: [0, 4], run: P.pisoton },
    ],
    1: [
      { id: 'embestida', weight: 3, cd: 2.6, range: [3, 16], run: P.embestida },
      { id: 'hachazo', weight: 3, cd: 1.8, range: [0, 5.5], run: P.hachazo },
      { id: 'grieta', weight: 2.5, cd: 3.4, run: P.grieta },
      { id: 'pisoton', weight: 2, cd: 2.6, range: [0, 4], run: P.pisoton },
    ],
    2: [
      { id: 'furor', weight: 1.5, cd: 10, run: P.furor },
      { id: 'embestida', weight: 3.5, cd: 2.2, range: [3, 16], run: P.embestida },
      { id: 'hachazo', weight: 3, cd: 1.5, range: [0, 5.5], run: P.hachazo },
      { id: 'grieta', weight: 2.5, cd: 3, run: P.grieta },
      { id: 'pisoton', weight: 2, cd: 2.2, range: [0, 4], run: P.pisoton },
    ],
  },
  intro: [
    ['virgilio', 'Ahí está la infamia de Creta, concebida en la falsa vaca. Al vernos se muerde a sí mismo, como quien la ira consume por dentro.'],
    ['virgilio', '¿Crees acaso que aquí viene el duque de Atenas, que en el mundo te dio muerte? ¡Apártate, bestia!'],
    ['dante', (c) => (c.tier <= -1 ? 'Entiendo su rabia. Demasiado bien.' : 'Su furia es ciega. Esa será su tumba.')],
    ['virgilio', 'Cuando cargue, apártate. Si choca con la piedra, quedará aturdido: ése es tu momento.'],
  ],
  outro: [['virgilio', 'Ningún laberinto le hizo falta: su prisión era la ira. Sigamos por la orilla del río de sangre.']],
});
