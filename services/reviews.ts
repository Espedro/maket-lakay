import { createClient } from "@/lib/supabase/client";
import { createPublicClient } from "@/lib/supabase/public";
import { mapProductReviewRow, mapStoreReviewRow } from "@/lib/supabase/mappers";
import type { Review, StoreReview } from "@/types";

export async function getRealProductReviews(productId: string): Promise<Review[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapProductReviewRow);
}

export async function createRealProductReview(input: {
  productId: string;
  customerProfileId: string;
  orderId?: string;
  rating: number;
  title: string;
  body: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("product_reviews").insert({
    product_id: input.productId,
    customer_profile_id: input.customerProfileId,
    order_id: input.orderId,
    rating: input.rating,
    title: input.title,
    body: input.body,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getRealStoreReviews(storeId: string): Promise<StoreReview[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("store_reviews")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapStoreReviewRow);
}

export async function createRealStoreReview(input: {
  storeId: string;
  customerProfileId: string;
  orderId?: string;
  rating: number;
  title: string;
  body: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("store_reviews").insert({
    store_id: input.storeId,
    customer_profile_id: input.customerProfileId,
    order_id: input.orderId,
    rating: input.rating,
    title: input.title,
    body: input.body,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getRealCustomerProductReviews(customerProfileId: string): Promise<Review[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("customer_profile_id", customerProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapProductReviewRow);
}

export async function getRealCustomerStoreReviews(customerProfileId: string): Promise<StoreReview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("store_reviews")
    .select("*")
    .eq("customer_profile_id", customerProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapStoreReviewRow);
}

export async function getAllRealProductReviews(): Promise<Review[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapProductReviewRow);
}

export async function getAllRealStoreReviews(): Promise<StoreReview[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("store_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapStoreReviewRow);
}
