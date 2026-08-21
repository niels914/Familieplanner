import { getStore, type Store } from '@netlify/blobs';
import type {
  AppData,
  CalendarEvent,
  Contact,
  Meal,
  PickupOverride,
  PickupRule,
  PushSubscriptionRecord,
  Settings,
  ShoppingItem,
} from '../../shared/types';

const STORE_NAME = 'familieplanner';

/** Elke collectie is één JSON-document. De dataset van één gezin is klein genoeg
 *  om in zijn geheel te lezen en te schrijven; schrijven gaat met een etag-check
 *  zodat gelijktijdige wijzigingen van twee telefoons elkaar niet overschrijven. */
export type Collection =
  | 'events'
  | 'contacts'
  | 'pickupRules'
  | 'pickupOverrides'
  | 'shopping'
  | 'meals'
  | 'settings'
  | 'pushSubs';

export const DEFAULT_SETTINGS: Settings = { reminderHour: 19 };

const EMPTY: Record<Collection, unknown> = {
  events: [] as CalendarEvent[],
  contacts: [] as Contact[],
  pickupRules: [] as PickupRule[],
  pickupOverrides: [] as PickupOverride[],
  shopping: [] as ShoppingItem[],
  meals: [] as Meal[],
  settings: DEFAULT_SETTINGS,
  pushSubs: [] as PushSubscriptionRecord[],
};

let cached: Store | null = null;

function store(): Store {
  if (!cached) cached = getStore({ name: STORE_NAME, consistency: 'strong' });
  return cached;
}

export async function read<T>(collection: Collection): Promise<T> {
  const res = await store().getWithMetadata(collection, { type: 'json' });
  if (!res || res.data === null || res.data === undefined) {
    return structuredClone(EMPTY[collection]) as T;
  }
  return res.data as T;
}

/**
 * Lees-wijzig-schrijf voor een collectie.
 *
 * Netlify Blobs kent (nog) geen voorwaardelijk schrijven, dus we lossen
 * gelijktijdige wijzigingen op door de bewerking als *operatie* te behandelen:
 * na het schrijven lezen we terug, en als er iets anders staat dan wij
 * schreven, was iemand ons voor en passen we onze operatie opnieuw toe op hun
 * versie. Beide wijzigingen blijven zo behouden.
 */
export async function update<T>(
  collection: Collection,
  mutate: (current: T) => T,
): Promise<T> {
  let attempt = 0;
  let written = mutate(await read<T>(collection));
  await store().setJSON(collection, written);

  while (attempt < 4) {
    const readBack = await read<T>(collection);
    if (JSON.stringify(readBack) === JSON.stringify(written)) return written;
    // Iemand schreef tussendoor: onze operatie opnieuw toepassen op hun versie.
    written = mutate(readBack);
    await store().setJSON(collection, written);
    attempt++;
    await new Promise((r) => setTimeout(r, 50 * attempt));
  }
  return written;
}

export async function overwrite<T>(collection: Collection, value: T): Promise<void> {
  await store().setJSON(collection, value);
}

/** Alles in één keer, voor het openen van de app. */
export async function readAll(): Promise<AppData> {
  const [events, contacts, pickupRules, pickupOverrides, shopping, meals, settings] =
    await Promise.all([
      read<CalendarEvent[]>('events'),
      read<Contact[]>('contacts'),
      read<PickupRule[]>('pickupRules'),
      read<PickupOverride[]>('pickupOverrides'),
      read<ShoppingItem[]>('shopping'),
      read<Meal[]>('meals'),
      read<Settings>('settings'),
    ]);
  return {
    events,
    contacts,
    pickupRules,
    pickupOverrides,
    shopping,
    meals,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}
