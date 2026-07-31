"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  CheckCircle2,
  Heart,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Store as StoreIcon,
  Truck,
} from "lucide-react";

import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { DiscountBadge } from "@/components/marketplace/discount-badge";
import { EmptyState } from "@/components/marketplace/empty-state";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories, products, stores, vendors } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { getProductReviewSummary, mergeReviews } from "@/lib/support";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductDetailsClientProps {
  product?: Product;
}

interface VariantOption {
  label: string;
  value: string;
  swatch?: string;
}

function getDiscountPercent(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return null;
  }

  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
}

function getVariantOptions(product: Product) {
  const colorOptions: VariantOption[] = product.isLocalMade
    ? [
        { label: "Natural", value: "natural", swatch: "#B55B37" },
        { label: "Blue", value: "blue", swatch: "#175C9E" },
        { label: "Red", value: "red", swatch: "#D13B2F" },
      ]
    : [
        { label: "Black", value: "black", swatch: "#111827" },
        { label: "Blue", value: "blue", swatch: "#175C9E" },
        { label: "Mango", value: "mango", swatch: "#F4A62A" },
      ];

  const needsSize = product.categoryId === "cat-fashion" || product.name.toLowerCase().includes("shirt");
  const sizeOptions: VariantOption[] = needsSize
    ? [
        { label: "S", value: "s" },
        { label: "M", value: "m" },
        { label: "L", value: "l" },
        { label: "XL", value: "xl" },
      ]
    : [];

  return { colorOptions, sizeOptions };
}

function isVariantUnavailable(product: Product, color: string, size?: string) {
  if (product.stock <= 0 || product.status !== "active") {
    return true;
  }

  if (color === "red" && product.stock < 15) {
    return true;
  }

  if (size === "xl" && product.categoryId === "cat-fashion") {
    return true;
  }

  return false;
}

function getGallery(product: Product) {
  return [
    { id: "front", label: "Front", src: product.image },
    { id: "detail", label: "Detail", src: product.image },
    { id: "scale", label: "Scale", src: product.image },
    { id: "packaging", label: "Packaging", src: product.image },
  ];
}

function getSpecifications(product: Product) {
  const category = categories.find((item) => item.id === product.categoryId);

  return [
    ["Brand", product.brand ?? "Maket Lakay vendor"],
    ["Category", category?.name ?? "Marketplace"],
    ["Currency", product.currency],
    ["Stock", product.stock > 0 ? `${product.stock} available` : "Not available"],
    ["Made locally", product.isLocalMade ? "Yes" : "No"],
    ["SKU", product.id.toUpperCase()],
  ];
}

export function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const router = useRouter();
  const {
    addToCart,
    isInWishlist,
    isReady,
    localReviews,
    recentlyViewed,
    toggleWishlist,
    trackRecentlyViewed,
  } = useMarketplaceStorage();
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [selectedColor, setSelectedColor] = React.useState("");
  const [selectedSize, setSelectedSize] = React.useState("");

  React.useEffect(() => {
    if (product) {
      const { colorOptions, sizeOptions } = getVariantOptions(product);
      setSelectedColor(colorOptions[0]?.value ?? "");
      setSelectedSize(sizeOptions[0]?.value ?? "");
    }
  }, [product]);

  React.useEffect(() => {
    if (product && isReady) {
      trackRecentlyViewed(product.id);
    }
  }, [isReady, product, trackRecentlyViewed]);

  if (!isReady) {
    return (
      <div className="container space-y-6 py-6">
        <div className="h-5 w-72 animate-pulse bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="aspect-square animate-pulse border bg-muted" />
          <div className="space-y-4">
            <div className="h-12 animate-pulse bg-muted" />
            <div className="h-20 animate-pulse bg-muted" />
            <div className="h-48 animate-pulse border bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-10">
        <EmptyState
          icon={Package}
          title="Product not found"
          description="This Maket Lakay product is not available in local data."
          actionLabel="Browse products"
        />
      </div>
    );
  }

  const store = stores.find((item) => item.id === product.storeId);
  const vendor = store ? vendors.find((item) => item.id === store.vendorId) : undefined;
  const category = categories.find((item) => item.id === product.categoryId);
  const gallery = getGallery(product);
  const { colorOptions, sizeOptions } = getVariantOptions(product);
  const discountPercent = getDiscountPercent(product);
  const productUnavailable = product.status !== "active" || product.stock <= 0;
  const variantUnavailable = isVariantUnavailable(
    product,
    selectedColor,
    selectedSize || undefined,
  );
  const purchaseDisabled = productUnavailable || variantUnavailable;
  const wished = isInWishlist(product.id);
  const reviewSummary = getProductReviewSummary(product.id, localReviews);
  const productReviews = mergeReviews(localReviews).filter(
    (review) => review.productId === product.id,
  );
  const relatedProducts = products
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.categoryId === product.categoryId || item.storeId === product.storeId),
    )
    .slice(0, 4);
  const recentlyViewedProducts = recentlyViewed
    .filter((productId) => productId !== product.id)
    .map((productId) => products.find((item) => item.id === productId))
    .filter(Boolean)
    .slice(0, 4) as Product[];

  function addSelectedToCart() {
    if (!product) {
      return;
    }

    if (purchaseDisabled) {
      toast({
        title: productUnavailable ? "Product unavailable" : "Variant unavailable",
        description: productUnavailable
          ? `${product.name} cannot be purchased right now.`
          : "Choose another color or size before purchasing.",
        variant: "destructive",
      });
      return;
    }

    addToCart(product, quantity, {
      color: selectedColor,
      size: selectedSize || undefined,
    });
  }

  function buyNow() {
    if (!product) {
      return;
    }

    if (purchaseDisabled) {
      addSelectedToCart();
      return;
    }

    addToCart(product, quantity, {
      color: selectedColor,
      size: selectedSize || undefined,
    });
    router.push("/checkout");
  }

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Products", href: "/products" },
          ...(category ? [{ label: category.name, href: `/categories/${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_430px]">
        <section className="grid gap-3 md:grid-cols-[92px_1fr]">
          <div className="order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col">
            {gallery.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={cn(
                  "relative size-20 shrink-0 border bg-muted",
                  selectedImage === index && "border-primary ring-2 ring-primary",
                )}
                onClick={() => setSelectedImage(index)}
                aria-label={`Show ${image.label} image`}
              >
                <Image src={image.src} alt={image.label} fill className="object-cover" />
              </button>
            ))}
          </div>
          <div className="relative order-1 aspect-square overflow-hidden border bg-muted md:order-2">
            <Image
              src={gallery[selectedImage]?.src ?? product.image}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <DiscountBadge
                price={product.price}
                compareAtPrice={product.compareAtPrice}
              />
              {product.isLocalMade ? <Badge variant="success">Local made</Badge> : null}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                {category ? (
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                ) : null}
                <h1 className="mt-2 text-3xl font-black tracking-normal">{product.name}</h1>
              </div>
              <Button
                type="button"
                variant={wished ? "secondary" : "outline"}
                size="icon"
                className={wished ? "text-lakay-red" : undefined}
                onClick={() => toggleWishlist(product)}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={cn("size-5", wished && "fill-current")} />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RatingStars rating={reviewSummary.average} reviewCount={reviewSummary.count} />
              <span className="text-sm text-muted-foreground">
                {product.reviewCount} catalog reviews
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <PriceDisplay
                amount={product.price}
                compareAtAmount={product.compareAtPrice}
                currency={product.currency}
              />
              {discountPercent ? (
                <p className="text-sm font-black text-destructive">
                  Save {discountPercent}% from {formatCurrency(product.compareAtPrice ?? 0, product.currency)}
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 border-t pt-4">
              {store ? (
                <div className="flex items-start gap-3">
                  <span className="flex size-11 items-center justify-center bg-primary font-black text-primary-foreground">
                    {store.logo ?? "ML"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/stores/${store.slug}`} className="font-black hover:text-primary">
                      {store.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {store.city}, {store.country ?? "Haiti"} · Vendor {vendor?.name ?? "Maket Lakay"}
                    </p>
                  </div>
                  <VerificationBadge verified={store.verified} />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {productUnavailable ? (
                  <StatusBadge status={product.stock <= 0 ? "out_of_stock" : product.status} />
                ) : (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="size-3.5" />
                    In stock
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {product.stock > 0 ? `${product.stock} available` : "No inventory available"}
                </span>
              </div>
            </div>
          </section>

          <section className="border bg-white p-5">
            <h2 className="font-black">Choose options</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-bold">Color</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 border px-3 py-2 text-sm font-semibold",
                        selectedColor === color.value && "border-primary bg-primary/5",
                      )}
                      onClick={() => setSelectedColor(color.value)}
                    >
                      <span
                        className="size-4 border"
                        style={{ backgroundColor: color.swatch }}
                        aria-hidden="true"
                      />
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {sizeOptions.length ? (
                <div>
                  <p className="text-sm font-bold">Size</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizeOptions.map((size) => {
                      const unavailable = isVariantUnavailable(product, selectedColor, size.value);

                      return (
                        <button
                          key={size.value}
                          type="button"
                          className={cn(
                            "min-w-12 border px-3 py-2 text-sm font-black",
                            selectedSize === size.value && "border-primary bg-primary/5",
                            unavailable && "cursor-not-allowed bg-muted text-muted-foreground line-through",
                          )}
                          disabled={unavailable}
                          onClick={() => setSelectedSize(size.value)}
                        >
                          {size.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {variantUnavailable && !productUnavailable ? (
                <div className="border border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
                  This variant is unavailable. Choose another option.
                </div>
              ) : null}

              <div>
                <p className="text-sm font-bold">Quantity</p>
                <div className="mt-2 flex w-36 items-center border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="flex-1 text-center font-black">{quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={quantity >= Math.max(1, product.stock)}
                    onClick={() =>
                      setQuantity((value) => Math.min(Math.max(1, product.stock), value + 1))
                    }
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" disabled={purchaseDisabled} onClick={addSelectedToCart}>
                  <ShoppingCart className="size-4" />
                  Add to cart
                </Button>
                <Button type="button" variant="secondary" disabled={purchaseDisabled} onClick={buyNow}>
                  Buy now
                </Button>
              </div>
              {purchaseDisabled ? (
                <p className="text-xs font-semibold text-muted-foreground">
                  Purchase buttons are disabled while the product or selected variant is unavailable.
                </p>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              {
                icon: Truck,
                title: "Delivery",
                text: store ? `Ships from ${store.city}. Local delivery fee calculated at checkout.` : "Delivery fee calculated at checkout.",
              },
              {
                icon: RotateCcw,
                title: "Returns",
                text: "Refund requests and disputes are handled through support tools.",
              },
              {
                icon: ShieldCheck,
                title: "Trust",
                text: store?.verified ? "Verified vendor profile." : "Vendor verification pending.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="border bg-white p-4">
                <Icon className="size-5 text-primary" />
                <p className="mt-2 font-black">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="border bg-white p-5">
            <h2 className="text-xl font-black">Product description</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{product.description}</p>
          </div>

          <div className="border bg-white p-5">
            <h2 className="text-xl font-black">Specifications</h2>
            <div className="mt-4 divide-y border">
              {getSpecifications(product).map(([label, value]) => (
                <div key={label} className="grid gap-2 p-3 text-sm sm:grid-cols-[180px_1fr]">
                  <p className="font-bold">{label}</p>
                  <p className="text-muted-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border bg-white p-5">
            <h2 className="text-xl font-black">Reviews</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RatingStars rating={reviewSummary.average} />
              <p className="font-black">{reviewSummary.average.toFixed(1)} out of 5</p>
              <p className="text-sm text-muted-foreground">{reviewSummary.count} customer reviews</p>
            </div>
            <div className="mt-5 space-y-3">
              {productReviews.length ? (
                productReviews.map((review) => (
                  <article key={review.id} className="border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-black">{review.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.body}</p>
                  </article>
                ))
              ) : (
                <p className="border p-4 text-sm text-muted-foreground">
                  No local reviews for this product yet. Reviews submitted on `/reviews` will appear here.
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="border bg-white p-5">
            <div className="flex items-center gap-2">
              <StoreIcon className="size-5 text-primary" />
              <h2 className="text-xl font-black">Vendor policies</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                Orders are confirmed by the vendor before delivery assignment. Delivery zones and ETA are mocked locally.
              </p>
              <p>
                Refund requests, disputes, and product reports are available through Maket Lakay support.
              </p>
              <p>
                Payment, wallet, and commission behavior stays in local data for this frontend phase.
              </p>
            </div>
          </div>

          <div className="border bg-white p-5">
            <h2 className="text-xl font-black">Quick support</h2>
            <div className="mt-3 grid gap-2">
              <Button asChild variant="outline">
                <Link href="/support">Request refund or support</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/reviews">Write a review</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Related products</h2>
          {category ? (
            <Link href={`/categories/${category.slug}`} className="text-sm font-bold text-primary">
              View category
            </Link>
          ) : null}
        </div>
        {relatedProducts.length ? (
          <ProductGrid products={relatedProducts} />
        ) : (
          <EmptyState title="No related products" description="Related products appear when local data has matching categories or stores." />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-black">Recently viewed</h2>
        {recentlyViewedProducts.length ? (
          <ProductGrid products={recentlyViewedProducts} />
        ) : (
          <div className="border bg-white p-5 text-sm text-muted-foreground">
            Recently viewed products will appear here as you browse.
          </div>
        )}
      </section>
    </div>
  );
}
