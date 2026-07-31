import { EmptyState } from "@/components/marketplace/empty-state";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { ProductGridSkeleton } from "@/components/marketplace/loading-skeleton";
import { SectionHeading } from "@/components/homepage/section-heading";
import type { Product } from "@/types";

interface ProductSectionProps {
  id?: string;
  title: string;
  description: string;
  products: Product[];
  showSkeleton?: boolean;
}

export function ProductSection({
  id,
  title,
  description,
  products,
  showSkeleton = false,
}: ProductSectionProps) {
  return (
    <section id={id} className="container space-y-5 scroll-mt-28">
      <SectionHeading title={title} description={description} href="/products" />
      {showSkeleton ? (
        <ProductGridSkeleton />
      ) : products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState
          title="No products found"
          description="Try another category or location to find more products."
          actionLabel="Reset filters"
        />
      )}
    </section>
  );
}
