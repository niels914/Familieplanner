/** Controleert het onthouden van vaak gekochte dingen en de snelkeuze. */
import { bumpOften, quickPicks, type Often } from '../shared/shopping';
import { check, report } from './helpers';

const t1 = '2026-10-01T10:00:00.000Z';
const t2 = '2026-10-02T10:00:00.000Z';
const t3 = '2026-10-03T10:00:00.000Z';

let often: Often = {};
often = bumpOften(often, ['Melk', 'brood'], t1);
check('eerste keer: geteld', [often.melk.n, often.brood.n], [1, 1]);
check('de snelkeuze is nog leeg bij één keer', quickPicks(often, []), []);

often = bumpOften(often, ['melk'], t2);
check('hoofdletters maken niet uit', Object.keys(often).sort(), ['brood', 'melk']);
check('tweede keer: telt op', often.melk.n, 2);
check('de laatst getypte schrijfwijze blijft', often.melk.text, 'melk');
check('vanaf twee keer in de snelkeuze', quickPicks(often, []), ['melk']);

often = bumpOften(often, ['  Brood  ', 'Kaas'], t3);
check('spaties eromheen tellen niet mee', often.brood.n, 2);
check('het vaakst eerst, bij gelijke stand de laatst gebruikte', quickPicks(often, []), ['Brood', 'melk']);
check('wat al op de lijst staat, wordt niet aangeboden', quickPicks(often, ['MELK']), ['Brood']);
check('een limiet', quickPicks(often, [], 1), ['Brood']);
check('lege tekst telt niet', Object.keys(bumpOften(undefined, ['', '  '], t1)), []);
check('de oorspronkelijke stand is niet aangeraakt', often.kaas.n, 1);
check('zonder stand: niets', quickPicks(undefined, []), []);

// Te veel onthouden: de zeldzaamste gaan eruit.
let veel: Often = {};
for (let i = 0; i < 100; i++) veel = bumpOften(veel, [`ding ${i}`], t1);
veel = bumpOften(veel, ['favoriet', 'favoriet', 'favoriet'], t3);
check('hoogstens 80 onthouden', Object.keys(veel).length, 80);
check('de favoriet blijft', veel.favoriet?.n, 3);

report('boodschappen');
