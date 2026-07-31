import Link from "next/link";

import { mobileNav } from "@/lib/navigation";

export function MobileBottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.45)] md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {mobileNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
