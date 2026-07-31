import { AdminDashboardLayout } from "@/components/layout/admin-dashboard-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>;
}
