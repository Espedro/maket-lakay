import { customerAddresses, products, stores } from "@/data/mock-data";
import type { CartItem } from "@/hooks/use-marketplace-storage";
import { normalizeProductPrice } from "@/lib/product-discovery";
import { calculateVendorPayouts } from "@/lib/payments";
import type {
  CheckoutOrderSnapshot,
  CustomerAddress,
  PaymentRecord,
  Product,
  Store,
} from "@/types";

export interface CartProductItem {
  cartItem: CartItem;
  product: Product;
  quantity: number;
  selectedVariant?: CartItem["variant"];
  lineSubtotal: number;
  stockIssue?: string;
}

export interface VendorCartGroup {
  store: Store;
  items: CartProductItem[];
  subtotal: number;
  deliveryFee: number;
  stockIssues: string[];
}

export interface CartSummary {
  groups: VendorCartGroup[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  stockIssues: string[];
}

export const ORDER_SNAPSHOT_KEY = "maket-lakay-last-order";

export function getCartProductItems(cart: CartItem[]): CartProductItem[] {
  return cart
    .map((cartItem) => {
      const product = products.find((item) => item.id === cartItem.productId);
      if (!product) {
        return null;
      }

      const stockIssue =
        product.status !== "active"
          ? `${product.name} is unavailable.`
          : product.stock <= 0
            ? `${product.name} is out of stock.`
            : cartItem.quantity > product.stock
              ? `Only ${product.stock} available for ${product.name}.`
              : undefined;

      return {
        cartItem,
        product,
        quantity: cartItem.quantity,
        selectedVariant: cartItem.variant,
        lineSubtotal: normalizeProductPrice(product) * cartItem.quantity,
        stockIssue,
      };
    })
    .filter(Boolean) as CartProductItem[];
}

export function calculateDeliveryFee(
  store: Store,
  address: CustomerAddress | undefined,
  itemCount: number,
) {
  const baseFee = address?.country === "United States" ? 9 : 4;
  const cityAdjustment =
    address?.city === store.city ? 1 : address?.country === "United States" ? 5 : 2;

  return baseFee + cityAdjustment + Math.max(0, itemCount - 1) * 0.75;
}

export function buildCartSummary(
  cart: CartItem[],
  address: CustomerAddress | undefined = customerAddresses[0],
): CartSummary {
  const items = getCartProductItems(cart);
  const grouped = new Map<string, CartProductItem[]>();

  items.forEach((item) => {
    const currentItems = grouped.get(item.product.storeId) ?? [];
    grouped.set(item.product.storeId, [...currentItems, item]);
  });

  const groups = Array.from(grouped.entries()).map(([storeId, groupItems]) => {
    const store = stores.find((item) => item.id === storeId);
    if (!store) {
      throw new Error(`Missing store for ${storeId}`);
    }

    const subtotal = groupItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const itemCount = groupItems.reduce((sum, item) => sum + item.quantity, 0);
    const stockIssues = groupItems
      .map((item) => item.stockIssue)
      .filter(Boolean) as string[];

    return {
      store,
      items: groupItems,
      subtotal,
      deliveryFee: calculateDeliveryFee(store, address, itemCount),
      stockIssues,
    };
  });

  const subtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);
  const deliveryFee = groups.reduce((sum, group) => sum + group.deliveryFee, 0);
  const itemCount = groups.reduce(
    (sum, group) =>
      sum + group.items.reduce((groupSum, item) => groupSum + item.quantity, 0),
    0,
  );
  const stockIssues = groups.flatMap((group) => group.stockIssues);

  return {
    groups,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    itemCount,
    stockIssues,
  };
}

export function createOrderSnapshot(
  summary: CartSummary,
  addressId: string,
  paymentMethodId: string,
  payment?: PaymentRecord,
  overrides: Partial<CheckoutOrderSnapshot> = {},
): CheckoutOrderSnapshot {
  const payouts = calculateVendorPayouts(summary);
  const commissionTotal = payouts.reduce((sum, payout) => sum + payout.commission, 0);

  return {
    id: payment?.orderId ?? `ML-${Date.now().toString().slice(-6)}`,
    placedAt: new Date().toISOString(),
    addressId,
    paymentMethodId,
    paymentId: payment?.id,
    paymentStatus: payment?.status,
    itemCount: summary.itemCount,
    subtotal: summary.subtotal,
    deliveryFee: summary.deliveryFee,
    commissionTotal,
    total: summary.total,
    currency: "USD",
    vendorGroups: summary.groups.map((group) => {
      const payout = payouts.find((item) => item.storeId === group.store.id);

      return {
        storeId: group.store.id,
        storeName: group.store.name,
        itemCount: group.items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: group.subtotal,
        deliveryFee: group.deliveryFee,
        commission: payout?.commission,
        vendorPayout: payout?.vendorPayout,
        items: group.items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: normalizeProductPrice(item.product),
        })),
      };
    }),
    ...overrides,
  };
}
