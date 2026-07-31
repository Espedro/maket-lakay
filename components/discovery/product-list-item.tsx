import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { ProductActions } from "@/components/marketplace/product-actions";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { getAvailabilityLabel, getProductStore } from "@/lib/product-discovery";
import type { Product } from "@/types";

interface ProductListItemProps {
  product: Product;
}

export function ProductListItem({ product }: ProductListItemProps) {
  const store = getProductStore(product);

  return (
    <article className="grid gap-4 border bg-white p-4 sm:grid-cols-[180px_1fr]">
      <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-muted">
        <Image src={product.image} alt={product.name} fill className="object-cover" />
      </Link>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          <Link
            href={`/products/${product.slug}`}
            className="text-lg font-bold hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>
          {store ? (
            <Link
              href={`/stores/${store.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              <MapPin className="size-4" />
              {store.name}, {store.city}
            </Link>
          ) : null}
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          <p className="text-sm text-muted-foreground">
            {getAvailabilityLabel(product.status, product.stock)}
          </p>
        </div>
        <div className="space-y-3">
          <PriceDisplay
            amount={product.price}
            compareAtAmount={product.compareAtPrice}
            currency={product.currency}
          />
          {product.status !== "active" || product.stock <= 0 ? (
            <StatusBadge status={product.status} />
          ) : null}
          <ProductActions product={product} />
        </div>
      </div>
    </article>
  );
}
