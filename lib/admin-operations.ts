import { deliveryZones, vendors } from "@/data/mock-data";
import type { CurrencyCode, DeliveryZone } from "@/types";

export const ADMIN_OPERATIONS_KEY = "maket-lakay-admin-operations";

export interface AdminOrderFlag {
  orderId: string;
  markedForReview: boolean;
  refundIssued: boolean;
  updatedAt: string;
}

export interface CommissionHistoryEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  rate: number;
  note: string;
  createdAt: string;
}

export interface CommissionSettings {
  defaultRate: number;
  vendorRates: Record<string, number>;
  history: CommissionHistoryEntry[];
}

export interface ManagedDeliveryZone extends DeliveryZone {
  department: string;
  zone: string;
}

export interface AdminOperationsState {
  orderFlags: Record<string, AdminOrderFlag>;
  commissionSettings: CommissionSettings;
  deliveryZones: ManagedDeliveryZone[];
}

export type DeliveryZoneInput = Omit<ManagedDeliveryZone, "id" | "currency"> & {
  id?: string;
  currency?: CurrencyCode;
};

function getDefaultCommissionSettings(): CommissionSettings {
  return {
    defaultRate: 8,
    vendorRates: vendors.reduce<Record<string, number>>((rates, vendor, index) => {
      rates[vendor.id] = index === 0 ? 7.5 : index === 1 ? 8 : 8.5;
      return rates;
    }, {}),
    history: [
      {
        id: "commission-history-1001",
        vendorId: "vendor-bel-lakay",
        vendorName: "Bel Lakay Trading",
        rate: 7.5,
        note: "Launch partner preferred commission.",
        createdAt: "2026-07-12T10:00:00Z",
      },
      {
        id: "commission-history-1002",
        vendorId: "vendor-diaspora-goods",
        vendorName: "Diaspora Goods",
        rate: 8.5,
        note: "Pending verification risk review.",
        createdAt: "2026-07-14T14:15:00Z",
      },
    ],
  };
}

function zoneToManagedZone(zone: DeliveryZone): ManagedDeliveryZone {
  return {
    ...zone,
    department: zone.region,
    zone: zone.name,
  };
}

export function getDefaultAdminOperationsState(): AdminOperationsState {
  return {
    orderFlags: {},
    commissionSettings: getDefaultCommissionSettings(),
    deliveryZones: deliveryZones.map(zoneToManagedZone),
  };
}

export function hydrateAdminOperationsState(
  storedState: Partial<AdminOperationsState> = {},
): AdminOperationsState {
  const defaults = getDefaultAdminOperationsState();

  return {
    orderFlags: {
      ...defaults.orderFlags,
      ...(storedState.orderFlags ?? {}),
    },
    commissionSettings: {
      ...defaults.commissionSettings,
      ...(storedState.commissionSettings ?? {}),
      vendorRates: {
        ...defaults.commissionSettings.vendorRates,
        ...(storedState.commissionSettings?.vendorRates ?? {}),
      },
      history: storedState.commissionSettings?.history ?? defaults.commissionSettings.history,
    },
    deliveryZones: storedState.deliveryZones?.length
      ? storedState.deliveryZones
      : defaults.deliveryZones,
  };
}

export function makeDeliveryZone(input: DeliveryZoneInput): ManagedDeliveryZone {
  return {
    id: input.id ?? `zone-local-${Date.now()}`,
    name: input.zone,
    city: input.city,
    region: input.department,
    country: input.country,
    baseFee: input.baseFee,
    currency: input.currency ?? "USD",
    estimatedDays: input.estimatedDays,
    active: input.active,
    department: input.department,
    zone: input.zone,
  };
}
