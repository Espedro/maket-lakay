"use client";

import Link from "next/link";
import * as React from "react";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  FileCheck2,
  PauseCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { categories, orders, products, stores, vendors } from "@/data/mock-data";
import { useAdminManagement } from "@/hooks/use-admin-management";
import type {
  AdminStoreStatus,
  AdminVendorStatus,
  VendorApplicationStatus,
} from "@/lib/admin-management";
import {
  getApprovedVendorId,
  getVendorSales,
  getVendorStores,
} from "@/lib/admin-management";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAllRealOrders } from "@/services/orders";
import { getStores as getRealStores } from "@/services/vendors";
import type { Store } from "@/types";

type VendorAction = {
  label: string;
  vendorId: string;
  verificationStatus?: AdminVendorStatus;
  storeStatus?: AdminStoreStatus;
  documentReview?: boolean;
  source?: "vendor" | "application";
  applicationStatus?: VendorApplicationStatus;
  message: string;
};

type VendorRow = {
  id: string;
  source: "vendor" | "application";
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  joinedAt: string;
  documentReview: "not_started" | "reviewed";
  storeStatus: AdminStoreStatus;
  totalSales: number;
  verificationStatus: AdminVendorStatus;
  businessCategory?: string;
  categoryIds: string[];
  categoryNames: string[];
  businessType?: string;
  yearsInBusiness?: number;
  department?: string;
  commune?: string;
  productFocus?: string;
  estimatedProductCount?: number;
  description?: string;
  deliveryOptions?: string[];
  deliveryZones?: string;
  payoutMethod?: string;
  payoutAccountName?: string;
  payoutAccountReference?: string;
  payoutRoutingNumber?: string;
  payoutAccountNumber?: string;
  payoutAccountType?: string;
  payoutEmail?: string;
  payoutStripeAccountId?: string;
  returnPolicy?: string;
  refundPolicy?: string;
  processingTime?: string;
  businessHours?: string;
  storeSlug?: string;
  logoPreview?: string;
  coverPreview?: string;
  brandColor?: string;
  profileDisplayName?: string;
  profileBio?: string;
  website?: string;
  socialLinks?: string;
  addressDetails?: string;
  landmark?: string;
  pickupAddress?: string;
  governmentIdType?: string;
  idDocumentPreview?: string;
  idExpirationDate?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  businessRegistrationNumber?: string;
  taxId?: string;
  agreesToTerms?: boolean;
  confirmsAuthenticProducts?: boolean;
  confirmsFulfillment?: boolean;
  acceptsCommission?: boolean;
  approvedVendorId?: string;
  applicationStatus?: VendorApplicationStatus;
};

type DateAddedFilter = "all" | "today" | "7d" | "30d" | "90d" | "2026" | "2025";

const dateAddedOptions: Array<{ label: string; value: DateAddedFilter; days?: number; year?: number }> = [
  { label: "Any date added", value: "all" },
  { label: "Added today", value: "today" },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Added in 2026", value: "2026", year: 2026 },
  { label: "Added in 2025", value: "2025", year: 2025 },
];

const referenceDate = new Date("2026-07-23T12:00:00-04:00");

const storeTotals = orders.reduce<Record<string, number>>((totals, order) => {
  totals[order.storeId] = (totals[order.storeId] ?? 0) + order.total;
  return totals;
}, {});

function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

function getVendorCategoryIds(vendorId: string) {
  const vendorStoreIds = new Set(stores.filter((store) => store.vendorId === vendorId).map((store) => store.id));
  return Array.from(
    new Set(
      products
        .filter((product) => vendorStoreIds.has(product.storeId))
        .map((product) => product.categoryId),
    ),
  );
}

function getApplicationCategoryId(categoryName: string | undefined) {
  return categories.find((category) => category.name === categoryName)?.id;
}

function statusVariant(status: string) {
  if (["active", "open", "reviewed"].includes(status)) return "success";
  if (["rejected", "suspended"].includes(status)) return "destructive";
  return "neutral";
}

function matchesDateAdded(joinedAt: string, filter: DateAddedFilter) {
  if (filter === "all") return true;

  const joinedDate = new Date(joinedAt);
  if (Number.isNaN(joinedDate.getTime())) return false;

  if (filter === "today") {
    return joinedDate.toDateString() === referenceDate.toDateString();
  }

  const option = dateAddedOptions.find((item) => item.value === filter);

  if (option?.year) {
    return joinedDate.getFullYear() === option.year;
  }

  if (!option?.days) return true;

  const threshold = referenceDate.getTime() - option.days * 24 * 60 * 60 * 1000;
  return joinedDate.getTime() >= threshold;
}

export function AdminVendorsClient() {
  const {
    isReady,
    reviewVendorDocuments,
    state,
    updateVendor,
    updateVendorApplicationStatus,
  } = useAdminManagement();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [dateAddedFilter, setDateAddedFilter] = React.useState<DateAddedFilter>("all");
  const [pendingAction, setPendingAction] = React.useState<VendorAction | null>(null);
  const [selectedApplication, setSelectedApplication] = React.useState<VendorRow | null>(null);
  const [realStores, setRealStores] = React.useState<Store[]>([]);
  const [realStoreTotals, setRealStoreTotals] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let active = true;

    Promise.all([getRealStores(), getAllRealOrders()]).then(([fetchedStores, realOrders]) => {
      if (!active) return;

      setRealStores(fetchedStores);
      setRealStoreTotals(
        realOrders.reduce<Record<string, number>>((totals, order) => {
          totals[order.storeId] = (totals[order.storeId] ?? 0) + order.total;
          return totals;
        }, {}),
      );
    });

    return () => {
      active = false;
    };
  }, []);

  const combinedStoreTotals = React.useMemo(() => {
    const combined: Record<string, number> = { ...storeTotals };
    for (const [storeId, total] of Object.entries(realStoreTotals)) {
      combined[storeId] = (combined[storeId] ?? 0) + total;
    }
    return combined;
  }, [realStoreTotals]);

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    dateAddedFilter !== "all";

  const vendorRows = React.useMemo(() => {
    const existingRows: VendorRow[] = vendors.map((vendor) => {
      const adminState = state.vendors[vendor.id];
      const categoryIds = getVendorCategoryIds(vendor.id);
      return {
        ...vendor,
        source: "vendor" as const,
        businessCategory: categoryIds.map(getCategoryName).join(", "),
        categoryIds,
        categoryNames: categoryIds.map(getCategoryName),
        documentReview: adminState?.documentReview ?? "not_started",
        storeStatus: adminState?.storeStatus ?? "paused",
        totalSales: getVendorSales(vendor.id, combinedStoreTotals),
        verificationStatus: adminState?.verificationStatus ?? "pending",
      };
    });
    const applicationRows: VendorRow[] = state.vendorApplications.map((application) => {
      const categoryId = getApplicationCategoryId(application.businessCategory);
      const realVendorId = application.status === "approved" ? getApprovedVendorId(application) : undefined;
      const realVendorStoreIds = realVendorId
        ? realStores.filter((store) => store.vendorId === realVendorId).map((store) => store.id)
        : [];
      const realTotalSales = realVendorStoreIds.reduce(
        (sum, storeId) => sum + (combinedStoreTotals[storeId] ?? 0),
        0,
      );
      const approvedVendorAdminState = realVendorId ? state.vendors[realVendorId] : undefined;

      return {
        id: application.id,
        source: "application",
        name: application.businessName,
        ownerName: application.ownerName,
        email: application.email,
        phone: application.phone,
        city: application.commune || application.city,
        country: "Haiti",
        joinedAt: application.submittedAt,
        documentReview:
          application.status === "under_review" ||
          application.status === "approved" ||
          application.status === "rejected"
            ? "reviewed"
            : "not_started",
        storeStatus:
          approvedVendorAdminState?.storeStatus ?? (application.status === "approved" ? "open" : "paused"),
        totalSales: realTotalSales,
        verificationStatus:
          approvedVendorAdminState?.verificationStatus ??
          (application.status === "approved"
            ? "active"
            : application.status === "rejected"
              ? "rejected"
              : "pending"),
        businessCategory: application.businessCategory,
        categoryIds: categoryId ? [categoryId] : [],
        categoryNames: [application.businessCategory].filter(Boolean),
        businessType: application.businessType,
        yearsInBusiness: application.yearsInBusiness,
        department: application.department,
        commune: application.commune,
        productFocus: application.productFocus,
        estimatedProductCount: application.estimatedProductCount,
        description: application.description,
        deliveryOptions: application.deliveryOptions,
        deliveryZones: application.deliveryZones,
        payoutMethod: application.payoutMethod,
        payoutAccountName: application.payoutAccountName,
        payoutAccountReference: application.payoutAccountReference,
        payoutRoutingNumber: application.payoutRoutingNumber,
        payoutAccountNumber: application.payoutAccountNumber,
        payoutAccountType: application.payoutAccountType,
        payoutEmail: application.payoutEmail,
        payoutStripeAccountId: application.payoutStripeAccountId,
        returnPolicy: application.returnPolicy,
        refundPolicy: application.refundPolicy,
        processingTime: application.processingTime,
        businessHours: application.businessHours,
        storeSlug: application.storeSlug,
        logoPreview: application.logoPreview,
        coverPreview: application.coverPreview,
        brandColor: application.brandColor,
        profileDisplayName: application.profileDisplayName,
        profileBio: application.profileBio,
        website: application.website,
        socialLinks: application.socialLinks,
        addressDetails: application.addressDetails,
        landmark: application.landmark,
        pickupAddress: application.pickupAddress,
        governmentIdType: application.governmentIdType,
        idDocumentPreview: application.idDocumentPreview,
        idExpirationDate: application.idExpirationDate,
        phoneVerified: application.phoneVerified,
        emailVerified: application.emailVerified,
        businessRegistrationNumber: application.businessRegistrationNumber,
        taxId: application.taxId,
        agreesToTerms: application.agreesToTerms,
        confirmsAuthenticProducts: application.confirmsAuthenticProducts,
        confirmsFulfillment: application.confirmsFulfillment,
        acceptsCommission: application.acceptsCommission,
        approvedVendorId:
          application.status === "approved" ? getApprovedVendorId(application) : undefined,
        applicationStatus: application.status,
      };
    });

    return [...applicationRows, ...existingRows].filter((vendor) => {
      const normalizedQuery = query.toLowerCase();
      const matchesQuery =
        vendor.name.toLowerCase().includes(normalizedQuery) ||
        vendor.ownerName.toLowerCase().includes(normalizedQuery) ||
        vendor.city.toLowerCase().includes(normalizedQuery) ||
        vendor.email.toLowerCase().includes(normalizedQuery) ||
        (vendor.businessCategory ?? "").toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || vendor.verificationStatus === statusFilter;
      const matchesCategory = categoryFilter === "all" || vendor.categoryIds.includes(categoryFilter);
      const matchesDate = matchesDateAdded(vendor.joinedAt, dateAddedFilter);
      return matchesQuery && matchesStatus && matchesCategory && matchesDate;
    });
  }, [
    categoryFilter,
    combinedStoreTotals,
    dateAddedFilter,
    query,
    realStores,
    state.vendorApplications,
    state.vendors,
    statusFilter,
  ]);

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateAddedFilter("all");
  }

  function confirmAction() {
    if (!pendingAction) return;

    if (pendingAction.source === "application") {
      updateVendorApplicationStatus(
        pendingAction.vendorId,
        pendingAction.applicationStatus ?? "under_review",
        pendingAction.message,
      );
    } else if (pendingAction.documentReview) {
      reviewVendorDocuments(pendingAction.vendorId);
    } else {
      updateVendor(
        pendingAction.vendorId,
        pendingAction.verificationStatus ?? "pending",
        pendingAction.storeStatus ?? "paused",
        pendingAction.message,
      );
    }
    setPendingAction(null);
  }

  function renderVendorActions(vendor: VendorRow) {
    return (
      <>
        {vendor.source === "vendor" || vendor.approvedVendorId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/vendors/${vendor.approvedVendorId ?? vendor.id}`}>
              <Eye className="size-4" />
              Details
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedApplication(vendor)}
          >
            <Eye className="size-4" />
            Details
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPendingAction({
              label: "Approve vendor",
              vendorId: vendor.id,
              source: vendor.source,
              verificationStatus: "active",
              storeStatus: "open",
              applicationStatus: "approved",
              message: `${vendor.name} was approved locally.`,
            })
          }
        >
          <CheckCircle2 className="size-4" />
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPendingAction({
              label: "Reject vendor",
              vendorId: vendor.id,
              source: vendor.source,
              verificationStatus: "rejected",
              storeStatus: "paused",
              applicationStatus: "rejected",
              message: `${vendor.name} was rejected locally.`,
            })
          }
        >
          <XCircle className="size-4" />
          Reject
        </Button>
        {vendor.source === "vendor" || vendor.approvedVendorId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPendingAction({
                label: vendor.storeStatus === "suspended" ? "Reactivate vendor" : "Suspend vendor",
                vendorId: vendor.source === "vendor" ? vendor.id : (vendor.approvedVendorId ?? vendor.id),
                source: "vendor",
                verificationStatus: vendor.storeStatus === "suspended" ? "active" : "suspended",
                storeStatus: vendor.storeStatus === "suspended" ? "open" : "suspended",
                message: `${vendor.name} status was updated locally.`,
              })
            }
          >
            {vendor.storeStatus === "suspended" ? (
              <RotateCcw className="size-4" />
            ) : (
              <PauseCircle className="size-4" />
            )}
            {vendor.storeStatus === "suspended" ? "Reactivate" : "Suspend"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPendingAction({
              label: "Review documents",
              vendorId: vendor.id,
              source: vendor.source,
              documentReview: true,
              applicationStatus: "under_review",
              message: `${vendor.name} documents were reviewed locally.`,
            })
          }
        >
          <FileCheck2 className="size-4" />
          Docs
        </Button>
      </>
    );
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Vendor Management
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">Vendors</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review vendor applications, store status, documents, and marketplace sales.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_220px_190px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search vendors..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter vendors by account status"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All account statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            aria-label="Filter vendors by category"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter vendors by date added"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={dateAddedFilter}
            onChange={(event) => setDateAddedFilter(event.target.value as DateAddedFilter)}
          >
            {dateAddedOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {vendorRows.length} vendors shown
          </p>
          <Button type="button" variant="outline" size="sm" disabled={!hasActiveFilters} onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total vendors", vendors.length + state.vendorApplications.length],
          ["Pending approvals", vendorRows.filter((vendor) => vendor.verificationStatus === "pending").length],
          ["Suspended stores", vendorRows.filter((vendor) => vendor.storeStatus === "suspended").length],
          [
            "Open stores",
            stores.filter((store) => store.verified).length +
              state.vendorApplications.filter((application) => application.status === "approved").length,
          ],
        ].map(([label, value]) => (
          <div key={label} className="border bg-white p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="border bg-white p-5">
        <ResponsiveDataView
          items={vendorRows}
          getKey={(vendor) => vendor.id}
          cardTitle={(vendor) => vendor.name}
          cardDescription={(vendor) => `${vendor.ownerName} - ${vendor.city}, ${vendor.country}`}
          cardMeta={(vendor) => (
            <Badge variant={statusVariant(vendor.verificationStatus)}>
              {vendor.verificationStatus}
            </Badge>
          )}
          cardFields={(vendor) => [
            { label: "Category", value: vendor.categoryNames.join(", ") || "Uncategorized" },
            {
              label: "Stores",
              value:
                vendor.source === "application"
                  ? vendor.businessCategory ?? "Application"
                  : getVendorStores(vendor.id).map((store) => store.name).join(", ") || "No store",
            },
            { label: "Store", value: <Badge variant={statusVariant(vendor.storeStatus)}>{vendor.storeStatus}</Badge> },
            { label: "Sales", value: formatCurrency(vendor.totalSales) },
            { label: "Date added", value: formatDate(vendor.joinedAt) },
          ]}
          cardActions={renderVendorActions}
          emptyState={
            <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No vendors match the current search and filters.
            </div>
          }
          table={
          <table className="responsive-table min-w-[1220px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Business name</th>
                <th className="py-3 font-medium">Owner</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Location</th>
                <th className="py-3 font-medium">Verification</th>
                <th className="py-3 font-medium">Store status</th>
                <th className="py-3 font-medium">Total sales</th>
                <th className="py-3 font-medium">Date added</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendorRows.map((vendor) => (
                <tr key={vendor.id} className="border-b last:border-0">
                  <td className="py-3">
                    <p className="font-black">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {vendor.source === "application"
                        ? vendor.businessCategory
                        : getVendorStores(vendor.id).map((store) => store.name).join(", ") || "No store"}
                      {vendor.source === "application" ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-primary">
                          <ClipboardList className="size-3" />
                          application
                        </span>
                      ) : null}
                    </p>
                  </td>
                  <td className="py-3">
                    <p className="font-semibold">{vendor.ownerName}</p>
                    <p className="text-xs text-muted-foreground">{vendor.email}</p>
                  </td>
                  <td className="py-3">{vendor.categoryNames.join(", ") || "Uncategorized"}</td>
                  <td className="py-3">
                    {vendor.city}, {vendor.country}
                  </td>
                  <td className="py-3">
                    <Badge variant={statusVariant(vendor.verificationStatus)}>
                      {vendor.verificationStatus}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Badge variant={statusVariant(vendor.storeStatus)}>{vendor.storeStatus}</Badge>
                  </td>
                  <td className="py-3 font-black">{formatCurrency(vendor.totalSales)}</td>
                  <td className="py-3">{formatDate(vendor.joinedAt)}</td>
                  <td className="py-3">
                    <div className="dashboard-action-row">
                      {renderVendorActions(vendor)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          }
        />
      </section>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{pendingAction?.label}</DialogTitle>
            <DialogDescription>
              This action only updates local admin state in this browser.
            </DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">
            {pendingAction?.message ?? "Confirm this vendor action."}
          </div>
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

      <Dialog
        open={Boolean(selectedApplication)}
        onOpenChange={(open) => !open && setSelectedApplication(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-none">
          <DialogHeader>
            <DialogTitle>{selectedApplication?.name}</DialogTitle>
            <DialogDescription>
              Complete vendor application dossier stored in local admin state.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ApplicationDetailSection
              title="Seller"
              fields={[
                ["Application ID", selectedApplication?.id],
                ["Status", selectedApplication?.applicationStatus?.replaceAll("_", " ")],
                ["Submitted", selectedApplication ? formatDate(selectedApplication.joinedAt) : ""],
                ["Seller name", selectedApplication?.name],
                ["Seller type", selectedApplication?.businessType],
                ["Primary category", selectedApplication?.businessCategory],
                ["Years in business", selectedApplication?.yearsInBusiness],
                ["Account email", selectedApplication?.email],
                ["Account phone", selectedApplication?.phone],
                ["Phone verified", selectedApplication?.phoneVerified ? "Yes" : "No"],
                ["Email verified", selectedApplication?.emailVerified ? "Yes" : "No"],
                ["Website", selectedApplication?.website],
                ["Social links", selectedApplication?.socialLinks],
                ["Department", selectedApplication?.department],
                ["City", selectedApplication?.city],
                ["Commune", selectedApplication?.commune],
                ["Landmark", selectedApplication?.landmark],
                ["Address details", selectedApplication?.addressDetails],
                ["Pickup address", selectedApplication?.pickupAddress],
              ]}
            />

            <ApplicationDetailSection
              title="Legal & Identity"
              fields={[
                ["Owner full name", selectedApplication?.ownerName],
                ["ID type", selectedApplication?.governmentIdType?.replaceAll("_", " ")],
                ["ID expiration date", selectedApplication?.idExpirationDate],
                ["Legal business registration", selectedApplication?.businessRegistrationNumber],
                ["EIN", selectedApplication?.taxId],
              ]}
            />

            <ApplicationPreviewGrid
              previews={[
                ["ID preview", selectedApplication?.idDocumentPreview],
                ["Store logo", selectedApplication?.logoPreview],
                ["Cover image", selectedApplication?.coverPreview],
              ]}
            />

            <ApplicationDetailSection
              title="Store & Profile"
              fields={[
                ["Profile display name", selectedApplication?.profileDisplayName],
                ["Seller profile bio", selectedApplication?.profileBio],
                ["Desired store slug", selectedApplication?.storeSlug],
                ["Estimated products", selectedApplication?.estimatedProductCount],
                ["Products planned", selectedApplication?.productFocus],
                ["Brand color", selectedApplication?.brandColor],
                ["Store description", selectedApplication?.description],
              ]}
            />

            <ApplicationDetailSection
              title="Delivery & Policies"
              fields={[
                [
                  "Delivery options",
                  selectedApplication?.deliveryOptions
                    ?.map((option) => option.replaceAll("_", " "))
                    .join(", "),
                ],
                ["Delivery zones served", selectedApplication?.deliveryZones],
                ["Business hours", selectedApplication?.businessHours],
                ["Average processing time", selectedApplication?.processingTime],
                ["Return policy", selectedApplication?.returnPolicy],
                ["Refund policy", selectedApplication?.refundPolicy],
              ]}
            />

            <ApplicationDetailSection
              title="Payout"
              fields={[
                ["Preferred payout method", selectedApplication?.payoutMethod],
                ["Account holder name", selectedApplication?.payoutAccountName],
                ["Wallet/reference", selectedApplication?.payoutAccountReference],
                ["ACH routing number", selectedApplication?.payoutRoutingNumber],
                ["ACH account number", selectedApplication?.payoutAccountNumber],
                ["ACH account type", selectedApplication?.payoutAccountType],
                ["Payout email", selectedApplication?.payoutEmail],
                ["Stripe account ID or email", selectedApplication?.payoutStripeAccountId],
              ]}
            />

            <ApplicationDetailSection
              title="Agreements"
              fields={[
                ["Vendor terms accepted", selectedApplication?.agreesToTerms ? "Yes" : "No"],
                ["Authentic products confirmed", selectedApplication?.confirmsAuthenticProducts ? "Yes" : "No"],
                ["Fulfillment confirmed", selectedApplication?.confirmsFulfillment ? "Yes" : "No"],
                ["Commission agreement accepted", selectedApplication?.acceptsCommission ? "Yes" : "No"],
              ]}
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSelectedApplication(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicationDetailSection({
  fields,
  title,
}: {
  fields: Array<[string, React.ReactNode]>;
  title: string;
}) {
  return (
    <section className="border bg-muted/10 p-4">
      <h3 className="text-base font-black">{title}</h3>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="border bg-white p-3">
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

function ApplicationPreviewGrid({
  previews,
}: {
  previews: Array<[string, string | undefined]>;
}) {
  return (
    <section className="border bg-muted/10 p-4">
      <h3 className="text-base font-black">Uploaded previews</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {previews.map(([label, src]) => (
          <div key={label} className="border bg-white p-3 text-sm">
            <p className="font-black">{label}</p>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={label}
                className="mt-2 h-36 w-full object-contain"
              />
            ) : (
              <p className="mt-2 text-muted-foreground">Not provided</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
