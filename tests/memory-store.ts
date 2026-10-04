/**
 * Vervangt netlify/lib/store.ts in de lokale testserver: dezelfde functies,
 * maar de data staat in het geheugen in plaats van in Supabase. Zo draait
 * lokaal precies dezelfde API-code als op Netlify.
 */

import type {
  AppData,
  CalendarEvent,
  Contact,
  Meal,
  PickupOverride,
  PickupRule,
  Decisions,
  Settings,
  ShoppingItem,
  Task,
} from '../shared/types';

export type Collection =
  | 'events'
  | 'contacts'
  | 'pickupRules'
  | 'pickupOverrides'
  | 'shopping'
  | 'meals'
  | 'settings'
  | 'tasks'
  | 'decisions'
  | 'pushSubs';

export const DEFAULT_SETTINGS: Settings = { reminderHour: 19 };

const LEEG: Record<Collection, unknown> = {
  events: [],
  contacts: [],
  pickupRules: [],
  pickupOverrides: [],
  shopping: [],
  meals: [],
  settings: DEFAULT_SETTINGS,
  tasks: [],
  decisions: {},
  pushSubs: [],
};

const opslag = new Map<Collection, unknown>();

// De testserver zet de voorbeelddata klaar vóórdat deze module laadt.
const seed = (globalThis as { __FP_SEED__?: Partial<Record<Collection, unknown>> }).__FP_SEED__;
if (seed) for (const [k, v] of Object.entries(seed)) opslag.set(k as Collection, v);

export async function read<T>(collection: Collection): Promise<T> {
  return structuredClone((opslag.get(collection) ?? LEEG[collection]) as T);
}

export async function update<T>(collection: Collection, mutate: (current: T) => T): Promise<T> {
  const next = mutate(await read<T>(collection));
  opslag.set(collection, structuredClone(next));
  return next;
}

export async function overwrite<T>(collection: Collection, value: T): Promise<void> {
  opslag.set(collection, structuredClone(value));
}

export async function readAll(): Promise<AppData> {
  return {
    events: await read<CalendarEvent[]>('events'),
    contacts: await read<Contact[]>('contacts'),
    pickupRules: await read<PickupRule[]>('pickupRules'),
    pickupOverrides: await read<PickupOverride[]>('pickupOverrides'),
    shopping: await read<ShoppingItem[]>('shopping'),
    meals: await read<Meal[]>('meals'),
    settings: { ...DEFAULT_SETTINGS, ...(await read<Settings>('settings')) },
    tasks: await read<Task[]>('tasks'),
    decisions: await read<Decisions>('decisions'),
  };
}
