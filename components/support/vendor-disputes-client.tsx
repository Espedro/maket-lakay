"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  FileText,
  ImagePlus,
  MessageSquare,
  ReceiptText,
  Send,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customers, stores } from "@/data/mock-data";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { toast } from "@/hooks/use-toast";
import { addAuditLogEntry } from "@/lib/audit-log";
import { mergeOrders } from "@/lib/orders";
import { getTicketSlaStatus } from "@/lib/support";
import {
  vendorDisputeEvidenceSchema,
  vendorSupportReplySchema,
  type VendorDisputeEvidenceInput,
  type VendorSupportReplyInput,
} from "@/lib/schemas";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  addRealDisputeEvidence,
  addRealSupportTicketMessage,
  getRealDisputesForStore,
  getRealRefundRequestsForStore,
  getRealTicketsForStore,
} from "@/services/support";
import type { Dispute, RefundRequest, SupportTicket } from "@/types";

type VendorCaseTab = "tickets" | "disputes";

function customerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? customerId;
}

function statusBadge(status: string) {
  const variant =
    status.includes("resolved") || status.includes("approved") || status.includes("processed")
      ? "success"
      : status.includes("rejected") || status.includes("breached")
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function storeName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function VendorDisputesClient() {
  const { isReady, localOrders } = useMarketplaceStorage();
  const { auth, isReady: scopeReady, scopedStores } = useVendorScope();
  const orders = mergeOrders(localOrders);
  const [vendorDisputes, setVendorDisputes] = React.useState<Dispute[]>([]);
  const [vendorRefunds, setVendorRefunds] = React.useState<RefundRequest[]>([]);
  const [vendorTickets, setVendorTickets] = React.useState<SupportTicket[]>([]);
  const [disputesDataReady, setDisputesDataReady] = React.useState(false);
  const [tab, setTab] = React.useState<VendorCaseTab>("tickets");
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [selectedDisputeId, setSelectedDisputeId] = React.useState<string | null>(null);
  const [evidencePhotoPreview, setEvidencePhotoPreview] = React.useState("");
  const [evidencePhotoName, setEvidencePhotoName] = React.useState("");
  const replyForm = useForm<VendorSupportReplyInput>({
    resolver: zodResolver(vendorSupportReplySchema),
    defaultValues: { message: "" },
  });
  const evidenceForm = useForm<VendorDisputeEvidenceInput>({
    resolver: zodResolver(vendorDisputeEvidenceSchema),
    defaultValues: { title: "", notes: "" },
  });

  const refreshDisputesData = React.useCallback(async () => {
    if (scopedStores.length === 0) {
      setVendorDisputes([]);
      setVendorRefunds([]);
      setVendorTickets([]);
      setDisputesDataReady(true);
      return;
    }

    setDisputesDataReady(false);
    const [disputesByStore, refundsByStore, ticketsByStore] = await Promise.all([
      Promise.all(scopedStores.map((store) => getRealDisputesForStore(store.id))),
      Promise.all(scopedStores.map((store) => getRealRefundRequestsForStore(store.id))),
      Promise.all(scopedStores.map((store) => getRealTicketsForStore(store.id))),
    ]);
    setVendorDisputes(disputesByStore.flat());
    setVendorRefunds(refundsByStore.flat());
    setVendorTickets(ticketsByStore.flat());
    setDisputesDataReady(true);
  }, [scopedStores]);

  React.useEffect(() => {
    if (!scopeReady) return;
    refreshDisputesData();
  }, [scopeReady, refreshDisputesData]);

  function ticketStoreId(ticket: SupportTicket) {
    const orderStoreId = orders.find((order) => order.id === ticket.orderId)?.storeId;
    return ticket.storeId ?? orderStoreId;
  }

  const selectedTicket =
    vendorTickets.find((ticket) => ticket.id === selectedTicketId) ?? vendorTickets[0] ?? null;
  const selectedDispute =
    vendorDisputes.find((dispute) => dispute.id === selectedDisputeId) ??
    vendorDisputes[0] ??
    null;

  React.useEffect(() => {
    if (!selectedTicketId && vendorTickets[0]) {
      setSelectedTicketId(vendorTickets[0].id);
    }
  }, [selectedTicketId, vendorTickets]);

  React.useEffect(() => {
    if (!selectedDisputeId && vendorDisputes[0]) {
      setSelectedDisputeId(vendorDisputes[0].id);
    }
  }, [selectedDisputeId, vendorDisputes]);

  async function sendVendorReply(values: VendorSupportReplyInput) {
    if (!selectedTicket) return;

    const result = await addRealSupportTicketMessage(selectedTicket.id, {
      authorType: "vendor",
      authorName: auth.user?.name ?? "",
      body: values.message,
      visibility: "customer_visible",
    });

    if (!result.ok) {
      toast({
        title: "Could not send reply",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    replyForm.reset({ message: "" });
    toast({
      title: "Vendor reply sent",
      description: `${selectedTicket.id} was updated for support and the customer.`,
    });
    addAuditLogEntry({
      actorId: auth.user?.id ?? "",
      actorName: auth.user?.name ?? "",
      actorRole: "vendor",
      action: "vendor.support_reply_sent",
      entityType: "support_ticket",
      entityId: selectedTicket.id,
      entityLabel: selectedTicket.subject,
      summary: "Vendor replied to a support ticket.",
      severity: "info",
    });
    await refreshDisputesData();
  }

  async function addEvidence(values: VendorDisputeEvidenceInput) {
    if (!selectedDispute) return;

    const result = await addRealDisputeEvidence(selectedDispute.id, {
      authorType: "vendor",
      authorName: auth.user?.name ?? "",
      title: values.title,
      notes: values.notes,
      imagePreviewUrl: evidencePhotoPreview || undefined,
      fileName: evidencePhotoName || undefined,
    });

    if (!result.ok) {
      toast({
        title: "Could not add evidence",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    await refreshDisputesData();
    evidenceForm.reset({ title: "", notes: "" });
    setEvidencePhotoPreview("");
    setEvidencePhotoName("");
    toast({
      title: "Evidence added",
      description: `${selectedDispute.id} now includes vendor evidence.`,
    });
    addAuditLogEntry({
      actorId: auth.user?.id ?? "",
      actorName: auth.user?.name ?? "",
      actorRole: "vendor",
      action: "vendor.dispute_evidence_added",
      entityType: "dispute",
      entityId: selectedDispute.id,
      entityLabel: selectedDispute.orderId,
      summary: "Vendor added evidence to a dispute.",
      severity: "info",
    });
  }

  async function handleEvidencePhoto(files: FileList | null) {
    const file = files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Image required",
        description: "Choose a photo file for vendor evidence.",
        variant: "destructive",
      });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setEvidencePhotoPreview(dataUrl);
    setEvidencePhotoName(file.name);
  }

  if (!isReady || !scopeReady || !disputesDataReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Support Cases
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal">Disputes and support</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Review customer support cases linked to your store, reply to tickets, and add evidence for disputes.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Open tickets", value: vendorTickets.filter((ticket) => ticket.status !== "resolved").length, icon: MessageSquare },
          { label: "Disputes", value: vendorDisputes.length, icon: AlertTriangle },
          { label: "Refund requests", value: vendorRefunds.length, icon: ReceiptText },
          { label: "Stores", value: scopedStores.length, icon: ShieldCheck },
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

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Vendor case queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(["tickets", "disputes"] as VendorCaseTab[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={tab === item ? "default" : "outline"}
                  onClick={() => setTab(item)}
                >
                  {item}
                </Button>
              ))}
            </div>

            {tab === "tickets" ? (
              <CaseList
                emptyText="No support tickets are linked to this vendor yet."
                items={vendorTickets.map((ticket) => ({
                  id: ticket.id,
                  title: ticket.subject,
                  meta: `${customerName(ticket.customerId)} - ${ticket.orderId ?? "No order"} - ${formatDate(ticket.updatedAt)}`,
                  badge: ticket.status,
                  active: selectedTicket?.id === ticket.id,
                  onSelect: () => setSelectedTicketId(ticket.id),
                }))}
              />
            ) : (
              <CaseList
                emptyText="No disputes are linked to this vendor yet."
                items={vendorDisputes.map((dispute) => ({
                  id: dispute.id,
                  title: dispute.orderId,
                  meta: `${customerName(dispute.customerId)} - ${storeName(dispute.storeId)} - ${formatDate(dispute.createdAt)}`,
                  badge: dispute.status,
                  active: selectedDispute?.id === dispute.id,
                  onSelect: () => setSelectedDisputeId(dispute.id),
                }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <TicketPanel
            ticket={selectedTicket}
            storeId={selectedTicket ? ticketStoreId(selectedTicket) : undefined}
            onSubmit={replyForm.handleSubmit(sendVendorReply)}
            registerMessage={replyForm.register("message")}
            error={replyForm.formState.errors.message?.message}
          />
          <DisputePanel
            dispute={selectedDispute}
            refunds={vendorRefunds}
            onSubmit={evidenceForm.handleSubmit(addEvidence)}
            registerTitle={evidenceForm.register("title")}
            registerNotes={evidenceForm.register("notes")}
            titleError={evidenceForm.formState.errors.title?.message}
            notesError={evidenceForm.formState.errors.notes?.message}
            photoPreview={evidencePhotoPreview}
            photoName={evidencePhotoName}
            onPhotoChange={handleEvidencePhoto}
            onRemovePhoto={() => {
              setEvidencePhotoPreview("");
              setEvidencePhotoName("");
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CaseList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
    badge: string;
    active: boolean;
    onSelect: () => void;
  }>;
}) {
  if (!items.length) {
    return <p className="border bg-muted/30 p-4 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "w-full border bg-white p-3 text-left transition hover:border-primary",
            item.active && "border-primary shadow-sm",
          )}
          onClick={item.onSelect}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{item.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.meta}</span>
            </span>
            {statusBadge(item.badge)}
          </span>
        </button>
      ))}
    </div>
  );
}

function TicketPanel({
  error,
  onSubmit,
  registerMessage,
  storeId,
  ticket,
}: {
  error?: string;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  registerMessage: ReturnType<typeof useForm<VendorSupportReplyInput>>["register"] extends (
    name: "message",
  ) => infer R
    ? R
    : never;
  storeId?: string;
  ticket: SupportTicket | null;
}) {
  if (!ticket) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Select a support ticket to review the conversation.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          Support ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="border bg-muted/30 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                {ticket.id}
              </p>
              <h2 className="mt-1 text-2xl font-black">{ticket.subject}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {customerName(ticket.customerId)} - {storeId ? storeName(storeId) : "No store"} -{" "}
                {ticket.orderId ?? "No order"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusBadge(ticket.status)}
              {statusBadge(getTicketSlaStatus(ticket))}
              <Badge variant="neutral">{ticket.priority}</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {ticket.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "border p-3 text-sm",
                message.visibility === "internal"
                  ? "border-amber-300 bg-amber-50"
                  : message.authorType === "vendor"
                    ? "bg-primary/5"
                    : "bg-white",
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

        <form className="space-y-3" onSubmit={onSubmit}>
          <textarea
            className="min-h-28 w-full border bg-white p-3 text-sm"
            placeholder="Reply with context, replacement offer, or next steps"
            {...registerMessage}
          />
          {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
          <Button type="submit" disabled={ticket.status === "resolved"}>
            <Send className="size-4" />
            Send vendor reply
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DisputePanel({
  dispute,
  notesError,
  onPhotoChange,
  onRemovePhoto,
  onSubmit,
  photoName,
  photoPreview,
  refunds,
  registerNotes,
  registerTitle,
  titleError,
}: {
  dispute: Dispute | null;
  notesError?: string;
  onPhotoChange: (files: FileList | null) => void;
  onRemovePhoto: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  photoName: string;
  photoPreview: string;
  refunds: RefundRequest[];
  registerNotes: ReturnType<typeof useForm<VendorDisputeEvidenceInput>>["register"] extends (
    name: "notes",
  ) => infer R
    ? R
    : never;
  registerTitle: ReturnType<typeof useForm<VendorDisputeEvidenceInput>>["register"] extends (
    name: "title",
  ) => infer R
    ? R
    : never;
  titleError?: string;
}) {
  const linkedRefund = dispute
    ? refunds.find((refund) => refund.orderId === dispute.orderId)
    : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          Dispute evidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {dispute ? (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <InfoBlock label="Order" value={dispute.orderId} />
              <InfoBlock label="Customer" value={customerName(dispute.customerId)} />
              <InfoBlock label="Status" value={dispute.status.replaceAll("_", " ")} />
            </div>
            <div className="border bg-muted/30 p-4 text-sm">
              <p className="font-black">Customer reason</p>
              <p className="mt-2 text-muted-foreground">{dispute.reason}</p>
              <p className="mt-4 font-black">Requested resolution</p>
              <p className="mt-2 text-muted-foreground">{dispute.requestedResolution}</p>
              {linkedRefund ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Refund request: {formatCurrency(linkedRefund.amount, linkedRefund.currency)} -{" "}
                  {linkedRefund.status}
                </p>
              ) : null}
              <Link className="mt-4 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline" href={`/vendor/orders`}>
                Review vendor orders
              </Link>
            </div>

            <div className="space-y-3">
              <h3 className="font-black">Evidence history</h3>
              {(dispute.evidenceRecords ?? []).length ? (
                dispute.evidenceRecords?.map((evidence) => (
                  <div key={evidence.id} className="border bg-white p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black">{evidence.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(evidence.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {evidence.authorName}
                    </p>
                    <p className="mt-2 text-muted-foreground">{evidence.notes}</p>
                    {evidence.imagePreviewUrl ? (
                      <Image
                        src={evidence.imagePreviewUrl}
                        alt={evidence.title}
                        width={420}
                        height={240}
                        className="mt-3 max-h-72 w-full border object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="border bg-muted/30 p-3 text-sm text-muted-foreground">
                  No evidence has been added by this vendor yet.
                </p>
              )}
            </div>

            <form className="space-y-3" onSubmit={onSubmit}>
              <Input placeholder="Evidence title" {...registerTitle} />
              {titleError ? <p className="text-xs font-semibold text-destructive">{titleError}</p> : null}
              <textarea
                className="min-h-28 w-full border bg-white p-3 text-sm"
                placeholder="Add notes for support/admin, such as packing photos, tracking context, replacement offer, or delivery proof reference"
                {...registerNotes}
              />
              {notesError ? <p className="text-xs font-semibold text-destructive">{notesError}</p> : null}
              <label className="grid gap-2 border bg-muted/30 p-3 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <ImagePlus className="size-4 text-primary" />
                  Attach vendor photo evidence
                </span>
                <input
                  className="text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(event) => onPhotoChange(event.target.files)}
                />
                {photoPreview ? (
                  <span className="grid gap-2">
                    <span className="text-xs text-muted-foreground">{photoName}</span>
                    <Image
                      src={photoPreview}
                      alt="Vendor evidence preview"
                      width={420}
                      height={240}
                      className="max-h-72 w-full border object-cover"
                      unoptimized
                    />
                    <Button type="button" variant="outline" onClick={onRemovePhoto}>
                      Remove photo
                    </Button>
                  </span>
                ) : null}
              </label>
              <Button type="submit">
                <FileText className="size-4" />
                Add evidence
              </Button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a dispute to add evidence for support and admin review.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}
