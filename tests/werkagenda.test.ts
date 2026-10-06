/** Controleert wat uit de werkagenda in de app komt: de randen van de dag, de reistijd en de weg-items. */
import { DEFAULT_WERK, durationLabel, isRt, needsTravel, planWerk, werkSettings, type WerkInput } from '../shared/werkagenda';
import type { CalendarEvent } from '../shared/types';
import { signalsOn } from '../shared/signals';
import { check, report } from './helpers';

const dag = '2026-10-12';
const ev = (uid: string, summary: string, time: string, endTime: string, extra: Partial<WerkInput> = {}): WerkInput => ({
  uid,
  summary,
  date: dag,
  allDay: false,
  time,
  endTime,
  ...extra,
});
const plan = (events: WerkInput[], settings = DEFAULT_WERK) => planWerk(events, settings, '17:30');
const titels = (events: WerkInput[], settings = DEFAULT_WERK) => plan(events, settings).items.map((i) => i.summary);

// --- herkennen
check('rt is reistijd', [isRt('rt'), isRt('RT'), isRt('rt heen'), isRt('Reistijd naar Den Haag')], [true, true, true, true]);
check('een titel met rt erin is dat niet', [isRt('Smart Cities'), isRt('Start rt'), isRt('Retro')], [false, false, false]);
check('Den Haag is een fysieke locatie', needsTravel('Den Haag'), true);
check('Teams, een link, thuis en leeg: geen reis', [needsTravel('Microsoft Teams Meeting'), needsTravel('https://zoom.us/j/123'), needsTravel('Thuis'), needsTravel(''), needsTravel(undefined)], [false, false, false, false, false]);
check('"Meeting room" is gewoon een ruimte op kantoor', needsTravel('Meeting room 3, Utrecht'), true);
check('een straat met Home erin telt als fysiek', needsTravel('Homerusstraat 4, Utrecht'), true);
check('duur in woorden', [durationLabel(45), durationLabel(60), durationLabel(90)], ['45 min', '1 u', '1 u 30 min']);

// --- wat binnenkomt
check('tussen de middag: niets', plan([ev('a', 'Overleg', '10:00', '16:00')]).items.length, 0);
check('online om 07:30: binnen, maar je bent niet weg', titels([ev('a', 'Vroege call', '07:30', '09:00', { location: 'Microsoft Teams Meeting' })]), ['Vroege call']);
check('online tot 18:30: binnen, geen weg-item', titels([ev('a', 'Late call', '17:00', '18:30')]), ['Late call']);
check('precies 08:00 en 18:00 is nog geen rand', plan([ev('a', 'Overleg', '08:00', '18:00')]).items.length, 0);
check('een hele dag blijft buiten', plan([{ uid: 'v', summary: 'Vrij', date: dag, allDay: true }]).items.length, 0);
check('een afspraak over meerdere dagen blijft buiten', plan([ev('a', 'Reis', '07:00', '19:00', { endDate: '2026-10-14' })]).items.length, 0);

// --- reistijd uit de agenda
const denHaag = plan([
  ev('rt1', 'rt', '07:30', '09:00'),
  ev('m1', 'Overleg Den Haag', '09:00', '10:00', { location: 'Den Haag' }),
  ev('rt2', 'rt', '10:00', '11:00'),
]);
check('afspraak met rt ervoor: de afspraak komt binnen, het rt-blok zelf niet', denHaag.items.filter((i) => !i.category).map((i) => i.summary), ['Overleg Den Haag']);
const ochtend = denHaag.items.find((i) => i.uid === `dag:${dag}:ochtend`);
check('weg-item: Niels weg om 07:30, tot 08:30', [ochtend?.summary, ochtend?.time, ochtend?.endTime, ochtend?.category, ochtend?.reminder], ['Niels weg om 07:30', '07:30', '08:30', 'weg', true]);
check('de reden staat erbij', ochtend?.description, 'Overleg Den Haag om 09:00, 1 u 30 min reistijd (uit je agenda)');
check('rt na afloop: terug om 12:00, dus geen avond-item', denHaag.items.some((i) => i.uid.endsWith(':avond')), false);
check('de reistijd staat bij de afspraak', denHaag.items.find((i) => i.uid === 'm1')?.description, 'Reistijd heen: 1 u 30 min (uit je agenda)\nReistijd terug: 1 u (uit je agenda)');

const utrecht = plan([ev('m2', 'Eindoverleg Utrecht', '17:00', '18:30', { location: 'Utrecht' }), ev('rt3', 'rt', '18:30', '19:30')]);
const avond = utrecht.items.find((i) => i.uid === `dag:${dag}:avond`);
check('thuis om 19:30, het ritme begint op het normale thuisuur', [avond?.summary, avond?.time, avond?.endTime], ['Niels thuis om 19:30', '17:30', '19:30']);

// --- geschat
const geschat = plan([ev('m3', 'Kennismaking', '08:15', '09:00', { location: 'Amersfoort' })]);
check('fysiek zonder rt, om 08:15: komt binnen door de reistijd', geschat.items.map((i) => i.summary), ['Kennismaking', 'Niels weg om 07:30']);
check('en zegt dat het geschat is', geschat.items[1].description, 'Kennismaking om 08:15, 45 min reistijd (geschat)');
check('de standaard reistijd is in te stellen', plan([ev('m3', 'Kennismaking', '08:15', '09:00', { location: 'Amersfoort' })], { ...DEFAULT_WERK, travelMin: 10 }).items.length, 0);
check('fysiek midden op de dag is geen rand', plan([ev('m4', 'Lunchafspraak', '12:00', '13:30', { location: 'Utrecht' })]).items.length, 0);
check('fysiek tot 17:30 met 45 min terug: thuis 18:15, dus een avond-item', plan([ev('m5', 'Workshop', '14:00', '17:30', { location: 'Utrecht' })]).items.map((i) => i.summary), ['Workshop', 'Niels thuis om 18:15']);

// --- een dag met meerdere afspraken
const dagMet = plan([
  ev('a', 'Overleg A', '09:00', '10:00', { location: 'Den Haag' }),
  ev('b', 'Overleg B', '10:30', '12:00', { location: 'Den Haag' }),
  ev('rt1', 'rt', '07:30', '09:00'),
]);
check('twee afspraken in dezelfde stad: één vertrek, B blijft buiten', [dagMet.items.map((i) => i.uid), dagMet.taken], [['a', `dag:${dag}:ochtend`], 1]);

// --- losse rt
const losRt = plan([ev('r', 'rt', '17:30', '19:00')]);
check('een rt-blok zonder afspraak aan de rand komt binnen, met de titel zoals hij is', losRt.items.map((i) => i.summary), ['rt', 'Niels thuis om 19:00']);
check('een rt-blok midden op de dag niet', plan([ev('r', 'rt', '11:00', '12:00')]).items.length, 0);

// --- tijden
check('afronden op vijf minuten: vertrek naar beneden, thuis naar boven', [plan([ev('a', 'X', '08:12', '09:00', { location: 'Ede' })]).items[1].time, plan([ev('b', 'Y', '17:00', '17:50', { location: 'Ede' })]).items[1].endTime], ['07:25', '18:35']);
check('zonder eindtijd rekenen we een uur', plan([ev('a', 'Late call', '17:30', '')]).items.length, 1);
check('over middernacht loopt tot het einde van de dag', plan([ev('a', 'Diner', '19:00', '01:00', { location: 'Utrecht' })]).items.find((i) => i.uid.endsWith(':avond'))?.endTime, '23:59');

// --- het weg-item voedt de signalering van "allebei weg"
const alsEvent = (i: ReturnType<typeof plan>['items'][number], person: 'niels' | 'irene'): CalendarEvent => ({
  id: i.uid, source: 'agenda', title: i.summary, date: i.date, time: i.time, endTime: i.endTime, allDay: false, person,
  category: i.category ?? 'afspraak', bring: [], reminder: false, createdAt: '', updatedAt: '',
});
const nielsWeg = plan([ev('rt1', 'rt', '07:00', '09:00'), ev('m1', 'Overleg Den Haag', '09:00', '10:00', { location: 'Den Haag' })]).items.find((i) => i.category === 'weg')!;
const ireneWeg: CalendarEvent = { ...alsEvent(nielsWeg, 'irene'), id: 'irene-weg', category: 'weg', time: '07:30', endTime: '08:45' };
check('Niels vroeg weg en Irene ook: dat is een signaal', signalsOn([alsEvent(nielsWeg, 'niels'), ireneWeg], dag).length, 1);
check('Irene thuis: geen signaal', signalsOn([alsEvent(nielsWeg, 'niels')], dag).length, 0);

// --- instellingen
check('ongeldige instellingen worden de standaard', werkSettings({ earlyBefore: '8', lateAfter: '25:00', travelMin: -5 }), DEFAULT_WERK);
check('geldige instellingen blijven', werkSettings({ earlyBefore: '07:30', lateAfter: '18:30', morningUntil: '09:00', travelMin: 60 }), { earlyBefore: '07:30', lateAfter: '18:30', morningUntil: '09:00', travelMin: 60 });
check('een andere grens verandert de uitkomst', plan([ev('a', 'Overleg', '07:45', '09:00')], { ...DEFAULT_WERK, earlyBefore: '07:30' }).items.length, 0);

report('werkagenda');
