import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';
import { notify } from '@/lib/notify';
import { z } from 'zod';

const bodySchema = z.object({
  decision: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().optional()
});

export const PATCH = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const admin = await requireRole('ADMIN');
  const { decision, rejectionReason } = bodySchema.parse(await req.json());

  const org = await db.organizationProfile.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await db.organizationProfile.update({
    where: { id: params.id },
    data: {
      verificationStatus: decision,
      verifiedAt: decision === 'VERIFIED' ? new Date() : null,
      verifiedByUserId: admin.id,
      rejectionReason: decision === 'REJECTED' ? rejectionReason ?? 'Not specified' : null
    }
  });

  await db.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: decision === 'VERIFIED' ? 'ORGANIZATION_VERIFIED' : 'ORGANIZATION_REJECTED',
      targetType: 'OrganizationProfile',
      targetId: org.id
    }
  });

  await notify({
    userId: org.userId,
    title: decision === 'VERIFIED' ? 'Your organization is verified ✓' : 'Organization verification update',
    body:
      decision === 'VERIFIED'
        ? 'You can now request food donations on Annasethu.'
        : `Your verification was not approved: ${rejectionReason ?? 'please contact support.'}`,
    relatedType: 'ORGANIZATION',
    relatedId: org.id
  });

  return NextResponse.json({ organization: updated });
});
