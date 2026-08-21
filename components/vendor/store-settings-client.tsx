"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  CreditCard,
  ImagePlus,
  MapPin,
  Palette,
  Save,
  Share2,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categories } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useVendorConnectStatus } from "@/hooks/use-vendor-connect-status";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { vendorStoreSettingsSchema, type VendorStoreSettingsInput } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import { getDefaultStoreSettings, getStoreAvatarLabel } from "@/lib/vendor-store-settings";
import { useVendorStoreSettings } from "@/hooks/use-vendor-store-settings";

const connectCountries = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "FR", label: "France" },
];

function connectStatusBadgeVariant(status?: string) {
  if (status === "active") return "success";
  if (status === "restricted") return "destructive";
  return "neutral";
}

function connectStatusLabel(status?: string) {
  if (status === "active") return "Active";
  if (status === "restricted") return "Restricted";
  if (status === "pending") return "Pending";
  return "Not connected";
}

function VendorPayoutsPanel({ vendorId }: { vendorId?: string }) {
  const { vendor, isReady, refresh } = useVendorConnectStatus(vendorId);
  const [country, setCountry] = React.useState(connectCountries[0].value);
  const [isStarting, setIsStarting] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get("stripe");

    if (stripeParam === "return") {
      // Sync fresh status from Stripe into Supabase first, then re-read it
      // into local state - refresh() alone only re-reads whatever is
      // already in Supabase, it doesn't call Stripe.
      void fetch("/api/vendor/connect/refresh", { method: "POST" })
        .catch(() => null)
        .then(() => refresh())
        .then(() => {
          toast({
            title: "Payout setup updated",
            description: "We checked your Stripe status and updated it below.",
          });
        });
    } else if (stripeParam === "refresh") {
      toast({
        title: "Payout setup paused",
        description: "You can pick up where you left off any time.",
      });
    }

    if (stripeParam) {
      params.delete("stripe");
      const nextUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [refresh]);

  async function startConnect() {
    setIsStarting(true);

    try {
      const response = await fetch("/api/vendor/connect/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Couldn't start payout setup",
          description: data.error ?? "Something went wrong. Please try again.",
          variant: "destructive",
        });
        return;
      }

      window.location.href = data.url;
    } catch {
      toast({
        title: "Couldn't start payout setup",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  }

  const chargesEnabled = Boolean(vendor?.stripeConnectChargesEnabled);
  const hasAccount = Boolean(vendor?.stripeConnectAccountId);

  return (
    <section className="border bg-white p-5">
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-primary" />
        <h2 className="text-xl font-black">Stripe payouts</h2>
        {isReady ? (
          <Badge variant={connectStatusBadgeVariant(vendor?.stripeConnectStatus)}>
            {connectStatusLabel(vendor?.stripeConnectStatus)}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Card payments are paid out directly to your own Stripe account. This currently
        requires a business or bank account in a country Stripe supports (e.g. United
        States, Canada, France) — not yet Haiti directly.
      </p>
      {chargesEnabled ? (
        <p className="mt-3 text-sm font-semibold text-primary">
          Your payout account is active — you can receive card payments.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {!hasAccount ? (
            <label className="grid gap-2 text-sm font-bold">
              Country of your business/bank account
              <select
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {connectCountries.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button type="button" onClick={() => void startConnect()} disabled={isStarting}>
            {hasAccount ? "Continue setup on Stripe" : "Connect with Stripe"}
          </Button>
          {hasAccount ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void fetch("/api/vendor/connect/refresh", { method: "POST" })
                  .catch(() => null)
                  .then(() => refresh())
                  .then(() =>
                    toast({ title: "Status refreshed", description: "Checked the latest status from Stripe." }),
                  )
              }
            >
              Refresh status
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

const departments = [
  "Artibonite",
  "Centre",
  "Grand'Anse",
  "Nippes",
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Ouest",
  "Sud",
  "Sud-Est",
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StoreSettingsClient() {
  const { defaultStoreId, isReady: scopeReady, scopedStores, vendorId } = useVendorScope();
  const [storeId, setStoreId] = React.useState(defaultStoreId);
  const selectedStore = scopedStores.find((store) => store.id === storeId) ?? scopedStores[0];
  const { isReady, saveStoreSettings, settings } = useVendorStoreSettings(storeId, selectedStore);
  const form = useForm<VendorStoreSettingsInput>({
    resolver: zodResolver(vendorStoreSettingsSchema),
    defaultValues: selectedStore ? getDefaultStoreSettings(selectedStore) : undefined,
  });
  const logoPreview = form.watch("logoPreview");
  const coverPreview = form.watch("coverPreview");
  const brandColor = form.watch("brandColor");
  const storeName = form.watch("storeName");
  const deliveryFee = form.watch("deliveryFee");

  React.useEffect(() => {
    if (!isReady || !selectedStore) return;
    form.reset(settings ?? getDefaultStoreSettings(selectedStore));
  }, [form, isReady, selectedStore, settings]);

  React.useEffect(() => {
    if (!scopeReady) return;

    if (!scopedStores.some((store) => store.id === storeId)) {
      setStoreId(defaultStoreId);
    }
  }, [defaultStoreId, scopeReady, scopedStores, storeId]);

  async function handlePreviewFile(field: "logoPreview" | "coverPreview", files: FileList | null) {
    if (!files?.[0]) return;

    const dataUrl = await readFileAsDataUrl(files[0]);
    form.setValue(field, dataUrl, { shouldDirty: true, shouldValidate: true });
  }

  function submitSettings(values: VendorStoreSettingsInput) {
    void saveStoreSettings(storeId, values);
  }

  if (!isReady || !scopeReady || !selectedStore) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <VendorPayoutsPanel vendorId={vendorId} />
      <form className="space-y-6" onSubmit={form.handleSubmit(submitSettings)}>
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Store Settings
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Store settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage storefront details, branding, policies, delivery, social links, and vendor alerts.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[240px_auto]">
            <select
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
            >
              {scopedStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <Button type="submit">
              <Save className="size-4" />
              Save settings
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <SettingsSection icon={Store} title="Store information">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Store name" error={form.formState.errors.storeName?.message}>
                <Input className="rounded-none shadow-none" {...form.register("storeName")} />
              </SettingsField>
              <SettingsField label="Store slug" error={form.formState.errors.storeSlug?.message}>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input className="rounded-none shadow-none" {...form.register("storeSlug")} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      form.setValue("storeSlug", slugify(storeName), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    Suggest
                  </Button>
                </div>
              </SettingsField>
              <SettingsField
                label="Business category"
                error={form.formState.errors.businessCategory?.message}
              >
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("businessCategory")}
                >
                  <option value="Grocery and household essentials">Grocery and household essentials</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </SettingsField>
              <SettingsField label="Phone" error={form.formState.errors.phone?.message}>
                <Input className="rounded-none shadow-none" {...form.register("phone")} />
              </SettingsField>
              <SettingsField
                className="sm:col-span-2"
                label="Description"
                error={form.formState.errors.description?.message}
              >
                <textarea
                  className="min-h-32 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("description")}
                />
              </SettingsField>
            </div>
          </SettingsSection>

          <SettingsSection icon={MapPin} title="Contact details and location">
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsField label="Email" error={form.formState.errors.email?.message}>
                <Input className="rounded-none shadow-none" type="email" {...form.register("email")} />
              </SettingsField>
              <SettingsField label="Department" error={form.formState.errors.department?.message}>
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("department")}
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </SettingsField>
              <SettingsField label="City" error={form.formState.errors.city?.message}>
                <Input className="rounded-none shadow-none" {...form.register("city")} />
              </SettingsField>
              <SettingsField label="Commune" error={form.formState.errors.commune?.message}>
                <Input className="rounded-none shadow-none" {...form.register("commune")} />
              </SettingsField>
              <SettingsField
                className="sm:col-span-2"
                label="Address details"
                error={form.formState.errors.addressDetails?.message}
              >
                <textarea
                  className="min-h-24 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("addressDetails")}
                />
              </SettingsField>
            </div>
          </SettingsSection>

          <SettingsSection icon={ShieldCheck} title="Store policies">
            <div className="grid gap-4">
              <SettingsField label="Return policy" error={form.formState.errors.returnPolicy?.message}>
                <PolicyTextarea {...form.register("returnPolicy")} />
              </SettingsField>
              <SettingsField label="Refund policy" error={form.formState.errors.refundPolicy?.message}>
                <PolicyTextarea {...form.register("refundPolicy")} />
              </SettingsField>
              <SettingsField label="Delivery policy" error={form.formState.errors.deliveryPolicy?.message}>
                <PolicyTextarea {...form.register("deliveryPolicy")} />
              </SettingsField>
              <SettingsField
                label="Terms and conditions"
                error={form.formState.errors.termsAndConditions?.message}
              >
                <PolicyTextarea {...form.register("termsAndConditions")} />
              </SettingsField>
            </div>
          </SettingsSection>
        </div>

        <aside className="space-y-6">
          <SettingsSection icon={Palette} title="Branding">
            <div
              className="relative min-h-36 border"
              style={{ backgroundColor: brandColor || "#0d9488" }}
            >
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="Store cover preview"
                  fill
                  unoptimized
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute bottom-4 left-4 flex items-end gap-3">
                <div className="relative grid size-20 place-items-center overflow-hidden border-4 border-white bg-white text-xl font-black shadow-sm">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Store logo preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    getStoreAvatarLabel(selectedStore, settings ?? undefined)
                  )}
                </div>
                <div className="bg-white px-3 py-2 shadow-sm">
                  <p className="font-black">{storeName || selectedStore.name}</p>
                  <Badge variant={selectedStore.verified ? "success" : "neutral"}>
                    {selectedStore.verified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-center gap-3 border border-dashed bg-muted/30 p-3">
                <ImagePlus className="size-5 text-primary" />
                <span className="text-sm font-bold">Upload logo preview</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => void handlePreviewFile("logoPreview", event.target.files)}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-3 border border-dashed bg-muted/30 p-3">
                <ImagePlus className="size-5 text-primary" />
                <span className="text-sm font-bold">Upload cover image preview</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => void handlePreviewFile("coverPreview", event.target.files)}
                />
              </label>
              <SettingsField label="Brand color" error={form.formState.errors.brandColor?.message}>
                <div className="grid grid-cols-[52px_1fr] gap-2">
                  <Input
                    className="h-10 rounded-none p-1 shadow-none"
                    type="color"
                    {...form.register("brandColor")}
                  />
                  <Input className="rounded-none shadow-none" {...form.register("brandColor")} />
                </div>
              </SettingsField>
            </div>
          </SettingsSection>

          <SettingsSection icon={Truck} title="Delivery preferences">
            <div className="space-y-3">
              <ToggleField label="Offer delivery" {...form.register("offersDelivery")} />
              <ToggleField label="Pickup available" {...form.register("pickupAvailable")} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SettingsField label="Delivery fee" error={form.formState.errors.deliveryFee?.message}>
                  <Input
                    className="rounded-none shadow-none"
                    min="0"
                    step="0.01"
                    type="number"
                    {...form.register("deliveryFee")}
                  />
                </SettingsField>
                <SettingsField
                  label="Delivery estimate"
                  error={form.formState.errors.deliveryEstimate?.message}
                >
                  <Input className="rounded-none shadow-none" {...form.register("deliveryEstimate")} />
                </SettingsField>
              </div>
              <p className="border bg-muted/30 p-3 text-sm text-muted-foreground">
                Current delivery fee:{" "}
                <span className="font-black text-foreground">
                  {formatCurrency(Number(deliveryFee || 0))}
                </span>
              </p>
            </div>
          </SettingsSection>

          <SettingsSection icon={Share2} title="Social links">
            <div className="space-y-4">
              <SettingsField label="Facebook" error={form.formState.errors.socialFacebook?.message}>
                <Input
                  className="rounded-none shadow-none"
                  placeholder="https://facebook.com/store"
                  {...form.register("socialFacebook")}
                />
              </SettingsField>
              <SettingsField label="Instagram" error={form.formState.errors.socialInstagram?.message}>
                <Input
                  className="rounded-none shadow-none"
                  placeholder="https://instagram.com/store"
                  {...form.register("socialInstagram")}
                />
              </SettingsField>
              <SettingsField label="WhatsApp" error={form.formState.errors.socialWhatsapp?.message}>
                <Input
                  className="rounded-none shadow-none"
                  placeholder="+509 3700 0000"
                  {...form.register("socialWhatsapp")}
                />
              </SettingsField>
            </div>
          </SettingsSection>

          <SettingsSection icon={Bell} title="Notification preferences">
            <div className="space-y-3">
              <ToggleField label="New orders" {...form.register("notifyNewOrders")} />
              <ToggleField label="Low stock" {...form.register("notifyLowStock")} />
              <ToggleField label="Customer reviews" {...form.register("notifyCustomerReviews")} />
              <ToggleField label="Payout updates" {...form.register("notifyPayoutUpdates")} />
              <ToggleField label="Promotions" {...form.register("notifyPromotions")} />
              <ToggleField
                label="Marketplace announcements"
                {...form.register("notifyMarketplaceAnnouncements")}
              />
            </div>
          </SettingsSection>
        </aside>
      </div>
      </form>
    </div>
  );
}

function SettingsSection({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <section className="border bg-white p-5">
      <div className="mb-5 flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="text-xl font-black tracking-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SettingsField({
  children,
  className,
  error,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  error?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}

const PolicyTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => (
  <textarea
    ref={ref}
    className="min-h-28 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    {...props}
  />
));
PolicyTextarea.displayName = "PolicyTextarea";

const ToggleField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ label, ...props }, ref) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 border bg-muted/20 p-3 text-sm">
    <span className="font-semibold">{label}</span>
    <input ref={ref} type="checkbox" className="size-5 accent-primary" {...props} />
  </label>
));
ToggleField.displayName = "ToggleField";
