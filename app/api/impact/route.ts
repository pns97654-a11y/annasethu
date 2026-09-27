import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withErrorHandling } from '@/lib/api-utils';

// Public-facing numbers only. Business rule #12: never invent impact
// statistics — every figure here is a live aggregate, never a placeholder
// constant. If the platform is brand new, these will legitimately read 0,
// and the UI should say so rather than hide behind a fake number.
export const GET = withErrorHandling(async () => {
  const [mealsRescuedAgg, deliveries, organizations, donors, cities] = await Promise.all([
    db.donation.aggregate({ where: { status: 'DELIVERED' }, _sum: { servings: true } }),
    db.delivery.count({ where: { status: 'DELIVERED' } }),
    db.organizationProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
    db.donorProfile.count(),
    db.address.findMany({ where: { donations: { some: { status: 'DELIVERED' } } }, select: { city: true }, distinct: ['city'] })
  ]);

  return NextResponse.json({
    mealsRescued: mealsRescuedAgg._sum.servings ?? 0,
    deliveriesCompleted: deliveries,
    verifiedOrganizations: organizations,
    foodDonors: donors,
    citiesCovered: cities.length,
    // Environmental impact is an estimate — methodology must be disclosed
    // wherever this figure is shown (spec section 13).
    estimatedCo2eKgAvoided: Math.round((mealsRescuedAgg._sum.servings ?? 0) * 0.5) // ~0.5kg CO2e per rescued meal, placeholder coefficient — replace with a cited methodology before publishing this number
  });
});
