import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

/**
 * Returns null (not a thrown error) when STRIPE_SECRET_KEY isn't set, so
 * callers can degrade gracefully - card payments stay unavailable until the
 * key is configured, instead of crashing the checkout API route.
 */
export function getStripeServerClient(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  stripeClient = secretKey ? new Stripe(secretKey) : null;

  return stripeClient;
}
