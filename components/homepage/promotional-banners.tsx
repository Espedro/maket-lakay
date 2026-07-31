import Link from "next/link";
import { ArrowRight, Gift, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PromotionalBanners() {
  return (
    <section className="container grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-primary p-6 text-primary-foreground shadow-soft">
        <Gift className="mb-5 size-8" />
        <h2 className="text-2xl font-bold">Diaspora care packages</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/85">
          Build thoughtful bundles with coffee, pantry staples, baby care, and
          school supplies from trusted stores.
        </p>
        <Button asChild variant="secondary" className="mt-5">
          <Link href="#recommended-products">
            Build a bundle <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-white p-6 shadow-soft">
        <Sparkles className="mb-5 size-8 text-lakay-mango" />
        <h2 className="text-2xl font-bold">Made close to home</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Discover local artisan products, handmade gifts, books, and essentials
          that feel distinct from a generic big-box marketplace.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/categories/local-artisan-products">Shop artisan goods</Link>
        </Button>
      </div>
    </section>
  );
}
