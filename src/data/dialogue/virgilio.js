// Virgil: serene mentor, classical morality, gentle irony. Reacts to deaths, choices, tier, progress.
const killed = (c, id) => (c.meta.bossKills?.[id] || 0) > 0;
const fate = (c, id) => c.meta.souls?.[id]?.last;

export const VIRGILIO = {
  // ------------------------------------------------ first meeting & deaths ------------------------------------------------
  'virgilio.hub.primera': {
    once: true, priority: 100, cond: (c) => c.runs === 0,
    lines: [
      ['virgilio', 'Despierta, Dante. La selva oscura quedó atrás; lo que tienes delante es peor.'],
      ['dante', '¿Dónde estamos?'],
      ['virgilio', 'En la Antesala. Bajo esa puerta empieza el Infierno: nueve círculos, cada uno más hondo y más justo que el anterior.'],
      ['virgilio', 'Allí abajo encontrarás almas que te pedirán algo. Podrás absolverlas o condenarlas. Ninguna elección será gratuita.'],
      { choice: [
        { t: '¿Quién soy yo para juzgarlas?', then: [['virgilio', 'Nadie. Por eso cada juicio te juzgará también a ti.']] },
        { t: 'Haré lo que sea necesario para llegar a Beatriz.', then: [['virgilio', 'Lo necesario es una palabra peligrosa en este lugar. Recuérdala cuando la uses.']] },
      ] },
      ['virgilio', 'Toma un arma del armero y desciende por la escalera. Si caes, volverás aquí. Siempre vuelves aquí.'],
    ],
  },
  'virgilio.hub.muerte1': {
    once: true, priority: 90, cond: (c) => c.deaths === 1,
    lines: [
      ['virgilio', 'Has vuelto. El Infierno no se cruza de una vez; se cruza muchas veces, hasta que uno aprende a caer.'],
      ['dante', 'Sentí... que me arrancaban algo.'],
      ['virgilio', 'Te arrancaron el oro y la prisa. Las Esencias que traes son lo único que el abismo no puede quitarte. Ofrécelas en el Altar de Virtudes.'],
    ],
  },
  'virgilio.hub.muerte3': {
    once: true, priority: 80, cond: (c) => c.deaths >= 3,
    lines: [
      ['virgilio', 'Tres veces has caído. Sísifo empujaba su piedra sin saber por qué. Tú, al menos, sabes a quién buscas.'],
      ['dante', 'Cada vez que vuelvo, el camino es distinto.'],
      ['virgilio', 'El camino no cambia, Dante. Cambias tú. El Infierno sólo es educado: se adapta a su huésped.'],
    ],
  },
  'virgilio.hub.muerte10': {
    once: true, priority: 80, cond: (c) => c.deaths >= 10,
    lines: [
      ['virgilio', 'Diez muertes. En Roma eso habría sido un mal augurio. Aquí es sólo una costumbre.'],
      ['virgilio', 'No te pido que dejes de caer. Te pido que no te acostumbres a caer.'],
    ],
  },
  'virgilio.hub.armas': {
    once: true, priority: 70, cond: (c) => c.runs >= 1 && c.meta.fragments >= 4 && c.meta.unlockedWeapons.length === 1,
    lines: [
      ['virgilio', 'Traes Fragmentos de Reliquia. En el armero hay armas que esperan a alguien que las merezca.'],
      ['virgilio', 'La guadaña siega sin preguntar; las cadenas arrastran a quien no quiere venir; la cruz ilumina desde lejos. Cada una enseña una forma de juzgar.'],
    ],
  },

  // ------------------------------------------------ bosses ------------------------------------------------
  'virgilio.hub.minos': {
    once: true, priority: 60, cond: (c) => killed(c, 'limbo'),
    lines: [['virgilio', 'Venciste a Minos. Él juzga a todos los que bajan, y por primera vez alguien le juzgó a él. Cuidado: se acordará.']],
  },
  'virgilio.hub.cerbero': {
    once: true, priority: 60, cond: (c) => killed(c, 'gula'),
    lines: [['virgilio', 'Cerbero aún ladra en sueños. Le llenaste las bocas de algo más que tierra.']],
  },
  'virgilio.hub.furias': {
    once: true, priority: 60, cond: (c) => killed(c, 'ira'),
    lines: [
      ['virgilio', 'Las Furias gritaron por Medusa y tú no miraste. Eso es más difícil de lo que parece.'],
      ['dante', 'Cerré los ojos. Como me dijiste.'],
      ['virgilio', 'No. Los abriste hacia otro lado. Es distinto. Y más sabio.'],
    ],
  },
  'virgilio.hub.minotauro': {
    once: true, priority: 60, cond: (c) => killed(c, 'violencia'),
    lines: [['virgilio', 'La bestia de Creta ya no muerde. A veces la violencia sólo necesita chocar contra un muro para recordar lo que es.']],
  },
  'virgilio.hub.gerion': {
    once: true, priority: 60, cond: (c) => killed(c, 'fraude'),
    lines: [['virgilio', 'Gerión te ofreció su espalda y tú le ofreciste tu espada. Hay invitaciones que se agradecen así.']],
  },
  'virgilio.hub.lucifer': {
    once: true, priority: 95, cond: (c) => killed(c, 'traicion'),
    lines: [
      ['virgilio', 'Viste el centro de todo, Dante. Y volviste.'],
      ['dante', '¿Por qué vuelvo siempre aquí?'],
      ['virgilio', 'Quizás porque el viaje no era para llegar. Era para elegir. Y todavía no has elegido lo mismo dos veces.'],
    ],
  },
  'virgilio.hub.final.redencion': {
    once: true, priority: 96, cond: (c) => c.meta.endings.includes('redencion'),
    lines: [
      ['virgilio', 'Viste las estrellas. Yo no puedo acompañarte más allá; en el Purgatorio me espera otro silencio.'],
      ['virgilio', 'Pero si alguna vez dudas de lo que hiciste, baja otra vez. El Infierno es el único lugar donde la duda siempre es bien recibida.'],
    ],
  },
  'virgilio.hub.final.caida': {
    once: true, priority: 96, cond: (c) => c.meta.endings.includes('caida'),
    lines: [
      ['virgilio', 'Te vi sentado en el hielo. Con alas negras. Y aun así, aquí estás.'],
      ['dante', '¿Cómo es posible?'],
      ['virgilio', 'Quizás ese trono no era el final. Quizás era otra prueba. O quizás el Infierno tampoco sabe qué hacer contigo.'],
    ],
  },
  'virgilio.hub.final.gris': {
    once: true, priority: 96, cond: (c) => c.meta.endings.includes('gris'),
    lines: [
      ['virgilio', 'Preguntaste quién juzga al juez. Llevo siglos sin atreverme a preguntarlo en voz alta.'],
      ['virgilio', 'No sé si eso te salva o te condena. Pero te hace mío, de algún modo. Un poeta pagano que duda.'],
    ],
  },

  // ------------------------------------------------ reactions to souls ------------------------------------------------
  'virgilio.hub.francesca.c': {
    once: true, priority: 50, cond: (c) => fate(c, 'francesca') === 'condemn',
    lines: [
      ['virgilio', 'Devolviste a Francesca al viento. ¿Lo hiciste por justicia, o porque te dolía verla amar?'],
      { choice: [
        { t: 'Por justicia.', fx: { flag: { francescaJustice: true } }, then: [['virgilio', 'Entonces sé justo también contigo, cuando llegue tu turno.']] },
        { t: 'No lo sé.', tag: 'doubt', fx: { doubt: 1 }, then: [['virgilio', 'Esa es la respuesta más honrada que he oído aquí abajo.']] },
      ] },
    ],
  },
  'virgilio.hub.francesca.a': {
    once: true, priority: 50, cond: (c) => fate(c, 'francesca') === 'absolve',
    lines: [['virgilio', 'Separaste a los amantes para salvar a uno. Paolo sigue gritando su nombre en la tormenta. Quería que lo supieras.']],
  },
  'virgilio.hub.ugolino': {
    once: true, priority: 55, cond: (c) => !!fate(c, 'ugolino'),
    lines: [
      ['virgilio', (c) => (fate(c, 'ugolino') === 'absolve' ? 'Perdonaste a Ugolino. Dicen que en Cocito, por un instante, se oyó llorar a un padre.' : 'Dejaste a Ugolino con su hueso. El hielo no conoce la piedad, Dante. Me temo que tú tampoco, ese día.')],
    ],
  },
  'virgilio.hub.ulises': {
    once: true, priority: 50, cond: (c) => !!fate(c, 'ulises'),
    lines: [['virgilio', 'Ulises me odia, ¿sabías? Yo canté a Eneas, el troyano. Él quemó Troya. Y sin embargo, cuando habla, hasta yo quiero seguirle mar adentro.']],
  },
  'virgilio.hub.condenas': {
    once: true, priority: 58, cond: (c) => c.condemnedTotal >= 6 && c.condemnedTotal > c.absolvedTotal * 2,
    lines: [
      ['virgilio', (c) => `${c.condemnedTotal} almas condenadas por tu mano. ¿Las recuerdas a todas?`],
      ['dante', 'Recuerdo sus caras. No sus nombres.'],
      ['virgilio', 'Ellas sí recuerdan el tuyo. Hay rumores de un espectro que va contando tus sentencias.'],
    ],
  },
  'virgilio.hub.absoluciones': {
    once: true, priority: 58, cond: (c) => c.absolvedTotal >= 6 && c.absolvedTotal > c.condemnedTotal * 2,
    lines: [
      ['virgilio', (c) => `Has absuelto a ${c.absolvedTotal} almas. Minos debe de estar furioso: le estás vaciando el reino.`],
      ['virgilio', 'Pero cuidado con la misericordia que no cuesta nada. La de verdad siempre duele un poco a quien la da.'],
    ],
  },
  'virgilio.hub.duda': {
    once: true, priority: 57, cond: (c) => (c.meta.flags.doubt || 0) >= 4,
    lines: [
      ['virgilio', 'Preguntas mucho, Dante. Por qué este castigo, por qué esta ley, quién la escribió.'],
      ['virgilio', 'Yo también pregunté, una vez. Por eso estoy en el Limbo y no en el Cielo. Ten cuidado: algunas preguntas tienen su propio círculo.'],
    ],
  },

  // ------------------------------------------------ moral state ------------------------------------------------
  'virgilio.hub.corrupto': {
    priority: 40, cond: (c) => (c.meta.flags.lastTier ?? 0) <= -1,
    lines: [
      ['virgilio', 'Tus ojos aún arden, Dante. Lo que condenaste allí abajo se quedó contigo.'],
      { choice: [
        { t: 'Era necesario para sobrevivir.', then: [['virgilio', 'Todos los que están abajo dijeron lo mismo.']] },
        { t: '¿Y si el sistema que los condena es el injusto?', tag: 'doubt', fx: { doubt: 1 }, then: [['virgilio', '...Esa pregunta también tiene su círculo, hijo. Ten cuidado de no encontrarlo.']] },
      ] },
    ],
  },
  'virgilio.hub.caido': {
    priority: 45, cond: (c) => (c.meta.flags.lastTier ?? 0) <= -2,
    lines: [
      ['virgilio', 'Hay sombras que te siguen hasta aquí, a la Antesala. Nunca había pasado.'],
      ['dante', '¿Me tienes miedo, maestro?'],
      ['virgilio', 'Tengo miedo por ti. Que no es lo mismo, aunque se parezca.'],
    ],
  },
  'virgilio.hub.virtuoso': {
    priority: 40, cond: (c) => (c.meta.flags.lastTier ?? 0) >= 1,
    lines: [
      ['virgilio', 'Una luz te sigue desde que volviste. No la apagues por miedo a ser visto.'],
      ['dante', 'Allí abajo la luz atrae a las sombras.'],
      ['virgilio', 'Y aun así, es lo único que les enseña el camino.'],
    ],
  },
  'virgilio.hub.santo': {
    priority: 45, cond: (c) => (c.meta.flags.lastTier ?? 0) >= 2,
    lines: [
      ['virgilio', 'Brillas como los que bajó Cristo del Limbo. Yo vi aquel día. No me llevaron.'],
      ['virgilio', 'No te lo digo con envidia. O no sólo con envidia.'],
    ],
  },

  // ------------------------------------------------ generic ------------------------------------------------
  'virgilio.hub.generico1': { priority: 1, lines: [['virgilio', 'El abismo no tiene prisa. Tú tampoco deberías tenerla.']] },
  'virgilio.hub.generico2': { priority: 1, lines: [['virgilio', '"Lasciate ogne speranza, voi ch\'intrate." Lo escribieron para los condenados, no para ti. Todavía.']] },
  'virgilio.hub.generico3': { priority: 1, lines: [['virgilio', 'Cada vez que desciendes, el Infierno te reconoce un poco más. No sé si eso es bueno.']] },
  'virgilio.hub.generico4': { priority: 1, lines: [['virgilio', 'Esquiva antes de que caiga el golpe, no cuando lo ves venir. El miedo llega tarde; la prudencia, antes.']] },
  'virgilio.hub.generico5': { priority: 1, lines: [['virgilio', 'Si un golpe fuerte sigue a una esquiva, el Infierno lo llama juicio. Úsalo cuando la duda te pese menos que la espada.']] },
  'virgilio.hub.generico6': { priority: 1, lines: [['virgilio', 'Beatriz me pidió que te guiara. No me pidió que te salvara. Eso te toca a ti.']] },
  'virgilio.hub.generico7': { priority: 1, lines: [['virgilio', 'Los altares de pecado dan poder rápido. Los de virtud, lento. Igual que en la vida, sólo que aquí se ve.']] },

  // ------------------------------------------------ circle intros ------------------------------------------------
  'virgilio.circle.limbo.1': {
    priority: 10,
    lines: [
      ['virgilio', 'El Limbo. Aquí habitan los que no pecaron, pero no conocieron la gracia. Yo entre ellos.'],
      ['dante', '¿Tú... perteneces a este lugar?'],
      ['virgilio', 'Pertenezco a su silencio. Avanza. Las sombras de aquí no odian; sólo confunden. Golpea lo que sangra.'],
    ],
  },
  'virgilio.circle.lujuria.1': {
    priority: 10,
    lines: [
      ['virgilio', '"La bufera infernal, che mai non resta." El torbellino que nunca descansa arrastra a los que sometieron la razón al deseo.'],
      ['virgilio', (c) => (c.tier <= -1 ? 'Cuidado: el viento busca a los que ya se dejan llevar.' : 'Cuando sientas que el viento cambia, prepárate. Te empujará donde no quieras ir.')],
    ],
  },
  'virgilio.circle.gula.1': {
    priority: 10,
    lines: [
      ['virgilio', 'Lluvia eterna, maldita, fría y pesada. Los glotones yacen en el fango como cerdos en su pocilga.'],
      ['virgilio', 'Los hinchados devoran a sus caídos y crecen. No les dejes comer.'],
    ],
  },
  'virgilio.circle.avaricia.1': {
    priority: 10,
    lines: [
      ['virgilio', 'Avaros y pródigos empujan pesos con el pecho y se gritan "¿Por qué guardas?", "¿Por qué derrochas?".'],
      ['virgilio', 'Aquí el oro está maldito. Cógelo si quieres... pero cada moneda pesa en la balanza.'],
    ],
  },
  'virgilio.circle.ira.1': {
    priority: 10,
    lines: [
      ['virgilio', 'La laguna Estigia. Arriba se muerden los iracundos; debajo del fango burbujean los que fueron tristes al sol.'],
      ['virgilio', 'Los que arden de ira estallan. Aléjate cuando empiecen a hincharse.'],
    ],
  },
  'virgilio.circle.herejia.1': {
    priority: 10,
    lines: [
      ['virgilio', 'La ciudad de Dite. Sepulcros abiertos, y en ellos arden los que dijeron que el alma muere con el cuerpo.'],
      ['dante', 'Si tenían razón, ¿quién arde?'],
      ['virgilio', (c) => ((c.meta.flags.doubt || 0) >= 2 ? 'Esa pregunta, Dante, es justo la que les trajo aquí.' : 'Sus tumbas responden mejor que yo.')],
    ],
  },
  'virgilio.circle.violencia.1': {
    priority: 10,
    lines: [
      ['virgilio', 'El Flegetonte: un río de sangre hirviente. Los violentos contra otros hierven en él; los centauros vigilan con sus arcos.'],
      ['virgilio', 'Más allá, el bosque de los suicidas y la arena ardiente. La violencia tiene muchas caras, y todas sangran.'],
    ],
  },
  'virgilio.circle.fraude.1': {
    priority: 10,
    lines: [
      ['virgilio', 'Malebolge: diez fosas de piedra para los que engañaron. Aquí nada es lo que parece.'],
      ['virgilio', 'Si un alma te pide ayuda, mírale los ojos antes de acercarte. Y no te fíes de la oscuridad: está de su parte.'],
    ],
  },
  'virgilio.circle.traicion.1': {
    priority: 10,
    lines: [
      ['virgilio', 'Cocito. El lago helado donde lloran los traidores. Sus lágrimas se congelan y les tapan los ojos.'],
      ['virgilio', (c) => (c.tier >= 1 ? 'Tu luz parece pequeña aquí. No lo es. El frío sólo quiere que lo creas.' : c.tier <= -1 ? 'Siente cómo el hielo te reconoce. No le respondas.' : 'Al fondo está él. No mires todavía.')],
      ['virgilio', 'No te detengas sobre el hielo. Quien se queda quieto aquí, se queda para siempre.'],
    ],
  },
};
