"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Megaphone, Plus, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useVendorProducts } from "@/hooks/use-vendor-products";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { vendorPromotionSchema, type VendorPromotionInput } from "@/lib/schemas";
import type { VendorPromotion } from "@/lib/vendor-commerce";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getRealPromotions, saveRealPromotion } from "@/services/vendor-commerce";

const defaultValues: VendorPromotionInput = {
  name: "",
  discountType: "percentage",
  discountValue: 10,
  productIds: [],
  startDate: "2026-07-20",
  endDate: "2026-07-31",
  usageStatus: "scheduled",
};

export function PromotionsClient() {
  const { products } = useVendorProducts();
  const { defaultStoreId, isReady: scopeReady, scopedStoreIds } = useVendorScope();
  const [promotions, setPromotions] = React.useState<VendorPromotion[]>([]);
  const [promotionsReady, setPromotionsReady] = React.useState(false);
  const scopedProducts = products.filter((product) => scopedStoreIds.has(product.storeId));

  const refreshPromotions = React.useCallback(async () => {
    if (!defaultStoreId) {
      setPromotions([]);
      setPromotionsReady(true);
      return;
    }

    setPromotions(await getRealPromotions(defaultStoreId));
    setPromotionsReady(true);
  }, [defaultStoreId]);

  React.useEffect(() => {
    refreshPromotions();
  }, [refreshPromotions]);

  const form = useForm<VendorPromotionInput>({
    resolver: zodResolver(vendorPromotionSchema),
    defaultValues,
  });
  const selectedProductIds = form.watch("productIds");

  async function submitPromotion(values: VendorPromotionInput) {
    const promotion: VendorPromotion = {
      id: "",
      ...values,
      views: 0,
      orders: 0,
      revenue: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await saveRealPromotion(promotion, defaultStoreId);

    if (!result.ok) {
      toast({
        title: "Could not create promotion",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Promotion created", description: `${promotion.name} is live.` });
    form.reset(defaultValues);
    await refreshPromotions();
  }

  function toggleProduct(productId: string) {
    const nextProductIds = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id) => id !== productId)
      : [...selectedProductIds, productId];

    form.setValue("productIds", nextProductIds, { shouldValidate: true, shouldDirty: true });
  }

  if (!scopeReady || !promotionsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Promotions
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Vendor promotions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Create discounts, attach products, and review simulated campaign performance.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="border bg-white p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            <h2 className="text-xl font-black">Promotion list</h2>
          </div>
          <div className="mt-5 space-y-3">
            {promotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        </section>

        <section className="border bg-white p-5">
          <h2 className="text-xl font-black">Create promotion</h2>
          <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(submitPromotion)}>
            <PromoField label="Promotion name" error={form.formState.errors.name?.message}>
              <Input className="rounded-none shadow-none" {...form.register("name")} />
            </PromoField>
            <div className="grid gap-3 sm:grid-cols-2">
              <PromoField label="Discount type" error={form.formState.errors.discountType?.message}>
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("discountType")}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </PromoField>
              <PromoField label="Discount value" error={form.formState.errors.discountValue?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" step="0.01" {...form.register("discountValue")} />
              </PromoField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PromoField label="Start date" error={form.formState.errors.startDate?.message}>
                <Input className="rounded-none shadow-none" type="date" {...form.register("startDate")} />
              </PromoField>
              <PromoField label="End date" error={form.formState.errors.endDate?.message}>
                <Input className="rounded-none shadow-none" type="date" {...form.register("endDate")} />
              </PromoField>
            </div>
            <PromoField label="Usage status" error={form.formState.errors.usageStatus?.message}>
              <select
                className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("usageStatus")}
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </PromoField>
            <div>
              <Label>Product selection</Label>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto border p-2">
                {scopedProducts.slice(0, 10).map((product) => (
                  <label key={product.id} className="flex cursor-pointer items-center gap-2 border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                    <span className="font-semibold">{product.name}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.productIds?.message ? (
                <p className="mt-1 text-xs font-semibold text-destructive">
                  {form.formState.errors.productIds.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full">
              <Plus className="size-4" />
              Create promotion
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

function PromotionCard({ promotion }: { promotion: VendorPromotion }) {
  return (
    <article className="border p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">{promotion.name}</h3>
            <Badge variant={promotion.usageStatus === "active" ? "success" : "neutral"}>
              {promotion.usageStatus}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {promotion.discountType === "percentage"
              ? `${promotion.discountValue}% off`
              : `${formatCurrency(promotion.discountValue)} off`}{" "}
            - {promotion.productIds.length} products - {formatDate(promotion.startDate)} to{" "}
            {formatDate(promotion.endDate)}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[320px]">
          <PerformanceTile label="Views" value={promotion.views.toString()} />
          <PerformanceTile label="Orders" value={promotion.orders.toString()} />
          <PerformanceTile label="Revenue" value={formatCurrency(promotion.revenue)} />
        </div>
      </div>
    </article>
  );
}

function PerformanceTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-muted/30 p-3">
      <TrendingUp className="size-4 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function PromoField({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
