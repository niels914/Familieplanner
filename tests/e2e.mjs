/**
 * Browsertest op een telefoonformaat, tegen de echte API met data in het geheugen.
 *
 *   npm run build && npm run test:e2e
 *
 * Wat dit vangt, en de gewone tests niet: een scherm dat breder wordt dan de telefoon,
 * verwijderen met ongedaan maken, vegen, de snelkeuze bij boodschappen, de tijdkeuze
 * per vijf minuten en de regels voor *Meer opties*. Elke controle zegt in gewone taal
 * wat er moet kloppen. Een mislukte controle zet het afsluitcijfer op 1.
 *
 * Playwright moet geïnstalleerd zijn (`npm i -g playwright`); de browser komt uit
 * PLAYWRIGHT_BROWSERS_PATH of CHROMIUM_PATH. De testserver start dit script zelf, op
 * een eigen poort, zodat een server die je al draait niet verstoord wordt.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.E2E_PORT ?? 4180);
const B = `http://localhost:${PORT}`;
const ROOT = new URL('..', import.meta.url).pathname;

// ------------------------------------------------------------------ opstarten
if (!existsSync(join(ROOT, 'dist/index.html'))) {
  console.error('Er is nog geen build. Draai eerst: npm run build');
  process.exit(1);
}

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

const server = spawn('node', ['tests/mock-server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);

for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${B}/api/session`)).status < 500) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
  if (i === 49) {
    console.error('De testserver kwam niet op.');
    stop();
    process.exit(1);
  }
}

const browser = await chromium.launch({ executablePath: browserPad() });

// -------------------------------------------------------------------- hulpjes
let fouten = 0;
let totaal = 0;
const ok = (wat, voorwaarde, extra = '') => {
  totaal++;
  if (voorwaarde) console.log(`  ✓ ${wat}`);
  else {
    fouten++;
    console.error(`  ✗ ${wat}${extra ? `\n      ${extra}` : ''}`);
  }
};
const kop = (naam) => console.log(`\n— ${naam}`);
/** Een groep controles. Gaat er binnenin iets mis, dan melden we dat leesbaar en lopen de andere groepen door. */
async function sectie(naam, werk) {
  kop(naam);
  try {
    await werk();
  } catch (e) {
    ok(`${naam}: de test liep vast`, false, String(e.message).split('\n')[0]);
  }
}
const rust = (p, ms = 350) => p.waitForTimeout(ms);

const consoleFouten = [];
async function toestel(breedte = 390, scheme = 'light') {
  const context = await browser.newContext({
    viewport: { width: breedte, height: 800 },
    deviceScaleFactor: 1,
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
    colorScheme: scheme,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => consoleFouten.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/proxy|google|gvt1|ERR_|Failed to load resource/i.test(m.text())) consoleFouten.push(m.text());
  });
  await page.request.post(`${B}/api/login`, { data: { password: 'test' } });
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp };
}

const data = async (p) => (await (await p.request.get(`${B}/api/data`)).json());
/** Wacht tot de server een bepaalde stand heeft; de app bewaart op de achtergrond. */
async function tot(p, voorwaarde, ms = 4000) {
  const einde = Date.now() + ms;
  while (Date.now() < einde) {
    if (voorwaarde(await data(p))) return true;
    await p.waitForTimeout(120);
  }
  return false;
}
async function open(p, pad = '/') {
  await p.goto(`${B}${pad}`);
  await p.waitForSelector('h1, .cal__title');
  await rust(p);
}
const tab = async (p, naam) => {
  await p.locator('.tabbar__item', { hasText: naam }).tap();
  await rust(p);
};
const morgen = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/** Een veeg met één vinger. */
async function veeg(cdp, x1, y, x2) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + ((x2 - x1) * i) / 10, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const vakje = async (loc) => {
  await loc.scrollIntoViewIfNeeded();
  const r = await loc.boundingBox();
  return { y: r.y + r.height / 2, links: r.x + 30, rechts: r.x + r.width - 30 };
};
const wachtOpMelding = (p) => p.locator('.toast').waitFor({ state: 'hidden', timeout: 12000 }).catch(() => {});

// ============================================================================
await sectie('Past op een telefoon: geen scherm wordt breder dan het toestel', async () => {
for (const breedte of [320, 360, 390]) {
  const { context, page: p } = await toestel(breedte);
  const bad = [];
  const meet = async (naam) => {
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    if (w > breedte) bad.push(`${naam}: ${w}px`);
  };
  try {
    await open(p);
    await meet('Vandaag');
    await open(p, `/?date=${morgen}`); // met de lange Teams-notitie van het Gmail-item
    await meet('Agenda');
    await tab(p, 'Regelen');
    await meet('Regelen, taken');
    for (const seg of ['Boodschappen', 'Weekmenu']) {
      await p.locator('.segmented button', { hasText: seg }).tap();
      await rust(p);
      await meet(`Regelen, ${seg.toLowerCase()}`);
    }
    await tab(p, 'Mensen');
    await meet('Mensen, contacten');
    await p.locator('.segmented button', { hasText: 'Oppas' }).tap();
    await rust(p);
    await meet('Mensen, oppas');
    await p.locator('.gezinbtn').first().tap();
    await rust(p);
    await meet('Gezin');
    await p.locator('.rowlink', { hasText: 'Instellingen' }).tap();
    await rust(p);
    await meet('Instellingen');
    // een formulier met veel velden
    await open(p, `/?date=${morgen}`);
    await p.locator('.event__open', { hasText: 'Klantgesprek' }).tap();
    await p.waitForSelector('#ev-title');
    await rust(p);
    await meet('Item bewerken');
  } catch (e) {
    // Is een scherm te breed, dan is het vaak niet meer te bedienen: dat melden we als oorzaak.
    bad.push(`daarna niet meer te bedienen (${String(e.message).split('\n')[0].slice(0, 80)})`);
  }
  ok(`${breedte} px: alle schermen passen`, bad.length === 0, bad.join(', '));
  await context.close();
}
{
  const { context, page: p } = await toestel(390);
  await open(p, `/?date=${morgen}`);
  const hoogte = await p.locator('.event__notes').first().evaluate((e) => e.getBoundingClientRect().height);
  ok('een lange notitie is ingekort tot ongeveer drie regels', hoogte > 0 && hoogte < 80, `${Math.round(hoogte)}px`);
  await context.close();
}
});

// ============================================================================
await sectie('Verwijderen met ongedaan maken', async () => {
  const { context, page: p } = await toestel();
  // een los item
  await open(p, `/?date=${morgen}`);
  await p.locator('.event__open', { hasText: 'Knuffeldag' }).first().tap();
  await p.waitForSelector('#ev-title');
  await rust(p);
  await p.getByRole('button', { name: 'Verwijderen', exact: true }).tap();
  ok('item: meteen weg, zonder bevestigingsvenster', await tot(p, (d) => !d.events.some((e) => e.title === 'Knuffeldag')));
  await p.getByRole('button', { name: 'Ongedaan maken' }).tap();
  const terug = await tot(p, (d) => d.events.some((e) => e.title === 'Knuffeldag'));
  ok('item: ongedaan maken zet het terug, met meeneem-lijstje', terug && (await data(p)).events.find((e) => e.title === 'Knuffeldag').bring.length === 1);
  await wachtOpMelding(p);

  // een reeks
  const start = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const einde = new Date(Date.now() + 26 * 86400000).toISOString().slice(0, 10);
  await p.request.post(`${B}/api/events/series`, { data: { event: { title: 'Zwemles', date: start, person: 'amelie', category: 'anders', allDay: true, bring: [{ id: 'x', text: 'Badpak', done: false }] }, interval: 1, until: einde } });
  const voor = (await data(p)).events.filter((e) => e.title === 'Zwemles');
  await open(p, `/?date=${voor[1].date}`);
  await p.locator('.event__open', { hasText: 'Zwemles' }).first().tap();
  await p.waitForSelector('#ev-title');
  await rust(p);
  await p.getByRole('button', { name: 'Verwijderen', exact: true }).tap();
  await rust(p, 250);
  await p.getByRole('button', { name: 'Deze en volgende' }).tap();
  ok('reeks: deze en volgende weg', await tot(p, (d) => d.events.filter((e) => e.title === 'Zwemles').length === 1));
  await p.getByRole('button', { name: 'Ongedaan maken' }).tap();
  const na = await tot(p, (d) => d.events.filter((e) => e.title === 'Zwemles').length === voor.length);
  const reeksen = new Set((await data(p)).events.filter((e) => e.title === 'Zwemles').map((e) => e.series?.id));
  ok('reeks: alles terug, nog steeds één reeks', na && reeksen.size === 1 && [...reeksen][0]);
  await wachtOpMelding(p);

  // een taak
  await open(p);
  await tab(p, 'Regelen');
  await p.locator('.actrow__main', { hasText: 'Tandarts afspreken' }).first().tap();
  await p.waitForSelector('#taak-titel');
  await rust(p);
  await p.getByRole('button', { name: 'Verwijderen', exact: true }).tap();
  ok('taak: weg', await tot(p, (d) => !d.tasks.some((t) => t.title === 'Tandarts afspreken')));
  await p.getByRole('button', { name: 'Ongedaan maken' }).tap();
  ok('taak: terug', await tot(p, (d) => d.tasks.some((t) => t.title === 'Tandarts afspreken')));
  await wachtOpMelding(p);

  // een contact
  await tab(p, 'Mensen');
  await p.locator('button[aria-label="Sem Bakker bewerken"]').tap();
  await p.waitForSelector('#ct-name');
  await rust(p);
  await p.getByRole('button', { name: 'Verwijderen', exact: true }).tap();
  ok('contact: weg', await tot(p, (d) => !d.contacts.some((c) => c.name === 'Sem Bakker')));
  await p.getByRole('button', { name: 'Ongedaan maken' }).tap();
  const sem = await tot(p, (d) => d.contacts.some((c) => c.name === 'Sem Bakker'));
  ok('contact: terug, met de ouders', sem && (await data(p)).contacts.find((c) => c.name === 'Sem Bakker').parents.length === 1);
  await context.close();
});

// ============================================================================
await sectie('Vegen op taken en boodschappen', async () => {
  const { context, page: p, cdp } = await toestel();
  await open(p);
  await tab(p, 'Regelen');
  let v = await vakje(p.locator('.swipe', { hasText: 'Aanmelden ouderavond' }));
  await veeg(cdp, v.links, v.y, v.links + 60);
  await rust(p, 400);
  ok('een korte veeg doet niets', !(await data(p)).tasks.find((t) => t.title === 'Aanmelden ouderavond').done);
  v = await vakje(p.locator('.swipe', { hasText: 'Aanmelden ouderavond' }));
  await veeg(cdp, v.links, v.y, v.links + 200);
  ok('naar rechts: taak klaar', await tot(p, (d) => d.tasks.find((t) => t.title === 'Aanmelden ouderavond')?.done));
  await p.getByRole('button', { name: 'Ongedaan maken' }).tap();
  ok('en weer open met ongedaan maken', await tot(p, (d) => !d.tasks.find((t) => t.title === 'Aanmelden ouderavond').done));
  await wachtOpMelding(p);
  v = await vakje(p.locator('.swipe', { hasText: 'Tandarts afspreken' }));
  await veeg(cdp, v.rechts, v.y, v.rechts - 210);
  ok('naar links: taak weg', await tot(p, (d) => !d.tasks.some((t) => t.title === 'Tandarts afspreken')));
  await p.getByRole('button', { name: 'Ongedaan maken' }).tap();
  ok('en terug met ongedaan maken', await tot(p, (d) => d.tasks.some((t) => t.title === 'Tandarts afspreken')));
  await wachtOpMelding(p);

  await p.locator('.segmented button', { hasText: 'Boodschappen' }).tap();
  await rust(p);
  v = await vakje(p.locator('.swipe', { hasText: 'Luiers' }).first());
  await veeg(cdp, v.links, v.y, v.links + 210);
  ok('boodschap afvinken door te vegen', await tot(p, (d) => d.shopping.find((i) => i.text.startsWith('Luiers'))?.done));
  await context.close();
});

// ============================================================================
await sectie('Boodschappen: invoer onderaan en een snelkeuze die leert', async () => {
  const { context, page: p } = await toestel();
  await open(p);
  await tab(p, 'Regelen');
  await p.locator('.segmented button', { hasText: 'Boodschappen' }).tap();
  await rust(p);
  const bar = await p.locator('.shopbar').boundingBox();
  ok('de invoer staat in de onderste helft van het scherm', bar.y > 400, `y = ${Math.round(bar.y)}`);
  ok('nog geen snelkeuze', (await p.locator('.shopbar__picks .pick').count()) === 0);
  for (let i = 0; i < 2; i++) {
    await p.locator('.shopbar input').fill('Havermout');
    await p.locator('.shopbar input').press('Enter');
    await tot(p, (d) => d.shopping.some((x) => x.text === 'Havermout'));
    const h = (await data(p)).shopping.find((x) => x.text === 'Havermout');
    await p.request.delete(`${B}/api/shopping/${h.id}`);
    await open(p);
    await tab(p, 'Regelen');
    await p.locator('.segmented button', { hasText: 'Boodschappen' }).tap();
    await rust(p);
  }
  ok('na twee keer verschijnt het als snelkeuze', (await p.locator('.shopbar__picks .pick', { hasText: 'Havermout' }).count()) === 1);
  await p.locator('.shopbar__picks .pick', { hasText: 'Havermout' }).tap();
  ok('een tik zet het op de lijst', await tot(p, (d) => d.shopping.some((x) => x.text === 'Havermout')));
  ok('en dan staat het niet meer in de snelkeuze', (await p.locator('.shopbar__picks .pick', { hasText: 'Havermout' }).count()) === 0);
  await context.close();
});

// ============================================================================
await sectie('Tijden per vijf minuten', async () => {
  const { context, page: p } = await toestel();
  await open(p);
  await p.locator('.tabbar__add').tap();
  await p.waitForSelector('#nieuw-tekst');
  await rust(p);
  await p.locator('#nieuw-tekst').fill('Tijdtest');
  await p.getByRole('button', { name: 'Alle opties' }).tap();
  await p.waitForSelector('#ev-title');
  await rust(p);
  await p.getByRole('button', { name: 'Tijdstip', exact: true }).tap();
  await rust(p, 250);
  const minuten = await p.getByLabel('Tijdstip, minuten').locator('option').allInnerTexts();
  ok('twaalf minuten, per vijf', minuten.join(' ') === '00 05 10 15 20 25 30 35 40 45 50 55', minuten.join(' '));
  ok('de eindtijd begint leeg', (await p.getByLabel('Eindtijd, uur').inputValue()) === '');
  await p.getByLabel('Tijdstip, uur').selectOption('17');
  await p.getByLabel('Tijdstip, minuten').selectOption('35');
  await p.getByLabel('Eindtijd, uur').selectOption('18');
  await p.getByRole('button', { name: 'Opslaan', exact: true }).tap();
  ok('opgeslagen als 17:35 tot 18:00', await tot(p, (d) => d.events.some((e) => e.title === 'Tijdtest' && e.time === '17:35' && e.endTime === '18:00')));
  // een afwijkende minuut (zoals uit Google) blijft staan
  const ev = (await data(p)).events.find((e) => e.title === 'Tijdtest');
  await p.request.post(`${B}/api/events`, { data: { ...ev, time: '08:32' } });
  await open(p, `/?date=${ev.date}`);
  await p.locator('.event__open', { hasText: 'Tijdtest' }).first().tap();
  await p.waitForSelector('#ev-title');
  await rust(p);
  ok('08:32 uit een agenda blijft zichtbaar', (await p.getByLabel('Tijdstip, minuten').inputValue()) === '32');
  await p.getByRole('button', { name: 'Opslaan', exact: true }).tap();
  ok('en verspringt niet als je niets wijzigt', await tot(p, (d) => d.events.find((e) => e.title === 'Tijdtest')?.time === '08:32'));
  await context.close();
});

// ============================================================================
await sectie('Formulieren: Meer opties en oppasfilter', async () => {
  const { context, page: p } = await toestel();
  await open(p);
  await p.locator('.tabbar__add').tap();
  await p.waitForSelector('#nieuw-tekst');
  await rust(p);
  await p.getByRole('button', { name: 'Alle opties' }).tap();
  await p.waitForSelector('#ev-title');
  await rust(p);
  ok('nieuw leeg item: Meer opties is dicht', (await p.locator('.more__toggle').getAttribute('aria-expanded')) === 'false');
  ok('en laat zien wat erachter zit', (await p.locator('.more__preview').innerText()).includes('Soort'));
  await p.locator('.more__toggle').tap();
  await rust(p, 250);
  ok('openen toont de soort', (await p.getByText('Peuterspeelzaal').count()) > 0);
  await p.keyboard.press('Escape');
  await rust(p);

  await open(p, `/?date=${morgen}`);
  await p.locator('.event__open', { hasText: 'Klantgesprek' }).tap();
  await p.waitForSelector('#ev-title');
  await rust(p);
  ok('item met een notitie begint open', (await p.locator('.more__toggle').getAttribute('aria-expanded')) === 'true');
  ok('en bewaart de hele notitie', (await p.locator('#ev-notes').inputValue()).includes('Vergaderopties'));
  await p.keyboard.press('Escape');
  await rust(p);

  await open(p);
  await tab(p, 'Mensen');
  await p.locator('.segmented button', { hasText: 'Oppas' }).tap();
  await p.waitForSelector('.filterbar');
  const rij = await p.locator('.filterbar').boundingBox();
  ok('de oppasfilters staan op één regel', rij.height < 60, `${Math.round(rij.height)}px`);
  await p.locator('.filterbar select').first().selectOption('alles');
  await p.locator('.filterbar select').nth(1).selectOption({ label: 'Joris Peters' });
  await rust(p);
  const namen = await p.locator('.card.card--pad strong').allInnerTexts();
  ok('filteren op het contact vindt ook momenten met alleen een voornaam', namen.includes('Joris Peters'), namen.join(', '));
  await context.close();
});

// ============================================================================
await sectie('Een oppasmoment vastleggen', async () => {
  const { context, page: p } = await toestel();
  await open(p);
  await tab(p, 'Mensen');
  await p.locator('.segmented button', { hasText: 'Oppas' }).tap();
  await p.waitForSelector('.filterbar');
  await p.getByRole('button', { name: '+ Moment' }).tap();
  await p.waitForSelector('#ev-start');
  await rust(p);
  ok('begint met 18:00 tot 22:00', (await p.locator('#ev-start').inputValue()) === '18' && (await p.locator('#ev-end').inputValue()) === '22');
  await p.getByRole('button', { name: 'Joris Peters', exact: true }).tap();
  await p.locator('#ev-start').selectOption('19');
  await p.getByLabel('Van, minuten').selectOption('05');
  await p.locator('#ev-end').selectOption('23');
  await rust(p, 250);
  ok('de kosten rekenen mee (3,92 uur à 7 euro)', (await p.locator('.modal').innerText()).includes('27,42'), (await p.locator('.modal').innerText()).match(/uur · .*/)?.[0]);
  await p.locator('button.pick', { hasText: 'Betaald' }).tap();
  await p.getByRole('button', { name: 'Opslaan', exact: true }).tap();
  const ok1 = await tot(p, (d) =>
    d.events.some((e) => e.category === 'oppas' && e.sitter?.start === '19:05' && e.sitter?.end === '23:00' && e.sitter?.rate === 7 && e.sitter?.paid === true && e.sitter?.name === 'Joris Peters' && e.sitter?.contactId),
  );
  ok('opgeslagen met contact, tijden, tarief en betaald', ok1);
  await context.close();
});

// ============================================================================
kop('Geen fouten in de console');
ok('geen scriptfouten tijdens deze hele test', consoleFouten.length === 0, consoleFouten.slice(0, 3).join(' | '));

await browser.close();
stop();
console.log(`\n${fouten === 0 ? '✓' : '✗'} browsertest: ${totaal - fouten}/${totaal} goed\n`);
process.exit(fouten === 0 ? 0 : 1);
