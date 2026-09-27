import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { deliveryStatusSchema } from '@/lib/validation';
import { withErrorHandling } from '@/lib/api-utils';
import { notify } from '@/lib/notify';

// The controlled state machine for a delivery (spec section 10 + business
// rule #5). Valid transitions:
//   PENDING_ASSIGNMENT -> ASSIGNED           (a delivery partner accepts the job)
//   ASSIGNED -> EN_ROUTE_TO_PICKUP           (partner starts moving)
//   EN_ROUTE_TO_PICKUP -> PICKED_UP          (requires correct pickupOtp)
//   PICKED_UP -> EN_ROUTE_TO_DROPOFF         (partner departs with food)
//   EN_ROUTE_TO_DROPOFF -> DELIVERED         (requires correct dropoffOtp)
//   any non-terminal -> CANCELLED
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['EN_ROUTE_TO_PICKUP', 'CANCELLED'],
  EN_ROUTE_TO_PICKUP: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['EN_ROUTE_TO_DROPOFF', 'CANCELLED'],
  EN_ROUTE_TO_DROPOFF: ['DELIVERED', 'CANCELLED']
};

export const PATCH = withErrorHandling(async (req, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const body = deliveryStatusSchema.parse(await req.json());

  const delivery = await db.delivery.findUnique({
    where: { id: params.id },
    include: { donation: { include: { donor: true } }, organization: true, deliveryPartner: true }
  });
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const allowedNext = ALLOWED_TRANSITIONS[delivery.status] ?? [];
  if (!allowedNext.includes(body.status)) {
    return NextResponse.json(
      { error: `Cannot move delivery from ${delivery.status} to ${body.status}.` },
      { status: 409 }
    );
  }

  // --- Authorization per transition ---
  if (body.status === 'ASSIGNED') {
    if (user.role !== 'DELIVERY_PARTNER') {
      return NextResponse.json({ error: 'Only a delivery partner can accept this job.' }, { status: 403 });
    }
    const partner = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } });
    if (!partner || partner.verificationStatus !== 'VERIFIED') {
      return NextResponse.json({ error: 'Only verified delivery partners can accept jobs.' }, { status: 403 });
    }
  } else {
    const isThisPartner = delivery.deliveryPartner?.userId === user.id;
    if (user.role !== 'ADMIN' && !isThisPartner) {
      // Cancellation may also be requested by the donor or org
      const isDonor = delivery.donation.donor.userId === user.id;
      const isOrg = delivery.organization.userId === user.id;
      if (!(body.status === 'CANCELLED' && (isDonor || isOrg))) {
        return NextResponse.json({ error: 'Not authorized for this transition.' }, { status: 403 });
      }
    }
  }

  // --- OTP checks ---
  if (body.status === 'PICKED_UP' && body.otp !== delivery.pickupOtp) {
    return NextResponse.json({ error: 'Incorrect pickup verification code.' }, { status: 400 });
  }
  if (body.status === 'DELIVERED' && body.otp !== delivery.dropoffOtp) {
    return NextResponse.json({ error: 'Incorrect delivery verification code.' }, { status: 400 });
  }

  const data: Record<string, unknown> = { status: body.status };
  const now = new Date();
  if (body.status === 'ASSIGNED') {
    const partner = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } });
    data.deliveryPartnerId = partner!.id;
    data.assignedAt = now;
  }
  if (body.status === 'PICKED_UP') {
    data.pickedUpAt = now;
    data.pickupOtpVerifiedAt = now;
  }
  if (body.status === 'DELIVERED') {
    data.deliveredAt = now;
    data.dropoffOtpVerifiedAt = now;
  }
  if (body.status === 'CANCELLED') {
    data.cancelledAt = now;
    data.cancellationReason = body.cancellationReason ?? 'Not specified';
  }

  await db.$transaction([
    db.delivery.update({ where: { id: delivery.id }, data }),
    db.deliveryStatusHistory.create({
      data: { deliveryId: delivery.id, fromStatus: delivery.status, toStatus: body.status }
    })
  ]);

  // Keep the parent donation's status in sync with the delivery lifecycle.
  if (body.status === 'PICKED_UP') {
    await db.donation.update({ where: { id: delivery.donationId }, data: { status: 'PICKED_UP' } });
  }
  if (body.status === 'DELIVERED') {
    await db.donation.update({ where: { id: delivery.donationId }, data: { status: 'DELIVERED' } });
    await db.deliveryPartnerProfile.update({
      where: { id: delivery.deliveryPartnerId! },
      data: { completedDeliveries: { increment: 1 } }
    });
  }

  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: `DELIVERY_${body.status}`,
      targetType: 'Delivery',
      targetId: delivery.id
    }
  });

  // Notify the relevant parties at each important transition (business
  // rule #11 / spec section 15).
  const notifyTargets: { userId: string; title: string; body: string }[] = [];
  if (body.status === 'ASSIGNED') {
    notifyTargets.push({
      userId: delivery.donation.donor.userId,
      title: 'Delivery partner assigned',
      body: `A delivery partner has been assigned to collect ${delivery.donation.foodName}.`
    });
  }
  if (body.status === 'EN_ROUTE_TO_PICKUP') {
    notifyTargets.push({
      userId: delivery.donation.donor.userId,
      title: 'Delivery partner on the way',
      body: `Your delivery partner is heading to pick up ${delivery.donation.foodName}.`
    });
  }
  if (body.status === 'EN_ROUTE_TO_DROPOFF') {
    notifyTargets.push({
      userId: delivery.organization.userId,
      title: 'Your food delivery is arriving',
      body: `${delivery.donation.foodName} is on its way to you.`
    });
  }
  if (body.status === 'DELIVERED') {
    notifyTargets.push(
      {
        userId: delivery.donation.donor.userId,
        title: 'Delivery completed',
        body: `Your donated food has been successfully delivered. Thank you!`
      },
      {
        userId: delivery.organization.userId,
        title: 'Delivery received',
        body: `${delivery.donation.foodName} has been marked delivered.`
      }
    );
  }
  for (const n of notifyTargets) {
    await notify({ ...n, relatedType: 'DELIVERY', relatedId: delivery.id });
  }

  return NextResponse.json({ ok: true, status: body.status });
});
