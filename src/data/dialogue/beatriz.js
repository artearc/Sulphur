// Beatrice: compassion, purity, hope. She appears in visions — in the Hub's stained glass and at the
// Fountains of Lethe — to restore and to guide. Her words are short: light does not need many.
const fate = (c, id) => c.meta.souls?.[id]?.last;

export const BEATRIZ = {
  'beatriz.vision.primera': {
    once: true, priority: 90,
    lines: [
      ['beatriz', 'Dante.'],
      ['dante', '¿Beatriz? ¿Eres tú, o otra trampa de este lugar?'],
      ['beatriz', 'Soy lo que recuerdas de mí. Y lo que todavía puedes llegar a ser.'],
      ['beatriz', 'No te pido que seas puro. Te pido que no dejes de elegir.'],
    ],
  },
  'beatriz.vision.muertes': {
    once: true, priority: 70, cond: (c) => c.deaths >= 4,
    lines: [
      ['beatriz', 'Te he visto caer muchas veces. Cada vez te levantas un poco distinto.'],
      ['dante', '¿Peor o mejor?'],
      ['beatriz', 'Más tú. Eso es lo único que le importa al Cielo.'],
    ],
  },
  'beatriz.vision.corrupto': {
    priority: 60, cond: (c) => c.tier <= -1 || (c.meta.flags.lastTier ?? 0) <= -1,
    lines: [
      ['beatriz', 'Te busco y me cuesta encontrarte, Dante. Hay tanta sombra a tu alrededor...'],
      { choice: [
        { t: 'Lo hice para llegar hasta ti.', then: [['beatriz', 'Nadie llega al Cielo pisando almas. Ni siquiera por amor.']] },
        { t: 'Perdóname.', fx: { virtue: 4 }, tag: 'virtue', then: [['beatriz', 'No necesitas mi perdón. Necesitas el tuyo. Empieza por ahí.']] },
      ] },
    ],
  },
  'beatriz.vision.virtuoso': {
    priority: 60, cond: (c) => c.tier >= 1,
    lines: [
      ['beatriz', 'Tu luz me llega hasta aquí arriba. Es pequeña y terca, como tú.'],
      ['beatriz', 'Bebe. Descansa. El camino que te queda pesa más que el que llevas.'],
    ],
  },
  'beatriz.vision.francesca': {
    once: true, priority: 65, cond: (c) => !!fate(c, 'francesca'),
    lines: [
      ['beatriz', (c) => (fate(c, 'francesca') === 'absolve' ? 'Liberaste a Francesca. Yo también te amé sin que lo supieras. Gracias por ella.' : 'Devolviste a Francesca a la tormenta. ¿Pensaste en nosotros cuando lo hiciste?')],
      ['dante', 'Pensé en ti en todo momento.'],
      ['beatriz', 'Entonces piensa también en ella. El amor que se juzga deja de ser amor.'],
    ],
  },
  'beatriz.vision.ugolino': {
    once: true, priority: 65, cond: (c) => !!fate(c, 'ugolino'),
    lines: [
      ['beatriz', 'El padre de la torre... ¿Lo miraste a los ojos?'],
      ['beatriz', (c) => (fate(c, 'ugolino') === 'absolve' ? 'Lo perdonaste. Hay misericordias que asustan al propio Cielo. Esa fue una.' : 'Lo dejaste roer. El hambre y la venganza se parecen tanto... no te culpo. Pero lloro por él.')],
    ],
  },
  'beatriz.vision.traicion': {
    once: true, priority: 75, cond: (c) => (c.circleIndex ?? -1) >= 7 || c.meta.bestCircle >= 8,
    lines: [
      ['beatriz', 'Pronto llegarás al centro. Allí espera quien eligió no amar a nadie más que a sí mismo.'],
      ['beatriz', 'Te ofrecerá algo. Siempre ofrece algo. Recuerda que la libertad también es poder decir que no.'],
    ],
  },
  'beatriz.vision.final': {
    once: true, priority: 95, cond: (c) => c.meta.endings.length > 0,
    lines: [
      ['beatriz', (c) => (c.meta.endings.includes('redencion') ? 'Llegaste a ver las estrellas. Te esperé allí, ¿lo sentiste?' : c.meta.endings.includes('caida') ? 'Te vi en el trono de hielo. Y aun así, mi luz sigue buscándote.' : 'Preguntaste quién juzga al juez. Yo tampoco tengo esa respuesta, Dante.')],
      ['beatriz', 'Baja otra vez si lo necesitas. Cada descenso es una oportunidad de elegir distinto.'],
    ],
  },
  'beatriz.vision.duda': {
    once: true, priority: 62, cond: (c) => (c.meta.flags.doubt || 0) >= 3,
    lines: [
      ['dante', 'Beatriz... ¿es justo todo esto? El fuego, el hielo, la eternidad.'],
      ['beatriz', 'No lo sé. Me enseñaron que sí. Pero me enseñaron a amarte también, y eso no está en ningún libro.'],
    ],
  },
  'beatriz.vision.generica': {
    priority: 1,
    lines: [
      ['beatriz', (c) => (c.tier >= 1 ? 'Te veo, aunque la oscuridad sea espesa. Sigue.' : c.tier <= -1 ? 'Te busco y me cuesta encontrarte, Dante. ¿Dónde te has ido?' : 'Cada alma que miras a los ojos te cambia. Deja que te cambie bien.')],
    ],
  },
  'beatriz.vision.generica2': {
    priority: 1,
    lines: [['beatriz', 'Bebe del agua del olvido sólo lo justo. Hay recuerdos que deben pesar.']],
  },
};
