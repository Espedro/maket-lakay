import {
  deliveryAssignments,
  deliveryZones,
  proofsOfDelivery,
  trackingEvents,
} from "@/data/mock-data";
import { createClient } from "@/lib/supabase/client";
import {
  mapDeliveryAssignmentRow,
  mapDeliveryZoneRow,
  mapProofOfDeliveryRow,
  toDeliveryZoneRow,
} from "@/lib/supabase/mappers";
import { createPublicClient } from "@/lib/supabase/public";
import type { DeliveryAssignment, DeliveryAssignmentStatus, DeliveryZone, ProofOfDelivery } from "@/types";
import type { TablesUpdate } from "@/types/database";

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

export async function getRealAssignmentsForStore(storeId: string): Promise<DeliveryAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_assignments")
    .select("*, orders!inner(store_id)")
    .eq("orders.store_id", storeId);

  if (error || !data) {
    return [];
  }

  return data.map(mapDeliveryAssignmentRow);
}

export async function getRealAssignmentForOrder(orderId: string): Promise<DeliveryAssignment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_assignments")
    .select("*")
    .eq("order_id", orderId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapDeliveryAssignmentRow(data);
}

/** Admin-only (RLS). Relies on the admin RLS bypass to see every assignment. */
export async function getAllRealAssignments(): Promise<DeliveryAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_assignments")
    .select("*")
    .order("assigned_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapDeliveryAssignmentRow);
}

export async function createRealDeliveryAssignment(input: {
  orderId: string;
  zoneId?: string;
  courierName: string;
  courierPhone: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("delivery_assignments")
    .insert({
      order_id: input.orderId,
      zone_id: input.zoneId,
      courier_name: input.courierName,
      courier_phone: input.courierPhone,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false as const, reason: error?.message };
  }

  return { ok: true as const, assignment: mapDeliveryAssignmentRow(data) };
}

export async function updateRealAssignmentStatus(
  assignmentId: string,
  status: DeliveryAssignmentStatus,
) {
  const supabase = createClient();
  const now = new Date().toISOString();
  const patch: TablesUpdate<"delivery_assignments"> = { status };

  if (status === "picked_up" || status === "in_transit") {
    patch.picked_up_at = now;
  }
  if (status === "completed") {
    patch.completed_at = now;
  }

  const { error } = await supabase.from("delivery_assignments").update(patch).eq("id", assignmentId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getRealProofForOrder(orderId: string): Promise<ProofOfDelivery | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proof_of_deliveries")
    .select("*")
    .eq("order_id", orderId)
    .order("delivered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapProofOfDeliveryRow(data);
}

/** Admin-only (RLS). Relies on the admin RLS bypass to see every proof record. */
export async function getAllRealProofs(): Promise<ProofOfDelivery[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proof_of_deliveries")
    .select("*")
    .order("delivered_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapProofOfDeliveryRow);
}

export async function createRealProofOfDelivery(input: {
  orderId: string;
  assignmentId?: string;
  recipientName: string;
  method: ProofOfDelivery["method"];
  note?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("proof_of_deliveries").insert({
    order_id: input.orderId,
    assignment_id: input.assignmentId,
    recipient_name: input.recipientName,
    method: input.method,
    note: input.note,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
