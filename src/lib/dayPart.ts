/**
 * Vandaag volgt de tijd: 's ochtends gaat het over wat vandaag mee moet, 's
 * middags over wat nog komt en wat morgen klaar moet, 's avonds over morgen.
 * De grenzen zijn een voorstel en staan hier op één plek.
 */

import { useEffect, useState } from 'react';
import { TZ, todayInNl } from '../../shared/dates';

export type DayPart = 'ochtend' | 'middag' | 'avond';

const MORNING_UNTIL_HOUR = 12;
const AFTERNOON_UNTIL_HOUR = 18;

export function dayPart(hour: number): DayPart {
  if (hour < MORNING_UNTIL_HOUR) return 'ochtend';
  if (hour < AFTERNOON_UNTIL_HOUR) return 'middag';
  return 'avond';
}

/** Een begroeting bij het moment van de dag. */
export const GREETING: Record<DayPart, string> = {
  ochtend: 'Goedemorgen',
  middag: 'Goedemiddag',
  avond: 'Goedenavond',
};

/** Datum en minuten sinds middernacht in Nederland, ongeacht waar de telefoon staat. */
export function nowInNl(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { date: todayInNl(now), minutes: hour * 60 + minute };
}

/** Het huidige moment, elke minuut bijgewerkt en opnieuw bij terugkomen in de app. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}
