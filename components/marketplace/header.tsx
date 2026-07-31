import Link from "next/link";
import { MapPin, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeaderAccountSummary } from "@/components/auth/header-account-summary";
import { HeaderActions } from "@/components/marketplace/header-actions";
import { HeaderSearch } from "@/components/marketplace/header-search";
import { LanguageSelector } from "@/components/marketplace/language-selector";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-slate-950 text-white shadow-md">
      <div className="container flex min-h-16 items-center gap-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-md bg-lakay-mango text-lg font-black text-slate-950 shadow-sm">
            ML
          </span>
          <span className="hidden text-lg font-black tracking-normal sm:block">
            Maket Lakay
          </span>
        </Link>
        <div className="hidden min-w-[142px] items-center gap-2 rounded-md px-2 py-1.5 text-xs leading-tight hover:bg-white/10 lg:flex">
          <MapPin className="size-4 shrink-0 text-lakay-mango" />
          <span>
            <span className="block text-white/70">Delivering to</span>
            <span className="block font-bold text-white">Orlando 32839</span>
          </span>
        </div>
        <HeaderSearch />
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LanguageSelector />
          <HeaderAccountSummary />
          <Link href="/orders" className="hidden leading-tight hover:text-lakay-mango xl:block">
            <span className="block text-xs text-white/70">Returns</span>
            <span className="block text-sm font-bold">& Orders</span>
          </Link>
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
