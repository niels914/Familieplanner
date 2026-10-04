/**
 * Klaarzetten: wat er nog mee moet, per persoon gegroepeerd, en hoever we zijn.
 * Gewone functies zonder scherm, zodat ze getest kunnen worden.
 */

import type { CalendarEvent, PersonId } from '../../shared/types';

export interface PrepItem {
  event: CalendarEvent;
  item: { id: string; text: string };
}

/** Wat nog niet is afgevinkt, bij het item waar het bij hoort. */
export const openBring = (events: CalendarEvent[]): PrepItem[] =>
  events.flatMap((e) => e.bring.filter((b) => !b.done).map((item) => ({ event: e, item })));

/** Hoeveel is er al afgevinkt? */
export const doneBring = (events: CalendarEvent[]): number =>
  events.reduce((n, e) => n + e.bring.filter((b) => b.done).length, 0);

/** De kinderen eerst, dan de ouders, dan wat voor iedereen is. */
const PREP_ORDER: PersonId[] = ['matthijs', 'amelie', 'lotte', 'niels', 'irene', 'gezin'];

export interface PrepGroup {
  person: PersonId;
  items: PrepItem[];
}

/** Groepeert per persoon in vaste volgorde; binnen een groep blijft de volgorde van de dag. */
export function groupByPerson(items: PrepItem[]): PrepGroup[] {
  return PREP_ORDER.map((person) => ({
    person,
    items: items.filter((i) => i.event.person === person),
  })).filter((g) => g.items.length > 0);
}

/** "3 van 4 klaar", of kort wat er nog te doen is als er nog niets is afgevinkt. */
export function progressLabel(done: number, open: number): string {
  if (open === 0) return done > 0 ? 'Alles klaar' : '';
  if (done === 0) return `${open} te doen`;
  return `${done} van ${done + open} klaar`;
}

/** Het aandeel dat klaar is, van 0 tot 1. */
export const progressShare = (done: number, open: number): number =>
  done + open === 0 ? 0 : done / (done + open);
