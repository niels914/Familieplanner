import type { Config } from '@netlify/functions';
import type { Settings } from '../../shared/types';
import { syncParro } from '../lib/parro';
import { DEFAULT_SETTINGS, update } from '../lib/store';

/** Haalt elke drie uur de schoolagenda van Parro binnen. */
export default async function handler(): Promise<Response> {
  const result = await syncParro();

  await update<Settings>('settings', (s) => ({
    ...DEFAULT_SETTINGS,
    ...s,
    parroLastSync: new Date().toISOString(),
    parroLastResult: result.message,
    parroEventCount: result.total,
  }));

  console.log('[parro]', result.message);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { 'content-type': 'application/json' },
  });
}

export const config: Config = { schedule: '17 */3 * * *' };
