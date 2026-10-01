// The Accusing Specter (GDD 4.2): appears once Dante has condemned enough souls in a descent.
// It speaks the names of the condemned and fights with their chains.
import { registerBoss } from '../boss.js';
import { soulSheet } from '../../art/characters.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const CRIMSON = R.crimson;

registerBoss({
  id: 'acusador', name: 'Espectro Acusador', title: 'El que lleva la cuenta', miniboss: true, showBar: true, circle: 'any',
  hp: 420, speed: 2.6, radius: 0.6, mass: 6, mode: 'fly', blood: 'ichor', pivot: 1, scale: 1.6,
  sheet: () => soulSheet({ robe: R.danteRobeSin, hood: R.danteRobeSin, skin: R.skinPale, eyesGlow: 0xff2020, glow: 0xc0102a, headwear: 'hood' }), aura: 'corruptGlow', auraY: 1.2,
  light: { color: 0xc0102a, intensity: 1, radius: 5, y: 2 },
  phases: [0.5], phaseFx: 'corruptGlow', deathPreset: 'corruptGlow', deathEdge: 0xf05060, deathRamp: CRIMSON, pillarRamp: CRIMSON,
  init(b) {
    const run = b.world.game.run;
    const extra = (run?.moral.condemned || 3) * 60;
    b.maxHp = b.hp = Math.round(b.maxHp + extra);
    b.play('idle_down');
  },
  idle(b) { const d = b.distToTarget(); if (d > 5) b.chase(0.9); else b.steer(b.angleToTarget() + Math.PI / 2, 0.6); b.play('idle_down'); },
  patterns: {
    0: [
      { id: 'cadenas', weight: 3, cd: 2.4, run: (b, dt, S) => {
        if (S.t === 0) { S.a = b.angleToTarget(); b.play('cast_down', { restart: true }); b.telegraph({ shape: 'rect', angle: S.a, length: 8, width: 1, duration: 0.65 }); }
        if (S.t >= 0.65 * b.teleMul && !S.f) {
          S.f = true;
          const n = b.strike({ shape: 'line', angle: S.a, length: 8, width: 1, damage: 16, knockback: -8, knockAngle: S.a, element: 'corrupt' });
          b.world.fx.line('spark', b.x, b.z, b.x + Math.cos(S.a) * 8, b.z + Math.sin(S.a) * 8, 10, { y: 0.9, c0: 0xd2d8e4, c1: 0x3a3e4a });
          if (n) b.world.game.ui?.bark(b.x, b.z, '¡Culpable!', 1);
        }
        if (S.t > 1.1) return 'done';
      } },
      { id: 'sentencias', weight: 2, cd: 3.5, run: (b, dt, S) => {
        if (S.t === 0) { b.play('cast_down', { restart: true }); S.k = 0; }
        if (S.k < 4 && S.t >= 0.2 + S.k * 0.35) {
          const p = b.target, x = p.x, z = p.z;
          b.telegraph({ shape: 'circle', x, z, radius: 1.3, duration: 0.8, color: 0x3a0408, edge: 0xff4050 });
          b.after(0.8 * b.teleMul, () => { b.strike({ shape: 'circle', x, z, radius: 1.3, damage: 15, knockback: 5, element: 'corrupt' }); b.world.fx.decal('brand', x, z, 1.2, { unlit: true, fade: 2, color: 0xff3040 }); b.world.fx.emit('corruptGlow', x, 0.5, z, 12); });
          S.k++;
        }
        if (S.t > 2.4) return 'done';
      } },
      { id: 'condenados', weight: 2, cd: 4, run: (b, dt, S) => {
        if (S.t === 0) { b.play('cast_down', { restart: true }); Events.emit('boss:roar', { boss: b }); }
        if (S.t > 0.5 && !S.f) {
          S.f = true;
          const n = 6 + (b.world.game.run?.moral.condemned || 3) * 2;
          b.ring(Math.min(20, n), { speed: 4.5, kind: 'skull', ramp: [0x200008, 0x6a0a18, 0xc8243a, 0xffb0b0], size: 10, damage: 10, life: 3, trail: 'corruptGlow', element: 'corrupt' });
        }
        if (S.t > 1.2) return 'done';
      } },
    ],
  },
});
