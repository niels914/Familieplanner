/** Controleert de regels voor bestanden bij bonnetjes: namen, inhoud en opruimen. */
import type { Receipt } from '../shared/types';
import { MAX_FILE_BYTES, contentTypeFor, looksLikeFile, orphanPaths, receiptFilePath } from '../netlify/lib/receipt-files';
import { check, report } from './helpers';

const ID = '3f2b8c1e-9a7d-4c55-8b1e-2f6a9d0c4e71';
const FID = 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7';

// -------------------------------------------------------------------------- paden
check('foto', receiptFilePath(ID, `${FID}.jpg`), `${ID}/${FID}.jpg`);
check('miniatuur', receiptFilePath(ID, `${FID}.t.jpg`), `${ID}/${FID}.t.jpg`);
check('pdf', receiptFilePath(ID, `${FID}.pdf`), `${ID}/${FID}.pdf`);
check('een miniatuur van een pdf bestaat niet', receiptFilePath(ID, `${FID}.t.pdf`), null);
check('een ander soort bestand', receiptFilePath(ID, `${FID}.exe`), null);
check('een pad naar boven', receiptFilePath(ID, '../geheim.jpg'), null);
check('een pad in de naam', receiptFilePath(ID, `x/${FID}.jpg`), null);
check('een id met een slash', receiptFilePath('a/b-cdefgh', `${FID}.jpg`), null);
check('een id met punten', receiptFilePath('..-..-..-..', `${FID}.jpg`), null);
check('een veel te korte naam', receiptFilePath(ID, 'a.jpg'), null);
check('leeg', receiptFilePath('', ''), null);

check('soort bij jpg', contentTypeFor(`${FID}.jpg`), 'image/jpeg');
check('soort bij miniatuur', contentTypeFor(`${FID}.t.jpg`), 'image/jpeg');
check('soort bij pdf', contentTypeFor(`${FID}.pdf`), 'application/pdf');
check('de grens is 5 MB', MAX_FILE_BYTES, 5 * 1024 * 1024);

// ------------------------------------------------------------------------ inhoud
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
check('een echte jpg', looksLikeFile(jpg, `${FID}.jpg`), true);
check('een echte pdf', looksLikeFile(pdf, `${FID}.pdf`), true);
check('een png die zich als jpg voordoet', looksLikeFile(png, `${FID}.jpg`), false);
check('een pdf die zich als jpg voordoet', looksLikeFile(pdf, `${FID}.jpg`), false);
check('een jpg die zich als pdf voordoet', looksLikeFile(jpg, `${FID}.pdf`), false);
check('een leeg bestand', looksLikeFile(new Uint8Array(), `${FID}.jpg`), false);
check('te kort', looksLikeFile(new Uint8Array([0xff, 0xd8]), `${FID}.jpg`), false);

// --------------------------------------------------------------------- opruimen
const nu = '2026-10-04T12:00:00.000Z';
const dagen = (n: number) => new Date(Date.parse(nu) - n * 86400000).toISOString();
const bon: Receipt = {
  id: ID,
  title: 'Wasmachine',
  purchaseDate: '2026-03-12',
  person: 'gezin',
  files: [
    { id: FID, kind: 'image', thumb: true },
    { id: 'b1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7', kind: 'pdf' },
  ],
  createdAt: '',
  updatedAt: '',
};
const bestanden = [
  { path: `${ID}/${FID}.jpg`, createdAt: dagen(200) },
  { path: `${ID}/${FID}.t.jpg`, createdAt: dagen(200) },
  { path: `${ID}/b1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7.pdf`, createdAt: dagen(200) },
];
check('wat bij een bonnetje hoort blijft, ook al is het oud', orphanPaths(bestanden, [bon], nu), []);
check('een bestand dat niet meer in het bonnetje staat, gaat na 30 dagen', orphanPaths([...bestanden, { path: `${ID}/c1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7.jpg`, createdAt: dagen(40) }], [bon], nu), [`${ID}/c1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7.jpg`]);
check('maar niet eerder: 29 dagen is te vers', orphanPaths([{ path: `${ID}/c1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7.jpg`, createdAt: dagen(29) }], [bon], nu), []);
check('een verwijderd bonnetje: de bestanden blijven 30 dagen voor ongedaan maken', orphanPaths(bestanden.map((f) => ({ ...f, createdAt: dagen(10) })), [], nu), []);
check('en gaan daarna weg', orphanPaths(bestanden.map((f) => ({ ...f, createdAt: dagen(31) })), [], nu).length, 3);
check('een miniatuur van een foto zonder miniatuur-vlag is onbekend en gaat weg', orphanPaths([{ path: `${ID}/b1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7.t.jpg`, createdAt: dagen(60) }], [bon], nu).length, 1);
check('een upload van gisteren voor een bonnetje dat nog niet bestaat blijft', orphanPaths([{ path: `nieuwid-0000/x.jpg`, createdAt: dagen(1) }], [bon], nu), []);

report('bonnetjebestanden');
