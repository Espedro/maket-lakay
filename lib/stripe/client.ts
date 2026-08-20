"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Manual kill switch. A standard Stripe account can't collect payment on
 * behalf of multiple independent vendors (Stripe flagged this as payment
 * facilitation/aggregation, 2026-08-20) - card payments stay off here until
 * the integration is migrated to Stripe Connect. Flip back to true once
 * vendors are onboarded through Connect.
 */
const CARD_PAYMENTS_ENABLED = false;

let stripePromise: Promise<Stripe | null> | null = null;

export function isStripeConfigured() {
  return CARD_PAYMENTS_ENABLED && Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

/**
 * Returns null when the publishable key isn't configured, so the card
 * payment option can stay hidden/disabled instead of crashing checkout.
 */
export function getStripeClient(): Promise<Stripe | null> | null {
  if (!isStripeConfigured()) return null;

  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);
  }

  return stripePromise;
}
