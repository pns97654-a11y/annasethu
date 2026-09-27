import { NextResponse, type NextRequest } from 'next/server';


// Lightweight middleware-level guard. It only checks that a validly-signed
// session cookie exists for the right role prefix — the actual authorization
// decision for every write still happens in lib/auth.ts's requireRole() on
// the API routes, which is the real security boundary. This middleware just
// gives logged-out users a clean redirect to /login instead of a broken page.

const COOKIE_NAME = 'annasethu_session';

const ROLE_PREFIXES: Record<string, string> = {
  '/donor': 'DONOR',
  '/organization/dashboard': 'ORGANIZATION',
  '/delivery/dashboard': 'DELIVERY_PARTNER',
  '/sponsor': 'SPONSOR',
  '/admin': 'ADMIN'
};

async function verify(value: string, secret: string) {
  const [json, sig] = value.split('.');
  if (!json || !sig) return null;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(json)
    );

    const expected = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (expected !== sig) return null;

    const base64 = json.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((p) => req.nextUrl.pathname.startsWith(p));
  if (!matchedPrefix) return NextResponse.next();

  const secret = process.env.SESSION_SECRET;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const session = cookie && secret ? await verify(cookie, secret) : null;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const requiredRole = ROLE_PREFIXES[matchedPrefix];
  if (session.role !== requiredRole) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/donor/:path*', '/organization/dashboard/:path*', '/delivery/dashboard/:path*', '/sponsor/:path*', '/admin/:path*']
};
