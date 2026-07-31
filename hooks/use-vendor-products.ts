"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { readLocalJson, writeLocalJson } from "@/lib/local-storage";
import {
  getInitialManagedProducts,
  type ManagedProduct,
  VENDOR_PRODUCTS_KEY,
} from "@/lib/vendor-products";
import type { ProductStatus } from "@/types";

const STORAGE_EVENT = "maket-lakay-vendor-products-storage";

function readProducts() {
  return readLocalJson(VENDOR_PRODUCTS_KEY, getInitialManagedProducts());
}

function writeProducts(products: ManagedProduct[]) {
  writeLocalJson(VENDOR_PRODUCTS_KEY, products, STORAGE_EVENT);
}

export function useVendorProducts() {
  const [products, setProducts] = React.useState<ManagedProduct[]>([]);
  const [isReady, setIsReady] = React.useState(false);

  const refresh = React.useCallback(() => {
    setProducts(readProducts());
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener(STORAGE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(STORAGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const saveProducts = React.useCallback((nextProducts: ManagedProduct[]) => {
    writeProducts(nextProducts);
    setProducts(nextProducts);
  }, []);

  const saveProduct = React.useCallback(
    (product: ManagedProduct) => {
      const currentProducts = readProducts();
      const exists = currentProducts.some((item) => item.id === product.id);
      const nextProducts = exists
        ? currentProducts.map((item) => (item.id === product.id ? product : item))
        : [product, ...currentProducts];

      saveProducts(nextProducts);
      toast({
        title: exists ? "Product updated" : "Product added",
        description: `${product.name} was saved locally.`,
      });
    },
    [saveProducts],
  );

  const deleteProduct = React.useCallback(
    (productId: string) => {
      const currentProducts = readProducts();
      const product = currentProducts.find((item) => item.id === productId);
      saveProducts(currentProducts.filter((item) => item.id !== productId));
      toast({
        title: "Product deleted",
        description: `${product?.name ?? "Product"} was removed from local data.`,
      });
    },
    [saveProducts],
  );

  const bulkUpdateStatus = React.useCallback(
    (productIds: string[], status: ProductStatus) => {
      const nextProducts = readProducts().map((product) =>
        productIds.includes(product.id)
          ? { ...product, status: product.stock <= 0 ? "out_of_stock" : status }
          : product,
      );

      saveProducts(nextProducts);
      toast({
        title: "Bulk action complete",
        description: `${productIds.length} product${productIds.length === 1 ? "" : "s"} updated.`,
      });
    },
    [saveProducts],
  );

  const updateStock = React.useCallback(
    (productId: string, nextStock: number, note = "Manual inventory adjustment") => {
      const normalizedStock = Math.max(0, Math.floor(nextStock));
      const nextProducts = readProducts().map((product) => {
        if (product.id !== productId) {
          return product;
        }

        const change = normalizedStock - product.stock;

        return {
          ...product,
          stock: normalizedStock,
          status: (normalizedStock <= 0
            ? "out_of_stock"
            : product.status === "out_of_stock"
              ? "active"
              : product.status) as ProductStatus,
          stockHistory:
            change === 0
              ? product.stockHistory
              : [
                  {
                    id: `history-${product.id}-${Date.now()}`,
                    change,
                    note,
                    createdAt: new Date().toISOString(),
                  },
                  ...product.stockHistory,
                ],
        };
      });

      saveProducts(nextProducts);
      toast({
        title: "Stock updated",
        description: "Inventory adjustment was saved locally.",
      });
    },
    [saveProducts],
  );

  const resetProducts = React.useCallback(() => {
    const initialProducts = getInitialManagedProducts();
    saveProducts(initialProducts);
    toast({
      title: "Products reset",
      description: "Vendor product data was restored.",
    });
  }, [saveProducts]);

  return {
    bulkUpdateStatus,
    deleteProduct,
    isReady,
    products,
    resetProducts,
    saveProduct,
    saveProducts,
    updateStock,
  };
}
