// Interludes between circles (keyed by the circle just completed). Each holds one extra decision.
export const INTERLUDES = {
  'interludio.limbo.1': {
    priority: 1,
    lines: [
      ['caronte', '¡Ay de vosotras, almas perversas! No esperéis nunca ver el cielo.', { mood: 'angry' }],
      ['caronte', 'Y tú, alma viva, apártate de los muertos. Por otra vía, por otros puertos llegarás a la playa: no por aquí.'],
      ['virgilio', 'Caronte, no te enfades: así se quiere allí donde se puede lo que se quiere. Y no preguntes más.'],
      ['caronte', '...Un óbolo, entonces. Nadie cruza gratis. Ni siquiera los que traen poetas.'],
      { choice: [
        { t: 'Pagarle con mi oro (40).', cond: (c) => (c.run?.gold || 0) >= 40, fx: (c) => { c.run.gold -= 40; c.run.moral.add('virtue', 4, 'caronte'); c.game.ui.toast('Pagas al barquero · +4 Virtud', 'virtue'); }, then: [['caronte', 'Hum. Un vivo que paga. Sube.']] },
        { t: 'Amenazarle con la espada.', tag: 'sin', fx: { sin: 5, gold: 30 }, then: [['caronte', 'Tus ojos... ya tienen algo de este río. Sube, y llévate esto: lo dejó el último valiente.', { mood: 'angry' }]] },
        { t: '¿Quién paga por los que no tienen nada?', tag: 'doubt', fx: { doubt: 1 }, then: [['caronte', 'Nadie. Por eso esperan en la orilla para siempre. Sube, filósofo.']] },
      ] },
    ],
  },
  'interludio.lujuria.1': {
    priority: 1,
    lines: [
      ['virgilio', 'Has cruzado el viento. Pocos lo hacen sin perder algo por el camino.'],
      ['dante', 'Todavía oigo sus voces. Los amantes.'],
      ['virgilio', 'Una de ellas quiere hablarte. Ha bajado hasta aquí, contra el viento, sólo para eso.'],
      ['alma', 'Llevaba una carta para mi amado. Nunca se la di. Si la lees, me quedaré en paz... pero sabrás lo que nadie debía saber.', { name: 'Una amante' }],
      { choice: [
        { t: 'Leer la carta en voz baja, para ella.', tag: 'virtue', fx: { virtue: 6, heal: 15 }, then: [['alma', 'Así sonaba... Así sonaba lo que sentía. Gracias.', { name: 'Una amante' }]] },
        { t: 'Quemar la carta sin leerla.', tag: 'sin', fx: { sin: 5, essence: 3 }, then: [['alma', '...Entonces nadie sabrá nunca que le amé. Quizá sea mejor así.', { name: 'Una amante', mood: 'sad' }]] },
      ] },
    ],
  },
  'interludio.gula.1': {
    priority: 1,
    lines: [
      ['virgilio', 'La lluvia de la gula queda atrás. Más abajo, Pluto cloquea sobre sus montañas de oro.'],
      ['virgilio', 'Mira: un banquete abandonado en la orilla. Nadie lo vigila.'],
      { choice: [
        { t: 'Comer. Llevo días sin probar bocado.', tag: 'sin', fx: (c) => { c.run.moral.add('sin', 4, 'banquete'); c.player?.heal(40); c.game.ui.toast('El banquete te sacia · +4 Pecado', 'sin'); } },
        { t: 'Dejarlo para los condenados que lo miran.', tag: 'virtue', fx: { virtue: 5, fragment: 1 } },
      ] },
      ['virgilio', (c) => (c.tier <= -1 ? 'Comes como ellos, Dante. Recuérdalo cuando bajes.' : 'La renuncia también alimenta. Distinto, pero alimenta.')],
    ],
  },
  'interludio.avaricia.1': {
    priority: 1,
    lines: [
      ['flegias', '¡Ya estás aquí, alma maldita!', { mood: 'angry' }],
      ['virgilio', 'Flegias, Flegias, gritas en vano esta vez. Sólo nos tendrás mientras crucemos el fango.'],
      ['flegias', 'Mi barca se hunde bajo el peso del vivo. Cada palmo que bajamos, el Estigia cobra algo.', { mood: 'angry' }],
      { choice: [
        { t: 'Arrojar oro por la borda para aligerarla (la mitad).', tag: 'virtue', fx: (c) => { const g = Math.floor(c.run.gold / 2); c.run.gold -= g; c.run.moral.add('virtue', 6, 'flegias'); c.game.ui.toast(`Arrojas ${g} de oro · +6 Virtud`, 'virtue'); } },
        { t: 'Empujar a un alma del fango para hacer sitio.', tag: 'sin', fx: { sin: 7, essence: 4 }, then: [['flegias', 'Ja. Te va a gustar la ciudad de Dite.', { mood: 'smile' }]] },
      ] },
    ],
  },
  'interludio.ira.1': {
    priority: 1,
    lines: [
      ['flegias', 'Las Furias han caído. Nunca creí que vería cerradas sus bocas.'],
      ['alma', '¡Ese es Filippo Argenti! ¡A por él!', { name: 'Voces del fango' }],
      ['virgilio', 'Un florentino iracundo se aferra a la barca. Te reconoce. Quiere arrastrarte con él.'],
      { choice: [
        { t: 'Apartarle con la mano, sin odio.', tag: 'virtue', fx: { virtue: 5 }, then: [['virgilio', 'Bien. La ira no se apaga con más ira.']] },
        { t: 'Alegrarte de verle hundido.', tag: 'sin', fx: { sin: 5, gold: 40 }, then: [['virgilio', 'Bendita sea la que te concibió... dije una vez. Hoy no estoy tan seguro de decirlo.']] },
      ] },
    ],
  },
  'interludio.herejia.1': {
    priority: 1,
    lines: [
      ['virgilio', 'Los sepulcros quedan atrás. Ante nosotros, un precipicio. Abajo huele a sangre caliente.'],
      ['virgilio', 'Antes de bajar, una pregunta que Farinata me dejó para ti: "¿El alma vive porque arde, o arde porque vive?"'],
      { choice: [
        { t: 'Vive porque ama.', tag: 'virtue', fx: { virtue: 5 } },
        { t: 'Arde porque alguien quiere que arda.', tag: 'doubt', fx: { doubt: 1, essence: 2 } },
        { t: 'Me da igual. Que ardan.', tag: 'sin', fx: { sin: 5 } },
      ] },
      ['virgilio', 'Guardaré tu respuesta. Las respuestas, aquí, también son equipaje.'],
    ],
  },
  'interludio.violencia.1': {
    priority: 1,
    lines: [
      ['virgilio', 'Ahora escucha: necesitamos que algo suba desde el abismo. Dame la cuerda que llevas a la cintura.'],
      ['dante', 'Con ella quise atrapar a la lonza de piel manchada, al principio de todo.'],
      ['virgilio', 'Por eso mismo. Arrójala al vacío. Lo que suba será nuestro transporte... y nuestro enemigo.'],
      { choice: [
        { t: 'Arrojar la cuerda.', tag: 'virtue', fx: { virtue: 4 }, then: [['narrador', 'La cuerda cae en la oscuridad. Algo enorme, con cara de hombre justo, empieza a subir.']] },
        { t: 'Guardarla. No me fío de lo que suba.', tag: 'doubt', fx: { doubt: 1, runFlag: { keptCord: true } }, then: [['virgilio', 'Prudente. O cobarde. En Malebolge sabrás cuál de las dos.']] },
      ] },
    ],
  },
  'interludio.fraude.1': {
    priority: 1,
    lines: [
      ['virgilio', 'Los gigantes rodean el pozo, hundidos hasta la cintura. Anteo, el único sin cadenas, puede bajarnos.'],
      ['virgilio', '"Raphèl maì amècche zabì almi", grita Nimrod. Su lengua ya no significa nada; así castigan la soberbia.'],
      ['virgilio', 'Anteo nos bajará en su palma si le prometemos fama en el mundo. ¿Mentimos al gigante, Dante?'],
      { choice: [
        { t: 'No. Le prometo sólo lo que puedo cumplir: escribir su nombre.', tag: 'virtue', fx: { virtue: 6 } },
        { t: 'Sí. Es un monstruo; no merece la verdad.', tag: 'sin', fx: { sin: 6, essence: 3 }, then: [['virgilio', 'Acabamos de salir del círculo del fraude, Dante...']] },
      ] },
      ['virgilio', 'Abajo está Cocito. Abrígate el alma: el cuerpo ya no te servirá de nada.'],
    ],
  },
};
