"use client";

import { SectionHeading } from "@/components/homepage/section-heading";
import { StoreCard } from "@/components/marketplace/store-card";
import { useAdminManagement } from "@/hooks/use-admin-management";
import { getAllStores } from "@/lib/admin-management";

export function PopularStoresSection() {
  const { state } = useAdminManagement();
  const stores = getAllStores(state);

  return (
    <section id="popular-stores" className="container space-y-5 scroll-mt-28">
      <SectionHeading
        title="Popular stores"
        description="Verified and rising vendors serving Haiti and the diaspora."
        href="/stores"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </section>
  );
}
