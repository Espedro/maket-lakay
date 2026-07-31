import { customerNotifications, notifications } from "@/data/mock-data";

export function getNotifications() {
  return notifications;
}

export function getUnreadNotifications() {
  return notifications.filter((notification) => !notification.read);
}

export function getCustomerDeliveryNotifications(customerId: string) {
  return customerNotifications.filter((notification) => notification.customerId === customerId);
}

export function getNotificationsByOrder(orderId: string) {
  return customerNotifications.filter((notification) => notification.orderId === orderId);
}
