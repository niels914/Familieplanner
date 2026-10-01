/** Controleert de koppeling met Supabase, met een nagebootste client. */
import { leesbareFout, supabaseBackend, type SupabaseFout, type SupabaseLike } from '../netlify/lib/supabase-backend';
import { check, report } from './helpers';

/** Een nep-client die onthoudt wat er is aangeroepen. */
function nepClient(antwoord: {
  rij?: unknown;
  selectFout?: SupabaseFout;
  rpcData?: unknown;
  rpcFout?: SupabaseFout;
}) {
  const aangeroepen: { tabel?: string; kolommen?: string; filter?: [string, string]; rpc?: [string, unknown] } = {};
  const client: SupabaseLike = {
    from: (tabel) => ({
      select: (kolommen) => ({
        eq: (kolom, waarde) => ({
          maybeSingle: async () => {
            Object.assign(aangeroepen, { tabel, kolommen, filter: [kolom, waarde] });
            return { data: antwoord.rij ?? null, error: antwoord.selectFout ?? null };
          },
        }),
      }),
    }),
    rpc: async (fn, args) => {
      aangeroepen.rpc = [fn, args];
      return { data: antwoord.rpcData ?? null, error: antwoord.rpcFout ?? null };
    },
  };
  return { client, aangeroepen };
}

const probeer = async (f: () => Promise<unknown>): Promise<string> => {
  try {
    await f();
    return '(geen fout)';
  } catch (e) {
    return (e as Error).message;
  }
};

// --- lezen ----------------------------------------------------------------
{
  const { client, aangeroepen } = nepClient({ rij: { data: [1, 2], version: 4 } });
  const rij = await supabaseBackend(client).get('events');
  check('lezen geeft data en versie terug', rij, { data: [1, 2], version: 4 });
  check('vraagt de goede tabel en rij op', [aangeroepen.tabel, aangeroepen.filter], ['kv', ['collection', 'events']]);

  check('versie als tekst wordt een getal', (await supabaseBackend(nepClient({ rij: { data: {}, version: '7' } }).client).get('x'))?.version, 7);
  check('geen rij geeft null', await supabaseBackend(nepClient({}).client).get('events'), null);
}

// --- schrijven ----------------------------------------------------------------
{
  const { client, aangeroepen } = nepClient({ rpcData: 5 });
  const versie = await supabaseBackend(client).write('events', [1], 4);
  check('schrijven geeft de nieuwe versie', versie, 5);
  check('roept kv_write aan met de verwachte versie', aangeroepen.rpc, [
    'kv_write',
    { p_collection: 'events', p_data: [1], p_expected: 4 },
  ]);

  const eerste = nepClient({ rpcData: 1 });
  await supabaseBackend(eerste.client).write('events', [], null);
  check('eerste keer: p_expected is null', (eerste.aangeroepen.rpc?.[1] as { p_expected: unknown }).p_expected, null);

  check('conflict (null terug) blijft null', await supabaseBackend(nepClient({ rpcData: null }).client).write('x', 1, 3), null);
}

// --- begrijpelijke foutmeldingen ----------------------------------------------
{
  const nietIngericht = await probeer(() =>
    supabaseBackend(nepClient({ selectFout: { message: "Could not find the table 'public.kv' in the schema cache", code: 'PGRST205' } }).client).get('x'),
  );
  check('tabel ontbreekt: wijst naar schema.sql', nietIngericht.includes('supabase/schema.sql'), true);

  const functieWeg = await probeer(() =>
    supabaseBackend(nepClient({ rpcFout: { message: 'Could not find the function public.kv_write', code: 'PGRST202' } }).client).write('x', 1, null),
  );
  check('functie ontbreekt: wijst ook naar schema.sql', functieWeg.includes('supabase/schema.sql'), true);

  check('verkeerde sleutel: noemt de variabele', leesbareFout({ message: 'Invalid API key', status: 401 }).message.includes('SUPABASE_SERVICE_ROLE_KEY'), true);
  check('publieke sleutel (geen rechten): ook de sleutelmelding', leesbareFout({ message: 'permission denied for table kv', code: '42501' }).message.includes('SUPABASE_SERVICE_ROLE_KEY'), true);
  check('netwerkfout: noemt URL en pauzeren', leesbareFout({ message: 'TypeError: fetch failed' }).message.includes('gepauzeerd'), true);
  check('onbekende fout: toont de oorspronkelijke tekst', leesbareFout({ message: 'iets geks' }).message, 'Supabase: iets geks');
}

report('supabase-koppeling');
