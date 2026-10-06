/**
 * Maakt de PWA-iconen: de vijf dieren van het gezin op marineblauw. De dieren komen uit
 * `src/components/Avatar.tsx`, zodat het icoon en de app nooit uit elkaar lopen. De pagina wordt
 * met Chromium omgezet naar PNG; de resultaten staan in public/ en gaan mee in de repo.
 *
 *   npm run icons
 *
 * Playwright moet geïnstalleerd zijn (`npm i -g playwright`), net als voor `npm run test:e2e`.
 */
import { build } from 'esbuild';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public');
const NAVY = '#1E3A5F';

// ---------------------------------------------------------------- playwright
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

// ------------------------------------------------------- de dieren als svg
const work = join(tmpdir(), 'familieplanner-icons');
mkdirSync(work, { recursive: true });
const bundle = join(work, 'avatars.cjs');
await build({
  stdin: {
    contents: `
      import { renderToStaticMarkup } from 'react-dom/server';
      import { createElement } from 'react';
      import { Avatar } from './src/components/Avatar';
      export const avatar = (who, size) => renderToStaticMarkup(createElement(Avatar, { who, size }));
    `,
    resolveDir: ROOT,
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: bundle,
  logLevel: 'error',
});
const { avatar } = createRequire(import.meta.url)(bundle);
rmSync(work, { recursive: true, force: true });

// ------------------------------------------------------------ de opmaak
/** Plek van elk dier op een vlak van 180 bij 180: [wie, formaat, links, boven]. */
const PLAATS = [
  ['niels', 72, 54, 14],
  ['irene', 62, 16, 62],
  ['matthijs', 62, 102, 62],
  ['amelie', 54, 34, 112],
  ['lotte', 54, 92, 112],
];

/**
 * @param schaal   hoe groot de groep is ten opzichte van het vlak (kleiner bij een maskable icoon,
 *                 waar Android de randen zelf wegsnijdt)
 * @param hoeken   eigen ronde hoeken; uit bij iOS (die rondt zelf af) en bij een maskable icoon
 */
function pagina(size, schaal, hoeken) {
  const eenheid = size / 180;
  const dieren = PLAATS.map(([wie, formaat, x, y]) => {
    // De groep staat gecentreerd; schalen gaat vanuit het midden.
    const cx = 90 + (x + formaat / 2 - 90) * schaal;
    const cy = 90 + (y + formaat / 2 - 90) * schaal;
    const d = formaat * schaal * eenheid;
    return `<span style="position:absolute;left:${(cx * eenheid - d / 2).toFixed(2)}px;top:${(cy * eenheid - d / 2).toFixed(2)}px;width:${d.toFixed(2)}px;height:${d.toFixed(2)}px;border-radius:50%;box-shadow:0 0 0 ${(3 * eenheid * schaal).toFixed(2)}px ${NAVY}">${avatar(wie, Math.round(d))}</span>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    .i{position:relative;width:${size}px;height:${size}px;background:${NAVY};border-radius:${hoeken ? size * 0.22 : 0}px;overflow:hidden}
    svg{display:block}
  </style><div class="i">${dieren}</div>`;
}

const doelen = [
  ['icon-192.png', 192, 1, true],
  ['icon-512.png', 512, 1, true],
  // iOS rondt het beginschermicoon zelf af, dus ook hier geen eigen hoeken.
  ['icon-180.png', 180, 1, false],
  ['icon-512-maskable.png', 512, 0.84, false],
];

const browser = await chromium.launch({ executablePath: browserPad() });
for (const [naam, size, schaal, hoeken] of doelen) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(pagina(size, schaal, hoeken));
  await page.screenshot({ path: join(OUT, naam), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('geschreven:', naam);
}
await browser.close();
