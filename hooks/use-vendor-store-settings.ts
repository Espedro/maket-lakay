"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import type { VendorStoreSettingsInput } from "@/lib/schemas";
import { getDefaultStoreSettings } from "@/lib/vendor-store-settings";
import { getRealStoreSettings, saveRealStoreSettings } from "@/services/vendors";
import type { Store } from "@/types";

export function useVendorStoreSettings(storeId: string, store: Store | undefined) {
  const [settings, setSettings] = React.useState<VendorStoreSettingsInput | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!storeId || !store) {
      setSettings(null);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    const real = await getRealStoreSettings(storeId);
    setSettings(real ?? getDefaultStoreSettings(store));
    setIsReady(true);
  }, [storeId, store]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const saveStoreSettings = React.useCallback(
    async (id: string, values: VendorStoreSettingsInput) => {
      const result = await saveRealStoreSettings(id, values);

      if (!result.ok) {
        toast({
          title: "Could not save store settings",
          description: result.reason,
          variant: "destructive",
        });
        return;
      }

      setSettings(values);
      toast({
        title: "Store settings saved",
        description: `${values.storeName} was updated.`,
      });
    },
    [],
  );

  return {
    isReady,
    saveStoreSettings,
    settings,
  };
}
