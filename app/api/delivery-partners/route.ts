import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { createDeliveryPartnerSchema } from '@/lib/validation';
import { withErrorHandling } from '@/lib/api-utils';

// Admin-only listing, filterable by verificationStatus (e.g. ?status=PENDING).
export const GET = withErrorHandling(async (req) => {
  await requireRole('ADMIN');
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const partners = await db.deliveryPartnerProfile.findMany({
    where: status ? { verificationStatus: status } : undefined,
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    partners: partners.map((p) => ({
      id: p.id,
      fullName: p.user.fullName,
      vehicleType: p.vehicleType,
      verificationStatus: p.verificationStatus,
      completedDeliveries: p.completedDeliveries,
      createdAt: p.createdAt
    }))
  });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireRole('DELIVERY_PARTNER');
  const existing = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: 'Profile already exists.' }, { status: 409 });

  const body = createDeliveryPartnerSchema.parse(await req.json());

  const profile = await db.deliveryPartnerProfile.create({
    data: {
      userId: user.id,
      vehicleType: body.vehicleType,
      agreedToTerms: body.agreedToTerms,
      verificationStatus: 'PENDING'
    }
  });

  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'DELIVERY_PARTNER_PROFILE_CREATED',
      targetType: 'DeliveryPartnerProfile',
      targetId: profile.id
    }
  });

  return NextResponse.json({ profile });
});
