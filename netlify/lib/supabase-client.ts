/**
 * De verbinding met Supabase, voor de gegevens (store.ts) en de bonnetjes (files.ts).
 * Met de geheime sleutel, dus alleen op de server. Pas bij het eerste gebruik gemaakt, zodat een
 * ontbrekende variabele een duidelijke melding geeft in plaats van de hele functie te laten crashen.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sleutel) {
    throw new Error(
      'SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY ontbreken in de omgevingsvariabelen van Netlify. Zie de README, stap "Opslag in Supabase".',
    );
  }

  // Server-side: geen sessies of tokens bewaren, elke aanroep staat op zichzelf.
  client = createClient(url, sleutel, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
