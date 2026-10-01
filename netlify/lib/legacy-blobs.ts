/**
 * TIJDELIJK: leest de gegevens uit de vorige opslag, Netlify Blobs, zodat wat
 * al in de app staat niet verloren gaat bij de overstap naar Supabase.
 *
 * Wordt alleen aangeroepen voor een collectie die in Supabase nog niet
 * bestaat, en bewaart het resultaat daar meteen. Na één keer openen van de
 * app staat dus alles over. Daarna mag dit bestand weg, samen met de
 * verwijzing in store.ts en het pakket @netlify/blobs.
 *
 * Buiten Netlify (lokaal, in tests) is Blobs niet beschikbaar; dan geeft dit
 * gewoon niets terug.
 */

import { getStore } from '@netlify/blobs';

export async function leesUitBlobs(collection: string): Promise<unknown | null> {
  try {
    const store = getStore({ name: 'familieplanner', consistency: 'strong' });
    const waarde = await store.get(collection, { type: 'json' });
    return waarde ?? null;
  } catch {
    return null;
  }
}
