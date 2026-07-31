import {
  customerAddresses,
  customerNotifications,
  customers,
  reviews,
  storeReviews,
} from "@/data/mock-data";

export function getCustomers() {
  return customers;
}

export function getCustomerById(customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

export function getCustomerAddresses(customerId: string) {
  return customerAddresses.filter((address) => address.customerId === customerId);
}

export function getCustomerNotifications(customerId: string) {
  return customerNotifications.filter((notification) => notification.customerId === customerId);
}

export function getCustomerProductReviews(customerId: string) {
  return reviews.filter((review) => review.customerId === customerId);
}

export function getCustomerStoreReviews(customerId: string) {
  return storeReviews.filter((review) => review.customerId === customerId);
}
