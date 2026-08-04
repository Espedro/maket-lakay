import { StoresPageClient } from "@/components/marketplace/stores-page-client";
import { getStores } from "@/services/vendors";

export default async function StoresPage() {
  const stores = await getStores();

  return <StoresPageClient stores={stores} />;
}
