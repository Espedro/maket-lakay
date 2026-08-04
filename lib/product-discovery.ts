import { categories, products, stores, vendors } from "@/data/mock-data";
import type { Category, Product, ProductStatus, Store, Vendor } from "@/types";

export type ProductSort =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "rating-desc";

export type AvailabilityFilter = "all" | "in-stock" | "out-of-stock" | "unavailable";

export interface ProductDiscoveryFilters {
  query?: string;
  categoryId?: string;
  storeId?: string;
  vendorId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availability?: AvailabilityFilter;
  sort?: ProductSort;
}

export interface ProductDiscoveryContext {
  categories: Category[];
  stores: Store[];
  vendors: Vendor[];
}

const defaultContext: ProductDiscoveryContext = { categories, stores, vendors };

const HTG_TO_USD = 0.0076;

export function normalizeProductPrice(product: Product) {
  return product.currency === "HTG" ? product.price * HTG_TO_USD : product.price;
}

export function getProductCategory(product: Product, categoriesList: Category[] = categories) {
  return categoriesList.find((category) => category.id === product.categoryId);
}

export function getProductStore(product: Product, storesList: Store[] = stores) {
  return storesList.find((store) => store.id === product.storeId);
}

export function getStoreVendor(store: Store | undefined, vendorsList: Vendor[] = vendors) {
  return store ? vendorsList.find((vendor) => vendor.id === store.vendorId) : undefined;
}

export function getProductVendor(
  product: Product,
  storesList: Store[] = stores,
  vendorsList: Vendor[] = vendors,
) {
  return getStoreVendor(getProductStore(product, storesList), vendorsList);
}

export function getDiscoveryContext(
  overrides: Partial<ProductDiscoveryContext> = {},
): ProductDiscoveryContext {
  return { ...defaultContext, ...overrides };
}

export function getBrands(sourceProducts = products) {
  return Array.from(
    new Set(sourceProducts.map((product) => product.brand).filter(Boolean)),
  ).sort() as string[];
}

export function getStoreCategories(
  storeId: string,
  sourceProducts: Product[] = products,
  categoriesList: Category[] = categories,
) {
  const categoryIds = new Set(
    sourceProducts
      .filter((product) => product.storeId === storeId)
      .map((product) => product.categoryId),
  );

  return categoriesList.filter((category) => categoryIds.has(category.id));
}

function matchesSearch(product: Product, query: string, context: ProductDiscoveryContext) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const category = getProductCategory(product, context.categories);
  const store = getProductStore(product, context.stores);
  const vendor = getProductVendor(product, context.stores, context.vendors);
  const haystack = [
    product.name,
    product.description,
    product.brand,
    category?.name,
    store?.name,
    vendor?.name,
    store?.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesAvailability(product: Product, availability?: AvailabilityFilter) {
  if (!availability || availability === "all") {
    return true;
  }

  if (availability === "in-stock") {
    return product.status === "active" && product.stock > 0;
  }

  if (availability === "out-of-stock") {
    return product.status === "out_of_stock" || product.stock === 0;
  }

  return product.status !== "active";
}

export function filterProducts(
  sourceProducts: Product[],
  filters: ProductDiscoveryFilters,
  context: ProductDiscoveryContext = defaultContext,
) {
  return sourceProducts.filter((product) => {
    const store = getProductStore(product, context.stores);
    const normalizedPrice = normalizeProductPrice(product);

    return (
      matchesSearch(product, filters.query ?? "", context) &&
      (!filters.categoryId || product.categoryId === filters.categoryId) &&
      (!filters.storeId || product.storeId === filters.storeId) &&
      (!filters.vendorId || store?.vendorId === filters.vendorId) &&
      (!filters.brand || product.brand === filters.brand) &&
      (filters.minPrice === undefined || normalizedPrice >= filters.minPrice) &&
      (filters.maxPrice === undefined || normalizedPrice <= filters.maxPrice) &&
      (filters.minRating === undefined || product.rating >= filters.minRating) &&
      matchesAvailability(product, filters.availability)
    );
  });
}

export function sortProducts(sourceProducts: Product[], sort: ProductSort = "featured") {
  const nextProducts = [...sourceProducts];

  if (sort === "price-asc") {
    return nextProducts.sort((a, b) => normalizeProductPrice(a) - normalizeProductPrice(b));
  }

  if (sort === "price-desc") {
    return nextProducts.sort((a, b) => normalizeProductPrice(b) - normalizeProductPrice(a));
  }

  if (sort === "rating-desc") {
    return nextProducts.sort((a, b) => b.rating - a.rating);
  }

  if (sort === "newest") {
    return nextProducts.sort((a, b) => Number(Boolean(b.isNewArrival)) - Number(Boolean(a.isNewArrival)));
  }

  return nextProducts.sort((a, b) => {
    const bScore = Number(Boolean(b.isFeatured)) + Number(Boolean(b.isTrending));
    const aScore = Number(Boolean(a.isFeatured)) + Number(Boolean(a.isTrending));
    return bScore - aScore;
  });
}

export function discoverProducts(
  sourceProducts: Product[],
  filters: ProductDiscoveryFilters,
  context: ProductDiscoveryContext = defaultContext,
) {
  return sortProducts(filterProducts(sourceProducts, filters, context), filters.sort);
}

export function searchStores(query: string, storesList: Store[] = stores) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return storesList.slice(0, 3);
  }

  return storesList.filter((store) =>
    [store.name, store.description, store.city, store.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function searchCategories(query: string, categoriesList: Category[] = categories) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return categoriesList.slice(0, 5);
  }

  return categoriesList.filter((category) =>
    [category.name, category.description].join(" ").toLowerCase().includes(normalizedQuery),
  );
}

export function getAvailabilityLabel(status: ProductStatus, stock: number) {
  if (status === "draft") {
    return "Unavailable";
  }

  if (status === "out_of_stock" || stock === 0) {
    return "Out of stock";
  }

  return "In stock";
}
