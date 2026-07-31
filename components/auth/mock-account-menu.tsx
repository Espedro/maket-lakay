"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  Headphones,
  LogOut,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

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
import { useMockAuth } from "@/hooks/use-mock-auth";
import { getInitials, getRoleHomeHref, type MockRole } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

interface MockAccountMenuProps {
  compact?: boolean;
  dashboard?: boolean;
  showRoleLabel?: boolean;
  triggerClassName?: string;
}

const roleIcons: Record<MockRole, React.ComponentType<{ className?: string }>> = {
  admin: ShieldCheck,
  customer: UserRound,
  support: Headphones,
  vendor: Store,
};

export function MockAccountMenu({
  compact = false,
  dashboard = false,
  showRoleLabel = false,
  triggerClassName,
}: MockAccountMenuProps) {
  const { currentUser, isReady, signOut, switchRole, switchToUser, users } = useMockAuth();

  function goToRoleArea(href: string) {
    window.location.assign(href);
  }

  function activateRole(role: MockRole) {
    switchRole(role);
    goToRoleArea(getRoleHomeHref(role));
  }

  function activateUser(userId: string) {
    const user = users.find((item) => item.id === userId);
    switchToUser(userId);

    if (user) {
      goToRoleArea(user.homeHref);
    }
  }

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

  const RoleIcon = roleIcons[currentUser.role];

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
            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
          {showRoleLabel ? (
            <span className="hidden text-left lg:block">
              <span className="block text-xs text-white/70">Switch role</span>
              <span className="block text-sm font-bold leading-none">
                {currentUser.roleLabel}
              </span>
            </span>
          ) : null}
          {!compact ? (
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-none">
                {currentUser.name}
              </span>
              <span className={cn("block text-xs", dashboard ? "text-muted-foreground" : "text-white/70")}>
                {currentUser.roleLabel}
              </span>
            </span>
          ) : null}
          <ChevronDown className={cn("size-4", dashboard ? "text-muted-foreground" : "text-white/70")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-none">
        <DropdownMenuLabel>
          <span className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate font-black">{currentUser.name}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {currentUser.email}
              </span>
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={currentUser.profileHref}>
            <RoleIcon className="size-4" />
            Open {currentUser.roleLabel.toLowerCase()} profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={currentUser.homeHref}>Go to {currentUser.roleLabel.toLowerCase()} area</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Switch access</DropdownMenuLabel>
        {(["customer", "vendor", "support", "admin"] as MockRole[]).map((role) => {
          const user = users.find((item) => item.role === role);
          const Icon = roleIcons[role];

          if (!user) return null;

          return (
            <DropdownMenuItem key={role} onClick={() => activateRole(role)}>
              <Icon className="size-4" />
              <span className="grid gap-0.5">
                <span className="font-semibold">{user.roleLabel}</span>
                <span className="text-xs text-muted-foreground">{user.description}</span>
              </span>
              {currentUser.role === role ? <Check className="ml-auto size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
        {users.filter((user) => user.role === "vendor").length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Vendor identities</DropdownMenuLabel>
            {users
              .filter((user) => user.role === "vendor")
              .map((user) => (
                <DropdownMenuItem key={user.id} onClick={() => activateUser(user.id)}>
                  <Store className="size-4" />
                  <span className="truncate">{user.name}</span>
                  {currentUser.id === user.id ? <Check className="ml-auto size-4" /> : null}
                </DropdownMenuItem>
              ))}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="size-4" />
          Reset to customer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
