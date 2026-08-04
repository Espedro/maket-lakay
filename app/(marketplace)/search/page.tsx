import Link from "next/link";

import { ProductDiscoveryView } from "@/components/discovery/product-discovery-view";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { StoreCard } from "@/components/marketplace/store-card";
import { Button } from "@/components/ui/button";
import { categories as allCategories } from "@/data/mock-data";
import { searchCategories, searchStores } from "@/lib/product-discovery";
import { getProducts } from "@/services/products";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = getParamValue(params.q)?.trim() ?? "";
  const categorySlug = getParamValue(params.category);
  const selectedCategory = allCategories.find(
    (category) => category.slug === categorySlug,
  );
  const stores = searchStores(query).slice(0, 3);
  const categories = searchCategories(query).slice(0, 6);
  const products = await getProducts();
  const suggestions = query
    ? [`${query} deals`, `${query} near Haiti`, `${query} from verified stores`]
    : ["Haitian coffee", "solar lantern", "school supplies"];

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <section className="border bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Search results
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">
          {query ? `Results for "${query}"` : "Search Maket Lakay"}
        </h1>
        {categorySlug && categorySlug !== "all" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Category filter: {categorySlug}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3 border bg-white p-4">
          <h2 className="text-lg font-black">Search suggestions</h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button key={suggestion} asChild variant="outline">
                <Link href={`/search?q=${encodeURIComponent(suggestion)}`}>
                  {suggestion}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3 border bg-white p-4">
          <h2 className="text-lg font-black">Category suggestions</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button key={category.id} asChild variant="outline">
                <Link href={`/categories/${category.slug}`}>{category.name}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {stores.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-black">Vendor results</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-black">Product results</h2>
        <ProductDiscoveryView
          products={products}
          initialFilters={{ query, categoryId: selectedCategory?.id }}
        />
      </section>
    </div>
  );
}
