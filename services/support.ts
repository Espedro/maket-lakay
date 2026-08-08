"use client";

import { createClient } from "@/lib/supabase/client";
import { mapDisputeRow, mapRefundRequestRow, mapSupportTicketRow } from "@/lib/supabase/mappers";
import type { Dispute, DisputeEvidence, RefundRequest, SupportMessage, SupportTicket } from "@/types";
import type { TablesUpdate } from "@/types/database";

type DisputeRowWithEvidence = Parameters<typeof mapDisputeRow>[0] & {
  dispute_evidence: Parameters<typeof mapDisputeRow>[1];
};

type SupportTicketRowWithMessages = Parameters<typeof mapSupportTicketRow>[0] & {
  support_ticket_messages: Parameters<typeof mapSupportTicketRow>[1];
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

/** Admin-only (RLS). Relies on the admin RLS bypass to see every dispute. */
export async function getAllRealDisputes(): Promise<Dispute[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("disputes")
    .select("*, dispute_evidence(*)")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as DisputeRowWithEvidence[]).map((row) => mapDisputeRow(row, row.dispute_evidence));
}

/** Admin-only (RLS). Relies on the admin RLS bypass to see every refund request. */
export async function getAllRealRefundRequests(): Promise<RefundRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapRefundRequestRow);
}

export async function updateRealDisputeStatus(disputeId: string, status: Dispute["status"]) {
  const supabase = createClient();
  const { error } = await supabase.from("disputes").update({ status }).eq("id", disputeId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function updateRealRefundRequestStatus(
  requestId: string,
  status: RefundRequest["status"],
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("refund_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}

export async function getRealTicketsForCustomer(customerProfileId: string): Promise<SupportTicket[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, support_ticket_messages(*)")
    .eq("customer_profile_id", customerProfileId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as SupportTicketRowWithMessages[]).map((row) =>
    mapSupportTicketRow(row, row.support_ticket_messages),
  );
}

export async function getRealTicketsForStore(storeId: string): Promise<SupportTicket[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, support_ticket_messages(*)")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as SupportTicketRowWithMessages[]).map((row) =>
    mapSupportTicketRow(row, row.support_ticket_messages),
  );
}

/** Admin/support-only (RLS). Relies on the admin/support RLS bypass to see every ticket. */
export async function getAllRealTickets(): Promise<SupportTicket[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, support_ticket_messages(*)")
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as SupportTicketRowWithMessages[]).map((row) =>
    mapSupportTicketRow(row, row.support_ticket_messages),
  );
}

export async function createRealSupportTicket(input: {
  customerProfileId: string;
  customerName?: string;
  orderId?: string;
  storeId?: string;
  subject: string;
  category: SupportTicket["category"];
  priority: SupportTicket["priority"];
  slaDueAt: string;
  message: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      customer_profile_id: input.customerProfileId,
      order_id: input.orderId ?? null,
      store_id: input.storeId ?? null,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: "open",
      sla_due_at: input.slaDueAt,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false as const, reason: error?.message };
  }

  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: data.id,
    author_type: "customer",
    author_name: input.customerName ?? "Customer",
    body: input.message,
    visibility: "customer_visible",
  });

  if (messageError) {
    return { ok: false as const, reason: messageError.message };
  }

  return { ok: true as const, ticket: mapSupportTicketRow(data) };
}

export async function addRealSupportTicketMessage(
  ticketId: string,
  message: {
    authorType: SupportMessage["authorType"];
    authorName: string;
    body: string;
    visibility?: SupportMessage["visibility"];
  },
) {
  const supabase = createClient();
  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_type: message.authorType,
    author_name: message.authorName,
    body: message.body,
    visibility: message.visibility ?? "customer_visible",
  });

  if (messageError) {
    return { ok: false as const, reason: messageError.message };
  }

  const { error: touchError } = await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (touchError) {
    return { ok: false as const, reason: touchError.message };
  }

  return { ok: true as const };
}

export async function updateRealSupportTicket(
  ticketId: string,
  fields: Partial<{
    assignedTo: string;
    assignedToName: string;
    priority: SupportTicket["priority"];
    slaDueAt: string;
    status: SupportTicket["status"];
    escalationStatus: SupportTicket["escalationStatus"];
    escalatedAt: string;
    escalatedByName: string;
    escalationReason: string;
    adminResolution: string;
    adminResolvedAt: string;
  }>,
) {
  const supabase = createClient();
  const patch: TablesUpdate<"support_tickets"> = { updated_at: new Date().toISOString() };

  if (fields.assignedTo !== undefined) patch.assigned_to = fields.assignedTo;
  if (fields.assignedToName !== undefined) patch.assigned_to_name = fields.assignedToName;
  if (fields.priority !== undefined) patch.priority = fields.priority;
  if (fields.slaDueAt !== undefined) patch.sla_due_at = fields.slaDueAt;
  if (fields.status !== undefined) patch.status = fields.status;
  if (fields.escalationStatus !== undefined) patch.escalation_status = fields.escalationStatus;
  if (fields.escalatedAt !== undefined) patch.escalated_at = fields.escalatedAt;
  if (fields.escalatedByName !== undefined) patch.escalated_by_name = fields.escalatedByName;
  if (fields.escalationReason !== undefined) patch.escalation_reason = fields.escalationReason;
  if (fields.adminResolution !== undefined) patch.admin_resolution = fields.adminResolution;
  if (fields.adminResolvedAt !== undefined) patch.admin_resolved_at = fields.adminResolvedAt;

  const { error } = await supabase.from("support_tickets").update(patch).eq("id", ticketId);

  if (error) {
    return { ok: false as const, reason: error.message };
  }

  return { ok: true as const };
}
