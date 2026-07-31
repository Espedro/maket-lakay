import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import type { BreadcrumbItem } from "@/types";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
        <Home className="size-4" />
        Home
      </Link>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <ChevronRight className="size-4 text-muted-foreground" />
          {item.href ? (
            <Link href={item.href} className="text-muted-foreground hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
