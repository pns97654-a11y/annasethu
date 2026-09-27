# Annasethu — Food Rescue & Donation Platform

Connects surplus food from parties, events, restaurants and hotels with
verified organizations (orphanages, shelters, NGOs, community kitchens),
using delivery partners funded by sponsors.

> **Scope of this build.** This implements **Phase 1** of the MVP priority
> order: authentication, donor donations, organization registration + admin
> verification, food requests, delivery assignment with pickup/drop-off OTP
> verification, the full status state machine, and a basic admin dashboard.
> Phase 2 items (maps, real notifications, ratings UI, sponsor dashboard,
> payments, richer impact dashboard) and Phase 3 items (recurring donors,
> smart matching, multi-city/-language, WhatsApp) are **architected for**
> (see `lib/maps.ts`, `lib/notify.ts`, `lib/payments.ts`, `lib/storage.ts`)
> but not built out. See "Known gaps" below for the honest list.

## Stack

- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes (Node.js/TypeScript)
- **Database:** SQLite for zero-config local dev, via Prisma ORM. The schema
  is Postgres-compatible — see "Switching to PostgreSQL" below.
- **Auth:** Custom signed-cookie sessions + bcrypt (see `lib/session.ts`,
  `lib/auth.ts`). Swap for NextAuth/Clerk/etc. by replacing those two files.

## Getting started

```bash
cp .env.example .env
# Edit .env: set SESSION_SECRET to a real random string, e.g.
#   openssl rand -base64 48

npm install
npm run db:push     # creates dev.db and applies the schema
npm run db:seed     # loads clearly-labeled demo data
npm run dev          # http://localhost:3000
```

All seeded demo accounts use the password `Demo@1234`. Key ones:

| Role | Email | Notes |
|---|---|---|
| Admin | `admin@demo.annasethu.test` | Verify orgs/partners, view stats |
| Donor | `donor1@demo.annasethu.test` | Has an urgent donation live |
| Organization (verified) | `org1@demo.annasethu.test` | Can request food |
| Organization (pending) | `org4@demo.annasethu.test` | Shows the verification queue |
| Delivery partner (verified) | `partner1@demo.annasethu.test` | Can accept jobs |
| Delivery partner (pending) | `partner3@demo.annasethu.test` | Shows the verification queue |
| Sponsor | `sponsor1@demo.annasethu.test` | Has a pending pledge |

Run `npm run db:seed` again any time to reset demo data (it does not clear
existing rows first — for a full reset, delete `prisma/dev.db` and re-run
`npm run db:push && npm run db:seed`).

## Trying the core workflow end-to-end

1. Log in as `donor1@demo.annasethu.test` → Donor Dashboard → open the
   urgent "Vegetable Biryani" donation.
2. Log in as `org1@demo.annasethu.test` (a different browser/incognito
   window, since sessions are cookie-based) → Organization Dashboard →
   request some servings.
3. Back as the donor → open the donation → approve the request. This
   creates a delivery job.
4. Log in as `partner1@demo.annasethu.test` → Delivery Dashboard → accept
   the open job → advance through "heading to pickup" → enter the pickup
   OTP (shown to the donor on the donation detail page) → "heading to
   drop-off" → enter the drop-off OTP (shown to the organization).
5. Check `admin@demo.annasethu.test` → Admin Dashboard → meals-rescued
   count increments once delivered.

## Switching to PostgreSQL for production

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` in `.env` to your Postgres connection string.
3. Run `npx prisma migrate dev --name init` instead of `db:push` going
   forward, so you get real migration files for deployment.

## Architecture notes

- **Address privacy** (`lib/access-control.ts`): every place that would read
  an exact address goes through `getExactPickupAddress` /
  `getExactOrgAddress`, which only return the real `Address` row to the
  owner, an admin, or a delivery partner currently assigned to that
  delivery. Everyone else gets `toPublicAddress()` — city + approximate
  area label only. This is the single enforcement point; if you add a new
  place that shows an address, route it through here rather than querying
  `Address` directly.
- **Delivery state machine** (`app/api/deliveries/[id]/status/route.ts`):
  transitions are whitelisted per current status, and `PICKED_UP` /
  `DELIVERED` require the correct one-time code. This is what implements
  business rules #5 and #9 (controlled status, no double-delivery).
- **Provider abstractions** (`lib/maps.ts`, `lib/notify.ts`,
  `lib/payments.ts`, `lib/storage.ts`): nothing else in the app talks to
  Mapbox/Twilio/Stripe/S3 directly. Wire a real provider in by editing one
  of these files; call sites don't change. `lib/payments.ts` deliberately
  throws until a real provider is configured — the MVP never fabricates a
  successful transaction.
- **Audit log**: every state-changing action writes an `AuditLog` row.
- **Soft deletion**: donations are never hard-deleted; cancellation sets
  `status = "CANCELLED"` so history and stats stay accurate.

## API documentation (summary)

All protected routes require the session cookie and enforce role via
`requireRole()` in `lib/auth.ts`. Request/response bodies are validated with
Zod (`lib/validation.ts`); a 400 response includes `details` from Zod on
validation failure.

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/auth/register` | anyone | Create account (donor/org/partner/sponsor) |
| `POST /api/auth/login` | anyone | Log in |
| `POST /api/auth/logout` | anyone | Log out |
| `GET /api/auth/me` | anyone | Current session user |
| `GET /api/donations` | anyone | List/filter available food (public-safe fields only) |
| `POST /api/donations` | donor | Create a donation |
| `GET /api/donations/:id` | logged-in | Detail, address gated per `access-control.ts` |
| `PATCH /api/donations/:id` | owner/admin | Edit or cancel |
| `DELETE /api/donations/:id` | owner/admin | Cancel (only if still `AVAILABLE`) |
| `POST /api/donations/:id/request` | verified org | Request servings |
| `PATCH /api/requests/:id` | donor/admin | Approve/reject → creates `Delivery` on approval |
| `GET /api/deliveries` | logged-in | Role-scoped list (`?scope=open`\|`mine`) |
| `PATCH /api/deliveries/:id/status` | role-dependent | Advance the delivery state machine (OTP-gated) |
| `POST /api/organizations` | org user | Submit org profile for verification |
| `GET /api/organizations` | logged-in | List (admin can filter by status) |
| `PATCH /api/organizations/:id/verify` | admin | Approve/reject |
| `POST /api/delivery-partners` | partner user | Submit partner profile for verification |
| `GET /api/delivery-partners` | admin | List (filter by status) |
| `PATCH /api/delivery-partners/:id/verify` | admin | Approve/reject |
| `GET /api/admin/stats` | admin | Platform-wide statistics |
| `GET /api/impact` | anyone | Public, real, aggregate impact numbers |

## Known gaps (honest list — not built in this pass)

- Sponsor registration + a basic sponsor dashboard (pledge totals, pledge
  list) exist, but real payment charging does not — see `lib/payments.ts`.
- No UI for: ratings after delivery, reporting a problem, organization
  document upload, recurring-donor workflow, notification center UI
  (notifications are written to the DB and ready to display, just no page
  renders them yet).
- Smart splitting of a donation across multiple organizations is supported
  at the data model + API level (multiple `DonationRequest`s against one
  `Donation`, `servingsRemaining` tracked), but there's no matching
  algorithm beyond "first approved request wins servings" — no
  distance/urgency-based auto-suggestion yet.
- No automated background job to flip `AVAILABLE`/`REQUESTED` donations to
  `EXPIRED` when their deadline passes — it's currently checked lazily
  when an organization tries to request an expired donation. A cron/queue
  job is a small addition (`db.donation.updateMany({ where: { status: {in:[...]}, collectionDeadline: { lt: new Date() } }, data: { status: 'EXPIRED' } })`).
- No automated tests yet.
- No file upload UI for donation photos / organization documents (the API
  and schema support image URLs; `lib/storage.ts` is a stub for wiring a
  real object-storage provider).
- No rate limiting beyond a simple in-memory bucket on login/register —
  fine for one instance, not for multi-instance deployment (see the note
  in `lib/api-utils.ts`).

## Deployment

This is a standard Next.js app and deploys to any Node.js host (Vercel,
Railway, Render, a VM with `pm2`, etc.). For production:

1. Switch to PostgreSQL (see above) and run real migrations.
2. Set `SESSION_SECRET`, `DATABASE_URL`, and any provider keys you wire up
   as environment variables in your host, never committed to source.
3. Run `npm run build && npm start`.
4. Put a real payment provider behind `lib/payments.ts` before accepting
   sponsor funds — the current code intentionally refuses to fabricate a
   transaction.
