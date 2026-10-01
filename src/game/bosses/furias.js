// BOSS V · LAS TRES FURIAS on the walls of Dis. Three sisters, three verbs:
//   Alecto (right) — relentless fire claws · Megera (left) — envious hydra venom · Tisífone (center) — vengeance mark.
// At the end they scream for Medusa: the gaze that petrifies whoever looks.
import { registerBoss } from '../boss.js';
import { furiasSheet } from '../../art/bosses/furias.js';
import { gazeStep } from './gaze.js';
import { GroundHazard } from '../hazards.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const HYDRA = [0x0a1a0e, 0x244a30, 0x4a8a5a, 0xb0f0a0];
const BLOOD = R.blood;
const OFFS = { megera: -1.5, tisifone: 0, alecto: 1.5 };

const P = {
  alecto: (b, dt, S) => {
    // Alecto lunges with burning claws, three times
    if (S.t === 0) { S.n = 0; S.next = 0; }
    if (S.n < 3 && S.t >= S.next) {
      b.faceTarget(); const a = b.angleToTarget(); const len = Math.min(9, b.distToTarget() + 1.5);
      b.play('windup', { restart: true });
      b.telegraph({ shape: 'rect', angle: a, length: len, width: 1.8, duration: 0.5, color: 0x5a1000, edge: 0xffa040 });
      S.hit = new Set();
      b.after(0.5 * b.teleMul, () => { b.play('claw', { restart: true }); b.vx = Math.cos(a) * len / 0.3; b.vz = Math.sin(a) * len / 0.3; S.dash = 0.3; });
      S.n++; S.next = S.t + 1.0;
    }
    if (S.dash > 0) {
      S.dash -= dt;
      b.strike({ shape: 'circle', radius: 1.6, damage: 19, knockback: 9, element: 'fire', status: { burn: { amount: 1, dur: 3 } }, hitSet: S.hit });
      b.world.fx.emit('fire', b.x, 1, b.z, 3, { radius: 0.6 });
      if (S.dash <= 0) b.stop(0.1);
    }
    if (S.t > 3.3) return 'done';
  },
  megera: (b, dt, S) => {
    // Megera spits hydra venom in sweeping fans; it pools and festers
    if (S.t === 0) { b.play('spit'); S.k = 0; S.a0 = b.angleToTarget() - 0.9; Events.emit('boss:windup', { boss: b }); }
    if (S.t > 0.5 && S.k < 14 && S.t >= 0.5 + S.k * 0.09) {
      const a = S.a0 + S.k * 0.13;
      b.shoot({ x: b.x + OFFS.megera, z: b.z, angle: a, speed: 8.5, kind: 'bolt', ramp: HYDRA, size: 14, damage: 11, life: 1.6, element: 'poison', trail: 'poison', status: { poison: { amount: 1, dur: 3 } },
        onExpire: (pr) => { if (S.k % 3 === 0) b.world.addHazard(new GroundHazard(b.world, pr.x, pr.z, { r: 1, dur: 4, damage: 3, element: 'poison', status: { poison: { amount: 1, dur: 2 } }, decal: 'bile', preset: 'poison' })); } });
      S.k++;
    }
    if (S.t > 2) return 'done';
  },
  tisifone: (b, dt, S) => {
    // Tisífone marks Dante: blood rains where he stood, and while marked, wounds bleed deeper
    if (S.t === 0) { b.play('mark'); b.world.game.ui?.bark(b.x, b.z, 'Tisífone: «Tu sangre recuerda lo que hiciste.»', 2); S.k = 0; }
    const p = b.target;
    if (S.t > 0.4 && S.k < 5 && S.t >= 0.4 + S.k * 0.4) {
      const x = p.x, z = p.z;
      b.telegraph({ shape: 'circle', x, z, radius: 1.4, duration: 0.7, color: 0x3a0408, edge: 0xff5060 });
      b.after(0.7 * b.teleMul, () => {
        b.strike({ shape: 'circle', x, z, radius: 1.4, damage: 15, knockback: 4, status: { curse: { amount: 1, dur: 4 } } });
        b.world.fx.emit('blood', x, 3, z, 18, { speed: [0.5, 2] });
        b.world.fx.decal('blood' + ((Math.random() * 4) | 0), x, z, 1.2);
      });
      S.k++;
    }
    if (S.t > 2.8) return 'done';
  },
  coro: (b, dt, S) => {
    // the three scream together: a shockwave and a ring of fire from the wall's base
    if (S.t === 0) { b.play('roar'); b.telegraph({ shape: 'circle', radius: 4, duration: 0.8, follow: b }); Events.emit('boss:roar', { boss: b }); }
    if (S.t >= 0.8 * b.teleMul && !S.f) {
      S.f = true;
      b.strike({ shape: 'circle', radius: 4, damage: 18, knockback: 14, element: 'fire' });
      b.ring(18, { speed: 6, kind: 'orb', ramp: R.ember.slice(1), size: 9, damage: 10, life: 2.4, element: 'fire', trail: 'fire' });
      b.world.fx.shake(0.5);
    }
    if (S.t > 1.5) return 'done';
  },
  medusa: (b, dt, S) => {
    if (S.t === 0) { b.play('roar'); b.world.game.ui?.bark(b.x, b.z, '«¡Venga Medusa! ¡Así lo haremos de piedra!»', 2.2); }
    if (S.t > 0.8) { if (gazeStep(b, S, dt, { windup: 1.8, damage: 24, x: b.x, z: b.z - 0.5 })) return 'done'; }
  },
};

registerBoss({
  id: 'furias', name: 'Las Tres Furias', title: 'Alecto · Megera · Tisífone', boss: true, circle: 'ira',
  hp: 2500, speed: 2.2, radius: 2.4, mass: 60, mode: 'fly', blood: 'blood', pivot: 2, shadow: 3.4,
  sheet: () => furiasSheet(), aura: 'ember', auraY: 2,
  light: { color: 0xff5020, intensity: 1.3, radius: 7, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'fire', deathPreset: 'blood', deathEdge: 0xff5060, deathRamp: BLOOD, pillarRamp: R.ember,
  idle(b) {
    const d = b.distToTarget();
    if (d > 6) b.chase(0.8); else if (d < 3.5) b.steer(b.angleToTarget() + Math.PI, 0.6); else b.steer(b.angleToTarget() + Math.PI / 2, 0.5);
    b.play('move');
  },
  patterns: {
    0: [
      { id: 'alecto', weight: 3, cd: 3, run: P.alecto },
      { id: 'megera', weight: 2.5, cd: 3.5, run: P.megera },
      { id: 'tisifone', weight: 2, cd: 5, run: P.tisifone },
    ],
    1: [
      { id: 'alecto', weight: 3, cd: 2.6, run: P.alecto },
      { id: 'megera', weight: 2.5, cd: 3, run: P.megera },
      { id: 'tisifone', weight: 2, cd: 4.5, run: P.tisifone },
      { id: 'coro', weight: 2, cd: 4, range: [0, 5], run: P.coro },
    ],
    2: [
      { id: 'medusa', weight: 2, cd: 9, run: P.medusa },
      { id: 'alecto', weight: 3, cd: 2.2, run: P.alecto },
      { id: 'megera', weight: 2.5, cd: 2.6, run: P.megera },
      { id: 'tisifone', weight: 2, cd: 4, run: P.tisifone },
      { id: 'coro', weight: 2, cd: 3.5, range: [0, 5], run: P.coro },
    ],
  },
  onPhase(b, ph) { if (ph === 2) { b.current = { id: 'medusa', run: P.medusa, cd: 9, S: { t: 0 } }; } },
  intro: [
    ['virgilio', 'Mira: las feroces Erinias. Ésta es Megera, a la izquierda; la que llora a la derecha es Alecto; Tisífone está en medio.'],
    ['furias', '¡Venga Medusa! ¡Así lo haremos de piedra! Mal hicimos en no vengar el asalto de Teseo.', { name: 'Las Furias', mood: 'shout' }],
    ['dante', (c) => (c.tier <= -1 ? 'Gritad cuanto queráis. Ya no me asusta la sangre.' : 'Maestro... ¿qué hago si viene la Gorgona?')],
    ['virgilio', 'Vuélvete atrás y ten los ojos cerrados: si apareciera la Gorgona y la vieras, no habría modo de volver arriba.'],
  ],
  outro: [['virgilio', 'Las puertas de Dite ya no tienen quien las guarde. Más abajo arden los que negaron el alma.']],
});
