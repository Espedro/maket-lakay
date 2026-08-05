import { orders, stores as mockStores } from "@/data/mock-data";
import type { VendorStoreSettingsInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import { mapStoreRow, mapVendorRow } from "@/lib/supabase/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import { getProductsByStore } from "@/services/products";
import type { Json } from "@/types/database";

export async function getVendors() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("vendors").select("*");

  if (error) {
    throw new Error(`Failed to load vendors: ${error.message}`);
  }

  return (data ?? []).map(mapVendorRow);
}

export async function getVendorById(vendorId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load vendor ${vendorId}: ${error.message}`);
  }

  return data ? mapVendorRow(data) : undefined;
}

export async function getStores() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("stores").select("*");

  if (error) {
    throw new Error(`Failed to load stores: ${error.message}`);
  }

  return (data ?? []).map(mapStoreRow);
}

/**
 * Sync, mock-backed on purpose: this is called from ProductCard, which
 * renders inside both server- and client-rendered trees (e.g. from within
 * ProductDiscoveryView). An async Supabase call here would break that
 * client-side usage. Store identity for the seeded catalog is unaffected
 * since ids are shared between mock data and Supabase.
 */
export function getStoreById(storeId: string) {
  return mockStores.find((store) => store.id === storeId);
}

export async function getStoreBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load store "${slug}": ${error.message}`);
  }

  return data ? mapStoreRow(data) : undefined;
}

export async function getStoresByVendor(vendorId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("vendor_id", vendorId);

  if (error) {
    throw new Error(`Failed to load stores for vendor ${vendorId}: ${error.message}`);
  }

  return (data ?? []).map(mapStoreRow);
}

export async function getStoreProducts(storeId: string) {
  return getProductsByStore(storeId);
}

export function getStoreOrders(storeId: string) {
  return orders.filter((order) => order.storeId === storeId);
}

export async function getPopularStores(limit = 6) {
  const stores = await getStores();
  return [...stores]
    .sort((a, b) => b.rating - a.rating || b.productCount - a.productCount)
    .slice(0, limit);
}

export async function getRealStoreSettings(storeId: string): Promise<VendorStoreSettingsInput | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !data || !data.settings || Object.keys(data.settings).length === 0) {
    return null;
  }

  return data.settings as unknown as VendorStoreSettingsInput;
}

export async function saveRealStoreSettings(storeId: string, settings: VendorStoreSettingsInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("stores")
    .update({ settings: settings as unknown as Json, name: settings.storeName, slug: settings.storeSlug })
    .eq("id", storeId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
