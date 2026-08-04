"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { addAuditLogEntry } from "@/lib/audit-log";
import { readLocalJson, writeLocalJson } from "@/lib/local-storage";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_MANAGEMENT_KEY,
  getApprovedStoreId,
  getApprovedVendorId,
  hydrateAdminManagementState,
  slugify,
  type AdminAccountStatus,
  type AdminManagementState,
  type AdminStoreStatus,
  type AdminUserRecord,
  type AdminUserRole,
  type AdminVendorStatus,
  type ProductModerationStatus,
  type VendorApplication,
  type VendorApplicationStatus,
} from "@/lib/admin-management";

const STORAGE_EVENT = "maket-lakay-admin-management-storage";

function readState(): AdminManagementState {
  if (typeof window === "undefined") return hydrateAdminManagementState();

  return hydrateAdminManagementState(readLocalJson<Partial<AdminManagementState>>(ADMIN_MANAGEMENT_KEY, {}));
}

function writeState(state: AdminManagementState) {
  writeLocalJson(ADMIN_MANAGEMENT_KEY, state, STORAGE_EVENT);
}

async function createRealVendorAccount(application: VendorApplication) {
  if (!application.applicantProfileId) {
    return { ok: false as const, reason: "Application has no linked account to promote." };
  }

  const supabase = createClient();
  const baseSlug = slugify(application.storeSlug || application.businessName || application.id);
  const uniqueSuffix = Math.random().toString(36).slice(2, 8);
  const uniqueSlug = `${baseSlug || "store"}-${uniqueSuffix}`;
  const vendorId = `vendor-local-${baseSlug || uniqueSuffix}-${uniqueSuffix}`;
  const storeId = `store-local-${baseSlug || uniqueSuffix}-${uniqueSuffix}`;

  const { error: vendorError } = await supabase.from("vendors").insert({
    id: vendorId,
    owner_profile_id: application.applicantProfileId,
    name: application.businessName,
    owner_name: application.ownerName,
    email: application.email,
    phone: application.phone,
    city: application.commune || application.city,
    country: "Haiti",
    verification_status: "verified",
  });

  if (vendorError) {
    return { ok: false as const, reason: vendorError.message };
  }

  const { error: storeError } = await supabase.from("stores").insert({
    id: storeId,
    vendor_id: vendorId,
    name: application.businessName,
    slug: uniqueSlug,
    description: application.description,
    city: application.commune || application.city,
    country: "Haiti",
    banner_color: application.brandColor || null,
    verified: true,
  });

  if (storeError) {
    return { ok: false as const, reason: storeError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "vendor" })
    .eq("id", application.applicantProfileId);

  if (profileError) {
    return { ok: false as const, reason: profileError.message };
  }

  return { ok: true as const, vendorId, storeId };
}

/**
 * Best-effort sync of a local admin status decision to the real vendor/store
 * rows. verification_status only has 3 real values (verified/pending/unverified)
 * vs. the 4 local admin states (active/pending/rejected/suspended) - rejected
 * and suspended both collapse to "unverified" real-side, which is an accepted
 * lossy mapping rather than a schema change.
 */
async function updateRealVendorStatus(
  vendorId: string,
  verificationStatus: AdminVendorStatus,
  storeStatus: AdminStoreStatus,
) {
  const supabase = createClient();
  const realVerificationStatus =
    verificationStatus === "active" ? "verified" : verificationStatus === "pending" ? "pending" : "unverified";

  const [vendorResult, storeResult] = await Promise.all([
    supabase.from("vendors").update({ verification_status: realVerificationStatus }).eq("id", vendorId),
    supabase.from("stores").update({ verified: storeStatus === "open" }).eq("vendor_id", vendorId),
  ]);

  if (vendorResult.error || storeResult.error) {
    return { ok: false as const, reason: vendorResult.error?.message ?? storeResult.error?.message };
  }

  return { ok: true as const };
}

export function useAdminManagement() {
  const [state, setState] = React.useState<AdminManagementState>(hydrateAdminManagementState);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setState(readState());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(STORAGE_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(STORAGE_EVENT, refresh);
    };
  }, [refresh]);

  const saveState = React.useCallback((nextState: AdminManagementState) => {
    writeState(nextState);
    setState(nextState);
  }, []);

  const updateVendor = React.useCallback(
    async (
      vendorId: string,
      verificationStatus: AdminVendorStatus,
      storeStatus: AdminStoreStatus,
      message: string,
    ) => {
      const nextState = readState();
      const oldVendorState = nextState.vendors[vendorId];
      nextState.vendors[vendorId] = {
        ...(nextState.vendors[vendorId] ?? {
          verificationStatus: "pending",
          storeStatus: "paused",
          documentReview: "not_started",
        }),
        verificationStatus,
        storeStatus,
      };
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "vendor.status_changed",
        entityType: "vendor",
        entityId: vendorId,
        entityLabel: vendorId,
        summary: message,
        oldValue: oldVendorState
          ? `${oldVendorState.verificationStatus}/${oldVendorState.storeStatus}`
          : "not captured",
        newValue: `${verificationStatus}/${storeStatus}`,
        severity: verificationStatus === "suspended" || verificationStatus === "rejected" ? "warning" : "info",
      });

      const realResult = await updateRealVendorStatus(vendorId, verificationStatus, storeStatus);

      if (!realResult.ok) {
        toast({
          title: "Vendor updated locally, real sync failed",
          description:
            realResult.reason ?? "The status was saved locally but could not be synced to the real vendor account.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Vendor updated", description: message });
      }
    },
    [saveState],
  );

  const reviewVendorDocuments = React.useCallback(
    (vendorId: string) => {
      const nextState = readState();
      const oldReview = nextState.vendors[vendorId]?.documentReview ?? "not_started";
      nextState.vendors[vendorId] = {
        ...(nextState.vendors[vendorId] ?? {
          verificationStatus: "pending",
          storeStatus: "paused",
          documentReview: "not_started",
        }),
        documentReview: "reviewed",
      };
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "vendor.documents_reviewed",
        entityType: "vendor",
        entityId: vendorId,
        entityLabel: vendorId,
        summary: "Vendor documents were marked reviewed.",
        oldValue: oldReview,
        newValue: "reviewed",
        severity: "info",
      });
      toast({
        title: "Documents reviewed",
        description: "Vendor documents were marked reviewed locally.",
      });
    },
    [saveState],
  );

  const submitVendorApplication = React.useCallback(
    (application: Omit<VendorApplication, "id" | "status" | "submittedAt">) => {
      const nextState = readState();
      const normalizedEmail = application.email.toLowerCase();
      const emailExists =
        nextState.vendorApplications.some(
          (currentApplication) =>
            currentApplication.email.toLowerCase() === normalizedEmail &&
            currentApplication.status !== "rejected",
        ) ||
        nextState.users.some((user) => user.email.toLowerCase() === normalizedEmail);

      if (emailExists) {
        toast({
          title: "Application already exists",
          description: `${application.email} is already connected to a vendor or pending application.`,
          variant: "destructive",
        });
        return null;
      }

      const submittedApplication: VendorApplication = {
        ...application,
        id: `vendor-app-${Date.now()}`,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      };

      nextState.vendorApplications = [
        submittedApplication,
        ...nextState.vendorApplications,
      ];
      saveState(nextState);
      addAuditLogEntry({
        actorId: "customer-jean",
        actorName: application.profileDisplayName ?? application.ownerName,
        actorRole: "customer",
        action: "vendor.application_submitted",
        entityType: "vendor_application",
        entityId: submittedApplication.id,
        entityLabel: submittedApplication.businessName,
        summary: "Vendor application submitted for admin review.",
        newValue: "submitted",
        severity: "info",
      });
      toast({
        title: "Vendor application submitted",
        description: "The admin team can now review it in Vendor Management.",
      });
      return submittedApplication;
    },
    [saveState],
  );

  const updateVendorApplicationStatus = React.useCallback(
    async (applicationId: string, status: VendorApplicationStatus, message: string) => {
      const nextState = readState();
      const applicationToUpdate = nextState.vendorApplications.find(
        (application) => application.id === applicationId,
      );
      const oldStatus = applicationToUpdate?.status;
      let realAccountResult: { ok: boolean; reason?: string; vendorId?: string; storeId?: string } | null = null;

      if (status === "approved" && applicationToUpdate && oldStatus !== "approved") {
        realAccountResult = await createRealVendorAccount(applicationToUpdate);
      }

      nextState.vendorApplications = nextState.vendorApplications.map((application) =>
        application.id === applicationId
          ? {
              ...application,
              status,
              approvedVendorId:
                status === "approved"
                  ? application.approvedVendorId ?? realAccountResult?.vendorId ?? getApprovedVendorId(application)
                  : application.approvedVendorId,
              approvedStoreId:
                status === "approved"
                  ? application.approvedStoreId ?? realAccountResult?.storeId ?? getApprovedStoreId(application)
                  : application.approvedStoreId,
              reviewedAt:
                status === "approved" || status === "rejected"
                  ? new Date().toISOString()
                  : application.reviewedAt,
              reviewNote: message,
            }
          : application,
      );

      if (status === "approved" && applicationToUpdate) {
        const vendorId =
          applicationToUpdate.approvedVendorId ??
          realAccountResult?.vendorId ??
          getApprovedVendorId(applicationToUpdate);
        nextState.vendors[vendorId] = {
          verificationStatus: "active",
          storeStatus: "open",
          documentReview: "reviewed",
        };

        if (!nextState.users.some((user) => user.id === `${vendorId}-staff`)) {
          nextState.users = [
            {
              id: `${vendorId}-staff`,
              name: applicationToUpdate.ownerName,
              email: applicationToUpdate.email,
              role: "vendor_staff",
              status: "active",
              registeredAt: new Date().toISOString(),
              location: `${applicationToUpdate.commune || applicationToUpdate.city}, Haiti`,
            },
            ...nextState.users,
          ];
        }
      }

      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "vendor.application_status_changed",
        entityType: "vendor_application",
        entityId: applicationId,
        entityLabel: applicationToUpdate?.businessName ?? applicationId,
        summary: message,
        oldValue: oldStatus,
        newValue: status,
        severity: status === "rejected" ? "warning" : "info",
      });

      if (realAccountResult && !realAccountResult.ok) {
        toast({
          title: "Application approved, vendor account setup failed",
          description:
            realAccountResult.reason ??
            "The application was approved locally, but the real vendor account could not be created.",
          variant: "destructive",
        });
      } else if (realAccountResult?.ok) {
        toast({
          title: "Vendor account created",
          description: `${applicationToUpdate?.businessName} now has a real vendor account and store.`,
        });
      } else {
        toast({ title: "Application updated", description: message });
      }
    },
    [saveState],
  );

  const updateProduct = React.useCallback(
    (productId: string, moderationStatus: ProductModerationStatus, message: string) => {
      const nextState = readState();
      const oldProductState = nextState.products[productId]?.moderationStatus;
      nextState.products[productId] = {
        ...(nextState.products[productId] ?? {
          moderationStatus: "pending",
          submittedAt: new Date().toISOString(),
        }),
        moderationStatus,
      };
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "product.moderation_changed",
        entityType: "product",
        entityId: productId,
        entityLabel: productId,
        summary: message,
        oldValue: oldProductState,
        newValue: moderationStatus,
        severity: moderationStatus === "rejected" || moderationStatus === "suspended" ? "warning" : "info",
      });
      toast({ title: "Product moderation updated", description: message });
    },
    [saveState],
  );

  const updateUserStatus = React.useCallback(
    (userId: string, status: AdminAccountStatus, message: string) => {
      const nextState = readState();
      const oldUser = nextState.users.find((user) => user.id === userId);
      nextState.users = nextState.users.map((user) =>
        user.id === userId ? { ...user, status } : user,
      );
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "user.status_changed",
        entityType: "user",
        entityId: userId,
        entityLabel: oldUser?.name ?? userId,
        summary: message,
        oldValue: oldUser?.status,
        newValue: status,
        severity: status === "suspended" ? "warning" : "info",
      });
      toast({ title: "User updated", description: message });
    },
    [saveState],
  );

  const updateUserRole = React.useCallback(
    (userId: string, role: AdminUserRole) => {
      const nextState = readState();
      const oldUser = nextState.users.find((user) => user.id === userId);
      nextState.users = nextState.users.map((user) =>
        user.id === userId ? { ...user, role } : user,
      );
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "user.role_changed",
        entityType: "user",
        entityId: userId,
        entityLabel: oldUser?.name ?? userId,
        summary: `Role updated to ${role.replaceAll("_", " ")}.`,
        oldValue: oldUser?.role,
        newValue: role,
        severity: "warning",
      });
      toast({
        title: "Role changed",
        description: `Role updated to ${role.replaceAll("_", " ")}.`,
      });
    },
    [saveState],
  );

  const addUser = React.useCallback(
    (user: Omit<AdminUserRecord, "id" | "registeredAt">) => {
      const nextState = readState();
      const emailExists = nextState.users.some(
        (currentUser) => currentUser.email.toLowerCase() === user.email.toLowerCase(),
      );

      if (emailExists) {
        toast({
          title: "Email already exists",
          description: `${user.email} is already in the user list.`,
          variant: "destructive",
        });
        return false;
      }

      const userId = `mock-user-${user.email
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-5)}`;

      nextState.users = [
        {
          ...user,
          id: userId,
          registeredAt: new Date().toISOString(),
        },
        ...nextState.users,
      ];
      saveState(nextState);
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "user.created",
        entityType: "user",
        entityId: userId,
        entityLabel: user.name,
        summary: `${user.name} was added to local admin users.`,
        newValue: `${user.role}/${user.status}`,
        severity: user.role === "admin" ? "critical" : user.role === "support_staff" ? "warning" : "info",
      });
      toast({
        title: "User added",
        description: `${user.name} was added to local admin users.`,
      });
      return true;
    },
    [saveState],
  );

  return {
    addUser,
    isReady,
    reviewVendorDocuments,
    state,
    submitVendorApplication,
    updateProduct,
    updateVendorApplicationStatus,
    updateUserRole,
    updateUserStatus,
    updateVendor,
  };
}
