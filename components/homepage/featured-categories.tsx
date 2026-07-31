import Link from "next/link";
import {
  Baby,
  Blend,
  BookOpen,
  Home,
  Laptop,
  Palette,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { SectionHeading } from "@/components/homepage/section-heading";
import { categories } from "@/data/mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  Baby,
  Blend,
  BookOpen,
  Home,
  Laptop,
  Palette,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
};

export function FeaturedCategories() {
  return (
    <section className="container space-y-5">
      <SectionHeading
        title="Featured categories"
        description="Browse familiar marketplace aisles with a Maket Lakay feel."
        href="/categories"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.slice(0, 10).map((category) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap] ?? ShoppingBasket;
          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group rounded-lg border bg-white p-4 shadow-card hover:border-primary"
            >
              <span
                className={cn(
                  "mb-4 flex size-12 items-center justify-center rounded-lg text-white shadow-sm",
                  category.accentColor,
                )}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
                {category.name}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {category.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
