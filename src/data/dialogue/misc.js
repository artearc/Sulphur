// Merchant, secret rooms, accusing specter.
const condemnedNames = (c) => {
  const SOUL_NAMES = { poeta: 'el poeta sin nombre', francesca: 'Francesca', ciacco: 'Ciacco', avaro: 'el avaro', acidioso: 'el hundido', farinata: 'Farinata', pier: 'Pier della Vigna', ulises: 'Ulises', ugolino: 'Ugolino' };
  const names = (c.run?.decisions || []).filter((d) => d.choice === 'condemn').map((d) => SOUL_NAMES[d.soul] || 'un alma sin nombre');
  return names.length ? names.join(', ') : 'tantos';
};

export const MISC = {
  // ------------------------------------------------ mercader ------------------------------------------------
  'mercader.1': { priority: 1, lines: [['mercader', 'Oro por poder, peregrino. Es el único sacramento que aquí se respeta.']] },
  'mercader.2': { priority: 1, lines: [['mercader', '¿Ayudo o manipulo? Pregúntaselo a quien me compró antes que tú. Ah, cierto: ya no puede hablar.']] },
  'mercader.3': { priority: 1, lines: [['mercader', 'Todo lo que vendo perteneció a alguien. Algunos todavía lo echan de menos. Eso le da valor.']] },
  'mercader.4': { priority: 1, lines: [['mercader', 'Sé lo que llevas en los bolsillos y sé lo que llevas en el alma. Sólo cobro por lo primero.', { mood: 'smile' }]] },
  'mercader.virtuoso': { priority: 5, cond: (c) => c.tier >= 1, lines: [['mercader', 'Tu luz me hace rebajar los precios. Detesto eso de ti.']] },
  'mercader.corrupto': { priority: 5, cond: (c) => c.tier <= -1, lines: [['mercader', 'Ah, un cliente con el alma ya negociada. Para ti, precio de amigo. Bueno... de socio.', { mood: 'smile' }]] },
  'mercader.pobre': { priority: 6, cond: (c) => (c.run?.gold || 0) < 30, lines: [['mercader', '¿Vienes a mirar? Mirar es gratis. Desear, no tanto.']] },
  'mercader.rico': { priority: 6, cond: (c) => (c.run?.gold || 0) > 300, lines: [['mercader', '¡Qué bolsillos tan pesados! Pluto estaría orgulloso. O celoso. Con él nunca se sabe.']] },
  'mercader.quien': {
    once: true, priority: 8,
    lines: [
      ['dante', '¿Quién eres? No pareces condenado.'],
      ['mercader', 'Soy lo que queda cuando alguien vende lo que no era suyo. Un precio que camina.'],
      { choice: [
        { t: '¿Ayudas a los que bajan?', then: [['mercader', 'Ayudo a los que pagan. A veces coincide.', { mood: 'smile' }]] },
        { t: '¿Quién fija los precios del Infierno?', tag: 'doubt', fx: { doubt: 1 }, then: [['mercader', 'La misma mano que fija las penas. Pregúntale a ella, si la encuentras.']] },
      ] },
    ],
  },

  // ------------------------------------------------ secret rooms ------------------------------------------------
  'secreto.1': { priority: 1, lines: [['narrador', 'Grabado en la piedra: "Aquí también hubo alguien que dudó." Debajo, cientos de marcas de uñas.']] },
  'secreto.2': { priority: 1, lines: [['narrador', 'Un altar sin dios. Sobre él, una corona de laurel seco y una nota: "Para el próximo que llegue sin miedo."']] },
  'secreto.3': { priority: 1, lines: [['narrador', 'Ecos de una conversación: "¿Y si el Infierno es sólo el lugar donde dejamos de preguntar?" "Entonces estamos fuera de él, ahora mismo."']] },
  'secreto.4': { priority: 1, lines: [['narrador', 'Un espejo roto. En cada fragmento, un Dante distinto: uno con halo, uno con alas negras, uno con los ojos cerrados.']] },
  'secreto.limbo': { priority: 3, cond: (c) => c.circle?.id === 'limbo', lines: [['narrador', 'Una biblioteca en ruinas. Homero, Horacio, Ovidio, Lucano... Todos los libros tienen la última página arrancada.']] },
  'secreto.fraude': { priority: 3, cond: (c) => c.circle?.id === 'fraude', lines: [['narrador', 'Una sala idéntica a la anterior. Exactamente idéntica. Incluida la mancha de sangre que dejaste al entrar.']] },
  'secreto.traicion': { priority: 3, cond: (c) => c.circle?.id === 'traicion', lines: [['narrador', 'Bajo el hielo, una cara te mira. Es la tuya. Parpadea antes que tú.']] },
  'secreto.ira': { priority: 3, cond: (c) => c.circle?.id === 'ira', lines: [['narrador', 'Burbujas en el fango forman palabras: "Tristi fummo." Fuimos tristes. Fuimos. Ya ni eso.']] },

  // ------------------------------------------------ the accusing specter ------------------------------------------------
  'acusador.1': {
    once: true, priority: 10,
    lines: [
      ['acusador', 'Te conozco, juez de paso. Llevo la cuenta.', { mood: 'angry' }],
      ['acusador', (c) => `Condenaste a ${condemnedNames(c)}. ¿Recuerdas sus caras cuando el hielo o el fuego se las llevó?`],
      ['dante', 'Hice lo que debía.'],
      ['acusador', 'Eso dijeron todos los que están aquí. Defiéndete, entonces. Como ellos no pudieron.'],
    ],
  },
  'acusador.2': {
    once: true, priority: 9,
    lines: [
      ['acusador', 'Otra vez tú. Tu lista crece. La mía también: llevo tu nombre al principio.', { mood: 'angry' }],
      { choice: [
        { t: 'Me arrepiento de algunas.', tag: 'virtue', fx: { virtue: 6 }, then: [['acusador', '¿Algunas? El arrepentimiento a medias es la moneda favorita del Mercader.']] },
        { t: 'No me arrepiento de nada.', tag: 'sin', fx: { sin: 6 }, then: [['acusador', 'Entonces ya eres uno de nosotros. Sólo falta que lo sepas.']] },
      ] },
    ],
  },
  'acusador.3': {
    priority: 8,
    lines: [
      ['acusador', (c) => `${condemnedNames(c)}. Repito sus nombres para que no se pierdan. Tú los repartiste como monedas.`, { mood: 'angry' }],
      ['acusador', 'Ven. Juzguemos al juez.'],
    ],
  },
};
