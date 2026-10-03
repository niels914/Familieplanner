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
  PickupOverride,
  PickupRule,
  Settings,
  ShoppingItem,
  NewSignalDecision,
  SignalDecision,
  Task,
} from '../../shared/types';
import { api, isOffline, setUnauthorizedHandler } from './api';
import { clearCache, readCache, writeCache } from './cache';

export interface DataResponse extends AppData {
  push: { configured: boolean; publicKey: string };
  parroConfigured: boolean;
  /** Gekoppelde persoonlijke agenda's (Gmail), voor de instellingen. */
  agendaFeeds: { id: AgendaFeedId; label: string }[];
}

/** Terugkomen in de app ververst pas na zoveel milliseconden, niet bij elke blik. */
const STALE_MS = 60_000;

interface StoreValue {
  data: DataResponse | null;
  /** Nog niets om te tonen: geen opgeslagen stand én nog niets binnen. */
  loading: boolean;
  error: string | null;
  notice: string | null;
  setNotice: (msg: string | null) => void;
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
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  saveTask: (task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setDecision: (key: string, decision: NewSignalDecision) => Promise<void>;
  clearDecision: (key: string) => Promise<void>;
  syncParro: () => Promise<string>;
  syncAgenda: () => Promise<string>;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Oudere opgeslagen standen en servers kennen nog geen taken of besluiten. */
function normalize(d: DataResponse): DataResponse {
  return { ...d, tasks: d.tasks ?? [], decisions: d.decisions ?? {} };
}

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ----------------------------------------------------- lokale versies van de server
// Dezelfde regels als in netlify/functions/api.ts, zodat wat je ziet nadat je
// tikt hetzelfde is als wat de server straks teruggeeft.

function upsertEvent(events: CalendarEvent[], body: Partial<CalendarEvent> & { id: string }): CalendarEvent[] {
  const stamp = now();
  const index = events.findIndex((e) => e.id === body.id);
  if (index >= 0) {
    const current = events[index];
    const next = [...events];
    next[index] = {
      ...current,
      ...body,
      source: current.source,
      parroUid: current.parroUid,
      agendaFeed: current.agendaFeed,
      agendaUid: current.agendaUid,
      series: current.series,
      id: current.id,
      bring: body.bring ?? current.bring,
      createdAt: current.createdAt,
      updatedAt: stamp,
    } as CalendarEvent;
    return next;
  }
  return [
    ...events,
    {
      id: body.id,
      source: 'local',
      title: (body.title ?? '').trim(),
      date: body.date!,
      endDate: body.endDate,
      allDay: body.allDay ?? true,
      time: body.time,
      endTime: body.endTime,
      person: body.person ?? 'gezin',
      category: body.category ?? 'anders',
      bring: body.bring ?? [],
      notes: body.notes,
      reminder: body.reminder ?? true,
      sitter: body.sitter,
      location: body.location,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

function upsertTask(tasks: Task[], body: Partial<Task> & { id: string }): Task[] {
  const stamp = now();
  const index = tasks.findIndex((t) => t.id === body.id);
  if (index >= 0) {
    const current = tasks[index];
    const done = body.done ?? current.done;
    const next = [...tasks];
    next[index] = {
      ...current,
      ...body,
      title: (body.title ?? current.title).trim(),
      done,
      doneAt: done ? (current.done ? current.doneAt : stamp) : undefined,
      updatedAt: stamp,
    } as Task;
    return next;
  }
  return [
    ...tasks,
    {
      id: body.id,
      title: (body.title ?? '').trim(),
      owner: body.owner ?? 'samen',
      kid: body.kid,
      due: body.due,
      note: body.note,
      decision: body.decision,
      eventId: body.eventId,
      signalKey: body.signalKey,
      done: body.done ?? false,
      doneAt: body.done ? stamp : undefined,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

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
  const [notice, setNotice] = useState<string | null>(null);
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
        setData(fresh);
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
      keys: Array<keyof AppData>;
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

  const value = useMemo<StoreValue>(
    () => ({
      data,
      loading: data === null,
      error,
      notice,
      setNotice,
      offline,
      syncedAt,
      reload,
      seriesOpen,
      setSeriesOpen,

      saveEvent: (event) => {
        const body = { ...event, id: event.id ?? uuid() };
        return mutate({
          keys: ['events'],
          optimistic: (d) => ({ events: upsertEvent(d.events, body) }),
          request: () => api.post<{ events: CalendarEvent[] }>('events', body),
          apply: (r) => ({ events: r.events }),
        });
      },

      deleteEvent: (id) =>
        mutate({
          keys: ['events'],
          optimistic: (d) => ({ events: d.events.filter((e) => e.id !== id) }),
          request: () => api.del<{ events: CalendarEvent[] }>(`events/${id}`),
          apply: (r) => ({ events: r.events }),
        }),

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

      deleteSeries: (seriesId, from) =>
        mutate({
          keys: ['events'],
          optimistic: (d) => ({
            events: d.events.filter((e) => !(e.series?.id === seriesId && (!from || e.date >= from))),
          }),
          request: () =>
            api.del<{ events: CalendarEvent[] }>(
              `events/series/${seriesId}${from ? `?from=${encodeURIComponent(from)}` : ''}`,
            ),
          apply: (r) => ({ events: r.events }),
        }),

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

      deleteContact: (id) =>
        mutate({
          keys: ['contacts'],
          optimistic: (d) => ({ contacts: d.contacts.filter((c) => c.id !== id) }),
          request: () => api.del<{ contacts: Contact[] }>(`contacts/${id}`),
          apply: (r) => ({ contacts: r.contacts }),
        }),

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

      deletePickupOverride: (id) =>
        mutate({
          keys: ['pickupOverrides'],
          optimistic: (d) => ({ pickupOverrides: d.pickupOverrides.filter((o) => o.id !== id) }),
          request: () => api.del<{ pickupOverrides: PickupOverride[] }>(`pickup-overrides/${id}`),
          apply: (r) => ({ pickupOverrides: r.pickupOverrides }),
        }),

      addShopping: (text, source) => {
        const id = uuid();
        return mutate({
          keys: ['shopping'],
          optimistic: (d) => ({
            shopping: [...d.shopping, { id, text: text.trim(), done: false, source, createdAt: now() }],
          }),
          request: () => api.post<{ shopping: ShoppingItem[] }>('shopping', { item: { id, text, source } }),
          apply: (r) => ({ shopping: r.shopping }),
        });
      },

      addShoppingBulk: (items) =>
        mutate({
          keys: ['shopping'],
          optimistic: (d) => {
            const list = [...d.shopping];
            for (const raw of items) {
              const text = raw.trim();
              if (!text) continue;
              if (list.some((i) => !i.done && i.text.toLowerCase() === text.toLowerCase())) continue;
              list.push({ id: uuid(), text, done: false, createdAt: now() });
            }
            return { shopping: list };
          },
          request: () => api.post<{ shopping: ShoppingItem[] }>('shopping', { items }),
          apply: (r) => ({ shopping: r.shopping }),
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

      deleteShopping: (id) =>
        mutate({
          keys: ['shopping'],
          optimistic: (d) => ({ shopping: d.shopping.filter((i) => i.id !== id) }),
          request: () => api.del<{ shopping: ShoppingItem[] }>(`shopping/${id}`),
          apply: (r) => ({ shopping: r.shopping }),
        }),

      clearDoneShopping: () =>
        mutate({
          keys: ['shopping'],
          optimistic: (d) => ({ shopping: d.shopping.filter((i) => !i.done) }),
          request: () => api.post<{ shopping: ShoppingItem[] }>('shopping/clear-done'),
          apply: (r) => ({ shopping: r.shopping }),
        }),

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
          optimistic: (d) => ({ tasks: upsertTask(d.tasks, body) }),
          request: () => api.post<{ tasks: Task[] }>('tasks', body),
          apply: (r) => ({ tasks: r.tasks }),
        });
      },

      deleteTask: (id) =>
        mutate({
          keys: ['tasks'],
          optimistic: (d) => ({ tasks: d.tasks.filter((t) => t.id !== id) }),
          request: () => api.del<{ tasks: Task[] }>(`tasks/${id}`),
          apply: (r) => ({ tasks: r.tasks }),
        }),

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

      syncAgenda: async () => {
        const r = await api.post<{ message: string; events: CalendarEvent[] }>('agenda');
        patch({ events: r.events });
        await reload();
        return r.message;
      },
    }),
    [data, error, notice, offline, syncedAt, seriesOpen, reload, mutate, patch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore moet binnen StoreProvider gebruikt worden.');
  return ctx;
}

/** Handige, altijd-gevulde weergave van de data. */
export function useData(): AppData & {
  push: DataResponse['push'];
  parroConfigured: boolean;
  agendaFeeds: DataResponse['agendaFeeds'];
} {
  const { data } = useStore();
  return (
    data ?? {
      events: [],
      contacts: [],
      pickupRules: [],
      pickupOverrides: [],
      shopping: [],
      meals: [],
      settings: { reminderHour: 19 },
      tasks: [],
      decisions: {},
      push: { configured: false, publicKey: '' },
      parroConfigured: false,
      agendaFeeds: [],
    }
  );
}
