import { OrderTrackingClient } from "@/components/orders/order-tracking-client";

interface OrderTrackingPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { id } = await params;

  return (
    <div className="container py-6">
      <OrderTrackingClient orderId={decodeURIComponent(id)} />
    </div>
  );
}
