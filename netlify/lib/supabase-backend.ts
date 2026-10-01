/**
 * De Supabase-kant van de opslag: twee kleine bewerkingen op de tabel `kv`
 * (zie supabase/schema.sql). Alle logica eromheen staat in kv.ts.
 */

import type { KvBackend, KvRow } from './kv';

/** Het stukje van de supabase-js-client dat we gebruiken. Zo kan een test een
 *  eenvoudige nabootsing meegeven zonder de hele bibliotheek. */
export interface SupabaseLike {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): PromiseLike<{ data: unknown; error: SupabaseFout | null }>;
      };
    };
  };
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: SupabaseFout | null }>;
}

export interface SupabaseFout {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

/** Zet technische fouten om in iets waar je mee verder kunt. */
export function leesbareFout(fout: SupabaseFout): Error {
  const tekst = `${fout.message ?? ''} ${fout.details ?? ''} ${fout.hint ?? ''}`.toLowerCase();

  // De tabel of de functie bestaat niet: het schema is nog niet uitgevoerd.
  if (
    fout.code === 'PGRST205' ||
    fout.code === 'PGRST202' ||
    fout.code === '42P01' ||
    fout.code === '42883' ||
    tekst.includes('schema cache')
  ) {
    return new Error(
      'De opslag in Supabase is nog niet ingericht. Voer supabase/schema.sql uit in de SQL Editor van je Supabase-project.',
    );
  }

  if (
    fout.status === 401 ||
    fout.status === 403 ||
    fout.code === 'PGRST301' ||
    tekst.includes('invalid api key') ||
    tekst.includes('jwt') ||
    tekst.includes('permission denied')
  ) {
    return new Error(
      'Supabase weigert de sleutel. Controleer SUPABASE_SERVICE_ROLE_KEY: dat moet de geheime sleutel (service_role of secret key) zijn, niet de publieke.',
    );
  }

  if (tekst.includes('fetch failed') || tekst.includes('enotfound') || tekst.includes('network')) {
    return new Error('Kan Supabase niet bereiken. Controleer SUPABASE_URL en of het project niet gepauzeerd is.');
  }

  return new Error(`Supabase: ${fout.message}`);
}

export function supabaseBackend(client: SupabaseLike): KvBackend {
  return {
    async get(collection: string): Promise<KvRow | null> {
      const { data, error } = await client
        .from('kv')
        .select('data, version')
        .eq('collection', collection)
        .maybeSingle();
      if (error) throw leesbareFout(error);
      if (!data) return null;
      const rij = data as { data: unknown; version: number | string };
      // bigint komt als getal terug; als tekst alleen bij extreem hoge waarden.
      return { data: rij.data, version: Number(rij.version) };
    },

    async write(collection, data, expected) {
      const { data: versie, error } = await client.rpc('kv_write', {
        p_collection: collection,
        p_data: data,
        p_expected: expected,
      });
      if (error) throw leesbareFout(error);
      return versie === null || versie === undefined ? null : Number(versie);
    },
  };
}
