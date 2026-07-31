"use client";

import Image from "next/image";
import * as React from "react";
import { CheckCircle2, Eye, PauseCircle, RefreshCw, Search, XCircle } from "lucide-react";

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
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { categories, products, stores, vendors } from "@/data/mock-data";
import { useAdminManagement } from "@/hooks/use-admin-management";
import type { ProductModerationStatus } from "@/lib/admin-management";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Product } from "@/types";

type ProductAction = {
  label: string;
  productId: string;
  status: ProductModerationStatus;
  message: string;
};

type DateAddedFilter = "all" | "today" | "7d" | "30d" | "90d";

const dateAddedOptions: Array<{ label: string; value: DateAddedFilter; days?: number }> = [
  { label: "Any date added", value: "all" },
  { label: "Added today", value: "today" },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
];

const referenceDate = new Date("2026-07-23T12:00:00-04:00");

function getStore(product: Product) {
  return stores.find((store) => store.id === product.storeId);
}

function getVendor(product: Product) {
  const store = getStore(product);
  return vendors.find((vendor) => vendor.id === store?.vendorId);
}

function getCategory(product: Product) {
  return categories.find((category) => category.id === product.categoryId);
}

function statusVariant(status: string) {
  if (status === "approved") return "success";
  if (["rejected", "suspended"].includes(status)) return "destructive";
  return "neutral";
}

function matchesDateAdded(submittedAt: string, filter: DateAddedFilter) {
  if (filter === "all") return true;

  const submittedDate = new Date(submittedAt);
  if (Number.isNaN(submittedDate.getTime())) return false;

  if (filter === "today") {
    return submittedDate.toDateString() === referenceDate.toDateString();
  }

  const option = dateAddedOptions.find((item) => item.value === filter);
  if (!option?.days) return true;

  const threshold = referenceDate.getTime() - option.days * 24 * 60 * 60 * 1000;
  return submittedDate.getTime() >= threshold;
}

export function ProductModerationClient() {
  const { isReady, state, updateProduct } = useAdminManagement();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [dateAddedFilter, setDateAddedFilter] = React.useState<DateAddedFilter>("all");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [pendingAction, setPendingAction] = React.useState<ProductAction | null>(null);
  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    vendorFilter !== "all" ||
    categoryFilter !== "all" ||
    dateAddedFilter !== "all";

  const productRows = products
    .map((product) => ({
      ...product,
      vendorId: getStore(product)?.vendorId ?? "",
      categoryName: getCategory(product)?.name ?? "Uncategorized",
      moderationStatus: state.products[product.id]?.moderationStatus ?? "pending",
      submittedAt: state.products[product.id]?.submittedAt ?? "2026-07-10T10:30:00Z",
      vendorName: getVendor(product)?.name ?? "Unknown vendor",
    }))
    .filter((product) => {
      const normalizedQuery = query.toLowerCase();
      const matchesQuery =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.vendorName.toLowerCase().includes(normalizedQuery) ||
        product.categoryName.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || product.moderationStatus === statusFilter;
      const matchesVendor = vendorFilter === "all" || product.vendorId === vendorFilter;
      const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
      const matchesDate = matchesDateAdded(product.submittedAt, dateAddedFilter);

      return matchesQuery && matchesStatus && matchesVendor && matchesCategory && matchesDate;
    });

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setVendorFilter("all");
    setCategoryFilter("all");
    setDateAddedFilter("all");
  }

  function confirmAction() {
    if (!pendingAction) return;

    updateProduct(pendingAction.productId, pendingAction.status, pendingAction.message);
    setPendingAction(null);
  }

  function renderProductActions(product: (typeof productRows)[number]) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedProduct(product)}>
          <Eye className="size-4" />
          Preview
        </Button>
        <ModerationButton
          icon={CheckCircle2}
          label="Approve"
          onClick={() =>
            setPendingAction({
              label: "Approve product",
              productId: product.id,
              status: "approved",
              message: `${product.name} was approved locally.`,
            })
          }
        />
        <ModerationButton
          icon={XCircle}
          label="Reject"
          onClick={() =>
            setPendingAction({
              label: "Reject product",
              productId: product.id,
              status: "rejected",
              message: `${product.name} was rejected locally.`,
            })
          }
        />
        <ModerationButton
          icon={PauseCircle}
          label="Suspend"
          onClick={() =>
            setPendingAction({
              label: "Suspend product",
              productId: product.id,
              status: "suspended",
              message: `${product.name} was suspended locally.`,
            })
          }
        />
        <ModerationButton
          icon={RefreshCw}
          label="Changes"
          onClick={() =>
            setPendingAction({
              label: "Request changes",
              productId: product.id,
              status: "changes_requested",
              message: `Changes were requested for ${product.name}.`,
            })
          }
        />
      </>
    );
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Product Moderation
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">Products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Moderate product submissions, preview listings, and update marketplace visibility.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_200px_200px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search products..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter products by moderation status"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All moderation</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="changes_requested">Changes requested</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            aria-label="Filter products by vendor"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
          >
            <option value="all">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter products by category"
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
            aria-label="Filter products by date added"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={dateAddedFilter}
            onChange={(event) => setDateAddedFilter(event.target.value as DateAddedFilter)}
          >
            {dateAddedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {productRows.length} products shown
          </p>
          <Button type="button" variant="outline" size="sm" disabled={!hasActiveFilters} onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {["pending", "approved", "changes_requested", "rejected", "suspended"].map((status) => (
          <div key={status} className="border bg-white p-4">
            <p className="text-sm capitalize text-muted-foreground">{status.replaceAll("_", " ")}</p>
            <p className="mt-2 text-3xl font-black">
              {products.filter((product) => (state.products[product.id]?.moderationStatus ?? "pending") === status).length}
            </p>
          </div>
        ))}
      </section>

      <section className="border bg-white p-5">
        <ResponsiveDataView
          items={productRows}
          getKey={(product) => product.id}
          cardTitle={(product) => product.name}
          cardDescription={(product) => `${product.vendorName} - ${product.categoryName}`}
          cardMeta={(product) => (
            <Badge variant={statusVariant(product.moderationStatus)}>
              {product.moderationStatus.replaceAll("_", " ")}
            </Badge>
          )}
          cardFields={(product) => [
            { label: "Vendor", value: product.vendorName },
            { label: "Category", value: product.categoryName },
            { label: "Price", value: formatCurrency(product.price, product.currency) },
            { label: "Date added", value: formatDate(product.submittedAt) },
            { label: "Slug", value: product.slug },
          ]}
          cardActions={renderProductActions}
          emptyState={
            <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No products match the current search and filters.
            </div>
          }
          table={
          <table className="responsive-table min-w-[1120px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Product</th>
                <th className="py-3 font-medium">Vendor</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Price</th>
                <th className="py-3 font-medium">Date added</th>
                <th className="py-3 font-medium">Moderation</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 border bg-muted">
                        <Image src={product.image} alt={product.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-black">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">{product.vendorName}</td>
                  <td className="py-3">{product.categoryName}</td>
                  <td className="py-3 font-black">{formatCurrency(product.price, product.currency)}</td>
                  <td className="py-3">{formatDate(product.submittedAt)}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(product.moderationStatus)}>
                      {product.moderationStatus.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="dashboard-action-row">
                      {renderProductActions(product)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          }
        />
      </section>

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="left-auto right-0 top-0 h-full max-w-xl translate-x-0 translate-y-0 overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle>Product preview</DialogTitle>
            <DialogDescription>Marketplace listing preview for moderation.</DialogDescription>
          </DialogHeader>
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="relative aspect-square border bg-muted">
                <Image
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="text-2xl font-black">{selectedProduct.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{selectedProduct.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewField label="Vendor" value={getVendor(selectedProduct)?.name ?? "Unknown"} />
                <PreviewField label="Category" value={getCategory(selectedProduct)?.name ?? "Uncategorized"} />
                <PreviewField label="Price" value={formatCurrency(selectedProduct.price, selectedProduct.currency)} />
                <PreviewField label="Stock" value={selectedProduct.stock.toString()} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
            <DialogDescription>
              This action only updates product moderation state in localStorage.
            </DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">{pendingAction?.message}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModerationButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
