/**
 * De laatste stand van de gegevens, bewaard op dit toestel. Daardoor staat de
 * app er meteen als je hem opent, in plaats van eerst een leeg scherm te tonen
 * terwijl de telefoon op het netwerk wacht. Zonder verbinding kun je zo ook
 * lezen wat er laatst bekend was.
 *
 * Het gaat om de gegevens van het gezin, op de telefoon van het gezin. Bij
 * uitloggen en bij een verlopen sessie wordt dit leeggemaakt.
 */

const KEY = 'familieplanner:stand:v1';

export interface Cached<T> {
  data: T;
  /** Wanneer deze stand voor het laatst van de server kwam (ms). */
  at: number;
}

export function readCache<T>(): Cached<T> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T & { events?: unknown }>;
    // Alleen iets herkenbaars gebruiken; een kapotte of oude vorm negeren we.
    if (!parsed || typeof parsed.at !== 'number' || !Array.isArray(parsed.data?.events)) return null;
    return parsed as Cached<T>;
  } catch {
    return null;
  }
}

export function writeCache<T>(data: T, at: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, at }));
  } catch {
    // Vol of geblokkeerd (privévenster): dan werkt de app gewoon zonder.
  }
}

export function clearCache(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // niets aan te doen
  }
}
