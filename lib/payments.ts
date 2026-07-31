import { paymentMethods } from "@/data/mock-data";
import type { CartSummary } from "@/lib/checkout";
import type {
  CurrencyCode,
  PaymentMethod,
  PaymentProviderId,
  PaymentRecord,
  PaymentStatus,
  PaymentWebhookEvent,
  RefundRecord,
  VendorWallet,
} from "@/types";

export const PAYMENT_RECORDS_KEY = "maket-lakay-payment-records";
export const PAYMENT_WEBHOOKS_KEY = "maket-lakay-payment-webhooks";
export const REFUND_RECORDS_KEY = "maket-lakay-refund-records";

export const MARKETPLACE_COMMISSION_RATE = 0.08;

export interface PaymentIntentInput {
  orderId: string;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: PaymentStatus;
  providerReference: string;
  reason?: string;
}

export interface PaymentAdapter {
  provider: PaymentProviderId;
  createPayment: (input: PaymentIntentInput) => Promise<PaymentRecord>;
  verifyPayment: (payment: PaymentRecord) => Promise<PaymentVerificationResult>;
  refundPayment: (
    payment: PaymentRecord,
    amount: number,
    reason: string,
  ) => Promise<RefundRecord>;
  parseWebhook: (payload: PaymentWebhookEvent) => PaymentVerificationResult;
}

function makeReference(provider: PaymentProviderId, orderId: string) {
  return `${provider.toUpperCase()}-MOCK-${orderId}-${Date.now().toString().slice(-5)}`;
}

function makeAdapter(provider: PaymentProviderId): PaymentAdapter {
  return {
    provider,
    async createPayment(input) {
      const failed = input.method.testBehavior === "failure";
      const providerReference = makeReference(provider, input.orderId);

      return {
        id: `payrec-${Date.now()}`,
        orderId: input.orderId,
        provider,
        methodId: input.method.id,
        status: failed ? "failed" : "processing",
        amount: input.amount,
        currency: input.currency,
        providerReference,
        verificationCode: failed
          ? `FAILED-${providerReference}`
          : `VERIFIED-${providerReference}`,
        failureReason: failed ? "Provider declined this payment method." : undefined,
        createdAt: new Date().toISOString(),
      };
    },
    async verifyPayment(payment) {
      if (payment.status === "failed") {
        return {
          verified: false,
          status: "failed",
          providerReference: payment.providerReference,
          reason: payment.failureReason ?? "Payment failed.",
        };
      }

      return {
        verified: payment.verificationCode.startsWith("VERIFIED"),
        status: "captured",
        providerReference: payment.providerReference,
      };
    },
    async refundPayment(payment, amount, reason) {
      return {
        id: `refund-${Date.now()}`,
        paymentId: payment.id,
        orderId: payment.orderId,
        storeId: "marketplace",
        amount,
        currency: payment.currency,
        status: "processed",
        reason,
        createdAt: new Date().toISOString(),
      };
    },
    parseWebhook(payload) {
      const expectedSignature = createWebhookSignature(payload.provider, payload.paymentId);
      const verified = payload.signature === expectedSignature;

      return {
        verified,
        status: verified ? payload.status : "failed",
        providerReference: payload.paymentId,
        reason: verified ? undefined : "Invalid webhook signature.",
      };
    },
  };
}

export const paymentAdapters: Record<PaymentProviderId, PaymentAdapter> = {
  moncash: makeAdapter("moncash"),
  natcash: makeAdapter("natcash"),
  card: makeAdapter("card"),
  paypal: makeAdapter("paypal"),
};

export function getPaymentMethod(methodId: string) {
  return paymentMethods.find((method) => method.id === methodId);
}

export async function processPayment(input: PaymentIntentInput) {
  const adapter = paymentAdapters[input.method.type];
  const payment = await adapter.createPayment(input);
  const verification = await adapter.verifyPayment(payment);

  return {
    payment: {
      ...payment,
      status: verification.status,
      verifiedAt: verification.verified ? new Date().toISOString() : undefined,
      failureReason: verification.reason ?? payment.failureReason,
    },
    verification,
  };
}

export function createWebhookSignature(provider: PaymentProviderId, paymentId: string) {
  return `sig_${provider}_${paymentId}_maket_lakay_mock`;
}

export function createWebhookEvent(payment: PaymentRecord): PaymentWebhookEvent {
  const type =
    payment.status === "failed"
      ? "payment.failed"
      : payment.status === "refunded"
        ? "refund.processed"
        : "payment.captured";

  return {
    id: `evt-${Date.now()}`,
    provider: payment.provider,
    type,
    paymentId: payment.id,
    status: payment.status,
    signature: createWebhookSignature(payment.provider, payment.id),
    receivedAt: new Date().toISOString(),
  };
}

export function calculateCommission(amount: number) {
  return Math.round(amount * MARKETPLACE_COMMISSION_RATE * 100) / 100;
}

export function calculateVendorPayouts(summary: CartSummary) {
  return summary.groups.map((group) => {
    const commission = calculateCommission(group.subtotal);
    return {
      storeId: group.store.id,
      storeName: group.store.name,
      grossSales: group.subtotal,
      deliveryFee: group.deliveryFee,
      commission,
      vendorPayout: group.subtotal - commission,
    };
  });
}

export function createVendorWalletPreview(summary: CartSummary): VendorWallet[] {
  return calculateVendorPayouts(summary).map((payout) => ({
    id: `wallet-preview-${payout.storeId}`,
    storeId: payout.storeId,
    vendorId: payout.storeId,
    currency: "USD",
    availableBalance: 0,
    pendingBalance: payout.vendorPayout,
    lifetimeSales: payout.grossSales,
    lifetimeCommission: payout.commission,
    entries: [
      {
        id: `entry-sale-${payout.storeId}`,
        type: "sale",
        description: `Pending sale for ${payout.storeName}`,
        amount: payout.grossSales,
        createdAt: new Date().toISOString(),
      },
      {
        id: `entry-commission-${payout.storeId}`,
        type: "commission",
        description: "Maket Lakay marketplace commission",
        amount: -payout.commission,
        createdAt: new Date().toISOString(),
      },
    ],
  }));
}
