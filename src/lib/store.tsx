import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  CalendarEvent,
  Contact,
  Meal,
  PackItem,
  PickupOverride,
  PickupRule,
  Settings,
  ShoppingItem,
  Trip,
  TripItem,
} from '../../shared/types';
import { api, setUnauthorizedHandler } from './api';

interface DataResponse extends AppData {
  push: { configured: boolean; publicKey: string };
  parroConfigured: boolean;
}

interface StoreValue {
  data: DataResponse | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  setNotice: (msg: string | null) => void;
  reload: () => Promise<void>;
  saveEvent: (event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
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
  saveTripItem: (
    tripId: string,
    item: Partial<TripItem>,
    saveToMaster?: boolean,
  ) => Promise<void>;
  deleteTripItem: (tripId: string, itemId: string) => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  syncParro: () => Promise<string>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  children,
  onSessionLost,
}: {
  children: ReactNode;
  onSessionLost: () => void;
}) {
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setUnauthorizedHandler(onSessionLost), [onSessionLost]);

  const reload = useCallback(async () => {
    try {
      const fresh = await api.get<DataResponse>('data');
      setData(fresh);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Bij terugkomen in de app opnieuw ophalen, zodat je de wijzigingen van de
  // ander ziet zonder te verversen.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload]);

  const patch = useCallback((partial: Partial<DataResponse>) => {
    setData((current) => (current ? { ...current, ...partial } : current));
  }, []);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, apply: (result: T) => void): Promise<void> => {
      try {
        apply(await fn());
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      loading,
      error,
      notice,
      setNotice,
      reload,

      saveEvent: (event) =>
        run(
          () => api.post<{ events: CalendarEvent[] }>('events', event),
          (r) => patch({ events: r.events }),
        ),

      deleteEvent: (id) =>
        run(
          () => api.del<{ events: CalendarEvent[] }>(`events/${id}`),
          (r) => patch({ events: r.events }),
        ),

      saveContact: (contact) =>
        run(
          () => api.post<{ contacts: Contact[] }>('contacts', contact),
          (r) => patch({ contacts: r.contacts }),
        ),

      deleteContact: (id) =>
        run(
          () => api.del<{ contacts: Contact[] }>(`contacts/${id}`),
          (r) => patch({ contacts: r.contacts }),
        ),

      savePickupRules: (rules) =>
        run(
          () => api.post<{ pickupRules: PickupRule[] }>('pickup-rules', { rules }),
          (r) => patch({ pickupRules: r.pickupRules }),
        ),

      savePickupOverride: (o) =>
        run(
          () => api.post<{ pickupOverrides: PickupOverride[] }>('pickup-overrides', o),
          (r) => patch({ pickupOverrides: r.pickupOverrides }),
        ),

      deletePickupOverride: (id) =>
        run(
          () => api.del<{ pickupOverrides: PickupOverride[] }>(`pickup-overrides/${id}`),
          (r) => patch({ pickupOverrides: r.pickupOverrides }),
        ),

      addShopping: (text, source) =>
        run(
          () => api.post<{ shopping: ShoppingItem[] }>('shopping', { item: { text, source } }),
          (r) => patch({ shopping: r.shopping }),
        ),

      addShoppingBulk: (items) =>
        run(
          () => api.post<{ shopping: ShoppingItem[] }>('shopping', { items }),
          (r) => patch({ shopping: r.shopping }),
        ),

      toggleShopping: (id) =>
        run(
          () => api.post<{ shopping: ShoppingItem[] }>(`shopping/${id}/toggle`),
          (r) => patch({ shopping: r.shopping }),
        ),

      deleteShopping: (id) =>
        run(
          () => api.del<{ shopping: ShoppingItem[] }>(`shopping/${id}`),
          (r) => patch({ shopping: r.shopping }),
        ),

      clearDoneShopping: () =>
        run(
          () => api.post<{ shopping: ShoppingItem[] }>('shopping/clear-done'),
          (r) => patch({ shopping: r.shopping }),
        ),

      saveMeal: (meal) =>
        run(
          () => api.post<{ meals: Meal[] }>('meals', meal),
          (r) => patch({ meals: r.meals }),
        ),

      savePackItem: (item) =>
        run(
          () => api.post<{ packItems: PackItem[] }>('pack-items', item),
          (r) => patch({ packItems: r.packItems }),
        ),

      deletePackItem: (id) =>
        run(
          () => api.del<{ packItems: PackItem[] }>(`pack-items/${id}`),
          (r) => patch({ packItems: r.packItems }),
        ),

      markPackItemBought: (id) =>
        run(
          () => api.post<{ packItems: PackItem[] }>(`pack-items/${id}/bought`),
          (r) => patch({ packItems: r.packItems }),
        ),

      seedPackItems: async () => {
        const r = await api.post<{ packItems: PackItem[]; added: number }>('pack-items/seed');
        patch({ packItems: r.packItems });
        return r.added;
      },

      createTrip: async (trip) => {
        try {
          const r = await api.post<{ trips: Trip[]; created: string }>('trips', trip);
          patch({ trips: r.trips });
          setError(null);
          return r.created;
        } catch (err) {
          setError((err as Error).message);
          throw err;
        }
      },

      updateTrip: (trip) =>
        run(
          () => api.post<{ trips: Trip[] }>('trips', trip),
          (r) => patch({ trips: r.trips }),
        ),

      deleteTrip: (id) =>
        run(
          () => api.del<{ trips: Trip[] }>(`trips/${id}`),
          (r) => patch({ trips: r.trips }),
        ),

      // Afvinken moet direct voelen, ook met slecht bereik op de camping:
      // eerst lokaal omzetten, daarna de server de waarheid laten bevestigen.
      toggleTripItem: async (tripId, itemId) => {
        setData((current) =>
          current
            ? {
                ...current,
                trips: current.trips.map((t) =>
                  t.id !== tripId
                    ? t
                    : {
                        ...t,
                        items: t.items.map((i) =>
                          i.id === itemId ? { ...i, packed: !i.packed } : i,
                        ),
                      },
                ),
              }
            : current,
        );
        try {
          const r = await api.post<{ trips: Trip[] }>(`trips/${tripId}/items/${itemId}/toggle`);
          patch({ trips: r.trips });
        } catch (err) {
          setError((err as Error).message);
          await reload();
        }
      },

      saveTripItem: (tripId, item, saveToMaster) =>
        run(
          () => api.post<{ trips: Trip[] }>(`trips/${tripId}/items`, { ...item, saveToMaster }),
          (r) => patch({ trips: r.trips }),
        ),

      deleteTripItem: (tripId, itemId) =>
        run(
          () => api.del<{ trips: Trip[] }>(`trips/${tripId}/items/${itemId}`),
          (r) => patch({ trips: r.trips }),
        ),

      saveSettings: (settings) =>
        run(
          () => api.post<{ settings: Settings }>('settings', settings),
          (r) => patch({ settings: r.settings }),
        ),

      syncParro: async () => {
        const r = await api.post<{ message: string; events: CalendarEvent[] }>('parro');
        patch({ events: r.events });
        await reload();
        return r.message;
      },
    }),
    [data, loading, error, notice, reload, run, patch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore moet binnen StoreProvider gebruikt worden.');
  return ctx;
}

/** Handige, altijd-gevulde weergave van de data. */
export function useData(): AppData & { push: DataResponse['push']; parroConfigured: boolean } {
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
      push: { configured: false, publicKey: '' },
      parroConfigured: false,
    }
  );
}
