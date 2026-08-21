/** Controleert de iCalendar-parser op de dingen die in een schoolagenda voorkomen. */
import { parseIcs } from '../netlify/lib/ics';
import { check, report } from './helpers';

const sample = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:evt-1@parro',
  'DTSTART;VALUE=DATE:20260903',
  'DTEND;VALUE=DATE:20260904',
  'SUMMARY:Startgesprekken groep 1/2',
  'DESCRIPTION:Neem het schriftje mee\\, en denk aan de foto.',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:evt-2@parro',
  'DTSTART;VALUE=DATE:20261019',
  'DTEND;VALUE=DATE:20261026',
  'SUMMARY:Herfstvakantie',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:evt-3@parro',
  'DTSTART;TZID=Europe/Amsterdam:20260910T083000',
  'DTEND;TZID=Europe/Amsterdam:20260910T093000',
  'SUMMARY:Luizencontrole in de klas van',
  '  Matthijs',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:evt-4@parro',
  'DTSTART:20260915T140000Z',
  'DTEND:20260915T150000Z',
  'SUMMARY:Ouderavond',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:evt-5@parro',
  'DTSTART;VALUE=DATE:20260907',
  'SUMMARY:Gymles',
  'RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261005',
  'EXDATE;VALUE=DATE:20260921',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const events = parseIcs(sample, { from: '2026-08-01', until: '2027-01-01' });
const find = (summary: string) => events.filter((e) => e.summary === summary);

const eendaags = find('Startgesprekken groep 1/2')[0];
check('hele dag: DTEND is exclusief, dus geen einddatum', eendaags?.endDate, undefined);
check('hele dag: markering klopt', eendaags?.allDay, true);
check(
  'omschrijving: escapes worden vertaald',
  eendaags?.description,
  'Neem het schriftje mee, en denk aan de foto.',
);

const vakantie = find('Herfstvakantie')[0];
check('meerdaags: laatste dag is de dag vóór DTEND', vakantie?.endDate, '2026-10-25');

const luizen = find('Luizencontrole in de klas van Matthijs')[0];
check('gevouwen regels worden samengevoegd', Boolean(luizen), true);
check('lokale tijd blijft lokale tijd', luizen?.time, '08:30');

const ouderavond = find('Ouderavond')[0];
check('UTC wordt omgerekend naar Nederlandse tijd', ouderavond?.time, '16:00');

const gym = find('Gymles');
check('herhaling: aantal keren', gym.length, 4);
check('herhaling: EXDATE wordt overgeslagen', gym.some((e) => e.date === '2026-09-21'), false);
check('herhaling: stopt op UNTIL', gym[gym.length - 1]?.date, '2026-10-05');
check('herhaling: elke uitzondering krijgt een eigen uid', new Set(gym.map((e) => e.uid)).size, 4);

const smal = parseIcs(sample, { from: '2026-09-08', until: '2026-09-16' });
check('venster: alleen items binnen de periode', smal.length, 3);

report('ics');
