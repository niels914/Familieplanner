/**
 * Minimale, tolerante iCalendar-parser voor de Parro-schoolagenda en de
 * persoonlijke agenda's (Google Agenda).
 *
 * Bewust geen externe library: we willen precies weten wat er gebeurt met hele
 * dagen versus tijdstippen. De parser gaat om met regelvouwing, VALUE=DATE,
 * TZID, UTC-tijden, herhalingen (RRULE met FREQ, INTERVAL, COUNT, UNTIL, BYDAY
 * ook als "eerste maandag", BYMONTHDAY en BYMONTH), EXDATE, aangepaste of
 * verplaatste afspraken uit een reeks (RECURRENCE-ID) en geannuleerde afspraken.
 */

import { TZ } from '../../shared/dates';

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  /** 'YYYY-MM-DD' in Nederlandse lokale tijd. */
  date: string;
  /** Laatste dag inclusief, alleen bij meerdaagse items. */
  endDate?: string;
  allDay: boolean;
  /** 'HH:MM', alleen als allDay false is. */
  time?: string;
  endTime?: string;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Regels samenvoegen die met een spatie of tab beginnen (RFC 5545 folding). */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out.filter((l) => l.trim() !== '');
}

function parseLine(line: string): Prop | null {
  const colon = indexOfUnquoted(line, ':');
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const segments = splitUnquoted(head, ';');
  const name = (segments.shift() ?? '').toUpperCase();
  const params: Record<string, string> = {};
  for (const seg of segments) {
    const eq = seg.indexOf('=');
    if (eq < 0) continue;
    params[seg.slice(0, eq).toUpperCase()] = seg.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name, params, value };
}

function indexOfUnquoted(s: string, char: string): number {
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') quoted = !quoted;
    else if (s[i] === char && !quoted) return i;
  }
  return -1;
}

function splitUnquoted(s: string, char: string): string[] {
  const out: string[] = [];
  let quoted = false;
  let cur = '';
  for (const c of s) {
    if (c === '"') quoted = !quoted;
    if (c === char && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

interface Moment {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  dateOnly: boolean;
  /** Voor herhalingen: het originele tijdstip als UTC-milliseconden benadering. */
  sortKey: number;
}

const utcFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Een absoluut moment omzetten naar Nederlandse wandkloktijd. */
function toNlWallClock(ms: number): { date: string; time: string } {
  const parts = utcFormatter.formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` };
}

/** Hoeveel milliseconden loopt de wandklok in `zone` voor op UTC, op dit moment? Null bij een onbekende zone. */
function zoneOffsetMs(zone: string, ms: number): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    return wall - Math.floor(ms / 60000) * 60000;
  } catch {
    return null;
  }
}

/** Wandkloktijd in een andere tijdzone dan de Nederlandse, als UTC-milliseconden. */
function wallInZoneToUtc(wallMs: number, zone: string): number | null {
  let guess = wallMs;
  for (let i = 0; i < 2; i++) {
    const offset = zoneOffsetMs(zone, guess);
    if (offset === null) return null;
    guess = wallMs - offset;
  }
  return guess;
}

function parseMoment(prop: Prop): Moment | null {
  const v = prop.value.trim();
  const dateOnly = prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v);

  if (dateOnly) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(v);
    if (!m) return null;
    const date = `${m[1]}-${m[2]}-${m[3]}`;
    return { date, dateOnly: true, sortKey: Date.UTC(+m[1], +m[2] - 1, +m[3]) };
  }

  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;

  if (z === 'Z') {
    const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
    const wall = toNlWallClock(ms);
    return { date: wall.date, time: wall.time, dateOnly: false, sortKey: ms };
  }

  const wallMs = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);

  // Een andere tijdzone dan de Nederlandse (bijvoorbeeld een afspraak in New York):
  // omrekenen naar de tijd die jij op de klok ziet. Onbekende namen, zoals die
  // van Outlook, nemen we over als wandkloktijd.
  const zone = prop.params.TZID;
  if (zone && zone !== TZ) {
    const ms = wallInZoneToUtc(wallMs, zone);
    if (ms !== null) {
      const wall = toNlWallClock(ms);
      return { date: wall.date, time: wall.time, dateOnly: false, sortKey: ms };
    }
  }

  // Zonder Z en zonder vreemde zone: wandkloktijd, Nederlandse tijd dus. Die
  // nemen we over zoals ze zijn; dat is precies wat je in de app wilt zien.
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}`, dateOnly: false, sortKey: wallMs };
}

function shiftMoment(m: Moment, days: number): Moment {
  const [y, mo, d] = m.date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const date = dt.toISOString().slice(0, 10);
  return { ...m, date, sortKey: m.sortKey + days * 86400000 };
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_MS = 86400000;

const dayNumber = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};
const fromDayNumber = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);
const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();
const ymd = (y: number, m: number, d: number): string =>
  `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Hetzelfde tijdstip op een andere dag. */
function onDay(m: Moment, date: string): Moment {
  return { ...m, date, sortKey: m.sortKey + (dayNumber(date) - dayNumber(m.date)) * DAY_MS };
}

/**
 * Herhalingen uitrollen binnen een venster. Telt vanaf het begin van de reeks,
 * zodat COUNT ook klopt als de reeks al lang loopt. Niet ondersteund: BYSETPOS,
 * BYWEEKNO, BYYEARDAY en herhaling per uur of kleiner; die geven alleen het
 * eerste item.
 */
function expandRecurrence(start: Moment, rrule: string, from: string, until: string): Moment[] {
  const parts: Record<string, string> = {};
  for (const chunk of rrule.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq > 0) parts[chunk.slice(0, eq).toUpperCase()] = chunk.slice(eq + 1);
  }
  const freq = (parts.FREQ ?? '').toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return [start];

  const interval = Math.max(1, Number(parts.INTERVAL ?? 1) || 1);
  const count = parts.COUNT ? Number(parts.COUNT) : Infinity;
  const untilProp = parts.UNTIL ? parseMoment({ name: 'UNTIL', params: {}, value: parts.UNTIL }) : null;
  const hardStop = untilProp && untilProp.date < until ? untilProp.date : until;

  const rules = (parts.BYDAY ?? '')
    .split(',')
    .map((x) => /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x.trim().toUpperCase()))
    .filter((x): x is RegExpExecArray => x !== null)
    .map((x) => ({ nth: x[1] ? Number(x[1]) : 0, day: DAY_CODES.indexOf(x[2]) }));
  const monthDays = (parts.BYMONTHDAY ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n !== 0 && Math.abs(n) <= 31);
  const months = (parts.BYMONTH ?? '')
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= 12);

  const [sy, sm, sd] = start.date.split('-').map(Number);
  const startWeekday = weekdayOf(start.date);
  const startDay = dayNumber(start.date);

  /** De dagen van één maand die meedoen: BYMONTHDAY, BYDAY ("eerste maandag") of de startdag. */
  const daysOfMonth = (y: number, m: number): string[] => {
    const last = daysInMonth(y, m);
    let days: number[] = [];
    if (monthDays.length > 0) {
      days = monthDays.map((n) => (n > 0 ? n : last + 1 + n));
    } else if (rules.length > 0) {
      for (const r of rules) {
        const same: number[] = [];
        for (let d = 1; d <= last; d++) if (weekdayOf(ymd(y, m, d)) === r.day) same.push(d);
        if (r.nth === 0) days.push(...same);
        else {
          const hit = same[r.nth > 0 ? r.nth - 1 : same.length + r.nth];
          if (hit) days.push(hit);
        }
      }
    } else {
      days = [sd]; // een 31e die er niet is, slaan we over
    }
    return [...new Set(days)]
      .filter((d) => d >= 1 && d <= last)
      .sort((a, b) => a - b)
      .map((d) => ymd(y, m, d));
  };

  const out: Moment[] = [];
  let seen = 0;

  /** Geeft false zodra we klaar zijn. */
  const take = (date: string): boolean => {
    if (date < start.date) return true;
    if (date > hardStop) return false;
    seen++;
    if (seen > count) return false;
    if (date >= from) out.push(onDay(start, date));
    return true;
  };

  const MAX_PERIODS = 20000; // vangnet tegen eindeloze regels
  for (let i = 0; i < MAX_PERIODS; i++) {
    let dates: string[];
    if (freq === 'DAILY') {
      const date = fromDayNumber(startDay + i * interval);
      dates = rules.length > 0 && !rules.some((r) => r.day === weekdayOf(date)) ? [] : [date];
      if (date > hardStop) return out;
    } else if (freq === 'WEEKLY') {
      const monday = startDay - ((startWeekday + 6) % 7) + 7 * i * interval;
      const weekdays = rules.length > 0 ? rules.map((r) => r.day) : [startWeekday];
      dates = [...new Set(weekdays)]
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
        .map((wd) => fromDayNumber(monday + ((wd + 6) % 7)));
      if (fromDayNumber(monday) > hardStop) return out;
    } else if (freq === 'MONTHLY') {
      const total = sy * 12 + (sm - 1) + i * interval;
      const y = Math.floor(total / 12);
      const m = (total % 12) + 1;
      dates = daysOfMonth(y, m);
      if (ymd(y, m, 1) > hardStop) return out;
    } else {
      const y = sy + i * interval;
      dates = (months.length > 0 ? months : [sm]).flatMap((m) => daysOfMonth(y, m)).sort();
      if (ymd(y, 1, 1) > hardStop) return out;
    }
    for (const date of dates) if (!take(date)) return out;
  }
  return out;
}

export interface ParseOptions {
  /** Vanaf welke datum we items overnemen. */
  from: string;
  /** Tot welke datum. */
  until: string;
  /** Geef elke herhaling een vaste uid ('uid::datum'), ook als er nu maar één in het venster valt. */
  stableRecurringUids?: boolean;
  /** Titel voor afspraken zonder titel. Zonder dit slaan we ze over. */
  untitled?: string;
}

export function parseIcs(text: string, opts: ParseOptions): IcsEvent[] {
  const lines = unfold(text);
  const all: Prop[][] = [];

  let inEvent = false;
  let props: Prop[] = [];

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      props = [];
      continue;
    }
    if (upper.startsWith('END:VEVENT')) {
      inEvent = false;
      all.push(props);
      continue;
    }
    if (!inEvent) continue;
    const p = parseLine(line);
    if (p) props.push(p);
  }

  // Een afspraak uit een reeks die is verplaatst, aangepast of geannuleerd staat
  // los in de feed (RECURRENCE-ID). De gewone herhaling slaat die dag dan over.
  const replaced = new Map<string, Set<string>>();
  for (const p of all) {
    const rid = p.find((x) => x.name === 'RECURRENCE-ID');
    const uid = p.find((x) => x.name === 'UID')?.value?.trim();
    const moment = rid && parseMoment(rid);
    if (!uid || !moment) continue;
    if (!replaced.has(uid)) replaced.set(uid, new Set());
    replaced.get(uid)!.add(moment.date);
  }

  return all.flatMap((p) => buildEvents(p, opts, replaced));
}

function buildEvents(props: Prop[], opts: ParseOptions, replaced: Map<string, Set<string>>): IcsEvent[] {
  const find = (name: string) => props.find((p) => p.name === name);
  if (find('STATUS')?.value.trim().toUpperCase() === 'CANCELLED') return [];

  const dtstartProp = find('DTSTART');
  if (!dtstartProp) return [];
  const start = parseMoment(dtstartProp);
  if (!start) return [];

  const summary = unescapeText(find('SUMMARY')?.value ?? '') || opts.untitled || '';
  if (!summary) return [];

  const baseUid = find('UID')?.value?.trim() || `${summary}-${start.date}`;
  const recurrenceId = find('RECURRENCE-ID');
  const originalDate = recurrenceId ? parseMoment(recurrenceId)?.date : undefined;
  const description = unescapeText(find('DESCRIPTION')?.value ?? '') || undefined;
  const location = unescapeText(find('LOCATION')?.value ?? '') || undefined;

  const dtendProp = find('DTEND');
  const end = dtendProp ? parseMoment(dtendProp) : null;

  // Hoeveel dagen loopt het door? Bij hele dagen is DTEND exclusief: 3 t/m 5
  // september staat er als 3 → 6. Eindigt een afspraak precies om middernacht,
  // dan hoort die nog bij de dag ervoor.
  let spanDays = 0;
  if (end) {
    const diff = dayNumber(end.date) - dayNumber(start.date);
    if (start.dateOnly) spanDays = Math.max(0, diff - 1);
    else spanDays = Math.max(0, end.time === '00:00' && diff > 0 ? diff - 1 : diff);
  }

  const skip = new Set<string>(originalDate ? [] : replaced.get(baseUid) ?? []);
  for (const p of props.filter((x) => x.name === 'EXDATE')) {
    for (const v of p.value.split(',')) {
      const m = parseMoment({ ...p, value: v });
      if (m) skip.add(m.date);
    }
  }

  const rrule = originalDate ? undefined : find('RRULE')?.value;
  // Een reeks die begon vóór het venster, maar in het venster doorloopt, telt mee.
  const from = fromDayNumber(dayNumber(opts.from) - spanDays);
  const occurrences = rrule ? expandRecurrence(start, rrule, from, opts.until) : [start];

  const out: IcsEvent[] = [];
  for (const occ of occurrences) {
    if (skip.has(occ.date)) continue;
    const last = shiftMoment(occ, spanDays).date;
    if (last < opts.from || occ.date > opts.until) continue;

    let uid = baseUid;
    if (originalDate) uid = `${baseUid}::${originalDate}`;
    else if (rrule && (opts.stableRecurringUids || occurrences.length > 1)) uid = `${baseUid}::${occ.date}`;

    out.push({
      uid,
      summary,
      description,
      location,
      date: occ.date,
      endDate: spanDays > 0 ? last : undefined,
      allDay: start.dateOnly,
      time: start.dateOnly ? undefined : occ.time,
      endTime: start.dateOnly || !end || (spanDays === 0 && end.time === '00:00' && end.date !== start.date) ? undefined : end.time,
    });
  }
  return out;
}
