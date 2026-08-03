"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/auth-roles";
import { adminNav, supportNav } from "@/lib/navigation";
import { usePathname } from "next/navigation";

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

const supportAccessibleRoutes = ["/admin/support", "/admin/orders", "/admin/vendors", "/admin/products"];

function getRequiredRoles(pathname: string): AppRole[] {
  const supportCanAccess = supportAccessibleRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return supportCanAccess ? ["admin", "support"] : ["admin"];
}

export function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const requiredRoles = getRequiredRoles(pathname);
  const isSupportContext = user?.role === "support" && requiredRoles.includes("support");

  return (
    <DashboardShell
      title={isSupportContext ? "Support Dashboard" : "Admin Dashboard"}
      eyebrow={isSupportContext ? "Support" : "Admin"}
      navItems={isSupportContext ? supportNav : adminNav}
      requiredRole={requiredRoles}
    >
      {children}
    </DashboardShell>
  );
}
