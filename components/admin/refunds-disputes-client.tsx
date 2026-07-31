"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileText,
  Flag,
  HelpCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { customers, paymentRecords, stores } from "@/data/mock-data";
import { toast } from "@/hooks/use-toast";
import { useMarketplaceStorage } from "@/hooks/use-marketplace-storage";
import {
  getReportTargetLabel,
  mergeDisputes,
  mergeMarketplaceReports,
  mergeRefundRequests,
  updateRefundRequestStatus,
  updateReportStatus,
} from "@/lib/support";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  CustomerNotification,
  Dispute,
  MarketplaceReport,
  PaymentRecord,
  RefundRecord,
  RefundRequest,
  RefundStatus,
} from "@/types";

type ResolutionAction =
  | { type: "refund-status"; request: RefundRequest; status: RefundStatus }
  | { type: "dispute-close"; dispute: Dispute }
  | { type: "dispute-info"; dispute: Dispute }
  | { type: "dispute-refund"; dispute: Dispute }
  | { type: "report"; report: MarketplaceReport; status: MarketplaceReport["status"] };

function getCustomerName(customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name ?? customerId;
}

function getVendorName(storeId: string) {
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

function getPaymentId(orderId: string, localPaymentRecords: PaymentRecord[] = []) {
  return (
    [...localPaymentRecords, ...paymentRecords].find((record) => record.orderId === orderId)?.id ??
    `payment-${orderId}`
  );
}

function statusVariant(status: string) {
  if (["approved", "processed", "resolved", "closed", "action_taken"].includes(status)) {
    return "success";
  }
  if (["rejected", "dismissed"].includes(status)) return "destructive";
  return "neutral";
}

export function RefundsDisputesClient() {
  const {
    isReady,
    localDisputes,
    localPaymentRecords,
    localRefundRequests,
    localReports,
    saveCustomerNotification,
    saveDispute,
    saveMarketplaceReport,
    saveRefundRecord,
    saveRefundRequest,
  } = useMarketplaceStorage();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedDispute, setSelectedDispute] = React.useState<Dispute | null>(null);
  const [pendingAction, setPendingAction] = React.useState<ResolutionAction | null>(null);
  const refunds = mergeRefundRequests(localRefundRequests);
  const disputes = mergeDisputes(localDisputes);
  const reports = mergeMarketplaceReports(localReports);

  function saveResolutionNotification(notification: Omit<CustomerNotification, "id" | "createdAt" | "read">) {
    saveCustomerNotification({
      ...notification,
      id: `refund-notif-${notification.orderId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  const filteredDisputes = disputes.filter((dispute) => {
    const normalizedQuery = query.toLowerCase();
    const matchesQuery =
      dispute.id.toLowerCase().includes(normalizedQuery) ||
      dispute.orderId.toLowerCase().includes(normalizedQuery) ||
      getCustomerName(dispute.customerId).toLowerCase().includes(normalizedQuery) ||
      getVendorName(dispute.storeId).toLowerCase().includes(normalizedQuery) ||
      dispute.reason.toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function createRefundFromDispute(dispute: Dispute) {
    const matchingRefund = refunds.find((refund) => refund.orderId === dispute.orderId);
    const amount = matchingRefund?.amount ?? 10;
    const currency = matchingRefund?.currency ?? "USD";
    const refundRecord: RefundRecord = {
      id: `refund-dispute-${Date.now()}`,
      paymentId: getPaymentId(dispute.orderId, localPaymentRecords),
      orderId: dispute.orderId,
      storeId: dispute.storeId,
      amount,
      currency,
      status: "processed",
      reason: `Dispute refund approved: ${dispute.reason}`,
      createdAt: new Date().toISOString(),
    };

    saveRefundRecord(refundRecord);
    saveDispute({
      ...dispute,
      status: "resolved",
      updatedAt: new Date().toISOString(),
    });
    saveResolutionNotification({
      customerId: dispute.customerId,
      orderId: dispute.orderId,
      channel: "in_app",
      title: "Refund approved",
      message: `${dispute.orderId}: a simulated refund was approved from dispute review.`,
    });
    toast({
      title: "Refund approved",
      description: `${formatCurrency(amount, currency)} simulated refund recorded for ${dispute.orderId}.`,
    });
  }

  function confirmAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "refund-status") {
      const nextRequest = updateRefundRequestStatus(
        pendingAction.request,
        pendingAction.status,
      );
      saveRefundRequest(nextRequest);
      if (pendingAction.status === "approved" || pendingAction.status === "processed") {
        saveRefundRecord({
          id: `refund-request-${Date.now()}`,
          paymentId: getPaymentId(pendingAction.request.orderId, localPaymentRecords),
          orderId: pendingAction.request.orderId,
          storeId: pendingAction.request.storeId,
          amount: pendingAction.request.amount,
          currency: pendingAction.request.currency,
          status: "processed",
          reason: pendingAction.request.reason,
          createdAt: new Date().toISOString(),
        });
      }
      saveResolutionNotification({
        customerId: pendingAction.request.customerId,
        orderId: pendingAction.request.orderId,
        channel: "in_app",
        title:
          pendingAction.status === "rejected"
            ? "Refund rejected"
            : "Refund request updated",
        message: `${pendingAction.request.orderId}: refund request ${pendingAction.status.replaceAll("_", " ")}.`,
      });
      toast({
        title: pendingAction.status === "approved" ? "Refund approved" : "Refund rejected",
        description: `${pendingAction.request.id} was updated locally.`,
      });
    }

    if (pendingAction.type === "dispute-close") {
      saveDispute({
        ...pendingAction.dispute,
        status: "closed",
        updatedAt: new Date().toISOString(),
      });
      saveResolutionNotification({
        customerId: pendingAction.dispute.customerId,
        orderId: pendingAction.dispute.orderId,
        channel: "in_app",
        title: "Dispute closed",
        message: `${pendingAction.dispute.orderId}: admin closed your dispute after review.`,
      });
      toast({ title: "Dispute closed", description: `${pendingAction.dispute.id} was closed locally.` });
    }

    if (pendingAction.type === "dispute-info") {
      saveDispute({
        ...pendingAction.dispute,
        status: "under_review",
        updatedAt: new Date().toISOString(),
      });
      saveResolutionNotification({
        customerId: pendingAction.dispute.customerId,
        orderId: pendingAction.dispute.orderId,
        channel: "in_app",
        title: "More information needed",
        message: `${pendingAction.dispute.orderId}: admin requested more information for your dispute.`,
      });
      toast({
        title: "Information requested",
        description: `${pendingAction.dispute.id} is now under review.`,
      });
    }

    if (pendingAction.type === "dispute-refund") {
      createRefundFromDispute(pendingAction.dispute);
    }

    if (pendingAction.type === "report") {
      saveMarketplaceReport(updateReportStatus(pendingAction.report, pendingAction.status));
      toast({
        title: "Report updated",
        description: `${pendingAction.report.id} was marked ${pendingAction.status.replaceAll("_", " ")}.`,
      });
    }

    setPendingAction(null);
  }

  function renderDisputeActions(dispute: Dispute) {
    return (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDispute(dispute)}>
          <FileText className="size-4" />
          Evidence
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ type: "dispute-refund", dispute })}
        >
          <RefreshCw className="size-4" />
          Approve refund
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ type: "dispute-info", dispute })}
        >
          <HelpCircle className="size-4" />
          Request info
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPendingAction({ type: "dispute-close", dispute })}
        >
          <CheckCircle2 className="size-4" />
          Close
        </Button>
      </>
    );
  }

  if (!isReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Refunds and Disputes
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Resolution center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review disputes, refund requests, evidence previews, and marketplace reports.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[280px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-9 shadow-none"
                placeholder="Search disputes..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter disputes by status"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Open disputes", disputes.filter((dispute) => ["open", "under_review"].includes(dispute.status)).length],
          ["Refund requests", refunds.length],
          ["Marketplace reports", reports.length],
          ["Closed cases", disputes.filter((dispute) => dispute.status === "closed").length],
        ].map(([label, value]) => (
          <div key={label} className="border bg-white p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="border bg-white p-5">
        <h2 className="text-xl font-black">Dispute queue</h2>
        <ResponsiveDataView
          className="mt-5"
          items={filteredDisputes}
          getKey={(dispute) => dispute.id}
          cardTitle={(dispute) => dispute.id}
          cardDescription={(dispute) => dispute.reason}
          cardMeta={(dispute) => (
            <Badge variant={statusVariant(dispute.status)}>
              {dispute.status.replaceAll("_", " ")}
            </Badge>
          )}
          cardFields={(dispute) => [
            { label: "Customer", value: getCustomerName(dispute.customerId) },
            { label: "Vendor", value: getVendorName(dispute.storeId) },
            { label: "Order", value: dispute.orderId },
            { label: "Submitted", value: formatDate(dispute.createdAt) },
          ]}
          cardActions={renderDisputeActions}
          emptyState={
            <div className="border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No disputes match this search.
            </div>
          }
          table={
          <table className="responsive-table min-w-[1120px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Dispute ID</th>
                <th className="py-3 font-medium">Customer</th>
                <th className="py-3 font-medium">Vendor</th>
                <th className="py-3 font-medium">Order</th>
                <th className="py-3 font-medium">Reason</th>
                <th className="py-3 font-medium">Submitted</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisputes.map((dispute) => (
                <tr key={dispute.id} className="border-b last:border-0">
                  <td className="py-3 font-black">{dispute.id}</td>
                  <td className="py-3">{getCustomerName(dispute.customerId)}</td>
                  <td className="py-3">{getVendorName(dispute.storeId)}</td>
                  <td className="py-3">{dispute.orderId}</td>
                  <td className="max-w-[280px] truncate py-3">{dispute.reason}</td>
                  <td className="py-3">{formatDate(dispute.createdAt)}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(dispute.status)}>
                      {dispute.status.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="dashboard-action-row">
                      {renderDisputeActions(dispute)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="border bg-white p-5">
          <h2 className="text-xl font-black">Refund requests</h2>
          <div className="mt-5 space-y-3">
            {refunds.map((request) => (
              <article key={request.id} className="border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {formatCurrency(request.amount, request.currency)} - {request.orderId}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getCustomerName(request.customerId)} - {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{request.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={request.status !== "requested"}
                    onClick={() => setPendingAction({ type: "refund-status", request, status: "approved" })}
                  >
                    <CheckCircle2 className="size-4" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={request.status !== "requested"}
                    onClick={() => setPendingAction({ type: "refund-status", request, status: "rejected" })}
                  >
                    <XCircle className="size-4" />
                    Reject
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border bg-white p-5">
          <h2 className="text-xl font-black">Resolution panel</h2>
          <div className="mt-5 space-y-3">
            {filteredDisputes.slice(0, 4).map((dispute) => (
              <article key={dispute.id} className="border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{dispute.id}</p>
                    <p className="text-sm text-muted-foreground">{dispute.requestedResolution}</p>
                  </div>
                  <Badge variant={statusVariant(dispute.status)}>{dispute.status.replaceAll("_", " ")}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start rounded-none"
                    onClick={() => setPendingAction({ type: "dispute-refund", dispute })}
                  >
                    Approve refund
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start rounded-none"
                    onClick={() => setPendingAction({ type: "dispute-info", dispute })}
                  >
                    Request additional information
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start rounded-none"
                    onClick={() => setPendingAction({ type: "dispute-close", dispute })}
                  >
                    Close dispute
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="border bg-white p-5">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Flag className="size-5 text-primary" />
          Marketplace reports
        </h2>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {reports.map((report) => (
            <article key={report.id} className="border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{getReportTargetLabel(report)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.targetType} - {report.reason} - {formatDate(report.createdAt)}
                  </p>
                </div>
                <Badge variant={statusVariant(report.status)}>{report.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.details}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingAction({ type: "report", report, status: "action_taken" })}
                >
                  Record action
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingAction({ type: "report", report, status: "dismissed" })}
                >
                  Dismiss
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Dialog open={Boolean(selectedDispute)} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Evidence preview</DialogTitle>
            <DialogDescription>
              Evidence summary for admin resolution. No files are uploaded.
            </DialogDescription>
          </DialogHeader>
          {selectedDispute ? (
            <div className="space-y-3">
              <div className="border bg-muted/30 p-4">
                <p className="font-black">{selectedDispute.id}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedDispute.reason}</p>
              </div>
              <EvidenceItem label="Customer statement" value={selectedDispute.reason} />
              <EvidenceItem label="Requested resolution" value={selectedDispute.requestedResolution} />
              <EvidenceItem label="Order reference" value={selectedDispute.orderId} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Confirm resolution action</DialogTitle>
            <DialogDescription>This updates local support state only.</DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm">
            {pendingAction?.type === "refund-status"
              ? `Set refund request ${pendingAction.request.id} to ${pendingAction.status}?`
              : pendingAction?.type === "report"
                ? `Set report ${pendingAction.report.id} to ${pendingAction.status.replaceAll("_", " ")}?`
                : pendingAction?.type === "dispute-refund"
                  ? `Approve a simulated refund for ${pendingAction.dispute.id}?`
                  : pendingAction?.type === "dispute-info"
                    ? `Request additional information for ${pendingAction.dispute.id}?`
                    : `Close ${pendingAction?.dispute.id}?`}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
