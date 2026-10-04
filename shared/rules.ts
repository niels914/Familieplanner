/**
 * De regels voor het bewaren van een agenda-item en een taak, op één plek.
 *
 * De server (netlify/functions/api.ts) gebruikt ze om op te slaan, en de app
 * gebruikt precies dezelfde functies om het resultaat alvast te tonen terwijl het
 * verzoek nog onderweg is. Zo kan wat je ziet nooit afwijken van wat de server
 * bewaart. Wijzig een regel hier en het geldt voor allebei.
 */

import type { CalendarEvent, Receipt, Task } from './types';
import { warrantyEnd } from './warranty';

export interface SaveContext {
  /** Het tijdstip van opslaan, ISO. */
  now: string;
  /** Maakt een nieuw id als het meegestuurde item er geen heeft. */
  newId: () => string;
}

/**
 * Nieuw item toevoegen, of een bestaand bijwerken (op id). Bij bijwerken blijft van
 * het bestaande item staan wat van de bron of de reeks is: de koppeling met Parro of
 * een agenda, en de reeks. Geeft een nieuwe lijst terug.
 */
export function saveEvent(
  events: CalendarEvent[],
  body: Partial<CalendarEvent>,
  ctx: SaveContext,
): CalendarEvent[] {
  const index = body.id ? events.findIndex((e) => e.id === body.id) : -1;

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
      updatedAt: ctx.now,
    } as CalendarEvent;
    return next;
  }

  return [
    ...events,
    {
      id: body.id ?? ctx.newId(),
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
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
  ];
}

/**
 * Nieuwe taak toevoegen, of een bestaande bijwerken (op id). Het moment van afronden
 * wordt alleen vastgelegd bij de overgang van open naar klaar; weer openzetten wist het.
 */
export function saveTask(tasks: Task[], body: Partial<Task>, ctx: SaveContext): Task[] {
  const index = body.id ? tasks.findIndex((t) => t.id === body.id) : -1;

  if (index >= 0) {
    const current = tasks[index];
    const done = body.done ?? current.done;
    const next = [...tasks];
    next[index] = {
      ...current,
      ...body,
      title: (body.title ?? current.title).trim(),
      id: current.id,
      done,
      doneAt: done ? (current.done ? current.doneAt : ctx.now) : undefined,
      createdAt: current.createdAt,
      updatedAt: ctx.now,
    } as Task;
    return next;
  }

  return [
    ...tasks,
    {
      id: body.id ?? ctx.newId(),
      title: (body.title ?? '').trim(),
      owner: body.owner ?? 'samen',
      kid: body.kid,
      due: body.due,
      note: body.note,
      decision: body.decision,
      eventId: body.eventId,
      signalKey: body.signalKey,
      done: body.done ?? false,
      doneAt: body.done ? ctx.now : undefined,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    },
  ];
}

/**
 * Teruggeven wat verwijderd was, precies zoals het was (dus met bron, reeks en
 * tijdstempels). Wat er inmiddels al weer staat, op id, blijft ongemoeid.
 */
export function restoreItems<T extends { id: string }>(list: T[], items: T[]): T[] {
  const aanwezig = new Set(list.map((i) => i.id));
  return [...list, ...items.filter((i) => !aanwezig.has(i.id))];
}

// ------------------------------------------------------------------ bonnetjes

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const isDatum = (d: string) => DATUM.test(d) && !Number.isNaN(Date.parse(d));

/** Klopt wat er binnenkomt? Geeft een melding om te tonen, of null als alles in orde is. */
export function checkReceipt(body: Partial<Receipt>): string | null {
  if (!body.purchaseDate || !isDatum(body.purchaseDate)) return 'Geef een geldige aankoopdatum op.';
  if (
    body.amountCents !== undefined &&
    (!Number.isInteger(body.amountCents) || body.amountCents < 0 || body.amountCents > 100_000_000)
  ) {
    return 'Het bedrag klopt niet.';
  }
  if (
    body.warrantyMonths !== undefined &&
    (!Number.isInteger(body.warrantyMonths) || body.warrantyMonths < 1 || body.warrantyMonths > 600)
  ) {
    return 'De garantietermijn klopt niet.';
  }
  for (const veld of ['warrantyUntil', 'returnUntil'] as const) {
    const waarde = body[veld];
    if (waarde !== undefined && !isDatum(waarde)) return 'Een einddatum klopt niet.';
  }
  if (body.files !== undefined) {
    const ok =
      Array.isArray(body.files) &&
      body.files.length <= 20 &&
      body.files.every((f) => f && typeof f.id === 'string' && f.id.length > 0 && (f.kind === 'image' || f.kind === 'pdf'));
    if (!ok) return 'Een bijlage klopt niet.';
  }
  return null;
}

const leegIsNiets = (tekst: string | undefined) => tekst?.trim() || undefined;

/**
 * Nieuw bonnetje toevoegen, of een bestaand bijwerken (op id). Wat de server bijhoudt (welke
 * herinneringen al verstuurd zijn) blijft staan en kan niet van buitenaf gezet worden. Verandert de
 * einddatum van de garantie of de retourtermijn, dan begint die weer helemaal opnieuw: een
 * eerdere herinnering of "geen klachten" hoort bij de oude datum.
 */
export function saveReceipt(receipts: Receipt[], body: Partial<Receipt>, ctx: SaveContext): Receipt[] {
  const index = body.id ? receipts.findIndex((r) => r.id === body.id) : -1;
  const current = index >= 0 ? receipts[index] : undefined;

  const next: Receipt = {
    id: current?.id ?? body.id ?? ctx.newId(),
    title: (body.title ?? current?.title ?? '').trim(),
    store: 'store' in body ? leegIsNiets(body.store) : current?.store,
    purchaseDate: body.purchaseDate ?? current?.purchaseDate ?? '',
    amountCents: 'amountCents' in body ? body.amountCents : current?.amountCents,
    person: body.person ?? current?.person ?? 'gezin',
    warrantyMonths: 'warrantyMonths' in body ? body.warrantyMonths : current?.warrantyMonths,
    warrantyUntil: 'warrantyUntil' in body ? body.warrantyUntil : current?.warrantyUntil,
    returnUntil: 'returnUntil' in body ? body.returnUntil : current?.returnUntil,
    serial: 'serial' in body ? leegIsNiets(body.serial) : current?.serial,
    notes: 'notes' in body ? leegIsNiets(body.notes) : current?.notes,
    files: body.files ?? current?.files ?? [],
    remind: 'remind' in body ? body.remind : current?.remind,
    handled: 'handled' in body ? body.handled : current?.handled,
    reminded: current?.reminded,
    createdAt: current?.createdAt ?? ctx.now,
    updatedAt: ctx.now,
  };

  if (current) {
    if (warrantyEnd(current) !== warrantyEnd(next)) {
      next.handled = withoutKey(next.handled, 'warranty');
      next.reminded = withoutKey(next.reminded, 'warranty');
    }
    if (current.returnUntil !== next.returnUntil) {
      next.handled = withoutKey(next.handled, 'return');
      next.reminded = withoutKey(next.reminded, 'return');
    }
  }

  if (index >= 0) {
    const list = [...receipts];
    list[index] = next;
    return list;
  }
  return [...receipts, next];
}

function withoutKey<T extends object>(obj: T | undefined, key: keyof T): T | undefined {
  if (!obj) return undefined;
  const { [key]: _weg, ...rest } = obj;
  return Object.keys(rest).length > 0 ? (rest as T) : undefined;
}

