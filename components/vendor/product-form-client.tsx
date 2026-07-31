"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { ArrowLeft, ImagePlus, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categories } from "@/data/mock-data";
import { useVendorProducts } from "@/hooks/use-vendor-products";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { vendorProductSchema, type VendorProductInput } from "@/lib/schemas";
import {
  createManagedProduct,
  getDefaultStoreId,
  type ManagedProduct,
  updateManagedProduct,
} from "@/lib/vendor-products";
import { toast } from "@/hooks/use-toast";

interface ProductFormClientProps {
  productId?: string;
}

const defaultValues: VendorProductInput = {
  name: "",
  description: "",
  categoryId: categories[0]?.id ?? "",
  brand: "",
  price: 1,
  discountPrice: 0,
  currency: "USD",
  sku: "",
  stock: 0,
  condition: "new",
  lowStockThreshold: 10,
  reservedQuantity: 0,
  weight: 0,
  deliverySettings: "Standard delivery and pickup-ready packaging.",
  status: "draft",
  images: [],
  variants: [],
  attributes: [],
};

function productToFormValues(product: ManagedProduct): VendorProductInput {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    brand: product.brand ?? "",
    price: product.compareAtPrice ?? product.price,
    discountPrice: product.compareAtPrice ? product.price : 0,
    currency: product.currency,
    sku: product.sku,
    stock: product.stock,
    condition: product.condition,
    lowStockThreshold: product.lowStockThreshold,
    reservedQuantity: product.reservedQuantity,
    weight: product.weight,
    deliverySettings: product.deliverySettings,
    status: product.status,
    images: product.images,
    variants: product.variants,
    attributes: product.attributes,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProductFormClient({ productId }: ProductFormClientProps) {
  const router = useRouter();
  const { isReady, products, saveProduct } = useVendorProducts();
  const { defaultStoreId, isReady: scopeReady, scopedStoreIds, scopedStores } = useVendorScope();
  const product = productId ? products.find((item) => item.id === productId) : undefined;
  const isEditing = Boolean(productId);
  const [selectedStoreId, setSelectedStoreId] = React.useState(defaultStoreId);
  const form = useForm<VendorProductInput>({
    resolver: zodResolver(vendorProductSchema),
    defaultValues,
  });
  const variantFields = useFieldArray({
    control: form.control,
    name: "variants",
  });
  const attributeFields = useFieldArray({
    control: form.control,
    name: "attributes",
  });
  const images = form.watch("images");

  React.useEffect(() => {
    if (!isReady) return;
    form.reset(product ? productToFormValues(product) : defaultValues);
  }, [form, isReady, product]);

  React.useEffect(() => {
    if (product?.storeId) {
      setSelectedStoreId(product.storeId);
      return;
    }

    if (!scopedStores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(defaultStoreId);
    }
  }, [defaultStoreId, product?.storeId, scopedStores, selectedStoreId]);

  async function handleImageFiles(files: FileList | null) {
    if (!files?.length) return;

    const nextImages = await Promise.all(Array.from(files).slice(0, 6).map(readFileAsDataUrl));
    form.setValue("images", [...images, ...nextImages].slice(0, 6), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeImage(index: number) {
    form.setValue(
      "images",
      images.filter((_, imageIndex) => imageIndex !== index),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function submitProduct(values: VendorProductInput) {
    const storeId = product?.storeId ?? selectedStoreId ?? defaultStoreId ?? getDefaultStoreId();
    const payload = {
      ...values,
      brand: values.brand || undefined,
      discountPrice: values.discountPrice || undefined,
      storeId,
    };
    const nextProduct = product
      ? updateManagedProduct(product, payload)
      : createManagedProduct(payload);

    saveProduct(nextProduct);
    router.push("/vendor/products");
  }

  if (!isReady || !scopeReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  if (isEditing && (!product || !scopedStoreIds.has(product.storeId))) {
    return (
      <section className="border bg-white p-6">
        <h1 className="text-3xl font-black tracking-normal">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This product could not be found in local vendor product data.
        </p>
        <Button asChild className="mt-5">
          <Link href="/vendor/products">Back to products</Link>
        </Button>
      </section>
    );
  }

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(submitProduct)}>
      <Button asChild variant="ghost" className="px-0">
        <Link href="/vendor/products">
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
      </Button>

      <section className="border bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              {isEditing ? "Edit Product" : "Add Product"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              {isEditing ? product?.name : "Create product"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Product changes are stored in localStorage only. No database or backend is connected.
            </p>
          </div>
          <label className="grid gap-2 text-sm font-bold">
            Store
            <select
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isEditing}
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
            >
              {scopedStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <FormSection title="Product details">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProductField label="Product name" error={form.formState.errors.name?.message}>
                <Input className="rounded-none shadow-none" {...form.register("name")} />
              </ProductField>
              <ProductField label="SKU" error={form.formState.errors.sku?.message}>
                <Input className="rounded-none shadow-none" placeholder="BL-COF-001" {...form.register("sku")} />
              </ProductField>
              <ProductField label="Category" error={form.formState.errors.categoryId?.message}>
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("categoryId")}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </ProductField>
              <ProductField label="Brand" error={form.formState.errors.brand?.message}>
                <Input className="rounded-none shadow-none" {...form.register("brand")} />
              </ProductField>
              <ProductField className="sm:col-span-2" label="Description" error={form.formState.errors.description?.message}>
                <textarea
                  className="min-h-32 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("description")}
                />
              </ProductField>
            </div>
          </FormSection>

          <FormSection title="Pricing and inventory">
            <div className="grid gap-4 sm:grid-cols-3">
              <ProductField label="Currency" error={form.formState.errors.currency?.message}>
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("currency")}
                >
                  <option value="USD">USD</option>
                  <option value="HTG">HTG</option>
                </select>
              </ProductField>
              <ProductField label="Price" error={form.formState.errors.price?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" step="0.01" {...form.register("price")} />
              </ProductField>
              <ProductField label="Discount price" error={form.formState.errors.discountPrice?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" step="0.01" {...form.register("discountPrice")} />
              </ProductField>
              <ProductField label="Stock quantity" error={form.formState.errors.stock?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" {...form.register("stock")} />
              </ProductField>
              <ProductField label="Reserved quantity" error={form.formState.errors.reservedQuantity?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" {...form.register("reservedQuantity")} />
              </ProductField>
              <ProductField label="Low-stock threshold" error={form.formState.errors.lowStockThreshold?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" {...form.register("lowStockThreshold")} />
              </ProductField>
            </div>
          </FormSection>

          <FormSection title="Variants">
            <div className="space-y-3">
              {variantFields.fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 border p-3 md:grid-cols-[1fr_1fr_1fr_120px_auto]">
                  <Input className="rounded-none shadow-none" placeholder="Color" {...form.register(`variants.${index}.name`)} />
                  <Input className="rounded-none shadow-none" placeholder="Blue" {...form.register(`variants.${index}.value`)} />
                  <Input className="rounded-none shadow-none" placeholder="SKU-BLU" {...form.register(`variants.${index}.sku`)} />
                  <Input className="rounded-none shadow-none" type="number" min="0" placeholder="Stock" {...form.register(`variants.${index}.stock`)} />
                  <Button type="button" variant="outline" size="icon" onClick={() => variantFields.remove(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => variantFields.append({ name: "Color", value: "", sku: "", stock: 0 })}
              >
                <Plus className="size-4" />
                Add variant
              </Button>
            </div>
          </FormSection>

          <FormSection title="Attributes">
            <div className="space-y-3">
              {attributeFields.fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 border p-3 md:grid-cols-[1fr_1fr_auto]">
                  <Input className="rounded-none shadow-none" placeholder="Material" {...form.register(`attributes.${index}.name`)} />
                  <Input className="rounded-none shadow-none" placeholder="Cotton" {...form.register(`attributes.${index}.value`)} />
                  <Button type="button" variant="outline" size="icon" onClick={() => attributeFields.remove(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => attributeFields.append({ name: "", value: "" })}
              >
                <Plus className="size-4" />
                Add attribute
              </Button>
            </div>
          </FormSection>
        </div>

        <aside className="space-y-6">
          <FormSection title="Images">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center border border-dashed bg-muted/30 p-4 text-center">
              <ImagePlus className="size-7 text-primary" />
              <span className="mt-2 text-sm font-bold">Upload local previews</span>
              <span className="mt-1 text-xs text-muted-foreground">Stored as browser local preview data.</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => void handleImageFiles(event.target.files)}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div key={`${image}-${index}`} className="relative aspect-square border bg-muted">
                  <Image src={image} alt={`Product preview ${index + 1}`} fill className="object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-2 top-2"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Shipping and status">
            <div className="grid gap-4">
              <ProductField label="Condition" error={form.formState.errors.condition?.message}>
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("condition")}
                >
                  <option value="new">New</option>
                  <option value="used_like_new">Used like new</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </ProductField>
              <ProductField label="Weight" error={form.formState.errors.weight?.message}>
                <Input className="rounded-none shadow-none" type="number" min="0" step="0.1" {...form.register("weight")} />
              </ProductField>
              <ProductField label="Delivery settings" error={form.formState.errors.deliverySettings?.message}>
                <textarea
                  className="min-h-24 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("deliverySettings")}
                />
              </ProductField>
              <ProductField label="Product status" error={form.formState.errors.status?.message}>
                <select
                  className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register("status")}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </ProductField>
              <Button type="submit" className="w-full">
                <Save className="size-4" />
                {isEditing ? "Save changes" : "Add product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  toast({
                    title: "Preview saved locally",
                    description: "Use Preview from the product table after saving this product.",
                  })
                }
              >
                Preview action
              </Button>
            </div>
          </FormSection>
        </aside>
      </div>
    </form>
  );
}

function FormSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border bg-white p-5">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProductField({
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
