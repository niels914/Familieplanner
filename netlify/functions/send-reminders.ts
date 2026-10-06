import type { Config } from '@netlify/functions';
import type { CalendarEvent, Receipt, Settings, Trip } from '../../shared/types';
import { addDays, hourInNl, todayInNl } from '../../shared/dates';
import { tripReminderLine } from '../../shared/packing';
import { alertLine, dueReminders } from '../../shared/warranty';
import { bouwHerinnering } from '../lib/reminder';
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
  // Garanties en retourtermijnen die bijna aflopen, elk hoogstens één keer.
  const receipts = await read<Receipt[]>('receipts');
  const due = dueReminders(receipts, today);
  // Reizen die morgen vertrekken en nog niet helemaal ingepakt zijn.
  const trips = (await read<Trip[]>('trips')).filter((t) => t.startDate === tomorrow);
  const tripLines = trips.map((t) => tripReminderLine(t)).filter((l): l is string => l !== null);
  const unpackedTrip = trips.find((t) => t.items.some((i) => !i.packed));
  const reis = unpackedTrip ? { id: unpackedTrip.id, regels: tripLines } : undefined;

  const payload = bouwHerinnering(events, tomorrow, due.map(alertLine), reis);
  if (!payload) {
    await markSent(today);
    return result('Morgen staat er niets gepland en niets loopt af; niets verstuurd.');
  }

  const sent = await sendToAll(payload);
  await markSent(today);

  // Onthouden wat er verstuurd is, zodat dezelfde garantie niet elke avond terugkomt.
  if (due.length > 0) {
    await update<Receipt[]>('receipts', (list) =>
      list.map((r) => {
        const mine = due.filter((a) => a.id === r.id);
        if (mine.length === 0) return r;
        const reminded = { ...r.reminded };
        for (const a of mine) reminded[a.kind === 'warranty' ? 'warranty' : 'return'] = today;
        return { ...r, reminded };
      }),
    );
  }

  console.log('[herinnering]', payload.title, `naar ${sent.sent} toestel(len)`);
  return result(`Verstuurd naar ${sent.sent} toestel(len).`);
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
