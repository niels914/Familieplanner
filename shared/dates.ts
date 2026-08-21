/** Datumhulp. Alles draait om 'YYYY-MM-DD' strings in lokale (Nederlandse) tijd,
 *  zodat een schooldag nooit door een tijdzone een dag opschuift. */

export const TZ = 'Europe/Amsterdam';

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' naar een Date op middernacht lokale tijd. */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export function diffDays(a: string, b: string): number {
  const ms = parseYmd(b).getTime() - parseYmd(a).getTime();
  return Math.round(ms / 86400000);
}

/** Maandag = 1 ... zondag = 7 */
export function isoWeekday(s: string): number {
  const wd = parseYmd(s).getDay();
  return wd === 0 ? 7 : wd;
}

export function startOfWeek(s: string): string {
  return addDays(s, -(isoWeekday(s) - 1));
}

/** Vandaag in Europe/Amsterdam, ongeacht de tijdzone van de server. */
export function todayInNl(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA levert al YYYY-MM-DD
}

export function hourInNl(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    hour12: false,
  }).format(now);
  return Number(h);
}

const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export function formatLong(s: string): string {
  const d = parseYmd(s);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatShort(s: string): string {
  const d = parseYmd(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function monthName(month: number): string {
  return MONTHS[month];
}

export function weekdayShort(index: number): string {
  return ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'][index];
}

/** 'Morgen', 'Over 3 dagen', 'Vandaag', ... */
export function relativeLabel(date: string, today: string): string {
  const d = diffDays(today, date);
  if (d === 0) return 'Vandaag';
  if (d === 1) return 'Morgen';
  if (d === -1) return 'Gisteren';
  if (d > 1 && d < 7) return `Over ${d} dagen`;
  if (d < -1 && d > -7) return `${Math.abs(d)} dagen geleden`;
  return formatLong(date);
}
