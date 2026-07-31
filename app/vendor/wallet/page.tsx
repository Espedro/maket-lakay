import { WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { vendorWallets } from "@/data/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function VendorWalletPage() {
  const wallet = vendorWallets[0];

  return (
    <div className="space-y-6">
      <section className="border bg-white p-5">
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-normal">
          <WalletCards className="size-7 text-primary" />
          Vendor wallet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Wallet balances, commissions, refunds, and payout ledger.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Available balance", wallet.availableBalance],
          ["Pending balance", wallet.pendingBalance],
          ["Lifetime commission", wallet.lifetimeCommission],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <p className="mt-1 text-2xl font-black">{formatCurrency(value as number)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet ledger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {wallet.entries.map((entry) => (
            <div key={entry.id} className="flex justify-between gap-3 border p-3 text-sm">
              <span>
                <span className="block font-black">{entry.description}</span>
                <span className="text-muted-foreground">{entry.type}</span>
              </span>
              <span className="font-black">{formatCurrency(entry.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
