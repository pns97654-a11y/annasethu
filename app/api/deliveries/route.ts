import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';
import { toPublicAddress } from '@/lib/access-control';

// Returns deliveries scoped to the caller's role:
// - DELIVERY_PARTNER with no assignment yet: open jobs awaiting a partner
//   (PENDING_ASSIGNMENT), plus their own active/past jobs.
// - DONOR: deliveries for their own donations.
// - ORGANIZATION: deliveries headed to them.
// - ADMIN: everything.
export const GET = withErrorHandling(async (req) => {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope'); // "open" | "mine"

  let where: any = {};

  if (user.role === 'DELIVERY_PARTNER') {
    const partner = await db.deliveryPartnerProfile.findUnique({ where: { userId: user.id } });
    if (!partner) return NextResponse.json({ deliveries: [] });
    where = scope === 'open' ? { status: 'PENDING_ASSIGNMENT' } : { deliveryPartnerId: partner.id };
  } else if (user.role === 'DONOR') {
    const donor = await db.donorProfile.findUnique({ where: { userId: user.id } });
    if (!donor) return NextResponse.json({ deliveries: [] });
    where = { donation: { donorId: donor.id } };
  } else if (user.role === 'ORGANIZATION') {
    const org = await db.organizationProfile.findUnique({ where: { userId: user.id } });
    if (!org) return NextResponse.json({ deliveries: [] });
    where = { organizationId: org.id };
  } else if (user.role !== 'ADMIN') {
    return NextResponse.json({ deliveries: [] });
  }

  const deliveries = await db.delivery.findMany({
    where,
    include: {
      donation: { include: { address: true } },
      organization: { include: { address: true } },
      deliveryPartner: { include: { user: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Never leak the pickup/dropoff OTP or exact addresses to a party who
  // isn't entitled to them (see lib/access-control.ts for the full rule;
  // this list route keeps it lightweight since only a partner *assigned*
  // to the job should ever see the pickup address at all).
  const shaped = deliveries.map((d) => {
    const isAssignedPartner =
      user.role === 'DELIVERY_PARTNER' && d.deliveryPartner?.userId === user.id;
    const isDonorOrAdmin = user.role === 'DONOR' || user.role === 'ADMIN';
    const isOrgOrAdmin = user.role === 'ORGANIZATION' || user.role === 'ADMIN';

    return {
      id: d.id,
      status: d.status,
      foodName: d.donation.foodName,
      servings: d.donationRequestId ? undefined : undefined,
      organizationName: d.organization ? undefined : undefined,
      pickupAddress:
        isAssignedPartner || isDonorOrAdmin ? d.donation.address : toPublicAddress(d.donation.address),
      dropoffAddress:
        isAssignedPartner || isOrgOrAdmin ? d.organization.address : toPublicAddress(d.organization.address),
      pickupOtp: isAssignedPartner || isDonorOrAdmin ? d.pickupOtp : undefined,
      dropoffOtp: isAssignedPartner || isOrgOrAdmin ? d.dropoffOtp : undefined,
      assignedAt: d.assignedAt,
      pickedUpAt: d.pickedUpAt,
      deliveredAt: d.deliveredAt,
      createdAt: d.createdAt,
      deliveryPartnerName: d.deliveryPartner?.user.fullName ?? null
    };
  });

  return NextResponse.json({ deliveries: shaped });
});
