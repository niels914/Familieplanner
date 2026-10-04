/** Controleert de regels voor het bewaren van agenda-items en taken (server en app delen ze). */
import type { CalendarEvent, Task } from '../shared/types';
import { saveEvent, saveTask } from '../shared/rules';
import { check, report } from './helpers';

const ctx = { now: '2026-10-04T10:00:00.000Z', newId: () => 'nieuw-id' };
const later = { now: '2026-10-04T12:00:00.000Z', newId: () => 'ander-id' };

const basis = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  source: 'local',
  title: 'Zwemles',
  date: '2026-10-06',
  allDay: true,
  person: 'amelie',
  category: 'anders',
  bring: [{ id: 'b1', text: 'Handdoek', done: false }],
  reminder: true,
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...extra,
});

// ----------------------------------------------------------------- agenda-items
let events = saveEvent([], { title: '  Gymtas mee  ', date: '2026-10-07' }, ctx);
check('nieuw item: id, titel getrimd', [events[0].id, events[0].title], ['nieuw-id', 'Gymtas mee']);
check('nieuw item: standaardwaarden', [events[0].source, events[0].person, events[0].category, events[0].allDay, events[0].reminder, events[0].bring], ['local', 'gezin', 'anders', true, true, []]);
check('nieuw item: tijdstempels', [events[0].createdAt, events[0].updatedAt], [ctx.now, ctx.now]);

events = saveEvent([], { id: 'eigen', title: 'A', date: '2026-10-07' }, ctx);
check('een meegegeven id blijft', events[0].id, 'eigen');

const lijst = [basis()];
let bijgewerkt = saveEvent(lijst, { id: 'e1', title: 'Zwemles (nieuw)', date: '2026-10-13' }, later);
check('bijwerken: wijziging komt binnen', [bijgewerkt[0].title, bijgewerkt[0].date], ['Zwemles (nieuw)', '2026-10-13']);
check('bijwerken: aanmaakmoment blijft, wijzigmoment verschuift', [bijgewerkt[0].createdAt, bijgewerkt[0].updatedAt], ['2026-10-01T08:00:00.000Z', later.now]);
check('bijwerken: meeneem-lijstje blijft als het niet meekomt', bijgewerkt[0].bring.map((b) => b.text), ['Handdoek']);
check('bijwerken: de oorspronkelijke lijst is niet aangeraakt', lijst[0].title, 'Zwemles');
check('bijwerken: geen tweede item erbij', bijgewerkt.length, 1);

bijgewerkt = saveEvent([basis({ source: 'parro', parroUid: 'p-1' })], { id: 'e1', title: 'x', date: '2026-10-13', source: 'local', parroUid: 'kapot' }, later);
check('Parro-koppeling kan niet overschreven worden', [bijgewerkt[0].source, bijgewerkt[0].parroUid], ['parro', 'p-1']);

bijgewerkt = saveEvent(
  [basis({ source: 'agenda', agendaFeed: 'niels', agendaUid: 'g-1' })],
  { id: 'e1', title: 'x', date: '2026-10-13', source: 'local', agendaFeed: 'irene', agendaUid: 'kapot' },
  later,
);
check('agenda-koppeling kan niet overschreven worden', [bijgewerkt[0].source, bijgewerkt[0].agendaFeed, bijgewerkt[0].agendaUid], ['agenda', 'niels', 'g-1']);

bijgewerkt = saveEvent(
  [basis({ series: { id: 's1', interval: 1, until: '2026-12-01' } })],
  { id: 'e1', title: 'x', date: '2026-10-13', series: undefined },
  later,
);
check('reeks kan niet losgemaakt worden via een gewone wijziging', bijgewerkt[0].series?.id, 's1');

bijgewerkt = saveEvent(lijst, { id: 'e1', date: '2026-10-06', title: 'Zwemles', bring: [] }, later);
check('een leeg meeneem-lijstje meesturen telt (alles afgevinkt en weg)', bijgewerkt[0].bring, []);

// ----------------------------------------------------------------------- taken
const taak = (extra: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Tandarts afspreken',
  owner: 'irene',
  done: false,
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...extra,
});

let taken = saveTask([], { title: ' Cadeau halen ', owner: 'niels', due: '2026-10-09', kid: 'matthijs' }, ctx);
check('nieuwe taak: id en titel', [taken[0].id, taken[0].title], ['nieuw-id', 'Cadeau halen']);
check('nieuwe taak: velden', [taken[0].owner, taken[0].due, taken[0].kid, taken[0].done, taken[0].doneAt], ['niels', '2026-10-09', 'matthijs', false, undefined]);
taken = saveTask([], { title: 'Iets' }, ctx);
check('nieuwe taak zonder eigenaar: samen afstemmen', taken[0].owner, 'samen');
taken = saveTask([], { title: 'Al klaar', done: true }, ctx);
check('nieuwe taak die al klaar is: afrondmoment gezet', taken[0].doneAt, ctx.now);

taken = saveTask([taak()], { id: 't1', done: true }, ctx);
check('afvinken legt het moment vast', [taken[0].done, taken[0].doneAt], [true, ctx.now]);
check('afvinken: titel blijft staan', taken[0].title, 'Tandarts afspreken');
taken = saveTask(taken, { id: 't1', done: true, note: 'wacht op terugbel' }, later);
check('nog eens opslaan terwijl klaar: afrondmoment blijft het eerste', taken[0].doneAt, ctx.now);
taken = saveTask(taken, { id: 't1', done: false }, later);
check('weer openzetten wist het afrondmoment', [taken[0].done, taken[0].doneAt], [false, undefined]);
check('aanmaakmoment blijft', taken[0].createdAt, '2026-10-01T08:00:00.000Z');
taken = saveTask([taak()], { id: 't1', title: '  Anders  ' }, later);
check('titel wordt getrimd bij bijwerken', taken[0].title, 'Anders');

report('opslagregels');
