import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface OrderSummaryCardProps {
  subtotal: number;
  deliveryFee: number;
  total: number;
  discount?: number;
  itemCount: number;
  stockIssueCount?: number;
  actionHref?: string;
  actionLabel?: string;
  disabled?: boolean;
}

export function OrderSummaryCard({
  subtotal,
  deliveryFee,
  total,
  discount = 0,
  itemCount,
  stockIssueCount = 0,
  actionHref,
  actionLabel = "Continue",
  disabled = false,
}: OrderSummaryCardProps) {
  return (
    <aside className="border bg-white p-4">
      <h2 className="text-xl font-black">Order summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt>Items</dt>
          <dd className="font-semibold">{itemCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Subtotal</dt>
          <dd className="font-semibold">{formatCurrency(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Delivery estimate</dt>
          <dd className="font-semibold">{formatCurrency(deliveryFee)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Discount</dt>
          <dd className="font-semibold text-accent">
            {discount > 0 ? `-${formatCurrency(discount)}` : formatCurrency(0)}
          </dd>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between gap-3 text-lg font-black">
            <dt>Estimated total</dt>
            <dd>{formatCurrency(Math.max(0, total - discount))}</dd>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Totals are shown as a USD checkout estimate.
          </p>
        </div>
      </dl>
      {stockIssueCount ? (
        <p className="mt-4 border border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          Resolve {stockIssueCount} stock issue{stockIssueCount > 1 ? "s" : ""} before checkout.
        </p>
      ) : null}
      {actionHref ? (
        <Button asChild className="mt-4 w-full" disabled={disabled}>
          <Link href={disabled ? "#" : actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </aside>
  );
}
