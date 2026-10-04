/**
 * Oppassen herkennen op het contact, niet op de naam. Wordt een contact hernoemd of
 * staat de naam in een oudere afspraak anders getypt, dan hoort alles toch bij
 * dezelfde oppas. Zonder contact (een los ingevulde naam) valt het terug op die naam.
 */

import type { CalendarEvent, Contact } from '../../shared/types';

export interface SitterOption {
  /** Contact-id, of 'naam:…' voor een los ingevulde naam. */
  value: string;
  label: string;
}

const losseNaam = (name: string | undefined) => (name ?? '').trim().toLowerCase();

/**
 * Het contact bij dit moment: via de koppeling, en bij oudere momenten zonder koppeling
 * via een naam die overeenkomt met een oppas uit Contacten: de hele naam, of een voornaam
 * als er maar één oppas zo heet.
 */
function contactVan(e: CalendarEvent, contacts: Contact[]): Contact | undefined {
  const oppassen = contacts.filter((c) => c.kind === 'oppas');
  const id = e.sitter?.contactId;
  const gekoppeld = id ? oppassen.find((c) => c.id === id) : undefined;
  if (gekoppeld) return gekoppeld;
  const naam = losseNaam(e.sitter?.name);
  if (!naam) return undefined;

  const precies = oppassen.filter((c) => losseNaam(c.name) === naam);
  if (precies.length === 1) return precies[0];

  // Alleen een voornaam ("Sanne") hoort bij het contact ("Sanne Vermeer") als er maar één
  // oppas met die voornaam is. Zijn het er twee, dan raden we niet.
  if (!naam.includes(' ')) {
    const voornaam = oppassen.filter((c) => losseNaam(c.name).split(' ')[0] === naam);
    if (voornaam.length === 1) return voornaam[0];
  }
  return undefined;
}

/** Bij welke oppas hoort dit moment? */
export function sitterKey(e: CalendarEvent, contacts: Contact[]): string {
  return contactVan(e, contacts)?.id ?? `naam:${losseNaam(e.sitter?.name)}`;
}

/** Hoe heet de oppas bij dit moment: de naam van het contact, anders wat er is ingevuld. */
export function sitterLabel(e: CalendarEvent, contacts: Contact[]): string {
  return contactVan(e, contacts)?.name ?? (e.sitter?.name?.trim() || 'Zonder naam');
}

/** De keuzes voor het filter: eerst de oppassen uit Contacten, dan los ingevulde namen. */
export function sitterOptions(moments: CalendarEvent[], contacts: Contact[]): SitterOption[] {
  const oppassen = contacts
    .filter((c) => c.kind === 'oppas')
    .map((c) => ({ value: c.id, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nl'));

  const bekend = new Set(oppassen.map((o) => o.value));
  const los = new Map<string, string>();
  for (const e of moments) {
    const key = sitterKey(e, contacts);
    if (bekend.has(key) || los.has(key)) continue;
    los.set(key, sitterLabel(e, contacts));
  }
  const losse = [...los].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'nl'));
  return [...oppassen, ...losse];
}
