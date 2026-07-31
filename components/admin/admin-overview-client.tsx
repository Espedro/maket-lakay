"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  HandCoins,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  Tags,
  TrendingUp,
  Users,
} from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  categories,
  customers,
  disputes,
  marketplaceReports,
  orders,
  products,
  refundRecords,
  refundRequests,
  stores,
  vendors,
  vendorWallets,
} from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useAdminManagement } from "@/hooks/use-admin-management";
import { useAdminPayoutRequests } from "@/hooks/use-admin-payout-requests";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { getAllStores, getAllVendors } from "@/lib/admin-management";
import { mergeOrders } from "@/lib/orders";
import { getPayoutRequestStoreId } from "@/lib/vendor-commerce";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, Store as StoreType, Vendor } from "@/types";

type DateRange = "7d" | "30d" | "90d";

const now = new Date("2026-07-20T12:00:00Z").getTime();
const chartColors = {
  sales: "#0d9488",
  orders: "#f59e0b",
  vendors: "#dc2626",
};

function inRange(date: string, range: DateRange) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const threshold = now - days * 24 * 60 * 60 * 1000;
  return new Date(date).getTime() >= threshold;
}

function getFilteredOrders(range: DateRange, sourceOrders: Order[] = orders) {
  return sourceOrders.filter((order) => inRange(order.placedAt, range));
}

function buildSalesData(range: DateRange, sourceOrders: Order[] = orders) {
  const filteredOrders = getFilteredOrders(range, sourceOrders);
  const points = range === "7d" ? 7 : range === "30d" ? 6 : 9;

  return Array.from({ length: points }).map((_, index) => {
    const orderSales = filteredOrders
      .filter((_, orderIndex) => orderIndex % points === index)
      .reduce((sum, order) => sum + order.total, 0);

    return {
      label: range === "7d" ? `Day ${index + 1}` : `P${index + 1}`,
      sales: orderSales + 420 + index * 68,
      commission: Math.round((orderSales + 420 + index * 68) * 0.08),
    };
  });
}

function buildOrderData(range: DateRange, sourceOrders: Order[] = orders) {
  const points = range === "7d" ? 7 : range === "30d" ? 6 : 9;
  const filteredOrders = getFilteredOrders(range, sourceOrders);

  return Array.from({ length: points }).map((_, index) => ({
    label: range === "7d" ? `Day ${index + 1}` : `P${index + 1}`,
    orders:
      filteredOrders.filter((_, orderIndex) => orderIndex % points === index).length +
      4 +
      (index % 3),
    refunds: refundRequests.filter((_, refundIndex) => refundIndex % points === index).length,
  }));
}

function buildVendorGrowthData(
  range: DateRange,
  sourceVendors: Vendor[] = vendors,
  pendingCount = vendors.filter((vendor) => vendor.verificationStatus === "pending").length,
) {
  const points = range === "7d" ? 7 : range === "30d" ? 6 : 9;

  return Array.from({ length: points }).map((_, index) => ({
    label: range === "7d" ? `Day ${index + 1}` : `P${index + 1}`,
    vendors: Math.max(1, sourceVendors.length - points + index + 1),
    approvals: pendingCount + (index % 2),
  }));
}

function getStoreName(storeId: string, sourceStores: StoreType[] = stores) {
  return sourceStores.find((store) => store.id === storeId)?.name ?? storeId;
}

function getVendorName(vendorId: string, sourceVendors: Vendor[] = vendors) {
  return sourceVendors.find((vendor) => vendor.id === vendorId)?.name ?? vendorId;
}

function getCustomerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? customerId;
}

function getTopVendors(
  sourceOrders: Order[] = orders,
  sourceStores: StoreType[] = stores,
  sourceVendors: Vendor[] = vendors,
) {
  return sourceStores
    .map((store) => {
      const storeOrders = sourceOrders.filter((order) => order.storeId === store.id);
      const sales = storeOrders.reduce((sum, order) => sum + order.total, 0);
      return {
        ...store,
        sales,
        vendorName: getVendorName(store.vendorId, sourceVendors),
      };
    })
    .sort((a, b) => b.sales + b.rating - (a.sales + a.rating));
}

function getTopCategories() {
  return categories
    .map((category) => {
      const categoryProducts = products.filter((product) => product.categoryId === category.id);
      const stock = categoryProducts.reduce((sum, product) => sum + product.stock, 0);
      return {
        ...category,
        productCount: categoryProducts.length,
        stock,
      };
    })
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 6);
}

function getActivityFeed(
  query: string,
  sourceOrders: Order[] = orders,
  sourceStores: StoreType[] = stores,
  sourceVendors: Vendor[] = vendors,
) {
  const activities = [
    ...sourceOrders.map((order) => ({
      id: `order-${order.id}`,
      title: `Order ${order.id} placed`,
      description: `${getCustomerName(order.customerId)} bought ${order.items.length} item(s) from ${getStoreName(order.storeId, sourceStores)}.`,
      date: order.placedAt,
      type: "order",
    })),
    ...sourceVendors
      .filter((vendor) => vendor.verificationStatus === "pending")
      .map((vendor) => ({
        id: `vendor-${vendor.id}`,
        title: "Vendor approval pending",
        description: `${vendor.name} needs marketplace review.`,
        date: vendor.joinedAt,
        type: "approval",
      })),
    ...disputes.map((dispute) => ({
      id: `dispute-${dispute.id}`,
      title: `Dispute ${dispute.id}`,
      description: `${getCustomerName(dispute.customerId)} requested: ${dispute.requestedResolution}`,
      date: dispute.createdAt,
      type: "dispute",
    })),
    ...marketplaceReports.map((report) => ({
      id: `report-${report.id}`,
      title: `Marketplace report ${report.id}`,
      description: `${report.targetType} report marked ${report.status}.`,
      date: report.createdAt,
      type: "report",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!query.trim()) return activities.slice(0, 6);

  const normalizedQuery = query.toLowerCase();
  return activities
    .filter(
      (activity) =>
        activity.title.toLowerCase().includes(normalizedQuery) ||
        activity.description.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, 8);
}

export function AdminOverviewClient() {
  const { isReady: adminReady, state: adminState } = useAdminManagement();
  const { isReady: payoutsReady, payoutRequests } = useAdminPayoutRequests();
  const { isReady: storageReady, localOrders, localRefundRecords } = useMarketplaceStorage();
  const allOrders = React.useMemo(() => mergeOrders(localOrders), [localOrders]);
  const allStores = getAllStores(adminState);
  const allVendors = getAllVendors(adminState);
  const pendingApplicationCount = adminState.vendorApplications.filter((application) =>
    ["submitted", "under_review"].includes(application.status),
  ).length;
  const [range, setRange] = React.useState<DateRange>("30d");
  const [query, setQuery] = React.useState("");
  const filteredOrders = getFilteredOrders(range, allOrders);
  const totalMarketplaceSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const allSales = allOrders.reduce((sum, order) => sum + order.total, 0);
  const commissionRevenue = vendorWallets.reduce(
    (sum, wallet) => sum + wallet.lifetimeCommission,
    0,
  );
  const refundTotal = [...localRefundRecords, ...refundRecords].reduce(
    (sum, refund) => sum + refund.amount,
    0,
  );
  const refundRate = allSales ? (refundTotal / allSales) * 100 : 0;
  const pendingApprovals = vendors.filter((vendor) => vendor.verificationStatus === "pending");
  const pendingDisputes = disputes.filter((dispute) =>
    ["open", "under_review"].includes(dispute.status),
  );
  const openPayoutRequests = payoutRequests
    .filter((request) => ["requested", "processing"].includes(request.status))
    .map((request) => {
      const storeId = getPayoutRequestStoreId(request);
      const store = allStores.find((item) => item.id === storeId);
      const vendor = allVendors.find((item) => item.id === store?.vendorId);

      return {
        ...request,
        storeName: store?.name ?? "Unknown store",
        vendorName: vendor?.name ?? "Unknown vendor",
      };
    });
  const openPayoutTotal = openPayoutRequests.reduce(
    (sum, request) => sum + request.amount,
    0,
  );
  const salesData = buildSalesData(range, allOrders);
  const orderData = buildOrderData(range, allOrders);
  const vendorGrowthData = buildVendorGrowthData(
    range,
    allVendors,
    pendingApprovals.length + pendingApplicationCount,
  );
  const activityFeed = getActivityFeed(query, allOrders, allStores, allVendors);
  const topVendors = getTopVendors(allOrders, allStores, allVendors);
  const topCategories = getTopCategories();

  function runQuickAction(label: string) {
    toast({
      title: `${label} queued`,
      description: "Admin action saved for this frontend preview.",
    });
  }

  const metrics = [
    {
      label: "Total marketplace sales",
      value: formatCurrency(totalMarketplaceSales || allSales),
      detail: `${range.toUpperCase()} view`,
      icon: CircleDollarSign,
    },
    { label: "Total orders", value: filteredOrders.length || allOrders.length, detail: "Order volume", icon: ClipboardCheck },
    {
      label: "Active vendors",
      value: allVendors.filter((vendor) => vendor.verificationStatus === "verified").length,
      detail: `${allVendors.length} total vendors`,
      icon: Store,
    },
    { label: "Active customers", value: customers.length, detail: "Customer accounts", icon: Users },
    {
      label: "Pending vendor approvals",
      value: pendingApprovals.length + pendingApplicationCount,
      detail: "Needs review",
      icon: ShieldAlert,
    },
    { label: "Pending disputes", value: pendingDisputes.length, detail: "Open or under review", icon: AlertCircle },
    {
      label: "Commission revenue",
      value: formatCurrency(commissionRevenue),
      detail: "Vendor wallet totals",
      icon: TrendingUp,
    },
    {
      label: "Open payouts",
      value: openPayoutRequests.length,
      detail: formatCurrency(openPayoutTotal),
      icon: HandCoins,
    },
    { label: "Refund rate", value: `${refundRate.toFixed(1)}%`, detail: formatCurrency(refundTotal), icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      {!adminReady || !storageReady || !payoutsReady ? (
        <div className="h-1 animate-pulse bg-primary" />
      ) : null}
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Admin Overview
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Marketplace control center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor marketplace sales, vendors, customers, disputes, approvals, and admin actions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[280px_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-9 shadow-none"
                placeholder="Search activity, orders, reports..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Select admin dashboard date range"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={range}
              onChange={(event) => setRange(event.target.value as DateRange)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={44} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke={chartColors.sales}
                    fill={chartColors.sales}
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke={chartColors.orders}
                    fill={chartColors.orders}
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill={chartColors.sales} />
                  <Bar dataKey="refunds" fill={chartColors.vendors} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Vendor growth chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vendorGrowthData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="vendors" stroke={chartColors.sales} strokeWidth={2} />
                  <Line type="monotone" dataKey="approvals" stroke={chartColors.vendors} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent marketplace activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityFeed.length ? (
              activityFeed.map((activity) => (
                <div key={activity.id} className="grid gap-2 border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black">{activity.title}</p>
                      <Badge variant={activity.type === "dispute" ? "destructive" : "neutral"}>
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatDate(activity.date)}</p>
                </div>
              ))
            ) : (
              <div className="border bg-muted/30 p-5 text-sm text-muted-foreground">
                No activity matches this search.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <SectionList title="Top vendors">
          {topVendors.map((store) => (
            <ListRow
              key={store.id}
              title={store.name}
              detail={`${store.vendorName} - ${store.productCount} products - ${store.rating.toFixed(1)} rating`}
              value={formatCurrency(store.sales)}
            />
          ))}
        </SectionList>

        <SectionList title="Top categories">
          {topCategories.map((category) => (
            <ListRow
              key={category.id}
              title={category.name}
              detail={`${category.productCount} products - ${category.stock} units in stock`}
              value={category.icon}
            />
          ))}
        </SectionList>

        <SectionList title="Pending approvals">
          {pendingApprovals.map((vendor) => (
            <ListRow
              key={vendor.id}
              title={vendor.name}
              detail={`${vendor.ownerName} - ${vendor.city}, ${vendor.country}`}
              value="Review"
            />
          ))}
        </SectionList>

        <SectionList title="Payout requests">
          {openPayoutRequests.length ? (
            openPayoutRequests.slice(0, 4).map((request) => (
              <ListRow
                key={request.id}
                title={request.storeName}
                detail={`${request.method} - ${request.status} - ${request.vendorName}`}
                value={formatCurrency(request.amount, request.currency)}
              />
            ))
          ) : (
            <div className="border bg-muted/30 p-4 text-sm text-muted-foreground">
              No open payout requests.
            </div>
          )}
          <Button asChild variant="outline" className="w-full rounded-none">
            <Link href="/admin/payouts">
              Review payouts
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </SectionList>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent disputes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">{dispute.id}</p>
                  <Badge variant="destructive">{dispute.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{dispute.reason}</p>
                <p className="mt-2 text-sm font-semibold">Order {dispute.orderId}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick admin actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction
              icon={Store}
              label="Review vendor approvals"
              onClick={() => runQuickAction("Vendor approvals")}
            />
            <QuickAction
              icon={Boxes}
              label="Audit product listings"
              onClick={() => runQuickAction("Product audit")}
            />
            <QuickAction
              icon={Tags}
              label="Review category performance"
              onClick={() => runQuickAction("Category report")}
            />
            <QuickAction
              icon={HandCoins}
              label="Review payout requests"
              onClick={() => runQuickAction("Payout requests")}
            />
            <QuickAction
              icon={BarChart3}
              label="Generate analytics snapshot"
              onClick={() => runQuickAction("Analytics snapshot")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{detail}</p>
        </div>
        <span className="grid size-11 place-items-center bg-secondary/40 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function SectionList({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function ListRow({ detail, title, value }: { detail: string; title: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border p-3">
      <div className="min-w-0">
        <p className="truncate font-black">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      <span className="shrink-0 text-sm font-black text-primary">{value}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="w-full justify-between rounded-none" onClick={onClick}>
      <span className="flex items-center gap-2">
        <Icon className="size-4" />
        {label}
      </span>
      <ArrowRight className="size-4" />
    </Button>
  );
}
