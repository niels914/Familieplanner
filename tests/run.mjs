/** Bundelt en draait de testbestanden. `npm test` */
import { build } from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const files = [
  'tests/ics.test.ts',
  'tests/agenda.test.ts',
  'tests/werkagenda.test.ts',
  'tests/feestdagen.test.ts',
  'tests/people.test.ts',
  'tests/dates.test.ts',
  'tests/phone.test.ts',
  'tests/prep.test.ts',
  'tests/rules.test.ts',
  'tests/shopping.test.ts',
  'tests/oppas.test.ts',
  'tests/tijd.test.ts',
  'tests/warranty.test.ts',
  'tests/bonnetjes.test.ts',
  'tests/receipt-files.test.ts',
  'tests/image.test.ts',
  'tests/verjaardagen.test.ts',
  'tests/quickparse.test.ts',
  'tests/series.test.ts',
  'tests/signals.test.ts',
  'tests/regelen.test.ts',
  'tests/reminder.test.ts',
  'tests/kv.test.ts',
  'tests/supabase-backend.test.ts',
  'tests/schema.test.ts',
];

// In de repo zelf bouwen (niet in een tijdelijke map), zodat de bundels hun
// packages, zoals PGlite, in node_modules kunnen vinden.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'tests', '.build');
process.env.FP_ROOT = root;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

try {
  for (const file of files) {
    const out = join(dir, `${file.replace(/\W/g, '_')}.mjs`);
    await build({
      entryPoints: [join(root, file)],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: out,
      packages: 'external',
      logLevel: 'error',
      plugins: [
        {
          // De synchronisatie praat met netlify/lib/store; in de test is dat het geheugen.
          name: 'opslag-in-geheugen',
          setup(b) {
            b.onResolve({ filter: /(^|\/)store$/ }, (args) => {
              const doel = join(args.resolveDir, args.path);
              return doel === join(root, 'netlify/lib/store')
                ? { path: join(root, 'tests/memory-store.ts') }
                : undefined;
            });
          },
        },
      ],
    });
    console.log(`\n— ${file}`);
    await import(pathToFileURL(out).href);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (process.exitCode) console.error('\nEr zijn tests mislukt.');
