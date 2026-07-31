"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const demoStoragePrefixes = ["maket-lakay-"];

export function DemoResetClient() {
  const [isResetting, setIsResetting] = React.useState(false);

  function resetDemoData() {
    setIsResetting(true);

    const keysToRemove = Object.keys(window.localStorage).filter((key) =>
      demoStoragePrefixes.some((prefix) => key.startsWith(prefix)),
    );

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    window.dispatchEvent(new Event("maket-lakay-storage"));
    window.dispatchEvent(new Event("maket-lakay-mock-session-storage"));
    window.dispatchEvent(new Event("maket-lakay-vendor-commerce-storage"));

    toast({
      title: "Demo data reset",
      description: "Local demo state was cleared. The page will reload with starter data.",
    });

    window.setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  return (
    <Button type="button" variant="outline" onClick={resetDemoData} disabled={isResetting}>
      <RotateCcw className="size-4" />
      {isResetting ? "Resetting..." : "Reset demo data"}
    </Button>
  );
}
