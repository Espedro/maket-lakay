"use client";

import { createClient } from "@/lib/supabase/client";
import { mapOrderRow } from "@/lib/supabase/mappers";
import type { Order, OrderStatus } from "@/types";

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

  return { ok: true as const };
}

export async function getRealOrdersByStore(storeId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("store_id", storeId);

  if (error || !data) {
    return [];
  }

  return data.map(mapOrderRow);
}

export async function getRealOrdersByCustomer(customerProfileId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("customer_profile_id", customerProfileId);

  if (error || !data) {
    return [];
  }

  return data.map(mapOrderRow);
}
