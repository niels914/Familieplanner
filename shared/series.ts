/**
 * Rekent de data van een reeks uit. Gedeeld door server (die de items
 * aanmaakt) en app (die vooraf laat zien hoe vaak het wordt).
 */

import { addDays, diffDays } from './dates';

/** Vangnet: drie jaar wekelijks is ruim genoeg voor een zwemseizoen. */
export const MAX_KEREN = 156;

export function seriesDates(start: string, interval: 1 | 2, until: string): string[] {
  if (!start || !until || until < start) return [start].filter(Boolean);
  const stap = 7 * interval;
  const uit: string[] = [];
  for (let d = start; d <= until && uit.length < MAX_KEREN; d = addDays(d, stap)) {
    uit.push(d);
  }
  return uit;
}

/** "13 keer, t/m dinsdag 22 december" — de uitleg onder het formulier. */
export function seriesCount(start: string, interval: 1 | 2, until: string): number {
  if (!start || !until || until < start) return 1;
  return Math.min(MAX_KEREN, Math.floor(diffDays(start, until) / (7 * interval)) + 1);
}
