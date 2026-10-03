/**
 * Meet hoe snel de app aanvoelt, met een kunstmatig trage verbinding.
 *
 *   npm run build
 *   node tests/mock-server.mjs &          # of een andere draaiende versie
 *   node scripts/measure.mjs              # BASE_URL=... FP_PASSWORD=... FP_LATENCY=300
 *
 * Er zijn twee metingen, elk een paar keer herhaald:
 *   1. Koud en warm openen: hoe lang duurt het voor "Vandaag" in beeld staat,
 *      de eerste keer (niets op het toestel) en bij elke volgende keer.
 *   2. Afvinken: hoe lang duurt het van tikken tot het vinkje er staat.
 *
 * Alle verzoeken naar /api krijgen FP_LATENCY milliseconden vertraging (standaard
 * 300, ongeveer een matige 4G-verbinding), want op een snel netwerk zie je het
 * verschil niet. Playwright moet geïnstalleerd zijn (`npm i -g playwright`); de
 * browser komt uit PLAYWRIGHT_BROWSERS_PATH of CHROMIUM_PATH.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const PASSWORD = process.env.FP_PASSWORD ?? 'test';
const LATENCY = Number(process.env.FP_LATENCY ?? 300);
const RUNS = Number(process.env.FP_RUNS ?? 5);

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  const global = process.env.NODE_PATH?.split(':').find((p) => existsSync(join(p, 'playwright')));
  if (!global) {
    console.error('Playwright ontbreekt. Installeer met: npm i -g playwright');
    process.exit(1);
  }
  ({ chromium } = await import(join(global, 'playwright', 'index.mjs')));
}

function browserPad() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  const map = readdirSync(root).find((d) => d.startsWith('chromium-'));
  const pad = map && join(root, map, 'chrome-linux', 'chrome');
  return pad && existsSync(pad) ? pad : undefined;
}

const mediaan = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const ms = (n) => `${Math.round(n)} ms`;

const browser = await chromium.launch({ executablePath: browserPad() });

async function nieuwToestel() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/api/**', async (route) => {
    // Inloggen zelf niet vertragen; het gaat om wat daarna komt.
    if (!route.request().url().endsWith('/api/login')) {
      await new Promise((r) => setTimeout(r, LATENCY));
    }
    await route.continue();
  });
  const page = await context.newPage();
  await page.request.post(`${BASE}/api/login`, { data: { password: PASSWORD } });
  return { context, page };
}

/** "Vandaag" staat in beeld zodra de kop met de datum er is. */
const KOP = 'h1';

const koud = [];
const warm = [];
for (let i = 0; i < RUNS; i++) {
  const { context, page } = await nieuwToestel();
  let t0 = Date.now();
  await page.goto(BASE);
  await page.waitForSelector(KOP, { timeout: 15000 });
  koud.push(Date.now() - t0);

  t0 = Date.now();
  await page.reload();
  await page.waitForSelector(KOP, { timeout: 15000 });
  warm.push(Date.now() - t0);
  await context.close();
}

/** Zet het meeneem-lijstje terug zoals het was, zodat elke meting opnieuw kan. */
async function haalStart() {
  const { page, context } = await nieuwToestel();
  const data = await (await page.request.get(`${BASE}/api/data`)).json();
  await context.close();
  return data.events;
}
async function herstel(page, start) {
  const nu = (await (await page.request.get(`${BASE}/api/data`)).json()).events;
  for (const oud of start) {
    const huidig = nu.find((e) => e.id === oud.id);
    if (huidig && JSON.stringify(huidig.bring) !== JSON.stringify(oud.bring)) {
      await page.request.post(`${BASE}/api/events`, { data: oud });
    }
  }
}

const startEvents = await haalStart();
const afvinken = [];
for (let i = 0; i < RUNS; i++) {
  const { context, page } = await nieuwToestel();
  await page.goto(BASE);
  // 's Middags staat "morgen klaarzetten" ingeklapt; klap het eerst open.
  await page.waitForSelector(KOP, { timeout: 15000 });
  if ((await page.locator('.prep__row').count()) === 0 && (await page.locator('.compactprep').count()) > 0) {
    await page.locator('.compactprep').click();
  }
  const vak = page.locator('.prep__row input[type=checkbox]').first();
  await vak.waitFor({ timeout: 15000 });
  const voor = await page.locator('.prep__row').count();
  const t0 = Date.now();
  await vak.click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('.prep__row').length < n,
    voor,
    { timeout: 15000 },
  );
  afvinken.push(Date.now() - t0);
  await page.waitForTimeout(LATENCY * 2 + 200); // laat het verzoek eerst afronden
  await herstel(page, startEvents);
  await context.close();
}

await browser.close();

console.log(`\nVerbinding: ${LATENCY} ms vertraging per verzoek, ${RUNS} metingen, mediaan\n`);
console.log(`  eerste keer openen (niets op het toestel)   ${ms(mediaan(koud))}`);
console.log(`  opnieuw openen (laatste stand op het toestel) ${ms(mediaan(warm))}`);
console.log(`  afvinken: tikken tot het vinkje er staat     ${ms(mediaan(afvinken))}\n`);
