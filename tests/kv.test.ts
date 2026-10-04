/** Controleert de opslaglogica: tegelijk schrijven en het overzetten van de oude opslag. */
import { createKv, type KvBackend, type KvRow } from '../netlify/lib/kv';
import { check, report } from './helpers';

type Naam = 'lijst' | 'andere';
const EMPTY: Record<Naam, unknown> = { lijst: [] as string[], andere: { teller: 0 } };

/** Nabootsing van de database, met dezelfde versieregels als kv_write. */
function geheugen(): KvBackend & { rijen: Map<string, KvRow>; schrijfpogingen: number } {
  const rijen = new Map<string, KvRow>();
  const b = {
    rijen,
    schrijfpogingen: 0,
    async get(collection: string) {
      const rij = rijen.get(collection);
      return rij ? { data: structuredClone(rij.data), version: rij.version } : null;
    },
    async write(collection: string, data: unknown, expected: number | null) {
      b.schrijfpogingen++;
      const rij = rijen.get(collection);
      if (expected === null) {
        if (rij) return null; // bestond al
        rijen.set(collection, { data: structuredClone(data), version: 1 });
        return 1;
      }
      if (!rij || rij.version !== expected) return null;
      rijen.set(collection, { data: structuredClone(data), version: rij.version + 1 });
      return rij.version + 1;
    },
  };
  return b;
}

const snel = { sleep: async () => {}, log: () => {} };

// --- lezen en schrijven ---------------------------------------------------
{
  const db = geheugen();
  const kv = createKv<Naam>({ backend: db, empty: EMPTY, ...snel });

  check('lezen zonder rij geeft de lege waarde', await kv.read('lijst'), []);

  const eerste = await kv.read<string[]>('lijst');
  eerste.push('mag niet doorwerken');
  check('de lege waarde is een kopie, geen gedeeld object', await kv.read('lijst'), []);

  await kv.update<string[]>('lijst', (l) => [...l, 'melk']);
  await kv.update<string[]>('lijst', (l) => [...l, 'brood']);
  check('wijzigingen bouwen op elkaar voort', await kv.read('lijst'), ['melk', 'brood']);
  check('versie loopt op bij elke schrijfactie', db.rijen.get('lijst')?.version, 2);

  const na = await kv.update<{ teller: number }>('andere', (o) => ({ teller: o.teller + 1 }));
  check('update geeft de nieuwe waarde terug', na, { teller: 1 });

  await kv.overwrite('lijst', ['alleen dit']);
  check('overwrite vervangt alles', await kv.read('lijst'), ['alleen dit']);
}

// --- twee telefoons tegelijk ------------------------------------------------
{
  const db = geheugen();
  await db.write('lijst', ['melk'], null);

  // Tussen het lezen en schrijven van telefoon A schrijft telefoon B iets.
  let ingegrepen = false;
  const oorspronkelijk = db.get.bind(db);
  const storend: KvBackend = {
    get: async (c) => {
      const rij = await oorspronkelijk(c);
      if (!ingegrepen) {
        ingegrepen = true;
        const huidig = db.rijen.get(c)!;
        db.rijen.set(c, { data: [...(huidig.data as string[]), 'brood (van B)'], version: huidig.version + 1 });
      }
      return rij;
    },
    write: db.write,
  };

  let aantalKeerToegepast = 0;
  const kv = createKv<Naam>({ backend: storend, empty: EMPTY, ...snel });
  await kv.update<string[]>('lijst', (l) => {
    aantalKeerToegepast++;
    return [...l, 'kaas (van A)'];
  });

  check('geen wijziging gaat verloren', await kv.read('lijst'), ['melk', 'brood (van B)', 'kaas (van A)']);
  check('de wijziging van A is opnieuw toegepast op de verse gegevens', aantalKeerToegepast, 2);
}

// --- eerste keer tegelijk: beide willen de rij aanmaken ----------------------
{
  const db = geheugen();
  const kv = createKv<Naam>({ backend: db, empty: EMPTY, ...snel });
  await Promise.all([
    kv.update<string[]>('lijst', (l) => [...l, 'A']),
    kv.update<string[]>('lijst', (l) => [...l, 'B']),
  ]);
  const uit = (await kv.read<string[]>('lijst')).sort();
  check('twee gelijktijdige eerste schrijvers: beide blijven staan', uit, ['A', 'B']);
}

// --- blijft het conflict doorgaan, dan een duidelijke fout --------------------
{
  const db = geheugen();
  const altijdConflict: KvBackend = { get: db.get, write: async () => null };
  const kv = createKv<Naam>({ backend: altijdConflict, empty: EMPTY, maxAttempts: 3, ...snel });
  let melding = '';
  try {
    await kv.update('lijst', (l) => l);
  } catch (e) {
    melding = (e as Error).message;
  }
  check('na te veel conflicten volgt een leesbare fout', melding.includes('Probeer het nog eens'), true);
}

// --- een fout in de database wordt niet ingeslikt ------------------------------
{
  const kapot: KvBackend = {
    get: async () => {
      throw new Error('verbinding verbroken');
    },
    write: async () => null,
  };
  const kv = createKv<Naam>({ backend: kapot, empty: EMPTY, ...snel });
  let fout = '';
  try {
    await kv.read('lijst');
  } catch (e) {
    fout = (e as Error).message;
  }
  check('databasefout bij lezen komt door', fout, 'verbinding verbroken');
}

report('opslag');
