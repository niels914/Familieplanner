/**
 * Lokale testserver: serveert dist/ en draait de échte API-code uit
 * netlify/functions/api.ts, met alleen de opslag vervangen door geheugen.
 *
 *   npm run build && node tests/mock-server.mjs     →  http://localhost:4173
 *   wachtwoord: test
 */

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { voorbeeldData } from './fixtures.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

process.env.FAMILY_PASSWORD ??= 'test';
process.env.SESSION_SECRET ??= 'alleen-lokaal';

// Tijdelijke push-sleutels, zodat de meldingskaart lokaal te zien is. Echt
// versturen kan alleen vanaf Netlify naar een echte telefoon.
if (!process.env.VAPID_PUBLIC_KEY) {
  const { default: webpush } = await import('web-push');
  const sleutels = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = sleutels.publicKey;
  process.env.VAPID_PRIVATE_KEY = sleutels.privateKey;
}
globalThis.__FP_SEED__ = voorbeeldData();

// De API bundelen, met netlify/lib/store vervangen door de geheugenversie.
const bundel = await build({
  entryPoints: [join(ROOT, 'netlify/functions/api.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  packages: 'external',
  logLevel: 'error',
  plugins: [
    {
      name: 'opslag-in-geheugen',
      setup(b) {
        // Elke import die uitkomt op netlify/lib/store, ook de korte './store'
        // in push.ts en parro.ts, krijgt de geheugenversie.
        b.onResolve({ filter: /(^|\/)store$/ }, (args) => {
          const doel = resolve(args.resolveDir, args.path);
          return doel === join(ROOT, 'netlify/lib/store')
            ? { path: join(ROOT, 'tests/memory-store.ts') }
            : undefined;
        });
      },
    },
  ],
});
// In de repo wegschrijven, zodat Node de packages (web-push) in node_modules vindt.
const bundelPad = join(ROOT, 'tests', '.api-bundel.mjs');
await writeFile(bundelPad, bundel.outputFiles[0].text);
const { default: api } = await import(pathToFileURL(bundelPad).href);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:4173');

  if (url.pathname.startsWith('/api/')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const antwoord = await api(
      new Request(url, {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
      }),
    );
    const koppen = {};
    antwoord.headers.forEach((v, k) => {
      if (k !== 'set-cookie') koppen[k] = v;
    });
    const cookies = antwoord.headers.getSetCookie();
    if (cookies.length) koppen['set-cookie'] = cookies;
    res.writeHead(antwoord.status, koppen);
    res.end(Buffer.from(await antwoord.arrayBuffer()));
    return;
  }

  const pad = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    const data = await readFile(join(DIST, pad));
    res.writeHead(200, { 'content-type': TYPES[extname(pad)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(await readFile(join(DIST, 'index.html')));
  }
}).listen(4173, () => console.log('Testserver op http://localhost:4173 — wachtwoord: test'));
