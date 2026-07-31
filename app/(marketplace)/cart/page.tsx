import { CartPageClient } from "@/components/checkout/cart-page-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

export default function CartPage() {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <CartPageClient />
    </div>
  );
}
