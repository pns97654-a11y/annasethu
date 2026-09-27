import { db } from './db';

// This module is the single place that decides who is allowed to see an
// exact pickup/drop-off address. Business rule #3 and #4 (see project spec):
// donor addresses are never public, and a delivery partner only sees the
// exact address after being assigned to that delivery. Routing every read
// of Address.line1 through here (rather than letting API routes query
// Address directly) keeps that rule enforceable in one spot.

export type PublicAddress = {
  approxAreaLabel: string;
  city: string;
};

export function toPublicAddress(address: { approxAreaLabel: string; city: string }): PublicAddress {
  return { approxAreaLabel: address.approxAreaLabel, city: address.city };
}

// Returns the exact address for a donation's pickup location, but only if
// `userId` is currently entitled to see it: the donor who owns it, an admin,
// or the delivery partner assigned to an active (non-cancelled) delivery for
// that donation.
export async function getExactPickupAddress(donationId: string, userId: string, userRole: string) {
  const donation = await db.donation.findUnique({
    where: { id: donationId },
    include: { address: true, donor: true }
  });
  if (!donation) return null;

  if (userRole === 'ADMIN') return donation.address;
  if (donation.donor.userId === userId) return donation.address;

  if (userRole === 'DELIVERY_PARTNER') {
    const partner = await db.deliveryPartnerProfile.findUnique({ where: { userId } });
    if (!partner) return null;
    const assigned = await db.delivery.findFirst({
      where: {
        donationId,
        deliveryPartnerId: partner.id,
        status: { notIn: ['CANCELLED'] }
      }
    });
    if (assigned) return donation.address;
  }

  return null; // not entitled — caller should fall back to toPublicAddress on the donation's own approx fields
}

// Same idea for an organization's exact address (its drop-off point) — only
// the org itself, admins, or an assigned delivery partner may see it.
export async function getExactOrgAddress(organizationId: string, userId: string, userRole: string) {
  const org = await db.organizationProfile.findUnique({
    where: { id: organizationId },
    include: { address: true }
  });
  if (!org) return null;

  if (userRole === 'ADMIN') return org.address;
  if (org.userId === userId) return org.address;

  if (userRole === 'DELIVERY_PARTNER') {
    const partner = await db.deliveryPartnerProfile.findUnique({ where: { userId } });
    if (!partner) return null;
    const assigned = await db.delivery.findFirst({
      where: {
        organizationId,
        deliveryPartnerId: partner.id,
        status: { notIn: ['CANCELLED'] }
      }
    });
    if (assigned) return org.address;
  }

  return null;
}
