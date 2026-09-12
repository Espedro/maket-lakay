"use client";

import * as React from "react";

import { stores as staticStores } from "@/data/mock-data";
import { useAdminManagement } from "@/hooks/use-admin-management";
import { useAuth } from "@/hooks/use-auth";
import { getAllStores } from "@/lib/admin-management";
import { getStoresByVendor } from "@/services/vendors";
import type { Store } from "@/types";

export function useVendorScope() {
  const auth = useAuth();
  const { isReady: adminReady, state: adminState } = useAdminManagement();
  const vendorId = auth.user?.vendorId;

  // `allStores` only knows about the mock catalog plus stores derived from
  // vendor_applications visible to this session (gated by RLS - empty for a
  // non-admin vendor). A vendor approved straight in Supabase (not through
  // the local admin flow) has a real stores row that never shows up there,
  // so scopedStores below can end up empty even though the vendor account
  // is real - fetch their actual store(s) directly as a fallback.
  const [realVendorStores, setRealVendorStores] = React.useState<Store[]>([]);
  const [realStoresReady, setRealStoresReady] = React.useState(false);

  React.useEffect(() => {
    if (auth.user?.role !== "vendor" || !vendorId) {
      setRealVendorStores([]);
      setRealStoresReady(true);
      return;
    }

    let active = true;
    setRealStoresReady(false);

    getStoresByVendor(vendorId)
      .then((stores) => {
        if (active) setRealVendorStores(stores);
      })
      .catch(() => {
        if (active) setRealVendorStores([]);
      })
      .finally(() => {
        if (active) setRealStoresReady(true);
      });

    return () => {
      active = false;
    };
  }, [auth.user?.role, vendorId]);

  const allStores = React.useMemo(() => getAllStores(adminState), [adminState]);
  const scopedStores = React.useMemo(() => {
    if (auth.user?.role !== "vendor" || !vendorId) {
      return allStores;
    }

    const localMatches = allStores.filter((store) => store.vendorId === vendorId);
    return localMatches.length > 0 ? localMatches : realVendorStores;
  }, [allStores, auth.user?.role, realVendorStores, vendorId]);
  const defaultStoreId =
    auth.user?.storeId ??
    scopedStores[0]?.id ??
    allStores[0]?.id ??
    staticStores[0]?.id ??
    "";
  const scopedStoreIds = React.useMemo(
    () => new Set(scopedStores.map((store) => store.id)),
    [scopedStores],
  );

  return {
    allStores,
    auth,
    defaultStoreId,
    isReady: auth.isReady && adminReady && realStoresReady,
    scopedStoreIds,
    scopedStores,
    vendorId,
  };
}
