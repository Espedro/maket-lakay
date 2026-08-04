"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
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
