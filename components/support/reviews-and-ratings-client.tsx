"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquareText, Star, Store as StoreIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { RatingStars } from "@/components/marketplace/rating-stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

import { customers, products, stores } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import {
  getProductReviewSummary,
  getStoreRatingSummary,
  mergeReviews,
  mergeStoreReviews,
} from "@/lib/support";
import {
  productReviewSchema,
  storeReviewSchema,
  type ProductReviewInput,
  type StoreReviewInput,
} from "@/lib/schemas";
import { formatDate } from "@/lib/utils";
import {
  createRealProductReview,
  createRealStoreReview,
  getAllRealProductReviews,
  getAllRealStoreReviews,
} from "@/services/reviews";
import type { Review, StoreReview } from "@/types";

function customerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? "Customer";
}

export function ReviewsAndRatingsClient() {
  const { isReady } = useMarketplaceStorage();
  const { user, isReady: authReady } = useAuth();
  const [realReviews, setRealReviews] = React.useState<Review[]>([]);
  const [realStoreReviews, setRealStoreReviews] = React.useState<StoreReview[]>([]);
  const [realReviewsReady, setRealReviewsReady] = React.useState(false);

  const refreshRealReviews = React.useCallback(async () => {
    const [fetchedReviews, fetchedStoreReviews] = await Promise.all([
      getAllRealProductReviews(),
      getAllRealStoreReviews(),
    ]);
    setRealReviews(fetchedReviews);
    setRealStoreReviews(fetchedStoreReviews);
    setRealReviewsReady(true);
  }, []);

  React.useEffect(() => {
    refreshRealReviews();
  }, [refreshRealReviews]);

  const productReviewForm = useForm<ProductReviewInput>({
    resolver: zodResolver(productReviewSchema),
    defaultValues: {
      productId: products[0]?.id ?? "",
      rating: 5,
      title: "",
      body: "",
    },
  });
  const storeReviewForm = useForm<StoreReviewInput>({
    resolver: zodResolver(storeReviewSchema),
    defaultValues: {
      storeId: stores[0]?.id ?? "",
      rating: 5,
      title: "",
      body: "",
    },
  });
  const allReviews = mergeReviews(realReviews);
  const allStoreReviews = mergeStoreReviews(realStoreReviews);
  const topProducts = products.slice(0, 6).map((product) => ({
    product,
    summary: getProductReviewSummary(product.id, realReviews),
  }));

  async function submitProductReview(input: ProductReviewInput) {
    if (!user) return;

    const result = await createRealProductReview({
      productId: input.productId,
      customerProfileId: user.id,
      rating: input.rating,
      title: input.title,
      body: input.body,
    });

    if (!result.ok) {
      toast({
        title: "Could not publish review",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    productReviewForm.reset({
      productId: input.productId,
      rating: 5,
      title: "",
      body: "",
    });
    toast({ title: "Review published", description: "Your product review is live." });
    await refreshRealReviews();
  }

  async function submitStoreReview(input: StoreReviewInput) {
    if (!user) return;

    const result = await createRealStoreReview({
      storeId: input.storeId,
      customerProfileId: user.id,
      rating: input.rating,
      title: input.title,
      body: input.body,
    });

    if (!result.ok) {
      toast({
        title: "Could not publish store rating",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    storeReviewForm.reset({
      storeId: input.storeId,
      rating: 5,
      title: "",
      body: "",
    });
    toast({ title: "Store rating published", description: "Your store rating is live." });
    await refreshRealReviews();
  }

  if (!isReady || !authReady || !realReviewsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="flex items-center gap-3">
          <Star className="size-8 fill-secondary text-secondary" />
          <div>
            <h1 className="text-3xl font-black tracking-normal">Reviews and ratings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Product reviews and store ratings for Maket Lakay trust signals.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Product reviews", allReviews.length],
          ["Store ratings", allStoreReviews.length],
          ["Published feedback", allReviews.filter((review) => review.status !== "flagged").length + allStoreReviews.filter((review) => review.status !== "flagged").length],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top reviewed products</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {topProducts.map(({ product, summary }) => (
                <div key={product.id} className="border p-4">
                  <p className="font-black">{product.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{product.brand}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <RatingStars rating={summary.average} />
                    <span className="text-sm font-semibold">
                      {summary.average.toFixed(1)} · {summary.count} reviews
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Store ratings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {stores.map((store) => {
                const summary = getStoreRatingSummary(store.id, realStoreReviews);

                return (
                  <div key={store.id} className="border p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex size-10 items-center justify-center bg-primary font-black text-primary-foreground">
                        {store.logo}
                      </span>
                      <p className="font-black">{store.name}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <RatingStars rating={summary.average} />
                      <span className="text-sm font-semibold">{summary.average.toFixed(1)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {summary.count} ratings · {store.city}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent product reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allReviews.slice(0, 6).map((review) => {
                const product = products.find((item) => item.id === review.productId);

                return (
                  <article key={review.id} className="border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-black">{review.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {product?.name ?? review.productId} · {customerName(review.customerId)}
                        </p>
                      </div>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.body}</p>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </p>
                  </article>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="space-y-3 p-5 text-center">
                <p className="font-black">Log in to write a review</p>
                <p className="text-sm text-muted-foreground">
                  Reviews are linked to your account so shoppers know they are real.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login">Log in</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareText className="size-5 text-primary" />
                Write a product review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={productReviewForm.handleSubmit(submitProductReview)}
              >
                <label className="grid gap-1 text-sm font-semibold">
                  Product
                  <select className="border bg-white px-3 py-2" {...productReviewForm.register("productId")}>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Rating
                  <select className="border bg-white px-3 py-2" {...productReviewForm.register("rating")}>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </label>
                <Input placeholder="Review title" {...productReviewForm.register("title")} />
                <textarea
                  className="min-h-28 w-full border bg-white p-3 text-sm"
                  placeholder="What should other customers know?"
                  {...productReviewForm.register("body")}
                />
                <Button className="w-full" type="submit">
                  Publish review
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="size-5 text-primary" />
                Rate a store
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={storeReviewForm.handleSubmit(submitStoreReview)}
              >
                <label className="grid gap-1 text-sm font-semibold">
                  Store
                  <select className="border bg-white px-3 py-2" {...storeReviewForm.register("storeId")}>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Rating
                  <select className="border bg-white px-3 py-2" {...storeReviewForm.register("rating")}>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} stars
                      </option>
                    ))}
                  </select>
                </label>
                <Input placeholder="Store rating title" {...storeReviewForm.register("title")} />
                <textarea
                  className="min-h-28 w-full border bg-white p-3 text-sm"
                  placeholder="How was the store experience?"
                  {...storeReviewForm.register("body")}
                />
                <Button className="w-full" type="submit">
                  Publish store rating
                </Button>
              </form>
            </CardContent>
          </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
