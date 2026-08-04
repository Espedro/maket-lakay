import type { Tables } from "@/types/database";
import type { Category, Product, Store, Vendor } from "@/types";

export function mapCategoryRow(row: Tables<"categories">): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    icon: row.icon ?? "",
    accentColor: row.accent_color ?? "bg-lakay-blue",
  };
}

export function mapVendorRow(row: Tables<"vendors">): Vendor {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    verificationStatus: row.verification_status,
    rating: Number(row.rating),
    joinedAt: row.joined_at,
  };
}

export function mapStoreRow(row: Tables<"stores">): Store {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    city: row.city ?? "",
    country: row.country ?? undefined,
    logo: row.logo ?? undefined,
    bannerColor: row.banner_color ?? "bg-lakay-blue",
    verified: row.verified,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    productCount: row.product_count,
  };
}

export function mapProductRow(row: Tables<"products">): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    brand: row.brand ?? undefined,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price !== null ? Number(row.compare_at_price) : undefined,
    currency: row.currency === "HTG" ? "HTG" : "USD",
    rating: Number(row.rating),
    reviewCount: row.review_count,
    image: row.image ?? "/placeholder-product.svg",
    stock: row.stock,
    status: row.status,
    isFeatured: row.is_featured,
    isLocalMade: row.is_local_made,
    isTrending: row.is_trending,
    isNewArrival: row.is_new_arrival,
    isRecommended: row.is_recommended,
  };
}
