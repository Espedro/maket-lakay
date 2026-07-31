"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { addAuditLogEntry } from "@/lib/audit-log";
import {
  defaultPayoutRequests,
  defaultVendorPromotions,
  type PayoutRequest,
  type VendorPromotion,
  VENDOR_COMMERCE_STORAGE_EVENT,
  VENDOR_PAYOUT_REQUESTS_KEY,
  VENDOR_PROMOTIONS_KEY,
} from "@/lib/vendor-commerce";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(VENDOR_COMMERCE_STORAGE_EVENT));
}

export function useVendorCommerce() {
  const [promotions, setPromotions] = React.useState<VendorPromotion[]>([]);
  const [payoutRequests, setPayoutRequests] = React.useState<PayoutRequest[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setPromotions(readJson<VendorPromotion[]>(VENDOR_PROMOTIONS_KEY, defaultVendorPromotions));
    setPayoutRequests(
      readJson<PayoutRequest[]>(VENDOR_PAYOUT_REQUESTS_KEY, defaultPayoutRequests),
    );
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

  const savePromotion = React.useCallback((promotion: VendorPromotion) => {
    const currentPromotions = readJson<VendorPromotion[]>(
      VENDOR_PROMOTIONS_KEY,
      defaultVendorPromotions,
    );
    const nextPromotions = [promotion, ...currentPromotions];
    writeJson(VENDOR_PROMOTIONS_KEY, nextPromotions);
    setPromotions(nextPromotions);
    addAuditLogEntry({
      actorId: "vendor-staff",
      actorName: "Vendor Staff",
      actorRole: "vendor",
      action: "promotion.created",
      entityType: "promotion",
      entityId: promotion.id,
      entityLabel: promotion.name,
      summary: `${promotion.name} promotion was created.`,
      newValue: `${promotion.discountType}/${promotion.discountValue}`,
      severity: "info",
    });
    toast({
      title: "Promotion created",
      description: `${promotion.name} was saved locally.`,
    });
  }, []);

  const savePayoutRequest = React.useCallback((request: PayoutRequest) => {
    const currentRequests = readJson<PayoutRequest[]>(
      VENDOR_PAYOUT_REQUESTS_KEY,
      defaultPayoutRequests,
    );
    const nextRequests = [request, ...currentRequests];
    writeJson(VENDOR_PAYOUT_REQUESTS_KEY, nextRequests);
    setPayoutRequests(nextRequests);
    addAuditLogEntry({
      actorId: "vendor-staff",
      actorName: "Vendor Staff",
      actorRole: "vendor",
      action: "payout.request_created",
      entityType: "payout_request",
      entityId: request.id,
      entityLabel: request.method,
      summary: `${request.method} payout request was submitted.`,
      newValue: `${request.amount} ${request.currency}`,
      severity: "warning",
    });
    toast({
      title: "Payout requested",
      description: `${request.method} payout request was saved locally.`,
    });
  }, []);

  return {
    isReady,
    payoutRequests,
    promotions,
    savePayoutRequest,
    savePromotion,
  };
}
