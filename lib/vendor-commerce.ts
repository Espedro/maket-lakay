import type { CurrencyCode } from "@/types";

export const VENDOR_PROMOTIONS_KEY = "maket-lakay-vendor-promotions";

export type DiscountType = "percentage" | "fixed";
export type PromotionStatus = "scheduled" | "active" | "paused" | "ended";
export type PayoutStatus = "requested" | "processing" | "paid" | "rejected";
export type PayoutMethod = "MonCash" | "NatCash" | "ACH" | "Zelle" | "PayPal" | "Stripe";

export interface VendorPromotion {
  id: string;
  storeId?: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  productIds: string[];
  startDate: string;
  endDate: string;
  usageStatus: PromotionStatus;
  views: number;
  orders: number;
  revenue: number;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  storeId?: string;
  method: PayoutMethod;
  amount: number;
  currency: CurrencyCode;
  accountLabel: string;
  status: PayoutStatus;
  requestedAt: string;
}

export interface EarningsTransaction {
  id: string;
  type: "sale" | "commission" | "refund" | "payout";
  description: string;
  amount: number;
  currency: CurrencyCode;
  storeId: string;
  orderId?: string;
  createdAt: string;
}

export const defaultVendorPromotions: VendorPromotion[] = [
  {
    id: "promo-school-2026",
    name: "Back to School Essentials",
    discountType: "percentage",
    discountValue: 12,
    productIds: ["prod-school-kit", "prod-creole-reader"],
    startDate: "2026-07-15",
    endDate: "2026-08-15",
    usageStatus: "active",
    views: 1240,
    orders: 28,
    revenue: 642,
    createdAt: "2026-07-14T12:00:00Z",
  },
  {
    id: "promo-local-favorites",
    name: "Local Favorites Weekend",
    discountType: "fixed",
    discountValue: 5,
    productIds: ["prod-cafe-rebo", "prod-mamba-spicy", "prod-artisan-basket"],
    startDate: "2026-07-19",
    endDate: "2026-07-21",
    usageStatus: "scheduled",
    views: 680,
    orders: 11,
    revenue: 219,
    createdAt: "2026-07-18T09:30:00Z",
  },
];

export function getPayoutRequestStoreId(request: PayoutRequest) {
  return request.storeId ?? "store-bel-lakay";
}
