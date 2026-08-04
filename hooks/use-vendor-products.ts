"use client";

import * as React from "react";

import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { mapManagedProductRow, toManagedProductMetadata, toManagedProductRow } from "@/lib/supabase/mappers";
import type { ManagedProduct } from "@/lib/vendor-products";
import type { Json } from "@/types/database";
import type { ProductStatus } from "@/types";

export function useVendorProducts() {
  const { user, isReady: authReady } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const [products, setProducts] = React.useState<ManagedProduct[]>([]);
  const [isReady, setIsReady] = React.useState(false);
  const storeId = user?.storeId;

  const refresh = React.useCallback(async () => {
    if (!storeId) {
      setProducts([]);
      setIsReady(true);
      return;
    }

    const { data, error } = await supabase.from("products").select("*").eq("store_id", storeId);

    if (error) {
      toast({
        title: "Could not load products",
        description: error.message,
        variant: "destructive",
      });
      setProducts([]);
      setIsReady(true);
      return;
    }

    setProducts((data ?? []).map(mapManagedProductRow));
    setIsReady(true);
  }, [storeId, supabase]);

  React.useEffect(() => {
    if (!authReady) return;
    refresh();
  }, [authReady, refresh]);

  const saveProduct = React.useCallback(
    async (product: ManagedProduct) => {
      const exists = products.some((item) => item.id === product.id);
      const { error } = await supabase.from("products").upsert(toManagedProductRow(product));

      if (error) {
        toast({
          title: "Could not save product",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: exists ? "Product updated" : "Product added",
        description: `${product.name} was saved.`,
      });
      await refresh();
    },
    [products, supabase, refresh],
  );

  const deleteProduct = React.useCallback(
    async (productId: string) => {
      const product = products.find((item) => item.id === productId);
      const { error } = await supabase.from("products").delete().eq("id", productId);

      if (error) {
        toast({
          title: "Could not delete product",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Product deleted",
        description: `${product?.name ?? "Product"} was removed.`,
      });
      await refresh();
    },
    [products, supabase, refresh],
  );

  const bulkUpdateStatus = React.useCallback(
    async (productIds: string[], status: ProductStatus) => {
      const targets = products.filter((product) => productIds.includes(product.id));
      const results = await Promise.all(
        targets.map((product) =>
          supabase
            .from("products")
            .update({ status: product.stock <= 0 ? "out_of_stock" : status })
            .eq("id", product.id),
        ),
      );
      const failed = results.find((result) => result.error);

      if (failed?.error) {
        toast({
          title: "Bulk update failed",
          description: failed.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Bulk action complete",
        description: `${productIds.length} product${productIds.length === 1 ? "" : "s"} updated.`,
      });
      await refresh();
    },
    [products, supabase, refresh],
  );

  const updateStock = React.useCallback(
    async (productId: string, nextStock: number, note = "Manual inventory adjustment") => {
      const product = products.find((item) => item.id === productId);
      if (!product) return;

      const normalizedStock = Math.max(0, Math.floor(nextStock));
      const change = normalizedStock - product.stock;
      const nextStatus: ProductStatus =
        normalizedStock <= 0
          ? "out_of_stock"
          : product.status === "out_of_stock"
            ? "active"
            : product.status;
      const nextStockHistory =
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
            ];

      const { error } = await supabase
        .from("products")
        .update({
          stock: normalizedStock,
          status: nextStatus,
          metadata: {
            ...toManagedProductMetadata(product),
            stockHistory: nextStockHistory,
          } as unknown as Json,
        })
        .eq("id", productId);

      if (error) {
        toast({
          title: "Could not update stock",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Stock updated", description: "Inventory adjustment was saved." });
      await refresh();
    },
    [products, supabase, refresh],
  );

  const resetProducts = React.useCallback(async () => {
    await refresh();
    toast({ title: "Products refreshed", description: "Vendor product data was reloaded." });
  }, [refresh]);

  return {
    bulkUpdateStatus,
    deleteProduct,
    isReady: isReady && authReady,
    products,
    resetProducts,
    saveProduct,
    updateStock,
  };
}
