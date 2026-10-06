/** Controleert het kiezen van tijden per vijf minuten. */
import { minuteOptions, timeParts, withHour, withMinute } from '../src/lib/time';
import { check, report } from './helpers';

check('uit elkaar', timeParts('08:30'), { hour: '08', minute: '30' });
check('een cijfer voor het uur', timeParts('8:05'), { hour: '08', minute: '05' });
check('seconden erachter negeren we', timeParts('17:45:00'), { hour: '17', minute: '45' });
check('leeg', timeParts(undefined), { hour: '', minute: '' });
check('ongeldig uur', timeParts('25:00'), { hour: '', minute: '' });
check('ongeldige minuut', timeParts('10:75'), { hour: '', minute: '' });

check('de minuten gaan per vijf', minuteOptions('30'), ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
check('twaalf keuzes', minuteOptions('').length, 12);
check('een minuut uit Google blijft zichtbaar', minuteOptions('32').includes('32'), true);
check('en staat op de goede plek', minuteOptions('32').slice(6, 9), ['30', '32', '35']);
check('00 en 59', [minuteOptions('59').at(-1), minuteOptions('59').length], ['59', 13]);

check('ander uur, minuut blijft', withHour('08:45', '14'), '14:45');
check('uur kiezen bij een leeg veld: hele minuut', withHour(undefined, '09'), '09:00');
check('uur leegmaken maakt het veld leeg', withHour('08:45', ''), '');
check('andere minuut, uur blijft', withMinute('14:45', '15'), '14:15');
check('minuut zonder uur: begint bij 08', withMinute(undefined, '30'), '08:30');
check('met een eigen beginuur', withMinute(undefined, '30', '18'), '18:30');
check('een afwijkende minuut blijft staan tot je zelf iets kiest', withHour('08:32', '09'), '09:32');

report('tijden');
