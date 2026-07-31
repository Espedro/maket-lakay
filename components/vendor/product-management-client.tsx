"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
  Edit,
  Eye,
  PackagePlus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

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
import { categories } from "@/data/mock-data";
import { useVendorProducts } from "@/hooks/use-vendor-products";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { getAvailableQuantity, getInventoryStatus, type ManagedProduct } from "@/lib/vendor-products";
import { formatCurrency } from "@/lib/utils";
import type { ProductStatus } from "@/types";

const pageSize = 8;

function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

function productMatches(product: ManagedProduct, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return [product.name, product.sku, product.brand, product.description]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function ProductManagementClient() {
  const {
    bulkUpdateStatus,
    deleteProduct,
    isReady,
    products,
    resetProducts,
  } = useVendorProducts();
  const { isReady: scopeReady, scopedStoreIds, scopedStores } = useVendorScope();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ProductStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [storeFilter, setStoreFilter] = React.useState("all");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);

  const filteredProducts = products.filter(
    (product) =>
      scopedStoreIds.has(product.storeId) &&
      productMatches(product, query) &&
      (statusFilter === "all" || product.status === statusFilter) &&
      (categoryFilter === "all" || product.categoryId === categoryFilter) &&
      (storeFilter === "all" || product.storeId === storeFilter),
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const allVisibleSelected =
    visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.includes(product.id));

  React.useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [query, statusFilter, categoryFilter, storeFilter]);

  React.useEffect(() => {
    if (storeFilter !== "all" && !scopedStores.some((store) => store.id === storeFilter)) {
      setStoreFilter("all");
    }
  }, [scopedStores, storeFilter]);

  function toggleSelected(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function toggleVisibleSelected() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleProducts.some((product) => product.id === id)),
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...visibleProducts.map((product) => product.id)])),
    );
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
              Vendor Products
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Product management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Add, edit, preview, delete, search, filter, and bulk update local products.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/vendor/products/new">
                <PackagePlus className="size-4" />
                Add product
              </Link>
            </Button>
            <Button variant="outline" onClick={resetProducts}>
              <RotateCcw className="size-4" />
              Reset data
            </Button>
          </div>
        </div>
      </section>

      <section className="border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search by product, SKU, brand"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProductStatus | "all")}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
          <select
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
          >
            <option value="all">All stores</option>
            {scopedStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {filteredProducts.length} products - {selectedIds.length} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedIds.length}
              onClick={() => bulkUpdateStatus(selectedIds, "active")}
            >
              Mark active
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedIds.length}
              onClick={() => bulkUpdateStatus(selectedIds, "draft")}
            >
              Mark draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedIds.length}
              onClick={() => bulkUpdateStatus(selectedIds, "out_of_stock")}
            >
              Mark out of stock
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border bg-white">
        <div className="responsive-table-wrap">
          <table className="responsive-table min-w-[1080px]">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr className="border-b">
                <th className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleVisibleSelected}
                    aria-label="Select visible products"
                  />
                </th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Inventory</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
                <tr key={product.id} className="border-b last:border-0">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleSelected(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="relative size-14 overflow-hidden border bg-muted">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </span>
                      <span>
                        <span className="block font-black">{product.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {product.brand ?? "Maket Lakay"} - {product.condition.replaceAll("_", " ")}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-semibold">{product.sku}</td>
                  <td className="p-3">{getCategoryName(product.categoryId)}</td>
                  <td className="p-3">
                    <span className="font-black">{formatCurrency(product.price, product.currency)}</span>
                    {product.compareAtPrice ? (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        {formatCurrency(product.compareAtPrice, product.currency)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold">{getAvailableQuantity(product)} available</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {product.reservedQuantity} reserved - threshold {product.lowStockThreshold}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="grid gap-1">
                      <StatusBadge status={product.status} />
                      <Badge variant={getInventoryStatus(product) === "low_stock" ? "destructive" : "neutral"}>
                        {getInventoryStatus(product).replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/products/${product.slug}`}>
                          <Eye className="size-4" />
                          Preview
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/vendor/products/${product.id}/edit`}>
                          <Edit className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      <DeleteProductDialog product={product} onDelete={deleteProduct} />
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleProducts.length ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No products match the current search and filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteProductDialog({
  onDelete,
  product,
}: {
  onDelete: (productId: string) => void;
  product: ManagedProduct;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="size-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete product?</DialogTitle>
          <DialogDescription>
            This removes {product.name} from local product data. No backend is touched.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={() => onDelete(product.id)}>
              Delete product
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
