import { StoreDetailsClient } from "@/components/marketplace/store-details-client";

interface StorePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;

  return <StoreDetailsClient slug={slug} />;
}
