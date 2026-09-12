"use client";

import Image from "next/image";
import * as React from "react";
import { CheckCircle2, Eye, PauseCircle, Search } from "lucide-react";

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
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { getAllRealProductsForAdmin, getCategories, updateRealProductStatus } from "@/services/products";
import { getStores, getVendors } from "@/services/vendors";
import type { Category, Product, ProductStatus, Store, Vendor } from "@/types";

type ProductAction = {
  label: string;
  productId: string;
  status: ProductStatus;
  message: string;
};

const statusOptions: Array<{ value: ProductStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "out_of_stock", label: "Out of stock" },
];

function statusVariant(status: ProductStatus) {
  if (status === "active") return "success";
  if (status === "out_of_stock") return "destructive";
  return "neutral";
}

export function ProductModerationClient() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isReady, setIsReady] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [pendingAction, setPendingAction] = React.useState<ProductAction | null>(null);
  const hasActiveFilters =
    query.trim() !== "" || statusFilter !== "all" || vendorFilter !== "all" || categoryFilter !== "all";

  const refresh = React.useCallback(async () => {
    setIsReady(false);
    try {
      const [realProducts, realStores, realVendors, realCategories] = await Promise.all([
        getAllRealProductsForAdmin(),
        getStores(),
        getVendors(),
        getCategories(),
      ]);
      setProducts(realProducts);
      setStores(realStores);
      setVendors(realVendors);
      setCategories(realCategories);
    } catch (error) {
      toast({
        title: "Could not load products",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReady(true);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const getStore = React.useCallback((product: Product) => stores.find((store) => store.id === product.storeId), [stores]);
  const getVendor = React.useCallback(
    (product: Product) => vendors.find((vendor) => vendor.id === getStore(product)?.vendorId),
    [getStore, vendors],
  );
  const getCategory = React.useCallback(
    (product: Product) => categories.find((category) => category.id === product.categoryId),
    [categories],
  );

  const productRows = products
    .map((product) => ({
      ...product,
      vendorId: getStore(product)?.vendorId ?? "",
      categoryName: getCategory(product)?.name ?? "Uncategorized",
      vendorName: getVendor(product)?.name ?? "Unknown vendor",
    }))
    .filter((product) => {
      const normalizedQuery = query.toLowerCase();
      const matchesQuery =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.vendorName.toLowerCase().includes(normalizedQuery) ||
        product.categoryName.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      const matchesVendor = vendorFilter === "all" || product.vendorId === vendorFilter;
      const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;

      return matchesQuery && matchesStatus && matchesVendor && matchesCategory;
    });

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setVendorFilter("all");
    setCategoryFilter("all");
  }

  async function confirmAction() {
    if (!pendingAction) return;

    const result = await updateRealProductStatus(pendingAction.productId, pendingAction.status);

    if (!result.ok) {
      toast({
        title: "Could not update product",
        description: result.reason,
        variant: "destructive",
      });
      setPendingAction(null);
      return;
    }

    toast({ title: "Product updated", description: pendingAction.message });
    setPendingAction(null);
    await refresh();
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
          label="Publish"
          disabled={product.status === "active"}
          onClick={() =>
            setPendingAction({
              label: "Publish product",
              productId: product.id,
              status: "active",
              message: `${product.name} is now active on the marketplace.`,
            })
          }
        />
        <ModerationButton
          icon={PauseCircle}
          label="Move to draft"
          disabled={product.status === "draft"}
          onClick={() =>
            setPendingAction({
              label: "Move product to draft",
              productId: product.id,
              status: "draft",
              message: `${product.name} was moved back to draft and is no longer visible.`,
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
            Review every product vendors have added and control marketplace visibility.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_200px_200px]">
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
            aria-label="Filter products by status"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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

      <section className="grid gap-4 sm:grid-cols-3">
        {statusOptions.map((option) => (
          <div key={option.value} className="border bg-white p-4">
            <p className="text-sm text-muted-foreground">{option.label}</p>
            <p className="mt-2 text-3xl font-black">
              {products.filter((product) => product.status === option.value).length}
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
            <Badge variant={statusVariant(product.status)}>{product.status.replaceAll("_", " ")}</Badge>
          )}
          cardFields={(product) => [
            { label: "Vendor", value: product.vendorName },
            { label: "Category", value: product.categoryName },
            { label: "Price", value: formatCurrency(product.price, product.currency) },
            { label: "Stock", value: product.stock.toString() },
            { label: "Slug", value: product.slug },
          ]}
          cardActions={renderProductActions}
          emptyState={
            <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No products match the current search and filters.
            </div>
          }
          table={
          <table className="responsive-table min-w-[1000px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Product</th>
                <th className="py-3 font-medium">Vendor</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Price</th>
                <th className="py-3 font-medium">Stock</th>
                <th className="py-3 font-medium">Status</th>
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
                  <td className="py-3">{product.stock}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(product.status)}>{product.status.replaceAll("_", " ")}</Badge>
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
            <DialogDescription>This updates the product&apos;s live status in Supabase.</DialogDescription>
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
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled}>
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
