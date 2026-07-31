"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { addAuditLogEntry } from "@/lib/audit-log";
import { readLocalJson, writeLocalJson } from "@/lib/local-storage";
import {
  defaultPayoutRequests,
  type PayoutRequest,
  type PayoutStatus,
  VENDOR_COMMERCE_STORAGE_EVENT,
  VENDOR_PAYOUT_REQUESTS_KEY,
} from "@/lib/vendor-commerce";

function readPayoutRequests() {
  return readLocalJson<PayoutRequest[]>(
    VENDOR_PAYOUT_REQUESTS_KEY,
    defaultPayoutRequests,
  );
}

function writePayoutRequests(requests: PayoutRequest[]) {
  writeLocalJson(
    VENDOR_PAYOUT_REQUESTS_KEY,
    requests,
    VENDOR_COMMERCE_STORAGE_EVENT,
  );
}

export function useAdminPayoutRequests() {
  const [isReady, setIsReady] = React.useState(false);
  const [payoutRequests, setPayoutRequests] = React.useState<PayoutRequest[]>([]);

  const refresh = React.useCallback(() => {
    setPayoutRequests(readPayoutRequests());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(VENDOR_COMMERCE_STORAGE_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(VENDOR_COMMERCE_STORAGE_EVENT, refresh);
    };
  }, [refresh]);

  const updatePayoutStatus = React.useCallback(
    (requestId: string, status: PayoutStatus) => {
      const currentRequests = readPayoutRequests();
      const oldRequest = currentRequests.find((request) => request.id === requestId);
      const nextRequests = currentRequests.map((request) =>
        request.id === requestId ? { ...request, status } : request,
      );

      writePayoutRequests(nextRequests);
      setPayoutRequests(nextRequests);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "payout.status_changed",
        entityType: "payout_request",
        entityId: requestId,
        entityLabel: oldRequest?.method ?? requestId,
        summary: `Payout request status changed to ${status}.`,
        oldValue: oldRequest?.status,
        newValue: status,
        severity: status === "rejected" ? "warning" : status === "paid" ? "info" : "warning",
      });
      toast({
        title: "Payout request updated",
        description: `Status changed to ${status}.`,
      });
    },
    [],
  );

  return {
    isReady,
    payoutRequests,
    updatePayoutStatus,
  };
}
