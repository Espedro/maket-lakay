"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, CheckCircle2, FileCheck2, PauseCircle, RotateCcw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { orders } from "@/data/mock-data";
import { useAdminManagement } from "@/hooks/use-admin-management";
import type { AdminStoreStatus, AdminVendorStatus } from "@/lib/admin-management";
import {
  getAllStores,
  getAllVendors,
  getApprovedVendorId,
  type VendorApplication,
} from "@/lib/admin-management";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Vendor } from "@/types";

interface AdminVendorDetailsClientProps {
  vendorId: string;
}

type VendorAction = {
  label: string;
  verificationStatus?: AdminVendorStatus;
  storeStatus?: AdminStoreStatus;
  documentReview?: boolean;
  message: string;
};

const storeTotals = orders.reduce<Record<string, number>>((totals, order) => {
  totals[order.storeId] = (totals[order.storeId] ?? 0) + order.total;
  return totals;
}, {});

function statusVariant(status: string) {
  if (["active", "approved", "open", "reviewed"].includes(status)) return "success";
  if (["rejected", "suspended"].includes(status)) return "destructive";
  return "neutral";
}

const starterVendorApplications: Record<string, VendorApplication> = {
  "vendor-bel-lakay": {
    id: "vendor-app-bel-lakay",
    businessName: "Bel Lakay Trading",
    businessType: "Business",
    ownerName: "Nadine Joseph",
    email: "nadine@bellakay.example",
    phone: "+509 37 00 1122",
    website: "https://bellakay.example",
    socialLinks: "Instagram @bellakaymarket, WhatsApp +509 37 00 1122",
    yearsInBusiness: 7,
    department: "Ouest",
    city: "Petion-Ville",
    commune: "Petion-Ville",
    addressDetails: "Rue Gregoire, Petion-Ville marketplace office",
    landmark: "Near Place Saint-Pierre",
    pickupAddress: "Bel Lakay Market pickup counter, Petion-Ville",
    businessCategory: "Grocery",
    productFocus: "Groceries, home essentials, beauty and personal care",
    estimatedProductCount: 128,
    storeSlug: "bel-lakay-market",
    brandColor: "#175C9E",
    description: "Trusted home, grocery, and personal care essentials for Haitian households.",
    profileDisplayName: "Bel Lakay Market",
    profileBio: "Established local vendor serving households with reliable staples, clear delivery expectations, and responsive customer care.",
    deliveryOptions: ["pickup", "local_delivery", "marketplace_delivery"],
    deliveryZones: "Petion-Ville, Delmas, Tabarre, Port-au-Prince",
    returnPolicy: "Returns accepted within 7 days for unopened or unused items with receipt.",
    refundPolicy: "Approved refunds are processed after inspection through the selected payout or payment channel.",
    businessHours: "Mon-Sat, 8 AM - 6 PM",
    processingTime: "Same day to 1 business day",
    governmentIdType: "national_id",
    idDocumentPreview: "/placeholder-product.svg",
    idExpirationDate: "2029-12-31",
    businessRegistrationNumber: "HT-BIZ-BEL-2025-001",
    taxId: "EIN-BEL-509001",
    phoneVerified: true,
    emailVerified: true,
    payoutMethod: "MonCash",
    payoutAccountName: "Nadine Joseph",
    payoutAccountReference: "+509 37 00 1122",
    payoutRoutingNumber: "",
    payoutAccountNumber: "",
    payoutAccountType: "Business checking",
    payoutEmail: "",
    payoutStripeAccountId: "",
    agreesToTerms: true,
    confirmsAuthenticProducts: true,
    confirmsFulfillment: true,
    acceptsCommission: true,
    status: "approved",
    submittedAt: "2025-03-17T10:30:00Z",
    reviewedAt: "2025-03-18T14:15:00Z",
    reviewNote: "Business registration, owner ID, phone, email, and payout profile approved.",
    approvedVendorId: "vendor-bel-lakay",
    approvedStoreId: "store-bel-lakay",
  },
  "vendor-kreyol-tech": {
    id: "vendor-app-kreyol-tech",
    businessName: "Kreyol Tech Depot",
    businessType: "Business",
    ownerName: "Marc Alain",
    email: "marc@kreyoltech.example",
    phone: "+509 31 44 9200",
    website: "https://kreyoltech.example",
    socialLinks: "Facebook Kreyol Tech Depot, WhatsApp +509 31 44 9200",
    yearsInBusiness: 5,
    department: "Nord",
    city: "Cap-Haitien",
    commune: "Cap-Haitien",
    addressDetails: "Avenue 16, Cap-Haitien electronics district",
    landmark: "Near Place d'Armes",
    pickupAddress: "Kreyol Tech Depot service counter",
    businessCategory: "Electronics",
    productFocus: "Phones, accessories, electronics, and repair supplies",
    estimatedProductCount: 74,
    storeSlug: "kreyol-tech-depot",
    brandColor: "#D62828",
    description: "Phones, accessories, electronics, and repair supplies for everyday customers.",
    profileDisplayName: "Kreyol Tech Depot",
    profileBio: "Technology vendor focused on practical devices, accessories, and reliable after-sale support.",
    deliveryOptions: ["pickup", "local_delivery"],
    deliveryZones: "Cap-Haitien, Limbe, Milot",
    returnPolicy: "Returns accepted within 5 days for eligible unopened accessories.",
    refundPolicy: "Device refunds require inspection and serial number verification.",
    businessHours: "Mon-Sat, 9 AM - 5 PM",
    processingTime: "1-2 business days",
    governmentIdType: "passport",
    idDocumentPreview: "/placeholder-product.svg",
    idExpirationDate: "2028-11-30",
    businessRegistrationNumber: "HT-BIZ-KTD-2025-014",
    taxId: "EIN-KTD-509014",
    phoneVerified: true,
    emailVerified: true,
    payoutMethod: "ACH",
    payoutAccountName: "Marc Alain",
    payoutAccountReference: "",
    payoutRoutingNumber: "021000021",
    payoutAccountNumber: "****9200",
    payoutAccountType: "Business checking",
    payoutEmail: "",
    payoutStripeAccountId: "",
    agreesToTerms: true,
    confirmsAuthenticProducts: true,
    confirmsFulfillment: true,
    acceptsCommission: true,
    status: "approved",
    submittedAt: "2025-05-21T09:00:00Z",
    reviewedAt: "2025-05-22T13:20:00Z",
    reviewNote: "Electronics seller approved with verified business documents.",
    approvedVendorId: "vendor-kreyol-tech",
    approvedStoreId: "store-kreyol-tech",
  },
  "vendor-diaspora-goods": {
    id: "vendor-app-diaspora-goods",
    businessName: "Diaspora Goods",
    businessType: "Individual",
    ownerName: "Mireille Pierre",
    email: "hello@diasporagoods.example",
    phone: "+1 305 555 0198",
    website: "",
    socialLinks: "Instagram @artisandiaspora",
    yearsInBusiness: 2,
    department: "Sud-Est",
    city: "Jacmel",
    commune: "Jacmel",
    addressDetails: "Jacmel artisan collective pickup point",
    landmark: "Near the waterfront artisan market",
    pickupAddress: "Jacmel artisan collective",
    businessCategory: "Local Artisan Products",
    productFocus: "Handmade gifts, paintings, textiles, and artisan decor",
    estimatedProductCount: 36,
    storeSlug: "artisan-lakay",
    brandColor: "#F2A541",
    description: "Handmade gifts, paintings, and textiles from Haitian makers.",
    profileDisplayName: "Artisan Lakay",
    profileBio: "Individual seller coordinating Haitian artisan products for customers in Haiti and abroad.",
    deliveryOptions: ["pickup", "marketplace_delivery"],
    deliveryZones: "Jacmel, Port-au-Prince, diaspora shipping coordination",
    returnPolicy: "Custom handmade items are final sale unless damaged on arrival.",
    refundPolicy: "Refund requests are reviewed with photo evidence within 3 days of delivery.",
    businessHours: "Mon-Fri, 10 AM - 4 PM",
    processingTime: "2-3 business days",
    governmentIdType: "driver_license",
    idDocumentPreview: "/placeholder-product.svg",
    idExpirationDate: "2027-10-15",
    businessRegistrationNumber: "",
    taxId: "",
    phoneVerified: true,
    emailVerified: true,
    payoutMethod: "PayPal",
    payoutAccountName: "Mireille Pierre",
    payoutAccountReference: "",
    payoutRoutingNumber: "",
    payoutAccountNumber: "",
    payoutAccountType: "Checking",
    payoutEmail: "hello@diasporagoods.example",
    payoutStripeAccountId: "",
    agreesToTerms: true,
    confirmsAuthenticProducts: true,
    confirmsFulfillment: true,
    acceptsCommission: true,
    status: "under_review",
    submittedAt: "2025-08-08T11:45:00Z",
    reviewedAt: "2025-08-09T10:10:00Z",
    reviewNote: "Identity verified; marketplace team is reviewing artisan sourcing documents.",
    approvedVendorId: "vendor-diaspora-goods",
    approvedStoreId: "store-artisan-lakay",
  },
};

export function AdminVendorDetailsClient({ vendorId }: AdminVendorDetailsClientProps) {
  const { isReady, reviewVendorDocuments, state, updateVendor } = useAdminManagement();
  const [pendingAction, setPendingAction] = React.useState<VendorAction | null>(null);
  const application = state.vendorApplications.find(
    (item) => item.id === vendorId || getApprovedVendorId(item) === vendorId,
  ) ?? starterVendorApplications[vendorId];
  const vendor =
    getAllVendors(state).find((item) => item.id === vendorId) ??
    (application
      ? ({
          id: getApprovedVendorId(application),
          name: application.businessName,
          ownerName: application.ownerName,
          email: application.email,
          phone: application.phone,
          city: application.commune || application.city,
          country: "Haiti",
          verificationStatus: application.status === "approved" ? "verified" : "pending",
          rating: 0,
          joinedAt: application.submittedAt,
        } satisfies Vendor)
      : undefined);

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  if (!vendor) {
    return (
      <section className="border bg-white p-6">
        <h1 className="text-3xl font-black tracking-normal">Vendor not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This vendor does not exist in local data.
        </p>
        <Button asChild className="mt-5">
          <Link href="/admin/vendors">Back to vendors</Link>
        </Button>
      </section>
    );
  }

  const selectedVendor = vendor;
  const adminState = state.vendors[selectedVendor.id];
  const vendorStores = getAllStores(state).filter((store) => store.vendorId === selectedVendor.id);
  const sales = vendorStores.reduce((sum, store) => sum + (storeTotals[store.id] ?? 0), 0);

  function confirmAction() {
    if (!pendingAction) return;

    if (pendingAction.documentReview) {
      reviewVendorDocuments(selectedVendor.id);
    } else {
      updateVendor(
        selectedVendor.id,
        pendingAction.verificationStatus ?? "pending",
        pendingAction.storeStatus ?? "paused",
        pendingAction.message,
      );
    }
    setPendingAction(null);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/admin/vendors">
          <ArrowLeft className="size-4" />
          Back to vendors
        </Link>
      </Button>

      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Vendor Details
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">{selectedVendor.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedVendor.ownerName} - {selectedVendor.city}, {selectedVendor.country}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(adminState?.verificationStatus ?? "pending")}>
              {adminState?.verificationStatus ?? "pending"}
            </Badge>
            <Badge variant={statusVariant(adminState?.storeStatus ?? "paused")}>
              {adminState?.storeStatus ?? "paused"}
            </Badge>
            <Badge variant={statusVariant(adminState?.documentReview ?? "not_started")}>
              documents {adminState?.documentReview ?? "not_started"}
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailTile label="Total sales" value={formatCurrency(sales)} />
            <DetailTile label="Registration date" value={formatDate(selectedVendor.joinedAt)} />
            <DetailTile label="Rating" value={selectedVendor.rating.toFixed(1)} />
          </div>

          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Business profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Owner" value={selectedVendor.ownerName} />
              <InfoRow label="Email" value={selectedVendor.email} />
              <InfoRow label="Phone" value={selectedVendor.phone} />
              <InfoRow label="Location" value={`${selectedVendor.city}, ${selectedVendor.country}`} />
            </div>
          </section>

          <VendorApplicationDossier application={application} />

          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Stores</h2>
            <div className="mt-4 space-y-3">
              {vendorStores.map((store) => (
                <article key={store.id} className="border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">{store.name}</p>
                      <p className="text-sm text-muted-foreground">{store.description}</p>
                    </div>
                    <Badge variant={store.verified ? "success" : "neutral"}>
                      {store.verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                    <InfoRow label="Products" value={store.productCount.toString()} />
                    <InfoRow label="Rating" value={store.rating.toFixed(1)} />
                    <InfoRow label="Reviews" value={store.reviewCount.toString()} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="border bg-white p-5">
          <h2 className="text-xl font-black">Actions</h2>
          <div className="mt-4 space-y-3">
            <VendorActionButton
              icon={CheckCircle2}
              label="Approve"
              onClick={() =>
                setPendingAction({
                  label: "Approve vendor",
                  verificationStatus: "active",
                  storeStatus: "open",
                  message: `${selectedVendor.name} was approved locally.`,
                })
              }
            />
            <VendorActionButton
              icon={XCircle}
              label="Reject"
              onClick={() =>
                setPendingAction({
                  label: "Reject vendor",
                  verificationStatus: "rejected",
                  storeStatus: "paused",
                  message: `${selectedVendor.name} was rejected locally.`,
                })
              }
            />
            <VendorActionButton
              icon={PauseCircle}
              label="Suspend"
              onClick={() =>
                setPendingAction({
                  label: "Suspend vendor",
                  verificationStatus: "suspended",
                  storeStatus: "suspended",
                  message: `${selectedVendor.name} was suspended locally.`,
                })
              }
            />
            <VendorActionButton
              icon={RotateCcw}
              label="Reactivate"
              onClick={() =>
                setPendingAction({
                  label: "Reactivate vendor",
                  verificationStatus: "active",
                  storeStatus: "open",
                  message: `${selectedVendor.name} was reactivated locally.`,
                })
              }
            />
            <VendorActionButton
              icon={FileCheck2}
              label="Review documents"
              onClick={() =>
                setPendingAction({
                  label: "Review documents",
                  documentReview: true,
                  message: `${selectedVendor.name} documents will be marked reviewed.`,
                })
              }
            />
          </div>
        </aside>
      </div>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
            <DialogDescription>
              This confirmation updates local admin data only.
            </DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">{pendingAction?.message}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-white p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function VendorApplicationDossier({
  application,
}: {
  application?: VendorApplication;
}) {
  if (!application) {
    return (
      <section className="border bg-white p-5">
        <h2 className="text-xl font-black">Application dossier</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This vendor comes from the starter vendor list, so the full application
          form fields are not available in local state.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <section className="border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Application dossier</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Full information submitted during vendor registration.
            </p>
          </div>
          <Badge variant={statusVariant(application.status)}>
            {application.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </section>

      <DossierSection
        title="Seller"
        fields={[
          ["Application ID", application.id],
          ["Submitted", formatDate(application.submittedAt)],
          ["Reviewed", application.reviewedAt ? formatDate(application.reviewedAt) : undefined],
          ["Review note", application.reviewNote],
          ["Seller name", application.businessName],
          ["Seller type", application.businessType],
          ["Primary category", application.businessCategory],
          ["Years in business", application.yearsInBusiness],
          ["Account email", application.email],
          ["Account phone", application.phone],
          ["Phone verified", yesNo(application.phoneVerified)],
          ["Email verified", yesNo(application.emailVerified)],
          ["Website", application.website],
          ["Social links", application.socialLinks],
          ["Department", application.department],
          ["City", application.city],
          ["Commune", application.commune],
          ["Landmark", application.landmark],
          ["Address details", application.addressDetails],
          ["Pickup address", application.pickupAddress],
        ]}
      />

      <DossierSection
        title="Legal & Identity"
        fields={[
          ["Owner full name", application.ownerName],
          ["ID type", application.governmentIdType?.replaceAll("_", " ")],
          ["ID expiration date", application.idExpirationDate],
          ["Legal business registration", application.businessRegistrationNumber],
          ["EIN", application.taxId],
        ]}
      />

      <DossierPreviewGrid
        previews={[
          ["ID preview", application.idDocumentPreview],
          ["Store logo", application.logoPreview],
          ["Cover image", application.coverPreview],
        ]}
      />

      <DossierSection
        title="Store & Profile"
        fields={[
          ["Profile display name", application.profileDisplayName],
          ["Seller profile bio", application.profileBio],
          ["Desired store slug", application.storeSlug],
          ["Estimated products", application.estimatedProductCount],
          ["Products planned", application.productFocus],
          ["Brand color", application.brandColor],
          ["Store description", application.description],
        ]}
      />

      <DossierSection
        title="Delivery & Policies"
        fields={[
          ["Delivery options", application.deliveryOptions?.map((option) => option.replaceAll("_", " ")).join(", ")],
          ["Delivery zones served", application.deliveryZones],
          ["Business hours", application.businessHours],
          ["Average processing time", application.processingTime],
          ["Return policy", application.returnPolicy],
          ["Refund policy", application.refundPolicy],
        ]}
      />

      <DossierSection
        title="Payout"
        fields={[
          ["Preferred payout method", application.payoutMethod],
          ["Account holder name", application.payoutAccountName],
          ["Wallet/reference", application.payoutAccountReference],
          ["ACH routing number", application.payoutRoutingNumber],
          ["ACH account number", application.payoutAccountNumber],
          ["ACH account type", application.payoutAccountType],
          ["Payout email", application.payoutEmail],
          ["Stripe account ID or email", application.payoutStripeAccountId],
        ]}
      />

      <DossierSection
        title="Agreements"
        fields={[
          ["Vendor terms accepted", yesNo(application.agreesToTerms)],
          ["Authentic products confirmed", yesNo(application.confirmsAuthenticProducts)],
          ["Fulfillment confirmed", yesNo(application.confirmsFulfillment)],
          ["Commission agreement accepted", yesNo(application.acceptsCommission)],
        ]}
      />
    </section>
  );
}

function DossierSection({
  fields,
  title,
}: {
  fields: Array<[string, React.ReactNode]>;
  title: string;
}) {
  return (
    <section className="border bg-white p-5">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="border bg-muted/20 p-3">
            <p className="text-muted-foreground">{label}</p>
            <p className="mt-1 break-words font-black">
              {value === undefined || value === null || value === "" ? "Not provided" : value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DossierPreviewGrid({
  previews,
}: {
  previews: Array<[string, string | undefined]>;
}) {
  return (
    <section className="border bg-white p-5">
      <h3 className="text-lg font-black">Uploaded previews</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {previews.map(([label, src]) => (
          <div key={label} className="border bg-muted/20 p-3 text-sm">
            <p className="font-black">{label}</p>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={label} className="mt-2 h-36 w-full object-contain" />
            ) : (
              <p className="mt-2 text-muted-foreground">Not provided</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function yesNo(value?: boolean) {
  return value ? "Yes" : "No";
}

function VendorActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="w-full justify-start rounded-none" onClick={onClick}>
      <Icon className="size-4" />
      {label}
    </Button>
  );
}
