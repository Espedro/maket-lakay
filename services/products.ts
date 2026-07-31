import { categories, products, reviews, stores, vendors } from "@/data/mock-data";
import {
  discoverProducts,
  getBrands,
  getProductCategory,
  getProductStore,
  getProductVendor,
  type ProductDiscoveryFilters,
} from "@/lib/product-discovery";

export function getProducts(filters: ProductDiscoveryFilters = {}) {
  return discoverProducts(products, filters);
}

export function getProductById(productId: string) {
  return products.find((product) => product.id === productId);
}

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getFeaturedProducts() {
  return products.filter((product) => product.isFeatured);
}

export function getTrendingProducts() {
  return products.filter((product) => product.isTrending);
}

export function getNewArrivals() {
  return products.filter((product) => product.isNewArrival);
}

export function getRecommendedProducts() {
  return products.filter((product) => product.isRecommended);
}

export function getProductsByCategory(categoryId: string) {
  return products.filter((product) => product.categoryId === categoryId);
}

export function getProductsByStore(storeId: string) {
  return products.filter((product) => product.storeId === storeId);
}

export function getProductReviews(productId: string) {
  return reviews.filter((review) => review.productId === productId);
}

export function getProductCatalogContext() {
  return {
    brands: getBrands(products),
    categories,
    getProductCategory,
    getProductStore,
    getProductVendor,
    stores,
    vendors,
  };
}
