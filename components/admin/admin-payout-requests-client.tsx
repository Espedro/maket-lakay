"use client";

import * as React from "react";
import { CheckCircle2, HandCoins, Search, WalletCards, XCircle } from "lucide-react";

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
import { useAdminManagement } from "@/hooks/use-admin-management";
import { useAdminPayoutRequests } from "@/hooks/use-admin-payout-requests";
import { getAllStores, getAllVendors } from "@/lib/admin-management";
import {
  getPayoutRequestStoreId,
  type PayoutRequest,
  type PayoutStatus,
} from "@/lib/vendor-commerce";
import { formatCurrency, formatDate } from "@/lib/utils";

type PayoutAction = {
  request: PayoutRequest;
  status: PayoutStatus;
};

const statusOptions: Array<"all" | PayoutStatus> = [
  "all",
  "requested",
  "processing",
  "paid",
  "rejected",
];

function statusVariant(status: PayoutStatus) {
  if (status === "paid") return "success";
  if (status === "rejected") return "destructive";
  return "neutral";
}

export function AdminPayoutRequestsClient() {
  const { isReady: adminReady, state } = useAdminManagement();
  const { isReady: payoutsReady, payoutRequests, updatePayoutStatus } =
    useAdminPayoutRequests();
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<(typeof statusOptions)[number]>("all");
  const [pendingAction, setPendingAction] = React.useState<PayoutAction | null>(null);
  const stores = getAllStores(state);
  const vendors = getAllVendors(state);
  const enrichedRequests = payoutRequests.map((request) => {
    const storeId = getPayoutRequestStoreId(request);
    const store = stores.find((item) => item.id === storeId);
    const vendor = vendors.find((item) => item.id === store?.vendorId);

    return {
      ...request,
      store,
      vendor,
    };
  });
  const filteredRequests = enrichedRequests.filter((request) => {
    const normalizedQuery = query.toLowerCase();
    const matchesQuery =
      request.id.toLowerCase().includes(normalizedQuery) ||
      request.method.toLowerCase().includes(normalizedQuery) ||
      request.accountLabel.toLowerCase().includes(normalizedQuery) ||
      (request.store?.name ?? "").toLowerCase().includes(normalizedQuery) ||
      (request.vendor?.name ?? "").toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;

    return matchesQuery && matchesStatus;
  });
  const openRequests = enrichedRequests.filter((request) =>
    ["requested", "processing"].includes(request.status),
  );
  const requestedTotal = openRequests.reduce((sum, request) => sum + request.amount, 0);
  const paidTotal = enrichedRequests
    .filter((request) => request.status === "paid")
    .reduce((sum, request) => sum + request.amount, 0);

  function confirmAction() {
    if (!pendingAction) return;

    updatePayoutStatus(pendingAction.request.id, pendingAction.status);
    setPendingAction(null);
  }

  if (!adminReady || !payoutsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Payout Requests
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              Vendor payout requests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review vendor payout requests, payout methods, account labels, and
              simulated payout status updates.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[280px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="rounded-none pl-9 shadow-none"
                placeholder="Search payouts..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter payout requests by status"
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as (typeof statusOptions)[number])
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          icon={HandCoins}
          label="Open requests"
          value={openRequests.length.toString()}
        />
        <SummaryTile
          icon={WalletCards}
          label="Open amount"
          value={formatCurrency(requestedTotal)}
        />
        <SummaryTile
          icon={CheckCircle2}
          label="Paid amount"
          value={formatCurrency(paidTotal)}
        />
        <SummaryTile
          icon={XCircle}
          label="Rejected"
          value={enrichedRequests.filter((request) => request.status === "rejected").length.toString()}
        />
      </section>

      <section className="border bg-white p-5">
        <div className="responsive-table-wrap">
          <table className="responsive-table min-w-[1020px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Request</th>
                <th className="py-3 font-medium">Vendor</th>
                <th className="py-3 font-medium">Method</th>
                <th className="py-3 font-medium">Account</th>
                <th className="py-3 font-medium">Amount</th>
                <th className="py-3 font-medium">Requested</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-b last:border-0">
                  <td className="py-3 font-black">{request.id}</td>
                  <td className="py-3">
                    <p className="font-semibold">{request.store?.name ?? "Unknown store"}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.vendor?.name ?? "Unknown vendor"}
                    </p>
                  </td>
                  <td className="py-3 font-semibold">{request.method}</td>
                  <td className="py-3">{request.accountLabel}</td>
                  <td className="py-3 font-black">
                    {formatCurrency(request.amount, request.currency)}
                  </td>
                  <td className="py-3">{formatDate(request.requestedAt)}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
                  </td>
                  <td className="py-3">
                    <select
                      aria-label={`Update payout ${request.id} status`}
                      className="h-9 border bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={request.status}
                      onChange={(event) =>
                        setPendingAction({
                          request,
                          status: event.target.value as PayoutStatus,
                        })
                      }
                    >
                      <option value="requested">requested</option>
                      <option value="processing">processing</option>
                      <option value="paid">paid</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredRequests.length ? (
          <div className="mt-4 border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No payout requests match this view.
          </div>
        ) : null}
      </section>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Update payout request</DialogTitle>
            <DialogDescription>
              This updates the payout request status in localStorage only.
            </DialogDescription>
          </DialogHeader>
          <div className="border bg-muted/30 p-4 text-sm leading-6">
            Set {pendingAction?.request.id} to{" "}
            <span className="font-black">{pendingAction?.status}</span>?
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

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="border bg-white p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
