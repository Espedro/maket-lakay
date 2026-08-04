import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const stripe = getStripeServerClient();

  if (!stripe) {
    return NextResponse.json({ error: "Card payments are not configured yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to pay by card." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { customerProfileId: user.id },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
