/** Controleert zoeken, groeperen en tellen van bonnetjes in de lijst. */
import type { Receipt } from '../shared/types';
import { bedrag, filterCounts, groupOf, parseBedrag, receiptGroups, searchReceipts } from '../src/lib/bonnetjes';
import { check, report } from './helpers';

const vandaag = '2026-10-04';
const bon = (id: string, extra: Partial<Receipt> = {}): Receipt => ({
  id,
  title: id,
  purchaseDate: '2026-09-01',
  person: 'gezin',
  files: [],
  createdAt: `2026-09-01T10:0${id.length}:00.000Z`,
  updatedAt: '',
  ...extra,
});

const lijst: Receipt[] = [
  bon('Wasmachine Bosch', { store: 'Coolblue', amountCents: 54900, warrantyMonths: 24, serial: 'WAU28', person: 'gezin' }),
  bon('Laptop', { store: 'Bol', amountCents: 89900, warrantyMonths: 12, purchaseDate: '2025-11-01' }), // t/m 2026-11-01: bijna
  bon('Oude föhn', { purchaseDate: '2023-01-10', warrantyMonths: 24 }), // verlopen
  bon('Wandelschoenen', { store: 'Bever', person: 'matthijs' }),
  bon('', { purchaseDate: '2026-10-03' }), // alleen een foto
  bon('Speelgoedkeuken', { person: 'amelie', warrantyMonths: 60, purchaseDate: '2026-12-01' }),
];

// ------------------------------------------------------------------------ zoeken
check('zonder zoekwoord: alles', searchReceipts(lijst, '  ').length, 6);
check('op een stuk van de titel', searchReceipts(lijst, 'wasmach').map((r) => r.title), ['Wasmachine Bosch']);
check('hoofdletters maken niet uit', searchReceipts(lijst, 'LAPTOP').length, 1);
check('op de winkel', searchReceipts(lijst, 'coolblue').length, 1);
check('op het serienummer', searchReceipts(lijst, 'wau28').length, 1);
check('zonder accenten: foehn zonder trema', searchReceipts(lijst, 'fohn').length, 1);
check('op van wie: de naam van het kind', searchReceipts(lijst, 'matthijs').map((r) => r.title), ['Wandelschoenen']);
check('Amélie zonder accent', searchReceipts(lijst, 'amelie').map((r) => r.title), ['Speelgoedkeuken']);
check('op het bedrag, hele euro’s', searchReceipts(lijst, '549').length, 1);
check('alle woorden moeten kloppen', searchReceipts(lijst, 'wasmachine bol').length, 0);
check('twee woorden in een andere volgorde', searchReceipts(lijst, 'bosch wasmachine').length, 1);
check('niets gevonden', searchReceipts(lijst, 'koelkast'), []);
check('een bonnetje zonder titel is vindbaar op "bonnetje"', searchReceipts(lijst, 'bonnetje').length, 1);

// ---------------------------------------------------------------------- groepen
check('groep: zonder titel hoort bij nog aanvullen', groupOf(lijst[4], vandaag), 'aanvullen');
check('groep: bijna', groupOf(lijst[1], vandaag), 'bijna');
check('groep: loopt', groupOf(lijst[0], vandaag), 'loopt');
check('groep: zonder garantie', groupOf(lijst[3], vandaag), 'geen');
check('groep: verlopen', groupOf(lijst[2], vandaag), 'verlopen');
check('groepen in vaste volgorde, lege weg', receiptGroups(lijst, vandaag).map((g) => g.id), ['aanvullen', 'bijna', 'loopt', 'geen', 'verlopen']);
check('zonder bonnetjes geen groepen', receiptGroups([], vandaag), []);
check('bij "bijna" staat wat het eerst afloopt bovenaan', receiptGroups([bon('B', { warrantyMonths: 12, purchaseDate: '2025-11-20' }), bon('A', { warrantyMonths: 12, purchaseDate: '2025-11-01' })], vandaag)[0].items.map((r) => r.title), ['A', 'B']);
check('de rest: het nieuwste eerst', receiptGroups([bon('Oud', { purchaseDate: '2026-01-01' }), bon('Nieuw', { purchaseDate: '2026-06-01' })], vandaag)[0].items.map((r) => r.title), ['Nieuw', 'Oud']);
check('filter loopt: loopt én bijna', receiptGroups(lijst, vandaag, 'loopt').map((g) => g.id), ['bijna', 'loopt']);
check('filter verlopen', receiptGroups(lijst, vandaag, 'verlopen').map((g) => g.items[0].title), ['Oude föhn']);
check('filter nog aanvullen', receiptGroups(lijst, vandaag, 'aanvullen').length, 1);
check('filter zonder resultaat', receiptGroups([lijst[0]], vandaag, 'verlopen'), []);

check('tellingen', filterCounts(lijst, vandaag), { alles: 6, loopt: 3, bijna: 1, verlopen: 1, aanvullen: 1 });

// ----------------------------------------------------------------------- bedrag
check('bedrag tonen', bedrag(12900), '129,00');
check('bedrag met centen', bedrag(5495), '54,95');
check('bedrag typen: met komma', parseBedrag('129,50'), 12950);
check('bedrag typen: met punt', parseBedrag('129.5'), 12950);
check('bedrag typen: met euroteken en spatie', parseBedrag('€ 1,29'), 129);
check('bedrag typen: duizendtal met punt', parseBedrag('1.299,00'), 129900);
check('bedrag typen: leeg', parseBedrag(''), undefined);
check('bedrag typen: onzin', parseBedrag('veel'), undefined);
check('bedrag typen: negatief telt niet', parseBedrag('-5'), undefined);
check('bedrag typen: nul mag', parseBedrag('0'), 0);

report('bonnetjes');
