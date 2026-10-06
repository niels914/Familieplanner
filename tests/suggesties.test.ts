/** Controleert het herkennen van meeneem-suggesties in schoolberichten. */
import { bringSuggestions, itemsInText, suggestionKey } from '../shared/suggesties';
import type { CalendarEvent } from '../shared/types';
import { check, report } from './helpers';

// Zinnen zoals scholen ze schrijven.
check('neem X mee', itemsInText('Neem morgen gymschoenen mee.'), ['Gymschoenen']);
check('twee dingen met "en"', itemsInText('Neem een bidon en een pet mee.'), ['Bidon', 'Pet']);
check('lijst met komma’s en "en"', itemsInText('Neem zwemkleding, een handdoek en een bril mee'), ['Zwemkleding', 'Handdoek', 'Bril']);
check('voorwerp eerst', itemsInText('De kinderen moeten een regenjas meenemen.'), ['Regenjas']);
check('mee te nemen', itemsInText('Wilt u een extra setje kleding mee te geven?'), ['Extra setje kleding']);
check('vergeet niet', itemsInText('Vergeet niet een knuffel mee te nemen.'), ['Knuffel']);
check('geef uw kind X mee', itemsInText('Geef uw kind laarzen mee.'), ['Laarzen']);
check('breng X mee', itemsInText('Breng een fruithapje mee voor de pauze.'), ['Fruithapje']);
check('toelichting valt af', itemsInText('Neem een bidon mee naar school.'), ['Bidon']);
check('met blijft bij het voorwerp', itemsInText('Neem een boterham met kaas en een appel mee.'), ['Boterham met kaas', 'Appel']);

// Lijsten met een kopje.
check('kopje met lijst op één regel', itemsInText('Meenemen: gymschoenen, drinken en een pet'), ['Gymschoenen', 'Drinken', 'Pet']);
check('kopje met streepjes', itemsInText('Wat moet er mee:\n- gymschoenen\n- een bidon\n• pet\n\nTot dan!'), ['Gymschoenen', 'Bidon', 'Pet']);
check('kopje met cijfers', itemsInText('Meenemen:\n1. handdoek\n2) zwembroek'), ['Handdoek', 'Zwembroek']);

// Wat er niet uit moet komen.
check('"geen" is een ontkenning', itemsInText('Je hoeft geen lunch mee te nemen.'), []);
check('"niet" is een ontkenning', itemsInText('Neem niet je telefoon mee.'), []);
check('"zonder" is een ontkenning', itemsInText('Zonder tas mee naar school.'), []);
check('gewone mededeling', itemsInText('Studiedag, alle kinderen zijn vrij.'), []);
check('mee zonder werkwoord eromheen', itemsInText('Alle kinderen gaan mee met de bus.'), []);
check('leeg', itemsInText(''), []);
check('te lang is geen voorwerp', itemsInText('Neem alles wat jullie nodig hebben voor een hele dag in het bos mee.'), []);

// Dubbelen binnen één tekst.
check('dubbel binnen één tekst', itemsInText('Neem gymschoenen mee.\nMeenemen: gymschoenen'), ['Gymschoenen']);

// Sleutel.
check('sleutel: hoofdletters, lidwoord en leestekens', suggestionKey('De Gymschoenen!'), 'gymschoenen');
check('sleutel: accenten', suggestionKey('Café-pas'), 'cafe pas');

// Per item.
const basis = (patch: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  source: 'parro',
  parroUid: 'p1',
  title: 'Gymles',
  date: '2026-10-10',
  allDay: true,
  person: 'matthijs',
  category: 'school',
  bring: [],
  notes: 'Neem gymschoenen en een handdoek mee.',
  syncedNotes: 'Neem gymschoenen en een handdoek mee.',
  reminder: true,
  createdAt: '',
  updatedAt: '',
  ...patch,
});
const today = '2026-10-06';
const tekst = (e: CalendarEvent) => bringSuggestions(e, today).map((s) => s.text);

check('suggesties uit de omschrijving', tekst(basis()), ['Gymschoenen', 'Handdoek']);
check('ook uit de titel', tekst(basis({ title: 'Neem een knuffel mee', notes: undefined, syncedNotes: undefined })), ['Knuffel']);
check('eigen notitie telt ook', tekst(basis({ notes: 'Neem gymschoenen en een handdoek mee.\nNeem ook een pet mee.' })), ['Gymschoenen', 'Handdoek', 'Pet']);
check('niet voor je eigen items', tekst(basis({ source: 'local' })), []);
check('niet voor een agenda uit Gmail', tekst(basis({ source: 'agenda' })), []);
check('niet voor iets dat voorbij is', tekst(basis({ date: '2026-10-05' })), []);
check('vandaag telt nog', tekst(basis({ date: today })), ['Gymschoenen', 'Handdoek']);
check('meerdaags dat nog loopt telt', tekst(basis({ date: '2026-10-05', endDate: '2026-10-07' })), ['Gymschoenen', 'Handdoek']);
check(
  'wat al in het lijstje staat valt af',
  tekst(basis({ bring: [{ id: 'b1', text: 'gymschoenen', done: false }] })),
  ['Handdoek'],
);
check(
  'ook als het lijstje net iets anders heet',
  tekst(basis({ bring: [{ id: 'b1', text: 'Gymschoenen met naam', done: true }] })),
  ['Handdoek'],
);
check('afgewezen valt af', tekst(basis({ suggestionsOff: ['handdoek'] })), ['Gymschoenen']);
check('alles afgewezen', tekst(basis({ suggestionsOff: ['handdoek', 'gymschoenen'] })), []);

const veel = basis({ notes: undefined, syncedNotes: 'Meenemen: a1, b2, c3, d4, e5, f6, g7' });
check('niet meer dan vijf tegelijk', bringSuggestions(veel, today).length, 5);

report('suggesties');
