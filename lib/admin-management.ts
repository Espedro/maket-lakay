import { customers, products, stores, vendors } from "@/data/mock-data";
import type { Product, Store, Vendor } from "@/types";

export const ADMIN_MANAGEMENT_KEY = "maket-lakay-admin-management";

export type AdminVendorStatus = "active" | "pending" | "rejected" | "suspended";
export type AdminStoreStatus = "open" | "paused" | "suspended";
export type ProductModerationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "changes_requested";
export type AdminUserRole = "customer" | "vendor_staff" | "support_staff" | "admin";
export type AdminAccountStatus = "active" | "suspended";
export type VendorApplicationStatus = "submitted" | "under_review" | "approved" | "rejected";

export interface AdminVendorState {
  verificationStatus: AdminVendorStatus;
  storeStatus: AdminStoreStatus;
  documentReview: "not_started" | "reviewed";
}

export interface AdminProductState {
  moderationStatus: ProductModerationStatus;
  submittedAt: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminAccountStatus;
  registeredAt: string;
  location: string;
}

export interface VendorApplication {
  id: string;
  applicantProfileId?: string;
  businessName: string;
  businessType?: string;
  ownerName: string;
  email: string;
  phone: string;
  website?: string;
  socialLinks?: string;
  yearsInBusiness?: number;
  department: string;
  city: string;
  commune: string;
  addressDetails?: string;
  landmark?: string;
  pickupAddress?: string;
  businessCategory: string;
  productFocus: string;
  estimatedProductCount?: number;
  storeSlug?: string;
  logoPreview?: string;
  coverPreview?: string;
  brandColor?: string;
  description: string;
  profileDisplayName?: string;
  profileBio?: string;
  deliveryOptions?: Array<"pickup" | "local_delivery" | "marketplace_delivery">;
  deliveryZones?: string;
  returnPolicy?: string;
  refundPolicy?: string;
  businessHours?: string;
  processingTime?: string;
  governmentIdType?: "national_id" | "passport" | "driver_license" | "business_registration";
  idDocumentPreview?: string;
  idExpirationDate?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  payoutMethod?: "MonCash" | "NatCash" | "ACH" | "Zelle" | "PayPal" | "Stripe";
  payoutAccountName?: string;
  payoutAccountReference?: string;
  payoutRoutingNumber?: string;
  payoutAccountNumber?: string;
  payoutAccountType?: "Checking" | "Savings" | "Business checking";
  payoutEmail?: string;
  payoutStripeAccountId?: string;
  agreesToTerms?: boolean;
  confirmsAuthenticProducts?: boolean;
  confirmsFulfillment?: boolean;
  acceptsCommission?: boolean;
  status: VendorApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  approvedVendorId?: string;
  approvedStoreId?: string;
}

export interface AdminManagementState {
  vendors: Record<string, AdminVendorState>;
  products: Record<string, AdminProductState>;
  users: AdminUserRecord[];
  vendorApplications: VendorApplication[];
}

function getVendorInitialState(vendor: Vendor): AdminVendorState {
  return {
    verificationStatus:
      vendor.verificationStatus === "verified"
        ? "active"
        : vendor.verificationStatus === "pending"
          ? "pending"
          : "rejected",
    storeStatus: vendor.verificationStatus === "verified" ? "open" : "paused",
    documentReview: vendor.verificationStatus === "verified" ? "reviewed" : "not_started",
  };
}

function getProductInitialState(product: Product, index: number): AdminProductState {
  const moderationStatus: ProductModerationStatus =
    product.status === "active" ? "approved" : product.status === "out_of_stock" ? "suspended" : "pending";

  return {
    moderationStatus,
    submittedAt: `2026-07-${String(8 + (index % 10)).padStart(2, "0")}T10:30:00Z`,
  };
}

export function getDefaultAdminManagementState(): AdminManagementState {
  return {
    vendors: vendors.reduce<Record<string, AdminVendorState>>((state, vendor) => {
      state[vendor.id] = getVendorInitialState(vendor);
      return state;
    }, {}),
    products: products.reduce<Record<string, AdminProductState>>((state, product, index) => {
      state[product.id] = getProductInitialState(product, index);
      return state;
    }, {}),
    users: [
      ...customers.map<AdminUserRecord>((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: "customer",
        status: "active",
        registeredAt: customer.joinedAt,
        location: `${customer.city}, ${customer.country}`,
      })),
      ...vendors.map<AdminUserRecord>((vendor) => ({
        id: `${vendor.id}-staff`,
        name: vendor.ownerName,
        email: vendor.email,
        role: "vendor_staff",
        status: vendor.verificationStatus === "unverified" ? "suspended" : "active",
        registeredAt: vendor.joinedAt,
        location: `${vendor.city}, ${vendor.country}`,
      })),
      {
        id: "support-roseline",
        name: "Roseline Admin",
        email: "support@maketlakay.example",
        role: "support_staff",
        status: "active",
        registeredAt: "2026-01-10",
        location: "Port-au-Prince, Haiti",
      },
      {
        id: "admin-ops",
        name: "Maket Admin",
        email: "admin@maketlakay.example",
        role: "admin",
        status: "active",
        registeredAt: "2025-12-01",
        location: "Marketplace HQ",
      },
    ],
    vendorApplications: [],
  };
}

export function hydrateAdminManagementState(
  storedState: Partial<AdminManagementState> = {},
): AdminManagementState {
  const defaults = getDefaultAdminManagementState();
  const storedUsers = storedState.users ?? [];
  const defaultUserIds = new Set(defaults.users.map((user) => user.id));
  const customUsers = storedUsers.filter((user) => !defaultUserIds.has(user.id));
  const vendorApplications = storedState.vendorApplications ?? [];

  return {
    vendors: {
      ...defaults.vendors,
      ...(storedState.vendors ?? {}),
    },
    products: {
      ...defaults.products,
      ...(storedState.products ?? {}),
    },
    users: defaults.users
      .map((user) => storedUsers.find((storedUser) => storedUser.id === user.id) ?? user)
      .concat(customUsers),
    vendorApplications,
  };
}

export function getVendorStores(vendorId: string) {
  return stores.filter((store) => store.vendorId === vendorId);
}

export function getVendorSales(vendorId: string, totalsByStore: Record<string, number>) {
  return getVendorStores(vendorId).reduce((sum, store) => sum + (totalsByStore[store.id] ?? 0), 0);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getApplicationSeed(application: VendorApplication) {
  return slugify(application.storeSlug || application.businessName || application.id) || application.id;
}

export function getApprovedVendorId(application: VendorApplication) {
  return application.approvedVendorId ?? `vendor-local-${getApplicationSeed(application)}`;
}

export function getApprovedStoreId(application: VendorApplication) {
  return application.approvedStoreId ?? `store-local-${getApplicationSeed(application)}`;
}

export function getApprovedApplicationVendors(state: AdminManagementState): Vendor[] {
  return state.vendorApplications
    .filter((application) => application.status === "approved")
    .map((application) => ({
      id: getApprovedVendorId(application),
      name: application.businessName,
      ownerName: application.ownerName,
      email: application.email,
      phone: application.phone,
      city: application.commune || application.city,
      country: "Haiti",
      verificationStatus: "verified",
      rating: 0,
      joinedAt: application.reviewedAt ?? application.submittedAt,
    }));
}

export function getApprovedApplicationStores(state: AdminManagementState): Store[] {
  return state.vendorApplications
    .filter((application) => application.status === "approved")
    .map((application) => {
      const seed = getApplicationSeed(application);

      return {
        id: getApprovedStoreId(application),
        vendorId: getApprovedVendorId(application),
        name: application.businessName,
        slug: seed,
        description: application.description,
        city: application.commune || application.city,
        country: "Haiti",
        logo: application.businessName
          .split(/\s+/)
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        bannerColor: "bg-lakay-palm",
        verified: true,
        rating: 0,
        reviewCount: 0,
        productCount: 0,
      };
    });
}

export function getAllVendors(state: AdminManagementState) {
  const localVendors = getApprovedApplicationVendors(state);
  const merged = new Map<string, Vendor>();

  vendors.forEach((vendor) => merged.set(vendor.id, vendor));
  localVendors.forEach((vendor) => merged.set(vendor.id, vendor));

  return Array.from(merged.values());
}

export function getAllStores(state: AdminManagementState) {
  const localStores = getApprovedApplicationStores(state);
  const merged = new Map<string, Store>();

  stores.forEach((store) => merged.set(store.id, store));
  localStores.forEach((store) => merged.set(store.id, store));

  return Array.from(merged.values());
}
