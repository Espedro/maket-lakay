"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { categories } from "@/data/mock-data";
import {
  marketplaceSearchSchema,
  type MarketplaceSearchInput,
} from "@/lib/schemas";

export function HeaderSearch() {
  const router = useRouter();
  const form = useForm<MarketplaceSearchInput>({
    resolver: zodResolver(marketplaceSearchSchema),
    defaultValues: {
      category: "all",
      query: "",
    },
  });

  function onSubmit(values: MarketplaceSearchInput) {
    const params = new URLSearchParams();
    if (values.query) {
      params.set("q", values.query);
    }
    if (values.category && values.category !== "all") {
      params.set("category", values.category);
    }
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-white/15 focus-within:ring-2 focus-within:ring-lakay-mango"
      role="search"
    >
      <select
        {...form.register("category")}
        aria-label="Search category"
        className="hidden w-24 shrink-0 border-r border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-700 outline-none sm:block"
      >
        <option value="all">All</option>
        {categories.slice(0, 8).map((category) => (
          <option key={category.id} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
      <input
        {...form.register("query")}
        type="search"
        placeholder="Search Maket Lakay"
        className="min-w-0 flex-1 px-3 text-sm text-slate-950 outline-none placeholder:text-slate-500 sm:px-4"
      />
      <Button
        type="submit"
        className="h-10 w-12 shrink-0 rounded-none bg-lakay-mango text-slate-950 hover:bg-lakay-mango/90"
        aria-label="Search"
      >
        <Search className="size-5" />
      </Button>
    </form>
  );
}
