/** Controleert de tekst van de avondherinnering. */
import type { CalendarEvent } from '../shared/types';
import { bouwHerinnering } from '../netlify/lib/reminder';
import { check, report } from './helpers';

const basis = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: Math.random().toString(36).slice(2),
  source: 'local',
  title: 'Item',
  date: '2026-10-13',
  allDay: true,
  person: 'gezin',
  category: 'anders',
  bring: [],
  reminder: true,
  createdAt: '',
  updatedAt: '',
  ...over,
});

const morgen = '2026-10-13';
const reeks = { id: 'zwem', interval: 1 as const, until: '2026-12-22' };

const events: CalendarEvent[] = [
  // Gewone zwemles uit de reeks, zonder extra's.
  basis({ title: 'Zwemles', date: '2026-10-06', time: '16:15', allDay: false, person: 'matthijs', series: reeks }),
  // De les van morgen: met kleren zwemmen.
  basis({
    title: 'Zwemles',
    time: '16:15',
    allDay: false,
    person: 'matthijs',
    series: reeks,
    notes: 'Met kleren zwemmen',
    bring: [{ id: 'k', text: 'Kleren om in te zwemmen', done: false }],
  }),
  basis({ title: 'Gymles', person: 'matthijs', bring: [{ id: 'g', text: 'Gymtas', done: true }] }),
  basis({ title: 'Niet herinneren', reminder: false }),
  basis({
    title: 'Ouderavond',
    source: 'parro',
    notes: 'Een lange omschrijving uit Parro die niet in de melding hoort',
    syncedNotes: 'Een lange omschrijving uit Parro die niet in de melding hoort',
  }),
];

const h = bouwHerinnering(events, morgen)!;
check('er is een herinnering', Boolean(h), true);
check('titel noemt de datum', h.title, 'Morgen — dinsdag 13 oktober');
check('de zwemles van morgen staat erin', h.body.includes('16:15 Matthijs: Zwemles'), true);
check('eigen notitie gaat mee', h.body.includes('Met kleren zwemmen'), true);
check('meenemen gaat mee', h.body.includes('meenemen: Kleren om in te zwemmen'), true);
check('afgevinkt meenemen niet meer', h.body.includes('Gymtas'), false);
check('uitgezette herinnering niet', h.body.includes('Niet herinneren'), false);
check('Parro-omschrijving niet', h.body.includes('lange omschrijving'), false);
check('telling klopt', h.body.endsWith('1 ding klaarzetten.'), true);
check('de les van vorige week niet', (h.body.match(/Zwemles/g) ?? []).length, 1);
check('niets gepland: geen melding', bouwHerinnering(events, '2026-10-14'), null);

// ------------------------------------------------------- garantie en retour erbij
const regels = ['De garantie op Wasmachine loopt op zondag 12 maart af.', 'Retourneren van Schoenen kan nog tot zaterdag 10 oktober.'];
const mee = bouwHerinnering(events, morgen, regels)!;
check('met agenda: de garantieregels staan onder de agenda', mee.body.includes('Garantie en retour:\n• De garantie op Wasmachine'), true);
check('de agenda staat er nog steeds boven', mee.body.indexOf('16:15 Matthijs') < mee.body.indexOf('Garantie en retour'), true);
check('de titel blijft die van morgen', mee.title, 'Morgen — dinsdag 13 oktober');
check('ze gaan naar de dag, niet naar de bonnetjes', mee.url, `/?date=${morgen}`);

const alleen = bouwHerinnering(events, '2026-10-14', regels)!;
check('morgen leeg maar wel garantie: toch een melding', alleen.title, 'Garantie en retour');
check('die opent het scherm met bonnetjes', alleen.url, '/?view=bonnetjes');
check('met beide regels', alleen.body.split('\n').filter((r) => r.startsWith('•')).length, 2);
check('niets te melden en geen garantie: nog steeds geen melding', bouwHerinnering(events, '2026-10-14', []), null);
check('zonder derde argument werkt het als altijd', bouwHerinnering(events, morgen)!.body.includes('Garantie'), false);

// --- feestdagen en cadeaus
const cadeau = ['Opa Henk wordt 76 op zaterdag 14 maart (over 3 weken). Idee: een boek.'];
const geenAgenda = '2026-10-14';
const feest = bouwHerinnering(events, geenAgenda, [], { feestdag: 'Koningsdag' })!;
check('een feestdag morgen is een melding, ook zonder agenda', [feest.title, feest.body], ['Morgen — woensdag 14 oktober', 'Morgen is het Koningsdag.']);
check('een feestdag staat boven de agenda', bouwHerinnering(events, morgen, [], { feestdag: 'Tweede Paasdag' })!.body.startsWith('Morgen is het Tweede Paasdag.\n\n'), true);
const alleenCadeau = bouwHerinnering(events, geenAgenda, [], { cadeauRegels: cadeau })!;
check('alleen een cadeau: eigen melding, opent Mensen', [alleenCadeau.title, alleenCadeau.url, alleenCadeau.body], ['Cadeau regelen', '/?view=mensen', 'Cadeau regelen:\n• Opa Henk wordt 76 op zaterdag 14 maart (over 3 weken). Idee: een boek.']);
check('cadeau onder de agenda van morgen', bouwHerinnering(events, morgen, [], { cadeauRegels: cadeau })!.body.endsWith('\n\nCadeau regelen:\n• ' + cadeau[0]), true);
const beide = bouwHerinnering(events, geenAgenda, regels, { cadeauRegels: cadeau })!;
check('garantie en cadeau samen, zonder agenda', [beide.title, beide.body.includes('Garantie en retour:'), beide.body.includes('Cadeau regelen:')], ['Garantie en cadeau', true, true]);
check('zonder extra verandert er niets', bouwHerinnering(events, morgen, [], {})!.body, bouwHerinnering(events, morgen)!.body);

report('herinnering');
