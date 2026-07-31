import { ProductDetailsClient } from "@/components/products/product-details-client";
import { products } from "@/data/mock-data";

interface ProductDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === decodeURIComponent(slug));

  return <ProductDetailsClient product={product} />;
}
