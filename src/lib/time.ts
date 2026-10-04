/**
 * Tijden kiezen per 5 minuten. Het native tijdveld van de iPhone toont elke minuut
 * en negeert de stapgrootte, dus de app heeft een eigen keuze met een uur en een
 * minuut, waarvan de minuten in stappen van vijf lopen. Dit zijn de gewone functies
 * erachter, zonder scherm, zodat ze getest kunnen worden.
 */

export const MINUTE_STEP = 5;

const pad = (n: number) => String(n).padStart(2, '0');

export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, h) => pad(h));

/** 'HH:MM' uit elkaar. Leeg of ongeldig geeft twee lege teksten. */
export function timeParts(value: string | undefined): { hour: string; minute: string } {
  const m = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { hour: '', minute: '' };
  return { hour: pad(Number(m[1])), minute: m[2] };
}

/**
 * De minuten om uit te kiezen: 00, 05, ... 55. Staat er al een minuut in die daar niet
 * bij hoort (een afspraak uit Google om 08:32), dan staat die er ook bij, zodat het veld
 * toont wat er werkelijk staat en niets stilletjes verspringt.
 */
export function minuteOptions(current: string): string[] {
  const options = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => pad(i * MINUTE_STEP));
  if (current && !options.includes(current)) options.push(current);
  return options.sort();
}

/** Een ander uur kiezen. Zonder minuut ervoor wordt het een hele minuut: 00. */
export function withHour(value: string | undefined, hour: string): string {
  if (!hour) return '';
  return `${hour}:${timeParts(value).minute || '00'}`;
}

/** Een andere minuut kiezen. Zonder uur ervoor begint het bij `fallbackHour`. */
export function withMinute(value: string | undefined, minute: string, fallbackHour = '08'): string {
  return `${timeParts(value).hour || fallbackHour}:${minute}`;
}
