"use client";

import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { StoreCard } from "@/components/marketplace/store-card";
import type { Store } from "@/types";

interface StoresPageClientProps {
  stores: Store[];
}

export function StoresPageClient({ stores }: StoresPageClientProps) {
  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs items={[{ label: "Stores" }]} />
      <section className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">Stores</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover trusted Haitian vendors and diaspora marketplace stores.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </div>
  );
}
