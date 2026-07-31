"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  ImagePlus,
  ShieldCheck,
  Store,
} from "lucide-react";

import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminManagement } from "@/hooks/use-admin-management";
import {
  vendorApplicationSchema,
  type VendorApplicationInput,
} from "@/lib/schemas";
import { cn, formatDate } from "@/lib/utils";
import type { VendorApplication } from "@/lib/admin-management";

const fieldClassName = "rounded-none shadow-none";

const categories = [
  "Electronics",
  "Phones and Accessories",
  "Fashion",
  "Beauty and Personal Care",
  "Home and Kitchen",
  "Grocery",
  "Appliances",
  "Baby Products",
  "Books and Education",
  "Local Artisan Products",
];

const sellerTypes = ["Business", "Individual"];

const departments = [
  "Ouest",
  "Nord",
  "Sud",
  "Artibonite",
  "Centre",
  "Grand'Anse",
  "Nippes",
  "Nord-Est",
  "Nord-Ouest",
  "Sud-Est",
];

type ApplicationField = keyof VendorApplicationInput;

const applicationSteps: Array<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: ApplicationField[];
}> = [
  {
    title: "Seller",
    description: "Business or individual seller identity.",
    icon: BriefcaseBusiness,
    fields: [
      "businessName",
      "businessType",
      "businessCategory",
      "email",
      "phone",
      "phoneVerified",
      "emailVerified",
      "website",
      "socialLinks",
      "yearsInBusiness",
      "department",
      "city",
      "commune",
      "addressDetails",
      "landmark",
      "pickupAddress",
    ],
  },
  {
    title: "Legal & Identity",
    description: "ID and legal documents for review.",
    icon: ShieldCheck,
    fields: [
      "ownerName",
      "governmentIdType",
      "idDocumentPreview",
      "idExpirationDate",
      "businessRegistrationNumber",
      "taxId",
    ],
  },
  {
    title: "Store",
    description: "Storefront, product focus, and operations.",
    icon: Store,
    fields: [
      "storeSlug",
      "description",
      "productFocus",
      "estimatedProductCount",
      "logoPreview",
      "coverPreview",
      "brandColor",
      "profileDisplayName",
      "profileBio",
      "deliveryOptions",
      "deliveryZones",
      "returnPolicy",
      "refundPolicy",
      "businessHours",
      "processingTime",
    ],
  },
  {
    title: "Payout & Agreement",
    description: "Payout setup and vendor commitments.",
    icon: CreditCard,
    fields: [
      "payoutMethod",
      "payoutAccountName",
      "payoutAccountReference",
      "payoutRoutingNumber",
      "payoutAccountNumber",
      "payoutAccountType",
      "payoutEmail",
      "payoutStripeAccountId",
      "agreesToTerms",
      "confirmsAuthenticProducts",
      "confirmsFulfillment",
      "acceptsCommission",
    ],
  },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs font-semibold text-destructive">{message}</p>;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function VendorApplicationClient() {
  const { isReady, submitVendorApplication } = useAdminManagement();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [submittedApplication, setSubmittedApplication] =
    React.useState<VendorApplication | null>(null);

  const form = useForm<VendorApplicationInput>({
    resolver: zodResolver(vendorApplicationSchema),
    mode: "onTouched",
    defaultValues: {
      businessName: "",
      businessType: "Business",
      ownerName: "",
      email: "",
      phone: "",
      website: "",
      socialLinks: "",
      yearsInBusiness: 0,
      department: "Ouest",
      city: "",
      commune: "",
      addressDetails: "",
      landmark: "",
      pickupAddress: "",
      businessCategory: "Local Artisan Products",
      productFocus: "",
      estimatedProductCount: 10,
      storeSlug: "",
      logoPreview: "",
      coverPreview: "",
      brandColor: "#175C9E",
      description: "",
      deliveryOptions: ["pickup"],
      deliveryZones: "",
      returnPolicy: "",
      refundPolicy: "",
      businessHours: "Mon-Fri, 9 AM - 5 PM",
      processingTime: "1-2 business days",
      governmentIdType: "national_id",
      idDocumentPreview: "",
      idExpirationDate: "",
      businessRegistrationNumber: "",
      taxId: "",
      phoneVerified: false,
      emailVerified: false,
      profileDisplayName: "",
      profileBio: "",
      payoutMethod: "MonCash",
      payoutAccountName: "",
      payoutAccountReference: "",
      payoutRoutingNumber: "",
      payoutAccountNumber: "",
      payoutAccountType: "Checking",
      payoutEmail: "",
      payoutStripeAccountId: "",
      agreesToTerms: false,
      confirmsAuthenticProducts: false,
      confirmsFulfillment: false,
      acceptsCommission: false,
    },
  });

  const logoPreview = form.watch("logoPreview");
  const coverPreview = form.watch("coverPreview");
  const idDocumentPreview = form.watch("idDocumentPreview");
  const brandColor = form.watch("brandColor");
  const businessName = form.watch("businessName");
  const sellerType = form.watch("businessType");
  const phoneVerified = form.watch("phoneVerified");
  const emailVerified = form.watch("emailVerified");
  const payoutMethod = form.watch("payoutMethod");
  const currentStepConfig = applicationSteps[currentStep];
  const isLastStep = currentStep === applicationSteps.length - 1;

  React.useEffect(() => {
    const currentSlug = form.getValues("storeSlug");

    if (!currentSlug && businessName) {
      form.setValue("storeSlug", slugify(businessName), { shouldValidate: true });
    }

    if (!form.getValues("profileDisplayName") && businessName) {
      form.setValue("profileDisplayName", businessName, { shouldValidate: true });
    }
  }, [businessName, form]);

  async function handlePreviewFile(
    field: "logoPreview" | "coverPreview" | "idDocumentPreview",
    files: FileList | null,
  ) {
    const file = files?.[0];

    if (!file) return;

    const preview = await fileToDataUrl(file);
    form.setValue(field, preview, { shouldDirty: true, shouldValidate: true });
  }

  async function goNext() {
    const isStepValid = await form.trigger(currentStepConfig.fields);

    if (!isStepValid) return;

    setCurrentStep((step) => Math.min(step + 1, applicationSteps.length - 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function onSubmit(values: VendorApplicationInput) {
    const application = submitVendorApplication(values);

    if (application) {
      setSubmittedApplication(application);
      setCurrentStep(0);
      form.reset();
    }
  }

  function renderInput(
    name: ApplicationField,
    label: string,
    options: {
      type?: string;
      placeholder?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    } = {},
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          type={options.type}
          inputMode={options.inputMode}
          className={fieldClassName}
          placeholder={options.placeholder}
          {...form.register(name)}
        />
        <FieldError message={form.formState.errors[name]?.message as string | undefined} />
      </div>
    );
  }

  function renderTextarea(
    name: ApplicationField,
    label: string,
    placeholder?: string,
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <textarea
          id={name}
          className="min-h-28 w-full border bg-white p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={placeholder}
          {...form.register(name)}
        />
        <FieldError message={form.formState.errors[name]?.message as string | undefined} />
      </div>
    );
  }

  function renderSelect(
    name: ApplicationField,
    label: string,
    values: string[],
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <select
          id={name}
          className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...form.register(name)}
        >
          {values.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <FieldError message={form.formState.errors[name]?.message as string | undefined} />
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="container py-8">
        <div className="h-8 w-48 animate-pulse bg-muted" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="h-80 animate-pulse border bg-muted" />
          <div className="h-[520px] animate-pulse border bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="container py-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Become a vendor" },
          ]}
        />
      </div>

      <section className="border-y bg-white">
        <div className="container grid gap-8 py-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-5">
            <Badge variant="secondary" className="rounded-none">
              Vendor program
            </Badge>
            <div>
              <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
                Sell on Maket Lakay
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                Apply to reach customers in Haiti and the Haitian diaspora with a
                storefront built for trusted local commerce.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["Apply", "Share account, verification, profile, and payout details.", FileText],
                ["Review", "Admin checks the application locally.", ClipboardCheck],
                ["Launch", "Approved vendors can switch into a vendor dashboard.", Store],
              ].map(([title, description, Icon]) => (
                <div key={title as string} className="border bg-muted/20 p-4">
                  <Icon className="size-5 text-primary" />
                  <p className="mt-3 font-black">{title as string}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description as string}
                  </p>
                </div>
              ))}
            </div>
            <div className="border bg-primary/5 p-4 text-sm leading-6">
              <div className="flex items-center gap-2 font-black">
                <ShieldCheck className="size-4 text-primary" />
                Frontend-only demo
              </div>
              <p className="mt-2 text-muted-foreground">
                This creates a local application in your browser. No backend,
                database, document storage, or real verification service is connected.
              </p>
            </div>
          </div>

          <div className="border bg-white p-5 shadow-sm">
            {submittedApplication ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 border bg-emerald-50 p-4 text-emerald-950">
                  <CheckCircle2 className="mt-0.5 size-5" />
                  <div>
                    <h2 className="text-xl font-black">Application submitted</h2>
                    <p className="mt-1 text-sm leading-6">
                      {submittedApplication.businessName} is now waiting for
                      admin review.
                    </p>
                  </div>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="border bg-muted/20 p-3">
                    <dt className="text-muted-foreground">Application ID</dt>
                    <dd className="mt-1 font-black">{submittedApplication.id}</dd>
                  </div>
                  <div className="border bg-muted/20 p-3">
                    <dt className="text-muted-foreground">Submitted</dt>
                    <dd className="mt-1 font-black">
                      {formatDate(submittedApplication.submittedAt)}
                    </dd>
                  </div>
                  <div className="border bg-muted/20 p-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <Badge variant="neutral" className="rounded-none">
                        {submittedApplication.status.replaceAll("_", " ")}
                      </Badge>
                    </dd>
                  </div>
                  <div className="border bg-muted/20 p-3">
                    <dt className="text-muted-foreground">Store slug</dt>
                    <dd className="mt-1 font-black">{submittedApplication.storeSlug}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/admin/vendors">
                      Review in admin
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSubmittedApplication(null)}
                  >
                    Submit another
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                  <h2 className="text-2xl font-black tracking-normal">
                    Vendor application
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete each step so the admin team can review the seller.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  {applicationSteps.map((step, index) => {
                    const Icon = step.icon;

                    return (
                      <button
                        key={step.title}
                        type="button"
                        className={cn(
                          "border p-3 text-left transition-colors",
                          index === currentStep
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-muted/20 hover:bg-muted",
                        )}
                        onClick={() => setCurrentStep(index)}
                      >
                        <span className="flex items-center gap-2 text-sm font-black">
                          <Icon className="size-4" />
                          {step.title}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block text-xs leading-5",
                            index === currentStep
                              ? "text-primary-foreground/85"
                              : "text-muted-foreground",
                          )}
                        >
                          {step.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="border bg-muted/10 p-4">
                  {currentStep === 0 ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderInput("businessName", "Business or public seller name")}
                        {renderSelect("businessType", "Seller type", sellerTypes)}
                        {renderSelect("businessCategory", "Primary category", categories)}
                        {renderInput("yearsInBusiness", "Years in business", {
                          type: "number",
                          inputMode: "numeric",
                        })}
                        {renderInput("email", "Account email", { type: "email" })}
                        {renderInput("phone", "Account phone", {
                          placeholder: "+509 37 00 0000",
                        })}
                        <div className="border bg-white p-4">
                          <p className="text-sm font-black">Phone verification</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Simulates sending a code to {form.watch("phone") || "the account phone"}.
                          </p>
                          <Button
                            type="button"
                            variant={phoneVerified ? "default" : "outline"}
                            className="mt-3 w-full"
                            onClick={() =>
                              form.setValue("phoneVerified", true, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            {phoneVerified ? "Phone verified" : "Verify phone"}
                          </Button>
                          <FieldError message={form.formState.errors.phoneVerified?.message} />
                        </div>
                        <div className="border bg-white p-4">
                          <p className="text-sm font-black">Email verification</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Simulates sending a link to {form.watch("email") || "the account email"}.
                          </p>
                          <Button
                            type="button"
                            variant={emailVerified ? "default" : "outline"}
                            className="mt-3 w-full"
                            onClick={() =>
                              form.setValue("emailVerified", true, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            {emailVerified ? "Email verified" : "Verify email"}
                          </Button>
                          <FieldError message={form.formState.errors.emailVerified?.message} />
                        </div>
                        {renderInput("website", "Website", {
                          placeholder: "https://example.com",
                        })}
                        {renderInput("socialLinks", "Social links", {
                          placeholder: "Instagram, Facebook, WhatsApp",
                        })}
                        {renderSelect("department", "Department", departments)}
                        {renderInput("city", "City")}
                        {renderInput("commune", "Commune")}
                        {renderInput("landmark", "Landmark", {
                          placeholder: "Near church, school, market...",
                        })}
                      </div>
                      {renderTextarea(
                        "addressDetails",
                        "Seller address details",
                        "Street, building, market stall, or office details",
                      )}
                      {renderTextarea(
                        "pickupAddress",
                        "Pickup address if different",
                        "Optional pickup address for marketplace/delivery teams",
                      )}
                    </div>
                  ) : null}

                  {currentStep === 1 ? (
                    <div className="space-y-4">
                      <div className="border bg-white p-4">
                        <p className="text-sm font-black">
                          {sellerType === "Business"
                            ? "Business legal requirements"
                            : "Individual identity requirements"}
                        </p>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          {(sellerType === "Business"
                            ? [
                                "Legal business registration",
                                "EIN",
                                "Upload unexpired owner ID",
                              ]
                            : [
                                "Upload unexpired ID",
                              ]
                          ).map((item) => (
                            <span key={item} className="border bg-muted/20 px-3 py-2">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderInput("ownerName", "Owner full name")}
                        {renderSelect("governmentIdType", "ID type", [
                          "national_id",
                          "passport",
                          "driver_license",
                          "business_registration",
                        ])}
                        {renderInput("idExpirationDate", "ID expiration date", {
                          type: "date",
                        })}
                        {sellerType === "Business"
                          ? renderInput(
                              "businessRegistrationNumber",
                              "Legal business registration",
                              { placeholder: "Registration number" },
                            )
                          : null}
                        {sellerType === "Business"
                          ? renderInput("taxId", "EIN", {
                              placeholder: "Business EIN / tax identifier",
                            })
                          : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="idDocumentFile">
                          {sellerType === "Business"
                            ? "Upload unexpired ID of the owner"
                            : "Upload unexpired ID"}
                        </Label>
                        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border bg-white p-4 text-center text-sm text-muted-foreground">
                          {idDocumentPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={idDocumentPreview}
                              alt="Unexpired ID preview"
                              className="h-28 max-w-full object-contain"
                            />
                          ) : (
                            <>
                              <ImagePlus className="size-6 text-primary" />
                              Upload ID preview
                            </>
                          )}
                          <input
                            id="idDocumentFile"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) =>
                              void handlePreviewFile("idDocumentPreview", event.target.files)
                            }
                          />
                        </label>
                        <FieldError message={form.formState.errors.idDocumentPreview?.message} />
                      </div>

                      <div className="border bg-white p-4 text-sm leading-6 text-muted-foreground">
                        This is a frontend-only simulation. ID images and legal
                        details stay in local state only; no real document or
                        business registry service is connected.
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 2 ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderInput("profileDisplayName", "Profile display name", {
                          placeholder: "Name customers will see",
                        })}
                        {renderTextarea(
                          "profileBio",
                          "Seller profile bio",
                          "Tell customers who you are and why they can trust this seller profile.",
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderInput("storeSlug", "Desired store slug", {
                          placeholder: "bel-lakay-market",
                        })}
                        {renderInput("estimatedProductCount", "Estimated products", {
                          type: "number",
                          inputMode: "numeric",
                        })}
                        {renderInput("productFocus", "Products you plan to sell", {
                          placeholder: "Coffee, school supplies, handmade bags",
                        })}
                        <div className="space-y-2">
                          <Label htmlFor="brandColor">Brand color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="brandColor"
                              type="color"
                              className="h-10 w-16 border bg-white p-1 shadow-none"
                              {...form.register("brandColor")}
                            />
                            <Input
                              aria-label="Brand color hex"
                              className={fieldClassName}
                              {...form.register("brandColor")}
                            />
                          </div>
                          <FieldError message={form.formState.errors.brandColor?.message} />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="logoFile">Store logo preview</Label>
                          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border bg-white p-4 text-center text-sm text-muted-foreground">
                            {logoPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logoPreview} alt="Store logo preview" className="size-20 object-cover" />
                            ) : (
                              <>
                                <ImagePlus className="size-6 text-primary" />
                                Upload logo preview
                              </>
                            )}
                            <input
                              id="logoFile"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) =>
                                void handlePreviewFile("logoPreview", event.target.files)
                              }
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="coverFile">Cover image preview</Label>
                          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border bg-white p-4 text-center text-sm text-muted-foreground">
                            {coverPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={coverPreview} alt="Store cover preview" className="h-24 w-full object-cover" />
                            ) : (
                              <>
                                <ImagePlus className="size-6 text-primary" />
                                Upload cover preview
                              </>
                            )}
                            <input
                              id="coverFile"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(event) =>
                                void handlePreviewFile("coverPreview", event.target.files)
                              }
                            />
                          </label>
                        </div>
                      </div>

                      {renderTextarea(
                        "description",
                        "Store description",
                        "What makes this store useful and trustworthy?",
                      )}

                      <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Delivery options</legend>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[
                            ["pickup", "Pickup"],
                            ["local_delivery", "Local delivery"],
                            ["marketplace_delivery", "Marketplace delivery"],
                          ].map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 border bg-white p-3 text-sm">
                              <input
                                type="checkbox"
                                value={value}
                                {...form.register("deliveryOptions")}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <FieldError message={form.formState.errors.deliveryOptions?.message} />
                      </fieldset>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderInput("deliveryZones", "Delivery zones served", {
                          placeholder: "Petion-Ville, Delmas, Jacmel...",
                        })}
                        {renderInput("businessHours", "Business hours")}
                        {renderInput("processingTime", "Average processing time")}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderTextarea("returnPolicy", "Return policy")}
                        {renderTextarea("refundPolicy", "Refund policy")}
                      </div>

                      <div className="border bg-white p-4 text-sm">
                        <p className="font-black">Store preview</p>
                        <div className="mt-3 flex items-center gap-3">
                          <span
                            className="flex size-12 items-center justify-center text-sm font-black text-white"
                            style={{ backgroundColor: brandColor }}
                          >
                            {logoPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={logoPreview} alt="" className="size-12 object-cover" />
                            ) : (
                              businessName
                                .split(/\s+/)
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() || "ML"
                            )}
                          </span>
                          <div>
                            <p className="font-black">{businessName || "Your store name"}</p>
                            <p className="text-muted-foreground">
                              {form.watch("commune") || "Commune"}, Haiti
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {currentStep === 3 ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderSelect("payoutMethod", "Preferred payout method", [
                          "MonCash",
                          "NatCash",
                          "ACH",
                          "Zelle",
                          "PayPal",
                          "Stripe",
                        ])}
                        {renderInput("payoutAccountName", "Account holder name")}
                        {["MonCash", "NatCash"].includes(payoutMethod)
                          ? renderInput("payoutAccountReference", `${payoutMethod} phone number`, {
                              placeholder: "+509 37 00 0000",
                            })
                          : null}
                        {payoutMethod === "ACH"
                          ? (
                              <>
                                {renderInput("payoutRoutingNumber", "Routing number", {
                                  inputMode: "numeric",
                                })}
                                {renderInput("payoutAccountNumber", "Account number", {
                                  inputMode: "numeric",
                                })}
                                {renderSelect("payoutAccountType", "Account type", [
                                  "Checking",
                                  "Savings",
                                  "Business checking",
                                ])}
                              </>
                            )
                          : null}
                        {payoutMethod === "Zelle"
                          ? renderInput("payoutEmail", "Zelle email or phone", {
                              placeholder: "seller@example.com or phone number",
                            })
                          : null}
                        {payoutMethod === "PayPal"
                          ? renderInput("payoutEmail", "PayPal email", {
                              type: "email",
                              placeholder: "seller@example.com",
                            })
                          : null}
                        {payoutMethod === "Stripe"
                          ? renderInput("payoutStripeAccountId", "Stripe account ID or email", {
                              placeholder: "acct_... or seller@example.com",
                            })
                          : null}
                      </div>

                      <div className="space-y-2">
                        {[
                          [
                            "agreesToTerms",
                            "I agree to the Maket Lakay vendor terms.",
                          ],
                          [
                            "confirmsAuthenticProducts",
                            "I confirm the business will list legal and authentic products.",
                          ],
                          [
                            "confirmsFulfillment",
                            "I confirm the business can process and fulfill customer orders.",
                          ],
                          [
                            "acceptsCommission",
                            "I accept the simulated marketplace commission agreement.",
                          ],
                        ].map(([name, label]) => (
                          <label
                            key={name}
                            className="flex items-start gap-3 border bg-white p-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              {...form.register(name as ApplicationField)}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                        <FieldError message={form.formState.errors.agreesToTerms?.message} />
                        <FieldError message={form.formState.errors.confirmsAuthenticProducts?.message} />
                        <FieldError message={form.formState.errors.confirmsFulfillment?.message} />
                        <FieldError message={form.formState.errors.acceptsCommission?.message} />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={currentStep === 0}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>

                  {isLastStep ? (
                    <Button type="submit">
                      Submit application
                      <ArrowRight className="size-4" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => void goNext()}>
                      Continue
                      <ArrowRight className="size-4" />
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
