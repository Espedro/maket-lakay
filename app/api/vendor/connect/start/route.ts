import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAccountLink, createExpressAccount } from "@/lib/stripe/connect";
import { getVendorByOwnerProfileId, saveVendorConnectAccount } from "@/services/vendor-payments";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to connect a payout account." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const country = typeof body?.country === "string" ? body.country.toUpperCase() : "";

  const vendor = await getVendorByOwnerProfileId(supabase, user.id);

  if (!vendor) {
    return NextResponse.json({ error: "No vendor account found for this user." }, { status: 404 });
  }

  let accountId = vendor.stripeConnectAccountId;

  if (!accountId) {
    if (!country) {
      return NextResponse.json({ error: "Choose the country your business/bank account is in." }, { status: 400 });
    }

    const created = await createExpressAccount({
      email: vendor.email,
      businessName: vendor.name,
      country,
    });

    if (!created.ok) {
      return NextResponse.json({ error: created.reason }, { status: 502 });
    }

    accountId = created.accountId;

    const saved = await saveVendorConnectAccount(supabase, vendor.id, accountId);

    if (!saved.ok) {
      return NextResponse.json({ error: saved.reason }, { status: 500 });
    }
  }

  const origin = new URL(request.url).origin;
  const link = await createAccountLink(
    accountId,
    `${origin}/vendor/settings?stripe=return`,
    `${origin}/vendor/settings?stripe=refresh`,
  );

  if (!link.ok) {
    return NextResponse.json({ error: link.reason }, { status: 502 });
  }

  return NextResponse.json({ url: link.url });
}
