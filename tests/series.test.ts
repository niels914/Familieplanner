/** Controleert het uitrekenen van reeksdata. */
import { MAX_KEREN, seriesCount, seriesDates } from '../shared/series';
import { check, report } from './helpers';

// Zwemles op dinsdag, van 6 oktober tot en met 22 december 2026.
const wekelijks = seriesDates('2026-10-06', 1, '2026-12-22');
check('wekelijks: aantal keer', wekelijks.length, 12);
check('wekelijks: eerste keer', wekelijks[0], '2026-10-06');
check('wekelijks: laatste keer valt op de einddatum', wekelijks[wekelijks.length - 1], '2026-12-22');
check('wekelijks: elke keer op dinsdag', wekelijks.every((d) => new Date(d + 'T12:00').getDay() === 2), true);
check('telling komt overeen met de data', seriesCount('2026-10-06', 1, '2026-12-22'), 12);

// Over de wintertijd heen (25 oktober) mag geen dag verschuiven.
check('wintertijd: 27 oktober zit erin', wekelijks.includes('2026-10-27'), true);

const omDeWeek = seriesDates('2026-10-06', 2, '2026-12-22');
check('om de week: aantal keer', omDeWeek.length, 6);
check('om de week: tweede keer', omDeWeek[1], '2026-10-20');

// Einddatum die niet precies op de weekdag valt.
check('einde halverwege de week', seriesDates('2026-10-06', 1, '2026-10-19').length, 2);
check('einde vóór de start: alleen de eerste keer', seriesDates('2026-10-06', 1, '2026-10-01'), ['2026-10-06']);

// Vangnet tegen een reeks van tien jaar.
check('nooit meer dan het maximum', seriesDates('2026-01-01', 1, '2036-01-01').length, MAX_KEREN);

report('reeksen');
