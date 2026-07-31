import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode } from "@/types";

interface PriceDisplayProps {
  amount: number;
  compareAtAmount?: number;
  currency?: CurrencyCode;
}

export function PriceDisplay({
  amount,
  compareAtAmount,
  currency = "USD",
}: PriceDisplayProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-lg font-bold text-foreground">
        {formatCurrency(amount, currency)}
      </span>
      {compareAtAmount ? (
        <span className="text-sm text-muted-foreground line-through">
          {formatCurrency(compareAtAmount, currency)}
        </span>
      ) : null}
    </div>
  );
}
