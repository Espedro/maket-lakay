import { ProductDetailsClient } from "@/components/products/product-details-client";
import { getProductBySlug, getProducts } from "@/services/products";

interface ProductDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));

  return <ProductDetailsClient product={product} />;
}
