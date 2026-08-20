"use client";

import { createClient } from "@/lib/supabase/client";
import { mapOrderRow } from "@/lib/supabase/mappers";
import { ORDER_STATUS_LABELS, ORDER_STATUS_MESSAGES } from "@/lib/orders";
import type { Order, OrderStatus } from "@/types";

const ORDERS_SELECT = "*, order_items(*), order_tracking_events(*)";

export interface RealOrderInput {
  id: string;
  customerProfileId: string;
  storeId: string;
  status: OrderStatus;
  currency: Order["currency"];
  subtotal: number;
  deliveryFee: number;
  total: number;
  placedAt: string;
  deliveryCity: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>;
}

export async function createRealOrders(orderInputs: RealOrderInput[]) {
  const supabase = createClient();

  const { error: ordersError } = await supabase.from("orders").insert(
    orderInputs.map((order) => ({
      id: order.id,
      customer_profile_id: order.customerProfileId,
      store_id: order.storeId,
      status: order.status,
      currency: order.currency,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      total: order.total,
      placed_at: order.placedAt,
      delivery_city: order.deliveryCity,
      tracking_number: order.trackingNumber,
      estimated_delivery_at: order.estimatedDeliveryAt,
    })),
  );

  if (ordersError) {
    return { ok: false as const, reason: ordersError.message };
  }

  const itemRows = orderInputs.flatMap((order) =>
    order.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  );

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);

  if (itemsError) {
    return { ok: false as const, reason: itemsError.message };
  }

  const eventRows = orderInputs.flatMap((order) => {
    const events = [{ status: "pending" as OrderStatus, createdAt: order.placedAt }];
    if (order.status === "confirmed") {
      events.push({ status: "confirmed", createdAt: order.placedAt });
    }
    return events.map((event) => ({
      order_id: order.id,
      status: event.status,
      label: ORDER_STATUS_LABELS[event.status],
      message: ORDER_STATUS_MESSAGES[event.status],
      created_at: event.createdAt,
    }));
  });

  await supabase.from("order_tracking_events").insert(eventRows);

  return { ok: true as const };
}

export async function getRealOrdersByStore(storeId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("orders").select(ORDERS_SELECT).eq("store_id", storeId);

  if (error || !data) {
    return [];
  }

  return data.map(mapOrderRow);
}

export async function getRealOrdersByCustomer(customerProfileId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDERS_SELECT)
    .eq("customer_profile_id", customerProfileId);

  if (error || !data) {
    return [];
  }

  return data.map(mapOrderRow);
}

export async function getRealOrderById(orderId: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDERS_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOrderRow(data);
}

/** Admin-only: relies on the admin RLS bypass to see every order. */
export async function getAllRealOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("orders").select(ORDERS_SELECT);

  if (error || !data) {
    return [];
  }

  return data.map(mapOrderRow);
}

/**
 * Admin-only (RLS). Card-paid orders whose vendor transfer needs attention -
 * either it failed outright, or it's still "pending" (the transfer step
 * never completed, e.g. the request crashed between recording the order and
 * attempting the transfer). This is the v1 safety net standing in for a
 * proper transfer.failed webhook.
 */
export async function getOrdersNeedingTransferReconciliation(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDERS_SELECT)
    .not("stripe_payment_intent_id", "is", null)
    .in("stripe_transfer_status", ["failed", "pending"]);

  if (error || !data) {
    return [];
  }

  return data.map(mapOrderRow);
}

/**
 * Admin-only (RLS). Silently affects 0 rows if orderId doesn't exist as a
 * real order (e.g. a mock/demo order id) — safe to call as a best-effort
 * dual write alongside the existing local order-status update. Also records
 * a real tracking-event row for the transition.
 */
export async function updateRealOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  await supabase.from("order_tracking_events").insert({
    order_id: orderId,
    status,
    label: ORDER_STATUS_LABELS[status],
    message: ORDER_STATUS_MESSAGES[status],
  });

  return { ok: true as const };
}

export async function updateRealOrderReviewFlag(orderId: string, markedForReview: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("orders")
    .update({ marked_for_review: markedForReview })
    .eq("id", orderId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function updateRealOrderRefundFlag(orderId: string, refundIssued: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("orders")
    .update({ refund_issued: refundIssued })
    .eq("id", orderId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
