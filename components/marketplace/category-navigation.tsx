import Link from "next/link";
import {
  Baby,
  Blend,
  BookOpen,
  Home,
  Laptop,
  Menu,
  Palette,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
} from "lucide-react";

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

export function CategoryNavigation() {
  return (
    <section className="bg-slate-800 text-white">
      <div className="container overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 py-2">
          <Link
            href="/categories"
            className="mr-2 flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-bold hover:bg-white/10"
          >
            <Menu className="size-4" />
            All
          </Link>
          {categories.map((category) => {
            const Icon = iconMap[category.icon as keyof typeof iconMap] ?? ShoppingBasket;
            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-semibold text-white/95 hover:bg-white/10"
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-sm text-white",
                    category.accentColor,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {category.name}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
