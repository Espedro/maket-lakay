import { z } from "zod";

export const marketplaceSearchSchema = z.object({
  query: z.string().trim().max(120).optional(),
  category: z.string().optional(),
});

export const vendorProfileSchema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(8, "Enter a valid phone number"),
  city: z.string().min(2, "City is required"),
});

const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^https?:\/\/.+/i.test(value), {
    message: "Enter a valid URL starting with http:// or https://",
  });

export const vendorApplicationSchema = z
  .object({
    businessName: z.string().trim().min(2, "Seller name is required").max(90),
    businessType: z.enum(["Business", "Individual"]),
    ownerName: z.string().trim().min(2, "Owner name is required").max(90),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
    website: optionalUrlSchema,
    socialLinks: z.string().trim().max(240),
    yearsInBusiness: z.coerce.number().int().min(0).max(100),
    department: z.string().trim().min(2, "Department is required").max(80),
    city: z.string().trim().min(2, "City is required").max(80),
    commune: z.string().trim().min(2, "Commune is required").max(80),
    addressDetails: z.string().trim().min(6, "Add seller address details").max(240),
    landmark: z.string().trim().max(140),
    pickupAddress: z.string().trim().max(240),
    businessCategory: z.string().trim().min(2, "Category is required").max(90),
    productFocus: z.string().trim().min(3, "Tell us what you plan to sell").max(180),
    estimatedProductCount: z.coerce.number().int().min(1, "Add an estimated product count").max(10000),
    storeSlug: z
      .string()
      .trim()
      .min(2, "Store slug is required")
      .max(90)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
    logoPreview: z.string().optional(),
    coverPreview: z.string().optional(),
    brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a valid brand color"),
    description: z.string().trim().min(20, "Add a short store description").max(700),
    profileDisplayName: z.string().trim().min(2, "Profile display name is required").max(90),
    profileBio: z.string().trim().min(20, "Add a short seller profile").max(700),
    deliveryOptions: z
      .array(z.enum(["pickup", "local_delivery", "marketplace_delivery"]))
      .min(1, "Choose at least one delivery option"),
    deliveryZones: z.string().trim().min(3, "Add delivery zones served").max(240),
    returnPolicy: z.string().trim().min(10, "Return policy is too short").max(700),
    refundPolicy: z.string().trim().min(10, "Refund policy is too short").max(700),
    businessHours: z.string().trim().min(3, "Business hours are required").max(120),
    processingTime: z.string().trim().min(3, "Processing time is required").max(120),
    governmentIdType: z.enum(["national_id", "passport", "driver_license", "business_registration"]),
    idDocumentPreview: z.string().trim().min(1, "Upload an unexpired ID preview"),
    idExpirationDate: z.string().trim().min(1, "ID expiration date is required"),
    businessRegistrationNumber: z.string().trim().max(80),
    taxId: z.string().trim().max(80),
    phoneVerified: z.boolean().refine(Boolean, "Phone must be verified"),
    emailVerified: z.boolean().refine(Boolean, "Email must be verified"),
    payoutMethod: z.enum(["MonCash", "NatCash", "ACH", "Zelle", "PayPal", "Stripe"]),
    payoutAccountName: z.string().trim().min(2, "Account holder name is required").max(90),
    payoutAccountReference: z.string().trim().max(120),
    payoutRoutingNumber: z.string().trim().max(40),
    payoutAccountNumber: z.string().trim().max(60),
    payoutAccountType: z.enum(["Checking", "Savings", "Business checking"]),
    payoutEmail: z.string().trim().max(120),
    payoutStripeAccountId: z.string().trim().max(120),
    agreesToTerms: z.boolean().refine(Boolean, "Vendor terms must be accepted"),
    confirmsAuthenticProducts: z.boolean().refine(Boolean, "Authentic product confirmation is required"),
    confirmsFulfillment: z.boolean().refine(Boolean, "Fulfillment confirmation is required"),
    acceptsCommission: z.boolean().refine(Boolean, "Commission agreement is required"),
  })
  .superRefine((value, context) => {
    const expirationDate = new Date(`${value.idExpirationDate}T23:59:59`);

    if (Number.isNaN(expirationDate.getTime()) || expirationDate < new Date()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ID must be unexpired",
        path: ["idExpirationDate"],
      });
    }

    if (value.businessType === "Business") {
      if (!value.businessRegistrationNumber.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Legal business registration is required",
          path: ["businessRegistrationNumber"],
        });
      }

      if (!value.taxId.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "EIN is required for business sellers",
          path: ["taxId"],
        });
      }
    }

    if (value.payoutMethod === "ACH") {
      if (!value.payoutRoutingNumber.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ACH routing number is required",
          path: ["payoutRoutingNumber"],
        });
      }

      if (!value.payoutAccountNumber.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ACH account number is required",
          path: ["payoutAccountNumber"],
        });
      }
    }

    if (["MonCash", "NatCash"].includes(value.payoutMethod) && value.payoutAccountReference.trim().length < 4) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${value.payoutMethod} phone number is required`,
        path: ["payoutAccountReference"],
      });
    }

    if (["Zelle", "PayPal"].includes(value.payoutMethod) && !value.payoutEmail.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${value.payoutMethod} email is required`,
        path: ["payoutEmail"],
      });
    }

    if (value.payoutMethod === "Stripe" && !value.payoutStripeAccountId.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Stripe account ID or email is required",
        path: ["payoutStripeAccountId"],
      });
    }
  });

export const productReviewSchema = z.object({
  productId: z.string().min(1, "Choose a product"),
  orderId: z.string().optional(),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().trim().min(3, "Review title is required").max(80),
  body: z.string().trim().min(10, "Add a few more details").max(600),
});

export const storeReviewSchema = z.object({
  storeId: z.string().min(1, "Choose a store"),
  orderId: z.string().optional(),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().trim().min(3, "Review title is required").max(80),
  body: z.string().trim().min(10, "Add a few more details").max(600),
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4, "Subject is required").max(100),
  category: z.enum(["order", "delivery", "payment", "refund", "account", "other"]),
  orderId: z.string().optional(),
  message: z.string().trim().min(10, "Message is too short").max(800),
});

export const supportReplySchema = z.object({
  message: z.string().trim().min(2, "Reply is too short").max(800),
});

export const refundRequestSchema = z.object({
  orderId: z.string().min(1, "Choose an order"),
  amount: z.coerce.number().positive("Refund amount must be positive"),
  reason: z.string().trim().min(10, "Reason is too short").max(700),
});

export const disputeSchema = z.object({
  orderId: z.string().min(1, "Choose an order"),
  reason: z.string().trim().min(10, "Reason is too short").max(700),
  requestedResolution: z.string().trim().min(5, "Requested resolution is required").max(300),
});

export const marketplaceReportSchema = z.object({
  targetType: z.enum(["product", "vendor", "store"]),
  targetId: z.string().min(1, "Choose what to report"),
  reason: z.enum(["counterfeit", "unsafe", "misleading", "prohibited", "other"]),
  details: z.string().trim().min(10, "Add details for support").max(700),
});

export const vendorSupportReplySchema = z.object({
  message: z.string().trim().min(3, "Reply is too short").max(800),
});

export const vendorDisputeEvidenceSchema = z.object({
  title: z.string().trim().min(3, "Evidence title is required").max(100),
  notes: z.string().trim().min(8, "Add a short evidence note").max(700),
});

export const checkoutAddressSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(60),
  lastName: z.string().trim().min(2, "Last name is required").max(60),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
  department: z.string().trim().min(2, "Department is required").max(80),
  city: z.string().trim().min(2, "City is required").max(80),
  commune: z.string().trim().min(2, "Commune is required").max(80),
  zone: z.string().trim().min(2, "Zone is required").max(80),
  landmark: z.string().trim().max(140).optional(),
  addressDetails: z.string().trim().min(6, "Add address details").max(240),
});

export const accountProfileSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(60),
  lastName: z.string().trim().min(2, "Last name is required").max(60),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
  preferredLanguage: z.enum(["en", "ht", "fr"]),
  profilePicture: z.string().optional(),
});

export const vendorProductVariantSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required").max(80),
  value: z.string().trim().min(1, "Variant value is required").max(80),
  sku: z.string().trim().min(2, "Variant SKU is required").max(80),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or higher"),
});

export const vendorProductAttributeSchema = z.object({
  name: z.string().trim().min(1, "Attribute name is required").max(80),
  value: z.string().trim().min(1, "Attribute value is required").max(120),
});

export const vendorProductSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  description: z.string().trim().min(10, "Description is too short").max(900),
  categoryId: z.string().min(1, "Choose a category"),
  brand: z.string().trim().max(80).optional(),
  price: z.coerce.number().positive("Price must be positive"),
  discountPrice: z.coerce.number().min(0).optional(),
  currency: z.enum(["USD", "HTG"]),
  sku: z.string().trim().min(2, "SKU is required").max(80),
  stock: z.coerce.number().int().min(0, "Stock quantity must be 0 or higher"),
  condition: z.enum(["new", "used_like_new", "refurbished"]),
  lowStockThreshold: z.coerce.number().int().min(0).max(9999),
  reservedQuantity: z.coerce.number().int().min(0).max(9999),
  weight: z.coerce.number().min(0, "Weight must be 0 or higher"),
  deliverySettings: z.string().trim().min(3, "Delivery settings are required").max(240),
  status: z.enum(["active", "draft", "out_of_stock"]),
  images: z.array(z.string()).max(6),
  variants: z.array(vendorProductVariantSchema).max(12),
  attributes: z.array(vendorProductAttributeSchema).max(12),
});

export const vendorPromotionSchema = z.object({
  name: z.string().trim().min(3, "Promotion name is required").max(100),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive("Discount value must be positive"),
  productIds: z.array(z.string()).min(1, "Choose at least one product"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  usageStatus: z.enum(["scheduled", "active", "paused", "ended"]),
});

export const payoutRequestSchema = z.object({
  method: z.enum(["MonCash", "NatCash", "ACH", "Zelle", "PayPal", "Stripe"]),
  amount: z.coerce.number().positive("Requested amount must be positive"),
  accountLabel: z.string().trim().min(3, "Account label is required").max(120),
});

export const vendorStoreSettingsSchema = z.object({
  storeName: z.string().trim().min(2, "Store name is required").max(90),
  storeSlug: z
    .string()
    .trim()
    .min(2, "Store slug is required")
    .max(90)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().trim().min(12, "Description is too short").max(700),
  businessCategory: z.string().trim().min(2, "Business category is required"),
  phone: z.string().trim().min(8, "Enter a valid phone number").max(24),
  email: z.string().trim().email("Enter a valid email address"),
  department: z.string().trim().min(2, "Department is required").max(80),
  city: z.string().trim().min(2, "City is required").max(80),
  commune: z.string().trim().min(2, "Commune is required").max(80),
  addressDetails: z.string().trim().min(6, "Add address details").max(240),
  logoPreview: z.string().optional(),
  coverPreview: z.string().optional(),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Choose a valid brand color"),
  returnPolicy: z.string().trim().min(10, "Return policy is too short").max(900),
  refundPolicy: z.string().trim().min(10, "Refund policy is too short").max(900),
  deliveryPolicy: z.string().trim().min(10, "Delivery policy is too short").max(900),
  termsAndConditions: z.string().trim().min(10, "Terms are too short").max(1200),
  offersDelivery: z.boolean(),
  pickupAvailable: z.boolean(),
  deliveryFee: z.coerce.number().min(0, "Delivery fee must be 0 or higher"),
  deliveryEstimate: z.string().trim().min(3, "Delivery estimate is required").max(80),
  socialFacebook: optionalUrlSchema,
  socialInstagram: optionalUrlSchema,
  socialWhatsapp: z.string().trim().max(80),
  notifyNewOrders: z.boolean(),
  notifyLowStock: z.boolean(),
  notifyCustomerReviews: z.boolean(),
  notifyPayoutUpdates: z.boolean(),
  notifyPromotions: z.boolean(),
  notifyMarketplaceAnnouncements: z.boolean(),
});

export type MarketplaceSearchInput = z.infer<typeof marketplaceSearchSchema>;
export type VendorProfileInput = z.infer<typeof vendorProfileSchema>;
export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>;
export type ProductReviewInput = z.infer<typeof productReviewSchema>;
export type StoreReviewInput = z.infer<typeof storeReviewSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type SupportReplyInput = z.infer<typeof supportReplySchema>;
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type DisputeInput = z.infer<typeof disputeSchema>;
export type MarketplaceReportInput = z.infer<typeof marketplaceReportSchema>;
export type VendorSupportReplyInput = z.infer<typeof vendorSupportReplySchema>;
export type VendorDisputeEvidenceInput = z.infer<typeof vendorDisputeEvidenceSchema>;
export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;
export type AccountProfileInput = z.infer<typeof accountProfileSchema>;
export type VendorProductInput = z.infer<typeof vendorProductSchema>;
export type VendorPromotionInput = z.infer<typeof vendorPromotionSchema>;
export type PayoutRequestInput = z.infer<typeof payoutRequestSchema>;
export type VendorStoreSettingsInput = z.infer<typeof vendorStoreSettingsSchema>;
