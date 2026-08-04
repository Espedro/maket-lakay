"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, HandCoins, WalletCards } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

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
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import { payoutRequestSchema, type PayoutRequestInput } from "@/lib/schemas";
import type { PayoutRequest } from "@/lib/vendor-commerce";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createRealPayoutRequest,
  getRealPayoutRequests,
  getRealWalletSummary,
  type RealWalletSummary,
} from "@/services/vendor-commerce";

const defaultValues: PayoutRequestInput = {
  method: "MonCash",
  amount: 50,
  accountLabel: "",
};

export function PayoutRequestsClient() {
  const { defaultStoreId, isReady: scopeReady, scopedStores } = useVendorScope();
  const [storeId, setStoreId] = React.useState(defaultStoreId);
  const [pendingRequest, setPendingRequest] = React.useState<PayoutRequestInput | null>(null);
  const [payoutRequests, setPayoutRequests] = React.useState<PayoutRequest[]>([]);
  const [wallet, setWallet] = React.useState<RealWalletSummary | null>(null);
  const [payoutRequestsReady, setPayoutRequestsReady] = React.useState(false);
  const form = useForm<PayoutRequestInput>({
    resolver: zodResolver(payoutRequestSchema),
    defaultValues,
  });

  const refreshPayoutRequests = React.useCallback(async () => {
    if (!storeId) {
      setPayoutRequests([]);
      setWallet(null);
      setPayoutRequestsReady(true);
      return;
    }

    const [fetchedRequests, fetchedWallet] = await Promise.all([
      getRealPayoutRequests(storeId),
      getRealWalletSummary(storeId),
    ]);
    setPayoutRequests(fetchedRequests);
    setWallet(fetchedWallet);
    setPayoutRequestsReady(true);
  }, [storeId]);

  React.useEffect(() => {
    refreshPayoutRequests();
  }, [refreshPayoutRequests]);

  React.useEffect(() => {
    if (!scopeReady) return;

    if (!scopedStores.some((store) => store.id === storeId)) {
      setStoreId(defaultStoreId);
    }
  }, [defaultStoreId, scopeReady, scopedStores, storeId]);

  function requestConfirmation(values: PayoutRequestInput) {
    if (values.amount > (wallet?.availableBalance ?? 0)) {
      toast({
        title: "Amount is too high",
        description: "The requested payout is above the available balance.",
        variant: "destructive",
      });
      return;
    }

    setPendingRequest(values);
  }

  async function submitPayoutRequest() {
    if (!pendingRequest) return;

    const payoutRequest: PayoutRequest = {
      id: "",
      storeId,
      method: pendingRequest.method,
      amount: pendingRequest.amount,
      currency: wallet?.currency ?? "USD",
      accountLabel: pendingRequest.accountLabel,
      status: "requested",
      requestedAt: new Date().toISOString(),
    };

    const result = await createRealPayoutRequest(payoutRequest, storeId);

    if (!result.ok) {
      toast({
        title: "Could not submit payout request",
        description: result.reason,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Payout requested", description: "Your payout request was submitted." });
    form.reset(defaultValues);
    setPendingRequest(null);
    await refreshPayoutRequests();
  }

  if (!scopeReady || !payoutRequestsReady) {
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
            <h1 className="mt-2 text-3xl font-black tracking-normal">Payout requests</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Submit simulated payout requests and review payout history.
            </p>
          </div>
          <select
            className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
          >
            {scopedStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="border bg-white p-5">
          <div className="border bg-muted/30 p-4">
            <WalletCards className="size-6 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Available balance</p>
            <p className="mt-1 text-3xl font-black">
              {formatCurrency(wallet?.availableBalance ?? 0, wallet?.currency)}
            </p>
          </div>

          <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(requestConfirmation)}>
            <PayoutField label="Payout method" error={form.formState.errors.method?.message}>
              <select
                className="h-10 w-full border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("method")}
              >
                <option value="MonCash">MonCash</option>
                <option value="NatCash">NatCash</option>
                <option value="ACH">ACH</option>
                <option value="Zelle">Zelle</option>
                <option value="PayPal">PayPal</option>
                <option value="Stripe">Stripe</option>
              </select>
            </PayoutField>

            <PayoutField label="Requested amount" error={form.formState.errors.amount?.message}>
              <Input
                className="rounded-none shadow-none"
                min="1"
                step="0.01"
                type="number"
                {...form.register("amount")}
              />
            </PayoutField>

            <PayoutField label="Account label" error={form.formState.errors.accountLabel?.message}>
              <Input
                className="rounded-none shadow-none"
                placeholder="Example: MonCash 509 3700 0000, ACH business checking, PayPal email"
                {...form.register("accountLabel")}
              />
            </PayoutField>

            <Button className="w-full" type="submit">
              <HandCoins className="size-4" />
              Request payout
            </Button>
          </form>
        </section>

        <section className="border bg-white p-5">
          <h2 className="text-xl font-black">Payout history</h2>
          <div className="responsive-table-wrap mt-5">
            <table className="responsive-table min-w-[760px]">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 font-medium">Requested</th>
                  <th className="py-3 font-medium">Method</th>
                  <th className="py-3 font-medium">Account</th>
                  <th className="py-3 font-medium">Amount</th>
                  <th className="py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutRequests.map((request) => (
                  <tr key={request.id} className="border-b last:border-0">
                    <td className="py-3">{formatDate(request.requestedAt)}</td>
                    <td className="py-3 font-semibold">{request.method}</td>
                    <td className="py-3">{request.accountLabel}</td>
                    <td className="py-3 font-black">
                      {formatCurrency(request.amount, request.currency)}
                    </td>
                    <td className="py-3">
                      <Badge variant={request.status === "paid" ? "success" : "neutral"}>
                        {request.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={Boolean(pendingRequest)} onOpenChange={(open) => !open && setPendingRequest(null)}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Confirm payout request</DialogTitle>
            <DialogDescription>
              The request itself is real and reduces your available balance immediately. No
              payment provider is connected yet, so actual money does not move until an admin
              processes it.
            </DialogDescription>
          </DialogHeader>
          {pendingRequest ? (
            <div className="space-y-3 border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 text-primary" />
                Review before submitting
              </div>
              <p>Method: {pendingRequest.method}</p>
              <p>Amount: {formatCurrency(pendingRequest.amount, wallet?.currency)}</p>
              <p>Account: {pendingRequest.accountLabel}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRequest(null)}>
              Cancel
            </Button>
            <Button onClick={submitPayoutRequest}>
              <CheckCircle2 className="size-4" />
              Confirm request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutField({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs font-semibold text-destructive">{error}</p> : null}
    </div>
  );
}
