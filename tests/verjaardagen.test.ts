/** Verjaardagen tellen alleen bij overige contacten. */
import type { Contact } from '../shared/types';
import { birthdaysOnDate } from '../src/lib/events';
import { check, report } from './helpers';

const contact = (kind: Contact['kind'], name: string, birthday?: string): Contact => ({
  id: name,
  kind,
  name,
  parents: [],
  birthday,
  createdAt: '',
  updatedAt: '',
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

report('verjaardagen');
