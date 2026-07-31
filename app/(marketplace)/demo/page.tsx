import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Headphones,
  PackageCheck,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";

import { DemoResetClient } from "@/components/demo/demo-reset-client";
import { Button } from "@/components/ui/button";

const demoFlows = [
  {
    title: "Customer journey",
    icon: UserRound,
    summary: "Shop, checkout, track an order, open a support ticket, and receive updates.",
    steps: [
      ["Shop the marketplace", "/"],
      ["Open product discovery", "/products"],
      ["Review cart", "/cart"],
      ["Run simulated checkout", "/checkout"],
      ["Track an order", "/orders/ML-1024/tracking"],
      ["Open support and attach evidence", "/support"],
      ["Review account notifications", "/account/notifications"],
    ],
  },
  {
    title: "Vendor journey",
    icon: Store,
    summary: "Apply to sell, manage catalog and inventory, handle orders, disputes, earnings, and payouts.",
    steps: [
      ["Apply to become a vendor", "/sell"],
      ["Vendor dashboard overview", "/vendor"],
      ["Manage products", "/vendor/products"],
      ["Update inventory", "/vendor/inventory"],
      ["Review vendor orders", "/vendor/orders"],
      ["Handle disputes and evidence", "/vendor/disputes"],
      ["Request payout", "/vendor/payout-requests"],
      ["Edit store settings", "/vendor/settings"],
    ],
  },
  {
    title: "Support journey",
    icon: Headphones,
    summary: "Assign tickets, reply to customers, monitor SLA risk, approve refunds, and escalate cases.",
    steps: [
      ["Support operations queue", "/admin/support"],
      ["Admin escalation review", "/admin/escalations"],
      ["Customer support portal", "/support"],
      ["Customer notifications", "/account/notifications"],
    ],
  },
  {
    title: "Admin journey",
    icon: ShieldCheck,
    summary: "Approve vendors, moderate products, manage users, commissions, payouts, delivery, and disputes.",
    steps: [
      ["Admin overview", "/admin"],
      ["Vendor approvals", "/admin/vendors"],
      ["Product moderation", "/admin/products"],
      ["Order management", "/admin/orders"],
      ["Commission settings", "/admin/commissions"],
      ["Payout review", "/admin/payouts"],
      ["Refunds and disputes", "/admin/support"],
      ["Reports and analytics", "/admin/analytics"],
    ],
  },
];

const proofPoints = [
  {
    title: "Frontend-only prototype",
    body: "All marketplace, vendor, support, and admin flows run from local mock data and localStorage.",
    icon: FileText,
  },
  {
    title: "Multi-role simulation",
    body: "The profile menu switches between customer, vendor, support staff, and admin without authentication services.",
    icon: BadgeCheck,
  },
  {
    title: "Transaction flow coverage",
    body: "Cart, checkout, payment simulation, order tracking, refunds, disputes, evidence, and notifications are connected.",
    icon: CreditCard,
  },
  {
    title: "Operational dashboards",
    body: "Vendor and admin dashboards include charts, tables, filters, action badges, and local workflow updates.",
    icon: ClipboardList,
  },
];

const presenterScript = [
  "Start on the homepage and explain Maket Lakay as a marketplace for Haiti and the Haitian diaspora.",
  "Switch to customer and show product discovery, cart, checkout, tracking, support, and notifications.",
  "Switch to vendor and show the dashboard, products, orders, payout request, and dispute evidence workflow.",
  "Switch to support staff and show ticket assignment, replies, SLA state, refund approval, and escalation.",
  "Switch to admin and show vendor approvals, product moderation, payouts, commissions, disputes, analytics, and audit log.",
  "Close by explaining that the current version is frontend-only and prepared for future backend/API replacement.",
];

export default function DemoPage() {
  return (
    <div className="bg-white">
      <section className="border-b bg-white">
        <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">
              Presentation Mode
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-normal md:text-5xl">
              Maket Lakay demo guide
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              A guided route map for presenting the customer marketplace, vendor dashboard,
              support workflow, and admin operations in one clean walkthrough.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/">Start customer demo</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/sell">Show vendor application</Link>
              </Button>
              <DemoResetClient />
            </div>
          </div>
          <div className="border bg-muted/40 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
              Demo status
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["Customer marketplace", "Ready"],
                ["Vendor dashboard", "Ready"],
                ["Support workflow", "Ready"],
                ["Admin operations", "Ready"],
                ["Backend integrations", "Future phase"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border bg-white p-3 text-sm">
                  <span className="font-semibold">{label}</span>
                  <span className="font-black text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container space-y-10 py-10">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {proofPoints.map(({ title, body, icon: Icon }) => (
            <article key={title} className="border bg-white p-5 shadow-sm">
              <Icon className="size-7 text-primary" />
              <h2 className="mt-4 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          {demoFlows.map(({ title, summary, steps, icon: Icon }) => (
            <article key={title} className="border bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-11 items-center justify-center border bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-black tracking-normal">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {steps.map(([label, href], index) => (
                  <Link
                    key={href}
                    href={href}
                    className="grid gap-3 border bg-muted/20 p-3 text-sm transition hover:border-primary hover:bg-white sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="flex size-8 items-center justify-center border bg-white font-black text-primary">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs font-bold text-muted-foreground">{href}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <article className="border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-5 text-primary" />
              <h2 className="text-2xl font-black">Presenter script</h2>
            </div>
            <ol className="mt-5 grid gap-3">
              {presenterScript.map((step, index) => (
                <li key={step} className="grid gap-3 border bg-muted/20 p-4 text-sm sm:grid-cols-[42px_minmax(0,1fr)]">
                  <span className="flex size-8 items-center justify-center border bg-white font-black text-primary">
                    {index + 1}
                  </span>
                  <span className="leading-6 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </article>

          <aside className="border bg-primary p-5 text-primary-foreground shadow-sm">
            <ShoppingCart className="size-8" />
            <h2 className="mt-4 text-2xl font-black tracking-normal">Best first demo path</h2>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/85">
              Homepage, product details, cart, checkout, order tracking, support ticket,
              vendor dispute evidence, support queue, admin escalation, and customer notification.
            </p>
            <Button asChild className="mt-5 bg-white text-primary hover:bg-white/90">
              <Link href="/support">Open support flow</Link>
            </Button>
          </aside>
        </section>
      </main>
    </div>
  );
}
