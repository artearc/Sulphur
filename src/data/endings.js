// Ending texts. resolveEnding() in game/moral.js decides which one plays.
export const ENDINGS = {
  redencion: {
    title: 'Redención', color: '#ffe8a0',
    lines: [
      'Lucifer queda atrás, mordiendo eternamente a los tres traidores, sin una palabra para ti.',
      'Trepas por su pelaje helado hasta que arriba se vuelve abajo, y el centro del mundo te suelta.',
      (run) => `Absolviste a ${run.moral.absolved} almas. Cada una dejó una luz pequeña en tu camino.`,
      'Por una grieta de piedra ves de nuevo las estrellas. Más allá del mar, una montaña espera.',
      'Beatriz no está aquí todavía. Pero por primera vez, sabes que vas hacia ella.',
    ],
  },
  caida: {
    title: 'Caída', color: '#ff6a74',
    lines: [
      'El hielo cede bajo tus pies, pero no para dejarte salir.',
      (run) => `Condenaste a ${run.moral.condemned} almas. Su peso se quedó contigo, y el Infierno reconoce lo que es suyo.`,
      'Lucifer sonríe con sus tres bocas mientras tus alas se ennegrecen.',
      'Ahora eres tú quien espera en el fondo del mundo, juzgando a los que bajan.',
      'Virgilio vuelve a la Antesala solo. Esta vez, no mira atrás.',
    ],
  },
  gris: {
    title: 'Final Gris', color: '#c8c8e8',
    lines: [
      'Golpeas a Lucifer y el hielo no se rompe. Golpeas otra vez y comprendes que tampoco tú te rompes.',
      'Ni salvado ni condenado. La balanza se queda quieta, como si nadie la sostuviera.',
      (run) => `Dudaste ${run.moral.doubt} veces de la justicia que gobierna este lugar. Quizás la duda fue tu único acto libre.`,
      'Una escalera sin fin sube hacia la luz y baja hacia el fuego. Te sientas en un peldaño cualquiera.',
      'Si hay un juez, no te ha respondido. Y si no lo hay, sólo quedas tú para juzgarte.',
    ],
  },
};
