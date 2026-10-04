/** Bundelt en draait de testbestanden. `npm test` */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const files = ['tests/ics.test.ts', 'tests/quickparse.test.ts', 'tests/packing.test.ts'];
const dir = mkdtempSync(join(tmpdir(), 'fp-tests-'));

try {
  for (const file of files) {
    const out = join(dir, `${file.replace(/\W/g, '_')}.mjs`);
    await build({ entryPoints: [file], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
    console.log(`\n— ${file}`);
    await import(`file://${out}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (process.exitCode) console.error('\nEr zijn tests mislukt.');
