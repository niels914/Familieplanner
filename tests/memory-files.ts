/**
 * Vervangt netlify/lib/files.ts in de testserver: dezelfde functies, de bestanden staan in het
 * geheugen in plaats van in Supabase Storage.
 */

import type { StoredFile } from '../netlify/lib/receipt-files';

const opslag = new Map<string, { bytes: Uint8Array; createdAt: string }>();

export async function putFile(path: string, bytes: Uint8Array): Promise<void> {
  opslag.set(path, { bytes: new Uint8Array(bytes), createdAt: new Date().toISOString() });
}

export async function getFile(path: string): Promise<{ bytes: Uint8Array } | null> {
  const f = opslag.get(path);
  return f ? { bytes: new Uint8Array(f.bytes) } : null;
}

export async function removeFiles(paths: string[]): Promise<void> {
  for (const p of paths) opslag.delete(p);
}

export async function listFiles(): Promise<StoredFile[]> {
  return [...opslag].map(([path, f]) => ({ path, createdAt: f.createdAt }));
}
