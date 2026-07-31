import Link from "next/link";

import { marketplaceNav } from "@/lib/navigation";

export function MainNavigation() {
  return (
    <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
      {marketplaceNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-muted-foreground hover:text-primary"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
