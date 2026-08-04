import {
  deliveryAssignments,
  deliveryZones,
  proofsOfDelivery,
  trackingEvents,
} from "@/data/mock-data";
import { createClient } from "@/lib/supabase/client";
import { mapDeliveryZoneRow, toDeliveryZoneRow } from "@/lib/supabase/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import type { DeliveryZone } from "@/types";

export function getDeliveryZones() {
  return deliveryZones;
}

export function getActiveDeliveryZones() {
  return deliveryZones.filter((zone) => zone.active);
}

export function getDeliveryZoneById(zoneId: string) {
  return deliveryZones.find((zone) => zone.id === zoneId);
}

export async function getRealDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("delivery_zones").select("*").order("name");

  if (error || !data) {
    return [];
  }

  return data.map(mapDeliveryZoneRow);
}

export async function saveRealDeliveryZone(zone: DeliveryZone) {
  const supabase = createClient();
  const { error } = await supabase.from("delivery_zones").upsert(toDeliveryZoneRow(zone));

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function setRealDeliveryZoneActive(zoneId: string, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("delivery_zones").update({ active }).eq("id", zoneId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export function getDeliveryAssignments() {
  return deliveryAssignments;
}

export function getDeliveryAssignmentByOrder(orderId: string) {
  return deliveryAssignments.find((assignment) => assignment.orderId === orderId);
}

export function getTrackingEvents(orderId: string) {
  return trackingEvents.filter((event) => event.orderId === orderId);
}

export function getProofOfDelivery(orderId: string) {
  return proofsOfDelivery.find((proof) => proof.orderId === orderId);
}
