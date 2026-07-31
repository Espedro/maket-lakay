"use client";

import Link from "next/link";
import * as React from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock,
  Copy,
  LifeBuoy,
  MapPin,
  Package,
  Printer,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { EmptyState } from "@/components/marketplace/empty-state";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { customerAddresses, deliveryZones, stores } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import {
  createCustomerNotification,
  createDeliveryAssignment,
  createProofOfDelivery,
  getOrderTrackingEvents,
  mergeAssignments,
  mergeOrders,
  updateAssignmentStatus,
  updateOrderStatus,
} from "@/lib/orders";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { DeliveryAssignment, Order, TrackingEvent } from "@/types";

interface MockOrderTrackingClientProps {
  orderNumber: string;
}

const trackingSteps = [
  {
    key: "payment_confirmed",
    label: "Payment Confirmed",
    description: "The simulated checkout payment is authorized.",
  },
  {
    key: "processing",
    label: "Processing",
    description: "The vendor is preparing the order.",
  },
  {
    key: "ready_for_pickup",
    label: "Ready for Pickup",
    description: "The package is packed and ready for a courier.",
  },
  {
    key: "assigned_for_delivery",
    label: "Assigned for Delivery",
    description: "A courier has been assigned.",
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
    description: "The courier is on the way.",
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "The order has proof of delivery.",
  },
];

function getStore(order: Order) {
  return stores.find((store) => store.id === order.storeId);
}

function getOrderAddress(order: Order) {
  return customerAddresses.find(
    (address) => address.customerId === order.customerId && address.city === order.deliveryCity,
  );
}

function getRecipientName(order: Order) {
  return getOrderAddress(order)?.recipientName ?? "Customer";
}

function getOrderProgressIndex(order: Order, assignment?: DeliveryAssignment) {
  if (order.status === "delivered") return 5;
  if (order.status === "out_for_delivery" || assignment?.status === "in_transit") return 4;
  if (assignment) return 3;
  if (order.status === "ready_for_delivery") return 2;
  if (order.status === "processing") return 1;
  if (order.status === "confirmed") return 0;
  return -1;
}

function getCurrentTrackingLabel(progressIndex: number) {
  if (progressIndex < 0) {
    return "Awaiting payment confirmation";
  }

  return trackingSteps[Math.min(progressIndex, trackingSteps.length - 1)].label;
}

function getAdvanceLabel(progressIndex: number) {
  if (progressIndex < 0) return "Confirm payment";
  if (progressIndex === 0) return "Simulate processing";
  if (progressIndex === 1) return "Mark ready for pickup";
  if (progressIndex === 2) return "Assign delivery";
  if (progressIndex === 3) return "Send out for delivery";
  if (progressIndex === 4) return "Mark delivered";
  return "Tracking complete";
}

function getDeliveryMethod(snapshotMethod?: string) {
  return snapshotMethod ?? "Standard Delivery";
}

function getGroupedEvents(orders: Order[]) {
  const events = new Map<string, TrackingEvent>();

  orders.flatMap(getOrderTrackingEvents).forEach((event) => events.set(event.id, event));

  return Array.from(events.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function MockOrderTrackingClient({ orderNumber }: MockOrderTrackingClientProps) {
  const {
    getOrderSnapshot,
    isReady,
    localAssignments,
    localOrders,
    saveCustomerNotification,
    saveDeliveryAssignment,
    saveLocalOrder,
    saveProofOfDelivery,
  } = useMarketplaceStorage();
  const [openVendors, setOpenVendors] = React.useState<Record<string, boolean>>({});
  const decodedOrderNumber = decodeURIComponent(orderNumber);
  const orders = mergeOrders(localOrders);
  const orderGroup = orders.filter(
    (order) =>
      order.id === decodedOrderNumber ||
      order.id.startsWith(`${decodedOrderNumber}-`) ||
      order.trackingNumber === decodedOrderNumber,
  );
  const primaryOrder = orderGroup[0];
  const assignments = mergeAssignments(localAssignments);
  const snapshot = getOrderSnapshot();
  const matchingSnapshot =
    snapshot && orderGroup.some((order) => order.id === snapshot.id || order.id.startsWith(`${snapshot.id}-`))
      ? snapshot
      : null;

  React.useEffect(() => {
    if (!orderGroup.length) return;

    setOpenVendors((current) => {
      if (Object.keys(current).length) return current;

      return Object.fromEntries(orderGroup.map((order) => [order.id, true]));
    });
  }, [orderGroup]);

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  if (!primaryOrder) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Package}
          title="Tracking not found"
          description="This tracking number could not be found in local order data."
        />
        <Button asChild>
          <Link href="/orders">View orders</Link>
        </Button>
      </div>
    );
  }

  const primaryAssignment = assignments.find(
    (assignment) => assignment.id === primaryOrder.deliveryAssignmentId,
  );
  const progressIndex = Math.min(
    ...orderGroup.map((order) =>
      getOrderProgressIndex(
        order,
        assignments.find((assignment) => assignment.id === order.deliveryAssignmentId),
      ),
    ),
  );
  const address = matchingSnapshot?.deliveryAddress ?? getOrderAddress(primaryOrder);
  const events = getGroupedEvents(orderGroup);
  const estimatedDeliveryDates = orderGroup
    .map((order) => order.estimatedDeliveryAt)
    .filter(Boolean) as string[];
  const estimatedDelivery =
    estimatedDeliveryDates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )[0] ?? primaryOrder.estimatedDeliveryAt;
  const totals = orderGroup.reduce(
    (sum, order) => ({
      subtotal: sum.subtotal + order.subtotal,
      deliveryFee: sum.deliveryFee + order.deliveryFee,
      total: sum.total + order.total,
    }),
    { subtotal: 0, deliveryFee: 0, total: 0 },
  );

  function ensureAssignment(order: Order) {
    const existing = assignments.find((assignment) => assignment.id === order.deliveryAssignmentId);

    if (existing) {
      return existing;
    }

    const zone =
      deliveryZones.find((item) => item.id === order.deliveryZoneId) ?? deliveryZones[0];
    const assignment = createDeliveryAssignment(order, zone, "Maket Lakay Courier");
    const readyOrder =
      order.status === "ready_for_delivery"
        ? order
        : updateOrderStatus(order, "ready_for_delivery");

    saveDeliveryAssignment(assignment);
    saveLocalOrder({
      ...readyOrder,
      deliveryAssignmentId: assignment.id,
      deliveryZoneId: zone.id,
    });
    saveCustomerNotification(createCustomerNotification(readyOrder, readyOrder.status));

    return assignment;
  }

  function advanceOrder(order: Order) {
    const assignment = assignments.find((item) => item.id === order.deliveryAssignmentId);
    const orderProgress = getOrderProgressIndex(order, assignment);

    if (order.status === "pending" || orderProgress < 0) {
      const nextOrder = updateOrderStatus(order, "confirmed");
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "confirmed"));
      return;
    }

    if (order.status === "confirmed") {
      const nextOrder = updateOrderStatus(order, "processing");
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "processing"));
      return;
    }

    if (order.status === "processing") {
      const nextOrder = updateOrderStatus(order, "ready_for_delivery");
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "ready_for_delivery"));
      return;
    }

    if (order.status === "ready_for_delivery" && !assignment) {
      ensureAssignment(order);
      return;
    }

    if (order.status === "ready_for_delivery") {
      const nextAssignment = assignment
        ? updateAssignmentStatus(assignment, "in_transit")
        : updateAssignmentStatus(ensureAssignment(order), "in_transit");
      const nextOrder = updateOrderStatus(order, "out_for_delivery");
      saveDeliveryAssignment(nextAssignment);
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "out_for_delivery"));
      return;
    }

    if (order.status === "out_for_delivery") {
      const deliveryAssignment = assignment ?? ensureAssignment(order);
      const completedAssignment = updateAssignmentStatus(deliveryAssignment, "completed");
      const proof = createProofOfDelivery(order, completedAssignment, getRecipientName(order));
      const nextOrder = {
        ...updateOrderStatus(order, "delivered"),
        proofOfDeliveryId: proof.id,
      };

      saveDeliveryAssignment(completedAssignment);
      saveProofOfDelivery(proof);
      saveLocalOrder(nextOrder);
      saveCustomerNotification(createCustomerNotification(nextOrder, "delivered"));
    }
  }

  function simulateProgress() {
    if (progressIndex >= trackingSteps.length - 1) {
      toast({
        title: "Tracking complete",
        description: `${decodedOrderNumber} is already marked delivered.`,
      });
      return;
    }

    orderGroup.forEach(advanceOrder);
    toast({
      title: "Tracking updated",
      description: `${decodedOrderNumber} moved to the next simulated tracking step.`,
    });
  }

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(decodedOrderNumber);
      toast({
        title: "Order number copied",
        description: `${decodedOrderNumber} is ready to paste.`,
      });
    } catch {
      toast({
        title: "Copy unavailable",
        description: "Your browser blocked clipboard access for this action.",
        variant: "destructive",
      });
    }
  }

  function mockPrintSummary() {
    toast({
      title: "Summary prepared",
      description: "Print summary action completed. No file was generated.",
    });
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/orders">
          <ChevronLeftIcon />
          Back to orders
        </Link>
      </Button>

      <section className="border bg-white p-5">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Tracking</Badge>
              <StatusBadge status={primaryOrder.status} />
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-normal">
              Order {decodedOrderNumber}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Placed {formatDate(primaryOrder.placedAt)} - Current status:{" "}
              <span className="font-bold text-foreground">
                {getCurrentTrackingLabel(progressIndex)}
              </span>
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
            <Button onClick={copyOrderNumber} variant="outline">
              <Copy className="size-4" />
              Copy order number
            </Button>
            <Button onClick={mockPrintSummary} variant="outline">
              <Printer className="size-4" />
              Print summary
            </Button>
            <Button onClick={simulateProgress} className="sm:col-span-2" disabled={progressIndex >= 5}>
              <RotateCcw className="size-4" />
              {getAdvanceLabel(progressIndex)}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 border bg-white p-4 lg:grid-cols-6">
        {trackingSteps.map((step, index) => {
          const complete = progressIndex >= index;
          const active = progressIndex === index;

          return (
            <div
              key={step.key}
              className={cn(
                "border p-3",
                active && "border-primary bg-primary/5",
                complete && !active && "border-accent bg-accent/10",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center border bg-white text-sm font-black",
                  complete && "border-accent bg-accent text-accent-foreground",
                )}
              >
                {complete ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
              <p className="mt-3 text-sm font-black">{step.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="border bg-white p-5">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <h2 className="text-xl font-black">Progress timeline</h2>
            </div>
            <div className="mt-5 space-y-3">
              {events.length ? (
                events.map((event) => (
                  <div key={event.id} className="grid gap-3 border p-3 sm:grid-cols-[150px_1fr]">
                    <p className="text-sm font-bold">{formatDate(event.createdAt)}</p>
                    <div>
                      <p className="font-black">{event.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {event.description}
                      </p>
                      <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
                        <MapPin className="size-3" />
                        {event.location}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Delivery updates appear here as the order progresses.
                </p>
              )}
            </div>
          </section>

          <section className="border bg-white p-5">
            <div className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <h2 className="text-xl font-black">Vendor order breakdown</h2>
            </div>
            <div className="mt-5 divide-y border">
              {orderGroup.map((order) => {
                const store = getStore(order);
                const open = openVendors[order.id] ?? true;
                const vendorAssignment = assignments.find(
                  (assignment) => assignment.id === order.deliveryAssignmentId,
                );

                return (
                  <article key={order.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenVendors((current) => ({
                          ...current,
                          [order.id]: !(current[order.id] ?? true),
                        }))
                      }
                      className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
                    >
                      <span>
                        <span className="block font-black">
                          {store?.name ?? "Marketplace vendor"}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          Vendor order {order.id} - {order.items.length} product group
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </span>
                    </button>
                    {open ? (
                      <div className="border-t bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <BreakdownTile label="Vendor city" value={store?.city ?? order.deliveryCity} />
                          <BreakdownTile
                            label="Delivery assignment"
                            value={vendorAssignment?.courierName ?? "Not assigned yet"}
                          />
                          <BreakdownTile
                            label="Vendor total"
                            value={formatCurrency(order.total, order.currency)}
                          />
                        </div>
                        <div className="mt-4 divide-y border">
                          {order.items.map((item) => (
                            <div key={item.productId} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
                              <div>
                                <p className="font-bold">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Qty {item.quantity} - {formatCurrency(item.unitPrice, order.currency)} each
                                </p>
                              </div>
                              <p className="font-black">
                                {formatCurrency(item.quantity * item.unitPrice, order.currency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border bg-white p-4">
            <h2 className="text-xl font-black">Delivery summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Estimated delivery" value={estimatedDelivery ? formatDate(estimatedDelivery) : "Pending"} />
              <InfoRow label="Delivery method" value={getDeliveryMethod(matchingSnapshot?.deliveryMethodLabel)} />
              <InfoRow label="Vendor orders" value={orderGroup.length.toString()} />
              <InfoRow label="Delivery fee" value={formatCurrency(totals.deliveryFee, primaryOrder.currency)} />
            </dl>
          </section>

          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              <h2 className="font-black">Delivery address</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {address
                ? `${address.recipientName}, ${address.line1}${
                    address.line2 ? `, ${address.line2}` : ""
                  }, ${address.city}, ${address.region}, ${address.country}`
                : primaryOrder.deliveryCity}
            </p>
          </section>

          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              <h2 className="font-black">Courier</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Courier" value={primaryAssignment?.courierName ?? "Not assigned yet"} />
              <InfoRow label="Courier status" value={primaryAssignment?.status.replaceAll("_", " ") ?? "Unassigned"} />
              <InfoRow label="Phone" value={primaryAssignment?.courierPhone ?? "Pending"} />
            </dl>
          </section>

          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-accent" />
              <h2 className="font-black">Order totals</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label="Subtotal" value={formatCurrency(totals.subtotal, primaryOrder.currency)} />
              <InfoRow label="Delivery" value={formatCurrency(totals.deliveryFee, primaryOrder.currency)} />
              <div className="flex justify-between border-t pt-3 text-lg font-black">
                <dt>Total</dt>
                <dd>{formatCurrency(totals.total, primaryOrder.currency)}</dd>
              </div>
            </dl>
          </section>

          <SupportDialog orderNumber={decodedOrderNumber} />
        </aside>
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return <ChevronRight className="size-4 rotate-180" />;
}

function BreakdownTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-muted/20 p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
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

function SupportDialog({ orderNumber }: { orderNumber: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <LifeBuoy className="size-4" />
          Contact support
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact Maket Lakay support</DialogTitle>
          <DialogDescription>
            This is a support dialog for order {orderNumber}. No message is sent to a backend.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {[
            "Delivery is late",
            "Wrong delivery address",
            "Vendor order question",
            "Payment or refund question",
          ].map((reason) => (
            <button
              key={reason}
              type="button"
              className="border p-3 text-left text-sm font-semibold hover:border-primary hover:bg-primary/5"
              onClick={() =>
                toast({
                  title: "Support request drafted",
                  description: `${reason} was selected for ${orderNumber}.`,
                })
              }
            >
              {reason}
            </button>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button asChild>
            <Link href="/support">
              <Clipboard className="size-4" />
              Open support center
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
