# Maket Lakay

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss)
![Status](https://img.shields.io/badge/status-frontend_prototype-orange)
![License](https://img.shields.io/badge/license-private-lightgrey)

Maket Lakay is a frontend-only multi-vendor e-commerce marketplace prototype for Haiti and the Haitian diaspora. It includes a customer marketplace, simulated cart and checkout, customer account area, order tracking, vendor dashboard, admin dashboard, vendor application flow, and role switching.

This project intentionally uses local data and browser localStorage only. It does not connect to a database, backend service, authentication provider, real payment provider, delivery API, or external marketplace API.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Shadcn/UI-style component primitives
- Lucide React icons
- React Hook Form
- Zod
- Recharts
- Local data
- localStorage persistence

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Run quality checks:

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

## Folder Structure

```txt
app/
  (marketplace)/        Customer marketplace routes
  admin/                Admin dashboard routes
  vendor/               Vendor dashboard routes
components/
  auth/                 Account menu and role-switch UI
  account/              Customer account components
  admin/                Admin dashboard components
  checkout/             Cart and checkout components
  discovery/            Product discovery and filters
  homepage/             Marketplace homepage sections
  layout/               Marketplace and dashboard shells
  marketplace/          Shared marketplace UI
  orders/               Order and delivery views
  payments/             Simulated payment operations
  products/             Product detail UI
  support/              Reviews, support, disputes
  ui/                   Reusable design-system primitives
  vendor/               Vendor dashboard components
data/
  mock-data.ts          Typed local marketplace data
hooks/                  Client state hooks
lib/                    Domain helpers, schemas, localStorage utilities
services/               Local service abstraction layer
types/                  Shared TypeScript interfaces
public/                 Static assets
```

## Local Services

The `services/` directory provides a replaceable local data layer:

```txt
services/
  products.ts
  vendors.ts
  orders.ts
  payments.ts
  users.ts
  delivery.ts
  notifications.ts
  index.ts
```

These services return local data from `data/mock-data.ts` and wrap domain helpers from `lib/`. They are designed so a future backend can replace implementation details while preserving component-facing method names.

There are no Next.js API routes in this final frontend build.

## Local Data

Local data lives in `data/mock-data.ts` and uses shared interfaces from `types/index.ts`.

Included entities:

- Products and categories
- Vendors and stores
- Customers and addresses
- Orders and order status history
- Delivery zones, assignments, tracking events, and proof of delivery
- Payment methods, payment records, refunds, commissions, and vendor wallets
- Product reviews, store reviews, disputes, reports, support tickets, and notifications

Examples are tailored to the Haitian market and diaspora shopping flows.

## localStorage

Interactive client state is simulated with browser localStorage. The shared helper in `lib/local-storage.ts` centralizes JSON read/write behavior and safe fallback handling.

Common keys include:

- `maket-lakay-cart`
- `maket-lakay-wishlist`
- `maket-lakay-recently-viewed`
- `maket-lakay-saved-for-later`
- `maket-lakay-last-order`
- `maket-lakay-orders`
- `maket-lakay-payment-records`
- `maket-lakay-payment-webhooks`
- `maket-lakay-refund-records`
- `maket-lakay-vendor-products`
- `maket-lakay-vendor-promotions`
- `maket-lakay-vendor-payout-requests`
- `maket-lakay-vendor-store-settings`
- `maket-lakay-admin-management`
- `maket-lakay-admin-operations`
- `maket-lakay-account-profile`
- `maket-lakay-account-addresses`

All persistence is local to the browser.

## Frontend Access Flow

Authentication is real, backed by Supabase Auth (`/login`, `/signup`). A `profiles` row (with a `role` of `customer`, `vendor`, `admin`, or `support`) is created automatically for every new account via a database trigger.

Supported roles:

- Customer: marketplace, cart, checkout, account, orders, tracking
- Vendor: vendor dashboard, products, inventory, orders, earnings, payouts, settings
- Admin: vendor approvals, moderation, users, orders, delivery, refunds, reports

Dashboard layouts (`/admin`, `/vendor`) redirect signed-out visitors to `/login` and show an access-denied banner when a signed-in account's role does not match the area. New signups default to the `customer` role; vendor and admin access is granted by updating `profiles.role` (and, for vendors, an owning row in `vendors`/`stores`) directly for now — there is no self-serve elevation flow yet.

Vendor applications submitted through `/sell` are stored in `maket-lakay-admin-management`. When an admin approves an application, the app creates a local vendor, store, and vendor staff user. Approved stores appear in marketplace store lists and vendor dashboard selectors. This flow still runs on local mock data and is not yet connected to the real `vendors`/`stores` tables in Supabase.

Checkout also includes a declined test payment option. Failed payments save local payment records and webhook events, show a retry state, and do not create orders.

## Available Experiences

- Customer marketplace homepage
- Product listing, category, search, store, and product detail pages
- Multi-vendor shopping cart
- Simulated checkout and order confirmation
- Customer account dashboard
- Order tracking
- Vendor overview, products, inventory, orders, promotions, earnings, payouts, wallet, reviews, and store settings
- Admin overview, vendor management, product moderation, user management, orders, commissions, delivery, refunds, disputes, support, reports, and analytics

## Design System

The UI uses Open Sans, white main surfaces, a distinctive Maket Lakay brand color, Haitian-inspired accents, dense marketplace layouts, responsive dashboard cards, visible focus states, accessible dialogs, reusable badges, product cards, store cards, navigation, forms, empty states, loading states, and responsive table/card alternatives.

The interface defaults to English. `lib/i18n.ts` keeps the structure ready for Haitian Creole and French later.

## Future Backend Integration

When the project is ready for a real backend:

- Keep UI components calling domain helpers and `services/*`.
- Replace service implementations with real API calls.
- Move localStorage-only state into authenticated server-backed resources.
- Replace simulated payment adapters with audited payment provider integrations.
- Replace simulated delivery status with a delivery provider or internal logistics API.
- Add authentication and authorization at the app boundary.
- Add server validation that mirrors existing Zod client schemas.

Do not put provider secrets, payment credentials, database access, or privileged admin operations in client components.
