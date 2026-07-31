import { AdminVendorDetailsClient } from "@/components/admin/admin-vendor-details-client";

interface AdminVendorDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminVendorDetailsPage({ params }: AdminVendorDetailsPageProps) {
  const { id } = await params;

  return <AdminVendorDetailsClient vendorId={decodeURIComponent(id)} />;
}
