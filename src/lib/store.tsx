import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AgendaFeedId,
  AppData,
  CalendarEvent,
  Contact,
  Decisions,
  Meal,
  PackItem,
  PickupOverride,
  PickupRule,
  Receipt,
  ReceiptAlert,
  ReceiptInput,
  Settings,
  ShoppingItem,
  NewSignalDecision,
  SignalDecision,
  Task,
  Trip,
  TripItem,
} from '../../shared/types';
import { restoreItems, saveEvent, saveReceipt as saveReceiptRule, saveTask } from '../../shared/rules';
import { todayInNl } from '../../shared/dates';
import { alertsFor } from '../../shared/warranty';
import { bumpOften, type Often } from '../../shared/shopping';
import { api, isOffline, setUnauthorizedHandler } from './api';
import { clearCache, readCache, writeCache } from './cache';

export interface DataResponse extends AppData {
  push: { configured: boolean; publicKey: string };
  parroConfigured: boolean;
  /** Gekoppelde persoonlijke agenda's (Gmail), voor de instellingen. */
  agendaFeeds: { id: AgendaFeedId; label: string }[];
  /** Garanties en retourtermijnen die bijna aflopen. Komt mee met het openen van de app. */
  receiptAlerts: ReceiptAlert[];
  /** De bonnetjes zelf: pas gevuld als het scherm Bonnetjes is geopend. */
  receipts?: Receipt[];
}

/** Terugkomen in de app ververst pas na zoveel milliseconden, niet bij elke blik. */
const STALE_MS = 60_000;

interface StoreValue {
  data: DataResponse | null;
  /** Nog niets om te tonen: geen opgeslagen stand én nog niets binnen. */
  loading: boolean;
  error: string | null;
  notice: string | null;
  /** Een melding, eventueel met een manier om te herstellen wat er zojuist gebeurde. */
  setNotice: (msg: string | null, undo?: () => void) => void;
  /** Is er bij de melding iets ongedaan te maken? */
  noticeUndo: (() => void) | null;
  /** Geen verbinding: je ziet de laatste stand van dit toestel. */
  offline: boolean;
  /** Wanneer de getoonde stand voor het laatst van de server kwam. */
  syncedAt: number | null;
  reload: () => Promise<void>;
  saveEvent: (event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  createSeries: (
    event: Partial<CalendarEvent>,
    interval: 1 | 2,
    until: string,
  ) => Promise<number>;
  updateSeriesFrom: (seriesId: string, from: string, patch: Partial<CalendarEvent>) => Promise<void>;
  deleteSeries: (seriesId: string, from?: string) => Promise<void>;
  addBringBulk: (ids: string[], text: string) => Promise<void>;
  /** Welk reeksoverzicht open staat. Staat hier zodat elk formulier het kan
   *  openen, zonder dat formulier en overzicht elkaar hoeven te importeren. */
  seriesOpen: string | null;
  setSeriesOpen: (id: string | null) => void;
  saveContact: (contact: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  savePickupRules: (rules: PickupRule[]) => Promise<void>;
  savePickupOverride: (o: Partial<PickupOverride>) => Promise<void>;
  deletePickupOverride: (id: string) => Promise<void>;
  addShopping: (text: string, source?: string) => Promise<void>;
  addShoppingBulk: (items: string[]) => Promise<void>;
  toggleShopping: (id: string) => Promise<void>;
  deleteShopping: (id: string) => Promise<void>;
  clearDoneShopping: () => Promise<void>;
  saveMeal: (meal: Meal) => Promise<void>;
  savePackItem: (item: Partial<PackItem>) => Promise<void>;
  deletePackItem: (id: string) => Promise<void>;
  markPackItemBought: (id: string) => Promise<void>;
  /** Zet de startlijst uit de Excel in de masterlijst; geeft het aantal nieuwe items. */
  seedPackItems: () => Promise<number>;
  /** Maakt een reis met een automatisch gevulde paklijst; geeft het id van de nieuwe reis. */
  createTrip: (trip: Partial<Trip>) => Promise<string>;
  updateTrip: (trip: Partial<Trip>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  toggleTripItem: (tripId: string, itemId: string) => Promise<void>;
  saveTripItem: (tripId: string, item: Partial<TripItem>, saveToMaster?: boolean) => Promise<void>;
  deleteTripItem: (tripId: string, itemId: string) => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  saveTask: (task: Partial<Task>) => Promise<void>;
  /** Met `quiet` verschijnt er geen melding om het terug te zetten (voor een opruimactie van de app zelf). */
  deleteTask: (id: string, options?: { quiet?: boolean }) => Promise<void>;
  setDecision: (key: string, decision: NewSignalDecision) => Promise<void>;
  clearDecision: (key: string) => Promise<void>;
  syncParro: () => Promise<string>;
  syncAgenda: () => Promise<string>;
  /** Haalt de bonnetjes op (alleen nodig op het scherm Bonnetjes). */
  loadReceipts: () => Promise<void>;
  saveReceipt: (receipt: ReceiptInput) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  /** Garantie of retour als afgehandeld markeren; de melding verdwijnt dan. */
  markReceiptHandled: (id: string, kind: 'warranty' | 'return') => Promise<void>;
  uploadReceiptFile: (receiptId: string, name: string, blob: Blob) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Oudere opgeslagen standen en servers kennen nog geen taken, besluiten of paklijsten. */
function normalize(d: DataResponse): DataResponse {
  return {
    ...d,
    tasks: d.tasks ?? [],
    decisions: d.decisions ?? {},
    receiptAlerts: d.receiptAlerts ?? [],
    packItems: d.packItems ?? [],
    trips: d.trips ?? [],
  };
}

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Hetzelfde bewaren als op de server (shared/rules.ts), zodat wat je ziet klopt met wat daar komt. */
const ctx = () => ({ now: now(), newId: uuid });

export function StoreProvider({
  children,
  onSessionLost,
}: {
  children: ReactNode;
  onSessionLost: () => void;
}) {
  // Is er van een eerder bezoek een stand bewaard, dan staat die er meteen,
  // en haalt de app daarna op de achtergrond de nieuwste op.
  const cached = useMemo(() => readCache<DataResponse>(), []);
  const [data, setData] = useState<DataResponse | null>(cached ? normalize(cached.data) : null);
  const [syncedAt, setSyncedAt] = useState<number | null>(cached?.at ?? null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNoticeText] = useState<string | null>(null);
  const [noticeUndo, setNoticeUndo] = useState<(() => void) | null>(null);
  const [offline, setOffline] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState<string | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  /** Hoeveel wijzigingen per onderdeel nog onderweg zijn naar de server. */
  const inFlight = useRef<Record<string, number>>({});
  const lastLoad = useRef(0);

  useEffect(() => setUnauthorizedHandler(() => {
    clearCache();
    onSessionLost();
  }), [onSessionLost]);

  // Een fout verdwijnt vanzelf; anders blijft hij hangen tot de volgende wijziging.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (data) writeCache(data, syncedAt ?? Date.now());
  }, [data, syncedAt]);

  const busy = () => Object.values(inFlight.current).some((n) => n > 0);

  const reload = useCallback(async () => {
    try {
      const fresh = normalize(await api.get<DataResponse>('data'));
      lastLoad.current = Date.now();
      setOffline(false);
      setError(null);
      // Staat er nog een wijziging onderweg, dan zou dit je net gedane tik
      // even terugdraaien. Die wijziging ververst zelf als hij klaar is.
      if (!busy()) {
        // De bonnetjes komen niet mee met /api/data; die laten we staan.
        setData((cur) => ({ ...fresh, receipts: cur?.receipts }));
        setSyncedAt(Date.now());
      }
    } catch (err) {
      if (isOffline(err)) setOffline(true);
      else setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Terugkomen in de app: pas na een minuut opnieuw ophalen. Binnen die tijd is
  // er niets te halen, en zo gaat er niet bij elke blik op de telefoon een
  // verzoek de lucht in. Weer online komen ververst meteen.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastLoad.current > STALE_MS) void reload();
    };
    const onOnline = () => void reload();
    const onOffline = () => setOffline(true);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [reload]);

  const patch = useCallback((partial: Partial<DataResponse>) => {
    setData((current) => (current ? { ...current, ...partial } : current));
  }, []);

  /**
   * Een wijziging doorvoeren. Met `optimistic` staat het resultaat er meteen,
   * terwijl het verzoek nog onderweg is. Mislukt het, dan zet de app de oude
   * stand terug en zegt waarom; slaagt het, dan wint wat de server teruggeeft.
   */
  const mutate = useCallback(
    async <T,>(opts: {
      keys: Array<keyof DataResponse>;
      optimistic?: (d: DataResponse) => Partial<DataResponse>;
      request: () => Promise<T>;
      apply: (result: T) => Partial<DataResponse>;
    }): Promise<void> => {
      const { keys } = opts;
      const snapshot = dataRef.current;
      const count = (delta: number) => {
        for (const k of keys) inFlight.current[k] = (inFlight.current[k] ?? 0) + delta;
      };

      count(1);
      if (opts.optimistic) {
        setData((cur) => (cur ? { ...cur, ...opts.optimistic!(cur) } : cur));
      }

      try {
        const result = await opts.request();
        count(-1);
        const server = opts.apply(result);
        // Zijn er nog andere wijzigingen voor hetzelfde onderdeel onderweg,
        // dan laten we die het laatste woord hebben; anders springt de lijst heen en weer.
        setData((cur) => {
          if (!cur) return cur;
          const next: Record<string, unknown> = { ...cur };
          for (const [k, v] of Object.entries(server)) {
            if (!(inFlight.current[k] > 0)) next[k] = v;
          }
          return next as unknown as DataResponse;
        });
        setSyncedAt(Date.now());
        setOffline(false);
        setError(null);
      } catch (err) {
        count(-1);
        if (snapshot && opts.optimistic) {
          setData((cur) => {
            if (!cur) return cur;
            const next: Record<string, unknown> = { ...cur };
            for (const k of keys) {
              if (!(inFlight.current[k] > 0)) next[k] = snapshot[k];
            }
            return next as unknown as DataResponse;
          });
        }
        if (isOffline(err)) setOffline(true);
        setError((err as Error).message);
        throw err;
      }
    },
    [],
  );

  const setNotice = useCallback((msg: string | null, undo?: () => void) => {
    setNoticeText(msg);
    // Een functie in state moet je als functie van een functie zetten.
    setNoticeUndo(msg && undo ? () => undo : null);
  }, []);

  /** Verwijderde items terugzetten, ongewijzigd, en dat meteen laten zien. */
  const restore = useCallback(
    <K extends 'events' | 'tasks' | 'contacts' | 'shopping' | 'pickupOverrides' | 'receipts'>(
      collection: K,
      items: DataResponse[K],
    ) => {
      // Bij bonnetjes verandert ook de aandachtslijst mee.
      const metAandacht = (lijst: unknown): Partial<DataResponse> =>
        collection === 'receipts'
          ? { receiptAlerts: alertsFor(lijst as Receipt[], todayInNl()) }
          : {};
      return mutate({
        keys: collection === 'receipts' ? ['receipts', 'receiptAlerts'] : [collection],
        optimistic: (d) => {
          const lijst = restoreItems((d[collection] ?? []) as Array<{ id: string }>, items as Array<{ id: string }>);
          return { [collection]: lijst, ...metAandacht(lijst) } as Partial<DataResponse>;
        },
        request: () => api.post<Record<string, unknown>>('restore', { collection, items }),
        apply: (r) => ({ [collection]: r[collection], ...metAandacht(r[collection]) }) as Partial<DataResponse>,
      });
    },
    [mutate],
  );

  /** Meld dat er iets is verwijderd, met een knop om het terug te zetten. */
  const offerUndo = useCallback(
    <K extends 'events' | 'tasks' | 'contacts' | 'shopping' | 'pickupOverrides' | 'receipts'>(
      text: string,
      collection: K,
      items: DataResponse[K],
    ) => {
      if ((items as unknown[]).length === 0) return;
      setNotice(text, () => {
        setNotice(null);
        void restore(collection, items).catch(() => {});
      });
    },
    [restore, setNotice],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      loading: data === null,
      error,
      notice,
      setNotice,
      noticeUndo,
      offline,
      syncedAt,
      reload,
      seriesOpen,
      setSeriesOpen,

      saveEvent: (event) => {
        const body = { ...event, id: event.id ?? uuid() };
        return mutate({
          keys: ['events'],
          optimistic: (d) => ({ events: saveEvent(d.events, body, ctx()) }),
          request: () => api.post<{ events: CalendarEvent[] }>('events', body),
          apply: (r) => ({ events: r.events }),
        });
      },

      deleteEvent: async (id) => {
        const weg = dataRef.current?.events.filter((e) => e.id === id) ?? [];
        await mutate({
          keys: ['events'],
          optimistic: (d) => ({ events: d.events.filter((e) => e.id !== id) }),
          request: () => api.del<{ events: CalendarEvent[] }>(`events/${id}`),
          apply: (r) => ({ events: r.events }),
        });
        offerUndo(`‘${weg[0]?.title ?? 'Item'}’ verwijderd`, 'events', weg);
      },

      // Een reeks krijgt zijn data van de server, dus die wacht op het antwoord.
      createSeries: async (event, interval, until) => {
        let aantal = 0;
        await mutate({
          keys: ['events'],
          request: () =>
            api.post<{ events: CalendarEvent[]; count: number }>('events/series', {
              event,
              interval,
              until,
            }),
          apply: (r) => {
            aantal = r.count;
            return { events: r.events };
          },
        });
        return aantal;
      },

      updateSeriesFrom: (seriesId, from, changes) =>
        mutate({
          keys: ['events'],
          request: () =>
            api.post<{ events: CalendarEvent[] }>(`events/series/${seriesId}`, { from, patch: changes }),
          apply: (r) => ({ events: r.events }),
        }),

      deleteSeries: async (seriesId, from) => {
        const inReeks = (e: CalendarEvent) => e.series?.id === seriesId && (!from || e.date >= from);
        const weg = dataRef.current?.events.filter(inReeks) ?? [];
        await mutate({
          keys: ['events'],
          optimistic: (d) => ({ events: d.events.filter((e) => !inReeks(e)) }),
          request: () =>
            api.del<{ events: CalendarEvent[] }>(
              `events/series/${seriesId}${from ? `?from=${encodeURIComponent(from)}` : ''}`,
            ),
          apply: (r) => ({ events: r.events }),
        });
        offerUndo(
          weg.length === 1 ? `‘${weg[0].title}’ verwijderd` : `${weg.length} keer ‘${weg[0]?.title ?? 'reeks'}’ verwijderd`,
          'events',
          weg,
        );
      },

      addBringBulk: (ids, text) =>
        mutate({
          keys: ['events'],
          optimistic: (d) => {
            const set = new Set(ids);
            const wanted = text.trim();
            return {
              events: d.events.map((e) =>
                set.has(e.id) && !e.bring.some((b) => b.text.toLowerCase() === wanted.toLowerCase())
                  ? { ...e, bring: [...e.bring, { id: uuid(), text: wanted, done: false }] }
                  : e,
              ),
            };
          },
          request: () => api.post<{ events: CalendarEvent[] }>('events/bring-bulk', { ids, text }),
          apply: (r) => ({ events: r.events }),
        }),

      saveContact: (contact) => {
        // Ids maken we hier, zodat het scherm en de server over dezelfde regels praten.
        const body = {
          ...contact,
          id: contact.id ?? uuid(),
          parents: (contact.parents ?? []).map((p) => ({ ...p, id: p.id || uuid() })),
        };
        return mutate({
          keys: ['contacts'],
          optimistic: (d) => {
            const stamp = now();
            const index = d.contacts.findIndex((c) => c.id === body.id);
            if (index >= 0) {
              const next = [...d.contacts];
              next[index] = { ...next[index], ...body, updatedAt: stamp } as Contact;
              return { contacts: next };
            }
            return {
              contacts: [
                ...d.contacts,
                { kind: 'klasgenoot', ...body, name: (body.name ?? '').trim(), createdAt: stamp, updatedAt: stamp } as Contact,
              ],
            };
          },
          request: () => api.post<{ contacts: Contact[] }>('contacts', body),
          apply: (r) => ({ contacts: r.contacts }),
        });
      },

      deleteContact: async (id) => {
        const weg = dataRef.current?.contacts.filter((c) => c.id === id) ?? [];
        await mutate({
          keys: ['contacts'],
          optimistic: (d) => ({ contacts: d.contacts.filter((c) => c.id !== id) }),
          request: () => api.del<{ contacts: Contact[] }>(`contacts/${id}`),
          apply: (r) => ({ contacts: r.contacts }),
        });
        offerUndo(`${weg[0]?.name ?? 'Contact'} verwijderd`, 'contacts', weg);
      },

      savePickupRules: (rules) =>
        mutate({
          keys: ['pickupRules'],
          optimistic: () => ({ pickupRules: rules.map((r) => ({ ...r, id: r.id || uuid() })) }),
          request: () => api.post<{ pickupRules: PickupRule[] }>('pickup-rules', { rules }),
          apply: (r) => ({ pickupRules: r.pickupRules }),
        }),

      savePickupOverride: (o) =>
        mutate({
          keys: ['pickupOverrides'],
          optimistic: (d) => {
            const list = [...d.pickupOverrides];
            const index = list.findIndex(
              (x) => (o.id && x.id === o.id) || (x.date === o.date && x.child === o.child),
            );
            const record = {
              id: index >= 0 ? list[index].id : o.id ?? uuid(),
              date: o.date!,
              child: o.child!,
              dropoff: o.dropoff,
              pickup: o.pickup,
              note: o.note,
            } as PickupOverride;
            if (index >= 0) list[index] = record;
            else list.push(record);
            return { pickupOverrides: list };
          },
          request: () => api.post<{ pickupOverrides: PickupOverride[] }>('pickup-overrides', o),
          apply: (r) => ({ pickupOverrides: r.pickupOverrides }),
        }),

      deletePickupOverride: async (id) => {
        const weg = dataRef.current?.pickupOverrides.filter((o) => o.id === id) ?? [];
        await mutate({
          keys: ['pickupOverrides'],
          optimistic: (d) => ({ pickupOverrides: d.pickupOverrides.filter((o) => o.id !== id) }),
          request: () => api.del<{ pickupOverrides: PickupOverride[] }>(`pickup-overrides/${id}`),
          apply: (r) => ({ pickupOverrides: r.pickupOverrides }),
        });
        offerUndo('Afwijking verwijderd', 'pickupOverrides', weg);
      },

      addShopping: (text, source) => {
        const id = uuid();
        return mutate({
          keys: ['shopping', 'settings'],
          optimistic: (d) => ({
            shopping: [...d.shopping, { id, text: text.trim(), done: false, source, createdAt: now() }],
            settings: { ...d.settings, shoppingOften: bumpOften(d.settings.shoppingOften, [text], now()) },
          }),
          request: () =>
            api.post<{ shopping: ShoppingItem[]; shoppingOften: Often }>('shopping', { item: { id, text, source } }),
          apply: (r) => ({
            shopping: r.shopping,
            settings: { ...dataRef.current!.settings, shoppingOften: r.shoppingOften },
          }),
        });
      },

      addShoppingBulk: (items) =>
        mutate({
          keys: ['shopping', 'settings'],
          optimistic: (d) => {
            const list = [...d.shopping];
            const added: string[] = [];
            for (const raw of items) {
              const text = raw.trim();
              if (!text) continue;
              if (list.some((i) => !i.done && i.text.toLowerCase() === text.toLowerCase())) continue;
              list.push({ id: uuid(), text, done: false, createdAt: now() });
              added.push(text);
            }
            return {
              shopping: list,
              settings: { ...d.settings, shoppingOften: bumpOften(d.settings.shoppingOften, added, now()) },
            };
          },
          request: () => api.post<{ shopping: ShoppingItem[]; shoppingOften: Often }>('shopping', { items }),
          apply: (r) => ({
            shopping: r.shopping,
            settings: { ...dataRef.current!.settings, shoppingOften: r.shoppingOften },
          }),
        }),

      toggleShopping: (id) =>
        mutate({
          keys: ['shopping'],
          optimistic: (d) => ({
            shopping: d.shopping.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
          }),
          request: () => api.post<{ shopping: ShoppingItem[] }>(`shopping/${id}/toggle`),
          apply: (r) => ({ shopping: r.shopping }),
        }),

      deleteShopping: async (id) => {
        const weg = dataRef.current?.shopping.filter((i) => i.id === id) ?? [];
        await mutate({
          keys: ['shopping'],
          optimistic: (d) => ({ shopping: d.shopping.filter((i) => i.id !== id) }),
          request: () => api.del<{ shopping: ShoppingItem[] }>(`shopping/${id}`),
          apply: (r) => ({ shopping: r.shopping }),
        });
        offerUndo(`${weg[0]?.text ?? 'Item'} van de lijst`, 'shopping', weg);
      },

      clearDoneShopping: async () => {
        const weg = dataRef.current?.shopping.filter((i) => i.done) ?? [];
        await mutate({
          keys: ['shopping'],
          optimistic: (d) => ({ shopping: d.shopping.filter((i) => !i.done) }),
          request: () => api.post<{ shopping: ShoppingItem[] }>('shopping/clear-done'),
          apply: (r) => ({ shopping: r.shopping }),
        });
        offerUndo(`${weg.length} afgevinkt${weg.length === 1 ? '' : 'e'} van de lijst`, 'shopping', weg);
      },

      saveMeal: (meal) =>
        mutate({
          keys: ['meals'],
          optimistic: (d) => {
            const rest = d.meals.filter((m) => m.date !== meal.date);
            const leeg = !meal.dish.trim() && meal.ingredients.length === 0;
            return { meals: leeg ? rest : [...rest, { ...meal, dish: meal.dish.trim() }] };
          },
          request: () => api.post<{ meals: Meal[] }>('meals', meal),
          apply: (r) => ({ meals: r.meals }),
        }),

      savePackItem: (item) =>
        mutate({
          keys: ['packItems'],
          request: () => api.post<{ packItems: PackItem[] }>('pack-items', item),
          apply: (r) => ({ packItems: r.packItems }),
        }),

      deletePackItem: (id) =>
        mutate({
          keys: ['packItems'],
          optimistic: (d) => ({ packItems: d.packItems.filter((i) => i.id !== id) }),
          request: () => api.del<{ packItems: PackItem[] }>(`pack-items/${id}`),
          apply: (r) => ({ packItems: r.packItems }),
        }),

      markPackItemBought: (id) =>
        mutate({
          keys: ['packItems'],
          request: () => api.post<{ packItems: PackItem[] }>(`pack-items/${id}/bought`),
          apply: (r) => ({ packItems: r.packItems }),
        }),

      seedPackItems: async () => {
        let added = 0;
        await mutate({
          keys: ['packItems'],
          request: async () => {
            const r = await api.post<{ packItems: PackItem[]; added: number }>('pack-items/seed');
            added = r.added;
            return r;
          },
          apply: (r) => ({ packItems: r.packItems }),
        });
        return added;
      },

      createTrip: async (trip) => {
        let created = '';
        await mutate({
          keys: ['trips'],
          request: async () => {
            const r = await api.post<{ trips: Trip[]; created: string }>('trips', trip);
            created = r.created;
            return r;
          },
          apply: (r) => ({ trips: r.trips }),
        });
        return created;
      },

      updateTrip: (trip) =>
        mutate({
          keys: ['trips'],
          request: () => api.post<{ trips: Trip[] }>('trips', trip),
          apply: (r) => ({ trips: r.trips }),
        }),

      deleteTrip: (id) =>
        mutate({
          keys: ['trips'],
          optimistic: (d) => ({ trips: d.trips.filter((t) => t.id !== id) }),
          request: () => api.del<{ trips: Trip[] }>(`trips/${id}`),
          apply: (r) => ({ trips: r.trips }),
        }),

      // Afvinken moet direct voelen, ook met slecht bereik op de camping.
      toggleTripItem: (tripId, itemId) =>
        mutate({
          keys: ['trips'],
          optimistic: (d) => ({
            trips: d.trips.map((t) =>
              t.id !== tripId
                ? t
                : { ...t, items: t.items.map((i) => (i.id === itemId ? { ...i, packed: !i.packed } : i)) },
            ),
          }),
          request: () => api.post<{ trips: Trip[] }>(`trips/${tripId}/items/${itemId}/toggle`),
          apply: (r) => ({ trips: r.trips }),
        }),

      saveTripItem: (tripId, item, saveToMaster) =>
        mutate({
          keys: ['trips', 'packItems'],
          request: () => api.post<{ trips: Trip[]; packItems?: PackItem[] }>(`trips/${tripId}/items`, { ...item, saveToMaster }),
          apply: (r) => ({ trips: r.trips, ...(r.packItems ? { packItems: r.packItems } : {}) }),
        }),

      deleteTripItem: (tripId, itemId) =>
        mutate({
          keys: ['trips'],
          optimistic: (d) => ({
            trips: d.trips.map((t) =>
              t.id !== tripId ? t : { ...t, items: t.items.filter((i) => i.id !== itemId) },
            ),
          }),
          request: () => api.del<{ trips: Trip[] }>(`trips/${tripId}/items/${itemId}`),
          apply: (r) => ({ trips: r.trips }),
        }),

      saveSettings: (settings) =>
        mutate({
          keys: ['settings'],
          optimistic: (d) => ({ settings: { ...d.settings, ...settings } }),
          request: () => api.post<{ settings: Settings }>('settings', settings),
          apply: (r) => ({ settings: r.settings }),
        }),

      saveTask: (task) => {
        const body = { ...task, id: task.id ?? uuid() };
        return mutate({
          keys: ['tasks'],
          optimistic: (d) => ({ tasks: saveTask(d.tasks, body, ctx()) }),
          request: () => api.post<{ tasks: Task[] }>('tasks', body),
          apply: (r) => ({ tasks: r.tasks }),
        });
      },

      deleteTask: async (id, options) => {
        const weg = dataRef.current?.tasks.filter((t) => t.id === id) ?? [];
        await mutate({
          keys: ['tasks'],
          optimistic: (d) => ({ tasks: d.tasks.filter((t) => t.id !== id) }),
          request: () => api.del<{ tasks: Task[] }>(`tasks/${id}`),
          apply: (r) => ({ tasks: r.tasks }),
        });
        if (!options?.quiet) offerUndo(`‘${weg[0]?.title ?? 'Taak'}’ verwijderd`, 'tasks', weg);
      },

      setDecision: (key, decision) =>
        mutate({
          keys: ['decisions'],
          optimistic: (d) => ({
            decisions: { ...d.decisions, [key]: { ...decision, at: now() } as SignalDecision },
          }),
          request: () => api.post<{ decisions: Decisions }>('decisions', { key, decision }),
          apply: (r) => ({ decisions: r.decisions }),
        }),

      clearDecision: (key) =>
        mutate({
          keys: ['decisions'],
          optimistic: (d) => {
            const { [key]: _weg, ...rest } = d.decisions;
            return { decisions: rest };
          },
          request: () => api.del<{ decisions: Decisions }>(`decisions/${encodeURIComponent(key)}`),
          apply: (r) => ({ decisions: r.decisions }),
        }),

      syncParro: async () => {
        const r = await api.post<{ message: string; events: CalendarEvent[] }>('parro');
        patch({ events: r.events });
        await reload();
        return r.message;
      },

      loadReceipts: async () => {
        try {
          const r = await api.get<{ receipts: Receipt[]; receiptAlerts: ReceiptAlert[] }>('receipts');
          patch({ receipts: r.receipts, receiptAlerts: r.receiptAlerts });
        } catch (err) {
          if (isOffline(err)) setOffline(true);
          setError((err as Error).message);
          throw err;
        }
      },

      saveReceipt: (receipt) => {
        const body = { ...receipt, id: receipt.id ?? uuid() };
        return mutate({
          keys: ['receipts', 'receiptAlerts'],
          optimistic: (d) => {
            const lijst = saveReceiptRule(d.receipts ?? [], body, ctx());
            return { receipts: lijst, receiptAlerts: alertsFor(lijst, todayInNl()) };
          },
          request: () => api.post<{ receipts: Receipt[]; receiptAlerts: ReceiptAlert[] }>('receipts', body),
          apply: (r) => ({ receipts: r.receipts, receiptAlerts: r.receiptAlerts }),
        });
      },

      deleteReceipt: async (id) => {
        const weg = dataRef.current?.receipts?.filter((r) => r.id === id) ?? [];
        await mutate({
          keys: ['receipts', 'receiptAlerts'],
          optimistic: (d) => {
            const lijst = (d.receipts ?? []).filter((r) => r.id !== id);
            return { receipts: lijst, receiptAlerts: alertsFor(lijst, todayInNl()) };
          },
          request: () => api.del<{ receipts: Receipt[]; receiptAlerts: ReceiptAlert[] }>(`receipts/${id}`),
          apply: (r) => ({ receipts: r.receipts, receiptAlerts: r.receiptAlerts }),
        });
        const titel = weg[0]?.title.trim() || 'Bonnetje';
        offerUndo(`‘${titel}’ verwijderd`, 'receipts', weg);
      },

      markReceiptHandled: (id, kind) =>
        mutate({
          keys: ['receipts', 'receiptAlerts'],
          optimistic: (d) => {
            const lijst = (d.receipts ?? []).map((r) =>
              r.id === id ? { ...r, handled: { ...r.handled, [kind]: todayInNl() } } : r,
            );
            // Is de lijst met bonnetjes niet geladen, dan halen we alleen de melding weg.
            const alerts = d.receipts
              ? alertsFor(lijst, todayInNl())
              : d.receiptAlerts.filter((a) => !(a.id === id && a.kind === kind));
            return { ...(d.receipts ? { receipts: lijst } : {}), receiptAlerts: alerts };
          },
          request: () =>
            api.post<{ receipts: Receipt[]; receiptAlerts: ReceiptAlert[] }>(`receipts/${id}/handled`, { kind }),
          // De server geeft alle bonnetjes terug; de lijst vullen we alleen als die al geladen was.
          apply: (r) => ({
            ...(dataRef.current?.receipts ? { receipts: r.receipts } : {}),
            receiptAlerts: r.receiptAlerts,
          }),
        }),

      uploadReceiptFile: (receiptId, name, blob) => api.upload(`receipts/${receiptId}/files/${name}`, blob),

      syncAgenda: async () => {
        const r = await api.post<{ message: string; events: CalendarEvent[] }>('agenda');
        patch({ events: r.events });
        await reload();
        return r.message;
      },
    }),
    [data, error, notice, noticeUndo, setNotice, offerUndo, offline, syncedAt, seriesOpen, reload, mutate, patch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore moet binnen StoreProvider gebruikt worden.');
  return ctx;
}

/** Handige, altijd-gevulde weergave van de data. */
export function useData(): AppData & Pick<DataResponse, 'push' | 'parroConfigured' | 'agendaFeeds' | 'receiptAlerts' | 'receipts'> {
  const { data } = useStore();
  return (
    data ?? {
      events: [],
      contacts: [],
      pickupRules: [],
      pickupOverrides: [],
      shopping: [],
      meals: [],
      packItems: [],
      trips: [],
      settings: { reminderHour: 19 },
      tasks: [],
      decisions: {},
      push: { configured: false, publicKey: '' },
      parroConfigured: false,
      agendaFeeds: [],
      receiptAlerts: [],
    }
  );
}
