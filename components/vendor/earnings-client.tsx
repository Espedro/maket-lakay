"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CircleDollarSign, HandCoins, Percent, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVendorScope } from "@/hooks/use-vendor-scope";
import type { EarningsTransaction } from "@/lib/vendor-commerce";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getRealEarningsTransactions,
  getRealWalletSummary,
  type RealWalletSummary,
} from "@/services/vendor-commerce";

type DateFilter = "7d" | "30d" | "all";

function getFilteredTransactions(transactions: EarningsTransaction[], filter: DateFilter) {
  if (filter === "all") return transactions;

  const now = Date.now();
  const days = filter === "7d" ? 7 : 30;
  const threshold = now - days * 24 * 60 * 60 * 1000;

  return transactions.filter((transaction) => new Date(transaction.createdAt).getTime() >= threshold);
}

function buildChartData(allTransactions: EarningsTransaction[], filter: DateFilter) {
  const transactions = getFilteredTransactions(allTransactions, filter).filter(
    (transaction) => transaction.type === "sale",
  );

  return Array.from({ length: filter === "7d" ? 7 : 6 }).map((_, index) => ({
    label: filter === "7d" ? `Day ${index + 1}` : `P${index + 1}`,
    earnings:
      transactions
        .filter((_, transactionIndex) => transactionIndex % (filter === "7d" ? 7 : 6) === index)
        .reduce((sum, transaction) => sum + transaction.amount, 0) +
      (index + 1) * 14,
  }));
}

export function EarningsClient() {
  const { defaultStoreId, isReady: scopeReady, scopedStores } = useVendorScope();
  const [storeId, setStoreId] = React.useState(defaultStoreId);
  const [filter, setFilter] = React.useState<DateFilter>("30d");
  const [allTransactions, setAllTransactions] = React.useState<EarningsTransaction[]>([]);
  const [wallet, setWallet] = React.useState<RealWalletSummary | null>(null);
  const [transactionsReady, setTransactionsReady] = React.useState(false);

  React.useEffect(() => {
    if (!storeId) {
      setAllTransactions([]);
      setWallet(null);
      setTransactionsReady(true);
      return;
    }

    let active = true;
    setTransactionsReady(false);

    Promise.all([getRealEarningsTransactions(storeId), getRealWalletSummary(storeId)]).then(
      ([fetchedTransactions, fetchedWallet]) => {
        if (active) {
          setAllTransactions(fetchedTransactions);
          setWallet(fetchedWallet);
          setTransactionsReady(true);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [storeId]);

  const transactions = getFilteredTransactions(allTransactions, filter);
  const totalEarnings = transactions
    .filter((transaction) => transaction.type === "sale")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const commissions = Math.abs(
    transactions
      .filter((transaction) => transaction.type === "commission")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );
  const chartData = buildChartData(allTransactions, filter);

  React.useEffect(() => {
    if (!scopeReady) return;

    if (!scopedStores.some((store) => store.id === storeId)) {
      setStoreId(defaultStoreId);
    }
  }, [defaultStoreId, scopeReady, scopedStores, storeId]);

  if (!scopeReady || !transactionsReady) {
    return <div className="h-96 animate-pulse border bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Vendor Earnings
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">Earnings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review wallet balances, commissions, earnings chart, and transaction history.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              disabled={!scopeReady}
            >
              {scopedStores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <select
              className="h-10 border bg-white px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={filter}
              onChange={(event) => setFilter(event.target.value as DateFilter)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={WalletCards} label="Available balance" value={formatCurrency(wallet?.availableBalance ?? 0)} />
        <Metric icon={HandCoins} label="Pending balance" value={formatCurrency(wallet?.pendingBalance ?? 0)} />
        <Metric icon={CircleDollarSign} label="Total earnings" value={formatCurrency(totalEarnings)} />
        <Metric icon={Percent} label="Platform commissions" value={formatCurrency(commissions)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={44} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="earnings" stroke="#0d9488" fill="#0d9488" fillOpacity={0.16} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="responsive-table-wrap">
          <table className="responsive-table min-w-[760px]">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Type</th>
                <th className="py-3 font-medium">Description</th>
                <th className="py-3 font-medium">Order</th>
                <th className="py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b last:border-0">
                  <td className="py-3">{formatDate(transaction.createdAt)}</td>
                  <td className="py-3">
                    <Badge variant={transaction.amount >= 0 ? "success" : "neutral"}>
                      {transaction.type}
                    </Badge>
                  </td>
                  <td className="py-3">{transaction.description}</td>
                  <td className="py-3">{transaction.orderId ?? "N/A"}</td>
                  <td className={transaction.amount >= 0 ? "py-3 font-black text-accent" : "py-3 font-black text-destructive"}>
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
        </div>
        <Icon className="size-8 text-primary" />
      </CardContent>
    </Card>
  );
}
