import type { CalendarEvent, Settings } from '../../shared/types';
import { addDays, todayInNl } from '../../shared/dates';
import { parseIcs } from './ics';
import { read, update } from './store';

export interface SyncResult {
  ok: boolean;
  message: string;
  added: number;
  updated: number;
  removed: number;
  total: number;
}

/** Hoe ver terug en vooruit we de schoolagenda overnemen. */
const DAYS_BACK = 60;
const DAYS_AHEAD = 400;

export async function syncParro(): Promise<SyncResult> {
  const url = process.env.PARRO_ICS_URL;
  if (!url) {
    return {
      ok: false,
      message: 'PARRO_ICS_URL is niet ingesteld in de omgevingsvariabelen.',
      added: 0,
      updated: 0,
      removed: 0,
      total: 0,
    };
  }

  let text: string;
  try {
    const res = await fetch(url, {
      headers: { accept: 'text/calendar, text/plain;q=0.9, */*;q=0.5' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Parro gaf HTTP ${res.status} terug.`,
        added: 0,
        updated: 0,
        removed: 0,
        total: 0,
      };
    }
    text = await res.text();
  } catch (err) {
    return {
      ok: false,
      message: `Kon de Parro-agenda niet ophalen: ${(err as Error).message}`,
      added: 0,
      updated: 0,
      removed: 0,
      total: 0,
    };
  }

  if (!text.toUpperCase().includes('BEGIN:VCALENDAR')) {
    return {
      ok: false,
      message: 'De opgehaalde inhoud is geen iCalendar-bestand. Klopt de link nog?',
      added: 0,
      updated: 0,
      removed: 0,
      total: 0,
    };
  }

  const today = todayInNl();
  const from = addDays(today, -DAYS_BACK);
  const until = addDays(today, DAYS_AHEAD);
  const parsed = parseIcs(text, { from, until });

  const settings = await read<Settings>('settings');
  const person = settings.parroPerson ?? 'matthijs';

  let added = 0;
  let updated = 0;
  let removed = 0;

  await update<CalendarEvent[]>('events', (events) => {
    const byUid = new Map<string, CalendarEvent>();
    for (const e of events) {
      if (e.source === 'parro' && e.parroUid) byUid.set(e.parroUid, e);
    }

    const seen = new Set<string>();
    const now = new Date().toISOString();

    for (const ics of parsed) {
      seen.add(ics.uid);
      const existing = byUid.get(ics.uid);
      const description = ics.description?.trim() || undefined;

      if (existing) {
        const unchangedNotes =
          (existing.notes ?? '') === (existing.syncedNotes ?? '');
        const before = JSON.stringify(existing);
        existing.title = ics.summary;
        existing.date = ics.date;
        existing.endDate = ics.endDate;
        existing.allDay = ics.allDay;
        existing.time = ics.time;
        existing.endTime = ics.endTime;
        existing.location = ics.location;
        existing.syncedNotes = description;
        // Eigen notities laten staan; alleen bijwerken als jij ze niet hebt aangeraakt.
        if (unchangedNotes) existing.notes = description;
        if (JSON.stringify(existing) !== before) {
          existing.updatedAt = now;
          updated++;
        }
      } else {
        events.push({
          id: crypto.randomUUID(),
          source: 'parro',
          parroUid: ics.uid,
          title: ics.summary,
          date: ics.date,
          endDate: ics.endDate,
          allDay: ics.allDay,
          time: ics.time,
          endTime: ics.endTime,
          person,
          category: 'school',
          bring: [],
          notes: description,
          syncedNotes: description,
          reminder: true,
          location: ics.location,
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    // Items die uit de feed verdwenen zijn, binnen het venster, opruimen.
    // Alleen als er niets eigens aan hangt: een meeneem-lijstje bewaren we.
    const kept = events.filter((e) => {
      if (e.source !== 'parro' || !e.parroUid) return true;
      if (seen.has(e.parroUid)) return true;
      if (e.date < from || e.date > until) return true;
      if (e.bring.length > 0) return true;
      removed++;
      return false;
    });

    return kept;
  });

  return {
    ok: true,
    message: `Parro gesynchroniseerd: ${added} nieuw, ${updated} bijgewerkt, ${removed} verwijderd.`,
    added,
    updated,
    removed,
    total: parsed.length,
  };
}
