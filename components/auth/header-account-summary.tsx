"use client";

import { useAuth } from "@/hooks/use-auth";

export function HeaderAccountSummary() {
  const { user, isReady } = useAuth();

  return (
    <div className="hidden leading-tight xl:block">
      <p className="text-xs text-white/70">
        {isReady && user ? `Hello, ${user.name.split(" ")[0]}` : "Hello"}
      </p>
      <p className="text-sm font-bold">
        {isReady && user ? user.roleLabel : "Log in"}
      </p>
    </div>
  );
}
