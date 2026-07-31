import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDiscoveryView } from "@/components/discovery/product-discovery-view";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { Button } from "@/components/ui/button";
import { categories, products } from "@/data/mock-data";

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((category) => ({
    slug: category.slug,
  }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  const categoryProducts = products.filter(
    (product) => product.categoryId === category.id,
  );
  const featuredProducts = categoryProducts
    .filter((product) => product.isFeatured || product.isTrending)
    .slice(0, 4);
  const subcategories = categories
    .filter((item) => item.id !== category.id)
    .slice(0, 6);

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Categories", href: "/categories" }, { label: category.name }]} />
      <section className="border bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Category
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">{category.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {category.description}
        </p>
        <p className="mt-4 text-sm font-semibold">{categoryProducts.length} products</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">Related categories</h2>
        <div className="flex gap-2 overflow-x-auto">
          {subcategories.map((subcategory) => (
            <Button key={subcategory.id} asChild variant="outline">
              <Link href={`/categories/${subcategory.slug}`}>{subcategory.name}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="border bg-primary p-5 text-primary-foreground">
        <h2 className="text-2xl font-black">Deals in {category.name}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/85">
          Explore trusted vendors, local favorites, and diaspora-ready products
          in this category.
        </p>
      </section>

      {featuredProducts.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-black">Featured products</h2>
          <ProductGrid products={featuredProducts} />
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-black">All {category.name}</h2>
        <ProductDiscoveryView
          products={products}
          initialFilters={{ categoryId: category.id }}
          lockedCategoryId={category.id}
        />
      </section>
    </div>
  );
}
