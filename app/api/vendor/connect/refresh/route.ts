import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { retrieveAccountStatus } from "@/lib/stripe/connect";
import { getVendorByOwnerProfileId, updateVendorConnectStatus } from "@/services/vendor-payments";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to refresh payout status." }, { status: 401 });
  }

  const vendor = await getVendorByOwnerProfileId(supabase, user.id);

  if (!vendor?.stripeConnectAccountId) {
    return NextResponse.json({ error: "No connected payout account found." }, { status: 404 });
  }

  const result = await retrieveAccountStatus(vendor.stripeConnectAccountId);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }

  const saved = await updateVendorConnectStatus(supabase, vendor.id, {
    status: result.status,
    detailsSubmitted: result.detailsSubmitted,
    chargesEnabled: result.chargesEnabled,
  });

  if (!saved.ok) {
    return NextResponse.json({ error: saved.reason }, { status: 500 });
  }

  return NextResponse.json({
    status: result.status,
    detailsSubmitted: result.detailsSubmitted,
    chargesEnabled: result.chargesEnabled,
  });
}
