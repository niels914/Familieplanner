/** Controleert de regels voor het bewaren van agenda-items en taken (server en app delen ze). */
import type { CalendarEvent, Receipt, Task } from '../shared/types';
import { checkReceipt, restoreItems, saveEvent, saveReceipt, saveTask } from '../shared/rules';
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

// ------------------------------------------------------------- ongedaan maken
const weg = basis({ source: 'parro', parroUid: 'p-9', series: { id: 's1', interval: 2, until: '2026-12-01' }, createdAt: '2026-09-01T00:00:00.000Z' });
const terug = restoreItems([basis({ id: 'andere' })], [weg]);
check('terugzetten: komt terug zoals het was, met bron en reeks', [terug[1].id, terug[1].source, terug[1].parroUid, terug[1].series?.id, terug[1].createdAt], ['e1', 'parro', 'p-9', 's1', '2026-09-01T00:00:00.000Z']);
check('terugzetten: wat er staat blijft staan', terug.map((e) => e.id), ['andere', 'e1']);
check('tweemaal terugzetten voegt niets dubbel toe', restoreItems(terug, [weg]).length, 2);
check('terugzetten laat een inmiddels nieuwe versie met hetzelfde id ongemoeid', restoreItems([basis({ title: 'Nieuwer' })], [weg])[0].title, 'Nieuwer');
check('meerdere tegelijk (een reeks)', restoreItems([], [weg, basis({ id: 'e2' }), basis({ id: 'e3' })]).map((e) => e.id), ['e1', 'e2', 'e3']);
check('niets terug te zetten', restoreItems([weg], []), [weg]);

// -------------------------------------------------------------------- bonnetjes
const bon = (extra: Partial<Receipt> = {}): Receipt => ({
  id: 'r1',
  title: 'Wasmachine',
  purchaseDate: '2026-03-12',
  person: 'gezin',
  files: [{ id: 'f1', kind: 'image', thumb: true }],
  warrantyMonths: 24,
  createdAt: '2026-03-12T10:00:00.000Z',
  updatedAt: '2026-03-12T10:00:00.000Z',
  ...extra,
});

check('controle: een geldig bonnetje', checkReceipt({ purchaseDate: '2026-03-12', amountCents: 54900, warrantyMonths: 24, files: [{ id: 'a', kind: 'pdf' }] }), null);
check('controle: zonder datum', checkReceipt({ title: 'x' }), 'Geef een geldige aankoopdatum op.');
check('controle: een onzindatum', checkReceipt({ purchaseDate: '2026-13-45' }), 'Geef een geldige aankoopdatum op.');
check('controle: een bedrag met komma', checkReceipt({ purchaseDate: '2026-03-12', amountCents: 12.5 }), 'Het bedrag klopt niet.');
check('controle: een negatief bedrag', checkReceipt({ purchaseDate: '2026-03-12', amountCents: -1 }), 'Het bedrag klopt niet.');
check('controle: garantie van 0 maanden', checkReceipt({ purchaseDate: '2026-03-12', warrantyMonths: 0 }), 'De garantietermijn klopt niet.');
check('controle: een kapotte einddatum', checkReceipt({ purchaseDate: '2026-03-12', returnUntil: 'morgen' }), 'Een einddatum klopt niet.');
check('controle: een onbekend soort bijlage', checkReceipt({ purchaseDate: '2026-03-12', files: [{ id: 'a', kind: 'exe' as 'pdf' }] }), 'Een bijlage klopt niet.');
check('controle: te veel bijlagen', checkReceipt({ purchaseDate: '2026-03-12', files: Array.from({ length: 21 }, (_, i) => ({ id: `f${i}`, kind: 'image' as const })) }), 'Een bijlage klopt niet.');

let bonnen = saveReceipt([], { title: '  Magnetron ', purchaseDate: '2026-03-12', store: ' Coolblue ', serial: '   ' }, ctx);
check('nieuw bonnetje: id, getrimd, leeg is niets', [bonnen[0].id, bonnen[0].title, bonnen[0].store, bonnen[0].serial], ['nieuw-id', 'Magnetron', 'Coolblue', undefined]);
check('nieuw bonnetje: standaardwaarden', [bonnen[0].person, bonnen[0].files, bonnen[0].createdAt], ['gezin', [], ctx.now]);
bonnen = saveReceipt([], { purchaseDate: '2026-03-12' }, ctx);
check('alleen een foto en datum is genoeg: lege titel', bonnen[0].title, '');

let na = saveReceipt([bon({ reminded: { warranty: '2028-02-11' }, handled: { warranty: '2028-02-12' } })], { id: 'r1', title: 'Wasmachine Bosch', purchaseDate: '2026-03-12', warrantyMonths: 24, handled: { warranty: '2028-02-12' } }, later);
check('bijwerken: titel verandert, bijlagen blijven', [na[0].title, na[0].files.length], ['Wasmachine Bosch', 1]);
check('bijwerken: aanmaakmoment blijft', [na[0].createdAt, na[0].updatedAt], ['2026-03-12T10:00:00.000Z', later.now]);
check('bijwerken: niets aan de garantie veranderd, dus herinnering en afhandeling blijven', [na[0].reminded?.warranty, na[0].handled?.warranty], ['2028-02-11', '2028-02-12']);
na = saveReceipt([bon({ reminded: { warranty: '2028-02-11' }, handled: { warranty: '2028-02-12' } })], { id: 'r1', purchaseDate: '2026-03-12', warrantyMonths: 36 }, later);
check('een nieuwe garantietermijn begint opnieuw: herinnering en afhandeling weg', [na[0].reminded, na[0].handled], [undefined, undefined]);
na = saveReceipt([bon({ reminded: { warranty: 'x', return: 'y' } })], { id: 'r1', purchaseDate: '2026-03-12', returnUntil: '2026-04-01' }, later);
check('een retourdatum erbij wist alleen de retourherinnering', [na[0].reminded?.warranty, na[0].reminded?.return], ['x', undefined]);
na = saveReceipt([bon({ reminded: { warranty: 'x' } })], { id: 'r1', purchaseDate: '2026-03-12', warrantyMonths: 24, reminded: { warranty: undefined } }, later);
check('van buitenaf kun je niet wijzigen wat al verstuurd is', na[0].reminded?.warranty, 'x');
na = saveReceipt([bon({ amountCents: 54900 })], { id: 'r1', purchaseDate: '2026-03-12', warrantyMonths: 24, amountCents: undefined }, later);
check('een bedrag wissen kan', na[0].amountCents, undefined);
na = saveReceipt([bon({ store: 'Bol' })], { id: 'r1', purchaseDate: '2026-03-12' }, later);
check('een veld dat niet meekomt blijft staan', na[0].store, 'Bol');
na = saveReceipt([bon({ store: 'Bol' })], { id: 'r1', purchaseDate: '2026-03-12', store: '' }, later);
check('een veld dat leeg meekomt, wordt gewist', na[0].store, undefined);
check('de oorspronkelijke lijst is niet aangeraakt', [bon()].length, 1);

report('opslagregels');
