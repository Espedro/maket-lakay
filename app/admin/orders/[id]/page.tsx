import { AdminOrderDetailsClient } from "@/components/admin/admin-order-details-client";

interface AdminOrderDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminOrderDetailsPage({ params }: AdminOrderDetailsPageProps) {
  const { id } = await params;

  return <AdminOrderDetailsClient orderId={decodeURIComponent(id)} />;
}
