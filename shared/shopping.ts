/**
 * Vaak gekochte dingen. De app onthoudt wat er op de boodschappenlijst wordt gezet
 * en biedt de favorieten aan als snelkeuze, zodat je niet elke keer "melk" hoeft te
 * typen. Er is geen vaste lijst om bij te houden; die leert zichzelf.
 */

export interface OftenEntry {
  /** Zoals het laatst is getypt, met hoofdletters. */
  text: string;
  /** Hoe vaak het op de lijst is gezet. */
  n: number;
  /** Laatste keer, ISO. */
  last: string;
}

/** Op kleine letters, zodat "Melk" en "melk" hetzelfde ding zijn. */
export type Often = Record<string, OftenEntry>;

const MAX_ENTRIES = 80;

const sleutel = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

/** Telt de nieuw toegevoegde dingen erbij. Geeft een nieuw object terug. */
export function bumpOften(often: Often | undefined, texts: string[], now: string): Often {
  const next: Often = { ...(often ?? {}) };
  for (const raw of texts) {
    const text = raw.trim().replace(/\s+/g, ' ');
    if (!text) continue;
    const key = sleutel(text);
    const current = next[key];
    next[key] = { text, n: (current?.n ?? 0) + 1, last: now };
  }

  const keys = Object.keys(next);
  if (keys.length <= MAX_ENTRIES) return next;
  // Te veel onthouden: de zeldzaamste en oudste gaan eruit.
  const sorted = keys.sort((a, b) => next[b].n - next[a].n || next[b].last.localeCompare(next[a].last));
  return Object.fromEntries(sorted.slice(0, MAX_ENTRIES).map((k) => [k, next[k]]));
}

/**
 * De snelkeuze: wat minstens `min` keer is toegevoegd, het vaakst eerst, zonder wat al op
 * de lijst staat. Bij gelijke stand gaat de laatst gebruikte voor.
 */
export function quickPicks(often: Often | undefined, onList: string[], limit = 8, min = 2): string[] {
  const staat = new Set(onList.map(sleutel));
  return Object.entries(often ?? {})
    .filter(([key, e]) => e.n >= min && !staat.has(key))
    .sort(([, a], [, b]) => b.n - a.n || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(([, e]) => e.text);
}
