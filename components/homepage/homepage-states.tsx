import { PackageX } from "lucide-react";

import { EmptyState } from "@/components/marketplace/empty-state";
import { ProductGridSkeleton } from "@/components/marketplace/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HomepageStates() {
  return (
    <section className="container grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Loading state</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductGridSkeleton />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Empty state</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={PackageX}
            title="No local matches yet"
            description="When a category or delivery location has no products, customers get a clear recovery path."
            actionLabel="Browse all products"
          />
        </CardContent>
      </Card>
    </section>
  );
}
