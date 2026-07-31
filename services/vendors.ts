import { orders, products, stores, vendors } from "@/data/mock-data";

export function getVendors() {
  return vendors;
}

export function getVendorById(vendorId: string) {
  return vendors.find((vendor) => vendor.id === vendorId);
}

export function getStores() {
  return stores;
}

export function getStoreById(storeId: string) {
  return stores.find((store) => store.id === storeId);
}

export function getStoreBySlug(slug: string) {
  return stores.find((store) => store.slug === slug);
}

export function getStoresByVendor(vendorId: string) {
  return stores.filter((store) => store.vendorId === vendorId);
}

export function getStoreProducts(storeId: string) {
  return products.filter((product) => product.storeId === storeId);
}

export function getStoreOrders(storeId: string) {
  return orders.filter((order) => order.storeId === storeId);
}

export function getPopularStores(limit = 6) {
  return [...stores]
    .sort((a, b) => b.rating - a.rating || b.productCount - a.productCount)
    .slice(0, limit);
}
