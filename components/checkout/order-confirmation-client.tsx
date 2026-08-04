"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, MapPin, PackageCheck, Truck, WalletCards } from "lucide-react";

import { EmptyState } from "@/components/marketplace/empty-state";
import { Button } from "@/components/ui/button";
import { customerAddresses } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CheckoutOrderSnapshot } from "@/types";

export function OrderConfirmationClient() {
  const { getOrderSnapshot, isReady } = useMarketplaceStorage();
  const [order, setOrder] = React.useState<CheckoutOrderSnapshot | null>(null);

  React.useEffect(() => {
    if (isReady) {
      setOrder(getOrderSnapshot());
    }
  }, [getOrderSnapshot, isReady]);

  if (!isReady) {
    return <div className="h-64 animate-pulse border bg-muted" />;
  }

  if (!order) {
    return (
      <EmptyState
        icon={PackageCheck}
        title="No recent order found"
        description="Place an order from checkout to see confirmation details here."
        actionLabel="Go to products"
      />
    );
  }

  const fallbackAddress = customerAddresses.find((item) => item.id === order.addressId);
  const address = order.deliveryAddress ?? fallbackAddress;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="border bg-white p-6">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="mt-1 size-10 text-accent" />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
              Order confirmed
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              Thank you for shopping Maket Lakay
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Order {order.id} was placed on {formatDate(order.placedAt)}. Your cart
              has been cleared and the order has been saved to your account.
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y border">
          {order.vendorGroups.map((group) => (
            <div key={group.storeId} className="p-4">
              <div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div>
                    <h2 className="font-black">{group.storeName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {group.itemCount} item{group.itemCount > 1 ? "s" : ""} · Delivery fee{" "}
                      {formatCurrency(group.deliveryFee)}
                    </p>
                  </div>
                  <p className="font-black">
                    {formatCurrency(group.subtotal + group.deliveryFee)}
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  {group.items?.map((item) => (
                    <div
                      key={`${group.storeId}-${item.productId}`}
                      className="grid gap-2 border bg-white p-3 text-sm sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-bold">{item.productName}</p>
                        <p className="text-muted-foreground">
                          Qty {item.quantity} · {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>
                      <p className="font-black">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <ConfirmationTile
            icon={MapPin}
            title="Delivery address"
            text={
              address
                ? `${address.recipientName}, ${address.line1}, ${address.city}, ${address.region}`
                : "Selected address"
            }
          />
          <ConfirmationTile
            icon={Truck}
            title="Delivery method"
            text={order.deliveryMethodLabel ?? "Selected delivery method"}
          />
          <ConfirmationTile
            icon={WalletCards}
            title="Payment"
            text={order.paymentMethodLabel ?? "Selected payment method"}
          />
        </div>
      </section>

      <aside className="space-y-4">
        <section className="border bg-white p-4">
          <h2 className="text-xl font-black">Confirmation summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Order number</dt>
              <dd className="font-semibold">{order.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Subtotal</dt>
              <dd className="font-semibold">{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Delivery fees</dt>
              <dd className="font-semibold">{formatCurrency(order.deliveryFee)}</dd>
            </div>
            {order.discount ? (
              <div className="flex justify-between gap-3 text-accent">
                <dt>Discount</dt>
                <dd className="font-semibold">-{formatCurrency(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 border-t pt-3 text-lg font-black">
              <dt>Total</dt>
              <dd>{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className="border bg-white p-4">
          <h2 className="font-black">Delivering to</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {address
              ? `${address.recipientName}, ${address.line1}${
                  address.line2 ? `, ${address.line2}` : ""
                }, ${address.city}, ${address.country}`
              : "Selected address"}
          </p>
        </section>
        <Button asChild className="w-full">
          <Link href={order.trackingHref ?? `/orders/${order.id}`}>View tracking</Link>
        </Button>
        <Button asChild className="w-full" variant="outline">
          <Link href="/products">Keep shopping</Link>
        </Button>
      </aside>
    </div>
  );
}

function ConfirmationTile({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="border bg-white p-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6">{text}</p>
    </div>
  );
}
