"use client";

import { createClient } from "@/lib/supabase/client";

export interface RealCommissionSettings {
  defaultRate: number;
  vendorRates: Record<string, number>;
}

export async function getRealCommissionSettings(): Promise<RealCommissionSettings | null> {
  const supabase = createClient();
  const [{ data: settingsRow }, { data: vendorRateRows }] = await Promise.all([
    supabase.from("commission_settings").select("default_rate").eq("id", "default").maybeSingle(),
    supabase.from("vendor_commission_rates").select("vendor_id, rate"),
  ]);

  if (!settingsRow) {
    return null;
  }

  return {
    defaultRate: Number(settingsRow.default_rate),
    vendorRates: (vendorRateRows ?? []).reduce<Record<string, number>>((rates, row) => {
      rates[row.vendor_id] = Number(row.rate);
      return rates;
    }, {}),
  };
}

export async function updateRealDefaultCommissionRate(rate: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("commission_settings")
    .update({ default_rate: rate, updated_at: new Date().toISOString() })
    .eq("id", "default");

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function updateRealVendorCommissionRate(vendorId: string, rate: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("vendor_commission_rates")
    .upsert({ vendor_id: vendorId, rate, updated_at: new Date().toISOString() });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
