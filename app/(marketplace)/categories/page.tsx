import Link from "next/link";

import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/mock-data";
import { getProducts } from "@/services/products";

export default async function CategoriesPage() {
  const products = await getProducts();

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Categories" }]} />
      <section className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse Maket Lakay by marketplace department.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const count = products.filter(
            (product) => product.categoryId === category.id,
          ).length;

          return (
            <article key={category.id} className="border bg-white p-4">
              <h2 className="text-xl font-black">{category.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
                {category.description}
              </p>
              <p className="mt-3 text-sm font-semibold">{count} products</p>
              <Button asChild className="mt-4">
                <Link href={`/categories/${category.slug}`}>Shop category</Link>
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
