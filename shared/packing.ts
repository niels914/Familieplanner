/** Rekenregels voor de paklijst. Gedeeld met de backend, zodat de lijst van een
 *  nieuwe reis op de server wordt opgebouwd en hier getest kan worden. */
import {
  DEFAULT_PACK_LOCATIONS,
  PACK_BASE_NIGHTS,
  PACK_GROUP_PERSON,
  type PackItem,
  type Trip,
  type TripItem,
} from './types';

/**
 * Het aantal voor een kortere reis. De aantallen in de masterlijst gelden voor
 * PACK_BASE_NIGHTS nachten; voor een weekend rekenen we evenredig terug en
 * nemen we één reserve mee (kinderen maken kleren vuil). Nooit meer dan het
 * standaardaantal: een extra lange reis wordt niet voller, je wast onderweg.
 */
export function scaleQty(qty: number, scales: boolean, nights: number): number {
  if (!scales || nights >= PACK_BASE_NIGHTS) return qty;
  const n = Math.max(1, nights);
  return Math.min(qty, Math.ceil((qty * n) / PACK_BASE_NIGHTS) + 1);
}

type TripSetup = Pick<Trip, 'kind' | 'nights' | 'abroad' | 'who'>;

/** Of een masteritem op de lijst van deze reis hoort. */
export function belongsOnTrip(item: PackItem, trip: TripSetup): boolean {
  if (!item.kinds.includes(trip.kind)) return false;
  if (item.abroadOnly && !trip.abroad) return false;
  const person = PACK_GROUP_PERSON[item.group];
  if (person && !trip.who.includes(person)) return false;
  return true;
}

/** Bouwt de paklijst van een nieuwe reis op uit de masterlijst. */
export function buildTripItems(
  master: PackItem[],
  trip: TripSetup,
  makeId: () => string,
): TripItem[] {
  return master
    .filter((item) => belongsOnTrip(item, trip))
    .map((item) => ({
      id: makeId(),
      masterId: item.id,
      name: item.name,
      group: item.group,
      qty: scaleQty(item.qty, item.scales, trip.nights),
      location: item.location,
      packed: false,
      toBuy: item.toBuy,
      note: item.note,
    }));
}

export function progress(items: TripItem[]): { packed: number; total: number } {
  return { packed: items.filter((i) => i.packed).length, total: items.length };
}

/** Plekken in de vaste inlaadvolgorde, daarna nieuwe plekken op alfabet. */
export function orderLocations(locations: Iterable<string>): string[] {
  const seen = new Set(locations);
  const known = DEFAULT_PACK_LOCATIONS.filter((l) => seen.has(l));
  const extra = [...seen].filter((l) => !DEFAULT_PACK_LOCATIONS.includes(l)).sort((a, b) => a.localeCompare(b, 'nl'));
  return [...known, ...extra];
}

/**
 * Regel voor de avondherinnering als de reis morgen vertrekt, of null als er
 * niets meer in te pakken valt. Noemt de eerste paar dingen, zodat je in de
 * melding al ziet wat er nog mist.
 */
export function tripReminderLine(trip: Trip, maxNames = 4): string | null {
  const open = trip.items.filter((i) => !i.packed);
  if (open.length === 0) return null;
  const names = open.slice(0, maxNames).map((i) => i.name.toLowerCase());
  const more = open.length - names.length;
  const list = names.join(', ') + (more > 0 ? ` en ${more} meer` : '');
  const count = open.length === 1 ? '1 ding' : `${open.length} dingen`;
  return `🧳 ${trip.name}: nog ${count} in te pakken\n   ${list}`;
}
