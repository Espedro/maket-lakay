"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { addAuditLogEntry } from "@/lib/audit-log";
import { readLocalJson, writeLocalJson } from "@/lib/local-storage";
import {
  ADMIN_OPERATIONS_KEY,
  hydrateAdminOperationsState,
  makeDeliveryZone,
  zoneToManagedZone,
  type AdminOperationsState,
  type DeliveryZoneInput,
} from "@/lib/admin-operations";
import { getRealDeliveryZones, saveRealDeliveryZone, setRealDeliveryZoneActive } from "@/services/delivery";
import {
  getRealCommissionSettings,
  updateRealDefaultCommissionRate,
  updateRealVendorCommissionRate,
} from "@/services/commissions";
import {
  getAllRealOrders,
  updateRealOrderRefundFlag,
  updateRealOrderReviewFlag,
} from "@/services/orders";

const STORAGE_EVENT = "maket-lakay-admin-operations-storage";

function readState(): AdminOperationsState {
  if (typeof window === "undefined") return hydrateAdminOperationsState();

  return hydrateAdminOperationsState(readLocalJson<Partial<AdminOperationsState>>(ADMIN_OPERATIONS_KEY, {}));
}

function writeState(state: AdminOperationsState) {
  writeLocalJson(ADMIN_OPERATIONS_KEY, state, STORAGE_EVENT);
}

export function useAdminOperations() {
  const [state, setState] = React.useState<AdminOperationsState>(hydrateAdminOperationsState);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setState(readState());
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

  const saveState = React.useCallback((nextState: AdminOperationsState) => {
    writeState(nextState);
    setState(nextState);
  }, []);

  React.useEffect(() => {
    let active = true;

    getRealDeliveryZones().then((realZones) => {
      if (!active || realZones.length === 0) return;

      const nextState = readState();
      nextState.deliveryZones = realZones.map(zoneToManagedZone);
      saveState(nextState);
    });

    return () => {
      active = false;
    };
  }, [saveState]);

  React.useEffect(() => {
    let active = true;

    getRealCommissionSettings().then((realSettings) => {
      if (!active || !realSettings) return;

      const nextState = readState();
      nextState.commissionSettings = {
        ...nextState.commissionSettings,
        defaultRate: realSettings.defaultRate,
        vendorRates: {
          ...nextState.commissionSettings.vendorRates,
          ...realSettings.vendorRates,
        },
      };
      saveState(nextState);
    });

    return () => {
      active = false;
    };
  }, [saveState]);

  React.useEffect(() => {
    let active = true;

    getAllRealOrders().then((realOrders) => {
      if (!active) return;

      const flaggedOrders = realOrders.filter(
        (order) => order.markedForReview || order.refundIssued,
      );

      if (flaggedOrders.length === 0) return;

      const nextState = readState();
      flaggedOrders.forEach((order) => {
        nextState.orderFlags[order.id] = {
          orderId: order.id,
          markedForReview: order.markedForReview ?? nextState.orderFlags[order.id]?.markedForReview ?? false,
          refundIssued: order.refundIssued ?? nextState.orderFlags[order.id]?.refundIssued ?? false,
          updatedAt: nextState.orderFlags[order.id]?.updatedAt ?? new Date().toISOString(),
        };
      });
      saveState(nextState);
    });

    return () => {
      active = false;
    };
  }, [saveState]);

  const markOrderForReview = React.useCallback(
    async (orderId: string) => {
      const nextState = readState();
      nextState.orderFlags[orderId] = {
        ...(nextState.orderFlags[orderId] ?? { orderId, refundIssued: false }),
        orderId,
        markedForReview: true,
        updatedAt: new Date().toISOString(),
      };
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "order.marked_for_review",
        entityType: "order",
        entityId: orderId,
        entityLabel: orderId,
        summary: "Order was flagged for admin review.",
        newValue: "marked_for_review",
        severity: "warning",
      });

      const realResult = await updateRealOrderReviewFlag(orderId, true);

      if (!realResult.ok) {
        toast({
          title: "Saved locally, real sync failed",
          description: realResult.reason ?? `${orderId} could not be flagged in the live order.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Order marked for review",
        description: `${orderId} was flagged for admin review.`,
      });
    },
    [saveState],
  );

  const markRefundIssued = React.useCallback(
    async (orderId: string) => {
      const nextState = readState();
      nextState.orderFlags[orderId] = {
        ...(nextState.orderFlags[orderId] ?? { orderId, markedForReview: false }),
        orderId,
        refundIssued: true,
        updatedAt: new Date().toISOString(),
      };
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "refund.issued",
        entityType: "order",
        entityId: orderId,
        entityLabel: orderId,
        summary: "Refund was issued for this order.",
        newValue: "refund_issued",
        severity: "critical",
      });

      const realResult = await updateRealOrderRefundFlag(orderId, true);

      if (!realResult.ok) {
        toast({
          title: "Saved locally, real sync failed",
          description: realResult.reason ?? `${orderId} refund flag could not be synced.`,
          variant: "destructive",
        });
      }
    },
    [saveState],
  );

  const updateDefaultCommissionRate = React.useCallback(
    async (rate: number) => {
      const nextState = readState();
      const oldRate = nextState.commissionSettings.defaultRate;
      nextState.commissionSettings.defaultRate = rate;
      nextState.commissionSettings.history = [
        {
          id: `commission-history-${Date.now()}`,
          vendorId: "marketplace",
          vendorName: "Marketplace default",
          rate,
          note: "Default commission rate updated.",
          createdAt: new Date().toISOString(),
        },
        ...nextState.commissionSettings.history,
      ];
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "commission.default_rate_changed",
        entityType: "commission",
        entityId: "marketplace",
        entityLabel: "Marketplace default",
        summary: "Default commission rate was updated.",
        oldValue: `${oldRate}%`,
        newValue: `${rate}%`,
        severity: "warning",
      });

      const realResult = await updateRealDefaultCommissionRate(rate);

      if (!realResult.ok) {
        toast({
          title: "Saved locally, real sync failed",
          description: realResult.reason ?? "Default commission could not be synced.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Commission setting saved",
        description: `Default commission changed to ${rate}%.`,
      });
    },
    [saveState],
  );

  const updateVendorCommissionRate = React.useCallback(
    async (vendorId: string, vendorName: string, rate: number) => {
      const nextState = readState();
      const oldRate =
        nextState.commissionSettings.vendorRates[vendorId] ??
        nextState.commissionSettings.defaultRate;
      nextState.commissionSettings.vendorRates[vendorId] = rate;
      nextState.commissionSettings.history = [
        {
          id: `commission-history-${Date.now()}`,
          vendorId,
          vendorName,
          rate,
          note: "Vendor-specific commission rate updated.",
          createdAt: new Date().toISOString(),
        },
        ...nextState.commissionSettings.history,
      ];
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "commission.vendor_rate_changed",
        entityType: "commission",
        entityId: vendorId,
        entityLabel: vendorName,
        summary: "Vendor-specific commission rate was updated.",
        oldValue: `${oldRate}%`,
        newValue: `${rate}%`,
        severity: "warning",
      });

      const realResult = await updateRealVendorCommissionRate(vendorId, rate);

      if (!realResult.ok) {
        toast({
          title: "Saved locally, real sync failed",
          description: realResult.reason ?? `${vendorName} commission could not be synced.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Vendor commission saved",
        description: `${vendorName} commission changed to ${rate}%.`,
      });
    },
    [saveState],
  );

  const saveDeliveryZone = React.useCallback(
    async (input: DeliveryZoneInput) => {
      const nextState = readState();
      const zone = makeDeliveryZone(input);
      const exists = nextState.deliveryZones.some((item) => item.id === zone.id);
      const oldZone = nextState.deliveryZones.find((item) => item.id === zone.id);
      nextState.deliveryZones = exists
        ? nextState.deliveryZones.map((item) => (item.id === zone.id ? zone : item))
        : [zone, ...nextState.deliveryZones];
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: exists ? "delivery_zone.updated" : "delivery_zone.created",
        entityType: "delivery_zone",
        entityId: zone.id,
        entityLabel: zone.zone,
        summary: `${zone.zone} delivery zone was ${exists ? "updated" : "created"}.`,
        oldValue: oldZone ? `${oldZone.baseFee}/${oldZone.estimatedDays} days` : undefined,
        newValue: `${zone.baseFee}/${zone.estimatedDays} days`,
        severity: "info",
      });

      const realResult = await saveRealDeliveryZone(zone);

      if (!realResult.ok) {
        toast({
          title: "Saved locally, real sync failed",
          description: realResult.reason ?? `${zone.zone} could not be synced to the live zone list.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: exists ? "Delivery zone updated" : "Delivery zone added",
          description: `${zone.zone} was saved.`,
        });
      }
    },
    [saveState],
  );

  const setDeliveryZoneActive = React.useCallback(
    async (zoneId: string, active: boolean) => {
      const nextState = readState();
      const oldZone = nextState.deliveryZones.find((zone) => zone.id === zoneId);
      nextState.deliveryZones = nextState.deliveryZones.map((zone) =>
        zone.id === zoneId ? { ...zone, active } : zone,
      );
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "delivery_zone.status_changed",
        entityType: "delivery_zone",
        entityId: zoneId,
        entityLabel: oldZone?.zone ?? zoneId,
        summary: `Delivery zone was ${active ? "enabled" : "disabled"}.`,
        oldValue: oldZone?.active ? "active" : "inactive",
        newValue: active ? "active" : "inactive",
        severity: active ? "info" : "warning",
      });

      const realResult = await setRealDeliveryZoneActive(zoneId, active);

      if (!realResult.ok) {
        toast({
          title: "Saved locally, real sync failed",
          description: realResult.reason ?? "Zone status could not be synced to the live zone list.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: active ? "Delivery zone enabled" : "Delivery zone disabled",
        description: "Zone status was updated.",
      });
    },
    [saveState],
  );

  return {
    isReady,
    markOrderForReview,
    markRefundIssued,
    saveDeliveryZone,
    setDeliveryZoneActive,
    state,
    updateDefaultCommissionRate,
    updateVendorCommissionRate,
  };
}
