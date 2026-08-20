import Stripe from "stripe";

/**
 * Manual kill switch. See lib/stripe/client.ts for why: a standard Stripe
 * account can't collect payment on behalf of multiple independent vendors,
 * so card payments stay off here until the integration is migrated to
 * Stripe Connect.
 */
const CARD_PAYMENTS_ENABLED = false;

let stripeClient: Stripe | null | undefined;

/**
 * Returns null (not a thrown error) when card payments are disabled or
 * STRIPE_SECRET_KEY isn't set, so callers can degrade gracefully - card
 * payments stay unavailable instead of crashing the checkout API route.
 */
export function getStripeServerClient(): Stripe | null {
  if (!CARD_PAYMENTS_ENABLED) return null;
  if (stripeClient !== undefined) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  stripeClient = secretKey ? new Stripe(secretKey) : null;

  return stripeClient;
}
