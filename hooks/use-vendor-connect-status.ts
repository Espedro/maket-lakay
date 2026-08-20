"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import { mapVendorRow } from "@/lib/supabase/mappers";
import type { Vendor } from "@/types";

export function useVendorConnectStatus(vendorId?: string) {
  const [vendor, setVendor] = React.useState<Vendor | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!vendorId) {
      setVendor(null);
      setIsReady(true);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase.from("vendors").select("*").eq("id", vendorId).maybeSingle();
    setVendor(data ? mapVendorRow(data) : null);
    setIsReady(true);
  }, [vendorId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vendor, isReady, refresh };
}
