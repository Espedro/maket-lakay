"use client";

import * as React from "react";
import { RefreshCw, RotateCcw, ShieldCheck, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { paymentRecords, refundRecords, vendorWallets } from "@/data/mock-data";
import {
  PAYMENT_RECORDS_KEY,
  PAYMENT_WEBHOOKS_KEY,
  REFUND_RECORDS_KEY,
  paymentAdapters,
} from "@/lib/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentRecord, PaymentWebhookEvent, RefundRecord } from "@/types";

function readLocalRecords<T>(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export function PaymentOperationsClient() {
  const [localPayments, setLocalPayments] = React.useState<PaymentRecord[]>([]);
  const [localWebhooks, setLocalWebhooks] = React.useState<PaymentWebhookEvent[]>([]);
  const [localRefunds, setLocalRefunds] = React.useState<RefundRecord[]>([]);
  const payments = [...localPayments, ...paymentRecords];
  const webhooks = localWebhooks;
  const refunds = [...localRefunds, ...refundRecords];

  const refresh = React.useCallback(() => {
    setLocalPayments(readLocalRecords<PaymentRecord>(PAYMENT_RECORDS_KEY));
    setLocalWebhooks(readLocalRecords<PaymentWebhookEvent>(PAYMENT_WEBHOOKS_KEY));
    setLocalRefunds(readLocalRecords<RefundRecord>(REFUND_RECORDS_KEY));
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [refresh]);

  async function createRefund(payment: PaymentRecord) {
    const adapter = paymentAdapters[payment.provider];
    const refund = await adapter.refundPayment(
      payment,
      Math.min(payment.amount, 10),
      "Customer service refund",
    );
    const nextRefunds = [refund, ...localRefunds];
    window.localStorage.setItem(REFUND_RECORDS_KEY, JSON.stringify(nextRefunds));
    setLocalRefunds(nextRefunds);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Adapters", Object.keys(paymentAdapters).length],
          ["Payments", payments.length],
          ["Webhooks", webhooks.length],
          ["Refunds", refunds.length],
        ].map(([label, value]) => (
          <div key={label} className="border bg-white p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <ShieldCheck className="size-5 text-primary" />
            Payment adapter layer
          </h2>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Object.values(paymentAdapters).map((adapter) => (
            <div key={adapter.provider} className="border p-3">
              <p className="font-black capitalize">{adapter.provider}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                createPayment · verifyPayment · refundPayment · parseWebhook
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border bg-white p-4">
        <h2 className="text-xl font-black">Payment verification records</h2>
        <div className="responsive-table-wrap mt-4">
          <table className="responsive-table min-w-[760px]">
            <thead className="border-b text-left">
              <tr>
                <th className="py-2">Payment</th>
                <th className="py-2">Provider</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Reference</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="py-3 font-semibold">{payment.id}</td>
                  <td className="py-3 capitalize">{payment.provider}</td>
                  <td className="py-3">{formatCurrency(payment.amount, payment.currency)}</td>
                  <td className="py-3">
                    <Badge variant={payment.status === "failed" ? "destructive" : "success"}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="py-3">{payment.providerReference}</td>
                  <td className="py-3">
                    <Button
                      variant="outline"
                      disabled={payment.status !== "captured"}
                      onClick={() => createRefund(payment)}
                    >
                      <RotateCcw className="size-4" />
                      Refund
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border bg-white p-4">
          <h2 className="text-xl font-black">Webhook events</h2>
          <div className="mt-4 space-y-3">
            {webhooks.length ? (
              webhooks.map((event) => (
                <div key={event.id} className="border p-3 text-sm">
                  <p className="font-black">{event.type}</p>
                  <p className="text-muted-foreground">
                    {event.provider} · {event.status} · {formatDate(event.receivedAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Place an order to emit a local webhook event.
              </p>
            )}
          </div>
        </div>
        <div className="border bg-white p-4">
          <h2 className="text-xl font-black">Refund records</h2>
          <div className="mt-4 space-y-3">
            {refunds.map((refund) => (
              <div key={refund.id} className="border p-3 text-sm">
                <p className="font-black">
                  {formatCurrency(refund.amount, refund.currency)} · {refund.status}
                </p>
                <p className="text-muted-foreground">{refund.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border bg-white p-4">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <WalletCards className="size-5 text-primary" />
          Vendor wallet system
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {vendorWallets.map((wallet) => (
            <div key={wallet.id} className="border p-4">
              <p className="font-black">{wallet.id}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Available</dt>
                  <dd className="font-semibold">{formatCurrency(wallet.availableBalance)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Pending</dt>
                  <dd className="font-semibold">{formatCurrency(wallet.pendingBalance)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Lifetime commission</dt>
                  <dd className="font-semibold">{formatCurrency(wallet.lifetimeCommission)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
