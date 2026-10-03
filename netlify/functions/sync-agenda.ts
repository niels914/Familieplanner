import type { Config } from '@netlify/functions';
import { configuredFeeds, runAgendaSync } from '../lib/agenda';

/** Haalt elk uur de gekoppelde persoonlijke agenda's binnen. */
export default async function handler(): Promise<Response> {
  if (configuredFeeds().length === 0) {
    return new Response(JSON.stringify({ ok: true, message: 'Geen agenda gekoppeld.' }), {
      headers: { 'content-type': 'application/json' },
    });
  }
  const result = await runAgendaSync();
  console.log('[agenda]', result.message);
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { 'content-type': 'application/json' },
  });
}

export const config: Config = { schedule: '23 * * * *' };
