import type { ChildId, CalendarEvent, Contact, PickupOverride, PickupRule } from '../../shared/types';
import { CHILDREN } from '../../shared/types';
import { isoWeekday } from '../../shared/dates';

export function coversDate(e: CalendarEvent, date: string): boolean {
  if (!e.endDate) return e.date === date;
  return e.date <= date && date <= e.endDate;
}

export function eventsOnDate(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((e) => coversDate(e, date)).sort(byTime);
}

export function byTime(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  const t = (a.time ?? '').localeCompare(b.time ?? '');
  return t !== 0 ? t : a.title.localeCompare(b.title);
}

export function byDate(a: CalendarEvent, b: CalendarEvent): number {
  const d = a.date.localeCompare(b.date);
  return d !== 0 ? d : byTime(a, b);
}

/** Duur van een oppasmoment in uren, ook over middernacht heen. */
export function sitterHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

export function sitterCost(event: CalendarEvent): number {
  if (!event.sitter) return 0;
  return sitterHours(event.sitter.start, event.sitter.end) * event.sitter.rate;
}

export function euro(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export interface PickupForDay {
  child: ChildId;
  dropoff?: string;
  pickup?: string;
  note?: string;
  isOverride: boolean;
}

/** Wat geldt er vandaag: het vaste weekschema, of een afwijking voor deze dag. */
export function pickupForDate(
  date: string,
  rules: PickupRule[],
  overrides: PickupOverride[],
): PickupForDay[] {
  const weekday = isoWeekday(date);
  if (weekday > 5) return [];

  const out: PickupForDay[] = [];

  for (const child of CHILDREN) {
    const override = overrides.find((o) => o.date === date && o.child === child);
    const rule = rules.find((r) => r.weekday === weekday && r.child === child);
    if (!override && !rule) continue;
    out.push({
      child,
      dropoff: override?.dropoff ?? rule?.dropoff,
      pickup: override?.pickup ?? rule?.pickup,
      note: override?.note ?? rule?.note,
      isOverride: Boolean(override),
    });
  }
  return out;
}

/** Verjaardagen uit het contactenboek als agenda-items voor een datum. */
export function birthdaysOnDate(contacts: Contact[], date: string): Contact[] {
  const mmdd = date.slice(5);
  return contacts.filter((c) => c.birthday && c.birthday.slice(-5) === mmdd);
}

export function ageOn(birthday: string, date: string): number | null {
  if (birthday.length < 10) return null;
  const birthYear = Number(birthday.slice(0, 4));
  if (!birthYear) return null;
  const year = Number(date.slice(0, 4));
  return year - birthYear;
}
