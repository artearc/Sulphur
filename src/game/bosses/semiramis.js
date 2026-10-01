// BOSS II · SEMÍRAMIS, Reina del Torbellino — "che libito fé licito in sua legge".
// The storm is her body and her weapon: gusts, lightning, a heart-sigil that pulls, wandering tornados,
// and in the end a silk double — only the real one has a beating heart.
import * as THREE from 'three';
import { registerBoss } from '../boss.js';
import { registerEnemy } from '../enemy.js';
import { semiramisSheet, tornadoSheet, lightningSheet, heartSigilTexture } from '../../art/bosses/semiramis.js';
import { Sprite } from '../../render/sprite.js';
import { createDecalMaterial } from '../../render/materials.js';
import { angleTo, dist } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { resolveHit } from '../combat.js';

const ROSE = [0x4a0e2a, 0x7a1a44, 0xb02a5a, 0xe04a7a, 0xff86a8];
const BOLT = [0x2a2a5a, 0x8aa0e0, 0xd0e0ff, 0xffffff];

function strikeAt(b, x, z, o = {}) {
  const r = o.radius ?? 1.4;
  b.telegraph({ shape: 'circle', x, z, radius: r, duration: o.windup ?? 0.8, color: 0x2a2a5a, edge: 0xd0e0ff });
  b.after((o.windup ?? 0.8) * b.teleMul, () => {
    if (!o.fake) b.strike({ shape: 'circle', x, z, radius: r, damage: o.damage ?? 18, knockback: 6, element: 'wind', status: { stun: { amount: 1, dur: 0.25 } } });
    b.world.fx.play(lightningSheet(), { x, y: 0, z: z + 0.05, pivot: 0 });
    b.world.fx.emit('lightning', x, 0.4, z, 14, { speed: [3, 8] });
    b.world.fx.lightFlash(x, z, 0xd0e0ff, 4, 9, 0.2);
    b.world.fx.screenFlash(0xd0e0ff, 0.12, 0.08);
    b.world.fx.decal('scorch', x, z, r * 0.7, { alpha: 0.7 });
    b.world.fx.shake(0.25);
    Events.emit('lightning', {});
  });
}

class Tornado {
  constructor(world, x, z, boss) {
    Object.assign(this, { world, x, z, boss, t: 0, life: 7, done: false, a: Math.random() * 6.28, hitT: 0 });
    this.sprite = new Sprite(tornadoSheet(), { anim: 'idle', pivot: 2, unlit: true });
    world.root.add(this.sprite.mesh);
  }
  update(dt) {
    this.t += dt; this.hitT -= dt;
    const W = this.world, p = W.player;
    // wanders toward Dante, drifting
    const a = angleTo(this.x, this.z, p.x, p.z);
    this.a += Math.sin(this.t * 1.3) * dt;
    const sp = 2.3;
    const nx = this.x + Math.cos(a * 0.6 + this.a * 0.4) * sp * dt, nz = this.z + Math.sin(a * 0.6 + this.a * 0.4) * sp * dt;
    if (W.room.free(nx, nz, 0.6, 'fly')) { this.x = nx; this.z = nz; }
    const d = dist(this.x, this.z, p.x, p.z);
    if (d < 3 && !p.dashing) { const pa = angleTo(p.x, p.z, this.x, this.z) + 1.2; p.kx += Math.cos(pa) * 9 * dt; p.kz += Math.sin(pa) * 9 * dt; }
    if (d < 1.1 && this.hitT <= 0) { this.hitT = 0.8; resolveHit(W, { team: 'enemy', source: this.boss, shape: 'circle', x: this.x, z: this.z, radius: 1.1, damage: 12, knockback: 10, element: 'wind' }); }
    if (Math.random() < dt * 20) W.fx.emit('petal', this.x, 0.5 + Math.random() * 3, this.z, 1, { dir: Math.random() * 6.28, speed: [2, 4] });
    this.sprite.update(dt);
    this.sprite.place(this.x, 0, this.z);
    this.sprite.setAlpha(Math.min(1, this.t * 2, (this.life - this.t) * 2));
    if (this.t > this.life || !this.boss.alive) this.destroy();
  }
  destroy() { this.done = true; this.sprite.dispose(); }
}

function heartSigil(world, x, z, r) {
  const { texture } = heartSigilTexture();
  const mat = createDecalMaterial(texture, { color: 0xff4a8a, unlit: true, alpha: 0.95 });
  const geo = new THREE.PlaneGeometry(r * 2, r * 2); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, 0.03, z); m.renderOrder = 4; m.frustumCulled = false;
  world.fx.root.add(m);
  return m;
}

const P = {
  vendaval: (b, dt, S) => {
    if (S.t === 0) { b.play('cast'); S.a = Math.random() * Math.PI * 2; b.world.game.ui?.bark(b.x, b.z, 'Que el viento te enseñe a no resistirte.', 1.8); Events.emit('boss:roar', { boss: b }); }
    const tele = 0.9 * b.teleMul;
    const p = b.target;
    if (S.t < tele) { if (Math.random() < 0.8) b.world.fx.emit('wind', p.x + (Math.random() - 0.5) * 8, 0.5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 6, 1, { dir: S.a, spread: 0.05, speed: [4, 6], c0: 0xd8c8f0, c1: 0x3a2a50 }); }
    else if (S.t < tele + 2.4) {
      b.play('spin');
      if (!p.dashing && !p.windImmune) { p.kx += Math.cos(S.a) * 11 * dt; p.kz += Math.sin(S.a) * 11 * dt; }
      for (let k = 0; k < 3; k++) b.world.fx.emit('wind', p.x + (Math.random() - 0.5) * 10, 0.5 + Math.random() * 2, p.z + (Math.random() - 0.5) * 8, 1, { dir: S.a, spread: 0.05, speed: [10, 14], c0: 0xffffff, c1: 0x8a70b0 });
      // razor gust arcs ride the wind
      S.g = (S.g || 0) - dt;
      if (S.g <= 0) { S.g = 0.45; b.shoot({ x: p.x - Math.cos(S.a) * 9 + (Math.random() - 0.5) * 6, z: p.z - Math.sin(S.a) * 7 + (Math.random() - 0.5) * 5, angle: S.a, speed: 12, kind: 'bolt', ramp: ROSE, size: 14, damage: 11, life: 1.6, element: 'wind', trail: 'petal' }); }
    } else return 'done';
  },
  rayos: (b, dt, S) => {
    if (S.t === 0) { b.play('cast'); S.k = 0; }
    const n = 4 + b.phase * 2;
    if (S.k < n && S.t >= 0.2 + S.k * (0.32 - b.phase * 0.04)) {
      const p = b.target;
      strikeAt(b, p.x + p.vx * 0.3 + (Math.random() - 0.5) * 1.2, p.z + p.vz * 0.3 + (Math.random() - 0.5) * 1.2, { damage: 17 });
      S.k++;
    }
    if (S.t > 0.2 + n * 0.32 + 1) return 'done';
  },
  ley: (b, dt, S) => {
    // Ley del Deseo: a heart sigil that drags Dante in, then bursts
    if (S.t === 0) {
      b.play('point', { restart: true });
      const p = b.target;
      S.x = p.x + (Math.random() - 0.5) * 3; S.z = p.z + (Math.random() - 0.5) * 2;
      S.m = heartSigil(b.world, S.x, S.z, 2.6);
      b.world.game.ui?.bark(b.x, b.z, '"Libito fé licito in sua legge."', 2);
      Events.emit('boss:windup', { boss: b });
    }
    const p = b.target;
    if (S.t < 2.6) {
      b.play('pull');
      const a = angleTo(p.x, p.z, S.x, S.z);
      if (!p.dashing && dist(p.x, p.z, S.x, S.z) > 0.4) { p.kx += Math.cos(a) * 8 * dt; p.kz += Math.sin(a) * 8 * dt; }
      S.m.material.uniforms.uAlpha.value = 0.6 + 0.4 * Math.sin(S.t * 12);
      if (S.t > 1.8 && !S.tele) S.tele = b.telegraph({ shape: 'circle', x: S.x, z: S.z, radius: 2.6, duration: 0.8 * b.teleMul, color: 0x7a1a44, edge: 0xff86a8 });
    } else if (!S.boom) {
      S.boom = true;
      b.strike({ shape: 'circle', x: S.x, z: S.z, radius: 2.6, damage: 22, knockback: 12, element: 'corrupt' });
      b.world.fx.ring('petal', S.x, S.z, 1.5, 36, { speed: [4, 8] });
      b.world.fx.lightFlash(S.x, S.z, 0xff4a8a, 4, 8, 0.3);
      b.world.fx.shake(0.4);
      S.m.removeFromParent(); S.m.geometry.dispose(); S.m.material.dispose();
    }
    if (S.t > 3) return 'done';
  },
  abrazo: (b, dt, S) => {
    if (S.t === 0) { b.faceTarget(); S.a = b.angleToTarget(); b.play('windup', { restart: true }); b.telegraph({ shape: 'cone', radius: 4.2, halfAngle: 0.9, angle: S.a, duration: 0.7 }); }
    if (S.t >= 0.7 * b.teleMul && !S.f) {
      S.f = true; b.play('attack', { restart: true });
      b.strike({ shape: 'arc', angle: S.a, range: 4.2, arc: 1.8, damage: 20, knockback: 11, element: 'wind' });
      for (let k = 0; k < 24; k++) b.world.fx.emit('petal', b.x, 1.5, b.z, 1, { dir: S.a + (Math.random() - 0.5) * 1.8, spread: 0.1, speed: [6, 10] });
      b.world.fx.shake(0.3);
      Events.emit('boss:slam', { boss: b });
    }
    if (S.t > 1.3) return 'done';
  },
  tornados: (b, dt, S) => {
    if (S.t === 0) { b.play('roar'); Events.emit('boss:roar', { boss: b }); }
    if (S.t > 0.6 && !S.f) { S.f = true; for (let k = 0; k < 1 + b.phase; k++) { const a = Math.random() * 6.28; b.world.addHazard(new Tornado(b.world, b.x + Math.cos(a) * 3, b.z + Math.sin(a) * 2.5, b)); } }
    if (S.t > 1.2) return 'done';
  },
  gemela: (b, dt, S) => {
    if (S.t === 0) { b.play('roar'); b.world.fx.emit('petal', b.x, 2, b.z, 40, { radius: 1.5 }); }
    if (S.t > 0.7 && !S.f) {
      S.f = true;
      const a = Math.random() * 6.28;
      const twin = b.world.controller?.spawnEnemy?.('semiramisEco', b.x + Math.cos(a) * 5, b.z + Math.sin(a) * 3, { noSpawnFx: true, master: b });
      if (twin) { twin.master = b; b.world.game.ui?.bark(twin.x, twin.z, '¿Cuál de nosotras amaste?', 2); }
    }
    if (S.t > 1.3) return 'done';
  },
};

registerBoss({
  id: 'semiramis', name: 'Semíramis', title: 'Reina del Torbellino', boss: true, circle: 'lujuria',
  hp: 1300, speed: 1.8, radius: 1.3, mass: 25, mode: 'fly', blood: 'ecto', pivot: 2, shadow: 2.2, windImmune: true,
  sheet: () => semiramisSheet('real'), aura: 'petal', auraY: 2,
  light: { color: 0xe04a7a, intensity: 1.3, radius: 7, y: 3 },
  phases: [0.66, 0.33], phaseFx: 'petal', deathPreset: 'petal', deathEdge: 0xff86a8, deathRamp: ROSE, pillarRamp: ROSE,
  idle(b) {
    const d = b.distToTarget();
    if (d > 7) b.chase(0.9); else if (d < 3.5) b.steer(b.angleToTarget() + Math.PI, 0.7); else b.steer(b.angleToTarget() + Math.PI / 2, 0.6);
    b.play('move');
  },
  onPhase(b, ph) { if (ph === 2) b.world.game.ui?.bark(b.x, b.z, 'Mi amor era ley. ¿Quién eres tú para juzgarlo?', 2.4); },
  patterns: {
    0: [
      { id: 'vendaval', weight: 2, cd: 6, run: P.vendaval },
      { id: 'rayos', weight: 3, cd: 3, run: P.rayos },
      { id: 'ley', weight: 2, cd: 7, run: P.ley },
      { id: 'abrazo', weight: 4, cd: 2.2, range: [0, 4.5], run: P.abrazo },
    ],
    1: [
      { id: 'vendaval', weight: 2, cd: 5, run: P.vendaval },
      { id: 'rayos', weight: 3, cd: 2.6, run: P.rayos },
      { id: 'ley', weight: 2, cd: 6, run: P.ley },
      { id: 'tornados', weight: 2, cd: 8, run: P.tornados },
      { id: 'abrazo', weight: 4, cd: 2, range: [0, 4.5], run: P.abrazo },
    ],
    2: [
      { id: 'gemela', weight: 3, cd: 14, cond: (b) => !b.world.enemies.some((e) => e.type === 'semiramisEco' && e.alive), run: P.gemela },
      { id: 'rayos', weight: 3, cd: 2.2, run: P.rayos },
      { id: 'ley', weight: 2, cd: 5, run: P.ley },
      { id: 'tornados', weight: 2, cd: 7, run: P.tornados },
      { id: 'vendaval', weight: 1.5, cd: 5, run: P.vendaval },
      { id: 'abrazo', weight: 4, cd: 1.8, range: [0, 4.5], run: P.abrazo },
    ],
  },
  intro: [
    ['virgilio', 'Aquélla es Semíramis, que dio leyes al deseo para que nadie pudiera culparla del suyo.'],
    ['semiramis', '"Libito fé licito in sua legge." Hice lícito lo que me apetecía. ¿No harías tú lo mismo, poeta?', { name: 'Semíramis' }],
    ['dante', 'Yo sólo quiero llegar al final del camino.'],
    ['semiramis', (c) => (c.tier >= 1 ? 'Qué luz tan pequeña traes. En mi tormenta se apagan todas.' : c.tier <= -1 ? 'Hueles a deseo. Quédate: aquí el viento nunca juzga, sólo arrastra.' : 'Todo amor es un viento. Veamos cuánto aguantas de pie.'), { name: 'Semíramis' }],
    ['semiramis', '¡Que la bufera te lleve!', { name: 'Semíramis', mood: 'shout' }],
  ],
  outro: [
    ['virgilio', 'El torbellino se calma un instante. Sólo un instante. Aquí nada descansa del todo.'],
  ],
});

// The silk double: harmless strikes, dies when the queen dies or when struck hard.
registerEnemy({
  id: 'semiramisEco', name: 'Reflejo de Semíramis', circle: 'lujuria', hp: 180, speed: 2, radius: 1.1, mode: 'fly', blood: 'ecto', pivot: 2,
  sheet: () => semiramisSheet('false'), aura: 'petal', auraY: 2, noSpawnFx: true,
  init(e, o) { e.master = o.master; e.ignoreForClear = true; e.noLoot = true; e.ai.t = 0; },
  think(e, dt) {
    e.ai.t += dt;
    if (!e.master || !e.master.alive) { e.alive = false; e.die({}); return; }
    if (e.ai.t > 3 && e.cd('fake', 3.5)) {
      // her lightning is only light: it never burns (illusion), but the telegraph looks the same
      e.play('cast');
      const p = e.target;
      for (let k = 0; k < 3; k++) strikeAt(e, p.x + (Math.random() - 0.5) * 3, p.z + (Math.random() - 0.5) * 2, { fake: true });
    }
    const d = e.distToTarget();
    if (d > 6) e.chase(0.8); else e.steer(e.angleToTarget() + Math.PI / 2, 0.6);
    e.play('move');
  },
});
