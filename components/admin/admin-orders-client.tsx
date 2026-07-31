"use client";

import Link from "next/link";
import * as React from "react";
import { AlertTriangle, Eye, RefreshCw, Search, Truck, XCircle } from "lucide-react";

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
import { categories, customers, paymentRecords, products, stores, vendors } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { addAuditLogEntry } from "@/lib/audit-log";
import {
  createCustomerNotification,
  mergeOrders,
  ORDER_STATUS_LABELS,
  updateOrderStatus,
} from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus, PaymentStatus, RefundRecord } from "@/types";

type OrderAction =
  | { type: "cancel"; order: Order }
  | { type: "review"; order: Order }
  | { type: "refund"; order: Order }
  | { type: "delivery"; order: Order; status: OrderStatus };

type DateFilter = "all" | "today" | "7d" | "30d" | "90d" | "2026" | "2025";

const dateOptions: Array<{ label: string; value: DateFilter; days?: number; year?: number }> = [
  { label: "Any order date", value: "all" },
  { label: "Placed today", value: "today" },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Placed in 2026", value: "2026", year: 2026 },
  { label: "Placed in 2025", value: "2025", year: 2025 },
];

const referenceDate = new Date("2026-07-23T12:00:00-04:00");

function getCustomerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? customerId;
}

function getStore(storeId: string) {
  return stores.find((store) => store.id === storeId);
}

function getStoreName(storeId: string) {
  return getStore(storeId)?.name ?? storeId;
}

function getOrderVendorId(order: Order) {
  return getStore(order.storeId)?.vendorId ?? "";
}

function getOrderVendorName(order: Order) {
  const vendorId = getOrderVendorId(order);
  return vendors.find((vendor) => vendor.id === vendorId)?.name ?? getStoreName(order.storeId);
}

function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

function getOrderCategoryIds(order: Order) {
  const itemCategoryIds = order.items
    .map((item) => products.find((product) => product.id === item.productId)?.categoryId)
    .filter(Boolean) as string[];

  if (itemCategoryIds.length) {
    return Array.from(new Set(itemCategoryIds));
  }

  return Array.from(
    new Set(
      products
        .filter((product) => product.storeId === order.storeId)
        .map((product) => product.categoryId),
    ),
  );
}

function getOrderCategoryNames(order: Order) {
  return getOrderCategoryIds(order).map(getCategoryName);
}

function getPaymentStatus(
  orderId: string,
  localPaymentRecords: Array<{ orderId: string; status: PaymentStatus }> = [],
): PaymentStatus | "authorized" {
  return (
    [...localPaymentRecords, ...paymentRecords].find((record) => record.orderId === orderId)
      ?.status ?? "authorized"
  );
}

function getDeliveryStatus(order: Order) {
  if (order.status === "delivered") return "Delivered";
  if (["out_for_delivery", "shipped"].includes(order.status)) return "In transit";
  if (order.status === "ready_for_delivery") return "Ready for pickup";
  if (order.status === "cancelled") return "Cancelled";
  return "Not assigned";
}

function statusVariant(status: string) {
  if (["captured", "authorized", "delivered", "confirmed"].includes(status)) return "success";
  if (["failed", "cancelled", "refunded"].includes(status)) return "destructive";
  return "neutral";
}

function matchesOrderDate(placedAt: string, filter: DateFilter) {
  if (filter === "all") return true;

  const placedDate = new Date(placedAt);
  if (Number.isNaN(placedDate.getTime())) return false;

  if (filter === "today") {
    return placedDate.toDateString() === referenceDate.toDateString();
  }

  const option = dateOptions.find((item) => item.value === filter);

  if (option?.year) {
    return placedDate.getFullYear() === option.year;
  }

  if (!option?.days) return true;

  const threshold = referenceDate.getTime() - option.days * 24 * 60 * 60 * 1000;
  return placedDate.getTime() >= threshold;
}

export function AdminOrdersClient() {
  const {
    isReady: storageReady,
    localOrders,
    localPaymentRecords,
    saveCustomerNotification,
    saveLocalOrder,
    saveRefundRecord,
  } = useMarketplaceStorage();
  const {
    isReady: operationsReady,
    markOrderForReview,
    markRefundIssued,
    state,
  } = useAdminOperations();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [pendingAction, setPendingAction] = React.useState<OrderAction | null>(null);
  const orders = mergeOrders(localOrders);
  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    vendorFilter !== "all" ||
    categoryFilter !== "all" ||
    dateFilter !== "all";

  const filteredOrders = orders.filter((order) => {
    const normalizedQuery = query.toLowerCase();
    const categoryIds = getOrderCategoryIds(order);
    const categoryNames = categoryIds.map(getCategoryName);
    const matchesQuery =
      order.id.toLowerCase().includes(normalizedQuery) ||
      getCustomerName(order.customerId).toLowerCase().includes(normalizedQuery) ||
      getStoreName(order.storeId).toLowerCase().includes(normalizedQuery) ||
      getOrderVendorName(order).toLowerCase().includes(normalizedQuery) ||
      categoryNames.join(" ").toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesVendor = vendorFilter === "all" || getOrderVendorId(order) === vendorFilter;
    const matchesCategory = categoryFilter === "all" || categoryIds.includes(categoryFilter);
    const matchesDate = matchesOrderDate(order.placedAt, dateFilter);
    return matchesQuery && matchesStatus && matchesVendor && matchesCategory && matchesDate;
  });

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setVendorFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
  }

  function issueRefund(order: Order) {
    const payment = [...localPaymentRecords, ...paymentRecords].find(
      (record) => record.orderId === order.id,
    );
    const refundRecord: RefundRecord = {
      id: `refund-admin-${Date.now()}`,
      paymentId: payment?.id ?? `payment-${order.id}`,
      orderId: order.id,
      storeId: order.storeId,
      amount: order.total,
      currency: order.currency,
      status: "processed",
      reason: "Admin simulated refund from order management.",
      createdAt: new Date().toISOString(),
    };

    saveRefundRecord(refundRecord);
    markRefundIssued(order.id);
    toast({
      title: "Simulated refund issued",
      description: `${formatCurrency(order.total, order.currency)} refund recorded for ${order.id}.`,
    });
  }

  function confirmAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "review") {
      markOrderForReview(pendingAction.order.id);
    }

    if (pendingAction.type === "cancel") {
      const nextOrder = updateOrderStatus(pendingAction.order, "cancelled");
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "cancelled"));
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "order.cancelled",
        entityType: "order",
        entityId: pendingAction.order.id,
        entityLabel: pendingAction.order.id,
        summary: "Admin cancelled the order.",
        oldValue: pendingAction.order.status,
        newValue: "cancelled",
        severity: "critical",
      });
      toast({
        title: "Order cancelled",
        description: `${pendingAction.order.id} was cancelled locally.`,
      });
    }

    if (pendingAction.type === "refund") {
      issueRefund(pendingAction.order);
    }

    if (pendingAction.type === "delivery") {
      const nextOrder = updateOrderStatus(pendingAction.order, pendingAction.status);
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, pendingAction.status));
      addAuditLogEntry({
        actorId: "admin-ops",
        actorName: "Maket Admin",
        actorRole: "admin",
        action: "order.delivery_status_changed",
        entityType: "order",
        entityId: pendingAction.order.id,
        entityLabel: pendingAction.order.id,
        summary: "Admin updated order delivery status.",
        oldValue: pendingAction.order.status,
        newValue: pendingAction.status,
        severity: pendingAction.status === "delivered" ? "info" : "warning",
      });
      toast({
        title: "Delivery status updated",
        description: `${pendingAction.order.id} is now ${ORDER_STATUS_LABELS[pendingAction.status]}.`,
      });
    }

    setPendingAction(null);
  }

  function renderOrderActions(order: Order) {
    return (
      <>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/orders/${order.id}`}>
            <Eye className="size-4" />
            Details
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ type: "review", order })}
        >
          <AlertTriangle className="size-4" />
          Review
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ type: "refund", order })}
        >
          <RefreshCw className="size-4" />
          Refund
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setPendingAction({
              type: "delivery",
              order,
              status:
                order.status === "ready_for_delivery"
                  ? "out_for_delivery"
                  : order.status === "out_for_delivery"
                    ? "delivered"
                    : "ready_for_delivery",
            })
          }
        >
          <Truck className="size-4" />
          Delivery
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ type: "cancel", order })}
        >
          <XCircle className="size-4" />
          Cancel
        </Button>
      </>
    );
  }

  if (!storageReady || !operationsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Order Management
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">Admin orders</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track marketplace orders, payment state, delivery state, reviews, and simulated refunds.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_200px_220px_190px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search orders..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter orders by status"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready_for_delivery">Ready for delivery</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            aria-label="Filter orders by vendor"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
          >
            <option value="all">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter orders by category"
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
            aria-label="Filter orders by order date"
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as DateFilter)}
          >
            {dateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {filteredOrders.length} orders shown
          </p>
          <Button type="button" variant="outline" size="sm" disabled={!hasActiveFilters} onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Orders", orders.length],
          ["Review queue", Object.values(state.orderFlags).filter((flag) => flag.markedForReview).length],
          ["Refunds issued", Object.values(state.orderFlags).filter((flag) => flag.refundIssued).length],
          ["In delivery", orders.filter((order) => ["ready_for_delivery", "out_for_delivery"].includes(order.status)).length],
        ].map(([label, value]) => (
          <div key={label} className="border bg-white p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="border bg-white p-5">
        <ResponsiveDataView
          items={filteredOrders}
          getKey={(order) => order.id}
          cardTitle={(order) => order.id}
          cardDescription={(order) => `${getCustomerName(order.customerId)} - ${getOrderVendorName(order)}`}
          cardMeta={(order) => (
            <Badge variant={statusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          )}
          cardFields={(order) => [
            { label: "Vendor", value: getOrderVendorName(order) },
            { label: "Category", value: getOrderCategoryNames(order).join(", ") || "Uncategorized" },
            { label: "Total", value: formatCurrency(order.total, order.currency) },
            {
              label: "Payment",
              value: (
                <Badge variant={statusVariant(getPaymentStatus(order.id, localPaymentRecords))}>
                  {getPaymentStatus(order.id, localPaymentRecords)}
                </Badge>
              ),
            },
            { label: "Delivery", value: getDeliveryStatus(order) },
            { label: "Order date", value: formatDate(order.placedAt) },
          ]}
          cardActions={renderOrderActions}
          emptyState={
            <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No orders match the current search and filters.
            </div>
          }
          table={
          <table className="responsive-table min-w-[1320px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Order number</th>
                <th className="py-3 font-medium">Customer</th>
                <th className="py-3 font-medium">Vendors</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Order total</th>
                <th className="py-3 font-medium">Payment</th>
                <th className="py-3 font-medium">Order status</th>
                <th className="py-3 font-medium">Delivery</th>
                <th className="py-3 font-medium">Order date</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const flagged = state.orderFlags[order.id];
                return (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3">
                      <p className="font-black">{order.id}</p>
                      {flagged?.markedForReview ? (
                        <Badge variant="destructive" className="mt-1">review</Badge>
                      ) : null}
                    </td>
                    <td className="py-3">{getCustomerName(order.customerId)}</td>
                    <td className="py-3">
                      <p className="font-semibold">{getOrderVendorName(order)}</p>
                      <p className="text-xs text-muted-foreground">{getStoreName(order.storeId)}</p>
                    </td>
                    <td className="py-3">{getOrderCategoryNames(order).join(", ") || "Uncategorized"}</td>
                    <td className="py-3 font-black">{formatCurrency(order.total, order.currency)}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(getPaymentStatus(order.id, localPaymentRecords))}>
                        {getPaymentStatus(order.id, localPaymentRecords)}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={statusVariant(order.status)}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="py-3">{getDeliveryStatus(order)}</td>
                    <td className="py-3">{formatDate(order.placedAt)}</td>
                    <td className="py-3">
                      <div className="dashboard-action-row">
                        {renderOrderActions(order)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          }
        />
      </section>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Confirm admin order action</DialogTitle>
            <DialogDescription>This updates local order data only.</DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">
            {pendingAction?.type === "cancel"
              ? `Cancel ${pendingAction.order.id}?`
              : pendingAction?.type === "refund"
                ? `Issue a simulated refund for ${pendingAction.order.id}?`
                : pendingAction?.type === "delivery"
                  ? `Update ${pendingAction.order.id} to ${ORDER_STATUS_LABELS[pendingAction.status]}?`
                  : `Mark ${pendingAction?.order.id} for review?`}
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
    </div>
  );
}
