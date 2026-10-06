import type { Config } from '@netlify/functions';
import type { CalendarEvent, Contact, Receipt, Settings } from '../../shared/types';
import { addDays, hourInNl, todayInNl } from '../../shared/dates';
import { feestdagenOp, feestdagNamen } from '../../shared/feestdagen';
import { dueGiftReminders, giftLine } from '../../shared/verjaardagen';
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
  // Een verjaardag binnen drie weken waar nog geen cadeau-herinnering voor is geweest.
  const contacts = await read<Contact[]>('contacts');
  const gifts = dueGiftReminders(contacts, today);
  const feestdagen = feestdagenOp(tomorrow);
  const payload = bouwHerinnering(events, tomorrow, due.map(alertLine), {
    feestdag: feestdagen.length > 0 ? feestdagNamen(feestdagen) : undefined,
    cadeauRegels: gifts.map(giftLine),
  });

  if (!payload) {
    await markSent(today);
    return result('Morgen staat er niets gepland en niets loopt af; niets verstuurd.');
  }

  const sent = await sendToAll(payload);
  await markSent(today);

  // Onthouden wat er verstuurd is, zodat dezelfde garantie niet elke avond terugkomt.
  // Kwam het bij niemand aan (geen toestel aangemeld), dan blijft het staan voor een volgende keer.
  if (sent.sent > 0 && due.length > 0) {
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

  if (sent.sent > 0 && gifts.length > 0) {
    await update<Contact[]>('contacts', (list) =>
      list.map((c) => {
        const g = gifts.find((x) => x.contact.id === c.id);
        return g ? { ...c, giftRemindedFor: g.date } : c;
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
