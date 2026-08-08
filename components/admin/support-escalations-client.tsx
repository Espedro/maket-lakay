"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Search,
  XCircle,
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
import { createSupportCustomerNotification, getTicketSlaStatus } from "@/lib/support";
import { formatDate } from "@/lib/utils";
import { addRealSupportTicketMessage, getAllRealTickets, updateRealSupportTicket } from "@/services/support";
import type { SupportEscalationStatus, SupportTicket } from "@/types";

type EscalationFilter = "all" | SupportEscalationStatus;

function getEscalationStatus(ticket: SupportTicket): SupportEscalationStatus | undefined {
  if (ticket.escalationStatus) return ticket.escalationStatus;

  const hasLegacyEscalation = ticket.messages.some((message) =>
    message.body.toLowerCase().includes("escalated to admin review"),
  );

  return hasLegacyEscalation ? "pending_admin" : undefined;
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

function statusBadge(status: SupportEscalationStatus) {
  const variant =
    status === "pending_admin"
      ? "secondary"
      : status === "approved" || status === "resolved"
        ? "success"
        : "destructive";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function ticketPriorityBadge(ticket: SupportTicket) {
  const variant = ticket.priority === "urgent" || ticket.priority === "high" ? "destructive" : "neutral";

  return <Badge variant={variant}>{ticket.priority}</Badge>;
}

export function SupportEscalationsClient() {
  const { isReady, localOrders, saveCustomerNotification } = useMarketplaceStorage();
  const orders = React.useMemo(() => mergeOrders(localOrders), [localOrders]);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [ticketsReady, setTicketsReady] = React.useState(false);
  const escalatedTickets = tickets.filter((ticket) => Boolean(getEscalationStatus(ticket)));
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<EscalationFilter>("all");
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [resolution, setResolution] = React.useState("");

  const refreshTickets = React.useCallback(async () => {
    setTicketsReady(false);
    setTickets(await getAllRealTickets());
    setTicketsReady(true);
  }, []);

  React.useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);
  const selectedTicket =
    escalatedTickets.find((ticket) => ticket.id === selectedTicketId) ??
    escalatedTickets[0] ??
    null;

  const filteredTickets = escalatedTickets.filter((ticket) => {
    const status = getEscalationStatus(ticket);
    const normalizedQuery = query.trim().toLowerCase();
    const order = orders.find((item) => item.id === ticket.orderId);
    const storeId = ticket.storeId ?? order?.storeId;
    const vendorId = ticket.vendorId ?? stores.find((store) => store.id === storeId)?.vendorId;
    const matchesQuery =
      !normalizedQuery ||
      ticket.id.toLowerCase().includes(normalizedQuery) ||
      ticket.subject.toLowerCase().includes(normalizedQuery) ||
      getCustomerName(ticket.customerId).toLowerCase().includes(normalizedQuery) ||
      getVendorName(vendorId).toLowerCase().includes(normalizedQuery) ||
      getStoreName(storeId).toLowerCase().includes(normalizedQuery);
    const matchesFilter = filter === "all" || status === filter;

    return matchesQuery && matchesFilter;
  });

  const pendingCount = escalatedTickets.filter(
    (ticket) => getEscalationStatus(ticket) === "pending_admin",
  ).length;
  const resolvedCount = escalatedTickets.filter((ticket) =>
    ["approved", "rejected", "resolved"].includes(getEscalationStatus(ticket) ?? ""),
  ).length;
  const breachedCount = escalatedTickets.filter(
    (ticket) => getTicketSlaStatus(ticket) === "breached",
  ).length;

  React.useEffect(() => {
    if (!selectedTicketId && escalatedTickets[0]) {
      setSelectedTicketId(escalatedTickets[0].id);
    }
  }, [escalatedTickets, selectedTicketId]);

  async function resolveEscalation(
    ticket: SupportTicket,
    status: Exclude<SupportEscalationStatus, "pending_admin">,
  ) {
    const nextResolution = resolution.trim();

    if (!nextResolution) {
      toast({
        title: "Resolution required",
        description: "Add an admin note before closing the escalation.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();
    const result = await updateRealSupportTicket(ticket.id, {
      escalationStatus: status,
      adminResolution: nextResolution,
      adminResolvedAt: now,
      status: status === "resolved" ? "resolved" : ticket.status,
    });

    if (!result.ok) {
      toast({
        title: "Could not update escalation",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    await addRealSupportTicketMessage(ticket.id, {
      authorType: "support",
      authorName: "Maket Admin",
      body: `Admin ${status.replaceAll("_", " ")} escalation: ${nextResolution}`,
      visibility: "internal",
    });

    saveCustomerNotification(
      createSupportCustomerNotification({
        customerId: ticket.customerId,
        orderId: ticket.orderId,
        title:
          status === "approved"
            ? "Support escalation approved"
            : status === "rejected"
              ? "Support escalation rejected"
              : "Support case resolved",
        message: `${ticket.orderId ?? ticket.id}: admin marked your support escalation as ${status.replaceAll("_", " ")}. ${nextResolution}`,
      }),
    );
    addAuditLogEntry({
      actorId: "admin-ops",
      actorName: "Maket Admin",
      actorRole: "admin",
      action: `support.escalation_${status}`,
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary: `Admin marked escalation as ${status.replaceAll("_", " ")}.`,
      oldValue: getEscalationStatus(ticket) ?? "pending_admin",
      newValue: status,
      severity: status === "rejected" ? "warning" : "info",
    });
    setSelectedTicketId(ticket.id);
    setResolution("");
    toast({
      title: "Escalation updated",
      description: `${ticket.id} was marked ${status.replaceAll("_", " ")}.`,
    });
    await refreshTickets();
  }

  if (!isReady || !ticketsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Admin Review
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              Support escalations
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review tickets escalated by Support Staff when a case needs admin approval,
              vendor enforcement, account action, payout review, or policy override.
            </p>
          </div>
          <Badge variant={pendingCount ? "secondary" : "success"}>
            {pendingCount ? `${pendingCount} pending admin` : "Escalations clear"}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={Clock3} label="Pending admin review" value={pendingCount} />
        <MetricCard icon={CheckCircle2} label="Closed escalations" value={resolvedCount} />
        <MetricCard icon={AlertTriangle} label="SLA breached" value={breachedCount} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-primary" />
              Escalation queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_190px]">
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
                aria-label="Filter escalations"
                className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={filter}
                onChange={(event) => setFilter(event.target.value as EscalationFilter)}
              >
                <option value="all">All escalations</option>
                <option value="pending_admin">Pending admin</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const status = getEscalationStatus(ticket) ?? "pending_admin";
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
                          {ticket.id} - {getCustomerName(ticket.customerId)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {statusBadge(status)}
                        {ticketPriorityBadge(ticket)}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Escalated: {ticket.escalatedAt ? formatDate(ticket.escalatedAt) : "Legacy escalation"}</p>
                      <p>By: {ticket.escalatedByName ?? "Support Staff"}</p>
                      <p>Vendor: {getVendorName(vendorId)}</p>
                      <p>Store: {getStoreName(storeId)}</p>
                    </div>
                  </button>
                );
              })}
              {!filteredTickets.length ? (
                <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No escalations match the current filters.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              Admin decision
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <EscalationDetail
                orders={orders}
                resolution={resolution}
                ticket={selectedTicket}
                onResolutionChange={setResolution}
                onResolve={resolveEscalation}
              />
            ) : (
              <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Select an escalation to review the admin decision workflow.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
        <Icon className="size-8 text-primary" />
      </CardContent>
    </Card>
  );
}

function EscalationDetail({
  onResolutionChange,
  onResolve,
  orders,
  resolution,
  ticket,
}: {
  onResolutionChange: (value: string) => void;
  onResolve: (
    ticket: SupportTicket,
    status: Exclude<SupportEscalationStatus, "pending_admin">,
  ) => void;
  orders: ReturnType<typeof mergeOrders>;
  resolution: string;
  ticket: SupportTicket;
}) {
  const status = getEscalationStatus(ticket) ?? "pending_admin";
  const order = orders.find((item) => item.id === ticket.orderId);
  const storeId = ticket.storeId ?? order?.storeId;
  const vendorId = ticket.vendorId ?? stores.find((store) => store.id === storeId)?.vendorId;
  const internalMessages = ticket.messages.filter(
    (message) => message.visibility === "internal" || message.authorType === "support",
  );
  const pending = status === "pending_admin";

  return (
    <div className="space-y-4">
      <section className="border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{ticket.subject}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ticket.id} - opened {formatDate(ticket.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusBadge(status)}
            {ticketPriorityBadge(ticket)}
            <Badge variant="outline">{getTicketSlaStatus(ticket).replaceAll("_", " ")}</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ContextField label="Customer" value={getCustomerName(ticket.customerId)} />
        <ContextField label="Order" value={ticket.orderId ?? "No order linked"} />
        <ContextField label="Vendor" value={getVendorName(vendorId)} />
        <ContextField label="Store" value={getStoreName(storeId)} />
        <ContextField label="Escalated by" value={ticket.escalatedByName ?? "Support Staff"} />
        <ContextField
          label="Escalated at"
          value={ticket.escalatedAt ? formatDate(ticket.escalatedAt) : "Legacy escalation"}
        />
      </section>

      <section className="border p-4">
        <h3 className="font-black">Escalation reason</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {ticket.escalationReason ??
            internalMessages.find((message) =>
              message.body.toLowerCase().includes("escalated to admin review"),
            )?.body ??
            "No escalation reason was recorded."}
        </p>
      </section>

      <section className="border p-4">
        <h3 className="font-black">Internal thread</h3>
        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {internalMessages.map((message) => (
            <article key={message.id} className="border bg-amber-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-black">{message.authorName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
              </div>
              <p className="mt-2 leading-6 text-muted-foreground">{message.body}</p>
            </article>
          ))}
          {!internalMessages.length ? (
            <p className="border bg-muted/30 p-3 text-sm text-muted-foreground">
              No internal notes are attached to this escalation yet.
            </p>
          ) : null}
        </div>
      </section>

      {ticket.adminResolution ? (
        <section className="border border-primary/30 bg-primary/5 p-4">
          <h3 className="font-black">Admin resolution</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {ticket.adminResolution}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {ticket.adminResolvedAt ? formatDate(ticket.adminResolvedAt) : "Resolution saved"}
          </p>
        </section>
      ) : null}

      <section className="border p-4">
        <label className="grid gap-2 text-sm font-semibold">
          Admin note
          <textarea
            className="min-h-28 border bg-white p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={!pending}
            placeholder="Explain the admin decision for Support Staff..."
            value={resolution}
            onChange={(event) => onResolutionChange(event.target.value)}
          />
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            disabled={!pending}
            onClick={() => onResolve(ticket, "approved")}
          >
            <CheckCircle2 className="size-4" />
            Approve
          </Button>
          <Button
            type="button"
            disabled={!pending}
            variant="outline"
            onClick={() => onResolve(ticket, "resolved")}
          >
            <MessageSquare className="size-4" />
            Resolve
          </Button>
          <Button
            type="button"
            disabled={!pending}
            variant="destructive"
            onClick={() => onResolve(ticket, "rejected")}
          >
            <XCircle className="size-4" />
            Reject
          </Button>
        </div>
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
