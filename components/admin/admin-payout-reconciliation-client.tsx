"use client";

import * as React from "react";
import { AlertTriangle, CreditCard, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOrdersNeedingTransferReconciliation } from "@/services/orders";
import type { Order } from "@/types";

function statusVariant(status?: string) {
  if (status === "failed") return "destructive";
  return "neutral";
}

export function AdminPayoutReconciliationClient() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setIsReady(false);
    getOrdersNeedingTransferReconciliation().then((data) => {
      setOrders(data);
      setIsReady(true);
    });
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Payout reconciliation</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Card-paid orders whose Stripe Connect transfer to the vendor failed or never
              completed. The customer&apos;s payment already succeeded for every order here -
              only the vendor&apos;s payout needs manual follow-up in the Stripe dashboard.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={refresh}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </section>

      <section className="border bg-white p-5">
        {!isReady ? (
          <div className="h-40 animate-pulse border bg-muted" />
        ) : orders.length === 0 ? (
          <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            <CreditCard className="mx-auto mb-2 size-6 text-primary" />
            No payouts need attention right now.
          </div>
        ) : (
          <ResponsiveDataView
            items={orders}
            getKey={(order) => order.id}
            cardTitle={(order) => order.id}
            cardDescription={(order) => `Store ${order.storeId}`}
            cardMeta={(order) => (
              <Badge variant={statusVariant(order.stripeTransferStatus)}>
                {order.stripeTransferStatus ?? "pending"}
              </Badge>
            )}
            cardFields={(order) => [
              { label: "Vendor payout", value: formatCurrency(order.vendorPayout ?? 0) },
              { label: "Payment intent", value: order.stripePaymentIntentId ?? "-" },
              { label: "Placed", value: formatDate(order.placedAt) },
            ]}
            emptyState={null}
            table={
              <table className="responsive-table min-w-[900px]">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-3 font-medium">Order</th>
                    <th className="py-3 font-medium">Store</th>
                    <th className="py-3 font-medium">Vendor payout</th>
                    <th className="py-3 font-medium">Payment intent</th>
                    <th className="py-3 font-medium">Status</th>
                    <th className="py-3 font-medium">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3 font-black">{order.id}</td>
                      <td className="py-3">{order.storeId}</td>
                      <td className="py-3">{formatCurrency(order.vendorPayout ?? 0)}</td>
                      <td className="py-3">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="size-3 text-lakay-mango" />
                          {order.stripePaymentIntentId ?? "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant(order.stripeTransferStatus)}>
                          {order.stripeTransferStatus ?? "pending"}
                        </Badge>
                      </td>
                      <td className="py-3">{formatDate(order.placedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />
        )}
      </section>
    </div>
  );
}
