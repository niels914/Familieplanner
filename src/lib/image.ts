/**
 * Een foto of pdf klaarmaken om te bewaren. Een foto van een telefoon is al snel 4 tot 8 MB;
 * daar zetten we zo'n 300 tot 600 KB van neer die nog prima leesbaar is, plus een miniatuur
 * voor in de lijst. Ook een HEIC van de iPhone wordt zo een gewone JPEG.
 */

/** Langste zijde van de bewaarde foto en van de miniatuur, in pixels. */
export const PHOTO_MAX = 1800;
export const THUMB_MAX = 320;
/** Zo groot mag wat we uploaden hoogstens zijn (de server weigert meer). */
export const MAX_BYTES = 5 * 1024 * 1024;

/** De afmetingen na verkleinen tot een langste zijde, nooit groter dan het origineel. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface PreparedFile {
  id: string;
  kind: 'image' | 'pdf';
  blob: Blob;
  /** Alleen bij een foto. */
  thumb?: Blob;
  /** Om meteen te tonen, vóór het uploaden klaar is. */
  previewUrl: string;
}

const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Deze foto kan niet gelezen worden. Probeer een andere.'));
    };
    img.src = url;
  });
}

function toJpeg(img: HTMLImageElement, max: number, quality: number): Promise<Blob> {
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('De foto kon niet verkleind worden.'));
  // Wit eronder: een png met doorzichtige delen wordt anders zwart in een jpeg.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('De foto kon niet verkleind worden.'))), 'image/jpeg', quality),
  );
}

export async function prepareFile(file: File): Promise<PreparedFile> {
  const id = crypto.randomUUID();

  if (isPdf(file)) {
    if (file.size > MAX_BYTES) throw new Error('Deze pdf is groter dan 5 MB. Kies een kleinere of maak er een foto van.');
    return { id, kind: 'pdf', blob: file, previewUrl: URL.createObjectURL(file) };
  }

  if (!file.type.startsWith('image/') && file.type !== '') throw new Error('Kies een foto of een pdf.');

  const img = await loadImage(file);
  let quality = 0.8;
  let blob = await toJpeg(img, PHOTO_MAX, quality);
  // Zou het toch te groot zijn, dan iets minder scherp in plaats van een mislukte upload.
  while (blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await toJpeg(img, PHOTO_MAX, quality);
  }
  const thumb = await toJpeg(img, THUMB_MAX, 0.7);
  return { id, kind: 'image', blob, thumb, previewUrl: URL.createObjectURL(blob) };
}

/** Het adres van een bewaard bestand, achter de inlog. */
export const receiptFileUrl = (receiptId: string, fileId: string, kind: 'image' | 'pdf', thumb = false) =>
  `/api/receipts/${receiptId}/files/${fileId}${thumb ? '.t.jpg' : kind === 'pdf' ? '.pdf' : '.jpg'}`;
