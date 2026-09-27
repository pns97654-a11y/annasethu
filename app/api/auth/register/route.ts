import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { registerSchema } from '@/lib/validation';
import { withErrorHandling, rateLimit, clientKey } from '@/lib/api-utils';

export const POST = withErrorHandling(async (req) => {
  if (!rateLimit(`register:${clientKey(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  }

  const body = registerSchema.parse(await req.json());

  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(body.password);

  const user = await db.user.create({
    data: {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: body.role,
      fullName: body.fullName
    }
  });

  // Create the role-specific profile shell. Organization and delivery-partner
  // profiles are completed via a follow-up onboarding step (they need more
  // fields, including admin-reviewed documents), so we don't require the
  // full profile at signup time.
  if (body.role === 'DONOR') {
    await db.donorProfile.create({ data: { userId: user.id, donorType: 'INDIVIDUAL' } });
  }

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'USER_REGISTERED', targetType: 'User', targetId: user.id }
  });

  await createSession({ userId: user.id, role: user.role });

  return NextResponse.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
  });
});
