"use client";

import { Heart, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductActionsProps {
  product: Product;
  compact?: boolean;
}

export function ProductActions({ product, compact = false }: ProductActionsProps) {
  const { addToCart, isInWishlist, toggleWishlist } = useMarketplaceStorage();
  const unavailable = product.status !== "active" || product.stock <= 0;
  const wished = isInWishlist(product.id);

  return (
    <div className={cn("flex items-center gap-2", compact ? "w-auto" : "w-full")}>
      <Button
        type="button"
        variant={wished ? "secondary" : "outline"}
        size="icon"
        className={cn("shrink-0", wished && "text-lakay-red")}
        onClick={() => toggleWishlist(product)}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={cn("size-4", wished && "fill-current")} />
      </Button>
      <Button
        type="button"
        className="min-w-0 flex-1"
        disabled={unavailable}
        onClick={() => addToCart(product)}
      >
        <ShoppingCart className="size-4" />
        <span className="truncate">
          {unavailable
            ? product.status === "out_of_stock"
              ? "Out of stock"
              : "Unavailable"
            : "Add to cart"}
        </span>
      </Button>
    </div>
  );
}
