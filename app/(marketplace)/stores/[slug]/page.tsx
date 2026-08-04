import { StoreDetailsClient } from "@/components/marketplace/store-details-client";
import { getProductsByStore } from "@/services/products";
import { getStoreBySlug, getVendorById } from "@/services/vendors";

interface StorePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  const [vendor, products] = await Promise.all([
    store ? getVendorById(store.vendorId) : undefined,
    store ? getProductsByStore(store.id) : Promise.resolve([]),
  ]);

  return <StoreDetailsClient store={store} vendor={vendor} products={products} />;
}
