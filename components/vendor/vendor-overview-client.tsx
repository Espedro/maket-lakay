"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  HandCoins,
  Megaphone,
  Package,
  ReceiptText,
  Star,
  Store,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { products, vendorWallets } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { mergeOrders } from "@/lib/orders";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { CurrencyCode, Order, OrderStatus, Product } from "@/types";

type DateRangeId = "7d" | "30d" | "90d" | "all";

const dateRanges: Array<{ id: DateRangeId; label: string; days?: number }> = [
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time" },
];

const orderStatusLabels: Record<OrderStatus, string> = {
  cancelled: "Cancelled",
  confirmed: "Confirmed",
  delivered: "Delivered",
  out_for_delivery: "Out for delivery",
  pending: "Pending",
  processing: "Processing",
  ready_for_delivery: "Ready",
  shipped: "Shipped",
};

const chartColors = ["#cf2e2e", "#0d9488", "#f59e0b", "#2563eb", "#16a34a", "#7c3aed"];

function getStoreProducts(storeId: string) {
  return products.filter((product) => product.storeId === storeId);
}

function getStoreOrders(allOrders: Order[], storeId: string, rangeId: DateRangeId) {
  const selectedRange = dateRanges.find((range) => range.id === rangeId);
  const storeOrders = allOrders.filter((order) => order.storeId === storeId);

  if (!selectedRange?.days) {
    return storeOrders;
  }

  const now = new Date("2026-07-20T12:00:00Z").getTime();
  const threshold = now - selectedRange.days * 24 * 60 * 60 * 1000;

  return storeOrders.filter((order) => new Date(order.placedAt).getTime() >= threshold);
}

function buildSalesSeries(storeOrders: Order[], rangeId: DateRangeId) {
  const points = rangeId === "7d" ? 7 : rangeId === "30d" ? 6 : rangeId === "90d" ? 6 : 6;

  return Array.from({ length: points }).map((_, index) => {
    const matchingOrders = storeOrders.filter((order, orderIndex) => orderIndex % points === index);
    const total = matchingOrders.reduce((sum, order) => sum + order.total, 0);

    return {
      label: rangeId === "7d" ? `Day ${index + 1}` : `P${index + 1}`,
      sales: Math.round((total + (index + 1) * 18) * 100) / 100,
      orders: matchingOrders.length,
    };
  });
}

function buildStatusSeries(storeOrders: Order[]) {
  const statuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "ready_for_delivery",
    "out_for_delivery",
    "delivered",
  ];

  return statuses.map((status) => ({
    status: orderStatusLabels[status],
    count: storeOrders.filter((order) => order.status === status).length,
  }));
}

function getTopSellingProducts(storeOrders: Order[], storeProducts: Product[]) {
  const sales = new Map<string, { quantity: number; total: number }>();

  storeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const current = sales.get(item.productId) ?? { quantity: 0, total: 0 };
      sales.set(item.productId, {
        quantity: current.quantity + item.quantity,
        total: current.total + item.quantity * item.unitPrice,
      });
    });
  });

  const ranked = storeProducts
    .map((product) => ({
      product,
      quantity: sales.get(product.id)?.quantity ?? 0,
      total: sales.get(product.id)?.total ?? 0,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.total - a.total);

  return ranked.slice(0, 5);
}

function getLowStockProducts(storeProducts: Product[]) {
  return storeProducts
    .filter((product) => product.stock <= 15 || product.status !== "active")
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);
}

function metricTrend(value: number) {
  if (value > 5) return "+12%";
  if (value > 0) return "+4%";
  return "No change";
}

export function VendorOverviewClient() {
  const { isReady, localOrders } = useMarketplaceStorage();
  const { defaultStoreId, isReady: scopeReady, scopedStores } = useVendorScope();
  const [storeId, setStoreId] = React.useState(defaultStoreId);
  const [rangeId, setRangeId] = React.useState<DateRangeId>("30d");
  const allOrders = React.useMemo(() => mergeOrders(localOrders), [localOrders]);
  const selectedStore = scopedStores.find((store) => store.id === storeId) ?? scopedStores[0];
  const storeProducts = getStoreProducts(selectedStore.id);
  const storeOrders = getStoreOrders(allOrders, selectedStore.id, rangeId);
  const wallet = vendorWallets.find((item) => item.storeId === selectedStore.id);
  const totalSales = storeOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = storeOrders.filter((order) =>
    ["pending", "confirmed", "processing", "ready_for_delivery"].includes(order.status),
  ).length;
  const salesSeries = buildSalesSeries(storeOrders, rangeId);
  const statusSeries = buildStatusSeries(storeOrders);
  const lowStockProducts = getLowStockProducts(storeProducts);
  const topProducts = getTopSellingProducts(storeOrders, storeProducts);
  const recentOrders = storeOrders.slice(0, 6);
  const onboardingItems = [
    {
      label: "Store approved",
      done: Boolean(selectedStore.verified),
      href: "/vendor/settings",
    },
    {
      label: "Add first product",
      done: storeProducts.length > 0,
      href: "/vendor/products/new",
    },
    {
      label: "Set delivery preferences",
      done: Boolean(selectedStore.city),
      href: "/vendor/settings",
    },
    {
      label: "Review payout options",
      done: Boolean(wallet),
      href: "/vendor/payout-requests",
    },
  ];

  React.useEffect(() => {
    if (!scopeReady) return;

    if (!scopedStores.some((store) => store.id === storeId)) {
      setStoreId(defaultStoreId);
    }
  }, [defaultStoreId, scopeReady, scopedStores, storeId]);

  if (!isReady || !scopeReady || !selectedStore) {
    return (
      <div className="grid gap-4">
        <div className="h-24 animate-pulse border bg-muted" />
        <div className="h-72 animate-pulse border bg-muted" />
        <div className="h-72 animate-pulse border bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Vendor Overview
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              {selectedStore.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track sales, orders, balances, ratings, and inventory health for your
              Maket Lakay storefront.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Store
              <select
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
              >
                {scopedStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Date range
              <select
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={rangeId}
                onChange={(event) => setRangeId(event.target.value as DateRangeId)}
              >
                {dateRanges.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="border bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-black">Vendor setup checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this onboarding path after an application is approved.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/vendor/settings">Continue setup</Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {onboardingItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-start gap-3 border bg-muted/20 p-3 text-sm hover:border-primary"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 text-lakay-mango" />
              )}
              <span>
                <span className="block font-black">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.done ? "Complete" : "Needs attention"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={WalletCards}
          label="Total sales"
          value={formatCurrency(totalSales || wallet?.lifetimeSales || 0)}
          trend={metricTrend(totalSales)}
        />
        <MetricCard
          icon={ReceiptText}
          label="Total orders"
          value={storeOrders.length.toString()}
          trend={metricTrend(storeOrders.length)}
        />
        <MetricCard
          icon={Package}
          label="Pending orders"
          value={pendingOrders.toString()}
          trend={pendingOrders ? "Needs review" : "Clear"}
          tone={pendingOrders ? "warning" : "normal"}
        />
        <MetricCard
          icon={Star}
          label="Store rating"
          value={selectedStore.rating.toFixed(1)}
          trend={`${selectedStore.reviewCount} reviews`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={WalletCards}
          label="Available balance"
          value={formatCurrency(wallet?.availableBalance ?? 0)}
          trend="Ready for payout"
        />
        <MetricCard
          icon={HandCoins}
          label="Pending balance"
          value={formatCurrency(wallet?.pendingBalance ?? 0)}
          trend="Awaiting clearance"
        />
        <MetricCard
          icon={Boxes}
          label="Active products"
          value={storeProducts.filter((product) => product.status === "active").length.toString()}
          trend={`${storeProducts.length} total`}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Inventory alerts"
          value={lowStockProducts.length.toString()}
          trend={lowStockProducts.length ? "Low stock" : "Healthy"}
          tone={lowStockProducts.length ? "warning" : "normal"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sales chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesSeries} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelClassName="font-bold"
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#cf2e2e"
                    fill="#cf2e2e"
                    fillOpacity={0.16}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order-status chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusSeries} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {statusSeries.map((entry, index) => (
                      <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent orders</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/vendor/orders">View orders</Link>
            </Button>
          </CardHeader>
          <CardContent className="responsive-table-wrap">
            <table className="responsive-table min-w-[720px]">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 font-medium">Order</th>
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">City</th>
                  <th className="py-3 font-medium">Items</th>
                  <th className="py-3 font-medium">Total</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3 font-semibold">{order.id}</td>
                    <td className="py-3">{formatDate(order.placedAt)}</td>
                    <td className="py-3">{order.deliveryCity}</td>
                    <td className="py-3">{order.items.length}</td>
                    <td className="py-3">{formatCurrency(order.total, order.currency)}</td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
                {!recentOrders.length ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No orders in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickAction href="/vendor/products" icon={Package} label="Add product" />
            <QuickAction href="/vendor/inventory" icon={Boxes} label="Update inventory" />
            <QuickAction href="/vendor/promotions" icon={Megaphone} label="Create promotion" />
            <QuickAction href="/vendor/payout-requests" icon={HandCoins} label="Request payout" />
            <QuickAction href="/vendor/settings" icon={Store} label="Edit store settings" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low-stock products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockProducts.map((product) => (
              <InventoryRow key={product.id} product={product} />
            ))}
            {!lowStockProducts.length ? (
              <p className="border bg-muted/30 p-4 text-sm text-muted-foreground">
                No low-stock products for this store.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top-selling products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.map(({ product, quantity, total }) => (
              <div key={product.id} className="grid gap-2 border p-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-black">{product.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quantity} sold - {product.brand ?? "Maket Lakay"}
                  </p>
                </div>
                <p className="font-black">{formatCurrency(total || product.price, product.currency)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone = "normal",
  trend,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone?: "normal" | "warning";
  trend: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          <p className={cn("mt-2 text-xs font-bold", tone === "warning" ? "text-lakay-mango" : "text-accent")}>
            {trend}
          </p>
        </div>
        <span className="flex size-11 items-center justify-center border bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Button asChild variant="outline" className="justify-between">
      <Link href={href}>
        <span className="flex items-center gap-2">
          <Icon className="size-4" />
          {label}
        </span>
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}

function InventoryRow({ product }: { product: Product }) {
  return (
    <div className="grid gap-2 border p-3 sm:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black">{product.name}</p>
          {product.status !== "active" ? (
            <StatusBadge status={product.status} />
          ) : (
            <Badge variant={product.stock <= 5 ? "destructive" : "neutral"}>
              {product.stock} left
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {product.brand ?? "Maket Lakay"} - {formatCurrency(product.price, product.currency as CurrencyCode)}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/vendor/inventory">Update</Link>
      </Button>
    </div>
  );
}
