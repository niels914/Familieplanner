import type { ReadResult } from '../../shared/lezen';
import type { PreparedFile } from './image';
import { api } from './api';

/** Een foto als base64, zonder 'data:'-voorvoegsel, zoals de server het verwacht. */
async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  // In stukken, anders loopt String.fromCharCode vast op een grote foto.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Laat de server een foto of tekst uitlezen. Er wordt niets bewaard. */
export async function readInput(text: string, photos: PreparedFile[]): Promise<ReadResult> {
  const images = await Promise.all(photos.map((p) => toBase64(p.blob)));
  return api.post<ReadResult>('read', { text: text.trim() || undefined, images });
}
