import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { loginSchema } from '@/lib/validation';
import { withErrorHandling, rateLimit, clientKey } from '@/lib/api-utils';

export const POST = withErrorHandling(async (req) => {
  if (!rateLimit(`login:${clientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  }

  const body = loginSchema.parse(await req.json());

  const user = await db.user.findUnique({ where: { email: body.email } });
  // Deliberately generic error message — never reveal whether the email exists.
  const genericError = NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

  if (!user) return genericError;
  if (!user.isActive) {
    return NextResponse.json({ error: 'This account has been suspended.' }, { status: 403 });
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) return genericError;

  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
  });
});
