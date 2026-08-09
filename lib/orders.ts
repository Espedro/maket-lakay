import {
  customerAddresses,
  deliveryAssignments,
  deliveryZones,
  orders,
  stores,
  trackingEvents,
} from "@/data/mock-data";
import type {
  CheckoutOrderSnapshot,
  CustomerAddress,
  CustomerNotification,
  DeliveryAssignment,
  DeliveryAssignmentStatus,
  DeliveryZone,
  Order,
  OrderStatus,
  OrderStatusEvent,
  ProofOfDelivery,
  TrackingEvent,
} from "@/types";

export const LOCAL_ORDERS_KEY = "maket-lakay-orders";
export const LOCAL_ASSIGNMENTS_KEY = "maket-lakay-delivery-assignments";
export const LOCAL_PROOFS_KEY = "maket-lakay-proofs-of-delivery";
export const LOCAL_CUSTOMER_NOTIFICATIONS_KEY = "maket-lakay-customer-notifications";

export const ORDER_WORKFLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  cancelled: "Cancelled",
  confirmed: "Confirmed",
  delivered: "Delivered",
  out_for_delivery: "Out for delivery",
  pending: "Pending",
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  shipped: "Shipped",
};

export const ORDER_STATUS_MESSAGES: Record<OrderStatus, string> = {
  cancelled: "The order was cancelled.",
  confirmed: "The vendor accepted the order.",
  delivered: "The order was delivered to the customer.",
  out_for_delivery: "The courier is on the way to the customer.",
  pending: "The order was placed and is waiting for vendor confirmation.",
  processing: "The vendor is preparing the items.",
  ready_for_delivery: "The package is packed and ready for courier pickup.",
  shipped: "The package left the vendor location.",
};

export function getNextOrderStatus(status: OrderStatus) {
  const currentIndex = ORDER_WORKFLOW.indexOf(status);

  if (currentIndex < 0 || currentIndex === ORDER_WORKFLOW.length - 1) {
    return null;
  }

  return ORDER_WORKFLOW[currentIndex + 1];
}

export function findDeliveryZone(
  address: CustomerAddress | undefined,
  zones: DeliveryZone[] = deliveryZones,
) {
  if (zones.length === 0) {
    return deliveryZones[0];
  }

  if (!address) {
    return zones[0];
  }

  return (
    zones.find(
      (zone) =>
        zone.city === address.city &&
        zone.region === address.region &&
        zone.country === address.country,
    ) ??
    zones.find((zone) => zone.country === address.country) ??
    zones[0]
  );
}

function addDays(date: string, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function createStatusEvent(
  orderId: string,
  status: OrderStatus,
  createdAt = new Date().toISOString(),
): OrderStatusEvent {
  return {
    id: `${orderId}-${status}-${createdAt}`,
    status,
    label: ORDER_STATUS_LABELS[status],
    message: ORDER_STATUS_MESSAGES[status],
    createdAt,
  };
}

export function mergeOrders(localOrders: Order[] = []) {
  const merged = new Map<string, Order>();

  orders.forEach((order) => merged.set(order.id, order));
  localOrders.forEach((order) => merged.set(order.id, order));

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  );
}

export function mergeAssignments(localAssignments: DeliveryAssignment[] = []) {
  const merged = new Map<string, DeliveryAssignment>();

  deliveryAssignments.forEach((assignment) => merged.set(assignment.id, assignment));
  localAssignments.forEach((assignment) => merged.set(assignment.id, assignment));

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
  );
}

export function createOrdersFromSnapshot(
  snapshot: CheckoutOrderSnapshot,
  address: CustomerAddress | undefined,
  zones: DeliveryZone[] = deliveryZones,
) {
  const zone = findDeliveryZone(address, zones);
  const placedAt = snapshot.placedAt;

  return snapshot.vendorGroups.map((group, index): Order => {
    const store = stores.find((item) => item.id === group.storeId);
    const orderId = index === 0 ? snapshot.id : `${snapshot.id}-${index + 1}`;
    const status: OrderStatus =
      snapshot.paymentStatus === "captured" || snapshot.paymentStatus === "authorized"
        ? "confirmed"
        : "pending";

    return {
      id: orderId,
      customerId: address?.customerId ?? "customer-jean",
      storeId: group.storeId,
      status,
      currency: snapshot.currency,
      subtotal: group.subtotal,
      deliveryFee: group.deliveryFee,
      total: group.subtotal + group.deliveryFee,
      items:
        group.items?.length
          ? group.items
          : [
              {
                productId: `${group.storeId}-items`,
                productName: `${group.itemCount} item bundle`,
                quantity: group.itemCount,
                unitPrice: group.subtotal,
              },
            ],
      placedAt,
      deliveryCity: address?.city ?? store?.city ?? "Port-au-Prince",
      deliveryZoneId: zone.id,
      trackingNumber: `MLK-${orderId.replace("ML-", "")}-${store?.logo ?? "MK"}`,
      estimatedDeliveryAt: addDays(placedAt, zone.estimatedDays),
      statusHistory: [
        createStatusEvent(orderId, "pending", placedAt),
        ...(status === "confirmed"
          ? [createStatusEvent(orderId, "confirmed", placedAt)]
          : []),
      ],
    };
  });
}

export function updateOrderStatus(order: Order, status: OrderStatus) {
  return {
    ...order,
    status,
    statusHistory: [
      ...(order.statusHistory ?? []),
      createStatusEvent(order.id, status),
    ],
  };
}

export function createDeliveryAssignment(
  order: Order,
  zone: DeliveryZone,
  courierName = "Maket Lakay Courier",
): DeliveryAssignment {
  const assignedAt = new Date().toISOString();

  return {
    id: `assign-${order.id}-${Date.now()}`,
    orderId: order.id,
    zoneId: zone.id,
    courierName,
    courierPhone: zone.country === "United States" ? "+1 305 555 0144" : "+509 37 55 2020",
    status: "assigned",
    assignedAt,
  };
}

export function updateAssignmentStatus(
  assignment: DeliveryAssignment,
  status: DeliveryAssignmentStatus,
) {
  const timestamp = new Date().toISOString();

  return {
    ...assignment,
    status,
    pickedUpAt:
      status === "picked_up" || status === "in_transit"
        ? assignment.pickedUpAt ?? timestamp
        : assignment.pickedUpAt,
    completedAt: status === "completed" ? timestamp : assignment.completedAt,
  };
}

export function createProofOfDelivery(
  order: Order,
  assignment: DeliveryAssignment,
  recipientName: string,
): ProofOfDelivery {
  return {
    id: `pod-${order.id}-${Date.now()}`,
    orderId: order.id,
    assignmentId: assignment.id,
    recipientName,
    method: "code",
    note: `Proof captured for ${recipientName}.`,
    deliveredAt: new Date().toISOString(),
  };
}

export function createCustomerNotification(
  order: Order,
  status: OrderStatus,
): CustomerNotification {
  return {
    id: `cust-notif-${order.id}-${status}-${Date.now()}`,
    customerId: order.customerId,
    orderId: order.id,
    channel: "in_app",
    title: ORDER_STATUS_LABELS[status],
    message: `${order.id}: ${ORDER_STATUS_MESSAGES[status]}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export function getOrderTrackingEvents(order: Order): TrackingEvent[] {
  const historyEvents =
    order.statusHistory?.map((event) => ({
      id: `tracking-${event.id}`,
      orderId: order.id,
      status: event.status,
      title: event.label,
      description: event.message,
      location: order.deliveryCity,
      createdAt: event.createdAt,
    })) ?? [];

  const storedEvents = trackingEvents.filter((event) => event.orderId === order.id);
  const merged = new Map<string, TrackingEvent>();

  [...historyEvents, ...storedEvents].forEach((event) => merged.set(event.id, event));

  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function getOrderAddress(order: Order) {
  return customerAddresses.find(
    (address) => address.customerId === order.customerId && address.city === order.deliveryCity,
  );
}
