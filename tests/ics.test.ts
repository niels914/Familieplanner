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

// ----------------------------------------------------------------- Google Agenda
// Dingen die in een persoonlijke agenda voorkomen en in een schoolagenda niet.

const google = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  // Wekelijkse standup, dinsdag. Eén keer verplaatst, één keer geannuleerd.
  'BEGIN:VEVENT',
  'UID:standup@google.com',
  'DTSTART;TZID=Europe/Amsterdam:20261006T090000',
  'DTEND;TZID=Europe/Amsterdam:20261006T093000',
  'RRULE:FREQ=WEEKLY;BYDAY=TU',
  'SUMMARY:Standup',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:standup@google.com',
  'RECURRENCE-ID;TZID=Europe/Amsterdam:20261013T090000',
  'DTSTART;TZID=Europe/Amsterdam:20261013T140000',
  'DTEND;TZID=Europe/Amsterdam:20261013T143000',
  'SUMMARY:Standup (verplaatst)',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:standup@google.com',
  'RECURRENCE-ID;TZID=Europe/Amsterdam:20261020T090000',
  'DTSTART;TZID=Europe/Amsterdam:20261020T090000',
  'DTEND;TZID=Europe/Amsterdam:20261020T093000',
  'STATUS:CANCELLED',
  'SUMMARY:Standup',
  'END:VEVENT',
  // Eerste maandag van de maand.
  'BEGIN:VEVENT',
  'UID:maandoverleg@google.com',
  'DTSTART;TZID=Europe/Amsterdam:20261005T100000',
  'DTEND;TZID=Europe/Amsterdam:20261005T110000',
  'RRULE:FREQ=MONTHLY;BYDAY=1MO',
  'SUMMARY:Maandoverleg',
  'END:VEVENT',
  // Elke maand de 31e: maanden zonder 31e slaan we over.
  'BEGIN:VEVENT',
  'UID:ultimo@google.com',
  'DTSTART;VALUE=DATE:20261031',
  'RRULE:FREQ=MONTHLY;COUNT=4',
  'SUMMARY:Ultimo',
  'END:VEVENT',
  // Begon lang geleden, COUNT telt vanaf het begin.
  'BEGIN:VEVENT',
  'UID:oud@google.com',
  'DTSTART;VALUE=DATE:20260105',
  'RRULE:FREQ=DAILY;COUNT=300',
  'SUMMARY:Oude reeks',
  'END:VEVENT',
  // Zakenreis in New York: 09:00 daar is 15:00 hier.
  'BEGIN:VEVENT',
  'UID:newyork@google.com',
  'DTSTART;TZID=America/New_York:20261014T090000',
  'DTEND;TZID=America/New_York:20261014T100000',
  'SUMMARY:Call New York',
  'END:VEVENT',
  // Voorbij middernacht: avondje weg tot 01:00.
  'BEGIN:VEVENT',
  'UID:laat@google.com',
  'DTSTART:20261016T200000Z',
  'DTEND:20261016T230000Z',
  'SUMMARY:Etentje',
  'END:VEVENT',
  // Geen titel.
  'BEGIN:VEVENT',
  'UID:leeg@google.com',
  'DTSTART;VALUE=DATE:20261012',
  'DTEND;VALUE=DATE:20261013',
  'SUMMARY:',
  'END:VEVENT',
  // Loopt al sinds voor het venster.
  'BEGIN:VEVENT',
  'UID:cursus@google.com',
  'DTSTART;VALUE=DATE:20260928',
  'DTEND;VALUE=DATE:20261010',
  'SUMMARY:Cursusweken',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const g = parseIcs(google, { from: '2026-10-01', until: '2026-12-31', stableRecurringUids: true, untitled: '(zonder titel)' });
const gOn = (summary: string) => g.filter((e) => e.summary === summary);

check('reeks: een dinsdag verplaatst, een geannuleerd', gOn('Standup').map((e) => e.date).slice(0, 4), ['2026-10-06', '2026-10-27', '2026-11-03', '2026-11-10']);
check('reeks: verplaatste afspraak staat apart op de nieuwe tijd', gOn('Standup (verplaatst)').map((e) => `${e.date} ${e.time}`), ['2026-10-13 14:00']);
check('reeks: verplaatste afspraak houdt een vaste uid', gOn('Standup (verplaatst)')[0]?.uid, 'standup@google.com::2026-10-13');
check('reeks: geannuleerde afspraak komt niet terug', g.some((e) => e.date === '2026-10-20' && e.summary === 'Standup'), false);
check('maandelijks: eerste maandag', gOn('Maandoverleg').map((e) => e.date), ['2026-10-05', '2026-11-02', '2026-12-07']);
check('maandelijks: een 31e die er niet is, wordt overgeslagen', gOn('Ultimo').map((e) => e.date), ['2026-10-31', '2026-12-31']);
check('COUNT telt vanaf het begin van de reeks', gOn('Oude reeks').length, 300 - (Date.UTC(2026, 9, 1) - Date.UTC(2026, 0, 5)) / 86400000);
check('andere tijdzone wordt omgerekend', gOn('Call New York').map((e) => `${e.time}-${e.endTime}`), ['15:00-16:00']);
check('UTC over zomertijd: 20:00Z is 22:00', gOn('Etentje')[0]?.time, '22:00');
check('zonder titel krijgt een naam', gOn('(zonder titel)').length, 1);
check('meerdaags dat voor het venster begon, telt mee', gOn('Cursusweken').map((e) => `${e.date}→${e.endDate}`), ['2026-09-28→2026-10-09']);
check('uid blijft stabiel bij één herhaling in het venster', parseIcs(google, { from: '2026-12-25', until: '2026-12-31', stableRecurringUids: true }).filter((e) => e.summary === 'Ultimo')[0]?.uid, 'ultimo@google.com::2026-12-31');

// Een afspraak die precies om middernacht eindigt hoort bij de dag ervoor.
const nacht = parseIcs(
  ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:n', 'DTSTART;TZID=Europe/Amsterdam:20261016T210000', 'DTEND;TZID=Europe/Amsterdam:20261017T000000', 'SUMMARY:Feest', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'),
  { from: '2026-10-01', until: '2026-12-31' },
)[0];
check('einde om middernacht: geen tweede dag', nacht?.endDate, undefined);
const doorNacht = parseIcs(
  ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:n2', 'DTSTART;TZID=Europe/Amsterdam:20261016T210000', 'DTEND;TZID=Europe/Amsterdam:20261017T010000', 'SUMMARY:Feest', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'),
  { from: '2026-10-01', until: '2026-12-31' },
)[0];
check('einde na middernacht: loopt door tot de volgende dag', `${doorNacht?.endDate} ${doorNacht?.endTime}`, '2026-10-17 01:00');

report('ics');
