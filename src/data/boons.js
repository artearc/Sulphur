// Virtues (cardinal + theological) and Sins (the seven capital sins) as run boons.
// Taking a virtue tips the balance toward Redemption; taking a sin, toward Corruption.
import { resolveHit } from '../game/combat.js';
import { Projectile } from '../game/projectile.js';
import { explosionSheet } from '../art/fx.js';
import { R } from '../art/palette.js';

const lv = (arr, l) => arr[Math.min(arr.length, Math.max(1, l)) - 1];

export const BOONS = {
  // ------------------------------------------------ VIRTUDES ------------------------------------------------
  fe: {
    id: 'fe', kind: 'virtue', name: 'Fe', icon: 'cross', color: '#f2c45a',
    desc: (l) => `Tus golpes ligeros tienen ${lv([25, 40, 55], l)}% de liberar una chispa de luz que busca al condenado (${lv([6, 9, 12], l)} daño).`,
    apply(p, l) {
      p.hooks.onHit.push((t, dmg, hit, P) => {
        if (hit.heavy || hit.projectile || hit.fromBoon || Math.random() > lv([0.25, 0.4, 0.55], l)) return;
        const W = P.world;
        W.addProjectile(new Projectile(W, { x: P.x, z: P.z, y: 1.4, angle: Math.random() * 6.28, speed: 9, team: 'player', damage: lv([6, 9, 12], l), kind: 'orb', ramp: R.holy, size: 8, homing: 9, life: 1.6, trail: 'holy', element: 'holy', source: P, knockback: 1 }));
      });
    },
  },
  esperanza: {
    id: 'esperanza', kind: 'virtue', name: 'Esperanza', icon: 'anchor', color: '#9ad8b0',
    desc: (l) => `Al despejar una sala recuperas ${lv([6, 10, 14], l)} de vida.${l >= 2 ? ' Una vez por descenso, te levantas al caer.' : ''}`,
    apply(p, l) {
      p.hooks.onRoomClear.push((P) => P.heal(lv([6, 10, 14], l)));
      if (l >= 2 && !p.game.run.flags.esperanzaUsed) p.extraLife = Math.max(p.extraLife, 1);
    },
  },
  caridad: {
    id: 'caridad', kind: 'virtue', name: 'Caridad', icon: 'heart', color: '#f08a7a',
    desc: (l) => `Las tiendas te cobran ${lv([15, 25, 35], l)}% menos. Cada moneda recogida te cura ${lv([0.5, 1, 1.5], l)}.`,
    apply(p, l) { p.stats.shopDiscount = (p.stats.shopDiscount || 0) + lv([0.15, 0.25, 0.35], l); p.stats.goldHeal = lv([0.5, 1, 1.5], l); },
  },
  prudencia: {
    id: 'prudencia', kind: 'virtue', name: 'Prudencia', icon: 'eye', color: '#a8c8e8',
    desc: (l) => `Tu esquiva deja un sello que destruye proyectiles durante ${lv([1.5, 2, 2.5], l)}s.${l >= 3 ? ' +1 carga de esquiva.' : ''}`,
    apply(p, l) {
      if (l >= 3) p.stats.dashCharges += 1;
      p.hooks.onDash.push((P, phase) => {
        if (phase !== 'start') return;
        const W = P.world;
        const ward = { x: P.x, z: P.z, r: 1.5, t: lv([1.5, 2, 2.5], l) };
        W.wards.push(ward);
        const d = W.fx.decal('runes', P.x, P.z, 1.5, { unlit: true, fade: ward.t, color: 0xa8d8ff, alpha: 0.9 });
        W.addHazard({ done: false, update(dt) { ward.t -= dt; if (ward.t <= 0) { this.done = true; W.wards.splice(W.wards.indexOf(ward), 1); } } });
      });
    },
  },
  justicia: {
    id: 'justicia', kind: 'virtue', name: 'Justicia', icon: 'scales', color: '#e8e0c0',
    desc: (l) => `+${lv([25, 40, 55], l)}% daño a élites y jefes. Tus golpes fuertes ejecutan a enemigos por debajo del ${lv([10, 15, 20], l)}% de vida.`,
    apply(p, l) {
      p.hooks.outgoing.push((d, hit, t) => (t.elite || t.isBoss || t.isMiniboss ? d * (1 + lv([0.25, 0.4, 0.55], l)) : d));
      p.hooks.onHit.push((t, dmg, hit) => {
        if (hit.heavy && t.alive && !t.isBoss && t.hp > 0 && t.hp < t.maxHp * lv([0.1, 0.15, 0.2], l)) {
          t.hp = 0; t.alive = false; t.die?.(hit); t.world.onEnemyKilled(t, hit);
          t.world.fx.emit('holy', t.x, 1, t.z, 20, { radius: 0.4 });
          t.world.fx.number(0, t.x, t.z, { prefix: '!', color: 0xf2c45a, big: true });
        }
      });
    },
  },
  fortaleza: {
    id: 'fortaleza', kind: 'virtue', name: 'Fortaleza', icon: 'tower', color: '#c8a878',
    desc: (l) => `+${lv([20, 35, 50], l)} vida máxima y ${lv([8, 12, 16], l)}% menos daño recibido.`,
    apply(p, l) { p.stats.maxHp += lv([20, 35, 50], l); p.stats.armor += lv([0.08, 0.12, 0.16], l); },
  },
  templanza: {
    id: 'templanza', kind: 'virtue', name: 'Templanza', icon: 'chalice', color: '#b8a8e8',
    desc: (l) => `Tu habilidad cuesta ${lv([6, 10, 14], l)} de fervor menos y lo acumulas un ${lv([20, 35, 50], l)}% más rápido.`,
    apply(p, l) { p.stats.specialCost -= lv([6, 10, 14], l); p.stats.fervorGain += lv([0.2, 0.35, 0.5], l); },
  },
  // ------------------------------------------------ PECADOS ------------------------------------------------
  soberbia: {
    id: 'soberbia', kind: 'sin', name: 'Soberbia', icon: 'crown', color: '#c8243a',
    desc: (l) => `+${lv([25, 40, 55], l)}% de daño. Recibes un ${lv([15, 20, 25], l)}% más de daño.`,
    apply(p, l) { p.stats.damageMul += lv([0.25, 0.4, 0.55], l); p.stats.armor -= lv([0.15, 0.2, 0.25], l); },
  },
  envidia: {
    id: 'envidia', kind: 'sin', name: 'Envidia', icon: 'serpent', color: '#5aa060',
    desc: (l) => `Al morir, los enemigos que golpeaste liberan una sombra que persigue a otro (${lv([10, 15, 20], l)} daño).`,
    apply(p, l) {
      p.hooks.onKill.push((e, hit, P) => {
        const W = P.world;
        W.addProjectile(new Projectile(W, { x: e.x, z: e.z, y: 1, angle: Math.random() * 6.28, speed: 7, team: 'player', damage: lv([10, 15, 20], l), kind: 'skull', ramp: [0x0a1a0a, 0x2a5a2a, 0x5aa060, 0xb0f0a0], size: 10, homing: 7, life: 2.2, trail: 'shadow', element: 'corrupt', source: P, fromBoon: true }));
      });
    },
  },
  ira: {
    id: 'ira', kind: 'sin', name: 'Ira', icon: 'flame', color: '#e04a1e',
    desc: (l) => `Cuanta menos vida tengas, más daño haces (hasta +${lv([30, 50, 70], l)}%). Tus víctimas estallan (${lv([8, 12, 16], l)} daño).`,
    apply(p, l) {
      p.hooks.outgoing.push((d, hit, t, P) => d * (1 + lv([0.3, 0.5, 0.7], l) * Math.max(0, 1 - P.hp / P.stats.maxHp) / 0.8));
      p.hooks.onKill.push((e, hit, P) => {
        const W = P.world;
        resolveHit(W, { team: 'player', source: P, shape: 'circle', x: e.x, z: e.z, radius: 2, damage: lv([8, 12, 16], l), knockback: 6, element: 'fire', fromBoon: true });
        W.fx.play(explosionSheet('wrath', R.ember, 48), { x: e.x, y: 0.6, z: e.z + 0.05, scale: 1.1, onTop: true });
      });
    },
  },
  pereza: {
    id: 'pereza', kind: 'sin', name: 'Pereza', icon: 'hourglass', color: '#8a7a6a',
    desc: (l) => `Atacas un 10% más lento, pero tus golpes fuertes hacen +${lv([40, 65, 90], l)}% de daño.`,
    apply(p, l) { p.stats.attackSpeed -= 0.1; p.stats.heavyMul += lv([0.4, 0.65, 0.9], l); },
  },
  avaricia: {
    id: 'avaricia', kind: 'sin', name: 'Avaricia', icon: 'coin', color: '#e2b23c',
    desc: (l) => `+${lv([40, 70, 100], l)}% de oro. +1% de daño por cada 10 de oro que guardes (máx. ${lv([20, 30, 40], l)}%).`,
    apply(p, l) {
      p.stats.goldMul += lv([0.4, 0.7, 1.0], l);
      p.hooks.outgoing.push((d, hit, t, P) => d * (1 + Math.min(lv([0.2, 0.3, 0.4], l), (P.game.run?.gold || 0) / 1000)));
    },
  },
  gula: {
    id: 'gula', kind: 'sin', name: 'Gula', icon: 'mouth', color: '#9bb03a',
    desc: (l) => `Devoras: cada muerte te cura ${lv([2, 3, 4], l)}. Cada 5 muertes, +5 vida máxima (hasta +${lv([20, 30, 40], l)}).`,
    apply(p, l) {
      const run = p.game.run;
      p.stats.maxHp += Math.min(lv([20, 30, 40], l), (run.flags.gulaStacks || 0) * 5);
      p.hooks.onKill.push((e, hit, P) => {
        P.heal(lv([2, 3, 4], l), true);
        run.flags.gulaKills = (run.flags.gulaKills || 0) + 1;
        if (run.flags.gulaKills % 5 === 0 && (run.flags.gulaStacks || 0) * 5 < lv([20, 30, 40], l)) {
          run.flags.gulaStacks = (run.flags.gulaStacks || 0) + 1;
          P.stats.maxHp += 5; P.hp += 5;
          P.world.fx.emit('poison', P.x, 1, P.z, 10, { radius: 0.4 });
        }
      });
    },
  },
  lujuria: {
    id: 'lujuria', kind: 'sin', name: 'Lujuria', icon: 'rose', color: '#e04a7a',
    desc: (l) => `+${lv([12, 20, 28], l)}% velocidad de ataque. Tus golpes tienen ${lv([8, 12, 16], l)}% de seducir al enemigo: lucha a tu favor 2s.`,
    apply(p, l) {
      p.stats.attackSpeed += lv([0.12, 0.2, 0.28], l);
      p.hooks.onHit.push((t, dmg, hit) => { if (!t.isBoss && t.alive && Math.random() < lv([0.08, 0.12, 0.16], l)) { t.applyStatus('charm', 1, 2); t.world.fx.emit('petal', t.x, 1.4, t.z, 6); } });
    },
  },
};

export const VIRTUE_IDS = Object.values(BOONS).filter((b) => b.kind === 'virtue').map((b) => b.id);
export const SIN_IDS = Object.values(BOONS).filter((b) => b.kind === 'sin').map((b) => b.id);
