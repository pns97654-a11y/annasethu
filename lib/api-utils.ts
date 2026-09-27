import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from './auth';

// Wraps a route handler so every API route gets consistent error shapes and
// nothing ever leaks a raw stack trace to the client.
export function withErrorHandling(handler: (req: Request, ctx: any) => Promise<NextResponse>) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: err.flatten() },
          { status: 400 }
        );
      }
      console.error(err);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}

// Extremely simple in-memory rate limiter (per-process). Good enough to
// blunt brute-force login/register attempts in a single-instance MVP
// deployment; swap for a Redis-backed limiter once you run multiple
// instances behind a load balancer.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientKey(req: Request): string {
  return req.headers.get('x-forwarded-for') ?? 'local';
}
