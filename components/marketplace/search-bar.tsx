"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplaceSearchSchema, type MarketplaceSearchInput } from "@/lib/schemas";
import { toast } from "@/hooks/use-toast";

export function SearchBar() {
  const form = useForm<MarketplaceSearchInput>({
    resolver: zodResolver(marketplaceSearchSchema),
    defaultValues: {
      query: "",
    },
  });

  function onSubmit(values: MarketplaceSearchInput) {
    toast({
      title: "Search ready",
      description: values.query
        ? `Search submitted for "${values.query}".`
        : "Search submitted.",
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full items-center gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          {...form.register("query")}
          type="search"
          placeholder="Search products, stores, or categories"
          className="h-11 rounded-full bg-white pl-10"
        />
      </div>
      <Button type="submit" className="h-11 rounded-full px-5">
        Search
      </Button>
    </form>
  );
}
