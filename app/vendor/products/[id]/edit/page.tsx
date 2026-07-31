import { ProductFormClient } from "@/components/vendor/product-form-client";

interface EditVendorProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditVendorProductPage({
  params,
}: EditVendorProductPageProps) {
  const { id } = await params;

  return <ProductFormClient productId={decodeURIComponent(id)} />;
}
