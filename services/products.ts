import { reviews } from "@/data/mock-data";
import { mapCategoryRow, mapProductRow } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/client";
import { createPublicClient } from "@/lib/supabase/public";
import {
  discoverProducts,
  getBrands,
  type ProductDiscoveryContext,
  type ProductDiscoveryFilters,
} from "@/lib/product-discovery";
import { getStores, getVendors } from "@/services/vendors";
import type { ProductStatus } from "@/types";

async function fetchAllProducts() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data ?? []).map(mapProductRow);
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("products").select("*").in("id", ids);

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data ?? []).map(mapProductRow);
}

export async function getCategories() {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("categories").select("*");

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return (data ?? []).map(mapCategoryRow);
}

/**
 * Admin-only: products RLS only exposes draft/out-of-audience rows to the
 * owning vendor or an admin session, so this needs the authenticated
 * client (cookie-based session) rather than the anon `createPublicClient`
 * used for public catalog reads.
 */
export async function getAllRealProductsForAdmin() {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data ?? []).map(mapProductRow);
}

export async function updateRealProductStatus(productId: string, status: ProductStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", productId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

async function fetchDiscoveryContext(): Promise<ProductDiscoveryContext> {
  const [categories, stores, vendors] = await Promise.all([
    getCategories(),
    getStores(),
    getVendors(),
  ]);

  return { categories, stores, vendors };
}

export async function getProducts(filters: ProductDiscoveryFilters = {}) {
  const [products, context] = await Promise.all([fetchAllProducts(), fetchDiscoveryContext()]);
  return discoverProducts(products, filters, context);
}

export async function getProductById(productId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product ${productId}: ${error.message}`);
  }

  return data ? mapProductRow(data) : undefined;
}

export async function getProductBySlug(slug: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product "${slug}": ${error.message}`);
  }

  return data ? mapProductRow(data) : undefined;
}

export async function getFeaturedProducts() {
  const products = await fetchAllProducts();
  return products.filter((product) => product.isFeatured);
}

export async function getTrendingProducts() {
  const products = await fetchAllProducts();
  return products.filter((product) => product.isTrending);
}

export async function getNewArrivals() {
  const products = await fetchAllProducts();
  return products.filter((product) => product.isNewArrival);
}

export async function getRecommendedProducts() {
  const products = await fetchAllProducts();
  return products.filter((product) => product.isRecommended);
}

export async function getProductsByCategory(categoryId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId);

  if (error) {
    throw new Error(`Failed to load products for category ${categoryId}: ${error.message}`);
  }

  return (data ?? []).map(mapProductRow);
}

export async function getProductsByStore(storeId: string) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId);

  if (error) {
    throw new Error(`Failed to load products for store ${storeId}: ${error.message}`);
  }

  return (data ?? []).map(mapProductRow);
}

export function getProductReviews(productId: string) {
  return reviews.filter((review) => review.productId === productId);
}

export async function getBrandList() {
  const products = await fetchAllProducts();
  return getBrands(products);
}
