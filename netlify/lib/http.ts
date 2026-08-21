import { clearSessionCookie, createSessionCookie, hasValidSession } from './session';

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, { status });
}

export function unauthorized(): Response {
  return json({ error: 'Niet ingelogd' }, { status: 401 });
}

export function withSessionCookie(res: Response): Response {
  res.headers.append('set-cookie', createSessionCookie());
  return res;
}

export function withClearedCookie(res: Response): Response {
  res.headers.append('set-cookie', clearSessionCookie());
  return res;
}

export function requireSession(req: Request): Response | null {
  return hasValidSession(req) ? null : unauthorized();
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error('Ongeldige JSON in het verzoek.');
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
