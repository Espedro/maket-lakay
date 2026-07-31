export type CurrencyCode = "USD" | "HTG";

export type ProductStatus = "active" | "draft" | "out_of_stock";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "shipped"
  | "delivered"
  | "cancelled";
export type VerificationStatus = "verified" | "pending" | "unverified";
export type NotificationType =
  | "order"
  | "inventory"
  | "review"
  | "system"
  | "delivery";
export type PaymentMethodType = "moncash" | "natcash" | "card" | "paypal";
export type PaymentProviderId = PaymentMethodType;
export type PaymentStatus =
  | "requires_payment_method"
  | "processing"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";
export type RefundStatus = "requested" | "approved" | "processed" | "rejected";
export type WalletEntryType = "sale" | "commission" | "refund" | "payout";
export type ReviewStatus = "published" | "pending" | "flagged";
export type SupportTicketStatus = "open" | "waiting_on_customer" | "resolved";
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";
export type SupportEscalationStatus =
  | "pending_admin"
  | "approved"
  | "rejected"
  | "resolved";
export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";
export type ReportTargetType = "product" | "vendor" | "store";
export type ReportStatus = "submitted" | "reviewing" | "action_taken" | "dismissed";
export type DeliveryAssignmentStatus =
  | "unassigned"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "completed"
  | "failed";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  accentColor: string;
}

export interface Vendor {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  verificationStatus: VerificationStatus;
  rating: number;
  joinedAt: string;
}

export interface Store {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  country?: string;
  logo?: string;
  bannerColor: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  productCount: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  brand?: string;
  price: number;
  compareAtPrice?: number;
  currency: CurrencyCode;
  rating: number;
  reviewCount: number;
  image: string;
  stock: number;
  status: ProductStatus;
  isFeatured?: boolean;
  isLocalMade?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isRecommended?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  city: string;
  country: string;
  preferredLanguage: "en" | "ht" | "fr";
  joinedAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  country: string;
  commune?: string;
  zone?: string;
  landmark?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  description: string;
  last4?: string;
  testBehavior?: "success" | "failure";
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  provider: PaymentProviderId;
  methodId: string;
  status: PaymentStatus;
  amount: number;
  currency: CurrencyCode;
  providerReference: string;
  verificationCode: string;
  failureReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface PaymentWebhookEvent {
  id: string;
  provider: PaymentProviderId;
  type: "payment.captured" | "payment.failed" | "refund.processed";
  paymentId: string;
  status: PaymentStatus;
  signature: string;
  receivedAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  orderId: string;
  storeId: string;
  amount: number;
  currency: CurrencyCode;
  status: RefundStatus;
  reason: string;
  createdAt: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  customerId: string;
  storeId: string;
  amount: number;
  currency: CurrencyCode;
  status: RefundStatus;
  reason: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorWallet {
  id: string;
  storeId: string;
  vendorId: string;
  currency: CurrencyCode;
  availableBalance: number;
  pendingBalance: number;
  lifetimeSales: number;
  lifetimeCommission: number;
  entries: Array<{
    id: string;
    type: WalletEntryType;
    description: string;
    amount: number;
    createdAt: string;
  }>;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderStatusEvent {
  id: string;
  status: OrderStatus;
  label: string;
  message: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  status: OrderStatus;
  currency: CurrencyCode;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
  placedAt: string;
  deliveryCity: string;
  deliveryZoneId?: string;
  deliveryAssignmentId?: string;
  trackingNumber?: string;
  estimatedDeliveryAt?: string;
  proofOfDeliveryId?: string;
  statusHistory?: OrderStatusEvent[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  baseFee: number;
  currency: CurrencyCode;
  estimatedDays: number;
  active: boolean;
}

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  zoneId: string;
  courierName: string;
  courierPhone: string;
  status: DeliveryAssignmentStatus;
  assignedAt: string;
  pickedUpAt?: string;
  completedAt?: string;
}

export interface TrackingEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  title: string;
  description: string;
  location: string;
  createdAt: string;
}

export interface ProofOfDelivery {
  id: string;
  orderId: string;
  assignmentId: string;
  recipientName: string;
  method: "signature" | "photo" | "code";
  note: string;
  deliveredAt: string;
}

export interface CustomerNotification {
  id: string;
  customerId: string;
  orderId: string;
  channel: "email" | "sms" | "in_app";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  orderId?: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  status?: ReviewStatus;
  helpfulCount?: number;
  vendorReply?: string;
}

export interface StoreReview {
  id: string;
  storeId: string;
  customerId: string;
  orderId?: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  status: ReviewStatus;
}

export interface SupportMessage {
  id: string;
  authorType: "customer" | "support" | "vendor";
  authorName: string;
  body: string;
  createdAt: string;
  visibility?: "customer_visible" | "internal";
}

export interface SupportTicket {
  id: string;
  customerId: string;
  orderId?: string;
  vendorId?: string;
  storeId?: string;
  assignedTo?: string;
  assignedToName?: string;
  slaDueAt?: string;
  escalationStatus?: SupportEscalationStatus;
  escalatedAt?: string;
  escalatedByName?: string;
  escalationReason?: string;
  adminResolution?: string;
  adminResolvedAt?: string;
  subject: string;
  category: "order" | "delivery" | "payment" | "refund" | "account" | "other";
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

export interface DisputeEvidence {
  id: string;
  authorType: "vendor" | "support" | "customer";
  authorName: string;
  title: string;
  notes: string;
  imagePreviewUrl?: string;
  fileName?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  storeId: string;
  status: DisputeStatus;
  reason: string;
  requestedResolution: string;
  createdAt: string;
  updatedAt?: string;
  evidenceRecords?: DisputeEvidence[];
}

export interface MarketplaceReport {
  id: string;
  reporterCustomerId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: "counterfeit" | "unsafe" | "misleading" | "prohibited" | "other";
  details: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface CheckoutOrderSnapshot {
  id: string;
  placedAt: string;
  addressId: string;
  deliveryAddress?: {
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    country: string;
    commune?: string;
    zone?: string;
    landmark?: string;
  };
  deliveryMethodId?: string;
  deliveryMethodLabel?: string;
  paymentMethodId: string;
  paymentMethodLabel?: string;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  discount?: number;
  trackingHref?: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  commissionTotal?: number;
  total: number;
  currency: CurrencyCode;
  vendorGroups: Array<{
    storeId: string;
    storeName: string;
    itemCount: number;
    subtotal: number;
    deliveryFee: number;
    commission?: number;
    vendorPayout?: number;
    items?: OrderItem[];
  }>;
}
