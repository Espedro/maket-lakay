import { Badge } from "@/components/ui/badge";
import type { OrderStatus, ProductStatus, VerificationStatus } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus | ProductStatus | VerificationStatus;
}

const labels: Record<StatusBadgeProps["status"], string> = {
  active: "Active",
  cancelled: "Cancelled",
  confirmed: "Confirmed",
  delivered: "Delivered",
  draft: "Draft",
  out_for_delivery: "Out for delivery",
  out_of_stock: "Out of stock",
  pending: "Pending",
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  shipped: "Shipped",
  unverified: "Unverified",
  verified: "Verified",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "active" || status === "verified" || status === "delivered"
      ? "success"
      : status === "cancelled" || status === "out_of_stock" || status === "unverified"
        ? "destructive"
        : status === "pending" || status === "draft"
          ? "neutral"
          : "secondary";

  return <Badge variant={variant}>{labels[status]}</Badge>;
}
