/**
 * Voert supabase/schema.sql uit op een echte Postgres-engine (PGlite, de
 * database zelf in WebAssembly) en controleert het gedrag: de versieregels
 * van kv_write en dat de publieke rollen er niet bij kunnen.
 *
 * Niet getest: de verbinding met een echt Supabase-project. Dat kan alleen
 * met jullie eigen project.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { check, report } from './helpers';

const db = new PGlite();

// Supabase maakt deze rollen zelf aan; in een kale Postgres moeten we ze nabootsen.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
`);

// De runner bouwt de tests in tests/.build, dus de hoofdmap geeft hij zelf door.
const hoofdmap = process.env.FP_ROOT ?? process.cwd();
const schema = readFileSync(join(hoofdmap, 'supabase', 'schema.sql'), 'utf8');
await db.exec(schema);
await db.exec(schema); // opnieuw uitvoeren moet kunnen
check('schema is opnieuw uit te voeren zonder fout', true, true);

const schrijf = async (collectie: string, data: unknown, verwacht: number | null) => {
  const r = await db.query<{ v: number | null }>('select public.kv_write($1, $2::jsonb, $3) as v', [
    collectie,
    JSON.stringify(data),
    verwacht,
  ]);
  const v = r.rows[0].v;
  return v === null ? null : Number(v);
};

// --- versieregels ---------------------------------------------------------
check('eerste keer schrijven geeft versie 1', await schrijf('lijst', ['a'], null), 1);
check('nogmaals "als nieuw" schrijven botst', await schrijf('lijst', ['b'], null), null);
check('de botsing heeft niets overschreven', (await db.query<{ data: unknown }>("select data from public.kv where collection = 'lijst'")).rows[0].data, ['a']);

check('schrijven met de juiste versie geeft versie 2', await schrijf('lijst', ['a', 'b'], 1), 2);
check('schrijven met een verouderde versie botst', await schrijf('lijst', ['x'], 1), null);
check('ook dat heeft niets overschreven', (await db.query<{ data: unknown }>("select data from public.kv where collection = 'lijst'")).rows[0].data, ['a', 'b']);
check('schrijven naar een rij die niet bestaat botst', await schrijf('bestaatniet', [], 5), null);
check('met de nieuwe versie kan het weer', await schrijf('lijst', ['a', 'b', 'c'], 2), 3);

// Twee gelijktijdige schrijvers met dezelfde verwachte versie: precies één wint.
const [een, twee] = await Promise.all([schrijf('lijst', ['A'], 3), schrijf('lijst', ['B'], 3)]);
check('bij twee schrijvers op dezelfde versie wint er precies één', [een, twee].filter((v) => v !== null).length, 1);

// Gegevens blijven JSON, ook met bijzondere tekens.
await schrijf('tekst', { naam: 'Amélie — "de" ‘mooie’ 🎒' }, null);
check('tekens als é, aanhalingstekens en emoji blijven heel', (await db.query<{ data: { naam: string } }>("select data from public.kv where collection = 'tekst'")).rows[0].data.naam, 'Amélie — "de" ‘mooie’ 🎒');

// --- wie erbij mag ------------------------------------------------------------
const alsRol = async (rol: string, sql: string): Promise<string> => {
  await db.exec(`set role ${rol}`);
  try {
    const r = await db.query(sql);
    return `ok (${r.rows.length} rijen)`;
  } catch (e) {
    return `geweigerd: ${(e as Error).message}`;
  } finally {
    await db.exec('reset role');
  }
};

check('publieke rol (anon) kan niet lezen', (await alsRol('anon', 'select * from public.kv')).startsWith('geweigerd'), true);
check('ingelogde rol (authenticated) kan niet lezen', (await alsRol('authenticated', 'select * from public.kv')).startsWith('geweigerd'), true);
check('anon kan niet schrijven', (await alsRol('anon', "insert into public.kv(collection, data) values ('x', '{}')")).startsWith('geweigerd'), true);
check('anon kan kv_write niet aanroepen', (await alsRol('anon', "select public.kv_write('x', '{}'::jsonb, null)")).startsWith('geweigerd'), true);
check('authenticated kan kv_write niet aanroepen', (await alsRol('authenticated', "select public.kv_write('x', '{}'::jsonb, null)")).startsWith('geweigerd'), true);
check('de geheime rol (service_role) kan wel lezen', (await alsRol('service_role', 'select * from public.kv')).startsWith('ok'), true);
check('en kv_write aanroepen', (await alsRol('service_role', "select public.kv_write('nieuw', '[]'::jsonb, null)")).startsWith('ok'), true);

const rls = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname = 'kv'");
check('Row Level Security staat aan', rls.rows[0].relrowsecurity, true);

await db.close();
report('schema');
