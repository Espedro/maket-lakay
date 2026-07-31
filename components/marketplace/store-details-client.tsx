"use client";

import Link from "next/link";
import { MapPin, Package, ShieldCheck } from "lucide-react";

import { ProductDiscoveryView } from "@/components/discovery/product-discovery-view";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { EmptyState } from "@/components/marketplace/empty-state";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categories, reviews } from "@/data/mock-data";
import { useAdminManagement } from "@/hooks/use-admin-management";
import { useVendorProducts } from "@/hooks/use-vendor-products";
import { getAllStores, getAllVendors } from "@/lib/admin-management";
import { cn } from "@/lib/utils";

export function StoreDetailsClient({ slug }: { slug: string }) {
  const { isReady: adminReady, state: adminState } = useAdminManagement();
  const { isReady: productsReady, products } = useVendorProducts();
  const stores = getAllStores(adminState);
  const vendors = getAllVendors(adminState);
  const store = stores.find((item) => item.slug === slug);

  if (!adminReady || !productsReady) {
    return (
      <div className="container space-y-6 py-6">
        <div className="h-8 w-56 animate-pulse bg-muted" />
        <div className="h-72 animate-pulse border bg-muted" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container space-y-5 py-6">
        <EmptyState
          title="Store not found"
          description="This store is not available in the local marketplace data."
          actionLabel="Back to stores"
        />
        <Button asChild>
          <Link href="/stores">View stores</Link>
        </Button>
      </div>
    );
  }

  const vendor = vendors.find((item) => item.id === store.vendorId);
  const storeProducts = products.filter((product) => product.storeId === store.id);
  const featuredProducts = storeProducts
    .filter((product) => product.isFeatured || product.isRecommended)
    .slice(0, 4);
  const categoryIds = new Set(storeProducts.map((product) => product.categoryId));
  const storeCategories = categories.filter((category) => categoryIds.has(category.id));
  const productIds = new Set(storeProducts.map((product) => product.id));
  const storeReviews = reviews.filter((review) => productIds.has(review.productId));

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Stores", href: "/stores" }, { label: store.name }]} />

      <section className="overflow-hidden border bg-white">
        <div className={cn("h-32", store.bannerColor)} />
        <div className="grid gap-5 p-5 md:grid-cols-[120px_1fr_auto] md:items-end">
          <div
            className={cn(
              "-mt-16 flex size-28 items-center justify-center border-4 border-white text-3xl font-black text-white shadow-card",
              store.bannerColor,
            )}
          >
            {store.logo ?? store.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-normal">{store.name}</h1>
              <VerificationBadge verified={store.verified} />
            </div>
            {vendor ? (
              <p className="text-sm font-semibold text-muted-foreground">
                Vendor: {vendor.name}
              </p>
            ) : null}
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {store.city}
              {store.country ? `, ${store.country}` : null}
            </p>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {store.description}
            </p>
          </div>
          <div className="space-y-2">
            <RatingStars rating={store.rating} reviewCount={store.reviewCount} />
            <p className="flex items-center gap-1 text-sm font-semibold">
              <Package className="size-4" />
              {storeProducts.length || store.productCount} products
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">Store categories</h2>
        <div className="flex flex-wrap gap-2">
          {storeCategories.length ? (
            storeCategories.map((category) => (
              <Badge key={category.id} variant="outline">
                <Link href={`/categories/${category.slug}`}>{category.name}</Link>
              </Badge>
            ))
          ) : (
            <Badge variant="neutral">No product categories yet</Badge>
          )}
        </div>
      </section>

      {featuredProducts.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-black">Featured products</h2>
          <ProductGrid products={featuredProducts} />
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-black">All products from {store.name}</h2>
        <ProductDiscoveryView
          products={products}
          initialFilters={{ storeId: store.id }}
          lockedStoreId={store.id}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["Delivery", "Local delivery options are represented as policy content."],
          ["Returns", "Items can be reviewed with the store before a return is approved."],
          ["Verification", "Store trust signals use local data for this phase."],
        ].map(([title, description]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4 pb-6">
        <h2 className="text-xl font-black">Customer reviews</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {storeReviews.length ? (
            storeReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="space-y-2 p-4">
                  <RatingStars rating={review.rating} />
                  <h3 className="font-bold">{review.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{review.body}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No customer reviews for this store yet.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
