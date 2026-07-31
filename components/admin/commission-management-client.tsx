"use client";

import * as React from "react";
import { CheckCircle2, CircleDollarSign, Percent, Save, Search, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { categories, products, stores, vendors, vendorWallets } from "@/data/mock-data";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { mergeOrders } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types";

type CommissionAction =
  | { type: "default"; rate: number }
  | { type: "vendor"; vendorId: string; vendorName: string; rate: number };

type DateFilter = "all" | "today" | "7d" | "30d" | "90d" | "2026" | "2025";
type SalesFilter = "all" | "no-sales" | "under-100" | "100-plus";
type RateFilter = "all" | "below-default" | "default" | "above-default";

const dateOptions: Array<{ label: string; value: DateFilter; days?: number; year?: number }> = [
  { label: "Any join date", value: "all" },
  { label: "Joined today", value: "today" },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Joined in 2026", value: "2026", year: 2026 },
  { label: "Joined in 2025", value: "2025", year: 2025 },
];

const referenceDate = new Date("2026-07-23T12:00:00-04:00");

function getVendorStoreIds(vendorId: string) {
  return stores.filter((store) => store.vendorId === vendorId).map((store) => store.id);
}

function getVendorSales(vendorId: string, sourceOrders: Order[]) {
  const vendorStoreIds = stores.filter((store) => store.vendorId === vendorId).map((store) => store.id);
  return sourceOrders
    .filter((order) => vendorStoreIds.includes(order.storeId))
    .reduce((sum, order) => sum + order.total, 0);
}

function getVendorOrders(vendorId: string, sourceOrders: Order[]) {
  const vendorStoreIds = getVendorStoreIds(vendorId);
  return sourceOrders.filter((order) => vendorStoreIds.includes(order.storeId));
}

function getWalletCommission(vendorId: string) {
  return vendorWallets
    .filter((wallet) => wallet.vendorId === vendorId)
    .reduce((sum, wallet) => sum + wallet.lifetimeCommission, 0);
}

function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

function getVendorCategoryIds(vendorId: string) {
  const vendorStoreIds = new Set(getVendorStoreIds(vendorId));
  return Array.from(
    new Set(
      products
        .filter((product) => vendorStoreIds.has(product.storeId))
        .map((product) => product.categoryId),
    ),
  );
}

function getOrderVendorId(order: Order) {
  return stores.find((store) => store.id === order.storeId)?.vendorId ?? "";
}

function getOrderCategoryIds(order: Order) {
  const itemCategoryIds = order.items
    .map((item) => products.find((product) => product.id === item.productId)?.categoryId)
    .filter(Boolean) as string[];

  if (itemCategoryIds.length) {
    return Array.from(new Set(itemCategoryIds));
  }

  return Array.from(
    new Set(
      products
        .filter((product) => product.storeId === order.storeId)
        .map((product) => product.categoryId),
    ),
  );
}

function getOrderCategoryNames(order: Order) {
  return getOrderCategoryIds(order).map(getCategoryName);
}

function getOrderVendorName(order: Order) {
  const vendorId = getOrderVendorId(order);
  return vendors.find((vendor) => vendor.id === vendorId)?.name ?? order.storeId;
}

function getCommissionAmount(amount: number, rate: number) {
  return amount * (rate / 100);
}

function isValidRate(rate: number) {
  return Number.isFinite(rate) && rate >= 0 && rate <= 30;
}

function matchesDate(joinedAt: string, filter: DateFilter) {
  if (filter === "all") return true;

  const joinedDate = new Date(joinedAt);
  if (Number.isNaN(joinedDate.getTime())) return false;

  if (filter === "today") {
    return joinedDate.toDateString() === referenceDate.toDateString();
  }

  const option = dateOptions.find((item) => item.value === filter);

  if (option?.year) {
    return joinedDate.getFullYear() === option.year;
  }

  if (!option?.days) return true;

  const threshold = referenceDate.getTime() - option.days * 24 * 60 * 60 * 1000;
  return joinedDate.getTime() >= threshold;
}

export function CommissionManagementClient() {
  const {
    isReady,
    state,
    updateDefaultCommissionRate,
    updateVendorCommissionRate,
  } = useAdminOperations();
  const { isReady: storageReady, localOrders } = useMarketplaceStorage();
  const [defaultRate, setDefaultRate] = React.useState("8");
  const [vendorRates, setVendorRates] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [salesFilter, setSalesFilter] = React.useState<SalesFilter>("all");
  const [rateFilter, setRateFilter] = React.useState<RateFilter>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [pendingAction, setPendingAction] = React.useState<CommissionAction | null>(null);
  const marketplaceOrders = React.useMemo(() => mergeOrders(localOrders), [localOrders]);
  const parsedDefaultRate = Number(defaultRate || 0);
  const hasActiveFilters =
    query.trim() !== "" ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    salesFilter !== "all" ||
    rateFilter !== "all" ||
    dateFilter !== "all";

  React.useEffect(() => {
    if (!isReady) return;
    setDefaultRate(String(state.commissionSettings.defaultRate));
    setVendorRates(
      vendors.reduce<Record<string, string>>((rates, vendor) => {
        rates[vendor.id] = String(
          state.commissionSettings.vendorRates[vendor.id] ?? state.commissionSettings.defaultRate,
        );
        return rates;
      }, {}),
    );
  }, [isReady, state.commissionSettings.defaultRate, state.commissionSettings.vendorRates]);

  const marketplaceGross = marketplaceOrders.reduce((sum, order) => sum + order.total, 0);
  const walletCommission = vendorWallets.reduce((sum, wallet) => sum + wallet.lifetimeCommission, 0);
  const vendorRows = vendors.map((vendor) => {
    const rate = state.commissionSettings.vendorRates[vendor.id] ?? state.commissionSettings.defaultRate;
    const proposedRate = Number(vendorRates[vendor.id] || rate);
    const grossSales = getVendorSales(vendor.id, marketplaceOrders);
    const categoryIds = getVendorCategoryIds(vendor.id);
    const categoryNames = categoryIds.map(getCategoryName);
    const orderCount = getVendorOrders(vendor.id, marketplaceOrders).length;
    const projectedCommission = getCommissionAmount(grossSales, rate);
    const previewCommission = getCommissionAmount(grossSales, isValidRate(proposedRate) ? proposedRate : rate);

    return {
      ...vendor,
      categoryIds,
      categoryNames,
      grossSales,
      orderCount,
      projectedCommission,
      previewCommission,
      payout: grossSales - projectedCommission,
      proposedRate,
      rate,
      walletCommission: getWalletCommission(vendor.id),
    };
  });
  const filteredVendorRows = vendorRows.filter((vendor) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      vendor.name.toLowerCase().includes(normalizedQuery) ||
      vendor.ownerName.toLowerCase().includes(normalizedQuery) ||
      vendor.categoryNames.join(" ").toLowerCase().includes(normalizedQuery);
    const matchesCategory = categoryFilter === "all" || vendor.categoryIds.includes(categoryFilter);
    const matchesStatus = statusFilter === "all" || vendor.verificationStatus === statusFilter;
    const matchesJoinedDate = matchesDate(vendor.joinedAt, dateFilter);
    const matchesSales =
      salesFilter === "all" ||
      (salesFilter === "no-sales" && vendor.grossSales === 0) ||
      (salesFilter === "under-100" && vendor.grossSales > 0 && vendor.grossSales < 100) ||
      (salesFilter === "100-plus" && vendor.grossSales >= 100);
    const matchesRate =
      rateFilter === "all" ||
      (rateFilter === "below-default" && vendor.rate < state.commissionSettings.defaultRate) ||
      (rateFilter === "default" && vendor.rate === state.commissionSettings.defaultRate) ||
      (rateFilter === "above-default" && vendor.rate > state.commissionSettings.defaultRate);

    return matchesQuery && matchesCategory && matchesStatus && matchesJoinedDate && matchesSales && matchesRate;
  });
  const projectedCommission = vendorRows.reduce((sum, vendor) => sum + vendor.projectedCommission, 0);
  const defaultRatePreviewCommission = isValidRate(parsedDefaultRate)
    ? getCommissionAmount(marketplaceGross, parsedDefaultRate)
    : projectedCommission;
  const defaultRatePreviewDelta = defaultRatePreviewCommission - projectedCommission;
  const orderBreakdowns = marketplaceOrders.map((order) => {
    const vendorId = getOrderVendorId(order);
    const vendorRate = state.commissionSettings.vendorRates[vendorId] ?? state.commissionSettings.defaultRate;
    const commission = getCommissionAmount(order.subtotal, vendorRate);

    return {
      order,
      categoryNames: getOrderCategoryNames(order),
      commission,
      rate: vendorRate,
      vendorName: getOrderVendorName(order),
      vendorPayout: order.subtotal - commission,
    };
  });

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSalesFilter("all");
    setRateFilter("all");
    setDateFilter("all");
  }

  function confirmAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "default") {
      updateDefaultCommissionRate(pendingAction.rate);
    } else {
      updateVendorCommissionRate(
        pendingAction.vendorId,
        pendingAction.vendorName,
        pendingAction.rate,
      );
    }

    setPendingAction(null);
  }

  if (!isReady || !storageReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Commission Management
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Commissions</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage marketplace commission settings, vendor-specific rates, and revenue history.
            </p>
          </div>
          <div className="border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Default commission rate</p>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <Input
                className="rounded-none shadow-none"
                min="0"
                max="30"
                step="0.1"
                type="number"
                value={defaultRate}
                onChange={(event) => setDefaultRate(event.target.value)}
              />
              <Button
                type="button"
                disabled={!isValidRate(parsedDefaultRate)}
                onClick={() =>
                  setPendingAction({ type: "default", rate: parsedDefaultRate })
                }
              >
                <Save className="size-4" />
                Save
              </Button>
            </div>
            <div className="mt-3 grid gap-2 border-t pt-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Preview revenue</span>
                <strong>{formatCurrency(defaultRatePreviewCommission)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Projected change</span>
                <strong className={defaultRatePreviewDelta >= 0 ? "text-lakay-palm" : "text-destructive"}>
                  {defaultRatePreviewDelta >= 0 ? "+" : ""}
                  {formatCurrency(defaultRatePreviewDelta)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile icon={CircleDollarSign} label="Marketplace gross" value={formatCurrency(marketplaceGross)} />
        <SummaryTile icon={Percent} label="Default rate" value={`${state.commissionSettings.defaultRate}%`} />
        <SummaryTile icon={CircleDollarSign} label="Wallet commission" value={formatCurrency(walletCommission)} />
        <SummaryTile icon={CircleDollarSign} label="Projected revenue" value={formatCurrency(projectedCommission)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="border bg-white p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Store className="size-5 text-primary" />
              <h2 className="text-xl font-black">Vendor-specific commission rates</h2>
            </div>
            <Badge variant="neutral">{filteredVendorRows.length} vendors shown</Badge>
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_160px_160px_160px_170px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-9 shadow-none"
                placeholder="Search vendor..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter commissions by category"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter commissions by vendor status"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unverified">Unverified</option>
            </select>
            <select
              aria-label="Filter commissions by sales volume"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={salesFilter}
              onChange={(event) => setSalesFilter(event.target.value as SalesFilter)}
            >
              <option value="all">All sales</option>
              <option value="no-sales">No sales</option>
              <option value="under-100">Under $100</option>
              <option value="100-plus">$100+</option>
            </select>
            <select
              aria-label="Filter commissions by rate"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={rateFilter}
              onChange={(event) => setRateFilter(event.target.value as RateFilter)}
            >
              <option value="all">All rates</option>
              <option value="below-default">Below default</option>
              <option value="default">At default</option>
              <option value="above-default">Above default</option>
            </select>
            <select
              aria-label="Filter commissions by vendor join date"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
            >
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Filter by vendor, category, account status, sales volume, current rate, or join date.
            </p>
            <Button type="button" variant="outline" size="sm" disabled={!hasActiveFilters} onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
          <div className="responsive-table-wrap">
            <table className="responsive-table min-w-[1120px]">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 font-medium">Vendor</th>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Gross sales</th>
                  <th className="py-3 font-medium">Orders</th>
                  <th className="py-3 font-medium">Wallet commission</th>
                  <th className="py-3 font-medium">Projected payout</th>
                  <th className="py-3 font-medium">Rate</th>
                  <th className="py-3 font-medium">Preview</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendorRows.map((vendor) => (
                  <tr key={vendor.id} className="border-b last:border-0">
                    <td className="py-3">
                      <p className="font-black">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.ownerName} - joined {formatDate(vendor.joinedAt)}
                      </p>
                    </td>
                    <td className="py-3">{vendor.categoryNames.join(", ") || "Uncategorized"}</td>
                    <td className="py-3">
                      <Badge variant={vendor.verificationStatus === "verified" ? "success" : "neutral"}>
                        {vendor.verificationStatus}
                      </Badge>
                    </td>
                    <td className="py-3">{formatCurrency(vendor.grossSales)}</td>
                    <td className="py-3">{vendor.orderCount}</td>
                    <td className="py-3">{formatCurrency(vendor.walletCommission)}</td>
                    <td className="py-3">{formatCurrency(vendor.payout)}</td>
                    <td className="py-3">
                      <Input
                        className="h-9 w-24 rounded-none shadow-none"
                        min="0"
                        max="30"
                        step="0.1"
                        type="number"
                        value={vendorRates[vendor.id] ?? ""}
                        onChange={(event) =>
                          setVendorRates((currentRates) => ({
                            ...currentRates,
                            [vendor.id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="py-3">
                      <p className="font-black">{formatCurrency(vendor.previewCommission)}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.proposedRate}% rate
                      </p>
                    </td>
                    <td className="py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isValidRate(Number(vendorRates[vendor.id] || 0))}
                        onClick={() =>
                          setPendingAction({
                            type: "vendor",
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            rate: Number(vendorRates[vendor.id] || 0),
                          })
                        }
                      >
                        <Save className="size-4" />
                        Save rate
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredVendorRows.length ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                      No vendors match the current commission filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border bg-white p-5">
          <h2 className="text-xl font-black">Commission history</h2>
          <div className="mt-5 space-y-3">
            {state.commissionSettings.history.map((entry) => (
              <article key={entry.id} className="border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">{entry.vendorName}</p>
                  <Badge variant="neutral">{entry.rate}%</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {formatDate(entry.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="border bg-white p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Order commission breakdown</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review how each order subtotal splits between marketplace commission and vendor payout.
            </p>
          </div>
          <Badge variant="neutral">{orderBreakdowns.length} orders</Badge>
        </div>
        <div className="responsive-table-wrap">
          <table className="responsive-table min-w-[1080px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Order</th>
                <th className="py-3 font-medium">Vendor</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Subtotal</th>
                <th className="py-3 font-medium">Commission rate</th>
                <th className="py-3 font-medium">Commission</th>
                <th className="py-3 font-medium">Vendor payout</th>
                <th className="py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orderBreakdowns.map(({ categoryNames, commission, order, rate, vendorName, vendorPayout }) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-3">
                    <p className="font-black">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                  </td>
                  <td className="py-3">{vendorName}</td>
                  <td className="py-3">{categoryNames.join(", ") || "Uncategorized"}</td>
                  <td className="py-3">{formatCurrency(order.subtotal, order.currency)}</td>
                  <td className="py-3">
                    <Badge variant="neutral">{rate}%</Badge>
                  </td>
                  <td className="py-3 font-black">{formatCurrency(commission, order.currency)}</td>
                  <td className="py-3">{formatCurrency(vendorPayout, order.currency)}</td>
                  <td className="py-3">{formatDate(order.placedAt)}</td>
                </tr>
              ))}
              {!orderBreakdowns.length ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    No orders are available for commission review.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Confirm commission setting</DialogTitle>
            <DialogDescription>This saves simulated commission settings in localStorage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 border bg-muted/30 p-4 text-sm">
            <p className="font-semibold">
              {pendingAction?.type === "default"
                ? `Set default commission rate to ${pendingAction.rate}%?`
                : `Set ${pendingAction?.vendorName} commission rate to ${pendingAction?.rate}%?`}
            </p>
            {pendingAction?.type === "default" ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <ImpactValue label="Current projected revenue" value={formatCurrency(projectedCommission)} />
                <ImpactValue label="Preview revenue" value={formatCurrency(defaultRatePreviewCommission)} />
                <ImpactValue
                  label="Projected change"
                  value={`${defaultRatePreviewDelta >= 0 ? "+" : ""}${formatCurrency(defaultRatePreviewDelta)}`}
                />
              </div>
            ) : null}
            {pendingAction?.type === "vendor" ? (
              <VendorImpactPreview
                currentRate={
                  state.commissionSettings.vendorRates[pendingAction.vendorId] ??
                  state.commissionSettings.defaultRate
                }
                newRate={pendingAction.rate}
                vendorName={pendingAction.vendorName}
                grossSales={getVendorSales(pendingAction.vendorId, marketplaceOrders)}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAction}>
              <CheckCircle2 className="size-4" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border bg-white p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
      </div>
      <Icon className="size-8 text-primary" />
    </div>
  );
}

function ImpactValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-white p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function VendorImpactPreview({
  currentRate,
  grossSales,
  newRate,
  vendorName,
}: {
  currentRate: number;
  grossSales: number;
  newRate: number;
  vendorName: string;
}) {
  const currentCommission = getCommissionAmount(grossSales, currentRate);
  const newCommission = getCommissionAmount(grossSales, newRate);
  const delta = newCommission - currentCommission;

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <ImpactValue label="Vendor" value={vendorName} />
      <ImpactValue label="Current commission" value={`${currentRate}% / ${formatCurrency(currentCommission)}`} />
      <ImpactValue label="New commission" value={`${newRate}% / ${formatCurrency(newCommission)}`} />
      <ImpactValue label="Projected change" value={`${delta >= 0 ? "+" : ""}${formatCurrency(delta)}`} />
    </div>
  );
}
