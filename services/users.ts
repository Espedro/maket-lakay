import {
  customerAddresses,
  customerNotifications,
  customers,
  reviews,
  storeReviews,
} from "@/data/mock-data";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth-roles";
import { mapAddressRow, toAddressRow } from "@/lib/supabase/mappers";
import type { CustomerAddress } from "@/types";

export interface RealUserProfile {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  city: string;
  country: string;
  createdAt: string;
}

export async function getAllProfiles(): Promise<RealUserProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, city, country, created_at");

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    city: row.city ?? "",
    country: row.country ?? "",
    createdAt: row.created_at,
  }));
}

export async function updateProfileRole(profileId: string, role: AppRole) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export function getCustomers() {
  return customers;
}

export function getCustomerById(customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

export function getCustomerAddresses(customerId: string) {
  return customerAddresses.filter((address) => address.customerId === customerId);
}

export function getCustomerNotifications(customerId: string) {
  return customerNotifications.filter((notification) => notification.customerId === customerId);
}

export function getCustomerProductReviews(customerId: string) {
  return reviews.filter((review) => review.customerId === customerId);
}

export function getCustomerStoreReviews(customerId: string) {
  return storeReviews.filter((review) => review.customerId === customerId);
}

export async function getRealAddresses(customerProfileId: string): Promise<CustomerAddress[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_profile_id", customerProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapAddressRow);
}

export async function saveRealAddress(address: CustomerAddress, customerProfileId: string) {
  const supabase = createClient();
  const row = toAddressRow(address, customerProfileId);
  const { data, error } = await supabase
    .from("customer_addresses")
    .upsert(row)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false as const, reason: error?.message };
  }

  return { ok: true as const, address: mapAddressRow(data) };
}

export async function deleteRealAddress(addressId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getRealWishlistProductIds(customerProfileId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("customer_profile_id", customerProfileId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.product_id);
}

export async function addRealWishlistItem(customerProfileId: string, productId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("wishlist_items")
    .upsert(
      { customer_profile_id: customerProfileId, product_id: productId },
      { onConflict: "customer_profile_id,product_id" },
    );

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function removeRealWishlistItem(customerProfileId: string, productId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("customer_profile_id", customerProfileId)
    .eq("product_id", productId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
