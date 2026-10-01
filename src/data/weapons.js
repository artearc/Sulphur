// Symbolic weapons (GDD 2.6: espada, guadaña, cadenas, cruz).
// Timings are in seconds. Every step has anticipation (windup), a short active window and
// recovery that can be cancelled by dash at any time, or by the next combo step after `cancel`.
export const WEAPONS = {
  espada: {
    id: 'espada', name: 'Espada del Peregrino', short: 'Espada',
    desc: 'Equilibrada y fiel. Combo de tres tajos; el ataque fuerte es un giro de juicio.',
    lore: 'Forjada con el hierro de una reja de la selva oscura. Corta lo que debe cortarse.',
    cost: 0, element: 'physical',
    light: [
      { windup: 0.07, active: 0.07, recovery: 0.2, cancel: 0.07, shape: 'arc', range: 2.0, arc: 2.3, damage: 13, knockback: 4, lunge: 3.5, sweep: [-1.3, 1.2], slash: { arc: 2.4, size: 56, scale: 1 } },
      { windup: 0.06, active: 0.07, recovery: 0.2, cancel: 0.07, shape: 'arc', range: 2.0, arc: 2.3, damage: 13, knockback: 4, lunge: 3.5, sweep: [1.3, -1.2], slash: { arc: 2.4, size: 56, scale: 1, flip: true } },
      { windup: 0.13, active: 0.09, recovery: 0.34, cancel: 0.2, shape: 'arc', range: 2.5, arc: 3.0, damage: 24, knockback: 8, lunge: 6, stagger: 0.4, heavyFeel: true, sweep: [-1.8, 1.6], slash: { arc: 3.0, size: 64, scale: 1.2, heavy: true } },
    ],
    heavy: { windup: 0.3, chargeMax: 0.75, shape: 'circle', radius: 2.7, damage: [28, 52], knockback: [7, 12], stagger: 0.5, lunge: 0, spin: true, recovery: 0.32, slash: { arc: 6.2, size: 80, scale: 1.25, heavy: true } },
    dashHeavy: { name: 'Juicio', windup: 0.06, shape: 'line', length: 5.2, width: 1.5, damage: 44, knockback: 11, stagger: 0.6, lunge: 26, lungeTime: 0.16, recovery: 0.3 },
  },
  guadana: {
    id: 'guadana', name: 'La Segadora', short: 'Guadaña',
    desc: 'Lenta y amplia. Siega en arcos enormes; el fuerte arrastra a las almas hacia ti y bebe su vida.',
    lore: 'La empuñó un ángel que dudó. Aún pesa su vacilación.',
    cost: 6, element: 'physical',
    light: [
      { windup: 0.12, active: 0.09, recovery: 0.26, cancel: 0.1, shape: 'arc', range: 2.8, arc: 3.4, damage: 19, knockback: 5, lunge: 2.5, sweep: [-1.9, 1.8], slash: { arc: 3.4, size: 80, scale: 1.15 } },
      { windup: 0.14, active: 0.1, recovery: 0.4, cancel: 0.22, shape: 'arc', range: 3.0, arc: 3.8, damage: 27, knockback: 7, lunge: 3, stagger: 0.35, heavyFeel: true, sweep: [1.9, -1.9], slash: { arc: 3.8, size: 88, scale: 1.2, flip: true, heavy: true } },
    ],
    heavy: { windup: 0.38, chargeMax: 0.85, shape: 'ring', radius: 3.4, inner: 0.6, damage: [24, 44], knockback: [-7, -10], stagger: 0.55, pull: true, lifesteal: 0.12, recovery: 0.36, slash: { arc: 6.2, size: 96, scale: 1.3, heavy: true } },
    dashHeavy: { name: 'Siega', windup: 0.05, shape: 'line', length: 5.5, width: 2.4, damage: 40, knockback: 6, stagger: 0.5, lunge: 22, lungeTime: 0.2, recovery: 0.32, spin: true },
  },
  cadenas: {
    id: 'cadenas', name: 'Cadenas de Penitencia', short: 'Cadenas',
    desc: 'Alcance largo y rítmico. Latigazos rápidos; el fuerte engancha al enemigo y lo arrastra.',
    lore: 'Cada eslabón es un pecado confesado. Ninguno pesa menos que el anterior.',
    cost: 8, element: 'physical',
    light: [
      { windup: 0.06, active: 0.06, recovery: 0.16, cancel: 0.06, shape: 'line', length: 4.2, width: 0.9, damage: 9, knockback: 2.5, lunge: 1, sweep: [-0.4, 0.2], whip: true },
      { windup: 0.06, active: 0.06, recovery: 0.16, cancel: 0.06, shape: 'line', length: 4.2, width: 0.9, damage: 9, knockback: 2.5, lunge: 1, sweep: [0.4, -0.2], whip: true },
      { windup: 0.08, active: 0.06, recovery: 0.16, cancel: 0.06, shape: 'line', length: 4.4, width: 1.0, damage: 10, knockback: 3, lunge: 1, sweep: [-0.3, 0.3], whip: true },
      { windup: 0.14, active: 0.1, recovery: 0.34, cancel: 0.2, shape: 'arc', range: 3.6, arc: 4.2, damage: 18, knockback: 7, lunge: 1.5, stagger: 0.35, heavyFeel: true, sweep: [-2.1, 2.1], slash: { arc: 4.2, size: 104, scale: 1.1, heavy: true } },
    ],
    heavy: { windup: 0.26, chargeMax: 0.6, shape: 'line', length: 6.5, width: 1.2, damage: [20, 34], knockback: [-14, -18], stagger: 0.7, hook: true, recovery: 0.3 },
    dashHeavy: { name: 'Remolino', windup: 0.05, shape: 'circle', radius: 3.2, damage: 34, knockback: 9, stagger: 0.5, lunge: 18, lungeTime: 0.14, recovery: 0.3, spin: true },
  },
  cruz: {
    id: 'cruz', name: 'Cruz de Ascuas', short: 'Cruz',
    desc: 'Arma de distancia. Dispara saetas de luz; el fuerte consagra el suelo y quema a los condenados.',
    lore: 'Su luz no distingue entre culpables e inocentes. Sólo entre cerca y lejos.',
    cost: 10, element: 'holy',
    light: [
      { windup: 0.05, active: 0.02, recovery: 0.16, cancel: 0.05, shape: 'projectile', damage: 8, speed: 18, count: 1, spread: 0, knockback: 1.6, lunge: 0, sweep: [0, 0] },
      { windup: 0.05, active: 0.02, recovery: 0.16, cancel: 0.05, shape: 'projectile', damage: 8, speed: 18, count: 1, spread: 0, knockback: 1.6, lunge: 0, sweep: [0, 0] },
      { windup: 0.1, active: 0.02, recovery: 0.3, cancel: 0.16, shape: 'projectile', damage: 9, speed: 20, count: 3, spread: 0.32, knockback: 3, lunge: -1.5, heavyFeel: true, sweep: [0, 0] },
    ],
    heavy: { windup: 0.34, chargeMax: 0.8, shape: 'zone', radius: 2.6, damage: [5, 9], duration: 3.2, tick: 0.35, knockback: [1, 1], recovery: 0.3, consecrate: true },
    dashHeavy: { name: 'Gloria', windup: 0.04, shape: 'circle', radius: 3.0, damage: 30, knockback: 10, stagger: 0.5, lunge: 0, recovery: 0.32, nova: true },
  },
};

export const WEAPON_ORDER = ['espada', 'guadana', 'cadenas', 'cruz'];
