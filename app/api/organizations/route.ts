import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, requireUser } from '@/lib/auth';
import { createOrganizationSchema } from '@/lib/validation';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async (req) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  // Only admins can browse everyone; orgs/others just get verified public list.
  const where =
    user.role === 'ADMIN' && status ? { verificationStatus: status } : { verificationStatus: 'VERIFIED' };

  const organizations = await db.organizationProfile.findMany({
    where,
    include: { address: true, user: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    organizations: organizations.map((o) => ({
      id: o.id,
      organizationName: o.organizationName,
      organizationType: o.organizationType,
      verificationStatus: o.verificationStatus,
      city: o.address.city,
      peopleServed: o.peopleServed,
      createdAt: o.createdAt
    }))
  });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireRole('ORGANIZATION');
  const existing = await db.organizationProfile.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: 'Organization profile already exists.' }, { status: 409 });
  }

  const body = createOrganizationSchema.parse(await req.json());
  const address = await db.address.create({ data: body.address });

  const org = await db.organizationProfile.create({
    data: {
      userId: user.id,
      organizationName: body.organizationName,
      organizationType: body.organizationType,
      contactPersonName: body.contactPersonName,
      contactPhone: body.contactPhone,
      addressId: address.id,
      peopleServed: body.peopleServed,
      typicalMealsRequired: body.typicalMealsRequired,
      operatingHours: body.operatingHours,
      verificationStatus: 'PENDING'
    }
  });

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'ORGANIZATION_PROFILE_CREATED', targetType: 'OrganizationProfile', targetId: org.id }
  });

  return NextResponse.json({ organization: org });
});
