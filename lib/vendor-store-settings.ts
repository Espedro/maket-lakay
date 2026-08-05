import type { VendorStoreSettingsInput } from "@/lib/schemas";
import type { Store } from "@/types";

function getStoreInitials(store: Store) {
  return store.logo ?? store.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
}

export function getDefaultStoreSettings(store: Store): VendorStoreSettingsInput {
  return {
    storeName: store.name,
    storeSlug: store.slug,
    description: store.description,
    businessCategory: "Grocery and household essentials",
    phone: "+509 3700 0000",
    email: `hello@${store.slug}.com`,
    department: "Ouest",
    city: store.city,
    commune: store.city,
    addressDetails: "Rue principale, near the public market",
    logoPreview: "",
    coverPreview: "",
    brandColor: "#0d9488",
    returnPolicy: "Customers may request a return within 7 days for eligible unused items.",
    refundPolicy: "Approved refunds are processed through the original simulated payment method.",
    deliveryPolicy: "Orders are prepared within 24 hours and delivered through available marketplace zones.",
    termsAndConditions: "Store listings, prices, and delivery estimates are local data for frontend testing.",
    offersDelivery: true,
    pickupAvailable: true,
    deliveryFee: 4,
    deliveryEstimate: "1-3 business days",
    socialFacebook: "",
    socialInstagram: "",
    socialWhatsapp: "+509 3700 0000",
    notifyNewOrders: true,
    notifyLowStock: true,
    notifyCustomerReviews: true,
    notifyPayoutUpdates: true,
    notifyPromotions: true,
    notifyMarketplaceAnnouncements: false,
  };
}

export function getStoreAvatarLabel(store: Store, settings?: VendorStoreSettingsInput) {
  return settings?.storeName ? settings.storeName.slice(0, 2).toUpperCase() : getStoreInitials(store);
}
