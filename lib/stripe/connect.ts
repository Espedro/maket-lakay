import Stripe from "stripe";

import type { StripeConnectStatus } from "@/types";

/**
 * Deliberately separate from lib/stripe/server.ts's getStripeServerClient():
 * vendor Connect onboarding is the fix for the payment-facilitation issue,
 * not part of the violation, so it isn't gated behind the card-payments
 * kill switch - a vendor can complete payout setup even while card checkout
 * is paused.
 */
let connectClient: Stripe | null | undefined;

function getConnectStripeClient(): Stripe | null {
  if (connectClient !== undefined) return connectClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  connectClient = secretKey ? new Stripe(secretKey) : null;

  return connectClient;
}

/**
 * Stripe Connect only supports connected accounts registered in a specific
 * list of countries, which does not include Haiti - a vendor's Connect
 * account country reflects where THEY (as a business/individual) and their
 * bank account are, which for this marketplace usually means a diaspora
 * country, not necessarily where the store operates. The caller must pass
 * an explicit country the vendor picked, never a guessed/default one.
 */
export interface VendorAccountInfo {
  email: string;
  businessName: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US", "CA", "FR". */
  country: string;
}

export async function createExpressAccount(vendor: VendorAccountInfo) {
  const stripe = getConnectStripeClient();
  if (!stripe) return { ok: false as const, reason: "Stripe is not configured." };

  const account = await stripe.accounts.create({
    type: "express",
    email: vendor.email,
    business_type: "individual",
    country: vendor.country,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    business_profile: {
      name: vendor.businessName,
    },
  });

  return { ok: true as const, accountId: account.id };
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const stripe = getConnectStripeClient();
  if (!stripe) return { ok: false as const, reason: "Stripe is not configured." };

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return { ok: true as const, url: link.url };
}

function mapAccountStatus(account: Stripe.Account): StripeConnectStatus {
  if (account.requirements?.disabled_reason) return "restricted";
  if (account.charges_enabled) return "active";
  return "pending";
}

export interface VendorConnectStatus {
  status: StripeConnectStatus;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
}

export async function retrieveAccountStatus(accountId: string) {
  const stripe = getConnectStripeClient();
  if (!stripe) return { ok: false as const, reason: "Stripe is not configured." };

  const account = await stripe.accounts.retrieve(accountId);

  const result: VendorConnectStatus = {
    status: mapAccountStatus(account),
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
  };

  return { ok: true as const, ...result };
}

export interface VendorTransferInput {
  storeId: string;
  vendorConnectAccountId: string;
  amount: number;
  currency: string;
  transferGroup: string;
}

export interface VendorTransferResult {
  storeId: string;
  ok: boolean;
  transferId?: string;
  reason?: string;
}

export async function createVendorTransfer(input: VendorTransferInput): Promise<VendorTransferResult> {
  const stripe = getConnectStripeClient();
  if (!stripe) return { storeId: input.storeId, ok: false, reason: "Stripe is not configured." };

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency.toLowerCase(),
      destination: input.vendorConnectAccountId,
      transfer_group: input.transferGroup,
    });

    return { storeId: input.storeId, ok: true, transferId: transfer.id };
  } catch (error) {
    return {
      storeId: input.storeId,
      ok: false,
      reason: error instanceof Error ? error.message : "Transfer failed.",
    };
  }
}
