"use client";

import * as React from "react";
import { Flag, MessageSquareText, Star } from "lucide-react";

import { RatingStars } from "@/components/marketplace/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { customers, products, stores } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import {
  getReportTargetLabel,
  getStoreRatingSummary,
  mergeMarketplaceReports,
  mergeReviews,
  mergeStoreReviews,
} from "@/lib/support";
import { formatDate } from "@/lib/utils";

const VENDOR_STORE_IDS = ["store-bel-lakay"];

function customerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? "Customer";
}

export function VendorReviewsClient() {
  const { isReady, localReports, localReviews, localStoreReviews } = useMarketplaceStorage();
  const vendorProducts = products.filter((product) =>
    VENDOR_STORE_IDS.includes(product.storeId),
  );
  const vendorProductIds = vendorProducts.map((product) => product.id);
  const productReviews = mergeReviews(localReviews).filter((review) =>
    vendorProductIds.includes(review.productId),
  );
  const storeRatingReviews = mergeStoreReviews(localStoreReviews).filter((review) =>
    VENDOR_STORE_IDS.includes(review.storeId),
  );
  const reports = mergeMarketplaceReports(localReports).filter((report) => {
    if (report.targetType === "product") {
      return vendorProductIds.includes(report.targetId);
    }

    return VENDOR_STORE_IDS.includes(report.targetId);
  });
  const storeSummary = getStoreRatingSummary(VENDOR_STORE_IDS[0], localStoreReviews);

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Product reviews", value: productReviews.length, icon: MessageSquareText },
          { label: "Store rating", value: storeSummary.average.toFixed(1), icon: Star },
          { label: "Reports", value: reports.length, icon: Flag },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </div>
              <Icon className="size-8 text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Product reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {productReviews.map((review) => {
              const product = products.find((item) => item.id === review.productId);

              return (
                <article key={review.id} className="border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{review.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product?.name ?? review.productId} · {customerName(review.customerId)}
                      </p>
                    </div>
                    <RatingStars rating={review.rating} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span>{formatDate(review.createdAt)}</span>
                    <span>{review.helpfulCount ?? 0} helpful votes</span>
                    <Badge variant={review.status === "flagged" ? "destructive" : "success"}>
                      {review.status ?? "published"}
                    </Badge>
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border p-4">
                <p className="font-black">
                  {stores.find((store) => store.id === VENDOR_STORE_IDS[0])?.name}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <RatingStars rating={storeSummary.average} />
                  <span className="font-black">{storeSummary.average.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {storeSummary.count} total store ratings
                </p>
              </div>
              <div className="mt-3 space-y-3">
                {storeRatingReviews.map((review) => (
                  <div key={review.id} className="border p-3 text-sm">
                    <p className="font-black">{review.title}</p>
                    <p className="mt-1 text-muted-foreground">{review.body}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reports involving this vendor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.length ? (
                reports.map((report) => (
                  <div key={report.id} className="border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black">{getReportTargetLabel(report)}</p>
                      <Badge variant="secondary">{report.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {report.reason} · {formatDate(report.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reports for this vendor in local data.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
