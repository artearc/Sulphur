// Relics: symbolic objects found during the descent that bend the rules of the run.
// `pool: 'base'` relics are always available; `unlock` relics are bought with Relic Fragments in the Hub.
import { resolveHit } from '../game/combat.js';
import { Events } from '../core/events.js';

export const RELICS = {
  obolo: {
    id: 'obolo', name: 'Óbolo de Caronte', icon: 'coin', rarity: 'rara', pool: 'base',
    desc: 'La moneda del barquero. Al caer, pagas tu regreso: vuelves con 40% de vida (una vez).',
    apply(p) { if (!p.game.run.flags.oboloUsed) p.extraLife = Math.max(p.extraLife, 1); },
  },
  laurel: {
    id: 'laurel', name: 'Laurel del Poeta', icon: 'laurel', rarity: 'común', pool: 'base',
    desc: '+10% de probabilidad de crítico. La palabra justa hiere más hondo.',
    apply(p) { p.stats.crit += 0.1; },
  },
  lampara: {
    id: 'lampara', name: 'Lámpara de Virgilio', icon: 'lamp', rarity: 'rara', pool: 'base', route: 'secret',
    desc: 'Revela las puertas ocultas de cada círculo. Tu luz llega más lejos.',
    apply(p) { p.stats.revealSecrets = true; p.applyTierLight(); },
  },
  cuerda: {
    id: 'cuerda', name: 'Cuerda de San Francisco', icon: 'cord', rarity: 'rara', pool: 'base',
    desc: 'El cordón que Dante arrojó al abismo. Tu esquiva enreda a quien atraviesas (aturde 0.8s).',
    apply(p) {
      p.hooks.onDash.push((P, phase) => {
        if (phase !== 'start') return;
        P.world.addHazard({
          done: false, t: 0.2, hit: new Set(),
          update(dt) {
            this.t -= dt;
            for (const e of P.world.enemiesInRadius(P.x, P.z, 0.9)) if (!this.hit.has(e.id)) { this.hit.add(e.id); e.applyStatus('stun', 1, 0.8); P.world.fx.emit('dust', e.x, 0.6, e.z, 4); }
            if (this.t <= 0) this.done = true;
          },
        });
      });
    },
  },
  rama: {
    id: 'rama', name: 'Rama Dorada', icon: 'branch', rarity: 'rara', pool: 'base',
    desc: 'La rama que abrió el Hades a Eneas. +25 vida máxima; al entrar en un círculo, recuperas 25%.',
    apply(p) { p.stats.maxHp += 25; p.stats.circleHeal = 0.25; },
  },
  judas: {
    id: 'judas', name: 'Moneda de Judas', icon: 'coin', rarity: 'maldita', pool: 'base', sin: 6,
    desc: 'Treinta monedas pesan más que el mundo. +60% de oro, pero cada compra te mancha (+2 Pecado).',
    apply(p) { p.stats.goldMul += 0.6; p.stats.purchaseSin = 2; },
  },
  lagrima: {
    id: 'lagrima', name: 'Lágrima de Beatriz', icon: 'tear', rarity: 'rara', pool: 'base', virtue: 4,
    desc: 'La primera vez en cada sala que tu vida baja del 30%, recuperas 20.',
    apply(p) {
      p.hooks.onHurt.push((hit, dmg, P) => {
        if (P.hp > 0 && P.hp < P.stats.maxHp * 0.3 && !P.game.run.roomFlags.lagrima) {
          P.game.run.roomFlags.lagrima = true;
          P.heal(20);
          P.world.fx.emit('holy', P.x, 1.5, P.z, 16, { c0: 0xd0f0ff, c1: 0x4a84a8 });
        }
      });
    },
  },
  medusa: {
    id: 'medusa', name: 'Mirada de Medusa', icon: 'eye', rarity: 'rara', pool: 'unlock', cost: 3,
    desc: 'Tus golpes fuertes petrifican: los enemigos quedan inmóviles 0.8s.',
    apply(p) { p.hooks.onHit.push((t, d, hit) => { if (hit.heavy && !t.isBoss) t.applyStatus('stun', 1, 0.8); }); },
  },
  paolo: {
    id: 'paolo', name: 'Corazón de Paolo', icon: 'heart', rarity: 'común', pool: 'base',
    desc: '"Questi, che mai da me non fia diviso." +20% de daño a enemigos a menos de 2 pasos.',
    apply(p) { p.hooks.outgoing.push((d, hit, t, P) => (Math.hypot(t.x - P.x, t.z - P.z) < 2.2 ? d * 1.2 : d)); },
  },
  nimrod: {
    id: 'nimrod', name: 'Cuerno de Nimrod', icon: 'horn', rarity: 'rara', pool: 'unlock', cost: 3,
    desc: 'Tu habilidad también suelta un bramido que aturde a todos los cercanos 1s.',
    apply(p) {
      p.hooks.onSpecial.push((P) => {
        for (const e of P.world.enemiesInRadius(P.x, P.z, 4.5)) e.applyStatus('stun', 1, 1);
        P.world.fx.ring('dust', P.x, P.z, 1, 24, { speed: [5, 8] });
        Events.emit('horn', {});
      });
    },
  },
  llave: {
    id: 'llave', name: 'Llave de San Pedro', icon: 'key', rarity: 'legendaria', pool: 'unlock', cost: 5, route: 'virtue',
    desc: 'Abre los Senderos de Virtud sin importar tu balanza. Las tiendas te temen: -10%.',
    apply(p) { p.stats.openVirtueGates = true; p.stats.shopDiscount = (p.stats.shopDiscount || 0) + 0.1; },
  },
  argos: {
    id: 'argos', name: 'Ojo de Argos', icon: 'eye', rarity: 'común', pool: 'base',
    desc: '+35% de daño crítico.',
    apply(p) { p.stats.critMul += 0.35; },
  },
  escama: {
    id: 'escama', name: 'Escama de Gerión', icon: 'scale', rarity: 'común', pool: 'base',
    desc: 'Recibes 20% menos daño de proyectiles.',
    apply(p) { p.damageTakenMul = (hit) => (hit.projectile ? 0.8 : 1); },
  },
  pluma: {
    id: 'pluma', name: 'Pluma de Ángel Caído', icon: 'feather', rarity: 'rara', pool: 'base',
    desc: '+1 carga de esquiva. Caer también es una forma de volar.',
    apply(p) { p.stats.dashCharges += 1; },
  },
  espinas: {
    id: 'espinas', name: 'Corona de Espinas', icon: 'thorns', rarity: 'maldita', pool: 'unlock', cost: 2, virtue: 3,
    desc: '+20% de daño y robas 3% de vida, pero recibes 10% más de daño.',
    apply(p) { p.stats.damageMul += 0.2; p.stats.lifesteal += 0.03; p.stats.armor -= 0.1; },
  },
  fortuna: {
    id: 'fortuna', name: 'Rueda de la Fortuna', icon: 'wheel', rarity: 'rara', pool: 'base',
    desc: '25% de que cada recompensa de sala se duplique.',
    apply(p) { p.stats.doubleReward = 0.25; },
  },
  brasa: {
    id: 'brasa', name: 'Brasa de Farinata', icon: 'ember', rarity: 'común', pool: 'unlock', cost: 2,
    desc: 'Tus golpes tienen 18% de prender fuego al enemigo.',
    apply(p) { p.hooks.onHit.push((t) => { if (Math.random() < 0.18) t.applyStatus('burn', 1, 3); }); },
  },
  escarcha: {
    id: 'escarcha', name: 'Escarcha de Cocito', icon: 'snow', rarity: 'común', pool: 'unlock', cost: 2,
    desc: 'Tus golpes acumulan escarcha: al llenarse, el enemigo se congela.',
    apply(p) { p.hooks.onHit.push((t) => { if (!t.isBoss) t.applyStatus('freeze', 0.22, 1.4); }); },
  },
  sello: {
    id: 'sello', name: 'Sello de Minos', icon: 'seal', rarity: 'rara', pool: 'base',
    desc: 'Los élites dejan un Fragmento de Reliquia adicional.',
    apply(p) { p.stats.eliteFragment = 1; },
  },
  ariadna: {
    id: 'ariadna', name: 'Hilo de Ariadna', icon: 'thread', rarity: 'común', pool: 'base',
    desc: 'Ves el mapa completo de cada círculo y la recompensa de cada sala.',
    apply(p) { p.stats.fullMap = true; },
  },
  campana: {
    id: 'campana', name: 'Campana de Pluto', icon: 'bell', rarity: 'común', pool: 'base',
    desc: 'Recoger oro tiene 30% de darte 8 de fervor.',
    apply(p) { p.stats.goldFervor = 8; },
  },
  ulises: {
    id: 'ulises', name: 'Máscara de Ulises', icon: 'mask', rarity: 'rara', pool: 'unlock', cost: 4,
    desc: 'El engaño protege: 15% de esquivar por completo cualquier golpe.',
    apply(p) {
      const base = p.canBeHit.bind(p);
      p.canBeHit = (dot) => {
        if (!base(dot)) return false;
        if (!dot && Math.random() < 0.15) { p.world.fx.number(0, p.x, p.z, { prefix: '-', color: 0x40e0c0 }); p.hurtInvuln = 0.25; return false; }
        return true;
      };
    },
  },
  estigia: {
    id: 'estigia', name: 'Vial del Estigia', icon: 'vial', rarity: 'común', pool: 'base',
    desc: '+30% de daño a enemigos quemados, envenenados o congelados.',
    apply(p) { p.hooks.outgoing.push((d, hit, t) => (t.status.burn > 0 || t.status.poison > 0 || t.status.freeze > 0 || t.status.frozen > 0 ? d * 1.3 : d)); },
  },
  ancla: {
    id: 'ancla', name: 'Ancla del Barquero', icon: 'anchor', rarity: 'común', pool: 'base',
    desc: 'Ni el viento ni los golpes te mueven. Inmune al empuje.',
    apply(p) { p.windImmune = true; p.mass = 6; },
  },
  paganos: {
    id: 'paganos', name: 'Libro de los Paganos', icon: 'book', rarity: 'común', pool: 'base',
    desc: 'Homero, Horacio, Ovidio, Lucano. +2 Esencias por cada sala despejada.',
    apply(p) { p.stats.roomEssence = 2; },
  },
};

export const RELIC_ICON_COLORS = { común: '#a8987a', rara: '#9ab8d8', legendaria: '#f2c45a', maldita: '#c8243a' };
