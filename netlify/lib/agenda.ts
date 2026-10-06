/**
 * Persoonlijke agenda's (Google Agenda) als volwaardige items in de gezinsagenda.
 *
 * Elke agenda komt uit één iCal-link in een omgevingsvariabele. Alleen lezen:
 * er gaat niets terug naar Google. Afspraken komen op naam van de eigenaar,
 * met volledige titel, ook als ze privé zijn. Een volgende sync werkt titel,
 * datum, tijd en plaats bij; persoon, soort, meeneem-lijstje en eigen notitie
 * blijven staan zoals jullie ze zetten.
 *
 * De link is een wachtwoord: hij staat nooit in de code en nooit in een melding.
 */

import type { AgendaFeedId, AgendaSyncState, CalendarEvent, PersonId, Settings } from '../../shared/types';
import { addDays, todayInNl } from '../../shared/dates';
import { parseIcs } from './ics';
import { DEFAULT_SETTINGS, update } from './store';

export interface Feed {
  id: AgendaFeedId;
  envVar: string;
  person: PersonId;
  label: string;
}

export const FEEDS: Feed[] = [
  { id: 'niels', envVar: 'NIELS_ICS_URL', person: 'niels', label: 'Gmail van Niels' },
  { id: 'irene', envVar: 'IRENE_ICS_URL', person: 'irene', label: 'Outlook van Irene' },
];

export const configuredFeeds = (): Feed[] => FEEDS.filter((f) => Boolean(process.env[f.envVar]));

/** Een paar dagen terug, zodat wat net gebeurd is niet meteen verdwijnt. Alles in de toekomst tot: */
const DAYS_BACK = 14;
const DAYS_AHEAD = 400;

export interface FeedResult {
  feed: AgendaFeedId;
  ok: boolean;
  message: string;
  added: number;
  updated: number;
  removed: number;
  total: number;
}

const fail = (feed: Feed, message: string): FeedResult => ({
  feed: feed.id,
  ok: false,
  message,
  added: 0,
  updated: 0,
  removed: 0,
  total: 0,
});

/**
 * Google zet in omschrijvingen soms HTML (regeleinden, links, Meet-gegevens).
 * Dat maken we leesbaar en we kappen af, zodat een lange uitnodiging niets
 * in de weg zit.
 */
export function cleanDescription(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const plain = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_m, href: string, label: string) =>
      label.trim() === href.trim() || !label.trim() ? href : `${label} (${href})`,
    )
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    // Scheidingslijnen van een uitnodiging (Teams, Zoom): lange rijen _____ of ----- zonder spaties.
    .replace(/^[\s_\-=*~.]{5,}$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!plain) return undefined;
  return plain.length > 1000 ? `${plain.slice(0, 999)}…` : plain;
}

/** De link mag nooit in een melding terechtkomen. */
const zonderLink = (message: string, url: string): string => message.split(url).join('(de link)');

export async function syncFeed(feed: Feed): Promise<FeedResult> {
  const url = process.env[feed.envVar];
  if (!url) return fail(feed, `${feed.envVar} is niet ingesteld in de omgevingsvariabelen.`);

  try {
    if (new URL(url).protocol !== 'https:') return fail(feed, `${feed.envVar} moet met https:// beginnen.`);
  } catch {
    return fail(feed, `${feed.envVar} is geen geldige link.`);
  }

  let text: string;
  try {
    const res = await fetch(url, {
      headers: { accept: 'text/calendar, text/plain;q=0.9, */*;q=0.5' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return fail(
        feed,
        res.status === 404 || res.status === 403
          ? `${feed.label}: Google gaf HTTP ${res.status}. Is de link nog geldig? Dat verandert als je de geheime link opnieuw instelt.`
          : `${feed.label}: HTTP ${res.status}.`,
      );
    }
    text = await res.text();
  } catch (err) {
    return fail(feed, zonderLink(`${feed.label}: kon de agenda niet ophalen: ${(err as Error).message}`, url));
  }

  if (!text.toUpperCase().includes('BEGIN:VCALENDAR')) {
    return fail(feed, `${feed.label}: de opgehaalde inhoud is geen agenda. Klopt de link nog?`);
  }

  const today = todayInNl();
  const from = addDays(today, -DAYS_BACK);
  const until = addDays(today, DAYS_AHEAD);
  const parsed = parseIcs(text, { from, until, stableRecurringUids: true, untitled: '(zonder titel)' });

  let added = 0;
  let updated = 0;
  let removed = 0;

  await update<CalendarEvent[]>('events', (events) => {
    // Bij een nieuwe poging na een botsing beginnen de tellers opnieuw.
    added = updated = removed = 0;

    const mine = (e: CalendarEvent) => e.source === 'agenda' && e.agendaFeed === feed.id && Boolean(e.agendaUid);
    const byUid = new Map<string, CalendarEvent>();
    for (const e of events) if (mine(e)) byUid.set(e.agendaUid!, e);

    const seen = new Set<string>();
    const now = new Date().toISOString();

    for (const ics of parsed) {
      seen.add(ics.uid);
      const existing = byUid.get(ics.uid);
      const description = cleanDescription(ics.description);

      if (existing) {
        const unchangedNotes = (existing.notes ?? '') === (existing.syncedNotes ?? '');
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
          source: 'agenda',
          agendaFeed: feed.id,
          agendaUid: ics.uid,
          title: ics.summary,
          date: ics.date,
          endDate: ics.endDate,
          allDay: ics.allDay,
          time: ics.time,
          endTime: ics.endTime,
          person: feed.person,
          category: 'afspraak',
          bring: [],
          notes: description,
          syncedNotes: description,
          // Een werkafspraak hoort niet in de avondmelding voor het hele gezin;
          // dat staat per item aan te zetten.
          reminder: false,
          location: ics.location,
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    // Een lege feed ruimt niets op: dat is vaker een storing dan een leeg jaar.
    if (parsed.length === 0) return events;

    // Wat uit de feed verdwenen is, binnen het venster, opruimen. Een meeneem-lijstje bewaren we.
    return events.filter((e) => {
      if (!mine(e) || seen.has(e.agendaUid!)) return true;
      if (e.date < from || e.date > until) return true;
      if (e.bring.length > 0) return true;
      removed++;
      return false;
    });
  });

  return {
    feed: feed.id,
    ok: true,
    message: `${feed.label}: ${added} nieuw, ${updated} bijgewerkt, ${removed} verwijderd.`,
    added,
    updated,
    removed,
    total: parsed.length,
  };
}

/** Alle gekoppelde agenda's ophalen en het resultaat in de instellingen zetten. */
export async function runAgendaSync(): Promise<{ ok: boolean; message: string; results: FeedResult[] }> {
  const feeds = configuredFeeds();
  if (feeds.length === 0) {
    return { ok: false, message: 'Er is nog geen agenda gekoppeld.', results: [] };
  }

  const results: FeedResult[] = [];
  for (const feed of feeds) results.push(await syncFeed(feed));

  const at = new Date().toISOString();
  await update<Settings>('settings', (s) => {
    const agendaSync: Partial<Record<AgendaFeedId, AgendaSyncState>> = { ...s.agendaSync };
    for (const r of results) {
      // Mislukt het, dan laten we het laatst bekende aantal staan.
      const count = r.ok ? r.total : (s.agendaSync?.[r.feed]?.count ?? 0);
      agendaSync[r.feed] = { at, ok: r.ok, message: r.message, count };
    }
    return { ...DEFAULT_SETTINGS, ...s, agendaSync };
  });

  return { ok: results.every((r) => r.ok), message: results.map((r) => r.message).join(' '), results };
}
