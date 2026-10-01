// BOSS III · CERBERO, il gran vermo. Three heads, three verbs: BITE (left), BILE (middle), HOWL (right).
// Like Virgil throwing earth into his maws, punishing a head mid-windup chokes it and stuns the beast.
import { registerBoss } from '../boss.js';
import { cerberoSheet } from '../../art/bosses/cerbero.js';
import { biePuddle } from '../bestiary/gula.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const BILE = [0x24320e, 0x627a20, 0xb8d040, 0xe8f080];

function chokeCheck(b, S, threshold) {
  // damage dealt during the windup chokes the head
  const taken = S.hp0 - b.hp;
  if (taken >= threshold && !S.choked) {
    S.choked = true;
    b.play('stunL', { restart: true });
    b.hitstun = 2.2;
    b.world.fx.emit('dust', b.x + 2, 2, b.z, 20, { c0: 0x524024, c1: 0x261c10 });
    b.world.game.ui?.bark(b.x, b.z, '(se atraganta con la tierra)', 1.6);
    b.world.fx.screenFlash(0xffffff, 0.15, 0.1);
    Events.emit('boss:stun', { boss: b });
    return true;
  }
  return false;
}

const P = {
  mordisco: (b, dt, S) => {
    if (S.t === 0) { S.n = 0; S.hp0 = b.hp; S.next = 0; }
    const n = 2 + (b.phase >= 2 ? 1 : 0);
    if (S.n < n && S.t >= S.next) {
      b.faceTarget(); const a = b.angleToTarget(); S.a = a;
      b.play('windup', { restart: true });
      b.telegraph({ shape: 'cone', radius: 5, halfAngle: 0.45, angle: a, duration: 0.6 });
      b.after(0.6 * b.teleMul, () => {
        if (S.choked) return;
        b.play('bite', { restart: true });
        b.vx = Math.cos(a) * 12; b.vz = Math.sin(a) * 12;
        b.strike({ shape: 'arc', angle: a, range: 5, arc: 0.9, damage: 22, knockback: 10 });
        b.world.fx.emit('blood', b.x + Math.cos(a) * 3, 1.5, b.z + Math.sin(a) * 3, 10);
        b.world.fx.shake(0.3);
        Events.emit('boss:slam', { boss: b });
      });
      S.n++; S.next = S.t + 1.0 - b.phase * 0.12;
    }
    if (chokeCheck(b, S, 70)) return 'done';
    b.vx *= Math.exp(-5 * dt); b.vz *= Math.exp(-5 * dt);
    if (S.t > n * (1.0 - b.phase * 0.12) + 0.6) return 'done';
  },
  bilis: (b, dt, S) => {
    if (S.t === 0) { b.play('vomit'); S.hp0 = b.hp; S.k = 0; Events.emit('boss:windup', { boss: b }); }
    if (chokeCheck(b, S, 80)) return 'done';
    if (S.t > 0.7 && S.k < 10 && S.t >= 0.7 + S.k * 0.12) {
      const a = b.angleToTarget() + (S.k - 4.5) * 0.12;
      b.shoot({ angle: a, speed: 8, kind: 'orb', ramp: BILE, size: 10, damage: 10, life: 0.9 + Math.random() * 0.4, element: 'poison', trail: 'bile', status: { poison: { amount: 1, dur: 3 } },
        onExpire: (pr) => { if (S.k % 2 === 0) biePuddle(b.world, pr.x, pr.z, { r: 1.2, dur: 5 }); } });
      S.k++;
    }
    if (S.t > 2.2) return 'done';
  },
  aullido: (b, dt, S) => {
    if (S.t === 0) { b.play('howl'); b.telegraph({ shape: 'ring', radius: 7, inner: 2, duration: 0.8, follow: b, color: 0x3e5216, edge: 0xe8f080 }); Events.emit('boss:roar', { boss: b }); }
    if (S.t >= 0.8 * b.teleMul && !S.f) {
      S.f = true;
      b.strike({ shape: 'ring', radius: 7, inner: 2, damage: 16, knockback: 12, element: 'wind' });
      for (let w = 0; w < 2 + b.phase; w++) b.after(w * 0.35, () => b.ring(16, { angle: w * 0.2, speed: 5.5, kind: 'skull', ramp: [0x3a0408, 0x6a1010, 0xb8d040, 0xe8f080], size: 10, damage: 10, life: 2.6, trail: 'bile' }));
      b.world.fx.ring('dust', b.x, b.z, 2, 40, { speed: [6, 10] });
      b.world.fx.shake(0.5);
      if (b.phase >= 1 && b.world.enemies.filter((e) => e.alive).length < 4) for (let k = 0; k < 2; k++) b.world.controller?.spawnEnemy?.(k ? 'gloton' : 'cebado', b.x + (k ? 5 : -5), b.z + 2, {});
    }
    if (S.t > 1.6) return 'done';
  },
  zarpazo: (b, dt, S) => {
    if (S.t === 0) { b.play('windup', { restart: true }); b.telegraph({ shape: 'circle', radius: 3.6, duration: 0.75, follow: b }); }
    if (S.t >= 0.75 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      b.strike({ shape: 'circle', radius: 3.6, damage: 20, knockback: 13 });
      b.world.fx.ring('bile', b.x, b.z, 1.5, 24, { speed: [3, 6] });
      biePuddle(b.world, b.x, b.z, { r: 2.2, dur: 3 });
      b.world.fx.shake(0.45);
      Events.emit('boss:slam', { boss: b });
    }
    if (S.t > 1.4) return 'done';
  },
  embestida: (b, dt, S) => {
    if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('roar'); b.telegraph({ shape: 'rect', angle: S.a, length: 12, width: 3, duration: 0.85 }); S.hit = new Set(); }
    const go = 0.85 * b.teleMul;
    if (S.t >= go && S.t < go + 0.7) { b.play('move'); b.vx = Math.cos(S.a) * 15 / b.speedMul; b.vz = Math.sin(S.a) * 15 / b.speedMul; b.strike({ shape: 'circle', radius: 1.8, damage: 22, knockback: 14, hitSet: S.hit }); if (Math.random() < 0.6) b.world.fx.emit('bile', b.x, 0.3, b.z, 2); }
    else if (S.t >= go) b.stop(0.3);
    if (S.t > go + 1.1) return 'done';
  },
};

registerBoss({
  id: 'cerbero', name: 'Cerbero', title: 'Il gran vermo', boss: true, circle: 'gula',
  hp: 1700, speed: 2, radius: 1.9, mass: 40, blood: 'bile', pivot: 2, shadow: 3,
  sheet: () => cerberoSheet(), aura: 'poison', auraY: 1.5,
  light: { color: 0xb0c040, intensity: 1, radius: 6, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'bile', deathPreset: 'bile', deathEdge: 0xb8d040, deathRamp: BILE, pillarRamp: BILE,
  onPhase(b, ph) { b.speed *= 1.15; b.cdMul *= 0.85; },
  idle(b) {
    const d = b.distToTarget();
    if (d > 5) b.chase(0.9); else b.steer(b.angleToTarget() + Math.PI / 2, 0.5);
    b.play('move');
    b.faceTarget();
  },
  patterns: {
    0: [
      { id: 'mordisco', weight: 3, cd: 2.2, range: [0, 7], run: P.mordisco },
      { id: 'bilis', weight: 2, cd: 4, run: P.bilis },
      { id: 'aullido', weight: 1.5, cd: 6, run: P.aullido },
      { id: 'zarpazo', weight: 3, cd: 2.5, range: [0, 3.6], run: P.zarpazo },
    ],
    1: [
      { id: 'mordisco', weight: 3, cd: 2, range: [0, 7], run: P.mordisco },
      { id: 'bilis', weight: 2, cd: 3.5, run: P.bilis },
      { id: 'aullido', weight: 1.5, cd: 6, run: P.aullido },
      { id: 'zarpazo', weight: 3, cd: 2.2, range: [0, 3.6], run: P.zarpazo },
      { id: 'embestida', weight: 2, cd: 4, range: [4, 14], run: P.embestida },
    ],
    2: [
      { id: 'mordisco', weight: 3, cd: 1.6, range: [0, 7], run: P.mordisco },
      { id: 'bilis', weight: 2.5, cd: 3, run: P.bilis },
      { id: 'aullido', weight: 2, cd: 5, run: P.aullido },
      { id: 'embestida', weight: 2.5, cd: 3, range: [4, 14], run: P.embestida },
      { id: 'zarpazo', weight: 3, cd: 1.8, range: [0, 3.6], run: P.zarpazo },
    ],
  },
  intro: [
    ['virgilio', 'Cerbero, fiera cruel y diversa, ladra con tres gargantas sobre los que yacen aquí sumergidos.'],
    ['dante', 'Tiene... hambre.'],
    ['virgilio', 'Siempre. Cuando abra las fauces, golpéalo dentro: llénale la boca de tierra, como hice yo.'],
    ['virgilio', (c) => (c.tier <= -1 ? 'Te huele, Dante. Huele lo que has devorado tú también.' : 'No dejes que la lluvia te pese en los hombros. Avanza.')],
  ],
  outro: [['virgilio', 'Tres bocas y ninguna saciada. Así es el pecado que castiga: nunca termina de comer.']],
});
