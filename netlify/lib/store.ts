/**
 * Opslag van alle gegevens, in Supabase (Postgres) in een EU-regio.
 *
 * De rest van de app kent alleen `read`, `update`, `overwrite` en `readAll`.
 * De logica staat in kv.ts, de Supabase-aanroepen in supabase-backend.ts, en
 * het tabelontwerp in supabase/schema.sql.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  AppData,
  CalendarEvent,
  Contact,
  Meal,
  PickupOverride,
  PickupRule,
  PushSubscriptionRecord,
  Decisions,
  Settings,
  ShoppingItem,
  Task,
} from '../../shared/types';
import { createKv } from './kv';
import { supabaseBackend, type SupabaseLike } from './supabase-backend';

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

const EMPTY: Record<Collection, unknown> = {
  events: [] as CalendarEvent[],
  contacts: [] as Contact[],
  pickupRules: [] as PickupRule[],
  pickupOverrides: [] as PickupOverride[],
  shopping: [] as ShoppingItem[],
  meals: [] as Meal[],
  settings: DEFAULT_SETTINGS,
  tasks: [] as Task[],
  decisions: {} as Decisions,
  pushSubs: [] as PushSubscriptionRecord[],
};

function maakClient(): SupabaseLike {
  const url = process.env.SUPABASE_URL;
  const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !sleutel) {
    throw new Error(
      'SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY ontbreken in de omgevingsvariabelen van Netlify. Zie de README, stap "Opslag in Supabase".',
    );
  }

  // Server-side: geen sessies of tokens bewaren, elke aanroep staat op zichzelf.
  return createClient(url, sleutel, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseLike;
}

let kv: ReturnType<typeof createKv<Collection>> | null = null;

/** Pas bij het eerste gebruik aanmaken, zodat een ontbrekende variabele een
 *  duidelijke melding geeft in plaats van de hele functie te laten crashen. */
function opslag() {
  if (!kv) {
    kv = createKv<Collection>({
      backend: supabaseBackend(maakClient()),
      empty: EMPTY,
    });
  }
  return kv;
}

export const read = <T>(collection: Collection): Promise<T> => opslag().read<T>(collection);

export const update = <T>(collection: Collection, mutate: (current: T) => T): Promise<T> =>
  opslag().update<T>(collection, mutate);

export const overwrite = <T>(collection: Collection, value: T): Promise<void> =>
  opslag().overwrite<T>(collection, value);

/** Alles in één keer, voor het openen van de app. */
export async function readAll(): Promise<AppData> {
  const [events, contacts, pickupRules, pickupOverrides, shopping, meals, settings, tasks, decisions] =
    await Promise.all([
      read<CalendarEvent[]>('events'),
      read<Contact[]>('contacts'),
      read<PickupRule[]>('pickupRules'),
      read<PickupOverride[]>('pickupOverrides'),
      read<ShoppingItem[]>('shopping'),
      read<Meal[]>('meals'),
      read<Settings>('settings'),
      read<Task[]>('tasks'),
      read<Decisions>('decisions'),
    ]);
  return {
    events,
    contacts,
    pickupRules,
    pickupOverrides,
    shopping,
    meals,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    tasks,
    decisions,
  };
}
