"use client";

import * as React from "react";
import {
  ClipboardList,
  PackageCheck,
  Search,
  Truck,
} from "lucide-react";

import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { customerAddresses, deliveryZones, paymentRecords, stores } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import {
  createCustomerNotification,
  createDeliveryAssignment,
  mergeAssignments,
  mergeOrders,
  updateAssignmentStatus,
  updateOrderStatus,
} from "@/lib/orders";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRealOrdersByStore, updateRealOrderStatus } from "@/services/orders";
import type { Order, OrderStatus, PaymentRecord, Store } from "@/types";

type OrderFilter = OrderStatus | "all";

function getStoreName(storeId: string, sourceStores: Store[] = stores) {
  return sourceStores.find((store) => store.id === storeId)?.name ?? "Marketplace store";
}

function getCustomer(order: Order) {
  return (
    customerAddresses.find(
      (address) => address.customerId === order.customerId && address.city === order.deliveryCity,
    )?.recipientName ?? order.customerId
  );
}

function getPaymentStatus(order: Order, localPaymentRecords: PaymentRecord[] = []) {
  return (
    [...localPaymentRecords, ...paymentRecords].find((payment) => payment.orderId === order.id)
      ?.status ?? "authorized"
  );
}

function getDeliveryStatus(order: Order) {
  if (order.status === "delivered") return "Delivered";
  if (order.status === "out_for_delivery") return "Out for delivery";
  if (order.deliveryAssignmentId) return "Assigned";
  return "Unassigned";
}

function matchesOrder(order: Order, query: string, sourceStores: Store[]) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return [
    order.id,
    getStoreName(order.storeId, sourceStores),
    getCustomer(order),
    order.deliveryCity,
    order.trackingNumber,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function VendorOrdersClient() {
  const {
    isReady,
    localAssignments,
    localOrders,
    localPaymentRecords,
    saveCustomerNotification,
    saveDeliveryAssignment,
    saveLocalOrder,
  } = useMarketplaceStorage();
  const { isReady: scopeReady, scopedStoreIds, scopedStores } = useVendorScope();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<OrderFilter>("all");
  const [storeFilter, setStoreFilter] = React.useState("all");
  const [realOrders, setRealOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    if (!scopeReady || scopedStoreIds.size === 0) {
      setRealOrders([]);
      return;
    }

    let active = true;

    Promise.all(Array.from(scopedStoreIds).map((storeId) => getRealOrdersByStore(storeId))).then(
      (results) => {
        if (active) setRealOrders(results.flat());
      },
    );

    return () => {
      active = false;
    };
  }, [scopeReady, scopedStoreIds]);

  const orders = React.useMemo(() => {
    const merged = new Map<string, Order>();
    mergeOrders(localOrders).forEach((order) => merged.set(order.id, order));
    realOrders.forEach((order) => merged.set(order.id, order));
    return Array.from(merged.values()).filter((order) => scopedStoreIds.has(order.storeId));
  }, [localOrders, realOrders, scopedStoreIds]);
  const assignments = mergeAssignments(localAssignments);
  const filteredOrders = orders.filter(
    (order) =>
      matchesOrder(order, query, scopedStores) &&
      (filter === "all" || order.status === filter) &&
      (storeFilter === "all" || order.storeId === storeFilter),
  );
  const pendingOrders = orders.filter((order) =>
    ["pending", "confirmed", "processing"].includes(order.status),
  ).length;
  const assignedOrders = orders.filter((order) => order.deliveryAssignmentId).length;

  React.useEffect(() => {
    if (storeFilter !== "all" && !scopedStores.some((store) => store.id === storeFilter)) {
      setStoreFilter("all");
    }
  }, [scopedStores, storeFilter]);

  async function saveStatus(order: Order, status: OrderStatus) {
    let nextOrder = updateOrderStatus(order, status);

    if (status === "ready_for_delivery" && !order.deliveryAssignmentId) {
      const zone =
        deliveryZones.find((item) => item.id === order.deliveryZoneId) ?? deliveryZones[0];
      const assignment = createDeliveryAssignment(order, zone, "Maket Lakay Courier");
      saveDeliveryAssignment(assignment);
      nextOrder = {
        ...nextOrder,
        deliveryAssignmentId: assignment.id,
        deliveryZoneId: zone.id,
      };
    }

    if (status === "out_for_delivery") {
      const assignment = assignments.find((item) => item.id === order.deliveryAssignmentId);
      if (assignment) {
        saveDeliveryAssignment(updateAssignmentStatus(assignment, "in_transit"));
      }
    }

    saveLocalOrder(nextOrder);
    saveCustomerNotification(createCustomerNotification(nextOrder, status));
    const realResult = await updateRealOrderStatus(order.id, status);

    if (!realResult.ok) {
      toast({
        title: "Order updated locally only",
        description: realResult.reason,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Order updated",
      description: `${order.id} moved to ${status.replaceAll("_", " ")}.`,
    });
  }

  if (!isReady || !scopeReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Vendor Orders
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Order management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Search, filter, inspect, and update vendor orders without touching a backend.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={ClipboardList} label="Total orders" value={orders.length} />
        <MetricCard icon={PackageCheck} label="Pending orders" value={pendingOrders} />
        <MetricCard icon={Truck} label="Delivery assigned" value={assignedOrders} />
      </div>

      <section className="border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9 shadow-none"
              placeholder="Search orders, customers, stores, tracking"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={filter}
            onChange={(event) => setFilter(event.target.value as OrderFilter)}
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
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={storeFilter}
            onChange={(event) => setStoreFilter(event.target.value)}
          >
            <option value="all">All stores</option>
            {scopedStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden border bg-white">
        <div className="responsive-table-wrap">
          <table className="responsive-table min-w-[1120px]">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3 font-medium">Order number</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Order date</th>
                <th className="p-3 font-medium">Products</th>
                <th className="p-3 font-medium">Amount</th>
                <th className="p-3 font-medium">Payment</th>
                <th className="p-3 font-medium">Order status</th>
                <th className="p-3 font-medium">Delivery</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b align-top last:border-0">
                  <td className="p-3 font-black">{order.id}</td>
                  <td className="p-3">
                    <p className="font-semibold">{getCustomer(order)}</p>
                    <p className="text-xs text-muted-foreground">{order.deliveryCity}</p>
                  </td>
                  <td className="p-3">{formatDate(order.placedAt)}</td>
                  <td className="p-3">
                    <p className="font-semibold">{order.items.length} product line</p>
                    <p className="text-xs text-muted-foreground">{order.items[0]?.productName}</p>
                  </td>
                  <td className="p-3 font-black">{formatCurrency(order.total, order.currency)}</td>
                  <td className="p-3">
                    <Badge variant={getPaymentStatus(order, localPaymentRecords) === "failed" ? "destructive" : "success"}>
                      {getPaymentStatus(order, localPaymentRecords).replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="p-3">{getDeliveryStatus(order)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <OrderDetailsDialog
                        order={order}
                        paymentStatus={getPaymentStatus(order, localPaymentRecords)}
                        storeName={getStoreName(order.storeId, scopedStores)}
                      />
                      <select
                        className="h-9 border bg-white px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={order.status}
                        onChange={(event) => saveStatus(order, event.target.value as OrderStatus)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="ready_for_delivery">Ready for delivery</option>
                        <option value="out_for_delivery">Out for delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-black">{value}</p>
        </div>
        <Icon className="size-8 text-primary" />
      </CardContent>
    </Card>
  );
}

function OrderDetailsDialog({
  order,
  paymentStatus,
  storeName,
}: {
  order: Order;
  paymentStatus: PaymentRecord["status"] | "authorized";
  storeName: string;
}) {
  const assignment = order.deliveryAssignmentId ? "Assigned" : "Unassigned";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{order.id}</DialogTitle>
          <DialogDescription>
            Order details drawer for vendor fulfillment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="grid gap-2 border p-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-black">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty {item.quantity} - {formatCurrency(item.unitPrice, order.currency)} each
                  </p>
                </div>
                <p className="font-black">{formatCurrency(item.quantity * item.unitPrice, order.currency)}</p>
              </div>
            ))}
          </div>
          <dl className="space-y-3 border bg-muted/20 p-4 text-sm">
            <InfoRow label="Customer" value={getCustomer(order)} />
            <InfoRow label="Store" value={storeName} />
            <InfoRow label="Payment" value={paymentStatus.replaceAll("_", " ")} />
            <InfoRow label="Delivery" value={assignment} />
            <InfoRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
            <InfoRow label="Delivery fee" value={formatCurrency(order.deliveryFee, order.currency)} />
            <InfoRow label="Total" value={formatCurrency(order.total, order.currency)} />
          </dl>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
