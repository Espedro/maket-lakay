import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

export default function CheckoutPage() {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <section className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select an address, review vendor delivery fees, validate stock, and
          choose a digital payment method.
        </p>
      </section>
      <CheckoutPageClient />
    </div>
  );
}
