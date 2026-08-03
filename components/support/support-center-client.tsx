"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  FileQuestion,
  Flag,
  ImagePlus,
  Inbox,
  LifeBuoy,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { EmptyState } from "@/components/marketplace/empty-state";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { products, stores, vendors } from "@/data/mock-data";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { addAuditLogEntry } from "@/lib/audit-log";
import { mergeOrders } from "@/lib/orders";
import {
  appendDisputeEvidence,
  appendTicketMessage,
  createDispute,
  createMarketplaceReport,
  createRefundRequest,
  createSupportTicket,
  getReportTargetLabel,
  getTicketSlaStatus,
  mergeDisputes,
  mergeMarketplaceReports,
  mergeRefundRequests,
  mergeSupportTickets,
} from "@/lib/support";
import {
  disputeSchema,
  marketplaceReportSchema,
  refundRequestSchema,
  supportReplySchema,
  supportTicketSchema,
  type DisputeInput,
  type MarketplaceReportInput,
  type RefundRequestInput,
  type SupportReplyInput,
  type SupportTicketInput,
} from "@/lib/schemas";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/types";

function fieldError(message?: string) {
  return message ? <p className="text-xs font-semibold text-destructive">{message}</p> : null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function supportStatusBadge(status: SupportTicket["status"]) {
  return (
    <Badge variant={status === "resolved" ? "success" : status === "waiting_on_customer" ? "neutral" : "secondary"}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

function slaBadge(ticket: SupportTicket) {
  const status = getTicketSlaStatus(ticket);
  const variant =
    status === "breached" ? "destructive" : status === "at_risk" ? "secondary" : "success";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function getPublicTicketTimeline(ticket: SupportTicket) {
  return [
    {
      label: "Ticket opened",
      description: formatDate(ticket.createdAt),
      active: true,
    },
    {
      label: ticket.assignedToName ? "Assigned to support" : "Waiting for assignment",
      description: ticket.assignedToName ?? "Support will pick this up soon.",
      active: Boolean(ticket.assignedToName),
    },
    {
      label: ticket.escalationStatus ? "Admin review" : "Support review",
      description: ticket.escalationStatus
        ? ticket.escalationStatus.replaceAll("_", " ")
        : "A support agent will reply in this thread.",
      active: Boolean(ticket.escalationStatus),
    },
    {
      label: "Resolved",
      description: ticket.status === "resolved" ? "This ticket is closed." : "Not resolved yet.",
      active: ticket.status === "resolved",
    },
  ];
}

export function SupportCenterClient() {
  const {
    isReady,
    localDisputes,
    localOrders,
    localRefundRequests,
    localReports,
    localSupportTickets,
    saveDispute,
    saveMarketplaceReport,
    saveRefundRequest,
    saveSupportTicket,
  } = useMarketplaceStorage();
  const { user: currentUser, isReady: authReady } = useAuth();
  const activeCustomerId = currentUser?.id ?? "";
  const activeCustomerName = currentUser?.name ?? "";
  const orders = mergeOrders(localOrders).filter((order) => order.customerId === activeCustomerId);
  const supportTickets = mergeSupportTickets(localSupportTickets);
  const refundRequests = mergeRefundRequests(localRefundRequests);
  const disputes = mergeDisputes(localDisputes);
  const reports = mergeMarketplaceReports(localReports).filter(
    (report) => report.reporterCustomerId === activeCustomerId,
  );
  const customerTickets = supportTickets.filter((ticket) => ticket.customerId === activeCustomerId);
  const customerRefundRequests = refundRequests.filter(
    (request) => request.customerId === activeCustomerId,
  );
  const customerDisputes = disputes.filter((dispute) => dispute.customerId === activeCustomerId);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [ticketQuery, setTicketQuery] = React.useState("");
  const [disputePhotoPreview, setDisputePhotoPreview] = React.useState("");
  const [disputePhotoName, setDisputePhotoName] = React.useState("");

  const ticketForm = useForm<SupportTicketInput>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: { category: "order", subject: "", message: "", orderId: "" },
  });
  const replyForm = useForm<SupportReplyInput>({
    resolver: zodResolver(supportReplySchema),
    defaultValues: { message: "" },
  });
  const refundForm = useForm<RefundRequestInput>({
    resolver: zodResolver(refundRequestSchema),
    defaultValues: { orderId: orders[0]?.id ?? "", amount: 5, reason: "" },
  });
  const disputeForm = useForm<DisputeInput>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      orderId: orders[0]?.id ?? "",
      reason: "",
      requestedResolution: "Refund or replacement",
    },
  });
  const reportForm = useForm<MarketplaceReportInput>({
    resolver: zodResolver(marketplaceReportSchema),
    defaultValues: {
      targetType: "product",
      targetId: products[0]?.id ?? "",
      reason: "misleading",
      details: "",
    },
  });
  const reportTargetType = reportForm.watch("targetType");
  const selectedTicket =
    customerTickets.find((ticket) => ticket.id === selectedTicketId) ?? customerTickets[0] ?? null;
  const filteredTickets = customerTickets.filter((ticket) => {
    const query = ticketQuery.trim().toLowerCase();

    if (!query) return true;

    return (
      ticket.id.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query) ||
      ticket.category.toLowerCase().includes(query) ||
      (ticket.orderId ?? "").toLowerCase().includes(query)
    );
  });
  const visibleTicketMessages =
    selectedTicket?.messages.filter((message) => message.visibility !== "internal") ?? [];
  const reportTargets = React.useMemo(
    () =>
      reportTargetType === "product"
        ? products.map((product) => ({ id: product.id, label: product.name }))
        : reportTargetType === "store"
          ? stores.map((store) => ({ id: store.id, label: store.name }))
          : vendors.map((vendor) => ({ id: vendor.id, label: vendor.name })),
    [reportTargetType],
  );

  React.useEffect(() => {
    if (reportTargets.length) {
      reportForm.setValue("targetId", reportTargets[0].id);
    }
  }, [reportForm, reportTargets, reportTargetType]);

  React.useEffect(() => {
    if (!selectedTicketId && customerTickets[0]) {
      setSelectedTicketId(customerTickets[0].id);
    }
  }, [customerTickets, selectedTicketId]);

  function findOrder(orderId: string) {
    return orders.find((order) => order.id === orderId) ?? orders[0];
  }

  function submitTicket(input: SupportTicketInput) {
    const linkedOrder = input.orderId ? findOrder(input.orderId) : undefined;
    const linkedStore = linkedOrder ? stores.find((store) => store.id === linkedOrder.storeId) : undefined;

    const ticket = createSupportTicket({
        ...input,
        customerId: activeCustomerId,
        customerName: activeCustomerName,
        orderId: input.orderId || undefined,
        storeId: linkedOrder?.storeId,
        vendorId: linkedStore?.vendorId,
      });

    saveSupportTicket(ticket);
    addAuditLogEntry({
      actorId: activeCustomerId,
      actorName: activeCustomerName,
      actorRole: "customer",
      action: "support.ticket_created",
      entityType: "support_ticket",
      entityId: ticket.id,
      entityLabel: ticket.subject,
      summary: "Customer created a support ticket.",
      newValue: ticket.status,
      severity: ticket.priority === "high" || ticket.priority === "urgent" ? "warning" : "info",
    });
    ticketForm.reset({ category: input.category, subject: "", message: "", orderId: "" });
    toast({
      title: "Support ticket opened",
      description: "Maket Lakay support received the local ticket.",
    });
    setSelectedTicketId(ticket.id);
  }

  function submitTicketReply(input: SupportReplyInput) {
    if (!selectedTicket) return;

    const updatedTicket = appendTicketMessage(selectedTicket, {
      authorType: "customer",
      authorName: activeCustomerName,
      body: input.message,
      visibility: "customer_visible",
    });

    saveSupportTicket(updatedTicket);
    replyForm.reset({ message: "" });
    toast({
      title: "Reply sent",
      description: `${selectedTicket.id} was updated for support.`,
    });
    addAuditLogEntry({
      actorId: activeCustomerId,
      actorName: activeCustomerName,
      actorRole: "customer",
      action: "support.customer_reply_sent",
      entityType: "support_ticket",
      entityId: selectedTicket.id,
      entityLabel: selectedTicket.subject,
      summary: "Customer replied to a support ticket.",
      severity: "info",
    });
  }

  function submitRefund(input: RefundRequestInput) {
    const order = findOrder(input.orderId);
    if (!order) return;

    saveRefundRequest(
      createRefundRequest({
        orderId: order.id,
        customerId: order.customerId,
        storeId: order.storeId,
        amount: Math.min(input.amount, order.total),
        currency: order.currency,
        reason: input.reason,
      }),
    );
    refundForm.reset({ orderId: order.id, amount: 5, reason: "" });
    toast({
      title: "Refund requested",
      description: `${order.id} refund request was saved locally.`,
    });
  }

  function submitDispute(input: DisputeInput) {
    const order = findOrder(input.orderId);
    if (!order) return;

    const dispute = createDispute({
        orderId: order.id,
        customerId: order.customerId,
        storeId: order.storeId,
        reason: input.reason,
        requestedResolution: input.requestedResolution,
      });

    saveDispute(
      disputePhotoPreview
        ? appendDisputeEvidence(dispute, {
            authorType: "customer",
            authorName: activeCustomerName,
            title: "Customer photo evidence",
            notes: "Photo attached when the customer opened the dispute.",
            imagePreviewUrl: disputePhotoPreview,
            fileName: disputePhotoName,
          })
        : dispute,
    );
    disputeForm.reset({
      orderId: order.id,
      reason: "",
      requestedResolution: "Refund or replacement",
    });
    setDisputePhotoPreview("");
    setDisputePhotoName("");
    toast({
      title: "Dispute opened",
      description: `${order.id} dispute was saved locally.`,
    });
  }

  async function handleDisputePhoto(files: FileList | null) {
    const file = files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Image required",
        description: "Choose a photo file for dispute evidence.",
        variant: "destructive",
      });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setDisputePhotoPreview(dataUrl);
    setDisputePhotoName(file.name);
  }

  function submitReport(input: MarketplaceReportInput) {
    saveMarketplaceReport(
      createMarketplaceReport({
        ...input,
        reporterCustomerId: activeCustomerId,
      }),
    );
    reportForm.reset({
      targetType: input.targetType,
      targetId: reportTargets[0]?.id ?? input.targetId,
      reason: input.reason,
      details: "",
    });
    toast({
      title: "Report submitted",
      description: "Support can now review the product or vendor report.",
    });
  }

  if (!isReady || !authReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <section className="border bg-white p-5">
          <div className="flex items-center gap-3">
            <LifeBuoy className="size-8 text-primary" />
            <div>
              <h1 className="text-3xl font-black tracking-normal">Support center</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Log in to open tickets and track replies.
              </p>
            </div>
          </div>
        </section>
        <EmptyState
          icon={ShieldCheck}
          title="Log in required"
          description="Customer support tickets require a signed-in account."
        />
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }

  if (currentUser.role !== "customer") {
    return (
      <div className="space-y-6">
        <section className="border bg-white p-5">
          <div className="flex items-center gap-3">
            <LifeBuoy className="size-8 text-primary" />
            <div>
              <h1 className="text-3xl font-black tracking-normal">Support center</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Customer support tickets are scoped to customer profiles.
              </p>
            </div>
          </div>
        </section>
        <EmptyState
          icon={ShieldCheck}
          title="Customer accounts only"
          description="Support staff and admins should use the dashboard queue. Customers can open tickets, track replies, and follow dispute updates here."
        />
        <Button asChild>
          <Link href={currentUser.homeHref}>Go to my area</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="flex items-center gap-3">
          <LifeBuoy className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-black tracking-normal">Support center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Customer support tools for refunds, disputes, and marketplace reporting.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Tickets", customerTickets.length],
          ["Refund requests", customerRefundRequests.length],
          ["Disputes", customerDisputes.length],
          ["Reports", reports.length],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-5 text-primary" />
              My support tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tickets"
                value={ticketQuery}
                onChange={(event) => setTicketQuery(event.target.value)}
              />
            </label>
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  className={cn(
                    "w-full border bg-white p-3 text-left transition hover:border-primary",
                    selectedTicket?.id === ticket.id && "border-primary shadow-sm",
                  )}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{ticket.subject}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {ticket.id} · {ticket.category} · {formatDate(ticket.updatedAt)}
                      </span>
                    </span>
                    {supportStatusBadge(ticket.status)}
                  </span>
                </button>
              ))}
              {filteredTickets.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No tickets found"
                  description="Open a ticket below when you need help with an order, delivery, payment, refund, or account issue."
                />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-5 text-primary" />
              Ticket tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 border bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {selectedTicket.id}
                    </p>
                    <h2 className="mt-1 text-2xl font-black">{selectedTicket.subject}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedTicket.orderId ? (
                        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`/account/orders/${selectedTicket.orderId}`}>
                          {selectedTicket.orderId}
                        </Link>
                      ) : (
                        "No order linked"
                      )}{" "}
                      · Last updated {formatDate(selectedTicket.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supportStatusBadge(selectedTicket.status)}
                    {slaBadge(selectedTicket)}
                    <Badge variant="neutral">{selectedTicket.priority}</Badge>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  {getPublicTicketTimeline(selectedTicket).map((step) => (
                    <div key={step.label} className="border bg-white p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center border text-xs font-black",
                            step.active ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {step.active ? <span className="size-2 bg-current" /> : null}
                        </span>
                        <p className="text-sm font-black">{step.label}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>

                {selectedTicket.escalationStatus ? (
                  <div className="border border-primary/30 bg-primary/5 p-4 text-sm">
                    <div className="flex items-center gap-2 font-black">
                      <ShieldCheck className="size-4 text-primary" />
                      Admin review status: {selectedTicket.escalationStatus.replaceAll("_", " ")}
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {selectedTicket.adminResolution ??
                        selectedTicket.escalationReason ??
                        "Support escalated this ticket for admin review."}
                    </p>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-lg font-black">
                    <MessageSquare className="size-5 text-primary" />
                    Conversation
                  </h3>
                  {visibleTicketMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "border p-3 text-sm",
                        message.authorType === "customer" ? "bg-white" : "bg-muted/30",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black">{message.authorName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                      </div>
                      <p className="mt-2 text-muted-foreground">{message.body}</p>
                    </div>
                  ))}
                </div>

                <form className="space-y-3" onSubmit={replyForm.handleSubmit(submitTicketReply)}>
                  <textarea
                    className="min-h-28 w-full border bg-white p-3 text-sm"
                    placeholder="Reply to support"
                    {...replyForm.register("message")}
                  />
                  {fieldError(replyForm.formState.errors.message?.message)}
                  <Button type="submit" disabled={selectedTicket.status === "resolved"}>
                    <Send className="size-4" />
                    Send reply
                  </Button>
                </form>
              </div>
            ) : (
              <EmptyState
                icon={LifeBuoy}
                title="No support ticket selected"
                description="Open a ticket below and it will appear here with status tracking and replies."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="size-5 text-primary" />
                Open a support ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={ticketForm.handleSubmit(submitTicket)}>
                <Input placeholder="Subject" {...ticketForm.register("subject")} />
                {fieldError(ticketForm.formState.errors.subject?.message)}
                <label className="grid gap-1 text-sm font-semibold">
                  Category
                  <select className="border bg-white px-3 py-2" {...ticketForm.register("category")}>
                    <option value="order">Order</option>
                    <option value="delivery">Delivery</option>
                    <option value="payment">Payment</option>
                    <option value="refund">Refund</option>
                    <option value="account">Account</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Related order
                  <select className="border bg-white px-3 py-2" {...ticketForm.register("orderId")}>
                    <option value="">No order selected</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id} · {formatCurrency(order.total, order.currency)}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  className="min-h-28 w-full border bg-white p-3 text-sm"
                  placeholder="How can support help?"
                  {...ticketForm.register("message")}
                />
                {fieldError(ticketForm.formState.errors.message?.message)}
                <Button className="w-full" type="submit">
                  Create ticket
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="size-5 text-primary" />
                Request a refund
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={refundForm.handleSubmit(submitRefund)}>
                <label className="grid gap-1 text-sm font-semibold">
                  Order
                  <select className="border bg-white px-3 py-2" {...refundForm.register("orderId")}>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id} · {formatCurrency(order.total, order.currency)}
                      </option>
                    ))}
                  </select>
                </label>
                <Input type="number" min="1" step="1" {...refundForm.register("amount")} />
                {fieldError(refundForm.formState.errors.amount?.message)}
                <textarea
                  className="min-h-28 w-full border bg-white p-3 text-sm"
                  placeholder="Why are you requesting a refund?"
                  {...refundForm.register("reason")}
                />
                {fieldError(refundForm.formState.errors.reason?.message)}
                <Button className="w-full" type="submit" disabled={orders.length === 0}>
                  Submit refund request
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-primary" />
                Open a dispute
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={disputeForm.handleSubmit(submitDispute)}>
                <label className="grid gap-1 text-sm font-semibold">
                  Order
                  <select className="border bg-white px-3 py-2" {...disputeForm.register("orderId")}>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.id} · {formatCurrency(order.total, order.currency)}
                      </option>
                    ))}
                  </select>
                </label>
                <textarea
                  className="min-h-24 w-full border bg-white p-3 text-sm"
                  placeholder="What happened?"
                  {...disputeForm.register("reason")}
                />
                {fieldError(disputeForm.formState.errors.reason?.message)}
                <Input
                  placeholder="Requested resolution"
                  {...disputeForm.register("requestedResolution")}
                />
                {fieldError(disputeForm.formState.errors.requestedResolution?.message)}
                <label className="grid gap-2 border bg-muted/30 p-3 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <ImagePlus className="size-4 text-primary" />
                    Attach photo evidence
                  </span>
                  <input
                    className="text-sm"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleDisputePhoto(event.target.files)}
                  />
                  {disputePhotoPreview ? (
                    <span className="grid gap-2">
                      <span className="text-xs text-muted-foreground">{disputePhotoName}</span>
                      <Image
                        src={disputePhotoPreview}
                        alt="Dispute evidence preview"
                        width={320}
                        height={180}
                        className="max-h-44 w-full border object-cover"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDisputePhotoPreview("");
                          setDisputePhotoName("");
                        }}
                      >
                        Remove photo
                      </Button>
                    </span>
                  ) : null}
                </label>
                <Button className="w-full" type="submit" disabled={orders.length === 0}>
                  Open dispute
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="size-5 text-primary" />
                Report product or vendor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={reportForm.handleSubmit(submitReport)}>
                <label className="grid gap-1 text-sm font-semibold">
                  Report type
                  <select className="border bg-white px-3 py-2" {...reportForm.register("targetType")}>
                    <option value="product">Product</option>
                    <option value="store">Store</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Target
                  <select className="border bg-white px-3 py-2" {...reportForm.register("targetId")}>
                    {reportTargets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Reason
                  <select className="border bg-white px-3 py-2" {...reportForm.register("reason")}>
                    <option value="misleading">Misleading listing</option>
                    <option value="counterfeit">Counterfeit concern</option>
                    <option value="unsafe">Unsafe product</option>
                    <option value="prohibited">Prohibited item</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <textarea
                  className="min-h-24 w-full border bg-white p-3 text-sm"
                  placeholder="Share details for marketplace support."
                  {...reportForm.register("details")}
                />
                {fieldError(reportForm.formState.errors.details?.message)}
                <Button className="w-full" type="submit">
                  Submit report
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent support activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerTickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black">{ticket.subject}</p>
                    <Badge variant={ticket.status === "resolved" ? "success" : "secondary"}>
                      {ticket.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {ticket.category} · {formatDate(ticket.createdAt)}
                  </p>
                </div>
              ))}
              {customerRefundRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="border p-3 text-sm">
                  <p className="font-black">
                    {formatCurrency(request.amount, request.currency)} refund
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {request.orderId} · {request.status}
                  </p>
                </div>
              ))}
              {customerDisputes.slice(0, 3).map((dispute) => (
                <div key={dispute.id} className="border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black">{dispute.orderId}</p>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="mt-1 text-muted-foreground">{dispute.status.replaceAll("_", " ")}</p>
                </div>
              ))}
              {customerTickets.length === 0 &&
              customerRefundRequests.length === 0 &&
              customerDisputes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent customer support activity yet.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.slice(0, 5).map((report) => (
                <div key={report.id} className="border p-3 text-sm">
                  <p className="font-black">{getReportTargetLabel(report)}</p>
                  <p className="mt-1 text-muted-foreground">
                    {report.targetType} · {report.reason} · {report.status}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
