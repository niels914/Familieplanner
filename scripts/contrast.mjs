/**
 * Meet het contrast van de kleurparen die in de app echt voorkomen, in het
 * lichte én het donkere thema. Leest de kleuren rechtstreeks uit
 * src/styles.css, zodat de uitkomst altijd klopt met wat er staat.
 *
 *   npm run contrast
 *
 * Eisen volgens WCAG 2.2 AA: 4,5:1 voor tekst, 3:1 voor betekenisdragende
 * vormen zoals de gekleurde stippen per persoon. Stopt met een foutcode als
 * er iets onder de eis zakt, zodat het in een controle kan meedraaien.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles.css'),
  'utf8',
);

const leesTokens = (blok) =>
  Object.fromEntries(
    [...blok.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]),
  );

const donkerStart = css.indexOf('@media (prefers-color-scheme: dark)');
const licht = leesTokens(css.slice(css.indexOf(':root {'), donkerStart));
const donkerBlok = css.slice(donkerStart);
const donker = { ...licht, ...leesTokens(donkerBlok.slice(0, donkerBlok.indexOf('\n}\n'))) };

const rgb = (hex) => hex.slice(1).match(/../g).map((x) => parseInt(x, 16));
const luminantie = (kleur) => {
  const [r, g, b] = rgb(kleur).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const verhouding = (a, b) => {
  const [hoog, laag] = [luminantie(a), luminantie(b)].sort((x, y) => y - x);
  return (hoog + 0.05) / (laag + 0.05);
};

/** [omschrijving, voorgrond, achtergrond, eis] */
const PAREN = [
  ['lopende tekst', 'text', 'bg', 4.5],
  ['bijzin op ondergrond', 'muted', 'bg', 4.5],
  ['bijzin op kaart', 'muted', 'surface', 4.5],
  ['segmentknop, niet gekozen', 'muted', 'surface-2', 4.5],
  ['primaire knop', 'primary-ink', 'primary', 4.5],
  ['primair als tekst', 'primary', 'bg', 4.5],
  ['meenemen-blok', 'warn', 'warn-soft', 4.5],
  ['teller op Regelen', 'bg', 'warn', 4.5],
  ['chip Gesignaleerd', 'primary', 'primary-soft', 4.5],
  ['chip Matthijs', 'matthijs', 'matthijs-soft', 4.5],
  ['chip Amélie', 'amelie', 'amelie-soft', 4.5],
  ['chip Lotte', 'lotte', 'lotte-soft', 4.5],
  ['chip Niels en Irene', 'ouder', 'ouder-soft', 4.5],
  ['chip gezin', 'gezin', 'gezin-soft', 4.5],
  ['verwijderen', 'danger', 'surface', 4.5],
  ['stip Matthijs', 'matthijs', 'surface', 3],
  ['stip Amélie', 'amelie', 'surface', 3],
  ['stip Lotte', 'lotte', 'surface', 3],
  ['stip gezin', 'gezin', 'surface', 3],
  ['stip ouders', 'ouder', 'surface', 3],
];

let tekort = 0;

for (const [naam, tokens] of [
  ['Licht', licht],
  ['Donker', donker],
]) {
  console.log(`\n${naam}`);
  for (const [omschrijving, voor, achter, eis] of PAREN) {
    if (!tokens[voor] || !tokens[achter]) {
      console.log(`  ?  ontbrekend token: ${!tokens[voor] ? voor : achter}`);
      tekort++;
      continue;
    }
    const r = verhouding(tokens[voor], tokens[achter]);
    const goed = r >= eis;
    if (!goed) tekort++;
    console.log(`  ${goed ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}  eis ${eis}  ${omschrijving}`);
  }
}

console.log(tekort === 0 ? '\nAlles haalt de eis.' : `\n${tekort} combinatie(s) onder de eis.`);
if (tekort > 0) process.exitCode = 1;
