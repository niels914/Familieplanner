import {
  PACK_GROUPS,
  PACK_PEOPLE,
  TRIP_KINDS,
  type CalendarEvent,
  type Contact,
  type Meal,
  type PackGroup,
  type PackItem,
  type PickupOverride,
  type PickupRule,
  type PushSubscriptionRecord,
  type Settings,
  type ShoppingItem,
  type Trip,
  type TripItem,
} from '../../shared/types';
import { buildTripItems } from '../../shared/packing';
import { PACKLIST_SEED } from '../../shared/packlist-seed';
import {
  error,
  json,
  newId,
  nowIso,
  readBody,
  requireSession,
  withClearedCookie,
  withSessionCookie,
} from '../lib/http';
import { passwordMatches, hasValidSession } from '../lib/session';
import { DEFAULT_SETTINGS, overwrite, read, readAll, update } from '../lib/store';
import { publicKey, pushConfigured, sendToAll } from '../lib/push';
import { syncParro } from '../lib/parro';

export const config = { path: '/api/*' };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const segments = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [resource, id, action] = segments;

  try {
    // --- Openbare routes -------------------------------------------------
    if (resource === 'login' && req.method === 'POST') {
      const body = await readBody<{ password?: string }>(req);
      if (!process.env.FAMILY_PASSWORD) {
        return error('FAMILY_PASSWORD is nog niet ingesteld in Netlify.', 500);
      }
      if (!body.password || !passwordMatches(body.password)) {
        // Kleine vertraging tegen het aframmelen van wachtwoorden.
        await new Promise((r) => setTimeout(r, 600));
        return error('Wachtwoord klopt niet.', 401);
      }
      return withSessionCookie(json({ ok: true }));
    }

    if (resource === 'session' && req.method === 'GET') {
      return json({ authenticated: hasValidSession(req) });
    }

    if (resource === 'logout' && req.method === 'POST') {
      return withClearedCookie(json({ ok: true }));
    }

    // --- Alles hieronder vereist een sessie ------------------------------
    const denied = requireSession(req);
    if (denied) return denied;

    switch (resource) {
      case 'data':
        return json({
          ...(await readAll()),
          push: { configured: pushConfigured(), publicKey: publicKey() },
          parroConfigured: Boolean(process.env.PARRO_ICS_URL),
        });

      case 'events':
        return await handleEvents(req, id);

      case 'contacts':
        return await handleContacts(req, id);

      case 'pickup-rules':
        return await handlePickupRules(req);

      case 'pickup-overrides':
        return await handlePickupOverrides(req, id);

      case 'shopping':
        return await handleShopping(req, id, action);

      case 'meals':
        return await handleMeals(req, id);

      case 'pack-items':
        return await handlePackItems(req, id, action);

      case 'trips':
        return await handleTrips(req, segments.slice(1));

      case 'settings':
        return await handleSettings(req);

      case 'push':
        return await handlePush(req, id);

      case 'parro':
        if (req.method !== 'POST') return error('Alleen POST.', 405);
        return json(await runParroSync());

      default:
        return error('Onbekend eindpunt.', 404);
    }
  } catch (err) {
    return error((err as Error).message || 'Er ging iets mis.', 500);
  }
}

// ---------------------------------------------------------------- events

async function handleEvents(req: Request, id?: string): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody<Partial<CalendarEvent>>(req);
    if (!body.title?.trim()) return error('Geef het item een titel.');
    if (!body.date) return error('Geef een datum op.');

    const saved = await update<CalendarEvent[]>('events', (events) => {
      const now = nowIso();
      const index = body.id ? events.findIndex((e) => e.id === body.id) : -1;

      if (index >= 0) {
        const current = events[index];
        events[index] = {
          ...current,
          ...body,
          // De Parro-koppeling blijft eigendom van de sync.
          source: current.source,
          parroUid: current.parroUid,
          id: current.id,
          bring: body.bring ?? current.bring,
          createdAt: current.createdAt,
          updatedAt: now,
        } as CalendarEvent;
      } else {
        events.push({
          id: body.id ?? newId(),
          source: 'local',
          title: body.title!.trim(),
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
          createdAt: now,
          updatedAt: now,
        });
      }
      return events;
    });
    return json({ events: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<CalendarEvent[]>('events', (events) =>
      events.filter((e) => e.id !== id),
    );
    return json({ events: saved });
  }

  if (req.method === 'GET') {
    return json({ events: await read<CalendarEvent[]>('events') });
  }

  return error('Methode niet ondersteund.', 405);
}

// -------------------------------------------------------------- contacts

async function handleContacts(req: Request, id?: string): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody<Partial<Contact>>(req);
    if (!body.name?.trim()) return error('Geef een naam op.');

    const saved = await update<Contact[]>('contacts', (contacts) => {
      const now = nowIso();
      const parents = (body.parents ?? []).map((p) => ({ ...p, id: p.id || newId() }));
      const index = body.id ? contacts.findIndex((c) => c.id === body.id) : -1;

      if (index >= 0) {
        contacts[index] = {
          ...contacts[index],
          ...body,
          parents,
          id: contacts[index].id,
          createdAt: contacts[index].createdAt,
          updatedAt: now,
        } as Contact;
      } else {
        contacts.push({
          id: body.id ?? newId(),
          kind: body.kind ?? 'klasgenoot',
          name: body.name!.trim(),
          childOf: body.childOf,
          group: body.group,
          birthday: body.birthday,
          giftIdeas: body.giftIdeas,
          parents,
          sitterRate: body.sitterRate,
          phone: body.phone,
          notes: body.notes,
          createdAt: now,
          updatedAt: now,
        });
      }
      return contacts;
    });
    return json({ contacts: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<Contact[]>('contacts', (c) => c.filter((x) => x.id !== id));
    return json({ contacts: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

// ---------------------------------------------------------- breng & haal

async function handlePickupRules(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('Methode niet ondersteund.', 405);
  const body = await readBody<{ rules: PickupRule[] }>(req);
  const rules = (body.rules ?? []).map((r) => ({ ...r, id: r.id || newId() }));
  await overwrite('pickupRules', rules);
  return json({ pickupRules: rules });
}

async function handlePickupOverrides(req: Request, id?: string): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody<Partial<PickupOverride>>(req);
    if (!body.date || !body.child) return error('Datum en kind zijn verplicht.');
    const saved = await update<PickupOverride[]>('pickupOverrides', (list) => {
      const index = list.findIndex(
        (o) => (body.id && o.id === body.id) || (o.date === body.date && o.child === body.child),
      );
      const record: PickupOverride = {
        id: index >= 0 ? list[index].id : body.id ?? newId(),
        date: body.date!,
        child: body.child!,
        dropoff: body.dropoff,
        pickup: body.pickup,
        note: body.note,
      };
      if (index >= 0) list[index] = record;
      else list.push(record);
      return list;
    });
    return json({ pickupOverrides: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<PickupOverride[]>('pickupOverrides', (l) =>
      l.filter((o) => o.id !== id),
    );
    return json({ pickupOverrides: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

// ------------------------------------------------------------ boodschappen

async function handleShopping(req: Request, id?: string, action?: string): Promise<Response> {
  if (req.method === 'POST' && id === 'clear-done') {
    const saved = await update<ShoppingItem[]>('shopping', (l) => l.filter((i) => !i.done));
    return json({ shopping: saved });
  }

  if (req.method === 'POST' && id && action === 'toggle') {
    const saved = await update<ShoppingItem[]>('shopping', (l) =>
      l.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    );
    return json({ shopping: saved });
  }

  if (req.method === 'POST') {
    const body = await readBody<{ items?: string[]; item?: Partial<ShoppingItem> }>(req);

    // Meerdere regels tegelijk (bijvoorbeeld vanuit het weekmenu).
    if (body.items) {
      const texts = body.items.map((t) => t.trim()).filter(Boolean);
      if (texts.length === 0) return error('Geen items opgegeven.');
      const saved = await update<ShoppingItem[]>('shopping', (list) => {
        for (const text of texts) {
          const exists = list.some(
            (i) => !i.done && i.text.toLowerCase() === text.toLowerCase(),
          );
          if (!exists) {
            list.push({ id: newId(), text, done: false, createdAt: nowIso() });
          }
        }
        return list;
      });
      return json({ shopping: saved });
    }

    const item = body.item;
    if (!item?.text?.trim()) return error('Geef een boodschap op.');
    const saved = await update<ShoppingItem[]>('shopping', (list) => {
      const index = item.id ? list.findIndex((i) => i.id === item.id) : -1;
      if (index >= 0) {
        list[index] = { ...list[index], ...item } as ShoppingItem;
      } else {
        list.push({
          id: item.id ?? newId(),
          text: item.text!.trim(),
          done: item.done ?? false,
          source: item.source,
          createdAt: nowIso(),
        });
      }
      return list;
    });
    return json({ shopping: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<ShoppingItem[]>('shopping', (l) => l.filter((i) => i.id !== id));
    return json({ shopping: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

// ---------------------------------------------------------------- menu

async function handleMeals(req: Request, id?: string): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody<Partial<Meal>>(req);
    if (!body.date) return error('Geef een datum op.');
    const saved = await update<Meal[]>('meals', (meals) => {
      const index = meals.findIndex((m) => m.date === body.date);
      const record: Meal = {
        date: body.date!,
        dish: (body.dish ?? '').trim(),
        notes: body.notes,
        ingredients: body.ingredients ?? [],
      };
      if (!record.dish && record.ingredients.length === 0) {
        return meals.filter((m) => m.date !== body.date);
      }
      if (index >= 0) meals[index] = record;
      else meals.push(record);
      return meals;
    });
    return json({ meals: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<Meal[]>('meals', (m) => m.filter((x) => x.date !== id));
    return json({ meals: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

// ------------------------------------------------------------- paklijst

const clean = (value: unknown): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
};

const wholeNumber = (value: unknown, fallback: number): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};

/** Normaliseert een masteritem uit het verzoek; geeft undefined bij een ongeldige groep of naam. */
function packItemFrom(body: Partial<PackItem>, base?: PackItem): PackItem | undefined {
  const name = clean(body.name ?? base?.name);
  const group = (body.group ?? base?.group) as PackGroup | undefined;
  if (!name || !group || !PACK_GROUPS.includes(group)) return undefined;
  const kinds = body.kinds ?? base?.kinds ?? [];
  return {
    id: base?.id ?? body.id ?? newId(),
    name,
    group,
    qty: wholeNumber(body.qty ?? base?.qty, 1),
    scales: Boolean(body.scales ?? base?.scales),
    kinds: TRIP_KINDS.filter((k) => kinds.includes(k)),
    abroadOnly: (body.abroadOnly ?? base?.abroadOnly) || undefined,
    location: 'location' in body ? clean(body.location) : base?.location,
    toBuy: (body.toBuy ?? base?.toBuy) || undefined,
    link: 'link' in body ? clean(body.link) : base?.link,
    note: 'note' in body ? clean(body.note) : base?.note,
  };
}

async function handlePackItems(req: Request, id?: string, action?: string): Promise<Response> {
  if (req.method === 'POST' && id === 'seed') {
    // Voegt de startlijst uit de Excel toe; wat er al staat blijft ongemoeid.
    let added = 0;
    const saved = await update<PackItem[]>('packItems', (list) => {
      added = 0;
      const known = new Set(list.map((i) => `${i.group}:${i.name.toLowerCase()}`));
      const next = [...list];
      for (const seed of PACKLIST_SEED) {
        if (known.has(`${seed.group}:${seed.name.toLowerCase()}`)) continue;
        next.push({ ...seed, id: newId() });
        added++;
      }
      return next;
    });
    return json({ packItems: saved, added });
  }

  if (req.method === 'POST' && id && action === 'bought') {
    const saved = await update<PackItem[]>('packItems', (list) =>
      list.map((i) =>
        i.id === id
          ? { ...i, toBuy: undefined, kinds: i.kinds.length > 0 ? i.kinds : ['kamperen'] }
          : i,
      ),
    );
    return json({ packItems: saved });
  }

  if (req.method === 'POST') {
    const body = await readBody<Partial<PackItem>>(req);
    const saved = await update<PackItem[]>('packItems', (list) => {
      const index = body.id ? list.findIndex((i) => i.id === body.id) : -1;
      const item = packItemFrom(body, index >= 0 ? list[index] : undefined);
      if (!item) throw new Error('Geef het item een naam en een geldige groep.');
      if (index >= 0) list[index] = item;
      else list.push(item);
      return list;
    });
    return json({ packItems: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<PackItem[]>('packItems', (l) => l.filter((i) => i.id !== id));
    return json({ packItems: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

/** Routes: /trips, /trips/:id, /trips/:id/items, /trips/:id/items/:itemId[/toggle] */
async function handleTrips(req: Request, path: string[]): Promise<Response> {
  const [tripId, sub, itemId, action] = path;

  // Nieuwe reis, of de naam en datum van een bestaande aanpassen.
  if (req.method === 'POST' && !tripId) {
    const body = await readBody<Partial<Trip>>(req);
    if (!body.name?.trim()) return error('Geef de reis een naam.');
    if (!body.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
      return error('Geef een vertrekdatum op.');
    }

    if (body.id) {
      const saved = await update<Trip[]>('trips', (trips) =>
        trips.map((t) =>
          t.id === body.id
            ? {
                ...t,
                name: body.name!.trim(),
                startDate: body.startDate!,
                abroad: body.abroad ?? t.abroad,
                updatedAt: nowIso(),
              }
            : t,
        ),
      );
      return json({ trips: saved });
    }

    if (!body.kind || !TRIP_KINDS.includes(body.kind)) return error('Kies een soort reis.');
    const setup = {
      kind: body.kind,
      nights: wholeNumber(body.nights, 14),
      abroad: Boolean(body.abroad),
      who: (body.who ?? PACK_PEOPLE).filter((p) => PACK_PEOPLE.includes(p)),
    };
    const trip: Trip = {
      id: newId(),
      name: body.name.trim(),
      startDate: body.startDate,
      ...setup,
      items: buildTripItems(await read<PackItem[]>('packItems'), setup, newId),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const saved = await update<Trip[]>('trips', (trips) =>
      trips.some((t) => t.id === trip.id) ? trips : [...trips, trip],
    );
    return json({ trips: saved, created: trip.id });
  }

  if (!tripId) return error('Methode niet ondersteund.', 405);

  if (req.method === 'DELETE' && !sub) {
    const saved = await update<Trip[]>('trips', (t) => t.filter((x) => x.id !== tripId));
    return json({ trips: saved });
  }

  // Wijzigingen aan één regel van een paklijst: als operatie op de reis, zodat
  // twee mensen tegelijk afvinken elkaar niet overschrijven.
  const editTrip = async (change: (trip: Trip) => void): Promise<Response> => {
    const saved = await update<Trip[]>('trips', (trips) =>
      trips.map((t) => {
        if (t.id !== tripId) return t;
        const copy = { ...t, items: t.items.map((i) => ({ ...i })), updatedAt: nowIso() };
        change(copy);
        return copy;
      }),
    );
    return json({ trips: saved });
  };

  if (sub === 'items' && req.method === 'POST' && itemId && action === 'toggle') {
    return editTrip((t) => {
      const item = t.items.find((i) => i.id === itemId);
      if (item) item.packed = !item.packed;
    });
  }

  if (sub === 'items' && req.method === 'DELETE' && itemId) {
    return editTrip((t) => {
      t.items = t.items.filter((i) => i.id !== itemId);
    });
  }

  if (sub === 'items' && req.method === 'POST' && !itemId) {
    const body = await readBody<Partial<TripItem> & { saveToMaster?: boolean }>(req);
    const name = clean(body.name);
    if (!name) return error('Geef het item een naam.');
    if (!body.group || !PACK_GROUPS.includes(body.group)) return error('Kies een groep.');
    const fields = {
      name,
      group: body.group,
      qty: wholeNumber(body.qty, 1),
      location: clean(body.location),
      note: clean(body.note),
      toBuy: body.toBuy || undefined,
    };

    // Optioneel ook in de masterlijst, zodat het de volgende reis meekomt.
    let masterId: string | undefined;
    if (body.saveToMaster && !body.id) {
      const trip = (await read<Trip[]>('trips')).find((t) => t.id === tripId);
      const master: PackItem = {
        id: newId(),
        ...fields,
        scales: false,
        kinds: trip ? [trip.kind] : ['kamperen'],
      };
      await update<PackItem[]>('packItems', (list) => [...list, master]);
      masterId = master.id;
    }

    const newItemId = newId();
    return editTrip((t) => {
      const existing = body.id ? t.items.find((i) => i.id === body.id) : undefined;
      if (existing) Object.assign(existing, fields);
      else t.items.push({ id: newItemId, masterId, ...fields, packed: false });
    });
  }

  return error('Methode niet ondersteund.', 405);
}

// ------------------------------------------------------------- instellingen

async function handleSettings(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('Methode niet ondersteund.', 405);
  const body = await readBody<Partial<Settings>>(req);
  const saved = await update<Settings>('settings', (current) => ({
    ...DEFAULT_SETTINGS,
    ...current,
    ...body,
  }));
  return json({ settings: saved });
}

// --------------------------------------------------------------- push

async function handlePush(req: Request, id?: string): Promise<Response> {
  if (req.method !== 'POST') return error('Methode niet ondersteund.', 405);

  if (id === 'subscribe') {
    const body = await readBody<{
      endpoint?: string;
      keys?: { p256dh: string; auth: string };
      label?: string;
    }>(req);
    if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
      return error('Onvolledig push-abonnement.');
    }
    const saved = await update<PushSubscriptionRecord[]>('pushSubs', (subs) => {
      const rest = subs.filter((s) => s.endpoint !== body.endpoint);
      rest.push({
        id: newId(),
        endpoint: body.endpoint!,
        keys: body.keys!,
        label: body.label?.trim() || 'Toestel',
        createdAt: nowIso(),
      });
      return rest;
    });
    return json({ ok: true, devices: saved.length });
  }

  if (id === 'unsubscribe') {
    const body = await readBody<{ endpoint?: string }>(req);
    const saved = await update<PushSubscriptionRecord[]>('pushSubs', (subs) =>
      subs.filter((s) => s.endpoint !== body.endpoint),
    );
    return json({ ok: true, devices: saved.length });
  }

  if (id === 'test') {
    const result = await sendToAll({
      title: 'Familieplanner',
      body: 'Testbericht — meldingen werken.',
      url: '/',
      tag: 'test',
    });
    return json(result);
  }

  if (id === 'devices') {
    const subs = await read<PushSubscriptionRecord[]>('pushSubs');
    return json({ devices: subs.map((s) => ({ id: s.id, label: s.label, createdAt: s.createdAt })) });
  }

  return error('Onbekende push-actie.', 404);
}

async function runParroSync() {
  const result = await syncParro();
  await update<Settings>('settings', (s) => ({
    ...DEFAULT_SETTINGS,
    ...s,
    parroLastSync: nowIso(),
    parroLastResult: result.message,
    parroEventCount: result.total,
  }));
  return { ...result, events: await read<CalendarEvent[]>('events') };
}
