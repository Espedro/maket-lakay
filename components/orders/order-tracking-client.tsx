"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Package, ShieldCheck, Truck } from "lucide-react";

import { EmptyState } from "@/components/marketplace/empty-state";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Button } from "@/components/ui/button";
import { customerAddresses, deliveryZones, stores } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import {
  getOrderTrackingEvents,
  mergeAssignments,
  mergeOrders,
  ORDER_WORKFLOW,
} from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderTrackingClientProps {
  orderId: string;
}

function getStoreName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? "Marketplace store";
}

export function OrderTrackingClient({ orderId }: OrderTrackingClientProps) {
  const { isReady, localAssignments, localOrders, localProofs } = useMarketplaceStorage();
  const order = mergeOrders(localOrders).find((item) => item.id === orderId);
  const assignments = mergeAssignments(localAssignments);

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  if (!order) {
    return (
      <EmptyState
        icon={Package}
        title="Order not found"
        description="This order could not be found in local marketplace data."
        actionLabel="View orders"
      />
    );
  }

  const assignment = assignments.find((item) => item.id === order.deliveryAssignmentId);
  const zone = deliveryZones.find((item) => item.id === order.deliveryZoneId);
  const address = customerAddresses.find(
    (item) => item.customerId === order.customerId && item.city === order.deliveryCity,
  );
  const proof = localProofs.find((item) => item.id === order.proofOfDeliveryId);
  const timeline = getOrderTrackingEvents(order);
  const currentStepIndex = ORDER_WORKFLOW.indexOf(order.status);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/orders">
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
      </Button>

      <section className="border bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Tracking {order.trackingNumber ?? order.id}
              </p>
              <StatusBadge status={order.status} />
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-normal">{order.id}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {getStoreName(order.storeId)} · {formatCurrency(order.total, order.currency)}
            </p>
          </div>
          <div className="border p-3 text-sm">
            <p className="font-black">Estimated delivery</p>
            <p className="mt-1 text-muted-foreground">
              {order.estimatedDeliveryAt ? formatDate(order.estimatedDeliveryAt) : "Pending"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 border bg-white p-4 md:grid-cols-6">
        {ORDER_WORKFLOW.map((status, index) => {
          const completed = currentStepIndex >= index;

          return (
            <div key={status} className="border p-3">
              <span
                className={
                  completed
                    ? "flex size-8 items-center justify-center bg-accent text-accent-foreground"
                    : "flex size-8 items-center justify-center bg-muted text-muted-foreground"
                }
              >
                {completed ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
              <p className="mt-3 text-sm font-black capitalize">
                {status.replaceAll("_", " ")}
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="border bg-white p-5">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <h2 className="text-xl font-black">Tracking timeline</h2>
          </div>
          <div className="mt-5 space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="grid gap-3 border p-3 sm:grid-cols-[140px_1fr]">
                <div className="text-sm font-bold">{formatDate(event.createdAt)}</div>
                <div>
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {event.description}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                    <MapPin className="size-3" />
                    {event.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              <h2 className="font-black">Delivery assignment</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Zone</dt>
                <dd className="text-muted-foreground">{zone?.name ?? "Pending zone"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Courier</dt>
                <dd className="text-muted-foreground">
                  {assignment?.courierName ?? "Not assigned yet"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Courier status</dt>
                <dd className="text-muted-foreground">
                  {assignment?.status.replaceAll("_", " ") ?? "Unassigned"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border bg-white p-4">
            <h2 className="font-black">Delivering to</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {address
                ? `${address.recipientName}, ${address.line1}, ${address.city}, ${address.country}`
                : order.deliveryCity}
            </p>
          </section>

          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-accent" />
              <h2 className="font-black">Proof of delivery</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {proof
                ? `${proof.method} proof captured for ${proof.recipientName} on ${formatDate(proof.deliveredAt)}.`
                : "Proof appears here when the vendor captures delivery confirmation."}
            </p>
          </section>

          <section className="border bg-white p-4">
            <h2 className="font-black">Items</h2>
            <div className="mt-3 divide-y border">
              {order.items.map((item) => (
                <div key={item.productId} className="p-3 text-sm">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="mt-1 text-muted-foreground">
                    Qty {item.quantity} · {formatCurrency(item.unitPrice, order.currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
