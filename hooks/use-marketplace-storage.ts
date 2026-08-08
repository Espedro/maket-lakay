"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { addRealWishlistItem, getRealWishlistProductIds, removeRealWishlistItem } from "@/services/users";
import { ORDER_SNAPSHOT_KEY } from "@/lib/checkout";
import { readLocalJson, removeLocalValue, writeLocalJson } from "@/lib/local-storage";
import {
  PAYMENT_RECORDS_KEY,
  PAYMENT_WEBHOOKS_KEY,
  REFUND_RECORDS_KEY,
} from "@/lib/payments";
import {
  LOCAL_ASSIGNMENTS_KEY,
  LOCAL_CUSTOMER_NOTIFICATIONS_KEY,
  LOCAL_ORDERS_KEY,
  LOCAL_PROOFS_KEY,
} from "@/lib/orders";
import {
  LOCAL_DISPUTES_KEY,
  LOCAL_REFUND_REQUESTS_KEY,
  LOCAL_REPORTS_KEY,
  LOCAL_REVIEWS_KEY,
  LOCAL_STORE_REVIEWS_KEY,
} from "@/lib/support";
import type {
  CheckoutOrderSnapshot,
  CustomerNotification,
  DeliveryAssignment,
  Dispute,
  MarketplaceReport,
  Order,
  PaymentRecord,
  PaymentWebhookEvent,
  ProofOfDelivery,
  Product,
  RefundRequest,
  RefundRecord,
  Review,
  StoreReview,
} from "@/types";

const CART_KEY = "maket-lakay-cart";
const WISHLIST_KEY = "maket-lakay-wishlist";
const RECENTLY_VIEWED_KEY = "maket-lakay-recently-viewed";
const SAVED_FOR_LATER_KEY = "maket-lakay-saved-for-later";
const STORAGE_EVENT = "maket-lakay-storage";

export interface CartItemVariant {
  color?: string;
  size?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  variant?: CartItemVariant;
}

function getCartItemKey(item: CartItem) {
  return [
    item.productId,
    item.variant?.color ?? "default-color",
    item.variant?.size ?? "default-size",
  ].join(":");
}

function readJson<T>(key: string, fallback: T): T {
  return readLocalJson(key, fallback);
}

function writeJson<T>(key: string, value: T) {
  writeLocalJson(key, value, STORAGE_EVENT);
}

function removeValue(key: string) {
  removeLocalValue(key, STORAGE_EVENT);
}

export function useMarketplaceStorage() {
  const { user } = useAuth();
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [savedForLater, setSavedForLater] = React.useState<CartItem[]>([]);
  const [wishlist, setWishlist] = React.useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = React.useState<string[]>([]);
  const [localOrders, setLocalOrders] = React.useState<Order[]>([]);
  const [localAssignments, setLocalAssignments] = React.useState<DeliveryAssignment[]>([]);
  const [localProofs, setLocalProofs] = React.useState<ProofOfDelivery[]>([]);
  const [customerNotifications, setCustomerNotifications] = React.useState<
    CustomerNotification[]
  >([]);
  const [localReviews, setLocalReviews] = React.useState<Review[]>([]);
  const [localStoreReviews, setLocalStoreReviews] = React.useState<StoreReview[]>([]);
  const [localRefundRequests, setLocalRefundRequests] = React.useState<RefundRequest[]>([]);
  const [localDisputes, setLocalDisputes] = React.useState<Dispute[]>([]);
  const [localReports, setLocalReports] = React.useState<MarketplaceReport[]>([]);
  const [localPaymentRecords, setLocalPaymentRecords] = React.useState<PaymentRecord[]>([]);
  const [localPaymentWebhooks, setLocalPaymentWebhooks] = React.useState<PaymentWebhookEvent[]>([]);
  const [localRefundRecords, setLocalRefundRecords] = React.useState<RefundRecord[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setCart(readJson<CartItem[]>(CART_KEY, []));
    setSavedForLater(readJson<CartItem[]>(SAVED_FOR_LATER_KEY, []));
    setWishlist(readJson<string[]>(WISHLIST_KEY, []));
    setRecentlyViewed(readJson<string[]>(RECENTLY_VIEWED_KEY, []));
    setLocalOrders(readJson<Order[]>(LOCAL_ORDERS_KEY, []));
    setLocalAssignments(readJson<DeliveryAssignment[]>(LOCAL_ASSIGNMENTS_KEY, []));
    setLocalProofs(readJson<ProofOfDelivery[]>(LOCAL_PROOFS_KEY, []));
    setCustomerNotifications(
      readJson<CustomerNotification[]>(LOCAL_CUSTOMER_NOTIFICATIONS_KEY, []),
    );
    setLocalReviews(readJson<Review[]>(LOCAL_REVIEWS_KEY, []));
    setLocalStoreReviews(readJson<StoreReview[]>(LOCAL_STORE_REVIEWS_KEY, []));
    setLocalRefundRequests(readJson<RefundRequest[]>(LOCAL_REFUND_REQUESTS_KEY, []));
    setLocalDisputes(readJson<Dispute[]>(LOCAL_DISPUTES_KEY, []));
    setLocalReports(readJson<MarketplaceReport[]>(LOCAL_REPORTS_KEY, []));
    setLocalPaymentRecords(readJson<PaymentRecord[]>(PAYMENT_RECORDS_KEY, []));
    setLocalPaymentWebhooks(readJson<PaymentWebhookEvent[]>(PAYMENT_WEBHOOKS_KEY, []));
    setLocalRefundRecords(readJson<RefundRecord[]>(REFUND_RECORDS_KEY, []));
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(STORAGE_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(STORAGE_EVENT, refresh);
    };
  }, [refresh]);

  React.useEffect(() => {
    if (!user) return;

    let active = true;

    getRealWishlistProductIds(user.id).then((ids) => {
      if (active) setWishlist(ids);
    });

    return () => {
      active = false;
    };
  }, [user]);

  const addToCart = React.useCallback((
    product: Product,
    quantity = 1,
    variant?: CartItemVariant,
  ) => {
    if (product.status !== "active" || product.stock <= 0) {
      toast({
        title: "Product unavailable",
        description: `${product.name} cannot be added to cart right now.`,
        variant: "destructive",
      });
      return;
    }

    const currentCart = readJson<CartItem[]>(CART_KEY, []);
    const nextCartItem: CartItem = { productId: product.id, quantity: 0, variant };
    const nextCartItemKey = getCartItemKey(nextCartItem);
    const existing = currentCart.find((item) => getCartItemKey(item) === nextCartItemKey);
    const requestedQuantity = Math.max(1, Math.floor(quantity));
    const currentQuantity = existing?.quantity ?? 0;
    const nextQuantity = currentQuantity + requestedQuantity;

    if (nextQuantity > product.stock) {
      toast({
        title: "Stock limit reached",
        description: `Only ${product.stock} available for ${product.name}.`,
        variant: "destructive",
      });
      return;
    }

    const nextCart = existing
      ? currentCart.map((item) =>
          getCartItemKey(item) === nextCartItemKey
            ? { ...item, quantity: item.quantity + requestedQuantity }
            : item,
        )
      : [...currentCart, { productId: product.id, quantity: requestedQuantity, variant }];

    writeJson(CART_KEY, nextCart);
    toast({
      title: "Added to cart",
      description: `${requestedQuantity} ${product.name} added to your cart.`,
    });
  }, []);

  const updateCartQuantity = React.useCallback((
    product: Product,
    quantity: number,
    variant?: CartItemVariant,
  ) => {
    const normalizedQuantity = Math.max(0, Math.min(quantity, product.stock));
    const currentCart = readJson<CartItem[]>(CART_KEY, []);
    const targetKey = getCartItemKey({ productId: product.id, quantity: 0, variant });

    if (quantity > product.stock) {
      toast({
        title: "Stock limit reached",
        description: `Only ${product.stock} available for ${product.name}.`,
        variant: "destructive",
      });
    }

    const nextCart = normalizedQuantity === 0
      ? currentCart.filter((item) => getCartItemKey(item) !== targetKey)
      : currentCart.map((item) =>
          getCartItemKey(item) === targetKey
            ? { ...item, quantity: normalizedQuantity }
            : item,
        );

    writeJson(CART_KEY, nextCart);
  }, []);

  const removeFromCart = React.useCallback((product: Product, variant?: CartItemVariant) => {
    const currentCart = readJson<CartItem[]>(CART_KEY, []);
    const targetKey = getCartItemKey({ productId: product.id, quantity: 0, variant });
    writeJson(
      CART_KEY,
      currentCart.filter((item) => getCartItemKey(item) !== targetKey),
    );
    toast({
      title: "Removed from cart",
      description: `${product.name} was removed from your cart.`,
    });
  }, []);

  const clearCart = React.useCallback(() => {
    writeJson(CART_KEY, []);
  }, []);

  const saveForLater = React.useCallback((product: Product, variant?: CartItemVariant) => {
    const currentCart = readJson<CartItem[]>(CART_KEY, []);
    const currentSavedItems = readJson<CartItem[]>(SAVED_FOR_LATER_KEY, []);
    const targetKey = getCartItemKey({ productId: product.id, quantity: 0, variant });
    const cartItem = currentCart.find((item) => getCartItemKey(item) === targetKey);

    if (!cartItem) {
      return;
    }

    const nextSavedItems = [
      cartItem,
      ...currentSavedItems.filter((item) => getCartItemKey(item) !== targetKey),
    ];
    const nextCart = currentCart.filter((item) => getCartItemKey(item) !== targetKey);

    writeJson(SAVED_FOR_LATER_KEY, nextSavedItems);
    writeJson(CART_KEY, nextCart);
    toast({
      title: "Saved for later",
      description: `${product.name} moved out of your cart.`,
    });
  }, []);

  const moveSavedItemToCart = React.useCallback((product: Product, variant?: CartItemVariant) => {
    const currentSavedItems = readJson<CartItem[]>(SAVED_FOR_LATER_KEY, []);
    const targetKey = getCartItemKey({ productId: product.id, quantity: 0, variant });
    const savedItem = currentSavedItems.find((item) => getCartItemKey(item) === targetKey);

    if (!savedItem) {
      return;
    }

    const currentCart = readJson<CartItem[]>(CART_KEY, []);
    const existingCartItem = currentCart.find((item) => getCartItemKey(item) === targetKey);
    const nextQuantity = (existingCartItem?.quantity ?? 0) + savedItem.quantity;

    if (product.stock <= 0 || product.status !== "active" || nextQuantity > product.stock) {
      toast({
        title: "Quantity limit reached",
        description: `Only ${product.stock} available for ${product.name}.`,
        variant: "destructive",
      });
      return;
    }

    const nextCart = existingCartItem
      ? currentCart.map((item) =>
          getCartItemKey(item) === targetKey
            ? { ...item, quantity: nextQuantity }
            : item,
        )
      : [...currentCart, savedItem];

    writeJson(CART_KEY, nextCart);
    writeJson(
      SAVED_FOR_LATER_KEY,
      currentSavedItems.filter((item) => getCartItemKey(item) !== targetKey),
    );
    toast({
      title: "Moved to cart",
      description: `${product.name} is back in your cart.`,
    });
  }, []);

  const removeSavedItem = React.useCallback((product: Product, variant?: CartItemVariant) => {
    const currentSavedItems = readJson<CartItem[]>(SAVED_FOR_LATER_KEY, []);
    const targetKey = getCartItemKey({ productId: product.id, quantity: 0, variant });

    writeJson(
      SAVED_FOR_LATER_KEY,
      currentSavedItems.filter((item) => getCartItemKey(item) !== targetKey),
    );
    toast({
      title: "Removed saved item",
      description: `${product.name} was removed from saved items.`,
    });
  }, []);

  const saveOrderSnapshot = React.useCallback((snapshot: CheckoutOrderSnapshot) => {
    writeJson(ORDER_SNAPSHOT_KEY, snapshot);
  }, []);

  const saveLocalOrders = React.useCallback((orders: Order[]) => {
    const currentOrders = readJson<Order[]>(LOCAL_ORDERS_KEY, []);
    const merged = new Map<string, Order>();

    currentOrders.forEach((order) => merged.set(order.id, order));
    orders.forEach((order) => merged.set(order.id, order));
    writeJson(LOCAL_ORDERS_KEY, Array.from(merged.values()));
  }, []);

  const saveLocalOrder = React.useCallback((order: Order) => {
    const currentOrders = readJson<Order[]>(LOCAL_ORDERS_KEY, []);
    const exists = currentOrders.some((item) => item.id === order.id);
    const nextOrders = exists
      ? currentOrders.map((item) => (item.id === order.id ? order : item))
      : [order, ...currentOrders];

    writeJson(LOCAL_ORDERS_KEY, nextOrders);
  }, []);

  const saveDeliveryAssignment = React.useCallback((assignment: DeliveryAssignment) => {
    const assignments = readJson<DeliveryAssignment[]>(LOCAL_ASSIGNMENTS_KEY, []);
    const exists = assignments.some((item) => item.id === assignment.id);
    const nextAssignments = exists
      ? assignments.map((item) => (item.id === assignment.id ? assignment : item))
      : [assignment, ...assignments];

    writeJson(LOCAL_ASSIGNMENTS_KEY, nextAssignments);
  }, []);

  const saveProofOfDelivery = React.useCallback((proof: ProofOfDelivery) => {
    const proofs = readJson<ProofOfDelivery[]>(LOCAL_PROOFS_KEY, []);
    writeJson(LOCAL_PROOFS_KEY, [proof, ...proofs]);
  }, []);

  const saveCustomerNotification = React.useCallback(
    (notification: CustomerNotification) => {
      const notifications = readJson<CustomerNotification[]>(
        LOCAL_CUSTOMER_NOTIFICATIONS_KEY,
        [],
      );
      writeJson(LOCAL_CUSTOMER_NOTIFICATIONS_KEY, [notification, ...notifications]);
    },
    [],
  );

  const saveProductReview = React.useCallback((review: Review) => {
    const currentReviews = readJson<Review[]>(LOCAL_REVIEWS_KEY, []);
    const exists = currentReviews.some((item) => item.id === review.id);
    const nextReviews = exists
      ? currentReviews.map((item) => (item.id === review.id ? review : item))
      : [review, ...currentReviews];

    writeJson(LOCAL_REVIEWS_KEY, nextReviews);
  }, []);

  const saveStoreReview = React.useCallback((review: StoreReview) => {
    const currentReviews = readJson<StoreReview[]>(LOCAL_STORE_REVIEWS_KEY, []);
    const exists = currentReviews.some((item) => item.id === review.id);
    const nextReviews = exists
      ? currentReviews.map((item) => (item.id === review.id ? review : item))
      : [review, ...currentReviews];

    writeJson(LOCAL_STORE_REVIEWS_KEY, nextReviews);
  }, []);

  const saveRefundRequest = React.useCallback((request: RefundRequest) => {
    const requests = readJson<RefundRequest[]>(LOCAL_REFUND_REQUESTS_KEY, []);
    const exists = requests.some((item) => item.id === request.id);
    const nextRequests = exists
      ? requests.map((item) => (item.id === request.id ? request : item))
      : [request, ...requests];

    writeJson(LOCAL_REFUND_REQUESTS_KEY, nextRequests);
  }, []);

  const saveDispute = React.useCallback((dispute: Dispute) => {
    const disputes = readJson<Dispute[]>(LOCAL_DISPUTES_KEY, []);
    const exists = disputes.some((item) => item.id === dispute.id);
    const nextDisputes = exists
      ? disputes.map((item) => (item.id === dispute.id ? dispute : item))
      : [dispute, ...disputes];

    writeJson(LOCAL_DISPUTES_KEY, nextDisputes);
  }, []);

  const saveMarketplaceReport = React.useCallback((report: MarketplaceReport) => {
    const reports = readJson<MarketplaceReport[]>(LOCAL_REPORTS_KEY, []);
    const exists = reports.some((item) => item.id === report.id);
    const nextReports = exists
      ? reports.map((item) => (item.id === report.id ? report : item))
      : [report, ...reports];

    writeJson(LOCAL_REPORTS_KEY, nextReports);
  }, []);

  const savePaymentRecord = React.useCallback((record: PaymentRecord) => {
    const records = readJson<PaymentRecord[]>(PAYMENT_RECORDS_KEY, []);
    writeJson(PAYMENT_RECORDS_KEY, [record, ...records]);
  }, []);

  const savePaymentWebhook = React.useCallback((event: PaymentWebhookEvent) => {
    const events = readJson<PaymentWebhookEvent[]>(PAYMENT_WEBHOOKS_KEY, []);
    writeJson(PAYMENT_WEBHOOKS_KEY, [event, ...events]);
  }, []);

  const saveRefundRecord = React.useCallback((record: RefundRecord) => {
    const records = readJson<RefundRecord[]>(REFUND_RECORDS_KEY, []);
    writeJson(REFUND_RECORDS_KEY, [record, ...records]);
  }, []);

  const getOrderSnapshot = React.useCallback(() => {
    return readJson<CheckoutOrderSnapshot | null>(ORDER_SNAPSHOT_KEY, null);
  }, []);

  const clearOrderSnapshot = React.useCallback(() => {
    removeValue(ORDER_SNAPSHOT_KEY);
  }, []);

  const toggleWishlist = React.useCallback(
    async (product: Product) => {
      if (user) {
        const exists = wishlist.includes(product.id);
        const result = exists
          ? await removeRealWishlistItem(user.id, product.id)
          : await addRealWishlistItem(user.id, product.id);

        if (!result.ok) {
          toast({
            title: "Could not update wishlist",
            description: result.reason,
            variant: "destructive",
          });
          return;
        }

        setWishlist((current) =>
          exists
            ? current.filter((productId) => productId !== product.id)
            : [...current, product.id],
        );
        toast({
          title: exists ? "Removed from wishlist" : "Saved to wishlist",
          description: `${product.name} ${exists ? "was removed" : "was saved"}.`,
        });
        return;
      }

      const currentWishlist = readJson<string[]>(WISHLIST_KEY, []);
      const exists = currentWishlist.includes(product.id);
      const nextWishlist = exists
        ? currentWishlist.filter((productId) => productId !== product.id)
        : [...currentWishlist, product.id];

      writeJson(WISHLIST_KEY, nextWishlist);
      toast({
        title: exists ? "Removed from wishlist" : "Saved to wishlist",
        description: `${product.name} ${exists ? "was removed" : "was saved"}.`,
      });
    },
    [user, wishlist],
  );

  const isInWishlist = React.useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  );

  const trackRecentlyViewed = React.useCallback((productId: string) => {
    const currentItems = readJson<string[]>(RECENTLY_VIEWED_KEY, []);
    const nextItems = [
      productId,
      ...currentItems.filter((currentProductId) => currentProductId !== productId),
    ].slice(0, 8);

    writeJson(RECENTLY_VIEWED_KEY, nextItems);
  }, []);

  return {
    addToCart,
    cart,
    cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    clearCart,
    clearOrderSnapshot,
    getOrderSnapshot,
    isInWishlist,
    isReady,
    customerNotifications,
    localAssignments,
    localDisputes,
    localOrders,
    localPaymentRecords,
    localPaymentWebhooks,
    localProofs,
    localRefundRecords,
    localRefundRequests,
    localReports,
    localReviews,
    localStoreReviews,
    recentlyViewed,
    removeFromCart,
    removeSavedItem,
    savedForLater,
    saveCustomerNotification,
    saveDeliveryAssignment,
    saveDispute,
    saveLocalOrder,
    saveLocalOrders,
    saveMarketplaceReport,
    saveOrderSnapshot,
    savePaymentRecord,
    savePaymentWebhook,
    saveProductReview,
    saveProofOfDelivery,
    saveRefundRequest,
    saveRefundRecord,
    saveStoreReview,
    saveForLater,
    toggleWishlist,
    trackRecentlyViewed,
    moveSavedItemToCart,
    updateCartQuantity,
    wishlist,
    wishlistCount: wishlist.length,
  };
}
