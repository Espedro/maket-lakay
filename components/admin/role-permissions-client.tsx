import {
  CheckCircle2,
  CircleSlash,
  Eye,
  LifeBuoy,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RoleKey = "customer" | "vendor" | "support" | "admin";
type PermissionLevel = "full" | "limited" | "read" | "none";

const roles: Array<{
  key: RoleKey;
  label: string;
  description: string;
}> = [
  {
    key: "customer",
    label: "Customer",
    description: "Shop, checkout, track orders, manage profile, and contact support.",
  },
  {
    key: "vendor",
    label: "Vendor",
    description: "Manage own store, products, inventory, orders, earnings, and payouts.",
  },
  {
    key: "support",
    label: "Support Staff",
    description: "Work tickets, disputes, reports, and linked order/vendor context.",
  },
  {
    key: "admin",
    label: "Admin",
    description: "Full marketplace operations, approvals, payouts, permissions, and analytics.",
  },
];

const accessRows: Array<{
  area: string;
  route: string;
  customer: PermissionLevel;
  vendor: PermissionLevel;
  support: PermissionLevel;
  admin: PermissionLevel;
}> = [
  {
    area: "Marketplace shopping",
    route: "/, /products, /categories, /stores",
    customer: "full",
    vendor: "read",
    support: "read",
    admin: "read",
  },
  {
    area: "Customer account",
    route: "/account",
    customer: "full",
    vendor: "none",
    support: "none",
    admin: "none",
  },
  {
    area: "Vendor dashboard",
    route: "/vendor",
    customer: "none",
    vendor: "full",
    support: "none",
    admin: "none",
  },
  {
    area: "Support queue",
    route: "/admin/support",
    customer: "none",
    vendor: "none",
    support: "full",
    admin: "full",
  },
  {
    area: "Admin orders",
    route: "/admin/orders",
    customer: "none",
    vendor: "none",
    support: "limited",
    admin: "full",
  },
  {
    area: "Vendor and product review",
    route: "/admin/vendors, /admin/products",
    customer: "none",
    vendor: "none",
    support: "read",
    admin: "full",
  },
  {
    area: "Users, commissions, payouts, delivery, analytics",
    route: "/admin/users, /admin/commissions, /admin/payouts, /admin/delivery, /admin/analytics",
    customer: "none",
    vendor: "none",
    support: "none",
    admin: "full",
  },
  {
    area: "Audit log and permissions",
    route: "/admin/audit-log, /admin/permissions",
    customer: "none",
    vendor: "none",
    support: "none",
    admin: "full",
  },
];

const supportRules = [
  "Can assign tickets, change ticket priority/status, reply to customers, and add internal notes.",
  "Can view linked orders, vendors, stores, products, disputes, refund requests, and reports for context.",
  "Can approve support-side refund requests in this frontend simulation, but high-risk actions are audited.",
  "Cannot access users, commissions, payout requests, delivery-zone settings, analytics, audit log, or permissions.",
  "Must escalate to admin when the ticket requires account suspension, vendor enforcement, payout action, or policy override.",
];

const permissionMeta: Record<
  PermissionLevel,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  full: {
    label: "Full",
    className: "border-emerald-600 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  limited: {
    label: "Limited",
    className: "border-amber-500 bg-amber-50 text-amber-800",
    icon: ShieldCheck,
  },
  read: {
    label: "Read",
    className: "border-sky-500 bg-sky-50 text-sky-800",
    icon: Eye,
  },
  none: {
    label: "Blocked",
    className: "border-muted bg-muted/40 text-muted-foreground",
    icon: CircleSlash,
  },
};

function PermissionBadge({ level }: { level: PermissionLevel }) {
  const meta = permissionMeta[level];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex min-w-24 items-center justify-center gap-2 border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${meta.className}`}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}

export function RolePermissionsClient() {
  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Admin Controls
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              Role permissions matrix
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review the frontend access model for each local preview role. These permissions
              document the intended boundaries until real authentication and backend policy checks
              are connected later.
            </p>
          </div>
          <Badge variant="neutral">Frontend-only policy</Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => (
          <Card key={role.key}>
            <CardContent className="p-5">
              <LockKeyhole className="size-6 text-primary" />
              <h2 className="mt-3 text-xl font-black">{role.label}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {role.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Route access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-3 pr-4 font-black">Area</th>
                  <th className="py-3 pr-4 font-black">Route</th>
                  {roles.map((role) => (
                    <th key={role.key} className="py-3 pr-4 font-black">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {accessRows.map((row) => (
                  <tr key={row.area}>
                    <td className="py-4 pr-4 align-top font-black">{row.area}</td>
                    <td className="max-w-xs py-4 pr-4 align-top text-muted-foreground">
                      {row.route}
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <PermissionBadge level={row.customer} />
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <PermissionBadge level={row.vendor} />
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <PermissionBadge level={row.support} />
                    </td>
                    <td className="py-4 pr-4 align-top">
                      <PermissionBadge level={row.admin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              Support staff operating rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {supportRules.map((rule) => (
                <div key={rule} className="flex gap-3 border p-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="leading-6 text-muted-foreground">{rule}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["full", "limited", "read", "none"] as PermissionLevel[]).map((level) => (
              <div key={level} className="flex items-center justify-between gap-3 border p-3">
                <PermissionBadge level={level} />
                <p className="text-right text-xs leading-5 text-muted-foreground">
                  {level === "full"
                    ? "Can view and perform actions."
                    : level === "limited"
                      ? "Can act only in scoped workflows."
                      : level === "read"
                        ? "Can view context without management actions."
                        : "Cannot access this area."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
