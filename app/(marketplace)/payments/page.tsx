import { PaymentOperationsClient } from "@/components/payments/payment-operations-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

export default function PaymentsPage() {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Payments" }]} />
      <section className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">Payments</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Digital payment operations: adapter layer, verification records,
          webhook events, refunds, commissions, and vendor wallets.
        </p>
      </section>
      <PaymentOperationsClient />
    </div>
  );
}
