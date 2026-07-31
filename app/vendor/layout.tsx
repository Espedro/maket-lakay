import { VendorDashboardLayout } from "@/components/layout/vendor-dashboard-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <VendorDashboardLayout>{children}</VendorDashboardLayout>;
}
