"use client";

import Link from "next/link";
import * as React from "react";
import { AlertTriangle, ArrowLeft, RefreshCw, Truck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { customerAddresses, customers, paymentRecords, stores } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import {
  createCustomerNotification,
  mergeOrders,
  ORDER_STATUS_LABELS,
  updateOrderStatus,
} from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus, RefundRecord } from "@/types";

interface AdminOrderDetailsClientProps {
  orderId: string;
}

type OrderAction =
  | { type: "cancel"; order: Order }
  | { type: "review"; order: Order }
  | { type: "refund"; order: Order }
  | { type: "delivery"; order: Order; status: OrderStatus };

function getCustomer(order: Order) {
  return customers.find((customer) => customer.id === order.customerId);
}

function getStoreName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

function statusVariant(status: string) {
  if (["captured", "authorized", "delivered", "confirmed"].includes(status)) return "success";
  if (["failed", "cancelled", "refunded"].includes(status)) return "destructive";
  return "neutral";
}

export function AdminOrderDetailsClient({ orderId }: AdminOrderDetailsClientProps) {
  const {
    isReady: storageReady,
    localOrders,
    localPaymentRecords,
    saveCustomerNotification,
    saveLocalOrder,
    saveRefundRecord,
  } = useMarketplaceStorage();
  const { isReady: operationsReady, markOrderForReview, markRefundIssued, state } =
    useAdminOperations();
  const [pendingAction, setPendingAction] = React.useState<OrderAction | null>(null);
  const orders = mergeOrders(localOrders);
  const order = orders.find((item) => item.id === orderId);

  if (!storageReady || !operationsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  if (!order) {
    return (
      <section className="border bg-white p-6">
        <h1 className="text-3xl font-black tracking-normal">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This order could not be found.
        </p>
        <Button asChild className="mt-5">
          <Link href="/admin/orders">Back to orders</Link>
        </Button>
      </section>
    );
  }

  const customer = getCustomer(order);
  const address = customerAddresses.find((item) => item.customerId === order.customerId);
  const payment = [...localPaymentRecords, ...paymentRecords].find(
    (record) => record.orderId === order.id,
  );
  const flag = state.orderFlags[order.id];

  function issueRefund(targetOrder: Order) {
    const refundRecord: RefundRecord = {
      id: `refund-admin-${Date.now()}`,
      paymentId: payment?.id ?? `payment-${targetOrder.id}`,
      orderId: targetOrder.id,
      storeId: targetOrder.storeId,
      amount: targetOrder.total,
      currency: targetOrder.currency,
      status: "processed",
      reason: "Admin simulated refund from order details.",
      createdAt: new Date().toISOString(),
    };

    saveRefundRecord(refundRecord);
    markRefundIssued(targetOrder.id);
    toast({
      title: "Simulated refund issued",
      description: `${formatCurrency(targetOrder.total, targetOrder.currency)} refund recorded for ${targetOrder.id}.`,
    });
  }

  function confirmAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "review") {
      markOrderForReview(pendingAction.order.id);
    }

    if (pendingAction.type === "cancel") {
      const nextOrder = updateOrderStatus(pendingAction.order, "cancelled");
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "cancelled"));
      toast({
        title: "Order cancelled",
        description: `${pendingAction.order.id} was cancelled locally.`,
      });
    }

    if (pendingAction.type === "refund") {
      issueRefund(pendingAction.order);
    }

    if (pendingAction.type === "delivery") {
      const nextOrder = updateOrderStatus(pendingAction.order, pendingAction.status);
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, pendingAction.status));
      toast({
        title: "Delivery status updated",
        description: `${pendingAction.order.id} is now ${ORDER_STATUS_LABELS[pendingAction.status]}.`,
      });
    }

    setPendingAction(null);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/admin/orders">
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
      </Button>

      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Order Details
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">{order.id}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {getStoreName(order.storeId)} - {formatDate(order.placedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
            <Badge variant={statusVariant(payment?.status ?? "authorized")}>
              {payment?.status ?? "authorized"}
            </Badge>
            {flag?.markedForReview ? <Badge variant="destructive">review</Badge> : null}
            {flag?.refundIssued ? <Badge variant="neutral">refund issued</Badge> : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailTile label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
            <DetailTile label="Delivery fee" value={formatCurrency(order.deliveryFee, order.currency)} />
            <DetailTile label="Total" value={formatCurrency(order.total, order.currency)} />
          </div>

          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Products</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.productId} className="grid gap-3 border p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-black">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">Qty {item.quantity}</p>
                  </div>
                  <p className="font-black">
                    {formatCurrency(item.quantity * item.unitPrice, order.currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Timeline</h2>
            <div className="mt-4 space-y-3">
              {(order.statusHistory ?? []).map((event) => (
                <div key={event.id} className="border-l-4 border-primary bg-muted/30 p-3">
                  <p className="font-black">{event.label}</p>
                  <p className="text-sm text-muted-foreground">{event.message}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Customer</h2>
            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="Name" value={customer?.name ?? order.customerId} />
              <InfoRow label="Email" value={customer?.email ?? "N/A"} />
              <InfoRow
                label="Address"
                value={
                  address
                    ? `${address.line1}, ${address.city}, ${address.country}`
                    : order.deliveryCity
                }
              />
            </div>
          </section>

          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Admin actions</h2>
            <div className="mt-4 space-y-3">
              <ActionButton
                icon={AlertTriangle}
                label="Mark for review"
                onClick={() => setPendingAction({ type: "review", order })}
              />
              <ActionButton
                icon={RefreshCw}
                label="Issue simulated refund"
                onClick={() => setPendingAction({ type: "refund", order })}
              />
              <ActionButton
                icon={Truck}
                label="Update delivery status"
                onClick={() =>
                  setPendingAction({
                    type: "delivery",
                    order,
                    status:
                      order.status === "ready_for_delivery"
                        ? "out_for_delivery"
                        : order.status === "out_for_delivery"
                          ? "delivered"
                          : "ready_for_delivery",
                  })
                }
              />
              <ActionButton
                icon={XCircle}
                label="Cancel order"
                onClick={() => setPendingAction({ type: "cancel", order })}
              />
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Confirm order action</DialogTitle>
            <DialogDescription>This updates local order data only.</DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">
            {pendingAction?.type === "delivery"
              ? `Update ${order.id} to ${ORDER_STATUS_LABELS[pendingAction.status]}?`
              : `Apply ${pendingAction?.type} action to ${order.id}?`}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-white p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="w-full justify-start rounded-none" onClick={onClick}>
      <Icon className="size-4" />
      {label}
    </Button>
  );
}
