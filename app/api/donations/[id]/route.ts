import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';
import { toPublicAddress, getExactPickupAddress } from '@/lib/access-control';

export const GET = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const user = await requireUser();

  const donation = await db.donation.findUnique({
    where: { id: params.id },
    include: { address: true, category: true, images: true, donor: { include: { user: true } }, requests: true }
  });
  if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const exact = await getExactPickupAddress(donation.id, user.id, user.role);

  return NextResponse.json({
    donation: {
      ...donation,
      donor: donation.isAnonymous && donation.donor.userId !== user.id && user.role !== 'ADMIN'
        ? { businessName: 'Anonymous donor' }
        : donation.donor,
      address: exact ?? toPublicAddress(donation.address)
    }
  });
});

export const PATCH = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const donation = await db.donation.findUnique({ where: { id: params.id }, include: { donor: true } });
  if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (donation.donor.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ['description', 'pickupInstructions', 'contactPhone'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];

  // Cancellation is its own explicit action, following the donation status
  // state machine rather than a free-form status write.
  if (body.status === 'CANCELLED' && ['AVAILABLE', 'REQUESTED'].includes(donation.status)) {
    data.status = 'CANCELLED';
  }

  const updated = await db.donation.update({ where: { id: params.id }, data });
  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'DONATION_UPDATED', targetType: 'Donation', targetId: params.id }
  });

  return NextResponse.json({ donation: updated });
});

export const DELETE = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const donation = await db.donation.findUnique({ where: { id: params.id }, include: { donor: true } });
  if (!donation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (donation.donor.userId !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (!['AVAILABLE'].includes(donation.status)) {
    return NextResponse.json(
      { error: 'Only donations with no accepted requests can be deleted; cancel it instead.' },
      { status: 400 }
    );
  }

  // Soft delete via CANCELLED status rather than a hard row delete, so
  // impact statistics and audit history stay intact.
  await db.donation.update({ where: { id: params.id }, data: { status: 'CANCELLED' } });
  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'DONATION_CANCELLED', targetType: 'Donation', targetId: params.id }
  });

  return NextResponse.json({ ok: true });
});
