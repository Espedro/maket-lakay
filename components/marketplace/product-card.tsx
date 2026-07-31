import Image from "next/image";
import Link from "next/link";
import { MapPin, PackageCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DiscountBadge } from "@/components/marketplace/discount-badge";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { ProductActions } from "@/components/marketplace/product-actions";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { getStoreById } from "@/services/vendors";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const store = getStoreById(product.storeId);

  return (
    <Card className="group overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link href={`/products/${product.slug}`} className="block size-full">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <DiscountBadge
            price={product.price}
            compareAtPrice={product.compareAtPrice}
          />
          {product.isLocalMade ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-lakay-palm shadow-sm">
              <PackageCheck className="size-3.5" />
              Local
            </span>
          ) : null}
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <Link
            href={`/products/${product.slug}`}
            className="line-clamp-2 text-sm font-semibold hover:text-primary"
          >
            {product.name}
          </Link>
          {store ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {store.name}, {store.city}
            </p>
          ) : null}
        </div>
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
        <div className="flex items-center justify-between gap-2">
          <PriceDisplay
            amount={product.price}
            compareAtAmount={product.compareAtPrice}
            currency={product.currency}
          />
          {product.status !== "active" ? <StatusBadge status={product.status} /> : null}
        </div>
        <ProductActions product={product} />
      </CardContent>
    </Card>
  );
}
