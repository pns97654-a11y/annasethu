import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

// All demo accounts share this password so it's easy to log in and explore.
// This is clearly a dev-only convenience — never do this in production.
const DEMO_PASSWORD = 'Demo@1234';

async function hashed() {
  return bcrypt.hash(DEMO_PASSWORD, 10);
}

async function main() {
  console.log('Seeding demo data (clearly labeled — do not mistake for production data)…');

  const passwordHash = await hashed();

  // --- Admin ---
  const admin = await db.user.create({
    data: {
      email: 'admin@demo.annasethu.test',
      passwordHash,
      role: 'ADMIN',
      fullName: '[DEMO] Platform Admin',
      isVerified: true
    }
  });

  // --- Food categories ---
  const categories = await Promise.all(
    ['Cooked Meals', 'Bakery', 'Packaged Food', 'Fruits & Vegetables', 'Beverages'].map((name) =>
      db.foodCategory.create({ data: { name } })
    )
  );

  // --- Service areas ---
  const northZone = await db.serviceArea.create({ data: { city: 'Visakhapatnam', label: 'North Zone' } });

  // --- Donors ---
  const donorUsers = await Promise.all(
    [
      { email: 'donor1@demo.annasethu.test', fullName: '[DEMO] Ramesh (Wedding Host)', donorType: 'INDIVIDUAL' },
      { email: 'donor2@demo.annasethu.test', fullName: '[DEMO] Coastal Spice Hotel', donorType: 'HOTEL', businessName: 'Coastal Spice Hotel' },
      { email: 'donor3@demo.annasethu.test', fullName: '[DEMO] Green Leaf Caterers', donorType: 'CATERER', businessName: 'Green Leaf Caterers' }
    ].map(async (d) => {
      const user = await db.user.create({
        data: { email: d.email, passwordHash, role: 'DONOR', fullName: d.fullName, isVerified: true }
      });
      const profile = await db.donorProfile.create({
        data: { userId: user.id, donorType: d.donorType, businessName: d.businessName }
      });
      return { user, profile };
    })
  );

  // --- Organizations (mix of verified and pending, per spec) ---
  const orgDefs = [
    { name: '[DEMO] Sunrise Children\u2019s Home', type: 'ORPHANAGE', people: 45, meals: 90, status: 'VERIFIED' },
    { name: '[DEMO] Shanti Old Age Care', type: 'OLD_AGE_HOME', people: 30, meals: 60, status: 'VERIFIED' },
    { name: '[DEMO] Hope Community Kitchen', type: 'COMMUNITY_KITCHEN', people: 100, meals: 150, status: 'VERIFIED' },
    { name: '[DEMO] New Dawn NGO', type: 'NGO', people: 25, meals: 50, status: 'PENDING' }
  ];
  const orgs = [];
  for (let i = 0; i < orgDefs.length; i++) {
    const d = orgDefs[i];
    const user = await db.user.create({
      data: {
        email: `org${i + 1}@demo.annasethu.test`,
        passwordHash,
        role: 'ORGANIZATION',
        fullName: `[DEMO] ${d.name} Contact`,
        isVerified: true
      }
    });
    const address = await db.address.create({
      data: {
        line1: `${100 + i} Beach Road`,
        city: 'Visakhapatnam',
        country: 'India',
        approxAreaLabel: `Near Zone ${i + 1}`,
        latitude: 17.68 + i * 0.01,
        longitude: 83.2 + i * 0.01
      }
    });
    const org = await db.organizationProfile.create({
      data: {
        userId: user.id,
        organizationName: d.name,
        organizationType: d.type,
        contactPersonName: `[DEMO] Contact ${i + 1}`,
        contactPhone: `+91900000000${i}`,
        addressId: address.id,
        peopleServed: d.people,
        typicalMealsRequired: d.meals,
        operatingHours: '8 AM - 8 PM',
        serviceAreaId: northZone.id,
        verificationStatus: d.status,
        verifiedAt: d.status === 'VERIFIED' ? new Date() : null,
        verifiedByUserId: d.status === 'VERIFIED' ? admin.id : null
      }
    });
    orgs.push(org);
  }

  // --- Delivery partners (mix of verified and pending) ---
  const partnerDefs = [
    { name: '[DEMO] Arjun (Bike)', vehicle: 'BIKE', status: 'VERIFIED' },
    { name: '[DEMO] Priya (Scooter)', vehicle: 'SCOOTER', status: 'VERIFIED' },
    { name: '[DEMO] Vikram (Van)', vehicle: 'VAN', status: 'PENDING' }
  ];
  const partners = [];
  for (let i = 0; i < partnerDefs.length; i++) {
    const d = partnerDefs[i];
    const user = await db.user.create({
      data: { email: `partner${i + 1}@demo.annasethu.test`, passwordHash, role: 'DELIVERY_PARTNER', fullName: d.name, isVerified: true }
    });
    const partner = await db.deliveryPartnerProfile.create({
      data: {
        userId: user.id,
        vehicleType: d.vehicle,
        serviceAreaId: northZone.id,
        agreedToTerms: true,
        verificationStatus: d.status
      }
    });
    partners.push(partner);
  }

  // --- Sponsor ---
  const sponsorUser = await db.user.create({
    data: { email: 'sponsor1@demo.annasethu.test', passwordHash, role: 'SPONSOR', fullName: '[DEMO] BrightPath Foundation', isVerified: true }
  });
  const sponsor = await db.sponsorProfile.create({
    data: { userId: sponsorUser.id, sponsorType: 'FOUNDATION', displayName: '[DEMO] BrightPath Foundation' }
  });
  await db.sponsorship.create({
    data: { sponsorId: sponsor.id, amountCents: 500000, currency: 'INR', purpose: 'DELIVERY_COMPENSATION', status: 'PENDING' }
  });

  // --- Donations: a mix of available, in-progress, delivered, expired ---
  async function makeAddress(i: number) {
    return db.address.create({
      data: {
        line1: `${200 + i} Diamond Park Layout`,
        city: 'Visakhapatnam',
        country: 'India',
        approxAreaLabel: `Near MG Road ${i}`,
        latitude: 17.7 + i * 0.005,
        longitude: 83.22 + i * 0.005
      }
    });
  }

  // 1) AVAILABLE, urgent
  const addr1 = await makeAddress(1);
  const donation1 = await db.donation.create({
    data: {
      donorId: donorUsers[0].profile.id,
      foodName: '[DEMO] Vegetable Biryani',
      categoryId: categories[0].id,
      description: 'Leftover from a wedding reception, freshly prepared.',
      dietType: 'VEG',
      servings: 80,
      servingsRemaining: 80,
      approxQuantity: 'approx 20 kg',
      preparedAt: new Date(Date.now() - 2 * 3600 * 1000),
      collectionDeadline: new Date(Date.now() + 45 * 60 * 1000), // urgent
      storageCondition: 'HOT_HELD',
      wasRefrigerated: false,
      allergens: 'none known',
      addressId: addr1.id,
      contactPhone: '+919000000010',
      foodSafetyAcknowledged: true,
      status: 'AVAILABLE',
      isUrgent: true
    }
  });

  // 2) AVAILABLE, not urgent
  const addr2 = await makeAddress(2);
  await db.donation.create({
    data: {
      donorId: donorUsers[1].profile.id,
      foodName: '[DEMO] Assorted Bakery Items',
      categoryId: categories[1].id,
      description: 'End-of-day surplus bread and pastries.',
      dietType: 'VEG',
      servings: 40,
      servingsRemaining: 40,
      approxQuantity: 'approx 10 kg',
      preparedAt: new Date(Date.now() - 4 * 3600 * 1000),
      collectionDeadline: new Date(Date.now() + 5 * 3600 * 1000),
      storageCondition: 'ROOM_TEMPERATURE',
      wasRefrigerated: false,
      allergens: 'gluten, dairy',
      addressId: addr2.id,
      contactPhone: '+919000000011',
      foodSafetyAcknowledged: true,
      status: 'AVAILABLE',
      isUrgent: false
    }
  });

  // 3) A fully-completed workflow: DELIVERED
  const addr3 = await makeAddress(3);
  const donation3 = await db.donation.create({
    data: {
      donorId: donorUsers[2].profile.id,
      foodName: '[DEMO] Chicken Curry & Rice',
      categoryId: categories[0].id,
      dietType: 'NON_VEG',
      servings: 60,
      servingsRemaining: 0,
      preparedAt: new Date(Date.now() - 26 * 3600 * 1000),
      collectionDeadline: new Date(Date.now() - 24 * 3600 * 1000),
      storageCondition: 'REFRIGERATED',
      wasRefrigerated: true,
      addressId: addr3.id,
      contactPhone: '+919000000012',
      foodSafetyAcknowledged: true,
      status: 'DELIVERED'
    }
  });
  const request3 = await db.donationRequest.create({
    data: {
      donationId: donation3.id,
      organizationId: orgs[0].id,
      servingsRequested: 60,
      status: 'APPROVED',
      respondedAt: new Date(Date.now() - 23 * 3600 * 1000)
    }
  });
  const delivery3 = await db.delivery.create({
    data: {
      donationId: donation3.id,
      donationRequestId: request3.id,
      organizationId: orgs[0].id,
      deliveryPartnerId: partners[0].id,
      status: 'DELIVERED',
      pickupOtp: '482913',
      dropoffOtp: '719284',
      assignedAt: new Date(Date.now() - 22.5 * 3600 * 1000),
      pickedUpAt: new Date(Date.now() - 22 * 3600 * 1000),
      pickupOtpVerifiedAt: new Date(Date.now() - 22 * 3600 * 1000),
      deliveredAt: new Date(Date.now() - 21 * 3600 * 1000),
      dropoffOtpVerifiedAt: new Date(Date.now() - 21 * 3600 * 1000)
    }
  });
  await db.deliveryStatusHistory.createMany({
    data: [
      { deliveryId: delivery3.id, toStatus: 'PENDING_ASSIGNMENT' },
      { deliveryId: delivery3.id, fromStatus: 'PENDING_ASSIGNMENT', toStatus: 'ASSIGNED' },
      { deliveryId: delivery3.id, fromStatus: 'ASSIGNED', toStatus: 'PICKED_UP' },
      { deliveryId: delivery3.id, fromStatus: 'PICKED_UP', toStatus: 'DELIVERED' }
    ]
  });
  await db.deliveryPartnerProfile.update({ where: { id: partners[0].id }, data: { completedDeliveries: { increment: 1 } } });
  await db.rating.create({
    data: { deliveryId: delivery3.id, givenByUserId: donorUsers[2].user.id, targetRole: 'DELIVERY_PARTNER', stars: 5, comment: '[DEMO] Fast and careful.' }
  });

  // 4) An ASSIGNED, in-progress delivery (for the delivery dashboard demo)
  const addr4 = await makeAddress(4);
  const donation4 = await db.donation.create({
    data: {
      donorId: donorUsers[0].profile.id,
      foodName: '[DEMO] Paneer Butter Masala & Naan',
      categoryId: categories[0].id,
      dietType: 'VEG',
      servings: 50,
      servingsRemaining: 0,
      preparedAt: new Date(Date.now() - 1 * 3600 * 1000),
      collectionDeadline: new Date(Date.now() + 2 * 3600 * 1000),
      storageCondition: 'HOT_HELD',
      addressId: addr4.id,
      contactPhone: '+919000000013',
      foodSafetyAcknowledged: true,
      status: 'ASSIGNED'
    }
  });
  const request4 = await db.donationRequest.create({
    data: { donationId: donation4.id, organizationId: orgs[1].id, servingsRequested: 50, status: 'APPROVED', respondedAt: new Date() }
  });
  await db.delivery.create({
    data: {
      donationId: donation4.id,
      donationRequestId: request4.id,
      organizationId: orgs[1].id,
      status: 'PENDING_ASSIGNMENT',
      pickupOtp: '335291',
      dropoffOtp: '664710'
    }
  });

  // 5) An EXPIRED donation
  const addr5 = await makeAddress(5);
  await db.donation.create({
    data: {
      donorId: donorUsers[1].profile.id,
      foodName: '[DEMO] Fruit Platter',
      categoryId: categories[3].id,
      dietType: 'VEGAN',
      servings: 20,
      servingsRemaining: 20,
      preparedAt: new Date(Date.now() - 30 * 3600 * 1000),
      collectionDeadline: new Date(Date.now() - 5 * 3600 * 1000),
      storageCondition: 'REFRIGERATED',
      addressId: addr5.id,
      contactPhone: '+919000000014',
      foodSafetyAcknowledged: true,
      status: 'EXPIRED'
    }
  });

  console.log('\nSeed complete.');
  console.log('Demo login password for every seeded account:', DEMO_PASSWORD);
  console.log('Example logins: admin@demo.annasethu.test, donor1@demo.annasethu.test,');
  console.log('  org1@demo.annasethu.test (verified) / org4@demo.annasethu.test (pending),');
  console.log('  partner1@demo.annasethu.test (verified) / partner3@demo.annasethu.test (pending),');
  console.log('  sponsor1@demo.annasethu.test');
  console.log(`Donation "${donation1.foodName}" (id ${donation1.id}) is available and urgent — good for a live demo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => db.$disconnect());
