"use client";

import * as React from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ClipboardList,
  Clock3,
  LifeBuoy,
  MessageSquare,
  Search,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customers, stores, vendors } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { addAuditLogEntry } from "@/lib/audit-log";
import { mergeOrders } from "@/lib/orders";
import {
  createSupportCustomerNotification,
  getReportTargetLabel,
  getSlaDueAt,
  getTicketSlaStatus,
  mergeMarketplaceReports,
  updateReportStatus,
} from "@/lib/support";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  addRealSupportTicketMessage,
  getAllRealDisputes,
  getAllRealRefundRequests,
  getAllRealTickets,
  updateRealDisputeStatus,
  updateRealRefundRequestStatus,
  updateRealSupportTicket,
} from "@/services/support";
import type {
  Dispute,
  RefundRequest,
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types";

type QueueFilter = "all" | SupportTicketStatus;
type PriorityFilter = "all" | SupportTicketPriority;
type AssigneeFilter = "all" | "unassigned" | string;
type SlaFilter = "all" | "on_track" | "at_risk" | "breached" | "met";
type ReplyVisibility = "customer_visible" | "internal";

const supportAgents = [
  { id: "support-roseline", name: "Roseline Admin" },
  { id: "support-junior", name: "Junior Support" },
  { id: "support-ops", name: "Operations Support" },
];

function statusBadge(status: string) {
  const variant =
    status.includes("resolved") ||
    status.includes("approved") ||
    status.includes("processed") ||
    status.includes("action") ||
    status === "met"
      ? "success"
      : status.includes("rejected") ||
          status.includes("dismissed") ||
          status.includes("breached")
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function priorityBadge(priority: SupportTicketPriority) {
  const variant = priority === "urgent" || priority === "high" ? "destructive" : "neutral";

  return <Badge variant={variant}>{priority}</Badge>;
}

function getCustomerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? customerId;
}

function getStoreName(storeId: string | undefined) {
  if (!storeId) return "No store linked";
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

function getVendorName(vendorId: string | undefined) {
  if (!vendorId) return "No vendor linked";
  return vendors.find((vendor) => vendor.id === vendorId)?.name ?? vendorId;
}

function getTicketSlaDueAt(ticket: SupportTicket) {
  return ticket.slaDueAt ?? getSlaDueAt(ticket.priority, ticket.createdAt);
}

export function SupportWorkbenchClient() {
  const {
    isReady,
    localOrders,
    localReports,
    saveCustomerNotification,
    saveMarketplaceReport,
  } = useMarketplaceStorage();
  const orders = mergeOrders(localOrders);
  const reports = mergeMarketplaceReports(localReports);
  const [disputes, setDisputes] = React.useState<Dispute[]>([]);
  const [refunds, setRefunds] = React.useState<RefundRequest[]>([]);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [disputesDataReady, setDisputesDataReady] = React.useState(false);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<QueueFilter>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState<AssigneeFilter>("all");
  const [slaFilter, setSlaFilter] = React.useState<SlaFilter>("all");
  const [reply, setReply] = React.useState("");
  const [replyVisibility, setReplyVisibility] =
    React.useState<ReplyVisibility>("customer_visible");
  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null;

  const filteredTickets = tickets.filter((ticket) => {
    const normalizedQuery = query.trim().toLowerCase();
    const order = orders.find((item) => item.id === ticket.orderId);
    const linkedStoreId = ticket.storeId ?? order?.storeId;
    const linkedVendorId =
      ticket.vendorId ?? stores.find((store) => store.id === linkedStoreId)?.vendorId;
    const matchesQuery =
      !normalizedQuery ||
      ticket.id.toLowerCase().includes(normalizedQuery) ||
      ticket.subject.toLowerCase().includes(normalizedQuery) ||
      getCustomerName(ticket.customerId).toLowerCase().includes(normalizedQuery) ||
      getStoreName(linkedStoreId).toLowerCase().includes(normalizedQuery) ||
      getVendorName(linkedVendorId).toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" && !ticket.assignedTo) ||
      ticket.assignedTo === assigneeFilter;
    const matchesSla = slaFilter === "all" || getTicketSlaStatus(ticket) === slaFilter;

    return matchesQuery && matchesStatus && matchesPriority && matchesAssignee && matchesSla;
  });

  const openCount =
    tickets.filter((ticket) => ticket.status !== "resolved").length +
    refunds.filter((request) => request.status === "requested").length +
    disputes.filter((dispute) => dispute.status !== "closed").length +
    reports.filter((report) => ["submitted", "reviewing"].includes(report.status)).length;
  const urgentCount = tickets.filter((ticket) => ["urgent", "high"].includes(ticket.priority)).length;
  const breachedCount = tickets.filter((ticket) => getTicketSlaStatus(ticket) === "breached").length;
  const assignedCount = tickets.filter((ticket) => Boolean(ticket.assignedTo)).length;

  React.useEffect(() => {
    if (!selectedTicketId && tickets[0]) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [selectedTicketId, tickets]);

  const refreshDisputesData = React.useCallback(async () => {
    setDisputesDataReady(false);
    const [realDisputes, realRefunds, realTickets] = await Promise.all([
      getAllRealDisputes(),
      getAllRealRefundRequests(),
      getAllRealTickets(),
    ]);
    setDisputes(realDisputes);
    setRefunds(realRefunds);
    setTickets(realTickets);
    setDisputesDataReady(true);
  }, []);

  React.useEffect(() => {
    refreshDisputesData();
  }, [refreshDisputesData]);

  async function assignTicket(ticket: SupportTicket, agentId: string) {
    const agent = supportAgents.find((item) => item.id === agentId);
    if (!agent) return;

    const result = await updateRealSupportTicket(ticket.id, {
      assignedTo: agent.id,
      assignedToName: agent.name,
    });

    if (!result.ok) {
      toast({ title: "Could not assign ticket", description: result.reason, variant: "destructive" });
      return;
    }

    await addRealSupportTicketMessage(ticket.id, {
      authorType: "support",
      authorName: "Maket Lakay Support",
      body: `Ticket assigned to ${agent.name}.`,
    });

    setSelectedTicketId(ticket.id);
    toast({ title: "Ticket assigned", description: `${ticket.id} assigned to ${agent.name}.` });
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: "Roseline Admin",
      actorRole: "support",
      action: "support.ticket_assigned",
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary: `${ticket.id} assigned to ${agent.name}.`,
      oldValue: ticket.assignedToName ?? "Unassigned",
      newValue: agent.name,
      severity: "info",
    });
    await refreshDisputesData();
  }

  async function changePriority(ticket: SupportTicket, priority: SupportTicketPriority) {
    const result = await updateRealSupportTicket(ticket.id, {
      priority,
      slaDueAt: getSlaDueAt(priority, ticket.createdAt),
    });

    if (!result.ok) {
      toast({ title: "Could not update priority", description: result.reason, variant: "destructive" });
      return;
    }

    await addRealSupportTicketMessage(ticket.id, {
      authorType: "support",
      authorName: "Maket Lakay Support",
      body: `Priority changed to ${priority}.`,
    });

    setSelectedTicketId(ticket.id);
    toast({ title: "Priority updated", description: `${ticket.id} priority changed to ${priority}.` });
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: "Roseline Admin",
      actorRole: "support",
      action: "support.ticket_priority_changed",
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary: `${ticket.id} priority changed.`,
      oldValue: ticket.priority,
      newValue: priority,
      severity: priority === "urgent" || priority === "high" ? "warning" : "info",
    });
    await refreshDisputesData();
  }

  async function changeStatus(ticket: SupportTicket, status: SupportTicketStatus) {
    const result = await updateRealSupportTicket(ticket.id, {
      status,
      slaDueAt: ticket.slaDueAt ?? getSlaDueAt(ticket.priority, ticket.createdAt),
    });

    if (!result.ok) {
      toast({ title: "Could not update status", description: result.reason, variant: "destructive" });
      return;
    }

    await addRealSupportTicketMessage(ticket.id, {
      authorType: "support",
      authorName: "Maket Lakay Support",
      body: `Status changed to ${status.replaceAll("_", " ")}.`,
    });

    setSelectedTicketId(ticket.id);
    toast({
      title: "Ticket status updated",
      description: `${ticket.id} is now ${status.replaceAll("_", " ")}.`,
    });
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: "Roseline Admin",
      actorRole: "support",
      action: "support.ticket_status_changed",
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary: `${ticket.id} status changed.`,
      oldValue: ticket.status,
      newValue: status,
      severity: status === "resolved" ? "info" : "warning",
    });
    await refreshDisputesData();
  }

  async function sendReply(ticket: SupportTicket) {
    const body = reply.trim();
    if (!body) return;

    const result = await addRealSupportTicketMessage(ticket.id, {
      authorType: "support",
      authorName: selectedTicket?.assignedToName ?? "Maket Lakay Support",
      body,
      visibility: replyVisibility,
    });

    if (!result.ok) {
      toast({ title: "Could not send reply", description: result.reason, variant: "destructive" });
      return;
    }

    setSelectedTicketId(ticket.id);
    toast({
      title: replyVisibility === "internal" ? "Internal note added" : "Reply added",
      description: `${ticket.id} conversation was updated.`,
    });
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: selectedTicket?.assignedToName ?? "Roseline Admin",
      actorRole: "support",
      action:
        replyVisibility === "internal"
          ? "support.ticket_internal_note_added"
          : "support.ticket_reply_added",
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary:
        replyVisibility === "internal"
          ? "Internal support note was added to the ticket."
          : "Support reply was added to the ticket conversation.",
      newValue: body.slice(0, 120),
      severity: "info",
    });
    setReply("");
    await refreshDisputesData();
  }

  async function escalateTicket(ticket: SupportTicket) {
    const reason =
      "Escalated to admin review. Support should not take final action until an admin confirms the next step.";
    const now = new Date().toISOString();

    const result = await updateRealSupportTicket(ticket.id, {
      priority: "urgent",
      slaDueAt: getSlaDueAt("urgent", now),
      escalationStatus: "pending_admin",
      escalatedAt: now,
      escalatedByName: selectedTicket?.assignedToName ?? "Maket Lakay Support",
      escalationReason: reason,
    });

    if (!result.ok) {
      toast({ title: "Could not escalate ticket", description: result.reason, variant: "destructive" });
      return;
    }

    await addRealSupportTicketMessage(ticket.id, {
      authorType: "support",
      authorName: selectedTicket?.assignedToName ?? "Maket Lakay Support",
      body: reason,
      visibility: "internal",
    });

    setSelectedTicketId(ticket.id);
    toast({ title: "Ticket escalated", description: `${ticket.id} was escalated to admin review.` });
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: selectedTicket?.assignedToName ?? "Roseline Admin",
      actorRole: "support",
      action: "support.ticket_escalated",
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary: "Support escalated ticket to admin review.",
      oldValue: ticket.priority,
      newValue: "urgent",
      severity: "critical",
    });
    await refreshDisputesData();
  }

  async function approveRefund(refundId: string) {
    const request = refunds.find((item) => item.id === refundId);

    if (!request) return;

    const result = await updateRealRefundRequestStatus(request.id, "approved");

    if (!result.ok) {
      toast({
        title: "Could not approve refund",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    saveCustomerNotification(
      createSupportCustomerNotification({
        customerId: request.customerId,
        orderId: request.orderId,
        title: "Refund approved",
        message: `${request.orderId}: support approved your refund request for ${formatCurrency(request.amount, request.currency)}.`,
      }),
    );
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: "Roseline Admin",
      actorRole: "support",
      action: "refund.request_approved",
      entityType: "refund_request",
      entityId: request.id,
      entityLabel: request.orderId,
      summary: "Support approved a refund request.",
      oldValue: request.status,
      newValue: "approved",
      severity: "critical",
    });
    toast({ title: "Refund approved", description: `${request.id} is ready for processing.` });
    await refreshDisputesData();
  }

  async function resolveDispute(dispute: Dispute) {
    const result = await updateRealDisputeStatus(dispute.id, "resolved");

    if (!result.ok) {
      toast({
        title: "Could not resolve dispute",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    saveCustomerNotification(
      createSupportCustomerNotification({
        customerId: dispute.customerId,
        orderId: dispute.orderId,
        title: "Dispute resolved",
        message: `${dispute.orderId}: support resolved your dispute. Review the support center for details.`,
      }),
    );
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: "Roseline Admin",
      actorRole: "support",
      action: "dispute.resolved",
      entityType: "dispute",
      entityId: dispute.id,
      entityLabel: dispute.orderId,
      summary: "Support marked dispute as resolved.",
      oldValue: dispute.status,
      newValue: "resolved",
      severity: "warning",
    });
    toast({ title: "Dispute resolved", description: `${dispute.id} was updated.` });
    await refreshDisputesData();
  }

  function actionReport(reportId: string) {
    const report = reports.find((item) => item.id === reportId);

    if (!report) return;
    saveMarketplaceReport(updateReportStatus(report, "action_taken"));
    addAuditLogEntry({
      actorId: "support-roseline",
      actorName: "Roseline Admin",
      actorRole: "support",
      action: "report.action_recorded",
      entityType: "marketplace_report",
      entityId: report.id,
      entityLabel: getReportTargetLabel(report),
      summary: "Support recorded action on marketplace report.",
      oldValue: report.status,
      newValue: "action_taken",
      severity: "warning",
    });
    toast({ title: "Report action recorded", description: `${report.id} was updated locally.` });
  }

  if (!isReady || !disputesDataReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Support Operations
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Support queue</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Assign tickets, monitor SLA risk, review linked orders, and keep customer conversations moving.
            </p>
          </div>
          <Badge variant={breachedCount ? "destructive" : "success"}>
            {breachedCount ? `${breachedCount} SLA breached` : "SLA healthy"}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Open queue", value: openCount, icon: LifeBuoy },
          { label: "Urgent or high", value: urgentCount, icon: AlertTriangle },
          { label: "Assigned tickets", value: assignedCount, icon: UserCheck },
          { label: "SLA breached", value: breachedCount, icon: Clock3 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </div>
              <Icon className="size-8 text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Ticket priority queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_150px_150px_170px_150px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="rounded-none pl-9 shadow-none"
                  placeholder="Search ticket, customer, vendor"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                aria-label="Filter tickets by status"
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as QueueFilter)}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="waiting_on_customer">Waiting</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                aria-label="Filter tickets by priority"
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
              >
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
              <select
                aria-label="Filter tickets by assignment"
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {supportAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter tickets by SLA"
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={slaFilter}
                onChange={(event) => setSlaFilter(event.target.value as SlaFilter)}
              >
                <option value="all">All SLA</option>
                <option value="on_track">On track</option>
                <option value="at_risk">At risk</option>
                <option value="breached">Breached</option>
                <option value="met">Met</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const order = orders.find((item) => item.id === ticket.orderId);
                const storeId = ticket.storeId ?? order?.storeId;
                const vendorId = ticket.vendorId ?? stores.find((store) => store.id === storeId)?.vendorId;
                const selected = selectedTicket?.id === ticket.id;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`w-full border bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{ticket.subject}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ticket.id} · {getCustomerName(ticket.customerId)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {priorityBadge(ticket.priority)}
                        {statusBadge(ticket.status)}
                        {statusBadge(getTicketSlaStatus(ticket))}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Assignee: {ticket.assignedToName ?? "Unassigned"}</p>
                      <p>SLA due: {formatDate(getTicketSlaDueAt(ticket))}</p>
                      <p>Order: {ticket.orderId ?? "No order linked"}</p>
                      <p>Vendor: {getVendorName(vendorId)}</p>
                      <p>Store: {getStoreName(storeId)}</p>
                      <p>Updated: {formatDate(ticket.updatedAt)}</p>
                    </div>
                  </button>
                );
              })}
              {!filteredTickets.length ? (
                <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No tickets match the current support filters.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              Ticket detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <TicketDetailPanel
                orders={orders}
                reply={reply}
                replyVisibility={replyVisibility}
                ticket={selectedTicket}
                onAssign={assignTicket}
                onEscalate={escalateTicket}
                onPriorityChange={changePriority}
                onReplyChange={setReply}
                onReplyVisibilityChange={setReplyVisibility}
                onSendReply={sendReply}
                onStatusChange={changeStatus}
              />
            ) : (
              <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Select a support ticket to review the conversation.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Refund requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {refunds.slice(0, 5).map((request) => (
              <div key={request.id} className="border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {formatCurrency(request.amount, request.currency)} · {request.orderId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                  {statusBadge(request.status)}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{request.reason}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={request.status !== "requested"}
                  onClick={() => approveRefund(request.id)}
                >
                  Approve refund
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-primary" />
              Disputes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disputes.slice(0, 5).map((dispute) => (
              <div key={dispute.id} className="border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{dispute.orderId}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                  {statusBadge(dispute.status)}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{dispute.reason}</p>
                <p className="mt-2 text-sm font-semibold">
                  Requested: {dispute.requestedResolution}
                </p>
                {(dispute.evidenceRecords ?? []).length ? (
                  <div className="mt-3 space-y-2 border bg-muted/30 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Evidence
                    </p>
                    {dispute.evidenceRecords?.map((evidence) => (
                      <div key={evidence.id} className="border bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black">{evidence.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(evidence.createdAt)}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {evidence.authorName}
                        </p>
                        <p className="mt-2 text-muted-foreground">{evidence.notes}</p>
                        {evidence.imagePreviewUrl ? (
                          <Image
                            src={evidence.imagePreviewUrl}
                            alt={evidence.title}
                            width={360}
                            height={220}
                            className="mt-3 max-h-56 w-full border object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={dispute.status === "resolved" || dispute.status === "closed"}
                  onClick={() => resolveDispute(dispute)}
                >
                  Resolve dispute
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product and vendor reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.slice(0, 5).map((report) => (
              <div key={report.id} className="border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{getReportTargetLabel(report)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {report.targetType} · {report.reason} · {formatDate(report.createdAt)}
                    </p>
                  </div>
                  {statusBadge(report.status)}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.details}</p>
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={report.status === "action_taken"}
                  onClick={() => actionReport(report.id)}
                >
                  Record action
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TicketDetailPanel({
  onAssign,
  onEscalate,
  onPriorityChange,
  onReplyChange,
  onReplyVisibilityChange,
  onSendReply,
  onStatusChange,
  orders,
  reply,
  replyVisibility,
  ticket,
}: {
  onAssign: (ticket: SupportTicket, agentId: string) => void;
  onEscalate: (ticket: SupportTicket) => void;
  onPriorityChange: (ticket: SupportTicket, priority: SupportTicketPriority) => void;
  onReplyChange: (value: string) => void;
  onReplyVisibilityChange: (value: ReplyVisibility) => void;
  onSendReply: (ticket: SupportTicket) => void;
  onStatusChange: (ticket: SupportTicket, status: SupportTicketStatus) => void;
  orders: ReturnType<typeof mergeOrders>;
  reply: string;
  replyVisibility: ReplyVisibility;
  ticket: SupportTicket;
}) {
  const order = orders.find((item) => item.id === ticket.orderId);
  const storeId = ticket.storeId ?? order?.storeId;
  const vendorId = ticket.vendorId ?? stores.find((store) => store.id === storeId)?.vendorId;
  const slaStatus = getTicketSlaStatus(ticket);
  const needsSlaAttention = slaStatus === "breached" || slaStatus === "at_risk";

  return (
    <div className="space-y-4">
      <section className="border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{ticket.subject}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ticket.id} · {ticket.category} · opened {formatDate(ticket.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {priorityBadge(ticket.priority)}
            {statusBadge(ticket.status)}
            {statusBadge(slaStatus)}
          </div>
        </div>
      </section>

      {needsSlaAttention ? (
        <section className="border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-destructive" />
            <div>
              <p className="font-black">
                {slaStatus === "breached" ? "SLA breached" : "SLA at risk"}
              </p>
              <p className="mt-1 leading-6 text-muted-foreground">
                Review this ticket before {formatDate(getTicketSlaDueAt(ticket))}. Escalate it if
                admin approval is needed for refunds, account action, or vendor enforcement.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <ContextField label="Customer" value={getCustomerName(ticket.customerId)} />
        <ContextField label="Order" value={ticket.orderId ?? "No order linked"} />
        <ContextField label="Vendor" value={getVendorName(vendorId)} />
        <ContextField label="Store" value={getStoreName(storeId)} />
        <ContextField label="Assignee" value={ticket.assignedToName ?? "Unassigned"} />
        <ContextField label="SLA due" value={formatDate(getTicketSlaDueAt(ticket))} />
      </section>

      <section className="grid gap-3">
        <Button type="button" variant="outline" onClick={() => onEscalate(ticket)}>
          <AlertTriangle className="size-4" />
          Escalate to admin
        </Button>
        <label className="grid gap-1 text-sm font-semibold">
          Assign ticket
          <select
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={ticket.assignedTo ?? ""}
            onChange={(event) => onAssign(ticket, event.target.value)}
          >
            <option value="" disabled>
              Select assignee
            </option>
            {supportAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            Priority
            <select
              className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={ticket.priority}
              onChange={(event) => onPriorityChange(ticket, event.target.value as SupportTicketPriority)}
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Status
            <select
              className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={ticket.status}
              onChange={(event) => onStatusChange(ticket, event.target.value as SupportTicketStatus)}
            >
              <option value="open">Open</option>
              <option value="waiting_on_customer">Waiting on customer</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
        </div>
      </section>

      <section className="border p-4">
        <h3 className="font-black">Conversation</h3>
        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
          {ticket.messages.map((message) => (
            <article
              key={message.id}
              className={`border p-3 text-sm ${
                message.visibility === "internal"
                  ? "border-amber-300 bg-amber-50"
                  : "bg-muted/20"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black">{message.authorName}</p>
                  <Badge variant={message.visibility === "internal" ? "secondary" : "outline"}>
                    {message.visibility === "internal" ? "Internal note" : "Customer-visible"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
              </div>
              <p className="mt-2 leading-6 text-muted-foreground">{message.body}</p>
            </article>
          ))}
        </div>
        <label className="mt-3 grid gap-1 text-sm font-semibold">
          Message type
          <select
            className="h-10 border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={replyVisibility}
            onChange={(event) => onReplyVisibilityChange(event.target.value as ReplyVisibility)}
          >
            <option value="customer_visible">Customer-visible reply</option>
            <option value="internal">Internal support note</option>
          </select>
        </label>
        <textarea
          className="mt-3 min-h-28 w-full border bg-white p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={
            replyVisibility === "internal"
              ? "Write an internal note for support/admin..."
              : "Write a customer-visible support reply..."
          }
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
        />
        <Button className="mt-3 w-full" type="button" onClick={() => onSendReply(ticket)}>
          {replyVisibility === "internal" ? "Add internal note" : "Add customer reply"}
        </Button>
      </section>
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-white p-3 text-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-black">{value}</p>
    </div>
  );
}
