/**
 * Bestanden bij bonnetjes: welke namen mogen, wat er werkelijk in zit, en wat er na een tijd
 * opgeruimd kan worden. Gewone functies zonder opslag, zodat ze te testen zijn.
 *
 * In de opslag heet een bestand `<bonnetje-id>/<bestand-id>.jpg` (de foto), `….t.jpg` (de
 * miniatuur) of `….pdf`. De app uploadt eerst de bestanden en bewaart daarna pas het bonnetje.
 */

import type { Receipt } from '../../shared/types';

/** Een foto of pdf mag hoogstens zo groot zijn. De app verkleint foto's ruim daaronder. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Hoe lang een bestand zonder bonnetje blijft staan voordat het wordt gewist. */
export const GRACE_DAYS = 30;

const ID = /^[A-Za-z0-9-]{8,64}$/;
const NAME = /^([A-Za-z0-9-]{8,64})(\.t)?\.(jpg|pdf)$/;

/** Het pad in de opslag, of null als id of naam niet deugen. Dat houdt een vreemd pad buiten de deur. */
export function receiptFilePath(receiptId: string, name: string): string | null {
  const m = NAME.exec(name);
  if (!ID.test(receiptId) || !m) return null;
  // Een miniatuur is altijd een foto.
  if (m[2] && m[3] !== 'jpg') return null;
  return `${receiptId}/${name}`;
}

export function contentTypeFor(name: string): string {
  return name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
}

/** Zit er in de bytes wat de naam belooft? Een jpg begint met FF D8 FF, een pdf met %PDF. */
export function looksLikeFile(bytes: Uint8Array, name: string): boolean {
  if (name.endsWith('.pdf')) {
    return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export interface StoredFile {
  path: string;
  /** ISO. */
  createdAt: string;
}

/**
 * Welke bestanden horen bij niets meer? Wat bij een bestaand bonnetje hoort (ook de miniatuur) blijft.
 * Een bestand zonder bonnetje, bijvoorbeeld na verwijderen of een afgebroken upload, gaat pas weg
 * na `graceDays`, zodat "Ongedaan maken" en een upload die nog loopt nooit iets kwijtraken.
 */
export function orphanPaths(files: StoredFile[], receipts: Receipt[], now: string, graceDays = GRACE_DAYS): string[] {
  const gebruikt = new Set<string>();
  for (const r of receipts) {
    for (const f of r.files) {
      const ext = f.kind === 'pdf' ? 'pdf' : 'jpg';
      gebruikt.add(`${r.id}/${f.id}.${ext}`);
      if (f.thumb) gebruikt.add(`${r.id}/${f.id}.t.jpg`);
    }
  }
  const grens = Date.parse(now) - graceDays * 86400000;
  return files.filter((f) => !gebruikt.has(f.path) && Date.parse(f.createdAt) < grens).map((f) => f.path);
}
