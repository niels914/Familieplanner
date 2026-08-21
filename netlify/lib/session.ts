import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

const COOKIE = 'fp_session';
const MAX_AGE_DAYS = 90;

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.FAMILY_PASSWORD;
  if (!s) {
    throw new Error(
      'FAMILY_PASSWORD (en bij voorkeur SESSION_SECRET) ontbreekt in de omgevingsvariabelen.',
    );
  }
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.FAMILY_PASSWORD;
  if (!expected) return false;
  // Hashen voor de vergelijking zodat lengteverschillen niets verraden.
  const h = (v: string) => createHmac('sha256', 'pw').update(v).digest('hex');
  return safeEqual(h(input), h(expected));
}

export function createSessionCookie(): string {
  const exp = Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const payload = b64url(JSON.stringify({ exp, n: randomBytes(6).toString('hex') }));
  const value = `${payload}.${sign(payload)}`;
  const attrs = [
    `${COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${MAX_AGE_DAYS * 24 * 60 * 60}`,
  ];
  return attrs.join('; ');
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function hasValidSession(req: Request): boolean {
  const header = req.headers.get('cookie');
  if (!header) return false;
  const raw = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const value = raw.slice(COOKIE.length + 1);
  const dot = value.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  if (!safeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp: number };
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}
