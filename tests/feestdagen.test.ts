/** Controleert de Nederlandse feestdagen: Pasen en wat daarvan afhangt, Koningsdag en de gezinsdagen. */
import { easter, feestdagenInJaar, feestdagenOp, feestdagenTussen, feestdagNamen, isFeestdag } from '../shared/feestdagen';
import { check, report } from './helpers';

// Bekende Paasdata
check('Pasen 2024', easter(2024), '2024-03-31');
check('Pasen 2025', easter(2025), '2025-04-20');
check('Pasen 2026', easter(2026), '2026-04-05');
check('Pasen 2027', easter(2027), '2027-03-28');
check('Pasen 2038 (laat)', easter(2038), '2038-04-25');
check('Pasen 2285 (vroegst mogelijk, 22 maart)', easter(2285), '2285-03-22');

const d26 = Object.fromEntries(feestdagenInJaar(2026).map((f) => [f.name, f.date]));
check('Goede Vrijdag 2026', d26['Goede Vrijdag'], '2026-04-03');
check('Tweede Paasdag 2026', d26['Tweede Paasdag'], '2026-04-06');
check('Hemelvaart 2026', d26['Hemelvaartsdag'], '2026-05-14');
check('Eerste en tweede Pinksterdag 2026', [d26['Eerste Pinksterdag'], d26['Tweede Pinksterdag']], ['2026-05-24', '2026-05-25']);
check('Koningsdag 2026 (maandag 27 april)', d26['Koningsdag'], '2026-04-27');
check('Bevrijdingsdag, Kerst en Nieuwjaar', [d26['Bevrijdingsdag'], d26['Nieuwjaarsdag'], d26['Eerste Kerstdag'], d26['Tweede Kerstdag']], ['2026-05-05', '2026-01-01', '2026-12-25', '2026-12-26']);

// Koningsdag verschuift als 27 april op zondag valt (2025 en 2031 niet; 2014 en 2020 wel was zaterdag)
check('Koningsdag 2025: 27 april is een zondag, dus 26 april', feestdagenInJaar(2025).find((f) => f.name === 'Koningsdag')?.date, '2025-04-26');
check('Koningsdag 2020: 27 april was een maandag', feestdagenInJaar(2020).find((f) => f.name === 'Koningsdag')?.date, '2020-04-27');
check('Koningsdag 2026: op een maandag', feestdagenInJaar(2026).find((f) => f.name === 'Koningsdag')?.date, '2026-04-27');
check('Koningsdag 2027: 27 april valt op een dinsdag', feestdagenInJaar(2027).find((f) => f.name === 'Koningsdag')?.date, '2027-04-27');
check('Koningsdag 2021: 27 april was een dinsdag', feestdagenInJaar(2021).find((f) => f.name === 'Koningsdag')?.date, '2021-04-27');

// Gezinsdagen
check('Moederdag 2026: tweede zondag van mei', d26['Moederdag'], '2026-05-10');
check('Vaderdag 2026: derde zondag van juni', d26['Vaderdag'], '2026-06-21');
check('Moederdag 2027: mei begint op een zaterdag', feestdagenInJaar(2027).find((f) => f.name === 'Moederdag')?.date, '2027-05-09');
check('Moederdag 2025: mei begint op een donderdag', feestdagenInJaar(2025).find((f) => f.name === 'Moederdag')?.date, '2025-05-11');
check('Moederdag 2023: mei begint op een maandag', feestdagenInJaar(2023).find((f) => f.name === 'Moederdag')?.date, '2023-05-14');
check('Sinterklaasavond, Kerstavond en Oudejaarsavond', [d26['Sinterklaasavond'], d26['Kerstavond'], d26['Oudejaarsavond']], ['2026-12-05', '2026-12-24', '2026-12-31']);
check('16 per jaar, 11 officieel en 5 gezinsdagen', [feestdagenInJaar(2026).length, feestdagenInJaar(2026).filter((f) => f.soort === 'feestdag').length], [16, 11]);
check('op volgorde van datum', feestdagenInJaar(2026).map((f) => f.date), [...feestdagenInJaar(2026).map((f) => f.date)].sort());

// Opzoeken
check('een gewone dag heeft niets', feestdagenOp('2026-10-14'), []);
check('een datum levert naam en soort', feestdagenOp('2026-04-06'), [{ date: '2026-04-06', name: 'Tweede Paasdag', soort: 'feestdag' }]);
check('Kerstavond is een gezinsdag, geen feestdag', [isFeestdag(feestdagenOp('2026-12-24')), feestdagNamen(feestdagenOp('2026-12-24'))], [false, 'Kerstavond']);
check('Eerste Kerstdag is een feestdag', isFeestdag(feestdagenOp('2026-12-25')), true);
check('een bereik over de jaargrens', [...feestdagenTussen('2026-12-20', '2027-01-05').keys()], ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-31', '2027-01-01']);
check('een bereik binnen een maand', [...feestdagenTussen('2026-05-01', '2026-05-31').keys()], ['2026-05-05', '2026-05-10', '2026-05-14', '2026-05-24', '2026-05-25']);

report('feestdagen');
