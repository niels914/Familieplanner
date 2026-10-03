import { createHash } from 'node:crypto';
import type {
  BringItem,
  CalendarEvent,
  Contact,
  Meal,
  PickupOverride,
  PickupRule,
  PushSubscriptionRecord,
  Decisions,
  Settings,
  ShoppingItem,
  SeriesInfo,
  SignalDecision,
  Task,
  SeriesSharedField,
} from '../../shared/types';
import { SERIES_SHARED_FIELDS } from '../../shared/types';
import { seriesDates } from '../../shared/series';
import { addDays } from '../../shared/dates';
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
import { configuredFeeds, runAgendaSync } from '../lib/agenda';
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
        return await handleData(req);

      case 'events':
        if (id === 'series') return await handleSeries(req, action, url);
        if (id === 'bring-bulk') return await handleBringBulk(req);
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

      case 'tasks':
        return await handleTasks(req, id);

      case 'decisions':
        return await handleDecisions(req, id);

      case 'settings':
        return await handleSettings(req);

      case 'push':
        return await handlePush(req, id);

      case 'parro':
        if (req.method !== 'POST') return error('Alleen POST.', 405);
        return json(await runParroSync());

      case 'agenda': {
        if (req.method !== 'POST') return error('Alleen POST.', 405);
        const result = await runAgendaSync();
        return json({ ...result, events: await read<CalendarEvent[]>('events') });
      }

      default:
        return error('Onbekend eindpunt.', 404);
    }
  } catch (err) {
    return error((err as Error).message || 'Er ging iets mis.', 500);
  }
}

// ------------------------------------------------------------------ data

/**
 * Alles in één keer, voor het openen van de app. Met een ETag: is er niets
 * veranderd sinds de vorige keer, dan antwoordt de server met een lege 304 en
 * hoeft de telefoon niets opnieuw te downloaden.
 */
async function handleData(req: Request): Promise<Response> {
  const body = JSON.stringify({
    ...(await readAll()),
    push: { configured: pushConfigured(), publicKey: publicKey() },
    parroConfigured: Boolean(process.env.PARRO_ICS_URL),
    agendaFeeds: configuredFeeds().map((f) => ({ id: f.id, label: f.label })),
  });
  const etag = `"${createHash('sha1').update(body).digest('base64url')}"`;
  // 'no-cache' bewaart het antwoord wel, maar vraagt eerst of het nog klopt.
  const headers = { etag, 'cache-control': 'private, no-cache', vary: 'cookie' };

  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, {
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
  });
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
          // De koppeling met Parro of een agenda blijft eigendom van de sync, de reeks van de reeks.
          source: current.source,
          parroUid: current.parroUid,
          agendaFeed: current.agendaFeed,
          agendaUid: current.agendaUid,
          series: current.series,
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

// ---------------------------------------------------------------- reeksen

/**
 * Een reeks bestaat uit gewone items met hetzelfde series.id. Aanmaken,
 * bijwerken "vanaf deze keer" en verwijderen gebeuren hier in één schrijfactie,
 * in plaats van tientallen losse verzoeken vanaf de telefoon.
 */
async function handleSeries(req: Request, seriesId: string | undefined, url: URL): Promise<Response> {
  // Nieuwe reeks
  if (req.method === 'POST' && !seriesId) {
    const body = await readBody<{ event: Partial<CalendarEvent>; interval: 1 | 2; until: string }>(req);
    const { event, until } = body;
    const interval = body.interval === 2 ? 2 : 1;
    if (!event?.title?.trim()) return error('Geef de reeks een titel.');
    if (!event.date) return error('Geef een startdatum op.');
    if (!until || until < event.date) return error('De einddatum ligt vóór de start.');
    if (until > addDays(event.date, 3 * 366)) return error('Een reeks kan hoogstens drie jaar lopen.');

    const dates = seriesDates(event.date, interval, until);
    const series: SeriesInfo = { id: newId(), interval, until };
    const now = nowIso();

    const saved = await update<CalendarEvent[]>('events', (events) => {
      // Idempotent: update() past deze bewerking opnieuw toe als iemand anders
      // tussendoor schreef. Staat de reeks er dan al in, niet dubbel aanmaken.
      if (events.some((e) => e.series?.id === series.id)) return events;
      for (const date of dates) {
        events.push({
          id: newId(),
          source: 'local',
          title: event.title!.trim(),
          date,
          allDay: !event.time,
          time: event.time,
          endTime: event.endTime,
          person: event.person ?? 'gezin',
          category: event.category ?? 'anders',
          // Het meeneem-lijstje van het formulier geldt voor elke keer, met
          // eigen id's zodat afvinken per keer werkt.
          bring: (event.bring ?? []).map((b) => ({ id: newId(), text: b.text, done: false })),
          notes: event.notes,
          reminder: event.reminder ?? true,
          location: event.location,
          series,
          createdAt: now,
          updatedAt: now,
        });
      }
      return events;
    });
    return json({ events: saved, count: dates.length, seriesId: series.id });
  }

  if (!seriesId) return error('Onbekende reeks.', 404);

  // Gedeelde velden bijwerken voor deze en alle volgende keren.
  if (req.method === 'POST') {
    const body = await readBody<{ from: string; patch: Partial<CalendarEvent> }>(req);
    if (!body.from) return error('Vanaf welke datum?');
    const patch: Partial<Record<SeriesSharedField, unknown>> = {};
    for (const veld of SERIES_SHARED_FIELDS) {
      if (veld in (body.patch ?? {})) patch[veld] = body.patch[veld];
    }
    const saved = await update<CalendarEvent[]>('events', (events) =>
      events.map((e) =>
        e.series?.id === seriesId && e.date >= body.from
          ? ({ ...e, ...patch, allDay: !('time' in patch ? patch.time : e.time), updatedAt: nowIso() } as CalendarEvent)
          : e,
      ),
    );
    return json({ events: saved });
  }

  // Verwijderen: alles, of vanaf een datum.
  if (req.method === 'DELETE') {
    const from = url.searchParams.get('from');
    const saved = await update<CalendarEvent[]>('events', (events) =>
      events.filter((e) => !(e.series?.id === seriesId && (!from || e.date >= from))),
    );
    return json({ events: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

/** Eén ding toevoegen aan het meeneem-lijstje van meerdere items tegelijk. */
async function handleBringBulk(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('Methode niet ondersteund.', 405);
  const body = await readBody<{ ids: string[]; text: string }>(req);
  const text = body.text?.trim();
  if (!text) return error('Wat moet er mee?');
  if (!body.ids?.length) return error('Kies eerst een of meer keren.');

  const ids = new Set(body.ids);
  const saved = await update<CalendarEvent[]>('events', (events) =>
    events.map((e) => {
      if (!ids.has(e.id)) return e;
      // Niet dubbel toevoegen als het er al staat.
      if (e.bring.some((b) => b.text.toLowerCase() === text.toLowerCase())) return e;
      const item: BringItem = { id: newId(), text, done: false };
      return { ...e, bring: [...e.bring, item], updatedAt: nowIso() };
    }),
  );
  return json({ events: saved });
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

// ---------------------------------------------------------------- taken

const TASK_OWNERS = ['niels', 'irene', 'samen'];

async function handleTasks(req: Request, id?: string): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody<Partial<Task>>(req);
    if (!body.title?.trim()) return error('Geef de taak een titel.');
    if (body.owner && !TASK_OWNERS.includes(body.owner)) return error('Onbekende eigenaar.');

    const saved = await update<Task[]>('tasks', (tasks) => {
      const now = nowIso();
      const index = body.id ? tasks.findIndex((t) => t.id === body.id) : -1;

      if (index >= 0) {
        const current = tasks[index];
        const done = body.done ?? current.done;
        tasks[index] = {
          ...current,
          ...body,
          title: body.title!.trim(),
          id: current.id,
          done,
          // Het moment van afronden alleen vastleggen bij de overgang.
          doneAt: done ? (current.done ? current.doneAt : now) : undefined,
          createdAt: current.createdAt,
          updatedAt: now,
        } as Task;
      } else {
        tasks.push({
          id: body.id ?? newId(),
          title: body.title!.trim(),
          owner: body.owner ?? 'samen',
          kid: body.kid,
          due: body.due,
          note: body.note,
          decision: body.decision,
          eventId: body.eventId,
          signalKey: body.signalKey,
          done: body.done ?? false,
          doneAt: body.done ? now : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
      return tasks;
    });
    return json({ tasks: saved });
  }

  if (req.method === 'DELETE' && id) {
    const saved = await update<Task[]>('tasks', (t) => t.filter((x) => x.id !== id));
    return json({ tasks: saved });
  }

  return error('Methode niet ondersteund.', 405);
}

/** De keuze bij een signaal "allebei weg". Sleutel is bijvoorbeeld '2026-10-09|1050'. */
async function handleDecisions(req: Request, id?: string): Promise<Response> {
  if (req.method === 'POST') {
    const body = await readBody<{ key?: string; decision?: SignalDecision }>(req);
    if (!body.key || !body.decision?.type) return error('Welk signaal, en welke keuze?');
    const saved = await update<Decisions>('decisions', (d) => ({
      ...d,
      [body.key!]: { ...body.decision!, at: nowIso() } as SignalDecision,
    }));
    return json({ decisions: saved });
  }

  if (req.method === 'DELETE' && id) {
    const key = decodeURIComponent(id);
    const saved = await update<Decisions>('decisions', (d) => {
      const { [key]: _weg, ...rest } = d;
      return rest;
    });
    return json({ decisions: saved });
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
    const body = await readBody<{ endpoint?: string }>(req).catch(() => ({}) as { endpoint?: string });
    const result = await sendToAll(
      {
        title: 'Meldingen staan aan',
        body: 'Je krijgt elke avond een overzicht van morgen, met wat er mee moet.',
        url: '/',
        tag: 'test',
      },
      body.endpoint,
    );
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
