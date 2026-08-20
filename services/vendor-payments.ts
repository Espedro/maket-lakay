import { createClient } from "@/lib/supabase/client";
import { mapVendorRow } from "@/lib/supabase/mappers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StripeConnectStatus } from "@/types";

type AnySupabaseClient = SupabaseClient<Database>;

export async function getVendorByOwnerProfileId(supabase: AnySupabaseClient, ownerProfileId: string) {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_profile_id", ownerProfileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load vendor: ${error.message}`);
  }

  return data ? mapVendorRow(data) : undefined;
}

export async function saveVendorConnectAccount(
  supabase: AnySupabaseClient,
  vendorId: string,
  accountId: string,
) {
  const { error } = await supabase
    .from("vendors")
    .update({ stripe_connect_account_id: accountId, stripe_connect_updated_at: new Date().toISOString() })
    .eq("id", vendorId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function updateVendorConnectStatus(
  supabase: AnySupabaseClient,
  vendorId: string,
  status: {
    status: StripeConnectStatus;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
  },
) {
  const { error } = await supabase
    .from("vendors")
    .update({
      stripe_connect_status: status.status,
      stripe_connect_details_submitted: status.detailsSubmitted,
      stripe_connect_charges_enabled: status.chargesEnabled,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq("id", vendorId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getConnectReadinessForStores(storeIds: string[]) {
  const result: Record<string, boolean> = {};

  if (storeIds.length === 0) return result;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, vendors(stripe_connect_charges_enabled)")
    .in("id", storeIds);

  if (error || !data) return result;

  data.forEach((row) => {
    const vendor = row.vendors as unknown as { stripe_connect_charges_enabled: boolean } | null;
    result[row.id] = vendor?.stripe_connect_charges_enabled ?? false;
  });

  return result;
}
