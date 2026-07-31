"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Minus, Plus, Store } from "lucide-react";

import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { Button } from "@/components/ui/button";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import type { VendorCartGroup as VendorCartGroupType } from "@/lib/checkout";
import { formatCurrency } from "@/lib/utils";

interface VendorCartGroupProps {
  group: VendorCartGroupType;
}

export function VendorCartGroup({ group }: VendorCartGroupProps) {
  const { removeFromCart, saveForLater, updateCartQuantity } = useMarketplaceStorage();
  const deliveryDays = group.store.country === "United States" ? "4-6 business days" : "1-3 business days";

  return (
    <section className="border bg-white">
      <header className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Store className="size-5 text-primary" />
              {group.store.name}
            </h2>
            <VerificationBadge verified={group.store.verified} />
          </div>
          <p className="text-sm text-muted-foreground">
            {group.items.length} line item{group.items.length > 1 ? "s" : ""} · Delivery estimate {deliveryDays} · Fee {formatCurrency(group.deliveryFee)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/stores/${group.store.slug}`}>View store</Link>
        </Button>
      </header>
      <div className="divide-y">
        {group.items.map((item) => (
          <article
            key={item.product.id}
            className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto]"
          >
            <Link
              href={`/products/${item.product.slug}`}
              className="relative aspect-square overflow-hidden border bg-muted"
            >
              <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
            </Link>
            <div className="space-y-2">
              <Link href={`/products/${item.product.slug}`} className="font-black hover:text-primary">
                {item.product.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                {group.store.name} · {item.product.brand}
              </p>
              <p className="text-sm font-semibold text-muted-foreground">
                Variant: {item.selectedVariant?.color ?? "Standard"}
                {item.selectedVariant?.size ? ` / ${item.selectedVariant.size.toUpperCase()}` : ""}
              </p>
              {item.stockIssue ? (
                <p className="flex items-center gap-2 border border-destructive bg-destructive/10 p-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="size-4" />
                  {item.stockIssue}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  In stock · {item.product.stock} available
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-semibold" htmlFor={`quantity-${item.product.id}-${item.selectedVariant?.color ?? "standard"}-${item.selectedVariant?.size ?? "size"}`}>
                  Qty
                </label>
                <div className="flex h-9 items-center border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={item.quantity <= 1}
                    onClick={() =>
                      updateCartQuantity(
                        item.product,
                        item.quantity - 1,
                        item.selectedVariant,
                      )
                    }
                    aria-label={`Decrease quantity for ${item.product.name}`}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <input
                    id={`quantity-${item.product.id}-${item.selectedVariant?.color ?? "standard"}-${item.selectedVariant?.size ?? "size"}`}
                    type="number"
                    min={1}
                    max={item.product.stock}
                    value={item.quantity}
                    onChange={(event) =>
                      updateCartQuantity(
                        item.product,
                        Number(event.target.value),
                        item.selectedVariant,
                      )
                    }
                    className="h-full w-12 border-x text-center"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={item.quantity >= item.product.stock}
                    onClick={() =>
                      updateCartQuantity(
                        item.product,
                        item.quantity + 1,
                        item.selectedVariant,
                      )
                    }
                    aria-label={`Increase quantity for ${item.product.name}`}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFromCart(item.product, item.selectedVariant)}
                >
                  Remove
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => saveForLater(item.product, item.selectedVariant)}
                >
                  Save for later
                </Button>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-lg font-black">{formatCurrency(item.lineSubtotal)}</p>
              <p className="text-xs text-muted-foreground">
                Unit price {formatCurrency(item.lineSubtotal / Math.max(1, item.quantity))}
              </p>
            </div>
          </article>
        ))}
      </div>
      <footer className="flex justify-between gap-3 border-t bg-muted/35 p-4 text-sm font-bold">
        <span>Vendor subtotal</span>
        <span>{formatCurrency(group.subtotal)}</span>
      </footer>
    </section>
  );
}
