/**
 * Signaleren wanneer niemand thuis is.
 *
 * Niels en Irene zetten in de agenda wanneer ze *niet thuis* of *later thuis*
 * zijn (soort "Niet thuis", met een eindtijd). Dit bestand legt die tijdvakken
 * naast elkaar. Zijn ze minstens een half uur tegelijk weg en staat er geen
 * oppas in de agenda die dat tijdvak dekt, dan is dat een signaal.
 *
 * Signalen worden berekend en nergens opgeslagen. Wat wel wordt bewaard, is
 * wat jullie ermee besloten (zie `Decisions` in types.ts). Zo kan een signaal
 * nooit verouderen: wijzigt de agenda, dan wijzigt het signaal mee.
 *
 * Tijden rekenen we in minuten sinds middernacht.
 */

import type { CalendarEvent, Decisions } from './types';
import { addDays } from './dates';
import { involves, peopleOf } from './people';

/** Een tijdvak als [begin, eind) in minuten sinds middernacht. */
export type Span = [number, number];

export const DEFAULT_HOME_TIME = '17:30';
/** Zonder eindtijd schatten we dit aantal minuten. */
const GUESS_AWAY_MIN = 180;
const GUESS_SITTER_MIN = 240;
/** Korter dan dit tegelijk weg is geen signaal waard. */
const MIN_OVERLAP_MIN = 30;

export const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const fromMin = (n: number): string => {
  const c = Math.max(0, Math.min(1440, n));
  return `${String(Math.floor(c / 60) % 24).padStart(2, '0')}:${String(c % 60).padStart(2, '0')}`;
};

const coversDay = (e: CalendarEvent, date: string): boolean =>
  e.date <= date && date <= (e.endDate && e.endDate > e.date ? e.endDate : e.date);

/** Het tijdvak van een item op één dag. Meerdaagse items lopen aan de randen door. */
function spanOn(e: CalendarEvent, date: string, guess: number): Span | null {
  if (!coversDay(e, date)) return null;
  const first = e.date;
  const last = e.endDate && e.endDate > e.date ? e.endDate : e.date;
  const timed = !e.allDay && Boolean(e.time);

  const start = date === first && timed ? toMin(e.time!) : 0;
  let end: number;
  if (date < last) {
    end = 1440;
  } else if (e.endTime) {
    end = toMin(e.endTime);
    // Een eindtijd voor de begintijd loopt door over middernacht; wat daarna
    // valt hoort bij de volgende dag en laten we hier weg.
    if (first === last && timed && end <= start) end = 1440;
  } else if (first === last && timed) {
    end = start + guess;
  } else {
    end = 1440;
  }
  return [start, Math.min(1440, end)];
}

/** Wanneer is Niels of Irene weg volgens dit item? Null als het geen 'weg' is. */
export function awaySpan(e: CalendarEvent, date: string): Span | null {
  if (e.category !== 'weg') return null;
  if (!peopleOf(e).some((p) => p === 'niels' || p === 'irene')) return null;
  return spanOn(e, date, GUESS_AWAY_MIN);
}

/** Welk deel van de dag dekt een oppas? De tijden van de oppas gaan voor. */
function sitterSpan(e: CalendarEvent, date: string): Span | null {
  if (e.category !== 'oppas') return null;
  if (e.sitter?.start && e.sitter.end && coversDay(e, date) && e.date === date) {
    const start = toMin(e.sitter.start);
    let end = toMin(e.sitter.end);
    if (end <= start) end = 1440;
    return [start, end];
  }
  if (e.allDay || !e.time) return null;
  return spanOn(e, date, GUESS_SITTER_MIN);
}

/** Zonder eindtijd is het tijdvak een schatting, en dat zeggen we erbij. */
function isGuessed(e: CalendarEvent): boolean {
  return !e.allDay && Boolean(e.time) && !e.endTime && !(e.endDate && e.endDate > e.date);
}

function overlap(a: Span, b: Span): Span | null {
  const start = Math.max(a[0], b[0]);
  const end = Math.min(a[1], b[1]);
  return end - start >= MIN_OVERLAP_MIN ? [start, end] : null;
}

/** Wat er van `window` overblijft als `covers` is afgetrokken, zonder stukjes onder het minimum. */
export function subtract(window: Span, covers: Span[]): Span[] {
  let gaps: Span[] = [window];
  for (const c of covers) {
    const next: Span[] = [];
    for (const g of gaps) {
      if (c[1] <= g[0] || c[0] >= g[1]) {
        next.push(g);
        continue;
      }
      if (c[0] > g[0]) next.push([g[0], c[0]]);
      if (c[1] < g[1]) next.push([c[1], g[1]]);
    }
    gaps = next;
  }
  return gaps.filter((g) => g[1] - g[0] >= MIN_OVERLAP_MIN);
}

export type Coverage = 'full' | 'partial' | 'none';

export interface Signal {
  /** Datum en begin van het tijdvak, bijvoorbeeld '2026-10-09|1050'. */
  key: string;
  date: string;
  window: Span;
  niels: CalendarEvent;
  irene: CalendarEvent;
  /** Het deel van het tijdvak dat nog niet door een oppas gedekt is. */
  gaps: Span[];
  coverage: Coverage;
  /** De oppas-items die (een deel van) het tijdvak dekken. */
  sitters: CalendarEvent[];
  /** Een van de twee eindtijden is geschat. */
  guessed: boolean;
}

/** De signalen van één dag. */
export function signalsOn(events: CalendarEvent[], date: string): Signal[] {
  const onDay = events.filter((e) => coversDay(e, date));
  const nielsAway = onDay.filter((e) => involves(e, 'niels') && awaySpan(e, date));
  const ireneAway = onDay.filter((e) => involves(e, 'irene') && awaySpan(e, date));
  if (nielsAway.length === 0 || ireneAway.length === 0) return [];

  const sitters = onDay
    .map((e) => ({ e, span: sitterSpan(e, date) }))
    .filter((x): x is { e: CalendarEvent; span: Span } => x.span !== null);

  const seen = new Set<string>();
  const out: Signal[] = [];

  for (const n of nielsAway) {
    for (const i of ireneAway) {
      const window = overlap(awaySpan(n, date)!, awaySpan(i, date)!);
      if (!window) continue;
      const key = `${date}|${window[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const gaps = subtract(window, sitters.map((s) => s.span));
      const coverage: Coverage =
        gaps.length === 0
          ? 'full'
          : gaps.length === 1 && gaps[0][0] === window[0] && gaps[0][1] === window[1]
            ? 'none'
            : 'partial';

      out.push({
        key,
        date,
        window,
        niels: n,
        irene: i,
        gaps,
        coverage,
        sitters: sitters.filter((x) => x.span[0] < window[1] && x.span[1] > window[0]).map((x) => x.e),
        guessed: isGuessed(n) || isGuessed(i),
      });
    }
  }
  return out;
}

/** Alle signalen vanaf vandaag, in de komende `horizon` dagen. */
export function computeSignals(events: CalendarEvent[], today: string, horizon = 60): Signal[] {
  const out: Signal[] = [];
  for (let n = 0; n <= horizon; n++) {
    out.push(...signalsOn(events, addDays(today, n)));
  }
  return out;
}

/** Nog iets mee te doen: niet gedekt en nog geen keuze gemaakt. */
export function isOpen(s: Signal, decisions: Decisions): boolean {
  return s.coverage !== 'full' && !decisions[s.key];
}

/** Opgelost: gedekt door een oppas, of bewust besloten (iemand blijft thuis, geen probleem). */
export function isSettled(s: Signal, decisions: Decisions): boolean {
  const d = decisions[s.key];
  return s.coverage === 'full' || d?.type === 'thuis' || d?.type === 'ok';
}

/** Een oppas-taak bij een signaal dat inmiddels gedekt is, sluit vanzelf. */
export function isAutoClosed(signalKey: string | undefined, signals: Signal[]): boolean {
  if (!signalKey) return false;
  const s = signals.find((x) => x.key === signalKey);
  return s?.coverage === 'full';
}

/**
 * Wat zou er gesignaleerd worden als dit item (nog niet opgeslagen) erbij kwam
 * of zo gewijzigd werd? Voor de waarschuwing terwijl je het invult.
 */
export function signalsForDraft(
  events: CalendarEvent[],
  draft: CalendarEvent,
  today: string,
): Signal[] {
  const others = events.filter((e) => e.id !== draft.id);
  const withDraft = [...others, draft];
  const dates: string[] = [];
  const last = draft.endDate && draft.endDate >= draft.date ? draft.endDate : draft.date;
  for (let d = draft.date; d <= last && dates.length < 14; d = addDays(d, 1)) {
    if (d >= today) dates.push(d);
  }
  return dates
    .flatMap((d) => signalsOn(withDraft, d))
    .filter((s) => s.niels.id === draft.id || s.irene.id === draft.id)
    .filter((s) => s.coverage !== 'full');
}

const clock = (n: number): string => (n >= 1440 ? '24:00' : fromMin(n));

/** "18:00–22:00" */
export const spanLabel = (s: Span): string => `${clock(s[0])}–${clock(s[1])}`;

/** "2 uur" of "1,5 uur" */
export function durationLabel(s: Span): string {
  const minutes = s[1] - s[0];
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
  return `${text} uur`;
}
