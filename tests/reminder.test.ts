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

report('herinnering');
