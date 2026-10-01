// BOSS IX · LUCIFER, lo 'mperador del doloroso regno. He does not move: the arena moves around him.
//   I   · El viento de las alas — freezing gales, shard fans, traitors rising from the lake, claw slams.
//   II  · Las tres bocas — red: corruption beam; yellow: ice lances; black: the void that drinks you.
//         Wound a face while it acts and it chokes.
//   III · La corrupción — the ice cracks; corruption floods the lake; your own sins return as shadows.
import { registerBoss } from '../boss.js';
import { registerEnemy, B } from '../enemy.js';
import { luciferSheet } from '../../art/bosses/lucifer.js';
import { danteSheet } from '../../art/characters.js';
import { GroundHazard } from '../hazards.js';
import { angleTo, dist, angleDiff } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { R } from '../../art/palette.js';

const SHARD = [0x16304e, 0x4a84a8, 0xc8ecf8, 0xffffff];
const CORR = [0x050208, 0x200008, 0x6a0a18, 0xc8243a, 0xf05060];
const VOIDR = [0x0a0410, 0x1e0a2a, 0x5c2478, 0xc080ff];
const FREEZE = { freeze: { amount: 0.4, dur: 1.4 } };

function faceGuard(b, S, label) {
  if (S.hp0 === undefined) S.hp0 = b.hp;
  if (S.hp0 - b.hp > 160 && !S.choked) {
    S.choked = true;
    b.hitstun = 2.2;
    b.play('hurt');
    b.world.game.ui?.bark(b.x, b.z, `(la boca ${label} se atraganta)`, 1.6);
    b.world.fx.screenFlash(0xffffff, 0.2, 0.12);
    Events.emit('boss:stun', { boss: b });
    return true;
  }
  return false;
}

function corruptionField(b, x, z, r = 2.4) {
  b.telegraph({ shape: 'circle', x, z, radius: r, duration: 1, color: 0x200008, edge: 0xf05060 });
  b.after(1 * b.teleMul, () => b.world.addHazard(new GroundHazard(b.world, x, z, { r, dur: 7, tick: 0.45, damage: 6, element: 'corrupt', decal: 'brand', unlit: true, color: 0xc0102a, glow: 1, preset: 'corruptGlow', slow: true, light: 0xc0102a })));
}

const P = {
  aleteo: (b, dt, S) => {
    const W = b.world, p = W.player;
    if (S.t === 0) { b.play('windup', { restart: true }); W.game.ui?.bark(b.x, b.z, '(seis alas se alzan)', 1.2); Events.emit('boss:windup', { boss: b }); S.f = 0; }
    const go = 0.9 * b.teleMul;
    if (S.t < go) { if (Math.random() < 0.7) W.fx.emit('frost', p.x + (Math.random() - 0.5) * 10, 3, p.z + (Math.random() - 0.5) * 6, 1); return; }
    if (S.t < go + 2.6) {
      b.play('beat');
      const a = angleTo(b.x, b.z, p.x, p.z);
      if (!p.dashing && !p.windImmune) { p.kx += Math.cos(a) * 9 * dt; p.kz += Math.sin(a) * 9 * dt; p.applyStatus('freeze', 0.25 * dt, 1.2); }
      for (let k = 0; k < 3; k++) W.fx.emit('frost', b.x + (Math.random() - 0.5) * 8, 1 + Math.random() * 3, b.z + 2, 1, { dir: a + (Math.random() - 0.5), spread: 0.2, speed: [8, 14] });
      S.f -= dt;
      if (S.f <= 0) { S.f = 0.5 - b.phase * 0.08; b.spread(5 + b.phase, 1.1, { angle: a + (Math.random() - 0.5) * 0.4, speed: 9, kind: 'shard', ramp: SHARD, size: 12, damage: 14, life: 2, element: 'ice', status: FREEZE, trail: 'frost' }); }
      return;
    }
    return 'done';
  },
  garra: (b, dt, S) => {
    if (S.t === 0) { S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'rect', angle: S.a, length: 11, width: 3.4, duration: 0.85 }); }
    if (S.t >= 0.85 * b.teleMul && !S.f) {
      S.f = true; b.play('claw', { restart: true });
      b.strike({ shape: 'line', angle: S.a, length: 11, width: 3.4, damage: 32, knockback: 14, element: 'ice', status: FREEZE });
      for (let k = 2; k < 11; k += 1.5) b.world.fx.emit('ice', b.x + Math.cos(S.a) * k, 0.4, b.z + Math.sin(S.a) * k, 6, { speed: [2, 6] });
      b.world.fx.decal('crack', b.x + Math.cos(S.a) * 7, b.z + Math.sin(S.a) * 7, 2.2);
      b.world.fx.shake(0.6);
      Events.emit('boss:slam', { boss: b });
    }
    if (S.t > 1.5) return 'done';
  },
  traidores: (b, dt, S) => {
    if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); }
    if (S.t > 0.7 && !S.f) {
      S.f = true;
      const n = Math.min(3, 3 - b.world.enemies.filter((e) => e.alive && e.type === 'traidor').length);
      for (let k = 0; k < n; k++) {
        const pt = b.world.room.randomFloor({ int: (a, c) => a + Math.floor(Math.random() * (c - a + 1)) }, (x, z) => Math.hypot(x - b.x, z - b.z) > 6 && Math.hypot(x - b.target.x, z - b.target.z) > 3);
        if (pt) b.world.controller?.spawnEnemy?.('traidor', pt.x, pt.z, {});
      }
    }
    if (S.t > 1.3) return 'done';
  },
  granizo: (b, dt, S) => {
    if (S.t === 0) { b.play('beat'); S.k = 0; }
    const n = 6 + b.phase * 2;
    if (S.k < n && S.t >= 0.2 + S.k * 0.22) {
      const p = b.target, x = p.x + (Math.random() - 0.5) * 4, z = p.z + (Math.random() - 0.5) * 3;
      b.telegraph({ shape: 'circle', x, z, radius: 1.2, duration: 0.8, color: 0x16304e, edge: 0xc8ecf8 });
      b.after(0.8 * b.teleMul, () => { b.strike({ shape: 'circle', x, z, radius: 1.2, damage: 16, knockback: 4, element: 'ice', status: FREEZE }); b.world.fx.emit('ice', x, 2, z, 12, { speed: [1, 4] }); b.world.fx.decal('frost', x, z, 1, { unlit: true, alpha: 0.7 }); });
      S.k++;
    }
    if (S.t > 0.2 + n * 0.22 + 1) return 'done';
  },
  // ---- the three mouths ----
  rojo: (b, dt, S) => {
    // vermilion face: a beam of corruption that sweeps the lake
    if (S.t === 0) { b.play('faceR'); S.a0 = b.angleToTarget() - 0.9; S.dir = 1; b.telegraph({ shape: 'rect', angle: S.a0, length: 16, width: 1.4, duration: 0.9, color: 0x200008, edge: 0xf05060 }); Events.emit('boss:windup', { boss: b }); S.hitT = 0; }
    if (faceGuard(b, S, 'roja')) return 'done';
    const go = 0.9 * b.teleMul;
    if (S.t > go && S.t < go + 2) {
      const a = S.a0 + (S.t - go) * 0.95 * S.dir;
      const W = b.world;
      const len = W.room.raycast(b.x, b.z, a, 16);
      W.fx.line('corruptGlow', b.x, b.z, b.x + Math.cos(a) * len, b.z + Math.sin(a) * len, 8, { y: 1 });
      S.hitT -= dt;
      if (S.hitT <= 0 && b.strike({ shape: 'line', angle: a, length: len, width: 1.4, damage: 18, knockback: 6, element: 'corrupt' })) S.hitT = 0.5;
      W.lights.flash(b.x + Math.cos(a) * 5, b.z + Math.sin(a) * 5, 0xff2030, 1.4, 6, 0.06);
    }
    if (S.t > go + 2.3) return 'done';
  },
  amarillo: (b, dt, S) => {
    // pale yellow face: five lances of ice that pierce the lake
    if (S.t === 0) { b.play('faceY'); S.a = b.angleToTarget(); for (let k = -2; k <= 2; k++) b.telegraph({ shape: 'rect', angle: S.a + k * 0.32, length: 16, width: 1, duration: 0.85, color: 0x16304e, edge: 0xc8ecf8 }); }
    if (faceGuard(b, S, 'amarilla')) return 'done';
    if (S.t >= 0.85 * b.teleMul && !S.f) {
      S.f = true;
      for (let k = -2; k <= 2; k++) {
        const a = S.a + k * 0.32;
        b.strike({ shape: 'line', angle: a, length: 16, width: 1, damage: 20, knockback: 8, element: 'ice', status: FREEZE });
        b.world.fx.line('ice', b.x, b.z, b.x + Math.cos(a) * 16, b.z + Math.sin(a) * 16, 14, { y: 0.8 });
      }
      b.world.fx.shake(0.4);
    }
    if (S.t > 1.5) return 'done';
  },
  negro: (b, dt, S) => {
    // black face: the void that pulls and drinks
    const W = b.world, p = W.player;
    if (S.t === 0) { b.play('faceB'); b.telegraph({ shape: 'ring', radius: 10, inner: 3.5, duration: 0.7, follow: b, color: 0x0a0410, edge: 0xc080ff }); W.game.ui?.bark(b.x, b.z, 'Ven. Aquí no hay frío. Aquí no hay nada.', 1.8); }
    if (faceGuard(b, S, 'negra')) return 'done';
    if (S.t > 0.7 * b.teleMul && S.t < 3) {
      const a = angleTo(p.x, p.z, b.x, b.z);
      if (!p.dashing) { p.kx += Math.cos(a) * 8 * dt; p.kz += Math.sin(a) * 8 * dt; }
      if (Math.random() < 0.8) W.fx.line('shadow', p.x, p.z, b.x, b.z, 2, { y: 1 });
      if (dist(p.x, p.z, b.x, b.z) < 5 && Math.random() < dt * 3) { W.dot(p, 6, 'corrupt'); b.hp = Math.min(b.maxHp, b.hp + 12); }
    }
    if (S.t > 3.1) return 'done';
  },
  // ---- corruption ----
  corrupcion: (b, dt, S) => {
    if (S.t === 0) { b.play('crack'); S.k = 0; Events.emit('boss:roar', { boss: b }); }
    if (S.k < 4 && S.t >= 0.3 + S.k * 0.6) {
      const p = b.target;
      corruptionField(b, p.x + (Math.random() - 0.5) * 4, p.z + (Math.random() - 0.5) * 3, 2.2 + Math.random() * 0.8);
      S.k++;
    }
    if (S.t > 3) return 'done';
  },
  sombras: (b, dt, S) => {
    if (S.t === 0) { b.play('corrupt'); }
    if (S.t > 0.8 && !S.f) {
      S.f = true;
      const run = b.world.game.run;
      const n = Math.max(1, Math.min(5, 1 + Math.floor((run?.moral.sin || 0) / 25)));
      b.world.game.ui?.bark(b.x, b.z, n > 2 ? 'Mira cuántos eres, Dante. Todos te acompañaron hasta aquí.' : 'Hasta tú tienes una sombra.', 2.4);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const p = b.target;
        b.world.controller?.spawnEnemy?.('sombraDante', p.x + Math.cos(a) * 4, p.z + Math.sin(a) * 3, {});
      }
    }
    if (S.t > 1.4) return 'done';
  },
};

registerBoss({
  id: 'lucifer', name: 'Lucifer', title: "Lo 'mperador del doloroso regno", boss: true, circle: 'traicion',
  hp: 6000, speed: 0, radius: 3.2, mass: 999, blood: 'ichor', pivot: 8, shadow: 0, knockMul: 0, poise: 1, windImmune: true,
  sheet: () => luciferSheet(), aura: 'frost', auraY: 4,
  light: { color: 0x9ad8ff, intensity: 1.6, radius: 10, y: 5 },
  phases: [0.66, 0.33], phaseFx: 'frost', deathPreset: 'ice', deathEdge: 0xffffff, deathRamp: SHARD, pillarRamp: [0x6a5a3a, 0xb8a060, 0xfff4cc, 0xffffff], deathDur: 5,
  firstDelay: 1.5, bigBoss: 6, camLift: 5,
  onPhase(b, ph) {
    const ui = b.world.game.ui;
    if (ph === 1) ui?.bigText('LAS TRES BOCAS', '', '#ffb0a0', 2);
    if (ph === 2) {
      ui?.bigText('LA CORRUPCIÓN', 'El hielo se rompe', '#ff6a74', 2.4);
      b.play('crack');
      b.world.game.pipe.post.uCorruption.value = 1;
    }
  },
  idle(b) { b.stop(0); b.play(b.phase >= 2 ? 'corrupt' : 'idle'); },
  patterns: {
    0: [
      { id: 'aleteo', weight: 2.5, cd: 6, run: P.aleteo },
      { id: 'garra', weight: 3, cd: 2.6, run: P.garra },
      { id: 'granizo', weight: 2.5, cd: 3.5, run: P.granizo },
      { id: 'traidores', weight: 1.2, cd: 12, run: P.traidores },
    ],
    1: [
      { id: 'rojo', weight: 3, cd: 4, run: P.rojo },
      { id: 'amarillo', weight: 3, cd: 3.5, run: P.amarillo },
      { id: 'negro', weight: 2, cd: 6, run: P.negro },
      { id: 'garra', weight: 2, cd: 2.6, run: P.garra },
      { id: 'aleteo', weight: 1.5, cd: 7, run: P.aleteo },
    ],
    2: [
      { id: 'corrupcion', weight: 3, cd: 5, run: P.corrupcion },
      { id: 'sombras', weight: 2, cd: 14, cond: (b) => !b.world.enemies.some((e) => e.type === 'sombraDante' && e.alive), run: P.sombras },
      { id: 'rojo', weight: 2.5, cd: 3.5, run: P.rojo },
      { id: 'amarillo', weight: 2.5, cd: 3, run: P.amarillo },
      { id: 'negro', weight: 2, cd: 5, run: P.negro },
      { id: 'granizo', weight: 2, cd: 3, run: P.granizo },
      { id: 'garra', weight: 2, cd: 2.2, run: P.garra },
    ],
  },
  intro: [
    ['virgilio', '"Vexilla regis prodeunt inferni." Avanzan los estandartes del rey del Infierno. Mira delante, Dante.'],
    ['lucifer', 'Nueve círculos. Nueve veces juzgaste a otros. Y aún crees que vienes a juzgarme a mí.'],
    ['lucifer', (c) => `Absolviste a ${c.moral?.absolved ?? 0}. Condenaste a ${c.moral?.condemned ?? 0}. ¿Sabes quién llevaba la cuenta? Yo.`],
    ['lucifer', (c) => (c.decided?.('francesca') === 'condemn' ? 'Condenaste a Francesca por amar. Qué fácil es castigar lo que uno desea.' : c.decided?.('francesca') === 'absolve' ? 'Liberaste a Francesca. ¿Y quién te liberará a ti, poeta?' : 'Mírate. Cada alma que miraste a los ojos te dejó un poco de su peso.')],
    ['lucifer', (c) => (c.tier >= 1 ? 'Tu luz me ofende. Yo también brillé así, antes de preguntar.' : c.tier <= -1 ? 'Ya eres casi de los míos. Siéntate. El hielo no duele cuando uno deja de sentir.' : 'Ni santo ni condenado. Eso es lo que más temo y más desprecio.')],
    ['lucifer', 'Te ofrezco lo único que nadie te ha ofrecido: un trono. Aquí, en el centro de todo, nadie te juzgará jamás.'],
    { choice: [
      { t: 'Rechazar su trono. "Mi camino sigue más allá de ti."', tag: 'virtue', fx: { runFlag: { finalChoice: 'refuse' } }, then: [['lucifer', 'Entonces sube por mi cuerpo, si puedes. Muchos lo intentaron con las manos limpias.']] },
      { t: 'Aceptar el trono de hielo.', tag: 'sin', fx: { runFlag: { finalChoice: 'embrace' } }, then: [['lucifer', 'Bien. Pero un trono se gana, no se hereda. Demuéstrame que puedes ocupar el mío.']] },
      { t: '"¿Y quién juzgó al juez? ¿Quién te puso aquí?"', tag: 'doubt', fx: { runFlag: { finalChoice: 'question' }, doubt: 1 }, then: [['lucifer', '...Hace una eternidad que nadie me preguntaba eso. Quizá por eso te odio un poco menos.']] },
    ] },
    ['virgilio', 'No mires sus seis ojos. Golpea las bocas cuando hablen. Y no te detengas sobre el hielo.'],
  ],
  outro: [
    ['lucifer', 'El hielo... me suelta... o te atrapa a ti. Nunca lo supe.'],
  ],
});

// Dante's own sins made flesh: shadow copies that fight like him
registerEnemy({
  id: 'sombraDante', name: 'Sombra de Dante', circle: 'traicion', hp: 120, speed: 4.2, radius: 0.4, blood: 'ichor', pivot: 1,
  sheet: () => danteSheet(-2), aura: 'shadow', auraY: 0.6, noSpawnFx: false,
  spawnRamp: [0x050208, 0x200008, 0x6a0a18, 0xf05060], spawnEdge: 0xf05060, deathPreset: 'corruptGlow', deathEdge: 0xf05060,
  init(e) { e.sprite.setTint(0x200010, 0.55); e.ai.dashCd = 1; e.ignoreForClear = true; e.noLoot = true; },
  think(e, dt) {
    if (B.melee(e, dt, { range: 1.9, arc: 2.2, windup: 0.32, damage: 16, knockback: 6, lunge: 7, track: 4, cooldown: 0.9, windAnim: 'attack_side', attackAnim: 'heavy_side', element: 'corrupt' })) return;
    e.ai.dashCd -= dt;
    if (e.ai.dashCd <= 0 && e.distToTarget() > 4) {
      e.ai.dashCd = 2.5;
      const a = e.angleToTarget() + (Math.random() - 0.5) * 0.8;
      e.knock(a, 22);
      e.world.fx.emit('shadow', e.x, 0.8, e.z, 10);
    }
    e.chase(1);
    e.play('run_side');
  },
});
