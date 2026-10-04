/** Controleert hoe een paklijst uit de masterlijst wordt opgebouwd. */
import { buildTripItems, orderLocations, scaleQty } from '../shared/packing';
import { PACKLIST_SEED } from '../shared/packlist-seed';
import { PACK_GROUPS, TRIP_KINDS, type PackItem } from '../shared/types';
import { check, report } from './helpers';

check('zomervakantie houdt het standaardaantal', scaleQty(12, true, 14), 12);
check('langer dan de standaard wordt het niet meer', scaleQty(12, true, 21), 12);
check('weekend van 2 nachten: evenredig plus één reserve', scaleQty(12, true, 2), 3);
check('3 nachten', scaleQty(10, true, 3), 4);
check('nooit meer dan het standaardaantal', scaleQty(2, true, 10), 2);
check('vaste dingen blijven staan', scaleQty(1, false, 2), 1);
check('0 nachten rekent als 1 nacht', scaleQty(12, true, 0), scaleQty(12, true, 1));

let n = 0;
const id = () => `id${++n}`;
const master: PackItem[] = [
  { id: 'm1', name: 'Tent', group: 'tent', qty: 1, scales: false, kinds: ['kamperen'], location: 'Karretje (los)' },
  { id: 'm2', name: 'Onderbroek', group: 'matthijs', qty: 12, scales: true, kinds: ['kamperen', 'huisje', 'logeren'] },
  { id: 'm3', name: 'Luiers', group: 'lotte', qty: 1, scales: false, kinds: ['kamperen', 'huisje', 'logeren'] },
  { id: 'm4', name: 'Paspoorten', group: 'overig', qty: 1, scales: false, kinds: ['kamperen', 'huisje', 'logeren'], abroadOnly: true },
  { id: 'm5', name: 'Jerrycan', group: 'tent', qty: 1, scales: false, kinds: [], toBuy: true },
];
const everyone = ['matthijs', 'amelie', 'lotte', 'irene', 'niels'] as const;

const camping = buildTripItems(master, { kind: 'kamperen', nights: 14, abroad: false, who: [...everyone] }, id);
check('kamperen zonder buitenland', camping.map((i) => i.name), ['Tent', 'Onderbroek', 'Luiers']);
check('masteritem blijft herkenbaar', camping[0].masterId, 'm1');
check('plek wordt meegenomen', camping[0].location, 'Karretje (los)');
check('niets is ingepakt', camping.every((i) => !i.packed), true);

const weekend = buildTripItems(master, { kind: 'logeren', nights: 2, abroad: true, who: [...everyone] }, id);
check('logeren laat de tent thuis', weekend.map((i) => i.name), ['Onderbroek', 'Luiers', 'Paspoorten']);
check('aantal schaalt mee met 2 nachten', weekend[0].qty, 3);

const withoutBaby = buildTripItems(master, { kind: 'kamperen', nights: 14, abroad: false, who: ['matthijs', 'niels'] }, id);
check('lijst van een persoon die niet mee is vervalt', withoutBaby.map((i) => i.name), ['Tent', 'Onderbroek']);

check('wensen zonder reistype komen nooit op een lijst', camping.some((i) => i.name === 'Jerrycan'), false);

check('nieuwe plekken komen na de vaste volgorde', orderLocations(['Auto', 'Zolder', 'Dakkoffer', 'Achterbak']), [
  'Dakkoffer',
  'Auto',
  'Achterbak',
  'Zolder',
]);

// De startlijst uit de Excel moet zelf kloppen.
check('startlijst heeft items', PACKLIST_SEED.length > 200, true);
check('alle groepen zijn geldig', PACKLIST_SEED.every((i) => PACK_GROUPS.includes(i.group)), true);
check('alle reistypes zijn geldig', PACKLIST_SEED.every((i) => i.kinds.every((k) => TRIP_KINDS.includes(k))), true);
const names = PACKLIST_SEED.map((i) => `${i.group}:${i.name.toLowerCase()}`);
check('geen dubbele items in de startlijst', new Set(names).size, names.length);

const seeded = PACKLIST_SEED.map((s, i) => ({ ...s, id: `s${i}` }));
const zomer = buildTripItems(seeded, { kind: 'kamperen', nights: 14, abroad: true, who: [...everyone] }, id);
const weekendje = buildTripItems(seeded, { kind: 'logeren', nights: 2, abroad: false, who: [...everyone] }, id);
check('een zomerkampeerlijst is groot', zomer.length > 150, true);
check('een logeerweekend is een stuk kleiner', weekendje.length < zomer.length / 2, true);
check('paspoorten staan op de zomerlijst', zomer.some((i) => i.name.toLowerCase() === 'paspoorten'), true);
check('paspoorten niet binnen Nederland', weekendje.some((i) => i.name.toLowerCase() === 'paspoorten'), false);

report('paklijst');
