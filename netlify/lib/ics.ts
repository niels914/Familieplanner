/**
 * Minimale, tolerante iCalendar-parser voor de Parro-schoolagenda.
 *
 * Bewust geen externe library: de feed is klein en we willen precies weten wat
 * er gebeurt met hele dagen versus tijdstippen. De parser gaat om met
 * regelvouwing, VALUE=DATE, TZID, UTC-tijden, eenvoudige RRULE-herhalingen en
 * EXDATE.
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

  // Zonder Z: wandkloktijd. Parro levert Nederlandse tijden, dus we nemen die
  // over zoals ze zijn. Dat is precies wat je in de app wilt zien.
  return {
    date: `${y}-${mo}-${d}`,
    time: `${h}:${mi}`,
    dateOnly: false,
    sortKey: Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0),
  };
}

function shiftMoment(m: Moment, days: number): Moment {
  const [y, mo, d] = m.date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const date = dt.toISOString().slice(0, 10);
  return { ...m, date, sortKey: m.sortKey + days * 86400000 };
}

function addMonths(m: Moment, months: number): Moment {
  const [y, mo, d] = m.date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1 + months, d));
  return { ...m, date: dt.toISOString().slice(0, 10), sortKey: dt.getTime() };
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Herhalingen uitrollen binnen een venster. Bewust beperkt: FREQ, INTERVAL,
 *  COUNT, UNTIL en BYDAY bij weekly. Genoeg voor een schoolagenda. */
function expandRecurrence(start: Moment, rrule: string, from: string, until: string): Moment[] {
  const parts: Record<string, string> = {};
  for (const chunk of rrule.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq > 0) parts[chunk.slice(0, eq).toUpperCase()] = chunk.slice(eq + 1);
  }
  const freq = (parts.FREQ ?? '').toUpperCase();
  if (!freq) return [start];

  const interval = Math.max(1, Number(parts.INTERVAL ?? 1));
  const count = parts.COUNT ? Number(parts.COUNT) : Infinity;
  const untilProp = parts.UNTIL ? parseMoment({ name: 'UNTIL', params: {}, value: parts.UNTIL }) : null;
  const hardStop = untilProp && untilProp.date < until ? untilProp.date : until;
  const byDay = (parts.BYDAY ?? '')
    .split(',')
    .map((d) => d.trim().slice(-2).toUpperCase())
    .filter((d) => DAY_CODES.includes(d))
    .map((d) => DAY_CODES.indexOf(d));

  const out: Moment[] = [];
  const push = (m: Moment) => {
    if (m.date >= from && m.date <= hardStop) out.push(m);
  };

  const MAX = 800; // vangnet tegen eindeloze regels
  let cursor = start;

  if (freq === 'WEEKLY' && byDay.length > 0) {
    // Begin bij de maandag van de startweek en loop per interval-week.
    let weekStart = shiftMoment(cursor, -((weekdayOf(cursor.date) + 6) % 7));
    for (let i = 0; i < MAX && out.length < count; i++) {
      for (const wd of byDay) {
        const offset = (wd + 6) % 7; // maandag = 0
        const day = shiftMoment(weekStart, offset);
        if (day.date >= start.date) push(day);
      }
      if (weekStart.date > hardStop) break;
      weekStart = shiftMoment(weekStart, 7 * interval);
    }
  } else {
    for (let i = 0; i < MAX && out.length < count; i++) {
      push(cursor);
      if (cursor.date > hardStop) break;
      if (freq === 'DAILY') cursor = shiftMoment(cursor, interval);
      else if (freq === 'WEEKLY') cursor = shiftMoment(cursor, 7 * interval);
      else if (freq === 'MONTHLY') cursor = addMonths(cursor, interval);
      else if (freq === 'YEARLY') cursor = addMonths(cursor, 12 * interval);
      else break;
    }
  }

  out.sort((a, b) => a.date.localeCompare(b.date));
  return out.slice(0, Number.isFinite(count) ? count : out.length);
}

export interface ParseOptions {
  /** Vanaf welke datum we items overnemen. */
  from: string;
  /** Tot welke datum. */
  until: string;
}

export function parseIcs(text: string, opts: ParseOptions): IcsEvent[] {
  const lines = unfold(text);
  const events: IcsEvent[] = [];

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
      const parsed = buildEvents(props, opts);
      events.push(...parsed);
      continue;
    }
    if (!inEvent) continue;
    const p = parseLine(line);
    if (p) props.push(p);
  }

  return events;
}

function buildEvents(props: Prop[], opts: ParseOptions): IcsEvent[] {
  const find = (name: string) => props.find((p) => p.name === name);
  const dtstartProp = find('DTSTART');
  if (!dtstartProp) return [];
  const start = parseMoment(dtstartProp);
  if (!start) return [];

  const summary = unescapeText(find('SUMMARY')?.value ?? '');
  if (!summary) return [];

  const uid = find('UID')?.value?.trim() || `${summary}-${start.date}`;
  const description = unescapeText(find('DESCRIPTION')?.value ?? '') || undefined;
  const location = unescapeText(find('LOCATION')?.value ?? '') || undefined;

  const dtendProp = find('DTEND');
  const end = dtendProp ? parseMoment(dtendProp) : null;

  // Bij hele dagen is DTEND exclusief: 3 t/m 5 september staat er als 3 → 6.
  let spanDays = 0;
  if (end && start.dateOnly) {
    spanDays = Math.max(0, Math.round((end.sortKey - start.sortKey) / 86400000) - 1);
  } else if (end && !start.dateOnly && end.date !== start.date) {
    spanDays = Math.max(0, Math.round((end.sortKey - start.sortKey) / 86400000));
  }

  const exdates = new Set<string>();
  for (const p of props.filter((x) => x.name === 'EXDATE')) {
    for (const v of p.value.split(',')) {
      const m = parseMoment({ ...p, value: v });
      if (m) exdates.add(m.date);
    }
  }

  const rrule = find('RRULE')?.value;
  const occurrences = rrule
    ? expandRecurrence(start, rrule, opts.from, opts.until)
    : [start];

  const out: IcsEvent[] = [];
  for (const occ of occurrences) {
    if (exdates.has(occ.date)) continue;
    if (occ.date < opts.from || occ.date > opts.until) continue;
    out.push({
      uid: occurrences.length > 1 ? `${uid}::${occ.date}` : uid,
      summary,
      description,
      location,
      date: occ.date,
      endDate: spanDays > 0 ? shiftMoment(occ, spanDays).date : undefined,
      allDay: start.dateOnly,
      time: start.dateOnly ? undefined : occ.time,
      endTime: start.dateOnly || !end ? undefined : end.time,
    });
  }
  return out;
}
