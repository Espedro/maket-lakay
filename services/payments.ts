import {
  paymentMethods,
  paymentRecords,
  refundRecords,
  refundRequests,
  vendorWallets,
} from "@/data/mock-data";
import {
  calculateCommission,
  calculateVendorPayouts,
  createWebhookEvent,
  paymentAdapters,
  processPayment,
} from "@/lib/payments";
import type { PaymentWebhookEvent } from "@/types";

export function getPaymentMethods() {
  return paymentMethods;
}

export function getPaymentRecords() {
  return paymentRecords;
}

export function getRefundRecords() {
  return refundRecords;
}

export function getRefundRequests() {
  return refundRequests;
}

export function getVendorWallets() {
  return vendorWallets;
}

export async function createMockPayment(input: Parameters<typeof processPayment>[0]) {
  return processPayment(input);
}

export function parseMockPaymentWebhook(payload: PaymentWebhookEvent) {
  const adapter = paymentAdapters[payload.provider];
  return adapter?.parseWebhook(payload) ?? {
    verified: false,
    status: "failed" as const,
    providerReference: payload.paymentId,
    reason: "Unsupported payment provider.",
  };
}

export const paymentService = {
  calculateCommission,
  calculateVendorPayouts,
  createWebhookEvent,
  parseMockPaymentWebhook,
};
