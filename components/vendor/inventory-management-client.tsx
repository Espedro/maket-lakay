"use client";

import Link from "next/link";
import * as React from "react";
import { Boxes, History, Search, SlidersHorizontal } from "lucide-react";

import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useVendorProducts } from "@/hooks/use-vendor-products";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import {
  getAvailableQuantity,
  getInventoryStatus,
  type ManagedProduct,
  type ManagedProductVariant,
} from "@/lib/vendor-products";
import { cn, formatDate } from "@/lib/utils";

type InventoryFilter = "all" | "in_stock" | "low_stock" | "out_of_stock" | "draft";

function productMatches(product: ManagedProduct, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return [product.name, product.sku, product.brand]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function getStatusBadgeVariant(status: string) {
  if (status === "low_stock" || status === "out_of_stock") return "destructive";
  if (status === "in_stock") return "success";
  return "neutral";
}

export function InventoryManagementClient() {
  const { isReady, products, updateStock } = useVendorProducts();
  const { isReady: scopeReady, scopedStoreIds } = useVendorScope();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<InventoryFilter>("all");
  const [adjustments, setAdjustments] = React.useState<Record<string, number>>({});

  const filteredProducts = products.filter((product) => {
    const status = getInventoryStatus(product);

    return (
      scopedStoreIds.has(product.storeId) &&
      productMatches(product, query) &&
      (filter === "all" || status === filter)
    );
  });

  function adjust(product: ManagedProduct) {
    const quantity = adjustments[product.id] ?? product.stock;
    updateStock(product.id, quantity, "Manual inventory page adjustment");
  }

  if (!isReady || !scopeReady) {
    return (
      <div className="grid gap-4">
        <div className="h-24 animate-pulse border bg-muted" />
        <div className="h-96 animate-pulse border bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Vendor Inventory
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Inventory management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Update stock, review reserved quantities, monitor thresholds, and inspect stock history.
            </p>
          </div>
          <Button asChild>
            <Link href="/vendor/products/new">Add product</Link>
          </Button>
        </div>
      </section>

      <section className="border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search inventory by product, SKU, brand"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filter}
            onChange={(event) => setFilter(event.target.value as InventoryFilter)}
          >
            <option value="all">All inventory</option>
            <option value="in_stock">In stock</option>
            <option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden border bg-white">
        <div className="responsive-table-wrap">
          <table className="responsive-table min-w-[1080px]">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Variant</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Available</th>
                <th className="p-3 font-medium">Reserved</th>
                <th className="p-3 font-medium">Threshold</th>
                <th className="p-3 font-medium">Inventory status</th>
                <th className="p-3 font-medium">Adjustment</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                  <InventoryRow
                    product={product}
                    variant={undefined}
                    value={adjustments[product.id] ?? product.stock}
                    onChange={(value) =>
                      setAdjustments((current) => ({ ...current, [product.id]: value }))
                    }
                    onAdjust={() => adjust(product)}
                  />
                  {product.variants.map((variant) => (
                    <InventoryRow
                      key={`${product.id}-${variant.sku}`}
                      product={product}
                      variant={variant}
                      value={variant.stock}
                      onChange={() => undefined}
                      onAdjust={() => undefined}
                      variantOnly
                    />
                  ))}
                </React.Fragment>
              ))}
              {!filteredProducts.length ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No inventory rows match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InventoryRow({
  onAdjust,
  onChange,
  product,
  value,
  variant,
  variantOnly = false,
}: {
  onAdjust: () => void;
  onChange: (value: number) => void;
  product: ManagedProduct;
  value: number;
  variant?: ManagedProductVariant;
  variantOnly?: boolean;
}) {
  const status = getInventoryStatus(product);

  return (
    <tr className={cn("border-b", variantOnly && "bg-muted/20")}>
      <td className="p-3">
        <div className="flex items-center gap-2">
          {variantOnly ? <SlidersHorizontal className="size-4 text-muted-foreground" /> : <Boxes className="size-4 text-primary" />}
          <span>
            <span className="block font-black">{product.name}</span>
            <span className="text-xs text-muted-foreground">{product.brand ?? "Maket Lakay"}</span>
          </span>
        </div>
      </td>
      <td className="p-3">{variant ? `${variant.name}: ${variant.value}` : "Default"}</td>
      <td className="p-3 font-semibold">{variant?.sku ?? product.sku}</td>
      <td className="p-3">{variant ? variant.stock : getAvailableQuantity(product)}</td>
      <td className="p-3">{variant ? "0" : product.reservedQuantity}</td>
      <td className="p-3">{product.lowStockThreshold}</td>
      <td className="p-3">
        <div className="grid gap-1">
          <Badge variant={getStatusBadgeVariant(status)}>
            {status.replaceAll("_", " ")}
          </Badge>
          {variantOnly ? null : <StatusBadge status={product.status} />}
        </div>
      </td>
      <td className="p-3">
        {variantOnly ? (
          <span className="text-xs text-muted-foreground">Variant stock follows product form.</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-24 rounded-none shadow-none"
              type="number"
              min="0"
              value={value}
              onChange={(event) => onChange(Number(event.target.value))}
            />
            <Button size="sm" onClick={onAdjust}>Update</Button>
            <StockHistoryDialog product={product} />
          </div>
        )}
      </td>
    </tr>
  );
}

function StockHistoryDialog({ product }: { product: ManagedProduct }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <History className="size-4" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock history</DialogTitle>
          <DialogDescription>
            Stock history for {product.name}. These entries are local only.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {product.stockHistory.map((entry) => (
            <div key={entry.id} className="grid gap-2 border p-3 text-sm sm:grid-cols-[90px_1fr]">
              <span className={entry.change >= 0 ? "font-black text-accent" : "font-black text-destructive"}>
                {entry.change >= 0 ? "+" : ""}{entry.change}
              </span>
              <span>
                <span className="block font-semibold">{entry.note}</span>
                <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
