/** Verjaardagen: alleen bij overige contacten, de leeftijd, schrikkeldagen en de herinnering drie weken vooraf. */
import type { Contact } from '../shared/types';
import { birthdaysOnDate } from '../src/lib/events';
import {
  ageTurning,
  birthYear,
  birthdayInYear,
  dueGiftReminders,
  giftLine,
  inDaysLabel,
  isBirthdayOn,
  nextBirthday,
  turningLabel,
} from '../shared/verjaardagen';
import { check, report } from './helpers';

const contact = (kind: Contact['kind'], name: string, birthday?: string, extra: Partial<Contact> = {}): Contact => ({
  id: name,
  kind,
  name,
  parents: [],
  birthday,
  createdAt: '',
  updatedAt: '',
  ...extra,
});

const boek = [
  contact('overig', 'Opa Henk', '1950-03-14'),
  contact('overig', 'Tante Els', '--03-14'),
  contact('klasgenoot', 'Fenna', '2021-03-14'),
  contact('oppas', 'Sanne', '1999-03-14'),
  contact('overig', 'Oma', '1952-05-02'),
];

check('alleen overige contacten', birthdaysOnDate(boek, '2026-03-14').map((c) => c.name), ['Opa Henk', 'Tante Els']);
check('jaar onbekend telt ook', birthdaysOnDate(boek, '2031-03-14').map((c) => c.name), ['Opa Henk', 'Tante Els']);
check('andere dag', birthdaysOnDate(boek, '2026-05-02').map((c) => c.name), ['Oma']);
check('niemand jarig', birthdaysOnDate(boek, '2026-06-01'), []);

// --- leeftijd
check('geboortejaar uit een volledige datum', [birthYear('1950-03-14'), birthYear('--03-14'), birthYear(undefined), birthYear('0000-03-14')], [1950, undefined, undefined, undefined]);
check('Opa Henk wordt 76', ageTurning('1950-03-14', '2026-03-14'), 76);
check('de leeftijd in het jaar van de verjaardag, ook ver vooruit', ageTurning('1950-03-14', '2031-03-14'), 81);
check('zonder jaar geen leeftijd', ageTurning('--03-14', '2026-03-14'), undefined);
check('een geboortedatum in de toekomst geeft niets', ageTurning('2030-01-01', '2026-03-14'), undefined);
check('"wordt 76" of niets', [turningLabel(76), turningLabel(undefined)], ['wordt 76', '']);

// --- schrikkeldag
check('29 feb in een gewoon jaar is 28 feb', birthdayInYear('2000-02-29', 2027), '2027-02-28');
check('29 feb in een schrikkeljaar blijft 29 feb', birthdayInYear('2000-02-29', 2028), '2028-02-29');
check('1900 was geen schrikkeljaar, 2000 wel', [birthdayInYear('--02-29', 2100), birthdayInYear('--02-29', 2000)], ['2100-02-28', '2000-02-29']);
check('schrikkelkind is jarig op 28 feb 2027', isBirthdayOn('2000-02-29', '2027-02-28'), true);
check('en niet op 1 maart', isBirthdayOn('2000-02-29', '2027-03-01'), false);
check('de lijst vindt een schrikkelkind', birthdaysOnDate([contact('overig', 'Sam', '2000-02-29')], '2027-02-28').map((c) => c.name), ['Sam']);

// --- volgende verjaardag
check('eerstvolgende dit jaar', nextBirthday('1950-03-14', '2026-01-10'), { date: '2026-03-14', days: 63, age: 76 });
check('vandaag telt mee', nextBirthday('1950-03-14', '2026-03-14'), { date: '2026-03-14', days: 0, age: 76 });
check('dit jaar al geweest: volgend jaar', nextBirthday('1950-03-14', '2026-03-15'), { date: '2027-03-14', days: 364, age: 77 });
check('jaar onbekend: wel de datum, geen leeftijd', nextBirthday('--03-14', '2026-03-01'), { date: '2026-03-14', days: 13, age: undefined });

// --- herinnering
check('drie weken vooraf', inDaysLabel(21), 'over 3 weken');
check('tien dagen', inDaysLabel(10), 'over 10 dagen');
check('morgen', inDaysLabel(1), 'morgen');

const familie = [
  contact('overig', 'Oma', '1952-05-02', { giftIdeas: 'een mooie plant' }),
  contact('overig', 'Opa Henk', '1950-03-14'),
  contact('overig', 'Tante Els', '--03-14'),
  contact('klasgenoot', 'Fenna', '2021-03-14'),
];
check('21 dagen vooraf komt er een herinnering', dueGiftReminders(familie, '2026-02-21').map((r) => [r.contact.name, r.days, r.age]), [
  ['Opa Henk', 21, 76],
  ['Tante Els', 21, undefined],
]);
check('22 dagen vooraf nog niet', dueGiftReminders(familie, '2026-02-20').length, 0);
check('klasgenootjes tellen niet', dueGiftReminders(familie, '2026-02-21').some((r) => r.contact.name === 'Fenna'), false);
check('de dag zelf is te laat voor een cadeau', dueGiftReminders(familie, '2026-03-14').length, 0);
check('wie net is toegevoegd en over 10 dagen jarig is, krijgt de herinnering meteen', dueGiftReminders(familie, '2026-03-04').map((r) => r.contact.name), ['Opa Henk', 'Tante Els']);

const herinnerd = familie.map((c) => (c.name === 'Opa Henk' ? { ...c, giftRemindedFor: '2026-03-14' } : c));
check('een verjaardag waar al aan is herinnerd, niet nog eens', dueGiftReminders(herinnerd, '2026-03-04').map((r) => r.contact.name), ['Tante Els']);
check('het jaar erna wel weer', dueGiftReminders(herinnerd, '2027-03-04').map((r) => r.contact.name), ['Opa Henk', 'Tante Els']);
check('over de jaargrens heen', dueGiftReminders([contact('overig', 'Joost', '1990-01-10')], '2026-12-25').map((r) => [r.date, r.age]), [['2027-01-10', 37]]);

check('de regel in de melding, met leeftijd', giftLine(dueGiftReminders(familie, '2026-04-11')[0]), 'Oma wordt 74 op zaterdag 2 mei (over 3 weken). Idee: een mooie plant.');
check('zonder leeftijd', giftLine(dueGiftReminders(familie, '2026-02-21')[1]), 'Tante Els is jarig op zaterdag 14 maart (over 3 weken).');

report('verjaardagen');
