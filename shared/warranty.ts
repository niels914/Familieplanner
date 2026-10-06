/**
 * Garantie en retourtermijn: de rekenregels. Gewone functies zonder scherm, voor de
 * server (herinneringen) en de app (lijst, kleuren, Regelen) tegelijk.
 *
 * Er zijn twee klokken. De fabrieks- of winkelgarantie heeft een einddatum en rekenen we
 * hier uit. De wettelijke garantie heeft geen vaste termijn en komt hier dus niet in voor;
 * de app zegt daarover alleen een korte, juiste regel.
 */

import type { Receipt, ReceiptAlert } from './types';
import { diffDays, formatLong, formatShort } from './dates';

/** Vanaf dit bedrag herinneren we vanzelf; daaronder alleen als je dat zelf aanzet. */
export const REMIND_MIN_CENTS = 5000;
/** Zoveel dagen vóór het einde van de garantie komt de herinnering. */
export const WARRANTY_REMIND_DAYS = 30;
/** Zoveel dagen vóór het einde van de retourtermijn. */
export const RETURN_REMIND_DAYS = 3;
/** Binnen zoveel dagen vóór het einde heet een garantie "bijna afgelopen". */
export const SOON_DAYS = 60;

const pad = (n: number) => String(n).padStart(2, '0');

/** Een datum plus een aantal maanden. Het einde van de maand blijft kloppen: 31 januari + 1 maand = 28 februari. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(Math.min(d, last))}`;
}

/** Hoe heet het bonnetje in een lijst: de titel, of een nette naam met de datum. */
export function displayTitle(r: Pick<Receipt, 'title' | 'purchaseDate'>): string {
  return r.title.trim() || `Bonnetje ${formatShort(r.purchaseDate)}`;
}

/** Laatste dag van de fabrieks- of winkelgarantie, als die bekend is. */
export function warrantyEnd(r: Pick<Receipt, 'purchaseDate' | 'warrantyMonths' | 'warrantyUntil'>): string | undefined {
  if (r.warrantyUntil) return r.warrantyUntil;
  if (r.warrantyMonths && r.warrantyMonths > 0) return addMonths(r.purchaseDate, r.warrantyMonths);
  return undefined;
}

export type WarrantyKind = 'geen' | 'loopt' | 'bijna' | 'verlopen';

export interface WarrantyStatus {
  kind: WarrantyKind;
  end?: string;
  /** Dagen tot en met de laatste dag; 0 is vandaag, negatief is verlopen. */
  daysLeft?: number;
}

export function warrantyStatus(r: Parameters<typeof warrantyEnd>[0], today: string): WarrantyStatus {
  const end = warrantyEnd(r);
  if (!end) return { kind: 'geen' };
  const daysLeft = diffDays(today, end);
  if (daysLeft < 0) return { kind: 'verlopen', end, daysLeft };
  return { kind: daysLeft <= SOON_DAYS ? 'bijna' : 'loopt', end, daysLeft };
}

/** Hele maanden van vandaag tot de einddatum. */
function wholeMonths(today: string, end: string): number {
  let months = 0;
  while (addMonths(today, months + 1) <= end) months++;
  return months;
}

/** "nog 1 jaar en 5 maanden", "nog 3 weken", "nog 4 dagen", "loopt vandaag af", "verlopen". */
export function timeLeftLabel(today: string, end: string): string {
  const days = diffDays(today, end);
  if (days < 0) return 'verlopen';
  if (days === 0) return 'loopt vandaag af';
  if (days === 1) return 'nog 1 dag';
  if (days < 14) return `nog ${days} dagen`;
  if (days < 60) return `nog ${Math.round(days / 7)} weken`;

  const months = wholeMonths(today, end);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const jaar = years === 1 ? '1 jaar' : `${years} jaar`;
  const maanden = rest === 1 ? '1 maand' : `${rest} maanden`;
  if (years === 0) return `nog ${maanden}`;
  return rest === 0 ? `nog ${jaar}` : `nog ${jaar} en ${maanden}`;
}

/** Herinneren we hieraan? Een eigen keuze gaat voor; anders vanaf 50 euro. */
export function wantsReminder(r: Pick<Receipt, 'remind' | 'amountCents'>): boolean {
  return r.remind ?? (r.amountCents ?? 0) >= REMIND_MIN_CENTS;
}

/**
 * Wat er nu aandacht vraagt: een garantie die binnen 30 dagen afloopt, en een retourtermijn die
 * binnen 3 dagen afloopt. Wat al is afgehandeld en wat is verlopen valt weg. Eerst wat het
 * eerst afloopt.
 */
export function alertsFor(receipts: Receipt[], today: string): ReceiptAlert[] {
  const out: ReceiptAlert[] = [];
  for (const r of receipts) {
    const end = warrantyEnd(r);
    if (end && wantsReminder(r) && !r.handled?.warranty) {
      const daysLeft = diffDays(today, end);
      if (daysLeft >= 0 && daysLeft <= WARRANTY_REMIND_DAYS) {
        out.push({ id: r.id, title: displayTitle(r), kind: 'warranty', date: end, daysLeft });
      }
    }
    if (r.returnUntil && !r.handled?.return) {
      const daysLeft = diffDays(today, r.returnUntil);
      if (daysLeft >= 0 && daysLeft <= RETURN_REMIND_DAYS) {
        out.push({ id: r.id, title: displayTitle(r), kind: 'return', date: r.returnUntil, daysLeft });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'nl'));
}

/** Welke meldingen moeten nog verstuurd worden? Elke melding hoogstens één keer per bonnetje. */
export function dueReminders(receipts: Receipt[], today: string): ReceiptAlert[] {
  return alertsFor(receipts, today).filter((a) => {
    const r = receipts.find((x) => x.id === a.id);
    return !(a.kind === 'warranty' ? r?.reminded?.warranty : r?.reminded?.return);
  });
}

/** De regel in de avondmelding. */
export function alertLine(a: ReceiptAlert): string {
  if (a.kind === 'return') {
    return `Retourneren van ${a.title} kan nog tot ${formatLong(a.date)}.`;
  }
  const wanneer = a.daysLeft === 0 ? 'vandaag' : `op ${formatLong(a.date)}`;
  return `De garantie op ${a.title} loopt ${wanneer} af.`;
}
