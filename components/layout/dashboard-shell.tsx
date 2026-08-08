"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import * as React from "react";

import { AccountMenu } from "@/components/auth/account-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notifications } from "@/data/mock-data";
import { useAdminPayoutRequests } from "@/hooks/use-admin-payout-requests";
import { useAuth } from "@/hooks/use-auth";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { getRoleHomeHref, getRoleLabel, type AppRole } from "@/lib/auth-roles";
import { mergeOrders } from "@/lib/orders";
import { mergeDisputes, mergeMarketplaceReports, mergeRefundRequests } from "@/lib/support";
import { cn } from "@/lib/utils";
import { getPayoutRequestStoreId } from "@/lib/vendor-commerce";
import { getAllRealTickets } from "@/services/support";
import type { SupportTicket } from "@/types";

interface DashboardNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardShellProps {
  title: string;
  eyebrow: string;
  navItems: DashboardNavItem[];
  requiredRole: AppRole | AppRole[];
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  eyebrow,
  navItems,
  requiredRole,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady } = useAuth();

  React.useEffect(() => {
    if (isReady && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, user, router, pathname]);
  const { localDisputes, localOrders, localRefundRequests, localReports } = useMarketplaceStorage();
  const { payoutRequests } = useAdminPayoutRequests();
  const { scopedStoreIds } = useVendorScope();
  const [open, setOpen] = React.useState(false);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);

  React.useEffect(() => {
    if (!user) {
      setTickets([]);
      return;
    }

    getAllRealTickets().then(setTickets);
  }, [user]);

  const refunds = mergeRefundRequests(localRefundRequests);
  const disputes = mergeDisputes(localDisputes);
  const reports = mergeMarketplaceReports(localReports);
  const orders = mergeOrders(localOrders);
  const supportQueueCount =
    tickets.filter((ticket) => ticket.status !== "resolved").length +
    refunds.filter((request) => request.status === "requested").length +
    disputes.filter((dispute) => !["resolved", "closed"].includes(dispute.status)).length +
    reports.filter((report) => ["submitted", "reviewing"].includes(report.status)).length;
  const escalationCount = tickets.filter((ticket) => {
    if (ticket.escalationStatus === "pending_admin") return true;
    return (
      !ticket.escalationStatus &&
      ticket.messages.some((message) =>
        message.body.toLowerCase().includes("escalated to admin review"),
      )
    );
  }).length;
  const payoutReviewCount = payoutRequests.filter((request) =>
    ["requested", "processing"].includes(request.status),
  ).length;
  const vendorTicketCount = tickets.filter((ticket) => {
    const linkedOrder = orders.find((order) => order.id === ticket.orderId);
    const storeId = ticket.storeId ?? linkedOrder?.storeId;
    return ticket.status !== "resolved" && Boolean(storeId && scopedStoreIds.has(storeId));
  }).length;
  const vendorDisputeCount = disputes.filter(
    (dispute) =>
      scopedStoreIds.has(dispute.storeId) && !["resolved", "closed"].includes(dispute.status),
  ).length;
  const vendorOrderCount = orders.filter(
    (order) =>
      scopedStoreIds.has(order.storeId) && !["delivered", "cancelled"].includes(order.status),
  ).length;
  const vendorPayoutCount = payoutRequests.filter(
    (request) =>
      scopedStoreIds.has(getPayoutRequestStoreId(request)) &&
      ["requested", "processing"].includes(request.status),
  ).length;
  const navBadgeCounts: Record<string, number> = {
    "/admin/support": supportQueueCount,
    "/admin/escalations": escalationCount,
    "/admin/payouts": payoutReviewCount,
    "/vendor/disputes": vendorTicketCount + vendorDisputeCount,
    "/vendor/orders": vendorOrderCount,
    "/vendor/payout-requests": vendorPayoutCount,
  };
  const roleActionCount =
    user?.role === "admin"
      ? supportQueueCount + escalationCount + payoutReviewCount
      : user?.role === "support"
        ? supportQueueCount
        : user?.role === "vendor"
          ? vendorTicketCount + vendorDisputeCount + vendorOrderCount + vendorPayoutCount
          : 0;
  const unreadCount = notifications.filter((notification) => !notification.read).length + roleActionCount;
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasRoleMismatch = isReady && Boolean(user) && !allowedRoles.includes(user!.role);

  if (!isReady || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex min-h-16 items-center gap-2 border-b px-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary font-black text-primary-foreground">
          ML
        </span>
        <div>
          <p className="text-sm font-bold">Maket Lakay</p>
          <p className="text-xs text-muted-foreground">{eyebrow}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const badgeCount = navBadgeCounts[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <item.icon className="size-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badgeCount ? (
                <span
                  className={cn(
                    "ml-auto min-w-6 border px-1.5 py-0.5 text-center text-xs font-black",
                    active
                      ? "border-primary-foreground/30 bg-primary-foreground text-primary"
                      : "border-primary/20 bg-primary/10 text-primary",
                  )}
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        Frontend foundation with local data only.
      </div>
    </div>
  );

  return (
    <div className="dashboard-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-white lg:block">
        {SidebarContent}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative h-full w-80 max-w-[85vw] border-r bg-white shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </Button>
            {SidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 min-w-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {eyebrow}
              </p>
              <h1 className="truncate text-lg font-semibold">{title}</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-5" />
                  {unreadCount ? (
                    <span className="absolute -right-1 -top-1 min-w-5 border bg-destructive px-1 text-[10px] font-black leading-5 text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roleActionCount ? (
                  <DropdownMenuItem className="items-start gap-3 py-3">
                    <span className="mt-1 size-2 rounded-full bg-destructive" />
                    <span className="grid gap-1">
                      <span className="font-medium">Action needed</span>
                      <span className="text-xs text-muted-foreground">
                        {roleActionCount} dashboard items need review.
                      </span>
                    </span>
                  </DropdownMenuItem>
                ) : null}
                {notifications.slice(0, 4).map((notification) => (
                  <DropdownMenuItem key={notification.id} className="items-start gap-3 py-3">
                    <span
                      className={cn(
                        "mt-1 size-2 rounded-full",
                        notification.read ? "bg-muted" : "bg-primary",
                      )}
                    />
                    <span className="grid gap-1">
                      <span className="font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <AccountMenu dashboard />
          </div>
        </header>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          {hasRoleMismatch ? (
            <section className="grid min-h-[420px] place-items-center border bg-white p-4 text-sm">
              <div className="mx-auto max-w-xl border border-primary/30 bg-primary/5 p-6 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  Access denied
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-normal">
                  This area is for {allowedRoles.map((role) => getRoleLabel(role)).join(" or ")} users.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Your account is signed in as {user?.roleLabel}. This area needs{" "}
                  {allowedRoles.map((role) => getRoleLabel(role)).join(" or ")} access.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link href={getRoleHomeHref(user?.role ?? "customer")}>Go to my area</Link>
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
