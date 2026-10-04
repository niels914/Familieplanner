/** Controleert de weeknummers (ISO 8601, zoals in Nederland). */
import { formatShort, isoWeek } from '../shared/dates';
import { check, report } from './helpers';

check('3 oktober 2026 is week 40', isoWeek('2026-10-03'), 40);
check('maandag 5 oktober 2026 begint week 41', isoWeek('2026-10-05'), 41);
check('zondag sluit de week af', isoWeek('2026-10-11'), 41);
check('1 januari 2026 (donderdag) is week 1', isoWeek('2026-01-01'), 1);
check('31 december 2025 hoort bij week 1 van 2026', isoWeek('2025-12-31'), 1);
check('1 januari 2027 (vrijdag) is nog week 53 van 2026', isoWeek('2027-01-01'), 53);
check('4 januari 2027 (maandag) is week 1', isoWeek('2027-01-04'), 1);
check('1 januari 2021 (vrijdag) is week 53 van 2020', isoWeek('2021-01-01'), 53);
check('29 december 2025 is week 1 van 2026', isoWeek('2025-12-29'), 1);
check('1 januari 2024 (maandag) is week 1', isoWeek('2024-01-01'), 1);
check('29 februari 2024 is week 9', isoWeek('2024-02-29'), 9);
check('zomertijd verschuift de week niet: 25 oktober 2026', isoWeek('2026-10-25'), 43);
check('maart 2026, zomertijdwissel op zondag 29 maart', isoWeek('2026-03-29'), 13);

check('korte datum: maart is mrt', formatShort('2026-03-12'), '12 mrt');
check('korte datum: alle maanden', ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m) => formatShort(`2026-${m}-05`).split(' ')[1]).join(' '), 'jan feb mrt apr mei jun jul aug sep okt nov dec');

report('weeknummers');
