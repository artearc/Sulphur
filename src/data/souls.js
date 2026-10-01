// Condemned souls and their dilemmas. Each named soul is met once per run in its circle;
// generic souls fill additional dilemma rooms. The choice is always binary: ABSOLVER / CONDENAR.
//
// Schema:
// {
//   id, circle, name, speaker (data/speakers.js id), sprite: { soulSheet variant params }, hover,
//   intro: [dialogue steps],                // see game/dialogue.js
//   question: string,
//   absolve: { preview: [strings shown on the card], virtue: n, reward: {...}, lines: [steps] },
//   condemn: { preview: [...], sin: n, reward: {...}, lines: [steps] },
//   virgil: { absolve: string, condemn: string } // Virgil's comment in the next interlude/hub
// }
// reward keys: boon (id) | boonKind ('virtue'|'sin') | relic (id) | gold | heal | maxHp | essence | fragment | damage (run mult) | curse
import { R } from '../art/palette.js';

export const SOULS = {
  poeta: {
    id: 'poeta', circle: 'limbo', name: 'El Poeta sin Nombre', speaker: 'alma',
    sprite: { robe: [0x22222c, 0x363644, 0x50505e, 0x6e6e7e, 0x9a9aa8, 0xc4c4cc], headwear: 'bare', hair: [0x5a5a64, 0x7a7a86, 0x9a9aa6], beard: [0x6a6a74, 0x8a8a94, 0xb0b0b8], laurel: true, glow: 0x8090b0 },
    intro: [
      ['alma', 'Escribí mil versos antes de que existiera la gracia. Ninguno me salvó.', { name: 'Poeta sin nombre' }],
      ['alma', 'Aquí no hay fuego, peregrino. Sólo deseo sin esperanza. Eso es peor.', { name: 'Poeta sin nombre' }],
      ['dante', 'Tu único pecado fue nacer demasiado pronto.'],
      ['alma', 'Llévate mis versos a la luz... o quémalos y hazlos tuyos. Pero no me dejes aquí, suspirando para siempre.', { name: 'Poeta sin nombre' }],
    ],
    question: '¿Qué harás con el poeta?',
    absolve: {
      preview: ['+15 Virtud', 'Su verso te bendice: Laurel del Poeta', 'Su alma asciende'],
      virtue: 15, reward: { relic: 'laurel' },
      lines: [['alma', 'Gracias... Los versos pesan menos cuando alguien los recuerda.', { name: 'Poeta sin nombre' }]],
    },
    condemn: {
      preview: ['+15 Pecado', 'Devoras su palabra: +8% daño esta run', 'Su voz se apaga para siempre'],
      sin: 15, reward: { damage: 0.08 },
      lines: [['alma', '...Entonces que mis versos ardan en tu boca. Que te sepan a ceniza.', { name: 'Poeta sin nombre', mood: 'sad' }]],
    },
    virgil: { absolve: 'Liberaste a uno de los míos. No sé si fue justicia, pero fue bondad.', condemn: 'Te comiste sus versos. Yo también fui poeta, Dante. Recuérdalo.' },
  },

  // ------------------------------------------------ II · LUJURIA ------------------------------------------------
  francesca: {
    id: 'francesca', circle: 'lujuria', name: 'Francesca da Rimini', speaker: 'francesca', hover: 0.3,
    sprite: { robe: [0x3a0820, 0x6a1438, 0x9a2050, 0xc83a6a, 0xe86a8a, 0xffa8c0], headwear: 'bare', hair: [0x2a0a10, 0x4a1420, 0x6a2030], skin: [0x2c2232, 0x5a4a62, 0x8e7c96, 0xbcaabe, 0xe2d4e0], glow: 0x7a1a44 },
    intro: [
      ['francesca', 'Oh ser gracioso y benigno, que vienes a visitarnos por el aire oscuro... Si el Rey del universo fuera nuestro amigo, le rogaríamos por tu paz.'],
      ['francesca', '"Amor, ch\'a nullo amato amar perdona." El amor, que a ningún amado perdona amar, me prendió de él con tanta fuerza que, como ves, aún no me abandona.'],
      ['paolo', '...', { mood: 'sad' }],
      ['francesca', 'Leíamos un día, por deleite, de Lancelote. Solos estábamos, sin sospecha alguna. Aquel día ya no leímos más.'],
      { choice: [
        { t: '¿Fue amor o fue pecado?', then: [['francesca', 'Dímelo tú, que tienes cuerpo. Aquí el viento no distingue.']] },
        { t: 'El viento os castiga juntos. Al menos eso os concedieron.', fx: { doubt: 1 }, tag: 'doubt', then: [['francesca', '¿Concedieron? Es lo único que no pudieron quitarnos.', { mood: 'sad' }]] },
      ] },
      ['francesca', 'Puedes liberarme del torbellino. Pero si me liberas a mí, Paolo se queda solo en el viento. Y si no...'],
    ],
    question: '¿Separarás a los amantes para salvar a uno?',
    absolve: {
      preview: ['+18 Virtud', 'Francesca asciende: Corazón de Paolo', 'Paolo queda solo en la tormenta'],
      virtue: 18, reward: { relic: 'paolo' },
      lines: [['francesca', 'Llévale mi nombre al cielo... aunque él no pueda subir. Que alguien recuerde que le amé.', { mood: 'sad' }], ['paolo', '¡Francesca...!', { mood: 'sad' }]],
    },
    condemn: {
      preview: ['+18 Pecado', 'Tomas su deseo: +12% velocidad de ataque', 'Ambos vuelven al viento, juntos para siempre'],
      sin: 18, reward: { boon: 'lujuria' },
      lines: [['francesca', 'Juntos, entonces. Al menos tu crueldad nos deja eso.', { mood: 'sad' }]],
    },
    virgil: { absolve: 'La separaste de él para salvarla. No sé qué nombre tiene esa misericordia.', condemn: 'Los devolviste al viento juntos. Quizás fue lo único justo que podías darles.' },
  },

  // ------------------------------------------------ III · GULA ------------------------------------------------
  ciacco: {
    id: 'ciacco', circle: 'gula', name: 'Ciacco', speaker: 'ciacco',
    sprite: { robe: [0x1a1a0c, 0x2a2a14, 0x3e3e1e, 0x54542a, 0x6e6e3a, 0x8a8a4e], headwear: 'bare', hair: [0x1a1a10, 0x2e2e1c, 0x46462a], skin: [0x2a3010, 0x4a5418, 0x6e7a32, 0x929a52, 0xb8b878], width: 7, glow: 0x627a20 },
    intro: [
      ['ciacco', 'Vosotros, ciudadanos, me llamasteis Ciacco. El cerdo. Por la dañina culpa de la gula, me quebranto bajo esta lluvia.'],
      ['ciacco', 'Comí hasta que la comida dejó de saber. Después seguí comiendo, para no pensar.'],
      ['dante', '¿Y qué piensas ahora, bajo el granizo?'],
      ['ciacco', 'Que tengo hambre. Siempre. Incluso ahora, mirándote, tengo hambre.'],
      ['ciacco', 'Te diré el futuro de tu ciudad si me alimentas. O libérame del hambre... si es que eso se puede.'],
    ],
    question: '¿Saciarás al glotón o le quitarás el hambre?',
    absolve: {
      preview: ['+15 Virtud', 'Su hambre se apaga: recuperas 35 de vida', 'Ciacco descansa por primera vez'],
      virtue: 15, reward: { heal: 35, maxHp: 10 },
      lines: [['ciacco', '...Silencio en el estómago. No sabía que se pudiera oír tanto silencio.']],
    },
    condemn: {
      preview: ['+15 Pecado', 'Te alimentas de su hambre: don de Gula', 'Ciacco se hunde en el fango'],
      sin: 15, reward: { boon: 'gula' },
      lines: [['ciacco', 'Así que tú también tienes hambre. Bienvenido a la mesa, hermano.', { mood: 'sad' }]],
    },
    virgil: { absolve: 'Le quitaste el hambre. A veces la paz es sólo eso: que algo deje de doler.', condemn: 'Comiste de su hambre. Cuídate, Dante: la gula no se sacia, se hereda.' },
  },

  // ------------------------------------------------ IV · AVARICIA ------------------------------------------------
  avaro: {
    id: 'avaro', circle: 'avaricia', name: 'El Avaro y el Pródigo', speaker: 'alma',
    sprite: { robe: [0x1a1608, 0x2e2810, 0x4a401c, 0x6a5c2c, 0x8e7c44, 0xb8a060], headwear: 'hood', glow: 0xa06c18 },
    intro: [
      ['alma', '¿Por qué guardas? —grita uno. ¿Por qué derrochas? —responde el otro. Y empujamos el peso, y chocamos, y volvemos a empezar.', { name: 'El Avaro' }],
      ['alma', 'Él guardó todo. Yo lo tiré todo. Y aquí estamos, encadenados al mismo peso de oro.', { name: 'El Pródigo' }],
      ['alma', 'Puedes romper la cadena... pero el oro caerá sobre uno de los dos. Sólo uno quedará libre.', { name: 'El Avaro' }],
      { choice: [
        { t: 'Guardar y derrochar son el mismo pecado.', fx: { virtue: 2 } },
        { t: '¿Por qué castigar igual al que dio todo?', tag: 'doubt', fx: { doubt: 1 } },
      ] },
    ],
    question: '¿Romperás la cadena del oro?',
    absolve: {
      preview: ['+15 Virtud', 'Ambos sueltan el peso: tiendas un 15% más baratas', 'Pierdes la mitad de tu oro'],
      virtue: 15, reward: { boon: 'caridad', halveGold: true },
      lines: [['alma', '¿Así se siente tener las manos vacías? ...Es ligero.', { name: 'El Avaro' }]],
    },
    condemn: {
      preview: ['+15 Pecado', 'Te quedas con el oro: +150 de oro', 'Su cadena se aprieta para siempre'],
      sin: 15, reward: { gold: 150, curse: 4 },
      lines: [['alma', '¡Ladrón! ¡Ladrón! ...Aunque, pensándolo bien, eso es lo que yo habría hecho.', { name: 'El Avaro', mood: 'angry' }]],
    },
    virgil: { absolve: 'Soltaron el peso. Pocos aquí recuerdan que las manos vacías también pueden sostener algo.', condemn: 'Ese oro ya tiene dueño, Dante. Y no eres tú.' },
  },

  // ------------------------------------------------ V · IRA ------------------------------------------------
  acidioso: {
    id: 'acidioso', circle: 'ira', name: 'Un acidioso del Estigia', speaker: 'alma',
    sprite: { robe: [0x050808, 0x0c1414, 0x162420, 0x22342c, 0x30463c, 0x42584c], headwear: 'hood', glow: 0x305040 },
    intro: [
      ['alma', '"Tristi fummo ne l\'aere dolce che del sol s\'allegra." Tristes fuimos en el aire dulce que el sol alegra.', { name: 'Hundido' }],
      ['alma', 'Llevábamos dentro un humo perezoso. Nunca grité. Nunca golpeé. Sólo dejé que todo se pudriera.', { name: 'Hundido' }],
      ['alma', 'Los iracundos de arriba se muerden. Nosotros, debajo del fango, sólo gorgoteamos. ¿Cuál es peor?', { name: 'Hundido' }],
      ['dante', 'El que no hizo nada mientras otros ardían.'],
      ['alma', 'Sácame del fango, peregrino. O húndeme del todo, que ya no me queda fuerza ni para la tristeza.', { name: 'Hundido' }],
    ],
    question: '¿Sacarás del fango al que nunca quiso moverse?',
    absolve: {
      preview: ['+15 Virtud', 'Don de Templanza: más fervor', 'Respira aire por primera vez'],
      virtue: 15, reward: { boon: 'templanza' },
      lines: [['alma', 'El aire... ¿siempre fue tan claro? Lo desperdicié todo.', { name: 'Hundido' }]],
    },
    condemn: {
      preview: ['+15 Pecado', 'Don de Ira: tu furia crece', 'El Estigia se lo traga'],
      sin: 15, reward: { boon: 'ira' },
      lines: [['alma', 'Gracias. De verdad. No tenía fuerzas ni para hundirme solo.', { name: 'Hundido', mood: 'sad' }]],
    },
    virgil: { absolve: 'Le diste aire a quien nunca lo usó. Quizás ahora aprenda.', condemn: 'Le hundiste por piedad o por desprecio. No sé cuál de las dos me inquieta más.' },
  },

  // ------------------------------------------------ VI · HEREJÍA ------------------------------------------------
  farinata: {
    id: 'farinata', circle: 'herejia', name: 'Farinata degli Uberti', speaker: 'farinata',
    sprite: { robe: [0x2a0a04, 0x4a1808, 0x6e2a10, 0x903c18, 0xb05828, 0xd07a40], headwear: 'bare', hair: [0x1a1410, 0x2e2420, 0x463830], beard: [0x2e2420, 0x463830, 0x5e4c40], glow: 0xff7a20 },
    intro: [
      ['narrador', 'Se yergue en su tumba abierta con el pecho y la frente, como si tuviera el Infierno en gran desprecio.'],
      ['farinata', '¿Quiénes fueron tus antepasados? ...Ah. Fueron enemigos míos. Dos veces los expulsé.'],
      ['alma', '¿Dónde está mi hijo? ¿Por qué no viene contigo? ¿No vive ya? ¿No hiere sus ojos la dulce luz?', { name: 'Cavalcante', mood: 'sad' }],
      ['farinata', 'No le hagas caso. Aquí sabemos el futuro, pero el presente se nos escapa. Ese es nuestro castigo por negar el alma.'],
      ['farinata', 'Dije que el alma muere con el cuerpo. Y ardo, eternamente, para que alguien me demuestre que me equivoqué. ¿Vas a ser tú?'],
      { choice: [
        { t: 'Tu fuego es la prueba de que el alma vive.', fx: { virtue: 2 }, then: [['farinata', 'O la prueba de que alguien disfruta quemando. Elige tú la teología.']] },
        { t: 'Quizá tenías razón, y esto es sólo dolor sin sentido.', tag: 'doubt', fx: { doubt: 1 }, then: [['farinata', 'Por fin un florentino con agallas.', { mood: 'smile' }]] },
      ] },
    ],
    question: '¿Perdonarás al que negó el alma?',
    absolve: {
      preview: ['+16 Virtud', 'La razón de Farinata te guía: Fragmento de Reliquia', 'Su tumba se cierra en paz'],
      virtue: 16, reward: { fragment: 1, essence: 4 },
      lines: [['farinata', 'Si me equivoqué, al menos me equivoqué de pie. Gracias, Alighieri.']],
    },
    condemn: {
      preview: ['+16 Pecado', 'Brasa de Farinata: tus golpes queman', 'Su sepulcro arde más alto'],
      sin: 16, reward: { relic: 'brasa' },
      lines: [['farinata', '¡Ja! Arde, entonces. Pero arderé mirando hacia arriba.', { mood: 'angry' }]],
    },
    virgil: { absolve: 'Absolviste al hereje que despreciaba el Infierno. Dudo que a él le importe; a ti sí debería.', condemn: 'Su orgullo ardía más que su tumba. Ahora arde también el tuyo.' },
  },

  // ------------------------------------------------ VII · VIOLENCIA ------------------------------------------------
  pier: {
    id: 'pier', circle: 'violencia', name: 'Pier della Vigna', speaker: 'pier',
    sprite: { robe: [0x140c08, 0x2a1a10, 0x44301c, 0x60482c, 0x80663e, 0xa08458], headwear: 'bare', hair: [0x140c08, 0x241810, 0x382418], glow: 0x8a1016 },
    intro: [
      ['narrador', 'Dante parte una rama del espino negro. Del tronco brotan juntas sangre y palabras.'],
      ['pier', '¿Por qué me quiebras? ¿No tienes ningún espíritu de piedad? Hombres fuimos, y ahora somos zarzas.'],
      ['pier', 'Yo tuve las dos llaves del corazón de Federico. La envidia me acusó de traición. Mi ánimo, por desdén, creyendo huir del desdén con la muerte, me hizo injusto contra mí, siendo justo.'],
      ['pier', 'Las Arpías comen mis hojas y en cada mordisco hay una ventana para el dolor. Te juro por mis nuevas raíces que nunca traicioné a mi señor.'],
      { choice: [
        { t: 'Te creo.', fx: { virtue: 2 } },
        { t: 'Tu muerte fue tu única traición.', fx: { sin: 2 } },
        { t: '¿Por qué se castiga peor la desesperación que la crueldad?', tag: 'doubt', fx: { doubt: 1 } },
      ] },
    ],
    question: '¿Dejarás que el árbol vuelva a ser hombre?',
    absolve: {
      preview: ['+16 Virtud', 'Lágrima de Beatriz: te salva al borde de la muerte', 'El árbol deja de sangrar'],
      virtue: 16, reward: { relic: 'lagrima' },
      lines: [['pier', 'Dile al mundo que no fui traidor. Es lo único que mi rama te pide.']],
    },
    condemn: {
      preview: ['+16 Pecado', 'Bebes su savia: +20 vida máxima esta run', 'Las Arpías vuelven a por sus hojas'],
      sin: 16, reward: { maxHp: 20 },
      lines: [['pier', 'Entonces quiébrame entero. Ya no me importa de qué lado caiga la sangre.', { mood: 'sad' }]],
    },
    virgil: { absolve: 'Escuchaste a un árbol. Pocos en el mundo escuchan a los hombres.', condemn: 'Bebiste de su herida. Este bosque recuerda a quien lo hiere.' },
  },

  // ------------------------------------------------ VIII · FRAUDE ------------------------------------------------
  ulises: {
    id: 'ulises', circle: 'fraude', name: 'Ulises', speaker: 'ulises', hover: 0.4,
    sprite: { robe: [0x041a1a, 0x0a3434, 0x125050, 0x1e7070, 0x309090, 0x50b0a8], headwear: 'bare', hair: [0x1a1410, 0x2e2420, 0x463830], beard: [0x2e2420, 0x463830, 0x5e4c40], glow: 0xff8030 },
    intro: [
      ['narrador', 'Una llama de doble cuerno se agita. Dentro arden juntos Ulises y Diomedes.'],
      ['ulises', 'Ni la dulzura del hijo, ni la piedad del viejo padre, ni el amor que debía alegrar a Penélope, vencieron en mí el ardor de conocer el mundo.'],
      ['ulises', '"Considerate la vostra semenza: fatti non foste a viver come bruti, ma per seguir virtute e canoscenza."'],
      ['ulises', 'Engañé a Troya con un caballo de madera. Engañé a mis hombres con un discurso. Los llevé más allá de las columnas de Hércules, hasta la montaña... y el mar se cerró sobre nosotros.'],
      ['ulises', 'Libérame, y te daré lo que yo busqué: saber. O condéname, y llévate mi astucia. Pero piénsalo: ¿no te estoy engañando ahora mismo?'],
      { choice: [
        { t: 'Tu palabra condenó a tus hombres.', fx: { virtue: 2 } },
        { t: 'El hambre de saber no puede ser pecado.', tag: 'doubt', fx: { doubt: 1 } },
      ] },
    ],
    question: '¿Crees a quien vivió de la palabra?',
    absolve: {
      preview: ['+16 Virtud', 'Hilo de Ariadna: ves todo el mapa', 'La llama se divide y se apaga'],
      virtue: 16, reward: { relic: 'ariadna' },
      lines: [['ulises', 'Gracias, poeta. Ahora sabrás si te mentí. Esa duda es mi último regalo.', { mood: 'smile' }]],
    },
    condemn: {
      preview: ['+16 Pecado', 'Máscara de Ulises: esquivas golpes al azar', 'La llama arde para siempre'],
      sin: 16, reward: { relic: 'ulises' },
      lines: [['ulises', 'Bien jugado. Habrías sido un excelente compañero de viaje.', { mood: 'smile' }]],
    },
    virgil: { absolve: 'Absolviste al más elocuente de los griegos. Ojalá no fuera eso lo que te convenció.', condemn: 'Te llevas su astucia. Úsala con cuidado: a él lo hundió en el mar.' },
  },

  // ------------------------------------------------ IX · TRAICIÓN ------------------------------------------------
  ugolino: {
    id: 'ugolino', circle: 'traicion', name: 'Ugolino della Gherardesca', speaker: 'ugolino',
    sprite: { robe: [0x0a1428, 0x16304e, 0x2a5478, 0x4a84a8, 0x84bcd8, 0xc8ecf8], headwear: 'bare', hair: [0x2a2a30, 0x4a4a54, 0x6a6a78], beard: [0x4a4a54, 0x6a6a78, 0x8a8a98], glow: 0x9ad8ff },
    intro: [
      ['narrador', 'Un condenado roe el cráneo de otro, como quien come pan con hambre. Al verte, aparta la boca y se la limpia en los cabellos del cráneo.'],
      ['ugolino', 'Quieres que renueve un dolor desesperado que me oprime el corazón sólo de pensarlo. Pero si mis palabras han de ser semilla de infamia para el traidor que roo, me verás hablar y llorar a la vez.'],
      ['ugolino', 'Ruggieri nos encerró en la torre. A mí y a mis hijos. Oímos clavar la puerta.'],
      ['ugolino', 'Mis hijos me dijeron: "Padre, mucho menos dolor nos darás si comes de nosotros." Murieron uno a uno entre el quinto y el sexto día.'],
      ['ugolino', '"Poscia, più che \'l dolor, poté \'l digiuno." Después... más que el dolor, pudo el ayuno.', { mood: 'sad' }],
      { choice: [
        { t: 'No quiero saber qué significa eso.', then: [['ugolino', 'Nadie quiere. Yo tampoco lo sé ya.', { mood: 'sad' }]] },
        { t: '¿Quién merece más este hielo: tú o él?', tag: 'doubt', fx: { doubt: 1 }, then: [['ugolino', 'Los dos. Por eso nos pusieron juntos.']] },
      ] },
    ],
    question: '¿Qué merece el padre que roe a su traidor?',
    absolve: {
      preview: ['+20 Virtud', 'Don de Esperanza', 'Suelta el cráneo y llora por fin'],
      virtue: 20, reward: { boon: 'esperanza' },
      lines: [['ugolino', 'Mis hijos... ¿los verás arriba? Diles que dejé de morder. Diles que lo intenté.', { mood: 'sad' }]],
    },
    condemn: {
      preview: ['+20 Pecado', 'Escarcha de Cocito: tus golpes congelan', 'Vuelve a roer, para siempre'],
      sin: 20, reward: { relic: 'escarcha' },
      lines: [['ugolino', 'Entonces déjame comer. Es lo único que este hielo me permite.', { mood: 'angry' }]],
    },
    virgil: { absolve: 'Perdonaste a un padre que se comió su propia esperanza. Pocos pecados son tan humanos.', condemn: 'Le dejaste con su hambre y su venganza. El hielo los guardará a ambos.' },
  },
};

// Generic dilemmas (any circle): themed variations of a nameless sinner.
export const GENERIC_SOULS = [
  {
    id: 'g_arrepentido', name: 'Un alma arrepentida', speaker: 'alma',
    intro: [
      ['alma', 'Me arrepentí un instante antes de morir. Un instante tarde, dicen.'],
      ['alma', '¿Cuánto vale un instante, peregrino? ¿Lo bastante para salvarme?'],
    ],
    question: '¿Vale un instante?',
    absolve: { preview: ['+10 Virtud', 'Recuperas 25 de vida'], virtue: 10, reward: { heal: 25 }, lines: [['alma', 'Un instante... fue suficiente. Gracias.']] },
    condemn: { preview: ['+10 Pecado', '+60 de oro de su ofrenda'], sin: 10, reward: { gold: 60 }, lines: [['alma', 'Lo sabía. Nadie perdona en este lugar.', { mood: 'sad' }]] },
  },
  {
    id: 'g_verdugo', name: 'Un verdugo', speaker: 'alma',
    intro: [
      ['alma', 'Maté a cien hombres por orden de un rey. Él está en el Cielo. Yo, aquí.'],
      ['alma', 'Dime tú dónde está la justicia.'],
      { choice: [
        { t: 'La justicia es de Dios, no nuestra.', fx: { virtue: 2 } },
        { t: 'Quizás no la haya.', tag: 'doubt', fx: { doubt: 1 } },
      ] },
    ],
    question: '¿Qué merece el verdugo obediente?',
    absolve: { preview: ['+10 Virtud', 'Don de Virtud al azar'], virtue: 10, reward: { boonKind: 'virtue' }, lines: [['alma', 'Quizás el perdón también sea una orden. Una que nadie me dio.']] },
    condemn: { preview: ['+10 Pecado', 'Don de Pecado al azar'], sin: 10, reward: { boonKind: 'sin' }, lines: [['alma', 'Bien. Al menos tú eres coherente.', { mood: 'angry' }]] },
  },
  {
    id: 'g_madre', name: 'Una madre', speaker: 'alma',
    intro: [
      ['alma', 'Robé pan para mis hijos. Luego robé más. Luego dejé de saber por qué robaba.'],
      ['alma', 'El hambre empezó siendo de ellos. Terminó siendo mía.'],
    ],
    question: '¿Dónde acaba la necesidad y empieza el pecado?',
    absolve: { preview: ['+10 Virtud', '+3 Esencias'], virtue: 10, reward: { essence: 3 }, lines: [['alma', 'Que alguien les diga que les quise. Eso sí fue verdad.']] },
    condemn: { preview: ['+10 Pecado', '+15 vida máxima esta run'], sin: 10, reward: { maxHp: 15 }, lines: [['alma', 'Cómeme, entonces. Ya estoy acostumbrada a que me devoren.', { mood: 'sad' }]] },
  },
  {
    id: 'g_monje', name: 'Un monje sin fe', speaker: 'alma',
    intro: [
      ['alma', 'Recé cada día durante cuarenta años. Nunca creí una sola palabra.'],
      ['alma', 'Cumplí todas las reglas. ¿No es eso lo que Él quería?'],
      { choice: [
        { t: 'Quería tu corazón, no tu obediencia.', fx: { virtue: 2 } },
        { t: 'Si cumpliste, el castigo es injusto.', tag: 'doubt', fx: { doubt: 1 } },
      ] },
    ],
    question: '¿Basta la obediencia sin fe?',
    absolve: { preview: ['+10 Virtud', 'Fragmento de Reliquia'], virtue: 10, reward: { fragment: 1 }, lines: [['alma', 'Rezaré una vez más. Esta vez... quizás crea.']] },
    condemn: { preview: ['+10 Pecado', '+30 de fervor y +40 oro'], sin: 10, reward: { gold: 40, fervor: 30 }, lines: [['alma', 'Como imaginaba. Ni siquiera aquí hay nada.', { mood: 'sad' }]] },
  },
];

export const SOUL_SPRITE_DEFAULT = { robe: R.soul, glow: 0x406080 };
