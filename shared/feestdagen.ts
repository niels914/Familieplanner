/**
 * Nederlandse feestdagen, uitgerekend in plaats van opgehaald. De data liggen vast (Pasen volgt uit
 * een rekenregel), dus er is geen koppeling nodig: het werkt voor elk jaar, ook ver vooruit en
 * zonder verbinding. Ze worden alleen getoond; er staat niets van in de opslag.
 *
 * Twee soorten: de officiële feestdagen, en gezinsdagen waar jullie omheen plannen
 * (Sinterklaas, Kerstavond, Moederdag) maar die geen vrije dag zijn.
 */

import { addDays } from './dates';

export type FeestdagSoort = 'feestdag' | 'gezinsdag';

export interface Feestdag {
  date: string;
  name: string;
  soort: FeestdagSoort;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Eerste Paasdag volgens de Gregoriaanse rekenregel (Meeus, Jones en Butcher). */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month, day);
}

/** Weekdag van een datum, 0 = zondag. */
const weekday = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** De n-de zondag van een maand. */
const nthSunday = (year: number, month: number, n: number): string => {
  const first = weekday(ymd(year, month, 1));
  const firstSunday = 1 + ((7 - first) % 7);
  return ymd(year, month, firstSunday + (n - 1) * 7);
};

/** Alle feestdagen en gezinsdagen van één jaar, op volgorde van datum. */
export function feestdagenInJaar(year: number): Feestdag[] {
  const pasen = easter(year);
  const feest = (date: string, name: string): Feestdag => ({ date, name, soort: 'feestdag' });
  const gezin = (date: string, name: string): Feestdag => ({ date, name, soort: 'gezinsdag' });

  // Koningsdag is 27 april, en 26 april als de 27e een zondag is.
  const koningsdag = weekday(ymd(year, 4, 27)) === 0 ? ymd(year, 4, 26) : ymd(year, 4, 27);

  return [
    feest(ymd(year, 1, 1), 'Nieuwjaarsdag'),
    feest(addDays(pasen, -2), 'Goede Vrijdag'),
    feest(pasen, 'Eerste Paasdag'),
    feest(addDays(pasen, 1), 'Tweede Paasdag'),
    feest(koningsdag, 'Koningsdag'),
    feest(ymd(year, 5, 5), 'Bevrijdingsdag'),
    feest(addDays(pasen, 39), 'Hemelvaartsdag'),
    feest(addDays(pasen, 49), 'Eerste Pinksterdag'),
    feest(addDays(pasen, 50), 'Tweede Pinksterdag'),
    feest(ymd(year, 12, 25), 'Eerste Kerstdag'),
    feest(ymd(year, 12, 26), 'Tweede Kerstdag'),
    gezin(nthSunday(year, 5, 2), 'Moederdag'),
    gezin(nthSunday(year, 6, 3), 'Vaderdag'),
    gezin(ymd(year, 12, 5), 'Sinterklaasavond'),
    gezin(ymd(year, 12, 24), 'Kerstavond'),
    gezin(ymd(year, 12, 31), 'Oudejaarsavond'),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

/** Wat valt er op deze datum? Meestal niets, soms één, zelden twee (Pasen valt niet samen met iets anders, maar Koningsdag en Moederdag kunnen op dezelfde dag staan). */
export function feestdagenOp(date: string): Feestdag[] {
  return feestdagenInJaar(Number(date.slice(0, 4))).filter((f) => f.date === date);
}

/** Alle dagen met een feestdag in een bereik, als opzoeklijst op datum. Voor een maandoverzicht. */
export function feestdagenTussen(from: string, until: string): Map<string, Feestdag[]> {
  const out = new Map<string, Feestdag[]>();
  for (let year = Number(from.slice(0, 4)); year <= Number(until.slice(0, 4)); year++) {
    for (const f of feestdagenInJaar(year)) {
      if (f.date < from || f.date > until) continue;
      out.set(f.date, [...(out.get(f.date) ?? []), f]);
    }
  }
  return out;
}

/** "Koningsdag", of "Moederdag en Koningsdag" als er twee op één dag vallen. */
export const feestdagNamen = (lijst: Feestdag[]): string => lijst.map((f) => f.name).join(' en ');

/** Is dit een officiële feestdag (en geen gezinsdag)? Zo'n dag is meestal vrij van school en werk. */
export const isFeestdag = (lijst: Feestdag[]): boolean => lijst.some((f) => f.soort === 'feestdag');
