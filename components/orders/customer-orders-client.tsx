"use client";

import Link from "next/link";
import * as React from "react";
import { Bell, PackageSearch, Truck } from "lucide-react";

import { EmptyState } from "@/components/marketplace/empty-state";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Button } from "@/components/ui/button";
import { customerNotifications, stores } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { getOrderTrackingEvents, mergeOrders } from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

function getStoreName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? "Marketplace store";
}

export function CustomerOrdersClient() {
  const { customerNotifications: localNotifications, isReady, localOrders } =
    useMarketplaceStorage();
  const orders = mergeOrders(localOrders);
  const notifications = [...localNotifications, ...customerNotifications];

  if (!isReady) {
    return <div className="h-80 animate-pulse border bg-muted" />;
  }

  if (!orders.length) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No orders yet"
        description="Place a checkout order to see delivery tracking here."
        actionLabel="Browse products"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="flex items-center gap-3">
          <Truck className="size-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Your orders</h1>
            <p className="text-sm text-muted-foreground">
              Track vendor status, delivery assignment, ETA, and proof of delivery.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {orders.map((order) => {
            const timeline = getOrderTrackingEvents(order);
            const latestEvent = timeline.at(-1);

            return (
              <article key={order.id} className="border bg-white p-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black">{order.id}</h2>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getStoreName(order.storeId)} · Placed {formatDate(order.placedAt)}
                    </p>
                    <p className="mt-3 text-sm">
                      Delivering to <span className="font-bold">{order.deliveryCity}</span>
                      {order.estimatedDeliveryAt
                        ? ` · ETA ${formatDate(order.estimatedDeliveryAt)}`
                        : ""}
                    </p>
                    {latestEvent ? (
                      <p className="mt-2 border-l-4 border-primary pl-3 text-sm text-muted-foreground">
                        {latestEvent.title}: {latestEvent.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <p className="text-xl font-black">
                      {formatCurrency(order.total, order.currency)}
                    </p>
                    <Button asChild>
                      <Link href={`/orders/${order.id}/tracking`}>Track order</Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="border bg-white p-4">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <h2 className="font-black">Customer notifications</h2>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 6).map((notification) => (
              <div key={notification.id} className="border p-3 text-sm">
                <p className="font-bold">{notification.title}</p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  {notification.message}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
