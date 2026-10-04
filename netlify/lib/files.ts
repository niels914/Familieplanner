/**
 * Bestanden van bonnetjes (foto's en pdf's) in Supabase Storage, in dezelfde EU-regio als de rest.
 * Een privé-bucket: er zijn geen publieke links. Alles loopt via onze eigen server, achter de sessie.
 *
 * De bucket wordt bij het eerste gebruik zelf aangemaakt; er is geen stap in het dashboard nodig.
 */

import { MAX_FILE_BYTES, type StoredFile } from './receipt-files';
import { serviceClient } from './supabase-client';

const BUCKET = 'bonnetjes';

let bucketKlaar: Promise<void> | null = null;

function zorgVoorBucket(): Promise<void> {
  bucketKlaar ??= (async () => {
    const { error } = await serviceClient().storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_BYTES + 1024,
    });
    // "Bestaat al" is precies wat we willen; alleen een andere fout is een probleem.
    if (error && !/already exists|duplicate/i.test(error.message)) {
      bucketKlaar = null;
      throw new Error(`De opslag voor bonnetjes is niet beschikbaar: ${error.message}`);
    }
  })();
  return bucketKlaar;
}

export async function putFile(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  await zorgVoorBucket();
  const { error } = await serviceClient().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Opslaan van het bestand is mislukt: ${error.message}`);
}

export async function getFile(path: string): Promise<{ bytes: Uint8Array } | null> {
  await zorgVoorBucket();
  const { data, error } = await serviceClient().storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()) };
}

export async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await zorgVoorBucket();
  const { error } = await serviceClient().storage.from(BUCKET).remove(paths);
  if (error) throw new Error(`Wissen van bestanden is mislukt: ${error.message}`);
}

/** Alle bestanden met hun aanmaakmoment, voor het opruimen. Elk bonnetje is een eigen map. */
export async function listFiles(): Promise<StoredFile[]> {
  await zorgVoorBucket();
  const bucket = serviceClient().storage.from(BUCKET);
  const { data: mappen, error } = await bucket.list('', { limit: 1000 });
  if (error) throw new Error(`Bestanden ophalen is mislukt: ${error.message}`);

  const uit: StoredFile[] = [];
  for (const map of mappen ?? []) {
    const { data: bestanden } = await bucket.list(map.name, { limit: 100 });
    for (const f of bestanden ?? []) {
      if (f.id) uit.push({ path: `${map.name}/${f.name}`, createdAt: f.created_at ?? new Date(0).toISOString() });
    }
  }
  return uit;
}
