import Link from "next/link";
import { ArrowRight, MapPin, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { VerificationBadge } from "@/components/marketplace/verification-badge";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className={cn("h-2", store.bannerColor)} />
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white shadow-sm",
                store.bannerColor,
              )}
            >
              {store.logo ?? store.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 space-y-1">
              <Link
                href={`/stores/${store.slug}`}
                className="line-clamp-1 font-semibold hover:text-primary"
              >
                {store.name}
              </Link>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                {store.city}
                {store.country ? `, ${store.country}` : null}
              </p>
            </div>
          </div>
          <VerificationBadge verified={store.verified} />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{store.description}</p>
        <div className="flex items-center justify-between gap-3">
          <RatingStars rating={store.rating} reviewCount={store.reviewCount} />
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Package className="size-4" />
            {store.productCount}
          </span>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/stores/${store.slug}`}>
            View store <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
