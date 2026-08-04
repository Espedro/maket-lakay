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
