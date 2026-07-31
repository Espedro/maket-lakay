"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { vendorNav } from "@/lib/navigation";

interface VendorDashboardLayoutProps {
  children: React.ReactNode;
}

export function VendorDashboardLayout({ children }: VendorDashboardLayoutProps) {
  return (
    <DashboardShell
      title="Vendor Dashboard"
      eyebrow="Vendor"
      navItems={vendorNav}
      requiredRole="vendor"
    >
      {children}
    </DashboardShell>
  );
}
