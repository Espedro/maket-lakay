import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({ rating, reviewCount, className }: RatingStarsProps) {
  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      <div className="flex" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "size-4",
              index < Math.round(rating)
                ? "fill-lakay-mango text-lakay-mango"
                : "text-muted-foreground/35",
            )}
          />
        ))}
      </div>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {reviewCount !== undefined ? (
        <span className="text-muted-foreground">({reviewCount})</span>
      ) : null}
    </div>
  );
}
