/**
 * De regels voor het bewaren van een agenda-item en een taak, op één plek.
 *
 * De server (netlify/functions/api.ts) gebruikt ze om op te slaan, en de app
 * gebruikt precies dezelfde functies om het resultaat alvast te tonen terwijl het
 * verzoek nog onderweg is. Zo kan wat je ziet nooit afwijken van wat de server
 * bewaart. Wijzig een regel hier en het geldt voor allebei.
 */

import type { CalendarEvent, Task } from './types';

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
