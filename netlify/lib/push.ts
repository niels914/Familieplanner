import webpush from 'web-push';
import type { PushSubscriptionRecord } from '../../shared/types';
import { read, overwrite } from './store';

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function publicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? '';
}

function configure(): void {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:familieplanner@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Stuurt naar alle geregistreerde toestellen en ruimt verlopen abonnementen op. */
export async function sendToAll(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!pushConfigured()) return { sent: 0, removed: 0 };
  configure();

  const subs = await read<PushSubscriptionRecord[]>('pushSubs');
  if (subs.length === 0) return { sent: 0, removed: 0 };

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
          { TTL: 12 * 60 * 60 },
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: het toestel heeft het abonnement ingetrokken.
        if (status === 404 || status === 410) dead.push(sub.id);
      }
    }),
  );

  if (dead.length > 0) {
    const fresh = await read<PushSubscriptionRecord[]>('pushSubs');
    await overwrite(
      'pushSubs',
      fresh.filter((s) => !dead.includes(s.id)),
    );
  }

  return { sent, removed: dead.length };
}
