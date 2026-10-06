/**
 * Een agenda-item kan voor meer dan één persoon zijn, bijvoorbeeld een uitje van Niels en Irene.
 * `person` blijft de eerste (die bepaalt de kleur en de groep bij het klaarzetten); de rest staat
 * in `others`. "Gezin" is iedereen en gaat dus nooit samen met anderen.
 */

import { PERSON_LABEL, type CalendarEvent, type PersonId } from './types';

type Who = Pick<CalendarEvent, 'person' | 'others'>;

const VALID: PersonId[] = ['matthijs', 'amelie', 'lotte', 'gezin', 'niels', 'irene'];

/** Alle betrokkenen, de eerste eerst. */
export const peopleOf = (e: Who): PersonId[] => [e.person, ...(e.others ?? [])];

/** Hoort iemand bij dit item? */
export const involves = (e: Who, who: PersonId): boolean => peopleOf(e).includes(who);

/** "Niels en Irene", "Matthijs, Amélie en Lotte", of "Gezin". */
export function peopleNames(e: Who): string {
  const names = peopleOf(e).map((p) => PERSON_LABEL[p]);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
}

/** De andere betrokkenen netjes: geen dubbelen, geen onbekenden, niet de eerste, en niet bij "gezin". */
export function cleanOthers(person: PersonId, others: readonly PersonId[] | null | undefined): PersonId[] | undefined {
  if (person === 'gezin') return undefined;
  const out: PersonId[] = [];
  for (const p of others ?? []) {
    if (p !== person && p !== 'gezin' && VALID.includes(p) && !out.includes(p)) out.push(p);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Een persoon aan- of uitzetten in de keuze. De eerste blijft de eerste zolang hij erbij staat; haal
 * je hem weg, dan schuift de volgende op. Je kunt de laatste niet uitzetten, en "gezin" vervangt
 * de rest.
 */
export function togglePerson(selection: Who, id: PersonId): { person: PersonId; others: PersonId[] } {
  const { person } = selection;
  const others = selection.others ?? [];

  if (id === 'gezin') return { person: 'gezin', others: [] };
  if (person === 'gezin') return { person: id, others: [] };
  if (id === person) {
    return others.length > 0 ? { person: others[0], others: others.slice(1) } : { person, others: [] };
  }
  return { person, others: others.includes(id) ? others.filter((p) => p !== id) : [...others, id] };
}
