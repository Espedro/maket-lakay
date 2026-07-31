"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  marketplaceSearchSchema,
  type MarketplaceSearchInput,
} from "@/lib/schemas";

export function HomepageSearch() {
  const router = useRouter();
  const form = useForm<MarketplaceSearchInput>({
    resolver: zodResolver(marketplaceSearchSchema),
    defaultValues: {
      query: "",
    },
  });

  function onSubmit(values: MarketplaceSearchInput) {
    const params = new URLSearchParams();
    if (values.query) {
      params.set("q", values.query);
    }
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-2 shadow-soft sm:flex-row sm:rounded-full"
      role="search"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          {...form.register("query")}
          type="search"
          placeholder="Search coffee, phones, artisan gifts, school supplies"
          className="h-12 rounded-full border-0 bg-muted/60 pl-12 shadow-none focus-visible:ring-1"
        />
      </div>
      <Button type="submit" size="lg" className="rounded-full">
        Search marketplace
      </Button>
    </form>
  );
}
