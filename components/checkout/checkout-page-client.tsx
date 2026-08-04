"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";

import { OrderSummaryCard } from "@/components/checkout/order-summary-card";
import { EmptyState } from "@/components/marketplace/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentMethods } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { buildCartSummary, createOrderSnapshot, type CartSummary } from "@/lib/checkout";
import {
  createCustomerNotification,
  createDeliveryAssignment,
  createOrdersFromSnapshot,
  findDeliveryZone,
} from "@/lib/orders";
import { createWebhookEvent, processPayment } from "@/lib/payments";
import { checkoutAddressSchema, type CheckoutAddressInput } from "@/lib/schemas";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/client";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { createRealOrders } from "@/services/orders";
import { getRealAddresses, saveRealAddress } from "@/services/users";
import type { CustomerAddress, PaymentMethod, PaymentRecord } from "@/types";

type CheckoutStep = "address" | "delivery" | "payment" | "review";

const checkoutSteps: Array<{ id: CheckoutStep; label: string }> = [
  { id: "address", label: "Delivery Address" },
  { id: "delivery", label: "Delivery Method" },
  { id: "payment", label: "Digital Payment" },
  { id: "review", label: "Order Review" },
];

const deliveryMethods = [
  {
    id: "standard",
    label: "Standard Delivery",
    description: "Reliable local delivery grouped by vendor routes.",
    feeMultiplier: 1,
    etaDays: 3,
  },
  {
    id: "express",
    label: "Express Delivery",
    description: "Priority dispatch when vendors have items ready.",
    feeMultiplier: 1.65,
    etaDays: 1,
  },
  {
    id: "pickup",
    label: "Pickup Location",
    description: "Pick up at a partner point after vendor confirmation.",
    feeMultiplier: 0,
    etaDays: 2,
  },
];

const paymentOptions = [
  {
    id: "card",
    label: "Credit or Debit Card",
    description: "Secure card payment via Stripe. Card details never touch our servers.",
    icon: CreditCard,
  },
  {
    id: "moncash",
    label: "MonCash",
    description: "Simulated Haitian mobile wallet checkout.",
    icon: WalletCards,
  },
  {
    id: "natcash",
    label: "NatCash",
    description: "Simulated NatCash payment confirmation.",
    icon: WalletCards,
  },
  {
    id: "bank-transfer",
    label: "Bank Transfer",
    description: "Bank transfer instructions for order review.",
    icon: Banknote,
  },
  {
    id: "declined-test",
    label: "Declined Test Payment",
    description: "Preview failed-payment handling and retry checkout.",
    icon: AlertTriangle,
  },
];

const fieldClassName = "rounded-none shadow-none";

function getEstimatedDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getDeliveryFee(summary: CartSummary, methodId: string) {
  const method = deliveryMethods.find((item) => item.id === methodId) ?? deliveryMethods[0];
  return Math.round(summary.deliveryFee * method.feeMultiplier * 100) / 100;
}

function getMockPaymentMethod(methodId: string): PaymentMethod {
  if (methodId === "declined-test") {
    return paymentMethods.find((method) => method.id === "pay-declined") ?? paymentMethods[0];
  }

  const typeByCheckoutMethod: Record<string, PaymentMethod["type"]> = {
    card: "card",
    moncash: "moncash",
    natcash: "natcash",
    "bank-transfer": "paypal",
  };
  const methodType = typeByCheckoutMethod[methodId] ?? "moncash";

  return (
    paymentMethods.find(
      (method) => method.type === methodType && method.testBehavior !== "failure",
    ) ?? paymentMethods[0]
  );
}

function getSelectedAddressDetails(address: CustomerAddress) {
  return [
    address.line1,
    address.line2,
    address.commune,
    address.zone,
    address.city,
    address.region,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

type CardConfirmResult =
  | { ok: true; paymentIntentId: string }
  | { ok: false; reason: string };

interface CardPaymentHandle {
  confirmPayment: () => Promise<CardConfirmResult>;
}

/**
 * Mounted inside <Elements>, which is the only place Stripe's useStripe()/
 * useElements() hooks work. Exposes an imperative confirmPayment() so
 * placeOrder() (in the parent, outside the Elements tree) can trigger the
 * real card charge without itself needing to live inside that tree.
 */
const CardPaymentStep = React.forwardRef<CardPaymentHandle, { onReady: (ready: boolean) => void }>(
  function CardPaymentStep({ onReady }, ref) {
    const stripe = useStripe();
    const elements = useElements();

    React.useEffect(() => {
      onReady(Boolean(stripe && elements));
    }, [stripe, elements, onReady]);

    React.useImperativeHandle(ref, () => ({
      async confirmPayment(): Promise<CardConfirmResult> {
        if (!stripe || !elements) {
          return { ok: false, reason: "The card form is not ready yet." };
        }

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/checkout/confirmation`,
          },
        });

        if (error) {
          return { ok: false, reason: error.message ?? "The card was declined." };
        }

        if (paymentIntent?.status !== "succeeded") {
          return { ok: false, reason: `Payment status: ${paymentIntent?.status ?? "unknown"}.` };
        }

        return { ok: true, paymentIntentId: paymentIntent.id };
      },
    }));

    return <PaymentElement />;
  },
);

export function CheckoutPageClient() {
  const router = useRouter();
  const { user, isReady: authReady } = useAuth();
  const {
    cart,
    clearCart,
    isReady,
    saveCustomerNotification,
    saveDeliveryAssignment,
    saveLocalOrders,
    saveOrderSnapshot,
    savePaymentRecord,
    savePaymentWebhook,
  } = useMarketplaceStorage();
  const [step, setStep] = React.useState<CheckoutStep>("address");
  const [addresses, setAddresses] = React.useState<CustomerAddress[]>([]);
  const [addressesReady, setAddressesReady] = React.useState(false);
  const [addressId, setAddressId] = React.useState("");
  const [showAddressForm, setShowAddressForm] = React.useState(false);
  const [deliveryMethodId, setDeliveryMethodId] = React.useState("standard");
  const [paymentMethodId, setPaymentMethodId] = React.useState("moncash");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const addressForm = useForm<CheckoutAddressInput>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      department: "Ouest",
      city: "",
      commune: "",
      zone: "",
      landmark: "",
      addressDetails: "",
    },
  });

  const refreshAddresses = React.useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setAddressesReady(true);
      return;
    }

    setAddressesReady(false);
    setAddresses(await getRealAddresses(user.id));
    setAddressesReady(true);
  }, [user]);

  React.useEffect(() => {
    refreshAddresses();
  }, [refreshAddresses]);

  React.useEffect(() => {
    if (!addressId && addresses.length > 0) {
      setAddressId(addresses.find((address) => address.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, addressId]);

  React.useEffect(() => {
    if (addressesReady && addresses.length === 0) {
      setShowAddressForm(true);
    }
  }, [addressesReady, addresses.length]);

  const selectedAddress = addresses.find((address) => address.id === addressId) ?? addresses[0];
  const selectedDeliveryMethod =
    deliveryMethods.find((method) => method.id === deliveryMethodId) ?? deliveryMethods[0];
  const selectedPayment =
    paymentOptions.find((payment) => payment.id === paymentMethodId) ?? paymentOptions[0];
  const summary = buildCartSummary(cart, selectedAddress);
  const deliveryFee = getDeliveryFee(summary, deliveryMethodId);
  const discount = 0;
  const total = Math.max(0, summary.subtotal + deliveryFee - discount);
  const currentStepIndex = checkoutSteps.findIndex((item) => item.id === step);

  const stripeConfigured = isStripeConfigured();
  const stripePromise = React.useMemo(() => getStripeClient(), []);
  const cardPaymentRef = React.useRef<CardPaymentHandle>(null);
  const [cardReady, setCardReady] = React.useState(false);
  const [cardClientSecret, setCardClientSecret] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!stripeConfigured || paymentMethodId !== "card" || total <= 0) {
      setCardClientSecret(null);
      setCardReady(false);
      return;
    }

    let active = true;

    fetch("/api/checkout/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        if (data.clientSecret) {
          setCardClientSecret(data.clientSecret);
        } else {
          toast({
            title: "Card payment unavailable",
            description: data.error ?? "Could not start a card payment.",
            variant: "destructive",
          });
        }
      })
      .catch(() => {
        if (active) {
          toast({
            title: "Card payment unavailable",
            description: "Could not reach the payment server.",
            variant: "destructive",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [stripeConfigured, paymentMethodId, total]);

  const canPlaceOrder =
    isReady &&
    cart.length > 0 &&
    selectedAddress &&
    summary.stockIssues.length === 0 &&
    (paymentMethodId !== "card" || (stripeConfigured && cardReady));

  async function createAddress(values: CheckoutAddressInput) {
    if (!user) return;

    const newAddress: CustomerAddress = {
      id: `addr-local-${Date.now()}`,
      customerId: user.id,
      label: "Saved address",
      recipientName: `${values.firstName} ${values.lastName}`,
      phone: values.phone,
      line1: values.addressDetails,
      line2: values.landmark || undefined,
      city: values.city,
      region: values.department,
      country: "Haiti",
      commune: values.commune,
      zone: values.zone,
      landmark: values.landmark || undefined,
    };

    const result = await saveRealAddress(newAddress, user.id);

    if (!result.ok) {
      toast({
        title: "Could not save address",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    await refreshAddresses();
    setAddressId(result.address.id);
    setShowAddressForm(false);
  }

  function goNext() {
    if (step === "address") {
      if (showAddressForm) {
        void addressForm.handleSubmit(createAddress)();
        return;
      }
      if (!selectedAddress) {
        toast({
          title: "Add a delivery address",
          description: "You need at least one saved address to continue.",
          variant: "destructive",
        });
        setShowAddressForm(true);
        return;
      }
      setStep("delivery");
      return;
    }

    if (step === "delivery") {
      setStep("payment");
      return;
    }

    if (step === "payment") {
      setStep("review");
    }
  }

  function goBack() {
    if (step === "review") setStep("payment");
    if (step === "payment") setStep("delivery");
    if (step === "delivery") setStep("address");
  }

  async function placeOrder() {
    if (!canPlaceOrder || isProcessing || !selectedAddress || !user) {
      return;
    }

    setIsProcessing(true);

    const orderId = `ML-${Date.now().toString().slice(-6)}`;
    const adjustedSummary = {
      ...summary,
      deliveryFee,
      total,
      groups: summary.groups.map((group) => ({
        ...group,
        deliveryFee:
          summary.deliveryFee > 0
            ? Math.round(group.deliveryFee * selectedDeliveryMethod.feeMultiplier * 100) /
              100
            : 0,
      })),
    };

    let payment: PaymentRecord;

    if (paymentMethodId === "card") {
      const result = await cardPaymentRef.current?.confirmPayment();

      if (!result || !result.ok) {
        setIsProcessing(false);
        toast({
          title: "Payment failed",
          description: result?.reason ?? "Card payment could not be confirmed.",
          variant: "destructive",
        });
        return;
      }

      payment = {
        id: `payrec-${Date.now()}`,
        orderId,
        provider: "card",
        methodId: "pay-card",
        status: "captured",
        amount: total,
        currency: "USD",
        providerReference: result.paymentIntentId,
        verificationCode: result.paymentIntentId,
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      };
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 700));

      const mockPaymentMethod = getMockPaymentMethod(paymentMethodId);
      const result = await processPayment({
        orderId,
        amount: total,
        currency: "USD",
        method: mockPaymentMethod,
      });

      if (result.payment.status === "failed") {
        savePaymentRecord(result.payment);
        savePaymentWebhook(createWebhookEvent(result.payment));
        setIsProcessing(false);
        setStep("payment");
        toast({
          title: "Payment failed",
          description: result.payment.failureReason ?? "Choose another payment method and try again.",
          variant: "destructive",
        });
        return;
      }

      payment = result.payment;
    }

    const snapshot = createOrderSnapshot(adjustedSummary, selectedAddress.id, paymentMethodId, payment, {
      id: orderId,
      deliveryMethodId,
      deliveryMethodLabel: selectedDeliveryMethod.label,
      paymentMethodLabel: selectedPayment.label,
      discount,
      trackingHref: `/orders/${orderId}/tracking`,
      deliveryAddress: {
        recipientName: selectedAddress.recipientName,
        phone: selectedAddress.phone,
        line1: selectedAddress.line1,
        line2: selectedAddress.line2,
        city: selectedAddress.city,
        region: selectedAddress.region,
        country: selectedAddress.country,
        commune: selectedAddress.commune,
        zone: selectedAddress.zone,
        landmark: selectedAddress.landmark,
      },
    });
    const createdOrders = createOrdersFromSnapshot(snapshot, selectedAddress);
    const deliveryZone = findDeliveryZone(selectedAddress);

    saveOrderSnapshot(snapshot);
    savePaymentRecord(payment);
    savePaymentWebhook(createWebhookEvent(payment));
    saveLocalOrders(createdOrders);
    createdOrders.forEach((order) => {
      const assignment = createDeliveryAssignment(order, deliveryZone);
      saveDeliveryAssignment(assignment);
      saveCustomerNotification(createCustomerNotification(order, order.status));
    });

    const realOrderResult = await createRealOrders(
      createdOrders.map((order) => ({
        id: order.id,
        customerProfileId: user.id,
        storeId: order.storeId,
        status: order.status,
        currency: order.currency,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        placedAt: order.placedAt,
        deliveryCity: order.deliveryCity,
        trackingNumber: order.trackingNumber,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        items: order.items,
      })),
    );

    if (!realOrderResult.ok) {
      toast({
        title: "Order saved locally only",
        description: realOrderResult.reason ?? "The real order record could not be created.",
        variant: "destructive",
      });
    }

    clearCart();
    router.push("/checkout/confirmation");
  }

  if (!isReady || !authReady || !addressesReady) {
    return (
      <div className="grid gap-4">
        <div className="h-20 animate-pulse border bg-muted" />
        <div className="h-72 animate-pulse border bg-muted" />
        <div className="h-48 animate-pulse border bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <section className="grid min-h-72 place-items-center border border-dashed bg-white/70 p-8 text-center">
        <div>
          <h3 className="text-lg font-semibold">Log in to check out</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Orders are linked to your account so you and the vendor can track them.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!cart.length) {
    return (
      <EmptyState
        title="Nothing to checkout"
        description="Your cart is empty. Add products before starting checkout."
        actionLabel="Browse products"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section className="border bg-white p-4">
          <div className="grid gap-2 md:grid-cols-4">
            {checkoutSteps.map((item, index) => {
              const isActive = item.id === step;
              const isComplete = index < currentStepIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => index <= currentStepIndex && setStep(item.id)}
                  className={cn(
                    "flex items-center gap-3 border p-3 text-left",
                    isActive && "border-primary bg-primary/5",
                    isComplete && "border-accent bg-accent/10",
                  )}
                >
                  <span className="flex size-8 items-center justify-center border bg-white text-sm font-black">
                    {isComplete ? <CheckCircle2 className="size-5 text-accent" /> : index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {isActive ? "Current step" : isComplete ? "Complete" : "Pending"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {step === "address" ? (
          <section className="border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <h2 className="text-xl font-black">Delivery address</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddressForm((value) => !value)}
              >
                <Plus className="size-4" />
                Add new address
              </Button>
            </div>

            {addresses.length === 0 && !showAddressForm ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You have no saved addresses yet. Add one to continue.
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className="flex cursor-pointer gap-3 border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="address"
                    value={address.id}
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                  />
                  <span>
                    <span className="flex items-center gap-2 font-black">
                      {address.label}
                      {address.isDefault ? <Badge variant="neutral">Default</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {address.recipientName} · {address.phone}
                    </span>
                    <span className="mt-2 block text-sm leading-6">
                      {getSelectedAddressDetails(address)}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {showAddressForm ? (
              <form
                className="mt-5 border bg-muted/30 p-4"
                onSubmit={addressForm.handleSubmit(createAddress)}
              >
                <h3 className="font-black">Add delivery address</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <CheckoutField label="First name" error={addressForm.formState.errors.firstName?.message}>
                    <Input className={fieldClassName} {...addressForm.register("firstName")} />
                  </CheckoutField>
                  <CheckoutField label="Last name" error={addressForm.formState.errors.lastName?.message}>
                    <Input className={fieldClassName} {...addressForm.register("lastName")} />
                  </CheckoutField>
                  <CheckoutField label="Phone" error={addressForm.formState.errors.phone?.message}>
                    <Input className={fieldClassName} placeholder="+509 37 20 4567" {...addressForm.register("phone")} />
                  </CheckoutField>
                  <CheckoutField label="Department" error={addressForm.formState.errors.department?.message}>
                    <Input className={fieldClassName} placeholder="Ouest" {...addressForm.register("department")} />
                  </CheckoutField>
                  <CheckoutField label="City" error={addressForm.formState.errors.city?.message}>
                    <Input className={fieldClassName} placeholder="Port-au-Prince" {...addressForm.register("city")} />
                  </CheckoutField>
                  <CheckoutField label="Commune" error={addressForm.formState.errors.commune?.message}>
                    <Input className={fieldClassName} placeholder="Delmas" {...addressForm.register("commune")} />
                  </CheckoutField>
                  <CheckoutField label="Zone" error={addressForm.formState.errors.zone?.message}>
                    <Input className={fieldClassName} placeholder="Delmas 33" {...addressForm.register("zone")} />
                  </CheckoutField>
                  <CheckoutField label="Landmark" error={addressForm.formState.errors.landmark?.message}>
                    <Input className={fieldClassName} placeholder="Near church, school, or pharmacy" {...addressForm.register("landmark")} />
                  </CheckoutField>
                  <CheckoutField className="sm:col-span-2" label="Address details" error={addressForm.formState.errors.addressDetails?.message}>
                    <textarea
                      className="min-h-24 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Street, building, gate color, delivery notes"
                      {...addressForm.register("addressDetails")}
                    />
                  </CheckoutField>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="submit">Use this address</Button>
                </div>
              </form>
            ) : null}
          </section>
        ) : null}

        {step === "delivery" ? (
          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              <h2 className="text-xl font-black">Delivery method</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {deliveryMethods.map((method) => (
                <label
                  key={method.id}
                  className="cursor-pointer border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={method.id}
                    checked={deliveryMethodId === method.id}
                    onChange={() => setDeliveryMethodId(method.id)}
                  />
                  <span className="mt-3 block font-black">{method.label}</span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                    {method.description}
                  </span>
                  <span className="mt-3 block text-sm font-bold">
                    {formatDate(getEstimatedDate(method.etaDays))}
                  </span>
                  <span className="mt-1 block text-lg font-black">
                    {formatCurrency(getDeliveryFee(summary, method.id))}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {step === "payment" ? (
          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-xl font-black">Digital payment method</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Card payments are processed securely through Stripe. MonCash, NatCash, bank
              transfer, and the declined-test option remain frontend simulations for now.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {paymentOptions.map((payment) => {
                const Icon = payment.icon;

                return (
                  <label
                    key={payment.id}
                    className="cursor-pointer border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={payment.id}
                      checked={paymentMethodId === payment.id}
                      onChange={() => setPaymentMethodId(payment.id)}
                    />
                    <span className="mt-3 flex items-center gap-2 font-black">
                      <Icon className="size-4" />
                      {payment.label}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {payment.description}
                    </span>
                  </label>
                );
              })}
            </div>

            {paymentMethodId === "card" ? (
              <div className="mt-5 border bg-muted/30 p-4">
                <h3 className="font-black">Card details</h3>
                {!stripeConfigured ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Card payments are not configured yet. Choose another payment method for now.
                  </p>
                ) : cardClientSecret && stripePromise ? (
                  <div className="mt-4">
                    <Elements stripe={stripePromise} options={{ clientSecret: cardClientSecret }}>
                      <CardPaymentStep ref={cardPaymentRef} onReady={setCardReady} />
                    </Elements>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Preparing the secure card form...
                  </p>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "review" ? (
          <section className="border bg-white p-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-5 text-primary" />
              <h2 className="text-xl font-black">Order review</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ReviewTile
                title="Delivering to"
                text={selectedAddress ? `${selectedAddress.recipientName}, ${selectedAddress.city}` : "No address selected"}
              />
              <ReviewTile title="Delivery method" text={selectedDeliveryMethod.label} />
              <ReviewTile title="Payment method" text={selectedPayment.label} />
            </div>

            <div className="mt-5 divide-y border">
              {summary.groups.map((group) => (
                <div key={group.store.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">{group.store.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.store.city} · {group.items.length} product group
                      </p>
                    </div>
                    <p className="font-black">
                      {formatCurrency(group.subtotal)}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {group.items.map((item) => (
                      <div
                        key={`${item.product.id}-${item.selectedVariant?.color ?? "standard"}-${item.selectedVariant?.size ?? "size"}`}
                        className="grid gap-2 border bg-white p-3 text-sm sm:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="font-bold">{item.product.name}</p>
                          <p className="text-muted-foreground">
                            Qty {item.quantity}
                            {item.selectedVariant?.color ? ` · ${item.selectedVariant.color}` : ""}
                            {item.selectedVariant?.size ? ` · ${item.selectedVariant.size}` : ""}
                          </p>
                        </div>
                        <p className="font-black">{formatCurrency(item.lineSubtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {summary.stockIssues.length ? (
          <section className="border border-destructive bg-destructive/10 p-4 text-destructive">
            <h2 className="flex items-center gap-2 font-black">
              <AlertTriangle className="size-5" />
              Stock validation failed
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-semibold">
              {summary.stockIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <OrderSummaryCard
          subtotal={summary.subtotal}
          deliveryFee={deliveryFee}
          discount={discount}
          total={total}
          itemCount={summary.itemCount}
          stockIssueCount={summary.stockIssues.length}
        />
        <div className="grid gap-2 border bg-white p-3 text-sm">
          <p className="font-black">Selected checkout details</p>
          <p className="text-muted-foreground">{selectedAddress?.recipientName ?? "No address selected"}</p>
          <p className="text-muted-foreground">{selectedDeliveryMethod.label}</p>
          <p className="text-muted-foreground">{selectedPayment.label}</p>
        </div>
        <div className="flex gap-2">
          {currentStepIndex > 0 ? (
            <Button className="flex-1" type="button" variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <Button className="flex-1" asChild variant="outline">
              <Link href="/cart">Cart</Link>
            </Button>
          )}
          {step !== "review" ? (
            <Button className="flex-1" type="button" onClick={goNext}>
              Continue
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={placeOrder} disabled={!canPlaceOrder}>
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating order
                </>
              ) : (
                "Place order"
              )}
            </Button>
          )}
        </div>
        {isProcessing ? (
          <div className="border bg-white p-3">
            <div className="h-2 overflow-hidden border bg-muted">
              <div className="h-full w-2/3 animate-pulse bg-primary" />
            </div>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Creating your order and clearing your cart.
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function CheckoutField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}

function ReviewTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="border p-3">
      <p className="text-xs font-bold uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 font-black">{text}</p>
    </div>
  );
}
