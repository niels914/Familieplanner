import type { Config } from '@netlify/functions';
import type { Receipt } from '../../shared/types';
import { listFiles, removeFiles } from '../lib/files';
import { orphanPaths } from '../lib/receipt-files';
import { read } from '../lib/store';

/**
 * Wekelijks: bestanden van bonnetjes die er niet meer zijn, na 30 dagen echt wissen. Zo kan
 * "Ongedaan maken" na een verwijdering altijd, en blijft er geen rommel liggen van een upload
 * die nooit is afgemaakt.
 */
export default async function handler(): Promise<Response> {
  const receipts = await read<Receipt[]>('receipts');
  const files = await listFiles();
  const weg = orphanPaths(files, receipts, new Date().toISOString());
  await removeFiles(weg);

  console.log('[bonnetjes]', `${weg.length} los bestand(en) gewist, ${files.length - weg.length} bewaard`);
  return new Response(JSON.stringify({ gewist: weg.length, bewaard: files.length - weg.length }), {
    headers: { 'content-type': 'application/json' },
  });
}

export const config: Config = { schedule: '30 3 * * 0' };
