import { customerAddresses, customers, paymentMethods, paymentRecords, products, stores } from "@/data/mock-data";
import type { CustomerAddress, CustomerNotification, Order, PaymentRecord, Product, Store } from "@/types";

export const ACCOUNT_PROFILE_KEY = "maket-lakay-account-profile";
export const ACCOUNT_ADDRESSES_KEY = "maket-lakay-account-addresses";
export const ACCOUNT_NOTIFICATION_READ_KEY = "maket-lakay-account-read-notifications";
export const ACCOUNT_SETTINGS_KEY = "maket-lakay-account-settings";

export const activeCustomer = customers.find((customer) => customer.id === "customer-jean") ?? customers[0];

export const defaultAccountProfile = {
  id: activeCustomer.id,
  firstName: activeCustomer.name.split(" ")[0] ?? "Jean",
  lastName: activeCustomer.name.split(" ").slice(1).join(" ") || "Baptiste",
  email: activeCustomer.email,
  phone: "+509 37 20 4567",
  preferredLanguage: activeCustomer.preferredLanguage,
  profilePicture: "",
};

export const accountPromotionalNotifications: CustomerNotification[] = [
  {
    id: "account-promo-1",
    customerId: activeCustomer.id,
    orderId: "marketplace",
    channel: "in_app",
    title: "Weekend marketplace picks",
    message: "New grocery, school, and local artisan deals are ready for Port-au-Prince shoppers.",
    createdAt: "2026-07-18T12:00:00Z",
    read: false,
  },
  {
    id: "account-payment-1",
    customerId: activeCustomer.id,
    orderId: "payment",
    channel: "in_app",
    title: "Payment options updated",
    message: "MonCash, NatCash, ACH, Zelle, PayPal, Stripe, and card simulation are available in checkout.",
    createdAt: "2026-07-17T14:30:00Z",
    read: false,
  },
  {
    id: "account-delivery-1",
    customerId: activeCustomer.id,
    orderId: "delivery",
    channel: "sms",
    title: "Delivery zones refreshed",
    message: "Port-au-Prince, Petion-Ville, Cap-Haitien, and diaspora routes are available in local data.",
    createdAt: "2026-07-16T10:15:00Z",
    read: false,
  },
];

export function getAccountAddresses(
  localAddresses: CustomerAddress[] = [],
  customerId = activeCustomer.id,
) {
  const merged = new Map<string, CustomerAddress>();
  customerAddresses
    .filter((address) => address.customerId === customerId)
    .forEach((address) => merged.set(address.id, address));
  localAddresses
    .filter((address) => address.customerId === customerId)
    .forEach((address) => merged.set(address.id, address));
  return Array.from(merged.values());
}

export function getStoreByOrder(order: Order): Store | undefined {
  return stores.find((store) => store.id === order.storeId);
}

export function getProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export function getPaymentRecordForOrder(
  orderId: string,
  localPaymentRecords: PaymentRecord[] = [],
): PaymentRecord | undefined {
  return [...localPaymentRecords, ...paymentRecords].find(
    (payment) => payment.orderId === orderId,
  );
}

export function getPaymentLabel(record: PaymentRecord | undefined) {
  if (!record) {
    return "Checkout";
  }

  const method = paymentMethods.find((item) => item.id === record.methodId);
  return method?.label ?? record.provider;
}

export function getPaymentStatusLabel(record: PaymentRecord | undefined, order: Order) {
  if (record) {
    return record.status.replaceAll("_", " ");
  }

  return order.status === "cancelled" ? "not captured" : "authorized";
}

export function getNotificationCategory(notification: CustomerNotification) {
  const text = `${notification.title} ${notification.message}`.toLowerCase();

  if (text.includes("payment") || text.includes("moncash") || text.includes("natcash")) {
    return "Payment";
  }

  if (text.includes("delivery") || text.includes("tracking") || text.includes("courier")) {
    return "Delivery";
  }

  if (text.includes("deal") || text.includes("marketplace picks") || text.includes("promo")) {
    return "Promotional";
  }

  return "Order";
}
