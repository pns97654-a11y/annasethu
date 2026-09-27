import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { createDonationSchema } from '@/lib/validation';
import { withErrorHandling } from '@/lib/api-utils';
import { toPublicAddress } from '@/lib/access-control';
import { notify } from '@/lib/notify';
import { storeImage } from '@/lib/storage';

// Urgent window: donations whose collection deadline is within this many
// minutes of "now" are flagged urgent (business rule #8 / spec section 8).
const URGENT_WINDOW_MINUTES = 60;

export const GET = withErrorHandling(async (req) => {
  const { searchParams } = new URL(req.url);
  const dietType = searchParams.get('dietType') ?? undefined;
  const city = searchParams.get('city') ?? undefined;
  const status = searchParams.get('status') ?? 'AVAILABLE';
  const minServings = searchParams.get('minServings');

  const donations = await db.donation.findMany({
    where: {
      status: status === 'ALL' ? undefined : status,
      dietType: dietType || undefined,
      address: city ? { city } : undefined,
      servingsRemaining: minServings ? { gte: Number(minServings) } : undefined
    },
    include: { address: true, category: true, images: true, donor: true },
    orderBy: [{ isUrgent: 'desc' }, { collectionDeadline: 'asc' }]
  });

  // Public listing: never leak exact address or donor identity if anonymous.
  const shaped = donations.map((d) => ({
    id: d.id,
    foodName: d.foodName,
    category: d.category?.name ?? null,
    description: d.description,
    dietType: d.dietType,
    servings: d.servings,
    servingsRemaining: d.servingsRemaining,
    approxQuantity: d.approxQuantity,
    preparedAt: d.preparedAt,
    collectionDeadline: d.collectionDeadline,
    storageCondition: d.storageCondition,
    allergens: d.allergens,
    isUrgent: d.isUrgent,
    status: d.status,
    donorName: d.isAnonymous ? 'Anonymous donor' : d.donor.businessName ?? 'Individual donor',
    images: d.images.map((i) => i.url),
    location: toPublicAddress(d.address)
  }));

  return NextResponse.json({ donations: shaped });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireRole('DONOR');
  const donorProfile = await db.donorProfile.findUnique({ where: { userId: user.id } });
  if (!donorProfile) {
    return NextResponse.json({ error: 'Complete your donor profile first.' }, { status: 400 });
  }

  const body = createDonationSchema.parse(await req.json());

  const deadline = new Date(body.collectionDeadline);
  if (deadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Collection deadline must be in the future.' }, { status: 400 });
  }
  const minutesToDeadline = (deadline.getTime() - Date.now()) / 60000;
  const isUrgent = minutesToDeadline <= URGENT_WINDOW_MINUTES;

  const address = await db.address.create({ data: body.address });

  const donation = await db.donation.create({
    data: {
      donorId: donorProfile.id,
      foodName: body.foodName,
      categoryId: body.categoryId,
      description: body.description,
      dietType: body.dietType,
      servings: body.servings,
      servingsRemaining: body.servings,
      approxQuantity: body.approxQuantity,
      preparedAt: new Date(body.preparedAt),
      collectionDeadline: deadline,
      storageCondition: body.storageCondition,
      wasRefrigerated: body.wasRefrigerated,
      allergens: body.allergens,
      packagingInfo: body.packagingInfo,
      addressId: address.id,
      pickupInstructions: body.pickupInstructions,
      contactPhone: body.contactPhone,
      isAnonymous: body.isAnonymous,
      isUrgent,
      foodSafetyAcknowledged: body.foodSafetyAcknowledged,
      status: 'AVAILABLE'
    }
  });

  if (body.images?.length) {
    for (const img of body.images) {
      const url = await storeImage(img, donation.id);
      await db.donationImage.create({ data: { donationId: donation.id, url } });
    }
  }

  await db.auditLog.create({
    data: { actorUserId: user.id, action: 'DONATION_CREATED', targetType: 'Donation', targetId: donation.id }
  });

  // Notify nearby verified organizations. MVP: notify all verified orgs in
  // the same city; Phase 2 narrows this by real distance via lib/maps.ts.
  const orgs = await db.organizationProfile.findMany({
    where: { verificationStatus: 'VERIFIED', address: { city: address.city } },
    include: { user: true }
  });
  for (const org of orgs) {
    await notify({
      userId: org.userId,
      title: isUrgent ? '🔴 Urgent food donation nearby' : 'New food donation nearby',
      body: `${body.servings} servings of ${body.foodName} available${isUrgent ? ' — pickup required soon' : ''}.`,
      relatedType: 'DONATION',
      relatedId: donation.id
    });
  }

  return NextResponse.json({ donation });
});
