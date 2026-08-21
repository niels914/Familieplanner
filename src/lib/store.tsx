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
  PickupOverride,
  PickupRule,
  Settings,
  ShoppingItem,
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
      settings: { reminderHour: 19 },
      push: { configured: false, publicKey: '' },
      parroConfigured: false,
    }
  );
}
