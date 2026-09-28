import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';
import { notify } from '@/lib/notify';
import { z } from 'zod';

const bodySchema = z.object({ decision: z.enum(['VERIFIED', 'REJECTED']) });

export const PATCH = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const admin = await requireRole('ADMIN');
  const { decision } = bodySchema.parse(await req.json());

  const partner = await db.deliveryPartnerProfile.findUnique({ where: { id: params.id } });
  if (!partner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await db.deliveryPartnerProfile.update({
    where: { id: params.id },
    data: { verificationStatus: decision }
  });

  await db.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: decision === 'VERIFIED' ? 'DELIVERY_PARTNER_VERIFIED' : 'DELIVERY_PARTNER_REJECTED',
      targetType: 'DeliveryPartnerProfile',
      targetId: partner.id
    }
  });

  await notify({
    userId: partner.userId,
    title: decision === 'VERIFIED' ? 'You are verified ✓' : 'Verification update',
    body:
      decision === 'VERIFIED'
        ? 'You can now accept delivery jobs on annadharaa.'
        : 'Your delivery partner verification was not approved. Contact support for details.',
    relatedType: 'SYSTEM'
  });

  return NextResponse.json({ profile: updated });
});
