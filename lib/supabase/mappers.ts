import type { Json, Tables, TablesInsert } from "@/types/database";
import type {
  Category,
  CustomerAddress,
  DeliveryAssignment,
  DeliveryZone,
  Dispute,
  DisputeEvidence,
  Order,
  OrderStatusEvent,
  Product,
  ProofOfDelivery,
  RefundRequest,
  Review,
  Store,
  StoreReview,
  SupportMessage,
  SupportTicket,
  Vendor,
} from "@/types";
import type { VendorApplication } from "@/lib/admin-management";
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
  order_tracking_events?: Tables<"order_tracking_events">[];
}

export function mapOrderTrackingEventRow(row: Tables<"order_tracking_events">): OrderStatusEvent {
  return {
    id: row.id,
    status: row.status as OrderStatusEvent["status"],
    label: row.label,
    message: row.message,
    createdAt: row.created_at,
  };
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
    markedForReview: row.marked_for_review,
    refundIssued: row.refund_issued,
    statusHistory: (row.order_tracking_events ?? [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(mapOrderTrackingEventRow),
  };
}

export function mapDeliveryAssignmentRow(row: Tables<"delivery_assignments">): DeliveryAssignment {
  return {
    id: row.id,
    orderId: row.order_id,
    zoneId: row.zone_id ?? "",
    courierName: row.courier_name,
    courierPhone: row.courier_phone,
    status: row.status as DeliveryAssignment["status"],
    assignedAt: row.assigned_at,
    pickedUpAt: row.picked_up_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

export function mapProofOfDeliveryRow(row: Tables<"proof_of_deliveries">): ProofOfDelivery {
  return {
    id: row.id,
    orderId: row.order_id,
    assignmentId: row.assignment_id ?? "",
    recipientName: row.recipient_name,
    method: row.method as ProofOfDelivery["method"],
    note: row.note ?? "",
    deliveredAt: row.delivered_at,
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

export function mapRefundRequestRow(row: Tables<"refund_requests">): RefundRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_profile_id,
    storeId: row.store_id,
    amount: Number(row.amount),
    currency: row.currency === "HTG" ? "HTG" : "USD",
    status: row.status as RefundRequest["status"],
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mapDisputeEvidenceRow(row: Tables<"dispute_evidence">): DisputeEvidence {
  return {
    id: row.id,
    authorType: row.author_type as DisputeEvidence["authorType"],
    authorName: row.author_name,
    title: row.title,
    notes: row.notes,
    imagePreviewUrl: row.image_preview_url ?? undefined,
    fileName: row.file_name ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapDisputeRow(
  row: Tables<"disputes">,
  evidenceRows: Tables<"dispute_evidence">[] = [],
): Dispute {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_profile_id,
    storeId: row.store_id,
    status: row.status as Dispute["status"],
    reason: row.reason,
    requestedResolution: row.requested_resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    evidenceRecords: evidenceRows.map(mapDisputeEvidenceRow),
  };
}

export function mapSupportTicketMessageRow(row: Tables<"support_ticket_messages">): SupportMessage {
  return {
    id: row.id,
    authorType: row.author_type as SupportMessage["authorType"],
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    visibility: row.visibility as SupportMessage["visibility"],
  };
}

export function mapSupportTicketRow(
  row: Tables<"support_tickets">,
  messageRows: Tables<"support_ticket_messages">[] = [],
): SupportTicket {
  return {
    id: row.id,
    customerId: row.customer_profile_id,
    orderId: row.order_id ?? undefined,
    storeId: row.store_id ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    assignedToName: row.assigned_to_name ?? undefined,
    slaDueAt: row.sla_due_at ?? undefined,
    escalationStatus: (row.escalation_status ?? undefined) as SupportTicket["escalationStatus"],
    escalatedAt: row.escalated_at ?? undefined,
    escalatedByName: row.escalated_by_name ?? undefined,
    escalationReason: row.escalation_reason ?? undefined,
    adminResolution: row.admin_resolution ?? undefined,
    adminResolvedAt: row.admin_resolved_at ?? undefined,
    subject: row.subject,
    category: row.category as SupportTicket["category"],
    priority: row.priority as SupportTicket["priority"],
    status: row.status as SupportTicket["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: messageRows
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(mapSupportTicketMessageRow),
  };
}

export function mapVendorApplicationRow(row: Tables<"vendor_applications">): VendorApplication {
  return {
    id: row.id,
    applicantProfileId: row.applicant_profile_id,
    businessName: row.business_name,
    businessType: row.business_type,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    website: row.website ?? undefined,
    socialLinks: row.social_links ?? undefined,
    yearsInBusiness: row.years_in_business ?? undefined,
    department: row.department,
    city: row.city,
    commune: row.commune,
    addressDetails: row.address_details ?? undefined,
    landmark: row.landmark ?? undefined,
    pickupAddress: row.pickup_address ?? undefined,
    businessCategory: row.business_category,
    productFocus: row.product_focus,
    estimatedProductCount: row.estimated_product_count ?? undefined,
    storeSlug: row.store_slug ?? undefined,
    logoPreview: row.logo_preview ?? undefined,
    coverPreview: row.cover_preview ?? undefined,
    brandColor: row.brand_color ?? undefined,
    description: row.description,
    profileDisplayName: row.profile_display_name ?? undefined,
    profileBio: row.profile_bio ?? undefined,
    deliveryOptions: (row.delivery_options ?? undefined) as VendorApplication["deliveryOptions"],
    deliveryZones: row.delivery_zones ?? undefined,
    returnPolicy: row.return_policy ?? undefined,
    refundPolicy: row.refund_policy ?? undefined,
    businessHours: row.business_hours ?? undefined,
    processingTime: row.processing_time ?? undefined,
    governmentIdType: row.government_id_type as VendorApplication["governmentIdType"],
    idDocumentPreview: row.id_document_preview ?? undefined,
    idExpirationDate: row.id_expiration_date ?? undefined,
    businessRegistrationNumber: row.business_registration_number ?? undefined,
    taxId: row.tax_id ?? undefined,
    phoneVerified: row.phone_verified,
    emailVerified: row.email_verified,
    payoutMethod: row.payout_method as VendorApplication["payoutMethod"],
    payoutAccountName: row.payout_account_name ?? undefined,
    payoutAccountReference: row.payout_account_reference ?? undefined,
    payoutRoutingNumber: row.payout_routing_number ?? undefined,
    payoutAccountNumber: row.payout_account_number ?? undefined,
    payoutAccountType: row.payout_account_type as VendorApplication["payoutAccountType"],
    payoutEmail: row.payout_email ?? undefined,
    payoutStripeAccountId: row.payout_stripe_account_id ?? undefined,
    agreesToTerms: row.agrees_to_terms,
    confirmsAuthenticProducts: row.confirms_authentic_products,
    confirmsFulfillment: row.confirms_fulfillment,
    acceptsCommission: row.accepts_commission,
    status: row.status as VendorApplication["status"],
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNote: row.review_note ?? undefined,
    approvedVendorId: row.approved_vendor_id ?? undefined,
    approvedStoreId: row.approved_store_id ?? undefined,
  };
}

export function toVendorApplicationInsertRow(
  application: Omit<VendorApplication, "id" | "status" | "submittedAt">,
): TablesInsert<"vendor_applications"> {
  return {
    applicant_profile_id: application.applicantProfileId!,
    business_name: application.businessName,
    business_type: application.businessType,
    owner_name: application.ownerName,
    email: application.email,
    phone: application.phone,
    website: application.website || null,
    social_links: application.socialLinks || null,
    years_in_business: application.yearsInBusiness ?? null,
    department: application.department,
    city: application.city,
    commune: application.commune,
    address_details: application.addressDetails || null,
    landmark: application.landmark || null,
    pickup_address: application.pickupAddress || null,
    business_category: application.businessCategory,
    product_focus: application.productFocus,
    estimated_product_count: application.estimatedProductCount ?? null,
    store_slug: application.storeSlug || null,
    logo_preview: application.logoPreview || null,
    cover_preview: application.coverPreview || null,
    brand_color: application.brandColor || null,
    description: application.description,
    profile_display_name: application.profileDisplayName || null,
    profile_bio: application.profileBio || null,
    delivery_options: application.deliveryOptions ?? null,
    delivery_zones: application.deliveryZones || null,
    return_policy: application.returnPolicy || null,
    refund_policy: application.refundPolicy || null,
    business_hours: application.businessHours || null,
    processing_time: application.processingTime || null,
    government_id_type: application.governmentIdType ?? "national_id",
    id_document_preview: application.idDocumentPreview || null,
    id_expiration_date: application.idExpirationDate || null,
    business_registration_number: application.businessRegistrationNumber || null,
    tax_id: application.taxId || null,
    phone_verified: application.phoneVerified ?? false,
    email_verified: application.emailVerified ?? false,
    payout_method: application.payoutMethod ?? "MonCash",
    payout_account_name: application.payoutAccountName || null,
    payout_account_reference: application.payoutAccountReference || null,
    payout_routing_number: application.payoutRoutingNumber || null,
    payout_account_number: application.payoutAccountNumber || null,
    payout_account_type: application.payoutAccountType || null,
    payout_email: application.payoutEmail || null,
    payout_stripe_account_id: application.payoutStripeAccountId || null,
    agrees_to_terms: application.agreesToTerms ?? false,
    confirms_authentic_products: application.confirmsAuthenticProducts ?? false,
    confirms_fulfillment: application.confirmsFulfillment ?? false,
    accepts_commission: application.acceptsCommission ?? false,
  };
}
