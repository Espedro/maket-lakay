import { AccountAreaClient } from "@/components/account/account-area-client";
import { Breadcrumbs } from "@/components/marketplace/breadcrumbs";

interface AccountOrderDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountOrderDetailsPage({
  params,
}: AccountOrderDetailsPageProps) {
  const { id } = await params;

  return (
    <div className="container space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: decodeURIComponent(id) },
        ]}
      />
      <AccountAreaClient view="order-details" orderId={id} />
    </div>
  );
}
