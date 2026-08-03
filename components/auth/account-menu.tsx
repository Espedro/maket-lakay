"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/auth-roles";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  compact?: boolean;
  dashboard?: boolean;
  showRoleLabel?: boolean;
  triggerClassName?: string;
}

export function AccountMenu({
  compact = false,
  dashboard = false,
  showRoleLabel = false,
  triggerClassName,
}: AccountMenuProps) {
  const { user, isReady, signOut } = useAuth();

  if (!isReady) {
    return (
      <Button
        variant="ghost"
        className={cn("gap-2 px-2", triggerClassName)}
        aria-label="Loading account"
      >
        <span className="size-8 animate-pulse rounded-full bg-muted" />
      </Button>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(!dashboard && "text-white hover:bg-white/10 hover:text-white")}
        >
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="sm" variant={dashboard ? "default" : "secondary"}>
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-2 px-2",
            !dashboard && "text-white hover:bg-white/10 hover:text-white",
            triggerClassName,
          )}
          aria-label="Open account menu"
        >
          <Avatar className="size-8">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          {showRoleLabel ? (
            <span className="hidden text-left lg:block">
              <span className="block text-xs text-white/70">Account</span>
              <span className="block text-sm font-bold leading-none">{user.roleLabel}</span>
            </span>
          ) : null}
          {!compact ? (
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-none">{user.name}</span>
              <span className={cn("block text-xs", dashboard ? "text-muted-foreground" : "text-white/70")}>
                {user.roleLabel}
              </span>
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-none">
        <DropdownMenuLabel>
          <span className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate font-black">{user.name}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={user.profileHref}>
            <UserRound className="size-4" />
            Open {user.roleLabel.toLowerCase()} profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={user.homeHref}>Go to {user.roleLabel.toLowerCase()} area</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
