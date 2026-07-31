"use client";

import * as React from "react";
import { Filter, Grid2X2, List } from "lucide-react";

import { ProductListItem } from "@/components/discovery/product-list-item";
import { FilterPanel } from "@/components/discovery/filter-panel";
import { EmptyState } from "@/components/marketplace/empty-state";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  discoverProducts,
  getBrands,
  getDiscoveryContext,
  type ProductDiscoveryFilters,
  type ProductSort,
} from "@/lib/product-discovery";
import type { Product } from "@/types";

interface ProductDiscoveryViewProps {
  products: Product[];
  initialFilters?: ProductDiscoveryFilters;
  lockedCategoryId?: string;
  lockedStoreId?: string;
}

const PAGE_SIZE = 8;

export function ProductDiscoveryView({
  products,
  initialFilters = {},
  lockedCategoryId,
  lockedStoreId,
}: ProductDiscoveryViewProps) {
  const [filters, setFilters] = React.useState<ProductDiscoveryFilters>({
    availability: "all",
    sort: "featured",
    ...initialFilters,
  });
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const context = React.useMemo(() => getDiscoveryContext(), []);
  const brands = React.useMemo(() => getBrands(products), [products]);

  const filteredProducts = React.useMemo(
    () => discoverProducts(products, filters),
    [filters, products],
  );
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const clearFilters = () => {
    setFilters({
      availability: "all",
      sort: filters.sort ?? "featured",
      query: initialFilters.query,
      categoryId: lockedCategoryId,
      storeId: lockedStoreId,
    });
  };

  const filterPanel = (
    <FilterPanel
      context={context}
      brands={brands}
      filters={filters}
      lockedCategoryId={lockedCategoryId}
      lockedStoreId={lockedStoreId}
      onChange={setFilters}
      onClear={clearFilters}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="hidden border bg-white p-4 lg:block">{filterPanel}</div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">
              {filteredProducts.length} products found
            </p>
            <p className="text-xs text-muted-foreground">
              Local search and filters only.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter className="size-4" />
                  Filters
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filter products</DialogTitle>
                </DialogHeader>
                {filterPanel}
              </DialogContent>
            </Dialog>
            <select
              value={filters.sort ?? "featured"}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  sort: event.target.value as ProductSort,
                }))
              }
              className="h-10 border bg-white px-3 text-sm"
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating-desc">Top rated</option>
            </select>
            <div className="flex border">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <Grid2X2 className="size-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {visibleProducts.length ? (
          view === "grid" ? (
            <ProductGrid products={visibleProducts} />
          ) : (
            <div className="space-y-3">
              {visibleProducts.map((product) => (
                <ProductListItem key={product.id} product={product} />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            title="No products match these filters"
            description="Try clearing filters, using a broader search, or selecting another category."
            actionLabel="Clear filters"
          />
        )}

        {visibleCount < filteredProducts.length ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Load more products
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
