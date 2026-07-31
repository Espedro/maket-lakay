import { categories, products, stores } from "@/data/mock-data";
import type { CurrencyCode, Product, ProductStatus } from "@/types";

export const VENDOR_PRODUCTS_KEY = "maket-lakay-vendor-products";

export type ProductCondition = "new" | "used_like_new" | "refurbished";

export interface ManagedProductVariant {
  name: string;
  value: string;
  sku: string;
  stock: number;
}

export interface ManagedProductAttribute {
  name: string;
  value: string;
}

export interface StockHistoryEntry {
  id: string;
  change: number;
  note: string;
  createdAt: string;
}

export interface ManagedProduct extends Product {
  sku: string;
  condition: ProductCondition;
  images: string[];
  variants: ManagedProductVariant[];
  attributes: ManagedProductAttribute[];
  weight: number;
  deliverySettings: string;
  reservedQuantity: number;
  lowStockThreshold: number;
  stockHistory: StockHistoryEntry[];
}

export function slugifyProductName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductSku(product: Pick<Product, "id" | "name">) {
  const prefix = product.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();

  return `${prefix || "ML"}-${product.id.replace("prod-", "").slice(0, 8).toUpperCase()}`;
}

export function getDefaultStoreId() {
  return stores[0]?.id ?? "store-bel-lakay";
}

export function normalizeManagedProduct(product: Product): ManagedProduct {
  const sku = getProductSku(product);

  return {
    ...product,
    sku,
    condition: "new",
    images: [product.image],
    variants: [],
    attributes: [
      { name: "Brand", value: product.brand ?? "Maket Lakay" },
      {
        name: "Category",
        value: categories.find((category) => category.id === product.categoryId)?.name ?? "General",
      },
    ],
    weight: product.currency === "HTG" ? 1.2 : 0.8,
    deliverySettings: "Standard vendor delivery and pickup-ready packaging.",
    reservedQuantity: Math.min(3, Math.max(0, Math.floor(product.stock * 0.08))),
    lowStockThreshold: 10,
    stockHistory: [
      {
        id: `history-${product.id}-initial`,
        change: product.stock,
        note: "Initial inventory import",
        createdAt: "2026-07-01T12:00:00Z",
      },
    ],
  };
}

export function getInitialManagedProducts() {
  return products.map(normalizeManagedProduct);
}

export function createManagedProduct(input: {
  name: string;
  description: string;
  categoryId: string;
  brand?: string;
  price: number;
  discountPrice?: number;
  currency: CurrencyCode;
  sku: string;
  stock: number;
  condition: ProductCondition;
  lowStockThreshold: number;
  reservedQuantity: number;
  weight: number;
  deliverySettings: string;
  status: ProductStatus;
  images: string[];
  variants: ManagedProductVariant[];
  attributes: ManagedProductAttribute[];
  storeId?: string;
}): ManagedProduct {
  const id = `prod-local-${Date.now()}`;

  return {
    id,
    storeId: input.storeId ?? getDefaultStoreId(),
    categoryId: input.categoryId,
    name: input.name,
    slug: `${slugifyProductName(input.name)}-${Date.now().toString().slice(-4)}`,
    description: input.description,
    brand: input.brand || undefined,
    price: input.discountPrice && input.discountPrice > 0 ? input.discountPrice : input.price,
    compareAtPrice: input.discountPrice && input.discountPrice > 0 ? input.price : undefined,
    currency: input.currency,
    rating: 0,
    reviewCount: 0,
    image: input.images[0] || "/placeholder-product.svg",
    stock: input.stock,
    status: input.stock <= 0 ? "out_of_stock" : input.status,
    sku: input.sku,
    condition: input.condition,
    images: input.images.length ? input.images : ["/placeholder-product.svg"],
    variants: input.variants,
    attributes: input.attributes,
    weight: input.weight,
    deliverySettings: input.deliverySettings,
    reservedQuantity: input.reservedQuantity,
    lowStockThreshold: input.lowStockThreshold,
    stockHistory: [
      {
        id: `history-${id}-created`,
        change: input.stock,
        note: "Product created in vendor dashboard",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function updateManagedProduct(
  product: ManagedProduct,
  input: Parameters<typeof createManagedProduct>[0],
): ManagedProduct {
  const nextStock = input.stock;
  const stockChange = nextStock - product.stock;

  return {
    ...product,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    brand: input.brand || undefined,
    price: input.discountPrice && input.discountPrice > 0 ? input.discountPrice : input.price,
    compareAtPrice: input.discountPrice && input.discountPrice > 0 ? input.price : undefined,
    currency: input.currency,
    sku: input.sku,
    stock: nextStock,
    status: nextStock <= 0 ? "out_of_stock" : input.status,
    condition: input.condition,
    lowStockThreshold: input.lowStockThreshold,
    reservedQuantity: input.reservedQuantity,
    weight: input.weight,
    deliverySettings: input.deliverySettings,
    image: input.images[0] || product.image,
    images: input.images.length ? input.images : product.images,
    variants: input.variants,
    attributes: input.attributes,
    stockHistory:
      stockChange === 0
        ? product.stockHistory
        : [
            {
              id: `history-${product.id}-${Date.now()}`,
              change: stockChange,
              note: "Stock updated from product form",
              createdAt: new Date().toISOString(),
            },
            ...product.stockHistory,
          ],
  };
}

export function getInventoryStatus(product: ManagedProduct) {
  if (product.status !== "active") return product.status;
  if (product.stock <= 0) return "out_of_stock";
  if (product.stock <= product.lowStockThreshold) return "low_stock";
  return "in_stock";
}

export function getAvailableQuantity(product: ManagedProduct) {
  return Math.max(0, product.stock - product.reservedQuantity);
}
