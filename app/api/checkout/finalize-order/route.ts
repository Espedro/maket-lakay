import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe/server";
import { createVendorTransfer } from "@/lib/stripe/connect";
import { calculateCommission } from "@/lib/payments";
import { ORDER_STATUS_LABELS, ORDER_STATUS_MESSAGES } from "@/lib/orders";
import type { OrderStatus } from "@/types";

interface FinalizeOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface FinalizeOrderInput {
  id: string;
  storeId: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  placedAt: string;
  deliveryCity: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  items: FinalizeOrderItem[];
}

const CENT_TOLERANCE = 2;

export async function POST(request: Request) {
  const stripe = getStripeServerClient();

  if (!stripe) {
    return NextResponse.json({ error: "Card payments are not configured yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to finalize an order." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId : "";
  const orderInputs: FinalizeOrderInput[] = Array.isArray(body?.orders) ? body.orders : [];

  if (!paymentIntentId || orderInputs.length === 0) {
    return NextResponse.json({ error: "Missing payment intent or order details." }, { status: 400 });
  }

  // Idempotency: if this PaymentIntent already produced orders, return that
  // result instead of inserting/transferring again (protects against
  // double-submit or a retried request).
  const { data: existingOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (existingOrders && existingOrders.length > 0) {
    return NextResponse.json({
      ok: true,
      orderIds: existingOrders.map((order) => order.id),
      transferFailures: [],
    });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment has not succeeded." }, { status: 400 });
  }

  if (paymentIntent.metadata?.customerProfileId !== user.id) {
    return NextResponse.json({ error: "This payment does not belong to your account." }, { status: 403 });
  }

  const submittedTotalCents = orderInputs.reduce(
    (sum, order) => sum + Math.round(order.total * 100),
    0,
  );

  if (Math.abs(submittedTotalCents - paymentIntent.amount) > CENT_TOLERANCE) {
    return NextResponse.json({ error: "Order total does not match the charged amount." }, { status: 400 });
  }

  const { error: ordersError } = await supabase.from("orders").insert(
    orderInputs.map((order) => {
      const commission = calculateCommission(order.subtotal);

      return {
        id: order.id,
        customer_profile_id: user.id,
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
        stripe_payment_intent_id: paymentIntentId,
        stripe_transfer_status: "pending",
        commission,
        vendor_payout: order.subtotal - commission,
      };
    }),
  );

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
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

  await supabase.from("order_items").insert(itemRows);

  const eventRows = orderInputs.flatMap((order) => {
    const events = [{ status: "pending" as OrderStatus, createdAt: order.placedAt }];
    if (order.status === "confirmed") {
      events.push({ status: "confirmed" as OrderStatus, createdAt: order.placedAt });
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

  // Orders are now durably recorded. From here, a transfer failure for one
  // vendor never loses the customer's order - it just needs reconciliation.
  const transferFailures: Array<{ storeId: string; reason: string }> = [];

  const storeIds = orderInputs.map((order) => order.storeId);
  const { data: storeRows } = await supabase
    .from("stores")
    .select("id, vendor_id, vendors(stripe_connect_account_id, stripe_connect_charges_enabled)")
    .in("id", storeIds);

  for (const order of orderInputs) {
    const storeRow = storeRows?.find((row) => row.id === order.storeId);
    const vendor = storeRow?.vendors as unknown as
      | { stripe_connect_account_id: string | null; stripe_connect_charges_enabled: boolean }
      | null;

    if (!vendor?.stripe_connect_account_id || !vendor.stripe_connect_charges_enabled) {
      transferFailures.push({ storeId: order.storeId, reason: "Vendor payout account is not ready." });
      await supabase.rpc("set_order_transfer_status", {
        order_id: order.id,
        transfer_id: "",
        transfer_status: "failed",
      });
      continue;
    }

    const commission = calculateCommission(order.subtotal);
    const vendorPayout = order.subtotal - commission;

    const transfer = await createVendorTransfer({
      storeId: order.storeId,
      vendorConnectAccountId: vendor.stripe_connect_account_id,
      amount: vendorPayout,
      currency: order.currency,
      transferGroup: paymentIntentId,
    });

    await supabase.rpc("set_order_transfer_status", {
      order_id: order.id,
      transfer_id: transfer.transferId ?? "",
      transfer_status: transfer.ok ? "succeeded" : "failed",
    });

    if (!transfer.ok) {
      transferFailures.push({ storeId: order.storeId, reason: transfer.reason ?? "Transfer failed." });
    }
  }

  return NextResponse.json({
    ok: true,
    orderIds: orderInputs.map((order) => order.id),
    transferFailures,
  });
}
