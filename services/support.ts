"use client";

import { createClient } from "@/lib/supabase/client";
import { mapDisputeRow, mapRefundRequestRow } from "@/lib/supabase/mappers";
import type { Dispute, DisputeEvidence, RefundRequest } from "@/types";

type DisputeRowWithEvidence = Parameters<typeof mapDisputeRow>[0] & {
  dispute_evidence: Parameters<typeof mapDisputeRow>[1];
};

export async function getRealDisputesForCustomer(customerProfileId: string): Promise<Dispute[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("disputes")
    .select("*, dispute_evidence(*)")
    .eq("customer_profile_id", customerProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as DisputeRowWithEvidence[]).map((row) => mapDisputeRow(row, row.dispute_evidence));
}

export async function getRealDisputesForStore(storeId: string): Promise<Dispute[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("disputes")
    .select("*, dispute_evidence(*)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as DisputeRowWithEvidence[]).map((row) => mapDisputeRow(row, row.dispute_evidence));
}

export async function createRealDispute(input: {
  orderId: string;
  customerProfileId: string;
  storeId: string;
  reason: string;
  requestedResolution: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("disputes")
    .insert({
      order_id: input.orderId,
      customer_profile_id: input.customerProfileId,
      store_id: input.storeId,
      reason: input.reason,
      requested_resolution: input.requestedResolution,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false as const, reason: error?.message };
  }

  return { ok: true as const, dispute: mapDisputeRow(data) };
}

export async function addRealDisputeEvidence(
  disputeId: string,
  evidence: Omit<DisputeEvidence, "id" | "createdAt">,
) {
  const supabase = createClient();
  const { error } = await supabase.from("dispute_evidence").insert({
    dispute_id: disputeId,
    author_type: evidence.authorType,
    author_name: evidence.authorName,
    title: evidence.title,
    notes: evidence.notes,
    image_preview_url: evidence.imagePreviewUrl ?? null,
    file_name: evidence.fileName ?? null,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  if (evidence.authorType === "vendor") {
    await supabase
      .from("disputes")
      .update({ status: "under_review" })
      .eq("id", disputeId)
      .eq("status", "open");
  }

  return { ok: true as const };
}

export async function getRealRefundRequestsForCustomer(
  customerProfileId: string,
): Promise<RefundRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .eq("customer_profile_id", customerProfileId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapRefundRequestRow);
}

export async function getRealRefundRequestsForStore(storeId: string): Promise<RefundRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapRefundRequestRow);
}

export async function createRealRefundRequest(input: {
  orderId: string;
  customerProfileId: string;
  storeId: string;
  amount: number;
  currency: RefundRequest["currency"];
  reason: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("refund_requests").insert({
    order_id: input.orderId,
    customer_profile_id: input.customerProfileId,
    store_id: input.storeId,
    amount: input.amount,
    currency: input.currency,
    reason: input.reason,
  });

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
