import { MockOrderTrackingClient } from "@/components/orders/mock-order-tracking-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

interface OrderTrackingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { id } = await params;
  const decodedOrderNumber = decodeURIComponent(id);

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Orders", href: "/orders" },
          { label: decodedOrderNumber, href: `/orders/${decodedOrderNumber}` },
          { label: "Tracking" },
        ]}
      />
      <MockOrderTrackingClient orderNumber={decodedOrderNumber} />
    </div>
  );
}
