import type {
  CalendarEvent,
  Contact,
  Meal,
  PickupOverride,
  PickupRule,
  PushSubscriptionRecord,
  Settings,
  ShoppingItem,
} from '../../shared/types';
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
