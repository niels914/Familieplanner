/**
 * Een foto of tekst laten uitlezen door een taalmodel (de API van Anthropic).
 *
 * Wat hier de deur uit gaat: alleen wat jij in het scherm "Uitlezen" kiest of plakt,
 * en alleen op het moment dat je op "Lees uit" tikt. Er wordt niets bewaard.
 * De sleutel staat in `ANTHROPIC_API_KEY` en komt nooit in een foutmelding of antwoord.
 */

import { cleanProposals, READ_TOOL, readSystemPrompt, type ReadResult } from '../../shared/lezen';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-5-5';

/** Hoe vaak per dag; een vangnet tegen verrassingen op de rekening. */
export const DAILY_LIMIT = 40;
export const MAX_IMAGES = 3;
export const MAX_TEXT = 20000;
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 24000;

export interface ReadInput {
  text?: string;
  /** JPEG's als base64, zonder 'data:'-voorvoegsel. */
  images?: string[];
}

/** Een fout met een tekst die je aan het gezin mag tonen. */
export class ReadError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export const readConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** Controleert wat de app stuurt en geeft de schone invoer terug, of een fout. */
export function checkInput(input: ReadInput): { text: string; images: string[] } {
  const text = (typeof input.text === 'string' ? input.text : '').trim().slice(0, MAX_TEXT);
  const images = Array.isArray(input.images) ? input.images : [];
  if (images.length > MAX_IMAGES) throw new ReadError(`Hoogstens ${MAX_IMAGES} foto’s tegelijk.`, 400);
  if (!text && images.length === 0) throw new ReadError('Kies een foto of plak een tekst.', 400);

  let total = 0;
  for (const img of images) {
    if (typeof img !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(img)) {
      throw new ReadError('Een van de foto’s kon niet gelezen worden.', 400);
    }
    const bytes = Buffer.from(img, 'base64');
    if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
      throw new ReadError('Alleen jpg-foto’s kunnen uitgelezen worden.', 400);
    }
    if (bytes.length > MAX_IMAGE_BYTES) throw new ReadError('Een foto is te groot.', 413);
    total += bytes.length;
  }
  if (total > MAX_TOTAL_BYTES) throw new ReadError('De foto’s zijn samen te groot.', 413);
  return { text, images };
}

type Fetch = typeof fetch;

/** Vraagt het model om voorstellen. `fetchImpl` is er voor de tests. */
export async function readWithModel(input: ReadInput, today: string, fetchImpl: Fetch = fetch): Promise<ReadResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new ReadError('ANTHROPIC_API_KEY is niet ingesteld in Netlify.', 503);
  const { text, images } = checkInput(input);

  const content: unknown[] = images.map((data) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data },
  }));
  content.push({
    type: 'text',
    text: text ? `Lees dit uit:\n\n${text}` : 'Lees de afbeelding(en) uit.',
  });

  let res: Response;
  try {
    res = await fetchImpl(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': API_VERSION },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 2500,
        system: readSystemPrompt(today),
        tools: [READ_TOOL],
        tool_choice: { type: 'tool', name: READ_TOOL.name },
        messages: [{ role: 'user', content }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Geen details uit de fout: die kunnen het adres of de kop met de sleutel bevatten.
    const timedOut = (err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError';
    throw new ReadError(
      timedOut ? 'Het uitlezen duurde te lang. Probeer het nog eens, eventueel met één foto.' : 'De uitleesdienst is niet bereikbaar.',
      504,
    );
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new ReadError('De API-sleutel werd geweigerd. Klopt ANTHROPIC_API_KEY?', 502);
    if (res.status === 429) throw new ReadError('De uitleesdienst is even druk. Probeer het over een minuut opnieuw.', 503);
    if (res.status === 400) throw new ReadError('De uitleesdienst accepteerde dit niet (misschien de modelnaam in ANTHROPIC_MODEL).', 502);
    throw new ReadError(`De uitleesdienst gaf een fout (${res.status}).`, 502);
  }

  let body: { content?: Array<{ type?: string; name?: string; input?: unknown }> };
  try {
    body = await res.json();
  } catch {
    throw new ReadError('Het antwoord van de uitleesdienst was onleesbaar.', 502);
  }
  const block = body.content?.find((b) => b.type === 'tool_use' && b.name === READ_TOOL.name);
  if (!block) throw new ReadError('De uitleesdienst gaf geen bruikbaar antwoord. Probeer het nog eens.', 502);

  return cleanProposals(block.input, today);
}

/** Telt een uitleesbeurt van vandaag; geeft false als de dagelijkse rem bereikt is. */
export function countUse(usage: { date: string; count: number } | undefined, today: string): { date: string; count: number } | null {
  const count = usage?.date === today ? usage.count : 0;
  if (count >= DAILY_LIMIT) return null;
  return { date: today, count: count + 1 };
}
