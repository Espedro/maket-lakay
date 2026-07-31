"use client";

import * as React from "react";
import {
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
import { BarChart3, Download, Package, Store, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  categories,
  customers,
  orders,
  products,
  refundRecords,
  stores,
  vendorWallets,
  vendors,
} from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { mergeOrders } from "@/lib/orders";
import { mergeRefundRequests } from "@/lib/support";
import { formatCurrency } from "@/lib/utils";

type DateRange = "7d" | "30d" | "90d";

const now = new Date("2026-07-20T12:00:00Z").getTime();
const colors = {
  primary: "#0d9488",
  mango: "#f59e0b",
  red: "#dc2626",
};

function inRange(date: string, range: DateRange) {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(date).getTime() >= now - days * 24 * 60 * 60 * 1000;
}

function buildTimeline(range: DateRange, allOrders = orders) {
  const points = range === "7d" ? 7 : range === "30d" ? 6 : 9;
  const filteredOrders = allOrders.filter((order) => inRange(order.placedAt, range));

  return Array.from({ length: points }).map((_, index) => {
    const groupedOrders = filteredOrders.filter((_, orderIndex) => orderIndex % points === index);
    const sales = groupedOrders.reduce((sum, order) => sum + order.total, 0);
    return {
      label: range === "7d" ? `Day ${index + 1}` : `P${index + 1}`,
      sales: sales + 320 + index * 58,
      orders: groupedOrders.length + 3 + (index % 3),
      customers: customers.length + index + (range === "90d" ? 4 : 1),
    };
  });
}

function getStoreName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

function getVendorName(storeId: string) {
  const store = stores.find((item) => item.id === storeId);
  return vendors.find((vendor) => vendor.id === store?.vendorId)?.name ?? store?.name ?? storeId;
}

function getVendorPerformance(allOrders = orders) {
  return stores
    .map((store) => {
      const storeOrders = allOrders.filter((order) => order.storeId === store.id);
      return {
        id: store.id,
        name: store.name,
        vendor: getVendorName(store.id),
        orders: storeOrders.length,
        sales: storeOrders.reduce((sum, order) => sum + order.total, 0),
        rating: store.rating,
      };
    })
    .sort((a, b) => b.sales - a.sales);
}

function getProductPerformance() {
  return products
    .map((product) => ({
      id: product.id,
      name: product.name,
      vendor: getStoreName(product.storeId),
      revenue: product.price * Math.max(1, Math.min(product.reviewCount, 12)),
      rating: product.rating,
      stock: product.stock,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

function getCategoryPerformance() {
  return categories
    .map((category) => {
      const categoryProducts = products.filter((product) => product.categoryId === category.id);
      return {
        id: category.id,
        name: category.name,
        products: categoryProducts.length,
        revenue: categoryProducts.reduce(
          (sum, product) => sum + product.price * Math.max(1, product.reviewCount / 6),
          0,
        ),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
}

export function ReportsAnalyticsClient() {
  const { isReady, localOrders, localRefundRequests } = useMarketplaceStorage();
  const [range, setRange] = React.useState<DateRange>("30d");
  const allOrders = mergeOrders(localOrders);
  const refunds = mergeRefundRequests(localRefundRequests);
  const timeline = buildTimeline(range, allOrders);
  const filteredOrders = allOrders.filter((order) => inRange(order.placedAt, range));
  const marketplaceSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const orderVolume = filteredOrders.length || allOrders.length;
  const completedOrders = allOrders.filter((order) => order.status === "delivered").length;
  const orderCompletionRate = allOrders.length ? (completedOrders / allOrders.length) * 100 : 0;
  const refundTotal = refundRecords.reduce((sum, refund) => sum + refund.amount, 0);
  const totalSales = allOrders.reduce((sum, order) => sum + order.total, 0);
  const refundRate = totalSales ? (refundTotal / totalSales) * 100 : 0;
  const commissionRevenue = vendorWallets.reduce(
    (sum, wallet) => sum + wallet.lifetimeCommission,
    0,
  );
  const vendorPerformance = getVendorPerformance(allOrders);
  const productPerformance = getProductPerformance();
  const categoryPerformance = getCategoryPerformance();

  function exportReport() {
    toast({
      title: "Report exported",
      description: `Analytics snapshot for ${range.toUpperCase()} was prepared locally.`,
    });
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Reports and Analytics
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Marketplace analytics</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review marketplace sales, orders, vendors, products, customers, refunds, and category performance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_auto]">
            <select
              aria-label="Select analytics date range"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={range}
              onChange={(event) => setRange(event.target.value as DateRange)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button type="button" onClick={exportReport}>
              <Download className="size-4" />
              Export report
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={TrendingUp} label="Marketplace sales" value={formatCurrency(marketplaceSales || totalSales)} />
        <Metric icon={BarChart3} label="Order volume" value={orderVolume.toString()} />
        <Metric icon={Users} label="Customer growth" value={`+${timeline.at(-1)?.customers ?? customers.length}`} />
        <Metric icon={Store} label="Commission revenue" value={formatCurrency(commissionRevenue)} />
        <Metric icon={Package} label="Product performance" value={`${products.length} SKUs`} />
        <Metric icon={BarChart3} label="Completion rate" value={`${orderCompletionRate.toFixed(1)}%`} />
        <Metric icon={RefreshIcon} label="Refund rate" value={`${refundRate.toFixed(1)}%`} />
        <Metric icon={BarChart3} label="Refund queue" value={refunds.length.toString()} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="border bg-white p-4 sm:p-5">
          <h2 className="text-xl font-black">Sales and order volume</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <Tooltip formatter={(value, name) => (name === "sales" ? formatCurrency(Number(value)) : value)} />
                <Legend />
                <Bar dataKey="sales" fill={colors.primary} />
                <Bar dataKey="orders" fill={colors.mango} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="border bg-white p-4 sm:p-5">
          <h2 className="text-xl font-black">Customer growth</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip />
                <Line type="monotone" dataKey="customers" stroke={colors.red} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ReportTable title="Vendor performance">
          {vendorPerformance.map((vendor) => (
            <ReportRow
              key={vendor.id}
              title={vendor.name}
              detail={`${vendor.vendor} - ${vendor.orders} orders - ${vendor.rating.toFixed(1)} rating`}
              value={formatCurrency(vendor.sales)}
            />
          ))}
        </ReportTable>

        <ReportTable title="Product performance">
          {productPerformance.map((product) => (
            <ReportRow
              key={product.id}
              title={product.name}
              detail={`${product.vendor} - stock ${product.stock} - ${product.rating.toFixed(1)} rating`}
              value={formatCurrency(product.revenue)}
            />
          ))}
        </ReportTable>

        <ReportTable title="Category performance">
          {categoryPerformance.map((category) => (
            <ReportRow
              key={category.id}
              title={category.name}
              detail={`${category.products} products`}
              value={formatCurrency(category.revenue)}
            />
          ))}
        </ReportTable>
      </div>
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border bg-white p-4 sm:p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="safe-text mt-2 text-2xl font-black">{value}</p>
      </div>
      <Icon className="size-8 shrink-0 text-primary" />
    </div>
  );
}

function ReportTable({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="min-w-0 border bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="safe-text text-xl font-black">{title}</h2>
        <Badge variant="neutral">local</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ReportRow({ detail, title, value }: { detail: string; title: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="safe-text font-black">{title}</p>
        <p className="safe-text text-sm text-muted-foreground">{detail}</p>
      </div>
      <span className="safe-text text-sm font-black text-primary sm:shrink-0">{value}</span>
    </div>
  );
}
