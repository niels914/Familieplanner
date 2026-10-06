/** Controleert dat oppassen op het contact herkend worden, niet op de naam. */
import type { CalendarEvent, Contact } from '../shared/types';
import { sitterKey, sitterLabel, sitterOptions } from '../src/lib/oppas';
import { check, report } from './helpers';

const contact = (id: string, name: string, kind: Contact['kind'] = 'oppas'): Contact => ({
  id,
  kind,
  name,
  parents: [],
  createdAt: '',
  updatedAt: '',
});
const moment = (id: string, name: string, contactId?: string): CalendarEvent => ({
  id,
  source: 'local',
  title: 'Oppas',
  date: '2026-10-10',
  allDay: true,
  person: 'gezin',
  category: 'oppas',
  bring: [],
  reminder: true,
  sitter: { name, contactId, start: '18:00', end: '22:00', rate: 7, paid: false },
  createdAt: '',
  updatedAt: '',
});

const contacten = [contact('c-sanne', 'Sanne Vermeer'), contact('c-joris', 'Joris Peters'), contact('c-arts', 'Huisarts', 'overig')];

check('met contact: de sleutel is het contact', sitterKey(moment('a', 'Sanne', 'c-sanne'), contacten), 'c-sanne');
check('een andere schrijfwijze van de naam hoort toch bij het contact', sitterKey(moment('b', 'sanne v.', 'c-sanne'), contacten), 'c-sanne');
check('hernoemd contact: label volgt het contact', sitterLabel(moment('c', 'Oude naam', 'c-sanne'), contacten), 'Sanne Vermeer');
check('los ingevulde naam: sleutel op naam, hoofdletters maken niet uit', sitterKey(moment('d', ' Opa Henk '), contacten), 'naam:opa henk');
check('los ingevulde naam: zelfde sleutel', sitterKey(moment('e', 'opa henk'), contacten), 'naam:opa henk');
check('een contact dat geen oppas is, telt niet als contact', sitterKey(moment('f', 'Huisarts', 'c-arts'), contacten), 'naam:huisarts');
check('een verwijderd contact valt terug op de naam', sitterKey(moment('g', 'Kees', 'weg'), contacten), 'naam:kees');
check('oud moment zonder koppeling, naam komt precies overeen met een oppas: hoort bij dat contact', sitterKey(moment('i', ' sanne vermeer '), contacten), 'c-sanne');
check('oud moment: alleen de voornaam, en er is maar één zo\'n oppas', sitterKey(moment('j', 'Sanne'), contacten), 'c-sanne');
const tweeSannes = [...contacten, contact('c-sanne2', 'Sanne de Boer')];
check('maar bij twee oppassen met die voornaam raden we niet', sitterKey(moment('k', 'Sanne'), tweeSannes), 'naam:sanne');
check('met de hele naam is het wel duidelijk', sitterKey(moment('l', 'Sanne de Boer'), tweeSannes), 'c-sanne2');
check('een tweede woord dat niet klopt, is geen voornaam', sitterKey(moment('m', 'Sanne Jansen'), contacten), 'naam:sanne jansen');
check('zonder naam', sitterLabel(moment('h', '  '), contacten), 'Zonder naam');

const alle = [moment('1', 'Sanne', 'c-sanne'), moment('2', 'Opa Henk'), moment('3', 'opa henk'), moment('4', 'Anders', 'weg')];
check(
  'keuzes: eerst de oppassen uit Contacten, dan losse namen, zonder dubbelen',
  sitterOptions(alle, contacten).map((o) => o.label),
  ['Joris Peters', 'Sanne Vermeer', 'Anders', 'Opa Henk'],
);
check('een oppas zonder momenten staat er toch bij', sitterOptions([], contacten).map((o) => o.value), ['c-joris', 'c-sanne']);
check('geen contacten en geen momenten', sitterOptions([], []), []);

report('oppassen');
