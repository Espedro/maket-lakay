import { createClient } from "@/lib/supabase/client";
import {
  mapOrderRow,
  mapPayoutRequestRow,
  mapVendorPromotionRow,
  toVendorPromotionRow,
} from "@/lib/supabase/mappers";
import type { PayoutRequest, VendorPromotion } from "@/lib/vendor-commerce";
import { calculateCommission } from "@/lib/payments";
import type { EarningsTransaction } from "@/lib/vendor-commerce";

export async function getRealPromotions(storeId: string): Promise<VendorPromotion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vendor_promotions")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapVendorPromotionRow);
}

export async function saveRealPromotion(promotion: VendorPromotion, storeId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vendor_promotions")
    .insert(toVendorPromotionRow(promotion, storeId));

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getRealPayoutRequests(storeId: string): Promise<PayoutRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("store_id", storeId)
    .order("requested_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapPayoutRequestRow);
}

export async function createRealPayoutRequest(request: PayoutRequest, storeId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("payout_requests").insert({
    store_id: storeId,
    method: request.method,
    amount: request.amount,
    currency: request.currency,
    account_label: request.accountLabel,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

/** Admin-only (RLS). Relies on the admin RLS bypass to see every payout request. */
export async function getAllRealPayoutRequests(): Promise<PayoutRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapPayoutRequestRow);
}

export async function updateRealPayoutRequestStatus(requestId: string, status: PayoutRequest["status"]) {
  const supabase = createClient();
  const { error } = await supabase
    .from("payout_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export interface RealWalletSummary {
  availableBalance: number;
  pendingBalance: number;
  lifetimeSales: number;
  lifetimeCommission: number;
  currency: "USD" | "HTG";
}

const RESERVED_PAYOUT_STATUSES = new Set(["requested", "processing", "paid"]);

/**
 * Derives the vendor's balance from real orders + payout requests instead of
 * a separately-maintained counter, so it can never drift out of sync:
 *  - lifetime sales/commission: all non-cancelled orders
 *  - pending balance: net revenue from orders still "pending" (not yet confirmed)
 *  - available balance: net revenue from confirmed+ orders, minus anything
 *    already requested/processing/paid out (so a vendor can't over-request)
 */
export async function getRealWalletSummary(storeId: string): Promise<RealWalletSummary> {
  const supabase = createClient();
  const [ordersResult, payoutsResult] = await Promise.all([
    supabase.from("orders").select("status, subtotal").eq("store_id", storeId),
    supabase.from("payout_requests").select("amount, status").eq("store_id", storeId),
  ]);

  if (ordersResult.error || payoutsResult.error || !ordersResult.data || !payoutsResult.data) {
    return { availableBalance: 0, pendingBalance: 0, lifetimeSales: 0, lifetimeCommission: 0, currency: "USD" };
  }

  const activeOrders = ordersResult.data.filter((order) => order.status !== "cancelled");
  const netOf = (subtotal: number) => subtotal - calculateCommission(subtotal);

  const lifetimeSales = activeOrders.reduce((sum, order) => sum + Number(order.subtotal), 0);
  const lifetimeCommission = activeOrders.reduce(
    (sum, order) => sum + calculateCommission(Number(order.subtotal)),
    0,
  );
  const pendingBalance = activeOrders
    .filter((order) => order.status === "pending")
    .reduce((sum, order) => sum + netOf(Number(order.subtotal)), 0);
  const grossAvailable = activeOrders
    .filter((order) => order.status !== "pending")
    .reduce((sum, order) => sum + netOf(Number(order.subtotal)), 0);
  const reservedByPayouts = payoutsResult.data
    .filter((request) => RESERVED_PAYOUT_STATUSES.has(request.status))
    .reduce((sum, request) => sum + Number(request.amount), 0);

  return {
    availableBalance: Math.max(0, grossAvailable - reservedByPayouts),
    pendingBalance: Math.max(0, pendingBalance),
    lifetimeSales,
    lifetimeCommission,
    currency: "USD",
  };
}

export async function getRealEarningsTransactions(storeId: string): Promise<EarningsTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("store_id", storeId);

  if (error || !data) {
    return [];
  }

  return data.flatMap((row): EarningsTransaction[] => {
    const order = mapOrderRow(row);
    const commission = calculateCommission(order.subtotal);

    return [
      {
        id: `txn-${order.id}-sale`,
        type: "sale",
        description: `Order ${order.id}`,
        amount: order.subtotal,
        currency: order.currency,
        storeId,
        orderId: order.id,
        createdAt: order.placedAt,
      },
      {
        id: `txn-${order.id}-commission`,
        type: "commission",
        description: `Platform commission for ${order.id}`,
        amount: -commission,
        currency: order.currency,
        storeId,
        orderId: order.id,
        createdAt: order.placedAt,
      },
    ];
  });
}
