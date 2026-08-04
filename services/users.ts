import {
  customerAddresses,
  customerNotifications,
  customers,
  reviews,
  storeReviews,
} from "@/data/mock-data";
import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth-roles";

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
