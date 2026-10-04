import type { Config } from '@netlify/functions';
import type { CalendarEvent, Settings, Trip } from '../../shared/types';
import { tripReminderLine } from '../../shared/packing';
import { PERSON_LABEL } from '../../shared/types';
import { addDays, formatLong, hourInNl, todayInNl } from '../../shared/dates';
import { DEFAULT_SETTINGS, read, update } from '../lib/store';
import { pushConfigured, sendToAll } from '../lib/push';

/**
 * Draait elk uur en verstuurt alleen op het ingestelde uur in Nederlandse tijd.
 * Zo hoeft er bij de zomer-/wintertijdwissel niets aangepast te worden.
 */
export default async function handler(): Promise<Response> {
  const settings = { ...DEFAULT_SETTINGS, ...(await read<Settings>('settings')) };
  const hour = hourInNl();
  const today = todayInNl();

  if (hour !== settings.reminderHour) {
    return result(`Nog niet: het is ${hour}:00, herinnering staat op ${settings.reminderHour}:00.`);
  }
  if (settings.lastReminderDate === today) {
    return result('Vandaag al verstuurd.');
  }
  if (!pushConfigured()) {
    return result('Geen VAPID-sleutels ingesteld; er kan niets verstuurd worden.');
  }

  const tomorrow = addDays(today, 1);
  const events = await read<CalendarEvent[]>('events');
  const relevant = events
    .filter((e) => e.reminder !== false)
    .filter((e) => coversDate(e, tomorrow))
    .sort(sortByTime);

  // Reizen die morgen vertrekken en nog niet helemaal ingepakt zijn.
  const trips = (await read<Trip[]>('trips')).filter((t) => t.startDate === tomorrow);
  const tripLines = trips.map((t) => tripReminderLine(t)).filter((l): l is string => l !== null);
  const unpackedTrip = trips.find((t) => t.items.some((i) => !i.packed));

  if (relevant.length === 0 && tripLines.length === 0) {
    await markSent(today);
    return result('Morgen staat er niets gepland; niets verstuurd.');
  }

  const lines = [...relevant.map(describe), ...tripLines];
  const bringCount = relevant.reduce((n, e) => n + e.bring.filter((b) => !b.done).length, 0);

  const payload = {
    title: `Morgen — ${formatLong(tomorrow)}`,
    body: lines.join('\n') + (bringCount > 0 ? `\n\n${bringCount} ding(en) klaarzetten.` : ''),
    // Bij een reis die nog ingepakt moet worden opent de melding de paklijst.
    url: unpackedTrip ? `/?trip=${unpackedTrip.id}` : `/?date=${tomorrow}`,
    tag: `dag-${tomorrow}`,
  };

  const sent = await sendToAll(payload);
  await markSent(today);

  console.log('[herinnering]', payload.title, `naar ${sent.sent} toestel(len)`);
  return result(`Verstuurd naar ${sent.sent} toestel(len).`);
}

function coversDate(e: CalendarEvent, date: string): boolean {
  if (!e.endDate) return e.date === date;
  return e.date <= date && date <= e.endDate;
}

function sortByTime(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.time ?? '').localeCompare(b.time ?? '');
}

function describe(e: CalendarEvent): string {
  const who = e.person === 'gezin' ? '' : `${PERSON_LABEL[e.person]}: `;
  const when = e.allDay ? '' : `${e.time} `;
  let line = `• ${when}${who}${e.title}`;

  if (e.sitter) {
    line += ` (oppas ${e.sitter.name}, ${e.sitter.start}–${e.sitter.end})`;
  }
  const bring = e.bring.filter((b) => !b.done).map((b) => b.text);
  if (bring.length > 0) line += `\n   meenemen: ${bring.join(', ')}`;
  return line;
}

async function markSent(today: string): Promise<void> {
  await update<Settings>('settings', (s) => ({
    ...DEFAULT_SETTINGS,
    ...s,
    lastReminderDate: today,
  }));
}

function result(message: string): Response {
  console.log('[herinnering]', message);
  return new Response(JSON.stringify({ message }), {
    headers: { 'content-type': 'application/json' },
  });
}

export const config: Config = { schedule: '2 * * * *' };
