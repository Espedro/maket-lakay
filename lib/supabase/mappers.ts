import type { Json, Tables, TablesInsert } from "@/types/database";
import type {
  Category,
  CustomerAddress,
  DeliveryZone,
  Order,
  Product,
  Review,
  Store,
  StoreReview,
  Vendor,
} from "@/types";
import type { ManagedProduct } from "@/lib/vendor-products";
import type { PayoutRequest, VendorPromotion } from "@/lib/vendor-commerce";

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

interface ManagedProductMetadata {
  condition?: ManagedProduct["condition"];
  images?: string[];
  variants?: ManagedProduct["variants"];
  attributes?: ManagedProduct["attributes"];
  weight?: number;
  deliverySettings?: string;
  reservedQuantity?: number;
  lowStockThreshold?: number;
  stockHistory?: ManagedProduct["stockHistory"];
}

export function mapManagedProductRow(row: Tables<"products">): ManagedProduct {
  const product = mapProductRow(row);
  const metadata = (row.metadata as ManagedProductMetadata | null) ?? {};

  return {
    ...product,
    sku: row.sku ?? "",
    condition: metadata.condition ?? "new",
    images: metadata.images?.length ? metadata.images : [product.image],
    variants: metadata.variants ?? [],
    attributes: metadata.attributes ?? [],
    weight: metadata.weight ?? 0,
    deliverySettings: metadata.deliverySettings ?? "",
    reservedQuantity: metadata.reservedQuantity ?? 0,
    lowStockThreshold: metadata.lowStockThreshold ?? 10,
    stockHistory: metadata.stockHistory ?? [],
  };
}

export function toManagedProductMetadata(product: ManagedProduct): ManagedProductMetadata {
  return {
    condition: product.condition,
    images: product.images,
    variants: product.variants,
    attributes: product.attributes,
    weight: product.weight,
    deliverySettings: product.deliverySettings,
    reservedQuantity: product.reservedQuantity,
    lowStockThreshold: product.lowStockThreshold,
    stockHistory: product.stockHistory,
  };
}

export function toManagedProductRow(product: ManagedProduct): TablesInsert<"products"> {
  return {
    id: product.id,
    store_id: product.storeId,
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand ?? null,
    price: product.price,
    compare_at_price: product.compareAtPrice ?? null,
    currency: product.currency,
    image: product.image,
    stock: product.stock,
    status: product.status,
    is_featured: product.isFeatured ?? false,
    is_local_made: product.isLocalMade ?? false,
    is_trending: product.isTrending ?? false,
    is_new_arrival: product.isNewArrival ?? false,
    is_recommended: product.isRecommended ?? false,
    sku: product.sku,
    metadata: toManagedProductMetadata(product) as unknown as Json,
  };
}

interface OrderRowWithItems extends Tables<"orders"> {
  order_items: Tables<"order_items">[];
}

export function mapOrderRow(row: OrderRowWithItems): Order {
  return {
    id: row.id,
    customerId: row.customer_profile_id,
    storeId: row.store_id,
    status: row.status,
    currency: row.currency === "HTG" ? "HTG" : "USD",
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    items: (row.order_items ?? []).map((item) => ({
      productId: item.product_id ?? "",
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
    })),
    placedAt: row.placed_at,
    deliveryCity: row.delivery_city ?? "",
    trackingNumber: row.tracking_number ?? undefined,
    estimatedDeliveryAt: row.estimated_delivery_at ?? undefined,
  };
}

export function mapAddressRow(row: Tables<"customer_addresses">): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_profile_id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2 ?? undefined,
    city: row.city,
    region: row.region,
    country: row.country,
    commune: row.commune ?? undefined,
    zone: row.zone ?? undefined,
    landmark: row.landmark ?? undefined,
    postalCode: row.postal_code ?? undefined,
    isDefault: row.is_default,
  };
}

export function toAddressRow(
  address: CustomerAddress,
  customerProfileId: string,
): TablesInsert<"customer_addresses"> {
  return {
    id: address.id.startsWith("addr-local-") ? undefined : address.id,
    customer_profile_id: customerProfileId,
    label: address.label,
    recipient_name: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    region: address.region,
    country: address.country,
    commune: address.commune ?? null,
    zone: address.zone ?? null,
    landmark: address.landmark ?? null,
    postal_code: address.postalCode ?? null,
    is_default: address.isDefault ?? false,
  };
}

export function mapProductReviewRow(row: Tables<"product_reviews">): Review {
  return {
    id: row.id,
    productId: row.product_id,
    customerId: row.customer_profile_id,
    orderId: row.order_id ?? undefined,
    rating: row.rating,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    status: row.status as Review["status"],
    helpfulCount: row.helpful_count,
    vendorReply: row.vendor_reply ?? undefined,
  };
}

export function mapStoreReviewRow(row: Tables<"store_reviews">): StoreReview {
  return {
    id: row.id,
    storeId: row.store_id,
    customerId: row.customer_profile_id,
    orderId: row.order_id ?? undefined,
    rating: row.rating,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    status: row.status as StoreReview["status"],
  };
}

export function mapVendorPromotionRow(row: Tables<"vendor_promotions">): VendorPromotion {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    discountType: row.discount_type as VendorPromotion["discountType"],
    discountValue: Number(row.discount_value),
    productIds: row.product_ids,
    startDate: row.start_date,
    endDate: row.end_date,
    usageStatus: row.usage_status as VendorPromotion["usageStatus"],
    views: row.views,
    orders: row.orders,
    revenue: Number(row.revenue),
    createdAt: row.created_at,
  };
}

export function toVendorPromotionRow(
  promotion: VendorPromotion,
  storeId: string,
): TablesInsert<"vendor_promotions"> {
  return {
    store_id: storeId,
    name: promotion.name,
    discount_type: promotion.discountType,
    discount_value: promotion.discountValue,
    product_ids: promotion.productIds,
    start_date: promotion.startDate,
    end_date: promotion.endDate,
    usage_status: promotion.usageStatus,
    views: promotion.views,
    orders: promotion.orders,
    revenue: promotion.revenue,
  };
}

export function mapPayoutRequestRow(row: Tables<"payout_requests">): PayoutRequest {
  return {
    id: row.id,
    storeId: row.store_id,
    method: row.method as PayoutRequest["method"],
    amount: Number(row.amount),
    currency: row.currency === "HTG" ? "HTG" : "USD",
    accountLabel: row.account_label,
    status: row.status as PayoutRequest["status"],
    requestedAt: row.requested_at,
  };
}

export function mapDeliveryZoneRow(row: Tables<"delivery_zones">): DeliveryZone {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    region: row.region,
    country: row.country,
    baseFee: Number(row.base_fee),
    currency: row.currency === "HTG" ? "HTG" : "USD",
    estimatedDays: row.estimated_days,
    active: row.active,
  };
}

export function toDeliveryZoneRow(zone: DeliveryZone): TablesInsert<"delivery_zones"> {
  return {
    id: zone.id,
    name: zone.name,
    city: zone.city,
    region: zone.region,
    country: zone.country,
    base_fee: zone.baseFee,
    currency: zone.currency,
    estimated_days: zone.estimatedDays,
    active: zone.active,
  };
}
