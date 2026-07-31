import Link from "next/link";
import { ArrowRight, ShieldCheck, Store, Truck } from "lucide-react";

import { HomepageSearch } from "@/components/homepage/homepage-search";
import { LocationSelector } from "@/components/homepage/location-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="lakay-pattern border-b">
      <div className="container grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-14">
        <div className="space-y-6">
          <div className="space-y-4">
            <Badge variant="secondary">Trusted Haitian vendors, one marketplace</Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl lg:text-6xl">
              Shop Haiti and the diaspora from vendors you can trust.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Maket Lakay brings groceries, electronics, fashion, artisan goods,
              school supplies, and home essentials together in a friendly
              marketplace built for Haitian customers everywhere.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full">
              <Link href="#trending-products">
                Start shopping <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full bg-white">
              <Link href="#popular-stores">Explore stores</Link>
            </Button>
          </div>
          <div className="grid gap-3">
            <HomepageSearch />
            <LocationSelector />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {[
            {
              title: "Verified stores",
              description: "Clear trust signals on every store profile.",
              icon: ShieldCheck,
            },
            {
              title: "Local finds",
              description: "Products from Haiti and diaspora vendors.",
              icon: Store,
            },
            {
              title: "Delivery ready",
              description: "Designed for location-aware shopping flows.",
              icon: Truck,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border bg-white/90 p-5 shadow-card"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
