import { OrderConfirmationClient } from "@/components/checkout/order-confirmation-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

export default function CheckoutConfirmationPage() {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Cart", href: "/cart" },
          { label: "Checkout", href: "/checkout" },
          { label: "Confirmation" },
        ]}
      />
      <OrderConfirmationClient />
    </div>
  );
}
