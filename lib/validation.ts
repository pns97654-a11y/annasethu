import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
  role: z.enum(['DONOR', 'ORGANIZATION', 'DELIVERY_PARTNER', 'SPONSOR'])
  // ADMIN accounts are never self-registered — seeded or created by an existing admin.
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const addressSchema = z.object({
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('India'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  approxAreaLabel: z.string().min(1)
});

export const createDonationSchema = z.object({
  foodName: z.string().min(2),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  dietType: z.enum(['VEG', 'NON_VEG', 'VEGAN', 'OTHER']),
  servings: z.number().int().positive(),
  approxQuantity: z.string().optional(),
  preparedAt: z.string().datetime(),
  collectionDeadline: z.string().datetime(),
  storageCondition: z.enum(['ROOM_TEMPERATURE', 'REFRIGERATED', 'FROZEN', 'HOT_HELD']),
  wasRefrigerated: z.boolean().default(false),
  allergens: z.string().optional(),
  packagingInfo: z.string().optional(),
  address: addressSchema,
  pickupInstructions: z.string().optional(),
  contactPhone: z.string().min(7),
  isAnonymous: z.boolean().default(false),
  foodSafetyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm the food-safety acknowledgement to post a donation.' })
  }),
  images: z.array(z.string()).optional() // data URLs or storage URLs
});

export const createOrganizationSchema = z.object({
  organizationName: z.string().min(2),
  organizationType: z.enum([
    'ORPHANAGE',
    'OLD_AGE_HOME',
    'SHELTER',
    'NGO',
    'COMMUNITY_KITCHEN',
    'DISASTER_RELIEF',
    'OTHER'
  ]),
  contactPersonName: z.string().min(2),
  contactPhone: z.string().min(7),
  address: addressSchema,
  peopleServed: z.number().int().positive(),
  typicalMealsRequired: z.number().int().positive(),
  operatingHours: z.string().optional()
});

export const createDeliveryPartnerSchema = z.object({
  vehicleType: z.enum(['BIKE', 'SCOOTER', 'CAR', 'VAN', 'BICYCLE', 'ON_FOOT']),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the platform terms.' })
  })
});

export const requestDonationSchema = z.object({
  servingsRequested: z.number().int().positive()
});

export const deliveryStatusSchema = z.object({
  status: z.enum([
    'ASSIGNED',
    'EN_ROUTE_TO_PICKUP',
    'PICKED_UP',
    'EN_ROUTE_TO_DROPOFF',
    'DELIVERED',
    'CANCELLED'
  ]),
  otp: z.string().optional(),
  cancellationReason: z.string().optional()
});
