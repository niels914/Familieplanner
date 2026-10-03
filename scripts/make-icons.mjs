/**
 * Maakt de PWA-iconen zonder externe libraries: pixels rasteren en als PNG
 * wegschrijven. Eén keer draaien met `npm run icons`; de resultaten staan in
 * public/ en gaan mee in de repo.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const GREEN = [30, 58, 95]; // #1E3A5F, de hoofdkleur van de app
const GREEN_DARK = [21, 41, 66];
const CREAM = [244, 246, 248];
const WHITE = [255, 255, 255];

function canvas(size) {
  const data = new Uint8Array(size * size * 4);
  return {
    size,
    data,
    set(x, y, [r, g, b], alpha = 1) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const i = (y * size + x) * 4;
      const a = Math.max(0, Math.min(1, alpha));
      data[i] = Math.round(data[i] * (1 - a) + r * a);
      data[i + 1] = Math.round(data[i + 1] * (1 - a) + g * a);
      data[i + 2] = Math.round(data[i + 2] * (1 - a) + b * a);
      data[i + 3] = Math.round(data[i + 3] * (1 - a) + 255 * a);
    },
  };
}

function roundRect(c, x0, y0, x1, y1, radius, color) {
  // Zonder straal is het een gewone rechthoek. De afronding hieronder zou bij
  // straal 0 elke pixel als "buiten" zien en niets tekenen.
  if (radius < 1) {
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) c.set(x, y, color);
    }
    return;
  }
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const dx = Math.max(x0 + radius - x, x - (x1 - radius), 0);
      const dy = Math.max(y0 + radius - y, y - (y1 - radius), 0);
      const dist = Math.hypot(dx, dy);
      // Zachte rand van één pixel, zodat de hoeken niet kartelen.
      const alpha = dist <= radius - 1 ? 1 : dist >= radius ? 0 : radius - dist;
      if (alpha > 0) c.set(x, y, color, alpha);
    }
  }
}

function circle(c, cx, cy, r, color) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const alpha = d <= r - 0.5 ? 1 : d >= r + 0.5 ? 0 : r + 0.5 - d;
      if (alpha > 0) c.set(x, y, color, alpha);
    }
  }
}

/** Een kalenderblad met twee ringen erboven en stipjes als dagen. */
function draw(size, inset, maskable = false) {
  const c = canvas(size);
  const s = (v) => v * size;

  // Een maskable icoon moet tot in de hoeken gevuld zijn: Android legt er zelf
  // een masker overheen. Eigen ronde hoeken geven dan transparante punten.
  roundRect(c, 0, 0, size, size, maskable ? 0 : s(0.22), GREEN);

  const pad = inset;
  const x0 = s(0.5 - pad / 2);
  const x1 = s(0.5 + pad / 2);
  const top = s(0.5 - pad / 2 + 0.04);
  const bottom = s(0.5 + pad / 2);

  // ringetjes
  const ringY = top - s(0.035);
  roundRect(c, s(0.5) - s(pad * 0.22), ringY - s(0.03), s(0.5) - s(pad * 0.22) + s(0.035), ringY + s(0.05), s(0.018), CREAM);
  roundRect(c, s(0.5) + s(pad * 0.18), ringY - s(0.03), s(0.5) + s(pad * 0.18) + s(0.035), ringY + s(0.05), s(0.018), CREAM);

  roundRect(c, x0, top, x1, bottom, s(0.055), CREAM);
  roundRect(c, x0, top, x1, top + (bottom - top) * 0.24, s(0.055), GREEN_DARK);
  // onderkant van de kopbalk recht afsnijden
  roundRect(c, x0, top + (bottom - top) * 0.16, x1, top + (bottom - top) * 0.24, 0, GREEN_DARK);

  const gridTop = top + (bottom - top) * 0.38;
  const gridBottom = bottom - (bottom - top) * 0.10;
  const cols = 3;
  const rows = 2;
  const dot = (x1 - x0) * 0.058;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const cx = x0 + ((x1 - x0) / (cols + 1)) * (col + 1);
      const cy = gridTop + ((gridBottom - gridTop) / (rows + 1)) * (r + 1);
      // Eén stip in het accent: de dag waarop er iets mee moet.
      circle(c, cx, cy, dot, r === 0 && col === 2 ? [188, 60, 28] : GREEN);
    }
  }

  return c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function toPng(c) {
  const { size, data } = c;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(data.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bitdiepte
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  ['icon-192.png', 192, 0.6, false],
  ['icon-512.png', 512, 0.6, false],
  // iOS rondt het beginschermicoon zelf af, dus ook hier geen eigen hoeken.
  ['icon-180.png', 180, 0.6, true],
  ['icon-512-maskable.png', 512, 0.44, true],
];

for (const [name, size, inset, fullBleed] of targets) {
  writeFileSync(join(OUT, name), toPng(draw(size, inset, fullBleed)));
  console.log('geschreven:', name);
}
