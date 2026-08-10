"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { addAuditLogEntry } from "@/lib/audit-log";
import type { PayoutRequest, PayoutStatus } from "@/lib/vendor-commerce";
import { getAllRealPayoutRequests, updateRealPayoutRequestStatus } from "@/services/vendor-commerce";

export function useAdminPayoutRequests() {
  const [isReady, setIsReady] = React.useState(false);
  const [payoutRequests, setPayoutRequests] = React.useState<PayoutRequest[]>([]);

  const refresh = React.useCallback(async () => {
    setPayoutRequests(await getAllRealPayoutRequests());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePayoutStatus = React.useCallback(
    async (requestId: string, status: PayoutStatus) => {
      const oldRequest = payoutRequests.find((request) => request.id === requestId);
      const result = await updateRealPayoutRequestStatus(requestId, status);

      if (!result.ok) {
        toast({
          title: "Could not update payout request",
          description: result.reason,
          variant: "destructive",
        });
        return;
      }

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
      await refresh();
    },
    [payoutRequests, refresh],
  );

  return {
    isReady,
    payoutRequests,
    updatePayoutStatus,
  };
}
