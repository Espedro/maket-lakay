"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { BookmarkCheck, ShoppingCart } from "lucide-react";

import { OrderSummaryCard } from "@/components/checkout/order-summary-card";
import { VendorCartGroup } from "@/components/checkout/vendor-cart-group";
import { EmptyState } from "@/components/marketplace/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { products } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import type { CartItem } from "@/hooks/use-marketplace-storage";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { buildCartSummary } from "@/lib/checkout";
import { normalizeProductPrice } from "@/lib/product-discovery";
import { formatCurrency } from "@/lib/utils";

type PromoState =
  | { code: ""; discount: 0; message: ""; status: "idle" }
  | { code: string; discount: number; message: string; status: "success" | "error" };

function getPromoDiscount(code: string, subtotal: number, deliveryFee: number) {
  const normalizedCode = code.trim().toUpperCase();

  if (normalizedCode === "LAKAY10") {
    return {
      discount: Math.min(subtotal * 0.1, 25),
      message: "LAKAY10 applied: 10% off products, up to $25.",
    };
  }

  if (normalizedCode === "DIASPORA15") {
    return {
      discount: Math.min(subtotal * 0.15, 40),
      message: "DIASPORA15 applied: diaspora customer discount.",
    };
  }

  if (normalizedCode === "FREESHIP") {
    return {
      discount: deliveryFee,
      message: "FREESHIP applied: delivery estimate removed.",
    };
  }

  return null;
}

function SavedForLaterSection({
  items,
  onMoveToCart,
  onRemove,
}: {
  items: CartItem[];
  onMoveToCart: ReturnType<typeof useMarketplaceStorage>["moveSavedItemToCart"];
  onRemove: ReturnType<typeof useMarketplaceStorage>["removeSavedItem"];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="border bg-white">
      <header className="flex items-center gap-2 border-b p-4">
        <BookmarkCheck className="size-5 text-primary" />
        <div>
          <h2 className="text-lg font-black">Saved for later</h2>
          <p className="text-sm text-muted-foreground">
            Move saved items back to cart when you are ready.
          </p>
        </div>
      </header>
      <div className="divide-y">
        {items.map((item) => {
          const product = products.find((currentProduct) => currentProduct.id === item.productId);

          if (!product) {
            return null;
          }

          return (
            <article
              key={`${item.productId}-${item.variant?.color ?? "standard"}-${item.variant?.size ?? "size"}`}
              className="grid gap-4 p-4 sm:grid-cols-[96px_1fr_auto]"
            >
              <Link
                href={`/products/${product.slug}`}
                className="relative aspect-square overflow-hidden border bg-muted"
              >
                <Image src={product.image} alt={product.name} fill className="object-cover" />
              </Link>
              <div>
                <Link href={`/products/${product.slug}`} className="font-black hover:text-primary">
                  {product.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  Variant: {item.variant?.color ?? "Standard"}
                  {item.variant?.size ? ` / ${item.variant.size.toUpperCase()}` : ""}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Qty {item.quantity} · {formatCurrency(normalizeProductPrice(product))}
                </p>
                {product.stock <= 0 || product.status !== "active" ? (
                  <p className="mt-2 text-sm font-semibold text-destructive">
                    Currently unavailable
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    In stock · {product.stock} available
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col">
                <Button
                  type="button"
                  onClick={() => onMoveToCart(product, item.variant)}
                  disabled={product.stock <= 0 || product.status !== "active"}
                >
                  Move to cart
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onRemove(product, item.variant)}
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CartPageClient() {
  const {
    cart,
    clearCart,
    isReady,
    moveSavedItemToCart,
    removeSavedItem,
    savedForLater,
  } = useMarketplaceStorage();
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<PromoState>({
    code: "",
    discount: 0,
    message: "",
    status: "idle",
  });
  const summary = buildCartSummary(cart);
  const appliedDiscount = Math.min(promo.discount, summary.total);

  function applyPromoCode() {
    const promoResult = getPromoDiscount(promoInput, summary.subtotal, summary.deliveryFee);

    if (!promoResult) {
      setPromo({
        code: promoInput.trim().toUpperCase(),
        discount: 0,
        message: "Invalid promotional code. Try LAKAY10, DIASPORA15, or FREESHIP.",
        status: "error",
      });
      toast({
        title: "Invalid promotional code",
        description: "Try LAKAY10, DIASPORA15, or FREESHIP.",
        variant: "destructive",
      });
      return;
    }

    setPromo({
      code: promoInput.trim().toUpperCase(),
      discount: promoResult.discount,
      message: promoResult.message,
      status: "success",
    });
    toast({
      title: "Promotional code applied",
      description: promoResult.message,
    });
  }

  if (!isReady) {
    return (
      <div className="grid gap-4">
        <div className="h-32 animate-pulse border bg-muted" />
        <div className="h-48 animate-pulse border bg-muted" />
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add products from Maket Lakay vendors to build a multi-vendor cart."
          actionLabel="Browse products"
        />
        <SavedForLaterSection
          items={savedForLater}
          onMoveToCart={moveSavedItemToCart}
          onRemove={removeSavedItem}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal">Shopping cart</h1>
            <p className="text-sm text-muted-foreground">
              Grouped by vendor with stock validation and delivery-fee estimates.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={clearCart}>
            Clear cart
          </Button>
        </div>
        {summary.groups.map((group) => (
          <VendorCartGroup key={group.store.id} group={group} />
        ))}
        <SavedForLaterSection
          items={savedForLater}
          onMoveToCart={moveSavedItemToCart}
          onRemove={removeSavedItem}
        />
      </div>
      <div className="space-y-4">
        <OrderSummaryCard
          subtotal={summary.subtotal}
          deliveryFee={summary.deliveryFee}
          total={summary.total}
          discount={appliedDiscount}
          itemCount={summary.itemCount}
          stockIssueCount={summary.stockIssues.length}
          actionHref="/checkout"
          actionLabel="Proceed to checkout"
          disabled={Boolean(summary.stockIssues.length)}
        />
        <section className="border bg-white p-4">
          <h2 className="font-black">Promotional code</h2>
          <div className="mt-3 flex gap-2">
            <Input
              value={promoInput}
              onChange={(event) => setPromoInput(event.target.value)}
              placeholder="LAKAY10"
              aria-label="Promotional code"
            />
            <Button type="button" variant="outline" onClick={applyPromoCode}>
              Apply
            </Button>
          </div>
          {promo.status !== "idle" ? (
            <p
              className={
                promo.status === "success"
                  ? "mt-2 text-sm font-semibold text-accent"
                  : "mt-2 text-sm font-semibold text-destructive"
              }
            >
              {promo.message}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Codes: LAKAY10, DIASPORA15, FREESHIP.
            </p>
          )}
        </section>
        <Button asChild variant="outline" className="w-full">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
