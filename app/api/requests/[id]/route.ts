import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';
import { generateOtp } from '@/lib/otp';
import { notify } from '@/lib/notify';
import { z } from 'zod';

const bodySchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) });

// Workflow steps 3-5 from the spec: organization requests -> donor/platform
// confirms the match -> a delivery job is created (initially unassigned,
// waiting for a delivery partner to accept it in step 6).
export const PATCH = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const user = await requireRole('DONOR', 'ADMIN');
  const { decision } = bodySchema.parse(await req.json());

  const request = await db.donationRequest.findUnique({
    where: { id: params.id },
    include: { donation: { include: { donor: true } }, organization: true }
  });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.role === 'DONOR' && request.donation.donor.userId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: 'This request has already been responded to.' }, { status: 409 });
  }

  if (decision === 'REJECTED') {
    await db.donationRequest.update({
      where: { id: request.id },
      data: { status: 'REJECTED', respondedAt: new Date() }
    });
    await notify({
      userId: request.organization.userId,
      title: 'Request declined',
      body: `Your request for ${request.donation.foodName} was not accepted.`,
      relatedType: 'REQUEST',
      relatedId: request.id
    });
    return NextResponse.json({ ok: true });
  }

  // APPROVED path: guard against approving more than remains (in case of a
  // race with another approved request on the same donation).
  const donation = request.donation;
  if (request.servingsRequested > donation.servingsRemaining) {
    return NextResponse.json(
      { error: `Only ${donation.servingsRemaining} servings remain — cannot approve this request.` },
      { status: 409 }
    );
  }

  const [, delivery] = await db.$transaction([
    db.donationRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED', respondedAt: new Date() }
    }),
    db.delivery.create({
      data: {
        donationId: donation.id,
        donationRequestId: request.id,
        organizationId: request.organizationId,
        status: 'PENDING_ASSIGNMENT',
        pickupOtp: generateOtp(),
        dropoffOtp: generateOtp()
      }
    })
  ]);

  const servingsRemaining = donation.servingsRemaining - request.servingsRequested;
  await db.donation.update({
    where: { id: donation.id },
    data: {
      servingsRemaining,
      status: servingsRemaining <= 0 ? 'ASSIGNED' : 'REQUESTED'
    }
  });

  await db.deliveryStatusHistory.create({
    data: { deliveryId: delivery.id, toStatus: 'PENDING_ASSIGNMENT' }
  });

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'REQUEST_APPROVED', targetType: 'Delivery', targetId: delivery.id }
  });

  await notify({
    userId: request.organization.userId,
    title: 'Your request was accepted',
    body: `${request.servingsRequested} servings of ${donation.foodName} are being arranged for delivery.`,
    relatedType: 'DELIVERY',
    relatedId: delivery.id
  });

  return NextResponse.json({ delivery });
});
