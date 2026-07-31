import {
  BarChart3,
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  HandCoins,
  Home,
  LayoutDashboard,
  Megaphone,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ScrollText,
  Store,
  Truck,
  Users,
} from "lucide-react";

export const marketplaceNav = [
  { label: "Home", href: "/" },
  { label: "Categories", href: "/categories" },
  { label: "Stores", href: "/stores" },
  { label: "Reviews", href: "/reviews" },
  { label: "Sell", href: "/sell" },
  { label: "Support", href: "/support" },
  { label: "Demo", href: "/demo" },
];

export const mobileNav = [
  { label: "Home", href: "/", icon: Home },
  { label: "Sell", href: "/sell", icon: Store },
  { label: "Orders", href: "/orders", icon: ReceiptText },
  { label: "Account", href: "/account", icon: Users },
];

export const vendorNav = [
  { label: "Overview", href: "/vendor", icon: LayoutDashboard },
  { label: "Products", href: "/vendor/products", icon: Package },
  { label: "Inventory", href: "/vendor/inventory", icon: Boxes },
  { label: "Orders", href: "/vendor/orders", icon: ReceiptText },
  { label: "Disputes", href: "/vendor/disputes", icon: AlertTriangle },
  { label: "Promotions", href: "/vendor/promotions", icon: Megaphone },
  { label: "Earnings", href: "/vendor/earnings", icon: CircleDollarSign },
  { label: "Payout Requests", href: "/vendor/payout-requests", icon: HandCoins },
  { label: "Store Settings", href: "/vendor/settings", icon: Settings },
];

export const adminNav = [
  { label: "Overview", href: "/admin", icon: BarChart3 },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ReceiptText },
  { label: "Commissions", href: "/admin/commissions", icon: CircleDollarSign },
  { label: "Payout Requests", href: "/admin/payouts", icon: HandCoins },
  { label: "Delivery Zones", href: "/admin/delivery", icon: Truck },
  { label: "Refunds and Disputes", href: "/admin/support", icon: ShieldCheck },
  { label: "Escalations", href: "/admin/escalations", icon: AlertTriangle },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Permissions", href: "/admin/permissions", icon: ShieldCheck },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
  { label: "Reports and Analytics", href: "/admin/analytics", icon: ClipboardList },
];

export const supportNav = [
  { label: "Support Queue", href: "/admin/support", icon: ShieldCheck },
  { label: "Orders", href: "/admin/orders", icon: ReceiptText },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Products", href: "/admin/products", icon: Package },
];
