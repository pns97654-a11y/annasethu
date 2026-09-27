import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { requestDonationSchema } from '@/lib/validation';
import { withErrorHandling } from '@/lib/api-utils';
import { notify } from '@/lib/notify';

// Business rules enforced here:
// 1. Only verified organizations can request food.
// 2. Expired donations cannot be requested.
// 9. A donation cannot be delivered twice (servingsRemaining tracks this,
//    and the donation is fully claimed once servingsRemaining hits 0).
export const POST = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const user = await requireRole('ORGANIZATION');
  const org = await db.organizationProfile.findUnique({ where: { userId: user.id } });
  if (!org) return NextResponse.json({ error: 'Complete your organization profile first.' }, { status: 400 });
  if (org.verificationStatus !== 'VERIFIED') {
    return NextResponse.json(
      { error: 'Your organization must be verified by an administrator before requesting food.' },
      { status: 403 }
    );
  }

  const body = requestDonationSchema.parse(await req.json());

  const donation = await db.donation.findUnique({ where: { id: params.id } });
  if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (donation.collectionDeadline.getTime() <= Date.now() && donation.status !== 'EXPIRED') {
    await db.donation.update({ where: { id: donation.id }, data: { status: 'EXPIRED' } });
  }
  if (!['AVAILABLE', 'REQUESTED'].includes(donation.status)) {
    return NextResponse.json({ error: 'This donation is no longer available to request.' }, { status: 409 });
  }
  if (body.servingsRequested > donation.servingsRemaining) {
    return NextResponse.json(
      { error: `Only ${donation.servingsRemaining} servings remain on this donation.` },
      { status: 400 }
    );
  }

  const request = await db.donationRequest.create({
    data: {
      donationId: donation.id,
      organizationId: org.id,
      servingsRequested: body.servingsRequested
    }
  });

  if (donation.status === 'AVAILABLE') {
    await db.donation.update({ where: { id: donation.id }, data: { status: 'REQUESTED' } });
  }

  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'DONATION_REQUESTED',
      targetType: 'DonationRequest',
      targetId: request.id
    }
  });

  const donor = await db.donorProfile.findUnique({ where: { id: donation.donorId }, include: { user: true } });
  if (donor) {
    await notify({
      userId: donor.userId,
      title: 'Your donation has a request',
      body: `${org.organizationName} requested ${body.servingsRequested} servings of ${donation.foodName}.`,
      relatedType: 'REQUEST',
      relatedId: request.id
    });
  }

  return NextResponse.json({ request });
});
