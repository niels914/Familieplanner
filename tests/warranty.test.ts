/** Controleert de rekenregels voor garantie, retourtermijn en herinneringen. */
import type { Receipt } from '../shared/types';
import { addMonths, alertLine, alertsFor, displayTitle, dueReminders, timeLeftLabel, wantsReminder, warrantyEnd, warrantyStatus } from '../shared/warranty';
import { check, report } from './helpers';

const bon = (extra: Partial<Receipt> = {}): Receipt => ({
  id: 'r1',
  title: 'Wasmachine',
  purchaseDate: '2026-03-12',
  person: 'gezin',
  files: [],
  createdAt: '',
  updatedAt: '',
  ...extra,
});

// -------------------------------------------------------------- maanden optellen
check('gewoon: 12 maart + 24 maanden', addMonths('2026-03-12', 24), '2028-03-12');
check('einde van de maand: 31 januari + 1 maand', addMonths('2026-01-31', 1), '2026-02-28');
check('in een schrikkeljaar: 31 januari + 1 maand', addMonths('2028-01-31', 1), '2028-02-29');
check('29 februari + 12 maanden', addMonths('2028-02-29', 12), '2029-02-28');
check('over het jaar heen: 15 november + 3 maanden', addMonths('2026-11-15', 3), '2027-02-15');
check('31 augustus + 6 maanden', addMonths('2026-08-31', 6), '2027-02-28');
check('0 maanden', addMonths('2026-05-05', 0), '2026-05-05');

// -------------------------------------------------------------------- einddatum
check('uit de maanden', warrantyEnd(bon({ warrantyMonths: 24 })), '2028-03-12');
check('een eigen datum gaat voor', warrantyEnd(bon({ warrantyMonths: 24, warrantyUntil: '2029-01-01' })), '2029-01-01');
check('zonder garantie: geen einddatum', warrantyEnd(bon()), undefined);
check('0 maanden is geen garantie', warrantyEnd(bon({ warrantyMonths: 0 })), undefined);

// ----------------------------------------------------------------------- status
const garantie = bon({ warrantyMonths: 24 }); // t/m 2028-03-12
check('ver weg: loopt', warrantyStatus(garantie, '2026-10-04').kind, 'loopt');
check('binnen 60 dagen: bijna', warrantyStatus(garantie, '2028-01-20').kind, 'bijna');
check('precies 60 dagen: nog bijna', warrantyStatus(garantie, '2028-01-12').kind, 'bijna');
check('61 dagen: nog loopt', warrantyStatus(garantie, '2028-01-11').kind, 'loopt');
check('op de laatste dag: nog bijna, 0 dagen', warrantyStatus(garantie, '2028-03-12'), { kind: 'bijna', end: '2028-03-12', daysLeft: 0 });
check('de dag erna: verlopen', warrantyStatus(garantie, '2028-03-13').kind, 'verlopen');
check('zonder garantie', warrantyStatus(bon(), '2026-10-04'), { kind: 'geen' });

// ------------------------------------------------------------------------ label
check('anderhalf jaar', timeLeftLabel('2026-10-04', '2028-03-12'), 'nog 1 jaar en 5 maanden');
check('precies twee jaar', timeLeftLabel('2026-03-12', '2028-03-12'), 'nog 2 jaar');
check('maanden', timeLeftLabel('2026-10-04', '2027-03-04'), 'nog 5 maanden');
check('een maand', timeLeftLabel('2026-10-04', '2026-12-04'), 'nog 2 maanden');
check('weken', timeLeftLabel('2026-10-04', '2026-10-30'), 'nog 4 weken');
check('dagen', timeLeftLabel('2026-10-04', '2026-10-10'), 'nog 6 dagen');
check('morgen', timeLeftLabel('2026-10-04', '2026-10-05'), 'nog 1 dag');
check('vandaag', timeLeftLabel('2026-10-04', '2026-10-04'), 'loopt vandaag af');
check('verlopen', timeLeftLabel('2026-10-05', '2026-10-04'), 'verlopen');
check('een jaar en een maand', timeLeftLabel('2026-10-04', '2027-11-04'), 'nog 1 jaar en 1 maand');

// ----------------------------------------------------------- wanneer herinneren
check('vanaf 50 euro: ja', wantsReminder({ amountCents: 5000 }), true);
check('49,99: nee', wantsReminder({ amountCents: 4999 }), false);
check('zonder bedrag: nee', wantsReminder({}), false);
check('een eigen keuze voor ja gaat voor', wantsReminder({ amountCents: 1000, remind: true }), true);
check('een eigen keuze voor nee gaat voor', wantsReminder({ amountCents: 90000, remind: false }), false);

// ------------------------------------------------------------------ aandachtslijst
const duur = bon({ id: 'a', title: 'Wasmachine', amountCents: 54900, warrantyMonths: 24 }); // t/m 2028-03-12
check('30 dagen vooraf: komt erbij', alertsFor([duur], '2028-02-11').map((a) => a.daysLeft), [30]);
check('31 dagen vooraf: nog niet', alertsFor([duur], '2028-02-10'), []);
check('op de laatste dag: nog wel', alertsFor([duur], '2028-03-12').map((a) => a.daysLeft), [0]);
check('verlopen: weg', alertsFor([duur], '2028-03-13'), []);
check('een goedkoop ding zonder eigen keuze: niet', alertsFor([bon({ amountCents: 3000, warrantyMonths: 24 })], '2028-03-01'), []);
check('goedkoop maar zelf aangezet: wel', alertsFor([bon({ amountCents: 3000, warrantyMonths: 24, remind: true })], '2028-03-01').length, 1);
check('afgehandeld ("geen klachten"): weg', alertsFor([{ ...duur, handled: { warranty: '2028-02-12' } }], '2028-02-20'), []);
check('zonder garantie: niets', alertsFor([bon({ amountCents: 99900 })], '2028-03-01'), []);

const schoenen = bon({ id: 'b', title: 'Schoenen', returnUntil: '2026-10-10' });
check('retour: 3 dagen vooraf', alertsFor([schoenen], '2026-10-07').map((a) => `${a.kind}:${a.daysLeft}`), ['return:3']);
check('retour: 4 dagen vooraf nog niet', alertsFor([schoenen], '2026-10-06'), []);
check('retour hoeft geen bedrag', alertsFor([schoenen], '2026-10-09').length, 1);
check('retour afgehandeld: weg', alertsFor([{ ...schoenen, handled: { return: '2026-10-08' } }], '2026-10-09'), []);

const beide = [
  bon({ id: 'x', title: 'Zeta', amountCents: 20000, warrantyMonths: 12, purchaseDate: '2025-10-20' }), // t/m 2026-10-20
  bon({ id: 'y', title: 'Alfa', returnUntil: '2026-10-07' }),
];
check('gesorteerd op wat het eerst afloopt', alertsFor(beide, '2026-10-05').map((a) => a.title), ['Alfa', 'Zeta']);

// -------------------------------------------------------------------- verstuurd
check('nieuw: moet verstuurd worden', dueReminders([duur], '2028-02-11').length, 1);
check('al verstuurd: niet nog eens', dueReminders([{ ...duur, reminded: { warranty: '2028-02-11' } }], '2028-02-12').length, 0);
check('garantie verstuurd, retour nog niet', dueReminders([{ ...schoenen, reminded: { warranty: '2026-09-01' } }], '2026-10-08').map((a) => a.kind), ['return']);

// ---------------------------------------------------------------------- teksten
check('titel: eigen titel', displayTitle(bon({ title: '  Wasmachine ' })), 'Wasmachine');
check('titel: zonder titel met de datum', displayTitle(bon({ title: '' })), 'Bonnetje 12 mrt');
check('regel: garantie', alertLine({ id: 'a', title: 'Wasmachine', kind: 'warranty', date: '2028-03-12', daysLeft: 30 }), 'De garantie op Wasmachine loopt op zondag 12 maart af.');
check('regel: garantie vandaag', alertLine({ id: 'a', title: 'Wasmachine', kind: 'warranty', date: '2028-03-12', daysLeft: 0 }), 'De garantie op Wasmachine loopt vandaag af.');
check('regel: retour', alertLine({ id: 'b', title: 'Schoenen', kind: 'return', date: '2026-10-10', daysLeft: 3 }), 'Retourneren van Schoenen kan nog tot zaterdag 10 oktober.');

report('garantie');
