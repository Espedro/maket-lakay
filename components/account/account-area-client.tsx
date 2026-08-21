"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useForm } from "react-hook-form";
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  Heart,
  Home,
  LifeBuoy,
  MapPin,
  Package,
  PackageSearch,
  Plus,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  ACCOUNT_NOTIFICATION_READ_KEY,
  ACCOUNT_PROFILE_KEY,
  ACCOUNT_SETTINGS_KEY,
  accountPromotionalNotifications,
  activeCustomer,
  defaultAccountProfile,
  getNotificationCategory,
  getPaymentLabel,
  getPaymentRecordForOrder,
  getPaymentStatusLabel,
  getProductById,
  getStoreByOrder,
} from "@/lib/account";
import { EmptyState } from "@/components/marketplace/empty-state";
import { AccountMenu } from "@/components/auth/account-menu";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  customerNotifications,
  reviews,
  storeReviews,
  stores,
} from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { getOrderTrackingEvents, mergeOrders } from "@/lib/orders";
import { getRealOrdersByCustomer } from "@/services/orders";
import { deleteRealAddress, getRealAddresses, saveRealAddress } from "@/services/users";
import { getRealCustomerProductReviews, getRealCustomerStoreReviews } from "@/services/reviews";
import {
  accountProfileSchema,
  checkoutAddressSchema,
  type AccountProfileInput,
  type CheckoutAddressInput,
} from "@/lib/schemas";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type {
  CustomerAddress,
  CustomerNotification,
  Order,
  PaymentRecord,
  Product,
  Review,
  StoreReview,
} from "@/types";

type AccountView =
  | "overview"
  | "profile"
  | "addresses"
  | "orders"
  | "order-details"
  | "wishlist"
  | "notifications"
  | "reviews"
  | "settings";

interface AccountAreaClientProps {
  view: AccountView;
  orderId?: string;
}

type AccountProfile = AccountProfileInput & { id: string };
type AccountSettings = {
  orderAlerts: boolean;
  paymentAlerts: boolean;
  deliveryAlerts: boolean;
  promotionalAlerts: boolean;
};

const accountLinks = [
  { href: "/account", label: "Overview", view: "overview", icon: Home },
  { href: "/account/profile", label: "Profile", view: "profile", icon: UserRound },
  { href: "/account/addresses", label: "Addresses", view: "addresses", icon: MapPin },
  { href: "/account/orders", label: "Orders", view: "orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", view: "wishlist", icon: Heart },
  { href: "/account/notifications", label: "Notifications", view: "notifications", icon: Bell },
  { href: "/account/reviews", label: "Reviews", view: "reviews", icon: Star },
  { href: "/account/settings", label: "Settings", view: "settings", icon: Settings },
] as const;

const defaultSettings: AccountSettings = {
  orderAlerts: true,
  paymentAlerts: true,
  deliveryAlerts: true,
  promotionalAlerts: false,
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("maket-lakay-storage"));
}

function paymentVariant(status: string) {
  if (status.includes("captured") || status.includes("authorized")) return "success";
  if (status.includes("failed")) return "destructive";
  return "neutral";
}

function getOrderAddress(order: Order, addresses: CustomerAddress[]) {
  return addresses.find(
    (address) =>
      address.customerId === order.customerId && address.city === order.deliveryCity,
  );
}

function getInitials(profile: AccountProfile) {
  return `${profile.firstName[0] ?? "J"}${profile.lastName[0] ?? "B"}`.toUpperCase();
}

function getAccountProfileFromUser(user: AuthUser): AccountProfile {
  if (user.id === activeCustomer.id) {
    return defaultAccountProfile;
  }

  const [firstName = user.name, ...lastNameParts] = user.name.split(/\s+/);

  return {
    id: user.id,
    firstName,
    lastName: lastNameParts.join(" ") || user.roleLabel,
    email: user.email,
    phone: "",
    preferredLanguage: "en",
    profilePicture: "",
  };
}

function getScopedStorageKey(baseKey: string, accountId: string) {
  return accountId === activeCustomer.id ? baseKey : `${baseKey}-${accountId}`;
}

export function AccountAreaClient({ view, orderId }: AccountAreaClientProps) {
  const {
    addToCart,
    customerNotifications: localCustomerNotifications,
    isReady,
    localOrders,
    localPaymentRecords,
    localReviews,
    localStoreReviews,
    toggleWishlist,
    wishlist,
  } = useMarketplaceStorage();
  const { user: currentUser, isReady: authReady } = useAuth();
  const [profile, setProfile] = React.useState<AccountProfile>({
    ...defaultAccountProfile,
    preferredLanguage: defaultAccountProfile.preferredLanguage,
  });
  const [readNotificationIds, setReadNotificationIds] = React.useState<string[]>([]);
  const [settings, setSettings] = React.useState<AccountSettings>(defaultSettings);
  const [accountReady, setAccountReady] = React.useState(false);
  const activeAccountId = currentUser?.id ?? "";
  const profileStorageKey = getScopedStorageKey(ACCOUNT_PROFILE_KEY, activeAccountId);
  const notificationReadStorageKey = getScopedStorageKey(
    ACCOUNT_NOTIFICATION_READ_KEY,
    activeAccountId,
  );
  const settingsStorageKey = getScopedStorageKey(ACCOUNT_SETTINGS_KEY, activeAccountId);

  React.useEffect(() => {
    if (!authReady || !currentUser) return;

    const baseProfile = getAccountProfileFromUser(currentUser);

    setProfile(readJson<AccountProfile>(profileStorageKey, baseProfile));
    setReadNotificationIds(readJson<string[]>(notificationReadStorageKey, []));
    setSettings(readJson<AccountSettings>(settingsStorageKey, defaultSettings));
    setAccountReady(true);
  }, [authReady, currentUser, notificationReadStorageKey, profileStorageKey, settingsStorageKey]);

  const [addresses, setAddresses] = React.useState<CustomerAddress[]>([]);

  const refreshAddresses = React.useCallback(async () => {
    if (!activeAccountId) {
      setAddresses([]);
      return;
    }

    setAddresses(await getRealAddresses(activeAccountId));
  }, [activeAccountId]);

  React.useEffect(() => {
    refreshAddresses();
  }, [refreshAddresses]);

  async function saveAddress(address: CustomerAddress) {
    const result = await saveRealAddress(address, activeAccountId);

    if (!result.ok) {
      toast({
        title: "Could not save address",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Address saved", description: "Your address was saved." });
    await refreshAddresses();
  }

  async function removeAddress(addressId: string) {
    const result = await deleteRealAddress(addressId);

    if (!result.ok) {
      toast({
        title: "Could not remove address",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Address removed", description: "The address was removed." });
    await refreshAddresses();
  }

  const [realOrders, setRealOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    if (!activeAccountId) {
      setRealOrders([]);
      return;
    }

    let active = true;

    getRealOrdersByCustomer(activeAccountId).then((fetched) => {
      if (active) setRealOrders(fetched);
    });

    return () => {
      active = false;
    };
  }, [activeAccountId]);

  const orders = React.useMemo(() => {
    const merged = new Map<string, Order>();
    mergeOrders(localOrders)
      .filter((order) => order.customerId === activeAccountId || order.customerId === profile.id)
      .forEach((order) => merged.set(order.id, order));
    realOrders.forEach((order) => merged.set(order.id, order));
    return Array.from(merged.values());
  }, [activeAccountId, localOrders, profile.id, realOrders]);
  const wishlistProducts = React.useMemo(
    () => wishlist.map(getProductById).filter((product): product is Product => Boolean(product)),
    [wishlist],
  );
  const notifications = React.useMemo(() => {
    const merged = new Map<string, CustomerNotification>();
    [
      ...localCustomerNotifications,
      ...customerNotifications,
      ...accountPromotionalNotifications,
    ]
      .filter((notification) => notification.customerId === activeAccountId)
      .forEach((notification) => {
        merged.set(notification.id, {
          ...notification,
          read: notification.read || readNotificationIds.includes(notification.id),
        });
      });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [activeAccountId, localCustomerNotifications, readNotificationIds]);
  const [realProductReviews, setRealProductReviews] = React.useState<Review[]>([]);
  const [realStoreReviews, setRealStoreReviews] = React.useState<StoreReview[]>([]);

  React.useEffect(() => {
    if (!activeAccountId) {
      setRealProductReviews([]);
      setRealStoreReviews([]);
      return;
    }

    let active = true;

    Promise.all([
      getRealCustomerProductReviews(activeAccountId),
      getRealCustomerStoreReviews(activeAccountId),
    ]).then(([fetchedProductReviews, fetchedStoreReviews]) => {
      if (active) {
        setRealProductReviews(fetchedProductReviews);
        setRealStoreReviews(fetchedStoreReviews);
      }
    });

    return () => {
      active = false;
    };
  }, [activeAccountId]);

  const customerProductReviews = React.useMemo(() => {
    const merged = new Map<string, Review>();
    [...localReviews, ...reviews]
      .filter((review) => review.customerId === activeAccountId)
      .forEach((review) => merged.set(review.id, review));
    realProductReviews.forEach((review) => merged.set(review.id, review));
    return Array.from(merged.values());
  }, [activeAccountId, localReviews, realProductReviews]);
  const customerStoreReviews = React.useMemo(() => {
    const merged = new Map<string, StoreReview>();
    [...localStoreReviews, ...storeReviews]
      .filter((review) => review.customerId === activeAccountId)
      .forEach((review) => merged.set(review.id, review));
    realStoreReviews.forEach((review) => merged.set(review.id, review));
    return Array.from(merged.values());
  }, [activeAccountId, localStoreReviews, realStoreReviews]);
  const selectedOrder = orderId
    ? orders.find((order) => order.id === decodeURIComponent(orderId))
    : undefined;

  function updateProfile(nextProfile: AccountProfile) {
    setProfile(nextProfile);
    writeJson(profileStorageKey, nextProfile);
  }

  function markNotificationRead(notificationId: string) {
    const nextIds = Array.from(new Set([...readNotificationIds, notificationId]));
    setReadNotificationIds(nextIds);
    writeJson(notificationReadStorageKey, nextIds);
  }

  function markAllNotificationsRead() {
    const nextIds = Array.from(
      new Set([...readNotificationIds, ...notifications.map((item) => item.id)]),
    );
    setReadNotificationIds(nextIds);
    writeJson(notificationReadStorageKey, nextIds);
  }

  function updateSettings(nextSettings: AccountSettings) {
    setSettings(nextSettings);
    writeJson(settingsStorageKey, nextSettings);
  }

  if (!isReady || !authReady) {
    return (
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="h-96 animate-pulse border bg-muted" />
        <div className="h-96 animate-pulse border bg-muted" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <section className="grid min-h-[420px] place-items-center border bg-white p-5 text-center">
        <div className="max-w-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Log in required
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">
            Log in to view your account.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Customer profile, order history, wishlist, notifications, and saved addresses require
            a signed-in account.
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

  if (currentUser.role !== "customer") {
    return (
      <section className="grid min-h-[420px] place-items-center border bg-white p-5 text-center">
        <div className="max-w-xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Customer access
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-normal">
            This account area is for customer accounts.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your account is signed in as {currentUser.roleLabel}. Order history, wishlist,
            notifications, and saved addresses are scoped to customer accounts.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={currentUser.homeHref}>Go to my area</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!accountReady) {
    return (
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="h-96 animate-pulse border bg-muted" />
        <div className="h-96 animate-pulse border bg-muted" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="border bg-white p-3 lg:sticky lg:top-36 lg:self-start">
        <div className="border p-3">
          <div className="flex items-center gap-3">
            <AvatarPreview profile={profile} />
            <div>
              <p className="font-black">{profile.firstName} {profile.lastName}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </div>
        <nav className="mt-3 grid gap-1">
          {accountLinks.map((item) => {
            const Icon = item.icon;
            const active =
              item.view === view || (view === "order-details" && item.view === "orders");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 border px-3 py-2 text-sm font-bold hover:border-primary hover:bg-primary/5",
                  active && "border-primary bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {currentUser?.role === "customer" ? (
          <Link
            href="/sell"
            className="mt-3 flex items-center justify-center gap-2 border border-primary bg-primary/5 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/10"
          >
            <Store className="size-4" />
            Become a vendor
          </Link>
        ) : null}
      </aside>

      <main className="min-w-0">
        {view === "overview" ? (
          <OverviewPanel
            addresses={addresses}
            localPaymentRecords={localPaymentRecords}
            notifications={notifications}
            orders={orders}
            profile={profile}
            wishlistCount={wishlist.length}
          />
        ) : null}
        {view === "profile" ? (
          <ProfilePanel profile={profile} onSave={updateProfile} />
        ) : null}
        {view === "addresses" ? (
          <AddressesPanel
            addresses={addresses}
            customerId={activeAccountId}
            onSave={saveAddress}
            onRemove={removeAddress}
          />
        ) : null}
        {view === "orders" ? (
          <OrderHistoryPanel
            orders={orders}
            addresses={addresses}
            localPaymentRecords={localPaymentRecords}
          />
        ) : null}
        {view === "order-details" ? (
          <OrderDetailsPanel
            order={selectedOrder}
            addresses={addresses}
            localPaymentRecords={localPaymentRecords}
          />
        ) : null}
        {view === "wishlist" ? (
          <WishlistPanel
            products={wishlistProducts}
            onAddToCart={addToCart}
            onRemove={toggleWishlist}
          />
        ) : null}
        {view === "notifications" ? (
          <NotificationsPanel
            notifications={notifications}
            onMarkAllRead={markAllNotificationsRead}
            onMarkRead={markNotificationRead}
          />
        ) : null}
        {view === "reviews" ? (
          <ReviewsPanel
            productReviews={customerProductReviews}
            storeRatingReviews={customerStoreReviews}
          />
        ) : null}
        {view === "settings" ? (
          <SettingsPanel settings={settings} onChange={updateSettings} />
        ) : null}
      </main>
    </div>
  );
}

function AvatarPreview({ profile }: { profile: AccountProfile }) {
  if (profile.profilePicture) {
    return (
      <span className="relative block size-12 overflow-hidden border bg-muted">
        <Image src={profile.profilePicture} alt="Profile preview" fill className="object-cover" />
      </span>
    );
  }

  return (
    <span className="flex size-12 items-center justify-center border bg-primary text-lg font-black text-primary-foreground">
      {getInitials(profile)}
    </span>
  );
}

function OverviewPanel({
  addresses,
  localPaymentRecords,
  notifications,
  orders,
  profile,
  wishlistCount,
}: {
  addresses: CustomerAddress[];
  localPaymentRecords: PaymentRecord[];
  notifications: CustomerNotification[];
  orders: Order[];
  profile: AccountProfile;
  wishlistCount: number;
}) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="border bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Customer account
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">
          Welcome back, {profile.firstName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your Maket Lakay profile, orders, wishlist, notifications, and saved addresses.
        </p>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard icon={Package} label="Orders" value={orders.length.toString()} />
        <SummaryCard icon={MapPin} label="Saved addresses" value={addresses.length.toString()} />
        <SummaryCard icon={Heart} label="Wishlist items" value={wishlistCount.toString()} />
        <SummaryCard icon={Bell} label="Unread alerts" value={unreadCount.toString()} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Recent orders</h2>
            <Button asChild variant="outline">
              <Link href="/account/orders">View all</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {recentOrders.length ? (
              recentOrders.map((order) => (
                <OrderListCard
                  key={order.id}
                  order={order}
                  localPaymentRecords={localPaymentRecords}
                />
              ))
            ) : (
              <EmptyInline text="No customer orders yet. Place a checkout order to populate this area." />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="border bg-white p-4">
            <h2 className="text-xl font-black">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <Button asChild>
                <Link href="/products">
                  <ShoppingBag className="size-4" />
                  Continue shopping
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/account/addresses">Manage addresses</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/support">Request support</Link>
              </Button>
            </div>
          </div>
          <div className="border bg-white p-4">
            <h2 className="text-xl font-black">Latest notifications</h2>
            <div className="mt-4 space-y-3">
              {notifications.slice(0, 4).map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border bg-white p-4">
        <h2 className="text-xl font-black">Saved addresses</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {addresses.slice(0, 2).map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border bg-white p-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function ProfilePanel({
  profile,
  onSave,
}: {
  profile: AccountProfile;
  onSave: (profile: AccountProfile) => void;
}) {
  const form = useForm<AccountProfileInput>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: profile,
  });

  React.useEffect(() => {
    form.reset(profile);
  }, [form, profile]);

  const preview = form.watch("profilePicture");

  function handleSubmit(values: AccountProfileInput) {
    onSave({ ...values, id: profile.id });
    toast({ title: "Profile saved", description: "Your profile was updated locally." });
  }

  function handleFile(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      form.setValue("profilePicture", String(reader.result), { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="border bg-white p-5">
      <h1 className="text-3xl font-black tracking-normal">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Edit simulated customer details. Changes stay in localStorage only.
      </p>

      <form className="mt-6 grid gap-5 lg:grid-cols-[180px_1fr]" onSubmit={form.handleSubmit(handleSubmit)}>
        <div>
          <div className="flex size-32 items-center justify-center overflow-hidden border bg-muted">
            {preview ? (
              <Image src={preview} alt="Profile preview" width={128} height={128} className="size-full object-cover" />
            ) : (
              <span className="text-3xl font-black">{getInitials(profile)}</span>
            )}
          </div>
          <Label className="mt-4 block">Profile picture preview</Label>
          <Input
            className="mt-2 rounded-none shadow-none"
            type="file"
            accept="image/*"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AccountField label="First name" error={form.formState.errors.firstName?.message}>
            <Input className="rounded-none shadow-none" {...form.register("firstName")} />
          </AccountField>
          <AccountField label="Last name" error={form.formState.errors.lastName?.message}>
            <Input className="rounded-none shadow-none" {...form.register("lastName")} />
          </AccountField>
          <AccountField label="Email" error={form.formState.errors.email?.message}>
            <Input className="rounded-none shadow-none" type="email" {...form.register("email")} />
          </AccountField>
          <AccountField label="Phone" error={form.formState.errors.phone?.message}>
            <Input className="rounded-none shadow-none" {...form.register("phone")} />
          </AccountField>
          <AccountField label="Preferred language" error={form.formState.errors.preferredLanguage?.message}>
            <select
              className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("preferredLanguage")}
            >
              <option value="en">English</option>
              <option value="ht">Haitian Creole</option>
              <option value="fr">French</option>
            </select>
          </AccountField>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Save profile</Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function AddressesPanel({
  addresses,
  customerId,
  onSave,
  onRemove,
}: {
  addresses: CustomerAddress[];
  customerId: string;
  onSave: (address: CustomerAddress) => void | Promise<void>;
  onRemove: (addressId: string) => void | Promise<void>;
}) {
  const form = useForm<CheckoutAddressInput>({
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

  function addAddress(values: CheckoutAddressInput) {
    const nextAddress: CustomerAddress = {
      id: `addr-local-${Date.now()}`,
      customerId,
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

    onSave(nextAddress);
    form.reset();
  }

  return (
    <div className="space-y-5">
      <section className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">Saved addresses</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage delivery addresses for the customer account.
        </p>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            action={
              <Button variant="outline" size="sm" onClick={() => onRemove(address.id)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            }
          />
        ))}
      </div>
      <section className="border bg-white p-5">
        <h2 className="text-xl font-black">Add new address</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(addAddress)}>
          <AccountField label="First name" error={form.formState.errors.firstName?.message}>
            <Input className="rounded-none shadow-none" {...form.register("firstName")} />
          </AccountField>
          <AccountField label="Last name" error={form.formState.errors.lastName?.message}>
            <Input className="rounded-none shadow-none" {...form.register("lastName")} />
          </AccountField>
          <AccountField label="Phone" error={form.formState.errors.phone?.message}>
            <Input className="rounded-none shadow-none" {...form.register("phone")} />
          </AccountField>
          <AccountField label="Department" error={form.formState.errors.department?.message}>
            <Input className="rounded-none shadow-none" {...form.register("department")} />
          </AccountField>
          <AccountField label="City" error={form.formState.errors.city?.message}>
            <Input className="rounded-none shadow-none" {...form.register("city")} />
          </AccountField>
          <AccountField label="Commune" error={form.formState.errors.commune?.message}>
            <Input className="rounded-none shadow-none" {...form.register("commune")} />
          </AccountField>
          <AccountField label="Zone" error={form.formState.errors.zone?.message}>
            <Input className="rounded-none shadow-none" {...form.register("zone")} />
          </AccountField>
          <AccountField label="Landmark" error={form.formState.errors.landmark?.message}>
            <Input className="rounded-none shadow-none" {...form.register("landmark")} />
          </AccountField>
          <AccountField className="sm:col-span-2" label="Address details" error={form.formState.errors.addressDetails?.message}>
            <textarea
              className="min-h-24 w-full border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("addressDetails")}
            />
          </AccountField>
          <div className="sm:col-span-2">
            <Button type="submit">
              <Plus className="size-4" />
              Save address
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function OrderHistoryPanel({
  addresses,
  localPaymentRecords,
  orders,
}: {
  addresses: CustomerAddress[];
  localPaymentRecords: PaymentRecord[];
  orders: Order[];
}) {
  if (!orders.length) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No orders yet"
          description="Place a checkout order to see customer order history."
        actionLabel="Browse products"
      />
    );
  }

  return (
    <section className="border bg-white p-5">
      <h1 className="text-3xl font-black tracking-normal">Order history</h1>
      <div className="mt-5 divide-y border">
        {orders.map((order) => {
          const paymentRecord = getPaymentRecordForOrder(order.id, localPaymentRecords);
          const paymentStatus = getPaymentStatusLabel(paymentRecord, order);
          const address = getOrderAddress(order, addresses);

          return (
            <div key={order.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_140px_140px_120px_auto] lg:items-center">
              <div>
                <p className="font-black">{order.id}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getStoreByOrder(order)?.name ?? "Marketplace store"} - {formatDate(order.placedAt)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {address?.city ?? order.deliveryCity}
                </p>
              </div>
              <p className="font-black">{formatCurrency(order.total, order.currency)}</p>
              <Badge variant={paymentVariant(paymentStatus)}>{paymentStatus}</Badge>
              <StatusBadge status={order.status} />
              <Button asChild>
                <Link href={`/account/orders/${order.id}`}>View details</Link>
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrderDetailsPanel({
  addresses,
  localPaymentRecords,
  order,
}: {
  addresses: CustomerAddress[];
  localPaymentRecords: PaymentRecord[];
  order?: Order;
}) {
  if (!order) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Package}
          title="Order not found"
          description="This customer order could not be found in local data."
        />
        <Button asChild>
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const store = getStoreByOrder(order);
  const paymentRecord = getPaymentRecordForOrder(order.id, localPaymentRecords);
  const paymentStatus = getPaymentStatusLabel(paymentRecord, order);
  const address = getOrderAddress(order, addresses);
  const timeline = getOrderTrackingEvents(order);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/account/orders">Back to account orders</Link>
      </Button>
      <section className="border bg-white p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Order details
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">{order.id}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {store?.name ?? "Marketplace store"} - placed {formatDate(order.placedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <StatusBadge status={order.status} />
            <Badge variant={paymentVariant(paymentStatus)}>{paymentStatus}</Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Order timeline</h2>
            <div className="mt-4 space-y-3">
              {timeline.map((event) => (
                <div key={event.id} className="grid gap-3 border p-3 sm:grid-cols-[140px_1fr]">
                  <p className="text-sm font-bold">{formatDate(event.createdAt)}</p>
                  <div>
                    <p className="font-black">{event.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="border bg-white p-5">
            <h2 className="text-xl font-black">Products grouped by vendor</h2>
            <div className="mt-4 border">
              <div className="border-b bg-muted/30 p-3">
                <p className="font-black">{store?.name ?? "Marketplace store"}</p>
                <p className="text-sm text-muted-foreground">{store?.city ?? order.deliveryCity}</p>
              </div>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.productId} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty {item.quantity} - {formatCurrency(item.unitPrice, order.currency)} each
                      </p>
                    </div>
                    <p className="font-black">{formatCurrency(item.quantity * item.unitPrice, order.currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border bg-white p-4">
            <h2 className="font-black">Payment information</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <InfoRow label="Method" value={getPaymentLabel(paymentRecord)} />
              <InfoRow label="Status" value={paymentStatus} />
              <InfoRow label="Reference" value={paymentRecord?.providerReference ?? "Simulated checkout"} />
            </dl>
          </section>
          <section className="border bg-white p-4">
            <h2 className="font-black">Delivery address</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {address
                ? `${address.recipientName}, ${address.line1}, ${address.city}, ${address.country}`
                : order.deliveryCity}
            </p>
          </section>
          <section className="border bg-white p-4">
            <h2 className="font-black">Order totals</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <InfoRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
              <InfoRow label="Delivery" value={formatCurrency(order.deliveryFee, order.currency)} />
              <div className="flex justify-between border-t pt-3 text-lg font-black">
                <dt>Total</dt>
                <dd>{formatCurrency(order.total, order.currency)}</dd>
              </div>
            </dl>
          </section>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => toast({ title: "Receipt ready", description: "Receipt download simulated." })}
          >
            <Download className="size-4" />
            Download receipt
          </Button>
          <Button asChild className="w-full">
            <Link href="/support">
              <LifeBuoy className="size-4" />
              Request support
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}

function WishlistPanel({
  onAddToCart,
  onRemove,
  products,
}: {
  onAddToCart: (product: Product) => void;
  onRemove: (product: Product) => void;
  products: Product[];
}) {
  if (!products.length) {
    return (
      <EmptyState
        icon={Heart}
        title="Wishlist is empty"
        description="Save products you want to revisit from product cards or product details."
        actionLabel="Browse products"
      />
    );
  }

  return (
    <section className="border bg-white p-5">
      <h1 className="text-3xl font-black tracking-normal">Wishlist</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="border bg-white p-3">
            <div className="relative aspect-square border bg-muted">
              <Image src={product.image} alt={product.name} fill className="object-cover" />
            </div>
            <h2 className="mt-3 font-black">{product.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(product.price, product.currency)}</p>
            <div className="mt-3 grid gap-2">
              <Button onClick={() => onAddToCart(product)}>
                <ShoppingBag className="size-4" />
                Add to cart
              </Button>
              <Button asChild variant="outline">
                <Link href={`/products/${product.slug}`}>View product</Link>
              </Button>
              <Button variant="ghost" onClick={() => onRemove(product)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotificationsPanel({
  notifications,
  onMarkAllRead,
  onMarkRead,
}: {
  notifications: CustomerNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: string) => void;
}) {
  return (
    <section className="border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-normal">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Order, payment, delivery, and promotional notifications.
          </p>
        </div>
        <Button variant="outline" onClick={onMarkAllRead}>
          <CheckCircle2 className="size-4" />
          Mark all as read
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            action={
              notification.read ? null : (
                <Button size="sm" variant="outline" onClick={() => onMarkRead(notification.id)}>
                  Mark as read
                </Button>
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function ReviewsPanel({
  productReviews,
  storeRatingReviews,
}: {
  productReviews: Review[];
  storeRatingReviews: StoreReview[];
}) {
  return (
    <div className="space-y-5">
      <section className="border bg-white p-5">
        <h1 className="text-3xl font-black tracking-normal">Reviews</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your product reviews and store ratings.
        </p>
      </section>
      <section className="border bg-white p-5">
        <h2 className="text-xl font-black">Product reviews</h2>
        <div className="mt-4 space-y-3">
          {productReviews.length ? (
            productReviews.map((review) => {
              const product = getProductById(review.productId);
              return (
                <article key={review.id} className="border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{review.title}</p>
                      <p className="text-sm text-muted-foreground">{product?.name ?? "Product"}</p>
                    </div>
                    <RatingStars rating={review.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
                </article>
              );
            })
          ) : (
            <EmptyInline text="No product reviews yet." />
          )}
        </div>
      </section>
      <section className="border bg-white p-5">
        <h2 className="text-xl font-black">Store ratings</h2>
        <div className="mt-4 space-y-3">
          {storeRatingReviews.length ? (
            storeRatingReviews.map((review) => {
              const store = stores.find((item) => item.id === review.storeId);
              return (
                <article key={review.id} className="border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{review.title}</p>
                      <p className="text-sm text-muted-foreground">{store?.name ?? "Store"}</p>
                    </div>
                    <RatingStars rating={review.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
                </article>
              );
            })
          ) : (
            <EmptyInline text="No store ratings yet." />
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({
  onChange,
  settings,
}: {
  onChange: (settings: AccountSettings) => void;
  settings: AccountSettings;
}) {
  const { user: currentUser, isReady } = useAuth();

  function toggle(key: keyof AccountSettings) {
    const nextSettings = { ...settings, [key]: !settings[key] };
    onChange(nextSettings);
    toast({ title: "Settings saved", description: "Account settings were updated locally." });
  }

  return (
    <section className="border bg-white p-5">
      <h1 className="text-3xl font-black tracking-normal">Account settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Simulated notification preferences. Account access is backed by Supabase Auth.
      </p>
      <div className="mt-5 divide-y border">
        <SettingToggle label="Order notifications" checked={settings.orderAlerts} onChange={() => toggle("orderAlerts")} />
        <SettingToggle label="Payment notifications" checked={settings.paymentAlerts} onChange={() => toggle("paymentAlerts")} />
        <SettingToggle label="Delivery notifications" checked={settings.deliveryAlerts} onChange={() => toggle("deliveryAlerts")} />
        <SettingToggle label="Promotional notifications" checked={settings.promotionalAlerts} onChange={() => toggle("promotionalAlerts")} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="border p-4">
          <CreditCard className="size-5 text-primary" />
          <h2 className="mt-3 font-black">Payment security</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Payment methods are display-only simulations. No sensitive payment data is stored.
          </p>
        </div>
        <div className="border p-4">
          <UserRound className="size-5 text-primary" />
          <h2 className="mt-3 font-black">Account access</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {isReady && currentUser
              ? `Signed in as ${currentUser.name} (${currentUser.roleLabel}).`
              : "Not signed in."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AccountMenu dashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 p-4">
      <span>
        <span className="block font-black">{label}</span>
        <span className="text-sm text-muted-foreground">Saved locally for this browser.</span>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="size-5 accent-primary" />
    </label>
  );
}

function OrderListCard({
  localPaymentRecords,
  order,
}: {
  localPaymentRecords: PaymentRecord[];
  order: Order;
}) {
  const paymentRecord = getPaymentRecordForOrder(order.id, localPaymentRecords);
  const paymentStatus = getPaymentStatusLabel(paymentRecord, order);

  return (
    <article className="grid gap-3 border p-3 md:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black">{order.id}</p>
          <StatusBadge status={order.status} />
          <Badge variant={paymentVariant(paymentStatus)}>{paymentStatus}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {getStoreByOrder(order)?.name ?? "Marketplace store"} - {formatDate(order.placedAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <p className="font-black">{formatCurrency(order.total, order.currency)}</p>
        <Button asChild size="sm">
          <Link href={`/account/orders/${order.id}`}>Details</Link>
        </Button>
      </div>
    </article>
  );
}

function AddressCard({
  action,
  address,
}: {
  action?: React.ReactNode;
  address: CustomerAddress;
}) {
  return (
    <article className="border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{address.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{address.recipientName}</p>
        </div>
        {address.isDefault ? <Badge variant="neutral">Default</Badge> : action}
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.region},{" "}
        {address.country}
      </p>
      <p className="mt-2 text-sm font-semibold">{address.phone}</p>
    </article>
  );
}

function NotificationCard({
  action,
  notification,
}: {
  action?: React.ReactNode;
  notification: CustomerNotification;
}) {
  return (
    <article className={cn("border p-3", !notification.read && "border-primary bg-primary/5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{getNotificationCategory(notification)}</Badge>
            {!notification.read ? <Badge>Unread</Badge> : <Badge variant="neutral">Read</Badge>}
          </div>
          <p className="mt-2 font-black">{notification.title}</p>
        </div>
        {action}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.message}</p>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {formatDate(notification.createdAt)} - {notification.channel.replaceAll("_", " ")}
      </p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-right">{value}</dd>
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <p className="border bg-muted/30 p-4 text-sm text-muted-foreground">{text}</p>;
}

function AccountField({
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
