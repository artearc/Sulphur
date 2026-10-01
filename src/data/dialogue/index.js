// Dialogue registry. Each module exports an object of { id: script }.
// ID conventions (used by pickDialogue prefixes):
//   virgilio.hub.*              Hub conversations with Virgil
//   virgilio.circle.<circle>.*  When entering a circle
//   beatriz.vision.*            Visions (Hub shrine and rest rooms)
//   mercader.*                  Spectral merchant
//   interludio.<circle>.*       Interlude scene after defeating <circle>'s boss
//   secreto.*                   Secret room lore
//   acusador.*                  Accusing specter (after many condemnations)
//   lucifer.*                   Final confrontation
import { VIRGILIO } from './virgilio.js';
import { BEATRIZ } from './beatriz.js';
import { MISC } from './misc.js';
import { INTERLUDES } from './interludes.js';
import { FINALE } from './finale.js';

export const DIALOGUE = { ...VIRGILIO, ...BEATRIZ, ...MISC, ...INTERLUDES, ...FINALE };
