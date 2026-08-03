export type AppRole = "customer" | "vendor" | "admin" | "support";

export function getRoleLabel(role: AppRole) {
  if (role === "vendor") return "Vendor";
  if (role === "admin") return "Admin";
  if (role === "support") return "Support Staff";
  return "Customer";
}

export function getRoleHomeHref(role: AppRole) {
  if (role === "vendor") return "/vendor";
  if (role === "admin" || role === "support") return "/admin";
  return "/";
}

export function getRoleProfileHref(role: AppRole) {
  if (role === "vendor") return "/vendor/settings";
  if (role === "admin" || role === "support") return "/admin/users";
  return "/account";
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
