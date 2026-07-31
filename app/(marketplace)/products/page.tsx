import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { ProductDiscoveryView } from "@/components/discovery/product-discovery-view";
import { products } from "@/data/mock-data";

export default function ProductsPage() {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Products" }]} />
      <div className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">All products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse Maket Lakay products with local filters, sorting, grid view,
          and list view.
        </p>
        <p className="mt-3 text-sm font-semibold">{products.length} products</p>
      </div>
      <ProductDiscoveryView products={products} />
    </div>
  );
}
