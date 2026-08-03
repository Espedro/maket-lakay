"use client";

import * as React from "react";

import { stores as staticStores } from "@/data/mock-data";
import { useAdminManagement } from "@/hooks/use-admin-management";
import { useAuth } from "@/hooks/use-auth";
import { getAllStores } from "@/lib/admin-management";

export function useVendorScope() {
  const auth = useAuth();
  const { isReady: adminReady, state: adminState } = useAdminManagement();

  const allStores = React.useMemo(() => getAllStores(adminState), [adminState]);
  const vendorId = auth.user?.vendorId;
  const scopedStores = React.useMemo(() => {
    if (auth.user?.role !== "vendor" || !vendorId) {
      return allStores;
    }

    return allStores.filter((store) => store.vendorId === vendorId);
  }, [allStores, auth.user?.role, vendorId]);
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
    isReady: auth.isReady && adminReady,
    scopedStoreIds,
    scopedStores,
    vendorId,
  };
}
