import { customers, stores, vendors } from "@/data/mock-data";
import {
  ADMIN_MANAGEMENT_KEY,
  getApprovedStoreId,
  getApprovedVendorId,
  hydrateAdminManagementState,
} from "@/lib/admin-management";
import { readLocalJson } from "@/lib/local-storage";

export const MOCK_SESSION_KEY = "maket-lakay-mock-session";
export const MOCK_SESSION_EVENT = "maket-lakay-mock-session-storage";

export type MockRole = "customer" | "vendor" | "admin" | "support";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: MockRole;
  roleLabel: string;
  description: string;
  homeHref: string;
  profileHref: string;
  adminUserId?: string;
  customerId?: string;
  storeId?: string;
  vendorId?: string;
}

export interface MockSession {
  userId: string;
  role: MockRole;
}

const activeCustomer = customers[0];
const activeVendor = vendors[0];
const activeVendorStore = stores.find((store) => store.vendorId === activeVendor?.id) ?? stores[0];

export const defaultMockUsers: MockUser[] = [
  {
    id: activeCustomer?.id ?? "customer-jean",
    name: activeCustomer?.name ?? "Jean Baptiste",
    email: activeCustomer?.email ?? "jean@example.com",
    role: "customer",
    roleLabel: "Customer",
    description: "Shop, checkout, track orders, manage account.",
    homeHref: "/",
    profileHref: "/account",
    customerId: activeCustomer?.id ?? "customer-jean",
  },
  {
    id: activeVendor?.id ?? "vendor-bel-lakay",
    name: activeVendor?.ownerName ?? "Nadine Joseph",
    email: activeVendor?.email ?? "nadine@bellakay.example",
    role: "vendor",
    roleLabel: "Vendor",
    description: "Manage store, products, orders, earnings.",
    homeHref: "/vendor",
    profileHref: "/vendor/settings",
    storeId: activeVendorStore?.id ?? "store-bel-lakay",
    vendorId: activeVendor?.id ?? "vendor-bel-lakay",
  },
  {
    id: "admin-ops",
    name: "Maket Admin",
    email: "admin@maketlakay.example",
    role: "admin",
    roleLabel: "Admin",
    description: "Review vendors, orders, users, reports.",
    homeHref: "/admin",
    profileHref: "/admin/users",
    adminUserId: "admin-ops",
  },
  {
    id: "support-roseline",
    name: "Roseline Admin",
    email: "support@maketlakay.example",
    role: "support",
    roleLabel: "Support Staff",
    description: "Handle tickets, disputes, reports, and customer support follow-up.",
    homeHref: "/admin/support",
    profileHref: "/admin/support",
    adminUserId: "support-roseline",
  },
];

export const defaultMockSession: MockSession = {
  userId: defaultMockUsers[0].id,
  role: "customer",
};

function toRoleLabel(role: MockRole) {
  if (role === "vendor") return "Vendor";
  if (role === "admin") return "Admin";
  if (role === "support") return "Support Staff";
  return "Customer";
}

function buildApprovedVendorUsers(): MockUser[] {
  const state = hydrateAdminManagementState(
    readLocalJson(ADMIN_MANAGEMENT_KEY, {}),
  );

  return state.vendorApplications
    .filter((application) => application.status === "approved")
    .map((application) => ({
      id: getApprovedVendorId(application),
      name: application.ownerName,
      email: application.email,
      role: "vendor" as const,
      roleLabel: "Vendor",
      description: `Manage ${application.businessName}.`,
      homeHref: "/vendor",
      profileHref: "/vendor/settings",
      storeId: getApprovedStoreId(application),
      vendorId: getApprovedVendorId(application),
    }));
}

export function getMockUsers() {
  const merged = new Map<string, MockUser>();

  defaultMockUsers.forEach((user) => merged.set(user.id, user));
  buildApprovedVendorUsers().forEach((user) => merged.set(user.id, user));

  return Array.from(merged.values());
}

export function getMockSessionUser(session: MockSession, users = getMockUsers()) {
  return (
    users.find((user) => user.id === session.userId && user.role === session.role) ??
    users.find((user) => user.role === session.role) ??
    defaultMockUsers[0]
  );
}

export function getRoleHomeHref(role: MockRole) {
  return defaultMockUsers.find((user) => user.role === role)?.homeHref ?? "/";
}

export function getRoleLabel(role: MockRole) {
  return toRoleLabel(role);
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
