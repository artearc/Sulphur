// Permanent progression bought in the Hub.
//  Esencias  -> "Mejoras de Virtud" (stats)
//  Fragmentos -> weapons, relics added to the pool, permanent powers
export const UPGRADES = [
  { id: 'vigor', name: 'Vigor', icon: 'heart', desc: (l) => `+10 de vida máxima por nivel. (Actual: +${l * 10})`, max: 5, cost: [8, 16, 28, 44, 64], apply: (s, l) => { s.maxHp += 10 * l; } },
  { id: 'fervor', name: 'Fervor', icon: 'flame', desc: (l) => `+6% de daño por nivel. (Actual: +${l * 6}%)`, max: 5, cost: [10, 20, 34, 52, 75], apply: (s, l) => { s.damageMul += 0.06 * l; } },
  { id: 'agilidad', name: 'Agilidad', icon: 'feather', desc: (l) => `Esquiva más frecuente.${l >= 3 ? ' +1 carga.' : ' Al nivel 3, +1 carga de esquiva.'}`, max: 3, cost: [12, 26, 48], apply: (s, l) => { s.dashCooldown *= 1 - 0.1 * Math.min(2, l); if (l >= 3) s.dashCharges += 1; } },
  { id: 'gracia', name: 'Gracia', icon: 'chalice', desc: (l) => `+15% de curación recibida por nivel. (Actual: +${l * 15}%)`, max: 3, cost: [10, 22, 40], apply: (s, l) => { s.healMul += 0.15 * l; } },
  { id: 'fortuna', name: 'Fortuna', icon: 'coin', desc: (l) => `Empiezas cada descenso con ${l * 30} de oro.`, max: 3, cost: [8, 18, 32], apply: (s, l) => { s.startGold = 30 * l; } },
  { id: 'penitencia', name: 'Penitencia', icon: 'cross', desc: (l) => (l >= 1 ? 'Empiezas cada descenso con una Virtud al azar.' : 'Empieza cada descenso con una Virtud al azar.'), max: 1, cost: [40], apply: (s, l) => { s.startVirtue = l; } },
  { id: 'vista', name: 'Vista del Poeta', icon: 'eye', desc: () => 'Ves las recompensas dos salas por delante en el mapa.', max: 1, cost: [30], apply: (s, l) => { s.mapSight = l; } },
  { id: 'devocion', name: 'Devoción', icon: 'anchor', desc: (l) => `+10% de fervor ganado y +${l * 4} de crítico.`, max: 3, cost: [14, 28, 46], apply: (s, l) => { s.fervorGain += 0.1 * l; s.crit += 0.04 * l; } },
];

// Permanent powers bought with Relic Fragments (besides weapons and relic unlocks)
export const POWERS = [
  { id: 'juicioPlus', name: 'Juicio Ardiente', cost: 4, desc: 'Tu Juicio (esquiva + fuerte) hace +40% de daño y deja una estela de luz.' },
  { id: 'secondBreath', name: 'Segundo Aliento', cost: 6, desc: 'Empiezas cada descenso con un Óbolo de Caronte.' },
  { id: 'fervorStart', name: 'Llama Interior', cost: 3, desc: 'Empiezas cada sala con 34 de fervor.' },
];
