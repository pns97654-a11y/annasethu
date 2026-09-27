import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  await requireRole('ADMIN');

  const [
    totalDonations,
    activeDonations,
    completedDonations,
    expiredDonations,
    totalOrganizations,
    activeOrganizations,
    pendingOrganizations,
    totalDonors,
    totalDeliveryPartners,
    pendingDeliveryPartners,
    totalDeliveries,
    completedDeliveries,
    mealsRescuedAgg,
    openReports
  ] = await Promise.all([
    db.donation.count(),
    db.donation.count({ where: { status: { in: ['AVAILABLE', 'REQUESTED', 'ASSIGNED', 'PICKED_UP'] } } }),
    db.donation.count({ where: { status: 'DELIVERED' } }),
    db.donation.count({ where: { status: 'EXPIRED' } }),
    db.organizationProfile.count(),
    db.organizationProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
    db.organizationProfile.count({ where: { verificationStatus: 'PENDING' } }),
    db.donorProfile.count(),
    db.deliveryPartnerProfile.count(),
    db.deliveryPartnerProfile.count({ where: { verificationStatus: 'PENDING' } }),
    db.delivery.count(),
    db.delivery.count({ where: { status: 'DELIVERED' } }),
    db.donation.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { servings: true }
    }),
    db.report.count({ where: { status: 'OPEN' } })
  ]);

  const deliveredDeliveries = await db.delivery.findMany({
    where: { status: 'DELIVERED', assignedAt: { not: null }, deliveredAt: { not: null } },
    select: { assignedAt: true, deliveredAt: true }
  });
  const avgDeliveryMinutes = deliveredDeliveries.length
    ? Math.round(
        deliveredDeliveries.reduce(
          (sum, d) => sum + (d.deliveredAt!.getTime() - d.assignedAt!.getTime()) / 60000,
          0
        ) / deliveredDeliveries.length
      )
    : null;

  return NextResponse.json({
    donations: { total: totalDonations, active: activeDonations, completed: completedDonations, expired: expiredDonations },
    organizations: { total: totalOrganizations, verified: activeOrganizations, pendingVerification: pendingOrganizations },
    donors: { total: totalDonors },
    deliveryPartners: { total: totalDeliveryPartners, pendingVerification: pendingDeliveryPartners },
    deliveries: { total: totalDeliveries, completed: completedDeliveries, avgDeliveryMinutes },
    mealsRescued: mealsRescuedAgg._sum.servings ?? 0,
    openReports
  });
});
