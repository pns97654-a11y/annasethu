import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';
import { z } from 'zod';

const createSchema = z.object({
  sponsorType: z.enum(['COMPANY', 'FOUNDATION', 'INDIVIDUAL', 'CSR_PROGRAM', 'PHILANTHROPIC_ORG']),
  displayName: z.string().min(2)
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireRole('SPONSOR');
  const existing = await db.sponsorProfile.findUnique({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: 'Sponsor profile already exists.' }, { status: 409 });

  const body = createSchema.parse(await req.json());
  const profile = await db.sponsorProfile.create({ data: { userId: user.id, ...body } });

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'SPONSOR_PROFILE_CREATED', targetType: 'SponsorProfile', targetId: profile.id }
  });

  return NextResponse.json({ profile });
});

// Own dashboard: contribution totals, deliveries/meals notionally supported.
// No real payment has ever run in this MVP, so amounts reflect only pledged
// (status: PENDING) sponsorships — see lib/payments.ts for why nothing here
// is fabricated as "completed".
export const GET = withErrorHandling(async () => {
  const user = await requireRole('SPONSOR');
  const profile = await db.sponsorProfile.findUnique({
    where: { userId: user.id },
    include: { sponsorships: true }
  });
  if (!profile) return NextResponse.json({ profile: null });

  const totalPledgedCents = profile.sponsorships.reduce((sum, s) => sum + s.amountCents, 0);
  const totalCompletedCents = profile.sponsorships
    .filter((s) => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.amountCents, 0);

  return NextResponse.json({
    profile: {
      displayName: profile.displayName,
      sponsorType: profile.sponsorType,
      totalPledgedCents,
      totalCompletedCents,
      sponsorships: profile.sponsorships
    }
  });
});
