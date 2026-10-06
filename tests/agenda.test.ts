/** Controleert het koppelen van een persoonlijke agenda: wat erin komt, wat blijft staan en wat niet uitlekt. */
import type { CalendarEvent, Settings } from '../shared/types';
import { addDays, todayInNl } from '../shared/dates';
import { cleanDescription, runAgendaSync, syncFeed, FEEDS } from '../netlify/lib/agenda';
import { read, update } from './memory-store';
import { check, report } from './helpers';

const GEHEIME_LINK = 'https://calendar.google.com/calendar/ical/geheim%40gmail.com/private-abc123/basic.ics';
process.env.NIELS_ICS_URL = GEHEIME_LINK;
const feed = FEEDS.find((f) => f.id === 'niels')!;

const dag = (n: number) => addDays(todayInNl(), n).replace(/-/g, '');

/** Is het over n dagen zomertijd in Nederland? 08:00 UTC is dan 10:00. */
const zomertijd = (n: number) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false }).format(
    new Date(`${addDays(todayInNl(), n)}T08:00:00Z`),
  ) === '10';

const afspraak = (uid: string, summary: string, n: number, extra: string[] = []) => [
  'BEGIN:VEVENT',
  `UID:${uid}`,
  `DTSTART:${dag(n)}T080000Z`,
  `DTEND:${dag(n)}T090000Z`,
  `SUMMARY:${summary}`,
  ...extra,
  'END:VEVENT',
];
const agenda = (...items: string[][]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...items.flat(), 'END:VCALENDAR'].join('\r\n');

let antwoord: () => Response | Promise<Response> = () => new Response('');
globalThis.fetch = (async () => antwoord()) as typeof fetch;
const feedMet = (ics: string) => {
  antwoord = () => new Response(ics, { status: 200 });
};

const agendaItems = async () => (await read<CalendarEvent[]>('events')).filter((e) => e.source === 'agenda');
const op = async (summary: string) => (await agendaItems()).find((e) => e.title === summary);

// ---------------------------------------------------------------- eerste sync
feedMet(
  agenda(
    afspraak('a1', 'Tandarts', 2, ['LOCATION:Praktijk Zuid', 'CLASS:PRIVATE']),
    afspraak('a2', 'Klantgesprek Den Haag', 3, ['DESCRIPTION:Neem de offerte mee\\nen <b>laptop</b>']),
    afspraak('a3', 'Lunch', 5),
  ),
);
let r = await syncFeed(feed);
check('eerste sync: drie nieuw', [r.ok, r.added, r.updated, r.removed], [true, 3, 0, 0]);

const tandarts = await op('Tandarts');
check('privé-afspraak staat er gewoon, met volledige titel', tandarts?.title, 'Tandarts');
check('op naam van Niels', tandarts?.person, 'niels');
check('volwaardig item in de agenda: soort afspraak', tandarts?.category, 'afspraak');
check('bron is de agenda, met eigenaar en id', [tandarts?.source, tandarts?.agendaFeed, tandarts?.agendaUid], ['agenda', 'niels', 'a1']);
check('niet in de avondmelding voor het hele gezin', tandarts?.reminder, false);
check('tijd is Nederlandse tijd, niet UTC', [tandarts?.time, tandarts?.endTime], zomertijd(2) ? ['10:00', '11:00'] : ['09:00', '10:00']);
check('plaats overgenomen', tandarts?.location, 'Praktijk Zuid');
check('omschrijving leesbaar gemaakt', (await op('Klantgesprek Den Haag'))?.notes, 'Neem de offerte mee\nen laptop');

// -------------------------------------------------------- tweede sync, niets nieuw
const voor = JSON.stringify(await agendaItems());
r = await syncFeed(feed);
check('zelfde feed: niets nieuw, niets bijgewerkt', [r.added, r.updated, r.removed], [0, 0, 0]);
check('zelfde feed: items blijven byte voor byte gelijk (ook updatedAt)', JSON.stringify(await agendaItems()), voor);

// ----------------------------------------------- eigen aanvullingen blijven staan
await update<CalendarEvent[]>('events', (events) =>
  events.map((e) =>
    e.title === 'Klantgesprek Den Haag'
      ? {
          ...e,
          category: 'weg',
          bring: [{ id: 'b1', text: 'Offerte', done: false }],
          notes: 'Eigen notitie: trein 07:10',
        }
      : e,
  ),
);
feedMet(
  agenda(
    afspraak('a1', 'Tandarts (verzet)', 2),
    afspraak('a2', 'Klantgesprek Den Haag', 3, ['DESCRIPTION:Neem de offerte mee\\nen <b>laptop</b>']),
    afspraak('a3', 'Lunch', 5),
  ),
);
r = await syncFeed(feed);
check('wijziging in Google komt binnen', [r.updated, (await op('Tandarts (verzet)'))?.agendaUid], [1, 'a1']);
const klant = await op('Klantgesprek Den Haag');
check('soort die je zelf koos blijft staan', klant?.category, 'weg');
check('meeneem-lijstje blijft staan', klant?.bring.map((b) => b.text), ['Offerte']);
check('eigen notitie blijft staan', klant?.notes, 'Eigen notitie: trein 07:10');

// ------------------------------------------------------------------ verdwijnen
feedMet(agenda(afspraak('a2', 'Klantgesprek Den Haag', 3)));
r = await syncFeed(feed);
check('uit Google verwijderd: weg uit de app', [await op('Tandarts (verzet)'), await op('Lunch')], [undefined, undefined]);
check('verwijderd geteld', r.removed, 2);

feedMet(agenda());
r = await syncFeed(feed);
check('een lege feed ruimt niets op', [r.ok, r.removed, (await agendaItems()).length], [true, 0, 1]);

await update<CalendarEvent[]>('events', (events) => [
  ...events,
  { ...events[0], id: 'eigen', source: 'local', title: 'Eigen item', agendaFeed: undefined, agendaUid: undefined },
]);
feedMet(agenda(afspraak('x', 'Iets anders', 9)));
await syncFeed(feed);
check('eigen items blijven altijd staan', (await read<CalendarEvent[]>('events')).some((e) => e.id === 'eigen'), true);

// ------------------------------------------------------------------ foutgevallen
antwoord = () => new Response('niet gevonden', { status: 404 });
r = await syncFeed(feed);
check('404: mislukt, met uitleg', [r.ok, r.message.includes('geldig')], [false, true]);
check('404: geen link in de melding', r.message.includes('private-abc123'), false);

antwoord = () => {
  throw new Error(`getaddrinfo ENOTFOUND voor ${GEHEIME_LINK}`);
};
r = await syncFeed(feed);
check('netwerkfout: mislukt', r.ok, false);
check('netwerkfout: link komt niet in de melding', r.message.includes('private-abc123'), false);

feedMet('<html>Log in bij Google</html>');
r = await syncFeed(feed);
check('geen agenda terug: duidelijke melding', [r.ok, r.message.includes('geen agenda')], [false, true]);

process.env.NIELS_ICS_URL = 'http://calendar.google.com/x.ics';
r = await syncFeed(feed);
check('http (zonder s) wordt geweigerd', r.ok, false);
process.env.NIELS_ICS_URL = GEHEIME_LINK;

// ----------------------------------------------------------- alles in één keer
feedMet(agenda(afspraak('a2', 'Klantgesprek Den Haag', 3), afspraak('a9', 'Nieuw', 4)));
const alles = await runAgendaSync();
const settings = await read<Settings>('settings');
check('sync van alle agenda’s lukt', [alles.ok, alles.results.length], [true, 1]);
check('resultaat staat in de instellingen', [settings.agendaSync?.niels?.count, settings.agendaSync?.niels?.ok, Boolean(settings.agendaSync?.niels?.at)], [2, true, true]);

antwoord = () => new Response('', { status: 500 });
await runAgendaSync();
const mislukt = (await read<Settings>('settings')).agendaSync?.niels;
check('mislukte poging: gemeld, laatste aantal blijft staan', [mislukt?.ok, mislukt?.count], [false, 2]);
check('de link staat nergens in de instellingen', JSON.stringify(settings).includes('private-abc123'), false);

delete process.env.NIELS_ICS_URL;
check('zonder link: niets te doen', (await runAgendaSync()).ok, false);

// ----------------------------------------------------------------- opschonen
check('HTML wordt tekst', cleanDescription('Hallo<br>wereld &amp; <a href="https://x.nl">klik</a>'), 'Hallo\nwereld & klik (https://x.nl)');
check('lange omschrijving wordt ingekort', cleanDescription('a'.repeat(2000))?.length, 1000);
check('leeg blijft leeg', cleanDescription('<br>'), undefined);
check(
  'scheidingslijnen van een Teams-uitnodiging verdwijnen',
  cleanDescription('Microsoft Teams-vergadering\n________________________________________________________________________________\nDeelnemen: https://teams.microsoft.com/meet/123\n_______________________\nHeeft u hulp nodig?'),
  'Microsoft Teams-vergadering\n\nDeelnemen: https://teams.microsoft.com/meet/123\n\nHeeft u hulp nodig?',
);
check('een streepje in gewone tekst blijft', cleanDescription('Niels - Irene\n--\nOk'), 'Niels - Irene\n--\nOk');
check('alleen een lijn is niets', cleanDescription('__________'), undefined);

// ------------------------------------------------------------------ werkagenda
const WERK_LINK = 'https://outlook.office365.com/owa/calendar/geheim/reachcalendar.ics';
process.env.NIELS_WERK_ICS_URL = WERK_LINK;
const werkFeed = FEEDS.find((f) => f.id === 'werk')!;
const lokaal = (uid: string, summary: string, n: number, van: string, tot: string, extra: string[] = []) => [
  'BEGIN:VEVENT',
  `UID:${uid}`,
  `DTSTART;TZID=W. Europe Standard Time:${dag(n)}T${van.replace(':', '')}00`,
  `DTEND;TZID=W. Europe Standard Time:${dag(n)}T${tot.replace(':', '')}00`,
  `SUMMARY:${summary}`,
  ...extra,
  'END:VEVENT',
];
const werkItems = async () => (await read<CalendarEvent[]>('events')).filter((e) => e.agendaFeed === 'werk');
const werkTitels = async () => (await werkItems()).map((e) => e.title).sort();

feedMet(
  agenda(
    lokaal('w1', 'Overleg Den Haag', 3, '09:00', '10:00', ['LOCATION:Den Haag', 'DESCRIPTION:Vertrouwelijke tekst']),
    lokaal('w2', 'rt', 3, '07:30', '09:00'),
    lokaal('w3', 'Afdelingsoverleg', 3, '11:00', '12:00'),
    lokaal('w4', 'Vroege call', 4, '07:30', '08:30', ['LOCATION:Microsoft Teams Meeting']),
    lokaal('w5', 'Strategiesessie', 5, '13:00', '16:00'),
  ),
);
r = await syncFeed(werkFeed);
check('werkagenda: alleen de randen komen binnen', [r.ok, await werkTitels()], [true, ['Niels weg om 07:30', 'Overleg Den Haag', 'Vroege call']]);
check('de melding zegt hoeveel er gelezen en overgenomen is', r.message.includes('5 afspraken gelezen, 3 overgenomen'), true);
const denHaag = (await werkItems()).find((e) => e.title === 'Overleg Den Haag');
check('titel letterlijk, op naam van Niels, locatie erbij', [denHaag?.person, denHaag?.location, denHaag?.agendaFeed, denHaag?.category], ['niels', 'Den Haag', 'werk', 'afspraak']);
check('de beschrijving van een werkafspraak komt niet binnen', (denHaag?.notes ?? '').includes('Vertrouwelijke'), false);
check('wel de reistijd, uit de agenda of geschat', denHaag?.notes, 'Reistijd heen: 1 u 30 min (uit je agenda)\nReistijd terug: 45 min (geschat)');
const weg = (await werkItems()).find((e) => e.title === 'Niels weg om 07:30');
check('het weg-item is van het soort weg, met herinnering', [weg?.category, weg?.reminder, weg?.time, weg?.endTime], ['weg', true, '07:30', '08:30']);
check('een gewone werkafspraak komt niet in de avondmelding', denHaag?.reminder, false);
check('het middagoverleg staat nergens in de opslag', JSON.stringify(await read<CalendarEvent[]>('events')).includes('Afdelingsoverleg'), false);

r = await syncFeed(werkFeed);
check('nogmaals ophalen verandert niets', [r.added, r.updated, r.removed], [0, 0, 0]);

// Verplaatst naar het midden van de dag: weg uit de app, ook het weg-item.
feedMet(
  agenda(
    lokaal('w1', 'Overleg Den Haag', 3, '12:00', '13:00', ['LOCATION:Den Haag']),
    lokaal('w4', 'Vroege call', 4, '07:30', '08:30', ['LOCATION:Microsoft Teams Meeting']),
  ),
);
r = await syncFeed(werkFeed);
check('verplaatst naar 12:00: afspraak en weg-item verdwijnen', await werkTitels(), ['Vroege call']);

// Alleen middagafspraken: het filter maakt alles leeg, maar de feed zelf is niet leeg.
feedMet(agenda(lokaal('w9', 'Overleg', 3, '10:00', '11:00')));
r = await syncFeed(werkFeed);
check('een feed met alleen middagafspraken ruimt de randen wel op', [r.ok, await werkTitels()], [true, []]);
feedMet(agenda());
r = await syncFeed(werkFeed);
check('een echt lege feed ruimt niets op', r.removed, 0);

// De eigen instellingen gelden.
await update<Settings>('settings', (s) => ({ ...s, werk: { earlyBefore: '07:00', travelMin: 60 } }));
feedMet(agenda(lokaal('w6', 'Kennismaking', 3, '07:45', '09:00', ['LOCATION:Amersfoort'])));
r = await syncFeed(werkFeed);
check('instelling: vroeg is nu voor 07:00, reistijd 60 min', await werkTitels(), ['Kennismaking', 'Niels weg om 06:45']);
feedMet(agenda(lokaal('w6', 'Kennismaking', 3, '07:45', '09:00')));
await syncFeed(werkFeed);

antwoord = () => new Response('niet gevonden', { status: 404 });
r = await syncFeed(werkFeed);
check('werkagenda 404: geen link in de melding', [r.ok, r.message.includes('reachcalendar')], [false, false]);

report('agenda');
