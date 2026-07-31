"use client";

import { useMockAuth } from "@/hooks/use-mock-auth";

export function HeaderAccountSummary() {
  const { currentUser, isReady } = useMockAuth();

  return (
    <div className="hidden leading-tight xl:block">
      <p className="text-xs text-white/70">
        {isReady ? `Hello, ${currentUser.name.split(" ")[0]}` : "Hello"}
      </p>
      <p className="text-sm font-bold">
        Switch role: {isReady ? currentUser.roleLabel : "Account"}
      </p>
    </div>
  );
}
