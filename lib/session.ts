import { cookies } from 'next/headers';
import crypto from 'crypto';

// Lightweight signed-cookie session. No external session store needed for
// the MVP. The cookie value is `<payloadBase64>.<hmacSignature>`, so it
// cannot be forged without SESSION_SECRET, and it's httpOnly so client JS
// (and therefore XSS) cannot read it.
//
// For a larger production deployment, swap this for a reputable auth
// provider (e.g. NextAuth/Auth.js, Clerk, or a database-backed session
// table) — the `getSession`/`createSession`/`destroySession` interface
// below is intentionally small so that swap only touches this file.

const COOKIE_NAME = 'annasethu_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set. Copy .env.example to .env and set it.');
  }
  return secret;
}

export interface SessionPayload {
  userId: string;
  role: string;
  issuedAt: number;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function createSessionCookieValue(payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(json);
  return `${json}.${sig}`;
}

function verifyCookieValue(value: string): SessionPayload | null {
  const [json, sig] = value.split('.');
  if (!json || !sig) return null;
  const expected = sign(json);
  // Timing-safe comparison
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, 'issuedAt'>) {
  const value = createSessionCookieValue({ ...payload, issuedAt: Date.now() });
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS
  });
}

export function getSession(): SessionPayload | null {
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!value) return null;
  return verifyCookieValue(value);
}

export function destroySession() {
  cookies().delete(COOKIE_NAME);
}
