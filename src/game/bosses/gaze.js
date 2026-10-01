// Medusa's gaze — shared by the Furies' summons and Medusa herself.
// Readable rule: when the eyes open, LOOK AWAY (aim away from the source) or hide behind stone.
import { angleTo, angleDiff, segCircle } from '../../core/math.js';
import { Events } from '../../core/events.js';
import { resolveHit } from '../combat.js';

export function gazeCheck(world, sx, sz) {
  const p = world.player;
  if (!p || !p.alive) return false;
  const toSrc = angleTo(p.x, p.z, sx, sz);
  const facing = Math.abs(angleDiff(p.aim, toSrc)) < 1.2;
  const blocked = (world.room && !world.room.los(p.x, p.z, sx, sz)) || (world.gazeBlockers || []).some((o) => segCircle(p.x, p.z, sx, sz, o.x, o.z, o.r));
  return facing && !blocked;
}

// Returns a pattern-state helper: call gazeStep(b, S, dt, opts) each frame; returns true when finished.
export function gazeStep(b, S, dt, o = {}) {
  const W = b.world, p = W.player;
  const wind = (o.windup ?? 1.6) * b.teleMul;
  const sx = o.x ?? b.x, sz = o.z ?? b.z;
  if (!S.gz) {
    S.gz = { t: 0 };
    W.game.ui?.bigText('¡Vuélvete!', 'No mires sus ojos', '#c8e0c0', Math.min(2, wind + 0.3));
    if (!W.game.flags?.gazeTaught) W.game.ui?.bark(p.x, p.z, 'Virgilio: «¡Vuélvete atrás y cierra los ojos!»', 2.2);
    Events.emit('boss:gaze', { boss: b });
  }
  S.gz.t += dt;
  const k = Math.min(1, S.gz.t / wind);
  W.game.pipe.post.uVignette.value = 0.55 + k * 0.5;
  if (Math.random() < k) W.fx.emit('poison', sx, 2.5, sz, 1, { c0: 0xe8ffe0, c1: 0x346a44, radius: 0.6 });
  if (S.gz.t >= wind && !S.gz.done) {
    S.gz.done = true;
    W.game.pipe.post.uVignette.value = 0.55;
    W.fx.screenFlash(0xe8ffe0, 0.55, 0.35);
    W.fx.lightFlash(sx, sz, 0xe8ffe0, 5, 14, 0.5);
    if (gazeCheck(W, sx, sz)) {
      resolveHit(W, { team: 'enemy', source: b, shape: 'circle', x: p.x, z: p.z, radius: 0.5, damage: o.damage ?? 26, knockback: 0, element: 'corrupt' });
      p.applyStatus('stun', 1, o.stone ?? 1.6);
      p.sprite.setTint(0x8a8a8a, 0.85);
      W.game.after(o.stone ?? 1.6, () => p.sprite.setTint(0xffffff, 0), 'sim');
      W.fx.emit('dust', p.x, 1, p.z, 24, { c0: 0xb0b0b0, c1: 0x404040 });
      W.game.ui?.toast('Petrificado', 'sin');
      Events.emit('gaze:petrify', {});
    } else {
      W.game.ui?.toast('Apartaste la mirada', 'virtue');
      if (W.game) W.game.flags = { ...(W.game.flags || {}), gazeTaught: true };
    }
  }
  return S.gz.t >= wind + 0.5;
}
