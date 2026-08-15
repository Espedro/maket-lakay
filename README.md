# Maket Lakay

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-backend-3ecf8e?logo=supabase)
![Status](https://img.shields.io/badge/status-live_on_Vercel-brightgreen)
![License](https://img.shields.io/badge/license-private-lightgrey)

Maket Lakay is a multi-vendor e-commerce marketplace for Haiti and the Haitian diaspora. It includes a customer marketplace, cart and checkout, customer account area, order tracking, a vendor dashboard, an admin dashboard, and a vendor application flow.

The project started as a frontend-only prototype backed by local mock data and browser `localStorage`. **As of this writing, nearly the entire backend is real**, backed by [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security). See [Backend status](#backend-status) below for the precise real-vs-mock breakdown.

Live: **https://maket-lakay.vercel.app** (auto-deploys from `main`)

## Tech Stack

- Next.js App Router (React 19)
- TypeScript
- Tailwind CSS
- Shadcn/UI-style component primitives + Lucide React icons
- React Hook Form + Zod
- Recharts
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — Postgres database, Auth, Row Level Security
- **Stripe** (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`) — card payments, built but dormant until API keys are added (see [Environment variables](#environment-variables))

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the environment template and fill in your Supabase project's credentials (see below):

```bash
cp .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Run quality checks (all three must pass before shipping any change):

```bash
npm run typecheck
npm run lint
npm run build
```

Start a production build locally:

```bash
npm run build
npm run start
```

## Environment Variables

Defined in `.env.example`, copied to `.env.local` for local dev and set in Vercel (Production/Preview/Development) for deploys:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Stripe (test mode keys recommended until checkout card payments are reviewed
# for production). Card payments stay disabled in the UI until both are set.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

Without Stripe keys, every other payment method (MonCash, NatCash, ACH, Zelle, a declined-test option) still works as a frontend simulation — only the "card" option is gated on real keys.

## Folder Structure

```txt
app/
  (marketplace)/        Customer marketplace routes (also /login, /signup, /sell)
  admin/                Admin dashboard routes
  vendor/               Vendor dashboard routes
  api/                  Server-only routes (currently: Stripe PaymentIntent creation)
components/
  auth/                 Account menu, session-aware UI
  account/              Customer account components
  admin/                Admin dashboard components
  checkout/             Cart and checkout components
  discovery/             Product discovery and filters
  homepage/              Marketplace homepage sections
  layout/                Marketplace and dashboard shells
  marketplace/            Shared marketplace UI
  orders/                 Order and delivery views
  payments/               Payment operations UI
  products/               Product detail UI
  support/                 Reviews, support, disputes
  ui/                      Reusable design-system primitives
  vendor/                  Vendor dashboard components
data/
  mock-data.ts            Seed/demo catalog data (still used for the 3 demo vendors/stores, 13 products, 10 categories — see below)
hooks/                    Client state hooks (some still localStorage-backed, most now Supabase-backed)
lib/
  supabase/                Supabase client factories (browser/server/public) + row<->domain-type mappers
  ...                      Domain helpers, Zod schemas, localStorage utilities
services/                  Data-access layer components call into
types/
  index.ts                 Domain types used throughout the UI
  database.ts               Generated Supabase schema types (regenerate after any migration)
public/                     Static assets
```

## Services Layer

`services/*` is the data-access layer components call into — a real API client, not a mock shim:

```txt
services/
  commissions.ts    Default + per-vendor commission rates
  delivery.ts        Delivery zones, courier assignments, tracking events, proof of delivery
  notifications.ts
  orders.ts           Orders, order items, status transitions, tracking-event history
  payments.ts
  products.ts
  reviews.ts
  support.ts          Disputes, refund requests, support tickets (customer/vendor/admin/support)
  users.ts             Profiles, addresses, wishlist
  vendor-commerce.ts    Promotions, payout requests, wallet/earnings ledger
  vendors.ts
```

Most functions are named `getReal*`/`createReal*`/`updateReal*` and call Supabase directly (client-side, RLS-enforced). A handful of flows still layer a **local-first, best-effort real sync** on top (write to `localStorage` immediately for a snappy UI, then sync to Supabase and surface a toast if that sync fails) — this pattern is used for delivery zones, commission rates, and admin order flags. Component-facing method names are intentionally stable; don't restructure them casually.

## Backend Status

Supabase project: Postgres + Auth + Row Level Security on every table (customers see their own data, vendors see their store's data via an owner/vendor/store join, admins/support see everything via a `current_role()` bypass).

### Real (backed by Supabase, RLS-enforced)

- **Auth**: real email/password sign-up and login (`/login`, `/signup`); a `profiles` row is auto-created per account via a DB trigger
- **Catalog**: products, categories, vendors, stores (public reads; vendor/admin writes)
- **Vendor onboarding**: `/sell` application → admin approval → real `vendors`/`stores` rows + role promotion
- **Vendor product management**: create/edit/inventory, scoped to the vendor's own store
- **Orders**: real order creation at checkout, status transitions (pending → ... → delivered/cancelled), admin/vendor status-change actions
- **Delivery operations**: courier assignment, status lifecycle (assigned → picked up → in transit → completed), proof of delivery, and per-order tracking-event history — all created as a vendor moves an order through its delivery states
- **Customer experience**: saved addresses, wishlist, product/store reviews — including at checkout, not just the account page
- **Vendor experience**: promotions, payout requests (customer- and admin-facing), a derived (not stored-counter) wallet/payout balance ledger, earnings history
- **Support**: the full lifecycle of disputes, refund requests, and support tickets — creation, replies, admin/vendor resolution actions, escalation and escalation resolution — across customer, vendor, admin, and support roles
- **Admin oversight**: user list + role promotion, vendor list with real sales figures and status write-back, order management (including direct refund/review flags), commission settings (default + per-vendor rate), delivery-zone management
- **Payments**: Stripe Payment Element integration for card payments (dormant until API keys are added — see [Environment variables](#environment-variables)); every other payment method remains a frontend simulation by design

### Still local/mock (deliberately, or not yet migrated)

- **Payment simulation**: MonCash, NatCash, ACH, Zelle, and a declined-test payment option are frontend-only by design — no real money moves through them regardless of Stripe key status
- **Refund ledger entries** (`RefundRecord`, the human-readable "$12 refunded because..." line items shown in admin/vendor refund history) stay local — the *state* they represent (dispute status, refund request status, order refund flag) is real; the ledger line itself is not a separate real table
- **Audit log** (`lib/audit-log.ts`) — every admin/vendor action writes a local audit entry; this was never migrated and is a separate, large undertaking if ever prioritized
- **Commission rates don't feed into payout math** — the admin-configurable rate is real and persisted, but wallet/earnings calculations still use a hardcoded 8% constant (`lib/payments.ts`); this matches the tool's original mock behavior and was a deliberate scope decision, not an oversight
- **`lib/i18n.ts`** is a stub — the UI defaults to English despite the product being aimed at a Kreyòl/French-speaking market
- Two admin components exist but are **not wired to any route** (present since the initial commit, not something introduced later): `components/admin/refunds-disputes-client.tsx` and `components/orders/admin-delivery-client.tsx`. Their data-fetching is real and correct; nothing currently links to them.
- `hooks/use-vendor-scope.ts` (vendor store/permission scoping used across `/vendor/*`) resolves stores via a local admin-management overlay, not a direct Supabase read — this works correctly for any vendor onboarded through the real `/sell` → approval flow (the only real onboarding path), by design.

### Known, explicitly deferred (needs the account owner, not a code change)

- **Stripe test-mode API keys** — add both keys from [Environment variables](#environment-variables) to `.env.local` and Vercel to activate real card payments; the code path is built and waiting
- **Production SMTP + re-enabling email confirmation** — the project's default shared SMTP has a very low send-rate limit, so "Confirm email" is currently disabled in the Supabase dashboard; deferred until closer to public launch
- **Leaked-password protection** (Supabase Auth checking new passwords against HaveIBeenPwned) — available on the Supabase **Pro plan and above**; this project is currently on the Free plan, so this needs a paid upgrade decision before it can be enabled

## Roles & Access

- **Customer**: marketplace, cart, checkout, account, orders, tracking, support
- **Vendor**: vendor dashboard — products, inventory, orders, delivery, promotions, earnings, payouts, wallet, reviews, store settings, disputes
- **Support**: shares `/admin/support`, `/admin/orders`, `/admin/vendors`, `/admin/products` with admin
- **Admin**: everything above plus vendor approvals, moderation, users, commissions, delivery-zone management, reports/analytics

Dashboard layouts (`/admin`, `/vendor`) redirect signed-out visitors to `/login` and show an access-denied banner when a signed-in account's role doesn't match the area. New sign-ups default to the `customer` role. Vendor access comes only through the real `/sell` application → admin-approval flow; admin/support access is currently granted by an existing admin promoting a user's role from `/admin/users` (or, for the very first admin on a fresh project, directly via SQL).

## Design System

The UI uses Open Sans, white main surfaces, a distinctive Maket Lakay brand color, Haitian-inspired accents, dense marketplace layouts, responsive dashboard cards, visible focus states, accessible dialogs, reusable badges, product/store cards, and responsive table/card alternatives.

The interface defaults to English. `lib/i18n.ts` keeps the structure ready for Haitian Creole and French later (see [Backend status](#backend-status)).

## Contributing Notes

- Don't put provider secrets, payment credentials, database access, or privileged admin operations in client components.
- After any Supabase schema change, regenerate `types/database.ts` and keep RLS policies as tight as the data actually requires (customer-own / vendor-own-store / admin-all is the established shape — reuse it).
- Prefer extending an existing real table/column over inventing a parallel local system; several bugs this project has hit were exactly that pattern (an admin-facing page quietly reading a disconnected local copy instead of the same real table a sibling page already writes to).
