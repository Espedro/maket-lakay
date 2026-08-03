"use client";

import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/auth/account-menu";
import { Button } from "@/components/ui/button";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";

export function HeaderActions() {
  const { cartCount, wishlistCount } = useMarketplaceStorage();

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="relative text-white hover:bg-white/10 hover:text-white"
      >
        <Link href="/account/wishlist" aria-label="Saved items">
          <Heart className="size-5" />
          {wishlistCount ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-lakay-red px-1 text-[10px] font-bold text-white">
              {wishlistCount}
            </span>
          ) : null}
        </Link>
      </Button>
      <AccountMenu compact showRoleLabel />
      <Button asChild size="icon" className="relative bg-lakay-mango text-slate-950 hover:bg-lakay-mango/90">
        <Link href="/cart" aria-label="Shopping bag">
          <ShoppingBag className="size-5" />
          {cartCount ? (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground">
              {cartCount}
            </span>
          ) : null}
        </Link>
      </Button>
    </>
  );
}
