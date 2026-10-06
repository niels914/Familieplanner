/**
 * Verjaardagen: wanneer is iemand jarig, hoe oud wordt diegene, en wanneer is het tijd om aan een
 * cadeau te denken. Een verjaardag staat bij een contact als 'YYYY-MM-DD', of '--MM-DD' als het
 * geboortejaar onbekend is. Dan weten we de leeftijd niet en laten we die weg.
 *
 * Wie op 29 februari jarig is, viert het in een jaar zonder schrikkeldag op 28 februari.
 */

import { diffDays, formatLong } from './dates';
import type { Contact } from './types';

/** Zoveel dagen vooraf herinneren we aan een cadeau. */
export const GIFT_REMIND_DAYS = 21;

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Het geboortejaar, als dat er is en geloofwaardig is. */
export function birthYear(birthday: string | undefined): number | undefined {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(birthday ?? '');
  if (!m) return undefined;
  const year = Number(m[1]);
  return year >= 1900 ? year : undefined;
}

/** De datum van de verjaardag in een bepaald jaar, 'YYYY-MM-DD'. */
export function birthdayInYear(birthday: string, year: number): string {
  const mmdd = birthday.slice(-5);
  const day = mmdd === '02-29' && !isLeap(year) ? '02-28' : mmdd;
  return `${year}-${day}`;
}

/** Is iemand op deze datum jarig? */
export const isBirthdayOn = (birthday: string | undefined, date: string): boolean =>
  Boolean(birthday) && birthdayInYear(birthday!, Number(date.slice(0, 4))) === date;

/** Hoe oud iemand wordt (of wordt gewenst) op de verjaardag in het jaar van `date`. */
export function ageTurning(birthday: string | undefined, date: string): number | undefined {
  const born = birthYear(birthday);
  if (born === undefined) return undefined;
  const age = Number(date.slice(0, 4)) - born;
  return age >= 0 ? age : undefined;
}

export interface NextBirthday {
  date: string;
  /** Dagen vanaf vandaag; 0 is vandaag. */
  days: number;
  /** Hoe oud iemand dan wordt, als het geboortejaar bekend is. */
  age?: number;
}

/** De eerstvolgende verjaardag, vandaag meegerekend. */
export function nextBirthday(birthday: string, today: string): NextBirthday {
  const year = Number(today.slice(0, 4));
  let date = birthdayInYear(birthday, year);
  if (date < today) date = birthdayInYear(birthday, year + 1);
  return { date, days: diffDays(today, date), age: ageTurning(birthday, date) };
}

/** Wie is op deze datum jarig? Alleen overige contacten; bij klasgenootjes en oppassen houden we het niet bij. */
export const birthdayContactsOn = (contacts: Contact[], date: string): Contact[] =>
  contacts.filter((c) => c.kind === 'overig' && isBirthdayOn(c.birthday, date));

/** "wordt 38", of niets als het geboortejaar onbekend is. */
export const turningLabel = (age: number | undefined): string => (age === undefined ? '' : `wordt ${age}`);

/** "over 3 weken", "over 10 dagen", "morgen". */
export function inDaysLabel(days: number): string {
  if (days <= 0) return 'vandaag';
  if (days === 1) return 'morgen';
  if (days >= 14) return `over ${Math.round(days / 7)} weken`;
  return `over ${days} dagen`;
}

export interface GiftReminder {
  contact: Contact;
  /** De verjaardag waar het om gaat, 'YYYY-MM-DD'. */
  date: string;
  days: number;
  age?: number;
}

/**
 * Wie is er binnen drie weken jarig en hebben we daar nog niet aan herinnerd? Elke verjaardag
 * levert hoogstens één herinnering op: de eerste avond dat hij binnen de drie weken valt.
 * Wie net is toegevoegd en over tien dagen jarig is, krijgt dus meteen een herinnering.
 */
export function dueGiftReminders(contacts: Contact[], today: string): GiftReminder[] {
  const out: GiftReminder[] = [];
  for (const c of contacts) {
    if (c.kind !== 'overig' || !c.birthday) continue;
    const next = nextBirthday(c.birthday, today);
    if (next.days < 1 || next.days > GIFT_REMIND_DAYS) continue;
    if (c.giftRemindedFor === next.date) continue;
    out.push({ contact: c, date: next.date, days: next.days, age: next.age });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.contact.name.localeCompare(b.contact.name, 'nl'));
}

/** De regel in de avondmelding, onder de kop "Cadeau regelen". */
export function giftLine(r: GiftReminder): string {
  const wie = r.age !== undefined ? `${r.contact.name} wordt ${r.age}` : `${r.contact.name} is jarig`;
  const idee = r.contact.giftIdeas ? ` Idee: ${r.contact.giftIdeas}.` : '';
  return `${wie} op ${formatLong(r.date)} (${inDaysLabel(r.days)}).${idee}`;
}
