"use client";

import * as React from "react";

import { stores } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import type { VendorStoreSettingsInput } from "@/lib/schemas";
import {
  getDefaultSettingsMap,
  getDefaultStoreSettings,
  VENDOR_STORE_SETTINGS_KEY,
  type VendorStoreSettingsMap,
} from "@/lib/vendor-store-settings";

const STORAGE_EVENT = "maket-lakay-vendor-store-settings-storage";

function readSettings(): VendorStoreSettingsMap {
  if (typeof window === "undefined") return getDefaultSettingsMap();

  try {
    const stored = window.localStorage.getItem(VENDOR_STORE_SETTINGS_KEY);
    const parsed = stored ? (JSON.parse(stored) as VendorStoreSettingsMap) : {};

    return stores.reduce<VendorStoreSettingsMap>((settings, store) => {
      settings[store.id] = {
        ...getDefaultStoreSettings(store),
        ...(parsed[store.id] ?? {}),
      };
      return settings;
    }, {});
  } catch {
    return getDefaultSettingsMap();
  }
}

function writeSettings(settings: VendorStoreSettingsMap) {
  window.localStorage.setItem(VENDOR_STORE_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useVendorStoreSettings() {
  const [settings, setSettings] = React.useState<VendorStoreSettingsMap>(getDefaultSettingsMap);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setSettings(readSettings());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(STORAGE_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(STORAGE_EVENT, refresh);
    };
  }, [refresh]);

  const saveStoreSettings = React.useCallback(
    (storeId: string, values: VendorStoreSettingsInput) => {
      const currentSettings = readSettings();
      const nextSettings = {
        ...currentSettings,
        [storeId]: values,
      };

      writeSettings(nextSettings);
      setSettings(nextSettings);
      toast({
        title: "Store settings saved",
        description: `${values.storeName} was updated in localStorage.`,
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
