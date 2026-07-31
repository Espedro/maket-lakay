import { customerAddresses, customers, paymentRecords, stores } from "@/data/mock-data";
import { mergeOrders, updateOrderStatus } from "@/lib/orders";
import type { Order, OrderStatus } from "@/types";

export function getOrders(localOrders: Order[] = []) {
  return mergeOrders(localOrders);
}

export function getOrderById(orderId: string, localOrders: Order[] = []) {
  return getOrders(localOrders).find((order) => order.id === orderId);
}

export function getOrdersByCustomer(customerId: string, localOrders: Order[] = []) {
  return getOrders(localOrders).filter((order) => order.customerId === customerId);
}

export function getOrdersByStore(storeId: string, localOrders: Order[] = []) {
  return getOrders(localOrders).filter((order) => order.storeId === storeId);
}

export function getOrderPayment(orderId: string) {
  return paymentRecords.find((payment) => payment.orderId === orderId);
}

export function getOrderParties(order: Order) {
  return {
    customer: customers.find((customer) => customer.id === order.customerId),
    deliveryAddress: customerAddresses.find((address) => address.customerId === order.customerId),
    store: stores.find((store) => store.id === order.storeId),
  };
}

export function updateMockOrderStatus(order: Order, status: OrderStatus) {
  return updateOrderStatus(order, status);
}
